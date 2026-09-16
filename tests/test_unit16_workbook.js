'use strict';
/**
 * tests/test_unit16_workbook.js — the 익힘책 for 16과 설날에는 밥 대신 떡국을 먹어요.
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the four things it cannot.
 *
 *   1. **Fidelity to the book.** Printed pp.138-149 hold sixteen exercises across three 어휘
 *      pages and four grammar points, and the 정답 at the back — printed pp.207-208 — gives an
 *      answer to every item but one. Section 2 holds all 74 of those answers verbatim and
 *      compares them against the button each row actually keys, so a row that drifts fails
 *      here rather than teaching the wrong Korean.
 *
 *   2. **The one item that is not here.** 문법과 표현 3 연습 1 item 5 prints an empty picture
 *      box and an empty B line — answer whatever you like — so the 정답 gives it nothing and
 *      there is nothing a screen could mark. `omittedNote` names it, and section 1 asserts it
 *      still does.
 *
 *   3. **The cut.** Every 문형 연습 row carries a clip off Track16. The page prints "track 16"
 *      and that is the file name, not a number to convert: the workbook CD is grouped, not
 *      offset — 02/03/04 for units 10/11/12, 09/10/11 for 13/14/15, 16/17/18 for 16/17/18.
 *      Section 5 pins a pace band per drill and says which of the four it can bite on.
 *
 *   4. **What the chapter is for.** Four grammar points, and the bank has to drill all four
 *      rather than three and a favourite. Section 4 finds each of them in the answers.
 *
 * Run: node tests/test_unit16_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit16-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;
const keyed = (row) => nfc(((row.choices || []).find((c) => c.id === row.answer) || {}).ko);

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 16 · 연습 문제 — 16과 설날에는 밥 대신 떡국을 먹어요');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit16-workbook', 'the bank names itself');
assert(/Unit 16/.test(wb.source) && /떡국을 먹어요/.test(wb.source), 'and says which chapter it is from');
assert(wb.titleKo === '연습 문제' && wb.titleEn === 'Workbook', 'the desk labels it 연습 문제');
assert(ex.length === 15, 'fifteen exercises (found ' + ex.length + ')');
const rows = ex.reduce((n, e) => n + e.items.length, 0);
assert(rows === 74, 'seventy-four rows across them (found ' + rows + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 1 | 문법과 표현 2 | 문법과 표현 3 | 문법과 표현 4 | 문형 연습',
  'the book’s own sections, in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 3
  && ex.filter((e) => /^문법과 표현/.test(e.section)).length === 8
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'three 어휘, eight across the four grammar points, four 문형 연습');
// The four points the 익힘책's own cover page lists for this unit, in its order.
const points = [...new Set(ex.filter((e) => /^문법과 표현/.test(e.section)).map((e) => e.sectionEn))];
assert(points.join(' | ') === 'V-아/어 놓다 | N 대신 | V-(으)ㄹ까 하다 | A/V-(으)ㄹ 테니까',
  'the four grammar points are the four the book lists (' + points.join(', ') + ')');
assert(ex.every((e) => e.pattern && e.pattern.length), 'every exercise carries the point that titles it in the list');
assert(new Set(ex.map((e) => e.section + '|' + e.no)).size === ex.length,
  'and section-plus-number is unique, though 연습 1 repeats across the page');

// The one that is not here, and the reason.
assert(typeof wb.omittedNote === 'string' && wb.omittedNote.length > 120, 'the bank says what it leaves out');
['연습 1', 'p.144', '문법과 표현 3'].forEach((needle) => {
  assert(wb.omittedNote.indexOf(needle) >= 0, 'omittedNote names ' + needle);
});
assert(/정답|no answer|not one/.test(wb.omittedNote), 'and says why — the 정답 pages give it none');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 80,
  'the bank records its illustrations and source answer key');
assert(/닦았어요/.test(wb.artNote) && /p\.207/.test(wb.artNote),
  'and names the one row a picture would otherwise have decided, and where the key that settled it is');

// ── 2. Every answer in the 정답 at the back ─────────────────────────────────
// Printed pp.207-208, read before a single row was written. Compared against the button each
// row keys rather than against the filled sentence: half of these exercises print the teacher's
// prompt on the same row as the answer, so a containment check would pass on words that were
// never in the blank.
console.log('\n--- 2. The answer key (printed pp.207-208) ---');
const KEY = {
  'u16-vocab-1': ['한복을 입었어요', '윷놀이를 해요', '세배를 해요', '차례를 지내요', '고향에 가요'],
  'u16-vocab-2': ['식혜', '한과', '떡국', '빈대떡', '송편'],
  'u16-vocab-3': ['청소기를 돌리면 안 돼요', '장을 봐요', '세탁기를 돌려야 돼요', '방을 닦았어요', '정리를 못 했어요'],
  'u16-grammar-1-1': ['예매를 해 놓아야 돼요', '청소를 해 놓아야 돼요', '종이에 써 놓아야 돼요',
    '장을 봐 놓아야 돼요', '돈을 찾아 놓아야 돼요', '맛있는 식당을 알아 놓아야 돼요'],
  'u16-grammar-1-2': ['열어 놓았어요', '해 놓았어요', '빌려 놓았어요', '알아 놓았어요', '꺼 놓았어요', '넣어 놓았어요'],
  'u16-grammar-2-1': ['사과 대신 바나나를 샀어요', '전화 대신 문자를 보냈어요', '동생 대신 내가 운전을 했어요',
    '나 대신 친구가 설거지를 했어요', '해외여행 대신 국내 여행을 했어요'],
  'u16-grammar-2-2': ['제가 대신 갖다 줄게요', '야구 대신 농구 보러 가요', '주소 대신 전화번호를',
    '꽃 대신 과일을', '어머니 대신 요리를 하고 있어요', '지호 대신 제가 왔어요'],
  'u16-grammar-3-1': ['쇼핑을 할까 해요', '김밥을 먹을까 해요', '제주도에 갈까 해요', '꽃을 사 갈까 해요'],
  'u16-grammar-3-2': ['갈까 하는데', '비빔밥을 먹을까 하는데', '등산할까 하는데', '배울까 하는데',
    '시킬까 하는데', '테니스를 칠까 하는데'],
  'u16-grammar-4-1': ['제가 할 테니까', '제가 살 테니까', '제가 도와줄 테니까', '제가 빌려 줄 테니까',
    '제가 청소기를 돌릴 테니까'],
  'u16-grammar-4-2': ['사람이 많을 테니까', '비가 올 테니까', '더울 테니까', '모자라지 않을 테니까',
    '전화를 못 받으실 테니까'],
  'u16-pattern-1': ['버스 대신 택시를 탔어요', '주소 대신 전화번호를 가르쳐 줬어요',
    '친구 대신 제가 전화를 했어요', '동생 대신 제가 운전을 했어요'],
  'u16-pattern-2': ['네, 벌써 찍어 놓았어요', '네, 벌써 써 놓았어요', '네, 벌써 예약해 놓았어요',
    '네, 벌써 만들어 놓았어요'],
  'u16-pattern-3': ['집에서 쉴까 해요', '영화를 볼까 해요', '김밥을 먹을까 해요', '원피스를 입을까 해요'],
  'u16-pattern-4': ['빨리 갈 테니까 기다리세요', '내가 도와줄 테니까 걱정하지 마세요',
    '지금은 전화를 안 받을 테니까 나중에 전화하세요', '날씨가 추울 테니까 따뜻하게 입으세요']
};
assert(Object.keys(KEY).length === ex.length, 'the key covers every exercise in the bank');
assert(Object.values(KEY).reduce((n, a) => n + a.length, 0) === 74,
  'and all 74 answers are written out, not summarised');
const drifted = [];
ex.forEach((e) => {
  const want = KEY[e.id] || [];
  if (want.length !== e.items.length) {
    drifted.push(e.id + ': ' + e.items.length + ' rows for ' + want.length + ' key answers');
    return;
  }
  e.items.forEach((row, i) => {
    if (flat(keyed(row)) !== flat(want[i])) {
      drifted.push(e.id + ' item ' + row.n + ': keys «' + keyed(row) + '», key says «' + want[i] + '»');
    }
  });
});
assert(drifted.length === 0, 'every row keys exactly what the 정답 says'
  + (drifted.length ? ' — ' + drifted.slice(0, 4).join(' | ') : ''));
// And no wrong button is an answer the key gives somewhere else in the same exercise, which
// would make one of the two right — everywhere except 어휘 연습 2, where that is the exercise.
// The book prints five foods in one box and five definitions under it, so the four wrong
// buttons on every row are the other four foods and could not be anything else. Named here
// rather than skipped, and checked from the other side instead.
const SHARED_BOX = 'u16-vocab-2';
const doubled = [];
ex.filter((e) => e.id !== SHARED_BOX).forEach((e) => {
  const right = new Set((KEY[e.id] || []).map(flat));
  e.items.forEach((row) => {
    (row.choices || []).filter((c) => c.id !== row.answer && right.has(flat(c.ko)))
      .forEach((c) => doubled.push(e.id + ' item ' + row.n + ': «' + c.ko + '»'));
  });
});
assert(doubled.length === 0, 'outside 어휘 연습 2, no wrong button is another row’s right answer'
  + (doubled.length ? ' — ' + doubled.join(', ') : ''));
{
  const box = ex.find((e) => e.id === SHARED_BOX);
  const foods = new Set(KEY[SHARED_BOX].map(flat));
  const stray = box.items.reduce((a, row) => a.concat((row.choices || [])
    .filter((c) => !foods.has(flat(c.ko))).map((c) => c.ko)), []);
  assert(foods.size === 5 && stray.length === 0,
    'and inside it every button is one of the five foods the box prints, which is what that exercise is'
    + (stray.length ? ' — ' + stray.join(', ') : ''));
}

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
    if (String(row.grammar || '').length < 17) faults.push(at + ': grammar note too thin');
    if (!row.en) faults.push(at + ': no English');
  });
});
assert(faults.length === 0, 'every row has three distinct buttons, a gap for each answer, and its prose'
  + (faults.length ? ' — ' + faults.slice(0, 5).join(', ') : ''));

// The grammar note is not held to a word count, because half of them are one-line rules that
// say all there is to say — 보다 takes -ㄹ까: 볼까. What every one of them is held to is that it
// is about THIS row: a note that quotes nothing from the sentence or the buttons above it is a
// note that was written for a different item, which is the failure a length check never sees.
const unquoted = [];
ex.forEach((e) => e.items.forEach((row) => {
  const hay = flat(row.lines.map((l) => l.ko).join('') + (row.choices || []).map((c) => c.ko).join(''));
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
ex.forEach((e) => e.items.forEach((row) => allAnswers.push(keyed(row))));
const text = allAnswers.join(' ');
// 까 하 and 까 해 are one form: 하다 keeps its stem in 하는데 and contracts in 해요, and both
// endings are keyed in this bank. Matching only the first found six rows of fourteen.
const PATTERNS = [['V-아/어 놓다', /놓/], ['N 대신', /대신/],
  ['V-(으)ㄹ까 하다', /까 하|까 해/], ['A/V-(으)ㄹ 테니까', /테니까/]];
PATTERNS.forEach(([label, re]) => assert(re.test(text), 'the bank drills ' + label));
const counts = {};
PATTERNS.forEach(([label, re]) => { counts[label] = allAnswers.filter((a) => re.test(a)).length; });
assert(Object.values(counts).every((n) => n >= 10),
  'and none of the four is a token appearance — '
  + Object.entries(counts).map(([k, v]) => k + ' ' + v).join(', '));
// The two halves of -(으)ㄹ 테니까: an offer with 제가 in front of it, and a guess without one.
const teni = allAnswers.filter((a) => /테니까/.test(a));
assert(teni.some((a) => /^제가/.test(a)) && teni.some((a) => !/^제가|^내가/.test(a)),
  'and 테니까 is drilled both as an offer (제가 …) and as a guess (비가 올 …)');
// The ㅂ irregular is the one spelling this chapter can actually get wrong twice over.
assert(allAnswers.some((a) => /더울/.test(a)) && allAnswers.some((a) => /추울/.test(a)),
  'both ㅂ-irregular adjectives the chapter uses are keyed — 더울 and 추울');
assert(allAnswers.some((a) => /입으세요/.test(a)),
  'and 입다, which looks like one and is not, is keyed as 입으세요');

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
assert(clips.every((a) => /^audio\/book\/2b-u16-p\d-\d\.mp3$/.test(a.src)),
  'each is named for its drill and its item');
assert(new Set(clips.map((a) => a.src)).size === clips.length, 'no two rows share a clip');
const gone = clips.filter((a) => !fs.existsSync(path.join(ROOT, a.src))).map((a) => a.src);
assert(gone.length === 0, 'every clip is on disk' + (gone.length ? ' — ' + gone.join(', ') : ''));
assert(clips.every((a) => a.askEnd > 1 && a.askEnd < 6),
  'and every one stops for an answer somewhere in the middle of itself');

// The pace band per drill, measured on the clips as they were cut. Each clip holds the
// teacher's cue, a 1.15s pause and the model answer, and askEnd is the middle of that pause —
// so what follows askEnd is half a pause (0.575s), the answer, and the 0.30s tail. Dividing
// the answer's syllables by what is left is a pace. A re-cut at the wrong threshold, or a text
// paired with the wrong clip, lands outside.
const BAND = { 1: [4.1, 5.4], 2: [3.0, 4.2], 3: [3.8, 5.5], 4: [4.8, 5.6] };
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
  // And the band has teeth where it can: shifting the text against the clips inside a drill
  // has to break it. Drill 2 is the documented exception — its four answers are 네, 벌써 and
  // one changed word, 8 to 10 syllables, so a swap stays inside any band wide enough for the
  // set. Named rather than skipped, so a fifth blunt drill would be noticed.
  const bitten = [];
  drills.forEach((e) => {
    const d = Number(e.id.slice(-1));
    const [lo, hi] = BAND[d];
    const list = e.items;
    const shifted = list.map((row, k) => syl(keyed(list[(k + 1) % list.length]))
      / (durOf(row.audio.src) - row.audio.askEnd - HALF_PAUSE - TAIL));
    if (shifted.some((r) => r < lo || r > hi)) bitten.push(d);
  });
  assert(bitten.join(',') === '1,3,4',
    'drills 1, 3 and 4 fail their band when the pairing is shifted by one, and drill 2 cannot '
    + '(broke: ' + bitten.join(', ') + ')');
}
// What can be checked from the bank alone is that the answer beside each clip is the one the
// drill is for — by the pattern the drill exists to practise, which every one of its answers
// carries, and not by its final verb: drill 4 takes its verb from the teacher every time.
const MARK = {
  1: [/대신/, 'uses 대신'],
  2: [/놓았어요$/, 'ends in 놓았어요'],
  3: [/까 해요$/, 'ends in -(으)ㄹ까 해요'],
  4: [/테니까[\s\S]*세요$/, 'runs -(으)ㄹ 테니까 … -(으)세요']
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
assert(/isUnit16World\(\)\) return '\/worlds\/unit16-workbook\.json'/.test(ui),
  'workbookUrl resolves Unit 16 to its own 익힘책');
assert(read(path.join('admin', 'lib', 'workbook.js')).indexOf("unit16: path.join('worlds', 'unit16-workbook.json')") >= 0,
  'the admin panel can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit16-workbook.json'") >= 0,
  'it is a translatable source, or it ships in English at 100% coverage');
assert(read(path.join('scripts', 'vocab_examples.js')).indexOf('worlds/unit16-workbook.json') >= 0,
  'and the example corpus can quote it');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
let accepted = null;
try { accepted = validateWorkbook(JSON.parse(JSON.stringify(wb)), 'worlds/unit16-workbook.json'); } catch (e) {
  accepted = { error: e.message };
}
assert(accepted && !accepted.error && accepted.exercises.length === 15,
  'the shared validator accepts the bank as it stands'
  + (accepted && accepted.error ? ' — ' + accepted.error : ''));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit16-workbook.json'), 'the bank publishes');
const absent = clips.map((a) => a.src).filter((s) => !batch.has(s));
assert(absent.length === 0, 'and all twenty clips go up with it'
  + (absent.length ? ' — ' + absent.slice(0, 3).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit16_workbook: all passed');
