'use strict';
/**
 * tests/test_unit12_workbook.js — the 익힘책 for 12과 저는 좀 조용한 편이에요.
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the three things it cannot.
 *
 *   1. **Fidelity to the book.** Pages 44-55 print seventeen exercises across two 어휘 pages
 *      and four grammar points, and fourteen of them have an answer in the 정답 at the back —
 *      printed p.203, which this unit had the luxury of reading before writing a single row.
 *      Section 2 holds every one of those answers verbatim, so a row that drifts fails here
 *      rather than teaching the wrong Korean.
 *
 *   2. **The three exercises that are not here.** All three are real exercises with no right
 *      answer: write about someone you envy, ask a classmate six questions, score yourself on
 *      a health quiz. `omittedNote` names them, and section 1 asserts it still does.
 *
 *   3. **The cut.** Every 문형 연습 row carries a clip off Track04 — the page prints "track 4"
 *      and that is the file name, not a number to convert; the workbook CD runs 02/03/04 for
 *      units 10/11/12 and 09/10/11 for 13/14/15. Section 5 pins a pace band per drill.
 *
 * Run: node tests/test_unit12_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit12-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 12 · 연습 문제 — 12과 저는 좀 조용한 편이에요');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit12-workbook', 'the bank names itself');
assert(/Unit 12/.test(wb.source) && /조용한 편이에요/.test(wb.source), 'and says which chapter it is from');
assert(wb.titleKo === '연습 문제' && wb.titleEn === 'Workbook', 'the desk labels it 연습 문제');
assert(ex.length === 14, 'fourteen exercises (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 70, 'seventy rows across them (found ' + rows + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 1 | 문법과 표현 2 | 문법과 표현 3 | 문법과 표현 4 | 문형 연습',
  'the book’s own sections, in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 2
  && ex.filter((e) => /^문법과 표현/.test(e.section)).length === 8
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'two 어휘, eight across the four grammar points, four 문형 연습');
// The four points the 익힘책's own contents page lists for this unit, in its order.
const points = [...new Set(ex.filter((e) => /^문법과 표현/.test(e.section)).map((e) => e.sectionEn))];
assert(points.join(' | ') === 'Grammar 1 · A-아/어 보이다 | Grammar 2 · N처럼[같이] | '
  + 'Grammar 3 · A-(으)ㄴ 편이다, V-는 편이다 | Grammar 4 · A-게',
  'the four grammar points are the four the book lists');
assert(ex.every((e) => e.pattern && e.pattern.length), 'every exercise carries the point that titles it in the list');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length,
  'and section-plus-number is unique, though 연습 1 repeats across the page');

// The three that are not here, and the reason that is the same for all three.
assert(typeof wb.omittedNote === 'string' && wb.omittedNote.length > 120, 'the bank says what it leaves out');
['연습 3', 'p.49', '연습 2', 'p.51'].forEach((needle) => {
  assert(wb.omittedNote.indexOf(needle) >= 0, 'omittedNote names ' + needle);
});
assert(/right answer|no answer|정답/.test(wb.omittedNote),
  'and says why — the 정답 pages give them none');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 80,
  'the bank says what it does about the book’s pictures, which are not here yet');
assert(/넓어 보여요/.test(wb.artNote) && /날씬해 보여요/.test(wb.artNote),
  'and names the two rows a picture actually decides');

// ── 2. Every answer in the 정답 at the back ─────────────────────────────────
console.log('\n--- 2. The answer key (printed p.203) ---');
const KEY = {
  // 어휘 p.44: the key prints both halves of every pair.
  'u12-vocab-1': ['진해요 연해요', '있어요 없어요', '높아요 낮아요', '커요 작아요',
    '두꺼워요 얇아요', '넓어요 좁아요', '넓어요 좁아요', '커요 작아요'],
  'u12-vocab-2': ['활발한 것 같아요', '남성적이에요', '성격이 급해요', '내성적이에요', '여성적인데'],
  'u12-grammar-1-1': ['길어 보여요', '커 보여요', '넓어 보여요', '많아 보여요', '날씬해 보여요'],
  'u12-grammar-1-2': ['옷이 따뜻해 보이네요', '책이 어려워 보이네요', '케이크가 맛있어 보이네요',
    '피곤해 보이네요', '힘들어 보이네요'],
  'u12-grammar-2-1': ['여름처럼 더워요', '그림처럼 아름다워요', '시계처럼 정확해요',
    '모델처럼 키가 커요', '우리 집처럼 편해요'],
  'u12-grammar-2-2': ['새', '아이', '가족', '바다', '영화'],
  'u12-grammar-3-1': ['넓은 편이에요', '꼼꼼한 편이에요', '전화하는 편이에요',
    '안 먹는 편이에요', '만드는 편이에요'],
  'u12-grammar-4-1': ['싸게', '늦게', '크게', '재미있게', '따뜻하게', '바쁘게'],
  'u12-grammar-4-2': ['손을 깨끗하게 씻어요', '책을 재미있게 읽어요', '음식을 맛있게 먹어요',
    '이름을 크게 말해요', '그림을 예쁘게 그려요'],
  'u12-grammar-4-3': ['빨리', '열심히', '많이', '멀리', '천천히'],
  'u12-pattern-1': ['성격이 좋아 보여요', '키가 커 보여요', '영화가 재미있어 보여요', '문제가 어려워 보여요'],
  'u12-pattern-2': ['저도 마리코 씨처럼 요리를 잘했으면 좋겠어요', '저도 켈리 씨처럼 성격이 활발했으면 좋겠어요',
    '저도 줄리앙 씨처럼 기타를 잘 쳤으면 좋겠어요', '저도 샤오밍 씨처럼 키가 컸으면 좋겠어요'],
  'u12-pattern-3': ['비싼 편이에요', '조용한 편이에요', '열심히 하는 편이에요', '재미있는 편이에요'],
  'u12-pattern-4': ['맛있게 먹었어요', '싸게 샀어요', '쉽게 구했어요', '깨끗하게 했어요']
};
assert(Object.keys(KEY).length === ex.length, 'the key covers every exercise in the bank');

function filledOf(e, row) {
  const one = (row.choices || []).find((c) => c.id === row.answer) || {};
  const two = (row.choices2 || []).find((c) => c.id === row.answer2) || {};
  let out = nfc(row.lines.map((l) => l.ko).join(' '));
  out = out.replace('{}', nfc(one.ko || ''));
  if (row.choices2) out = out.replace('{}', nfc(two.ko || ''));
  return out;
}
const drifted = [];
ex.forEach((e) => {
  const want = KEY[e.id] || [];
  if (want.length !== e.items.length) {
    drifted.push(e.id + ': ' + e.items.length + ' rows for ' + want.length + ' key answers');
  }
  e.items.forEach((row, i) => {
    if (want[i] === undefined) return;
    const filled = flat(filledOf(e, row));
    // A two-blank key answer is written "진해요 연해요" and both halves have to be in the row.
    const missing = want[i].split(' ').filter((part) => filled.indexOf(flat(part)) < 0);
    if (missing.length) {
      drifted.push(e.id + ' item ' + row.n + ': «' + missing.join(', ') + '» is not in «' + filledOf(e, row) + '»');
    }
  });
});
assert(drifted.length === 0, 'every row answers what the key says it answers'
  + (drifted.length ? ' — ' + drifted.slice(0, 4).join(' | ') : ''));

// ── 3. Every row is answerable and worth reading ────────────────────────────
console.log('\n--- 3. Every row is answerable ---');
const faults = [];
ex.forEach((e) => {
  if (String(e.noteEn || '').length < 60) faults.push(e.id + ': noteEn too thin');
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
    if (String(row.why || '').length < 80) faults.push(at + ': why too thin');
    if (String(row.grammar || '').length < 40) faults.push(at + ': grammar note too thin');
    if (!row.en) faults.push(at + ': no English');
  });
});
assert(faults.length === 0, 'every row has three distinct buttons, a gap for each answer, and its prose'
  + (faults.length ? ' — ' + faults.slice(0, 5).join(', ') : ''));

// A wrong button that is the right one respaced is not a distractor, it is a typo the learner
// gets marked down for. Checked across both blanks of a row.
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
// Four syllables in a row is the threshold: enough to be a quotation, short enough that a
// twelve-syllable drill answer does not have to be repeated whole.
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
ex.forEach((e) => e.items.forEach((row) => allAnswers.push(filledOf(e, row))));
const text = allAnswers.join(' ');
[['보이다', /보여요|보이네요/], ['처럼', /처럼/], ['편이다', /편이에요/], ['-게', /게 /]]
  .forEach(([label, re]) => assert(re.test(text), 'the bank drills ' + label));
// 편이다 is the chapter title, and the difficulty is which of two endings a word takes.
const pyeon = allAnswers.filter((a) => /편이에요/.test(a));
assert(pyeon.length === 9, 'nine rows end in 편이에요 (' + pyeon.length + ')');
assert(pyeon.some((a) => /는 편이에요/.test(a)) && pyeon.some((a) => /[가-힣]ㄴ? ?편이에요/.test(a)),
  'and both endings are drilled — V-는 편이다 as well as A-(으)ㄴ 편이다');
assert(allAnswers.some((a) => /만드는/.test(a)),
  'including the ㄹ stem that drops before -는: 만들다 gives 만드는, not 만들는');
// -게 and the adverbs that refuse it sit in the same section on purpose.
const geRow = ex.find((e) => e.id === 'u12-grammar-4-3');
assert(!!geRow && geRow.items.every((row) => /히$|리$|이$/.test((row.choices.find((c) => c.id === row.answer) || {}).ko)),
  'the adverb exercise keys only the forms that do not use -게 (빨리, 열심히, 많이, 멀리, 천천히)');

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
assert(clips.every((a) => /^audio\/book\/2b-u12-p\d-\d\.mp3$/.test(a.src)),
  'each is named for its drill and its item');
assert(new Set(clips.map((a) => a.src)).size === clips.length, 'no two rows share a clip');
const gone = clips.filter((a) => !fs.existsSync(path.join(ROOT, a.src))).map((a) => a.src);
assert(gone.length === 0, 'every clip is on disk' + (gone.length ? ' — ' + gone.join(', ') : ''));
assert(clips.every((a) => a.askEnd > 1 && a.askEnd < 5),
  'and every one stops for an answer somewhere in the middle of itself');

// The pace band per drill, measured on the clips as they were cut. Each clip holds the
// teacher's cue, a 1.15s pause and the model answer, and askEnd is the middle of that pause —
// so what follows askEnd is half a pause (0.575s), the answer, and the 0.30s tail. Dividing
// the answer's syllables by what is left is a pace, and it is low in drills 2-4 because those
// answers have real pauses inside them. A re-cut at the wrong threshold lands outside.
const BAND = { 1: [4.7, 5.9], 2: [3.0, 4.4], 3: [2.6, 4.4], 4: [2.3, 3.8] };
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
    const paces = e.items.map((row) => {
      const ko = (row.choices.find((c) => c.id === row.answer) || {}).ko;
      const after = durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL;
      return { n: row.n, pace: syl(ko) / after };
    });
    const out = paces.filter((r) => r.pace < lo || r.pace > hi);
    const mean = paces.reduce((a, r) => a + r.pace, 0) / paces.length;
    assert(out.length === 0, 'drill ' + d + ': all four answers read at a human pace for their text ('
      + mean.toFixed(2) + ' syl/s, band ' + lo + '-' + hi + ')'
      + (out.length ? ' — item ' + out.map((r) => r.n + ' at ' + r.pace.toFixed(2)).join(', ') : ''));
  });
  // And the band has teeth where it can: shifting the text against the clips inside a drill
  // has to break it. Drills 2 and 4 are the documented exception — their four answers are the
  // same frame with one word changed, so a swap stays inside any band wide enough for the set.
  const bitten = [];
  drills.forEach((e) => {
    const d = Number(e.id.slice(-1));
    const [lo, hi] = BAND[d];
    const list = e.items;
    const shifted = list.map((row, k) => {
      const ko = (list[(k + 1) % list.length].choices.find((c) => c.id === list[(k + 1) % list.length].answer) || {}).ko;
      const after = durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL;
      return syl(ko) / after;
    });
    if (shifted.some((r) => r < lo || r > hi)) bitten.push(d);
  });
  assert(bitten.indexOf(1) >= 0 && bitten.indexOf(3) >= 0,
    'drills 1 and 3 fail their band when the pairing is shifted by one (broke: ' + bitten.join(', ') + ')');
}
// What can be checked from the bank alone is that the answer beside each clip is the one the
// drill is for. Not by its final verb — drill 4 takes its verb from the teacher every time —
// but by the pattern the drill exists to practise, which every one of its answers carries.
const MARK = {
  1: [/보여요$/, 'ends in 보여요'],
  2: [/씨처럼[\s\S]*으면 좋겠어요$/, 'runs 씨처럼 … 으면 좋겠어요'],
  3: [/편이에요$/, 'ends in 편이에요'],
  4: [/게 [가-힣]+$/, 'is an -게 adverb in front of a verb']
};
drills.forEach((e) => {
  const d = Number(e.id.slice(-1));
  const [re, label] = MARK[d];
  const off = e.items.filter((row) => !re.test(nfc((row.choices.find((c) => c.id === row.answer) || {}).ko)));
  assert(off.length === 0, 'every answer in drill ' + d + ' ' + label
    + (off.length ? ' — item ' + off.map((r) => r.n).join(', ') : ''));
});

// ── 6. Wiring and production ────────────────────────────────────────────────
console.log('\n--- 6. Wiring and production ---');
const ui = read(path.join('js', 'ui.js'));
assert(/isUnit12World\(\)\) return '\/worlds\/unit12-workbook\.json'/.test(ui),
  'workbookUrl resolves Unit 12 to its own 익힘책');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("unit12: path.join('worlds', 'unit12-workbook.json')") >= 0,
  'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit12-workbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit12-workbook.json') >= 0,
  'and the example corpus can quote it');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let accepted = null;
try { accepted = validateWorkbook(JSON.parse(JSON.stringify(wb)), 'worlds/unit12-workbook.json'); } catch (e) {
  accepted = { error: e.message };
}
assert(accepted && !accepted.error && accepted.exercises.length === 14,
  'the shared validator accepts the bank as it stands'
  + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit12-workbook.json'), 'the bank publishes');
const absent = clips.map((a) => a.src).filter((s) => !batch.has(s));
assert(absent.length === 0, 'and all twenty clips go up with it'
  + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit12_workbook: all passed');
