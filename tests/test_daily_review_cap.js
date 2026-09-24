/**
 * tests/test_daily_review_cap.js — reviews come due by the day, and a day has a limit.
 *
 * Two things the review loop did not have once it started working:
 *
 *   - a due date was read to the minute, so a review drifted with the hour the player sat
 *     down: studying at nine one evening and eight the next found yesterday's words not due
 *   - everything due was owed at once. A player back from two weeks away, or one whose
 *     recognition and listening tracks the v10 -> v11 migration released, met the whole
 *     backlog as a stream that refilled every plot as fast as it emptied
 *
 * A review is owed from the start of its day now — but never before the scheduler would count
 * the answer — and SRS_CFG.DAILY_REVIEW_CAP bounds a day. Relearning steps are exempt. The
 * count lives on the attempt log, so two devices' days add up when their saves merge.
 *
 * Times are built as local wall-clock times in June, clear of every daylight-saving change,
 * so the checks hold in any time zone.
 *
 * Run: node tests/test_daily_review_cap.js
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
      parentElement: { style: {} },   // the progress panel hides a section by its wrapper
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

sb.__clock = { t: 0 };
R('Date.now = () => __clock.t;');
const setNow = (t) => { sb.__clock.t = t; };
sb.__toasts = [];
R('showToast = function (m) { __toasts.push(String(m)); };');

const CFG = R('SRS_CFG');
const G = R('GRADE');
const DAY = R('DAY_MS');
const q = (v) => JSON.stringify(v);

// Local wall-clock time, 2026-06-<d> <h>:<m>.
const at = (d, h, m = 0) => new Date(2026, 5, d, h, m, 0, 0).getTime();

function fakeFarmScene(count) {
  const FarmScene = R('FarmScene');
  const s = Object.create(FarmScene.prototype);
  s.add = { image: () => chainable('image'), text: () => chainable('text'), graphics: () => chainable('graphics') };
  s.tweens = { add: () => chainable('tween') };
  s.time = { delayedCall: (_ms, fn) => { if (typeof fn === 'function') fn(); return chainable('timer'); } };
  s.textures = { exists: () => false };
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

/** A production track in review, answered at `last` on an interval of `ivl` days. */
const reviewEntry = (last, ivl) => ({
  st: 'review', step: 0, ivl, ease: 2.5, reps: 2, lapses: 0, due: last + ivl * DAY, last
});

console.log('====================================================');
console.log('REVIEWS BY THE DAY, AND A LIMIT TO A DAY');
console.log('====================================================');

// ── 1. The study day ─────────────────────────────────────────────────────────
console.log('\n--- 1. Where a day begins ---');
eq(CFG.DAY_ROLLOVER_HOUR, 0, 'the study day turns over at midnight, the day the quest board keeps');
eq(R('srsDayStart(' + at(10, 21) + ')'), at(10, 0), '21:00 belongs to the day that began at 00:00');
R('SRS_CFG.DAY_ROLLOVER_HOUR = 4');
eq(R('srsDayStart(' + at(11, 2) + ')'), at(10, 4), 'with a 04:00 rollover, 02:00 still belongs to the day before');
eq(R('srsDayStart(' + at(11, 5) + ')'), at(11, 4), 'and 05:00 to the new one');
R('SRS_CFG.DAY_ROLLOVER_HOUR = 0');

// ── 2. When a review is owed ─────────────────────────────────────────────────
console.log('\n--- 2. Owed from the start of its day, never before it would count ---');
{
  // Learned at 21:00, one day out: due 21:00 tomorrow to the minute.
  sb.__e = reviewEntry(at(10, 21), 1);
  const due = (t) => R('srsReviewDue(__e, ' + t + ')');
  eq(due(at(11, 0, 30)), false, 'an hour after midnight the word is not owed: only 3½ hours have passed');
  eq(due(at(11, 16, 0)), false, 'nor at 16:00 — the scheduler grows a 1-day interval after 19.2 hours');
  eq(due(at(11, 16, 12)), true, 'from 16:12 it is owed, ahead of the 21:00 its date says');
  const answered = R('srsSchedule(__e, GRADE.GOOD, ' + at(11, 19) + ')');
  assert(answered.ivl > 1, 'and a review answered at 19:00 grows the interval (' + answered.ivl + ' days) — offered means it counts');

  // Ten days out: the day decides.
  sb.__e = reviewEntry(at(1, 22), 10);
  eq(due(at(10, 23, 59)), false, 'a 10-day review due 22:00 on the 11th is not owed on the 10th');
  eq(due(at(11, 0, 0)), true, 'it is owed from 00:00 on the 11th');
  const early = R('srsSchedule(__e, GRADE.GOOD, ' + at(11, 0, 30) + ')');
  assert(early.ivl > 10, 'and answering it at 00:30 grows the interval (' + early.ivl + ' days)');

  // Relearning steps are minutes long and run on the clock.
  sb.__e = { st: 'relearn', step: 0, ivl: 3, ease: 2.3, reps: 3, lapses: 1, due: at(11, 9, 1), last: at(11, 9) };
  eq(due(at(11, 9, 0) + 59000), false, 'a relearning step is not owed a second early');
  eq(due(at(11, 9, 1)), true, 'and is owed on the minute');
}

