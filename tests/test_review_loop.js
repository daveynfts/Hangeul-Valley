/**
 * tests/test_review_loop.js — a learned word comes back to the farm when it falls due.
 *
 * It did not. Planting a word asks recognition and watering it asks listening, so both of
 * those tracks entered their learning steps — and nothing ever advanced them again: a step
 * needs two correct answers, and a crop asks each of them once. They sat in 'learn' with a
 * due date fifteen seconds after they were answered. The review picker always chose the
 * soonest-due modality, which was one of those two; the farm plants reviews only, so it then
 * dropped the whole word. The production review that had actually come due a day later was
 * never planted, for any word learned on the farm, and the HUD's due count held every word
 * the player had ever learned and never went down.
 *
 * Behind that, two faults the first one was hiding, because no recognition or listening
 * review could ever reach a plot:
 *
 *   - a four-option review answered wrong was re-asked with the right button lit up, the
 *     second try scored Hard, and Hard on a review *grows* the interval
 *   - the plot's reviewModality was not saved, so a reload turned a recognition review into
 *     a typed one, graded production, and left the modality that was due untouched
 *
 * Everything here is driven through the shipped quiz functions — openQuiz, answerChoice,
 * submitAnswer, closeQuiz — against a real FarmScene prototype, so the grades are the ones
 * the game actually hands the scheduler, mirroring included.
 *
 * Run: node tests/test_review_loop.js
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
// Same shape as tests/test_harvest_xp.js, plus a speech engine so the watering question is
// asked by ear the way a browser asks it, and elements that can animate (a wrong typed answer
// shakes the input).

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
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', value: '', disabled: false,
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        contains: (c) => classes.has(c),
        toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; }
      },
      appendChild(c) { this.children.push(c); return c; },
      insertBefore(c) { this.children.push(c); return c; },
      addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      hasAttribute() { return false; }, removeAttribute() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      remove() {}, focus() {}, blur() {}, click() {}, animate() { return {}; }
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
    fetch: () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} removeAttribute() {} },
    speechSynthesis: { getVoices: () => [], speak() {}, cancel() {}, resume() {}, paused: false, speaking: false, pending: false },
    SpeechSynthesisUtterance: class {},
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

const T0 = 1700000000000;
sb.__clock = { t: T0 };
R('Date.now = () => __clock.t;');
const now = () => sb.__clock.t;
const tick = (ms) => { sb.__clock.t += ms; };

const CFG = R('SRS_CFG');
const G = R('GRADE');
const DAY = R('DAY_MS');
const SEEDLING_MS = CFG.LEARN_STEPS[0];
const SPROUT_MS = CFG.LEARN_STEPS[1];

function fakeFarmScene(count) {
  const FarmScene = R('FarmScene');
  const s = Object.create(FarmScene.prototype);
  s.add = { image: () => chainable('image'), text: () => chainable('text'), graphics: () => chainable('graphics') };
  s.tweens = { add: () => chainable('tween') };
  s.time = { delayedCall: (_ms, fn) => { if (typeof fn === 'function') fn(); return chainable('timer'); } };
  s.textures = { exists: () => false };
  s.shadows = null;
  s.player = null;
  s.spawnDroppedItem = () => {};
  s._label = () => {};
  s.plots = Array.from({ length: count }, (_, i) => ({
    index: i, x: i * 60, y: 100, active: true,
    tile: chainable('tile'), shad: chainable('shad'),
    plant: null, glow: null, hintLabel: null, cropShadow: null,
    sState: '', ko: null, word: null, plantedAt: 0, reviewModality: null, readyAt: 0
  }));
  return s;
}

const q = (v) => JSON.stringify(v);
const entry = (ko, mod) => R('peekSrs(' + q(ko) + ', ' + q(mod) + ')') || null;
const mode = () => R('currentQuizMode');
const dueNow = () => R('srsDueWords().map(d => d.word.ko)');

/** Answer the multiple-choice question on screen, right or wrong, and dismiss the result. */
function pick(ko, correct) {
  const choice = R('currentChoices.find(o => (o.ko === ' + q(ko) + ') === ' + (correct ? 'true' : 'false') + ')');
  assert(!!choice, '  (a ' + (correct ? 'right' : 'wrong') + ' option is on screen to pick)');
  sb.__choice = choice;
  R('answerChoice(__choice, document.createElement("button"))');
  R('closeQuiz()');
}
/** Type the answer to the question on screen and dismiss the result. */
function type(text) {
  R('answerInput.value = ' + q(text) + '; submitAnswer();');
  R('closeQuiz()');
}

