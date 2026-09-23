'use strict';
/**
 * tests/test_cloud_merge.js — two devices, one account, and nothing either of them did lost.
 *
 * The cloud kept whichever copy of a save was written last — the whole document. A laptop
 * whose tab had been open since yesterday wrote a newer timestamp than the phone that played
 * this morning, so its first autosave put yesterday back over the morning's reviews. The 409
 * the endpoint answered with only caught a request arriving out of order; a device that was
 * simply behind won.
 *
 * Now every stored save carries a revision, every write names the revision it was built on,
 * and a write built on an old one is handed the current copy to merge with
 * (js/systems/saveMerge.js): records of what happened are merged, the live device's
 * game-in-the-moment is kept. Signing in merges the same way instead of picking one copy.
 *
 * The endpoint here is the real api/save.js, over an in-memory bucket, and each device is the
 * whole game source in its own sandbox with its own storage.
 *
 * Run: node tests/test_cloud_merge.js
 */

const path = require('path');
const vm = require('vm');
const Module = require('module');
const { Readable } = require('stream');
const { readGameSource } = require('../scripts/gameSource');
const M = require('../js/systems/saveMerge.js');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

// ── An in-memory bucket, in place of the AWS SDK ────────────────────────────
const bucket = new Map();
class Cmd { constructor(input) { this.input = input; } }
const fakeS3 = {
  S3Client: class { async send(cmd) { return cmd.run(); } },
  GetObjectCommand: class extends Cmd {
    run() {
      if (!bucket.has(this.input.Key)) { const e = new Error('no such key'); e.name = 'NoSuchKey'; throw e; }
      const text = bucket.get(this.input.Key);
      return { Body: { transformToString: async () => text } };
    }
  },
  PutObjectCommand: class extends Cmd { run() { bucket.set(this.input.Key, String(this.input.Body)); return {}; } },
  ListObjectsV2Command: class extends Cmd { run() { return { Contents: [], IsTruncated: false }; } }
};
const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@aws-sdk/client-s3') return fakeS3;
  return realLoad.apply(this, arguments);
};
Object.assign(process.env, {
  R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'test', GOOGLE_CLIENT_ID: 'cid'
});
// Google's tokeninfo, answered here: a token 'tok-<sub>' is that account.
const realFetch = global.fetch;
global.fetch = async (url) => {
  const m = /id_token=tok-([A-Za-z0-9]+)/.exec(String(url));
  if (!m) return { ok: false, json: async () => ({}) };
  return { ok: true, json: async () => ({ aud: 'cid', iss: 'accounts.google.com', sub: m[1], email: m[1] + '@x' }) };
};
const saveHandler = require('../api/save.js');

/** Call the endpoint the way Vercel would: a JSON body arrives already parsed. */
function callSave({ method, headers, body }) {
  return new Promise((resolve) => {
    const h = {};
    Object.keys(headers || {}).forEach((k) => { h[k.toLowerCase()] = headers[k]; });
    const raw = body == null ? [] : [Buffer.from(body instanceof Uint8Array ? body : String(body))];
    const req = Readable.from(raw);
    req.method = method;
    req.headers = h;
    req.url = '/api/save';
    if (typeof body === 'string' && /json/.test(h['content-type'] || '')) req.body = JSON.parse(body);
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      getHeader(k) { return this.headers[k.toLowerCase()]; },
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, json: o }); },
      end() { resolve({ status: this.statusCode, json: null }); }
    };
    saveHandler(req, res);
  });
}
const put = (sub, save) => callSave({ method: 'PUT', headers: { Authorization: 'Bearer tok-' + sub, 'Content-Type': 'application/json' }, body: JSON.stringify(save) });
const get = (sub) => callSave({ method: 'GET', headers: { Authorization: 'Bearer tok-' + sub } });

