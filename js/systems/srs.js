// ═══════════════ GAME CONSTANTS ═══════════════════════════════════════════════
const TILE=48, PLAYER_SPD=210, PLOT_SIZE=48, PLOT_COLS=3, PLOT_GAP=18;
const CROP_ICONS=['🌸','🥬','🍓','🌽','🌻'];

// Gold reward: smooth diminishing returns (see advancePlot harvest logic)
// Curve: 10 → 8 → 7 → 6 → 5 → 4 → 4 → 3 → 3 → 3... (min 3)
const LEVEL_COST = (idx) => idx === 0 ? 0 : Math.floor(50 * Math.pow(1.8, idx - 1));
// Level 2: 50, Level 3: 90, Level 4: 162, Level 5: 292, Level 6: 525

// ═══════════════ SPACED REPETITION SCHEDULER (SM-2) ═════════════════════════
//
// Previously `SR1`/`SR2` were the whole of "SRS": two fixed timers, 30 and 90 seconds,
// with no interval, ease factor or due date stored anywhere. That is crop-growth
// pacing, not spaced repetition — a player could reach "100% mastery" on 1500 words in
// one sitting and remember none of it the next day.
//
// The fix keeps the game feel intact by recognising that the existing three-touch loop
// (plant → 30s → water → 90s → harvest) is exactly Anki's *learning steps*. So those
// timers stay, and a day-scale review layer sits on top:
//
//   new ──plant──> learn ──steps──> review ──due in N days──> review ...
//                    ↑                  │
//                    └──── relearn <────┘  (failed a mature word)
//
// A word graduates when it is harvested, entering review with a 1-day interval. From
// then on it resurfaces when due, as a single recall rather than the full three-touch
// cycle. Scheduling is deliberately un-fuzzed so behaviour is reproducible and testable.
const SRS_CFG = {
  LEARN_STEPS:   [30 * 1000, 90 * 1000],  // matches the seedling → wilt → ripe pacing
  RELEARN_STEPS: [60 * 1000],
  GRADUATE_IVL: 1,     // days — every word enters review here, no shortcuts
  MATURE_IVL:   21,    // days — Anki's mature-card threshold, used for the Mastery stat
  START_EASE:   2.5,
  MIN_EASE:     1.3,
  MAX_EASE:     3.0,
  MAX_IVL:      730,   // 2 years
  LAPSE_IVL_MULT: 0.5, // a lapsed word keeps half its interval when it returns
  // Fraction of the scheduled interval that must actually elapse before a correct answer
  // is allowed to grow it. Reviewing early is not punished, it just earns nothing.
  EARLY_REVIEW_RATIO: 0.8,
};

const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;

const _clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function srsNewEntry() {
  return { st: 'new', step: 0, ivl: 0, ease: SRS_CFG.START_EASE, reps: 0, lapses: 0, due: 0, last: 0 };
}