// ── 3. The daily limit ───────────────────────────────────────────────────────
console.log('\n--- 3. A backlog is spread over days, most overdue first ---');
const CAP = CFG.DAILY_REVIEW_CAP;
eq(CAP, 100, 'a day asks for 100 scheduled reviews at most');

const words = R('levelsData.flatMap(l => l.words)').slice(0, CAP + 31);
const backlog = words.slice(0, CAP + 30);
setNow(at(10, 9));
R('plantedWords.clear(); srsData = {}; attemptLog = [];');
// 130 production reviews, all overdue: the first one the most, a minute apart.
backlog.forEach((w, i) => {
  sb.__w = w;
  sb.__e = reviewEntry(at(1, 8) + i * 60000, 5);
  R('srsData[__w.ko] = { m: { type: __e } };');
});
let queue = R('srsReviewQueue()');
eq(queue.today.length, CAP, 'with 130 overdue, today holds 100');
eq(queue.waiting, 30, 'and 30 wait');
eq(queue.today[0].word.ko, backlog[0].ko, 'the most overdue comes first');
assert(queue.today.every((d) => backlog.slice(0, CAP).some((w) => w.ko === d.word.ko)),
  'the 100 most overdue are the ones held today; the 30 most recent wait');
R('updateHUD()');
eq(R('document.getElementById("hud-due").textContent'), String(CAP), 'the HUD counts what today asks for — 100, not 130');
eq(R('srsStats().dueNow'), CAP, 'and so does the progress panel');

const farm = fakeFarmScene(15);
sb.__farm = farm;
R('sceneRef = __farm;');
let res = farm._plantDueReviews();
eq(res.planted, 13, 'the farm plants 13 — its free plots, less the two kept for new words');
eq(res.waiting, 30, 'and knows 30 are past today');

// Answer the day: each planted review, harvested as the quiz would, then replant.
function answerPlanted(grade) {
  let n = 0;
  farm.plots.forEach((p) => {
    if (!p.ko) return;
    R('gradeWord(' + q(p.ko) + ', ' + grade + ', "type"); plantedWords.delete(' + q(p.ko) + ');');
    p.ko = null; p.word = null; p.sState = ''; p.reviewModality = null;
    n++;
  });
  return n;
}
let answered = 0;
for (let round = 0; round < 20 && answered < CAP; round++) {
  answered += answerPlanted(G.GOOD);
  farm._plantDueReviews();
}
eq(answered, CAP, 'the farm keeps planting until exactly 100 have been answered');
eq(R('reviewsAnsweredToday()'), CAP, 'and the day has counted 100');
res = farm._plantDueReviews();
eq(res.planted, 0, 'then it plants nothing more, with plots free');
eq(res.waiting, 30, 'the 30 still wait');
eq(R('srsReviewQueue().today.length'), 0, 'and the HUD reads zero: today is done');

sb.__toasts.length = 0;
farm._refreshDueReviews();
farm._refreshDueReviews();
eq(sb.__toasts.length, 1, 'reaching the limit is said once a day, not on every tick');
assert(/100/.test(sb.__toasts[0]) && /30/.test(sb.__toasts[0]), 'naming the limit and what waits: ' + sb.__toasts[0]);

R('renderProgressOverlay()');
const grid = R('document.getElementById("prog-stat-grid").innerHTML');
assert(grid.indexOf('>100/100<') >= 0, 'the progress panel shows the day as 100/100');
assert(grid.indexOf('>30<') >= 0 && grid.indexOf(R('hvT("ui.prog.waiting")')) >= 0, 'and the 30 waiting for tomorrow');

// What is on a plot was taken from the allowance when it was planted. Run on a copy of the
// day, put back afterwards, so the 30 still wait for section 4.
{
  const farm2 = fakeFarmScene(15);
  sb.__farm2 = farm2;
  R('var __snap = JSON.stringify({ s: srsData, a: attemptLog });');
  R('plantedWords.clear(); attemptLog = []; for (let i = 0; i < ' + (CAP - 5) + '; i++) attemptLog.push({ ko: "y" + i, g: 2, m: "type", at: ' + at(10, 8) + ' + i, ivl: 3, st: "review", rv: 1 });');
  eq(farm2._plantDueReviews().planted, 5, 'with 5 left of the day, 5 are planted though 13 plots are free');
  farm2.plots.filter((p) => p.ko).slice(0, 2).forEach((p) => {
    R('gradeWord(' + q(p.ko) + ', GRADE.GOOD, "type"); plantedWords.delete(' + q(p.ko) + ');');
    p.ko = null; p.word = null; p.sState = ''; p.reviewModality = null;
  });
  eq(farm2._plantDueReviews().planted, 0, 'two answered, three still on plots: nothing new is planted over the limit');
  R('plantedWords.clear(); ({ s: srsData, a: attemptLog } = JSON.parse(__snap));');
}

