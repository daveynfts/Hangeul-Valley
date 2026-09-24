'use strict';
/**
 * tests/test_unit12_desk_quiz.js — the study desk of 12과 저는 좀 조용한 편이에요.
 *
 * Seventeen questions, ten to a sitting, so two sittings are never the same ten. The quiz was
 * written after both exercise banks, so it is revision rather than a third syllabus: by the time
 * a learner opens it they have done 70 rows in the 익힘책 and 73 in the 교과서, and a question
 * here has to be about a rule rather than about a sentence. Section 3 checks that from both
 * sides — no button is a sentence either bank already gaps, and no wrong button is an answer
 * either bank keys.
 *
 * Section 2 pins the answer to each of the things this chapter is easiest to get wrong: 보이다
 * against 보다, a noun needing 처럼 before 보이다, 같이 against 같은 and why only one is written
 * closed up, which words take -는 편이다, why 마르다 gives 마른 편, what the 편 of 편이다 is, the
 * ㅂ that 귀엽게 keeps, the two ㄻ rules and the ㄼ of 짧게, and what a Korean means by 붕어빵.
 * One question is there to undo a falsehood: 젊게 보여요 is good Korean beside 젊어 보여요.
 *
 * Run: node tests/test_unit12_desk_quiz.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const bank = JSON.parse(read(path.join('worlds', 'unit12-desk-quiz.json')));
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
console.log('2B UNIT 12 · 학습 책상 — 12과 저는 좀 조용한 편이에요');
console.log('====================================================');

// ── 1. The bank ──────────────────────────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(bank.titleKo === '학습 책상', 'the desk labels itself 학습 책상');
assert(typeof bank.titleEn === 'string' && bank.titleEn.length > 4, 'and carries an English title: ' + bank.titleEn);
assert(qs.length === 17, 'seventeen questions (found ' + qs.length + ')');
assert(bank.sessionSize === 10 && qs.length > bank.sessionSize, 'ten of them to a sitting, so two sittings are never the same ten');
assert(qs.every((q, k) => q.id === k + 1), 'numbered 1 to 17 in order');
const shape = [];
qs.forEach((q) => {
  const keys = Object.keys(q.choices || {}).sort().join('');
  if (keys !== 'ABCD') shape.push('q' + q.id + ' choices are ' + (keys || 'missing'));
  if (!q.choices || !q.choices[q.a]) shape.push('q' + q.id + ' answer ' + q.a + ' is not a choice');
  const vals = Object.values(q.choices || {});
  if (new Set(vals.map(flat)).size !== vals.length) shape.push('q' + q.id + ' repeats an option');
  if (String(q.q).length < 25) shape.push('q' + q.id + ' has a stem too short to be a question');
});
assert(shape.length === 0, 'every row has four distinct options and keys one of them' + (shape.length ? ' — ' + shape.join(', ') : ''));
assert(new Set(qs.map((q) => q.q)).size === qs.length, 'and no two questions share a stem');
const letters = qs.map((q) => q.a);
const spread = {};
letters.forEach((k) => { spread[k] = (spread[k] || 0) + 1; });
assert(Object.keys(spread).length === 4 && Math.max(...Object.values(spread)) <= Math.ceil(qs.length / 3),
  'the answers use all four letters and none carries more than a third — ' + ['A', 'B', 'C', 'D'].map((k) => k + '×' + spread[k]).join(' '));
let repeating = false;
for (let p = 1; p <= 4; p++) if (letters.every((l, i) => i < p || l === letters[i - p])) repeating = true;
assert(!repeating, 'and the key is not a pattern that repeats (' + letters.join('') + ')');
const lopsided = qs.filter((q) => {
  const lens = Object.values(q.choices).map((v) => nfc(v).length).sort((a, b) => a - b);
  return lens[3] > lens[0] * 3 && lens[3] - lens[2] > 12;
}).map((q) => q.id);
assert(lopsided.length === 0, 'and no row has one option so much longer than the rest that it gives itself away'
  + (lopsided.length ? ' — q' + lopsided.join(', q') : ''));
// Picking the longest option is the oldest test-taking trick. With four options chance puts the
// right one longest about a quarter of the time; more than that and the trick starts to pay.
const longest = qs.filter((q) => {
  const lens = Object.entries(q.choices).map(([k, v]) => [k, nfc(v).length]);
  const max = Math.max(...lens.map((l) => l[1]));
  return lens.filter((l) => l[1] === max).length === 1 && nfc(q.choices[q.a]).length === max;
}).map((q) => q.id);
assert(longest.length <= Math.ceil(qs.length / 4), 'the right answer is the longest option on ' + longest.length
  + ' of ' + qs.length + ' rows, no more often than chance would put it there');

// ── 2. It revises this chapter ───────────────────────────────────────────────
console.log('\n--- 2. It revises this chapter ---');
const find = (re) => qs.find((q) => re.test(q.q));
const pin = (re, want, msg) => {
  const q = find(re);
  assert(!!q && key(q) === want, msg + (q ? ' (keys «' + key(q) + '»)' : ' — no such question'));
};
pin(/say that 좋아요 does not/, 'that the speaker is judging by how it looks', '보이다 is a judgement from how something looks');
pin(/both have a 보/, '먹어 봐요 is try eating it; 맛있어 보여요 is it looks tasty', '보다 is trying; 보이다 is looking');
pin(/is 젊게 보여요 wrong/, 'No — both are good Korean', '젊게 보여요 is good Korean, and the quiz says so');
pin(/university student/, '대학생처럼 보여요', 'a noun takes 처럼 before 보이다');
pin(/which pair fills the two gaps/, '같이 · 같은', '같이 goes before a verb, 같은 before a noun');
pin(/written closed up/, '처럼 is a particle; 같은 is 같다', 'and that is why only one of them is written apart');
pin(/takes -는 편이다 rather than/, '잘 먹다', 'a verb takes -는 편이다');
pin(/말이 없다 and 재미있다/, '-는, as verbs do', '있다/없다 take -는 too');
pin(/마른 편이에요 when 마르다 is a verb/, 'being thin is the result of 마르다',
  '마르다 gives 마른 편, because being thin is its result');
pin(/what kind of word is 편/, 'a noun meaning side, plus 이다', 'the 편 of 편이다 is a noun, not 편하다');
pin(/귀엽다 keep its ㅂ/, 'ㅂ changes only before a vowel', '귀엽게 keeps its ㅂ before a consonant');
pin(/짧게 pronounced/, '[짤께]', '짧게 is [짤께]');
pin(/ㄻ before a consonant/, '[ㅁ]', 'ㄻ before a consonant leaves [ㅁ]');
pin(/닮았어요 pronounced/, '[달마써요]', 'and before a vowel both letters are heard: [달마써요]');
pin(/붕어빵이네/, 'that you look like someone in it', '붕어빵 is someone’s spitting image');
pin(/asks only for a trim/, '조금만 다듬어 주세요', '다듬다 is a trim');
pin(/reads alone while everyone/, '내성적이다', 'and someone keeping to themselves is 내성적이다');
// 짭께 is the only wrong sound here worth a note: ㄼ is read [ㅂ] in 밟다 and nowhere near 짧다.
assert(Object.values(find(/짧게 pronounced/).choices).indexOf('[짭께]') >= 0, 'the 짧게 row offers [짭께], the ㄼ of 밟다');
const good = qs.filter((q) => Object.entries(q.choices).some(([k, v]) => k !== q.a && /[가-힣]게 보(여|이)/.test(v)));
assert(good.length === 0, 'and no wrong option anywhere is A-게 보이다 — it is good Korean');

// ── 3. It is not a third copy of the two banks ───────────────────────────────
console.log('\n--- 3. Not a third copy of the two banks ---');
const drilled = new Set();
const keyed = new Set();
let drilledRows = 0;
['worlds/unit12-textbook.json', 'worlds/unit12-workbook.json'].forEach((rel) => {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), rel + ' is on disk to compare against');
  if (!fs.existsSync(full)) return;
  JSON.parse(fs.readFileSync(full, 'utf8')).exercises.forEach((ex) => (ex.items || []).forEach((it) => {
    drilledRows++;
    const one = ((it.choices || []).find((c) => c.id === it.answer) || {}).ko || '';
    const two = ((it.choices2 || []).find((c) => c.id === it.answer2) || {}).ko || '';
    [one, two].filter(Boolean).forEach((k) => keyed.add(flat(k)));
    const words = [one, two].filter(Boolean);
    let k = 0;
    drilled.add(flat((it.lines || []).map((l) => String(l.ko).replace(/\{\}/g, () => words[k++] || '')).join(' ')));
  }));
});
assert(drilledRows === 143, 'the two banks between them hold 143 rows (' + drilledRows + ')');
const repeats = [], liars = [];
qs.forEach((q) => Object.keys(q.choices || {}).forEach((k) => {
  if (drilled.has(flat(q.choices[k]))) repeats.push('q' + q.id + k);
  if (k !== q.a && keyed.has(flat(q.choices[k]))) liars.push('q' + q.id + k + ' ' + q.choices[k]);
}));
assert(repeats.length === 0, 'no button on this desk is a sentence either of them already gaps' + (repeats.length ? ' — ' + repeats.join(', ') : ''));
assert(liars.length === 0, 'and no wrong button here is an answer either of them keys' + (liars.length ? ' — ' + liars.join(', ') : ''));

// ── 4. The artwork it has not got ────────────────────────────────────────────
console.log('\n--- 4. The artwork ---');
assert(typeof bank.artNote === 'string' && bank.artNote.length > 150 && /answerable/.test(bank.artNote),
  'the bank records why it carries no pictures yet, and that none is needed to answer');
assert(qs.every((q) => !q.art), 'so no row claims a picture');

// ── 5. Wiring, translation and production ────────────────────────────────────
console.log('\n--- 5. Wiring ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit12World\(\)\) return '\/worlds\/unit12-desk-quiz\.json'/.test(ui), 'deskQuizUrl resolves Unit 12 to its own bank');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit12-desk-quiz.json'") >= 0, 'it is a translatable source');
assert(read(path.join('scripts', 'ttsClips.js')).indexOf('worlds/unit12-desk-quiz.json') >= 0, 'the TTS harvest reads it');
assert(/QUIZ_UNITS = \[[^\]]*'unit12'/.test(read(path.join('admin', 'lib', 'content.js'))), 'the admin panel lists it');
assert(read(path.join('admin', 'public', 'js', 'world.js')).indexOf("quiz: 'quiz/unit12'") >= 0, 'with a route to open it on');
const { validateQuiz } = require(path.join(ROOT, 'admin', 'lib', 'world.js'));
let accepted = null;
try { accepted = validateQuiz(JSON.parse(JSON.stringify(bank))); } catch (e) { accepted = { error: e.message }; }
assert(accepted && !accepted.error && accepted.questions.length === 17 && accepted.sessionSize === 10,
  'the shared validator accepts the bank as it stands and keeps the session at ten'
  + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const lib = require(path.join(ROOT, 'admin', 'lib', 'i18n.js'));
const scanned = lib.scanSource(ROOT, 'worlds/unit12-desk-quiz.json').strings;
const vi = lib.readCatalog(ROOT, 'worlds/unit12-desk-quiz.json', 'vi').entries;
const untranslated = scanned.filter((s) => !vi[s.key]).map((s) => s.key);
assert(scanned.length > 40 && untranslated.length === 0,
  'every one of its ' + scanned.length + ' English strings has its Vietnamese' + (untranslated.length ? ' — ' + untranslated.slice(0, 3).join(' | ') : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit12-desk-quiz.json') && batch.has('locales/vi/worlds/unit12-desk-quiz.json'),
  'the bank and its catalogue publish');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit12_desk_quiz: all passed');
