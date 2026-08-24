'use strict';
/**
 * tests/test_unit10_textbook.js — the 교과서 section of Unit 10's study desk.
 *
 * The desk carries two sets of pages from two different books. 연습 문제 is the 익힘책 and has
 * its own suite (tests/test_unit10_workbook.js); this is the 교과서's own 말하기 1, 말하기 2,
 * 읽고 쓰기, 과제, 문화 산책, 발음 and 자기 평가. They share a file format and a renderer, so the
 * renderer itself is not retested here. What is:
 *
 *   1. That the two banks stay apart. The 익힘책 already drills this chapter's 어휘 and all four
 *      grammar patterns across 20 exercises; a 교과서 bank that reached for the same gapped
 *      sentence would be one exercise sold twice. Section 3 compares them line by line.
 *
 *   2. That the rows quoting the tape really do quote it. Four filled sentences are printed
 *      turns from tracks 04 and 07 word for word, so the claim has a source in
 *      worlds/unit10-cassette.json rather than resting on how it looked when it was typed.
 *      Section 4 checks those four and the track every clip label names.
 *
 *   3. That the 발음 exercise cannot contradict its own rule. This is the one page in the
 *      chapter a dictation cannot test — no rise or fall changes a letter you write — so it
 *      became a listening exercise, and the answer on every row is decided by whether the
 *      sentence contains an 의문사. Section 5 derives all six answers from the rule and
 *      compares them to what is keyed.
 *
 * Run: node tests/test_unit10_textbook.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC').trim();

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const tb = readJson('worlds/unit10-textbook.json');
const wb = readJson('worlds/unit10-workbook.json');
const quiz = readJson('worlds/unit10-desk-quiz.json');
const cass = readJson('worlds/unit10-cassette.json');
const ui = read('js/ui.js');
const exs = tb.exercises || [];
const rows = exs.flatMap((ex) => (ex.items || []).map((it) => ({ ex, it })));

// The sentence a row reads once its answers are in place.
function filled(it) {
  const first = (it.choices || []).find((c) => c.id === it.answer);
  const second = (it.choices2 || []).find((c) => c.id === it.answer2);
  const words = [first && first.ko, second && second.ko].filter(Boolean);
  let k = 0;
  return (it.lines || [])
    .map((l) => String(l.ko || '').replace(/\{\}/g, () => words[k++] || ''))
    .join(' ');
}
// The same, but one line at a time — a printed turn is a line, not a whole row.
function filledLines(it) {
  const first = (it.choices || []).find((c) => c.id === it.answer);
  const second = (it.choices2 || []).find((c) => c.id === it.answer2);
  const words = [first && first.ko, second && second.ko].filter(Boolean);
  let k = 0;
  return (it.lines || []).map((l) => nfc(String(l.ko || '').replace(/\{\}/g, () => words[k++] || '')));
}

console.log('====================================================');
console.log('2B UNIT 10 · 교과서 — THE CHAPTER\'S OWN PAGES');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank and the desk row ---');
assert(tb.id === 'unit10-textbook', 'the bank names itself unit10-textbook');
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'and the desk labels it 교과서 / Textbook');
assert(/교과서/.test(tb.source || ''), 'its source line says which of the two books it is');
assert(exs.length === 7, 'seven exercises (found ' + exs.length + ')');
assert(rows.length === 30, '30 rows across them (found ' + rows.length + ')');
const sections = exs.map((ex) => ex.section);
assert(new Set(sections).size === 7,
  'seven sections of the chapter are covered (' + [...new Set(sections)].join(', ') + ')');
['말하기 1', '말하기 2', '읽고 쓰기', '과제', '문화 산책', '발음', '자기 평가'].forEach((s) =>
  assert(sections.includes(s), 'including ' + s));
// The list is read top to bottom, so it follows the book rather than the order the exercises
// were written in.
assert(sections.join('|') === ['말하기 1', '말하기 2', '읽고 쓰기', '과제', '문화 산책', '발음', '자기 평가'].join('|'),
  'and they are listed in the order the chapter prints them');
assert(/isUnit10World\(\)\) return '\/worlds\/unit10-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 10 to this bank');
assert(/isUnit14World\(\)\) return '\/worlds\/unit14-textbook\.json'/.test(ui),
  'and Unit 14 still resolves to its own — one branch per unit, not a shared default');
assert(/key: 'textbook'/.test(ui) && /key: 'workbook'/.test(ui) && /key: 'quiz'/.test(ui),
  'the desk menu has all three rows');
// The admin editor resolves one file per key. A key pointing at another unit's file is what
// "the editor shows Unit 14 for every unit" looked like.
const wbLib = read('admin/lib/workbook.js');
assert(wbLib.indexOf("'unit10-textbook': path.join('worlds', 'unit10-textbook.json')") >= 0,
  'the admin registry opens this bank under its own key');
const { WORKBOOKS, workbookRel } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
assert(workbookRel('unit10-textbook').split(path.sep).join('/') === 'worlds/unit10-textbook.json',
  'and workbookRel resolves it to this file and no other');
const targets = Object.values(WORKBOOKS).map((r) => r.split(path.sep).join('/'));
assert(new Set(targets).size === targets.length, 'no two registry keys point at the same file');

// ── 2. Every row is answerable, and only one way ─────────────────────────────
console.log('\n--- 2. Every row is answerable, and only one way ---');
const problems = [];
rows.forEach(({ ex, it }) => {
  const at = ex.id + ' row ' + it.n;
  const sets = (it.choices2 || it.answer2) ? 2 : 1;
  const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
  if (gaps !== sets) problems.push(at + ': ' + gaps + ' blanks for ' + sets + ' choice sets');
  const all = [...(it.choices || []), ...(it.choices2 || [])];
  const seen = new Set();
  all.forEach((c) => {
    if (seen.has(c.id)) problems.push(at + ': choice id ' + c.id + ' used twice');
    seen.add(c.id);
  });
  // Two buttons with the same text is a row with two right answers, whichever is keyed.
  const texts = (it.choices || []).map((c) => nfc(c.ko));
  if (new Set(texts).size !== texts.length) problems.push(at + ': repeats a choice');
  const texts2 = (it.choices2 || []).map((c) => nfc(c.ko));
  if (texts2.length && new Set(texts2).size !== texts2.length) problems.push(at + ': repeats a second-blank choice');
  if (!(it.choices || []).some((c) => c.id === it.answer)) problems.push(at + ': answer not among its choices');
  if (sets === 2 && !(it.choices2 || []).some((c) => c.id === it.answer2)) problems.push(at + ': answer2 not among its choices');
  if ((it.choices || []).length < 3) problems.push(at + ': fewer than three choices — a coin flip is not a question');
  if (sets === 2 && (it.choices2 || []).length < 3) problems.push(at + ': second blank has fewer than three choices');
});
assert(problems.length === 0, 'every row has one keyed answer and at least two distractors'
  + (problems.length ? ' — ' + problems.slice(0, 5).join('; ') : ''));
const prose = rows.filter(({ it }) => !it.why || !it.grammar || !it.en)
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(prose.length === 0, 'and every row carries en, why and grammar'
  + (prose.length ? ' — ' + prose.join(', ') : ''));
const thinWhy = rows.filter(({ it }) => String(it.why).length < 80).map(({ ex, it }) => ex.id + ':' + it.n);
assert(thinWhy.length === 0, 'the "why" says something rather than restating the answer'
  + (thinWhy.length ? ' — ' + thinWhy.join(', ') : ''));
// The book asks for most of this out loud, so every exercise here is a reshaping. Saying so
// is part of shipping it: the learner comparing page to screen should be told what changed.
const quiet = exs.filter((ex) => String(ex.noteEn).length < 60).map((ex) => ex.id);
assert(quiet.length === 0, 'every exercise explains how it differs from the printed page'
  + (quiet.length ? ' — ' + quiet.join(', ') : ''));
assert(exs.every((ex) => ex.instructionKo && ex.instructionEn && ex.no && ex.icon),
  'and each keeps the book\'s own heading, number and an icon');

// ── 3. The two books stay apart ──────────────────────────────────────────────
console.log('\n--- 3. The two books stay apart ---');
assert((wb.exercises || []).length === 20, 'the 익힘책 side has 20 exercises (found ' + (wb.exercises || []).length + ')');
const wbIds = new Set((wb.exercises || []).map((e) => e.id));
const idClash = exs.map((e) => e.id).filter((id) => wbIds.has(id));
assert(idClash.length === 0, 'no exercise id is shared with 연습 문제'
  + (idClash.length ? ' — ' + idClash.join(', ') : ''));
assert(exs.every((e) => /^u10sgk-/.test(e.id)),
  'and the 교과서 ids are prefixed so the two are told apart at a glance');
const gapped = (bank) => {
  const out = new Set();
  (bank.exercises || []).forEach((ex) => (ex.items || []).forEach((it) => {
    (it.lines || []).forEach((l) => {
      const t = nfc(l.ko);
      if (t.indexOf('{}') >= 0 && t.replace(/\{\}/g, '').length > 6) out.add(t);
    });
  }));
  return out;
};
const wbGapped = gapped(wb);
const sharedLines = [...gapped(tb)].filter((t) => wbGapped.has(t));
assert(sharedLines.length === 0, 'no row drills the same gapped sentence as a 연습 문제 row'
  + (sharedLines.length ? ' — ' + sharedLines.slice(0, 3).join(' | ') : ''));
// The 익힘책 covers 어휘 and 문법과 표현; this bank was built to take the pages it leaves alone.
const wbSections = new Set((wb.exercises || []).map((e) => nfc(e.section)));
const overlap = [...new Set(sections.map(nfc))].filter((s) => wbSections.has(s));
assert(overlap.length === 0, 'and no section of the chapter is claimed by both banks'
  + (overlap.length ? ' — ' + overlap.join(', ') : ''));
// The desk quiz is the third thing on the same desk, so it counts too.
const quizText = new Set((quiz.questions || []).flatMap((q) => Object.values(q.choices || {}).map(nfc)));
const quizClash = rows.map(({ it }) => nfc(filled(it))).filter((s) => quizText.has(s));
assert(quizClash.length === 0, 'and no filled sentence is already a desk-quiz choice'
  + (quizClash.length ? ' — ' + quizClash.slice(0, 3).join(' | ') : ''));

// ── 4. The audio on a row is the audio of that row ───────────────────────────
console.log('\n--- 4. The audio on a row is the audio of that row ---');
const trackOf = {};
(cass.tracks || []).forEach((t) => { trackOf[t.src] = t; });
const withAudio = rows.filter(({ it }) => it.audio && it.audio.src);
assert(withAudio.length === 17, 'seventeen rows carry a recording (found ' + withAudio.length + ')');
const onDisk = withAudio.filter(({ it }) => !fs.existsSync(path.join(ROOT, it.audio.src)))
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(onDisk.length === 0, 'every one of them is on disk' + (onDisk.length ? ' — ' + onDisk.join(', ') : ''));
const stray = withAudio.filter(({ it }) => !trackOf[it.audio.src])
  .map(({ ex, it }) => ex.id + ':' + it.n + ' → ' + it.audio.src);
assert(stray.length === 0, 'and each names a whole track the cassette carries'
  + (stray.length ? ' — ' + stray.join(', ') : ''));
// A label reading "track 06" over an mp3 that is trk02 sends the learner to the wrong page,
// and nothing on screen gives that away.
const drift = withAudio.filter(({ it }) => {
  const a = /-trk(\d+)\.mp3$/.exec(it.audio.src);
  const b = /track\s*(\d+)/.exec(String(it.audio.labelEn || ''));
  return !a || !b || Number(a[1]) !== Number(b[1]);
}).map(({ ex, it }) => ex.id + ':' + it.n + ' "' + it.audio.labelEn + '"');
assert(drift.length === 0, 'and every label names the track it actually plays'
  + (drift.length ? ' — ' + drift.join(', ') : ''));
// Four filled lines are printed turns, word for word. That is the strongest claim this bank
// makes about the tape, so it gets checked against the tape rather than against itself.
const printed = new Set((cass.tracks || []).flatMap((t) => (t.lines || []).map((l) => nfc(l.ko))));
const verbatim = rows.flatMap(({ ex, it }) => filledLines(it)
  .filter((s) => printed.has(s)).map((s) => ex.id + '#' + it.n));
assert(verbatim.length === 4, 'four filled lines are printed turns word for word (found '
  + verbatim.length + ': ' + verbatim.join(', ') + ')');
[['u10sgk-speak-1', 1], ['u10sgk-speak-2', 1]].forEach(([id, n]) => {
  const { it } = rows.find((r) => r.ex.id === id && r.it.n === n);
  const src = it.audio && it.audio.src;
  const lines = new Set((trackOf[src] ? trackOf[src].lines || [] : []).map((l) => nfc(l.ko)));
  const off = filledLines(it).filter((s) => !lines.has(s));
  assert(off.length === 0, id + ' row ' + n + ' quotes the track it plays'
    + (off.length ? ' — ' + off.join(' | ') : ''));
});

// ── 5. The 발음 exercise cannot contradict its own rule ──────────────────────
// The rule the page states: a question with an 의문사 falls at the end, one without rises.
// Every answer is therefore derivable, so derive them all and compare. If a row is ever
// re-keyed by hand the two will disagree, which is the only way this exercise can go wrong
// without looking wrong.
console.log('\n--- 5. The 발음 rule decides its own answers ---');
const pron = exs.find((ex) => ex.id === 'u10sgk-pron-1');
assert(!!pron && pron.items.length === 7, 'the 발음 exercise has seven rows');
const INTERROGATIVE = /뭐|무엇|무슨|어디|언제|누구|왜|어떻게|어때/;
const pronWrong = [];
const pronOffTape = [];
let sentenceRows = 0;
(pron ? pron.items : []).forEach((it) => {
  const m = /^(.*?)\s*—/.exec(String((it.lines[0] || {}).ko || ''));
  if (!m) return;                       // the closing row states the exception, not a sentence
  sentenceRows += 1;
  const sentence = nfc(m[1]);
  const want = INTERROGATIVE.test(sentence) ? 'fall' : 'rise';
  if (String(it.answer).indexOf(want) !== 0) {
    pronWrong.push('row ' + it.n + ' "' + sentence + '" keyed ' + it.answer + ', rule says ' + want);
  }
  const src = it.audio && it.audio.src;
  const lines = new Set((trackOf[src] ? trackOf[src].lines || [] : []).map((l) => nfc(l.ko)));
  if (!lines.has(sentence)) pronOffTape.push('row ' + it.n + ' "' + sentence + '" is not on ' + src);
});
assert(sentenceRows === 6, 'six of them are sentences to judge (found ' + sentenceRows + ')');
assert(pronWrong.length === 0, 'and the rule decides every one of their answers'
  + (pronWrong.length ? ' — ' + pronWrong.join('; ') : ''));
assert(pronOffTape.length === 0, 'each sentence is one the 발음 tracks actually read aloud'
  + (pronOffTape.length ? ' — ' + pronOffTape.join('; ') : ''));
// Both halves of the rule have to be present, or the exercise is six rows of one answer.
const keyed = (pron ? pron.items : []).map((it) => String(it.answer).replace(/\d+$/, ''));
assert(keyed.filter((k) => k === 'rise').length === 3 && keyed.filter((k) => k === 'fall').length === 3,
  'three rise and three fall, so neither button is always right');
const hedge = (pron ? pron.items : []).find((it) => it.answer === 'slight');
const hedgeKo = hedge ? nfc((((hedge.choices || []).find((c) => c.id === 'slight')) || {}).ko) : '';
assert(!!hedge && /약간 올려서/.test(hedgeKo),
  'and the closing row keeps the page\'s own "약간 올려서" exception (' + hedgeKo + ')');

// ── 6. 자기 평가 matches the key printed at the foot of the page ─────────────
console.log('\n--- 6. 자기 평가 matches the printed key ---');
const check = exs.find((ex) => ex.id === 'u10sgk-check-2');
const KEY = ['마실래요', '한국 음식 중에서', '더웠는데', '맞아', '나는'];
assert(!!check && check.items.length === 5, '자기 평가 carries five rows');
const keyMiss = (check ? check.items : []).filter((it, k) => {
  const c = (it.choices || []).find((x) => x.id === it.answer);
  return !c || nfc(c.ko) !== KEY[k];
}).map((it) => 'row ' + it.n);
assert(keyMiss.length === 0, 'and every keyed answer is the one the book prints upside-down at the foot of the page'
  + (keyMiss.length ? ' — ' + keyMiss.join(', ') : ''));
// 3번 asks for the whole exchange in 반말, so a leftover 요 in either half is the failure.
const banmal = (check ? check.items : []).slice(3).flatMap((it) => filledLines(it));
assert(banmal.every((s) => !/요[?.!]?$/.test(s)), '3번 comes out in 반말 with no 요 left on either turn — ' + banmal.join(' / '));

// ── 7. It publishes, and its silent rows have a voice ────────────────────────
console.log('\n--- 7. It publishes, and its silent rows have a voice ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.split(path.sep).join('/')));
assert(batch.has('worlds/unit10-textbook.json'), 'worlds/unit10-textbook.json publishes');
const absent = [...new Set(withAudio.map(({ it }) => it.audio.src))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and so does every recording it names'
  + (absent.length ? ' — ' + absent.join(', ') : ''));
// The renderer falls back to a pre-rendered TTS clip on any row the book has no tape for,
// so the harvest has to read this file too or those rows get a dead play button.
const { collectTtsPhrases, ttsClipRel } = require(path.join(ROOT, 'scripts', 'ttsClips.js'));
const wanted = new Set(collectTtsPhrases(ROOT).map((t) => ttsClipRel(t)));
const spoken = rows.filter(({ it }) => !(it.audio && it.audio.src)).map(({ it }) => nfc(filled(it)));
assert(spoken.length === 13, 'thirteen rows have no book recording (found ' + spoken.length + ')');
const unharvested = spoken.filter((s) => s && !wanted.has(ttsClipRel(s)));
assert(unharvested.length === 0, 'and every one of them is in the TTS harvest'
  + (unharvested.length ? ' — ' + unharvested.slice(0, 3).join(' | ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit10_textbook: all passed');
