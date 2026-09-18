'use strict';
/**
 * tests/test_unit17_cassette.js — 카세트 플레이어 for 17과 비행기를 놓칠 뻔했어요.
 *
 * Ten tracks, 72 to 81: two grammar boxes, 말하기 1, two more grammar boxes, 말하기 2, the
 * two 듣기 conversations and the two 발음 tracks. Every one of them has a printed script —
 * the unit pages carry eight of them and the 듣기 지문 at the back of the book (printed
 * p.265, running onto p.266) carries the other two — so no track in this unit ships as
 * listen-only.
 *
 * **Where the line timings come from.** They are not counted silences. `lines.js` holds the
 * transcript, `align.js` fits it to the recording under a gap-restricted DP, `spans.js` turns
 * that into at/end pairs with a fixed 0.12s edge pad, and section 3 checks the result rather
 * than the process: every line forward, inside its track, in order, and opening on a gap of at
 * least 0.98s — which is what a change of speaker sounds like on these recordings.
 *
 * **And how far they can be trusted.** The alignment was falsified rather than admired. A
 * verified copy of the bank (59 of 59 lines placed) had every span stripped out, and an
 * envelope correlator that had never seen the timings was run against the raw audio. It
 * placed 27 of the 59 lines from the sound alone, and all 27 agreed with the shipped span to
 * within 0.20s, with no disagreement anywhere. Unit 16's equivalent run placed 23 of 24. The
 * first attempt at this was invalid — the backup had been taken *after* a destructive
 * `--redo`, so the correlator was compared against its own output — and it was redone from a
 * copy checked at 59/59 before anything was stripped.
 *
 * **The 발음 point** is the other half of 유음화. Unit 16 taught a 받침 ㄹ pulling the ㄴ
 * after it across (설날 → [설랄]); 17과 teaches the ㄴ being pulled (한라산 → [할라산],
 * 연락 → [열락], 편리 → [펼리], 신림동 → [실림동]). Section 5 reads that off the spelling
 * rather than off the tags, because the spelling is what a learner can check.
 *
 * **Two tracks needed the cue filter.** 80 and 81 read their item numbers aloud — 일, 이,
 * 삼, 사 — and the aligner folded those into the line that followed until `cues: true` was
 * set on those two tracks alone.
 *
 * **And track 79 has a front door in it.** The scene breaks when the police arrive, and the
 * recording plays a buzzer and then the door. Both are sound, so silencedetect called them
 * speech, and the aligner spent them on 경찰서에서 나왔는데요 — which pushed that line and
 * the two after it one span early and left a dictation clip that played a doorbell. The 470
 * Hz band that catches a ringback did not catch this: the buzzer is a steady 151 Hz with its
 * energy in the fourth harmonic near 600, and at 470 it loses 9 dB, as much as a voice.
 *
 * What found it was the check at the end of section 3 — no line may take longer than 0.45
 * seconds a syllable — and what settled it was pitch. The two speakers here are a female
 * caller and a male officer, and estimating F0 frame by frame separates them cleanly (여 at
 * 193-225 Hz, 경찰 at 147-151). Thirteen of the fifteen lines matched their speaker; the two
 * that did not were exactly the two the pace check had flagged. The buzzer holds one pitch
 * for two seconds — an interquartile spread of 0.000 against 0.124 for the narrowest real
 * utterance — and the door thud loses 13.4 dB when everything outside 300-3400 Hz is stripped
 * away, against 3.5 for the quietest voice on the track. Both tests are now in align.js and
 * neither of them has to know what note the doorbell is.
 *
 * Run: node tests/test_unit17_cassette.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const bank = JSON.parse(read(path.join('worlds', 'unit17-cassette.json')));
const tracks = bank.tracks || [];
const items = (bank.dictation && bank.dictation.items) || [];
const ui = read(path.join('js', 'ui.js'));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 17 · 카세트 플레이어 — tracks 72-81');
console.log('====================================================');

// ── 1. The bank belongs to the unit ──────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(bank.unit === '2b-unit-17', 'the bank names its unit');
assert(bank.unitKo === '17과 비행기를 놓칠 뻔했어요', 'and the chapter it is the tape of');
assert(/Unit 17/.test(bank.source || '') && /72-81/.test(bank.source || ''),
  'and says which recordings: ' + bank.source);
assert(typeof bank.listenOnly === 'string' && /듣기 지문/.test(bank.listenOnly),
  'and where the two 듣기 scripts came from, since they are not on the unit pages');

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(tracks.length === 10, 'ten tracks (found ' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '72,73,74,75,76,77,78,79,80,81',
  'numbered 72 to 81 in the book’s order (' + tracks.map((t) => t.n).join(',') + ')');
const SECTIONS = ['문법과 표현 1-1', '문법과 표현 1-2', '말하기 1', '문법과 표현 2-1',
  '문법과 표현 2-2', '말하기 2', '듣기 1', '듣기 2', '발음 준비', '발음 연습'];
assert(tracks.map((t) => t.sec).join('|') === SECTIONS.join('|'),
  'each names the page it belongs to (' + tracks.map((t) => t.sec).join(', ') + ')');
const gone = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
assert(gone.length === 0, 'every mp3 is on disk' + (gone.length ? ' — ' + gone.join(', ') : ''));
assert(tracks.every((t) => /^audio\/book\/2b-u17-trk\d\d\.mp3$/.test(t.src)),
  'each is named for its track number');
assert(tracks.every((t) => t.dur > 5), 'and each records its own length');
assert(tracks.every((t) => Array.isArray(t.lines) && t.lines.length),
  'every track carries a script, so none of them needs a no-script note');
assert(tracks.every((t) => !t.noteEn), 'and none of them has one');

// ── 3. Every line is placed inside its track ─────────────────────────────────
console.log('\n--- 3. Every line is placed ---');
const lines = tracks.reduce((a, t) => a.concat(t.lines || []), []);
assert(lines.length === 59, '59 transcript lines in all (found ' + lines.length + ')');
const untimed = lines.filter((l) => !(l.at >= 0) || !(l.end > l.at)).map((l) => l.ko);
assert(untimed.length === 0, 'every line has a forward span, so every line has a ▶'
  + (untimed.length ? ' — ' + untimed.slice(0, 3).join(' | ') : ''));
const outside = [];
tracks.forEach((t) => (t.lines || []).forEach((l, i) => {
  if (l.end > t.dur + 0.05) outside.push(t.n + ':' + (i + 1));
}));
assert(outside.length === 0, 'and ends before its track does'
  + (outside.length ? ' — ' + outside.join(', ') : ''));
const backwards = [];
tracks.forEach((t) => (t.lines || []).forEach((l, i, a) => {
  if (i && l.at < a[i - 1].end) backwards.push(t.n + ':' + (i + 1));
}));
assert(backwards.length === 0, 'the lines of a track never overlap'
  + (backwards.length ? ' — ' + backwards.join(', ') : ''));
// The 0.12s the player pulls each start back by is added in before the comparison, so what
// is being asserted is the gap the learner actually hears.
const tooClose = [];
tracks.forEach((t) => (t.lines || []).forEach((l, i, a) => {
  if (i && (l.at + 0.12) - a[i - 1].end < 0.98) tooClose.push(t.n + ':' + (i + 1));
}));
assert(tooClose.length === 0, 'and every one opens on a gap of 0.98s or more, which is what a '
  + 'change of speaker sounds like' + (tooClose.length ? ' — ' + tooClose.join(', ') : ''));
// A sanity check on the other side: no line may be so long that it has swallowed its
// neighbour. The longest printed turn in the unit is 56 syllables.
const bloated = lines.filter((l) => (l.end - l.at) / Math.max(1, syl(l.ko)) > 0.45)
  .map((l) => l.ko.slice(0, 18));
assert(bloated.length === 0, 'and none of them is long enough to have eaten the next one'
  + (bloated.length ? ' — ' + bloated.join(' | ') : ''));

// ── 4. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 4. The dictation set ---');
assert(items.length === 67, '67 dictation sentences (found ' + items.length + ')');
const thin = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length).map((i) => i.id);
assert(thin.length === 0, 'every one carries English, a note and at least one tag'
  + (thin.length ? ' — id ' + thin.join(',') : ''));
assert(items.every((i) => String(i.why).length >= 80), 'and a note worth reading');
const badSyl = items.filter((i) => syl(i.ko) !== i.syl || i.syl < 5 || i.syl > 22).map((i) => i.id);
assert(badSyl.length === 0, 'each is 5-22 syllables and says so truthfully'
  + (badSyl.length ? ' — id ' + badSyl.join(',') : ''));
const scripted = new Set(tracks.map((t) => t.n));
assert(items.every((i) => scripted.has(i.track)), 'and comes from a track this bank holds');
// A row that is part of a printed turn has to name the turn and be a part of it.
const splits = items.filter((i) => i.splitFrom);
assert(splits.length > 0, splits.length + ' rows are parts of longer printed turns');
const orphan = splits.filter((i) => flat(i.splitFrom).indexOf(flat(i.ko)) < 0).map((i) => i.id);
assert(orphan.length === 0, 'and each really is a part of the turn it names'
  + (orphan.length ? ' — id ' + orphan.join(',') : ''));
const printed = new Set(lines.map((l) => flat(l.ko)));
const unprinted = splits.filter((i) => !printed.has(flat(i.splitFrom))).map((i) => i.id);
assert(unprinted.length === 0, 'and the turn it names is a line of its own track'
  + (unprinted.length ? ' — id ' + unprinted.join(',') : ''));
// This chapter says the same thing more than once, so equality alone is not enough: no row
// may contain another one either.
const flats = items.map((i) => flat(i.ko));
const dup = [];
flats.forEach((a, i) => flats.forEach((b, j) => {
  if (i !== j && (a === b ? i < j : a.indexOf(b) >= 0)) dup.push(items[j].id + ' inside ' + items[i].id);
}));
assert(dup.length === 0, 'no sentence is drilled twice, and none contains another'
  + (dup.length ? ' — ' + dup.slice(0, 4).join(', ') : ''));
// The filter is written down in the bank, so a later edit that changes what is kept has to
// change the reason as well.
const f = (bank.dictation && bank.dictation.filter) || {};
assert((f.keep || []).length >= 3 && (f.drop || []).length >= 3,
  'the bank writes down what it keeps and what it drops');
assert(/유음화/.test((f.keep || []).join(' ')), 'and names this unit’s 발음 point in the keep rule');
assert(typeof f.splitAtClause === 'string' && /79/.test(f.splitAtClause),
  'and says which turns were cut and where');

// ── 5. It leans on its own half of 유음화 ────────────────────────────────────
console.log('\n--- 5. 유음화, the ㄴ-before-ㄹ direction ---');
// Read off the spelling: a 받침 ㄴ (final index 4) in front of an onset ㄹ (index 5) is this
// chapter's rule; a 받침 ㄹ (8) before an onset ㄴ (2) is the one Unit 16 taught.
const seam = (s) => {
  const t = flat(s);
  const out = { forward: 0, backward: 0 };
  for (let i = 0; i + 1 < t.length; i++) {
    const a = t[i], b = t[i + 1];
    if (a < '가' || a > '힣' || b < '가' || b > '힣') continue;
    const fin = (a.charCodeAt(0) - 0xac00) % 28;
    const onset = Math.floor((b.charCodeAt(0) - 0xac00) / 588);
    if (fin === 8 && onset === 2) out.forward++;
    if (fin === 4 && onset === 5) out.backward++;
  }
  return out;
};
const backward = items.filter((i) => seam(i.ko).backward);
const forward = items.filter((i) => seam(i.ko).forward);
assert(backward.length >= 10, backward.length + ' of the 67 sentences carry a 받침 ㄴ in front of a ㄹ');
assert(forward.length >= 1, 'and ' + forward.length + ' still carry the direction Unit 16 taught');
// The four words the 발음 page prints, each of them somewhere in the set.
[['연락', /연락/], ['한라산', /한라산/], ['편리', /편리/], ['신림동', /신림동/]].forEach(([label, re]) => {
  assert(items.some((i) => re.test(i.ko)), 'the set contains ' + label);
});
// Both 발음 tracks are short and read item numbers aloud, which is why they alone are cut
// with the cue filter. What can be checked here is that their lines came out clean: two on
// track 80 and five on 81, none of them opening on a stray number.
const t80 = tracks.find((t) => t.n === 80).lines;
const t81 = tracks.find((t) => t.n === 81).lines;
assert(t80.length === 2 && t81.length === 5, 'the 발음 tracks hold 2 and 5 lines ('
  + t80.length + ', ' + t81.length + ')');
assert([...t80, ...t81].every((l) => !/^[일이삼사]\s/.test(l.ko)),
  'and no line of them opens on the item number that was read before it');

// ── 6. Each clip matches its text ────────────────────────────────────────────
console.log('\n--- 6. Each clip matches its text ---');
const missing = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(missing.length === 0, 'every clip is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u17-d\d\d\.mp3$/.test(i.audio.src)),
  'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The pace bands, per track. These are the numbers the cut was verified at; a re-cut at the
// wrong silence threshold or the wrong turn gap lands outside them. Track 79 has the widest
// band in the bank and the reason is arithmetic rather than delivery: 여기는 신림동 33번지
// 1층이에요 is twelve written syllables and sixteen spoken ones, because 33 and 1 are read
// 삼십삼 and 일. The stored rate counts hangul, the way every other unit's does, so that one
// row reads slow on paper and is checked separately below.
const BAND = { 72: [4.4, 5.0], 73: [4.2, 4.6], 74: [4.3, 5.8], 75: [3.6, 4.4], 76: [3.8, 4.7],
  77: [4.1, 6.8], 78: [4.1, 5.7], 79: [2.6, 6.2], 80: [4.1, 5.0], 81: [4.1, 5.1] };
const byTrack = {};
items.forEach((i) => {
  const rate = syl(i.ko) / i.audio.voiced;
  (byTrack[i.track] = byTrack[i.track] || []).push({ id: i.id, rate, it: i });
  assert(Math.abs(rate - i.audio.rate) < 0.06, 'id' + i.id + ' stores the pace it reads at');
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
// The rows with numerals in them, counted the way they are actually said. A Sino-Korean
// numeral is one written character and several spoken syllables, and once those are counted
// every one of them sits in the same 3.2-7.5 band as the rest of the bank.
const sino = (d) => {
  const v = parseInt(d, 10);
  if (!Number.isFinite(v)) return d.length;
  if (v === 0) return 1;
  let rest = v, out = 0;
  [1000, 100, 10].forEach((u) => {
    const k = Math.floor(rest / u);
    if (k) { out += (k > 1 ? 1 : 0) + 1; rest -= k * u; }
  });
  if (rest) out += 1;
  return out;
};
const numeric = items.filter((i) => /\d/.test(i.ko));
assert(numeric.length >= 2, numeric.length + ' sentences have numerals in them');
const slow = numeric.filter((i) => {
  const spoken = syl(i.ko) + (i.ko.match(/\d+/g) || []).reduce((a, d) => a + sino(d), 0);
  const rate = spoken / i.audio.voiced;
  return rate < 3.2 || rate > 7.5;
}).map((i) => i.id);
assert(slow.length === 0, 'and once the numerals are counted as spoken, each reads at a normal pace'
  + (slow.length ? ' — id ' + slow.join(',') : ''));
// And the bands have teeth. Shifting the text against the clips by one inside a track has to
// break it — on all ten tracks here, where Unit 16 could only manage eight of ten.
const blunt = [];
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => String(i.track) === String(n));
  if (list.length < 2) return;
  const [lo, hi] = BAND[n];
  const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
  if (!shifted.some((r) => r < lo || r > hi)) blunt.push(n);
});
assert(blunt.length === 0, 'every track fails its band when the pairing is shifted by one'
  + (blunt.length ? ' — except ' + blunt.join(', ') : ''));

// ── 7. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 7. Wiring ---');
assert(/isUnit17World\(\)\) return '\/worlds\/unit17-cassette\.json'/.test(ui),
  'the cassette resolves Unit 17 to its own bank');
assert(/OPEN_ON = \{[^}]*'2b-unit-17': 74/.test(ui), 'the listen screen opens on 말하기 1, track 74');
assert(read('js/i18n.js').indexOf("'worlds/unit17-cassette.json'") >= 0,
  'the bank is a translatable source, or it ships in English at 100% coverage');
// Membership rather than the whole literal — Unit 12's suite named every unit in this array
// and broke when Unit 16 was added to it.
const timingUnits = ((/const UNITS = \[([^\]]*)\]/.exec(read('scripts/cassette_timings.js')) || [])[1] || '')
  .split(',').map((s) => s.trim());
assert(timingUnits.indexOf('17') >= 0, 'the timings tool knows about Unit 17');
assert(read('admin/lib/content.js').indexOf("'unit17'") >= 0, 'and so does the admin panel');
assert(read('scripts/vocab_examples.js').indexOf('worlds/unit17-cassette.json') >= 0,
  'and the example corpus, which is where these sentences become vocabulary examples');

// ── 8. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 8. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
['worlds/2b-unit-17.json', 'worlds/unit17-cassette.json']
  .forEach((rel) => assert(batch.has(rel), rel + ' publishes'));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit17_cassette: all passed');
