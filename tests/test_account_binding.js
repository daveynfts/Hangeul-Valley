'use strict';
/**
 * tests/test_account_binding.js — one browser, two accounts, and whose progress is whose.
 *
 * localStorage holds one save and it did not say whose it was. Signing out left it in place,
 * so on a shared browser the next account to sign in met the previous one's progress as if it
 * were its own: syncCloudSave() saw a local copy newer and richer than that account's cloud
 * save and uploaded it — replacing the newcomer's progress with somebody else's. A brand-new
 * account simply adopted it. The server stamped `cloudUser` into every save it stored, and the
 * client never read it.
 *
 * A save now names its owner. Another account's progress is set aside under that account's
 * own key and the page reloads onto the incoming account's; a guest's progress is still
 * adopted by whoever signs in first. The endpoint refuses a save that names somebody else.
 *
 * Every "page" here is a fresh copy of the whole game source sharing one browser's storage,
 * which is what a reload is.
 *
 * Run: node tests/test_account_binding.js
 */

const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');
const { saveClaimsOtherAccount } = require('../api/_saveBody');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

const storage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    keys: () => [...m.keys()],
    get length() { return m.size; }
  };
};

// One browser: the storage outlives every page.
const browser = { local: storage(), session: storage() };

// The cloud: one save per account, and a log of every write it was asked for.
const cloud = { saves: {}, puts: [] };

const SOURCE = readGameSource();
const LEVELS = require(path.join('..', 'levels.json'));

