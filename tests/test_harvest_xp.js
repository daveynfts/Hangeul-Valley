/**
 * tests/test_harvest_xp.js — the farm pays into the rank bar.
 *
 * It did not. addPlayerXp had exactly two callers, settleDeskSession and the workbook, so
 * the rank chip in the HUD only ever moved at a study desk. The loop the game is actually
 * made of — plant, water, harvest, over and over — paid coins, gems and honour and left the
 * bar exactly where it was, which from the player's side reads as harvesting not counting
 * for anything.
 *
 * The payout is at the harvest, where the coins are, and it decays on the coins' own
 * anti-farm curve so replanting one word does not become the fastest way to rank up.
 *
 * Run: node tests/test_harvest_xp.js
 */

'use strict';

const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
// Same shape as tests/test_crop_growth.js, with one deliberate difference: delayedCall runs
// its callback. The harvest reward is paid a third of a second after the animation, and a
// harness that drops the timer would test the label and not the payout.

function chainable(kind) {
  const o = { _kind: kind, destroyed: false, texture: null, tint: null, alpha: 1, x: 0, y: 0 };
  const self = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'destroy') return () => { t.destroyed = true; };
      if (k === 'setTexture') return (v) => { t.texture = v; return self; };
      if (k === 'setTint') return (v) => { t.tint = v; return self; };
      if (k === 'clearTint') return () => { t.tint = null; return self; };
      return () => self;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return self;
}

