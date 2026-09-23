/**
 * tests/test_save_size.js — a learner's save fits the cloud.
 *
 * It stopped fitting. /api/save refused anything past 256 KB, and every word studied adds a
 * record per modality — three for a word learned on the farm — so a save crossed the line
 * somewhere around 550–800 words, out of 3,183 in the game. From then on every PUT came back
 * 413, the client filed it as a plain HTTP failure not worth retrying, and cloud sync stopped
 * for good for exactly the players with the most to lose. Nothing said so but the "not
 * synced" chip.
 *
 * The ceiling is now on the inflated save and sized for the whole game with room to spare,
 * the client gzips what it sends (a save shrinks about twelvefold), a 413 has a reason of its
 * own, and ease is kept to two decimals so floating-point noise stops riding in every record.
 *
 * Run: node tests/test_save_size.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { Readable } = require('stream');

const ROOT = path.join(__dirname, '..');
const { SAVE_JSON_MAX, readSaveBody } = require('../api/_saveBody');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function same(actual, expected, msg) {
  assert(actual === expected, msg + (actual === expected ? '' : ' (payloads differ: ' + String(actual).length + ' vs ' + String(expected).length + ' chars)'));
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

// ── The scheduler, for realistic records ─────────────────────────────────────
const srsSrc = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'srs.js'), 'utf8');
const engine = srsSrc.slice(srsSrc.indexOf('const SRS_CFG = {'), srsSrc.indexOf('// Plot sState codes:'));
const sctx = { Math, Object, Array };
vm.createContext(sctx);
vm.runInContext(engine, sctx);
const S = (expr) => vm.runInContext(expr, sctx);
const sched = S('srsSchedule');
const G = S('GRADE');
const DAY = S('DAY_MS');

/** A record as the game would have written it: learned, then reviewed on a mixed record. */
function studied(i, t0) {
  let e = S('srsNewEntry()');
  let t = t0 - 200 * DAY + i * 1000;
  e = sched(e, G.GOOD, t); t += 16000;
  e = sched(e, G.GOOD, t); t += 46000;
  e = sched(e, G.GOOD, t);
  const grades = [G.GOOD, G.HARD, G.GOOD, G.AGAIN, G.GOOD, G.EASY, G.GOOD];
  for (let k = 0; k < 3 + (i % 5); k++) {
    t = e.due + (i % 7) * 3600 * 1000;
    e = sched(e, grades[(i + k) % grades.length], t);
    if (e.st === 'relearn') { t += 61000; e = sched(e, G.GOOD, t); }
  }
  return e;
}

/** Every word in the game, studied on all three modalities, plus a full attempt log. */
function wholeGameSave() {
  const kos = new Set();
  JSON.parse(fs.readFileSync(path.join(ROOT, 'levels.json'), 'utf8')).forEach(l => l.words.forEach(w => kos.add(w.ko)));
  fs.readdirSync(path.join(ROOT, 'worlds')).filter(f => /^(2b-unit-\d+|topik-2)\.json$/.test(f)).forEach((f) => {
    const w = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', f), 'utf8'));
    ((w.level && w.level.words) || []).forEach(x => kos.add(x.ko));
  });
  const t0 = 1_800_000_000_000;
  const srs = {};
  const harvests = {};
  [...kos].forEach((ko, i) => {
    srs[ko] = { m: { type: studied(i, t0), recognise: studied(i + 1, t0), listen: studied(i + 2, t0) } };
    harvests[ko] = 1 + (i % 9);
  });
  const attempts = [...kos].slice(0, 500).map((ko, i) => ({ ko, g: 2, m: 'type', at: t0 - i * 60000, ivl: 12, st: 'review' }));
  return { v: 11, srs, harvests, attempts, practice: {}, updatedAt: t0, words: kos.size };
}

console.log('====================================================');
console.log('A SAVE THAT FITS THE CLOUD');
console.log('====================================================');

