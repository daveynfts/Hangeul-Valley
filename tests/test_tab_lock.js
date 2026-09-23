'use strict';
/**
 * tests/test_tab_lock.js — the game open in two tabs of one browser.
 *
 * Each tab held the whole game in memory and wrote it whole, to the same localStorage slot and
 * the same cloud save, so whichever saved last put its copy over everything the other tab had
 * done. Nothing noticed: no storage event was listened for, and neither tab knew the other
 * existed.
 *
 * The tab opened last takes over. It says so on a BroadcastChannel; the tab it replaces folds
 * what it has into the stored copy, stops saving, and shows a card with a way back; the new tab
 * takes in what was handed over.
 *
 * Each tab is the whole game source in its own sandbox; the storage and the channel are the
 * browser's, shared.
 *
 * Run: node tests/test_tab_lock.js
 */

const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

// ── The browser: one storage, one message bus ────────────────────────────────
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};
const channels = new Map();
const inbox = [];
class FakeBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    if (!channels.has(name)) channels.set(name, new Set());
    channels.get(name).add(this);
  }
  postMessage(data) {
    const msg = JSON.parse(JSON.stringify(data));
    channels.get(this.name).forEach((ch) => {
      if (ch !== this) inbox.push(() => { if (ch.onmessage) ch.onmessage({ data: msg }); });
    });
  }
  close() { channels.get(this.name).delete(this); }
}
/** Deliver what is in flight, the way the event loop would between tasks. */
function deliver() { while (inbox.length) inbox.shift()(); }

const SOURCE = readGameSource();
const LEVELS = require(path.join('..', 'levels.json'));
const W = LEVELS[0].words.map((w) => w.ko);

function openTab(name) {
  const els = {};
  const el = (id) => {
    const classes = new Set();
    return {
      id, style: {}, children: [], innerHTML: '', textContent: '', parentNode: null, onclick: null,
      classList: { add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)), contains: (c) => classes.has(c), toggle: () => true },
      appendChild(c) { c.parentNode = this; if (c.id) els[c.id] = c; return c; },
      addEventListener() {}, setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; }, removeAttribute() {},
      querySelector() { return null; }, querySelectorAll() { return []; }, remove() {}, focus() {}, blur() {}, click() {}
    };
  };
  const tab = { name, reloads: 0 };
  const sb = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    IS_NODE: true, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: {
      getElementById: (id) => els[id] || (els[id] = el(id)),
      createElement: () => el(''),
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {},
      body: el('body'), documentElement: el('html'), head: el('head')
    },
    localStorage, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    BroadcastChannel: FakeBroadcastChannel,
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost', reload: () => { tab.reloads++; } },
    performance: { now: () => 0 }, Image: class {}, Audio: class { play() {} pause() {} },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'), btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    fetch: () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
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
  sb.document.body.appendChild = function (c) { c.parentNode = this; if (c.id) els[c.id] = c; return c; };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(SOURCE, sb, { filename: name + '.js' });
  sb.__levels = JSON.parse(JSON.stringify(LEVELS));
  const R = (expr) => vm.runInContext(expr, sb);
  R('levelsData = __levels;');
  // Boot as initSave() does: the stored copy, then the claim _afterLoad makes.
  const saved = localStorage.getItem('hv_save_v2');
  if (saved) { sb.__saved = JSON.parse(saved); R('applySave(__saved);'); }
  R('claimThisTab();');
  tab.R = R;
  tab.els = els;
  tab.learn = (ko, t) => R('gradeWord(' + JSON.stringify(ko) + ', GRADE.GOOD, "type", ' + t + '); gradeWord(' + JSON.stringify(ko) + ', GRADE.GOOD, "type", ' + (t + 16000) + '); gradeWord(' + JSON.stringify(ko) + ', GRADE.GOOD, "type", ' + (t + 62000) + ');');
  tab.knows = (ko) => R('!!(peekSrs(' + JSON.stringify(ko) + ') && peekSrs(' + JSON.stringify(ko) + ').st === "review")');
  return tab;
}
const storedKnows = (ko) => {
  const s = JSON.parse(localStorage.getItem('hv_save_v2') || 'null');
  return !!(s && s.srs && s.srs[ko] && s.srs[ko].m.type && s.srs[ko].m.type.st === 'review');
};

(async () => {
  const T = 1_800_000_000_000;

  // ── 1. A second tab opens ──────────────────────────────────────────────────
  console.log('\n--- 1. The game is opened in a second tab ---');
  const a = openTab('tab-a');
  a.learn(W[0], T);
  await a.R('flushSave()');
  assert(storedKnows(W[0]), 'the first tab’s word is stored');
  a.learn(W[1], T + 1000);   // not flushed yet: the debounce has not fired
  a.R('playerCurrencies.coins = 321;');
  assert(!storedKnows(W[1]), 'and its latest word is still only in memory');

  const b = openTab('tab-b');
  assert(!b.knows(W[1]), 'the second tab boots on the stored copy, without that last word');
  deliver();   // B's claim reaches A; A's handover reaches B
  eq(a.R('_tabRetired'), true, 'the first tab gives way');
  assert(storedKnows(W[1]), 'having folded its unsaved word into the stored copy first');
  assert(b.knows(W[0]) && b.knows(W[1]), 'and the new tab takes it in');
  const card = a.els['tab-elsewhere-overlay'];
  assert(card && card.classList.contains('visible'), 'the old tab shows the card saying the game moved');
  assert(a.els['tab-elsewhere-here'] && typeof a.els['tab-elsewhere-here'].onclick === 'function', 'with a way to take it back');
  eq(b.R('_tabRetired'), false, 'the new tab keeps playing');

  // ── 2. The old tab cannot write over the new one ───────────────────────────
  console.log('\n--- 2. The retired tab stays quiet ---');
  b.learn(W[2], T + 5000);
  await b.R('flushSave()');
  assert(storedKnows(W[2]), 'the new tab saves');
  a.learn(W[3], T + 6000);
  a.R('persistSave();');
  const late = await a.R('flushSave()');
  eq(late.frozen, true, 'the old tab no longer saves');
  assert(storedKnows(W[2]), 'so the new tab’s word stays stored');
  assert(!storedKnows(W[3]), 'and nothing the old tab does afterwards reaches storage');
  const pushed = await a.R('pushCloudSave(collectSave())');
  eq(pushed.reason, 'frozen', 'or the cloud');

  // ── 3. Taking the game back ────────────────────────────────────────────────
  console.log('\n--- 3. Play here instead ---');
  a.els['tab-elsewhere-here'].onclick();
  eq(a.reloads, 1, 'the card’s button reloads the old tab');
  b.learn(W[4], T + 7000);   // the other tab is still mid-play when that happens
  const a2 = openTab('tab-a-reloaded');
  deliver();
  eq(b.R('_tabRetired'), true, 'the reloaded tab takes over in turn');
  assert(storedKnows(W[4]), 'and what the other tab had not saved is handed over again');
  [0, 1, 2, 4].forEach((i) => assert(a2.knows(W[i]), 'the reloaded tab has word ' + i));

  // ── 4. One tab alone ───────────────────────────────────────────────────────
  console.log('\n--- 4. Only one tab ---');
  store.clear(); channels.clear(); inbox.length = 0;
  const solo = openTab('solo');
  deliver();
  eq(solo.R('_tabRetired'), false, 'a tab on its own is never retired');
  solo.learn(W[5], T);
  await solo.R('flushSave()');
  assert(storedKnows(W[5]), 'and saves as it always did');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
  console.log('\ntest_tab_lock: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
