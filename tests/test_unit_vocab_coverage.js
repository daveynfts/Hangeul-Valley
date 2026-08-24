/**
 * tests/test_unit_vocab_coverage.js — a word the workbook drills has to be a word the farm
 * can teach, and each unit's list has to stay its own.
 *
 * The workbook and the farm word list are two files that nothing tied together. Unit 10's
 * suite checks its twelve dishes against the list; nothing checked the taste adjectives, the
 * restaurant nouns, or any of Unit 14 — so an exercise could drill a word with no way to
 * learn it and every suite would still pass. That is what happened to the 금지 pages: 문법과
 * 표현 4 and 문형 연습 4 drill seven prohibition actions off the signs, and the 어휘 list
 * carried the signs without the actions.
 *
 * The other half is keeping the units apart. They are separate textbook units with separate
 * lists, and a word landing in the wrong one is invisible — it just quietly turns up in the
 * wrong farm.
 *
 * Run: node tests/test_unit_vocab_coverage.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
const nfc = (s) => String(s == null ? '' : s).normalize('NFC').trim();

const UNITS = {
  unit10: { world: 'worlds/2b-unit-10.json', wb: 'worlds/unit10-workbook.json', label: 'Unit 10' },
  unit14: { world: 'worlds/2b-unit-14.json', wb: 'worlds/unit14-workbook.json', label: 'Unit 14' }
};

const state = {};
for (const [key, u] of Object.entries(UNITS)) {
  const world = read(u.world);
  state[key] = {
    label: u.label,
    words: (world.level.words || []).map((w) => ({ ...w, ko: nfc(w.ko) })),
    ko: new Set((world.level.words || []).map((w) => nfc(w.ko))),
    wb: read(u.wb)
  };
}

console.log('====================================================');
console.log('UNIT VOCABULARY COVERAGE');
console.log('====================================================');

// ── 1. Every 어휘 chip is a word of its own unit ──────────────────────────────
// The 어휘 pages are the unit's vocabulary, so every chip on them has to exist in that
// unit's list. A chip carries the word in one of three shapes and all three reduce to the
// same headword:
//
//   { ko: '김치찌개' }                        the headword itself
//   { dict: '짜다', polite: '짜요' }          dictionary form plus the form the blank wants
//   { ko: '이름을 부르지 마세요.' }             the headword told not to do it
//
const headword = (chip) => {
  if (chip.dict) return nfc(chip.dict);
  const raw = nfc(chip.ko);
  // '…지 마세요.' is the negative imperative of the headword: drop the ending, restore 다.
  const m = /^(.*?)지\s*마(?:세요|)\.?$/.exec(raw);
  return m ? nfc(m[1]) + '다' : raw;
};

console.log('\n--- 1. Every 어휘 chip is a word of its own unit ---');
for (const [key, s] of Object.entries(state)) {
  const chips = (s.wb.exercises || [])
    .filter((e) => e.section === '어휘')
    .flatMap((e) => (e.bank || []).map((b) => ({ ex: e.id, ko: headword(b) })));
  assert(chips.length > 0, `${s.label}: the 어휘 pages carry chips at all (${chips.length})`);
  const orphans = chips.filter((c) => !s.ko.has(c.ko));
  assert(orphans.length === 0,
    `${s.label}: every 어휘 chip is in the ${s.label} word list`
    + (orphans.length ? ' — missing: ' + orphans.map((o) => o.ko + ' (' + o.ex + ')').join(', ') : ''));
}

// ── 2. The 금지 actions the exercises drill ──────────────────────────────────
// Unit 14's 어휘 list enumerates prohibitions, and its 문법과 표현 4 / 문형 연습 3-4 pages
// drill them as actions rather than as the signs. Those actions belong to the same group and
// have to be learnable; naming them here is what keeps a future edit from dropping one.
console.log('\n--- 2. The 금지 actions Unit 14 drills ---');
const PROHIBITION_ACTIONS = [
  '전화를 하다', '사진을 찍다', '담배를 피우다', '수영을 하다',
  '차를 세우다', '주차하다', '음료수를 마시다', '노래를 부르다'
];
const u14 = state.unit14;
PROHIBITION_ACTIONS.forEach((ko) => {
  const w = u14.words.find((x) => x.ko === ko);
  assert(!!w, `${ko} is a Unit 14 word`);
  if (w) {
    assert(w.categoryEn === 'Public etiquette & prohibitions',
      `and sits in the 금지 group, not somewhere else (${w.categoryEn})`);
  }
});
// And they really are drilled — a list of words nothing exercises would be the opposite bug.
const drilledPhrases = new Set();
for (const ex of u14.wb.exercises || []) {
  for (const it of [...(ex.items || []), ...(ex.example ? [ex.example] : [])]) {
    if (it.phraseKo) drilledPhrases.add(nfc(it.phraseKo));
  }
}
const undrilled = PROHIBITION_ACTIONS.filter((ko) => !drilledPhrases.has(ko));
assert(undrilled.length === 0,
  'each one is the subject of a workbook row' + (undrilled.length ? ' — not drilled: ' + undrilled.join(', ') : ''));

// ── 3. The two units do not leak into each other ─────────────────────────────
console.log('\n--- 3. The two units stay separate ---');
const shared = [...state.unit10.ko].filter((ko) => state.unit14.ko.has(ko));
assert(shared.length === 0,
  'no word is in both unit lists' + (shared.length ? ' — shared: ' + shared.join(', ') : ''));

// A unit's workbook must not drill a word that belongs to the other unit's list: that is the
// shape a mix-up takes, and it reads as perfectly fine content until you check.
for (const [key, s] of Object.entries(state)) {
  const other = key === 'unit10' ? state.unit14 : state.unit10;
  const chips = (s.wb.exercises || [])
    .filter((e) => e.section === '어휘')
    .flatMap((e) => (e.bank || []).map(headword));
  const strays = chips.filter((ko) => other.ko.has(ko) && !s.ko.has(ko));
  assert(strays.length === 0,
    `${s.label}'s 어휘 chips do not come from ${other.label}'s list`
    + (strays.length ? ' — strays: ' + strays.join(', ') : ''));
}

// ── 4. Words still waiting on art ────────────────────────────────────────────
// artPending is the only exemption from the "every headword has a catalogued PNG" gate in
// validate_content.js. It has to stay visible and it has to leave the word renderable: the
// icon falls back to the hint emoji, so a pending word shows up as its emoji rather than
// as a blank.
console.log('\n--- 4. Words waiting on art are still playable ---');
let pendingTotal = 0;
for (const [, s] of Object.entries(state)) {
  const pending = s.words.filter((w) => w.artPending);
  pendingTotal += pending.length;
  pending.forEach((w) => {
    assert(!!w.hint, `${s.label}: ${w.ko} carries a hint emoji to render with`);
    assert(!!w.en && !!w.category && !!w.categoryEn,
      `${s.label}: ${w.ko} is a complete entry apart from the picture`);
  });
  if (pending.length) {
    console.log(`      ${s.label} awaiting art (${pending.length}): ${pending.map((w) => w.ko).join(', ')}`);
  }
}
// Counted rather than enumerated. This line used to name all seven pending headwords, back
// when artPending meant "a word an exercise drills that the 어휘 list forgot". Unit 14 now
// carries its whole chapter — the grammar boxes, 말하기, 듣고 말하기, 읽고 쓰기, 과제 and 발음 —
// and none of those words have icons yet, so enumerating them would be a 71-line list that
// grows with every unit and says nothing.
//
// The guarantee the list stood for is not lost, because it lives where it belongs: the
// 'keeps its 54 textbook headwords' check in validate_content.js, paired with 'every drawn
// Unit 14 headword has catalogued PNG'. Flipping a shipped 어휘 word to artPending to dodge
// its picture drops drawn to 53 and fails there. What is left for this line is the thing a
// count still catches: pending growing without anyone deciding it should.
const PENDING_TOTAL = 71;
const actualPending = Object.values(state).flatMap((s) => s.words.filter((w) => w.artPending).map((w) => w.ko));
assert(actualPending.length === pendingTotal && pendingTotal === PENDING_TOTAL,
  `exactly ${PENDING_TOTAL} words await art (found ${actualPending.length})`);

// The seven 금지 actions are a different case from the rest, and the difference is the whole
// reason they were allowed to ship without art: they are not on the 어휘 pages at all. They
// exist in the word list *because* 문법과 표현 4 and 문형 연습 4 drill them, so if a rewrite ever
// drops them from the workbook they have no reason to be in the unit either. The rest of the
// pending set is the chapter's own vocabulary and stands on the farm without an exercise.
const EXERCISE_ONLY = [
  '사진을 찍다', '담배를 피우다', '수영을 하다',
  '차를 세우다', '주차하다', '음료수를 마시다', '노래를 부르다'
];
for (const [, s] of Object.entries(state)) {
  const drilled = new Set();
  for (const ex of s.wb.exercises || []) {
    for (const b of ex.bank || []) drilled.add(headword(b));
    for (const it of [...(ex.items || []), ...(ex.example ? [ex.example] : [])]) {
      if (it.phraseKo) drilled.add(nfc(it.phraseKo));
    }
  }
  const owned = new Set(s.words.map((w) => w.ko));
  const idle = EXERCISE_ONLY.filter((ko) => owned.has(ko) && !drilled.has(ko));
  assert(idle.length === 0,
    `${s.label}: every exercise-only word is still one the workbook drills`
    + (idle.length ? ' — idle: ' + idle.join(', ') : ''));
}

console.log('\n====================================================');
console.log(`${passed} passed, ${failed} failed`);
console.log('====================================================');
process.exit(failed ? 1 : 0);