// ── A device ─────────────────────────────────────────────────────────────────
const SOURCE = readGameSource();
const LEVELS = require(path.join('..', 'levels.json'));
function device(name, sub) {
  const storage = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
  };
  const el = () => {
    const classes = new Set();
    return {
      style: {}, children: [], innerHTML: '', textContent: '',
      classList: { add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)), contains: (c) => classes.has(c), toggle: () => true },
      appendChild(c) { return c; }, addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      hasAttribute() { return false; }, removeAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      remove() {}, focus() {}, blur() {}, click() {}
    };
  };
  const els = {};
  const d = { name, toasts: [] };
  const sb = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    IS_NODE: true, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: { getElementById: (id) => els[id] || (els[id] = el()), createElement: () => el(), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: el(), documentElement: el(), head: el() },
    localStorage: storage(), sessionStorage: storage(),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost', reload() {} },
    performance: { now: () => 0 }, Image: class {}, Audio: class { play() {} pause() {} },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'), btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    fetch: async (url, opts) => {
      const u = String(url);
      if (u.indexOf('/api/save') < 0) return { ok: false, status: 404, json: async () => ({}) };
      const r = await callSave({ method: (opts && opts.method) || 'GET', headers: (opts && opts.headers) || {}, body: opts && opts.body });
      return { status: r.status, ok: r.status === 200, json: async () => r.json };
    },
    Phaser: {
      AUTO: 0, Scene: class {}, Game: class {}, Scale: { RESIZE: 0, CENTER_BOTH: 0 },
      Math: { Between: (a) => a, FloatBetween: (a) => a, Clamp: (v, a, b) => Math.min(b, Math.max(a, v)), Distance: { Between: () => 0 }, RND: { pick: (a) => a && a[0] } },
      Geom: { Rectangle: class {}, Circle: class {} },
      Display: { Color: { HexStringToColor: () => ({ color: 0 }), GetColor: () => 0, Interpolate: { ColorWithColor: () => ({ r: 0, g: 0, b: 0 }) } } },
      Utils: { Array: { Shuffle: (a) => a, GetRandom: (a) => a && a[0] } },
      Input: { Keyboard: { KeyCodes: new Proxy({}, { get: () => 0 }), JustDown: () => false } },
      Textures: { FilterMode: { NEAREST: 1 } },
      GameObjects: { Graphics: class {}, Container: class {}, Sprite: class {}, Image: class {}, Text: class {} },
      BlendModes: { NORMAL: 0, ADD: 1 }, Tilemaps: {}, Curves: {}, Structs: {}
    }
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(SOURCE, sb, { filename: name + '.js' });
  sb.showToast = (m) => d.toasts.push(String(m));
  sb.__levels = JSON.parse(JSON.stringify(LEVELS));
  const R = (expr) => vm.runInContext(expr, sb);
  R('levelsData = __levels; _cloudSleep = () => Promise.resolve();');
  sb.localStorage.setItem('hv_google_token', 'tok-' + sub);
  R('googleAuth.token = "tok-' + sub + '"; googleAuth.user = { sub: "' + sub + '" };');
  d.R = R;
  d.sync = () => R('syncCloudSave()');
  d.learn = (ko, t) => R('gradeWord(' + JSON.stringify(ko) + ', GRADE.GOOD, "type", ' + t + '); gradeWord(' + JSON.stringify(ko) + ', GRADE.GOOD, "type", ' + (t + 16000) + '); gradeWord(' + JSON.stringify(ko) + ', GRADE.GOOD, "type", ' + (t + 62000) + ');');
  d.push = () => R('pushCloudSave(collectSave())');
  d.knows = (ko) => R('!!(peekSrs(' + JSON.stringify(ko) + ') && peekSrs(' + JSON.stringify(ko) + ').st === "review")');
  return d;
}
const cloudCopy = (sub) => JSON.parse(bucket.get('saves/' + sub + '.json') || 'null');
const cloudKnows = (sub, ko) => { const c = cloudCopy(sub); return !!(c && c.srs && c.srs[ko] && c.srs[ko].m.type && c.srs[ko].m.type.st === 'review'); };

