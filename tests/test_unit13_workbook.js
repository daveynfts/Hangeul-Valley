'use strict';
/**
 * tests/test_unit13_workbook.js — the 익힘책 for 13과 주변이 조용해서 살기 좋아요.
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the two things it cannot.
 *
 *   1. Fidelity to the book. Pages 76-87 print seventeen exercises across four grammar
 *      points, sixteen of which have an answer in the key at the back. Section 2 holds every
 *      one of those answers, so a row that drifts fails here rather than teaching the wrong
 *      Korean.
 *
 *   2. The cut. Every 문형 연습 row carries a clip cut off track 9, and a clip is a claim
 *      about which question goes with which answer. Section 4 pins a pace band per drill and
 *      then shifts the text-to-clip pairing by one to show the band has teeth.
 *
 * Run: node tests/test_unit13_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit13-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 13 · 연습 문제 — 13과 주변이 조용해서 살기 좋아요');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit13-workbook', 'the bank names itself');
assert(/Unit 13/.test(wb.source), 'and says which book it is from');
assert(ex.length === 16, 'sixteen exercises (found ' + ex.length + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 | 문형 연습',
  'three sections in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 2
  && ex.filter((e) => e.section === '문법과 표현').length === 10
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'two 어휘, ten 문법과 표현, four 문형 연습');
// The one printed exercise with no answer in the key is not here, and the bank says so. A
// count that implied full coverage would be a lie.
assert(typeof wb.omittedNote === 'string' && /연습 2/.test(wb.omittedNote) && /85/.test(wb.omittedNote),
  'and the bank names the printed exercise it does not carry, and why');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 80,
  'the bank says what it does about the book’s pictures, which are not here yet');
// 연습 1 is the headline five times over, so the list has to be titled by the grammar point
// instead — otherwise the picker reads as one row repeated.
assert(ex.every((e) => e.pattern && e.pattern.length),
  'every exercise carries the grammar point that titles it in the list');
// The list groups rows under their section, so what the reader sees is section, then grammar
// point, then number — and that triple has to be unique. Pattern-plus-number alone is not:
// A/V-(으)ㄹ지 모르겠다 연습 1 appears once in 문법과 표현 and again in 문형 연습, which is the
// book's own numbering and not a mistake.
const noRepeats = ex.filter((e) => e.no === '연습 1').length;
assert(noRepeats > 1 && new Set(ex.map((e) => e.section + '|' + e.pattern + '|' + e.no)).size === ex.length,
  'and section-plus-pattern-plus-number is unique even though 연습 1 appears ' + noRepeats + ' times');

// ── 2. Every answer in the key at the back ──────────────────────────────────
console.log('\n--- 2. The answer key ---');
// What the key prints, exercise by exercise. For 어휘 these are the chip that goes in the
// blank; for everything else they are the answer as the key writes it, and the row's own
// sentence has to contain it.
const KEY = {
  'u13-vocab-1': ['시설이 잘되어 있습니다', '새로 지어서', '주변이 조용합니다', '전망이 좋습니다', '교통이 편리합니다'],
  'u13-vocab-2': ['집세', '교통비', '식비', '전기 요금', '가스 요금', '수도 요금', '전화 요금'],
  'u13-grammar-1-1': ['이 케이크가 맛있을지 모르겠어요', '유진 씨가 오늘 학교에 올지 모르겠어요',
    '이 옷이 동생에게 맞을지 모르겠어요', '나나 씨가 이 선물을 좋아할지 모르겠어요'],
  'u13-grammar-1-2': ['갈 수 있을지 모르겠어요', '탈 수 있을지 모르겠어요',
    '구할 수 있을지 모르겠어요', '끊을 수 있을지 모르겠어요'],
  'u13-grammar-1-3': ['뭘 살지 잘 모르겠어요', '뭐가 좋을지 잘 모르겠어요', '몇 명이 올지 잘 모르겠어요',
    '언제 만날 수 있을지 잘 모르겠어요', '몇 시에 퇴근할 수 있을지 잘 모르겠어요',
    '어떻게 도와줄 수 있을지 잘 모르겠어요'],
  'u13-grammar-2-1': ['좀 멀기는 하지만 마음에 들어요', '좋아하기는 하지만 잘 못해요',
    '예쁘기는 하지만 너무 비싸요', '기침을 좀 하기는 하지만 괜찮아요',
    '좀 맵기는 하지만 맛있어요', '먹기는 하지만 좋아하지는 않아요'],
  'u13-grammar-2-2': ['영화 보는 것을 좋아하기는 하지만 요즘 바빠서 자주 못 봐요',
    '요리하는 것을 좋아하기는 하지만 잘하지는 못해요',
    '지금 사는 집이 좋기는 하지만 관리비가 좀 비싸요',
    '우리 반 학생들은 좀 시끄럽기는 하지만 착하고 좋은 친구들이에요'],
  'u13-grammar-2-3': ['하겠지만', '했지만', '하지만', '하겠지만'],
  'u13-grammar-3-1': ['길이 복잡하기 때문에', '관리비가 싸기 때문에', '문화가 다르기 때문에',
    '학교 근처에서 살기 때문에', '계약이 끝나기 때문에'],
  'u13-grammar-3-2': ['일이 힘들기 때문에', '출근 시간이기 때문에', '휴대 전화를 잃어버렸기 때문에',
    '어제 잠을 잘 못 잤기 때문에', '우리 집은 산 옆에 있기 때문에'],
  'u13-grammar-3-3': ['일 때문에', '집주인 때문에', '숙제 때문에', '도서관이기 때문에',
    '주말 저녁이기 때문에', '눈 때문에', '세일 기간이기 때문에'],
  'u13-grammar-4-1': ['산책하기 좋아요', '집 찾기 쉬워요', '읽기가 어려워요',
    '연락하기 불편해요', '여행하기 편해요'],
  'u13-pattern-1': ['글쎄요, 있을지 모르겠어요', '글쎄요, 좋을지 모르겠어요',
    '글쎄요, 올 수 있을지 모르겠어요', '글쎄요, 일찍 도착할 수 있을지 모르겠어요'],
  'u13-pattern-2': ['맵기는 하지만 맛있어요', '피곤하기는 하지만 괜찮아요',
    '비싸기는 하지만 시설이 잘되어 있어요', '여행 가고 싶기는 하지만 시간이 없어요'],
  'u13-pattern-3': ['이 집은 넓기 때문에 두 사람이 살 수 있어요', '음식이 맛있기 때문에 그 식당에 자주 가요',
    '주말에 사람이 많기 때문에 예약해야 해요',
    '지금 휴가 기간이기 때문에 비행기 표 사기가 어려워요'],
  'u13-pattern-4': ['지하철역이 가까워서 학교 가기가 편해요', '주변이 조용해서 살기가 좋아요',
    '모르는 단어가 많아서 읽기가 어려워요', '친구가 너무 바빠서 만나기가 힘들어요']
};
assert(Object.keys(KEY).length === ex.length, 'the key covers every exercise in the bank');

// What a row actually says, with its answer in the blank.
function sentenceOf(e, row) {
  if (e.type === 'fill') {
    const chip = (e.bank || []).find((b) => b.id === row.answer) || {};
    return nfc(row.stemKo).replace('{}', nfc(chip.polite || chip.ko || ''));
  }
  if (e.type === 'match') {
    const chip = (e.bank || []).find((b) => b.id === row.answer) || {};
    return nfc(chip.ko || '');
  }
  const chip = (row.choices || []).find((c) => c.id === row.answer) || {};
  return nfc(row.lines.map((l) => l.ko).join(' ')).replace('{}', nfc(chip.ko || ''));
}
const drifted = [];
ex.forEach((e) => {
  const want = KEY[e.id] || [];
  if (want.length !== e.items.length) drifted.push(e.id + ': ' + e.items.length + ' rows for ' + want.length + ' key answers');
  e.items.forEach((row, i) => {
    if (want[i] === undefined) return;
    if (sentenceOf(e, row).indexOf(nfc(want[i])) < 0) {
      drifted.push(e.id + ' item ' + row.n + ': "' + want[i] + '" is not in "' + sentenceOf(e, row) + '"');
    }
  });
});
assert(drifted.length === 0, 'every row answers the way the key at the back does'
  + (drifted.length ? '\n      ' + drifted.slice(0, 4).join('\n      ') : ''));

// The two 어휘 exercises are the ones the shape had to bend for.
const v1 = ex.find((e) => e.id === 'u13-vocab-1');
assert(v1.type === 'fill' && v1.bank.length === 8 && v1.items.length === 5,
  '어휘 연습 1 keeps all eight printed chips for its five blanks');
const spare = v1.bank.filter((b) => !v1.items.some((i) => i.answer === b.id)).map((b) => b.dict);
assert(spare.join(', ') === '방이 넓다, 방값이 싸다, 집주인이 좋다',
  'and the three the book never uses are still on offer (' + spare.join(', ') + ')');
assert(v1.bank.every((b) => b.dict && b.polite),
  'each chip carries the box form and the form the sentence wants');
const midSentence = v1.bank.find((b) => b.id === 'newly_built');
assert(midSentence.dict === '새로 지었다' && midSentence.polite === '새로 지어서',
  'and the one blank in mid-sentence takes -어서, not -습니다');
const v2 = ex.find((e) => e.id === 'u13-vocab-2');
assert(v2.type === 'match' && v2.items.every((i) => i.img),
  '어휘 연습 2 gives every row a picture, because the picture is the prompt');
assert(v2.items.every((i) => fs.existsSync(path.join(ROOT, i.img))),
  'and every one of them is on disk');

// ── 3. Rows a learner could actually answer ─────────────────────────────────
console.log('\n--- 3. The rows ---');
const builds = ex.filter((e) => e.type === 'build');
const noBlank = [];
builds.forEach((e) => [].concat(e.example ? [e.example] : [], e.items).forEach((row) => {
  const n = row.lines.map((l) => l.ko).join('').split('{}').length - 1;
  if (n !== 1) noBlank.push(e.id + '/' + (row.n || '보기') + ' has ' + n);
}));
assert(noBlank.length === 0, 'every built row has exactly one blank'
  + (noBlank.length ? ' — ' + noBlank.slice(0, 3).join(', ') : ''));
const offered = [];
builds.forEach((e) => e.items.forEach((row) => {
  if (!(row.choices || []).some((c) => c.id === row.answer)) offered.push(e.id + '/' + row.n);
}));
assert(offered.length === 0, 'and answers with one of the buttons it shows'
  + (offered.length ? ' — ' + offered.slice(0, 3).join(', ') : ''));
// A wrong button that is the right answer with the spaces moved is not a decision.
const same = [];
builds.forEach((e) => e.items.forEach((row) => {
  const right = nfc((row.choices.find((c) => c.id === row.answer) || {}).ko).replace(/\s+/g, '');
  row.choices.forEach((c) => {
    if (c.id !== row.answer && nfc(c.ko).replace(/\s+/g, '') === right) same.push(e.id + '/' + row.n);
  });
}));
assert(same.length === 0, 'and no wrong button is the right one respaced'
  + (same.length ? ' — ' + same.slice(0, 3).join(', ') : ''));
// Every picture a row names has to be in the checkout, not merely on the machine that wrote
// the row. Two of these first pointed at a redraw that exists here and is not committed, so
// the rows were fine locally and blank for everyone else.
const noArt = [];
ex.forEach((e) => e.items.forEach((row) => {
  if (row.art && !fs.existsSync(path.join(ROOT, 'sprites', row.art))) noArt.push(e.id + '/' + row.n + ' → ' + row.art);
  if (row.img && !fs.existsSync(path.join(ROOT, row.img))) noArt.push(e.id + '/' + row.n + ' → ' + row.img);
}));
assert(noArt.length === 0, 'every picture a row names is in the checkout'
  + (noArt.length ? ' — ' + noArt.slice(0, 3).join(', ') : ''));
const thin = [];
ex.forEach((e) => e.items.forEach((row) => {
  if (!row.en || !row.why || !row.grammar) thin.push(e.id + '/' + row.n);
}));
assert(thin.length === 0, 'and every row says what it means, why that answer, and what the form is'
  + (thin.length ? ' — ' + thin.slice(0, 3).join(', ') : ''));
// The ㅂ-irregular is the point of two rows and a distractor in two more: -기 begins with a
// consonant, so 맵다 stays 맵기 — and 매운기는 is the error the page is built to catch.
const spicy = ex.find((e) => e.id === 'u13-pattern-2').items[0];
assert(nfc((spicy.choices.find((c) => c.id === spicy.answer)).ko).indexOf('맵기는') === 0
  && spicy.choices.some((c) => nfc(c.ko).indexOf('매운기는') === 0),
  'the ㅂ-irregular row offers 맵기는 against 매운기는, which is the mistake it exists for');
// N 때문에 against N(이)기 때문에 is a meaning decision, so the exercise needs both answers.
const cause = ex.find((e) => e.id === 'u13-grammar-3-3');
const bare = cause.items.filter((i) => /이기 때문에$/.test((i.choices.find((c) => c.id === i.answer) || {}).ko));
assert(bare.length === 3 && cause.items.length === 7,
  'and three of the seven 때문에 rows want N(이)기, four want the bare noun');

// ── 4. The cut off track 9 ──────────────────────────────────────────────────
console.log('\n--- 4. The 문형 연습 clips ---');
const drills = ex.filter((e) => e.section === '문형 연습');
const clips = [];
drills.forEach((e) => [].concat(e.example ? [e.example] : [], e.items)
  .forEach((row) => { if (row.audio) clips.push({ e, row }); }));
assert(clips.length === 20, 'twenty clips — a model and four items per drill (found ' + clips.length + ')');
const missing = clips.filter(({ row }) => !fs.existsSync(path.join(ROOT, row.audio.src)));
assert(missing.length === 0, 'every one is on disk'
  + (missing.length ? ' — ' + missing.slice(0, 3).map((c) => c.row.audio.src).join(', ') : ''));
const badAsk = clips.filter(({ row }) => !(row.audio.askEnd > 0.5));
assert(badAsk.length === 0, 'and each records where the question ends');
// The book prints the bracketed prompt on the student's line; the tape has the teacher read
// it. The lines follow the tape, because the clip is what a learner hears.
const p2 = ex.find((e) => e.id === 'u13-pattern-2');
assert([].concat([p2.example], p2.items).every((r) => /\([^)]+\)$/.test(r.lines.find((l) => l.who === 'T').ko)),
  'drill 2 keeps the bracketed prompt on the teacher’s line, where the tape puts it');

function seconds(rel) {
  const file = path.join(ROOT, rel);
  const d = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  const dur = parseFloat(String(d.stdout).trim());
  if (Number.isNaN(dur)) return NaN;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file,
    '-af', 'silencedetect=noise=-35dB:d=0.20', '-f', 'null', '-'], { encoding: 'utf8' });
  const text = String(r.stdout) + String(r.stderr);   // silencedetect reports on stderr
  const sil = [];
  const re = /silence_start:\s*(-?[\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(text))) sil.push([Math.max(0, parseFloat(m[1])), parseFloat(m[2])]);
  let voiced = 0, at = 0;
  sil.forEach(([a, b]) => { if (a > at) voiced += a - at; at = b; });
  if (dur > at) voiced += dur - at;
  return voiced;
}
const haveFfprobe = !Number.isNaN(seconds(clips[0].row.audio.src));
if (!haveFfprobe) {
  console.log('  [SKIP] ffprobe is not on PATH, so the pace check cannot run here');
} else {
  // The bands the cut was verified at, over the four items of each drill. The [보기] is banded
  // separately: it is the model, read once for you to copy rather than left for you to
  // answer, and folding it in would only widen a band that is worth having narrow.
  const BAND = { 1: [4.5, 5.3], 2: [4.3, 5.2], 3: [4.4, 5.1], 4: [4.4, 5.1] };
  const rateOf = (e, row) => syl(row.lines.map((l) => l.ko).join(' ').replace('{}',
    row === e.example ? (row.answerKo || '') : nfc((row.choices.find((c) => c.id === row.answer) || {}).ko)))
    / seconds(row.audio.src);
  drills.forEach((e, di) => {
    const rate = e.items.map((row) => rateOf(e, row));
    const band = BAND[di + 1];
    const out = rate.filter((r) => r < band[0] || r > band[1]);
    assert(out.length === 0, 'drill ' + (di + 1) + ': the four item clips read at a human pace ('
      + (rate.reduce((a, b) => a + b, 0) / rate.length).toFixed(2) + ' syl/s, band '
      + band.join('-') + ')' + (out.length ? ' — ' + out.map((r) => r.toFixed(2)).join(', ') : ''));
    const modelRate = rateOf(e, e.example);
    assert(modelRate > 3.0 && modelRate < 6.0,
      'and its model is read at a speed a person could copy (' + modelRate.toFixed(2) + ' syl/s)');

    // Shift the text against the clips and the band has to break, or it proves nothing. It
    // breaks by spread rather than by absurdity: the four items of a drill are one sentence
    // with a word changed, so a shift gives 3-6 syl/s rather than the 20 a cassette dialogue
    // would. Drill 3 loses only one row of three, and this says so rather than implying more.
    const text = e.items.map((row) => syl(row.lines.map((l) => l.ko).join(' ').replace('{}',
      nfc((row.choices.find((c) => c.id === row.answer) || {}).ko))));
    const dur = e.items.map((row) => seconds(row.audio.src));
    const shifted = text.slice(0, -1).map((n, i) => n / dur[i + 1]);
    const broke = shifted.filter((r) => r < band[0] || r > band[1]).length;
    assert(broke > 0, 'and drill ' + (di + 1) + '’s band rejects the pairing shifted by one ('
      + broke + ' of ' + shifted.length + ' outside)');
  });
}

// ── 5. It is wired in ───────────────────────────────────────────────────────
console.log('\n--- 5. Wiring ---');
const ui = read(path.join('js', 'ui.js'));
assert(ui.indexOf("isUnit13World()) return '/worlds/unit13-workbook.json'") >= 0,
  'js/ui.js knows where Unit 13’s workbook lives');
const admin = read(path.join('admin', 'lib', 'workbook.js'));
assert(/unit13:\s*path\.join\('worlds', 'unit13-workbook\.json'\)/.test(admin),
  'and the admin registry lists it, so the Workbooks tab can open it');
// Opening it in the Workbooks tab and pressing save must not quietly delete the two notes
// that say what the bank does NOT have. They were dropped by validateWorkbook until this
// bank was added, on Unit 15 as well, and a note about a deliberate gap is exactly the kind
// of text nothing else records.
const { validateWorkbook } = require('../admin/lib/workbook.js');
const saved = validateWorkbook(JSON.parse(JSON.stringify(wb)), 'worlds/unit13-workbook.json');
assert(saved.artNote === wb.artNote && saved.omittedNote === wb.omittedNote,
  'and a save through that tab keeps the notes about what the bank leaves out');
assert(saved.exercises.length === wb.exercises.length
  && saved.exercises.every((e, i) => e.id === wb.exercises[i].id
    && e.items.length === wb.exercises[i].items.length),
  'and every exercise survives it intact');
const { collectUploadFiles } = require('../scripts/r2Content.js');
const uploads = new Set(collectUploadFiles(ROOT).map((f) => String(f.rel).replace(/\\/g, '/')));
assert(uploads.has('worlds/unit13-workbook.json'), 'publish carries the workbook');
const unshipped = clips.filter(({ row }) => !uploads.has(String(row.audio.src).replace(/\\/g, '/')));
assert(unshipped.length === 0, 'and every clip it names'
  + (unshipped.length ? ' — ' + unshipped.slice(0, 3).map((c) => c.row.audio.src).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit13_workbook: all passed');
