'use strict';
/**
 * tests/test_unit13_textbook.js — the 교과서 section of Unit 13's study desk.
 *
 * The desk carries two books for this chapter. 연습 문제 is the 익힘책 and has its own suite
 * (tests/test_unit13_workbook.js); this is the 교과서's own 어휘, 문법과 표현, 말하기, 듣고 말하기,
 * 읽고 쓰기, 과제, 문화 산책, 발음 and 자기 평가. The file format and the renderer are shared with
 * Units 10 and 14, so neither is retested here. What is:
 *
 *   1. That the two books stay apart. Two books drilling one chapter reach for the same
 *      sentence unless something stops them — and this chapter is the worst case for it,
 *      because the 익힘책 has seventeen exercises on the same four grammar points. Section 3
 *      compares them, and it already caught one: 이 옷이 {} 모르겠어요, which is 문법 1 연습 1
 *      row 3 of the 익힘책 and was the fourth 예문 here until the check fired.
 *
 *   2. That the audio bolted to a row is the audio OF that row. Thirty rows name a
 *      recording, twenty-two of them a dictation clip whose text is written down in
 *      worlds/unit13-cassette.json — so "this mp3 is that sentence" is checkable rather
 *      than a filename anyone has to trust. Section 4 checks it.
 *
 *   3. That the reshaped exercises are still answerable. Most of this chapter asks you to
 *      speak: 어휘 1 is an open question under six photographs, both 말하기 pages end in
 *      substitution columns, the 과제 is a role-play and 쓰기 is eight blank lines. Every
 *      exercise here is a reshaping, and a reshaping with two right answers on the row
 *      teaches a falsehood. Section 2 looks for that, and for a wrong answer that is the
 *      right one respaced — the trap tests/test_unit13_workbook.js caught four of.
 *
 *   4. That the 발음 pages go both ways round. 규칙 asks for the sound and 연습 asks for the
 *      spelling, and the rule they share is that a 받침 followed by ㅎ stops being either.
 *      Section 5 asserts each page keys the side it claims to.
 *
 * Run: node tests/test_unit13_textbook.js
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

const tb = readJson('worlds/unit13-textbook.json');
const wb = readJson('worlds/unit13-workbook.json');
const quiz = readJson('worlds/unit13-desk-quiz.json');
const cass = readJson('worlds/unit13-cassette.json');
const world = readJson('worlds/2b-unit-13.json');
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

// Hangul syllable arithmetic, for the 발음 pages. A syllable is
// (initial * 21 + medial) * 28 + final, based at U+AC00.
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ',
  'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const isSyllable = (ch) => ch >= '가' && ch <= '힣';
const initialOf = (ch) => INITIALS[Math.floor((ch.codePointAt(0) - 0xAC00) / 588)];
const finalOf = (ch) => FINALS[(ch.codePointAt(0) - 0xAC00) % 28];
// The environment the rule needs: a 받침 pronounced [ㄱ ㄷ ㅂ] with a ㅎ-initial syllable
// straight after it. 축하, 깨끗한, 입학, 옷하고, 막혀 all have it; the moment the rule is
// applied it is gone, because both consonants have become one.
const STOPS = ['ㄱ', 'ㄲ', 'ㄳ', 'ㄺ', 'ㄷ', 'ㅅ', 'ㅆ', 'ㅈ', 'ㅊ', 'ㅌ', 'ㅂ', 'ㅄ', 'ㅍ'];
function hasStopPlusH(s) {
  const t = nfc(s);
  for (let i = 0; i + 1 < t.length; i++) {
    if (!isSyllable(t[i]) || !isSyllable(t[i + 1])) continue;
    if (STOPS.indexOf(finalOf(t[i])) >= 0 && initialOf(t[i + 1]) === 'ㅎ') return true;
  }
  return false;
}
const hasAspirate = (s) => nfc(s).split('').some((ch) =>
  isSyllable(ch) && ['ㅋ', 'ㅌ', 'ㅍ'].indexOf(initialOf(ch)) >= 0);

console.log('====================================================');
console.log('2B UNIT 13 · 교과서 — THE CHAPTER\'S OWN PAGES');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank and the desk row ---');
assert(tb.id === 'unit13-textbook', 'the bank names itself unit13-textbook');
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'and the desk labels it 교과서 / Textbook');
assert(/교과서/.test(tb.source || ''), 'its source line says which of the two books it is');
assert(/주변이 조용해서 살기 좋아요/.test(tb.source || ''), 'and which chapter');
assert(exs.length === 16, 'sixteen exercises (found ' + exs.length + ')');
assert(rows.length === 78, '78 rows across them (found ' + rows.length + ')');
// The chapter has eleven headed sections and every one of them is represented, which is
// the difference between porting a chapter and porting the pages that were easy.
const ORDER = ['어휘', '문법과 표현 1', '말하기 1', '문법과 표현 2', '말하기 2',
  '듣고 말하기', '읽고 쓰기', '과제', '문화 산책', '발음', '자기 평가'];
const sections = exs.map((ex) => ex.section);
assert(new Set(sections).size === 11,
  'eleven sections of the chapter are covered (' + [...new Set(sections)].join(', ') + ')');
ORDER.forEach((s) => assert(sections.includes(s), 'including ' + s));
// Read top to bottom, so the list follows the book rather than the order the exercises
// were written in.
let last = -1, ordered = true;
sections.forEach((s) => { const at = ORDER.indexOf(s); if (at < last) ordered = false; else last = at; });
assert(ordered, 'and they are listed in the order the chapter prints them');
assert(/isUnit13World\(\)\) return '\/worlds\/unit13-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 13 to this bank');
assert(read(path.join('admin', 'lib', 'workbook.js'))
  .indexOf("'unit13-textbook': path.join('worlds', 'unit13-textbook.json')") >= 0,
  'and the admin registry can open it');
// Listed for translation, or it ships in English and only i18n_report knows.
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit13-textbook.json'") >= 0,
  'HV_CATALOG_SOURCES lists it, so the Vietnamese is counted');
assert(fs.existsSync(path.join(ROOT, 'locales', 'vi', 'worlds', 'unit13-textbook.json')),
  'and the Vietnamese catalogue is on disk');
// Two notes that say what the bank does NOT have. A save through the Workbooks tab used to
// drop both, so they are asserted rather than assumed.
assert(String(tb.artNote || '').length > 200, 'the art note says which pictures are missing');
assert(String(tb.omittedNote || '').length > 200, 'and the omitted note says which pages have no key');

// ── 2. Every row is answerable, and only one way ─────────────────────────────
console.log('\n--- 2. Every row is answerable, and only one way ---');
const problems = [];
const strip = (s) => nfc(s).replace(/\s+/g, '');
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
// A distractor that differs from the answer only by a space is not a decision: on a phone
// the two buttons are indistinguishable. Four rows of the 익힘책 shipped that way once.
const respaced = [];
rows.forEach(({ ex, it }) => {
  [['choices', 'answer'], ['choices2', 'answer2']].forEach(([list, key]) => {
    const right = (it[list] || []).find((c) => c.id === it[key]);
    if (!right) return;
    (it[list] || []).forEach((c) => {
      if (c.id !== it[key] && strip(c.ko) === strip(right.ko)) {
        respaced.push(ex.id + ':' + it.n + ' "' + c.ko + '"');
      }
    });
  });
});
assert(respaced.length === 0, 'and no wrong choice is the right one respaced'
  + (respaced.length ? ' — ' + respaced.join(', ') : ''));
const prose = rows.filter(({ it }) => !it.why || !it.grammar || !it.en)
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(prose.length === 0, 'every row carries en, why and grammar'
  + (prose.length ? ' — ' + prose.join(', ') : ''));
const thinWhy = rows.filter(({ it }) => String(it.why).length < 80).map(({ ex, it }) => ex.id + ':' + it.n);
assert(thinWhy.length === 0, 'the "why" says something rather than restating the answer'
  + (thinWhy.length ? ' — ' + thinWhy.join(', ') : ''));
// The explanation is read at the moment a row went wrong, by somebody who wants to know
// about THEIR mistake — so it has to name at least one of the buttons that were on screen.
const unaddressed = rows.filter(({ it }) => !(it.choices || []).concat(it.choices2 || [])
  .some((c) => String(it.why).indexOf(c.ko) >= 0)).map(({ ex, it }) => ex.id + ':' + it.n);
assert(unaddressed.length === 0, 'and it names at least one of that row\'s own answers'
  + (unaddressed.length ? ' — ' + unaddressed.join(', ') : ''));
const quiet = exs.filter((ex) => String(ex.noteEn).length < 60).map((ex) => ex.id);
assert(quiet.length === 0, 'every exercise explains how it differs from the printed page'
  + (quiet.length ? ' — ' + quiet.join(', ') : ''));
// Every picture is one the game already ships. Two rows of the 익힘책 once pointed at
// untracked redraws, which only showed up in an isolated checkout.
const artMissing = rows.filter(({ it }) => it.art && !fs.existsSync(path.join(ROOT, 'sprites', it.art)))
  .map(({ ex, it }) => ex.id + ':' + it.n + ' ' + it.art);
assert(artMissing.length === 0, 'and every picture it names is on disk'
  + (artMissing.length ? ' — ' + artMissing.join(', ') : ''));

// ── 3. The two books stay apart ──────────────────────────────────────────────
console.log('\n--- 3. The two books stay apart ---');
const wbIds = new Set((wb.exercises || []).map((e) => e.id));
const idClash = exs.map((e) => e.id).filter((id) => wbIds.has(id));
assert(idClash.length === 0, 'no exercise id is shared with 연습 문제'
  + (idClash.length ? ' — ' + idClash.join(', ') : ''));
assert(exs.every((e) => /^u13sgk-/.test(e.id)),
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
// The 퀴즈 is the third thing on the same desk, so it counts too.
const quizText = new Set((quiz.questions || []).flatMap((q) => Object.values(q.choices || {}).map(nfc)));
const quizClash = rows.map(({ ex, it }) => ({ at: ex.id + ':' + it.n, s: nfc(filled(it)) }))
  .filter((x) => quizText.has(x.s));
assert(quizClash.length === 0, 'and no filled sentence is already a desk-quiz choice'
  + (quizClash.length ? ' — ' + quizClash.map((x) => x.at).join(', ') : ''));

// ── 4. The audio on a row is the audio of that row ───────────────────────────
console.log('\n--- 4. The audio on a row is the audio of that row ---');
const clipText = {};
(cass.dictation.items || []).forEach((i) => { clipText[i.audio.src] = nfc(i.ko); });
const trackOf = {};
(cass.tracks || []).forEach((t) => { trackOf[t.src] = t; });
const withAudio = rows.filter(({ it }) => it.audio && it.audio.src);
assert(withAudio.length === 30, 'thirty rows carry a recording (found ' + withAudio.length + ')');
const onDisk = withAudio.filter(({ it }) => !fs.existsSync(path.join(ROOT, it.audio.src)))
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(onDisk.length === 0, 'every one of them is on disk' + (onDisk.length ? ' — ' + onDisk.join(', ') : ''));
const mismatched = [];
let clipRows = 0;
withAudio.forEach(({ ex, it }) => {
  const src = it.audio.src;
  const at = ex.id + ' row ' + it.n;
  if (clipText[src] !== undefined) {
    clipRows++;
    if (nfc(filled(it)).indexOf(clipText[src]) < 0) {
      mismatched.push(at + ': clip says "' + clipText[src] + '"');
    }
  } else if (trackOf[src]) {
    if (!/^audio\/book\/2b-u13-trk\d\d\.mp3$/.test(src)) mismatched.push(at + ': ' + src + ' is not a Unit 13 track');
  } else {
    mismatched.push(at + ': ' + src + ' is in neither the track list nor the dictation set');
  }
});
assert(mismatched.length === 0, 'and each is the recording of the sentence beside it'
  + (mismatched.length ? ' — ' + mismatched.join('; ') : ''));
assert(clipRows === 22, 'twenty-two of them play a single cut line rather than the whole track (found ' + clipRows + ')');
// A row that says "track 39" while playing trk37 sends the learner to the wrong page of
// the book, and nothing on screen gives that away.
const drift = withAudio.filter(({ it }) => {
  const inSrc = /-trk(\d+)\.mp3$/.exec(it.audio.src);
  const inLbl = /track\s*(\d+)/.exec(String(it.audio.labelEn || ''));
  return inSrc && inLbl && Number(inSrc[1]) !== Number(inLbl[1]);
}).map(({ ex, it }) => ex.id + ':' + it.n);
assert(drift.length === 0, 'and each clip label names the track it actually plays'
  + (drift.length ? ' — ' + drift.join(', ') : ''));
// The other direction: a cut line labelled "track NN" would claim the whole tape.
const overclaimed = withAudio.filter(({ it }) =>
  !/-trk\d+\.mp3$/.test(it.audio.src) && /track\s*\d+/.test(String(it.audio.labelEn || '')))
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(overclaimed.length === 0, 'and a single line is never labelled as the whole track'
  + (overclaimed.length ? ' — ' + overclaimed.join(', ') : ''));
// The two 듣기 pages are the ones where the recording IS the exercise.
['u13sgk-listen-1', 'u13sgk-listen-2', 'u13sgk-pron-2'].forEach((id) => {
  const ex = exs.find((e) => e.id === id);
  const bare = (ex.items || []).filter((it) => !(it.audio && it.audio.src)).map((it) => it.n);
  assert(bare.length === 0, id + ': every row plays the sentence it came from'
    + (bare.length ? ' — row ' + bare.join(',') : ''));
});

// ── 5. What the rows teach is what the chapter teaches ───────────────────────
console.log('\n--- 5. What the rows teach is what the chapter teaches ---');
const owned = new Set((world.level.words || []).map((w) => nfc(w.ko)));
// The words these exercises were built to drill are on the farm, or there is nowhere to
// learn them. 어휘 1 and 어휘 2 are the two exercises that ARE their vocabulary, so every
// answer on both is checked rather than sampled.
const vocabAnswers = ['u13sgk-vocab-1', 'u13sgk-vocab-2'].flatMap((id) =>
  (exs.find((e) => e.id === id).items || []).map((it) =>
    ((it.choices || []).find((c) => c.id === it.answer) || {}).ko));
assert(vocabAnswers.length === 12, 'the two 어휘 exercises key twelve words between them');
const unteachable = vocabAnswers.filter((ko) => !owned.has(nfc(ko)));
assert(unteachable.length === 0, 'and the farm can teach every one of them'
  + (unteachable.length ? ' — ' + unteachable.join(', ') : ''));
['부동산', '중개인', '계약', '집세', '월세', '전세', '보증금', '관리비', '수도 요금',
  '가스 요금', '이사하다', '구하다', '알아보다', '결정하다', '구경하다', '바뀌다', '나오다',
  '느끼다', '시원하다', '바람이 통하다', '민속촌', '북촌 한옥마을', '한옥', '입학', '어울리다',
  '반찬', '길이 막히다', '높은 곳', '생활하다', '룸메이트', '청소', '반씩', '하숙집', '빈방'
].forEach((ko) => assert(owned.has(nfc(ko)), ko + ' is a word the farm can teach'));
// 생활비 is the one word two rows lean on that is NOT on this farm, and deliberately so:
// it is a Unit 11 headword, and validate_content asserts the two units share none. Pinned
// here so "the row uses a word with nowhere to learn it" stays a false alarm.
assert(!owned.has('생활비'), '생활비 is not a Unit 13 headword');
assert(new Set((readJson('worlds/2b-unit-11.json').level.words || []).map((w) => nfc(w.ko))).has('생활비'),
  'because Unit 11 teaches it, with this chapter\'s own tape line as its example');
// All four grammar points of the chapter are drilled, and each is named where it is.
['A/V-(으)ㄹ지 모르겠다', 'A/V-기는 하지만', 'A/V-기 때문에, N(이)기 때문에', 'V-기(가) A']
  .forEach((p) => assert(exs.some((ex) => ex.pattern === p), p + ' has a page of its own'));
// 발음 goes both ways round, and each page keys the side it claims to.
const pron1 = exs.find((e) => e.id === 'u13sgk-pron-1');
const soundKeyed = (pron1.items || []).filter((it) => {
  const a = (it.choices || []).find((c) => c.id === it.answer);
  return a && hasAspirate(a.ko) && !hasStopPlusH(a.ko);
});
assert(soundKeyed.length === (pron1.items || []).length,
  '발음 규칙 keys the aspirated sound on every row, never the spelling ('
  + soundKeyed.length + ' of ' + (pron1.items || []).length + ')');
// noteEn claims the spelling itself is a wrong button on every row. That is the whole
// point of the page, so it is checked rather than trusted.
const spellingOffered = (pron1.items || []).filter((it) => {
  const printed = (/([가-힣]+)\[\{\}\]/.exec(String((it.lines || [])[0] && it.lines[0].ko)) || [])[1];
  return printed && (it.choices || []).some((c) => c.id !== it.answer && nfc(c.ko) === nfc(printed));
});
assert(spellingOffered.length === (pron1.items || []).length,
  'and the spelling is one of the wrong buttons on every row ('
  + spellingOffered.length + ' of ' + (pron1.items || []).length + ')');
const pron2 = exs.find((e) => e.id === 'u13sgk-pron-2');
const spellingKeyed = (pron2.items || []).filter((it) => {
  const a = (it.choices || []).find((c) => c.id === it.answer);
  return a && hasStopPlusH(a.ko)
    && (it.choices || []).every((c) => c.id === it.answer || !hasStopPlusH(c.ko));
});
assert(spellingKeyed.length === (pron2.items || []).length,
  '발음 연습 keys the spelling — the only choice that still has the 받침 and the ㅎ ('
  + spellingKeyed.length + ' of ' + (pron2.items || []).length + ')');

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.split(path.sep).join('/')));
assert(batch.has('worlds/unit13-textbook.json'), 'worlds/unit13-textbook.json publishes');
assert(batch.has('locales/vi/worlds/unit13-textbook.json'), 'and so does its Vietnamese');
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
console.log('\ntest_unit13_textbook: all passed');
