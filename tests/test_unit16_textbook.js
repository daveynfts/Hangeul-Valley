'use strict';
/**
 * tests/test_unit16_textbook.js — the 교과서 section of Unit 16's study desk.
 *
 * 연습 문제 is the 익힘책 and has its own suite (tests/test_unit16_workbook.js); this is the
 * 교과서's own 어휘, 문법과 표현, 말하기, 듣고 말하기, 읽고 쓰기, 과제, 문화 산책, 발음 and
 * 자기 평가. The file format and the renderer are shared with Units 10, 11, 13, 14 and 15 and
 * are not retested here. What is:
 *
 *   1. That the two books stay apart. Both drill the same four grammar points, so left alone
 *      they reach for the same sentence. Section 3 compares every gapped line across the pair.
 *
 *   2. That the audio bolted to a row is the audio OF that row. Twenty-five rows name a
 *      recording and twenty of those name a dictation clip whose text is written down in
 *      worlds/unit16-cassette.json, so "this mp3 is that sentence" is checkable rather than a
 *      filename to be trusted. Section 4 checks it.
 *
 *   3. That the 발음 page is about 유음화 and not about spelling. The rule is that a ㄴ beside a
 *      ㄹ is read [ㄹ]; section 5 works the syllables out arithmetically and asserts that every
 *      keyed answer has the ㄹㄹ run the rule produces and that no wrong button does.
 *
 *   4. That the 자기 평가 box still gives each of the chapter's four forms exactly once. Every
 *      form is used once on that page, so a row keyed to the wrong one silently takes an answer
 *      another row needs — and both rows still look right on their own.
 *
 * One check that Unit 16's 익힘책 suite carries is deliberately NOT here: "every grammar note
 * quotes something from its own row", matched on two-syllable runs. Fifteen of these notes fail
 * it and every one of the fifteen is correct — they name a verb in the dictionary form where
 * the row prints it inflected (맡기다 against 맡길, 옮기다 against 옮깁니다), or a single-syllable
 * piece of the Yut board (도, 개, 걸, 모), or a bare jamo on the 발음 rule row. Loosening the
 * match to one syllable would pass everything and mean nothing, and rewriting fifteen accurate
 * notes to satisfy a string test is writing prose for a machine. What is checked instead is
 * that no two notes are the same, and — in section 5 — the property the notes are about:
 * that every keyed answer on a 문법과 표현 page actually uses that page's form.
 *
 * Run: node tests/test_unit16_textbook.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC').trim();
const flat = (s) => nfc(s).replace(/[\s.,?!()[\]]/g, '');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const tb = readJson('worlds/unit16-textbook.json');
const wb = readJson('worlds/unit16-workbook.json');
const cass = readJson('worlds/unit16-cassette.json');
const world = readJson('worlds/2b-unit-16.json');
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
const keyed = (it) => (((it.choices || []).find((c) => c.id === it.answer) || {}).ko || '');

// Hangul syllable arithmetic, for 발음. A syllable is (initial * 21 + medial) * 28 + final,
// based at U+AC00, so the 받침 of one syllable and the initial of the next can be read off
// without a pronunciation table.
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const FINALS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ',
  'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const isSyllable = (ch) => ch >= '가' && ch <= '힣';
const initialOf = (ch) => INITIALS[Math.floor((ch.codePointAt(0) - 0xAC00) / 588)];
const finalOf = (ch) => FINALS[(ch.codePointAt(0) - 0xAC00) % 28];
// True when some 받침 X sits immediately in front of an initial Y. Spaces are stripped first,
// because 일 년 and 갈 날만 are two words in writing and one run in sound — which is the whole
// of what rows 3 and 5 of the 발음 page are for.
function hasJoin(s, x, y) {
  const t = flat(s);
  for (let i = 0; i + 1 < t.length; i++) {
    if (!isSyllable(t[i]) || !isSyllable(t[i + 1])) continue;
    if (finalOf(t[i]) === x && initialOf(t[i + 1]) === y) return true;
  }
  return false;
}
// The environment the rule needs, either way round, and the run it produces.
const hasNieunNextToRieul = (s) => hasJoin(s, 'ㄹ', 'ㄴ') || hasJoin(s, 'ㄴ', 'ㄹ');
const hasRieulRun = (s) => hasJoin(s, 'ㄹ', 'ㄹ');

console.log('====================================================');
console.log('2B UNIT 16 · 교과서 — THE CHAPTER\'S OWN PAGES');
console.log('====================================================');

// ── 1. The bank and the desk row ─────────────────────────────────────────────
console.log('\n--- 1. The bank and the desk row ---');
assert(tb.id === 'unit16-textbook', 'the bank names itself unit16-textbook');
assert(tb.titleKo === '교과서' && tb.titleEn === 'Textbook', 'and the desk labels it 교과서 / Textbook');
assert(/교과서/.test(tb.source || ''), 'its source line says which of the two books it is');
assert(/설날에는 밥 대신 떡국을 먹어요/.test(tb.source || ''), 'and which chapter');
assert(exs.length === 14, 'fourteen exercises (found ' + exs.length + ')');
assert(rows.length === 59, '59 rows across them (found ' + rows.length + ')');
// The chapter has eleven headed sections and every one of them is represented, which is the
// difference between porting a chapter and porting the pages that were easy.
const ORDER = ['어휘', '문법과 표현 1', '말하기 1', '문법과 표현 2', '말하기 2',
  '듣고 말하기', '읽고 쓰기', '과제', '문화 산책', '발음', '자기 평가'];
const sections = exs.map((ex) => ex.section);
assert(new Set(sections).size === 11,
  'eleven sections of the chapter are covered (' + [...new Set(sections)].join(', ') + ')');
ORDER.forEach((s) => assert(sections.includes(s), 'including ' + s));
let last = -1, ordered = true;
sections.forEach((s) => { const at = ORDER.indexOf(s); if (at < last) ordered = false; else last = at; });
assert(ordered, 'and they are listed in the order the chapter prints them');
assert(/isUnit16World\(\)\) return '\/worlds\/unit16-textbook\.json'/.test(ui),
  'textbookUrl resolves Unit 16 to this bank');
assert(read(path.join('admin', 'lib', 'workbook.js'))
  .indexOf("'unit16-textbook': path.join('worlds', 'unit16-textbook.json')") >= 0,
  'and the admin registry can open it');
// Listed for translation, or it ships in English and only i18n_report knows.
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/unit16-textbook.json'") >= 0,
  'HV_CATALOG_SOURCES lists it, so the Vietnamese is counted');
const viPath = path.join('locales', 'vi', 'worlds', 'unit16-textbook.json');
assert(fs.existsSync(path.join(ROOT, viPath)), 'and the Vietnamese catalogue is on disk');
const vi = readJson(viPath);
assert(Object.keys(vi.entries || {}).length === 250,
  'with a line for all 250 strings (found ' + Object.keys(vi.entries || {}).length + ')');
// Two notes that say what the bank does NOT have. A save through the Workbooks tab used to
// drop both, so they are asserted rather than assumed.
assert(String(tb.artNote || '').length > 200, 'the art note says which pictures are missing');
assert(String(tb.omittedNote || '').length > 200, 'and the omitted note says which pages have no key');
assert(/어휘/.test(tb.artNote) && /과제/.test(tb.artNote) && /듣기 2/.test(tb.artNote),
  'and it names all three pages that leaned on a picture');

// ── 2. Every row is answerable, and only one way ─────────────────────────────
console.log('\n--- 2. Every row is answerable, and only one way ---');
const problems = [];
rows.forEach(({ ex, it }) => {
  const at = ex.id + ' row ' + it.n;
  const sets = (it.choices2 || it.answer2) ? 2 : 1;
  const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
  if (gaps !== sets) problems.push(at + ': ' + gaps + ' blanks for ' + sets + ' choice sets');
  const seen = new Set();
  [...(it.choices || []), ...(it.choices2 || [])].forEach((c) => {
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
// A distractor that differs from the answer only by a space is not a decision: on a phone the
// two buttons are indistinguishable. Four rows of the 익힘책 shipped that way once.
const respaced = [];
rows.forEach(({ ex, it }) => {
  [['choices', 'answer'], ['choices2', 'answer2']].forEach(([list, key]) => {
    const right = (it[list] || []).find((c) => c.id === it[key]);
    if (!right) return;
    (it[list] || []).forEach((c) => {
      if (c.id !== it[key] && flat(c.ko) === flat(right.ko)) respaced.push(ex.id + ':' + it.n + ' "' + c.ko + '"');
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
// The explanation is read at the moment a row went wrong, by somebody who wants to know about
// THEIR mistake — so it has to name at least one of the buttons that were on screen. Matched
// on three syllables rather than four: 만드까 and 차례 are whole wrong buttons shorter than
// four, and at four syllables the check called both of them silent.
const unaddressed = rows.filter(({ it }) => {
  const why = flat(it.why);
  return !(it.choices || []).concat(it.choices2 || []).some((c) => {
    const b = flat(c.ko);
    if (b.length <= 3) return why.indexOf(b) >= 0;
    for (let i = 0; i + 3 <= b.length; i++) if (why.indexOf(b.substr(i, 3)) >= 0) return true;
    return false;
  });
}).map(({ ex, it }) => ex.id + ':' + it.n);
assert(unaddressed.length === 0, 'and it names at least one of that row\'s own answers'
  + (unaddressed.length ? ' — ' + unaddressed.join(', ') : ''));
// Two rows carrying one note is the copy-paste that a reader notices and a schema does not.
const notes = rows.map(({ it }) => nfc(it.grammar));
assert(new Set(notes).size === notes.length,
  'no two rows carry the same grammar note (' + new Set(notes).size + ' distinct of ' + notes.length + ')');
const whys = rows.map(({ it }) => nfc(it.why));
assert(new Set(whys).size === whys.length,
  'and no two carry the same "why" (' + new Set(whys).size + ' distinct of ' + whys.length + ')');
const quiet = exs.filter((ex) => String(ex.noteEn).length < 120).map((ex) => ex.id);
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
assert(exs.every((e) => /^u16sgk-/.test(e.id)),
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
// The 퀴즈 is the third thing on the same desk, so it counts too. This check was written
// before the quiz existed, as an assertion that it did not — so that the day the file landed
// the suite failed and the real comparison had to be put in rather than forgotten.
const quiz = readJson('worlds/unit16-desk-quiz.json');
const quizText = new Set((quiz.questions || [])
  .flatMap((q) => Object.keys(q.choices || {}).map((k) => flat(q.choices[k]))));
const quizClash = rows.map(({ ex, it }) => ({ at: ex.id + ':' + it.n, s: flat(filled(it)) }))
  .filter((x) => quizText.has(x.s));
assert(quizClash.length === 0, 'and no filled sentence is already a desk-quiz button'
  + (quizClash.length ? ' — ' + quizClash.map((x) => x.at).join(', ') : ''));

// ── 4. The audio on a row is the audio of that row ───────────────────────────
console.log('\n--- 4. The audio on a row is the audio of that row ---');
const clipText = {};
(cass.dictation.items || []).forEach((i) => { clipText[i.audio.src] = nfc(i.ko); });
const trackOf = {};
(cass.tracks || []).forEach((t) => { trackOf[t.src] = t; });
const withAudio = rows.filter(({ it }) => it.audio && it.audio.src);
assert(withAudio.length === 25, 'twenty-five rows carry a recording (found ' + withAudio.length + ')');
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
    if (!/^audio\/book\/2b-u16-trk\d\d\.mp3$/.test(src)) mismatched.push(at + ': ' + src + ' is not a Unit 16 track');
  } else {
    mismatched.push(at + ': ' + src + ' is in neither the track list nor the dictation set');
  }
});
assert(mismatched.length === 0, 'and each is the recording of the sentence beside it'
  + (mismatched.length ? ' — ' + mismatched.join('; ') : ''));
assert(clipRows === 20, 'twenty of them play a single cut line rather than the whole track (found ' + clipRows + ')');
// A row that says "track 69" while playing trk68 sends the learner to the wrong page of the
// book, and nothing on screen gives that away.
const drift = withAudio.filter(({ it }) => {
  const inSrc = /-trk(\d+)\.mp3$/.exec(it.audio.src);
  const inLbl = /track\s*(\d+)/i.exec(String(it.audio.labelEn || ''));
  return inSrc && inLbl && Number(inSrc[1]) !== Number(inLbl[1]);
}).map(({ ex, it }) => ex.id + ':' + it.n);
assert(drift.length === 0, 'and each clip label names the track it actually plays'
  + (drift.length ? ' — ' + drift.join(', ') : ''));
// The other direction: a cut line labelled "track NN" would claim the whole tape.
const overclaimed = withAudio.filter(({ it }) =>
  !/-trk\d+\.mp3$/.test(it.audio.src) && /track\s*\d+/i.test(String(it.audio.labelEn || '')))
  .map(({ ex, it }) => ex.id + ':' + it.n);
assert(overclaimed.length === 0, 'and a single line is never labelled as the whole track'
  + (overclaimed.length ? ' — ' + overclaimed.join(', ') : ''));
// The pages where the recording IS the exercise. On the two 듣고 말하기 pages the comprehension
// row plays the whole tape and the rest play the turn the answer hangs on; on 발음 the four
// practice rows play their own line so the sound can be heard and not only reasoned about.
['u16sgk-listen-1', 'u16sgk-listen-2'].forEach((id) => {
  const ex = exs.find((e) => e.id === id);
  const bare = (ex.items || []).filter((it) => !(it.audio && it.audio.src)).map((it) => it.n);
  assert(bare.length === 0, id + ': every row plays the recording it came from'
    + (bare.length ? ' — row ' + bare.join(',') : ''));
});
const pron = exs.find((e) => e.id === 'u16sgk-pron-1');
const silentPron = (pron.items || []).filter((it) => it.n > 1 && !(it.audio && it.audio.src)).map((it) => it.n);
assert(silentPron.length === 0, 'u16sgk-pron-1: every practice row plays its own line'
  + (silentPron.length ? ' — row ' + silentPron.join(',') : ''));

// ── 5. What the rows teach is what the chapter teaches ───────────────────────
console.log('\n--- 5. What the rows teach is what the chapter teaches ---');
const owned = new Set((world.level.words || []).map((w) => nfc(w.ko)));
// The 어휘 page's five answers are the chapter's own headwords, but conjugated: the farm holds
// 차례를 지내다 and the page keys 차례를 지내요. So the head of each answer is what is checked.
const vocab = exs.find((e) => e.id === 'u16sgk-vocab-1');
const vocabAnswers = (vocab.items || []).map((it) => keyed(it));
assert(vocabAnswers.length === 5, 'the 어휘 page keys five of the chapter\'s words');
const unteachable = vocabAnswers.filter((ko) => {
  const headword = nfc(ko).split(/\s+/)[0].replace(/[은는이가을를]$/, '');
  return ![...owned].some((w) => flat(w).indexOf(flat(headword)) >= 0);
});
assert(unteachable.length === 0, 'and the farm can teach every one of them'
  + (unteachable.length ? ' — ' + unteachable.join(', ') : ''));
['명절', '음력', '차례를 지내다', '세배(를) 하다', '성묘(를) 하다', '떡국', '송편', '연휴',
  '보름달', '강강술래', '씨름', '추수하다', '예매하다', '고향에 내려가다', '윷놀이(를) 하다',
  '사물놀이 공연', '고양이를 맡기다'
].forEach((ko) => assert(owned.has(nfc(ko)), ko + ' is a word the farm can teach'));
// The four grammar points, each with a page of its own — and every keyed answer on that page
// using the form the page is for. A row that quietly drills a different ending is a row the
// learner meets before the chapter has taught it.
const FORMS = [
  ['V-아/어 놓다', 'u16sgk-gram-1', /놓/],
  ['N 대신', 'u16sgk-gram-2', /대신/],
  ['V-(으)ㄹ까 하다', 'u16sgk-gram-3', /ㄹ까|까 하|까 해/],
  ['A/V-(으)ㄹ 테니까', 'u16sgk-gram-4', /테니까/]
];
FORMS.forEach(([label, id, re]) => {
  const ex = exs.find((e) => e.id === id);
  assert(ex && ex.pattern === label, label + ' has a page of its own');
  const off = (ex.items || []).filter((it) => {
    const second = ((it.choices2 || []).find((c) => c.id === it.answer2) || {}).ko || '';
    return !re.test(nfc(keyed(it) + ' ' + second));
  }).map((it) => it.n);
  assert(off.length === 0, 'and every answer on it uses ' + label
    + (off.length ? ' — row ' + off.join(',') : ''));
});
// 자기 평가 prints one box holding all four forms and four dialogues under it, so each form is
// used exactly once. A row keyed to the wrong one takes the answer another row needs, and both
// rows still read correctly on their own — which is why this is checked across the page.
const check = exs.find((e) => e.id === 'u16sgk-check-1');
assert((check.items || []).length === 4, '자기 평가 has one row per form (found ' + (check.items || []).length + ')');
FORMS.forEach(([label, , re]) => {
  const hits = (check.items || []).filter((it) => re.test(nfc(keyed(it))));
  assert(hits.length === 1, 'and exactly one of them is keyed to ' + label
    + ' (found ' + hits.length + ')');
});
// 발음 is 유음화. Row 1 is the rule itself, stated in jamo; rows 2 to 5 are words the rule acts
// on, and each is checked from both sides — the spelling has a ㄴ beside a ㄹ, the keyed reading
// has the ㄹㄹ run that produces, and no wrong button does. That last half is what makes the
// page a pronunciation question rather than a spelling one.
const ruleRow = (pron.items || [])[0];
assert(nfc(keyed(ruleRow)) === '[ㄹ]', '발음 row 1 states the rule: ㄴ after a 받침 ㄹ is read [ㄹ]');
const practice = (pron.items || []).slice(1);
assert(practice.length === 4, 'and four words are put through it (found ' + practice.length + ')');
practice.forEach((it) => {
  const printed = (/^(.+?)\s*⟶/.exec(nfc((it.lines || [])[(it.lines || []).length - 1].ko)) || [])[1] || '';
  const at = '발음 row ' + it.n + ' (' + printed + ')';
  assert(hasNieunNextToRieul(printed), at + ': the spelling has a ㄴ beside a ㄹ');
  assert(hasRieulRun(keyed(it)), at + ': the keyed reading has the ㄹㄹ run the rule makes');
  const wrongWithRun = (it.choices || []).filter((c) => c.id !== it.answer && hasRieulRun(c.ko)).map((c) => c.ko);
  assert(wrongWithRun.length === 0, at + ': and no wrong button has it'
    + (wrongWithRun.length ? ' — ' + wrongWithRun.join(', ') : ''));
});

// ── 6. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 6. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.split(path.sep).join('/')));
assert(batch.has('worlds/unit16-textbook.json'), 'worlds/unit16-textbook.json publishes');
assert(batch.has('locales/vi/worlds/unit16-textbook.json'), 'and so does its Vietnamese');
const absent = [...new Set(withAudio.map(({ it }) => it.audio.src))].filter((s) => !batch.has(s));
assert(absent.length === 0, 'and so does every recording it names'
  + (absent.length ? ' — ' + absent.join(', ') : ''));
// The renderer falls back to a pre-rendered TTS clip on any row the book has no tape for, so
// the harvest has to read this file too or those rows get a dead play button.
const { collectTtsPhrases, ttsClipRel } = require(path.join(ROOT, 'scripts', 'ttsClips.js'));
const wanted = new Set(collectTtsPhrases(ROOT).map((t) => ttsClipRel(t)));
const spoken = rows.filter(({ it }) => !(it.audio && it.audio.src)).map(({ it }) => nfc(filled(it)));
assert(spoken.length === 34, 'thirty-four rows have no tape of their own (found ' + spoken.length + ')');
const unharvested = spoken.filter((s) => s && !wanted.has(ttsClipRel(s)));
assert(unharvested.length === 0, 'and every one of them is in the TTS harvest'
  + (unharvested.length ? ' — ' + unharvested.slice(0, 3).join(' | ') : ''));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit16_textbook: all passed');