console.log('====================================================');
console.log('THE DAILY REVIEW LOOP');
console.log('====================================================');

// ── 1. Learning a word on the farm ───────────────────────────────────────────
console.log('\n--- 1. A word learned through the crop cycle ---');
R('plantedWords.clear(); srsData = {}; harvestCounts.clear(); quizStreak = 0;');
const farm = fakeFarmScene(9);
sb.__farm = farm;
R('sceneRef = __farm;');
const word = R('levelsData[0].words[0]');
const ko = word.ko;
const plot0 = farm.plots[0];

sb.__word = word;
R('openQuiz(__word, sceneRef.plots[0], 1)');
eq(mode(), 'recognise', 'the seed goes in on a recognition question — the Korean is new');
pick(ko, true);
eq(plot0.sState, '1', 'a right answer plants a seedling');

tick(SEEDLING_MS);
farm._checkGrowth();
eq(plot0.sState, '2', 'which wilts and asks for water');

R('openQuiz(__word, sceneRef.plots[0], 2)');
eq(mode(), 'listen', 'the watering is asked by ear');
pick(ko, true);
eq(plot0.sState, '3', 'watered, it grows into a sprout');

tick(SPROUT_MS);
farm._checkGrowth();
eq(plot0.sState, '4', 'and ripens');

R('openQuiz(__word, sceneRef.plots[0], 3)');
eq(mode(), 'type', 'the harvest is typed — production recall');
type(ko);
eq(plot0.ko, null, 'the harvest clears the plot');

['type', 'recognise', 'listen'].forEach((m) => {
  const e = entry(ko, m);
  eq(e && e.st, 'review', 'the ' + m + ' track leaves its learning steps with the harvest');
  assert(e && e.due - now() === DAY, '  and comes due a day out (' + (e && (e.due - now()) / DAY) + ' days)');
});
eq(dueNow().length, 0, 'so right after the harvest nothing is owed — the HUD due count is zero');

// ── 2. A day later, the review is on the farm ────────────────────────────────
console.log('\n--- 2. The next day ---');
tick(DAY + 60 * 1000);
eq(dueNow().join(','), ko, 'a day later the word is due');
const first = farm._plantDueReviews();
eq(first && first.planted, 1, 'and the farm plants it as a ripe review crop');
const reviewPlot = farm.plots.find(p => p.ko === ko);
assert(!!reviewPlot && reviewPlot.sState === '4', 'ripe, on a free plot');
eq(reviewPlot && reviewPlot.reviewModality, 'type', 'three tracks due together — production wins the tie');

sb.__rp = reviewPlot;
R('openQuiz(__word, __rp, 3)');
eq(mode(), 'type', 'the review asks for the skill that fell due');
type(ko);
assert(entry(ko, 'type').ivl > 1, 'answered on time, the production interval grows (' + entry(ko, 'type').ivl + 'd)');
eq(reviewPlot.ko, null, 'and the review crop is harvested');

// ── 3. A recognition review answered wrong is a lapse ────────────────────────
console.log('\n--- 3. A four-option review answered wrong ---');
const second = farm._plantDueReviews();
eq(second && second.planted, 1, 'the recognition track, still due, is planted next');
const recPlot = farm.plots.find(p => p.ko === ko);
eq(recPlot && recPlot.reviewModality, 'recognise',
  'as a recognition review — the harvest graduated it alongside production');
