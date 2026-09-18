'use strict';
/**
 * tests/test_unit17_desk_quiz.js — the study desk of 17과 비행기를 놓칠 뻔했어요.
 *
 * Fourteen questions, ten to a sitting, so two sittings are never the same ten. The desk is
 * revision rather than a third bank: by the time a learner opens it they have already done
 * 77 rows in the 익힘책 and 60 in the 교과서, so a question here has to be about a rule
 * rather than about a sentence. Section 3 checks that from the other side — no button on
 * this desk may be a sentence either of the other two banks already gaps.
 *
 * It ships without artwork, which is a decision rather than an oversight: 17과's own
 * illustrations have not been drawn. `artNote` records it, and that note is checked, because
 * admin/lib/world.js validateQuiz rebuilds a quiz from a fixed field list and silently drops
 * everything else — `art` included, which is how three other units lost the picture on every
 * row of theirs.
 *
 * Run: node tests/test_unit17_desk_quiz.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const bank = JSON.parse(read(path.join('worlds', 'unit17-desk-quiz.json')));
const qs = bank.questions || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/[\s.,?!()]/g, '');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 17 · 학습 책상 — 17과 비행기를 놓칠 뻔했어요');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(bank.titleKo === '학습 책상', 'the desk labels itself 학습 책상');
assert(typeof bank.titleEn === 'string' && bank.titleEn.length > 4,
  'and carries an English title for the desk chooser: ' + bank.titleEn);
assert(qs.length === 14, 'fourteen questions (found ' + qs.length + ')');
assert(bank.sessionSize === 10, 'ten of them to a sitting (' + bank.sessionSize + ')');
assert(qs.length > bank.sessionSize, 'so two sittings are never the same ten');
const ids = qs.map((q) => q.id);
assert(ids.every((i) => typeof i === 'number'), 'every question has a numeric id');
assert(new Set(ids).size === ids.length, 'and no id is used twice');
const shape = [];
qs.forEach((q) => {
  const keys = Object.keys(q.choices || {}).sort().join('');
  if (keys !== 'ABCD') shape.push('q' + q.id + ' choices are ' + (keys || 'missing'));
  if (!q.choices || !q.choices[q.a]) shape.push('q' + q.id + ' answer ' + q.a + ' is not a choice');
  const vals = Object.values(q.choices || {});
  if (new Set(vals.map(flat)).size !== vals.length) shape.push('q' + q.id + ' repeats an option');
  if (String(q.q).length < 25) shape.push('q' + q.id + ' has a stem too short to be a question');
});
assert(shape.length === 0, 'every row has four distinct options and keys one of them'
  + (shape.length ? ' — ' + shape.join(', ') : ''));
assert(new Set(qs.map((q) => q.q)).size === qs.length, 'and no two questions share a stem');
const letters = qs.map((q) => q.a);
assert(new Set(letters).size === 4, 'the answers use all four letters (' + letters.join('') + ')');
const spread = {};
letters.forEach((k) => { spread[k] = (spread[k] || 0) + 1; });
assert(Math.max(...Object.values(spread)) <= qs.length / 2,
  'and none of them carries half the bank — ' + ['A', 'B', 'C', 'D'].map((k) => k + '×' + spread[k]).join(' '));

// ── 2. It revises this chapter ───────────────────────────────────────────────
console.log('\n--- 2. It revises this chapter ---');
const all = qs.map((q) => q.q + ' ' + Object.values(q.choices).join(' ')).join('\n');
[['V-아다/어다 주다', /데려다|모셔다|갖다 주다|가져다/],
  ['V-(으)ㄹ 뻔하다', /뻔하|뻔했/],
  ['the ㅎ-irregular', /까만|까맣|하얘|하얗|빨갛/],
  ['V-아/어 있다', /려 있|어 있|고 있/],
  ['the colours and patterns', /무늬/],
  ['유음화', /받침 ㄴ|\[ㄹ\]/]].forEach(([label, re]) => {
    assert(re.test(all), 'something on the desk asks about ' + label);
  });
// The four things this chapter is easiest to get wrong about, each pinned to its answer.
const keyed = (id) => { const q = qs.find((x) => x.id === id); return q ? nfc(q.choices[q.a]) : null; };
const has = (re) => qs.some((q) => re.test(q.q) && re.test(q.q) && true);
assert(qs.some((q) => /뻔하다 attaches/.test(q.q) && q.choices[q.a] === '-(으)ㄹ'),
  '뻔하다 takes -(으)ㄹ, and the desk says so');
assert(qs.some((q) => /tense/.test(q.q) && /뻔했어요/.test(q.choices[q.a])),
  'and that it is always past');
assert(qs.some((q) => /grandmother/.test(q.q) && q.choices[q.a] === '모셔다 드렸어요'),
  'a grandmother takes 모셔다 드리다');
assert(qs.some((q) => /까맣다/.test(q.q) && q.choices[q.a] === '까만'),
  '까맣다 + -(으)ㄴ is 까만');
assert(qs.some((q) => /하얗다/.test(q.q) && q.choices[q.a] === '하얘요'),
  'and 하얗다 + -아요 is 하얘요, which is the one that lands on ㅒ');
assert(qs.some((q) => /leaves the ㅎ/.test(q.q) && q.choices[q.a] === '-고'),
  'and -고 is the ending that leaves the ㅎ alone');
assert(qs.some((q) => /받침 ㄴ/.test(q.q) && q.choices[q.a] === '[ㄹ]'),
  'a 받침 ㄴ before a ㄹ is read [ㄹ], which is this chapter’s 발음 point');
assert(qs.some((q) => /물방울무늬/.test(Object.values(q.choices).join(' ')) && q.choices[q.a] === '물방울무늬'),
  'and 물방울무늬 is the dots');
// No question may be answerable by elimination on length alone.
const lopsided = qs.filter((q) => {
  const lens = Object.values(q.choices).map((v) => nfc(v).length).sort((a, b) => a - b);
  return lens[3] > lens[0] * 3 && lens[3] - lens[2] > 12;
}).map((q) => q.id);
assert(lopsided.length === 0, 'and no row has one option so much longer than the rest that it gives itself away'
  + (lopsided.length ? ' — q' + lopsided.join(', q') : ''));

// ── 3. It is not a third copy of the two banks ───────────────────────────────
console.log('\n--- 3. Not a third copy of the two banks ---');
const drilled = new Set();
let drilledRows = 0;
['worlds/unit17-textbook.json', 'worlds/unit17-workbook.json'].forEach((rel) => {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), rel + ' is on disk to compare against');
  if (!fs.existsSync(full)) return;
  const b = JSON.parse(fs.readFileSync(full, 'utf8'));
  (b.exercises || []).forEach((ex) => (ex.items || []).forEach((it) => {
    drilledRows++;
    const one = ((it.choices || []).find((c) => c.id === it.answer) || {}).ko || '';
    const two = ((it.choices2 || []).find((c) => c.id === it.answer2) || {}).ko || '';
    const words = [one, two].filter(Boolean);
    let k = 0;
    drilled.add(flat((it.lines || [])
      .map((l) => String(l.ko).replace(/\{\}/g, () => words[k++] || '')).join(' ')));
  }));
});
assert(drilledRows === 137, 'the two banks between them hold 137 rows (' + drilledRows + ')');
const repeats = [];
qs.forEach((q) => Object.keys(q.choices || {}).forEach((k) => {
  if (drilled.has(flat(q.choices[k]))) repeats.push('q' + q.id + k);
}));
assert(repeats.length === 0, 'and no button on this desk is a sentence either of them already gaps'
  + (repeats.length ? ' — ' + repeats.join(', ') : ''));

// ── 4. The artwork it has not got ────────────────────────────────────────────
console.log('\n--- 4. The artwork ---');
assert(typeof bank.artNote === 'string' && bank.artNote.length > 200,
  'the bank records why it carries no pictures yet (' + String(bank.artNote || '').length + ' chars)');
assert(/answerable|in words/.test(bank.artNote),
  'and that nothing on it needs one to be answerable');
const claimed = qs.filter((q) => q.art).map((q) => q.id);
assert(claimed.length === 0, 'so no row claims a picture' + (claimed.length ? ' — q' + claimed.join(', q') : ''));

// ── 5. The four lists that have to agree it exists ───────────────────────────
console.log('\n--- 5. Wiring ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit17World\(\)\) return '\/worlds\/unit17-desk-quiz\.json'/.test(ui),
  'deskQuizUrl resolves Unit 17 to its own bank');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit17-desk-quiz.json'") >= 0,
  'it is a translatable source');
assert(read(path.join('scripts', 'ttsClips.js')).indexOf('worlds/unit17-desk-quiz.json') >= 0,
  'the TTS harvest reads it');
const content = read(path.join('admin', 'lib', 'content.js'));
assert(/QUIZ_UNITS = \[[^\]]*'unit17'/.test(content), 'and the admin panel lists it');
assert(read(path.join('admin', 'public', 'js', 'world.js')).indexOf("quiz: 'quiz/unit17'") >= 0,
  'with a route to open it on');
const { validateQuiz } = require(path.join(ROOT, 'admin', 'lib', 'world.js'));
let accepted = null;
try { accepted = validateQuiz(JSON.parse(JSON.stringify(bank))); } catch (e) { accepted = { error: e.message }; }
assert(accepted && !accepted.error && accepted.questions.length === 14,
  'the shared validator accepts the bank as it stands'
  + (accepted && accepted.error ? ' — ' + accepted.error : ''));
assert(accepted && accepted.sessionSize === 10, 'and keeps the session at ten');

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit17-desk-quiz.json'), 'the bank publishes');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit17_desk_quiz: all passed');
