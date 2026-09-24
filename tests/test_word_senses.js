/**
 * tests/test_word_senses.js — two words spelled the same keep two records.
 *
 * Progress, harvest counts, plots and origin cards found a word by its spelling, which stopped
 * being an identity once the worlds brought their own vocabulary: 쓰다 "to write" (level 1) and
 * 쓰다 "to be bitter" (Unit 10) shared one record, so learning either marked both, and TOPIK's
 * 사고 "an accident" showed the origin of the level's 사고, 思考 "to think".
 *
 * js/systems/wordSenses.js names the second sense of each pair and gives it the identity
 * `<spelling>#<tag>`. This drives a Unit 10 쓰다 through the real quiz functions and checks the
 * level's 쓰다 stays untouched, then the origin card, the save's one-time split of an old shared
 * record, the merge, and the validator check that stops the next pair arriving unnoticed.
 *
 * Run: node tests/test_word_senses.js
 */

'use strict';

const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');
const senses = require('../js/systems/wordSenses.js');
const shared = require('../scripts/sharedHeadwords.js');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
// Same shape as tests/test_review_loop.js.

function chainable(kind) {
  const o = { _kind: kind, destroyed: false, texture: null, tint: null, alpha: 1, x: 0, y: 0 };
  const self = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'destroy') return () => { t.destroyed = true; };
      if (k === 'setTexture') return (v) => { t.texture = v; return self; };
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
      parentElement: { style: {} },
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

const sb = makeSandbox();
const R = (expr) => vm.runInContext(expr, sb);
const q = (v) => JSON.stringify(v);
sb.__levelsJson = require(path.join('..', 'levels.json'));
R('levelsData = __levelsJson;');
sb.__clock = { t: 1780000000000 };
R('Date.now = () => __clock.t;');
const tick = (ms) => { sb.__clock.t += ms; };
const CFG = R('SRS_CFG');

console.log('====================================================');
console.log('ONE SPELLING, TWO WORDS');
console.log('====================================================');

// ── 1. The table ─────────────────────────────────────────────────────────────
console.log('\n--- 1. Which words have an identity of their own ---');
eq(senses.senseKeyFor('쓰다', '2b-unit-10'), '쓰다#bitter', 'Unit 10\'s 쓰다 is 쓰다#bitter');
eq(senses.senseKeyFor('쓰다', null), '쓰다', 'the level\'s 쓰다 keeps its spelling');
eq(senses.senseKeyFor('사고', 'topik-2'), '사고#accident', 'TOPIK II\'s 사고 is 사고#accident');
eq(senses.senseKeyFor('식당', 'topik-2'), '식당', 'a word TOPIK II shares as the same word keeps its spelling');
eq(senses.wordKey({ ko: '학교' }), '학교', 'a word with no key is known by its spelling');

// ── 2. In the game ───────────────────────────────────────────────────────────
console.log('\n--- 2. Learning the bitter 쓰다 leaves "to write" alone ---');
['2b-unit-10', 'topik-2'].forEach((id) => {
  sb.__world = require(path.join('..', 'worlds', id + '.json'));
  R('attachTextbookWorld(JSON.parse(JSON.stringify(__world)))');
});
const unitIdx = R('worldIndexOf("2b-unit-10")');
const bitter = R('levelsData[' + unitIdx + '].words.find(w => w.ko === "쓰다")');
const write = R('levelsData.find(l => !l.worldId && l.words.some(w => w.ko === "쓰다")).words.find(w => w.ko === "쓰다")');
eq(bitter.key, '쓰다#bitter', 'the Unit 10 word is stamped as it joins the level list');
eq(bitter.en, 'to be bitter', 'and it is the bitter one');
eq(write.key, undefined, 'the level 1 word carries no key');
const topikIdx = R('worldIndexOf("topik-2")');
eq(R('levelsData[' + topikIdx + '].words.filter(w => w.key).map(w => w.key).sort().join()'), '거리#street,사고#accident',
  'in TOPIK II only 거리 and 사고 are stamped');

