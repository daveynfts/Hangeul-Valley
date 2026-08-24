'use strict';
/**
 * tests/test_unit10_cassette.js — the radio in Unit 10, and the dictation cut from it.
 *
 * Same shape as tests/test_unit14_cassette.js, and for the same reason: the cut is a claim
 * about where one sentence ends and the next begins inside an mp3, and nothing on screen
 * shows whether it was made correctly. Two things make it checkable without ears.
 *
 *   1. Pace. A clip that holds the sentence beside it reads at a human rate for that text.
 *      Section 5 pins a band per track and then shifts the text-to-clip pairing by one to
 *      show the band has teeth — if a wrong pairing still passes, the band proves nothing.
 *
 *   2. Provenance. Every dictation sentence has to be a line the book prints, or part of
 *      one, and every split row names the turn it was cut out of. Section 3 checks both.
 *
 * This unit differs from 11, 13 and 14 in one way worth stating up front: its 발음 page is
 * 의문문의 억양 — question intonation — which leaves no trace in spelling at all. There is no
 * headline sound rule for the set to lean on, so it leans on the chapter's four grammar
 * patterns and on ordinary liaison and assimilation instead. Section 4 checks that the set
 * says so rather than quietly having nothing to teach.
 *
 * Run: node tests/test_unit10_cassette.js
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

const world = readJson('worlds/2b-unit-10.json');
const cass = readJson('worlds/unit10-cassette.json');
const ui = read('js/ui.js');
const econ = read('js/systems/economy.js');
const tracks = cass.tracks || [];
const items = (cass.dictation && cass.dictation.items) || [];

console.log('====================================================');
console.log('2B UNIT 10 · 카세트 플레이어 — 10과 뭐 먹을래?');
console.log('====================================================');

// ── 1. The word list is the whole chapter ────────────────────────────────────
console.log('\n--- 1. The chapter list ---');
const words = (world.level && world.level.words) || [];
assert(words.length === 118, 'the chapter list is 118 words (found ' + words.length + ')');
const drawn = words.filter((w) => !w.artPending);
assert(drawn.length === 80, 'exactly 80 of them carry drawn art (found ' + drawn.length + ')');
assert(words.length - drawn.length === 38, '38 are the later pages, still waiting on art');
const incomplete = words.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn || !w.hint)
  .map((w) => w.ko || '?');
assert(incomplete.length === 0, 'every word has ko / en / category / categoryEn / hint'
  + (incomplete.length ? ' — ' + incomplete.slice(0, 5).join(', ') : ''));
const kos = words.map((w) => nfc(w.ko));
const dups = kos.filter((k, i) => kos.indexOf(k) !== i);
assert(dups.length === 0, 'no headword appears twice' + (dups.length ? ' — ' + dups.join(', ') : ''));
const cats = [...new Set(words.map((w) => w.category))];
const declared = ((world.notebook && world.notebook.mindmap) || []).map((g) => g.cat);
assert(cats.length === 9, 'nine vocab groups (' + cats.join(', ') + ')');
assert(cats.every((c) => declared.includes(c)) && declared.every((c) => cats.includes(c)),
  'and the notebook mindmap names exactly those nine');

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(cass.unit === '2b-unit-10', 'the bank belongs to Unit 10');
assert(tracks.length === 10, 'all ten tracks are listed (found ' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '2,3,4,5,6,7,8,9,10,11', 'they are 02 through 11');
assert(tracks.every((t) => /^audio\/book\/2b-u10-trk\d\d\.mp3$/.test(t.src || '')), 'each names its own mp3');
const noFile = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
assert(noFile.length === 0, 'every track is on disk' + (noFile.length ? ' — missing ' + noFile.join(',') : ''));
assert(tracks.every((t) => typeof t.dur === 'number' && t.dur > 0), 'and each records its duration');
assert(tracks.every((t) => !!t.sec && !!t.secEn), 'each says which section of the book it is');
const scriptedTracks = tracks.filter((t) => Array.isArray(t.lines));
const silent = tracks.filter((t) => !Array.isArray(t.lines));
assert(scriptedTracks.length === 8, 'eight tracks carry a script (' + scriptedTracks.map((t) => t.n).join(',') + ')');
assert(silent.map((t) => t.n).join(',') === '8,9',
  'and the two without one are 08 and 09, the 듣기 pages whose transcript is at the back of the book');
assert(silent.every((t) => typeof t.noteEn === 'string' && t.noteEn.length > 20),
  'each listen-only track says why it has no script rather than going blank');
assert(scriptedTracks.every((t) => !t.noteEn), 'and a scripted track does not carry that note');
assert(typeof cass.listenOnly === 'string' && cass.listenOnly.length > 20,
  'the bank as a whole explains the two silent tracks');
const lineCount = scriptedTracks.reduce((s, t) => s + t.lines.length, 0);
assert(lineCount === 32, 'the eight scripts hold 32 printed lines (found ' + lineCount + ')');
// The two 말하기 pages are the long ones; the 문법과 표현 boxes are two lines each.
assert(scriptedTracks.find((t) => t.n === 4).lines.length === 8
  && scriptedTracks.find((t) => t.n === 7).lines.length === 9,
  'the two 말하기 dialogues are the long ones — 8 and 9 turns');
assert([2, 3, 5, 6, 10].every((n) => scriptedTracks.find((t) => t.n === n).lines.length === 2),
  'and the 문법과 표현 boxes and the 발음 준비 page are two lines each');
const badLine = [];
scriptedTracks.forEach((t) => (t.lines || []).forEach((l, k) => {
  if (!l.ko || !String(l.ko).trim()) badLine.push(t.n + ':' + (k + 1) + ' no Korean');
  if (!l.who || !String(l.who).trim()) badLine.push(t.n + ':' + (k + 1) + ' no speaker');
}));
assert(badLine.length === 0, 'every printed line has a speaker slot and Korean'
  + (badLine.length ? ' — ' + badLine.slice(0, 4).join(', ') : ''));

// ── 3. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 3. The curated set ---');
assert(items.length === 27, '27 dictation sentences (found ' + items.length + ')');
const filter = (cass.dictation && cass.dictation.filter) || {};
assert(Array.isArray(filter.keep) && filter.keep.length >= 3
  && Array.isArray(filter.drop) && filter.drop.length >= 3,
  'the bank writes down what it kept and what it threw away');
assert(/24/.test(filter.keep.join(' ')), 'and it names the 24-syllable cap it actually used');
// The drop list is where the honesty lives: two of the losses are unit headwords, and
// saying so beats letting the count imply full coverage.
assert(/입에 맞/.test(filter.drop.join(' ')),
  'the drop list names 입에 맞아 as a loss rather than passing over it');
assert(/2인분|numeral/.test(filter.drop.join(' ')),
  'and it explains why the line with a spoken numeral could not be measured');
const incompleteRow = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length
  || !i.audio || !i.audio.src).map((i) => i.id);
assert(incompleteRow.length === 0, 'every row carries text, gloss, reason, tags and a clip'
  + (incompleteRow.length ? ' — id ' + incompleteRow.join(',') : ''));
assert(items.every((i, k) => i.id === k + 1), 'the ids run 1..27 in order');
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
assert(splits.length === 9, 'nine rows are pieces of a longer printed turn (found ' + splits.length + ')');
const liars = splits.filter((i) => nfc(i.splitFrom).indexOf(nfc(i.ko)) < 0).map((i) => i.id);
assert(liars.length === 0, 'and each really is a substring of the turn it names'
  + (liars.length ? ' — id ' + liars.join(',') : ''));
// Every dictation sentence has to be a line the book actually prints, or a part of one.
const printed = scriptedTracks.flatMap((t) => t.lines.map((l) => nfc(l.ko)));
const unprinted = items.filter((i) => !printed.some((p) => p.indexOf(nfc(i.ko)) >= 0)).map((i) => i.id);
assert(unprinted.length === 0, 'every sentence traces back to a printed line'
  + (unprinted.length ? ' — id ' + unprinted.join(',') : ''));
// And a row must not be another row's prefix, or the same keystrokes count twice.
const texts = items.map((i) => nfc(i.ko));
const nested = items.filter((i, k) => texts.some((t, j) => j !== k && t.indexOf(texts[k]) >= 0))
  .map((i) => i.id);
assert(nested.length === 0, 'no sentence is contained in another'
  + (nested.length ? ' — id ' + nested.join(',') : ''));

// ── 4. What this set can teach, given its 발음 page ──────────────────────────
// Units 11, 13 and 14 each had a sound rule to build on — 연음, 유기음화, 경음화 after ㄴ/ㅁ —
// and their dictation sets could be counted against it. This chapter's 발음 page is question
// intonation, and no rise or fall changes a letter you write. That is a real limit, so the
// bank states it and the set is measured against what it can teach instead.
console.log('\n--- 4. Grammar and liaison, because intonation leaves no trace ---');
const note = String((cass.dictation && cass.dictation.note) || '');
assert(note.length > 60 && /억양|intonation/.test(note),
  'the bank says outright that this unit has no spelling-visible 발음 rule');
const tags = new Set(items.flatMap((i) => i.tags || []));
const GRAMMAR = ['N 중에(서)', '반말', 'V-(으)ㄹ래요', 'A-(으)ㄴ데, V-는데'];
GRAMMAR.forEach((g) => assert(tags.has(g), 'the unit grammar ' + g + ' is drilled'));
const grammarRows = items.filter((i) => (i.tags || []).some((t) => GRAMMAR.includes(t) || t === 'V-는데'));
assert(grammarRows.length >= 9,
  'at least nine rows turn on one of the four patterns (' + grammarRows.length + ' of ' + items.length + ')');
const SOUND = ['연음', '비음화', '유기음화', '자음군 단순화', 'ㅎ 탈락', 'ㅡ 탈락', 'ㅂ 불규칙'];
const soundRows = items.filter((i) => (i.tags || [])
  .some((t) => SOUND.includes(t) || t.indexOf('경음화') === 0));
assert(soundRows.length >= 12,
  'and at least twelve turn on a sound change you cannot hear in the spelling ('
  + soundRows.length + ')');
['연음', '비음화', '자음군 단순화'].forEach((t) => assert(tags.has(t),
  'the set covers ' + t + ', so the choice of sentence was a decision and not a reflex'));
// 경음화 turns up here in two environments the earlier units did not drill, and an untagged
// 경음화 would let those two blur into one.
const loose = items.filter((i) => (i.tags || []).includes('경음화')).map((i) => i.id);
assert(loose.length === 0, 'no 경음화 tag is left without its environment'
  + (loose.length ? ' — id ' + loose.join(',') : ''));
assert(tags.has('경음화 (관형형 ㄹ 뒤)') && tags.has('경음화 (받침 ㄱ 뒤)'),
  'and both of this chapter’s tensing environments are named');
// The two 말하기 dialogues are where the grammar turns up in continuous speech rather than in
// a two-line box, so the set should draw on them rather than treating them as filler.
const speaking = items.filter((i) => i.track === 4 || i.track === 7);
assert(speaking.length === 14, 'fourteen rows come from the two 말하기 dialogues (' + speaking.length + ')');
const whyShort = items.filter((i) => String(i.why).length < 40).map((i) => i.id);
assert(whyShort.length === 0, 'every row explains what it is testing, at length'
  + (whyShort.length ? ' — id ' + whyShort.join(',') : ''));

// ── 5. Each clip matches the text beside it ──────────────────────────────────
console.log('\n--- 5. Each clip matches its text ---');
const clipMiss = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(clipMiss.length === 0, 'every clip is on disk' + (clipMiss.length ? ' — ' + clipMiss.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u10-d\d\d\.mp3$/.test(i.audio.src)), 'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The other direction: nothing left on disk from an earlier cut. audio/book is shared with
// three other units and with Unit 10's own 문형 연습 drills, so this counts only the two
// prefixes the cassette owns.
const onDisk = fs.readdirSync(path.join(ROOT, 'audio', 'book'));
assert(onDisk.filter((f) => f.indexOf('2b-u10-trk') === 0).length === 10,
  'ten whole-track files on disk and no more');
assert(onDisk.filter((f) => /^2b-u10-d\d\d\.mp3$/.test(f)).length === 27,
  'twenty-seven dictation clips on disk and no more');
// The pace bands, per track. These are the numbers the cut was verified at; a re-cut at the
// wrong silence threshold or the wrong turn gap lands outside them.
const BAND = { 2: [4.2, 4.8], 3: [4.7, 5.0], 4: [4.5, 6.1], 5: [4.2, 4.3],
  6: [4.8, 5.1], 7: [4.2, 5.7], 10: [4.3, 4.4], 11: [4.5, 5.5] };
const byTrack = {};
items.forEach((i) => {
  const rate = syl(i.ko) / i.audio.voiced;
  (byTrack[i.track] = byTrack[i.track] || []).push({ id: i.id, rate });
  assert(Math.abs(rate - i.audio.rate) < 0.05, 'id' + i.id + ' stores the pace it reads at');
});
Object.keys(byTrack).forEach((n) => {
  const band = BAND[n];
  assert(!!band, 'track ' + n + ' has a declared pace band');
  if (!band) return;
  const rs = byTrack[n].map((r) => r.rate);
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const out = byTrack[n].filter((r) => r.rate < band[0] || r.rate > band[1]);
  assert(out.length === 0, 'track ' + n + ': all ' + rs.length + ' clips read at a human pace for their text ('
    + mean.toFixed(2) + ' syl/s, band ' + band[0] + '-' + band[1] + ')'
    + (out.length ? ' — id ' + out.map((r) => r.id).join(',') : ''));
});
// And the bands have teeth. Shift the pairing between text and clip by one and the pace
// should stop making sense — which is what says the span map was read correctly rather than
// merely consistently. Tracks 05 and 10 contribute one clip each, so there is nothing to
// shift; that is recorded rather than papered over.
const SINGLE = ['5', '10'];
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => String(i.track) === String(n));
  if (SINGLE.includes(String(n))) {
    assert(list.length === 1, 'track ' + n + ' has a single clip, so the pairing rests on the span map alone');
    return;
  }
  const band = BAND[n];
  const wrong = list.filter((it, k) => {
    const other = list[(k + 1) % list.length];
    const rate = syl(it.ko) / other.audio.voiced;
    return rate < band[0] || rate > band[1];
  });
  assert(wrong.length > 0, 'track ' + n + ': shifting the text-to-clip pairing by one breaks the band for '
    + wrong.length + ' of ' + list.length + ' clips, so the band is a real check');
});

// ── 6. The radio is reachable and opens on this chapter ──────────────────────
console.log('\n--- 6. Wiring ---');
assert(/isUnit10World\(\)\) return '\/worlds\/unit10-cassette\.json'/.test(ui),
  'cassetteUrl resolves Unit 10 to this bank');
assert(/'2b-unit-10': 4\b/.test(ui), 'and the pane opens on track 04, the first 말하기 page');
const stations = (world.level && world.level.map && world.level.map.stations) || [];
assert(stations.includes('cassette'), 'the world JSON puts a cassette station on the farm');
// currentWorldPack() prefers the world JSON over economy.js, so the two must agree — a
// radio listed in only one of them is a radio that does not appear.
const packLine = /'2b-unit-10':\s*\{[^}]*stations:\s*\[([^\]]*)\]/.exec(econ);
assert(!!packLine, 'economy.js declares a station list for Unit 10');
if (packLine) {
  const fromEcon = packLine[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  assert(fromEcon.join(',') === stations.join(','),
    'and it is the same list the world JSON carries (' + fromEcon.join(', ') + ')');
}

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit10_cassette: all passed');
