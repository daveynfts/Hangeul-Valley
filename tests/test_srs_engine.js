/**
 * test_srs_engine.js — exercises the SM-2 scheduler, per-modality records, and the
 * v4 → v5 → v6 → v7 → v8 save migration chain.
 *
 * The scheduler is extracted from the shipped js/* sources and run in a bare vm context, so this tests the
 * shipped source rather than a copy. `now` is injected into every call, which is why the
 * scheduler takes it as a parameter: it lets a multi-month review history be simulated
 * without waiting or stubbing the clock.
 *
 * Run:  node tests/test_srs_engine.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { readGameSource } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');
const src = readGameSource();

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  [PASS] ${msg}`); passed++; }
  else { console.error(`  [FAIL] ${msg}`); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

// ── Extract the scheduler from shipped source ──────────────────────────────────
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
// Starts at the respelling table rather than at the function: the v6 -> v7 step reads
// KO_V7_RENAMES, which is built at module level just above migrateSaveData.
const migSrc = extract('const KO_V7_RESPELLINGS = [', '\nfunction collectSave', 'migrateSaveData');
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
eq(out.v, 9, 'save is bumped to v9');
eq(out.equippedSkinId, 'farmer', 'v9 fills equippedSkinId');
assert(Array.isArray(out.ownedSkinIds) && out.ownedSkinIds[0] === 'farmer', 'v9 owns farmer');

// v6 nests each schedule under its modality. The production track is where a v4/v5 entry
// lands, since the three-touch cycle it was earned through ends on typing.
const PRIMARY = R('PRIMARY_MODALITY');
const mod = (ko, m = PRIMARY) => (out.srs[ko] && out.srs[ko].m) ? out.srs[ko].m[m] : undefined;

const father = mod('아버지');
assert(!!father, '7 harvests produces a production record');
eq(father.st, 'review', 'and it is graduated');
eq(father.reps, 7, 'harvest count carries over as reps');
assert(father.ivl >= 1, `receives a real interval (${father.ivl}d)`);
assert(father.ivl < CFG.MATURE_IVL, `but stays below maturity (${father.ivl}d < ${CFG.MATURE_IVL}d) — maturity must be earned`);
assert(!isMature(father), 'so it is not silently granted mature status');

eq(mod('아버지', 'recognise'), undefined, 'recognition is NOT seeded — that skill was never tested');
eq(mod('아버지', 'listen'), undefined, 'nor is listening');

const mother = mod('어머니');
eq(mother.st, 'review', '3 harvests also graduates');
assert(mother.ivl <= father.ivl, `fewer harvests means a shorter interval (${mother.ivl}d <= ${father.ivl}d)`);

eq(mod('학교').st, 'review', '1 harvest still counts as learned');
eq(mod('사과').st, 'new', '0 harvests stays new');
eq(mod('바다').st, 'learn', 'a word caught mid-learning stays in learning');

const dues = Object.keys(out.srs).map(k => mod(k)).filter(e => e && e.st === 'review').map(e => e.due);
assert(new Set(dues).size > 1, 'migrated reviews are staggered, not all dumped on the same day');

console.log('\n--- 12b. Migration is idempotent ---');
const twice = migrate(out);
eq(JSON.stringify(twice.srs), JSON.stringify(out.srs), 'migrating an already-v9 save changes nothing');

const alreadyV6 = migrate({
  v: 6,
  srs: { '테스트': { m: { type: { st: 'review', ivl: 99, ease: 2.5, reps: 4, lapses: 0, due: T0, last: T0, step: 0 } } } }
});
eq(alreadyV6.srs['테스트'].m.type.ivl, 99, 'existing v6 entries are left untouched');

// A v5 save skipping straight past v5 into v6 must still land on the production track.
const fromV5 = migrate({ v: 5, srs: { '바나나': { st: 'review', ivl: 12, ease: 2.4, reps: 3, lapses: 1, due: T0, last: T0, step: 0 } } });
eq(fromV5.v, 9, 'a v5 save migrates all the way to v9');
eq(fromV5.srs['바나나'].m.type.ivl, 12, 'and its schedule moves under the production modality intact');
eq(fromV5.srs['바나나'].m.type.lapses, 1, 'keeping its lapse count');

const alreadyV9 = migrate({
  v: 9,
  equippedSkinId: 'chef',
  ownedSkinIds: ['farmer', 'chef'],
  srs: {}
});
eq(alreadyV9.equippedSkinId, 'chef', 'existing v9 skin fields are left untouched');
eq(alreadyV9.ownedSkinIds.join(','), 'farmer,chef', 'ownedSkinIds are not rewritten on a v9 blob');

// ── 12c. Migration v6 → v7: headwords respelled with word-spaces ────────────
//
// 64 headwords gained the spaces standard Korean requires (어깨가무겁다 -> 어깨가 무겁다).
// srsData, harvests, plots and attemptLog all key on `ko`, so a save written before the
// respelling must be carried across or every one of those words reads as brand new.
console.log('\n--- 12c. Save migration (headword respelling) ---');
const RENAMES = vm.runInContext('KO_V7_RENAMES', migCtx);
const RESPELLINGS = vm.runInContext('KO_V7_RESPELLINGS', migCtx);

eq(Object.keys(RENAMES).length, RESPELLINGS.length, 'every respelling yields a rename pair');
assert(RESPELLINGS.every(s => s.includes(' ')), 'every respelling actually contains a space');
assert(Object.entries(RENAMES).every(([packed, spaced]) => spaced.replace(/\s+/g, '') === packed),
  'each old key is exactly its new spelling with the spaces removed');
assert(!!RENAMES['어깨가무겁다'], 'the idiom that motivated the pass is in the table');
eq(RENAMES['어깨가무겁다'], '어깨가 무겁다', 'and maps to the spaced form');

const preRespell = {
  v: 6,
  srs: {
    '어깨가무겁다': { m: { type: { st: 'review', ivl: 34, ease: 2.6, reps: 8, lapses: 1, due: T0, last: T0, step: 0 } } },
    '아버지':       { m: { type: { st: 'review', ivl: 5,  ease: 2.5, reps: 2, lapses: 0, due: T0, last: T0, step: 0 } } }
  },
  harvests: { '어깨가무겁다': 8, '아버지': 2 },
  plots:    [{ i: 0, ko: '어깨가무겁다', sState: 2, plantedAt: T0 }],
  attempts: [{ ko: '어깨가무겁다', g: 2, m: 'type', at: T0, ivl: 34, st: 'review' }]
};
const resp = migrate(preRespell);
eq(resp.v, 9, 'save is bumped to v9');
eq(resp.srs['어깨가무겁다'], undefined, 'the unspaced key is gone');
assert(!!resp.srs['어깨가 무겁다'], 'and the record now lives under the spaced spelling');
eq(resp.srs['어깨가 무겁다'].m.type.ivl, 34, 'carrying its interval — 8 reps of history are not thrown away');
eq(resp.srs['어깨가 무겁다'].m.type.reps, 8, 'and its rep count');
eq(resp.srs['아버지'].m.type.ivl, 5, 'words that were not respelled are untouched');
eq(resp.harvests['어깨가 무겁다'], 8, 'harvest counts move too');
eq(resp.harvests['어깨가무겁다'], undefined, 'leaving nothing behind');
eq(resp.plots[0].ko, '어깨가 무겁다', 'a crop growing mid-cycle is renamed in place, not orphaned');
eq(resp.attempts[0].ko, '어깨가 무겁다', 'and the review log keeps pointing at the same word');

const respTwice = migrate(resp);
eq(JSON.stringify(respTwice.srs), JSON.stringify(resp.srs), 'running the respelling again is a no-op');

// Both spellings present at once: the new one is the later write and wins, but a harvest
// tally is a count and takes the larger rather than discarding one side.
const collide = migrate({
  v: 6,
  srs: {
    '어깨가무겁다':  { m: { type: { st: 'review', ivl: 3,  ease: 2.5, reps: 1, lapses: 0, due: T0, last: T0, step: 0 } } },
    '어깨가 무겁다': { m: { type: { st: 'review', ivl: 40, ease: 2.5, reps: 9, lapses: 0, due: T0, last: T0, step: 0 } } }
  },
  harvests: { '어깨가무겁다': 8, '어깨가 무겁다': 2 }
});
eq(collide.srs['어깨가 무겁다'].m.type.ivl, 40, 'where both spellings exist the new one is kept');
eq(collide.srs['어깨가무겁다'], undefined, 'and the old one is dropped');
eq(collide.harvests['어깨가 무겁다'], 8, 'harvest counts take the larger of the two');

// ── 12d. Migration v7 → v8: headwords corrected to the right word ───────────
//
// Three entries were the wrong word rather than the wrong spacing, so unlike v7 these cannot
// be derived by stripping spaces — which is the whole reason they are a separate step. The
// case that proves it: a pre-v7 save holds 발을벗고나서다, and stripping the spaces from the
// final 발 벗고 나서다 gives 발벗고나서다, which would never have matched.
console.log('\n--- 12d. Save migration (headword corrections) ---');
const V8 = vm.runInContext('KO_V8_RENAMES', migCtx);
const V7 = vm.runInContext('KO_V7_RENAMES', migCtx);

eq(Object.keys(V8).length, 3, 'three corrections');
eq(V8['허리띠를 둘러매다'], '허리띠를 졸라매다', '둘러매다 (to sling over a shoulder) becomes 졸라매다');
eq(V8['발을 벗고 나서다'], '발 벗고 나서다', 'the idiom loses the 을 it never took');
eq(V8['어플리케이션'], '애플리케이션', 'application follows 외래어 표기법');

// The v8 keys are post-v7 spellings, which only works because v7 runs first.
Object.keys(V8).forEach((k) => {
  const reachable = !k.includes(' ') || Object.values(V7).includes(k);
  assert(reachable, `v8 key ${k} is reachable — either untouched by v7 or produced by it`);
});
// applyKoRenames walks Object.entries, so a table where one entry's target is another's key
// would rename twice in one pass and the result would depend on declaration order.
assert(!Object.values(V8).some((target) => target in V8),
  'no v8 target is also a v8 key, so a single pass cannot chain renames');
assert(!Object.values(V8).some((target) => Object.values(V7).includes(target)),
  'no v8 target collides with a v7 target, so the two passes cannot merge unrelated words');

// Full chain from a pre-v7 save: the spacing step and the correction step must compose.
const chain = migrate({
  v: 6,
  srs: {
    '발을벗고나서다': { m: { type: { st: 'review', ivl: 19, ease: 2.5, reps: 6, lapses: 0, due: T0, last: T0, step: 0 } } },
    '어플리케이션':   { m: { type: { st: 'review', ivl: 7,  ease: 2.4, reps: 3, lapses: 1, due: T0, last: T0, step: 0 } } }
  },
  harvests: { '발을벗고나서다': 6 },
  plots:    [{ i: 1, ko: '발을벗고나서다', sState: 1, plantedAt: T0 }],
  attempts: [{ ko: '어플리케이션', g: 1, m: 'type', at: T0, ivl: 7, st: 'review' }]
});
eq(chain.v, 9, 'a v6 save lands on v9');
eq(chain.srs['발을벗고나서다'], undefined, 'the pre-v7 spelling is gone');
eq(chain.srs['발을 벗고 나서다'], undefined, 'and so is the v7 intermediate');
assert(!!chain.srs['발 벗고 나서다'], 'the record ends up under the corrected idiom');
eq(chain.srs['발 벗고 나서다'].m.type.ivl, 19, 'across two renames in one run, with its interval intact');
eq(chain.srs['발 벗고 나서다'].m.type.reps, 6, 'and its rep count');
eq(chain.harvests['발 벗고 나서다'], 6, 'harvests follow the whole chain');
eq(chain.plots[0].ko, '발 벗고 나서다', 'so does a crop growing mid-cycle');
assert(!!chain.srs['애플리케이션'], 'a word v7 did not touch is still corrected by v8');
eq(chain.srs['애플리케이션'].m.type.lapses, 1, 'keeping its lapse count');
eq(chain.attempts[0].ko, '애플리케이션', 'and the review log follows it');

const chainTwice = migrate(chain);
eq(JSON.stringify(chainTwice.srs), JSON.stringify(chain.srs), 'the whole chain is idempotent');

// ── 13. Modalities schedule independently ───────────────────────────────────
console.log('\n--- 13. Per-modality independence ---');
const MODS = R('MODALITIES');
eq(MODS.length, 3, 'three modalities are tracked');
assert(MODS.includes('type') && MODS.includes('recognise') && MODS.includes('listen'),
  'production, recognition and listening');
eq(PRIMARY, 'type', 'production is primary — the hardest skill sets the bar');

// The point of the change: answering recognition must not move production.
let rec = sched(newEntry(), G.GOOD, T0);
rec = sched(rec, G.GOOD, T0 + 31_000);
rec = sched(rec, G.GOOD, T0 + 125_000);   // recognition graduated
const prod = newEntry();                   // production untouched
eq(rec.st, 'review', 'recognition can graduate on its own');
eq(prod.st, 'new', 'while production stays new');
assert(!isMature(prod), 'so the word is not counted mature off the back of recognition alone');

// And the two can sit at very different intervals without interfering.
let a = { ...newEntry(), st: 'review', ivl: 30, ease: 2.5, reps: 6, last: T0, due: T0 + 30 * DAY };
let b = { ...newEntry(), st: 'review', ivl: 2, ease: 2.0, reps: 2, last: T0, due: T0 + 2 * DAY };
const aAfter = sched(a, G.GOOD, T0 + 30 * DAY);
eq(b.ivl, 2, 'scheduling one modality leaves the other untouched');
assert(aAfter.ivl > 30, `and the one answered grows normally (${aAfter.ivl}d)`);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');
process.exit(failed === 0 ? 0 : 1);