const lapsedMod = recPlot.reviewModality;
const before = entry(ko, lapsedMod);
sb.__recp = recPlot;
R('openQuiz(__word, __recp, 3)');
eq(mode(), lapsedMod, 'asked in that skill, as four options');
pick(ko, false);
const after = entry(ko, lapsedMod);
eq(after.st, 'relearn', 'a wrong pick on a review lapses the track — it is not re-asked for a free Hard');
eq(after.lapses, (before.lapses | 0) + 1, 'and counts the lapse');
eq(entry(ko, 'type').st, 'review', 'production is untouched by a recognition miss');
eq(recPlot.ko, null, 'the failed review crop is cleared, not regressed into a watering that grades other skills');
eq(R('plantedWords.has(' + q(ko) + ')'), false, 'and the word is free to be planted again');

// Listening fell due on the same day and is still owed, so it is what comes up next.
const third = farm._plantDueReviews();
eq(third && third.planted, 1, 'the listening track, also due, is planted straight after');
const lisPlot = farm.plots.find(p => p.ko === ko);
eq(lisPlot && lisPlot.reviewModality, 'listen', 'as a listening review');
sb.__lisp = lisPlot;
R('openQuiz(__word, __lisp, 3)');
eq(mode(), 'listen', 'asked by ear');
pick(ko, true);
assert(entry(ko, 'listen').ivl > 1, 'answered right, the listening interval grows (' + entry(ko, 'listen').ivl + 'd)');
eq(entry(ko, lapsedMod).st, 'relearn', 'and the lapsed recognition track is still relearning');

tick(30 * 1000);
eq((farm._plantDueReviews() || { planted: 0 }).planted, 0, 'half a minute after the miss it is not back yet');
tick(31 * 1000);
const retry = farm._plantDueReviews();
eq(retry && retry.planted, 1, 'past the one-minute relearning step it is planted again');
const retryPlot = farm.plots.find(p => p.ko === ko);
eq(retryPlot && retryPlot.reviewModality, lapsedMod, 'for another try at the skill that lapsed');
sb.__retry = retryPlot;
R('openQuiz(__word, __retry, 3)');
pick(ko, true);
eq(entry(ko, lapsedMod).st, 'review', 'answered right, it graduates back into review');
eq(entry(ko, lapsedMod).ivl, Math.max(1, Math.round(before.ivl * CFG.LAPSE_IVL_MULT)),
  'on the interval it kept through the lapse');
eq((farm._plantDueReviews() || { planted: 0 }).planted, 0, 'and with every track answered, nothing more is owed today');

// ── 4. A review crop survives a reload ───────────────────────────────────────
console.log('\n--- 4. Across a save ---');
R('plantedWords.clear();');
const saving = fakeFarmScene(3);
saving.plots[1].ko = ko; saving.plots[1].word = word; saving.plots[1].plant = chainable('plant');
saving._setState(saving.plots[1], '4', ko);
saving.plots[1].reviewModality = 'listen';
sb.__saving = saving;
R('sceneRef = __saving;');
const saved = JSON.parse(R('JSON.stringify(collectSave().plots)'));
eq(saved[0].reviewModality, 'listen', 'the skill a review crop tests is written into the save');
sb.__saved = saved;
R('sceneRef = null; plotSave = __saved; plantedWords.clear();');
const reloaded = fakeFarmScene(3);
reloaded._restorePlots();
eq(reloaded.plots[1].reviewModality, 'listen', 'and read back, so the reloaded crop still asks by ear');
sb.__rl = reloaded;
R('sceneRef = __rl;');
R('openQuiz(__word, sceneRef.plots[1], 3)');
eq(mode(), 'listen', 'the reloaded review is a listening question, not a typed one');
R('closeQuiz()');

