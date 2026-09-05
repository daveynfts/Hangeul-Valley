'use strict';
/**
 * tests/test_cloud_sync_failures.js — what the player is told when the cloud save does not
 * answer, and what happens to their session.
 *
 * syncCloudSave() is the request that runs the moment someone signs in. It used to end in
 * three bare `return`s — 401, any other non-200, and a thrown fetch — so a 500 from the save
 * endpoint was indistinguishable from success that did nothing: the toast said "syncing
 * save…" and then the session carried on with no cloud save, no message, and no retry,
 * because nothing calls this again until the next page load. That is what a broken sign-in
 * looks like from the outside, and it is what these tests are about.
 *
 * The write path (pushCloudSave) had said all of this out loud for a while. The read path
 * had not, and it is the one that runs first.
 *
 * Run: node tests/test_cloud_sync_failures.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
// The whole game source, same as tests/test_cloud_load_state.js: syncCloudSave sits on top of
// most of the module graph, so a slice would mean rebuilding half of it by hand. fetch and
// showToast are the two seams this suite drives.
function makeSandbox() {
  const els = {};
  const el = () => {
    const classes = new Set();
    return {
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', disabled: false,
      classList: {
        add: (...c) => c.forEach((x) => classes.add(x)),
        remove: (...c) => c.forEach((x) => classes.delete(x)),
        contains: (c) => classes.has(c),
        toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; if (on) classes.add(c); else classes.delete(c); return on; }
      },
      appendChild(c) { this.children.push(c); return c; },
      addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      hasAttribute() { return false; }, removeAttribute() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      remove() {}, focus() {}, blur() {}, click() {}
    };
  };
  const doc = {
    getElementById: (id) => els[id] || (els[id] = el()),
    createElement: () => el(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    body: el(), documentElement: el(), head: el()
  };
  const storage = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
      get length() { return m.size; }
    };
  };
  const sb = {
    console, IS_NODE: true,
    setTimeout: (fn) => { if (typeof fn === 'function') { /* never fires: no timeouts here */ } return 0; },
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: doc, localStorage: storage(), sessionStorage: storage(),
    fetch: () => Promise.reject(new Error('no fetch stub installed')),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder,
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
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
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(readGameSource(), sb, { filename: 'game.js' });
  return sb;
}

const sb = makeSandbox();
const R = (expr) => vm.runInContext(expr, sb);

// Every case starts signed in with a token, a captured toast list, and a fetch that answers
// however the case wants it to.
const toasts = [];
sb.showToast = (msg) => { toasts.push(String(msg)); };

function signedIn() {
  sb.sessionStorage.setItem('hv_google_token', 'test-token');
  R('googleAuth.token = "test-token"; googleAuth.user = { sub: "1", email: "a@b.c" };');
}
function answerWith(status, body) {
  sb.fetch = () => Promise.resolve({
    status,
    json: () => Promise.resolve(body === undefined ? { error: 'x' } : body)
  });
}
function throwFrom(name) {
  sb.fetch = () => Promise.reject(Object.assign(new Error('boom'), { name }));
}
// The retry waits are real time in the game and no time here.
let slept = [];
R('_cloudSleep = (ms) => { sleptFromTest(ms); return Promise.resolve(); };');
sb.sleptFromTest = (ms) => slept.push(ms);

async function run(setup) {
  toasts.length = 0;
  slept = [];
  signedIn();
  setup();
  await R('syncCloudSave()');
  return {
    toasts: toasts.slice(),
    token: sb.sessionStorage.getItem('hv_google_token') || '',
    lastError: R('_cloudLastError'),
    slept: slept.slice()
  };
}

// A JWT whose payload is exactly the exp we want. Only the middle segment is ever read.
function tokenExpiringAt(msEpoch) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(msEpoch / 1000), sub: '1' }), 'utf8')
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'x.' + payload + '.y';
}