R('plantedWords.clear(); srsData = {}; harvestCounts.clear(); quizStreak = 0; selectLesson(' + unitIdx + ');');
const farm = fakeFarmScene(9);
sb.__farm = farm;
R('sceneRef = __farm;');
sb.__word = R('levelsData[' + unitIdx + '].words.find(w => w.ko === "쓰다")');

function pick(correct) {
  const choice = R('currentChoices.find(o => (o.ko === "쓰다") === ' + (correct ? 'true' : 'false') + ')');
  sb.__choice = choice;
  R('answerChoice(__choice, document.createElement("button"))');
  R('closeQuiz()');
}
R('openQuiz(__word, sceneRef.plots[0], 1)');
pick(true);
eq(farm.plots[0].ko, '쓰다#bitter', 'the plot holds the word by its identity');
assert(R('plantedWords.has("쓰다#bitter") && !plantedWords.has("쓰다")'), 'and so does the planted set');
tick(CFG.LEARN_STEPS[0]); farm._checkGrowth();
R('openQuiz(__word, sceneRef.plots[0], 2)');
if (R('currentQuizMode') === 'type') R('answerInput.value = "쓰다"; submitAnswer(); closeQuiz();');
else pick(true);
tick(CFG.LEARN_STEPS[1]); farm._checkGrowth();
R('openQuiz(__word, sceneRef.plots[0], 3)');
R('answerInput.value = "쓰다"; submitAnswer(); closeQuiz();');
eq(R('peekSrs("쓰다#bitter") && peekSrs("쓰다#bitter").st'), 'review', 'three touches later the bitter 쓰다 is learned');
eq(R('srsData["쓰다"]'), undefined, '"to write" has no record at all');
eq(R('harvestCounts.get("쓰다#bitter")'), 1, 'the harvest is counted on the bitter one');
eq(R('harvestCounts.has("쓰다")'), false, 'and not on "to write"');
sb.__write = write;
eq(R('peekSrs(wordKey(__write)) || null'), null, 'the vocabulary book finds nothing for "to write"');
eq(R('calcLevelProgress(levelsData.findIndex(l => !l.worldId && l.words.some(w => w.ko === "쓰다")))'), 0,
  'and its level has not moved');

tick(CFG.GRADUATE_IVL * R('DAY_MS') + 1000);
const due = R('srsDueWords().filter(d => d.word.ko === "쓰다")');
eq(due.length, 1, 'a day later one 쓰다 is due');
eq(due[0] && due[0].word.en, 'to be bitter', 'and it is the one that was learned, not the level\'s');

sb.__plotRow = { i: 3, ko: '쓰다#bitter', sState: '4', plantedAt: 1, readyAt: 0 };
eq(R('sceneRef._findWord("쓰다#bitter").en'), 'to be bitter', 'a saved plot finds its word again by identity');
eq(R('sceneRef._findWord("쓰다").en'), 'to write', 'and the bare spelling finds the level\'s');

// ── 3. The origin card ───────────────────────────────────────────────────────
console.log('\n--- 3. The accident is not shown the origin of "thinking" ---');
sb.__facts = require(path.join('..', 'facts.json'));
R('factsData = __facts;');
const accident = R('levelsData[' + topikIdx + '].words.find(w => w.ko === "사고")');
const thinking = R('levelsData.find(l => !l.worldId && l.words.some(w => w.ko === "사고")).words.find(w => w.ko === "사고")');
sb.__accident = accident; sb.__thinking = thinking;
assert(/思考/.test(R('getFunFact(__thinking).origin')), 'the level\'s 사고 still shows 思考');
eq(R('getFunFact(__accident).origin'), '', 'TOPIK II\'s accident shows no origin rather than the wrong one');