// A crop that ripened in its own cycle is not a review, whatever a stray field says.
sb.__odd = [{ i: 0, ko, sState: '3', plantedAt: now() - 60 * 60 * 1000, reviewModality: 'recognise' }];
R('plotSave = __odd; plantedWords.clear();');
const grown = fakeFarmScene(1);
grown._restorePlots();
eq(grown.plots[0].sState, '4', 'a sprout that ripened offline comes back ripe');
eq(grown.plots[0].reviewModality, 'recognise', 'a ripe restored crop keeps its saved review modality');
sb.__bad = [{ i: 0, ko, sState: '4', plantedAt: now(), reviewModality: 'telepathy' }];
R('plotSave = __bad; plantedWords.clear();');
const bogus = fakeFarmScene(1);
bogus._restorePlots();
eq(bogus.plots[0].reviewModality, null, 'an unknown modality in a save is dropped rather than asked');

// ── 5. What counts as due ────────────────────────────────────────────────────
console.log('\n--- 5. A crop still growing is not a review ---');
R('plantedWords.clear(); srsData = {};');
const w2 = R('levelsData[0].words[1]');
R('gradeWord(' + q(w2.ko) + ', GRADE.GOOD, "recognise"); gradeWord(' + q(w2.ko) + ', GRADE.GOOD, "type");');
tick(10 * 60 * 1000);
eq(R('wordIsDue(' + q(w2.ko) + ')'), false, 'a planted word whose steps are long past is not "due for review"');
eq(dueNow().length, 0, 'and adds nothing to the due count');
eq(R('srsReviewDue(peekSrs(' + q(w2.ko) + '), Date.now())'), false, 'srsReviewDue says no to a learning step');
eq(R('srsIsDue(peekSrs(' + q(w2.ko) + '), Date.now())'), true, 'while srsIsDue still answers the scheduler’s own question');

// ── 6. Saves written before the fix ──────────────────────────────────────────
console.log('\n--- 6. The v10 -> v11 migration ---');
const stranded = (due) => ({ st: 'learn', step: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, due, last: due - 15000 });
const graduated = (ivl) => ({ st: 'review', step: 0, ivl, ease: 2.5, reps: 3, lapses: 0, due: T0 + ivl * DAY, last: T0 });
sb.__v10 = {
  v: 10,
  srs: {
    '아버지': { m: { type: graduated(6), recognise: stranded(T0 - 5 * DAY), listen: stranded(T0 - 5 * DAY) } },
    '어머니': { m: { type: graduated(1), recognise: graduated(3) } },
    '학교': { m: { type: stranded(T0 - DAY), recognise: stranded(T0 - DAY) } }
  }
};
const migrated = JSON.parse(R('JSON.stringify(migrateSaveData(__v10))'));
eq(migrated.v, 11, 'the save is brought up to v11');
const f = migrated.srs['아버지'].m;
eq(f.recognise.st, 'review', 'a stranded recognition track on a learned word is carried into review');
eq(f.listen.st, 'review', 'and so is its listening track');
eq(f.recognise.ivl, CFG.GRADUATE_IVL, 'at the graduating interval — nothing unshown is claimed');
const firstDue = [f.recognise.due, f.listen.due].map(d => Math.round((d - now()) / DAY));
assert(firstDue.every(d => d >= 1 && d <= 14), 'first due somewhere in the next two weeks, not all at once (' + firstDue + ')');
eq(JSON.stringify(f.type), JSON.stringify(graduated(6)), 'production is left exactly as it was');
eq(JSON.stringify(migrated.srs['어머니'].m.recognise), JSON.stringify(graduated(3)), 'an already-graduated track is not touched');
eq(migrated.srs['학교'].m.recognise.st, 'learn', 'a word still in its crop cycle keeps its learning steps');
const again = JSON.parse(R('JSON.stringify(migrateSaveData(' + JSON.stringify(migrated) + '))'));
eq(JSON.stringify(again.srs), JSON.stringify(migrated.srs), 'running it twice changes nothing');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_review_loop: all passed');