function openPage() {
  const els = {};
  const el = () => {
    const classes = new Set();
    return {
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', disabled: false,
      classList: {
        add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)),
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
    getElementById: (id) => els[id] || (els[id] = el()), createElement: () => el(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    body: el(), documentElement: el(), head: el()
  };
  const page = { reloads: 0, toasts: [], signedInAs: null };
  const sb = {
    console, IS_NODE: true,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: doc, localStorage: browser.local, sessionStorage: browser.session,
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost', reload: () => { page.reloads++; } },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    fetch: async (url, opts) => {
      const u = String(url);
      const method = (opts && opts.method) || 'GET';
      if (u.indexOf('/api/session') >= 0) return { ok: true, status: 200, json: async () => ({ ok: true }) };
      if (u.indexOf('/api/save') >= 0) {
        const sub = page.signedInAs;
        if (!sub) return { status: 401, json: async () => ({ error: 'sign in required' }) };
        if (method === 'GET') {
          return { status: 200, json: async () => ({ user: { sub, email: sub + '@x', name: sub }, data: cloud.saves[sub] || null }) };
        }
        const body = JSON.parse(opts.body);
        cloud.puts.push({ sub, body });
        if (saveClaimsOtherAccount(body, sub)) return { status: 409, json: async () => ({ error: 'account mismatch' }) };
        cloud.saves[sub] = Object.assign({}, body, { cloudUser: sub });
        return { status: 200, json: async () => ({ ok: true, updatedAt: body.updatedAt }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
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
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(SOURCE, sb, { filename: 'game.js' });
  sb.showToast = (m) => page.toasts.push(String(m));
  sb.__levels = JSON.parse(JSON.stringify(LEVELS));
  const R = (expr) => vm.runInContext(expr, sb);
  R('levelsData = __levels; _cloudSleep = () => Promise.resolve();');
  // Boot reads whatever this browser holds, as initSave() does.
  const stored = browser.local.getItem('hv_save_v2');
  if (stored) { sb.__stored = JSON.parse(stored); R('applySave(__stored);'); }
  page.R = R;
  page.signIn = async (sub) => {
    page.signedInAs = sub;
    browser.local.setItem('hv_google_token', 'tok-' + sub);
    R('googleAuth.token = ' + JSON.stringify('tok-' + sub) + '; googleAuth.user = { sub: ' + JSON.stringify(sub) + ' };');
    await R('syncCloudSave()');
  };
  page.signOut = () => { R('signOutGoogle()'); page.signedInAs = null; };
  return page;
}

const coins = (s) => s && s.currencies && s.currencies.coins;
const stored = () => JSON.parse(browser.local.getItem('hv_save_v2') || 'null');
const stash = (sub) => JSON.parse(browser.local.getItem('hv_save_v2:' + sub) || 'null');
function cloudSave(sub, coinCount, srsWords) {
  const srs = {};
  srsWords.forEach((ko) => { srs[ko] = { m: { type: { st: 'review', step: 0, ivl: 5, ease: 2.5, reps: 3, lapses: 0, due: 9e12, last: 1 } } }; });
  return { v: 11, currencies: { coins: coinCount, gems: 0, honor: 0 }, srs, unlockedLevels: [0], updatedAt: 1000, cloudUser: sub };
}

(async () => {
  const words = LEVELS[0].words.map((w) => w.ko);
  cloud.saves.alice = cloudSave('alice', 999, words.slice(0, 40));
  cloud.saves.bob = cloudSave('bob', 55, words.slice(40, 43));

  // ── 1. The bug ─────────────────────────────────────────────────────────────
  console.log('\n--- 1. Alice signs out, Bob signs in on the same browser ---');
  let page = openPage();
  await page.signIn('alice');
  eq(coins(page.R('collectSave()')), 999, 'Alice’s cloud progress is loaded on sign-in');
  eq(page.R('saveOwner'), 'alice', 'and the progress on screen is hers');
  page.R('playerCurrencies.coins += 1; persistSave(); flushSave();');
  page.signOut();
  eq(stored().owner, 'alice', 'signing out leaves her copy on the device, saying whose it is');
  const putsBefore = cloud.puts.length;
  await page.signIn('bob');
  eq(cloud.puts.length, putsBefore, 'nothing of Alice’s is uploaded to Bob’s account');
  eq(coins(cloud.saves.bob), 55, 'Bob’s cloud save is untouched');
  eq(coins(stash('alice')), 1000, 'Alice’s progress, including what she did last, is set aside under her own key');
  eq(stored().cloudUser, 'bob', 'this browser’s save is Bob’s now');
  eq(coins(stored()), 55, 'with Bob’s progress in it');
  eq(page.reloads, 1, 'and the page reloads onto it, so none of Alice’s state lingers in memory');
  page.R('playerCurrencies.coins = 123456; persistSave();');
  const late = await page.R('flushSave()');
  eq(late.frozen, true, 'saving is frozen until then — a teardown flush cannot write Alice back over it');
  eq(coins(stored()), 55, 'so the swap stands');

  // ── 2. After the reload ────────────────────────────────────────────────────
  console.log('\n--- 2. The page that comes up ---');
  page = openPage();
  eq(coins(page.R('collectSave()')), 55, 'boots on Bob’s progress');
  await page.signIn('bob');
  assert(page.toasts.some((t) => /switchedAccount|this account's progress/.test(t)),
    'and says the other progress was kept for its own account: ' + JSON.stringify(page.toasts));
  eq(browser.session.getItem('hv_account_switched'), null, 'said once, not on every load');
  eq(page.reloads, 0, 'no second reload');

  // ── 3. Alice comes back ────────────────────────────────────────────────────
  console.log('\n--- 3. Alice signs in again ---');
  page.signOut();
  await page.signIn('alice');
  eq(coins(stash('bob')), 55, 'Bob’s progress is set aside in turn');
  eq(coins(stored()), 1000, 'and Alice’s own is put back — including the play her cloud copy never saw');
  eq(stash('alice'), null, 'her stash is used up rather than left to go stale');
  eq(page.reloads, 1, 'one reload');
  page = openPage();
  await page.signIn('alice');
  eq(coins(page.R('collectSave()')), 1000, 'the page that comes up is hers');
  const lastPut = cloud.puts[cloud.puts.length - 1];
  eq(lastPut && lastPut.sub, 'alice', 'and her offline play goes to her own cloud save');
  eq(coins(cloud.saves.alice), 1000, 'which now holds it');

  // ── 4. A brand-new account ─────────────────────────────────────────────────
  console.log('\n--- 4. Somebody with no cloud save yet ---');
  page.signOut();
  const beforeNew = cloud.puts.length;
  await page.signIn('carol');
  eq(cloud.puts.length, beforeNew, 'Alice’s progress is not adopted as Carol’s first save');
  eq(stored(), null, 'Carol starts fresh');
  eq(coins(stash('alice')), 1000, 'while Alice’s is kept');

  // ── 5. A guest is still adopted ────────────────────────────────────────────
  console.log('\n--- 5. Playing first, signing in after ---');
  browser.local.clear(); browser.session.clear();
  page = openPage();
  page.R('playerCurrencies.coins = 77; srsData = {}; ' + JSON.stringify(words.slice(0, 50)) + '.forEach(ko => { srsData[ko] = { m: { type: { st: "review", step: 0, ivl: 2, ease: 2.5, reps: 1, lapses: 0, due: 9e12, last: 1 } } }; }); flushSave();');
  eq(stored().owner, undefined, 'a guest’s save names nobody');
  cloud.saves.dave = cloudSave('dave', 5, words.slice(0, 2));
  cloud.saves.dave.updatedAt = 1;
  await page.signIn('dave');
  eq(page.reloads, 0, 'no switch: a guest’s progress is not somebody else’s');
  eq(coins(cloud.saves.dave), 77, 'it is adopted into the account that signed in, as before');
  eq(stored().owner, 'dave', 'and from then on the copy here says whose it is');

  // ── 6. A browser that will not store the swap ──────────────────────────────
  console.log('\n--- 6. Storage refusing writes ---');
  browser.local.clear(); browser.session.clear();
  browser.local.setItem('hv_save_v2', JSON.stringify(Object.assign(cloudSave('alice', 999, words.slice(0, 5)), { owner: 'alice' })));
  browser.session.setItem('hv_account_switched', 'bob');   // a reload for Bob already happened
  page = openPage();
  const putsNow = cloud.puts.length;
  await page.signIn('bob');
  eq(page.reloads, 0, 'the second time round it does not reload again — no loop');
  eq(cloud.puts.length, putsNow, 'and still uploads nothing of Alice’s');
  eq(page.R('_cloudLastError'), 'wrong-account', 'the chip says why cloud save is idle');

  // ── 7. The endpoint's own check ────────────────────────────────────────────
  console.log('\n--- 7. The endpoint refuses somebody else’s save ---');
  assert(saveClaimsOtherAccount({ owner: 'alice' }, 'bob'), 'a save naming another owner is refused');
  assert(saveClaimsOtherAccount({ cloudUser: 'alice' }, 'bob'), 'and so is a copy pulled from another account');
  assert(!saveClaimsOtherAccount({ owner: 'bob' }, 'bob'), 'the account’s own save is taken');
  assert(!saveClaimsOtherAccount({ v: 11 }, 'bob'), 'and so is a guest’s, which names nobody');
  const refused = await page.R('pushCloudSave({ v: 11, owner: "alice" })');
  // pushCloudSave is idle here (frozen by case 6), so drive the reason through a clean page.
  browser.local.clear(); browser.session.clear();
  page = openPage();
  page.signedInAs = 'bob';
  browser.local.setItem('hv_google_token', 'tok-bob');
  page.R('googleAuth.token = "tok-bob"; googleAuth.user = { sub: "bob" };');
  const sentBefore = cloud.puts.length;
  const r = await page.R('pushCloudSave({ v: 11, owner: "alice", updatedAt: 5 })');
  eq(r.reason, 'wrong-account', 'a save naming its owner is never sent as anybody else');
  eq(cloud.puts.length, sentBefore, 'it does not leave the browser at all');
  const r2 = await page.R('pushCloudSave({ v: 11, cloudUser: "alice", updatedAt: 6 })');
  eq(cloud.puts.length, sentBefore + 1, 'a copy that only the server stamped does go out');
  eq(r2.reason, 'wrong-account', 'and the endpoint’s refusal is filed as wrong-account too');
  assert(refused !== undefined, 'a frozen page answers a push without sending it');

  // A write queued before a sign-out does not go out under the next sign-in.
  page.R('playerCurrencies.coins = 4242; saveOwner = "bob"; flushSave();');
  page.signOut();
  page.signedInAs = 'erin';
  browser.local.setItem('hv_google_token', 'tok-erin');
  page.R('googleAuth.token = "tok-erin"; googleAuth.user = { sub: "erin" };');
  await page.R('_cloudChain');
  eq(cloud.puts.filter((p) => p.sub === 'erin').length, 0, 'a push still queued at sign-out is dropped, not sent as the next account');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
  console.log('\ntest_account_binding: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
