'use strict';
/**
 * tests/test_unit13_cassette.js — 2B Unit 13 (주변이 조용해서 살기 좋아요): the word
 * list, the recordings, and the dictation set cut from them.
 *
 * The cassette machinery itself — the aligner, the shared player, the overlays, the
 * upload collector — is guarded by tests/test_unit11_cassette.js and is not repeated
 * here. What this suite is for is Unit 13's own content, and the two things about it
 * that differ from Unit 11:
 *
 *   1. Its dictation set is built on 유기음화, because that is this chapter's own 발음
 *      page: 받침 ㄱ/ㄷ/ㅂ meeting ㅎ surfaces as ㅋ/ㅌ/ㅍ. Tracks 40 and 41 ARE that
 *      page, and the book prints both the spelling and the pronunciation, which is
 *      the best dictation material in the book. Section 4 checks the set really
 *      leans on it rather than being a bag of arbitrary sentences.
 *
 *   2. Its turn-grouping gap is 1.00s, not Unit 11's 0.95s. Track 37 has within-turn
 *      pauses at 0.952s and 0.987s, and at 0.95 they split two turns in half — 12
 *      turns for 10 printed lines. That is recorded in the pace bands here: if the
 *      cut is ever redone at the wrong threshold, section 5 fails.
 *
 * Run: node tests/test_unit13_cassette.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const world = readJson('worlds/2b-unit-13.json');
const c = readJson('worlds/unit13-cassette.json');
const quiz = readJson('worlds/unit13-desk-quiz.json');
const ui = read('js/ui.js');
const words = world.level.words || [];
const tracks = c.tracks || [];
const items = (c.dictation && c.dictation.items) || [];

console.log('====================================================');
console.log('2B UNIT 13 · 주변이 조용해서 살기 좋아요');
console.log('====================================================');

// ── 1. The word list is the whole chapter ────────────────────────────────────
console.log('\n--- 1. The word list ---');
assert(world.id === '2b-unit-13' && world.level.worldId === '2b-unit-13', 'world id is 2b-unit-13');
assert(words.length === 104, 'the list holds 104 words (' + words.length + ')');
assert(words.every((w) => w.ko && w.en && w.hint && w.category && w.categoryEn),
  'every word has ko / en / hint / category / categoryEn');
const dups = words.map((w) => nfc(w.ko)).filter((k, i, a) => a.indexOf(k) !== i);
assert(dups.length === 0, 'no headword repeats' + (dups.length ? ' — ' + dups.join(', ') : ''));
assert(JSON.stringify(world.level.map.stations) === JSON.stringify(['desk', 'cassette']),
  'the world JSON gives it the desk and the cassette — currentWorldPack reads this over WORLD_PACKS');

const ko = new Set(words.map((w) => nfc(w.ko)));
// Named per page so that dropping one is a deliberate edit to this list rather than
// something that slips out. The 어휘 spreads and the footnote glossaries are the words
// a learner cannot look up anywhere else in the game.
const FROM_THE_BOOK = {
  '어휘 1 · 집의 종류 (p.66)': ['기숙사', '아파트', '주택', '빌라', '원룸', '오피스텔'],
  '어휘 2 · 집 안 (p.66)': ['방', '거실', '부엌', '화장실', '베란다', '현관'],
  '어휘 3 · 집을 고르는 조건 (p.67)': ['방이 넓다', '방값이 싸다', '새로 지었다', '시설이 잘되어 있다',
    '교통이 편리하다', '주변이 조용하다', '전망이 좋다', '집주인이 좋다'],
  '어휘 4 · 생활비 (p.67)': ['집세', '식비', '교통비', '관리비', '전기 요금', '가스 요금', '수도 요금', '전화 요금'],
  '문법 1-1 glossary (p.68)': ['부동산', '하숙집', '구하다'],
  '문법 1-2 glossary (p.69)': ['시끄럽다'],
  '말하기 1 연습 2 glossary (p.71)': ['주변 환경', '크기'],
  '문법 2-1 glossary (p.72)': ['계약', '떠들다', '공기'],
  '말하기 2 glossary (p.74)': ['마침', '전세', '보증금', '결정하다', '회사를 옮기다', '장을 보다'],
  '말하기 2 연습 2 glossary (p.75)': ['이하', '위치', '기타'],
  '듣고 말하기 glossary (p.76-77)': ['매매', '고시원'],
  '읽기 glossary (p.78)': ['대부분', '바뀌다', '유학'],
  '과제 (p.80-81)': ['룸메이트', '규칙', '조건', '청소', '포함되다'],
  '문화 산책 glossary (p.82)': ['민속촌', '바람이 통하다', '한옥']
};
Object.entries(FROM_THE_BOOK).forEach(([page, list]) => {
  const gone = list.filter((k) => !ko.has(nfc(k)));
  assert(gone.length === 0, page + ' is complete' + (gone.length ? ' — missing: ' + gone.join(', ') : ''));
});
// The four grammar points are the chapter, so the words their pages hang on must be
// learnable or the 문법과 표현 spreads have nothing behind them.
assert(['살기 좋다', '마음에 들다', '편하다', '불편하다', '힘들다'].every((k) => ko.has(nfc(k))),
  'the adjectives V-기(가) A is drilled with are all there');

// No word may sit in two units: SRS state is keyed by the Korean, so one word in two
// farms means one review schedule shared between them with nothing saying so.
['2b-unit-10', '2b-unit-11', '2b-unit-14'].forEach((other) => {
  const owned = new Set((readJson('worlds/' + other + '.json').level.words || []).map((w) => nfc(w.ko)));
  const shared = [...ko].filter((k) => owned.has(k));
  assert(shared.length === 0, 'shares no headword with ' + other + (shared.length ? ' — ' + shared.join(', ') : ''));
});
// Named rather than merely absent: words this chapter really does use, left out
// because an earlier unit already teaches them.
const DEFERRED = { '2b-unit-11': ['생활비', '돈이 들다', '바로', '걱정', '발표하다'], '2b-unit-10': ['분위기'] };
Object.entries(DEFERRED).forEach(([unit, list]) => {
  const owned = new Set((readJson('worlds/' + unit + '.json').level.words || []).map((w) => nfc(w.ko)));
  const orphaned = list.filter((k) => !owned.has(nfc(k)));
  assert(orphaned.length === 0, 'the words Unit 13 defers to ' + unit + ' are still taught there'
    + (orphaned.length ? ' — now taught nowhere: ' + orphaned.join(', ') : ''));
});

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(tracks.length === 10, 'ten tracks (' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '32,33,34,35,36,37,38,39,40,41', 'they are 32 through 41');
tracks.forEach((t) => assert(fs.existsSync(path.join(ROOT, t.src)), 'track ' + t.n + ' mp3 is on disk'));
const durOf = (rel) => Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, rel)],
  { encoding: 'utf8' }).trim());
let ffprobe = true;
try { durOf(tracks[0].src); } catch (e) { ffprobe = false; }
if (ffprobe) {
  const drift = tracks.filter((t) => Math.abs(durOf(t.src) - t.dur) > 0.6).map((t) => t.n);
  assert(drift.length === 0, 'each stated duration matches the file'
    + (drift.length ? ' — off for ' + drift.join(',') : ''));
} else {
  console.log('      (ffprobe not on this machine — duration and pace checks skipped)');
}
const scripted = tracks.filter((t) => Array.isArray(t.lines));
// Was: 38 and 39 are listen-only, the unit page printing only their questions. The
// 듣기 지문 at the back prints their transcripts, so all ten are scripted now.
assert(scripted.length === tracks.length, 'all ' + tracks.length + ' tracks carry a script');
assert(tracks.every((t) => !t.noteEn), 'and none needs a note explaining why it has none');
const listening = tracks.filter((t) => t.n === 38 || t.n === 39);
assert(listening.length === 2 && listening.every((t) => t.lines.length >= 10),
  'the two 듣기 tracks carry their full transcript (' + listening.map((t) => t.lines.length).join(' and ') + ' lines)');
// Tracks 40 and 41 are the 발음 page. Their shape had to be worked out rather than
// assumed: the short spans between items are the numbers 일/이/삼/사 being read, and
// each sentence is said once, not twice.
const t41 = tracks.find((t) => t.n === 41);
assert(t41 && t41.lines.length === 5, '발음 연습 carries its five printed lines (' + (t41 ? t41.lines.length : 0) + ')');
assert(t41.lines[3].who === 'A' && t41.lines[4].who === 'B', 'and its fourth item keeps its two speakers');

// ── 3. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 3. The curated set ---');
assert(items.length === 60, '60 sentences (' + items.length + ')');
const ids = items.map((i) => i.id);
assert(new Set(ids).size === ids.length && ids.every((v, k) => v === k + 1), 'ids are unique and sequential');
assert(items.every((i) => i.ko && i.en && i.why && (i.tags || []).length && i.audio && i.audio.src),
  'every row has text, gloss, reason, tags and a clip');
const band = items.filter((i) => syl(i.ko) < 5 || syl(i.ko) > 22).map((i) => i.id);
assert(band.length === 0, 'every sentence is 5-22 syllables' + (band.length ? ' — id ' + band.join(',') : ''));
const stated = items.filter((i) => syl(i.ko) !== i.syl).map((i) => i.id);
assert(stated.length === 0, 'each stated syllable count is true' + (stated.length ? ' — id ' + stated.join(',') : ''));
const scriptedNs = new Set(scripted.map((t) => t.n));
assert(items.every((i) => scriptedNs.has(i.track)), 'every sentence comes from a track with a script');
assert(tracks.every((t) => items.some((i) => i.track === t.n)), 'and every track contributes at least one');
// Every answer must be Korean the narrator really says as a unit: either a printed
// line verbatim, or a run of one that the recording itself pauses around.
const notTraced = items.filter((i) => {
  const t = tracks.find((x) => x.n === i.track);
  if (!t) return true;
  if (i.splitFrom) {
    return !(t.lines.some((l) => nfc(l.ko).indexOf(nfc(i.splitFrom)) >= 0)
      && nfc(i.splitFrom).replace(/\s/g, '').indexOf(nfc(i.ko).replace(/\s/g, '')) >= 0);
  }
  return !t.lines.some((l) => nfc(l.ko).indexOf(nfc(i.ko)) >= 0);
}).map((i) => i.id);
assert(notTraced.length === 0, 'every sentence traces to a printed line'
  + (notTraced.length ? ' — id ' + notTraced.join(',') : ''));
assert(items.filter((i) => i.splitFrom).length === 33, '33 rows are marked as split from a longer turn');
// One clip, one sentence. A learner replays a dictation row several times, so a clip
// carrying two sentences makes them sit through audio they are not asked to write.
const oneSentence = (s) => nfc(s).split(/(?<=[.?!])\s+/).filter((x) => x.trim()).length === 1;
assert(items.every((i) => oneSentence(i.ko)), 'no clip holds more than one sentence');
// The filter drops figures read aloud, and this is the row it was written for: 전세는
// 7,000만 원이고… would have the learner guessing between 7,000 and 칠천.
assert(!items.some((i) => /[0-9],[0-9]/.test(i.ko)), 'no answer contains a figure read aloud');
const f = (c.dictation && c.dictation.filter) || {};
assert(Array.isArray(f.keep) && Array.isArray(f.drop) && !!f.splitAtClause,
  'the rule that chose these 37 ships with them');

// ── 4. Built on this chapter's own 발음 rule ──────────────────────────────────
console.log('\n--- 4. Built on 유기음화 ---');
const asp = items.filter((i) => (i.tags || []).indexOf('유기음화') >= 0);
assert(asp.length >= 12, 'at least twelve rows turn on aspiration (' + asp.length + ' of ' + items.length + ')');
// The book's own worked examples. If the set does not contain the very words the 발음
// page prints, it is not built on that page.
[['축하해요', '추카'], ['깨끗한', '깨끄'], ['입학', '이팍'], ['막혀', '마켜'], ['어떡하죠', '어떠카'], ['밥하고', '바파']]
  .forEach(([word, sound]) => {
    const row = items.find((i) => nfc(i.ko).indexOf(word) >= 0);
    assert(!!row, 'the set drills ' + word);
    if (row) {
      assert(nfc(row.why).indexOf(sound) >= 0,
        'and its note shows the sound it makes — [' + sound + '…]');
    }
  });
// 좋다 is the case worth having twice: the same ㅎ drops before a vowel and aspirates
// before a consonant, and which it does is the whole rule.
const drops = items.find((i) => nfc(i.ko).indexOf('좋은 원룸') >= 0);
const aspirates = items.find((i) => nfc(i.ko).indexOf('좋기는') >= 0);
assert(!!drops && !!aspirates, 'both halves of what ㅎ does are in the set');
assert(!!drops && nfc(drops.why).indexOf('조은') >= 0, 'the dropping one names [조은]');
assert(!!aspirates && nfc(aspirates.why).indexOf('조키는') >= 0, 'the aspirating one names [조키는]');
// Each of the unit's four grammar points must be somewhere in the set, or the farm
// drills vocabulary the chapter does not turn on.
['A/V-(으)ㄹ지 모르겠다', 'A/V-기는 하지만', 'A/V-기 때문에', 'V-기(가) A'].forEach((g) => {
  assert(items.some((i) => (i.tags || []).indexOf(g) >= 0), g + ' is drilled');
});

// ── 5. Each clip matches the text beside it ──────────────────────────────────
console.log('\n--- 5. Each clip matches its text ---');
const missing = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(missing.length === 0, 'every clip is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u13-d\d\d\.mp3$/.test(i.audio.src)), 'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The pace bands, per track. These are the numbers the cut was verified at; a re-cut
// at the wrong silence threshold or the wrong turn gap lands outside them.
const BAND = { 32: [4.5, 6.2], 33: [4.0, 5.5], 34: [4.0, 6.2], 35: [4.2, 5.6],
  36: [3.9, 5.6], 37: [3.9, 6.8], 38: [3.9, 6.4], 39: [3.9, 6.2], 40: [4.0, 5.6], 41: [3.8, 6.2] };
const byTrack = {};
items.forEach((i) => {
  const rate = syl(i.ko) / i.audio.voiced;
  (byTrack[i.track] = byTrack[i.track] || []).push({ id: i.id, rate });
  assert(Math.abs(rate - i.audio.rate) < 0.05, 'id' + i.id + ' stores the pace it reads at');
});
Object.keys(byTrack).forEach((n) => {
  const [lo, hi] = BAND[n];
  const rs = byTrack[n].map((r) => r.rate);
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const out = byTrack[n].filter((r) => r.rate < lo || r.rate > hi);
  assert(out.length === 0, 'track ' + n + ': all ' + rs.length + ' clips read at a human pace for their text ('
    + mean.toFixed(2) + ' syl/s, band ' + lo + '-' + hi + ')'
    + (out.length ? ' — id ' + out.map((r) => r.id).join(',') : ''));
});
// And the bands have teeth. Unit 11's two-clip tracks were blind to a swap because
// their lines were close in length; Unit 13's are not, so every multi-clip track here
// must break — which is a stronger claim than Unit 11 could make.
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => i.track === n);
  if (list.length < 2) return;
  const [lo, hi] = BAND[n];
  const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
  const out = shifted.filter((r) => r < lo || r > hi).length;
  assert(out > 0, 'track ' + n + ' fails its band when the pairing is shifted by one ('
    + out + ' of ' + list.length + ' outside)');
});

// ── 6. Wiring and the desk quiz ──────────────────────────────────────────────
console.log('\n--- 6. Wiring and the desk quiz ---');
assert(/isUnit13World\(\)\) return '\/worlds\/unit13-cassette\.json'/.test(ui),
  'the cassette resolves Unit 13 to its own bank');
assert(/isUnit13World\(\)\) return '\/worlds\/unit13-desk-quiz\.json'/.test(ui),
  'and so does the desk quiz — deskQuizUrl ends in a Unit 10 fallback, so a missing branch serves dish questions');
// Landing on a two-line grammar box is a thin thing to open on, so the listen screen
// starts at the unit's first real conversation. The track number is the book's.
assert(/OPEN_ON = \{[^}]*'2b-unit-13': 34/.test(ui), 'the listen screen opens on 말하기 1, track 34');
assert(quiz.sessionSize === 10 && (quiz.questions || []).length === 13,
  '13 quiz questions, 10 to a session');
const qproblems = [];
(quiz.questions || []).forEach((q, i) => {
  if (typeof q.id !== 'number' || q.id !== i + 1) qproblems.push('row ' + i + ' id');
  if (!q.q) qproblems.push('q' + q.id + ' has no prompt');
  if (Object.keys(q.choices || {}).sort().join('') !== 'ABCD') qproblems.push('q' + q.id + ' choices');
  if (!q.choices || !q.choices[q.a]) qproblems.push('q' + q.id + ' answer not among choices');
  if (!q.art || !String(q.art).startsWith('quiz/')) qproblems.push('q' + q.id + ' missing quiz art');
  else if (!fs.existsSync(path.join(ROOT, 'sprites', String(q.art).replace(/\\/g, '/')))) {
    qproblems.push('q' + q.id + ' art missing');
  }
  const texts = Object.values(q.choices || {}).map(nfc);
  if (new Set(texts).size !== texts.length) qproblems.push('q' + q.id + ' repeats a choice');
});
assert(qproblems.length === 0, 'every quiz row is complete with art'
  + (qproblems.length ? ' — ' + qproblems.slice(0, 5).join(', ') : ''));
const KEYS = ['C', 'B', 'A', 'B', 'C', 'A', 'B', 'D', 'B', 'C', 'A', 'D', 'B'];
assert(JSON.stringify((quiz.questions || []).map((q) => q.a)) === JSON.stringify(KEYS),
  'the answer keys are unchanged (' + (quiz.questions || []).map((q) => q.a).join('') + ')');
assert(new Set(KEYS).size === 4, 'and they use all four letters');

// ── 7. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 7. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
['worlds/2b-unit-13.json', 'worlds/unit13-cassette.json', 'worlds/unit13-desk-quiz.json']
  .forEach((rel) => assert(batch.has(rel), rel + ' publishes'));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit13_cassette: all passed');
