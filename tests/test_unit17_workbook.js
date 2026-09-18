'use strict';
/**
 * tests/test_unit17_workbook.js — the 익힘책 for 17과 비행기를 놓칠 뻔했어요.
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the four things it cannot.
 *
 *   1. **Fidelity to the book.** Printed pp.150-163 hold sixteen exercises across three 어휘
 *      pages and four grammar points, and the 정답 at the back — printed pp.208-209 — gives
 *      an answer to every one. Section 2 holds all 77 of those answers verbatim and compares
 *      them against the button each row actually keys, so a row that drifts fails here rather
 *      than teaching the wrong Korean.
 *
 *   2. **What the pictures were doing.** Four of the sixteen are printed with drawings doing
 *      part of the asking, and 어휘 연습 1 is nothing but drawings: three greyscale things a
 *      row and you write the colour they share, which is a colour question printed in the one
 *      medium that cannot show colour. Every one of those is reshaped to ask in words, and
 *      `artNote` says so. The one row a picture genuinely decides — two blanks and a
 *      photograph of two garments — is settled by the 정답, the way Unit 16's 방을 닦았어요
 *      was.
 *
 *   3. **The cut.** Every 문형 연습 row carries a clip off Track17. The page prints "track 17"
 *      and that is the file name, not a number to convert: the workbook CD is grouped, not
 *      offset — 02/03/04 for units 10/11/12, 09/10/11 for 13/14/15, 16/17/18 for 16/17/18.
 *      Section 5 pins a pace band per drill, and all four of them bite, where Unit 16 could
 *      only manage three.
 *
 *   4. **What the chapter is for.** Four grammar points, and the bank has to drill all four
 *      rather than three and a favourite. Section 4 finds each of them in the answers.
 *
 * Run: node tests/test_unit17_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit17-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;
const keyed = (row) => nfc(((row.choices || []).find((c) => c.id === row.answer) || {}).ko);
const keyed2 = (row) => nfc(((row.choices2 || []).find((c) => c.id === row.answer2) || {}).ko);
const keyOf = (row) => (row.choices2 ? keyed(row) + ' / ' + keyed2(row) : keyed(row));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 17 · 연습 문제 — 17과 비행기를 놓칠 뻔했어요');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit17-workbook', 'the bank names itself');
assert(/Unit 17/.test(wb.source) && /놓칠 뻔했어요|150-163/.test(wb.source),
  'and says which chapter it is from');
assert(wb.titleKo === '연습 문제' && wb.titleEn === 'Workbook', 'the desk labels it 연습 문제');
assert(ex.length === 16, 'sixteen exercises (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 77, 'seventy-seven rows across them (found ' + rows + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 1 | 문법과 표현 2 | 문법과 표현 3 | 문법과 표현 4 | 문형 연습',
  'the book’s own sections, in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 3
  && ex.filter((e) => /^문법과 표현/.test(e.section)).length === 9
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'three 어휘, nine across the four grammar points, four 문형 연습');
const points = [...new Set(ex.filter((e) => /^문법과 표현/.test(e.section)).map((e) => e.sectionEn))];
assert(points.join(' | ') === 'V-아다/어다 주다 | V-(으)ㄹ 뻔하다 | ‘ㅎ’ 불규칙 | V-아/어 있다',
  'the four grammar points are the four the book lists (' + points.join(', ') + ')');
assert(ex.every((e) => e.pattern && e.pattern.length), 'every exercise carries the point that titles it in the list');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length,
  'and section-plus-number is unique, though 연습 1 repeats across the page');

// Nothing is left out — but the biggest exercise in the chapter is not printed as an exercise
// at all, and the bank has to say what it did with it.
assert(typeof wb.omittedNote === 'string' && wb.omittedNote.length > 120, 'the bank says what it leaves out');
['연습 1', '문법과 표현 3'].forEach((needle) => {
  assert(wb.omittedNote.indexOf(needle) >= 0, 'omittedNote names ' + needle);
});
assert(/Nothing is left out|정답/.test(wb.omittedNote),
  'and says that every printed exercise has an answer at the back');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 200,
  'the bank records what it does about the exercises the pictures carry');
assert(/p\.20[89]/.test(wb.artNote) && /하얀|까만/.test(wb.artNote),
  'and names the one row a picture would otherwise have decided, and where the key that settled it is');

// ── 2. Every answer in the 정답 at the back ─────────────────────────────────
// Printed pp.208-209, read before a single row was written. Compared against the button each
// row keys rather than against the filled sentence: half of these exercises print the prompt
// on the same row as the answer, so a containment check would pass on words that were never
// in the blank. A two-blank row is written "first / second".
console.log('\n--- 2. The answer key (printed pp.208-209) ---');
const KEY = {
  'u17-vocab-1': ['하얀색', '빨간색', '노란색', '초록색'],
  'u17-vocab-2': ['꽃무늬', '줄무늬', '물방울무늬'],
  'u17-vocab-3': ['놓칠 것 같아요', '잃어버려서', '불이 났어요', '부딪혔어요',
    '사고가 났어요', '넘어졌어요', '고장이 나서'],
  'u17-grammar-1-1': ['여자 친구를 집에 데려다 주었어요', '할머니를 댁에 모셔다 드렸어요',
    '아버지를 병원에 모셔다 드렸어요', '동생을 학교에 데려다 주었어요',
    '아이를 엄마에게 데려다 주었어요'],
  'u17-grammar-1-2': ['사다 주세요', '빌려다 주세요', '찾아다 주세요', '갖다 주세요'],
  'u17-grammar-2-1': ['놓칠 뻔했어요', '놓고 갈 뻔했어요', '늦을 뻔했어요',
    '사고가 날 뻔했어요', '불이 날 뻔했어요'],
  'u17-grammar-2-2': ['넘어질 뻔했습니다', '부딪힐 뻔했습니다', '떨어뜨릴 뻔했습니다',
    '울 뻔했습니다', '내릴 뻔했습니다'],
  'u17-grammar-3-1': ['파래요', '노란', '빨갛습니다', '까마니까', '하얘서', '이렇고', '그래요', '저런'],
  'u17-grammar-3-2': ['어떤', '그랬는데', '이런', '저렇게'],
  'u17-grammar-3-3': ['파랗고', '빨개요', '노란색', '하얀 / 까만', '하얘졌어요'],
  'u17-grammar-4-1': ['열려 있어요', '벽에 붙어 있어요', '책상 위에 놓여 있어요',
    '가방에 달려 있어요', '교실에 앉아 있어요', '침대에 누워 계세요'],
  'u17-grammar-4-2': ['서 있는', '앉아 있어요', '놓여 있는', '열려 있네요', '붙어 있으니까'],
  'u17-pattern-1': ['동생을 유치원에 데려다 주었어요', '어머니를 병원에 모셔다 드렸어요',
    '할아버지를 댁에 모셔다 드렸어요', '아이를 학교에 데려다 주었어요'],
  'u17-pattern-2': ['요리를 하다가 불이 날 뻔했어요', '길을 건너다가 사고가 날 뻔했어요',
    '버스에서 내리다가 넘어질 뻔했어요', '바다에서 수영을 하다가 죽을 뻔했어요'],
  'u17-pattern-3': ['왜 그렇게 팔이 까매요', '왜 그렇게 눈이 빨개요',
    '왜 그렇게 입술이 파래요', '왜 그렇게 얼굴이 하얘요'],
  'u17-pattern-4': ['시계가 벽에 걸려 있어요', '인형이 가방에 달려 있어요',
    '아이가 침대에 누워 있어요', '동생이 아버지 옆에 앉아 있어요']
};
assert(Object.keys(KEY).length === ex.length, 'the key covers every exercise in the bank');
assert(Object.values(KEY).reduce((n, a) => n + a.length, 0) === 77,
  'and all 77 answers are written out, not summarised');
const drifted = [];
ex.forEach((e) => {
  const want = KEY[e.id] || [];
  if (want.length !== e.items.length) {
    drifted.push(e.id + ': ' + e.items.length + ' rows for ' + want.length + ' key answers');
    return;
  }
  e.items.forEach((row, i) => {
    if (flat(keyOf(row)) !== flat(want[i])) {
      drifted.push(e.id + ' item ' + row.n + ': keys «' + keyOf(row) + '», key says «' + want[i] + '»');
    }
  });
});
assert(drifted.length === 0, 'every row keys exactly what the 정답 says'
  + (drifted.length ? ' — ' + drifted.slice(0, 4).join(' | ') : ''));
// And no wrong button is an answer the key gives somewhere else in the same exercise, which
// would make one of the two right. Two exercises cannot obey that, and both are named: the
// book gives 어휘 연습 1 four rows and one set of colours to answer them with, and 어휘 연습 2
// three rows and one set of four patterns. Checked from the other side instead.
const SHARED_BOX = { 'u17-vocab-1': [/색$/, 'a colour name'], 'u17-vocab-2': [/무늬$/, 'a pattern name'] };
const doubled = [];
ex.filter((e) => !SHARED_BOX[e.id]).forEach((e) => {
  const right = new Set((KEY[e.id] || []).join(' / ').split(' / ').map(flat));
  e.items.forEach((row) => {
    (row.choices || []).concat(row.choices2 || [])
      .filter((c) => c.id !== row.answer && c.id !== row.answer2 && right.has(flat(c.ko)))
      .forEach((c) => doubled.push(e.id + ' item ' + row.n + ': «' + c.ko + '»'));
  });
});
assert(doubled.length === 0, 'outside the two shared-box exercises, no wrong button is another row’s right answer'
  + (doubled.length ? ' — ' + doubled.join(', ') : ''));
Object.keys(SHARED_BOX).forEach((id) => {
  const [re, label] = SHARED_BOX[id];
  const box = ex.find((e) => e.id === id);
  const stray = box.items.reduce((a, row) => a.concat((row.choices || [])
    .filter((c) => !re.test(nfc(c.ko))).map((c) => c.ko)), []);
  assert(stray.length === 0, 'and inside ' + box.no + ' of ' + box.section + ' every button is '
    + label + ', which is what that exercise is' + (stray.length ? ' — ' + stray.join(', ') : ''));
});

// ── 3. Every row is answerable and worth reading ────────────────────────────
console.log('\n--- 3. Every row is answerable ---');
const faults = [];
ex.forEach((e) => {
  if (String(e.noteEn || '').length < 60) faults.push(e.id + ': noteEn too thin');
  // The 보기 is filled in by the shared renderer from answerKo, so it needs exactly one gap.
  const exGaps = ((e.example && e.example.lines) || [])
    .reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
  if (exGaps !== 1) faults.push(e.id + ': the 보기 has ' + exGaps + ' blanks');
  e.items.forEach((row) => {
    const at = e.id + ' item ' + row.n;
    const gaps = row.lines.reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
    const sets = row.choices2 ? 2 : 1;
    if (gaps !== sets) faults.push(at + ': ' + gaps + ' blanks for ' + sets + ' choice sets');
    [row.choices, row.choices2].filter(Boolean).forEach((list) => {
      if (list.length < 3) faults.push(at + ': only ' + list.length + ' buttons');
      const texts = list.map((c) => flat(c.ko));
      if (new Set(texts).size !== texts.length) faults.push(at + ': a button repeats');
    });
    // Both blanks of a two-blank row are numbered in one run across the keypad, so an id
    // shared between them would have the number pick one and the check read the other.
    const ids = (row.choices || []).concat(row.choices2 || []).map((c) => c.id);
    if (new Set(ids).size !== ids.length) faults.push(at + ': the two blanks share a choice id');
    if (String(row.why || '').length < 80) faults.push(at + ': why too thin');
    if (String(row.grammar || '').length < 17) faults.push(at + ': grammar note too thin');
    if (!row.en) faults.push(at + ': no English');
  });
});
assert(faults.length === 0, 'every row has three distinct buttons, a gap for each answer, and its prose'
  + (faults.length ? ' — ' + faults.slice(0, 5).join(', ') : ''));

// The grammar note is not held to a word count, because half of them are one-line rules that
// say all there is to say — 울다 is a ㄹ stem, so -(으)ㄹ adds nothing. What every one of them
// is held to is that it is about THIS row: a note that quotes nothing from the sentence or
// the buttons above it is a note that was written for a different item, which is the failure
// a length check never sees.
const unquoted = [];
ex.forEach((e) => e.items.forEach((row) => {
  const hay = flat(row.lines.map((l) => l.ko).join('')
    + (row.choices || []).concat(row.choices2 || []).map((c) => c.ko).join(''));
  const runs = flat(row.grammar).match(/[가-힣]{2,}/g) || [];
  const hit = runs.some((run) => {
    for (let i = 0; i + 2 <= run.length; i++) if (hay.indexOf(run.substr(i, 2)) >= 0) return true;
    return false;
  });
  if (!hit) unquoted.push(e.id + ' item ' + row.n);
}));
assert(unquoted.length === 0, 'and every grammar note quotes something from its own row'
  + (unquoted.length ? ' — ' + unquoted.join(', ') : ''));

// A wrong button that is the right one respaced is not a distractor, it is a typo the learner
// gets marked down for.
const respaced = [];
ex.forEach((e) => e.items.forEach((row) => {
  [[row.choices, row.answer], [row.choices2, row.answer2]].forEach(([list, ans]) => {
    if (!list) return;
    const right = list.find((c) => c.id === ans);
    list.filter((c) => c.id !== ans && flat(c.ko) === flat(right.ko))
      .forEach(() => respaced.push(e.id + ' item ' + row.n));
  });
}));
assert(respaced.length === 0, 'no wrong button is the right one with the spaces moved'
  + (respaced.length ? ' — ' + respaced.join(', ') : ''));

// The note is shown after checking, so it has to talk about the buttons that were on screen.
const silent = [];
ex.forEach((e) => e.items.forEach((row) => {
  const buttons = (row.choices || []).concat(row.choices2 || []).map((c) => flat(c.ko));
  const why = flat(row.why);
  const quoted = buttons.some((b) => {
    if (b.length <= 4) return why.indexOf(b) >= 0;
    for (let i = 0; i + 4 <= b.length; i++) if (why.indexOf(b.substr(i, 4)) >= 0) return true;
    return false;
  });
  if (!quoted) silent.push(e.id + ' item ' + row.n);
}));
assert(silent.length === 0, 'every note quotes at least one of its own buttons'
  + (silent.length ? ' — ' + silent.join(', ') : ''));

// ── 4. It drills what the chapter teaches ───────────────────────────────────
console.log('\n--- 4. It drills what the chapter teaches ---');
const allAnswers = [];
ex.forEach((e) => e.items.forEach((row) => {
  allAnswers.push(keyed(row));
  if (row.choices2) allAnswers.push(keyed2(row));
}));
const text = allAnswers.join(' ');
// 다 주 and 다 드 are one pattern: the verb before them is what changes, and the half after
// is 주다 for an equal and 드리다 for somebody above you.
const PATTERNS = [['V-아다/어다 주다', /다 주|다 드/], ['V-(으)ㄹ 뻔하다', /뻔했/],
  ['ㅎ 불규칙', /파랗|파래|노랗|노란|빨갛|빨개|까맣|까마|까매|하얗|하얀|하얘|이렇|이런|그렇|그래|그랬|저렇|저런|어떤/],
  ['V-아/어 있다', /어 있|아 있|여 있|려 있|워 계/]];
PATTERNS.forEach(([label, re]) => assert(re.test(text), 'the bank drills ' + label));
const counts = {};
PATTERNS.forEach(([label, re]) => { counts[label] = allAnswers.filter((a) => re.test(a)).length; });
assert(Object.values(counts).every((n) => n >= 10),
  'and none of the four is a token appearance — '
  + Object.entries(counts).map(([k, v]) => k + ' ' + v).join(', '));
// The two halves of V-아다/어다 주다: the plain pair and the humble one, both drilled.
const fetch = allAnswers.filter((a) => /다 주|다 드/.test(a));
assert(fetch.some((a) => /데려다 주/.test(a)) && fetch.some((a) => /모셔다 드/.test(a)),
  'and the fetching pattern is drilled both plain (데려다 주다) and humble (모셔다 드리다)');
// The ㅎ-irregular is the one spelling this chapter can get wrong three different ways, and
// all three shapes are keyed somewhere.
assert(allAnswers.some((a) => /^(하얀|까만|노란|저런|이런)$/.test(a)), 'the ㅎ stems are keyed before a noun');
assert(allAnswers.some((a) => /래요$|개요$|얘요$/.test(a)), 'and fused before -아/어');
assert(allAnswers.some((a) => /빨갛습니다|이렇고/.test(a)), 'and untouched before a consonant');
assert(allAnswers.indexOf('까마니까') >= 0, 'and 까마니까 is keyed, which is the cell that takes no 으 at all');
// 계시다, which is the one honorific this chapter needs.
assert(allAnswers.some((a) => /누워 계세요/.test(a)),
  'and a grandfather lying down is 누워 계세요, not 누워 있어요');

// ── 5. The 문형 연습 clips ───────────────────────────────────────────────────
console.log('\n--- 5. The clips ---');
const drills = ex.filter((e) => e.section === '문형 연습');
assert(drills.length === 4, 'four drills (' + drills.length + ')');
assert(drills.every((e) => e.items.length === 4), 'four items each, as the page prints them');
assert(drills.every((e) => e.example && e.example.audio && e.example.audio.src),
  'and every 보기 plays through first');
const clips = [];
drills.forEach((e) => {
  if (e.example && e.example.audio) clips.push(e.example.audio);
  e.items.forEach((row) => { if (row.audio) clips.push(row.audio); });
});
assert(clips.length === 20, 'twenty clips in all — a 보기 and four items per drill (' + clips.length + ')');
assert(clips.every((a) => /^audio\/book\/2b-u17-p\d-\d\.mp3$/.test(a.src)),
  'each is named for its drill and its item');
assert(new Set(clips.map((a) => a.src)).size === clips.length, 'no two rows share a clip');
const gone = clips.filter((a) => !fs.existsSync(path.join(ROOT, a.src))).map((a) => a.src);
assert(gone.length === 0, 'every clip is on disk' + (gone.length ? ' — ' + gone.join(', ') : ''));
assert(clips.every((a) => a.askEnd > 1 && a.askEnd < 6),
  'and every one stops for an answer somewhere in the middle of itself');

// The pace band per drill, measured on the clips as they were cut. Each clip holds the
// teacher's cue, a 1.15s pause and the model answer, and askEnd is the middle of that pause —
// so what follows askEnd is half a pause (0.575s), the answer, and the 0.30s tail. Dividing
// the answer's syllables by what is left is a pace. A re-cut at the wrong threshold, or a
// text paired with the wrong clip, lands outside.
const BAND = { 1: [5.0, 5.6], 2: [4.7, 5.6], 3: [4.7, 5.2], 4: [4.5, 5.2] };
const HALF_PAUSE = 0.575, TAIL = 0.30;
let ffprobe = true;
const durOf = (rel) => Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, rel)],
  { encoding: 'utf8' }).trim());
try { durOf(clips[0].src); } catch (e) { ffprobe = false; }
if (!ffprobe) {
  console.log('      (ffprobe not on this machine — the pace bands are skipped)');
} else {
  drills.forEach((e) => {
    const d = Number(e.id.slice(-1));
    const [lo, hi] = BAND[d];
    const paces = e.items.map((row) => ({
      n: row.n,
      pace: syl(keyed(row)) / (durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL)
    }));
    const out = paces.filter((r) => r.pace < lo || r.pace > hi);
    const mean = paces.reduce((a, r) => a + r.pace, 0) / paces.length;
    assert(out.length === 0, 'drill ' + d + ': all four answers read at a human pace for their text ('
      + mean.toFixed(2) + ' syl/s, band ' + lo + '-' + hi + ')'
      + (out.length ? ' — item ' + out.map((r) => r.n + ' at ' + r.pace.toFixed(2)).join(', ') : ''));
  });
  // And the band has teeth on all four. Unit 16's drill 2 could not be bitten — its four
  // answers were 네, 벌써 and one changed word — and every drill here can be.
  const blunt = [];
  drills.forEach((e) => {
    const d = Number(e.id.slice(-1));
    const [lo, hi] = BAND[d];
    const list = e.items;
    const shifted = list.map((row, k) => syl(keyed(list[(k + 1) % list.length]))
      / (durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL));
    if (!shifted.some((r) => r < lo || r > hi)) blunt.push(d);
  });
  assert(blunt.length === 0, 'and every drill fails its band when the pairing is shifted by one'
    + (blunt.length ? ' — except ' + blunt.join(', ') : ''));
}
// What can be checked from the bank alone is that the answer beside each clip is the one the
// drill is for — by the pattern the drill exists to practise, which every one of its answers
// carries.
const MARK = {
  1: [/다 주었어요$|다 드렸어요$/, 'ends in 데려다 주었어요 or 모셔다 드렸어요'],
  2: [/다가[\s\S]*뻔했어요$/, 'runs -다가 … -(으)ㄹ 뻔했어요'],
  3: [/^왜 그렇게/, 'opens 왜 그렇게'],
  4: [/[이가] [\s\S]*(려|워|아) 있어요$/, 'gives its subject 이/가 and ends in -아/어 있어요']
};
drills.forEach((e) => {
  const d = Number(e.id.slice(-1));
  const [re, label] = MARK[d];
  const off = e.items.filter((row) => !re.test(keyed(row)));
  assert(off.length === 0, 'every answer in drill ' + d + ' ' + label
    + (off.length ? ' — item ' + off.map((r) => r.n).join(', ') : ''));
});

// ── 6. Wiring and production ────────────────────────────────────────────────
console.log('\n--- 6. Wiring and production ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit17World\(\)\) return '\/worlds\/unit17-workbook\.json'/.test(ui),
  'workbookUrl resolves Unit 17 to its own 익힘책');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("unit17: path.join('worlds', 'unit17-workbook.json')") >= 0,
  'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit17-workbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit17-workbook.json') >= 0,
  'and the example corpus can quote it');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let accepted = null;
try { accepted = validateWorkbook(JSON.parse(JSON.stringify(wb)), 'worlds/unit17-workbook.json'); } catch (e) {
  accepted = { error: e.message };
}
assert(accepted && !accepted.error && accepted.exercises.length === 16,
  'the shared validator accepts the bank as it stands'
  + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit17-workbook.json'), 'the bank publishes');
const absent = clips.map((a) => a.src).filter((s) => !batch.has(s));
assert(absent.length === 0, 'and all twenty clips go up with it'
  + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit17_workbook: all passed');
