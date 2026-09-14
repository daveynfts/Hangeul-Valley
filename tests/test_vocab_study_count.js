/**
 * tests/test_vocab_study_count.js — how many times a word has been studied, on its card.
 *
 * The vocabulary book computed `times` from harvestCounts and then used it for nothing but a
 * CSS class, so the one number that answers "how well do I know this word" was in hand and
 * never shown. It is on the card now.
 *
 * Which number that should be was not obvious, and the wrong one was the tempting one. The
 * SRS entry carries `reps`, which reads like a study count and is not: srsSchedule credits a
 * rep on every reschedule, so a single plant/water/harvest cycle moves it from 1 to 4. A
 * harvest is the third and last answer of that cycle, and a due review is the same cycle
 * entered at its final step, so harvestCounts moves by exactly one per completed pass — and
 * not at all for a failed review or a crop still growing. That is the number, and section 1
 * pins it against the shipped FarmScene rather than against a description of it.
 *
 * Run: node tests/test_vocab_study_count.js
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

function chainable() {
  const o = { destroyed: false, x: 0, y: 0 };
  const self = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'destroy') return () => { t.destroyed = true; };
      return () => self;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return self;
}

// An element that keeps its attributes and answers querySelector, because both are things
// this test actually reads: the count goes into the card's markup and into its aria-label,
// and renderVocabCards wires a listener onto a .vc-speak button it expects to find.
function makeEl(tag) {
  const classes = new Set();
  const attrs = {};
  let html = '';
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [], textContent: '', value: '', style: {}, title: '',
    // A real accessor, because renderVocabCards empties the grid with `innerHTML = ''` and
    // then appends fresh cards. A plain field kept the old cards in `children`, so a second
    // render read back the first one's markup and the test asserted against stale HTML.
    get innerHTML() { return html; },
    set innerHTML(v) { html = String(v); if (!html) this.children.length = 0; },
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; }
    },
    get className() { return [...classes].join(' '); },
    set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    removeAttribute: (k) => { delete attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    // Every card asks for its speak button. Nothing here inspects it, but returning null
    // would throw before the card was ever appended.
    querySelector: () => ({ addEventListener() {} }),
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    remove() {}, focus() {}, blur() {}, click() {},
    animate: () => ({ finished: Promise.resolve() })
  };
  return el;
}

function makeSandbox() {
  const els = {};
  const doc = {
    getElementById: (id) => els[id] || (els[id] = makeEl('div')),
    createElement: (tag) => makeEl(tag),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head')
  };
  const storage = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k), clear: () => m.clear(), get length() { return m.size; } };
  };
  const sb = {
    console, IS_NODE: true,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: doc, localStorage: storage(), sessionStorage: storage(),
    fetch: () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder, addEventListener() {}, removeEventListener() {},
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
sb.__levels = require(path.join('..', 'levels.json'));
R('levelsData = __levels; currentLevelIndex = 0;');

const T0 = 1700000000000;
sb.__clock = { t: T0 };
R('Date.now = () => __clock.t;');
const tick = (ms) => { sb.__clock.t += ms; };

const CFG = R('SRS_CFG');
const G = R('GRADE');
const WORDS = R('levelsData[0].words.slice(0, 3).map(w => w.ko)');
const wordOf = (ko) => R('levelsData[0].words.find(w => w.ko === ' + JSON.stringify(ko) + ')');
const studied = (ko) => R('harvestCounts.get(' + JSON.stringify(ko) + ') || 0');
const repsOf = (ko) => { const e = R('peekSrs(' + JSON.stringify(ko) + ')'); return e ? e.reps : 0; };

function farm(plotDefs) {
  const FarmScene = R('FarmScene');
  const s = Object.create(FarmScene.prototype);
  s.add = { image: () => chainable(), text: () => chainable(), graphics: () => chainable() };
  s.tweens = { add: () => chainable() };
  s.time = { delayedCall: (_ms, fn) => { if (fn) fn(); return chainable(); } };
  s.textures = { exists: () => false };
  s.shadows = null; s.player = null; s.spawnDroppedItem = () => {}; s._label = () => {};
  s.plots = plotDefs.map((d, i) => Object.assign({
    index: i, x: i * 60, y: 100, active: true, tile: chainable(), shad: chainable(),
    plant: null, glow: null, hintLabel: null, cropShadow: null,
    sState: '', ko: null, word: null, plantedAt: 0, reviewModality: null, readyAt: 0
  }, d));
  return s;
}
/** One answer, the way submitAnswer drives it: grade, then advance the plot. */
function answer(ko, phase, grade, scene) {
  R('gradeWord(' + JSON.stringify(ko) + ', ' + grade + ', "type")');
  if (phase === 3 && grade === G.AGAIN) scene.regressionPlot(scene.plots[0], wordOf(ko));
  else scene.advancePlot(scene.plots[0], wordOf(ko), phase, grade);
}
function fullCycle(ko) {
  const s = farm([{}]);
  answer(ko, 1, G.GOOD, s);
  tick(CFG.LEARN_STEPS[0]);
  answer(ko, 2, G.GOOD, s);
  tick(CFG.LEARN_STEPS[1]);
  answer(ko, 3, G.GOOD, s);
}

console.log('====================================================');
console.log('THE STUDY COUNT ON A VOCABULARY CARD');
console.log('====================================================');

// ── 1. The number means what the card will claim it means ────────────────────
console.log('\n--- 1. What counts as one study ---');
R('plantedWords.clear(); srsData = {}; harvestCounts.clear(); attemptLog.length = 0;');
const KO = WORDS[0];

