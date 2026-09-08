'use strict';
/**
 * tests/test_answer_check.js — a correctly typed answer is marked correct.
 *
 * acceptableAnswers used to expand `ko` with `split(/[\/,]/)`, and the split *replaced* the
 * string it came from. That is fine for the convention it was written for — an entry that
 * inlines alternates as "가다 / 걷다" — but a slash is not a delimiter in Korean, it is
 * spelling. 을/를, 아/어 and (ㄴ/는) write one grammar form together with both of its
 * allomorphs, so `N을/를 위해` was expanded to the two fragments `N을` and `를 위해` and the
 * whole form was no longer an accepted answer. A learner who typed it exactly as the reveal
 * panel printed it was told they were wrong and knocked back to phase 2. Commas broke the
 * same way: `모두 18,000원입니다.` only ever accepted `모두 18`.
 *
 * These tests drive the shipped checkAnswer over the real worlds/*.json, so the guard is the
 * corpus itself rather than a fixture that has to be remembered when content is added.
 *
 * Run: node tests/test_answer_check.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error('FAIL: ' + msg);
    return;
  }
  console.log('ok  ' + msg);
}

// The grader is taken out of the shipped source rather than reimplemented: a copy here would
// pass while the game kept rejecting people. _JAMO_L is the first line of the block.
const start = ui.indexOf('const _JAMO_L');
const end = ui.indexOf('function deriveGrade(');
assert(start >= 0 && end > start, 'the answer grader is in js/ui.js');

const ctx = {};
vm.runInNewContext(
  ui.slice(start, end) +
  '\nthis.checkAnswer = checkAnswer;' +
  '\nthis.acceptableAnswers = acceptableAnswers;',
  ctx
);
const check = (typed, ko, extra) => ctx.checkAnswer(typed, Object.assign({ ko }, extra));

// --- the two forms from the bug report -------------------------------------------------

assert(check('N을/를 위해', 'N을/를 위해') === 'exact',
  'N을/를 위해 typed exactly is correct');
assert(check('-아/어서인지', '-아/어서인지') === 'exact',
  '-아/어서인지 typed exactly is correct');

// A fragment is not the answer. This is the half of the old behaviour that was actually
// wrong-in-the-lenient-direction: `N을` alone was graded 'exact' for the whole form.
assert(check('N을', 'N을/를 위해') === 'wrong',
  'and one side of the particle alternation on its own is not');
assert(check('-아', '-아/어서인지') === 'wrong',
  'nor is a bare -아 for -아/어서인지');

// --- every bare-slash form the content actually ships -----------------------------------

const slashForms = new Set();
const commaForms = new Set();
function collect(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(collect); return; }
  if (typeof node.ko === 'string') {
    const ko = node.ko;
    // A *spaced* slash is the inline-alternates convention and is meant to be split.
    if (ko.includes('/') && !/\s\/\s/.test(ko)) slashForms.add(ko);
    if (ko.includes(',')) commaForms.add(ko);
  }
  Object.values(node).forEach(collect);
}
const worldsDir = path.join(ROOT, 'worlds');
for (const f of fs.readdirSync(worldsDir)) {
  if (!f.endsWith('.json')) continue;
  collect(JSON.parse(fs.readFileSync(path.join(worldsDir, f), 'utf8')));
}

assert(slashForms.size > 0, 'worlds/ still carries slash-notated grammar forms to check');
const slashMisses = [...slashForms].filter(ko => check(ko, ko) !== 'exact');
assert(slashMisses.length === 0,
  'all ' + slashForms.size + ' slash-notated forms accept themselves' +
  (slashMisses.length ? ' — rejected: ' + slashMisses.join(', ') : ''));

assert(commaForms.size > 0, 'worlds/ still carries sentences punctuated with commas');
const commaMisses = [...commaForms].filter(ko => check(ko, ko) !== 'exact');
assert(commaMisses.length === 0,
  'all ' + commaForms.size + ' comma-punctuated sentences accept themselves' +
  (commaMisses.length ? ' — rejected: ' + commaMisses.slice(0, 3).join(' | ') : ''));

// --- what the split was for still works -------------------------------------------------

assert(check('가다', '가다 / 걷다') === 'exact', 'a spaced inline alternate accepts its first side');
assert(check('걷다', '가다 / 걷다') === 'exact', 'and its second');
assert(check('가다 / 걷다', '가다 / 걷다') === 'exact', 'and the entry as written');

assert(check('아버님', '아버지', { acceptedAnswers: ['아버님'] }) === 'exact',
  'a declared alternate is accepted');
assert(check('아버지', '아버지', { acceptedAnswers: ['아버님'] }) === 'exact',
  'and declaring one does not cost the headword');

// --- tiers that were already right stay right --------------------------------------------

assert(check('어깨가무겁다', '어깨가 무겁다') === 'exact',
  '띄어쓰기 alone is not a mistake');
assert(check('김치찜개', '김치찌개') === 'close',
  'a one-jamo slip is still graded close, not wrong');
assert(check('', 'N을/를 위해') === 'wrong', 'an empty box is wrong');

console.log(failures === 0
  ? '\nAll answer-check tests passed.'
  : '\n' + failures + ' answer-check test(s) failed.');
process.exit(failures === 0 ? 0 : 1);
