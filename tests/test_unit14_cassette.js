'use strict';
/**
 * tests/test_unit14_cassette.js — 2B Unit 14 (예의를 지켜요): the whole-chapter word list,
 * the book's own recordings for tracks 42-51, and the dictation set cut from them.
 *
 * The cassette machinery — the aligner, the shared player, the overlays, the upload
 * collector — is guarded by tests/test_unit11_cassette.js and is not repeated here. What
 * this suite is for is Unit 14's own content, and the three things about it that differ
 * from Units 11 and 13:
 *
 *   1. It is NOT all-scripted, and it is the first unit that will not become so. The 듣기
 *      지문 pages at the back supplied tracks 48 and 49, the same way they did for Units 11
 *      and 13. Track 47 is the one left: the unit page draws that conversation and the 번역
 *      page gives it in English only, so there is nothing for a dictation answer to be
 *      checked against. Section 2 pins the count at nine scripted and one silent, so adding
 *      the last script is a deliberate edit here and forgetting to is not something that
 *      passes quietly.
 *
 *   2. Its dictation set is built on 경음화 after a ㄴ or ㅁ stem final — 신고 [신꼬],
 *      앉다가 [안따가], 감지 [감찌], 참지 [참찌] — because that is this chapter's own 발음
 *      page. Tracks 50 and 51 ARE that page and the book prints both spelling and
 *      pronunciation, which is the best dictation material in the chapter. Section 4
 *      checks the set really leans on it rather than being a bag of arbitrary sentences.
 *
 *   3. Its syllable cap is 24, not Unit 11's 22. Two 말하기 1 turns land at 22 and 24, and
 *      the alternative to a wider cap was splitting a whole sentence into phrase fragments
 *      that nobody would say on their own. The cap rides in dictation.filter and is
 *      checked here against the rows.
 *
 * Run: node tests/test_unit14_cassette.js
 */

const fs = require('fs');
const path = require('path');

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

const world = readJson('worlds/2b-unit-14.json');
const cass = readJson('worlds/unit14-cassette.json');
const ui = read('js/ui.js');
const econ = read('js/systems/economy.js');
const tracks = cass.tracks || [];
const items = (cass.dictation && cass.dictation.items) || [];

console.log('====================================================');
console.log('2B UNIT 14 · 예의를 지켜요 — WORDS, TAPE, DICTATION');
console.log('====================================================');

// ── 1. The word list is the whole chapter ────────────────────────────────────
// 54 of them are the 어휘 pages and that number is a fidelity claim. The rest are the
// words the other pages drill — grammar boxes, 말하기, 듣고 말하기, 읽고 쓰기, 과제, 발음 —
// which have no icons yet and so carry artPending and render as their hint emoji.
console.log('\n--- 1. The word list ---');
const words = (world.level && world.level.words) || [];
assert(words.length === 125, 'the chapter list is 125 words (found ' + words.length + ')');
const drawn = words.filter((w) => !w.artPending);
assert(drawn.length === 54, 'exactly 54 of them are the drawn 어휘 headwords (found ' + drawn.length + ')');
assert(words.length - drawn.length === 71, '71 are the later pages, still waiting on art');
const incomplete = words.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn || !w.hint).map((w) => w.ko || '?');
assert(incomplete.length === 0, 'every word has ko / en / category / categoryEn / hint'
  + (incomplete.length ? ' — ' + incomplete.slice(0, 6).join(', ') : ''));