// ── 1. The budget ────────────────────────────────────────────────────────────
console.log('\n--- 1. The whole game, studied on every modality ---');
const whole = wholeGameSave();
const words = whole.words; delete whole.words;
const json = JSON.stringify(whole);
const bytes = Buffer.byteLength(json);
const gz = zlib.gzipSync(Buffer.from(json));
assert(words > 3000, 'every word in the game is in it (' + words + ')');
assert(bytes > 256 * 1024, 'which is far past the old 256 KB ceiling (' + Math.round(bytes / 1024) + ' KB) — that ceiling was reachable');
assert(bytes * 3 < SAVE_JSON_MAX, 'and inside the new one with room for the game to triple (' + Math.round(bytes / 1024) + ' KB of ' + (SAVE_JSON_MAX / 1024) + ' KB)');
assert(gz.length * 8 < bytes, 'gzip takes it down more than eightfold (' + Math.round(gz.length / 1024) + ' KB on the wire)');

const eases = [];
Object.values(whole.srs).forEach(r => Object.values(r.m).forEach(e => eases.push(e.ease)));
assert(eases.length > 9000, 'three records a word (' + eases.length + ')');
eq(eases.filter(x => Math.round(x * 100) / 100 !== x).length, 0, 'and no ease carries floating-point noise');
assert(eases.some(x => x !== 2.5), 'ease did move — the check is not vacuous');

// ── 2. The endpoint reads it ─────────────────────────────────────────────────
console.log('\n--- 2. What the endpoint accepts ---');
const mkReq = (body, headers) => ({ body, headers: headers || {} });
function streamReq(buf, headers) {
  const r = Readable.from([buf.subarray(0, 1000), buf.subarray(1000)]);
  r.headers = headers || {};
  return r;
}
async function status(p) {
  try { await p; return 200; } catch (e) { return e.status || 500; }
}

