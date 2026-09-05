'use strict';
/**
 * tests/test_quiz_reveal.js — a phase-3 lapse shows the word it lapsed on.
 *
 * The typing quiz at phase 3 used to answer a wrong attempt with "Wrong! Plant regressed to
 * Phase 2!", clear the box, and close itself 1.8 seconds later. The word was never shown. The
 * multiple-choice path had always done the opposite — it lights the correct button on a miss,
 * because "a wrong guess is the moment the word is learned" — so the two halves of the same
 * quiz disagreed about what a miss is for.
 *
 * These tests drive the shipped showQuizReveal against a stub DOM rather than reading the
 * source for the right words, and they check the two things that make it a study panel rather
 * than a nicer error: the answer is on screen, and nothing closes it on a timer.
 *
 * Run: node tests/test_quiz_reveal.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// ── The stub DOM ─────────────────────────────────────────────────────────────
// Only what the two panels touch. classList is a real set so "did it add quiz-lapsed and
// not quiz-success" is answerable rather than inferred from a string.
function makeEl(id) {
  const cls = new Set();
  return {
    id,
    textContent: '',
    innerHTML: '',
    onclick: null,
    focused: 0,
    focus() { this.focused++; },
    classList: {
      add: (c) => cls.add(c),
      remove: (c) => cls.delete(c),
      contains: (c) => cls.has(c),
      toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); }
    },
    _classes: cls
  };
}

const PANEL_IDS = ['quiz-result', 'quiz-result-art', 'quiz-result-msg', 'quiz-result-ko',
  'quiz-result-en', 'quiz-result-typed', 'quiz-result-note', 'quiz-result-continue', 'quiz-ui'];

// The shipped English table, loaded into the shipped hvT. js/locales/en.js is a browser
// script; its payload is plain JSON between markers, which is what admin/lib/i18n.js reads.
let englishHvTCached = null;
function englishHvT() {
  if (!englishHvTCached) {
    const i18n = require('../js/i18n.js');
    i18n.hvRegisterLocale('en', require('../admin/lib/i18n.js').readChromeTable(ROOT, 'en'));
    englishHvTCached = i18n.hvT;
  }
  return englishHvTCached;
}

function harness() {
  const els = {};
  PANEL_IDS.forEach((id) => { els[id] = makeEl(id); });
  const spoke = [];
  const quests = [];
  const timers = [];
  const closed = [];
  const ctx = {
    console,
    // The real hvT over the real js/locales/en.js, not a stub: the panel's wording now comes
    // from the catalogue, and a stub that echoed its key would let a missing English string
    // pass this test — hvT falls back to printing the key, which drops the interpolated
    // values with it, so "You wrote: 저축량" would come out as "ui.quiz.youWrote".
    hvT: englishHvT(),
    $: (id) => els[id] || null,
    speakKorean: (ko) => { spoke.push(ko); return true; },
    checkQuestProgress: (kind) => quests.push(kind),
    vocabIconHtml: (ko) => '<i>' + ko + '</i>',
    closeQuiz: () => {
      closed.push(true);
      const run = ctx.pendingQuizAdvance;
      ctx.pendingQuizAdvance = null;
      if (typeof run === 'function') run();
    },
    currentPhase: 3,
    currentQuizMode: 'type',
    pendingQuizAdvance: null,
    quizFinishTimer: null,
    // Timers are recorded rather than run, so "did anything arm a close" is a question with
    // an answer. A real setTimeout would make the absence of one indistinguishable from a
    // test that simply did not wait.
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {}
  };
  vm.createContext(ctx);
  const from = ui.indexOf('function clearQuizFinishTimer');
  const to = ui.indexOf('// ── Answer matching');
  if (from < 0 || to < from) throw new Error('quiz panel helpers not found in js/ui.js');
  vm.runInContext(ui.slice(from, to), ctx);
  return { ctx, els, spoke, quests, timers, closed };
}

const WORD = { ko: '저축률', en: 'the savings rate' };

// ── 1. The markup the function reaches for ───────────────────────────────────
console.log('\n--- 1. The panel has somewhere to put it ---');
assert(html.indexOf('id="quiz-result-typed"') >= 0, 'index.html has the typed row');
assert(html.indexOf('id="quiz-result-note"') >= 0, 'index.html has the note row');

// ── 2. A lapse shows the answer ──────────────────────────────────────────────
console.log('\n--- 2. A lapse shows the answer ---');
const h = harness();
let advanced = 0;
h.ctx.showQuizReveal({
  message: 'Lapsed',
  ko: WORD.ko,
  en: WORD.en,
  typed: '저축량',
  note: 'Back to Phase 2 · next review in 10m after relearning.',
  continueLabel: 'Got it',
  onDone: () => { advanced++; }
});

assert(h.els['quiz-result-ko'].textContent === WORD.ko,
  'the Korean the learner missed is on screen (' + h.els['quiz-result-ko'].textContent + ')');
assert(h.els['quiz-result-en'].textContent === WORD.en, 'and what it means');
assert(h.els['quiz-result-typed'].textContent.indexOf('저축량') >= 0,
  'beside what was actually typed, so the near-miss is visible');
assert(!h.els['quiz-result-typed'].classList.contains('hidden'), 'and that row is shown');
assert(h.els['quiz-result-note'].textContent.indexOf('Phase 2') >= 0,
  'the note says what it cost');
assert(!h.els['quiz-result'].classList.contains('hidden'), 'the panel itself is visible');
assert(h.spoke.indexOf(WORD.ko) < 0, 'nothing is spoken synchronously');
h.timers.forEach((t) => t.fn());
assert(h.spoke.indexOf(WORD.ko) >= 0, 'the word is said aloud once the panel is up');

// ── 3. It waits to be dismissed ──────────────────────────────────────────────
console.log('\n--- 3. It waits, because reading is the point ---');
assert(h.ctx.pendingQuizAdvance !== null || advanced === 1,
  'the follow-up work is held, not dropped');
assert(advanced === 0, 'nothing has advanced on its own — no timer closed the panel');
assert(h.closed.length === 0, 'and nothing closed the quiz');
assert(typeof h.els['quiz-result-continue'].onclick === 'function', 'the button is armed');
h.els['quiz-result-continue'].onclick();
assert(advanced === 1, 'dismissing it runs the follow-up exactly once');

// ── 4. It is dressed as a loss, not a win ────────────────────────────────────
console.log('\n--- 4. Dressed as a loss ---');
const h2 = harness();
h2.ctx.showQuizReveal({ message: 'Lapsed', ko: WORD.ko, en: WORD.en, onDone: () => {} });
assert(h2.els['quiz-ui'].classList.contains('quiz-done'), 'the quiz reads as answered');
assert(h2.els['quiz-ui'].classList.contains('quiz-lapsed'), 'and as a lapse');
assert(!h2.els['quiz-ui'].classList.contains('quiz-success'),
  'never as a success — that is the green panel');
assert(h2.quests.length === 0,
  'a miss earns no quest credit (' + h2.quests.join(',') + ')');
assert(h2.els['quiz-result-typed'].classList.contains('hidden'),
  'a blank submission shows no struck-through row rather than an empty one');

// ── 5. The success panel still works, and still looks like a win ─────────────
console.log('\n--- 5. The win is untouched ---');
const h3 = harness();
let won = 0;
h3.ctx.showQuizSuccess({
  message: 'Harvested!', ko: WORD.ko, en: WORD.en,
  continueLabel: 'Collect harvest', delay: 0, onDone: () => { won++; }
});
assert(h3.els['quiz-ui'].classList.contains('quiz-success'), 'a win is still a win');
assert(h3.els['quiz-ui'].classList.contains('quiz-done'),
  'and it hides the question through the same shared class');
assert(!h3.els['quiz-ui'].classList.contains('quiz-lapsed'), 'and is not marked a lapse');
assert(h3.quests.indexOf('quiz') >= 0, 'a win still counts for the questgiver');

// ── 6. The stale-row bug the second panel would otherwise cause ──────────────
console.log('\n--- 6. A lapse then a win leaves nothing behind ---');
const h4 = harness();
h4.ctx.showQuizReveal({ message: 'Lapsed', ko: WORD.ko, en: WORD.en, typed: '틀린답',
  note: 'Back to Phase 2', onDone: () => {} });
assert(h4.els['quiz-result-typed'].textContent.length > 0, 'the typed row was filled');
const close = ui.indexOf('function closeQuiz');
assert(close >= 0, 'closeQuiz is in js/ui.js');
const closeBody = ui.slice(close, close + 2200);
assert(closeBody.indexOf('quiz-result-typed') >= 0 && closeBody.indexOf('quiz-result-note') >= 0,
  'closeQuiz clears both rows, so a win after a lapse does not inherit "You wrote:"');

// ── 7. The caller: the phase-3 typing lapse routes here ──────────────────────
console.log('\n--- 7. The lapse path calls it ---');
const submit = ui.indexOf('function submitAnswer');
assert(submit >= 0, 'submitAnswer is in js/ui.js');
const body = ui.slice(submit, ui.indexOf('submitBtn.addEventListener'));
assert(body.indexOf('showQuizReveal({') >= 0, 'the wrong branch opens the reveal');
assert(!/setTimeout\(\(\)=>\{ closeQuiz\(\); if\(sceneRef\) sceneRef\.regressionPlot/.test(body),
  'and no longer closes itself blind after 1.8s');
assert(body.indexOf('regressionPlot(cp,cw)') >= 0,
  'the plot still regresses — the reveal defers that work, it does not cancel it');
assert(body.indexOf('const typedRaw = answerInput.value') >= 0
  && body.indexOf('const typedRaw') < body.indexOf("answerInput.value=''"),
  'what was typed is captured before the box is cleared');
// The apple tree is answered again for the same reward, so the word must stay hidden there.
assert(/if\(!isApple && currentPhase===3\)\{[\s\S]{0,900}showQuizReveal/.test(body),
  'the reveal is inside the non-apple phase-3 branch, so a retryable quiz gives nothing away');

// ── 8. The CSS the panel depends on ──────────────────────────────────────────
console.log('\n--- 8. The stylesheet agrees ---');
assert(css.indexOf('#quiz-ui.quiz-done #answer-input') >= 0,
  'the done state hides the input, for either outcome');
assert(css.indexOf('#quiz-ui.quiz-done .quiz-buttons') >= 0, 'and the buttons');
assert(!/#quiz-ui\.quiz-success #answer-input/.test(css),
  'the hiding no longer hangs off quiz-success alone, which is what blocked a second outcome');
assert(css.indexOf('#quiz-ui.quiz-lapsed #quiz-result-continue') >= 0,
  'the lapse has its own button colour, so it does not read as a reward');
assert(css.indexOf('#quiz-result-typed') >= 0 && css.indexOf('#quiz-result-note') >= 0,
  'both new rows are styled');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_quiz_reveal: all passed');
