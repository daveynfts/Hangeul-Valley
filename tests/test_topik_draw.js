'use strict';
/**
 * tests/test_topik_draw.js — one exam question per sitting, drawn from the whole paper.
 *
 * The exam bank is not a page to be worked through once. A sitting is one question and its
 * explanation, and the next sitting should be a different question. The risk in "pick a random
 * one" is the obvious one: with six questions, plain Math.random() re-asks the question you
 * just answered a sixth of the time, and leaves part of the bank unseen for a long while. So
 * the draw is a bag — every question once, refilled when empty, never opening on the question
 * that closed the last bag.
 *
 * These tests drive the shipped wbDrawIndex/wbDrawOne rather than reading the source, with a
 * seeded stand-in for Math.random so a run either passes or fails rather than usually passing.
 *
 * Run: node tests/test_topik_draw.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'topik2-questions.json'), 'utf8'));

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// A deterministic stand-in: a real Math.random makes "no immediate repeats" a claim that is
// usually true, which is the kind of test that passes on the day it should fail.
function seeded(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return (x >>> 8) / 0x1000000;
  };
}

function load(seed) {
  const ctx = { console, Math: Object.create(Math), Map, Object, String, Array };
  ctx.Math.random = seeded(seed);
  vm.createContext(ctx);
  const from = ui.indexOf('const wbDrawBags');
  const to = ui.indexOf('function openWorkbookExercise');
  if (from < 0 || to < from) throw new Error('the draw helpers are not in js/ui.js');
  vm.runInContext(ui.slice(from, to), ctx);
  return ctx;
}

// ── 1. The bank asks for it ──────────────────────────────────────────────────
console.log('\n--- 1. The exam bank opts in ---');
assert(bank.drawOne === true, 'topik2-questions.json sets drawOne');
assert(typeof bank.nextKo === 'string' && bank.nextKo.length > 0,
  'and names the button that draws the next one (' + bank.nextKo + ')');
const ex = bank.exercises[0];
assert((ex.items || []).length >= 6, 'the paper holds at least six questions ('
  + (ex.items || []).length + ')');

// ── 2. A full round before anything repeats ──────────────────────────────────
console.log('\n--- 2. Every question comes up before any comes back ---');
const N = (ex.items || []).length;
const ctx = load(20260825);
const first = [];
for (let i = 0; i < N; i++) first.push(ctx.wbDrawIndex('paper', N));
const seen = new Set(first);
assert(seen.size === N, 'the first ' + N + ' draws are ' + N + ' different questions ('
  + first.join(',') + ')');
const second = [];
for (let i = 0; i < N; i++) second.push(ctx.wbDrawIndex('paper', N));
assert(new Set(second).size === N, 'and so are the next ' + N + ' (' + second.join(',') + ')');
assert(first.join(',') !== second.join(','),
  'in a different order, or it is a rota rather than a draw');

// ── 3. No question follows itself ────────────────────────────────────────────
console.log('\n--- 3. Never the same question twice running ---');
let repeats = 0;
for (let s = 1; s <= 40; s++) {
  const c = load(s * 7919);
  let prev = -1;
  for (let i = 0; i < N * 3; i++) {
    const got = c.wbDrawIndex('paper', N);
    if (got === prev) repeats++;
    prev = got;
  }
}
assert(repeats === 0, 'across 40 seeds and 3 full rounds each, no draw repeated the previous '
  + 'one (' + repeats + ' repeats)');

// ── 4. Two papers do not share a bag ─────────────────────────────────────────
console.log('\n--- 4. Each paper keeps its own bag ---');
const c2 = load(5);
const a = [];
const b = [];
for (let i = 0; i < N; i++) { a.push(c2.wbDrawIndex('paper-a', N)); b.push(c2.wbDrawIndex('paper-b', N)); }
assert(new Set(a).size === N && new Set(b).size === N,
  'interleaving two papers still gives each a complete round');

// ── 5. A paper that grows is not drawn from a stale bag ──────────────────────
console.log('\n--- 5. A paper that grows ---');
const c3 = load(11);
c3.wbDrawIndex('paper', 3);
c3.wbDrawIndex('paper', 3);
const after = [];
for (let i = 0; i < 7; i++) after.push(c3.wbDrawIndex('paper', 7));
assert(new Set(after).size === 7,
  'adding a question refills the bag rather than drawing from the old size ('
    + after.join(',') + ')');
assert(Math.max(...after) === 6, 'and the new question is reachable');

// ── 6. wbDrawOne hands back one real question ────────────────────────────────
console.log('\n--- 6. What the renderer receives ---');
const c4 = load(99);
const one = c4.wbDrawOne(bank, ex);
assert(one !== ex, 'the exercise handed on is a copy, not the bank exercise itself');
assert((ex.items || []).length === N, 'and the bank exercise is left whole ('
  + (ex.items || []).length + ')');
assert(one.items.length === 1, 'the copy carries exactly one question');
assert((ex.items || []).indexOf(one.items[0]) >= 0, 'and it is one of the real ones');
assert(one.id === ex.id, 'it keeps its id, so the picker and the practice record still match');
assert(one.type === ex.type && one.instructionKo === ex.instructionKo,
  'and everything else the renderer reads');
assert(one.drawnFrom === N, 'it records how big the paper was (' + one.drawnFrom + ')');
assert(typeof one.items[0].why === 'string' && one.items[0].why.length > 200,
  'the drawn question brings its explanation with it');
assert((one.items[0].choices || []).length === 4, 'and its four options');

// ── 7. The thorough explanation is revealed in a learnable order ────────────
console.log('\n--- 7. Progressive TOPIK explanations ---');
const whyFrom = ui.indexOf('function wbWhyParagraphs');
const whyTo = ui.indexOf('function wbTopikWhyHtml');
assert(whyFrom > 0 && whyTo > whyFrom, 'the paragraph splitter is a named, testable rule');
const whyCtx = {};
vm.createContext(whyCtx);
vm.runInContext(ui.slice(whyFrom, whyTo) + '\nthis.splitWhy = wbWhyParagraphs;', whyCtx);
const split = whyCtx.splitWhy('Core clue.\n\nOption one.\r\n\r\nOption two.');
assert(split.length === 3 && split[0] === 'Core clue.' && split[2] === 'Option two.',
  'blank lines split the key cue from choice-by-choice analysis on LF and CRLF');
const allQuestions = bank.exercises.flatMap((paper) => paper.items || []);
assert(allQuestions.length === 27, 'all 27 TOPIK questions use the shared explanation renderer');
assert(allQuestions.every((item) => whyCtx.splitWhy(item.why).length >= 3),
  'every current explanation has a visible key cue and at least two details to disclose');
const explainSrc = ui.slice(whyTo, ui.indexOf('function renderWorkbook'));
assert(explainSrc.indexOf('<details class="wb-analysis">') >= 0
    && explainSrc.indexOf('<details class="wb-analysis" open') < 0,
  'the full comparison stays in the document but is collapsed by default');
assert(ui.indexOf("st.bank.id === 'topik2-questions'") >= 0,
  'progressive disclosure is scoped to the TOPIK paper rather than changing every workbook');
assert(css.indexOf('.wb-learn-grid') >= 0 && css.indexOf('.wb-analysis-step') >= 0,
  'the key clue, rule and detailed steps have separate readable layouts');
assert(/max-width: 7[26]ch/.test(css),
  'long reasoning lines are capped to a readable measure instead of spanning the panel');

// ── 8. A bank that did not ask for it is untouched ───────────────────────────
console.log('\n--- 8. Opt-in only ---');
const plain = c4.wbDrawOne({ id: 'x' }, ex);
assert(plain === ex, 'a bank without drawOne gets the whole exercise back, unchanged');
const single = c4.wbDrawOne(bank, { id: 'y', items: [{ n: 1 }] });
assert(single.items.length === 1 && single.drawnFrom === undefined,
  'a one-question exercise is passed through rather than "drawn" from itself');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_topik_draw: all passed');
