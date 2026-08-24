'use strict';
/**
 * tests/test_unit14_textbook.js — the 교과서 section of Unit 14's study desk.
 *
 * The desk now carries two sets of pages from two different books. 연습 문제 is the 익힘책 and
 * has its own suite (tests/test_unit14_workbook.js); this is the 교과서's own 말하기, 듣기, 읽기,
 * 과제, 문화 산책, 발음 and 자기 평가. They share a file format and a renderer, so the renderer
 * itself is not retested here. What is:
 *
 *   1. That the two banks stay apart. Two books drilling one chapter will reach for the same
 *      sentence unless something stops them, and a learner who meets 먹으면 안 돼요 under two
 *      names has done one exercise and been charged for two. Section 3 compares them.
 *
 *   2. That the audio bolted to a row is the audio OF that row. Twenty rows name a recording,
 *      fourteen of them a dictation clip whose text is written down in
 *      worlds/unit14-cassette.json — so the claim is checkable rather than a filename anyone
 *      has to trust. Section 4 checks it.
 *
 *   3. That the reshaped exercises are still answerable. Most of the 교과서 page asks you to
 *      speak, and speaking cannot be marked; every exercise here is a reshaping, and a
 *      reshaping that leaves two right answers on the row teaches a falsehood. Section 2
 *      looks for distractors that are also correct.
 *
 * Run: node tests/test_unit14_textbook.js
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

const tb = readJson('worlds/unit14-textbook.json');
const wb = readJson('worlds/unit14-workbook.json');
const quiz = readJson('worlds/unit14-desk-quiz.json');
const cass = readJson('worlds/unit14-cassette.json');
const world = readJson('worlds/2b-unit-14.json');
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

console.log('====================================================');
console.log('2B UNIT 14 · 교과서 — THE CHAPTER\'S OWN PAGES');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank and the desk row ---');
assert(tb.id === 'unit14-textbook', 'the bank names itself unit14-textbook');
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'and the desk labels it 교과서 / Textbook');
assert(/교과서/.test(tb.source || ''), 'its source line says which of the two books it is');
assert(exs.length === 9, 'nine exercises (found ' + exs.length + ')');
assert(rows.length === 41, '41 rows across them (found ' + rows.length + ')');
const sections = exs.map((ex) => ex.section);
assert(new Set(sections).size === 7,
  'seven sections of the chapter are covered (' + [...new Set(sections)].join(', ') + ')');
['말하기 1', '듣고 말하기', '읽고 쓰기', '과제', '문화 산책', '발음', '자기 평가'].forEach((s) =>
  assert(sections.includes(s), 'including ' + s));
// The list is read top to bottom, so it follows the book rather than the order the exercises
// were written in: 듣고 말하기 sits between 말하기 and 읽고 쓰기 on the page and does here too.
const order = exs.map((ex) => ex.section);
assert(order.indexOf('말하기 1') < order.indexOf('듣고 말하기')
  && order.indexOf('듣고 말하기') < order.indexOf('읽고 쓰기')
  && order.indexOf('읽고 쓰기') < order.indexOf('과제'),
  'and they are listed in the order the chapter prints them');
assert(/isUnit14World\(\)\) return '\/worlds\/unit14-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 14 to this bank');
assert(/key: 'textbook'/.test(ui) && /key: 'workbook'/.test(ui) && /key: 'quiz'/.test(ui),
  'the desk menu has all three rows');
// 교과서 before 연습 문제 — the chapter you sat through, then the homework on top of it.
assert(ui.indexOf("key: 'quiz'") < ui.indexOf("key: 'textbook'")
  && ui.indexOf("key: 'textbook'") < ui.indexOf("key: 'workbook'"),
  'and they are built in the order 퀴즈, 교과서, 연습 문제');
// One slot per bank. A single cache variable would have the second load evict the first
// every time the desk opened, so both rows would fetch on every visit.
assert(/const deskBanks = \{\}/.test(ui) && /deskBanks\[url\]/.test(ui),
  'the loader caches per url, so two banks can be live at once');

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

// ── 3. The two books stay apart ──────────────────────────────────────────────
console.log('\n--- 3. The two books stay apart ---');
const wbIds = new Set((wb.exercises || []).map((e) => e.id));
const idClash = exs.map((e) => e.id).filter((id) => wbIds.has(id));
assert(idClash.length === 0, 'no exercise id is shared with 연습 문제'
  + (idClash.length ? ' — ' + idClash.join(', ') : ''));
assert(exs.every((e) => /^u14sgk-/.test(e.id)), 'and the 교과서 ids are prefixed so the two are told apart at a glance');
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
// The desk quiz is the third thing on the same desk, so it counts too.
const quizText = new Set((quiz.questions || []).flatMap((q) => Object.values(q.choices || {}).map(nfc)));
const quizClash = rows
  .map(({ it }) => nfc(filled(it)))
  .filter((s) => quizText.has(s));
assert(quizClash.length === 0, 'and no filled sentence is already a desk-quiz choice'
  + (quizClash.length ? ' — ' + quizClash.slice(0, 3).join(' | ') : ''));

// ── 4. The audio on a row is the audio of that row ───────────────────────────
// Six rows name a dictation clip cut from the book's tape. The clip's text is recorded in
// worlds/unit14-cassette.json, so "this mp3 is that sentence" is a claim with a source —
// which is the only reason it is worth asserting rather than eyeballing.
console.log('\n--- 4. The audio on a row is the audio of that row ---');
const clipText = {};
(cass.dictation.items || []).forEach((i) => { clipText[i.audio.src] = nfc(i.ko); });
const trackOf = {};
(cass.tracks || []).forEach((t) => { trackOf[t.src] = t; });
const withAudio = rows.filter(({ it }) => it.audio && it.audio.src);
assert(withAudio.length === 20, 'twenty rows carry a recording (found ' + withAudio.length + ')');
const onDisk = withAudio.filter(({ it }) => !fs.existsSync(path.join(ROOT, it.audio.src)))
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(onDisk.length === 0, 'every one of them is on disk' + (onDisk.length ? ' — ' + onDisk.join(', ') : ''));
const mismatched = [];
withAudio.forEach(({ ex, it }) => {
  const src = it.audio.src;
  const at = ex.id + ' row ' + it.n;
  if (clipText[src] !== undefined) {
    // A dictation clip: its sentence has to be the sentence the row builds.
    if (nfc(filled(it)).indexOf(clipText[src]) < 0) {
      mismatched.push(at + ': clip says "' + clipText[src] + '"');
    }
  } else if (trackOf[src]) {
    // A whole track: it has to be a track this chapter actually has.
    if (!/^audio\/book\/2b-u14-trk\d\d\.mp3$/.test(src)) mismatched.push(at + ': ' + src + ' is not a Unit 14 track');
  } else {
    mismatched.push(at + ': ' + src + ' is in neither the track list nor the dictation set');
  }
});
assert(mismatched.length === 0, 'and each is the recording of the sentence beside it'
  + (mismatched.length ? ' — ' + mismatched.join('; ') : ''));
// The 발음 pages are the ones where the recording is the whole exercise, so they are the
// ones that must not be missing it.
['u14sgk-pron-2'].forEach((id) => {
  const ex = exs.find((e) => e.id === id);
  const bare = (ex.items || []).filter((it) => !(it.audio && it.audio.src)).map((it) => it.n);
  assert(bare.length === 0, id + ': every row plays the sentence it came from'
    + (bare.length ? ' — row ' + bare.join(',') : ''));
});

// ── 5. What the rows teach is what the chapter teaches ───────────────────────
console.log('\n--- 5. What the rows teach is what the chapter teaches ---');
const owned = new Set((world.level.words || []).map((w) => nfc(w.ko)));
// Not every word of a sentence can be a headword, but the words these exercises were built
// to drill are on the farm, or there is nowhere to learn them.
['쓰다듬다', '영혼', '상관없다', '왼손', '만지다', '이해하다', '경험', '지갑', '여권',
  '기억에 남다', '자리', '무료로 이용하다', '입장료 할인', '집주인', '아저씨', '주인님',
  '회비', '참다', '안다', '머리를 감다', '넘어지다', '아기', '신다', '남다', '앉다'
].forEach((ko) => assert(owned.has(nfc(ko)), ko + ' is a word the farm can teach'));
// Three of them are also main-game headwords, so their SRS schedule is shared with the
// valley — the review key is the Korean alone. That is a cost, and it was paid on purpose:
// the alternative was three words the chapter's own exercises put in front of a learner
// with nowhere to learn them. Pinned so the overlap is a decision on this line rather than
// something that drifts in; every other levels.json collision was left out of the unit.
const LEVELS_OVERLAP = ['이해하다', '지갑', '여권'];
const levelKo = new Set();
readJson('levels.json').forEach((l) => (l.words || []).forEach((w) => levelKo.add(nfc(w.ko))));
const unplanned = [...owned].filter((k) => levelKo.has(k) && !LEVELS_OVERLAP.includes(k)
  && !['사진을 찍다', '어색하다', '공연', '식당', '제도'].includes(k));
assert(unplanned.length === 0, 'no unplanned headword is shared with the main game'
  + (unplanned.length ? ' — ' + unplanned.join(', ') : ''));
assert(LEVELS_OVERLAP.every((k) => owned.has(nfc(k)) && levelKo.has(nfc(k))),
  'and the three deliberate overlaps are still both places');
const pron = exs.find((e) => e.id === 'u14sgk-pron-1');
const tensed = (pron.items || []).filter((it) => {
  const a = (it.choices || []).find((c) => c.id === it.answer);
  return a && /[ㄲㄸㅉ]|[까-낗]|[따-띻]|[짜-찧]|꼬|찌|따/.test(a.ko);
});
assert(tensed.length === (pron.items || []).length,
  'every 발음 규칙 row keys the tensed pronunciation, not the spelling ('
  + tensed.length + ' of ' + (pron.items || []).length + ')');

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/unit14-textbook.json'), 'worlds/unit14-textbook.json publishes');
const absent = [...new Set(withAudio.map(({ it }) => it.audio.src))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and so does every recording it names'
  + (absent.length ? ' — ' + absent.join(', ') : ''));
// The renderer falls back to a pre-rendered TTS clip on any row the book has no tape for,
// so the harvest has to read this file too or those rows get a dead play button.
const { collectTtsPhrases, ttsClipRel } = require(path.join(ROOT, 'scripts', 'ttsClips.js'));
const wanted = new Set(collectTtsPhrases(ROOT).map((t) => ttsClipRel(t)));
const spoken = rows.filter(({ it }) => !(it.audio && it.audio.src)).map(({ it }) => nfc(filled(it)));
const unharvested = spoken.filter((s) => s && !wanted.has(ttsClipRel(s)));
assert(unharvested.length === 0, 'every silent row is in the TTS harvest'
  + (unharvested.length ? ' — ' + unharvested.slice(0, 3).join(' | ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit14_textbook: all passed');