(async () => {
  // ── 1. The token has expired ───────────────────────────────────────────────
  // Google's last an hour, so this is the ordinary end of a long session rather than an odd
  // case. Clearing the session is right; doing it in silence is what made a sign-in that had
  // worked look, an hour later, like one that never had.
  console.log('\n--- 1. 401: the session is cleared, and the player is told ---');
  let r = await run(() => answerWith(401));
  assert(r.token === '', 'the stored token is dropped');
  assert(r.toasts.length === 1, 'exactly one message is shown');
  assert(/sign in again/i.test(r.toasts[0] || ''), 'and it says to sign in again: ' + JSON.stringify(r.toasts[0]));

  // ── 2. Cloud save is switched off for this build ───────────────────────────
  console.log('\n--- 2. 503: not an auth problem, so the session survives ---');
  r = await run(() => answerWith(503));
  assert(r.token === 'test-token', 'the player stays signed in');
  assert(/switched off|unavailable/i.test(r.toasts[0] || ''),
    'and is told cloud save is off: ' + JSON.stringify(r.toasts[0]));

  // ── 3. The endpoint failed ─────────────────────────────────────────────────
  // The case that started this: a 500 read as "nothing happened". A server fault is not the
  // player's identity failing, so the session stays and the message says where they stand.
  console.log('\n--- 3. 500: the session survives and the failure is visible ---');
  r = await run(() => answerWith(500, { error: 'save failed' }));
  assert(r.token === 'test-token', 'a server fault does not sign anybody out');
  assert(r.toasts.length === 1, 'the player gets a message rather than silence');
  assert(/trouble|safe/i.test(r.toasts[0] || ''),
    'and it says the local progress is safe: ' + JSON.stringify(r.toasts[0]));
  assert(r.lastError === 'HTTP 500', 'the failure is recorded, not swallowed (' + r.lastError + ')');

  // ── 4. The request never arrived ───────────────────────────────────────────
  console.log('\n--- 4. A thrown fetch is reported too ---');
  r = await run(() => throwFrom('TypeError'));
  assert(r.token === 'test-token', 'offline does not sign anybody out');
  assert(r.lastError === 'network error', 'recorded as a network error (' + r.lastError + ')');
  assert(r.toasts.length === 1, 'and said out loud');

  r = await run(() => throwFrom('AbortError'));
  assert(r.lastError === 'timed out', 'a timeout is named as one (' + r.lastError + ')');

  // ── 5. The happy path still is one ─────────────────────────────────────────
  console.log('\n--- 5. 200 with no cloud copy yet says nothing alarming ---');
  r = await run(() => answerWith(200, { user: { sub: '1' }, data: null }));
  assert(r.token === 'test-token', 'still signed in');
  assert(r.lastError === '', 'no error is left behind (' + JSON.stringify(r.lastError) + ')');
  assert(!r.toasts.some((t) => /trouble|sign in again|switched off/i.test(t)),
    'and no failure message is shown: ' + JSON.stringify(r.toasts));

  // ── 6. What is worth retrying, and what is not ─────────────────────────────
  // Nothing calls syncCloudSave again until the next page load, so giving up on the first
  // hiccup cost the whole session. Two more goes, and only for the failures that could go
  // differently a second later.
  console.log('\n--- 6. Transient failures get two more goes ---');
  let calls = 0;
  r = await run(() => {
    sb.fetch = (u, o) => {
      if (!o || o.method === 'GET') calls++;
      return calls < 3
        ? Promise.resolve({ status: 500, json: () => Promise.resolve({ error: 'save failed' }) })
        : Promise.resolve({ status: 200, json: () => Promise.resolve({ user: { sub: '1' }, data: null }) });
    };
  });
  assert(calls === 3, 'a 500 is tried again until it works (' + calls + ' reads)');
  assert(r.slept.join(',') === '2000,6000', 'backing off between goes (' + r.slept.join(',') + ')');
  assert(r.lastError === '', 'and the recovered sync leaves no error behind');
  assert(!r.toasts.some((t) => /trouble/i.test(t)), 'the player is not told about a blip that healed');

  calls = 0;
  r = await run(() => { answerWith(401); sb.fetch = ((f) => () => { calls++; return f(); })(sb.fetch); });
  assert(calls === 1, 'a 401 is not retried — asking again cannot change it (' + calls + ' call)');
  assert(r.slept.length === 0, 'and nothing waits before saying so');

  calls = 0;
  r = await run(() => { answerWith(503); sb.fetch = ((f) => () => { calls++; return f(); })(sb.fetch); });
  assert(calls === 1, 'nor is a 503 (' + calls + ' call)');

  console.log('\n--- 7. A failure that survives the retries is reported once ---');
  calls = 0;
  r = await run(() => { answerWith(500); sb.fetch = ((f) => () => { calls++; return f(); })(sb.fetch); });
  assert(calls === 3, 'three attempts in total (' + calls + ')');
  assert(r.toasts.length === 1, 'one message, not one per attempt');
  assert(r.lastError === 'HTTP 500', 'and the reason is recorded (' + r.lastError + ')');

  // ── 8. An expired token is spotted before the request, not after ───────────
  // Google's tokens last an hour. The old code found out by sending the request anyway and
  // being signed out by the answer; now the expiry in the token itself is read first.
  console.log('\n--- 8. Expiry is read from the token ---');
  assert(R('typeof googleTokenIsFresh') === 'function', 'the freshness check is shipped');
  sb.sessionStorage.setItem('hv_google_token', tokenExpiringAt(Date.now() + 60 * 60 * 1000));
  R('googleAuth.token = ""; googleAuth.exp = 0;');
  assert(R('googleTokenIsFresh()') === true, 'an hour of life left counts as fresh');
  sb.sessionStorage.setItem('hv_google_token', tokenExpiringAt(Date.now() + 10 * 1000));
  assert(R('googleTokenIsFresh()') === false, 'ten seconds of life left does not');
  sb.sessionStorage.setItem('hv_google_token', 'not-a-jwt');
  assert(R('googleTokenIsFresh()') === true,
    'an unreadable token is left to the server to refuse, not guessed at');

  console.log('\n--- 9. A stale token is renewed before the request is built ---');
  // No google.accounts.id in this sandbox, so renewal cannot succeed: the request must be
  // refused locally rather than sent with a token the server will reject.
  calls = 0;
  toasts.length = 0;
  sb.sessionStorage.setItem('hv_google_token', tokenExpiringAt(Date.now() + 5 * 1000));
  R('googleAuth.token = ""; googleAuth.exp = 0;');
  sb.fetch = () => { calls++; return Promise.resolve({ status: 200, json: () => Promise.resolve({}) }); };
  const res = await R('cloudSaveRequest("GET")');
  assert(calls === 0, 'no request is sent with a token that is already spent');
  assert(res.status === 401 && res.expired === true, 'and the caller is told why');

  // ── 10. The sync state reaches the screen ──────────────────────────────────
  console.log('\n--- 10. "not synced" is visible, not just recorded ---');
  R('googleAuth.user = { sub: "1", email: "a@b.c" }; googleAuth.token = "t"; googleAuth.exp = 0;');
  sb.sessionStorage.setItem('hv_google_token', 't');
  R('_cloudLastError = ""; renderAuthUI();');
  const clean = sb.document.getElementById('ls-auth-status').innerHTML;
  assert(!/auth-sync-warn/.test(clean), 'a healthy session shows no warning');
  R('_cloudLastError = "HTTP 500"; renderAuthUI();');
  const warned = sb.document.getElementById('ls-auth-status').innerHTML;
  assert(/auth-sync-warn/.test(warned), 'a failed sync puts a marker on the auth chip');
  assert(/HTTP 500/.test(warned), 'with the reason on hover');
  assert(/Not synced/.test(warned), 'and words a player can read: ' + warned.slice(0, 120));

  // ── 11. The server side, read from the source ──────────────────────────────
  // api/save.js requires the AWS SDK on its first line and the CI test job has no npm install
  // step, so this suite cannot load the handler. What it can do is check that the two paths
  // that used to produce an unexplained 500 are still closed.
  console.log('\n--- 11. api/save.js keeps its two 500s closed ---');
  const saveSrc = fs.readFileSync(path.join(ROOT, 'api', 'save.js'), 'utf8');
  const authBlock = saveSrc.slice(saveSrc.indexOf('user = await verifyGoogleIdToken'),
    saveSrc.indexOf('if (!user)'));
  assert(!/\bthrow e;/.test(authBlock),
    'a failure reaching Google is answered, not rethrown past the handler');
  assert(/502/.test(authBlock), 'and answered as 502, which says whose side it was');

  const readBlock = saveSrc.slice(saveSrc.indexOf('async function getObjectJson'),
    saveSrc.indexOf('module.exports'));
  const parseAt = readBlock.indexOf('JSON.parse');
  assert(parseAt > 0, 'getObjectJson still parses what it read');
  assert(/try\s*\{\s*\r?\n?\s*return JSON\.parse/.test(readBlock),
    'and the parse is inside a try, so a corrupt object cannot 500 every sign-in');
  assert(/return null;/.test(readBlock.slice(parseAt)),
    'an unreadable object counts as no object, which is what lets the account recover');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_cloud_sync_failures: all passed');
})();
