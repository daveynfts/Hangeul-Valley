/**
 * Shared R2 content pipeline: file list, upload, CDN verify.
 * Credentials: env R2_* (or --env path / .env.local). Does not print secrets.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Lazy so consumers that never touch R2 (tests/test_r2_content.js, CI's test job
// with no root node_modules) can load this module without @aws-sdk/client-s3.
let awsSdk = null;
function sdk() {
  if (!awsSdk) awsSdk = require('@aws-sdk/client-s3');
  return awsSdk;
}

const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'hangeul-valley/';
const REQUIRED_RELS = [
  'levels.json',
  'facts.json',
  'sprites/catalog.json',
  'skins/catalog.json'
];
const STATIC_FILES = [
  ['levels.json', 'application/json'],
  ['facts.json', 'application/json'],
  ['worlds/2b-unit-10.json', 'application/json'],
  ['worlds/unit10-desk-quiz.json', 'application/json'],
  ['worlds/unit10-layout.json', 'application/json'],
  ['worlds/unit10-mindmap.jpg', 'image/jpeg'],
  ['sprites/catalog.json', 'application/json'],
  ['skins/catalog.json', 'application/json'],
  ['diner/content.json', 'application/json']
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
    skipDeploy: false,
    envFile: '',
    help: false
  };
  const list = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--skip-validate') flags.skipValidate = true;
    else if (a === '--skip-upload') flags.skipUpload = true;
    else if (a === '--skip-verify') flags.skipVerify = true;
    else if (a === '--skip-deploy') flags.skipDeploy = true;
    else if (a === '--env') flags.envFile = list[++i] || '';
    else if (a === '--help' || a === '-h') flags.help = true;
    else throw new Error('Unknown flag: ' + a);
  }
  return flags;
}

function cacheControl(ctype) {
  if (ctype === 'application/json') return 'public, max-age=60';
  return 'public, max-age=86400';
}

function addFile(out, seen, rel, ctype) {
  const posix = String(rel).replace(/\\/g, '/');
  if (!posix || seen.has(posix)) return;
  seen.add(posix);
  out.push({ rel: posix, ctype: ctype });
}

function collectUploadFiles(root) {
  const base = root || ROOT;
  const out = [];
  const seen = new Set();
  STATIC_FILES.forEach(([rel, ctype]) => addFile(out, seen, rel, ctype));

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
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey }
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

async function uploadFiles(client, bucket, files, root) {
  const { PutObjectCommand } = sdk();
  const base = root || ROOT;
  const uploaded = [];
  for (const { rel, ctype } of files) {
    const full = path.join(base, rel);
    if (!fs.existsSync(full)) {
      throw new Error('Missing upload file: ' + rel);
    }
    const Body = fs.readFileSync(full);
    const Key = objectKey(rel);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body,
      ContentType: ctype,
      CacheControl: cacheControl(ctype)
    }));
    uploaded.push({ rel, key: Key, bytes: Body.length, type: ctype });
    console.log('PUT', Key, Body.length + 'B');
  }
  return uploaded;
}

async function verifyS3(client, bucket, uploaded) {
  const { HeadObjectCommand } = sdk();
  for (const row of uploaded) {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: row.key }));
    const remote = Number(head.ContentLength);
    if (remote !== row.bytes) {
      throw new Error('S3 size mismatch for ' + row.key + ': local ' + row.bytes + ' remote ' + remote);
    }
  }
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
  if (process.env.GITHUB_ACTIONS) {
    throw new Error('VERCEL_DEPLOY_HOOK_URL is required in CI; the Vercel CLI fallback cannot authenticate.');
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
  --skip-verify      do not HeadObject / CDN GET
  --skip-deploy      do not POST VERCEL_DEPLOY_HOOK_URL
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
  const files = collectUploadFiles(base);
  const missing = missingRequired(base);
  if (missing.length) throw new Error('Missing required content: ' + missing.join(', '));

  console.log('PUBLISH_PLAN', files.length, 'files');
  if (flags.dryRun) {
    files.forEach((f) => console.log(' ', f.rel, f.ctype));
    console.log('dry-run: no upload, no deploy');
    return { dryRun: true, files };
  }

  if (!flags.skipValidate) {
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate_content.js')], {
      stdio: 'inherit',
      cwd: ROOT
    });
  }

  let uploaded = [];
  let client = null;
  let bucket = '';
  if (!flags.skipUpload) {
    const created = createR2Client();
    client = created.client;
    bucket = created.bucket;
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
  collectUploadFiles,
  missingRequired,
  publicContentBase,
  objectKey,
  createR2Client,
  uploadFiles,
  verifyS3,
  verifyPublicJson,
  triggerVercelDeploy,
  runUpload,
  runPublish
};
