'use strict';
/**
 * tests/test_unit12_cassette.js — 2B Unit 12 (저는 좀 조용한 편이에요): ten recordings,
 * fifty-three placed lines, and sixty sentences cut out of them.
 *
 * The cassette machinery itself — the aligner, the shared player, the overlays, the upload
 * collector — is guarded by tests/test_unit11_cassette.js and is not repeated here. What this
 * suite is for is Unit 12's own content, and three things about it that differ:
 *
 *   1. **Every track was scripted from the first day.** Units 11, 13 and 14 all shipped their
 *      두 듣기 tracks listen-only and filled them in a release later, because the unit page
 *      prints only the comprehension questions. Unit 12's 듣기 지문 page (printed p.263) was
 *      read before the bank was written, so tracks 28 and 29 arrived with the rest. Section 2
 *      pins that: a `noteEn` reappearing anywhere is a track that lost its script.
 *
 *   2. **The 듣기 tracks read their own instruction aloud.** After the 2.69s announcement
 *      every track opens on, tracks 28 and 29 read out 잘 듣고 맞지 않는 것을 고르세요 before
 *      the dialogue starts, and that is not in the transcript. It is separated from the
 *      dialogue by a ~2.0s gap where every turn gap inside the dialogue is ~1.0s. Counting it
 *      as speech put the first two lines of track 28 at 3.5 and 3.0 syl/s against a track that
 *      runs at 5.2 — which is how it was found. The first line of each 듣기 track therefore
 *      starts *late*, and section 3 asserts that rather than treating it as a mistake.
 *
 *   3. **The 발음 point is 받침 'ㄻ', and it has two directions.** A consonant after the
 *      cluster leaves only [ㅁ] and tenses ㄱ/ㄷ/ㅅ/ㅈ — 닮고 [담꼬], 젊네요 [점네요]. A vowel
 *      after it keeps both — 닮았어요 [달마써요]. A set that drilled only the first half would
 *      teach a learner to write 담 for 닮 whenever they heard one, so section 4 requires both.
 *
 * Run: node tests/test_unit12_cassette.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const flat = (s) => nfc(s).replace(/\s+/g, '');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const world = readJson('worlds/2b-unit-12.json');
const c = readJson('worlds/unit12-cassette.json');
const ui = read('js/ui.js');
const tracks = c.tracks || [];
const items = (c.dictation && c.dictation.items) || [];
const lines = tracks.reduce((a, t) => a.concat((t.lines || []).map((l) => Object.assign({ track: t.n }, l))), []);

console.log('====================================================');
console.log('2B UNIT 12 · 저는 좀 조용한 편이에요');
console.log('====================================================');

// ── 1. The bank belongs to the unit ──────────────────────────────────────────
console.log('\n--- 1. The bank belongs to the unit ---');
assert(c.unit === '2b-unit-12', 'cassette content belongs to 2b-unit-12 (' + c.unit + ')');
assert(nfc(c.unitKo) === nfc('12과 저는 좀 조용한 편이에요'), 'and names the chapter it came out of');
assert(/tracks 22-31/.test(c.source || ''), 'the source line says which tracks these are');
assert(JSON.stringify(world.level.map.stations) === JSON.stringify(['desk', 'cassette']),
  'the Unit 12 farm has a cassette player for it to play on');
assert(!!c.titleKo && !!c.titleEn && !!c.closeKo, 'the overlay strings are present');

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(tracks.length === 10, 'ten tracks (' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '22,23,24,25,26,27,28,29,30,31', 'they are 22 through 31');
tracks.forEach((t) => assert(fs.existsSync(path.join(ROOT, t.src)), 'track ' + t.n + ' mp3 is on disk'));
assert(tracks.every((t) => /^audio\/book\/2b-u12-trk\d\d\.mp3$/.test(t.src)),
  'each is named for its unit and its track number');
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
  console.log('      (ffprobe not on this machine — duration checks skipped)');
}
// Nothing shipped listen-only. The 듣기 지문 page was read before the bank was written,
// which is the difference between this unit and the three before it.
assert(tracks.every((t) => Array.isArray(t.lines)), 'all ten tracks carry a script');
assert(tracks.every((t) => !t.noteEn), 'and none needs a note explaining why it has none');
assert(/듣기 지문/.test(c.listenOnly || ''), 'the bank says where the two 듣기 scripts came from');
const listening = tracks.filter((t) => t.n === 28 || t.n === 29);
assert(listening.length === 2 && listening.every((t) => t.lines.length >= 9),
  'the two 듣기 tracks carry their full transcript (' + listening.map((t) => t.lines.length).join(' and ') + ' lines)');
// Tracks 30 and 31 are the 발음 page. Their shape had to be worked out rather than assumed:
// the short spans between items are 일/이/삼/사 being read, and each sentence is said once.
const t31 = tracks.find((t) => t.n === 31);
assert(t31 && t31.lines.length === 5, '발음 연습 carries its five printed lines (' + (t31 ? t31.lines.length : 0) + ')');
assert(t31.lines[3].who === '4A' && t31.lines[4].who === '4B',
  'and its fourth item keeps its two speakers, the way the book prints it');
const t30 = tracks.find((t) => t.n === 30);
assert(t30 && t30.lines.length === 2, '발음 준비 carries its two (' + (t30 ? t30.lines.length : 0) + ')');

// ── 3. Every line is placed inside its track ─────────────────────────────────
console.log('\n--- 3. Every line is placed ---');
assert(lines.length === 53, '53 transcript lines in all (' + lines.length + ')');
const untimed = lines.filter((l) => !(l.at >= 0) || !(l.end > l.at)).map((l) => l.ko);
assert(untimed.length === 0, 'every one of them carries a forward span, so every line has a ▶'
  + (untimed.length ? ' — ' + untimed.slice(0, 3).join(' | ') : ''));
const overrun = tracks.filter((t) => (t.lines || []).some((l) => l.end > t.dur + 0.35)).map((t) => t.n);
assert(overrun.length === 0, 'and lies inside its own track' + (overrun.length ? ' — ' + overrun.join(',') : ''));
const crossed = [];
tracks.forEach((t) => (t.lines || []).forEach((l, i, a) => {
  if (i && l.at < a[i - 1].end) crossed.push(t.n + ':' + (i + 1));
}));
assert(crossed.length === 0, 'and follows the line above it' + (crossed.length ? ' — ' + crossed.join(', ') : ''));
// The two 듣기 tracks read their instruction aloud before the dialogue. Every other track
// starts within a second and a half of the announcement ending; these start after nine and
// eight seconds, and that gap is the instruction, not a mistake.
const firstAt = {};
tracks.forEach((t) => { firstAt[t.n] = t.lines[0].at; });
assert(firstAt[28] > 8 && firstAt[29] > 7,
  'the two 듣기 tracks start late, because the instruction is read out first ('
  + firstAt[28].toFixed(2) + 's and ' + firstAt[29].toFixed(2) + 's)');
assert([22, 23, 24, 25, 26, 27].every((n) => firstAt[n] < 4.0),
  'and every unit-page track starts straight after the announcement');
assert(firstAt[30] > 7 && firstAt[31] > 8,
  'the 발음 tracks start later still, because a number is read before each item');

// ── 4. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 4. The curated set ---');
assert(items.length === 60, '60 sentences (' + items.length + ')');
const ids = items.map((i) => i.id);
assert(new Set(ids).size === ids.length && ids.every((v, k) => v === k + 1), 'ids are unique and sequential');
assert(items.every((i) => i.ko && i.en && i.why && (i.tags || []).length && i.audio && i.audio.src),
  'every row has ko / en / why / tags / audio');
const band = items.filter((i) => syl(i.ko) < 5 || syl(i.ko) > 22).map((i) => i.id);
assert(band.length === 0, 'every sentence is 5-22 syllables' + (band.length ? ' — id ' + band.join(',') : ''));
const stated = items.filter((i) => syl(i.ko) !== i.syl).map((i) => i.id);
assert(stated.length === 0, 'each stated syllable count is true' + (stated.length ? ' — id ' + stated.join(',') : ''));
const scriptedNs = new Set(tracks.map((t) => t.n));
assert(items.every((i) => scriptedNs.has(i.track)), 'every sentence comes from a track that has a script');
assert(tracks.every((t) => items.some((i) => i.track === t.n)), 'and every track contributes at least one');
assert(new Set(items.map((i) => flat(i.ko))).size === items.length, 'no sentence is drilled twice');
// Every answer traces to a printed line: either it is one, or it names the turn it was cut
// out of and really is a part of it.
const printed = new Set(lines.map((l) => flat(l.ko)));
const notTraced = items.filter((i) => {
  if (printed.has(flat(i.ko))) return false;
  if (!i.splitFrom) return true;
  return !printed.has(flat(i.splitFrom)) || flat(i.splitFrom).indexOf(flat(i.ko)) < 0;
}).map((i) => i.id);
assert(notTraced.length === 0, 'every sentence traces to a printed line'
  + (notTraced.length ? ' — id ' + notTraced.join(',') : ''));
const splits = items.filter((i) => i.splitFrom).length;
assert(splits === 33, '33 rows are marked as split from a longer turn (' + splits + ')');
// A row that is the whole printed turn must not claim to be a part of one.
const overclaim = items.filter((i) => i.splitFrom && printed.has(flat(i.ko))
  && flat(i.splitFrom) === flat(i.ko)).map((i) => i.id);
assert(overclaim.length === 0, 'and none of them is the whole turn wearing a splitFrom'
  + (overclaim.length ? ' — id ' + overclaim.join(',') : ''));
const oneSentence = (s) => nfc(s).replace(/[.?!]\s*$/, '').search(/[.?!]\s/) < 0;
assert(items.every((i) => oneSentence(i.ko)), 'no clip holds more than one sentence');
assert(!items.some((i) => /\d/.test(i.ko)), 'no answer contains a figure read aloud');
const f = c.dictation.filter || {};
assert(Array.isArray(f.keep) && Array.isArray(f.drop) && !!f.splitAtClause,
  'the rule the set was curated by ships with it');
assert(f.keep.some((k) => /받침 'ㄻ'/.test(k)), "and the rule names this unit's own 발음 point");

// ── 5. It leans on 받침 'ㄻ', in both directions ──────────────────────────────
console.log("\n--- 5. It leans on 받침 'ㄻ', both ways ---");
const rieul = items.filter((i) => (i.tags || []).indexOf('받침 ㄻ') >= 0);
assert(rieul.length >= 7, "at least seven rows turn on 받침 'ㄻ' (" + rieul.length + ' of ' + items.length + ')');
// The rule is computable from the spelling, so it is checked from the spelling. A ㄻ before
// a consonant loses its ㄹ; a ㄻ before a vowel keeps it. Both have to be in the set or it
// teaches half a rule.
const CLUSTER = /[닮젊]/;
const before = (s) => {
  const t = flat(s);
  const out = { consonant: false, vowel: false };
  for (let i = 0; i + 1 < t.length; i++) {
    if (!CLUSTER.test(t[i])) continue;
    const next = t[i + 1];
    if (next < '가' || next > '힣') continue;
    const onset = Math.floor((next.charCodeAt(0) - 0xac00) / 588);
    if (onset === 11) out.vowel = true; else out.consonant = true;   // 11 = ㅇ, a bare vowel
  }
  return out;
};
const hasConsonant = items.filter((i) => before(i.ko).consonant);
const hasVowel = items.filter((i) => before(i.ko).vowel);
assert(hasConsonant.length >= 5, 'the losing direction is drilled — 닮고, 젊네요, 닮지, 젊게, 닮는 ('
  + hasConsonant.length + ' rows)');
assert(hasVowel.length >= 2, 'and so is the keeping one — 닮은, 닮았어요 (' + hasVowel.length + ' rows)');
// The showcase row has both in one sentence, which is why the book prints it last.
const both = items.filter((i) => before(i.ko).consonant && before(i.ko).vowel);
assert(both.length >= 1, 'and one row carries both at once (' + both.map((i) => i.id).join(',') + ')');
assert(both.some((i) => flat(i.ko) === flat('눈은 아빠를 닮고 코는 엄마를 닮았어요.')),
  "it is the book's own last 발음 연습 line");
// A note that does not say what the sound is has not explained anything — and it has to
// hold for every row carrying the word, not just for one of them somewhere in the set. The
// weaker version passed while a row was broken, because another row two ids later happened
// to carry the same word and the same note.
const SOUNDS = { '닮고': '담꼬', '젊네요': '점네요', '닮지': '담찌', '젊게': '점께', '닮는': '담는', '닮았': '달마써요', '닮은': '달믄' };
Object.entries(SOUNDS).forEach(([word, sound]) => {
  const carrying = items.filter((i) => flat(i.ko).indexOf(word) >= 0);
  const silent = carrying.filter((i) => nfc(i.why).indexOf(sound) < 0).map((i) => i.id);
  assert(carrying.length > 0 && silent.length === 0, word + ' is drilled by ' + carrying.length
    + ' row(s), and every one of their notes names [' + sound + ']'
    + (silent.length ? ' — silent on id ' + silent.join(',') : ''));
});
// The four grammar points get drilled too, or the tape is only a pronunciation exercise.
['A-아/어 보이다', 'N처럼', 'A-(으)ㄴ 편이다', 'V-는 편이다', 'A-게'].forEach((g) => {
  assert(items.some((i) => (i.tags || []).indexOf(g) >= 0), g + ' is drilled');
});

// ── 6. Each clip matches its text ────────────────────────────────────────────
console.log('\n--- 6. Each clip matches its text ---');
const missing = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(missing.length === 0, 'every clip is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u12-d\d\d\.mp3$/.test(i.audio.src)), 'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The pace bands, per track. These are the numbers the cut was verified at; a re-cut at the
// wrong silence threshold or the wrong turn gap lands outside them.
const BAND = { 22: [4.7, 5.9], 23: [4.5, 6.0], 24: [3.5, 6.6], 25: [4.1, 5.4], 26: [3.5, 5.8],
  27: [4.4, 6.1], 28: [3.7, 6.0], 29: [4.5, 7.0], 30: [3.1, 5.1], 31: [3.8, 5.4] };
const byTrack = {};
items.forEach((i) => {
  const rate = syl(i.ko) / i.audio.voiced;
  (byTrack[i.track] = byTrack[i.track] || []).push({ id: i.id, rate });
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
// And the bands have teeth. Unit 11's two-clip tracks were blind to a swap because their
// lines were close in length; every one of Unit 12's breaks, the two-clip ones included.
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => String(i.track) === String(n));
  if (list.length < 2) return;
  const [lo, hi] = BAND[n];
  const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
  const out = shifted.filter((r) => r < lo || r > hi).length;
  assert(out > 0, 'track ' + n + ' fails its band when the pairing is shifted by one ('
    + out + ' of ' + list.length + ' outside)');
});

// ── 7. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 7. Wiring ---');
assert(/isUnit12World\(\)\) return '\/worlds\/unit12-cassette\.json'/.test(ui),
  'the cassette resolves Unit 12 to its own bank');
assert(/OPEN_ON = \{[^}]*'2b-unit-12': 24/.test(ui), 'the listen screen opens on 말하기 1, track 24');
assert(read('js/i18n.js').indexOf("'worlds/unit12-cassette.json'") >= 0,
  'the bank is a translatable source, or it ships in English at 100% coverage');
assert(read('scripts/cassette_timings.js').indexOf('const UNITS = [10, 11, 12, 13, 14, 15]') >= 0,
  'the timings tool knows about Unit 12');
assert(read('admin/lib/content.js').indexOf("'unit12'") >= 0, 'and so does the admin panel');
assert(read('scripts/vocab_examples.js').indexOf('worlds/unit12-cassette.json') >= 0,
  'and the example corpus, which is where these sentences become vocabulary examples');

// ── 8. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 8. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
['worlds/2b-unit-12.json', 'worlds/unit12-cassette.json']
  .forEach((rel) => assert(batch.has(rel), rel + ' publishes'));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit12_cassette: all passed');
