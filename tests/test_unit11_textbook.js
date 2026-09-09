'use strict';
/**
 * tests/test_unit11_textbook.js — the 교과서 section of Unit 11's study desk.
 *
 * The desk carries two books for this chapter. 연습 문제 is the 익힘책 and has its own suite
 * (tests/test_unit11_workbook.js); this is the 교과서's own 어휘, 문법과 표현, 말하기,
 * 듣고 말하기, 읽고 쓰기, 문화 산책, 발음 and 자기 평가. Format and renderer are shared with
 * Units 10, 13 and 14, so neither is retested. What is:
 *
 *   1. That the two books stay apart, and here that needs one check the other units did not.
 *      Unit 11's 익힘책 has fourteen exercises on the same four grammar points, and the
 *      gapped-line comparison misses the case where two banks reach the same answer by
 *      different sentences. Section 3 compares the answer texts as well, and it caught
 *      보는 게 어때요 — 문법 1 연습 1 row 4 of the 익힘책 — in what is now row 1 of 문법 1 here.
 *      One overlap survives on purpose and is named: the 자기 평가 key printed on p.66.
 *
 *   2. That the 발음 pages go both ways round, and can be checked from the rule rather than
 *      from the key. This chapter's rule is 종성 규칙 후 연음: the 받침 is pronounced [ㄱ ㄷ ㅂ]
 *      first and only then crosses to the vowel after it. So a form with the rule applied has
 *      no 받침-plus-vowel boundary left in it, and the spelling still does — which is
 *      computable from the jamo. Section 5 does that in both directions.
 *
 *   3. That the audio bolted to a row is the audio OF that row. Twenty-nine rows name a
 *      recording, twenty-six of them a dictation clip whose text is written down in
 *      worlds/unit11-cassette.json — six of those cut for this bank from the two 발음 tracks
 *      the cassette gained at the same time. Section 4 checks it.
 *
 *   4. That what the book leaves unkeyed is left out and said so. 과제 is a role-play from two
 *      activity sheets with no printed pairing between them, and 어휘 2 and 3 are the 익힘책's
 *      in full. Section 1 requires the omitted note to be there and to be long enough to have
 *      said which and why.
 *
 * Run: node tests/test_unit11_textbook.js
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

const tb = readJson('worlds/unit11-textbook.json');
const wb = readJson('worlds/unit11-workbook.json');
const quiz = readJson('worlds/unit11-desk-quiz.json');
const cass = readJson('worlds/unit11-cassette.json');
const world = readJson('worlds/2b-unit-11.json');
const ui = read('js/ui.js');
const exs = tb.exercises || [];
const rows = exs.flatMap((ex) => (ex.items || []).map((it) => ({ ex, it })));

function filled(it) {
  const first = (it.choices || []).find((c) => c.id === it.answer);
  const second = (it.choices2 || []).find((c) => c.id === it.answer2);
  const words = [first && first.ko, second && second.ko].filter(Boolean);
  let k = 0;
  return (it.lines || [])
    .map((l) => String(l.ko || '').replace(/\{\}/g, () => words[k++] || ''))
    .join(' ');
}

// Hangul syllable arithmetic, for the 발음 pages.
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ',
  'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const isSyllable = (ch) => ch >= '가' && ch <= '힣';
const initialOf = (ch) => INITIALS[Math.floor((ch.codePointAt(0) - 0xAC00) / 588)];
const finalOf = (ch) => FINALS[(ch.codePointAt(0) - 0xAC00) % 28];
// The 받침 that are pronounced [ㄱ], [ㄷ] or [ㅂ] — the ones this chapter's rule moves.
const STOPS = ['ㄱ', 'ㄲ', 'ㅋ', 'ㄳ', 'ㄺ', 'ㄷ', 'ㅌ', 'ㅅ', 'ㅆ', 'ㅈ', 'ㅊ', 'ㅎ',
  'ㅂ', 'ㅍ', 'ㅄ'];
// A syllable beginning with a vowel is written with ㅇ, so a stop 받침 followed by one is
// exactly the boundary the liaison crosses. Once it has crossed, the boundary is gone.
// Spaces are dropped first, because the whole point of this rule is that it crosses a word
// boundary: 잎 위 and 못 왔어요 are two words on the page and one sound in the mouth.
function hasStopBeforeVowel(s) {
  const t = nfc(s).replace(/\s+/g, '');
  for (let i = 0; i + 1 < t.length; i++) {
    if (!isSyllable(t[i]) || !isSyllable(t[i + 1])) continue;
    if (STOPS.indexOf(finalOf(t[i])) >= 0 && initialOf(t[i + 1]) === 'ㅇ') return true;
  }
  return false;
}
const bracketed = (s) => (/\[([가-힣]+)\]/.exec(String(s)) || [])[1];

console.log('====================================================');
console.log('2B UNIT 11 · 교과서 — THE CHAPTER\'S OWN PAGES');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank and the desk row ---');
assert(tb.id === 'unit11-textbook', 'the bank names itself unit11-textbook');
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'and the desk labels it 교과서 / Textbook');
assert(/교과서/.test(tb.source || ''), 'its source line says which of the two books it is');
assert(/운동을 좀 해 보는 게 어때요/.test(tb.source || ''), 'and which chapter');
assert(exs.length === 14, 'fourteen exercises (found ' + exs.length + ')');
assert(rows.length === 63, '63 rows across them (found ' + rows.length + ')');
const ORDER = ['어휘', '문법과 표현 1', '말하기 1', '문법과 표현 2', '말하기 2',
  '듣고 말하기', '읽고 쓰기', '문화 산책', '발음', '자기 평가'];
const sections = exs.map((ex) => ex.section);
assert(new Set(sections).size === 10,
  'ten sections of the chapter are covered (' + [...new Set(sections)].join(', ') + ')');
ORDER.forEach((s) => assert(sections.includes(s), 'including ' + s));
let last = -1, ordered = true;
sections.forEach((s) => { const at = ORDER.indexOf(s); if (at < last) ordered = false; else last = at; });
assert(ordered, 'and they are listed in the order the chapter prints them');
// 과제 is the one printed section with no key of any kind, so its absence is a decision.
assert(!sections.includes('과제'), '과제 is absent, because nothing on it can be marked');
assert(/과제/.test(String(tb.omittedNote)) && /어휘 2/.test(String(tb.omittedNote)),
  'and the omitted note names it, and the two 어휘 pages the 익힘책 already owns');
assert(String(tb.omittedNote || '').length > 400, 'at enough length to have said why');
assert(String(tb.artNote || '').length > 200, 'the art note says which pictures are missing');
assert(/isUnit11World\(\)\) return '\/worlds\/unit11-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 11 to this bank');
assert(read(path.join('admin', 'lib', 'workbook.js'))
  .indexOf("'unit11-textbook': path.join('worlds', 'unit11-textbook.json')") >= 0,
  'and the admin registry can open it');
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit11-textbook.json'") >= 0,
  'HV_CATALOG_SOURCES lists it, so the Vietnamese is counted');
assert(fs.existsSync(path.join(ROOT, 'locales', 'vi', 'worlds', 'unit11-textbook.json')),
  'and the Vietnamese catalogue is on disk');

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
const respaced = [];
rows.forEach(({ ex, it }) => {
  [['choices', 'answer'], ['choices2', 'answer2']].forEach(([list, key]) => {
    const right = (it[list] || []).find((c) => c.id === it[key]);
    if (!right) return;
    (it[list] || []).forEach((c) => {
      if (c.id !== it[key] && strip(c.ko) === strip(right.ko)) respaced.push(ex.id + ':' + it.n + ' "' + c.ko + '"');
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
const unaddressed = rows.filter(({ it }) => !(it.choices || []).concat(it.choices2 || [])
  .some((c) => String(it.why).indexOf(c.ko) >= 0)).map(({ ex, it }) => ex.id + ':' + it.n);
assert(unaddressed.length === 0, 'and it names at least one of that row\'s own answers'
  + (unaddressed.length ? ' — ' + unaddressed.join(', ') : ''));
const quiet = exs.filter((ex) => String(ex.noteEn).length < 60).map((ex) => ex.id);
assert(quiet.length === 0, 'every exercise explains how it differs from the printed page'
  + (quiet.length ? ' — ' + quiet.join(', ') : ''));
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
assert(exs.every((e) => /^u11sgk-/.test(e.id)), 'and the 교과서 ids are prefixed');
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
// The stronger comparison, and the one this unit needed: the same answer reached by two
// different sentences is still one exercise charged twice.
const wbAnswers = new Set();
(wb.exercises || []).forEach((ex) => (ex.items || []).forEach((it) => {
  const a = (it.choices || []).find((c) => c.id === it.answer);
  if (a) wbAnswers.add(nfc(a.ko));
  const b = (it.choices2 || []).find((c) => c.id === it.answer2);
  if (b) wbAnswers.add(nfc(b.ko));
}));
// The 자기 평가 answer key printed at the foot of p.66 gives 병원에 가는 게 어때요, and the
// 익힘책 uses that same sentence for 문형 연습 3 row 1. The book chose it, so it stays — named
// here rather than quietly allowed, which is the difference between a decision and a gap.
const ON_PURPOSE = new Set(['u11sgk-check-2:3']);
const answerClash = rows.filter(({ ex, it }) => {
  const a = (it.choices || []).find((c) => c.id === it.answer);
  return a && wbAnswers.has(nfc(a.ko)) && !ON_PURPOSE.has(ex.id + ':' + it.n);
}).map(({ ex, it }) => ex.id + ':' + it.n);
assert(answerClash.length === 0, 'and no answer is also the answer to a 연습 문제 row'
  + (answerClash.length ? ' — ' + answerClash.join(', ') : ''));
const purposeRow = rows.find(({ ex, it }) => ex.id + ':' + it.n === 'u11sgk-check-2:3');
const purposeAnswer = purposeRow && (purposeRow.it.choices || []).find((c) => c.id === purposeRow.it.answer);
assert(purposeAnswer && wbAnswers.has(nfc(purposeAnswer.ko)),
  'the one allowed overlap is still real, so the allowance is not stale');
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
assert(withAudio.length === 29, 'twenty-nine rows carry a recording (found ' + withAudio.length + ')');
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
    if (nfc(filled(it)).indexOf(clipText[src]) < 0) mismatched.push(at + ': clip says "' + clipText[src] + '"');
  } else if (trackOf[src]) {
    if (!/^audio\/book\/2b-u11-trk\d\d\.mp3$/.test(src)) mismatched.push(at + ': ' + src + ' is not a Unit 11 track');
  } else {
    mismatched.push(at + ': ' + src + ' is in neither the track list nor the dictation set');
  }
});
assert(mismatched.length === 0, 'and each is the recording of the sentence beside it'
  + (mismatched.length ? ' — ' + mismatched.join('; ') : ''));
assert(clipRows === 26, 'twenty-six of them play a single cut line rather than the whole track (found ' + clipRows + ')');
const drift = withAudio.filter(({ it }) => {
  const inSrc = /-trk(\d+)\.mp3$/.exec(it.audio.src);
  const inLbl = /track\s*(\d+)/.exec(String(it.audio.labelEn || ''));
  return inSrc && inLbl && Number(inSrc[1]) !== Number(inLbl[1]);
}).map(({ ex, it }) => ex.id + ':' + it.n);
assert(drift.length === 0, 'and each clip label names the track it actually plays'
  + (drift.length ? ' — ' + drift.join(', ') : ''));
const overclaimed = withAudio.filter(({ it }) =>
  !/-trk\d+\.mp3$/.test(it.audio.src) && /track\s*\d+/.test(String(it.audio.labelEn || '')))
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(overclaimed.length === 0, 'and a single line is never labelled as the whole track'
  + (overclaimed.length ? ' — ' + overclaimed.join(', ') : ''));
// The six clips this bank leans on hardest are the ones cut from the two 발음 tracks that
// were added with it, so the 발음 연습 page could not have existed before them.
const pron2 = exs.find((e) => e.id === 'u11sgk-pron-2');
const pronClips = (pron2.items || []).map((it) => it.audio && it.audio.src);
assert(pronClips.every((s) => /2b-u11-d5[0-3]\.mp3$/.test(String(s))),
  '발음 연습 plays only the clips cut from track 21 (' + pronClips.map((s) => String(s).replace(/^.*-/, '')).join(' ') + ')');
['u11sgk-listen-1', 'u11sgk-listen-2', 'u11sgk-pron-2'].forEach((id) => {
  const ex = exs.find((e) => e.id === id);
  const bare = (ex.items || []).filter((it) => !(it.audio && it.audio.src)).map((it) => it.n);
  assert(bare.length === 0, id + ': every row plays the sentence it came from'
    + (bare.length ? ' — row ' + bare.join(',') : ''));
});

// ── 5. What the rows teach is what the chapter teaches ───────────────────────
console.log('\n--- 5. What the rows teach is what the chapter teaches ---');
const owned = new Set((world.level.words || []).map((w) => nfc(w.ko)));
// 어휘 연습 1 IS its vocabulary, so every one of its answers is checked rather than sampled.
const vocab = exs.find((e) => e.id === 'u11sgk-vocab-1');
assert((vocab.items || []).length === 7, 'the 어휘 exercise keys the seven symptoms the 익힘책 leaves');
const symptomAnswers = (vocab.items || []).map((it) =>
  ((it.choices || []).find((c) => c.id === it.answer) || {}).ko);
// The rows conjugate them, so the headword is what the phrase reduces to.
const HEADWORD = {
  '다리를 다쳤어요': '다리를 다치다', '멀미를 해요': '멀미를 하다', '토했어요': '토하다',
  '입맛이 없어요': '입맛이 없다', '기운이 없어요': '기운이 없다',
  '얼굴에 뭐가 났어요': '얼굴에 뭐가 나다', '속이 안 좋고': '속이 안 좋다'
};
const unmapped = symptomAnswers.filter((a) => !HEADWORD[nfc(a)]);
assert(unmapped.length === 0, 'and each of the seven reduces to a headword'
  + (unmapped.length ? ' — ' + unmapped.join(', ') : ''));
const unteachable = symptomAnswers.map((a) => HEADWORD[nfc(a)]).filter((k) => k && !owned.has(nfc(k)));
assert(unteachable.length === 0, 'and the farm can teach every one of them'
  + (unteachable.length ? ' — ' + unteachable.join(', ') : ''));
// The five the 익힘책 owns are not answered here — they turn up as wrong buttons instead.
const WORKBOOK_FIVE = ['소화가 안되다', '배탈이 나다', '어지럽다', '잠을 잘 못 자다', '몸살이 나다'];
WORKBOOK_FIVE.forEach((k) => assert(owned.has(nfc(k)), k + ' is on the farm, and left to the 익힘책'));
['인삼', '영양제', '습관', '예방하다', '노력하다', '채소', '외출하다', '진료를 받다',
  '싱겁다', '자꾸', '화해하다', '생활비', '특별하다', '평소', '기침이 나다', '계속'
].forEach((ko) => assert(owned.has(nfc(ko)), ko + ' is a word the farm can teach'));
// All four grammar points of the chapter have a page of their own.
["'ㅅ' 불규칙", 'N마다', 'V-는 게 어때요?', 'V-기로 하다']
  .forEach((p) => assert(exs.some((ex) => ex.pattern === p), p + ' has a page of its own'));
// 발음 goes both ways round, and both are checked from the rule rather than the key.
const pron1 = exs.find((e) => e.id === 'u11sgk-pron-1');
const soundKeyed = (pron1.items || []).filter((it) => {
  const a = (it.choices || []).find((c) => c.id === it.answer);
  return a && !hasStopBeforeVowel(a.ko);
});
assert(soundKeyed.length === (pron1.items || []).length,
  '발음 규칙 keys a form with the liaison already done, so no 받침 is left before a vowel ('
  + soundKeyed.length + ' of ' + (pron1.items || []).length + ')');
const spellingOffered = (pron1.items || []).filter((it) => {
  // Greedy, so it takes the whole run of Hangul and spaces before the bracket rather than
  // the last syllable of it — 못 왔어요, not 요.
  const printed = (/([가-힣 ]+)\[\{\}\]/.exec(String((it.lines || [])[0] && it.lines[0].ko)) || [])[1];
  const p = printed && nfc(printed);
  return p && hasStopBeforeVowel(p)
    && (it.choices || []).some((c) => c.id !== it.answer && nfc(c.ko) === p);
});
assert(spellingOffered.length === (pron1.items || []).length,
  'and on every row the spelling still has that boundary and is one of the wrong buttons ('
  + spellingOffered.length + ' of ' + (pron1.items || []).length + ')');
const spellingKeyed = (pron2.items || []).filter((it) => {
  const heard = bracketed(it.phraseKo);
  const a = (it.choices || []).find((c) => c.id === it.answer);
  if (!heard || !a) return false;
  const wrongHasIt = (it.choices || []).filter((c) => c.id !== it.answer && nfc(c.ko).indexOf(heard) >= 0);
  return nfc(a.ko).indexOf(heard) < 0 && wrongHasIt.length === 1;
});
assert(spellingKeyed.length === (pron2.items || []).length,
  '발음 연습 keys the spelling, and exactly one wrong button is the sound written down ('
  + spellingKeyed.length + ' of ' + (pron2.items || []).length + ')');

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.split(path.sep).join('/')));
assert(batch.has('worlds/unit11-textbook.json'), 'worlds/unit11-textbook.json publishes');
assert(batch.has('locales/vi/worlds/unit11-textbook.json'), 'and so does its Vietnamese');
const absent = [...new Set(withAudio.map(({ it }) => it.audio.src))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and so does every recording it names'
  + (absent.length ? ' — ' + absent.join(', ') : ''));
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
console.log('\ntest_unit11_textbook: all passed');
