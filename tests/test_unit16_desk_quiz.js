'use strict';
/**
 * tests/test_unit16_desk_quiz.js — the 퀴즈 on Unit 16's study desk.
 *
 * The desk carries four things for this chapter: the 교과서, the 익힘책, the cassette and this.
 * The first three each drill the chapter once; the quiz exists to revise it, which means it has
 * two obligations neither of the others has, and they pull against each other:
 *
 *   1. It has to be **about the chapter** — not about Korean in general, and not about the next
 *      one. Section 2 pins what every row revises and asserts the thirteen between them cover
 *      all four grammar points, the 발음 rule and the holiday vocabulary.
 *
 *   2. It must not be **a third copy of a row already done twice**. Section 3 compares every
 *      button against every filled sentence in both banks. It also checks the harder direction:
 *      no wrong button here is a right answer over there. A distractor that is keyed elsewhere
 *      means one of the two banks is lying, and the learner meets both in the same session.
 *
 * Reviewed illustrations now accompany the holiday questions. The source note and image
 * paths must survive an admin save; test_unit16_artwork.js verifies the complete art set.
 *
 * Run: node tests/test_unit16_desk_quiz.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC').trim();
const flat = (s) => nfc(s).replace(/[\s.,?!()]/g, '');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const quiz = readJson('worlds/unit16-desk-quiz.json');
const world = readJson('worlds/2b-unit-16.json');
const ui = read(path.join('js', 'ui.js'));
const rows = quiz.questions || [];
const answerOf = (q) => (q.choices || {})[q.a];
const wrongOf = (q) => Object.keys(q.choices || {}).filter((k) => k !== q.a).map((k) => q.choices[k]);

console.log('====================================================');
console.log('2B UNIT 16 · 퀴즈 — THE DESK\'S OWN REVISION');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank and the desk row ---');
assert(quiz.titleKo === '학습 책상', 'the desk names itself 학습 책상, as every other quiz does');
assert(quiz.titleEn === 'Holidays quiz', 'and its English title says what this one is about');
assert(rows.length === 13, 'thirteen rows (found ' + rows.length + ')');
assert(quiz.sessionSize === 10, 'ten to a sitting (found ' + quiz.sessionSize + ')');
assert(rows.length > quiz.sessionSize, 'so a second sitting is not the same ten');
['doneKo', 'againKo', 'closeKo', 'correctKo', 'wrongKo'].forEach((k) =>
  assert(!!quiz[k], 'the ' + k + ' button has its label'));
const shape = [];
const ids = new Set();
rows.forEach((q, i) => {
  const at = 'q' + (q.id || i + 1);
  if (typeof q.id !== 'number') shape.push(at + ': no numeric id');
  else if (ids.has(q.id)) shape.push(at + ': duplicate id'); else ids.add(q.id);
  if (!q.q) shape.push(at + ': no prompt');
  const keys = Object.keys(q.choices || {}).sort().join('');
  if (keys !== 'ABCD') shape.push(at + ': choices are ' + (keys || 'missing'));
  if (!answerOf(q)) shape.push(at + ': the answer ' + q.a + ' is not one of the choices');
  const vals = Object.keys(q.choices || {}).map((k) => flat(q.choices[k]));
  if (new Set(vals).size !== vals.length) shape.push(at + ': two buttons read the same');
});
assert(shape.length === 0, 'every row has four distinct buttons and an answer among them'
  + (shape.length ? ' — ' + shape.slice(0, 5).join('; ') : ''));
const letters = rows.map((q) => q.a).join('');
assert(new Set(letters.split('')).size === 4,
  'and the answers use all four letters, so the shape of the key teaches nothing (' + letters + ')');
const commonest = Math.max(...['A', 'B', 'C', 'D'].map((L) => letters.split(L).length - 1));
assert(commonest <= 5, 'with no letter carrying more than five of the thirteen (most is ' + commonest + ')');
assert(String(quiz.artNote || '').length > 200, 'the art note records reviewed illustrations');
assert(/떡국|송편|세배|yut/i.test(String(quiz.artNote || '')),
  'and identifies the illustrated holiday concepts');
const claimsArt = rows.filter((q) => q.art && !fs.existsSync(path.join(ROOT, 'sprites', q.art))).map((q) => q.id);
assert(claimsArt.length === 0, 'and no row claims a picture it does not have'
  + (claimsArt.length ? ' — q' + claimsArt.join(', q') : ''));

// ── 2. It revises this chapter ───────────────────────────────────────────────
console.log('\n--- 2. It revises this chapter ---');
// What each row is for, written down rather than inferred. A row that stops testing what it
// was put there for is the failure this catches; the coverage assertion under it is what
// catches a row quietly dropped.
const REVISES = [
  [1, 'V-아/어 놓다', /놓다/],
  [2, 'N 대신 — which noun it attaches to', /not used/],
  [3, 'N 대신 — the form itself', /^대신$/],
  [4, 'V-(으)ㄹ까 하다 against a settled plan', /갈까 해요/],
  [5, '-(으)ㄹ 테니까 as an offer', /offer/],
  [6, '-(으)ㄹ 테니까 on a ㅂ irregular', /추울 테니까/],
  [7, '-(으)ㄹ까 on a ㄹ stem', /만들까/],
  [8, '유음화', /ㄴ has become a ㄹ/],
  [9, '명절 against 연휴', /^명절$/],
  [10, '차례 and its verb', /지내다/],
  [11, '세배 and who it is made to', /어른들께/],
  [12, '추석 and the lunar calendar', /음력 8월 15일/],
  [13, '윷놀이 and the five throws', /^모$/]
];
assert(REVISES.length === rows.length, 'every row is accounted for below');
const misaimed = REVISES.filter(([id, , re]) => {
  const q = rows.find((r) => r.id === id);
  return !q || !re.test(nfc(answerOf(q)));
}).map(([id, what]) => 'q' + id + ' (' + what + ')');
assert(misaimed.length === 0, 'and each still keys what it was put there to revise'
  + (misaimed.length ? ' — ' + misaimed.join(', ') : ''));
const text = rows.map((q) => q.q + ' ' + Object.keys(q.choices).map((k) => q.choices[k]).join(' ')).join('\n');
[['V-아/어 놓다', /놓다|놓았|놓을/], ['N 대신', /대신/], ['V-(으)ㄹ까 하다', /ㄹ까 하|까 해|만들까|갈까/],
  ['A/V-(으)ㄹ 테니까', /테니까/], ['유음화', /설랄/], ['the holiday vocabulary', /명절|차례|세배|추석|음력/],
  ['윷놀이', /윷놀이/]].forEach(([label, re]) =>
  assert(re.test(nfc(text)), 'something in the thirteen revises ' + label));
// The words it leans on are words the farm can teach, or there is nowhere to have learnt them.
const owned = new Set((world.level.words || []).map((w) => nfc(w.ko)));
['명절', '연휴', '음력', '설날', '추석', '떡국', '윷놀이(를) 하다', '차례를 지내다', '세배(를) 하다']
  .forEach((ko) => assert(owned.has(nfc(ko)), ko + ' is a word the farm can teach'));

// ── 3. It is not a third copy of the two banks ───────────────────────────────
console.log('\n--- 3. It is not a third copy of the two banks ---');
const drilled = new Set();
const keyedElsewhere = new Set();
['worlds/unit16-textbook.json', 'worlds/unit16-workbook.json'].forEach((rel) => {
  const bank = readJson(rel);
  (bank.exercises || []).forEach((ex) => (ex.items || []).forEach((it) => {
    const one = ((it.choices || []).find((c) => c.id === it.answer) || {}).ko || '';
    const two = ((it.choices2 || []).find((c) => c.id === it.answer2) || {}).ko || '';
    if (one) keyedElsewhere.add(flat(one));
    if (two) keyedElsewhere.add(flat(two));
    const words = [one, two].filter(Boolean);
    let k = 0;
    drilled.add(flat((it.lines || [])
      .map((l) => String(l.ko).replace(/\{\}/g, () => words[k++] || '')).join(' ')));
  }));
});
const repeats = [];
rows.forEach((q) => Object.keys(q.choices).forEach((k) => {
  if (drilled.has(flat(q.choices[k]))) repeats.push('q' + q.id + k);
}));
assert(repeats.length === 0, 'no button here is a sentence the 교과서 or 익힘책 already drills'
  + (repeats.length ? ' — ' + repeats.join(', ') : ''));
// The direction that matters more: a wrong button here that is a right answer over there means
// one of the two is wrong, and the learner meets both on the same desk.
const contradictions = [];
rows.forEach((q) => wrongOf(q).forEach((ko) => {
  if (keyedElsewhere.has(flat(ko))) contradictions.push('q' + q.id + ' "' + ko + '"');
}));
assert(contradictions.length === 0, 'and no wrong button here is a keyed answer over there'
  + (contradictions.length ? ' — ' + contradictions.join(', ') : ''));

// ── 4. The four lists that have to agree it exists ───────────────────────────
console.log('\n--- 4. The four lists that have to agree it exists ---');
assert(/isUnit16World\(\)\) return '\/worlds\/unit16-desk-quiz\.json'/.test(ui),
  'deskQuizUrl resolves Unit 16 to this bank');
assert(read(path.join('admin', 'lib', 'content.js')).indexOf("'unit15', 'unit16'") >= 0,
  'QUIZ_UNITS lists it, so the admin can open it');
const picker = read(path.join('admin', 'public', 'js', 'world.js'));
assert(/\{ id: '2b-unit-16'[^}]*quiz: 'quiz\/unit16'[^}]*\}/.test(picker),
  'and the admin unit picker offers it rather than reporting quiz: null');
assert(read(path.join('scripts', 'ttsClips.js')).indexOf("'worlds/unit16-desk-quiz.json'") >= 0,
  'the TTS harvest reads it, so every prompt has a voice');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit16-desk-quiz.json'") >= 0,
  'HV_CATALOG_SOURCES lists it, so the Vietnamese is counted');
const viRel = path.join('locales', 'vi', 'worlds', 'unit16-desk-quiz.json');
assert(fs.existsSync(path.join(ROOT, viRel)), 'and the Vietnamese catalogue is on disk');
const vi = readJson(viRel);
assert(Object.keys(vi.entries || {}).length === 25,
  'with a line for all 25 strings (found ' + Object.keys(vi.entries || {}).length + ')');
// A Vietnamese line that still reads as its English is a line nobody wrote.
const untranslated = Object.keys(vi.entries || {})
  .filter((k) => nfc(vi.entries[k]) === nfc(k.slice(k.indexOf('|') + 1)));
assert(untranslated.length === 0, 'and none of them is the English copied across'
  + (untranslated.length ? ' — ' + untranslated.slice(0, 3).join(' | ') : ''));

// ── 5. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 5. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.split(path.sep).join('/')));
assert(batch.has('worlds/unit16-desk-quiz.json'), 'worlds/unit16-desk-quiz.json publishes');
assert(batch.has('locales/vi/worlds/unit16-desk-quiz.json'), 'and so does its Vietnamese');
// The harvest does NOT speak quiz buttons, and should not: walkKo collects node.ko, and a
// quiz's choices are plain A-D strings, half of which are forms printed only to be rejected.
// The workbook harvest gives the reason in its own comment — reading 하아도 돼요 aloud teaches
// it. So what is checked is the direction that would hurt: none of the nine broken forms this
// quiz prints has found its way into the set of phrases the game will say out loud.
const { collectTtsPhrases, ttsClipRel } = require(path.join(ROOT, 'scripts', 'ttsClips.js'));
const wanted = new Set(collectTtsPhrases(ROOT).map((t) => ttsClipRel(t)));
const BROKEN = ['대신에는', '을 대신', '대신으로', '춥을 테니까', '추워 테니까', '춥 테니까',
  '만드까', '만들을까', '만듦까'];
const printed = new Set();
rows.forEach((q) => Object.keys(q.choices).forEach((k) => printed.add(nfc(q.choices[k]))));
const notPrinted = BROKEN.filter((s) => !printed.has(nfc(s)));
assert(notPrinted.length === 0, 'the nine rejected forms are all still on their buttons'
  + (notPrinted.length ? ' — ' + notPrinted.join(', ') : ''));
const spoken = BROKEN.filter((s) => wanted.has(ttsClipRel(s)));
assert(spoken.length === 0, 'and the TTS harvest will never read one of them aloud'
  + (spoken.length ? ' — ' + spoken.join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit16_desk_quiz: all passed');
