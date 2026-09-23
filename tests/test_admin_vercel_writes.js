/**
 * tests/test_admin_vercel_writes.js — what the production admin writes, and over what.
 *
 * Two faults in api/admin/[...path].js, both in the write path:
 *
 *   - Content saves committed against the file's SHA read a moment before the write, inside
 *     the same request, so the "GitHub refuses a stale SHA" protection protected nothing: an
 *     editor opened an hour ago saved straight over every commit made since. The read now
 *     hands out the blob SHA of the bytes it showed, the editor sends it back as If-Match,
 *     and a file changed since is refused with 409.
 *   - The Translate tab's save wrote into the function's own filesystem, which is read-only on
 *     Vercel, so it could not work there at all; it merged into the deployment's copy of the
 *     catalogue, which a second save before the next deploy would silently drop; it never
 *     added a new catalogue to js/locales/catalogs.js; and it called interface strings "live
 *     on the CDN" when the game reads those from the deployment. It runs in a scratch copy
 *     now, merges on GitHub's copy, keeps the index, and says what is live.
 *
 * The real handler runs here against GitHub, the CDN, R2 and Google all answered in memory,
 * with every filesystem write watched to prove none lands in the bundle.
 *
 * Run: node tests/test_admin_vercel_writes.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(a, b, msg) {
  assert(a === b, msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')');
}
// For whole files: say whether they match without printing them.
function same(a, b, msg) {
  assert(a === b, msg + (a === b ? '' : ' (differs: ' + String(a).length + ' vs ' + String(b).length + ' chars)'));
}

// ── The outside world, in memory ──────────────────────────────────────────────
const CDN = 'https://cdn.daveynfts.com/hangeul-valley/';
const cdn = new Map();                 // rel -> text, what the CDN serves
const repo = new Map();                // rel -> text, what GitHub's main holds
const commits = [];                    // { rel, message }
const { blobSha } = require('../api/_github');

class Cmd { constructor(input) { this.input = input; } }
const fakeS3 = {
  S3Client: class { async send(cmd) { return cmd.run(); } },
  PutObjectCommand: class extends Cmd {
    run() { cdn.set(this.input.Key.replace(/^hangeul-valley\//, ''), Buffer.from(this.input.Body).toString('utf8')); return {}; }
  }
};
const realLoad = Module._load;
Module._load = function (request) {
  if (request === '@aws-sdk/client-s3') return fakeS3;
  return realLoad.apply(this, arguments);
};
Object.assign(process.env, {
  GITHUB_TOKEN: 't', GITHUB_REPO: 'owner/repo', GITHUB_BRANCH: 'main',
  ADMIN_GOOGLE_SUB: 'the-owner', GOOGLE_CLIENT_ID: 'cid',
  R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's'
});
const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const notFound = () => ({ ok: false, status: 404, json: async () => ({}), text: async () => 'not found' });
global.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    return /id_token=tok-owner/.test(u) ? ok({ aud: 'cid', iss: 'accounts.google.com', sub: 'the-owner', email: 'o@x' }) : notFound();
  }
  if (u.startsWith(CDN)) {
    const rel = decodeURIComponent(u.slice(CDN.length).split('?')[0]);
    return cdn.has(rel) ? ok(cdn.get(rel)) : notFound();
  }
  const m = /^https:\/\/api\.github\.com\/repos\/owner\/repo\/contents\/([^?]+)/.exec(u);
  if (m) {
    const rel = m[1].split('/').map(decodeURIComponent).join('/');
    const method = (init && init.method) || 'GET';
    if (method === 'GET') {
      if (!repo.has(rel)) return notFound();
      const text = repo.get(rel);
      return ok({ sha: blobSha(text), content: Buffer.from(text, 'utf8').toString('base64') });
    }
    const body = JSON.parse(init.body);
    const cur = repo.has(rel) ? blobSha(repo.get(rel)) : null;
    if ((body.sha || null) !== cur) return { ok: false, status: 409, json: async () => ({}), text: async () => 'sha mismatch' };
    const text = Buffer.from(body.content, 'base64').toString('utf8');
    repo.set(rel, text);
    commits.push({ rel, message: body.message });
    return ok({ content: { sha: blobSha(text) }, commit: { sha: 'c' + commits.length, html_url: 'https://example/c' } });
  }
  return notFound();
};

// Every write under the repo root is a write into the deployment, which Vercel refuses.
const bundleWrites = [];
['writeFileSync', 'renameSync', 'mkdirSync', 'openSync', 'rmSync', 'unlinkSync'].forEach((fn) => {
  const real = fs[fn];
  fs[fn] = function (p) {
    const target = typeof p === 'string' ? path.resolve(p) : '';
    if (target && target.startsWith(ROOT) && !/node_modules/.test(target)) bundleWrites.push(fn + ' ' + path.relative(ROOT, target));
    return real.apply(this, arguments);
  };
});

const handler = require('../api/admin/[...path].js');
function call(method, url, { body, headers, query } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, getHeader(k) { return this.headers[k.toLowerCase()]; },
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, body: o }); },
      end() { resolve({ status: this.statusCode, body: null }); }
    };
    handler({ method, url, headers: Object.assign({ authorization: 'Bearer tok-owner' }, headers || {}), query: query || {}, body }, res);
  });
}
const lf = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

(async () => {
  console.log('====================================================');
  console.log('THE PRODUCTION ADMIN\'S WRITES');
  console.log('====================================================');

  // ── 1. A content save is made against the version that was opened ──────────
  console.log('\n--- 1. Content: a stale editor does not save over a newer commit ---');
  const REL = 'worlds/topik-2.json';
  const v1text = lf(REL);
  repo.set(REL, v1text);
  cdn.set(REL, v1text);
  const opened = await call('GET', '/api/admin/content', { query: { key: 'world/topik-2' } });
  eq(opened.status, 200, 'the editor opens the world');
  eq(opened.body.data.version, blobSha(v1text), 'and is told the version of exactly the bytes it was shown');

  // Somebody else commits in the meantime; the CDN has not been republished yet.
  const other = JSON.parse(v1text);
  other.titleKo = (other.titleKo || '') + ' ';
  repo.set(REL, JSON.stringify(other, null, 2) + '\n');
  const edit = JSON.parse(JSON.stringify(opened.body.data.body));
  edit.source = (edit.source || '') + ' (edited)';
  const stale = await call('PUT', '/api/admin/content', { query: { key: 'world/topik-2' }, body: edit, headers: { 'if-match': opened.body.data.version } });
  eq(stale.status, 409, 'saving the copy opened before that commit is refused');
  same(repo.get(REL), JSON.stringify(other, null, 2) + '\n', 'and the other commit stands');

  // The CDN catches up; the editor reloads and saves.
  cdn.set(REL, repo.get(REL));
  const reopened = await call('GET', '/api/admin/content', { query: { key: 'world/topik-2' } });
  eq(reopened.body.data.version, blobSha(repo.get(REL)), 'reloaded, the editor has the new version');
  const edit2 = JSON.parse(JSON.stringify(reopened.body.data.body));
  edit2.source = (edit2.source || '') + ' (edited)';
  const saved = await call('PUT', '/api/admin/content', { query: { key: 'world/topik-2' }, body: edit2, headers: { 'if-match': reopened.body.data.version } });
  eq(saved.status, 200, 'and saving on top of it goes through');
  eq(saved.body.data.version, blobSha(repo.get(REL)), 'handing back the version the next save is made against');
  same(cdn.get(REL), repo.get(REL), 'with the same bytes live on the CDN');
  const legacy = await call('PUT', '/api/admin/content', { query: { key: 'world/topik-2' }, body: edit2 });
  eq(legacy.status, 200, 'a save with no version at all still works, as before');

  // ── 2. A translation save ───────────────────────────────────────────────────
  console.log('\n--- 2. Translate: merged on GitHub\'s copy, in a scratch directory ---');
  const i18n = require('../admin/lib/i18n');
  const SRC = 'worlds/2b-unit-10.json';
  const CAT = 'locales/vi/worlds/2b-unit-10.json';
  const IDX = 'js/locales/catalogs.js';
  const rowsNow = i18n.rows(ROOT, SRC, 'vi').rows;
  const [first, second] = rowsNow;
  assert(!!first && !!second, 'Unit 10 has strings to translate');
  // An earlier save, committed and uploaded, that this deployment has not seen.
  const earlier = JSON.parse(lf(CAT));
  earlier.entries[first.key] = 'bản dịch trước đó';
  const earlierText = JSON.stringify(earlier, null, 2) + '\n';
  repo.set(CAT, earlierText);
  cdn.set(CAT, earlierText);
  repo.set(IDX, lf(IDX));
  bundleWrites.length = 0;
  const commitsBefore = commits.length;
  const tr = await call('PUT', '/api/admin/i18n', { body: { source: SRC, lang: 'vi', entries: { [second.key]: 'bản dịch mới' } } });
  eq(tr.status, 200, 'the save goes through on a read-only deployment');
  eq(bundleWrites.length, 0, 'without writing a byte into the bundle' + (bundleWrites.length ? ': ' + bundleWrites.join(', ') : ''));
  const committed = JSON.parse(repo.get(CAT));
  eq(committed.entries[second.key], 'bản dịch mới', 'the new translation is committed');
  eq(committed.entries[first.key], 'bản dịch trước đó', 'and the earlier save is kept, not merged away against the deployment’s copy');
  same(cdn.get(CAT), repo.get(CAT), 'the catalogue is live on the CDN');
  eq(tr.body.data.live, true, 'and says so');
  eq(commits.length - commitsBefore, 1, 'an existing catalogue needs no index commit');

  const readBack = await call('GET', '/api/admin/i18n', { query: { lang: 'vi', source: SRC } });
  const row = readBack.body.data.rows.find((r) => r.key === second.key);
  eq(row && row.target, 'bản dịch mới', 'the tab reads the saved translation straight back, before any deploy');

  // ── 3. A catalogue the index does not list yet ─────────────────────────────
  console.log('\n--- 3. A new catalogue joins js/locales/catalogs.js ---');
  const idx = i18n.parseCatalogIndex(lf(IDX));
  const without = i18n.setCatalogIndexed(idx, SRC, 'vi', false);
  repo.set(IDX, i18n.renderCatalogIndex(without));
  const before3 = commits.length;
  const tr3 = await call('PUT', '/api/admin/i18n', { body: { source: SRC, lang: 'vi', entries: { [second.key]: 'bản dịch mới nhất' } } });
  eq(tr3.status, 200, 'the save goes through');
  eq(commits.length - before3, 2, 'as the catalogue and then the index');
  assert(i18n.parseCatalogIndex(repo.get(IDX)).vi.includes(SRC), 'the index now lists the catalogue, so the game will ask for it');
  same(repo.get(IDX), lf(IDX), 'in exactly the text the local writer produces');
  assert(/next deploy/.test(tr3.body.data.note), 'and the note says the game starts loading it with the next deploy: ' + tr3.body.data.note);

  // ── 4. Interface strings ───────────────────────────────────────────────────
  console.log('\n--- 4. Interface strings are not "live on the CDN" ---');
  const CH = 'js/locales/vi.js';
  repo.set(CH, lf(CH));
  const chromeRows = i18n.rows(ROOT, 'chrome', 'vi').rows;
  const tr4 = await call('PUT', '/api/admin/i18n', { body: { source: 'chrome', lang: 'vi', entries: { [chromeRows[0].key]: 'chuỗi giao diện' } } });
  eq(tr4.status, 200, 'an interface-string save goes through');
  assert(repo.get(CH).includes('"chuỗi giao diện"'), 'and is committed to js/locales/vi.js');
  eq(tr4.body.data.live, false, 'but is not called live');
  assert(/next deploy/.test(tr4.body.data.note), 'the note says players see it after the next deploy: ' + tr4.body.data.note);
  eq(bundleWrites.length, 0, 'still nothing written into the bundle');

  global.fetch = undefined;
  Module._load = realLoad;
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
