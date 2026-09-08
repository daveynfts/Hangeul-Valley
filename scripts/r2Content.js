/**
 * Shared R2 content pipeline: file list, upload, CDN verify.
 * Credentials: env R2_* (or --env path / .env.local). Does not print secrets.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Lazy so consumers that never touch R2 (tests/test_r2_content.js, CI's test job
// with no root node_modules) can load this module without @aws-sdk/client-s3.
let awsSdk = null;
function sdk() {
  if (!awsSdk) awsSdk = require('@aws-sdk/client-s3');
  return awsSdk;
}

const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'hangeul-valley/';
// How many R2 requests are in flight at once. Publish used to PUT one file and then HEAD one
// at a time — 3406 sequential round-trips to Cloudflare for 1703 files, which cost 19 minutes
// of upload and 6 of verify inside a job capped at 40. The files are 8-80KB, so none of that
// was bandwidth; it was latency, paid 3406 times over.
const UPLOAD_CONCURRENCY = Math.max(1, Number(process.env.R2_UPLOAD_CONCURRENCY) || 16);
const REQUIRED_RELS = [
  'levels.json',
  'facts.json',
  'sprites/catalog.json',
  'skins/catalog.json'
];
const STATIC_FILES = [
  ['levels.json', 'application/json'],
  ['facts.json', 'application/json'],
  ['sprites/catalog.json', 'application/json'],
  ['skins/catalog.json', 'application/json']
];

function loadEnvFile(file) {
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v && !process.env[k] && v !== '[SENSITIVE]') process.env[k] = v;
  }
}

function env(k) {
  return String(process.env[k] || '').trim().replace(/^["']|["']$/g, '');
}

function loadPublishEnv(argv) {
  const list = Array.isArray(argv) ? argv : [];
  const envIdx = list.indexOf('--env');
  if (envIdx >= 0 && list[envIdx + 1]) loadEnvFile(list[envIdx + 1]);
  loadEnvFile(path.join(ROOT, '.env.local'));
}

function parsePublishArgs(argv) {
  const flags = {
    dryRun: false,
    skipValidate: false,
    skipUpload: false,
    skipVerify: false,
    forceUpload: false,
    skipDeploy: false,
    skipTts: false,
    envFile: '',
    help: false
  };
  const list = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--skip-validate') flags.skipValidate = true;
    else if (a === '--skip-upload') flags.skipUpload = true;
    else if (a === '--force-upload') flags.forceUpload = true;
    else if (a === '--skip-verify') flags.skipVerify = true;
    else if (a === '--skip-deploy') flags.skipDeploy = true;
    else if (a === '--skip-tts') flags.skipTts = true;
    else if (a === '--env') flags.envFile = list[++i] || '';
    else if (a === '--help' || a === '-h') flags.help = true;
    else throw new Error('Unknown flag: ' + a);
  }
  return flags;
}

// Bounded parallelism, results in the input's order. It stops handing out work once
// something has thrown, so a publish that is about to fail does not go on issuing hundreds of
// requests behind the error it is going to report.
async function pooled(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  const width = Math.max(1, Math.min(limit || 1, list.length));
  let next = 0;
  let failure = null;
  const runner = async () => {
    for (;;) {
      if (failure) return;
      const i = next++;
      if (i >= list.length) return;
      try {
        out[i] = await worker(list[i], i);
      } catch (e) {
        if (!failure) failure = e;
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: width }, runner));
  if (failure) throw failure;
  return out;
}

function cacheControl(ctype) {
  if (ctype === 'application/json') return 'public, max-age=60';
  if (ctype === 'audio/mpeg') return 'public, max-age=86400';
  return 'public, max-age=86400';
}

function addFile(out, seen, rel, ctype) {
  const posix = String(rel).replace(/\\/g, '/');
  if (!posix || seen.has(posix)) return;
  seen.add(posix);
  out.push({ rel: posix, ctype: ctype });
}

// Workbooks are named worlds/<unit>-workbook.json. Finding them by that pattern
// rather than listing them means a new unit publishes itself, which is the whole
// bug class that hid the Unit 14 workbook from production.
function listWorkbooks(root) {
  const dir = path.join(root || ROOT, 'worlds');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /-workbook\.json$/.test(f))
    .sort()
    .map((f) => 'worlds/' + f);
}

function collectUploadFiles(root) {
  const base = root || ROOT;
  const out = [];
  const seen = new Set();
  STATIC_FILES.forEach(([rel, ctype]) => addFile(out, seen, rel, ctype));

  // Every world file, found rather than listed. vercel.json rewrites /worlds/*
  // to the CDN, so a file left off the batch does not fall back to the repo
  // copy — it 404s, and whatever reads it goes quietly missing. That is exactly
  // how the Unit 14 workbook was invisible on production from the day it
  // shipped, and a hand-kept list would have done it again on Unit 10.
  const worldsDir = path.join(base, 'worlds');
  if (fs.existsSync(worldsDir)) {
    fs.readdirSync(worldsDir).filter((f) => f.endsWith('.json')).sort()
      .forEach((f) => addFile(out, seen, 'worlds/' + f, 'application/json'));
  }

  // Translation catalogues. Walked rather than listed, for the same reason the worlds are:
  // vercel.json rewrites /locales/* to the CDN, so a catalogue left off this batch does not
  // fall back to the repo copy — it 404s, and the unit silently reverts to English with
  // nothing anywhere saying why. A new language is a new directory and publishes itself.
  const localesDir = path.join(base, 'locales');
  if (fs.existsSync(localesDir)) {
    const walkLocales = (dir, prefix) => {
      fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
        .forEach((e) => {
          if (e.isDirectory()) { walkLocales(path.join(dir, e.name), prefix + e.name + '/'); return; }
          if (!e.name.endsWith('.json')) return;
          addFile(out, seen, 'locales/' + prefix + e.name, 'application/json');
        });
    };
    walkLocales(localesDir, '');
  }

  const spriteCat = path.join(base, 'sprites', 'catalog.json');
  if (fs.existsSync(spriteCat)) {
    const pack = JSON.parse(fs.readFileSync(spriteCat, 'utf8'));
    (pack.assets || []).forEach((a) => {
      if (!a || !a.path || a.status !== 'shipped') return;
      addFile(out, seen, 'sprites/' + String(a.path).replace(/\\/g, '/'), 'image/png');
    });
  }

  const skinCat = path.join(base, 'skins', 'catalog.json');
  if (fs.existsSync(skinCat)) {
    const pack = JSON.parse(fs.readFileSync(skinCat, 'utf8'));
    (pack.skins || []).forEach((s) => {
      if (!s || s.art !== 'hd' || !s.folder || !Array.isArray(s.files)) return;
      const folder = String(s.folder).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      if (!folder || folder.indexOf('..') >= 0) return;
      s.files.forEach((name) => {
        if (!name || /[\\/]/.test(name)) return;
        addFile(out, seen, 'sprites/' + folder + '/' + name, 'image/png');
      });
    });
  }

  const { listLocalTtsFiles } = require('./ttsClips');
  listLocalTtsFiles(base).forEach((rel) => addFile(out, seen, rel, 'audio/mpeg'));

  // The content decides what gets uploaded rather than a hand-kept list beside
  // it. /audio/* is rewritten to the CDN, so a clip the content names but the
  // batch omits is a play button that does nothing on the deployed site — and
  // that failure is silent.
  //
  // Walked generically over every world file rather than per known shape. It used
  // to reach only into a workbook's exercises/items/example, which meant the next
  // feature to name a clip — the Unit 11 cassette, whose file is not a workbook at
  // all — shipped its audio nowhere. Anything anywhere in a world JSON that looks
  // like {src: 'audio/….mp3'} is a recording the content is asking for.
  const takeAudio = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(takeAudio); return; }
    const src = typeof node.src === 'string' ? node.src : '';
    if (/^audio\/[A-Za-z0-9._/-]+\.mp3$/.test(src) && src.indexOf('..') < 0) {
      addFile(out, seen, src, 'audio/mpeg');
    }
    Object.keys(node).forEach((k) => takeAudio(node[k]));
  };
  if (fs.existsSync(worldsDir)) {
    fs.readdirSync(worldsDir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
      takeAudio(JSON.parse(fs.readFileSync(path.join(worldsDir, f), 'utf8')));
    });
  }

  return out;
}

function missingRequired(root) {
  const base = root || ROOT;
  return REQUIRED_RELS.filter((rel) => !fs.existsSync(path.join(base, rel)));
}

function r2Credentials() {
  return {
    accountId: env('R2_ACCOUNT_ID'),
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    bucket: env('R2_BUCKET_NAME')
  };
}

function assertR2Credentials() {
  const c = r2Credentials();
  if (!c.accountId || !c.accessKeyId || !c.secretAccessKey || !c.bucket || c.accountId === '[SENSITIVE]') {
    throw new Error('Missing real R2_* credentials (Vercel Sensitive vars are not readable via env pull).');
  }
  return c;
}

function createR2Client() {
  const c = assertR2Credentials();
  const { S3Client } = sdk();
  return {
    client: new S3Client({
      region: 'auto',
      endpoint: 'https://' + c.accountId + '.r2.cloudflarestorage.com',
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      // Above the SDK's default of 3, because UPLOAD_CONCURRENCY requests now race where one
      // used to go at a time, and a throttle under that load must cost a retry rather than
      // the whole publish.
      maxAttempts: 6
    }),
    bucket: c.bucket
  };
}

function publicContentBase() {
  let base = (env('R2_PUBLIC_BASE_URL') || env('R2_PUBLIC_URL') || 'https://cdn.daveynfts.com/hangeul-valley').replace(/\/$/, '');
  try {
    const u = new URL(base);
    const pathNoSlash = u.pathname.replace(/\/$/, '');
    if (u.hostname === 'cdn.daveynfts.com' && !/\/hangeul-valley$/i.test(pathNoSlash)) {
      base = base.replace(/\/$/, '') + '/hangeul-valley';
    }
  } catch (_) {}
  return base.replace(/\/$/, '');
}

function objectKey(rel) {
  return PREFIX + String(rel).replace(/\\/g, '/');
}

// An object's ETag is the MD5 of its body — but only for an object written whole. A
// multipart upload's is '<md5>-<parts>', which is not the body's MD5 at all, so a suffixed
// ETag is reported as unknown rather than guessed at. Everything here is PUT in one piece,
// so in practice the hex form is what comes back.
function etagHex(etag) {
  const s = String(etag || '').replace(/^"|"$/g, '').trim();
  return /^[0-9a-f]{32}$/i.test(s) ? s.toLowerCase() : '';
}

// What the bucket already holds: Map of repo-relative path to { size, etag }.
//
// One listing answers three questions that used to cost a request per file — whether a
// Korean clip needs rendering, whether it needs uploading, and whether anything else has
// changed since the last publish. Paginated because the bucket holds ~6000 objects and a
// listing returns 1000 at a time.
async function listRemoteObjects(client, bucket, relPrefix) {
  const { ListObjectsV2Command } = sdk();
  const prefix = PREFIX + String(relPrefix || '').replace(/\\/g, '/');
  const out = new Map();
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token
    }));
    (res.Contents || []).forEach((o) => {
      if (!o || !o.Key || !(o.Size > 0)) return;
      out.set(o.Key.slice(PREFIX.length), { size: Number(o.Size), etag: etagHex(o.ETag) });
    });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

// The Korean clips out of that listing, as the Map of path to size that the render step and
// dropPublishedClips both read. Derived rather than fetched again: the clip filename hashes
// the phrase, so an object on R2 is definitively that phrase's clip, and the size is what
// tells "already published" apart from "re-rendered since" — a voice or rate change keeps
// the filename and changes the bytes.
function ttsSizes(remote) {
  const { TTS_DIR_REL } = require('./ttsClips');
  const dir = TTS_DIR_REL + '/';
  const out = new Map();
  if (!remote) return out;
  remote.forEach((o, rel) => { if (rel.indexOf(dir) === 0) out.set(rel, o.size); });
  return out;
}

// Drop the clips that are byte-for-byte already on the CDN. A clip missing locally is
// nothing to upload; a clip whose local size differs was re-rendered and must go up.
function dropPublishedClips(files, onCdn, base) {
  return files.filter((f) => {
    const remoteSize = onCdn.get(f.rel);
    if (remoteSize === undefined) return true;
    const full = path.join(base, f.rel);
    if (!fs.existsSync(full)) return false;
    return fs.statSync(full).size !== remoteSize;
  });
}

// Drop the files R2 already holds byte for byte, and say how many. The comparison is the
// local body's MD5 against the object's ETag rather than its length: an edit that swaps one
// character of JSON for another keeps the size, and a size check would call that published.
// Length is still read first, from stat, so only a file that could match is opened at all.
//
// A file missing locally is deliberately *kept* in the plan rather than dropped —
// uploadFiles throws on it, which is the right answer for a sprite the catalogue names and
// nobody shipped. Clips are the one exception, and dropPublishedClips has already taken
// them out before this runs.
function dropUnchanged(files, remote, base) {
  const list = Array.isArray(files) ? files.slice() : [];
  if (!remote || !remote.size) return { files: list, skipped: 0 };
  const root = base || ROOT;
  const kept = [];
  let skipped = 0;
  list.forEach((f) => {
    const r = remote.get(f.rel);
    if (!r || !r.etag) { kept.push(f); return; }
    const full = path.join(root, f.rel);
    if (!fs.existsSync(full)) { kept.push(f); return; }
    if (fs.statSync(full).size !== r.size) { kept.push(f); return; }
    const md5 = crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex');
    if (md5 !== r.etag) { kept.push(f); return; }
    skipped++;
  });
  return { files: kept, skipped };
}

async function uploadFiles(client, bucket, files, root) {
  const { PutObjectCommand } = sdk();
  const base = root || ROOT;
  // Resolved before anything is written, so a plan naming a file that is not on disk fails
  // the publish instead of half-uploading the rest of it first.
  const list = (files || []).map(({ rel, ctype }) => {
    const full = path.join(base, rel);
    if (!fs.existsSync(full)) {
      throw new Error('Missing upload file: ' + rel);
    }
    return { rel, ctype, full };
  });
  return pooled(list, UPLOAD_CONCURRENCY, async ({ rel, ctype, full }) => {
    const Body = fs.readFileSync(full);
    const Key = objectKey(rel);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body,
      ContentType: ctype,
      CacheControl: cacheControl(ctype)
    }));
    console.log('PUT', Key, Body.length + 'B');
    return { rel, key: Key, bytes: Body.length, type: ctype };
  });
}

// Only what was actually uploaded needs this. Everything dropUnchanged skipped was skipped
// on the strength of the object's own ETag, which is a stronger statement about the bytes
// on R2 than the length this compares.
async function verifyS3(client, bucket, uploaded) {
  const { HeadObjectCommand } = sdk();
  await pooled(uploaded || [], UPLOAD_CONCURRENCY, async (row) => {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: row.key }));
    const remote = Number(head.ContentLength);
    if (remote !== row.bytes) {
      throw new Error('S3 size mismatch for ' + row.key + ': local ' + row.bytes + ' remote ' + remote);
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPublicJson(rel, localRoot, attempts) {
  const base = publicContentBase();
  const url = base + '/' + rel.replace(/\\/g, '/') + '?v=publish-' + Date.now();
  const full = path.join(localRoot || ROOT, rel);
  const local = fs.readFileSync(full);
  let lastErr = 'no attempt';
  const n = attempts || 5;
  for (let i = 0; i < n; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) {
        lastErr = 'HTTP ' + res.status;
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        JSON.parse(buf.toString('utf8'));
        if (buf.equals(local)) return url;
        lastErr = buf.length === local.length
          ? 'body bytes differ from local (same length ' + buf.length + ')'
          : 'body length ' + buf.length + ' vs local ' + local.length;
      }
    } catch (e) {
      lastErr = e.message || String(e);
    }
    if (i < n - 1) await sleep(1500);
  }
  throw new Error('CDN verify failed for ' + rel + ': ' + lastErr);
}

function triggerVercelCli() {
  const { execSync } = require('child_process');
  execSync('npx --yes vercel --prod --yes', {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
    shell: true
  });
  return { status: 0, via: 'cli' };
}

async function triggerVercelDeploy(hookUrl) {
  const url = String(hookUrl || '').trim();
  if (url) {
    const res = await fetch(url, { method: 'POST' });
    const text = await res.text();
    if (!res.ok) {
      throw new Error('Vercel deploy hook HTTP ' + res.status);
    }
    return { status: res.status, via: 'hook', body: text.slice(0, 240) };
  }
  if (env('VERCEL_TOKEN')) {
    console.log('No VERCEL_DEPLOY_HOOK_URL; deploying with Vercel CLI');
    return triggerVercelCli();
  }
  if (process.env.GITHUB_ACTIONS) {
    console.log('No Vercel hook or token; skipping deploy (Git still ships JS). R2 content is live.');
    return { status: 0, via: 'skipped-ci' };
  }
  console.log('No VERCEL_DEPLOY_HOOK_URL; deploying with Vercel CLI');
  return triggerVercelCli();
}

async function runUpload(argv, root) {
  loadPublishEnv(argv);
  const creds = assertR2Credentials();
  const { client, bucket } = createR2Client();
  const files = collectUploadFiles(root);
  const missing = missingRequired(root);
  if (missing.length) throw new Error('Missing required content: ' + missing.join(', '));

  console.log('R2 env present', {
    ACCOUNT_ID: creds.accountId.length,
    ACCESS_KEY_ID: creds.accessKeyId.length,
    SECRET: creds.secretAccessKey.length,
    BUCKET: creds.bucket.length,
    PUBLIC: publicContentBase().length
  });

  // No dropUnchanged here: upload:r2 is the force path, and re-pushing every object is
  // what it is for — a metadata change, or an object suspected of being wrong on R2. It
  // still gets the pool, so "everything" is minutes rather than twenty of them.
  const uploaded = await uploadFiles(client, bucket, files, root);
  const { ListObjectsV2Command } = sdk();
  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX }));
  const keys = (listed.Contents || []).map((o) => o.Key);
  console.log('LIST', PREFIX, keys.length, 'objects');
  keys.forEach((k) => console.log(' ', k));
  console.log('PUBLIC_BASE', publicContentBase());
  console.log('BUCKET', bucket);
  console.log('UPLOADED', uploaded.length);
  return { uploaded, bucket, keys };
}

const HELP = `publish:prod — R2 first, then Vercel.

Order (required): validate → upload R2 → verify → Vercel (deploy hook, or CLI if the hook is unset).

  node scripts/publish.js
  npm run publish:prod

Flags:
  --dry-run          print the file list; no network
  --skip-validate    skip scripts/validate_content.js
  --skip-upload      do not PUT to R2
  --force-upload     PUT every file, including ones R2 already holds byte for byte
  --skip-verify      do not HeadObject / CDN GET
  --skip-deploy      do not POST VERCEL_DEPLOY_HOOK_URL
  --skip-tts         do not render missing Korean MP3 clips
  --env <path>       extra env file (also reads .env.local)
`;

async function runPublish(argv, root) {
  const flags = parsePublishArgs(argv);
  if (flags.help) {
    console.log(HELP);
    return { help: true };
  }
  loadPublishEnv(argv);
  const base = root || ROOT;
  const planned = collectUploadFiles(base);
  const missing = missingRequired(base);
  if (missing.length) throw new Error('Missing required content: ' + missing.join(', '));

  console.log('PUBLISH_PLAN', planned.length, 'files');
  if (flags.dryRun) {
    planned.forEach((f) => console.log(' ', f.rel, f.ctype));
    console.log('dry-run: no upload, no deploy');
    return { dryRun: true, files: planned };
  }

  if (!flags.skipValidate) {
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate_content.js')], {
      stdio: 'inherit',
      cwd: ROOT
    });
  }

  let client = null;
  let bucket = '';
  const useR2 = !flags.skipUpload;
  if (useR2) {
    const created = createR2Client();
    client = created.client;
    bucket = created.bucket;
  }

  // What the bucket already holds. Asked for once and read three ways: a clip already on R2
  // needs neither rendering nor uploading, and anything else whose bytes have not changed
  // needs no uploading either. A listing that fails is not fatal — the publish falls back to
  // the old behaviour of sending everything.
  let remote = null;
  let onCdn = null;
  if (useR2) {
    try {
      remote = await listRemoteObjects(client, bucket);
      onCdn = ttsSizes(remote);
      console.log('R2_LISTED', remote.size, 'objects');
      console.log('TTS_ON_CDN', onCdn.size, 'clips');
    } catch (e) {
      console.log('R2_LISTED unavailable (' + (e && e.message) + ') — falling back to the local check');
      remote = null;
      onCdn = null;
    }
  }

  if (!flags.skipTts) {
    const { generateTtsClips } = require('./generate_tts');
    const tts = await generateTtsClips([], base, { have: onCdn });
    console.log('TTS_CLIPS', tts.rendered, 'rendered,', tts.skipped, 'cached');
  }

  let files = collectUploadFiles(base);
  if (onCdn && onCdn.size) {
    // Re-PUTting identical clip bytes on every publish is pure cost.
    const before = files.length;
    files = dropPublishedClips(files, onCdn, base);
    const skipped = before - files.length;
    if (skipped) console.log('UPLOAD_SKIP', skipped, 'clips already on the CDN');
  }
  // And nor is re-PUTting everything else. This used to read "the JSON, the sprites change
  // in place and always upload", which meant 1703 objects went up on every publish whatever
  // the commit had touched — 19 minutes of it, for a commit that often changed none of them.
  // --force-upload is the way back, for a change that alters an object's metadata rather
  // than its bytes: ContentType and CacheControl are not in the listing, so a change to
  // cacheControl() is invisible to this and needs the whole plan sent again.
  if (remote && !flags.forceUpload) {
    const pruned = dropUnchanged(files, remote, base);
    if (pruned.skipped) console.log('UPLOAD_SKIP', pruned.skipped, 'objects already on R2, byte for byte');
    files = pruned.files;
  }
  console.log('UPLOAD_PLAN', files.length, 'files');

  let uploaded = [];
  if (!flags.skipUpload) {
    uploaded = await uploadFiles(client, bucket, files, base);
    console.log('UPLOADED', uploaded.length);
  } else {
    uploaded = files.map((f) => {
      const full = path.join(base, f.rel);
      return {
        rel: f.rel,
        key: objectKey(f.rel),
        bytes: fs.existsSync(full) ? fs.statSync(full).size : 0,
        type: f.ctype
      };
    }).filter((r) => r.bytes > 0);
  }

  if (!flags.skipVerify) {
    if (!client) {
      const created = createR2Client();
      client = created.client;
      bucket = created.bucket;
    }
    await verifyS3(client, bucket, uploaded);
    console.log('S3_HEAD ok', uploaded.length);
    for (const rel of REQUIRED_RELS) {
      await verifyPublicJson(rel, base);
      console.log('CDN_GET ok', rel);
    }
  }

  if (!flags.skipDeploy) {
    const hook = env('VERCEL_DEPLOY_HOOK_URL');
    const result = await triggerVercelDeploy(hook);
    console.log('VERCEL_DEPLOY', result.via || result.status);
  } else {
    console.log('skip Vercel deploy');
  }

  return { files, uploaded };
}

module.exports = {
  ROOT,
  PREFIX,
  REQUIRED_RELS,
  STATIC_FILES,
  HELP,
  loadEnvFile,
  loadPublishEnv,
  parsePublishArgs,
  env,
  cacheControl,
  listWorkbooks,
  collectUploadFiles,
  missingRequired,
  publicContentBase,
  objectKey,
  createR2Client,
  pooled,
  listRemoteObjects,
  ttsSizes,
  dropPublishedClips,
  dropUnchanged,
  uploadFiles,
  verifyS3,
  verifyPublicJson,
  triggerVercelDeploy,
  runUpload,
  runPublish
};
