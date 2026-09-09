'use strict';
/**
 * tests/test_unit11_workbook.js — the 익힘책 for 11과 운동을 좀 해 보는 게 어때요?
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the two things it cannot.
 *
 *   1. Fidelity to the book. Pages 32-41 print twelve exercises across four grammar points,
 *      eleven of which have an answer in the key at the back. Section 2 holds every one of
 *      those answers, so a row that drifts fails here rather than teaching the wrong Korean.
 *
 *   2. The cut. Every 문형 연습 row carries a clip cut off track 3, and a clip is a claim
 *      about which question goes with which answer. Section 4 pins a pace band per drill and
 *      then shifts the text-to-clip pairing by one to show the band has teeth.
 *
 * Run: node tests/test_unit11_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit11-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 11 · 연습 문제 — 11과 운동을 좀 해 보는 게 어때요?');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit11-workbook', 'the bank names itself');
assert(/Unit 11/.test(wb.source), 'and says which book it is from');
assert(ex.length === 14, 'fourteen exercises (found ' + ex.length + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 | 문형 연습',
  'three sections in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 3
  && ex.filter((e) => e.section === '문법과 표현').length === 7
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'three 어휘, seven 문법과 표현, four 문형 연습');
assert(typeof wb.omittedNote === 'string' && /연습 3/.test(wb.omittedNote) && /39/.test(wb.omittedNote),
  'and the bank names the printed exercise it does not carry, and why');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 80,
  'the bank says what it does about the book’s pictures, which are not here yet');
assert(ex.every((e) => e.pattern && e.pattern.length),
  'every exercise carries the grammar point that titles it in the list');
assert(new Set(ex.map((e) => e.section + '|' + e.pattern + '|' + e.no)).size === ex.length,
  'and section-plus-pattern-plus-number is unique, though 연습 1 repeats across the page');
// The four grammar points the 교재 구성표 lists for this unit, in the book's own order.
const points = ex.filter((e) => e.section === '문법과 표현').map((e) => e.pattern);
assert([...new Set(points)].join(' | ') === "'ㅅ' 불규칙 | N마다 | V-는 게 어때요? | V-기로 하다",
  'the four grammar points are the four the book lists (' + [...new Set(points)].join(', ') + ')');

// ── 2. Every answer in the key at the back ──────────────────────────────────
console.log('\n--- 2. The answer key ---');
const KEY = {
  'u11-vocab-1': ['소화가 안돼요', '배탈이 났어요', '어지러워요', '잠을 잘 못 자요', '몸살이 났어요'],
  'u11-vocab-2': ['내과', '안과', '피부과', '정형외과', '치과', '이비인후과'],
  // Two blanks a row, and the key prints both: 소화제, 드세요 / 안약, 넣으세요 / …
  'u11-vocab-3': ['소화제', '안약', '연고', '파스'],
  // The table, row by row, skipping the cell the book fills in for you.
  'u11-grammar-1-1': ['낫습니다', '나으니까', '나아서', '낫는데',
    '지어요', '지으니까', '지어서', '짓는데',
    '부어요', '붓습니다', '부어서', '붓는데',
    '저어요', '젓습니다', '저으니까', '젓는데'],
  'u11-grammar-1-2': ['저어서', '부었어요', '웃었어요', '나았어요', '지은', '씻으세요'],
  'u11-grammar-2-1': ['30분마다', '월요일마다', '평일 저녁마다', '목요일마다', '날마다', '층마다'],
  'u11-grammar-2-2': ['저는 방학 때마다 고향에 가요', '저는 시험 때마다 도서관에서 공부해요',
    '저는 시간이 있을 때마다 등산을 가요', '저는 한국어로 발표를 할 때마다 긴장돼요',
    '저는 고향 음식을 먹을 때마다 부모님 생각이 나요',
    '저는 저녁을 먹을 때마다 와인을 한 잔씩 마셔요'],
  'u11-grammar-3-1': ['운동을 해 보는 게 어때요', '좀 쉬는 게 어때요', '치마를 사는 게 어때요',
    '보는 게 어때요', '지하철을 타는 게 어때요'],
  'u11-grammar-4-1': ['준비하기로 했어요', '타고 가기로 했어요', '일하기로 했어요',
    '이사 가기로 했어요', '만들기로 했어요'],
  'u11-grammar-4-2': ['쇼핑하기로 했어요', '태권도를 배우기로 했어요', '공부하기로 했어요',
    '농구하기로 했어요'],
  'u11-pattern-1': ['주말마다 등산을 가요', '수요일마다 태권도를 배워요',
    '쉬는 시간마다 친구를 만나요', '여섯 시간마다 약을 먹어요'],
  'u11-pattern-2': ['영화를 볼 때마다 팝콘을 먹어요', '눈이 아플 때마다 안약을 넣어요',
    '이 음악을 들을 때마다 고향 생각이 나요', '가족이 보고 싶을 때마다 전화를 해요'],
  'u11-pattern-3': ['병원에 가는 게 어때요', '커피를 줄이는 게 어때요',
    '운동을 좀 해 보는 게 어때요', '전화를 해 보는 게 어때요'],
  'u11-pattern-4': ['제주도로 가기로 했어요', '열 시에 만나기로 했어요',
    '가족들과 저녁을 먹기로 했어요', '친구들과 놀기로 했어요']
};
assert(Object.keys(KEY).length === ex.length, 'the key covers every exercise in the bank');

function sentenceOf(e, row) {
  if (e.type === 'fill') {
    const chip = (e.bank || []).find((b) => b.id === row.answer) || {};
    return nfc(row.stemKo).replace('{}', nfc(chip.polite || chip.ko || ''));
  }
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

// The 어휘 pages are where the shape had to bend, and the ㅅ table most of all.
const v2 = ex.find((e) => e.id === 'u11-vocab-2');
assert(v2.type === 'fill' && v2.bank.length === 6 && v2.items.length === 6,
  '어휘 연습 2 has one chip per blank, so the box empties exactly');
assert(v2.bank.every((b) => b.dict && b.polite),
  'and every chip carries both forms the validator asks for, even where they are the same word');
const v3 = ex.find((e) => e.id === 'u11-vocab-3');
assert(v3.items.every((i) => i.choices2 && i.answer2),
  '어휘 연습 3 keeps both of the book’s blanks — the medicine and its own verb');
const verbs = v3.items.map((i) => (i.choices2.find((c) => c.id === i.answer2) || {}).ko);
assert(verbs.join(' ') === '드세요 넣으세요 바르세요 붙이세요',
  'and each medicine takes the verb Korean gives it (' + verbs.join(', ') + ')');
const table = ex.find((e) => e.id === 'u11-grammar-1-1');
assert(table.items.length === 16 && /table/.test(table.noteEn),
  'the ㅅ table becomes sixteen rows, one per cell the book leaves blank, and says so');
// The point of the whole page: ㅅ goes before a vowel and stays before a consonant.
const formal = table.items.filter((i) => /습니다/.test(i.lines[0].ko));
assert(formal.length === 3 && formal.every((i) => /ㅅ|[낫짓붓젓]/.test((i.choices.find((c) => c.id === i.answer) || {}).ko)),
  'and the -습니다 column keeps its ㅅ in every verb that has one');

// ── 3. Rows a learner could actually answer ─────────────────────────────────
console.log('\n--- 3. The rows ---');
const noBlank = [];
ex.filter((e) => e.type === 'build').forEach((e) =>
  [].concat(e.example ? [e.example] : [], e.items).forEach((row) => {
    const n = row.lines.map((l) => l.ko).join('').split('{}').length - 1;
    const sets = (row.choices2 ? 2 : 1);
    const want = row === e.example ? 1 : sets;
    if (n !== want) noBlank.push(e.id + '/' + (row.n || '보기') + ' has ' + n + ' for ' + want);
  }));
assert(noBlank.length === 0, 'every built row has a blank for each set of buttons'
  + (noBlank.length ? ' — ' + noBlank.slice(0, 3).join(', ') : ''));
const offered = [];
ex.filter((e) => e.type === 'build').forEach((e) => e.items.forEach((row) => {
  if (!(row.choices || []).some((c) => c.id === row.answer)) offered.push(e.id + '/' + row.n);
  if (row.choices2 && !row.choices2.some((c) => c.id === row.answer2)) offered.push(e.id + '/' + row.n + ' (2)');
}));
assert(offered.length === 0, 'and answers with one of the buttons it shows'
  + (offered.length ? ' — ' + offered.slice(0, 3).join(', ') : ''));
const same = [];
ex.filter((e) => e.type === 'build').forEach((e) => e.items.forEach((row) => {
  [[row.choices, row.answer], [row.choices2, row.answer2]].forEach(([list, ans]) => {
    if (!list) return;
    const right = nfc((list.find((c) => c.id === ans) || {}).ko).replace(/\s+/g, '');
    list.forEach((c) => {
      if (c.id !== ans && nfc(c.ko).replace(/\s+/g, '') === right) same.push(e.id + '/' + row.n);
    });
  });
}));
assert(same.length === 0, 'and no wrong button is the right one respaced'
  + (same.length ? ' — ' + same.slice(0, 3).join(', ') : ''));
const thin = [];
ex.forEach((e) => e.items.forEach((row) => {
  if (!row.en || !row.why || !row.grammar) thin.push(e.id + '/' + row.n);
}));
assert(thin.length === 0, 'and every row says what it means, why that answer, and what the form is'
  + (thin.length ? ' — ' + thin.slice(0, 3).join(', ') : ''));
const noArt = [];
ex.forEach((e) => e.items.forEach((row) => {
  if (row.art && !fs.existsSync(path.join(ROOT, 'sprites', row.art))) noArt.push(e.id + '/' + row.n + ' → ' + row.art);
  if (row.img && !fs.existsSync(path.join(ROOT, row.img))) noArt.push(e.id + '/' + row.n + ' → ' + row.img);
}));
assert(noArt.length === 0, 'every picture a row names is in the checkout'
  + (noArt.length ? ' — ' + noArt.slice(0, 3).join(', ') : ''));
// 웃다 and 씻다 end in ㅅ and are regular, which is what 연습 2's box is baited with.
const g12 = ex.find((e) => e.id === 'u11-grammar-1-2');
const regular = g12.items.filter((i) => /웃|씻/.test((i.choices.find((c) => c.id === i.answer) || {}).ko));
assert(regular.length === 2
  && regular.every((i) => i.choices.some((c) => c.id !== i.answer && /^(우|시)/.test(c.ko))),
  'the two regular ㅅ verbs each offer the irregular form as the wrong button — the trap the box exists for');

// ── 4. The cut off track 3 ──────────────────────────────────────────────────
console.log('\n--- 4. The 문형 연습 clips ---');
const drills = ex.filter((e) => e.section === '문형 연습');
const clips = [];
drills.forEach((e) => [].concat(e.example ? [e.example] : [], e.items)
  .forEach((row) => { if (row.audio) clips.push({ e, row }); }));
assert(clips.length === 20, 'twenty clips — a model and four items per drill (found ' + clips.length + ')');
const missing = clips.filter(({ row }) => !fs.existsSync(path.join(ROOT, row.audio.src)));
assert(missing.length === 0, 'every one is on disk'
  + (missing.length ? ' — ' + missing.slice(0, 3).map((c) => c.row.audio.src).join(', ') : ''));
assert(clips.every(({ row }) => row.audio.askEnd > 0.5), 'and each records where the question ends');
// The book prints the bracketed prompt on the student's line for drills 3 and 4; the tape has
// the teacher read it, and the pace is what settled it — 4.51 and 4.89 syllables a second with
// the prompt counted, against 2.92 and 2.78 without, where drills 1 and 2 read 4.53 and 4.87.
[drills[2], drills[3]].forEach((e, k) => {
  const rows = [].concat([e.example], e.items);
  assert(rows.every((r) => /\([^)]+\)$/.test(r.lines.find((l) => l.who === 'T').ko)),
    'drill ' + (k + 3) + ' keeps the bracketed prompt on the teacher’s line, where the tape puts it');
});

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
if (Number.isNaN(seconds(clips[0].row.audio.src))) {
  console.log('  [SKIP] ffprobe is not on PATH, so the pace check cannot run here');
} else {
  const BAND = { 1: [4.4, 5.1], 2: [4.7, 5.4], 3: [4.5, 5.0], 4: [4.4, 5.6] };
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
    // The shift has to break the band, or the band proves nothing. It breaks by spread rather
    // than by absurdity: four items of a drill are one sentence with a word changed, so a
    // shift gives 3-6 syl/s rather than the 20 a cassette dialogue would.
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
assert(ui.indexOf("isUnit11World()) return '/worlds/unit11-workbook.json'") >= 0,
  'js/ui.js knows where Unit 11’s workbook lives');
const admin = read(path.join('admin', 'lib', 'workbook.js'));
assert(/unit11:\s*path\.join\('worlds', 'unit11-workbook\.json'\)/.test(admin),
  'and the admin registry lists it, so the Workbooks tab can open it');
const rule = require('../js/i18n.js');
assert(rule.HV_CATALOG_SOURCES.indexOf('worlds/unit11-workbook.json') >= 0,
  'and it is listed for translation, so the unit does not ship in English');
const { validateWorkbook } = require('../admin/lib/workbook.js');
const saved = validateWorkbook(JSON.parse(JSON.stringify(wb)), 'worlds/unit11-workbook.json');
assert(saved.artNote === wb.artNote && saved.omittedNote === wb.omittedNote,
  'and a save through that tab keeps the notes about what the bank leaves out');
assert(saved.exercises.length === wb.exercises.length
  && saved.exercises.every((e, i) => e.id === wb.exercises[i].id
    && e.items.length === wb.exercises[i].items.length),
  'and every exercise survives it intact');
const { collectUploadFiles } = require('../scripts/r2Content.js');
const uploads = new Set(collectUploadFiles(ROOT).map((f) => String(f.rel).replace(/\\/g, '/')));
assert(uploads.has('worlds/unit11-workbook.json'), 'publish carries the workbook');
const unshipped = clips.filter(({ row }) => !uploads.has(String(row.audio.src).replace(/\\/g, '/')));
assert(unshipped.length === 0, 'and every clip it names'
  + (unshipped.length ? ' — ' + unshipped.slice(0, 3).map((c) => c.row.audio.src).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit11_workbook: all passed');