(async () => {
  const W = LEVELS[0].words.map((w) => w.ko);

  // ── 1. The merge itself ────────────────────────────────────────────────────
  console.log('\n--- 1. mergeSaves ---');
  const e = (last, ivl, st) => ({ st: st || 'review', step: 0, ivl, ease: 2.5, reps: 3, lapses: 0, due: last + ivl * 864e5, last });
  const phone = {
    v: 11, updatedAt: 500, currencies: { coins: 10 }, plots: [{ i: 0, ko: 'x' }], lastWorld: 'topik-2',
    srs: { A: { m: { type: e(300, 5) } }, B: { m: { type: e(100, 2), recognise: e(400, 1) } } },
    harvests: { A: 3, B: 1 }, attempts: [{ ko: 'A', g: 2, m: 'type', at: 300 }], practice: { 'wb:x:1': { n: 2, ok: 3, of: 4, at: 300 } },
    unlockedLevels: [0, 2], unlockedTrophies: ['t1'], playerRank: { level: 3, xp: 5 },
    leaderboards: { personalBests: { arcadeHighScore: 50, dungeonMaxFloor: 9 } }
  };
  const laptop = {
    v: 11, updatedAt: 900, currencies: { coins: 99 }, plots: [], lastWorld: undefined,
    srs: { B: { m: { type: e(350, 4) } }, C: { m: { type: e(200, 1) } } },
    harvests: { B: 4, C: 1 }, attempts: [{ ko: 'B', g: 2, m: 'type', at: 350 }, { ko: 'A', g: 2, m: 'type', at: 300 }],
    practice: { 'wb:x:1': { n: 5, ok: 9, of: 10, at: 200 } },
    unlockedLevels: [0, 1], unlockedTrophies: ['t2'], playerRank: { level: 2, xp: 90 },
    leaderboards: { personalBests: { arcadeHighScore: 80, dungeonMaxFloor: 3 } }
  };
  const m = M.mergeSaves(laptop, phone, { prefer: 'a' });
  eq(m.currencies.coins, 99, 'the live copy’s coins are kept whole');
  eq(m.plots.length, 0, 'and its plots');
  eq(m.lastWorld, 'topik-2', 'but a field the live copy left undefined does not blank the other’s');
  eq(Object.keys(m.srs).sort().join(), 'A,B,C', 'every word either device studied is there');
  eq(m.srs.B.m.type.last, 350, 'a modality keeps its most recent answer');
  eq(m.srs.B.m.recognise.last, 400, 'and a modality only one side studied is kept');
  eq(m.harvests.B, 4, 'harvest counts keep the larger tally');
  eq(m.attempts.length, 2, 'the review history is the union, each answer once');
  assert(m.attempts[0].at <= m.attempts[1].at, 'in order');
  eq(m.practice['wb:x:1'].n, 5, 'a practice count keeps the larger count rather than adding a shared past twice');
  eq(m.unlockedLevels.join(), '0,1,2', 'unlocks are unioned');
  eq(m.unlockedTrophies.slice().sort().join(), 't1,t2', 'and trophies');
  eq(m.playerRank.level, 3, 'rank keeps the copy further up the ladder');
  eq(m.leaderboards.personalBests.arcadeHighScore, 80, 'a personal best is the higher of the two');
  eq(m.leaderboards.personalBests.dungeonMaxFloor, 9, 'field by field');
  eq(m.updatedAt, 900, 'and it is as new as the newer copy');
  assert(M.saveProgressDiffers(m, laptop), 'the merge holds progress the laptop did not have');
  assert(!M.saveProgressDiffers(M.mergeSaves(laptop, laptop), laptop), 'a copy merged with itself adds nothing');
  const tail = M.mergeSaves(phone, { updatedAt: 999, srs: { A: { m: { type: e(600, 9) } } }, currencies: { coins: 11 } }, { prefer: 'b' });
  eq(tail.srs.A.m.type.last, 600, 'a partial copy — a closing tab’s tail — lands its changed records');
  eq(tail.srs.B.m.recognise.last, 400, 'and leaves every record it did not carry alone');
  eq(tail.harvests.A, 3, 'including the fields it had no reason to mention');
  eq(tail.currencies.coins, 11, 'while its game-in-the-moment wins as the live copy');
  eq(M.mergeSrsRecords({ a: 1 }, {}).a, 1, 'a record in a shape the merge does not know is carried, not dropped');

  // ── 2. The endpoint keeps revisions ────────────────────────────────────────
  console.log('\n--- 2. api/save.js ---');
  bucket.clear();
  let r = await put('solo', { v: 11, baseRev: 0, updatedAt: Date.now(), srs: {} });
  eq(r.status, 200, 'a first write on an empty account lands');
  eq(r.json.rev, 1, 'as revision 1');
  eq(cloudCopy('solo').baseRev, undefined, 'the base it was built on is not stored');
  r = await put('solo', { v: 11, baseRev: 1, updatedAt: Date.now(), srs: {} });
  eq(r.json.rev, 2, 'a write on top of the current revision lands as the next');
  r = await put('solo', { v: 11, baseRev: 1, updatedAt: Date.now() + 1000, srs: {} });
  eq(r.status, 409, 'a write built on an older revision is refused, however new its timestamp');
  eq(r.json.error, 'conflict', 'as a conflict');
  eq(r.json.rev, 2, 'naming the revision it has to be built on');
  assert(r.json.data && r.json.data.rev === 2, 'and handing over that copy to merge with');
  r = await put('solo', { v: 11, updatedAt: 1, srs: {} });
  eq(r.status, 409, 'a build that predates revisions keeps its timestamp rule');
  eq(r.json.error, 'stale save', 'and its old answer');
  r = await put('solo', { v: 11, updatedAt: Date.now() + 2000, srs: {} });
  eq(r.json.rev, 3, 'and when it does land, the revision still moves on — so newer builds notice');
  r = await get('solo');
  eq(r.json.data.rev, 3, 'a read hands the revision back with the save');

  // ── 3. Two devices ─────────────────────────────────────────────────────────
  console.log('\n--- 3. A phone and a laptop on one account ---');
  bucket.clear();
  const T = 1_800_000_000_000;
  const lap = device('laptop', 'amy');
  const ph = device('phone', 'amy');
  await lap.sync();
  eq(cloudCopy('amy') && cloudCopy('amy').rev, 1, 'the laptop seeds the account');
  await ph.sync();
  eq(ph.R('_cloudRev'), 1, 'the phone reads it');

  // The laptop's tab stays open. The phone plays in the morning.
  ph.learn(W[0], T); ph.learn(W[1], T + 1000);
  await ph.push();
  assert(cloudKnows('amy', W[0]) && cloudKnows('amy', W[1]), 'the phone’s morning reaches the cloud');

  // The laptop, a day behind, plays in the afternoon and saves.
  lap.learn(W[2], T + 5000);
  lap.R('playerCurrencies.coins = 4321;');
  const res = await lap.push();
  eq(res.ok, true, 'the laptop’s save lands');
  eq(res.merged, true, 'after merging, because the phone wrote since the laptop read');
  assert(cloudKnows('amy', W[0]) && cloudKnows('amy', W[1]), 'the phone’s reviews are still in the cloud');
  assert(cloudKnows('amy', W[2]), 'alongside the laptop’s');
  eq(cloudCopy('amy').currencies.coins, 4321, 'with the laptop’s coins — it is the device being played');
  assert(lap.knows(W[0]) && lap.knows(W[1]), 'and the laptop now has the phone’s words in memory too');
  assert(lap.toasts.some((t) => /merged|gộp/.test(t)), 'and says so: ' + JSON.stringify(lap.toasts));

  // The phone saves again without having read the laptop's write.
  ph.learn(W[3], T + 9000);
  const res2 = await ph.push();
  eq(res2.merged, true, 'the phone merges in its turn');
  ['0', '1', '2', '3'].forEach((i) => assert(cloudKnows('amy', W[+i]), 'the cloud has word ' + i));
  assert(ph.knows(W[2]), 'and the phone has the laptop’s word');

  // ── 4. Signing in merges instead of choosing ──────────────────────────────
  console.log('\n--- 4. Offline play meets the cloud at sign-in ---');
  const tab = device('tablet', 'amy');
  tab.R('_cloudRev = null;');
  tab.learn(W[10], T + 20000);
  tab.R('flushSave();');   // offline: the write stays on this device
  assert(!cloudKnows('amy', W[10]), 'the tablet’s offline word is not in the cloud yet');
  await tab.sync();
  assert(cloudKnows('amy', W[10]), 'signing in uploads it');
  ['0', '1', '2', '3'].forEach((i) => assert(cloudKnows('amy', W[+i]), 'without dropping word ' + i + ' from the other devices'));
  assert(tab.knows(W[0]) && tab.knows(W[3]), 'and the tablet takes theirs in');

  // ── 5. Nothing goes out before the read ────────────────────────────────────
  console.log('\n--- 5. A write before the cloud copy has been read ---');
  const fresh = device('fresh-browser', 'amy');
  const before = JSON.stringify(cloudCopy('amy').srs);
  fresh.R('playerCurrencies.coins = 85;');
  const early = await fresh.push();
  eq(early.reason, 'unsynced', 'a fresh browser’s first autosave does not go out before its read');
  assert(JSON.stringify(cloudCopy('amy').srs) === before, 'so it cannot land a blank game over the account');
  await fresh.R('_syncRunning || Promise.resolve()');
  eq(fresh.R('_cloudRev') !== null, true, 'and asking to write started the read it was waiting for');
  assert(fresh.knows(W[0]) && fresh.knows(W[10]), 'which brought the account’s progress to the fresh browser');
  assert(JSON.stringify(cloudCopy('amy').srs) === before, 'still without the blank game going anywhere');

  global.fetch = realFetch;
  Module._load = realLoad;
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
  console.log('\ntest_cloud_merge: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
