/**
 * tests/test_crop_growth.js — the plot's growth clock.
 *
 * A crop advances through two waits the player does not drive: seedling -> needs watering,
 * and sprout -> ripe. Both used to be read off the word's SRS due date, on the reasoning
 * that the two learning steps (15s, 45s) *are* the crop timers. They are — but only while
 * the word is still inside those steps. Every other state puts a review date in `due`, days
 * away, and the plot then waited that long:
 *
 *   - A word harvested wrong lapses into relearning. Watering it again walks off the single
 *     relearn step and re-graduates it, so the sprout it had just become sat on a one-day
 *     (for a mature word, ten-day) due date and never ripened. No phase 3, no harvest, and
 *     the word stayed in plantedWords holding the tile against the next day's reviews — the
 *     farm silently filled with dead sprouts.
 *   - Planting a word that had already graduated — which is every plant once the player has
 *     learned the words they own — stalled the same way one stage earlier, as a seedling.
 *
 * The plot carries its own deadline now. These tests drive the shipped FarmScene methods
 * against a real srsData, so they fail if the promotion ever consults the scheduler again.
 *
 * Run: node tests/test_crop_growth.js
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
// Same shape as tests/test_cloud_load_state.js: the whole game source in a vm context, with
// just enough of Phaser hanging off a hand-built `this` for the plot methods to run.

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
      if (k === 'setAlpha') return (v) => { t.alpha = v; return self; };
      return () => self;                       // every other Phaser setter just chains
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
    fetch: () => Promise.reject(new Error('offline in tests')),
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

// levelsData normally arrives by fetch, which the sandbox refuses. _findWord scans it to
// resolve a saved plot back to its word, so it has to hold the real content.
sb.__levelsJson = require(path.join('..', 'levels.json'));
R('levelsData = __levelsJson;');

// A clock the test drives. Only Date.now is redirected, and only inside the sandbox: the
// plot clock is the one thing here that reads it.
const T0 = 1700000000000;
sb.__clock = { t: T0 };
R('Date.now = () => __clock.t;');
const at = (t) => { sb.__clock.t = t; };
const tick = (ms) => { sb.__clock.t += ms; };

const CFG = R('SRS_CFG');
const G = R('GRADE');
const DAY = R('DAY_MS');
const SEEDLING_MS = CFG.LEARN_STEPS[0];
const SPROUT_MS = CFG.LEARN_STEPS[1];

// A farm scene with just enough of Phaser hanging off it for the plot methods to run.
// `player` is left null so playPlayerAction runs its callback straight through instead of
// waiting on an animation that has nothing to play it.
function fakeFarmScene(plotDefs) {
  const FarmScene = R('FarmScene');
  const s = Object.create(FarmScene.prototype);
  s.add = { image: () => chainable('image'), text: () => chainable('text'), graphics: () => chainable('graphics') };
  s.tweens = { add: () => chainable('tween') };
  s.time = { delayedCall: () => chainable('timer') };
  s.textures = { exists: () => false };
  s.shadows = null;
  s.player = null;
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
const srsOf = (ko) => R('peekSrs(' + JSON.stringify(ko) + ')');
const grade = (ko, g) => R('gradeWord(' + JSON.stringify(ko) + ', ' + g + ', "type")');

console.log('====================================================');
console.log('CROP GROWTH CLOCK');
console.log('====================================================');

// ── 1. The clock itself ──────────────────────────────────────────────────────
console.log('\n--- 1. The clock ---');
const plotGrowMs = R('plotGrowMs');
const plotReadyAt = R('plotReadyAt');
eq(plotGrowMs('1'), SEEDLING_MS, 'a seedling waits out the first learning step');
eq(plotGrowMs('3'), SPROUT_MS, 'a sprout waits out the second');
eq(plotReadyAt('1', T0), T0 + SEEDLING_MS, 'entering the seedling stage stamps a deadline');
eq(plotReadyAt('3', T0), T0 + SPROUT_MS, 'and so does entering the sprout stage');
[['', 'an empty plot'], ['2', 'a crop waiting to be watered'], ['4', 'a ripe crop']].forEach(([s, what]) => {
  eq(plotReadyAt(s, T0), 0, what + ' has no growth deadline — it waits on the player');
});

// ── 2. The growth tick promotes on the plot's own deadline ───────────────────
console.log('\n--- 2. The growth tick ---');
at(T0);
R('plantedWords.clear(); srsData = {};');
const growth = fakeFarmScene([{}, {}]);
growth.plots.forEach((p, i) => {
  p.ko = WORDS[i]; p.word = wordOf(WORDS[i]); p.plant = chainable('plant');
});
growth._setState(growth.plots[0], '1', WORDS[0]);
growth._setState(growth.plots[1], '3', WORDS[1]);
eq(growth.plots[0].readyAt, T0 + SEEDLING_MS, 'the seedling is stamped when it is planted');
eq(growth.plots[1].readyAt, T0 + SPROUT_MS, 'the sprout when it is watered');

tick(SEEDLING_MS - 1);
growth._checkGrowth();
eq(growth.plots[0].sState, '1', 'a millisecond short of its step the seedling has not moved');
tick(1);
growth._checkGrowth();
eq(growth.plots[0].sState, '2', 'on the step it wilts and asks to be watered');
eq(growth.plots[0].readyAt, 0, 'and stops running a clock — watering is the player’s move');

eq(growth.plots[1].sState, '3', 'the sprout is still growing at 15s');
tick(SPROUT_MS - SEEDLING_MS);
growth._checkGrowth();
eq(growth.plots[1].sState, '4', 'and ripens 45s after it was watered');
eq(growth.plots[1].readyAt, 0, 'ripe waits on the player too');

// ── 3. The regression: a lapsed word, re-watered, still ripens ───────────────
console.log('\n--- 3. A word that lapsed at harvest ripens after re-watering ---');
at(T0);
R('plantedWords.clear(); srsData = {};');
const ko = WORDS[0];
const word = wordOf(ko);

// Take the word through the three-touch cycle so it graduates.
grade(ko, G.GOOD); tick(SEEDLING_MS);
grade(ko, G.GOOD); tick(SPROUT_MS);
grade(ko, G.GOOD);
eq(srsOf(ko).st, 'review', 'three correct answers graduate the word into day-scale review');

// A day later it comes back as a due review, planted ripe — and the player gets it wrong.
tick(1 * DAY);
const farm = fakeFarmScene([{ ko: ko, word: word, plant: chainable('plant'), sState: '4' }]);
const plot = farm.plots[0];
R('plantedWords.add(' + JSON.stringify(ko) + ');');
grade(ko, G.AGAIN);                      // what submitAnswer does on a failed harvest
farm.regressionPlot(plot, word);
eq(plot.sState, '2', 'the failed harvest drops the crop back to needing water');
eq(srsOf(ko).st, 'relearn', 'and the word into relearning');

// The player waters it. Phases 1 and 2 mirror their grade onto production, and that is what
// re-graduates the word here — the step that used to strand the plot.
const wateredAt = sb.__clock.t;
grade(ko, G.GOOD);
farm.advancePlot(plot, word, 2, G.GOOD);
eq(plot.sState, '3', 'watering grows it back to a sprout');
eq(srsOf(ko).st, 'review', 'and re-graduates the word, so its due date is a review date');
assert(srsOf(ko).due - wateredAt >= DAY,
  'a full day out — the date the sprout used to be left waiting on');
eq(plot.readyAt, wateredAt + SPROUT_MS, 'but the crop is on the crop clock, 45s out');

tick(SPROUT_MS);
farm._checkGrowth();
eq(plot.sState, '4', 'so it ripens on schedule and phase 3 is reachable again');
assert(sb.__clock.t < srsOf(ko).due, 'with the word’s own review still a long way off');

// ── 4. The same bug, one stage earlier ───────────────────────────────────────
console.log('\n--- 4. Planting an already-graduated word ---');
// Once every word the player owns has been learned, _pickWord has nothing ungraduated left
// to offer and hands back a review word. Its due date is days out, so the seedling used to
// stall before it ever asked to be watered.
at(T0);
R('plantedWords.clear(); srsData = {};');
const ko2 = WORDS[1];
const word2 = wordOf(ko2);
grade(ko2, G.GOOD); tick(SEEDLING_MS);
grade(ko2, G.GOOD); tick(SPROUT_MS);
grade(ko2, G.GOOD); tick(3 * DAY);
grade(ko2, G.GOOD);                      // a review answered on time: the interval grows
assert(srsOf(ko2).ivl > 1, 'the word is several days into review');

const replant = fakeFarmScene([{}]);
const plantedAt = sb.__clock.t;
replant.advancePlot(replant.plots[0], word2, 1, G.GOOD);
eq(replant.plots[0].sState, '1', 'it can still be planted as a seedling');
eq(replant.plots[0].readyAt, plantedAt + SEEDLING_MS, 'on the seedling’s 15s, not its review date');
tick(SEEDLING_MS);
replant._checkGrowth();
eq(replant.plots[0].sState, '2', 'so it wilts and asks for water like any other crop');

// ── 5. The deadline survives a save ──────────────────────────────────────────
console.log('\n--- 5. Across a save ---');
at(T0);
R('plantedWords.clear(); srsData = {};');
const live = fakeFarmScene([{ ko: WORDS[2], word: wordOf(WORDS[2]), plant: chainable('plant'), plantedAt: T0 }]);
live._setState(live.plots[0], '3', WORDS[2]);
sb.__live = live;
R('sceneRef = __live;');
const saved = JSON.parse(R('JSON.stringify(collectSave().plots)'));
eq(saved[0].readyAt, T0 + SPROUT_MS, 'the growth deadline is written into the save');

// Reloading mid-wait keeps the time remaining rather than restarting it.
R('sceneRef = null;');
tick(SPROUT_MS - 5000);
sb.__saved = saved;
R('plotSave = __saved; plantedWords.clear();');
const reloaded = fakeFarmScene([{}]);
reloaded._restorePlots();
eq(reloaded.plots[0].sState, '3', 'a crop reloaded 5s short of ripening is still a sprout');
eq(reloaded.plots[0].readyAt, T0 + SPROUT_MS, 'with its original deadline, not a fresh 45s');
tick(5000);
reloaded._checkGrowth();
eq(reloaded.plots[0].sState, '4', 'and ripens when that deadline arrives');

// Growth that finished while the game was closed is applied on load.
R('plotSave = __saved; plantedWords.clear();');
tick(2 * DAY);
const offline = fakeFarmScene([{}]);
offline._restorePlots();
eq(offline.plots[0].sState, '4', 'a sprout whose deadline passed while offline comes back ripe');

// ── 6. Saves written before the plot had a clock ─────────────────────────────
console.log('\n--- 6. Legacy saves ---');
// The sprouts already stranded by the old check have no readyAt. Anchoring the fallback to
// the plant time rather than to `now` means they come back ripe on the next load instead of
// serving another 45 seconds.
at(T0 + 3 * DAY);
R('plotSave = ' + JSON.stringify([{ i: 0, ko: WORDS[2], sState: '3', plantedAt: T0 }]) + '; plantedWords.clear();');
const legacy = fakeFarmScene([{}]);
legacy._restorePlots();
eq(legacy.plots[0].sState, '4', 'a stranded sprout is ripe as soon as the save is loaded');

// One planted moments before the upgrade keeps the rest of its wait.
const justPlanted = sb.__clock.t - 5000;
R('plotSave = ' + JSON.stringify([{ i: 0, ko: WORDS[3], sState: '1', plantedAt: justPlanted }]) + '; plantedWords.clear();');
const fresh = fakeFarmScene([{}]);
fresh._restorePlots();
eq(fresh.plots[0].sState, '1', 'a seedling planted 5s ago is still a seedling');
eq(fresh.plots[0].readyAt, justPlanted + SEEDLING_MS, 'and finishes the wait it started');

console.log('\n====================================================');
console.log('TEST RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
console.log('====================================================');
process.exit(failed === 0 ? 0 : 1);