function makeSandbox() {
  const els = {};
  const el = () => {
    const classes = new Set();
    return {
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', disabled: false,
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        contains: (c) => classes.has(c),
        toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; }
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
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear(),
      get length() { return m.size; }
    };
  };
  const sb = {
    console, IS_NODE: true,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: doc, localStorage: storage(), sessionStorage: storage(),
    // Answered, not refused: nothing here is served, and a rejected fetch makes the game
    // print a stack trace over a green run for a file this test never reads.
    fetch: () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} },
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder,
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    Phaser: {
      AUTO: 0, Scene: class {}, Game: class {}, Scale: { RESIZE: 0, CENTER_BOTH: 0 },
      Math: { Between: a => a, FloatBetween: a => a, Clamp: (v, a, b) => Math.min(b, Math.max(a, v)), Distance: { Between: () => 0 }, RND: { pick: a => a && a[0] } },
      Geom: { Rectangle: class {}, Circle: class {} },
      Display: { Color: { HexStringToColor: () => ({ color: 0 }), GetColor: () => 0, Interpolate: { ColorWithColor: () => ({ r: 0, g: 0, b: 0 }) } } },
      Utils: { Array: { Shuffle: a => a, GetRandom: a => a && a[0] } },
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
sb.__levelsJson = require(path.join('..', 'levels.json'));
R('levelsData = __levelsJson;');

// The floating labels the scene draws, so the test can read what the player is shown.
sb.__labels = [];
R('__labels.length = 0;');

function fakeFarmScene(plotDefs) {
  const FarmScene = R('FarmScene');
  const s = Object.create(FarmScene.prototype);
  s.add = { image: () => chainable('image'), text: () => chainable('text'), graphics: () => chainable('graphics') };
  s.tweens = { add: () => chainable('tween') };
  // The reward lands inside this. Running it is the difference between testing the animation
  // and testing the payout.
  s.time = { delayedCall: (_ms, fn) => { if (typeof fn === 'function') fn(); return chainable('timer'); } };
  s.textures = { exists: () => false };
  s.shadows = null;
  s.player = null;
  s.spawnDroppedItem = () => {};
  s._label = (x, y, msg) => { sb.__labels.push(String(msg)); };
  s.plots = plotDefs.map((d, i) => Object.assign({
    index: i, x: i * 60, y: 100, active: true,
    tile: chainable('tile'), shad: chainable('shad'),
    plant: null, glow: null, hintLabel: null, cropShadow: null,
    sState: '', ko: null, word: null, plantedAt: 0, reviewModality: null, readyAt: 0
  }, d));
  return s;
}

const WORDS = R('levelsData[0].words.slice(0, 4).map(w => w.ko)');
const wordOf = (ko) => R('levelsData[0].words.find(w => w.ko === ' + JSON.stringify(ko) + ')');
const rankXp = () => R('playerRank.xp');
const rankLevel = () => R('playerRank.level');
// playerRank.xp is the remainder inside the current level, so a harvest that crosses a
// threshold leaves it *lower* than it started. Measuring a payout with it alone reported
// the sixth harvest of a word as -48 XP, and the assertion that it pays less than the
// second passed on that. Total earned is the number the payouts are actually about.
const xpToNext = R('xpToNextLevel');
function totalXp() {
  let sum = rankXp();
  for (let l = 1; l < rankLevel(); l++) sum += xpToNext(l);
  return sum;
}

/** Reset everything a harvest reads or writes, so each case starts from a known board. */
function reset() {
  R('plantedWords.clear(); srsData = {}; harvestCounts.clear(); quizStreak = 0;');
  R('playerRank = defaultPlayerRank();');
  R('__labels.length = 0;');
}
/** One harvest of `ko`, and the XP it moved. */
function harvest(ko) {
  const before = totalXp();
  const scene = fakeFarmScene([{ ko, word: wordOf(ko), plant: chainable('plant'), sState: '4' }]);
  R('plantedWords.add(' + JSON.stringify(ko) + ');');
  scene.advancePlot(scene.plots[0], wordOf(ko), 3, R('GRADE').GOOD);
  return totalXp() - before;
}

console.log('====================================================');
console.log('HARVEST XP');
console.log('====================================================');

// ── 1. The rate ──────────────────────────────────────────────────────────────
console.log('\n--- 1. What a harvest is worth ---');
const harvestXp = R('harvestXp');
const first = harvestXp(0);
assert(first > 0, 'the first harvest of a word is worth something (' + first + ' XP)');
assert(harvestXp(0) > harvestXp(1), 'and more than the second, because it is the one that taught it');
assert(harvestXp(1) > harvestXp(5), 'the payout decays as a word is replanted');
assert(harvestXp(5) > harvestXp(14), 'and keeps decaying');
assert(harvestXp(40) >= 1, 'but never reaches zero — a review still counts for something');
eq(harvestXp(200), harvestXp(60), 'past the floor every further harvest is worth the same');
// Against the study desk, so neither becomes the obvious way to farm the other's reward.
const deskPerfect = R('studySessionXp')(8, 8);
assert(first < deskPerfect,
  'one harvest is worth less than a perfect desk session (' + first + ' vs ' + deskPerfect + ')');

// ── 2. A harvest moves the bar ───────────────────────────────────────────────
console.log('\n--- 2. The harvest pays it ---');
reset();
eq(rankXp(), 0, 'a new player starts on zero XP');
const gained = harvest(WORDS[0]);
eq(gained, harvestXp(0), 'harvesting a word for the first time pays the first-harvest rate');
assert(gained > 0, 'which is to say the rank bar actually moves on the farm now');
assert(sb.__labels.some(m => /XP/.test(m)),
  'and the player is told, on the label over the plot: ' + JSON.stringify(sb.__labels));

// ── 3. Replanting the same word pays less ────────────────────────────────────
console.log('\n--- 3. Farming one word is not the fast route ---');
reset();
const runs = [];
for (let i = 0; i < 6; i++) runs.push(harvest(WORDS[0]));
eq(runs[0], harvestXp(0), 'the first run pays the first-harvest rate');
assert(runs[1] < runs[0], 'the second pays less');
assert(runs[5] < runs[1], 'and the sixth less again: ' + JSON.stringify(runs));
assert(runs.every((n, i) => n > 0 && (i === 0 || n <= runs[i - 1])),
  'every run is positive and none pays more than the one before it: ' + JSON.stringify(runs));
eq(R('harvestCounts.get(' + JSON.stringify(WORDS[0]) + ')'), 6, 'six harvests were counted');

// A different word is not affected by the first one's history.
const other = harvest(WORDS[1]);
eq(other, harvestXp(0), 'a word harvested for the first time still pays in full');

// ── 4. A rank-up reaches the player ──────────────────────────────────────────
console.log('\n--- 4. Levelling up in the middle of the farm ---');
reset();
// One XP short of the next level, so the next harvest has to cross it.
R('playerRank.xp = xpToNextLevel(playerRank.level) - 1;');
const wasLevel = rankLevel();
harvest(WORDS[2]);
eq(rankLevel(), wasLevel + 1, 'crossing the threshold raises the rank');
eq(R("document.getElementById('rankup-overlay').classList.contains('visible')"), true,
  'and the rank-up card is shown, the same one the study desk shows');

// ── 5. The XP survives a save ────────────────────────────────────────────────
console.log('\n--- 5. It is kept ---');
reset();
harvest(WORDS[3]);
const earned = rankXp();
assert(earned > 0, 'there is XP to keep');
const saved = JSON.parse(R('JSON.stringify(collectSave())'));
assert(saved.playerRank && saved.playerRank.xp === earned,
  'the harvest XP is written into the save (' + JSON.stringify(saved.playerRank && saved.playerRank.xp) + ')');
R('playerRank = defaultPlayerRank();');
sb.__saved = saved;
R('applySave(__saved);');
eq(rankXp(), earned, 'and comes back when the save is loaded');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_harvest_xp: all passed');