const mid = farm([{}]);
answer(KO, 1, G.GOOD, mid);
eq(studied(KO), 0, 'planting a word is not yet a study');
tick(CFG.LEARN_STEPS[0]);
answer(KO, 2, G.GOOD, mid);
eq(studied(KO), 0, 'nor is watering it — the pass is not finished');
tick(CFG.LEARN_STEPS[1]);
answer(KO, 3, G.GOOD, mid);
eq(studied(KO), 1, 'harvesting it completes the first pass, and counts one');

fullCycle(KO);
eq(studied(KO), 2, 'a second full pass counts a second');

// A due review is the same cycle entered at its last step.
tick(3 * R('DAY_MS'));
const rev = farm([{ ko: KO, word: wordOf(KO), plant: chainable(), sState: '4' }]);
answer(KO, 3, G.GOOD, rev);
eq(studied(KO), 3, 'a review answered right counts too — it is a pass through the same cycle');

const missed = farm([{ ko: KO, word: wordOf(KO), plant: chainable(), sState: '4' }]);
answer(KO, 3, G.AGAIN, missed);
eq(studied(KO), 3, 'a review answered wrong does not: nothing was completed');

// The counter that looks right and is not. If this ever stops being true the card should be
// revisited, not silently switched over.
assert(repsOf(KO) !== studied(KO),
  'the SRS reps field is a different number and must not be used for this'
  + ' (reps=' + repsOf(KO) + ', studies=' + studied(KO) + ')');

const untouched = WORDS[2];
eq(studied(untouched), 0, 'a word never opened has no count at all');

// ── 2. It survives a save ────────────────────────────────────────────────────
console.log('\n--- 2. It is kept ---');
const saved = JSON.parse(R('JSON.stringify(collectSave())'));
eq(saved.harvests[KO], 3, 'the count is written into the save');
sb.__saved = saved;
R('harvestCounts.clear();');
R('applySave(__saved);');
eq(studied(KO), 3, 'and comes back on the next load');

// ── 3. It reaches the card ───────────────────────────────────────────────────
console.log('\n--- 3. On the card ---');
R('activeCat = "all";');
const search = R('vocabSearch');
search.value = '';
R('renderVocabCards();');
const grid = R('vocabGrid');
assert(grid.children.length > 0, 'the grid rendered cards (' + grid.children.length + ')');

const cardFor = (ko) => grid.children.find((c) => c.innerHTML.indexOf('>' + ko + '<') >= 0);
const studiedCard = cardFor(KO);
assert(!!studiedCard, 'the studied word has a card');
assert(/vc-studied/.test(studiedCard.innerHTML), 'which carries the study-count chip');
assert(/×3/.test(studiedCard.innerHTML),
  'showing three: ' + (/(<span class="vc-studied"[^>]*>)([^<]*)/.exec(studiedCard.innerHTML) || [])[2]);
assert(/title="[^"]*3[^"]*"/.test(studiedCard.innerHTML), 'with the number spelled out on hover too');
const aria = studiedCard.getAttribute('aria-label') || '';
assert(/3/.test(aria) && /studied/i.test(aria),
  'and read out to a screen reader rather than drawn only: ' + JSON.stringify(aria));

// One is the count a catalogue with no plural forms gets wrong on its own.
const onceKo = WORDS[1];
R('harvestCounts.set(' + JSON.stringify(onceKo) + ', 1);');
R('renderVocabCards();');
const onceCard = grid.children.find((c) => c.innerHTML.indexOf('>' + onceKo + '<') >= 0);
assert(!!onceCard, 'a word studied exactly once has a card');
assert(/×1/.test(onceCard.innerHTML), 'whose chip still shows the digit');
const onceAria = onceCard.getAttribute('aria-label') || '';
assert(!/1 times/.test(onceAria), 'and is not read out as "1 times": ' + JSON.stringify(onceAria));
assert(/once/i.test(onceAria), 'but in the singular: ' + JSON.stringify(onceAria));
assert(!/1 times/.test(onceCard.innerHTML), 'the hover text avoids it too');

const freshCard = cardFor(untouched);
assert(!!freshCard, 'a never-studied word also has a card');
assert(!/vc-studied/.test(freshCard.innerHTML),
  'but no chip on it — a row of "×0" would be noise on every new level');
assert(!/×0/.test(freshCard.innerHTML), 'and certainly no zero');

// ── 4. The chip is styled and translated ─────────────────────────────────────
console.log('\n--- 4. Presentation ---');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
assert(/\.vc-studied\s*\{/.test(css), 'the chip has a rule of its own in game.css');

const i18n = require('../js/i18n.js');
const readTable = require('../admin/lib/i18n.js').readChromeTable;
['en', 'vi'].forEach((lang) => {
  const table = readTable(ROOT, lang);
  ['ui.vocab.card.studied', 'ui.vocab.card.studied.aria', 'ui.vocab.card.studied.title'].forEach((k) => {
    assert(!!table[k], lang + ' has ' + k + ': ' + JSON.stringify(table[k] || null));
    assert(/\{n\}/.test(table[k] || ''), lang + "'s " + k + ' takes the count as a placeholder');
  });
  // The singular pair. No {n} required — English spends it on the word "once".
  ['ui.vocab.card.studied.aria.one', 'ui.vocab.card.studied.title.one'].forEach((k) => {
    assert(!!table[k], lang + ' has the singular ' + k + ': ' + JSON.stringify(table[k] || null));
    assert(!/1 times/.test(table[k] || ''), lang + "'s " + k + ' does not say "1 times"');
  });
});
assert(readTable(ROOT, 'vi')['ui.vocab.card.studied.aria'] !== readTable(ROOT, 'en')['ui.vocab.card.studied.aria'],
  'and the Vietnamese is a translation rather than the English copied across');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_vocab_study_count: all passed');