const kos = words.map((w) => nfc(w.ko));
const dups = kos.filter((k, i) => kos.indexOf(k) !== i);
assert(dups.length === 0, 'no headword appears twice' + (dups.length ? ' — ' + dups.join(', ') : ''));
// The SRS schedule is keyed by the Korean alone, so a word in two farms is one review
// schedule shared between them with nothing on screen saying so.
['2b-unit-10', '2b-unit-11', '2b-unit-13'].forEach((other) => {
  const owned = new Set((readJson('worlds/' + other + '.json').level.words || []).map((w) => nfc(w.ko)));
  const shared = kos.filter((k) => owned.has(k));
  assert(shared.length === 0, 'shares no headword with ' + other + (shared.length ? ' — ' + shared.join(', ') : ''));
});
const cats = [...new Set(words.map((w) => w.category))];
const declared = ((world.notebook && world.notebook.groups) || []).map((g) => g.cat);
assert(cats.length === 7, 'seven vocab groups (' + cats.join(', ') + ')');
assert(cats.every((c) => declared.includes(c)) && declared.every((c) => cats.includes(c)),
  'and the notebook declares exactly those groups');

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(cass.unit === '2b-unit-14', 'the bank belongs to Unit 14');
assert(tracks.length === 10, 'all ten tracks are listed (found ' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '42,43,44,45,46,47,48,49,50,51', 'they are 42 through 51');
assert(tracks.every((t) => /^audio\/book\/2b-u14-trk\d\d\.mp3$/.test(t.src || '')), 'each names its own mp3');
const noFile = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
assert(noFile.length === 0, 'every track is on disk' + (noFile.length ? ' — missing ' + noFile.join(',') : ''));
assert(tracks.every((t) => typeof t.dur === 'number' && t.dur > 0), 'and each records its duration');
assert(tracks.every((t) => !!t.sec && !!t.secEn), 'each says which section of the book it is');
const scriptedTracks = tracks.filter((t) => Array.isArray(t.lines));
const silent = tracks.filter((t) => !Array.isArray(t.lines));
assert(scriptedTracks.length === 9, 'nine tracks carry a script (' + scriptedTracks.map((t) => t.n).join(',') + ')');
assert(silent.map((t) => t.n).join(',') === '47',
  'and the one without is 47 (' + silent.map((t) => t.n).join(',') + ')');
// The renderer prints noteEn where the script would go, because a blank pane reads as a bug.
assert(silent.every((t) => typeof t.noteEn === 'string' && t.noteEn.length > 20),
  'the scriptless track explains itself in noteEn');
assert(scriptedTracks.every((t) => !t.noteEn), 'and a scripted track does not carry that note');
const lineCount = scriptedTracks.reduce((s, t) => s + t.lines.length, 0);
assert(lineCount === 47, 'the nine scripts hold 47 printed lines (found ' + lineCount + ')');
// The 듣기 지문 pages are where 48 and 49 came from, and they are the long ones: 8 sentences of
// announcement and a 16-turn briefing against 2-8 for a unit-page track.
assert(scriptedTracks.find((t) => t.n === 48).lines.length === 8
  && scriptedTracks.find((t) => t.n === 49).lines.length === 16,
  'the two 듣기 transcripts are 8 and 16 lines');
const badLine = [];
scriptedTracks.forEach((t) => t.lines.forEach((l, k) => {
  if (typeof l.who !== 'string') badLine.push('trk' + t.n + ' line' + k + ' who');
  if (!l.ko || syl(l.ko) < 2) badLine.push('trk' + t.n + ' line' + k + ' ko');
}));
assert(badLine.length === 0, 'every printed line has a speaker slot and Korean'
  + (badLine.length ? ' — ' + badLine.slice(0, 5).join(', ') : ''));

// ── 3. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 3. The curated set ---');
assert(items.length === 32, '32 dictation sentences (found ' + items.length + ')');
const filter = (cass.dictation && cass.dictation.filter) || {};
assert(Array.isArray(filter.keep) && filter.keep.length >= 3
  && Array.isArray(filter.drop) && filter.drop.length >= 3,
  'the curation rule is stated in the content, not left implicit');
assert(/24/.test(filter.keep.join(' ')), 'and it names the 24-syllable cap it actually used');
const incompleteRow = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length
  || !i.audio || !i.audio.src).map((i) => i.id);
assert(incompleteRow.length === 0, 'every row carries text, gloss, reason, tags and a clip'
  + (incompleteRow.length ? ' — id ' + incompleteRow.join(',') : ''));
assert(items.every((i, k) => i.id === k + 1), 'the ids run 1..20 in order');
const wrongSyl = items.filter((i) => syl(i.ko) !== i.syl).map((i) => i.id);
assert(wrongSyl.length === 0, 'each row states its own syllable count truthfully'
  + (wrongSyl.length ? ' — id ' + wrongSyl.join(',') : ''));
const outOfCap = items.filter((i) => i.syl < 5 || i.syl > 24).map((i) => i.id + ':' + i.syl);
assert(outOfCap.length === 0, 'and every row is inside the declared 5-24 band'
  + (outOfCap.length ? ' — ' + outOfCap.join(', ') : ''));