// Pure: returns a fresh entry, never mutates its argument. `now` is injected so the
// scheduler can be tested across simulated days.
function srsSchedule(entry, grade, now) {
  const e = { ...srsNewEntry(), ...(entry || {}) };
  const g = _clamp(grade | 0, 0, 3);
  // Captured before e.last is overwritten — the review branch needs to know how long the
  // player actually waited, and reading e.last after the assignment always yields zero.
  const prevLast = e.last;
  e.last = now;

  const enterLearning = (steps, stateName) => {
    e.st = stateName;
    e.step = 0;
    e.due = now + steps[0];
  };

  const graduate = (ivlDays) => {
    e.st = 'review';
    e.step = 0;
    e.ivl = _clamp(Math.round(ivlDays), 1, SRS_CFG.MAX_IVL);
    e.due = now + e.ivl * DAY_MS;
    e.reps++;
  };

  if (e.st === 'new') {
    // First exposure always enters the learning steps, whatever the grade. Anki lets Easy
    // graduate a card immediately, but there Easy is a deliberate "I already knew this"
    // self-report; here the grade is inferred from answer speed, and a fast click on a
    // four-option question is not evidence of knowing anything.
    enterLearning(SRS_CFG.LEARN_STEPS, 'learn');
    return e;
  }

  if (e.st === 'learn' || e.st === 'relearn') {
    const steps = e.st === 'learn' ? SRS_CFG.LEARN_STEPS : SRS_CFG.RELEARN_STEPS;
    if (g === GRADE.AGAIN) {
      e.step = 0;
      e.due = now + steps[0];
      return e;
    }
    if (g === GRADE.HARD) {
      // Repeat the current step rather than advancing.
      e.due = now + steps[Math.min(e.step, steps.length - 1)];
      return e;
    }
    // GOOD and EASY both advance exactly one step, graduating off the end.
    //
    // Anki lets Easy skip the rest of the learning steps, but its Easy is the player saying
    // "I already knew this". Here it is inferred from answering inside six seconds, which a
    // learner shown the word thirty seconds ago will manage from short-term memory — that is
    // not evidence the word will survive a week. Requiring every step also keeps the
    // scheduler in step with the crop visuals: seedling, sprout, ripe, harvested.
    e.step++;
    if (e.step >= steps.length) {
      // A relearning word returns on the interval it kept when it lapsed.
      graduate(e.st === 'relearn' ? Math.max(SRS_CFG.GRADUATE_IVL, e.ivl) : SRS_CFG.GRADUATE_IVL);
    } else {
      e.due = now + steps[e.step];
    }
    return e;
  }

  // st === 'review'
  // Failing is always a lapse, whether or not the review was due.
  if (g === GRADE.AGAIN) {
    e.lapses++;
    e.ease = _clamp(e.ease - 0.20, SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
    e.ivl = _clamp(Math.round(e.ivl * SRS_CFG.LAPSE_IVL_MULT), 1, SRS_CFG.MAX_IVL);
    enterLearning(SRS_CFG.RELEARN_STEPS, 'relearn');
    return e;
  }

  // An interval is a claim about how long the word survives in memory, so it can only be
  // earned by actually waiting. Reviewing ahead of schedule proves nothing new: the answer
  // still counts as a rep and the card is rescheduled, but the interval does not grow.
  //
  // Without this a player could answer the same word three times in one minute and compound
  // 1d → 4d → 10d → 25d straight past the 21-day maturity line, which is precisely the
  // "100% mastery in one sitting" problem this scheduler exists to fix.
  const waitedMs = prevLast ? (now - prevLast) : e.ivl * DAY_MS;
  const onSchedule = waitedMs >= e.ivl * DAY_MS * SRS_CFG.EARLY_REVIEW_RATIO;
  if (!onSchedule) {
    graduate(e.ivl);   // same interval, new due date, rep still credited
    return e;
  }

  // Each branch advances by at least a day so an interval can never stall.
  if (g === GRADE.HARD) {
    e.ease = _clamp(e.ease - 0.15, SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
    graduate(Math.max(e.ivl + 1, e.ivl * 1.2));
  } else if (g === GRADE.GOOD) {
    graduate(Math.max(e.ivl + 1, e.ivl * e.ease));
  } else {
    e.ease = _clamp(e.ease + 0.15, SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
    graduate(Math.max(e.ivl + 1, e.ivl * e.ease * 1.3));
  }
  return e;
}

// ── Predicates ───────────────────────────────────────────────────────────────
// "graduated" gates content: reachable inside one session, so the minigames and quests
// do not sit locked for weeks. "mature" is the long-haul Mastery stat.
function srsIsGraduated(e) { return !!e && (e.st === 'review' || e.st === 'relearn'); }
function srsIsMature(e)    { return !!e && e.st === 'review' && e.ivl >= SRS_CFG.MATURE_IVL; }
function srsIsDue(e, now)  { return !!e && e.st !== 'new' && e.due > 0 && now >= e.due; }
function srsIsLearning(e)  { return !!e && (e.st === 'learn' || e.st === 'relearn'); }

// Human-readable interval, for the vocab book and dashboard.
function srsIntervalLabel(e) {
  if (!e || e.st === 'new') return 'new';
  if (srsIsLearning(e)) return 'learning';
  if (e.ivl >= 365) return (e.ivl / 365).toFixed(1) + 'y';
  if (e.ivl >= 30) return Math.round(e.ivl / 30) + 'mo';
  return e.ivl + 'd';
}

// ── Per-modality records ─────────────────────────────────────────────────────
// Knowing 아버지 on sight is not the same skill as typing it from memory, so each modality
// carries its own interval, ease and due date. A single shared schedule meant answering a
// four-option recognition question advanced the same interval as producing the word cold —
// which overstates what the learner can actually do.
//
// The idea is from the parallel codex/korean-learning-upgrade branch, which modelled this
// correctly while this tree had one track per word.
//
//   srsData[ko] = { m: { type: entry, recognise: entry, listen: entry } }
//
// Production ('type') is the primary modality: it is the hardest, it is what the three-touch
// learning cycle ends on, and it is therefore what "graduated" and "mature" are measured
// against. Recognition and listening schedule independently alongside it.
const MODALITIES = ['type', 'recognise', 'listen'];
const PRIMARY_MODALITY = 'type';

// Plot sState codes: ''=empty '1'=seedling '2'=wilting '3'=sprout '4'=ripe
let srsData  = {}; // { ko: { m: { <modality>: srsNewEntry() } } }
let plotSave = []; // [{ i, ko, sState, plantedAt }]
let droppedItemsSave = []; // [{ itemId, nameKo, x, y }] persisted ground drops buffer
var PLOT_UNLOCK_COSTS = [100, 200, 350, 500, 750, 1000];
var BASE_PLOT_COUNT = 9;              // plots 0-8 are free from the start
var unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
var unlockedPlotCount = 9;

// Membership is decided by `unlockedPlots` alone. The old version also accepted
// `i < unlockedPlotCount`, which handed out a free plot: buying, say, plot 11 pushed
// unlockedPlots.length to 10, so unlockedPlotCount became 10 and plot index 9 —
// never paid for — passed the count check.
function isPlotUnlocked(i) {
  if (i < BASE_PLOT_COUNT) return true;
  if (Array.isArray(unlockedPlots) && unlockedPlots.includes(i)) return true;
  // Legacy saves (v3 and earlier) stored only a count, with plots unlocked in order.
  if (!Array.isArray(unlockedPlots) && typeof unlockedPlotCount === 'number') {
    return i < unlockedPlotCount;
  }
  return false;
}