// A lapse is one review; the relearning steps after it are not counted and not held back.
const lapsed = words[CAP + 30];
sb.__w = lapsed;
sb.__e = reviewEntry(at(9, 9), 1);
R('srsData[__w.ko] = { m: { type: __e } };');
R('attemptLog = attemptLog.filter(a => false); for (let i = 0; i < ' + CAP + '; i++) attemptLog.push({ ko: "x" + i, g: 2, m: "type", at: ' + at(10, 8) + ' + i, ivl: 3, st: "review", rv: 1 });');
R('gradeWord(__w.ko, GRADE.AGAIN, "type")');
eq(R('attemptLog[attemptLog.length - 1].rv'), 1, 'failing a review is a review answered');
eq(R('peekSrs(__w.ko).st'), 'relearn', 'and sends the word into relearning');
setNow(at(10, 9) + 61000);
res = farm._plantDueReviews();
assert(farm.plots.some((p) => p.ko === lapsed.ko), 'with the limit reached, the relearning step is still planted a minute later');
R('gradeWord(__w.ko, GRADE.GOOD, "type")');
eq(R('attemptLog[attemptLog.length - 1].rv'), undefined, 'and answering it is not counted as another review');

// ── 4. The next day ──────────────────────────────────────────────────────────
console.log('\n--- 4. The next day ---');
setNow(at(11, 0, 5));
queue = R('srsReviewQueue()');
eq(queue.answered, 0, "yesterday's reviews do not count against today");
eq(queue.left, CAP, 'the day starts with its whole allowance');
assert(backlog.slice(CAP).every((w) => queue.today.some((d) => d.word.ko === w.ko)),
  'and the 30 that waited are offered first thing');

// ── 5. Two devices, one day ──────────────────────────────────────────────────
console.log('\n--- 5. Two devices on one account ---');
{
  const t = at(11, 10);
  const log = (prefix, n) => Array.from({ length: n }, (_, i) => ({ ko: prefix + i, g: 2, m: 'type', at: t + i, ivl: 4, st: 'review', rv: 1 }));
  sb.__a = log('phone', 60);
  sb.__b = log('laptop', 60);
  setNow(at(11, 12));
  R('attemptLog = mergeAttemptLogs(__a, __b, ATTEMPT_LOG_MAX);');
  eq(R('reviewsAnsweredToday()'), 120, "the phone's 60 and the laptop's 60 add up once their logs merge");
  eq(R('srsReviewQueue().left'), 0, 'so the day is spent on both');
}

// ── 6. The forecast ──────────────────────────────────────────────────────────
console.log('\n--- 6. The forecast counts by day ---');
{
  setNow(at(12, 9));
  R('srsData = {}; attemptLog = [];');
  const put = (w, e) => { sb.__w = w; sb.__e = e; R('srsData[__w.ko] = { m: { type: __e } };'); };
  put(words[0], reviewEntry(at(5, 9), 3));    // due the 8th: overdue
  put(words[1], reviewEntry(at(9, 20), 3));   // due 20:00 on the 12th: today
  put(words[2], reviewEntry(at(10, 8), 3));   // due 08:00 on the 13th: tomorrow
  const fc = R('srsForecast(7)');
  eq(fc[0], 2, 'the overdue review and the one due tonight both land on today');
  eq(fc[1], 1, 'the one due at 08:00 tomorrow lands on tomorrow');

  // The limit shapes the chart the way it shapes the day.
  R('srsData = {};');
  backlog.forEach((w, i) => put(w, reviewEntry(at(1, 8) + i * 60000, 5)));
  let chart = R('srsForecast(7)');
  eq(chart.slice(0, 3).join(), '100,30,0', '130 overdue: today asks 100, tomorrow the 30 it held back');
  R('for (let i = 0; i < ' + CAP + '; i++) attemptLog.push({ ko: "z" + i, g: 2, m: "type", at: ' + at(12, 8) + ' + i, ivl: 3, st: "review", rv: 1 });');
  chart = R('srsForecast(7)');
  eq(chart.slice(0, 3).join(), '0,100,30', 'with today spent, the whole backlog moves on a day, 100 at a time');
}

// ── 7. The count survives a save ─────────────────────────────────────────────
console.log('\n--- 7. Saved with the rest ---');
{
  setNow(at(12, 10));
  R('attemptLog = [];');
  sb.__w = words[3];
  sb.__e = reviewEntry(at(9, 10), 3);
  R('srsData[__w.ko] = { m: { type: __e } };');
  R('gradeWord(__w.ko, GRADE.GOOD, "type")');
  const saved = R('JSON.parse(JSON.stringify(collectSave()))');
  eq((saved.attempts || []).filter((a) => a.rv).length, 1, 'the flag rides in the saved attempt log');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