const scripted = new Set(scriptedTracks.map((t) => t.n));
const fromSilent = items.filter((i) => !scripted.has(i.track)).map((i) => i.id);
assert(fromSilent.length === 0, 'no sentence is drawn from a listen-only track'
  + (fromSilent.length ? ' — id ' + fromSilent.join(',') : ''));
// A split row makes a claim about the turn it came out of, and the claim is checkable.
const splits = items.filter((i) => i.splitFrom);
assert(splits.length === 6, 'six rows are halves of a longer printed turn (found ' + splits.length + ')');
const liars = splits.filter((i) => nfc(i.splitFrom).indexOf(nfc(i.ko)) < 0).map((i) => i.id);
assert(liars.length === 0, 'and each really is a substring of the turn it names'
  + (liars.length ? ' — id ' + liars.join(',') : ''));
// Every dictation sentence has to be a line the book actually prints, or a part of one.
const printed = scriptedTracks.flatMap((t) => t.lines.map((l) => nfc(l.ko)));
const unprinted = items.filter((i) => !printed.some((p) => p.indexOf(nfc(i.ko)) >= 0)).map((i) => i.id);
assert(unprinted.length === 0, 'every sentence traces back to a printed line'
  + (unprinted.length ? ' — id ' + unprinted.join(',') : ''));

// ── 4. Built on this chapter's own 발음 rule ──────────────────────────────────
// 받침 [ㄴ, ㅁ] on a verb or adjective stem tenses a following ㄱ/ㄷ/ㅈ to [ㄲ, ㄸ, ㅉ]. The
// book prints 신고[신꼬], 앉지[안찌], 감다[감따]; nothing in the spelling shows it, which is
// exactly what makes it dictation rather than reading practice.
console.log('\n--- 4. Built on 경음화 after ㄴ / ㅁ ---');
// Matched on the exact tag. The set also carries tensing after ㄱ and after ㄷ — 시작됩니다,
// 듣거나, 것 같아 — and those are different environments; counting them here would let the
// chapter's own rule thin out while the number stayed put.
const RULE = '경음화 (ㄴ, ㅁ 뒤)';
const tense = items.filter((i) => (i.tags || []).includes(RULE));
assert(tense.length >= 6, 'at least six rows turn on the tensing rule (' + tense.length + ' of ' + items.length + ')');
assert(tense.every((i) => i.track === 50 || i.track === 51),
  'and they come from the two 발음 tracks, which are that page');
const loose = items.filter((i) => (i.tags || []).includes('경음화')).map((i) => i.id);
assert(loose.length === 0, 'no 경음화 tag is left without its environment'
  + (loose.length ? ' — id ' + loose.join(',') : ''));
// The 듣기 tracks are where the chapter's grammar turns up in continuous speech rather than in
// a two-line box, so the set should draw on them rather than treating them as filler.
const listening = items.filter((i) => i.track === 48 || i.track === 49);
assert(listening.length === 12, 'twelve rows come from the two 듣기 transcripts (' + listening.length + ')');
// Counted rather than guessed at. Five of the twelve drill a unit pattern — the dormitory
// briefing is mostly 해도 되다 / 하면 안 되다, which is why it was worth transcribing — and all
// twelve turn on a named sound change, which is what stops the rest being filler.
const SOUND = ['연음', '비음화', '유기음화', '자음군 단순화', 'ㅡ 탈락', 'ㅎ 탈락', 'ㅎ 약화'];
const listenPattern = listening.filter((i) => (i.tags || []).some((t) => /^(?:V-|A\/V-)/.test(t)));
const listenSound = listening.filter((i) => (i.tags || [])
  .some((t) => SOUND.includes(t) || t.indexOf('경음화') === 0));
assert(listenPattern.length === 5,
  'five of them drill a unit pattern (' + listenPattern.length + ')');
assert(listenSound.length === 12,
  'and every one turns on a named sound change (' + listenSound.length + ' of 12)');
const soundTags = new Set(items.flatMap((i) => i.tags || []));
['연음', '유기음화', '비음화'].forEach((t) => assert(soundTags.has(t),
  'the set also covers ' + t + ', so the rule is a decision and not a reflex'));