// ── 4. An old save's shared record ───────────────────────────────────────────
console.log('\n--- 4. A save from before the split ---');
const oldSave = (extra) => Object.assign({
  v: 11,
  srs: { '쓰다': { m: { type: { st: 'review', ivl: 4, ease: 2.5, reps: 3, lapses: 0, due: 5, last: 1 } } }, '사고': { m: { type: { st: 'learn', step: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, due: 3, last: 2 } } } },
  harvests: { '쓰다': 2 },
  unlockedLevels: [0]
}, extra);
sb.__old = oldSave({ visitedWorlds: ['2b-unit-10'], lastWorld: '2b-unit-10' });
let m = R('migrateSaveData(__old)');
assert(JSON.stringify(m.srs['쓰다#bitter']) === JSON.stringify(m.srs['쓰다']), 'been to Unit 10: the shared record is kept on both senses');
eq(m.harvests['쓰다#bitter'], 2, 'and so is the harvest count');
eq(m.srs['사고#accident'], undefined, 'never in TOPIK II: the accident starts new');
eq(m.senseSplits.slice().sort().join(), senses.senseSplitIds().sort().join(), 'every split is recorded as applied');

sb.__again = m;
const twice = R('migrateSaveData(__again)');
eq(JSON.stringify(twice.srs), JSON.stringify(m.srs), 'loading it again changes nothing');
sb.__later = Object.assign({}, m, { visitedWorlds: ['2b-unit-10', 'topik-2'] });
eq(R('migrateSaveData(__later)').srs['사고#accident'], undefined,
  'and a split already applied is not re-run when the player later visits that world');

sb.__preIds = oldSave({});
m = R('migrateSaveData(__preIds)');
assert(!!m.srs['쓰다#bitter'] && !!m.srs['사고#accident'], 'a save from before world ids cannot say where it has been, so nothing is lost');

R('senseSplitsDone = senseSplitIds();');
eq(R('collectSave().senseSplits.length'), senses.senseSplitIds().length, 'a game begun on this build starts with every split applied');

// ── 5. Two copies ────────────────────────────────────────────────────────────
console.log('\n--- 5. Merging two copies ---');
const merged = require('../js/systems/saveMerge.js').mergeSaves(
  { srs: {}, senseSplits: ['2b-unit-10|쓰다'] }, { srs: {}, senseSplits: ['topik-2|사고'] });
eq((merged.senseSplits || []).slice().sort().join(), '2b-unit-10|쓰다,topik-2|사고', 'a split either copy applied stays applied');

// ── 6. The next pair ─────────────────────────────────────────────────────────
console.log('\n--- 6. The validator stops the next pair arriving unnoticed ---');
const places = shared.vocabularyPlaces(path.join(__dirname, '..'));
eq(shared.sharedHeadwordProblems(places, senses.WORD_SENSES, senses.senseKeyFor).length, 0, 'the content as it stands passes');
// Level 7 teaches 배 as the stomach; a new unit teaching it as a ship is a second word.
const withPear = places.concat([{ place: 'unit-99', worldId: 'unit-99', ko: '배', en: 'a ship' }]);
const found = shared.sharedHeadwordProblems(withPear, senses.WORD_SENSES, senses.senseKeyFor);
assert(found.length === 1 && /^배: /.test(found[0]), 'a new unit teaching 배 "a ship" beside the stomach fails: ' + (found[0] || '').slice(0, 60) + '…');
const named = Object.assign({}, senses.WORD_SENSES, { 'unit-99': { '배': 'ship' } });
const namedKey = (ko, w) => (named[w] && named[w][ko]) ? ko + '#' + named[w][ko] : ko;
eq(shared.sharedHeadwordProblems(withPear, named, namedKey).length, 0, 'naming the second sense clears it');
eq(shared.sharedHeadwordProblems(places, Object.assign({}, senses.WORD_SENSES, { '2b-unit-12': { '쓰다': 'x' } }), senses.senseKeyFor)
  .filter((p) => /does not teach it/.test(p)).length, 1, 'a table entry for a word the world does not teach fails');
eq(shared.sharedHeadwordProblems(places, senses.WORD_SENSES, senses.senseKeyFor, new Set(shared.SAME_WORD).add('학교'))
  .filter((p) => /no longer conflict/.test(p)).length, 1, 'and so does a "same word" entry that no longer needs to be there');
assert(shared.glossesUnrelated('to write', 'to be bitter') && !shared.glossesUnrelated('relatives', 'a relative')
  && !shared.glossesUnrelated('colour', 'a color'),
  'the gloss test tells "to write" from "to be bitter", and knows relatives from a relative and colour from color');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
