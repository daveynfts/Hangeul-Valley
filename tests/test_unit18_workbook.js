'use strict';
/**
 * tests/test_unit18_workbook.js — the 익힘책 for 18과 한국에 온 지 벌써 6개월이 되었어요.
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the things it cannot.
 *
 *   1. **Fidelity to the book.** Printed pp.166-175 hold fourteen exercises across one 어휘
 *      spread and three grammar points, and the 정답 at the back — printed pp.209-210 — gives
 *      an answer to every one. Section 2 holds all 85 of those answers verbatim and compares
 *      them against the button each row keys. Two of the fourteen print no 보기 at all, and
 *      none is invented for them; the instructions are the page's own words.
 *
 *   2. **A wrong button has to be wrong.** Not merely other than what the 정답 prints. The
 *      first draft of this bank offered 데려다 줬다, 갈 거다, 씻어야 된다 and 설 연휴이다 as
 *      mistakes, and 힘들다 after 한라산은 높아서 올라가기가 — and every one of them is a
 *      sentence a Korean speaker would accept. No gate could have caught that; only reading each
 *      row as Korean does. A second reading found three more in the 글 passages — 된다 after
 *      벌써 … 두 학기가 다, 사귄다 and 올라간다, each good Korean with the tense left open.
 *      Section 3 pins all twenty-three, so none of them comes back.
 *
 *   3. **What the pictures were doing.** 문법과 표현 1 연습 1 prints only the answer and a
 *      drawing of the activity; 문법과 표현 2 연습 1 keeps four of its six numbers in the drawing
 *      only. Both name what the picture shows on its own line, and `artNote` says so.
 *
 *   4. **The cut.** Every 문형 연습 row carries a clip off Track18 — the page prints "track 18",
 *      and that is the file name. Section 5 pins a pace band per drill, and all four bite.
 *
 * Run: node tests/test_unit18_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit18-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;
const keyed = (row) => nfc(((row.choices || []).find((c) => c.id === row.answer) || {}).ko);
const keyed2 = (row) => nfc(((row.choices2 || []).find((c) => c.id === row.answer2) || {}).ko);
const keyOf = (row) => (row.choices2 ? keyed(row) + ' / ' + keyed2(row) : keyed(row));
const byId = (id) => ex.find((e) => e.id === id) || { items: [] };

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 18 · 연습 문제 — 18과 한국에 온 지 벌써 6개월이 되었어요');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit18-workbook', 'the bank names itself');
assert(/Unit 18/.test(wb.source) && /166-175/.test(wb.source) && /209-210/.test(wb.source),
  'and says which pages it is from and where the 정답 is');
assert(wb.titleKo === '연습 문제' && wb.titleEn === 'Workbook', 'the desk labels it 연습 문제');
assert(ex.length === 14, 'fourteen exercises (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 85, 'eighty-five rows across them (found ' + rows + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 1 | 문법과 표현 2 | 문법과 표현 3 | 문형 연습',
  'the book’s own sections, in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 3
  && ex.filter((e) => /^문법과 표현/.test(e.section)).length === 7
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'three 어휘, seven across the three grammar points, four 문형 연습');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length,
  'and section-plus-number is unique, though 연습 1 repeats across the page');
// The instructions are the page's own, down to the book's 알맞는 on p.173.
const INSTR = {
  'u18-vocab-1': '빈칸에 알맞은 것을 골라 문장을 만들어 보세요.',
  'u18-vocab-2': '빈칸에 알맞은 것을 골라 문장을 만들어 보세요.',
  'u18-vocab-3': '그림을 보고 [보기]와 같이 알맞은 것을 골라 대화를 만들어 보세요.',
  'u18-grammar-1-1': '그림을 보고 [보기]와 같이 대화를 만들어 보세요.',
  'u18-grammar-1-2': '[보기]와 같이 문장을 바꿔 써 보세요.',
  'u18-grammar-2-1': '그림을 보고 [보기]와 같이 대화를 만들어 보세요.',
  'u18-grammar-3-1': '[보기]와 같이 문장을 바꿔 써 보세요.',
  'u18-grammar-3-2': '[보기]와 같이 문장을 바꿔 써 보세요.',
  'u18-grammar-3-3': '[보기]와 같이 문장을 바꿔 써 보세요.',
  'u18-grammar-3-4': '[보기]와 같이 알맞는 단어를 넣어 글을 완성해 보세요.'
};
const offInstr = Object.keys(INSTR).filter((id) => byId(id).instructionKo !== INSTR[id]);
assert(offInstr.length === 0, 'the ten printed instructions are quoted as printed'
  + (offInstr.length ? ' — ' + offInstr.join(', ') : ''));
// 어휘 연습 1 and 2 print the box and the rows and nothing else.
const noEg = ex.filter((e) => !e.example).map((e) => e.id);
assert(noEg.join(',') === 'u18-vocab-1,u18-vocab-2',
  'the two exercises the page prints without a 보기 have none here either (' + noEg.join(', ') + ')');
assert(/no 보기/.test(byId('u18-vocab-1').noteEn) && /no 보기/.test(byId('u18-vocab-2').noteEn),
  'and both say so');
assert(typeof wb.omittedNote === 'string' && wb.omittedNote.length > 120
  && /연습 4/.test(wb.omittedNote) && /정답/.test(wb.omittedNote) && /복습 6/.test(wb.omittedNote),
  'the bank says nothing is left out, how the seventeen-blank passages are taken, and why 복습 6 is not here');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 200 && /pp\.209-210/.test(wb.artNote),
  'and records what the two picture-driven exercises do instead');

// ── 2. Every answer in the 정답 at the back ─────────────────────────────────
// Printed pp.209-210, read before a single row was written. Where a row gaps only the part of
// the sentence that changes, the key is that part; a two-blank row is written "first / second".
console.log('\n--- 2. The answer key (printed pp.209-210) ---');
const KEY = {
  'u18-vocab-1': ['그리워요', '아쉬워요', '정이 들었어요', '후회가 돼요', '기억에 남아요'],
  'u18-vocab-2': ['쌀쌀해서', '습도가 높아서', '건조해요', '기온이 영하로 내려가는'],
  'u18-vocab-3': ['눈이 내려요', '단풍이 들어서', '얼음이 얼어서', '장마가 시작돼요', '바람이 불어서'],
  'u18-grammar-1-1': ['한국어를 공부한 지 얼마나 됐어요', '두 사람이 사귄 지 얼마나 됐어요',
    '태권도를 배운 지 얼마나 됐어요', '안경을 낀 지 얼마나 됐어요', '약을 먹은 지 얼마나 됐어요'],
  'u18-grammar-1-2': ['고향 음식을 못 먹은 지 6개월 됐어요', '부모님께 전화를 못 드린 지 2주일 됐어요',
    '청소를 안 한 지 한 달 됐어요', '담배를 안 피운 지 세 달 됐어요', '술을 안 마신 지 오래됐어요'],
  'u18-grammar-2-1': ['세 잔이나 마셨어요', '열두 시간이나 잤어요', '네 마리나 있어요',
    '5개월이나 됐어요', '두 시간이나 공부해요', '열두 개나 있어요'],
  'u18-grammar-3-1': ['아름답다', '까맣다', '나는 / 다르다', '인터넷을 하고 있다',
    '먹어 본 적이 없다', '피곤하신 것 같다'],
  'u18-grammar-3-2': ['회사에 다닌다', '난 / 믿지 않는다', '편해 보인다', '논다', '어울린다',
    '서둘러야 된다'],
  'u18-grammar-3-3': ['기차를 놓쳤다', '데려다 주었다', '되었다', '우리 / 오셨다', '했으면 좋겠다',
    '나는 / 갈 것이다', '늦지 않을 것이다', '설 연휴다', '주차장이 아니다', '회사원이었다'],
  'u18-grammar-3-4': ['되었다', '익숙해졌다', '사귀었다', '즐겁다',
    '명절이다', '내려간다', '막힌다', '한다', '먹는다',
    '한다', '좋다', '따뜻하다',
    '갔다', '올라갔다', '힘들었다', '아름다웠다', '싶다'],
  'u18-pattern-1': ['아침을 먹은 지 세 시간 됐어요', '안경을 쓴 지 오 년 됐어요',
    '서울에서 산 지 삼 개월 됐어요', '그 친구를 안 만난 지 두 달 됐어요'],
  'u18-pattern-2': ['세 시간이나 운동해요', '십 년이나 됐어요', '두 그릇이나 먹었어요', '열두 시간이나 잤어요'],
  'u18-pattern-3': ['봄에는 여러 가지 꽃이 핀다', '여름은 아주 덥다', '가을에는 단풍이 든다',
    '겨울에는 하얀 눈이 내린다'],
  'u18-pattern-4': ['오늘은 월요일이다', '이 사진은 우리 가족사진이다', '이것은 내 가방이 아니다',
    '그 사람은 전에 회사원이었다']
};
assert(Object.keys(KEY).length === ex.length, 'the key covers every exercise in the bank');
assert(Object.values(KEY).reduce((n, a) => n + a.length, 0) === 85,
  'and all 85 answers are written out, not summarised');
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
// The three 어휘 exercises are word boxes, so their wrong buttons are other entries of the box —
// that is the exercise. Everywhere else a wrong button may not be another row's right answer.
const SHARED_BOX = {
  'u18-vocab-1': [/^(그리워|아쉬워|기억에 남|후회가 돼|정이 들)/, 'a feeling from the box'],
  'u18-vocab-2': [/^(쌀쌀|건조|습도가 높|기온이 영하로 내려가)/, 'a weather word from the box'],
  'u18-vocab-3': [/^(꽃이|바람이|태풍이|장마가|단풍이|나뭇잎이|얼음이|눈이)/, 'a phrase from the box']
};
const doubled = [];
ex.filter((e) => !SHARED_BOX[e.id]).forEach((e) => {
  const right = new Set((KEY[e.id] || []).join(' / ').split(' / ').map(flat));
  e.items.forEach((row) => {
    (row.choices || []).filter((c) => c.id !== row.answer && right.has(flat(c.ko)))
      .forEach((c) => doubled.push(e.id + ' item ' + row.n + ': «' + c.ko + '»'));
    (row.choices2 || []).filter((c) => c.id !== row.answer2 && right.has(flat(c.ko)))
      .forEach((c) => doubled.push(e.id + ' item ' + row.n + ': «' + c.ko + '»'));
  });
});
assert(doubled.length === 0, 'outside the word boxes, no wrong button is another row’s right answer'
  + (doubled.length ? ' — ' + doubled.join(', ') : ''));
Object.keys(SHARED_BOX).forEach((id) => {
  const [re, label] = SHARED_BOX[id];
  const box = byId(id);
  const stray = box.items.reduce((a, row) => a.concat((row.choices || [])
    .filter((c) => !re.test(nfc(c.ko))).map((c) => c.ko)), []);
  assert(stray.length === 0, 'and inside ' + box.no + ' of ' + box.section + ' every button is '
    + label + (stray.length ? ' — ' + stray.join(', ') : ''));
});
// 연습 3's box circles 꽃이 피다 as the one its 보기 used, so it is never a button.
const spent = byId('u18-vocab-3').items.filter((row) => row.choices.some((c) => /^꽃이/.test(c.ko)));
assert(spent.length === 0, 'and the box entry the 보기 has spent, 꽃이 피다, is never offered');

// ── 3. A wrong button has to be wrong ───────────────────────────────────────
console.log('\n--- 3. A wrong button has to be wrong ---');
// Every one of these was a wrong button in the first draft and is good Korean. They are named
// so none of them can come back as a distractor anywhere in the bank.
// Addressed by exercise and row, because several of them are perfectly good wrong answers on
// some other row — 된다 is a fair mistake where the task is to turn 되었습니다 into the plain
// style, and wrong-because-correct after 씻어야 or where a 글 passage leaves the tense open.
const CORRECT_KOREAN = [
  ['u18-grammar-3-3', 2, '데려다 줬다'], ['u18-grammar-3-3', 4, '왔다'], ['u18-grammar-3-3', 6, '갈 거다'],
  ['u18-grammar-3-3', 7, '늦지 않을 거다'], ['u18-grammar-3-3', 7, '늦지 않는다'], ['u18-grammar-3-3', 8, '설 연휴이다'],
  ['u18-grammar-3-4', 2, '익숙해진다'], ['u18-grammar-3-4', 2, '익숙했다'], ['u18-grammar-3-4', 5, '명절이었다'],
  ['u18-grammar-3-4', 10, '된다'], ['u18-grammar-3-4', 15, '힘들다'], ['u18-grammar-3-4', 16, '아름답다'],
  ['u18-grammar-1-2', 3, '청소를 하지 않은 지 한 달이에요'], ['u18-grammar-1-2', 5, '술을 안 마신 지 오래 됐어요'],
  ['u18-grammar-2-1', 1, '세 잔이나 마셨어요?'], ['u18-grammar-2-1', 3, '네 마리 있어요'],
  ['u18-grammar-2-1', 6, '열두 개가 있어요'], ['u18-vocab-2', 2, '쌀쌀해서'],
  ['u18-vocab-3', 2, '나뭇잎이 떨어져서'], ['u18-vocab-3', 3, '눈이 내려서'],
  ['u18-grammar-3-4', 1, '된다'], ['u18-grammar-3-4', 3, '사귄다'], ['u18-grammar-3-4', 14, '올라간다']];
const back = [];
CORRECT_KOREAN.forEach(([id, n, k]) => {
  const row = byId(id).items.find((r) => r.n === n);
  if (!row) { back.push(id + ' has no row ' + n); return; }
  if ((row.choices || []).concat(row.choices2 || []).some((c) => nfc(c.ko) === k)) back.push(id + ' item ' + n + ': «' + k + '»');
});
assert(back.length === 0, 'none of the twenty-three correct-Korean distractors found in review is back'
  + (back.length ? ' — ' + back.join(', ') : ''));
// The four places the fix is easy to see.
assert(keyed(byId('u18-grammar-3-4').items[9]) === '한다'
  && !byId('u18-grammar-3-4').items[9].choices.some((c) => c.ko === '된다'),
  '씻어야 한다 is no longer offered 씻어야 된다, which is the other standard way to say it');
assert(!byId('u18-grammar-3-3').items[7].choices.some((c) => c.ko === '설 연휴이다'),
  'and 설 연휴다 is no longer offered 설 연휴이다 — after a vowel the 이 usually goes, but keeping it is not wrong');
// Two buttons were a bare jamo glued to a syllable, which is not a form anybody could write.
const jamo = [];
ex.forEach((e) => e.items.forEach((row) => (row.choices || []).concat(row.choices2 || [])
  .filter((c) => /[ㄱ-ㅎㅏ-ㅣ]/.test(nfc(c.ko))).forEach((c) => jamo.push(e.id + ':' + row.n + ' ' + c.ko))));
assert(jamo.length === 0, 'and no button has a loose jamo in it' + (jamo.length ? ' — ' + jamo.join(', ') : ''));
// A wrong button that is the right one respaced, or repunctuated, is no choice at all.
const respaced = [];
ex.forEach((e) => e.items.forEach((row) => {
  [[row.choices, row.answer], [row.choices2, row.answer2]].forEach(([list, ans]) => {
    if (!list) return;
    const right = list.find((c) => c.id === ans);
    list.filter((c) => c.id !== ans && flat(c.ko).replace(/[?!.]/g, '') === flat(right.ko).replace(/[?!.]/g, ''))
      .forEach(() => respaced.push(e.id + ' item ' + row.n));
  });
}));
assert(respaced.length === 0, 'no wrong button is the right one with the spaces or the marks moved'
  + (respaced.length ? ' — ' + respaced.join(', ') : ''));

// ── 4. Every row is answerable and about itself ─────────────────────────────
console.log('\n--- 4. Every row is answerable ---');
const faults = [];
ex.forEach((e) => {
  if (String(e.noteEn || '').length < 60) faults.push(e.id + ': noteEn too thin');
  if (e.example) {
    const exGaps = (e.example.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
    if (exGaps !== 1) faults.push(e.id + ': the 보기 has ' + exGaps + ' blanks');
  }
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
    const ids = (row.choices || []).concat(row.choices2 || []).map((c) => c.id);
    if (new Set(ids).size !== ids.length) faults.push(at + ': the two blanks share a choice id');
    if (String(row.why || '').length < 80) faults.push(at + ': why too thin');
    if (String(row.grammar || '').length < 17) faults.push(at + ': grammar note too thin');
    if (!row.en) faults.push(at + ': no English');
  });
});
assert(faults.length === 0, 'every row has three distinct buttons, a gap for each answer, and its prose'
  + (faults.length ? ' — ' + faults.slice(0, 5).join(', ') : ''));
const unquoted = [];
const silent = [];
ex.forEach((e) => e.items.forEach((row) => {
  const hay = flat(row.lines.map((l) => l.ko).join('')
    + (row.choices || []).concat(row.choices2 || []).map((c) => c.ko).join(''));
  const runs = flat(row.grammar).match(/[가-힣]{2,}/g) || [];
  if (!runs.some((run) => { for (let i = 0; i + 2 <= run.length; i++) if (hay.indexOf(run.substr(i, 2)) >= 0) return true; return false; })) {
    unquoted.push(e.id + ' item ' + row.n);
  }
  const buttons = (row.choices || []).concat(row.choices2 || []).map((c) => flat(c.ko));
  const why = flat(row.why);
  if (!buttons.some((b) => { if (b.length <= 4) return why.indexOf(b) >= 0; for (let i = 0; i + 4 <= b.length; i++) if (why.indexOf(b.substr(i, 4)) >= 0) return true; return false; })) {
    silent.push(e.id + ' item ' + row.n);
  }
}));
assert(unquoted.length === 0, 'every grammar note quotes something from its own row'
  + (unquoted.length ? ' — ' + unquoted.join(', ') : ''));
assert(silent.length === 0, 'and every note quotes at least one of its own buttons'
  + (silent.length ? ' — ' + silent.join(', ') : ''));
// The drawings: 문법과 표현 1 연습 1 names the activity, 2 연습 1 names the count.
assert(byId('u18-grammar-1-1').items.every((row) => row.lines[0].who === '그림'),
  'every row of 문법과 표현 1 연습 1 names the activity its drawing shows');
const counted = byId('u18-grammar-2-1').items.slice(0, 4);
assert(counted.every((row) => row.lines[0].who === '그림')
  && counted.map((r) => r.lines[0].ko).join(',') === '커피 세 잔,열두 시간,강아지 네 마리,5개월',
  'and the four rows of 2 연습 1 whose number is only in the drawing name it: 세 잔, 열두 시간, 네 마리, 5개월');
assert(byId('u18-grammar-2-1').items.slice(4).every((row) => row.lines[0].who !== '그림'),
  'while the two that print their number in the dialogue do not');

// ── 5. It drills what the chapter teaches ───────────────────────────────────
console.log('\n--- 5. It drills what the chapter teaches ---');
const allAnswers = [];
ex.forEach((e) => e.items.forEach((row) => {
  allAnswers.push(keyed(row));
  if (row.choices2) allAnswers.push(keyed2(row));
}));
const copula = (x) => !/것이다$/.test(x) && (/(이다|이었다|아니다)$/.test(x) || /연휴다$/.test(x));
// 얼마나 ends in 나 too, and is in every question of 문법과 표현 1 연습 1 — it is not the particle.
const counts = {
  'V-(으)ㄴ 지': allAnswers.filter((a) => /[가-힣] 지 /.test(a)).length,
  'N(이)나 2': allAnswers.filter((a) => /(이나|[가-힣]나) /.test(a.replace(/얼마나/g, ''))).length,
  'A-다, V-ㄴ다/는다': allAnswers.filter((a) => /다$/.test(a) && !copula(a)).length,
  'N(이)다': allAnswers.filter(copula).length
};
assert(counts['V-(으)ㄴ 지'] === 14 && counts['N(이)나 2'] === 10,
  'the bank drills V-(으)ㄴ 지 14 times and N(이)나 2 10 times — every one the 정답 prints ('
  + counts['V-(으)ㄴ 지'] + ', ' + counts['N(이)나 2'] + ')');
assert(counts['A-다, V-ㄴ다/는다'] === 39, 'the plain style of verbs and adjectives 39 times');
assert(counts['N(이)다'] === 8,
  'and the copula 8 times, which is every copula answer the 익힘책 prints (' + counts['N(이)다'] + ')');
// The plain style has four ways to be built, and each is keyed somewhere: -ㄴ다 on a vowel stem,
// -는다 on a consonant stem, the ㄹ-stem that loses its ㄹ, and an adjective left as it is.
assert(allAnswers.indexOf('회사에 다닌다') >= 0 && allAnswers.indexOf('먹는다') >= 0
  && allAnswers.indexOf('논다') >= 0 && allAnswers.indexOf('즐겁다') >= 0,
  'the four shapes of the plain style are all keyed — 다닌다, 먹는다, 논다, 즐겁다');
assert(allAnswers.indexOf('나는') >= 0 && allAnswers.indexOf('난') >= 0 && allAnswers.indexOf('우리') >= 0,
  'and so is the pronoun the style changes with it — 나는, 난, 우리');
assert(allAnswers.some((a) => /^안경을 쓴 지 오 년/.test(a)) && allAnswers.some((a) => /삼 개월/.test(a))
  && allAnswers.some((a) => /세 시간 됐어요$/.test(a)),
  'the drill reads its bracketed numbers with the counter’s own set: 오 년, 삼 개월, 세 시간');

// ── 6. The 문형 연습 clips ───────────────────────────────────────────────────
console.log('\n--- 6. The clips ---');
const drills = ex.filter((e) => e.section === '문형 연습');
assert(drills.length === 4 && drills.every((e) => e.items.length === 4), 'four drills of four items, as the page prints them');
assert(drills.every((e) => e.example && e.example.audio && e.example.audio.src), 'and every 보기 plays through first');
const clips = [];
drills.forEach((e) => {
  if (e.example && e.example.audio) clips.push(e.example.audio);
  e.items.forEach((row) => { if (row.audio) clips.push(row.audio); });
});
assert(clips.length === 20, 'twenty clips in all (' + clips.length + ')');
assert(clips.every((a) => /^audio\/book\/2b-u18-p\d-\d\.mp3$/.test(a.src)), 'each is named for its drill and its item');
assert(new Set(clips.map((a) => a.src)).size === clips.length, 'no two rows share a clip');
const gone = clips.filter((a) => !fs.existsSync(path.join(ROOT, a.src))).map((a) => a.src);
assert(gone.length === 0, 'every clip is on disk' + (gone.length ? ' — ' + gone.join(', ') : ''));
assert(clips.every((a) => a.askEnd > 1 && a.askEnd < 6), 'and every one stops for an answer somewhere in the middle');
// 연습 1's cue is printed on the student's line but spoken by the teacher, after a pause of its
// own, so its clips stop later than the other drills' do.
const ask1 = drills[0].items.map((r) => r.audio.askEnd);
const askRest = drills.slice(1).reduce((a, e) => a.concat(e.items.map((r) => r.audio.askEnd)), []);
assert(Math.min(...ask1) > Math.max(...askRest.slice(0, 4)),
  '연습 1 stops later than 연습 2, because its teacher reads the cue as well as the question');
// Pace bands, measured on the clips as cut: after askEnd come half the 1.15s pause, the answer
// and a 0.30s tail.
const BAND = { 1: [4.2, 4.8], 2: [5.0, 5.9], 3: [3.4, 4.3], 4: [4.2, 5.1] };
const HALF_PAUSE = 0.575, TAIL = 0.30;
let ffprobe = true;
const durOf = (rel) => Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, rel)],
  { encoding: 'utf8' }).trim());
try { durOf(clips[0].src); } catch (e) { ffprobe = false; }
if (!ffprobe) {
  console.log('      (ffprobe not on this machine — the pace bands are skipped)');
} else {
  const blunt = [];
  drills.forEach((e) => {
    const d = Number(e.id.slice(-1));
    const [lo, hi] = BAND[d];
    const paces = e.items.map((row) => syl(keyed(row)) / (durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL));
    const out = paces.filter((p) => p < lo || p > hi);
    assert(out.length === 0, 'drill ' + d + ': all four answers read at a human pace (band ' + lo + '-' + hi + ')');
    const shifted = e.items.map((row, k) => syl(keyed(e.items[(k + 1) % 4]))
      / (durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL));
    if (!shifted.some((p) => p < lo || p > hi)) blunt.push(d);
  });
  assert(blunt.length === 0, 'and every drill fails its band when the pairing is shifted by one'
    + (blunt.length ? ' — except ' + blunt.join(', ') : ''));
}
const MARK = {
  1: [/[가-힣] 지 [가-힣 ]+ 됐어요$/, 'is -(으)ㄴ 지 … 됐어요'],
  2: [/(이나|[가-힣]나) [가-힣]+$/, 'puts 이나 or 나 after its counter'],
  3: [/[가-힣](?<!니)다$/, 'ends in the plain style'],
  4: [/(이다|이었다|아니다)$/, 'ends in the plain-style copula']
};
drills.forEach((e) => {
  const d = Number(e.id.slice(-1));
  const [re, label] = MARK[d];
  const off = e.items.filter((row) => !re.test(keyed(row)));
  assert(off.length === 0, 'every answer in drill ' + d + ' ' + label + (off.length ? ' — item ' + off.map((r) => r.n).join(', ') : ''));
});

// ── 7. Wiring and production ────────────────────────────────────────────────
console.log('\n--- 7. Wiring and production ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit18World\(\)\) return '\/worlds\/unit18-workbook\.json'/.test(ui), 'workbookUrl resolves Unit 18 to its own 익힘책');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("unit18: path.join('worlds', 'unit18-workbook.json')") >= 0,
  'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit18-workbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit18-workbook.json') >= 0, 'and the example corpus can quote it');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let accepted = null;
try { accepted = validateWorkbook(JSON.parse(JSON.stringify(wb)), 'worlds/unit18-workbook.json'); } catch (e) {
  accepted = { error: e.message };
}
assert(accepted && !accepted.error && accepted.exercises.length === 14,
  'the shared validator accepts the bank as it stands' + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit18-workbook.json'), 'the bank publishes');
const absent = clips.map((a) => a.src).filter((s) => !batch.has(s));
assert(absent.length === 0, 'and all twenty clips go up with it' + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit18_workbook: all passed');
