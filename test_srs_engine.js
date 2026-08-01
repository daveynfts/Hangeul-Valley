/**
 * test_srs_engine.js — exercises the SM-2 scheduler and the v4→v5 save migration.
 *
 * The scheduler is extracted from game.js and run in a bare vm context, so this tests the
 * shipped source rather than a copy. `now` is injected into every call, which is why the
 * scheduler takes it as a parameter: it lets a multi-month review history be simulated
 * without waiting or stubbing the clock.
 *
 * Run:  node test_srs_engine.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  [PASS] ${msg}`); passed++; }
  else { console.error(`  [FAIL] ${msg}`); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

// ── Extract the scheduler from game.js ──────────────────────────────────────
function extract(startMarker, endMarker, label) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error(`could not find ${label} start: ${startMarker}`);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error(`could not find ${label} end: ${endMarker}`);
  return src.slice(a, b);
}

const engine = extract('const SRS_CFG = {', '// Plot sState codes:', 'SRS engine');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(engine, ctx);
const R = (expr) => vm.runInContext(expr, ctx);

const CFG = R('SRS_CFG');
const G = R('GRADE');
const DAY = R('DAY_MS');
const sched      = R('srsSchedule');
const newEntry   = R('srsNewEntry');
const isMature   = R('srsIsMature');
const isGrad     = R('srsIsGraduated');
const isDue      = R('srsIsDue');
const isLearning = R('srsIsLearning');
const label      = R('srsIntervalLabel');

console.log('====================================================');
console.log('SRS ENGINE VERIFICATION');
console.log('====================================================\n');

const T0 = 1_700_000_000_000;   // fixed epoch; nothing here depends on the real clock

// ── 1. Config sanity ────────────────────────────────────────────────────────
console.log('--- 1. Configuration ---');
eq(CFG.LEARN_STEPS.length, 2, 'two learning steps, matching the plant/water/harvest loop');
eq(CFG.LEARN_STEPS[0], 30 * 1000, 'first learning step is the existing 30s seedling timer');
eq(CFG.LEARN_STEPS[1], 90 * 1000, 'second learning step is the existing 90s sprout timer');
eq(CFG.MATURE_IVL, 21, 'maturity threshold is 21 days');
assert(CFG.MIN_EASE < CFG.START_EASE && CFG.START_EASE < CFG.MAX_EASE, 'ease bounds bracket the start ease');

// ── 2. A fresh word ─────────────────────────────────────────────────────────
console.log('\n--- 2. New word ---');
const fresh = newEntry();
eq(fresh.st, 'new', 'starts in state new');
eq(fresh.ivl, 0, 'has no interval yet');
eq(fresh.ease, CFG.START_EASE, 'starts at the default ease');
assert(!isGrad(fresh), 'is not graduated');
assert(!isMature(fresh), 'is not mature');
eq(label(fresh), 'new', 'labelled "new"');

// ── 3. Learning steps ───────────────────────────────────────────────────────
console.log('\n--- 3. Learning steps (the three-touch loop) ---');
let e = sched(newEntry(), G.GOOD, T0);            // plant
eq(e.st, 'learn', 'planting moves the word into learning');
eq(e.step, 0, 'sits on the first step');
eq(e.due, T0 + CFG.LEARN_STEPS[0], 'due after the 30s step');
assert(!isDue(e, T0 + 1000), 'not due one second later');
assert(isDue(e, T0 + 31_000), 'due once the step elapses');

e = sched(e, G.GOOD, T0 + 31_000);                 // water
eq(e.st, 'learn', 'still learning after the second touch');
eq(e.step, 1, 'advanced to the second step');
eq(e.due, T0 + 31_000 + CFG.LEARN_STEPS[1], 'due after the 90s step');

e = sched(e, G.GOOD, T0 + 125_000);                // harvest
eq(e.st, 'review', 'harvesting graduates the word into review');
eq(e.ivl, CFG.GRADUATE_IVL, 'graduates with a 1-day interval');
eq(e.reps, 1, 'counts one successful review');
eq(e.due, T0 + 125_000 + DAY, 'next review is a day out — day scale, not seconds');
assert(isGrad(e), 'is now graduated');
assert(!isMature(e), 'one day is not yet mature');
eq(label(e), '1d', 'labelled 1d');

// ── 4. Failing inside learning restarts the steps ───────────────────────────
console.log('\n--- 4. Again during learning ---');
let l = sched(newEntry(), G.GOOD, T0);
l = sched(l, G.GOOD, T0 + 31_000);
eq(l.step, 1, 'reached step 1');
l = sched(l, G.AGAIN, T0 + 40_000);
eq(l.step, 0, 'Again sends it back to the first step');
eq(l.st, 'learn', 'stays in learning');
eq(l.due, T0 + 40_000 + CFG.LEARN_STEPS[0], 'requeued at the first step delay');
eq(l.lapses, 0, 'no lapse recorded — lapses only count after graduation');

console.log('\n--- 4b. Hard repeats the step without advancing ---');
let h = sched(newEntry(), G.GOOD, T0);
h = sched(h, G.HARD, T0 + 31_000);
eq(h.step, 0, 'Hard does not advance the step');
eq(h.st, 'learn', 'still learning');

console.log('\n--- 4c. Easy never skips learning steps ---');
const ez = sched(newEntry(), G.EASY, T0);
eq(ez.st, 'learn', 'Easy on first sight still enters learning, it cannot skip straight to review');
eq(ez.ivl, 0, 'and has no interval yet');
let ez2 = sched(ez, G.EASY, T0 + 31_000);
eq(ez2.st, 'learn', 'Easy on the second touch advances a step rather than graduating early');
eq(ez2.step, 1, 'lands on the final step');
ez2 = sched(ez2, G.EASY, T0 + 125_000);
eq(ez2.st, 'review', 'graduates only after every step is done');
eq(ez2.ivl, CFG.GRADUATE_IVL, `and always enters review at ${CFG.GRADUATE_IVL}d, with no Easy shortcut`);

// ── 5. Review interval growth ───────────────────────────────────────────────
console.log('\n--- 5. Review scheduling ---');
let r = { ...newEntry(), st: 'review', ivl: 10, ease: 2.5, reps: 3 };

const good = sched(r, G.GOOD, T0);
eq(good.ivl, 25, 'Good multiplies the interval by ease (10 × 2.5)');
eq(good.ease, 2.5, 'Good leaves ease unchanged');
eq(good.due, T0 + 25 * DAY, 'due 25 days out');

const hard = sched(r, G.HARD, T0);
eq(hard.ivl, 12, 'Hard grows the interval gently (10 × 1.2)');
assert(hard.ease < 2.5, `Hard lowers ease (${hard.ease})`);

const easy = sched(r, G.EASY, T0);
assert(easy.ease > 2.5, `Easy raises ease (${easy.ease})`);
assert(easy.ivl > good.ivl, `Easy grows faster than Good (${easy.ivl} > ${good.ivl})`);

console.log('\n--- 5b. Intervals always advance when reviewed on time ---');
const tiny = sched({ ...newEntry(), st: 'review', ivl: 1, ease: 1.3 }, G.HARD, T0);
assert(tiny.ivl >= 2, `a 1-day interval at minimum ease still grows (${tiny.ivl}d), never stalls`);

// ── 5c. Early reviews earn nothing — the anti-grinding guard ────────────────
console.log('\n--- 5c. Reviewing ahead of schedule does not grow the interval ---');
const scheduled = { ...newEntry(), st: 'review', ivl: 10, ease: 2.5, reps: 3, last: T0, due: T0 + 10 * DAY };
const early = sched(scheduled, G.GOOD, T0 + 1000);        // answered a second later
eq(early.ivl, 10, 'interval is unchanged when answered immediately after the last review');
eq(early.reps, 4, 'the rep is still credited');
assert(early.due > T0 + 1000, 'and it is rescheduled rather than left due');

const halfway = sched(scheduled, G.GOOD, T0 + 5 * DAY);   // half the interval elapsed
eq(halfway.ivl, 10, 'still unchanged at half the interval (below the 80% threshold)');

const onTime = sched(scheduled, G.GOOD, T0 + 10 * DAY);
eq(onTime.ivl, 25, 'grows normally once the interval has actually elapsed');

const late = sched(scheduled, G.GOOD, T0 + 40 * DAY);
eq(late.ivl, 25, 'answering late still grows normally');

console.log('\n--- 5d. Grinding a word in one session cannot reach maturity ---');
let grind = sched(newEntry(), G.EASY, T0);                 // plant
grind = sched(grind, G.EASY, T0 + 31_000);                 // water
grind = sched(grind, G.EASY, T0 + 125_000);                // harvest -> graduates
eq(grind.ivl, CFG.GRADUATE_IVL, `graduates at ${CFG.GRADUATE_IVL}d even with three Easy answers`);
for (let i = 0; i < 25; i++) grind = sched(grind, G.EASY, T0 + 130_000 + i * 1000);
eq(grind.ivl, CFG.GRADUATE_IVL, `25 more answers in the same minute leave the interval at ${CFG.GRADUATE_IVL}d`);
eq(grind.reps, 26, 'the reps are counted, so the player is not told their answers were ignored');
assert(!isMature(grind), 'but the word is still not mature — one sitting cannot fake retention');

// Failing early must still count, otherwise lapses could be dodged by reviewing early.
const earlyFail = sched(scheduled, G.AGAIN, T0 + 1000);
eq(earlyFail.lapses, 1, 'failing an early review still records a lapse');
eq(earlyFail.st, 'relearn', 'and still drops into relearning');

// ── 6. Lapses ───────────────────────────────────────────────────────────────
console.log('\n--- 6. Lapse on a mature word ---');
const mature = { ...newEntry(), st: 'review', ivl: 60, ease: 2.5, reps: 8 };
assert(isMature(mature), '60-day interval counts as mature');
const lapsed = sched(mature, G.AGAIN, T0);
eq(lapsed.st, 'relearn', 'a failed review enters relearning');
eq(lapsed.lapses, 1, 'records the lapse');
eq(lapsed.ivl, 30, 'keeps half its interval (60 → 30)');
assert(lapsed.ease < 2.5, `ease is penalised (${lapsed.ease})`);
eq(lapsed.due, T0 + CFG.RELEARN_STEPS[0], 'comes back within the relearn step, not in 30 days');
assert(!isMature(lapsed), 'no longer counted as mature while relearning');

const relearned = sched(lapsed, G.GOOD, T0 + 61_000);
eq(relearned.st, 'review', 'passing relearning returns it to review');
eq(relearned.ivl, 30, 'resumes on the interval it kept');
assert(isMature(relearned), 'and is mature again at 30 days');

// ── 7. Ease clamping ────────────────────────────────────────────────────────
console.log('\n--- 7. Ease clamping ---');
let low = { ...newEntry(), st: 'review', ivl: 5, ease: 1.4 };
for (let i = 0; i < 10; i++) low = sched({ ...low, st: 'review' }, G.HARD, T0 + i * DAY);
assert(low.ease >= CFG.MIN_EASE, `ease never falls below ${CFG.MIN_EASE} (got ${low.ease})`);
let high = { ...newEntry(), st: 'review', ivl: 5, ease: 2.9 };
for (let i = 0; i < 10; i++) high = sched(high, G.EASY, T0 + i * DAY);
assert(high.ease <= CFG.MAX_EASE, `ease never exceeds ${CFG.MAX_EASE} (got ${high.ease})`);
assert(high.ivl <= CFG.MAX_IVL, `interval is capped at ${CFG.MAX_IVL} days (got ${high.ivl})`);

// ── 8. Maturity takes real time ─────────────────────────────────────────────
console.log('\n--- 8. Time to maturity ---');
let w = sched(newEntry(), G.GOOD, T0);
w = sched(w, G.GOOD, T0 + 31_000);
w = sched(w, G.GOOD, T0 + 125_000);   // graduated at 1 day
let t = w.due, reviews = 0;
while (!isMature(w) && reviews < 50) { w = sched(w, G.GOOD, t); t = w.due; reviews++; }
assert(isMature(w), 'reaches maturity with consistent Good answers');
assert(reviews >= 3, `maturity needs several spaced reviews (took ${reviews})`);
const daysTaken = Math.round((t - T0) / DAY);
assert(daysTaken >= 21, `and at least 21 real days elapse (${daysTaken}d) — cannot be farmed in one session`);
console.log(`         → ${reviews} reviews over ${daysTaken} days to mature`);

// ── 9. Purity ───────────────────────────────────────────────────────────────
console.log('\n--- 9. Scheduler purity ---');
const original = { ...newEntry(), st: 'review', ivl: 10, ease: 2.5, reps: 2 };
const snapshot = JSON.stringify(original);
sched(original, G.GOOD, T0);
eq(JSON.stringify(original), snapshot, 'srsSchedule does not mutate its input');

// ── 10. Determinism ─────────────────────────────────────────────────────────
console.log('\n--- 10. Determinism ---');
const a1 = sched({ ...newEntry(), st: 'review', ivl: 7, ease: 2.3 }, G.GOOD, T0);
const a2 = sched({ ...newEntry(), st: 'review', ivl: 7, ease: 2.3 }, G.GOOD, T0);
eq(JSON.stringify(a1), JSON.stringify(a2), 'same input yields the same schedule (no fuzz)');

// ── 11. Grade clamping ──────────────────────────────────────────────────────
console.log('\n--- 11. Out-of-range grades ---');
const clampLow = sched({ ...newEntry(), st: 'review', ivl: 10 }, -5, T0);
eq(clampLow.st, 'relearn', 'a negative grade clamps to Again');
const clampHigh = sched({ ...newEntry(), st: 'review', ivl: 10 }, 99, T0);
eq(clampHigh.st, 'review', 'an oversized grade clamps to Easy and stays in review');

// ── 12. Migration v4 → v5 ───────────────────────────────────────────────────
console.log('\n--- 12. Save migration (v4 harvest counts → SM-2 entries) ---');
const migSrc = extract('function migrateSaveData(d) {', '\nfunction collectSave', 'migrateSaveData');
const migCtx = {
  console,
  srsNewEntry: R('srsNewEntry'), SRS_CFG: CFG, DAY_MS: DAY, _clamp: R('_clamp'),
  Date, JSON, Object, Array, Math, Set, Number, String
};
vm.createContext(migCtx);
vm.runInContext(engine + '\n' + migSrc, migCtx);
const migrate = vm.runInContext('migrateSaveData', migCtx);

const legacy = {
  v: 4,
  gold: 500,
  harvests: { '아버지': 7, '어머니': 3, '학교': 1, '사과': 0 },
  srs: { '아버지': { p2At: null, p3At: null, harvests: 7 }, '바다': { p2At: T0, p3At: null } }
};
const out = migrate(legacy);
eq(out.v, 5, 'save is bumped to v5');

const father = out.srs['아버지'];
eq(father.st, 'review', '7 harvests migrates to a graduated review card');
eq(father.reps, 7, 'harvest count carries over as reps');
assert(father.ivl >= 1, `receives a real interval (${father.ivl}d)`);
assert(father.ivl < CFG.MATURE_IVL, `but stays below maturity (${father.ivl}d < ${CFG.MATURE_IVL}d) — maturity must be earned`);
assert(!isMature(father), 'so it is not silently granted mature status');

const mother = out.srs['어머니'];
eq(mother.st, 'review', '3 harvests also graduates');
assert(mother.ivl <= father.ivl, `fewer harvests means a shorter interval (${mother.ivl}d <= ${father.ivl}d)`);

const school = out.srs['학교'];
eq(school.st, 'review', '1 harvest still counts as learned');

const apple = out.srs['사과'];
eq(apple.st, 'new', '0 harvests stays new');

const sea = out.srs['바다'];
eq(sea.st, 'learn', 'a word caught mid-learning stays in learning');

const dues = Object.values(out.srs).filter(x => x.st === 'review').map(x => x.due);
assert(new Set(dues).size > 1, 'migrated reviews are staggered, not all dumped on the same day');

console.log('\n--- 12b. Migration is idempotent ---');
const twice = migrate(out);
eq(JSON.stringify(twice.srs), JSON.stringify(out.srs), 'migrating an already-v5 save changes nothing');

const alreadyNew = migrate({ v: 5, srs: { '테스트': { st: 'review', ivl: 99, ease: 2.5, reps: 4, lapses: 0, due: T0, last: T0, step: 0 } } });
eq(alreadyNew.srs['테스트'].ivl, 99, 'existing v5 entries are left untouched');

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');
process.exit(failed === 0 ? 0 : 1);