const grammar = ['V-(으)ㄴ 적(이) 있다[없다]', 'A/V-았을/었을 때', 'V-아도/어도 되다', 'V-(으)면 안 되다'];
grammar.forEach((g) => assert(items.some((i) => (i.tags || []).includes(g)),
  'and the unit grammar ' + g + ' is drilled'));
const whyShort = items.filter((i) => String(i.why).length < 40).map((i) => i.id);
assert(whyShort.length === 0, 'every row explains what it is testing, at length'
  + (whyShort.length ? ' — id ' + whyShort.join(',') : ''));

// ── 5. Each clip matches the text beside it ──────────────────────────────────
console.log('\n--- 5. Each clip matches its text ---');
const clipMiss = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(clipMiss.length === 0, 'every clip is on disk' + (clipMiss.length ? ' — ' + clipMiss.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u14-d\d\d\.mp3$/.test(i.audio.src)), 'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The other direction: nothing left on disk from an earlier cut. audio/book is shared with
// Unit 10 and with Unit 14's own 문형 연습 drills (2b-u14-p), so this counts only the two
// prefixes the cassette owns. tests/test_unit14_workbook.js counts 2b-u14-p.
const onDisk = fs.readdirSync(path.join(ROOT, 'audio', 'book'));
assert(onDisk.filter((f) => f.indexOf('2b-u14-trk') === 0).length === 10,
  'ten whole-track files on disk and no more');
assert(onDisk.filter((f) => f.indexOf('2b-u14-d') === 0).length === 32,
  'thirty-two dictation clips on disk and no more');
// The pace bands, per track. These are the numbers the cut was verified at; a re-cut at
// the wrong silence threshold or the wrong turn gap lands outside them.
const BAND = { 42: [4.3, 5.0], 43: [4.3, 5.2], 44: [4.0, 5.9], 45: [3.9, 4.6],
  46: [4.9, 6.2], 48: [4.7, 6.1], 49: [4.4, 6.5], 50: [4.0, 5.2], 51: [3.8, 5.3] };
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
// And the bands have teeth on every multi-clip track but one. Shift the pairing between
// text and clip by one and the pace should stop making sense — which is what says the
// span map was read correctly rather than merely consistently.
//
// Track 50 is the exception and cannot be made to fail this way: its two lines are 9 and 8
// syllables over 1.844s and 1.822s, so swapping them moves every rate by under 0.3 syl/s.
// Recorded rather than papered over — the pairing there rests on the span map, not on pace.
const BLIND = ['50'];
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => String(i.track) === String(n));
  if (list.length < 2) return;
  const [lo, hi] = BAND[n];
  const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
  const out = shifted.filter((r) => r < lo || r > hi).length;
  if (BLIND.includes(String(n))) {
    assert(out === 0, 'track ' + n + ' is known blind to a shift, and still is (lines within a syllable of each other)');
  } else {
    assert(out > 0, 'track ' + n + ' fails its band when the pairing is shifted by one ('
      + out + ' of ' + list.length + ' outside)');
  }
});

// ── 6. Wiring ───────────────────────────────────────────────────────────────
console.log('\n--- 6. Wiring ---');
assert(/isUnit14World\(\)\) return '\/worlds\/unit14-cassette\.json'/.test(ui),
  'the cassette resolves Unit 14 to its own bank');
assert(/isUnit14World\(\)\) return '\/worlds\/unit14-desk-quiz\.json'/.test(ui),
  'and so does the desk quiz — deskQuizUrl ends in a Unit 10 fallback, so a missing branch serves dish questions');
assert(/'2b-unit-14': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(econ),
  'the Unit 14 pack spawns the desk and the deck');
// Landing on a two-line grammar box is a thin thing to open on, so the listen screen starts
// at the unit's first real conversation. The track number is the book's.
assert(/OPEN_ON = \{[^}]*'2b-unit-14': 44/.test(ui), 'the listen screen opens on 말하기 1, track 44');

// ── 7. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 7. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
['worlds/2b-unit-14.json', 'worlds/unit14-cassette.json', 'worlds/unit14-desk-quiz.json']
  .forEach((rel) => assert(batch.has(rel), rel + ' publishes'));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit14_cassette: all passed');
