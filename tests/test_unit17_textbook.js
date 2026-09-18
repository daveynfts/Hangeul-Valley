'use strict';
/**
 * tests/test_unit17_textbook.js — the 교과서 pages of 17과 비행기를 놓칠 뻔했어요.
 *
 * Fourteen pages off printed pp.180-199 and 60 rows, every one of them a sentence the
 * chapter itself prints — the two dialogues, the twelve grammar examples, the notice on
 * p.194, the culture note on p.197 and the 발음 sentences on p.198. Half of them play the
 * line off the tape.
 *
 * **This chapter is carried by its pictures more than most.** 어휘 1 is eight drawings of
 * things going wrong, 어휘 2 and 3 are colour and pattern swatches, and three of the
 * exercises on pp.192-195 ask the learner to pick a photograph or a drawing. None of that
 * survives a greyscale scan. So every one of those questions is asked in words instead — the
 * three photographs of a camera as their two colours, the three drawings of a burglar as the
 * clothes he is wearing — and 모범 답안 on printed p.268 is what settles them. Section 3
 * holds those answers.
 *
 * **What is not here.** Five things on these twenty pages have no answer to mark: three pair
 * activities, two free-speaking pages and the 쓰기 half of 읽고 쓰기. The whole of 과제 on
 * p.196 goes with them — it is a group activity with picture cards from the worksheet pages
 * and the book prints only the instructions. `omittedNote` names all of it, and section 1
 * asserts it still does.
 *
 * **The audio rule.** A clip is only worth attaching if what it plays is what the row
 * prints. Section 4 fills each row's gap with its own keyed answer and requires the result to
 * be one of that row's lines, word for word, spoken by the person the row names. The 발음
 * rows are why it is "one of the lines" and not "the line with the gap": they print the
 * sentence on one line and ask for its pronunciation on the next, and the clip plays the
 * sentence.
 *
 * Run: node tests/test_unit17_textbook.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tb = JSON.parse(read(path.join('worlds', 'unit17-textbook.json')));
const cass = JSON.parse(read(path.join('worlds', 'unit17-cassette.json')));
const ex = tb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const keyed = (row) => nfc(((row.choices || []).find((c) => c.id === row.answer) || {}).ko);

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 17 · 교과서 — 17과 비행기를 놓칠 뻔했어요');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(tb.id === 'unit17-textbook', 'the bank names itself');
assert(/Unit 17/.test(tb.source) && /180-199/.test(tb.source), 'and which pages it is: ' + tb.source);
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'the desk labels it 교과서');
assert(ex.length === 14, 'fourteen pages (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 60, 'sixty rows across them (found ' + rows + ')');
const order = [...new Set(ex.map((e) => e.section))];
assert(order.join(' | ') === '어휘 | 문법과 표현 1 | 말하기 1 | 문법과 표현 2 | 말하기 2 | '
  + '듣고 말하기 | 읽고 쓰기 | 문화 산책 | 발음 | 자기 평가',
  'the sections run in the book’s own order (' + order.join(', ') + ')');
assert(ex.every((e) => /^u17sgk-/.test(e.id)), 'every page id opens with u17sgk-');
assert(new Set(ex.map((e) => e.id)).size === ex.length, 'and no id is used twice');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length,
  'section-plus-number is unique across the fourteen');
// No two pages may explain themselves with the same words — a copied noteEn is a page that
// was never written.
assert(new Set(ex.map((e) => e.noteEn)).size === ex.length, 'and no two pages share a noteEn');
assert(ex.every((e) => String(e.noteEn || '').length >= 100), 'each of which says something');

assert(typeof tb.omittedNote === 'string' && tb.omittedNote.length > 200,
  'the bank says what it leaves out');
['과제', 'p.196', 'p.187', 'p.195'].forEach((needle) => {
  assert(tb.omittedNote.indexOf(needle) >= 0, 'omittedNote names ' + needle);
});
assert(typeof tb.artNote === 'string' && /p\.268/.test(tb.artNote),
  'and the art note says where the answers to the picture questions came from');

// ── 2. Every row is answerable, and only one way ─────────────────────────────
console.log('\n--- 2. Every row is answerable ---');
const faults = [];
ex.forEach((e) => {
  const right = new Set(e.items.map((row) => flat(keyed(row))));
  e.items.forEach((row) => {
    const at = e.id + ' item ' + row.n;
    const gapLine = row.lines.find((l) => String(l.ko || '').indexOf('{}') >= 0);
    const gaps = row.lines.reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
    if (gaps !== 1) faults.push(at + ': ' + gaps + ' blanks, want exactly 1');
    const list = row.choices || [];
    if (list.length < 3) faults.push(at + ': only ' + list.length + ' buttons');
    if (new Set(list.map((c) => flat(c.ko))).size !== list.length) faults.push(at + ': a button repeats');
    if (new Set(list.map((c) => c.id)).size !== list.length) faults.push(at + ': a choice id repeats');
    const win = list.find((c) => c.id === row.answer);
    if (!win) { faults.push(at + ': the keyed id is not one of the buttons'); return; }
    list.filter((c) => c.id !== row.answer && flat(c.ko) === flat(win.ko))
      .forEach(() => faults.push(at + ': a wrong button is the right one respaced'));
    list.filter((c) => c.id !== row.answer && right.has(flat(c.ko)))
      .forEach((c) => faults.push(at + ': wrong button «' + c.ko + '» is another row’s right answer'));
    // phraseKo is the label in the page list. It shows where the gap falls, except on the
    // multiple-choice rows the 듣기 and 읽기 pages print, whose whole line IS the gap.
    const whole = gapLine && flat(gapLine.ko) === '{}';
    if (!row.phraseKo) faults.push(at + ': no phraseKo');
    else if (!whole && row.phraseKo.indexOf('___') < 0) faults.push(at + ': phraseKo hides the gap');
    else if (whole && row.phraseKo.indexOf('___') >= 0) faults.push(at + ': phraseKo shows a gap the row has not got');
    if (!row.en || !row.why || !row.grammar) faults.push(at + ': missing prose');
    if (String(row.why).length < 80) faults.push(at + ': why too thin');
  });
});
assert(faults.length === 0, 'every row has three distinct buttons, one gap and its prose'
  + (faults.length ? ' — ' + faults.slice(0, 5).join(', ') : ''));

// The same two prose rules the 익힘책 is held to: a note that quotes nothing on its own row
// was written for a different one, and a note shown after checking has to mention a button
// that was on the screen.
const unquoted = [], silent = [];
ex.forEach((e) => e.items.forEach((row) => {
  const hay = flat(row.lines.map((l) => l.ko).join('') + (row.choices || []).map((c) => c.ko).join(''));
  const runs = flat(row.grammar).match(/[가-힣]{2,}/g) || [];
  if (!runs.some((run) => {
    for (let i = 0; i + 2 <= run.length; i++) if (hay.indexOf(run.substr(i, 2)) >= 0) return true;
    return false;
  })) unquoted.push(e.id + ':' + row.n);
  const why = flat(row.why);
  if (!(row.choices || []).map((c) => flat(c.ko)).some((b) => {
    if (b.length <= 4) return why.indexOf(b) >= 0;
    for (let i = 0; i + 4 <= b.length; i++) if (why.indexOf(b.substr(i, 4)) >= 0) return true;
    return false;
  })) silent.push(e.id + ':' + row.n);
}));
assert(unquoted.length === 0, 'every grammar note quotes something from its own row'
  + (unquoted.length ? ' — ' + unquoted.join(', ') : ''));
assert(silent.length === 0, 'and every note quotes at least one of its own buttons'
  + (silent.length ? ' — ' + silent.join(', ') : ''));

// ── 3. The questions the pictures used to ask ────────────────────────────────
// Three of the book's questions are printed as pictures to tick, and 모범 답안 on p.268 gives
// (3), (1)+(3), (3) and (2) for them. Each is written out here in the words that separate the
// pictures, and the row has to key the one the key gives.
console.log('\n--- 3. The picture questions, and 모범 답안 ---');
const PICTURE = [
  ['u17sgk-listen-1', 1, '외국인등록증을 다시 받으려면 여권이 있어야 합니다.'],
  ['u17sgk-listen-1', 2, '가방과 외국인등록증'],
  ['u17sgk-listen-2', 1, '여자가 집에 왔을 때 문이 열려 있었습니다.'],
  ['u17sgk-listen-2', 2, '하얀색 티셔츠에 까만색 바지, 회색 모자'],
  ['u17sgk-read-1', 1, '까만색 카메라에 빨간색 끈이 달려 있는 사진']
];
PICTURE.forEach(([id, n, want]) => {
  const row = (ex.find((e) => e.id === id) || { items: [] }).items.find((r) => r.n === n);
  assert(row && flat(keyed(row)) === flat(want),
    id + ' item ' + n + ' keys «' + want + '»' + (row ? ' (keys «' + keyed(row) + '»)' : ' — no such row'));
});
// The 분실물 신고 form, all four boxes, straight off p.268.
const FORM = ['카메라(ASD500)', '7월 20일', '4층 교실', '히엔 010-0880-5488'];
const readEx = ex.find((e) => e.id === 'u17sgk-read-1');
FORM.forEach((want, i) => {
  const row = readEx.items[i + 1];
  assert(row && flat(keyed(row)) === flat(want),
    '분실물 신고 box ' + (i + 1) + ' keys «' + want + '»' + (row ? ' (keys «' + keyed(row) + '»)' : ''));
});
// The 자기 평가 answers are printed upside down at the foot of p.199, and the second of them
// ends -네요 rather than -어요, which is the whole reason it is worth pinning.
const CHECK = ['모셔다 드렸어요', '놓칠 뻔했네요', '앉아 있는'];
const checkEx = ex.find((e) => e.section === '자기 평가');
assert(checkEx.items.length === 3, '자기 평가 has three rows, one per form in its box');
CHECK.forEach((want, i) => {
  assert(flat(keyed(checkEx.items[i])) === flat(want),
    '자기 평가 ' + (i + 1) + ' keys «' + want + '» (keys «' + keyed(checkEx.items[i]) + '»)');
});
// The box prints three forms and uses each exactly once, so a row that keys the wrong one
// leaves another row short.
const FORMS = [[/다 드렸|다 주었/, 'V-아다/어다 주다'], [/뻔했/, 'V-(으)ㄹ 뻔하다'], [/아 있|어 있/, 'V-아/어 있다']];
FORMS.forEach(([re, label]) => {
  const n = checkEx.items.filter((row) => re.test(keyed(row))).length;
  assert(n === 1, '자기 평가 uses ' + label + ' exactly once (' + n + ')');
});
assert(/ㅎ|불규칙|checklist|word list/.test(checkEx.noteEn),
  'and the page note says why the ㅎ-irregular is not in that box');

// ── 4. The audio on a row is the audio of that row ───────────────────────────
console.log('\n--- 4. The audio ---');
const DICT = new Map(cass.dictation.items.map((i) => [i.audio.src, i]));
const TRACK = new Map(cass.tracks.map((t) => [t.src, t]));
const audio = [];
ex.forEach((e) => e.items.forEach((row) => { if (row.audio) audio.push({ e, row, a: row.audio }); }));
assert(audio.length === 31, 'thirty-one rows play something (found ' + audio.length + ')');
const missing = audio.filter((x) => !fs.existsSync(path.join(ROOT, x.a.src))).map((x) => x.a.src);
assert(missing.length === 0, 'every file is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(audio.every((x) => x.a.labelEn), 'and every one is labelled');
const fromBank = audio.filter((x) => DICT.has(x.a.src) || TRACK.has(x.a.src));
assert(fromBank.length === audio.length,
  'and each comes out of the Unit 17 cassette rather than from nowhere ('
  + (audio.length - fromBank.length) + ' strays)');
// The real check: what the clip says has to be what the row prints, once the gap is filled
// with the row's own answer.
const mismatched = [], wrongMouth = [];
audio.forEach(({ e, row, a }) => {
  const d = DICT.get(a.src);
  if (!d) return;                      // a whole track, checked below instead
  const filled = row.lines.map((l) => String(l.ko || '').replace('{}', keyed(row)));
  const k = filled.findIndex((t) => flat(t) === flat(d.ko));
  if (k < 0) mismatched.push(e.id + ':' + row.n + ' plays «' + d.ko + '»');
  else if (row.lines[k].who && d.who && row.lines[k].who !== d.who) {
    wrongMouth.push(e.id + ':' + row.n + ' says ' + row.lines[k].who + ', the tape says ' + d.who);
  }
});
assert(mismatched.length === 0, 'every line clip says exactly what its row prints'
  + (mismatched.length ? ' — ' + mismatched.slice(0, 4).join(' | ') : ''));
assert(wrongMouth.length === 0, 'and in the right mouth'
  + (wrongMouth.length ? ' — ' + wrongMouth.join(', ') : ''));
// The four rows that play a whole track are the four comprehension questions, which have no
// one line to play.
const whole = audio.filter((x) => TRACK.has(x.a.src));
assert(whole.length === 4, 'four rows play a whole track (' + whole.length + ')');
assert(whole.every((x) => x.e.section === '듣고 말하기'),
  'and all four of them are 듣고 말하기 comprehension questions');
assert(whole.every((x) => /Track 7[89]/.test(x.a.labelEn)), 'each saying which track it is');

// ── 5. What the rows teach is what the chapter teaches ───────────────────────
console.log('\n--- 5. The four grammar points ---');
const answers = ex.map((e) => e.items.map((r) => keyed(r))).flat();
const POINTS = [['V-아다/어다 주다', /다 주|다 드/], ['V-(으)ㄹ 뻔하다', /뻔했/],
  ['ㅎ 불규칙', /파랗|파래|파란|노랗|노란|빨갛|빨개|까맣|까만|까매|하얗|하얀|하얘|그래|어떤/],
  ['V-아/어 있다', /어 있|아 있|여 있|려 있/]];
POINTS.forEach(([label, re]) => {
  const n = answers.filter((a) => re.test(a)).length;
  assert(n >= 4, 'the pages reach ' + label + ' ' + n + ' times');
});
// The 발음 page is the other half of Unit 16's rule, and all four of its words are keyed as
// pronunciations rather than spellings.
const pron = ex.find((e) => e.section === '발음');
assert(pron.items.length === 5, '발음 has the rule and four sentences (' + pron.items.length + ')');
[['[ㄹ]', 1], ['[할라산]', 2], ['[펼리]', 3], ['[실림동]', 4], ['[열락]', 5]].forEach(([want, n]) => {
  const row = pron.items.find((r) => r.n === n);
  assert(row && keyed(row) === want, '발음 ' + n + ' keys ' + want + (row ? ' (keys ' + keyed(row) + ')' : ''));
});
assert(pron.items.slice(1).every((r) => r.audio), 'and every sentence on it plays');
// The two 어휘 pages between them have to reach the accident words and the colour words,
// because the book's own 어휘 spread is pictures and this is what replaces it.
const vocab = ex.filter((e) => e.section === '어휘');
assert(vocab.length === 2, 'two 어휘 pages (' + vocab.length + ')');
const vAnswers = vocab.map((e) => e.items.map((r) => keyed(r))).flat();
assert(vAnswers.filter((a) => /잃어버|놓칠|사고가|고장이|두고/.test(a)).length === 5,
  'the first covers five different mishaps');
assert(vAnswers.filter((a) => /색$|무늬$/.test(a)).length === 5,
  'and the second five colours and patterns');

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. Wiring and production ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit17World\(\)\) return '\/worlds\/unit17-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 17 to its own 교과서');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("'unit17-textbook'") >= 0,
  'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit17-textbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit17-textbook.json') >= 0,
  'and the example corpus can quote it');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let accepted = null;
try { accepted = validateWorkbook(JSON.parse(JSON.stringify(tb)), 'worlds/unit17-textbook.json'); } catch (e) {
  accepted = { error: e.message };
}
assert(accepted && !accepted.error && accepted.exercises.length === 14,
  'the shared validator accepts the bank as it stands'
  + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit17-textbook.json'), 'the bank publishes');
const absent = [...new Set(audio.map((x) => x.a.src))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and every file it plays goes up with it'
  + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit17_textbook: all passed');
