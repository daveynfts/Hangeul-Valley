'use strict';
/**
 * tests/test_unit15_workbook.js — the 익힘책 for 15과 한국 생활에 익숙해졌어요.
 *
 * The shared workbook validator already checks the shape of every exercise, so this checks
 * the two things it cannot.
 *
 *   1. Fidelity to the book. Pages 104-115 print thirteen markable exercises across four
 *      grammar points, and the answers are the ones in the key at the back. Section 2 names
 *      them; a row that drifts fails here rather than teaching the wrong Korean.
 *
 *   2. The cut. Every 문형 연습 row carries a clip cut off track 11, and a clip is a claim
 *      about which question goes with which answer. Section 4 pins a pace band per drill and
 *      then shifts the text-to-clip pairing by one to show the band has teeth — if a wrong
 *      pairing still passes, the band proves nothing.
 *
 * Run: node tests/test_unit15_workbook.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const wb = JSON.parse(read(path.join('worlds', 'unit15-workbook.json')));
const ex = wb.exercises || [];
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 15 · 연습 문제 — 15과 인생과 변화');
console.log('====================================================');

// ── 1. The book it came from ────────────────────────────────────────────────
console.log('\n--- 1. The book ---');
assert(wb.id === 'unit15-workbook', 'the bank names itself');
assert(/Unit 15/.test(wb.source), 'and says which book it is from');
assert(ex.length === 13, 'thirteen exercises (found ' + ex.length + ')');
const sections = [...new Set(ex.map((e) => e.section))];
assert(sections.join(' | ') === '어휘 | 문법과 표현 | 문형 연습',
  'three sections in the book’s own order (' + sections.join(', ') + ')');
assert(ex.filter((e) => e.section === '어휘').length === 2
  && ex.filter((e) => e.section === '문법과 표현').length === 7
  && ex.filter((e) => e.section === '문형 연습').length === 4,
  'two 어휘, seven 문법과 표현, four 문형 연습');
// Two of the printed exercises are open-ended and have no answer in the key, so they are not
// here. Saying so is the point: a count that implies full coverage would be a lie.
assert(typeof wb.omittedNote === 'string' && /연습 3/.test(wb.omittedNote)
  && /연습 2/.test(wb.omittedNote),
  'and the bank names the two printed exercises it does not carry, and why');
assert(typeof wb.artNote === 'string' && wb.artNote.length > 80,
  'the bank says what it does about the book’s pictures, which are not here yet');

// ── 2. The four grammar points, and the key ─────────────────────────────────
console.log('\n--- 2. The grammar the chapter teaches ---');
const patterns = ex.filter((e) => e.section === '문법과 표현').map((e) => e.pattern);
['A-아지다/어지다', 'V-게 되다', 'V-기 전에', 'V-(으)ㄴ 후에'].forEach((p) => {
  assert(patterns.indexOf(p) >= 0, 'the chapter’s ' + p + ' has its own exercise');
});
// Answers straight off the key at the back of the book. A drift shows up as a miss here.
const KEY = {
  'u15-vocab-1': ['사귀었어요', '태어났어요', '취직하고', '승진하신', '은퇴하셨어요', '결혼하셨어요'],
  'u15-vocab-2': ['생긴', '늘었어요', '올랐어요', '준', '내렸어요'],
  'u15-grammar-1-1': ['좋아졌어요', '편해졌어요', '쉬워졌어요', '복잡해졌어요', '많아졌어요'],
  'u15-grammar-1-2': ['작아졌어요', '길어졌어요', '커졌어요', '없어졌어요'],
  'u15-grammar-2-1': ['알게 되었어요', '하게 되었어요', '가르치게 되었어요', '좋아하게 되었어요',
    '사귀게 되었어요', '쓰게 되었어요'],
  'u15-grammar-2-2': ['좋아하게 됐어요', '잘 먹게 됐어요', '끼게 됐어요', '알게 됐어요', '못 가게 됐어요']
};
Object.keys(KEY).forEach((id) => {
  const e = ex.find((x) => x.id === id);
  if (!e) { assert(false, id + ' is in the book'); return; }
  const got = e.items.map((it) => nfc((it.choices.find((c) => c.id === it.answer) || {}).ko));
  const want = KEY[id].map(nfc);
  assert(got.join(' | ') === want.join(' | '),
    id + ' answers what the key answers' + (got.join('|') === want.join('|') ? '' : '\n         got  ' + got.join(' | ') + '\n         want ' + want.join(' | ')));
});

// ── 3. Every row can be answered, and is explained ──────────────────────────
console.log('\n--- 3. Every row ---');
const rows = [];
ex.forEach((e) => e.items.forEach((it, i) => rows.push({ e, it, at: e.id + ' item ' + (i + 1) })));
assert(rows.length === 63, 'sixty-three rows across the thirteen (found ' + rows.length + ')');
const noGap = rows.filter(({ it }) => !(it.lines || []).some((l) => l.ko.indexOf('{}') >= 0));
assert(noGap.length === 0, 'every row has a gap to fill'
  + (noGap.length ? ' — ' + noGap.slice(0, 3).map((r) => r.at).join(', ') : ''));
const offKey = rows.filter(({ it }) => !(it.choices || []).some((c) => c.id === it.answer));
assert(offKey.length === 0, 'every answer names one of the row’s own choices'
  + (offKey.length ? ' — ' + offKey.slice(0, 3).map((r) => r.at).join(', ') : ''));
const twice = rows.filter(({ it }) => {
  const seen = new Set();
  return (it.choices || []).some((c) => { const k = nfc(c.ko); if (seen.has(k)) return true; seen.add(k); return false; });
});
assert(twice.length === 0, 'and no row shows the same choice twice'
  + (twice.length ? ' — ' + twice.slice(0, 3).map((r) => r.at).join(', ') : ''));
const thin = rows.filter(({ it }) => !it.en || !it.why || !it.grammar);
assert(thin.length === 0, 'every row carries its English, its reason and its grammar note'
  + (thin.length ? ' — ' + thin.slice(0, 3).map((r) => r.at).join(', ') : ''));
// A wrong choice that is also right teaches nothing. These are conjugations of one verb, so
// the test is that the distractors differ from the answer in more than spacing.
const same = rows.filter(({ it }) => {
  const a = nfc((it.choices.find((c) => c.id === it.answer) || {}).ko).replace(/\s+/g, '');
  return it.choices.some((c) => c.id !== it.answer && nfc(c.ko).replace(/\s+/g, '') === a);
});
assert(same.length === 0, 'and no wrong choice is the right one respaced'
  + (same.length ? ' — ' + same.slice(0, 3).map((r) => r.at).join(', ') : ''));

// ── 4. The cut off track 11 ─────────────────────────────────────────────────
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

// Voiced time, not file length. A clip holds the teacher, the gap where the student
// speaks, and the model answer, and counting the gap reads as a slow narrator rather than as
// a pause left on purpose — which is why the cut was verified on voiced time in the first
// place.
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
  // The pace bands, per drill, over the four items. These are the numbers the cut was
  // verified at; a re-cut at the wrong silence threshold or the wrong block gap lands
  // outside them.
  //
  // The [보기] is banded separately and loosely on purpose. It is the model — read once for
  // you to copy rather than left for you to answer — and drill 2's is read half again as fast
  // as its own items, 4.9 against 3.4-3.7. Folding it into the item band would widen that
  // band to [3.3, 5.0] and the band would then accept almost anything.
  const BAND = { 1: [4.1, 4.6], 2: [3.3, 3.8], 3: [4.3, 5.5], 4: [4.4, 4.9] };
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
    const modelRate = e.example ? rateOf(e, e.example) : null;
    assert(modelRate === null || (modelRate > 3.0 && modelRate < 6.0),
      'and its model is read at a speed a person could copy ('
      + (modelRate === null ? 'none' : modelRate.toFixed(2)) + ' syl/s)');

    // Shift the text against the clips and the band has to break, or it proves nothing. It
    // breaks by spread rather than by an absurd rate here: the four items of a drill are the
    // same sentence with one word changed, so a shift never produces the 20 syl/s that a
    // cassette dialogue would. Two of four falling outside is the real discrimination.
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
assert(ui.indexOf("isUnit15World()) return '/worlds/unit15-workbook.json'") >= 0,
  'js/ui.js knows where Unit 15’s workbook lives');
const admin = read(path.join('admin', 'lib', 'workbook.js'));
assert(/unit15:\s*path\.join\('worlds', 'unit15-workbook\.json'\)/.test(admin),
  'and the admin registry lists it, so the Workbooks tab can open it');
assert(!/no 익힘책 of its own yet/.test(admin),
  'and the note saying it had none is gone');
const { collectUploadFiles } = require('../scripts/r2Content.js');
const uploads = new Set(collectUploadFiles(ROOT).map((f) => String(f.rel).replace(/\\/g, '/')));
assert(uploads.has('worlds/unit15-workbook.json'), 'publish carries the workbook');
const unshipped = clips.filter(({ row }) => !uploads.has(String(row.audio.src).replace(/\\/g, '/')));
assert(unshipped.length === 0, 'and every clip it names'
  + (unshipped.length ? ' — ' + unshipped.slice(0, 3).map((c) => c.row.audio.src).join(', ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit15_workbook: all passed');
