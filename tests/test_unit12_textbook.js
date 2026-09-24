'use strict';
/**
 * tests/test_unit12_textbook.js — the 교과서 pages of 12과 저는 좀 조용한 편이에요.
 *
 * Sixteen pages off printed pp.68-87 and 73 rows, covering all eleven headed sections of the
 * chapter. Unit 12 was the one unit of nine whose desk had a 익힘책 and nothing else; this bank
 * and tests/test_unit12_desk_quiz.js are what closed that gap.
 *
 * What is checked:
 *
 *   1. The book's own questions keep the book's own answers. 모범 답안 on printed p.267 gives
 *      12과 two — ② for 듣기 1 and ④ for 듣기 2 — and the 자기 평가 page prints its four upside
 *      down: 피곤해 보여요, 즐겁게, 잘 먹는 편이에요, 한국 사람처럼. Section 3 holds all six, and
 *      that the 자기 평가 box's four forms are used once each.
 *   2. The audio on a row is the audio of that row: every dictation clip a row names says one of
 *      the row's own lines, in the right mouth (section 4).
 *   3. The 발음 pages are about 받침 ㄻ and not about spelling. Section 5 reads the syllables off
 *      the Unicode index and recomputes what each keyed pronunciation must be — [ㅁ] and a tensed
 *      ㄱ/ㄷ/ㅅ/ㅈ before a consonant, both letters before a vowel — and that no wrong button is it.
 *   4. The two books stay apart (section 6): no shared exercise id, no shared gapped sentence, no
 *      answer keyed in both, and no wrong button here that the 익힘책 keys as right.
 *
 * **A wrong button has to be wrong.** Several forms that a grammar page might be tempted to mark
 * wrong are good Korean, and section 2 pins them out of this bank for good: A-게 보이다 (the
 * National Institute of Korean Language accepts 젊게 보이다 beside 젊어 보이다), 정확히 beside
 * 정확하게, 편이어서 beside 편이라서, 어리어 beside 어려, 멋지게, 대학생으로 보여요 and 닮는 편.
 *
 * One page breaks the rule that a wrong button must not be another row's right answer, and it is
 * named rather than quietly exempted: 어휘 2 puts six personality words under six drawings, and a
 * drawing's wrong word is the drawing opposite it — so the check runs from the other side there:
 * every button on that page is one of the page's six words.
 *
 * Run: node tests/test_unit12_textbook.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const tb = readJson(path.join('worlds', 'unit12-textbook.json'));
const wb = readJson(path.join('worlds', 'unit12-workbook.json'));
const cass = readJson(path.join('worlds', 'unit12-cassette.json'));
const ex = tb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const loose = (s) => nfc(s).replace(/[\s.,?!…()[\]'"‘’“”·⟶~-]/g, '');
const keyed = (row) => nfc(((row.choices || []).find((c) => c.id === row.answer) || {}).ko);
const page = (id) => ex.find((e) => e.id === id) || { items: [] };

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 12 · 교과서 — 12과 저는 좀 조용한 편이에요');
console.log('====================================================');

// ── 1. The bank ──────────────────────────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(tb.id === 'unit12-textbook', 'the bank names itself');
assert(/Unit 12/.test(tb.source) && /pp\.68-87/.test(tb.source) && /p\.267/.test(tb.source) && /교과서/.test(tb.source),
  'and which book, pages and answer key it is from: ' + tb.source);
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'the desk labels it 교과서');
assert(ex.length === 16, 'sixteen pages (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 73, 'seventy-three rows across them (found ' + rows + ')');
const ORDER = ['어휘', '문법과 표현 1', '말하기 1', '문법과 표현 2', '말하기 2', '듣고 말하기', '읽고 쓰기',
  '과제', '문화 산책', '발음', '자기 평가'];
const order = [...new Set(ex.map((e) => e.section))];
assert(order.join(' | ') === ORDER.join(' | '),
  'all eleven headed sections of the chapter, in the book’s own order (' + order.join(', ') + ')');
assert(ex.every((e) => /^u12sgk-/.test(e.id)), 'every page id opens with u12sgk-');
assert(new Set(ex.map((e) => e.id)).size === ex.length, 'and no id is used twice');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length, 'section-plus-number is unique across the sixteen');
assert(new Set(ex.map((e) => e.noteEn)).size === ex.length && ex.every((e) => String(e.noteEn || '').length >= 100),
  'every page says how it differs from the printed one, and no two say the same thing');
assert(ex.every((e) => e.type === 'build'), 'every page is a build page, one blank per row');
assert(typeof tb.omittedNote === 'string' && tb.omittedNote.length > 300, 'the bank says what it leaves out');
['준비', '말하기 1 연습 2', '말하기 2 연습 2', 'p.81', '쓰기', '과제', '생각 나누기', '자기 평가 1', 'p.82', '모범'].forEach((needle) => {
  if (needle === '모범') return;
  assert(tb.omittedNote.indexOf(needle) >= 0, 'omittedNote names ' + needle);
});
assert(typeof tb.artNote === 'string' && tb.artNote.length > 300 && /그림/.test(tb.artNote) && /듣기 2/.test(tb.artNote),
  'and the art note says what the chapter’s pictures were carrying, and what stands in for them');

// ── 2. Every row is answerable, and only one way ─────────────────────────────
console.log('\n--- 2. Every row is answerable ---');
const SHARED_SET = 'u12sgk-vocab-2';
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
    list.filter((c) => c.id !== row.answer && loose(c.ko) === loose(win.ko))
      .forEach(() => faults.push(at + ': a wrong button is the right one respaced or repunctuated'));
    if (e.id !== SHARED_SET) {
      list.filter((c) => c.id !== row.answer && right.has(flat(c.ko)))
        .forEach((c) => faults.push(at + ': wrong button «' + c.ko + '» is another row’s right answer'));
    }
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
// The one page whose wrong buttons are its other rows' answers, checked from the other side.
const SIX = ['활발', '내성적', '꼼꼼', '남성적', '여성적', '급'];
const setButtons = page(SHARED_SET).items.reduce((a, r) => a.concat(r.choices.map((c) => c.ko)), []);
assert(setButtons.length === 12 && setButtons.every((b) => SIX.some((w) => b.indexOf(w) === 0)),
  '어휘 2’s buttons are all one of the page’s six personality words (' + setButtons.length + ')');
assert(page(SHARED_SET).items.every((r) => r.lines[0].who === '그림'),
  'and every row there says in words what its drawing shows');
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
assert(unquoted.length === 0, 'every grammar note quotes something from its own row' + (unquoted.length ? ' — ' + unquoted.join(', ') : ''));
assert(silent.length === 0, 'and every note quotes at least one of its own buttons' + (silent.length ? ' — ' + silent.join(', ') : ''));
assert(new Set(ex.flatMap((e) => e.items.map((r) => r.why))).size === rows, 'no two rows carry the same note');
// Forms a Korean speaker would accept, never offered as mistakes anywhere on these pages.
const GOOD_KOREAN = [
  [/[가-힣]게 보(이|여)/, 'A-게 보이다 — 젊게 보여요 is as good as 젊어 보여요'],
  [/^정확히/, '정확히 is as good as 정확하게'], [/편이어서/, '편이어서 is as good as 편이라서'],
  [/어리어/, '어리어 is the uncontracted 어려, and correct'], [/^멋지게/, '멋지게 is as good as 멋있게'],
  [/대학생으로/, '대학생으로 보여요 is good Korean'], [/^지난 크리스마스/, '지난 크리스마스 is as good as 작년 크리스마스']
];
const accepted = [];
ex.forEach((e) => e.items.forEach((row) => row.choices.filter((c) => c.id !== row.answer).forEach((c) => {
  GOOD_KOREAN.forEach(([re, why]) => { if (re.test(nfc(c.ko))) accepted.push(e.id + ':' + row.n + ' «' + c.ko + '» — ' + why); });
})));
assert(accepted.length === 0, 'and no wrong button is one a Korean speaker would accept' + (accepted.length ? ' — ' + accepted.join(' | ') : ''));
const noteSaysSo = page('u12sgk-gram-1').noteEn;
assert(/A-게 보이다/.test(noteSaysSo) && /National Institute of Korean Language/.test(noteSaysSo),
  'the 보이다 page says why -게 보이다 is never offered as a mistake');

// ── 3. The book's own questions, and its own answers ─────────────────────────
console.log('\n--- 3. The book’s own questions (모범 답안 p.267, 자기 평가 p.87) ---');
const l1 = page('u12sgk-listen-1').items[0];
assert(l1.choices.map((c) => c.ko).join('|') === ['① 마리코는 머리 모양을 바꿨습니다.', '② 마리코가 간 미용실은 값이 비싼 편입니다.',
  '③ 마리코는 시험 때문에 기분이 안 좋았습니다.'].join('|'), '듣기 1 offers the book’s three statements, in the book’s order');
assert(/^②/.test(keyed(l1)), '— and keys ②, as 모범 답안 does');
const l2 = page('u12sgk-listen-2').items[0];
assert(l2.choices.length === 4 && l2.choices.every((c, k) => c.ko.charAt(0) === '①②③④'.charAt(k)),
  '듣기 2 offers four hairstyles, one per drawing, in the page’s order');
assert(/^④/.test(keyed(l2)) && /짧게 자르고 파마/.test(keyed(l2)), '— and keys ④, short and permed, as 모범 답안 does');
const CHECK = ['피곤해 보여요', '즐겁게', '잘 먹는 편이에요', '한국 사람처럼'];
const check = page('u12sgk-check-1');
assert(check.items.length === 4 && check.items.every((r, k) => keyed(r) === CHECK[k]),
  '자기 평가 keys the four answers printed upside down on p.87 (' + check.items.map(keyed).join(', ') + ')');
const FORM = [/보여요$/, /게$/, /편이에요$/, /처럼$/];
assert(check.items.every((r, k) => FORM[k].test(keyed(r)) && FORM.filter((f) => f.test(keyed(r))).length === 1),
  'and the box’s four forms — -아/어 보이다, -게, -는 편이다, 처럼 — are used once each');

// ── 4. The audio on a row is the audio of that row ───────────────────────────
console.log('\n--- 4. The audio ---');
const DICT = new Map(cass.dictation.items.map((i) => [i.audio.src, i]));
const TRACK = new Map(cass.tracks.map((t) => [t.src, t]));
const audio = [];
ex.forEach((e) => e.items.forEach((row) => { if (row.audio) audio.push({ e, row, a: row.audio }); }));
assert(audio.length === 26, 'twenty-six rows play something (found ' + audio.length + ')');
const missing = audio.filter((x) => !fs.existsSync(path.join(ROOT, x.a.src))).map((x) => x.a.src);
assert(missing.length === 0, 'every file is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(audio.every((x) => x.a.labelEn), 'and every one is labelled');
assert(audio.every((x) => DICT.has(x.a.src) || TRACK.has(x.a.src)), 'and each comes out of the Unit 12 cassette');
const mismatched = [], wrongMouth = [];
audio.forEach(({ e, row, a }) => {
  const d = DICT.get(a.src);
  if (!d) return;
  const filled = row.lines.map((l) => String(l.ko || '').replace('{}', keyed(row)));
  const k = filled.findIndex((t) => loose(t) === loose(d.ko));
  if (k < 0) mismatched.push(e.id + ':' + row.n + ' plays «' + d.ko + '»');
  else if (row.lines[k].who && d.who && row.lines[k].who !== d.who) {
    wrongMouth.push(e.id + ':' + row.n + ' says ' + row.lines[k].who + ', the tape says ' + d.who);
  }
});
assert(mismatched.length === 0, 'every line clip says exactly what its row prints'
  + (mismatched.length ? ' — ' + mismatched.slice(0, 4).join(' | ') : ''));
assert(wrongMouth.length === 0, 'and in the right mouth' + (wrongMouth.length ? ' — ' + wrongMouth.join(', ') : ''));
const whole = audio.filter((x) => TRACK.has(x.a.src));
assert(whole.length === 4 && whole.every((x) => /^Track (24|28|29) · /.test(x.a.labelEn)),
  'four rows play a whole track, each saying which one (' + whole.map((x) => x.a.labelEn.slice(0, 8)).join(', ') + ')');
const examples = ex.filter((e) => e.example && e.example.audio);
assert(examples.length === 2, 'and two worked examples play the 대화 they come from');

// ── 5. 발음: 받침 ㄻ, worked out from the syllables ─────────────────────────────
console.log('\n--- 5. 받침 ㄻ ---');
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const syls = (s) => [...flat(s).replace(/[[\]]/g, '')].filter((ch) => ch >= '가' && ch <= '힣');
const ini = (ch) => INITIALS[Math.floor((ch.codePointAt(0) - 0xAC00) / 588)];
const fin = (ch) => FINALS[(ch.codePointAt(0) - 0xAC00) % 28];
const TENSE = { 'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ' };
// What the ㄻ syllable and the one after it must sound like, from the spelling alone.
function obeysRule(spelling, sound) {
  const a = syls(spelling), b = syls(sound);
  if (a.length !== b.length) return false;
  const i = a.findIndex((ch) => fin(ch) === 'ㄻ');
  if (i < 0 || i + 1 >= a.length) return false;
  const next = ini(a[i + 1]);
  if (next === 'ㅇ') return fin(b[i]) === 'ㄹ' && ini(b[i + 1]) === 'ㅁ';
  return fin(b[i]) === 'ㅁ' && ini(b[i + 1]) === (TENSE[next] || next);
}
const rule = page('u12sgk-pron-1');
assert(rule.items.length === 5, '규칙 has five rows');
rule.items.forEach((row) => {
  const word = row.lines[1].ko.split('⟶')[0].trim();
  assert(row.lines[0].ko.indexOf(word) >= 0 && syls(word).some((ch) => fin(ch) === 'ㄻ'),
    word + ' is on its own sentence’s line and is spelt with ㄻ');
  assert(obeysRule(word, keyed(row)), word + ' keys ' + keyed(row) + ', which the rule produces');
  const wrong = row.choices.filter((c) => c.id !== row.answer);
  assert(wrong.every((c) => !obeysRule(word, c.ko)), 'and no wrong button does (' + wrong.map((c) => c.ko).join(' ') + ')');
  assert(wrong.some((c) => loose(c.ko) === loose(word)),
    'and the spelling itself, ' + word + ', is one of the wrong sounds — what is written is not what is said');
});
assert(rule.items.some((r) => /[가-힣]았/.test(r.lines[1].ko) && /\[달마써요\]/.test(keyed(r))),
  'and one row is the vowel case the page prints in red: 닮았어요 [달마써요]');
const back = page('u12sgk-pron-2');
assert(back.items.length === 3, '연습 has three rows, sound to spelling');
back.items.forEach((row) => {
  assert(syls(keyed(row)).some((ch) => fin(ch) === 'ㄻ'), '«' + keyed(row) + '» is keyed with the ㄻ the sound hides');
  assert(row.choices.some((c) => c.id !== row.answer && /^담/.test(c.ko)),
    'and 담다 — a different verb that sounds the same — is among its wrong buttons');
  assert(/\[[가-힣]+\]/.test(row.phraseKo), 'and its headline gives the sound the tape plays: ' + row.phraseKo);
});

// ── 6. The two books stay apart ──────────────────────────────────────────────
console.log('\n--- 6. The 교과서 and the 익힘책 ---');
const wbIds = new Set(wb.exercises.map((e) => e.id));
assert(ex.every((e) => !wbIds.has(e.id)), 'no exercise id is shared with the 익힘책');
const gapped = (bank) => {
  const out = new Set();
  bank.exercises.forEach((e) => (e.items || []).forEach((it) => (it.lines || []).forEach((l) => {
    const t = nfc(l.ko).trim();
    if (t.indexOf('{}') >= 0 && t.replace(/\{\}/g, '').length > 6) out.add(t);
  })));
  return out;
};
const wbLines = gapped(wb);
const sharedLines = [...gapped(tb)].filter((t) => wbLines.has(t));
assert(sharedLines.length === 0, 'no gapped sentence is drilled in both' + (sharedLines.length ? ' — ' + sharedLines.join(' | ') : ''));
const wbKeys = new Set();
wb.exercises.forEach((e) => (e.items || []).forEach((it) => [[it.choices, it.answer], [it.choices2, it.answer2]].forEach(([l, a]) => {
  const c = (l || []).find((x) => x.id === a);
  if (c) wbKeys.add(flat(c.ko));
})));
const twice = [], liar = [];
ex.forEach((e) => e.items.forEach((row) => {
  if (wbKeys.has(flat(keyed(row)))) twice.push(e.id + ':' + row.n + ' ' + keyed(row));
  row.choices.filter((c) => c.id !== row.answer && wbKeys.has(flat(c.ko))).forEach((c) => liar.push(e.id + ':' + row.n + ' ' + c.ko));
}));
assert(twice.length === 0, 'no answer is keyed in both books' + (twice.length ? ' — ' + twice.join(', ') : ''));
assert(liar.length === 0, 'and no wrong button here is a right answer there' + (liar.length ? ' — ' + liar.join(', ') : ''));
// The four grammar points are what the pages teach, and every one is reached several times.
const answers = ex.flatMap((e) => e.items.map(keyed));
[['A-아/어 보이다', /보여요|보이네요|보이는데|보여서|보이시고/], ['N처럼[같이]', /처럼$|같이$/],
  ['A-(으)ㄴ 편이다, V-는 편이다', /편이|편입니다/], ['A-게', /[가-힣]게$/]].forEach(([label, re]) => {
  const n = answers.filter((a) => re.test(a)).length;
  assert(n >= 4, 'the pages key ' + label + ' ' + n + ' times');
});

// ── 7. Wiring and production ─────────────────────────────────────────────────
console.log('\n--- 7. Wiring and production ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit12World\(\)\) return '\/worlds\/unit12-textbook\.json'/.test(ui), 'textbookUrl resolves Unit 12 to its own 교과서');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("'unit12-textbook': path.join('worlds', 'unit12-textbook.json')") >= 0,
  'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit12-textbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit12-textbook.json') >= 0, 'and the example corpus can quote it');
const lib = require(path.join(ROOT, 'admin', 'lib', 'i18n.js'));
const scanned = lib.scanSource(ROOT, 'worlds/unit12-textbook.json').strings;
const vi = lib.readCatalog(ROOT, 'worlds/unit12-textbook.json', 'vi').entries;
const untranslated = scanned.filter((s) => !vi[s.key]).map((s) => s.key);
assert(scanned.length > 250 && untranslated.length === 0,
  'every one of its ' + scanned.length + ' strings has its Vietnamese' + (untranslated.length ? ' — ' + untranslated.slice(0, 3).join(' | ') : ''));
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let acceptedBank = null;
try { acceptedBank = validateWorkbook(JSON.parse(JSON.stringify(tb)), 'worlds/unit12-textbook.json'); } catch (e) {
  acceptedBank = { error: e.message };
}
assert(acceptedBank && !acceptedBank.error && acceptedBank.exercises.length === 16,
  'the shared validator accepts the bank as it stands' + (acceptedBank && acceptedBank.error ? ' — ' + acceptedBank.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit12-textbook.json') && batch.has('locales/vi/worlds/unit12-textbook.json'),
  'the bank and its catalogue publish');
const absent = [...new Set(audio.map((x) => x.a.src).concat(examples.map((e) => e.example.audio.src)))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and every file it plays goes up with it' + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit12_textbook: all passed');
