'use strict';
/**
 * tests/test_unit18_textbook.js — the 교과서 pages of 18과 한국에 온 지 벌써 6개월이 되었어요.
 *
 * Thirteen pages off printed pp.202-221 and 57 rows, every one of them a sentence the chapter
 * itself prints — the dialogue on p.208, the plain-style passage on p.212, the grammar examples,
 * the radio programme at the back of the book, the homestay speech on p.216 and the 합니다체
 * review on p.221. Two thirds of them play the line off the tape.
 *
 * **The book's own questions come first.** The 듣고 말하기 and 읽고 쓰기 pages print eight
 * questions between them, and 모범 답안 on printed p.268 answers every one — 가을, 1년, 오후
 * 4시; (1), (3) and the sentence 주디 wants to say to her friends; (3), and 한국어를 잘 못했기
 * 때문에. Section 3 holds all eight.
 *
 * **What is not here.** The practice on all four grammar pages, both 말하기 연습, the 준비
 * questions, the 쓰기 half of 읽고 쓰기 and the whole of 과제 on pp.218-219 are the learner's
 * own and have nothing to mark. The chapter has no 자기 평가 page. And 문화 산책 prints 강소천's
 * 「눈 내리는 밤」, who died in 1963 — the poem is in copyright and stays in the book; the page
 * here is built from its frame alone, and section 4 holds it to a closed list of the frame's
 * own three sentences so that no line of verse can be added.
 *
 * **A wrong button has to be wrong.** 기억에 남은 것 is as good as 기억에 남는 것, and 시간이
 * 지나가는 것 같아요 as 지나간 것 같아요, so neither is offered as a mistake; section 2 pins those.
 * 친구들이 많이 아쉬울 것 같아요 was offered once and is pinned too: 아쉽다 can take the people
 * you will be short of, so it is not wrong enough to be a wrong button.
 *
 * Run: node tests/test_unit18_textbook.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tb = JSON.parse(read(path.join('worlds', 'unit18-textbook.json')));
const cass = JSON.parse(read(path.join('worlds', 'unit18-cassette.json')));
const ex = tb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;
const keyed = (row) => nfc(((row.choices || []).find((c) => c.id === row.answer) || {}).ko);
const page = (id) => ex.find((e) => e.id === id) || { items: [] };

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 18 · 교과서 — 18과 한국에 온 지 벌써 6개월이 되었어요');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(tb.id === 'unit18-textbook', 'the bank names itself');
assert(/Unit 18/.test(tb.source) && /202-221/.test(tb.source) && /p\.268/.test(tb.source),
  'and which pages it is: ' + tb.source);
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'the desk labels it 교과서');
assert(ex.length === 13, 'thirteen pages (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 57, 'fifty-seven rows across them (found ' + rows + ')');
const order = [...new Set(ex.map((e) => e.section))];
assert(order.join(' | ') === '어휘 | 문법과 표현 1 | 말하기 1 | 문법과 표현 2 | 말하기 2 | '
  + '듣고 말하기 | 읽고 쓰기 | 문화 산책 | 발음',
  'the sections run in the book’s own order and close on 발음, with no 자기 평가 (' + order.join(', ') + ')');
assert(ex.every((e) => /^u18sgk-/.test(e.id)), 'every page id opens with u18sgk-');
assert(new Set(ex.map((e) => e.id)).size === ex.length, 'and no id is used twice');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length,
  'section-plus-number is unique across the thirteen');
assert(new Set(ex.map((e) => e.noteEn)).size === ex.length, 'no two pages share a noteEn');
assert(ex.every((e) => String(e.noteEn || '').length >= 100), 'each of which says something');
assert(typeof tb.omittedNote === 'string' && tb.omittedNote.length > 200, 'the bank says what it leaves out');
['과제', 'pp.218-219', '쓰기', 'copyright', '자기 평가', '강소천'].forEach((needle) => {
  assert(tb.omittedNote.indexOf(needle) >= 0, 'omittedNote names ' + needle);
});
assert(typeof tb.artNote === 'string' && tb.artNote.length > 200 && /문법과 표현 1 연습 1/.test(tb.artNote),
  'and the art note says what the chapter’s drawings were carrying');

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
    if (!list.every((c) => /^[a-z][a-z0-9_]*$/.test(c.id))) faults.push(at + ': a choice id is not a plain romanised id');
    const win = list.find((c) => c.id === row.answer);
    if (!win) { faults.push(at + ': the keyed id is not one of the buttons'); return; }
    list.filter((c) => c.id !== row.answer && flat(c.ko).replace(/[?!.]/g, '') === flat(win.ko).replace(/[?!.]/g, ''))
      .forEach(() => faults.push(at + ': a wrong button is the right one respaced or repunctuated'));
    list.filter((c) => c.id !== row.answer && right.has(flat(c.ko)))
      .forEach((c) => faults.push(at + ': wrong button «' + c.ko + '» is another row’s right answer'));
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
const unquoted = [], silent = [];
ex.forEach((e) => e.items.forEach((row) => {
  const hay = flat(row.lines.map((l) => l.ko).join('') + (row.choices || []).map((c) => c.ko).join(''));
  const runs = flat(row.grammar).match(/[가-힣]{2,}/g) || [];
  if (!runs.some((run) => { for (let i = 0; i + 2 <= run.length; i++) if (hay.indexOf(run.substr(i, 2)) >= 0) return true; return false; })) {
    unquoted.push(e.id + ':' + row.n);
  }
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
// Wrong buttons that would be right Korean — considered for these rows and turned down while
// the pages were written, and pinned so a later edit cannot bring them in.
const pinned = [['u18sgk-vocab-1', 1, '아쉬울'], ['u18sgk-vocab-1', 5, '남은'], ['u18sgk-speak-1', 1, '지나가는'],
  ['u18sgk-gram-4', 2, '학교이다'], ['u18sgk-read-1', 3, '대하셨다'], ['u18sgk-read-1', 5, '늘어났다']];
const back = pinned.filter(([id, n, k]) => (page(id).items.find((r) => r.n === n) || { choices: [] })
  .choices.some((c) => c.ko === k)).map(([id, n, k]) => id + ':' + n + ' ' + k);
assert(back.length === 0, 'and no wrong button is one a Korean speaker would accept — 아쉬울, 기억에 남은 것, '
  + '지나가는 것 같아요, 학교이다, 대하셨다 and 늘어났다 are all good Korean' + (back.length ? ' — ' + back.join(', ') : ''));

// ── 3. The book's own questions, and 모범 답안 ────────────────────────────────
console.log('\n--- 3. The book’s own questions, and 모범 답안 (p.268) ---');
const KEY = [
  ['u18sgk-listen-1', 1, '가을'], ['u18sgk-listen-1', 2, '1년'], ['u18sgk-listen-1', 3, '오후 4시'],
  ['u18sgk-listen-2', 1, '일주일 후'],
  ['u18sgk-listen-2', 2, '여행을 조금밖에 못 해서 후회가 된다.'],
  ['u18sgk-listen-2', 3, '열심히 공부하고 열심히 놀아! 그리고 앞으로도 계속 연락하자!'],
  ['u18sgk-read-1', 1, '한국어를 전보다 잘하게 되었다.'],
  ['u18sgk-read-1', 2, '한국어를 잘 못했기 때문에']
];
KEY.forEach(([id, n, want]) => {
  const row = page(id).items.find((r) => r.n === n);
  assert(row && flat(keyed(row)) === flat(want),
    id + ' item ' + n + ' keys «' + want + '»' + (row ? '' : ' — no such row'));
});
// 듣기 2 question 2 prints its three statements, and the page's own ① and ② must be the two
// wrong buttons — the book's options, not the port's.
const q2 = page('u18sgk-listen-2').items[1];
assert(q2.choices.map((c) => c.ko).sort().join('|') === ['여행을 조금밖에 못 해서 후회가 된다.',
  '한 달 전에 부산에 간 적이 있다.', '친구들과 헤어지는 것이 아쉽다.'].sort().join('|'),
  'and 듣기 2 question 2 offers exactly the book’s three statements');
assert(page('u18sgk-listen-2').items[0].choices.map((c) => c.ko).join('|') === '일주일 후|한 달 후|일 년 후',
  'as question 1 offers the book’s three times');
const rq1 = page('u18sgk-read-1').items[0];
assert(rq1.choices.map((c) => c.ko).sort().join('|') === ['가족들을 만나러 한국에 왔다.',
  '이번에 한국에 처음 왔다.', '한국어를 전보다 잘하게 되었다.'].sort().join('|'),
  'and 읽기 question 1 its three');

// ── 4. 문화 산책: the frame, never the poem ───────────────────────────────────
console.log('\n--- 4. 문화 산책 ---');
const culture = ex.filter((e) => e.section === '문화 산책');
assert(culture.length === 1 && culture[0].items.length === 3, 'one 문화 산책 page of three rows');
assert(/강소천/.test(culture[0].noteEn) && /1963/.test(culture[0].noteEn) && /copyright/.test(culture[0].noteEn),
  'which says whose poem it is, when he died and that it is in copyright');
const FRAME = new Set(['여러분은 한국 시를 {} 있습니까?', '위 시와 같이 {} 시를 써 보세요.',
  '「눈 내리는 밤」은 어느 계절의 시입니까?', '{}']);
const shown = culture[0].items.reduce((a, r) => a.concat(r.lines.map((l) => l.ko)), []);
const foreign = shown.filter((t) => !FRAME.has(t));
assert(foreign.length === 0, 'every line on it is one of the frame’s own three sentences'
  + (foreign.length ? ' — ' + foreign.join(' | ') : ''));
const long = culture[0].items.reduce((a, r) => a.concat(r.choices.filter((c) => syl(c.ko) > 10).map((c) => c.ko)), []);
assert(long.length === 0, 'and no button on it is long enough to carry a line of verse'
  + (long.length ? ' — ' + long.join(' | ') : ''));
assert(culture[0].items.every((r) => !r.audio), 'and none of it plays — the page has no track');

// ── 5. The audio on a row is the audio of that row ───────────────────────────
console.log('\n--- 5. The audio ---');
const DICT = new Map(cass.dictation.items.map((i) => [i.audio.src, i]));
const TRACK = new Map(cass.tracks.map((t) => [t.src, t]));
const audio = [];
ex.forEach((e) => e.items.forEach((row) => { if (row.audio) audio.push({ e, row, a: row.audio }); }));
assert(audio.length === 38, 'thirty-eight rows play something (found ' + audio.length + ')');
const missing = audio.filter((x) => !fs.existsSync(path.join(ROOT, x.a.src))).map((x) => x.a.src);
assert(missing.length === 0, 'every file is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(audio.every((x) => x.a.labelEn), 'and every one is labelled');
assert(audio.every((x) => DICT.has(x.a.src) || TRACK.has(x.a.src)),
  'and each comes out of the Unit 18 cassette rather than from nowhere');
const mismatched = [], wrongMouth = [];
audio.forEach(({ e, row, a }) => {
  const d = DICT.get(a.src);
  if (!d) return;
  const filled = row.lines.map((l) => String(l.ko || '').replace('{}', keyed(row)));
  const k = filled.findIndex((t) => flat(t) === flat(d.ko));
  if (k < 0) mismatched.push(e.id + ':' + row.n + ' plays «' + d.ko + '»');
  else if (row.lines[k].who && d.who && row.lines[k].who !== d.who) {
    wrongMouth.push(e.id + ':' + row.n + ' says ' + row.lines[k].who + ', the tape says ' + d.who);
  }
});
assert(mismatched.length === 0, 'every line clip says exactly what its row prints'
  + (mismatched.length ? ' — ' + mismatched.slice(0, 4).join(' | ') : ''));
assert(wrongMouth.length === 0, 'and in the right mouth' + (wrongMouth.length ? ' — ' + wrongMouth.join(', ') : ''));
const whole = audio.filter((x) => TRACK.has(x.a.src));
assert(whole.length === 6, 'six rows play a whole track — the six questions about the programme ('
  + whole.length + ')');
assert(whole.every((x) => x.e.section === '듣고 말하기' && /Track 8[89]/.test(x.a.labelEn)),
  'all of them 듣고 말하기, each saying which track it is');

// ── 6. What the rows teach is what the chapter teaches ───────────────────────
console.log('\n--- 6. The four grammar points ---');
const answers = ex.map((e) => e.items.map((r) => keyed(r))).flat();
const copula = (x) => /(이다|이었다)$/.test(x) || /학교다$/.test(x);
const POINTS = [['V-(으)ㄴ 지', (x) => /[가-힣] 지$/.test(x)], ['N(이)나 2', (x) => /(이나|[가-힣]나)$/.test(x)],
  ['A-다, V-ㄴ다/는다', (x) => /다$/.test(x) && !copula(x)], ['N(이)다', copula]];
POINTS.forEach(([label, test]) => {
  const n = answers.filter(test).length;
  assert(n >= 4, 'the pages reach ' + label + ' ' + n + ' times');
});
// The 발음 page teaches no rule of its own, so its five rows are five different ones.
const pron = ex.find((e) => e.section === '발음');
assert(pron.items.length === 5, '발음 has five rows (' + pron.items.length + ')');
[['[장년]', 1], ['[할 쑤가]', 2], ['[마니]', 3], ['[모탄]', 4], ['[가족꽈]', 5]].forEach(([want, n]) => {
  const row = pron.items.find((r) => r.n === n);
  assert(row && keyed(row) === want, '발음 ' + n + ' keys ' + want + (row ? '' : ' — no row'));
});
assert(pron.items.every((r) => r.audio && /2b-u18-d(69|7\d|80)\.mp3$/.test(r.audio.src)),
  'and every one plays its own line off track 90');
assert(/no new pronunciation rule/.test(pron.noteEn), 'and the page says it has no rule of its own');
const vocab = ex.filter((e) => e.section === '어휘');
assert(vocab.length === 2 && vocab.every((e) => e.items.length === 5), 'two 어휘 pages of five rows');
assert(vocab[0].items.every((r) => r.audio) && vocab[1].items.every((r) => r.audio),
  'and every one of their ten rows plays');

// ── 7. Wiring and production ─────────────────────────────────────────────────
console.log('\n--- 7. Wiring and production ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit18World\(\)\) return '\/worlds\/unit18-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 18 to its own 교과서');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("'unit18-textbook'") >= 0, 'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit18-textbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit18-textbook.json') >= 0,
  'and the example corpus can quote it');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let accepted = null;
try { accepted = validateWorkbook(JSON.parse(JSON.stringify(tb)), 'worlds/unit18-textbook.json'); } catch (e) {
  accepted = { error: e.message };
}
assert(accepted && !accepted.error && accepted.exercises.length === 13,
  'the shared validator accepts the bank as it stands' + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit18-textbook.json'), 'the bank publishes');
const absent = [...new Set(audio.map((x) => x.a.src))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and every file it plays goes up with it'
  + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit18_textbook: all passed');
