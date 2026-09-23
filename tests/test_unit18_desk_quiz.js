'use strict';
/**
 * tests/test_unit18_desk_quiz.js — the study desk of 18과 한국에 온 지 벌써 6개월이 되었어요.
 *
 * Sixteen questions, ten to a sitting, so two sittings are never the same ten. The desk is
 * revision rather than a third bank: by the time a learner opens it they have done 85 rows in
 * the 익힘책 and 57 in the 교과서, so a question here has to be about a rule rather than about a
 * sentence. Section 3 checks that from the other side — no button on this desk may be a
 * sentence either of the other two banks already gaps.
 *
 * The rules are the four grammar points, the two vocabulary pages and the closing 발음 page,
 * and section 2 pins the answer to each of the things this chapter is easiest to get wrong:
 * that 온 지 is written apart because 지 is a noun, that 이나 after a number is surprise and
 * 밖에 the same number as too few, that an adjective's plain style is its dictionary form, that
 * 놀다 loses its ㄹ, and that 있다 takes no -는다 because "there is" counts as an adjective.
 * And a wrong option has to be wrong: 학교이다 is as good as 학교다, so it never stands alone.
 *
 * It ships without artwork, which is a decision rather than an oversight: 18과's illustrations
 * have not been drawn, and validateQuiz drops any field it does not know, `art` included.
 *
 * Run: node tests/test_unit18_desk_quiz.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const bank = JSON.parse(read(path.join('worlds', 'unit18-desk-quiz.json')));
const qs = bank.questions || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/[\s.,?!()]/g, '');
const key = (q) => nfc(q.choices[q.a]);

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 18 · 학습 책상 — 18과 한국에 온 지 벌써 6개월이 되었어요');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(bank.titleKo === '학습 책상', 'the desk labels itself 학습 책상');
assert(typeof bank.titleEn === 'string' && bank.titleEn.length > 4,
  'and carries an English title for the desk chooser: ' + bank.titleEn);
assert(qs.length === 16, 'sixteen questions (found ' + qs.length + ')');
assert(bank.sessionSize === 10, 'ten of them to a sitting (' + bank.sessionSize + ')');
assert(qs.length > bank.sessionSize, 'so two sittings are never the same ten');
const ids = qs.map((q) => q.id);
assert(ids.every((i, k) => i === k + 1), 'numbered 1 to 16 in order');
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
[['V-(으)ㄴ 지', /온 지/], ['N(이)나 2', /그릇이나|잔이나|마리___/],
  ['the plain style', /읽는다|논다|시원하다/], ['N(이)다', /학교다|방학이다/],
  ['the chapter’s feelings', /그립다/], ['its weather', /장마/], ['its 발음 page', /\[장년\]/]].forEach(([label, re]) => {
    assert(re.test(all), 'something on the desk asks about ' + label);
  });
const find = (re) => qs.find((q) => re.test(q.q));
const pin = (re, want, msg) => { const q = find(re); assert(!!q && key(q) === want, msg + (q ? ' (keys «' + key(q) + '»)' : ' — no such question')); };
pin(/how long it has been/, 'V-(으)ㄴ 지', 'the form for how long it has been is V-(으)ㄴ 지');
pin(/벌써 네 달 됐어요/, '온 지', 'and 한국에 ___ 벌써 네 달 됐어요 takes 온 지');
pin(/written with a space/, 'the 지 of V-(으)ㄴ 지 is a noun of its own, meaning the time since',
  '온 지 is written apart because its 지 is a noun');
pin(/which verb does the chapter use/, '되다 — 네 달 됐어요', 'and the length of time is followed by 되다');
pin(/what does 이나 say/, 'that two bowls is more than you would expect', '두 그릇이나 is surprise at the amount');
pin(/after the vowel of 리/, '나', 'and after a vowel the particle is 나');
pin(/세 잔이나 마셨어요 and 세 잔밖에/, 'the same three cups, counted as a lot in the first and as few in the second',
  'while 밖에 is the same number seen as too few');
pin(/자기 전에 책을/, '읽는다', 'a consonant-stem verb takes -는다');
pin(/plain style of an adjective/, '날씨가 시원하다.', 'an adjective’s plain style is its dictionary form');
pin(/놀다 become/, '논다', '놀다 loses its ㄹ');
pin(/학교예요 and 오늘은 방학이에요/, '학교다 · 방학이다', 'the copula drops its 이 after a vowel and keeps it after a consonant');
pin(/사계절이 있다 take no/, 'because 있다 meaning "there is" counts as an adjective, like 없다',
  'and 있다 takes no -는다 because "there is" counts as an adjective — not because it is irregular');
pin(/missing someone or somewhere/, '그립다', 'missing someone far away is 그립다');
pin(/long rains/, '장마', 'the rains of late June are 장마');
pin(/new pronunciation rule/, 'none — the page reviews rules taught earlier', 'and 18과’s 발음 page teaches no new rule');
pin(/underlined 작년/, '[장년]', 'its 작년 is said [장년]');
// No correct Korean passed off as a mistake: 학교이다 is fine after a vowel, so it may appear
// only paired with something that is wrong.
const q11 = find(/학교예요 and 오늘은 방학이에요/);
const aloneIda = Object.entries(q11.choices).filter(([k, v]) => k !== q11.a && /학교이다/.test(v) && !/방학다|인다/.test(v));
assert(aloneIda.length === 0, 'and 학교이다 is never offered as a mistake on its own');
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
['worlds/unit18-textbook.json', 'worlds/unit18-workbook.json'].forEach((rel) => {
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
assert(drilledRows === 142, 'the two banks between them hold 142 rows (' + drilledRows + ')');
const repeats = [];
qs.forEach((q) => Object.keys(q.choices || {}).forEach((k) => {
  if (drilled.has(flat(q.choices[k]))) repeats.push('q' + q.id + k);
}));
assert(repeats.length === 0, 'and no button on this desk is a sentence either of them already gaps'
  + (repeats.length ? ' — ' + repeats.join(', ') : ''));

// ── 4. The artwork it has not got ────────────────────────────────────────────
console.log('\n--- 4. The artwork ---');
assert(typeof bank.artNote === 'string' && bank.artNote.length > 150,
  'the bank records why it carries no pictures yet (' + String(bank.artNote || '').length + ' chars)');
assert(/answerable/.test(bank.artNote), 'and that nothing on it needs one to be answerable');
const claimed = qs.filter((q) => q.art).map((q) => q.id);
assert(claimed.length === 0, 'so no row claims a picture' + (claimed.length ? ' — q' + claimed.join(', q') : ''));

// ── 5. The four lists that have to agree it exists ───────────────────────────
console.log('\n--- 5. Wiring ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit18World\(\)\) return '\/worlds\/unit18-desk-quiz\.json'/.test(ui), 'deskQuizUrl resolves Unit 18 to its own bank');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit18-desk-quiz.json'") >= 0, 'it is a translatable source');
assert(read(path.join('scripts', 'ttsClips.js')).indexOf('worlds/unit18-desk-quiz.json') >= 0, 'the TTS harvest reads it');
const content = read(path.join('admin', 'lib', 'content.js'));
assert(/QUIZ_UNITS = \[[^\]]*'unit18'/.test(content), 'and the admin panel lists it');
assert(read(path.join('admin', 'public', 'js', 'world.js')).indexOf("quiz: 'quiz/unit18'") >= 0, 'with a route to open it on');
const { validateQuiz } = require(path.join(ROOT, 'admin', 'lib', 'world.js'));
let accepted = null;
try { accepted = validateQuiz(JSON.parse(JSON.stringify(bank))); } catch (e) { accepted = { error: e.message }; }
assert(accepted && !accepted.error && accepted.questions.length === 16,
  'the shared validator accepts the bank as it stands' + (accepted && accepted.error ? ' — ' + accepted.error : ''));
assert(accepted && accepted.sessionSize === 10, 'and keeps the session at ten');

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit18-desk-quiz.json'), 'the bank publishes');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit18_desk_quiz: all passed');