(async () => {
  const fromGzip = await readSaveBody(mkReq(gz, { 'x-save-encoding': 'gzip', 'content-type': 'application/octet-stream' }));
  same(JSON.stringify(fromGzip), json, 'a gzipped save arrives intact');
  const byMagic = await readSaveBody(mkReq(gz, { 'content-type': 'application/octet-stream' }));
  same(JSON.stringify(byMagic), json, 'and is recognised by its magic bytes if a proxy drops the header');
  const parsed = await readSaveBody(mkReq(JSON.parse(json), { 'content-type': 'application/json' }));
  same(JSON.stringify(parsed), json, 'a plain JSON save the platform already parsed is taken as it is');
  const streamed = await readSaveBody(streamReq(gz, { 'x-save-encoding': 'gzip' }));
  same(JSON.stringify(streamed), json, 'and so is a compressed body that has to be read off the stream');
  const plainStream = await readSaveBody(streamReq(Buffer.from(json)));
  same(JSON.stringify(plainStream), json, 'or an uncompressed one');

  const huge = { v: 11, blob: 'x'.repeat(SAVE_JSON_MAX + 10) };
  eq(await status(readSaveBody(mkReq(huge))), 413, 'a parsed save past the ceiling is refused with 413');
  const bomb = zlib.gzipSync(Buffer.alloc(SAVE_JSON_MAX + 1024 * 1024, 0x20));
  assert(bomb.length < 64 * 1024, 'a compressed body that is small on the wire (' + Math.round(bomb.length / 1024) + ' KB)');
  eq(await status(readSaveBody(mkReq(bomb, { 'x-save-encoding': 'gzip' }))), 413,
    'but inflates past the ceiling is refused while inflating');
  eq(await readSaveBody(mkReq(Buffer.from([0x1f, 0x8b, 1, 2, 3]), { 'x-save-encoding': 'gzip' })), null,
    'a corrupt compressed body reads as no body (400), not as a crash');
  eq(await readSaveBody(mkReq(Buffer.from('{not json'))), null, 'and so does JSON that does not parse');
  eq(await readSaveBody(streamReq(Buffer.alloc(0))), null, 'an empty body is no body');

  // ── 3. The client sends what the endpoint reads ────────────────────────────
  console.log('\n--- 3. The client compresses, the endpoint inflates ---');
  const src = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'save.js'), 'utf8');
  const a = src.indexOf('// ── Cloud sign-in ─');
  const b = src.indexOf('// ── Cloud sign-in end ─');
  const block = src.slice(a, b);
  const sent = [];
  const c = {
    console, setTimeout, clearTimeout, Date, TextEncoder, AbortController,
    CompressionStream, Blob, Response, Uint8Array,
    hvT: (k) => k, showToast() {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} },
    fetch: async (url, opts) => { sent.push({ url, opts }); return { status: 200, json: async () => ({ ok: true }) }; }
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(block, c);
  vm.runInContext('getGoogleToken = () => "tok"; googleTokenIsFresh = () => true; serverSessionAlive = () => false;', c);
  c.__save = whole;
  const r = await vm.runInContext('cloudSaveRequest("PUT", __save)', c);
  eq(r.status, 200, 'the PUT goes out');
  const opts = sent[0] && sent[0].opts;
  eq(opts && opts.headers['X-Save-Encoding'], 'gzip', 'marked as compressed');
  eq(opts && opts.headers['Content-Type'], 'application/octet-stream', 'as octet-stream, so the platform does not parse it as JSON');
  assert(opts && opts.body && opts.body.length < bytes / 8, 'and small on the wire (' + Math.round((opts && opts.body.length || 0) / 1024) + ' KB)');
  const landed = await readSaveBody(mkReq(Buffer.from(opts.body), { 'x-save-encoding': 'gzip' }));
  same(JSON.stringify(landed), json, 'the endpoint reads back exactly what the client sent');
  const getR = await vm.runInContext('cloudSaveRequest("GET")', c);
  eq(getR.status, 200, 'a GET still goes out');
  eq(sent[1] && sent[1].opts.body, undefined, 'with no body to encode');

  // A browser without CompressionStream sends the JSON as before.
  const c2 = Object.assign({}, c, { CompressionStream: undefined });
  c2.window = c2;
  vm.createContext(c2);
  vm.runInContext(block, c2);
  vm.runInContext('getGoogleToken = () => "tok"; googleTokenIsFresh = () => true; serverSessionAlive = () => false;', c2);
  sent.length = 0;
  c2.__save = { v: 11, small: true };
  await vm.runInContext('cloudSaveRequest("PUT", __save)', c2);
  eq(sent[0].opts.headers['Content-Type'], 'application/json', 'no CompressionStream: plain JSON');
  same(sent[0].opts.body, JSON.stringify({ v: 11, small: true }), 'exactly as it was sent before');

  // ── 4. A 413 says what it is ───────────────────────────────────────────────
  console.log('\n--- 4. A refusal for size ---');
  const chainSrc = src.slice(src.indexOf('// ── Cloud writes, serialized ─'), src.indexOf('// ── Cloud writes end ─'));
  const scheduled = [];
  const cc = {
    console, Date, TextEncoder, JSON,
    setTimeout: (fn, ms) => { scheduled.push(ms); return scheduled.length; }, clearTimeout() {},
    hvT: (k) => k, showToast() {},
    hasCloudCredential: () => true, getGoogleToken: () => 'tok', serverSessionAlive: () => false,
    forgetServerSession() {}, setGoogleSession() {}, collectSave: () => ({ v: 11 }),
    cloudSaveRequest: async () => ({ status: 413, json: { error: 'save too large' } })
  };
  cc.window = cc;
  vm.createContext(cc);
  vm.runInContext(chainSrc, cc);
  const res = await vm.runInContext('pushCloudSave({ v: 11 })', cc);
  eq(res.reason, 'too-large', 'a 413 is filed as too-large, not as a bare http:413');
  eq(vm.runInContext('_cloudLastError', cc), 'too-large', 'which is what the chip reads');
  eq(scheduled.length, 0, 'and it is not retried — the same save is the same size a minute later');
  const en = fs.readFileSync(path.join(ROOT, 'js', 'locales', 'en.js'), 'utf8');
  const vi = fs.readFileSync(path.join(ROOT, 'js', 'locales', 'vi.js'), 'utf8');
  assert(/"ui\.save\.reason\.too-large"/.test(en) && /"ui\.save\.reason\.too-large"/.test(vi),
    'and the reason reads in both interface languages');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_save_size: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
