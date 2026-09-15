'use strict';
/**
 * tests/test_unit16_cassette.js — 2B Unit 16 (설날에는 밥 대신 떡국을 먹어요): ten recordings,
 * fifty-seven placed lines, and sixty-five sentences cut out of them.
 *
 * The cassette machinery itself — the aligner, the shared player, the overlays, the upload
 * collector — is guarded by tests/test_unit11_cassette.js and is not repeated here. What this
 * suite is for is Unit 16's own content, and four things about it that differ:
 *
 *   1. **A line boundary is a recorded pause, not a guess at pace.** The gaps across all ten
 *      tracks come out in two clumps with nothing between them: 61 of them between 0.30s and
 *      0.96s, which are pauses inside one speaker's turn, and 65 at 1.00s or more, which are
 *      the editor's turn gap. So every line here begins at least 0.98s after the one before
 *      it once the 0.12s play pad is added back, and section 3 checks all 57. It matters:
 *      on track 63 the pace objective on its own wanted to end A's turn with the 네 that
 *      opens B's, and the gap — 1.01s in front of it, 0.66s behind — is what settles it.
 *
 *   2. **Track 69 is a phone call and the recording rings.** Two spans after the scene break
 *      are a 440/480 Hz ringback, not a voice, and silencedetect cannot tell the difference.
 *      Counting them as speech put 여보세요? 지연 씨? 저 나나인데요. 혹시 이번 연휴에 고향에
 *      내려가요? at 3.08 syl/s against a track running at 5.1. Filtering everything outside a
 *      narrow band around 470 Hz costs a tone 0.3 dB and a voice at least 3.5, so the two are
 *      separable by measurement; section 3 pins the line where that puts it.
 *
 *   3. **The 발음 point is 유음화, and it has two directions.** A ㄴ next to a ㄹ is read [ㄹ]
 *      whichever side it is on — 설날 [설랄] and 일 년 [일련] with the ㄹ in front, 연락 [열락]
 *      with the ㄹ behind. Both are computable from the spelling, so section 5 finds them
 *      from the spelling rather than from the tags, and says out loud that the backward
 *      direction is drilled exactly once, because 연락 is the only ㄴ+ㄹ word anyone says on
 *      any of the ten tracks.
 *
 *   4. **One printed sentence is dropped rather than trimmed.** 부모님께서 맛있는 음식도 많이
 *      해 놓고 기다리고 계실 겁니다 is 25 syllables, over the filter's own ceiling, and the
 *      narrator reads it in one unbroken span — so there is nowhere to cut it that the
 *      recording agrees with. Section 4 asserts it is absent, so that its absence is a
 *      decision on the record rather than an oversight.
 *
 * Run: node tests/test_unit16_cassette.js
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
const EDGE_PAD = 0.12;   // what scripts/cassette_timings.js pulls each start back by

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const world = readJson('worlds/2b-unit-16.json');
const c = readJson('worlds/unit16-cassette.json');
const ui = read('js/ui.js');
const tracks = c.tracks || [];
const items = (c.dictation && c.dictation.items) || [];
const lines = tracks.reduce((a, t) => a.concat((t.lines || []).map((l) => Object.assign({ track: t.n }, l))), []);

console.log('====================================================');
console.log('2B UNIT 16 · 설날에는 밥 대신 떡국을 먹어요');
console.log('====================================================');

// ── 1. The bank belongs to the unit ──────────────────────────────────────────
console.log('\n--- 1. The bank belongs to the unit ---');
assert(c.unit === '2b-unit-16', 'cassette content belongs to 2b-unit-16 (' + c.unit + ')');
assert(nfc(c.unitKo) === nfc('16과 설날에는 밥 대신 떡국을 먹어요'), 'and names the chapter it came out of');
assert(/tracks 62-71/.test(c.source || ''), 'the source line says which tracks these are');
assert(JSON.stringify(world.level.map.stations) === JSON.stringify(['desk', 'cassette']),
  'the Unit 16 farm has a cassette player for it to play on');
assert(!!c.titleKo && !!c.titleEn && !!c.closeKo, 'the overlay strings are present');

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(tracks.length === 10, 'ten tracks (' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '62,63,64,65,66,67,68,69,70,71', 'they are 62 through 71');
tracks.forEach((t) => assert(fs.existsSync(path.join(ROOT, t.src)), 'track ' + t.n + ' mp3 is on disk'));
assert(tracks.every((t) => /^audio\/book\/2b-u16-trk\d\d\.mp3$/.test(t.src)),
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
// Nothing shipped listen-only. The 듣기 지문 page was read before the bank was written.
assert(tracks.every((t) => Array.isArray(t.lines)), 'all ten tracks carry a script');
assert(tracks.every((t) => !t.noteEn), 'and none needs a note explaining why it has none');
assert(/듣기 지문/.test(c.listenOnly || ''), 'the bank says where the two 듣기 scripts came from');
const listening = tracks.filter((t) => t.n === 68 || t.n === 69);
assert(listening.length === 2 && listening.every((t) => t.lines.length >= 10),
  'the two 듣기 tracks carry their full transcript (' + listening.map((t) => t.lines.length).join(' and ') + ' lines)');
// Tracks 70 and 71 are the 발음 page. Their shape had to be worked out rather than assumed:
// the short spans between items are 일/이/삼/사 being read, and each sentence is said once.
const t71 = tracks.find((t) => t.n === 71);
assert(t71 && t71.lines.length === 5, '발음 연습 carries its five printed lines (' + (t71 ? t71.lines.length : 0) + ')');
assert(t71.lines[3].who === '4A' && t71.lines[4].who === '4B',
  'and its fourth item keeps its two speakers, the way the book prints it');
const t70 = tracks.find((t) => t.n === 70);
assert(t70 && t70.lines.length === 2, '발음 준비 carries its two (' + (t70 ? t70.lines.length : 0) + ')');

// ── 3. Every line is placed inside its track ─────────────────────────────────
console.log('\n--- 3. Every line is placed ---');
assert(lines.length === 57, '57 transcript lines in all (' + lines.length + ')');
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
// The turn gap. Every boundary in this bank is a pause of at least 0.98s in the recording,
// which is the floor of the editor's flat 1.0s turn gap and above the 0.96s ceiling of every
// pause inside a turn. A line placed by counting spans instead would land on a short one.
const tooClose = [];
tracks.forEach((t) => (t.lines || []).forEach((l, i, a) => {
  if (i && (l.at + EDGE_PAD) - a[i - 1].end < 0.98) {
    tooClose.push(t.n + ':' + (i + 1) + ' (' + ((l.at + EDGE_PAD) - a[i - 1].end).toFixed(2) + 's)');
  }
}));
assert(tooClose.length === 0,
  'every line opens on a recorded gap of 0.98s or more, which is what a new speaker sounds like'
  + (tooClose.length ? ' — ' + tooClose.join(', ') : ''));
// The two 듣기 tracks read their instruction aloud before the dialogue, and the two 발음
// tracks read a number before each item. Every other track starts straight after the
// announcement, so a late first line is evidence of the shape rather than of a mistake.
const firstAt = {};
tracks.forEach((t) => { firstAt[t.n] = t.lines[0].at; });
assert(firstAt[68] > 8 && firstAt[69] > 7,
  'the two 듣기 tracks start late, because the instruction is read out first ('
  + firstAt[68].toFixed(2) + 's and ' + firstAt[69].toFixed(2) + 's)');
assert([62, 63, 64, 65, 66, 67].every((n) => firstAt[n] < 4.0),
  'and every unit-page track starts straight after the announcement');
assert(firstAt[70] > 7 && firstAt[71] > 8,
  'the 발음 tracks start later still, because a number is read before each item');
// The telephone. 여보세요 is the eighth line of track 69, and it starts at 58.32 rather than
// at 53.37 because the two spans in between are the ringback. Pinned, because the difference
// between the two is the whole reason that line reads at a human pace.
const t69 = tracks.find((t) => t.n === 69);
const hello = t69.lines[7];
assert(flat(hello.ko).indexOf(flat('여보세요')) === 0, 'track 69 line 8 is the one that opens with 여보세요');
assert(hello.at > 57 && hello.at < 59,
  'and it starts after the ringback rather than on it (' + hello.at.toFixed(2) + 's, not ~53.4s)');
assert(syl(hello.ko) / (hello.end - hello.at) > 3.2,
  'which is what keeps it at a human pace ('
  + (syl(hello.ko) / (hello.end - hello.at)).toFixed(2) + ' syl/s over its span)');

// ── 4. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 4. The curated set ---');
assert(items.length === 65, '65 sentences (' + items.length + ')');
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
// Equality is not enough for this unit. 설날에 먹는 특별한 음식이 있어요? is read on track 63
// and again on track 64, and 고양이를 맡길 곳이 없어서요 is said twice by the same speaker
// inside track 69 — so a row may not contain another row either.
const flats = items.map((i) => flat(i.ko));
const contained = [];
flats.forEach((a, i) => flats.forEach((b, j) => {
  if (i !== j && (a === b ? i < j : a.indexOf(b) >= 0)) contained.push(items[j].id + ' inside ' + items[i].id);
}));
assert(contained.length === 0, 'no sentence is drilled twice, and none contains another'
  + (contained.length ? ' — ' + contained.slice(0, 4).join(', ') : ''));
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
assert(splits === 25, '25 rows are marked as split from a longer turn (' + splits + ')');
const overclaim = items.filter((i) => i.splitFrom && printed.has(flat(i.ko))
  && flat(i.splitFrom) === flat(i.ko)).map((i) => i.id);
assert(overclaim.length === 0, 'and none of them is the whole turn wearing a splitFrom'
  + (overclaim.length ? ' — id ' + overclaim.join(',') : ''));
// Unit 12 required one sentence per clip. Unit 16 cannot: twelve of the printed turns open
// on a two- or three-syllable opener that is part of the same breath — 걱정하지 마세요. 제가
// 예매해 놓았어요, 잘됐다. 그럼 내가 장을 미리 봐 놓을게 — and splitting those would leave a
// four-syllable fragment under the filter's own floor. The ceiling is what holds instead:
// a row may be a short run of sentences, never a paragraph.
const oneSentence = (s) => nfc(s).replace(/[.?!]\s*$/, '').search(/[.?!]\s/) < 0;
const multi = items.filter((i) => !oneSentence(i.ko));
assert(multi.length === 12, 'twelve rows hold more than one sentence (' + multi.length + ')');
assert(multi.every((i) => syl(i.ko) <= 22),
  'and every one of them is still inside the 22-syllable ceiling (longest '
  + Math.max(...multi.map((i) => syl(i.ko))) + ')');
assert(multi.every((i) => nfc(i.ko).split(/[.?!]\s/).length <= 3),
  'and none of them runs past three sentences');
assert(!items.some((i) => /\d/.test(i.ko)), 'no answer contains a figure read aloud');
// The sentence the recording would not let anyone cut. It is 25 syllables, over the ceiling,
// and read in one unbroken span — so it is out, and out on purpose.
const UNCUTTABLE = '부모님께서 맛있는 음식도 많이 해 놓고 기다리고 계실 겁니다';
assert(printed.size > 0 && [...printed].some((p) => p.indexOf(flat(UNCUTTABLE)) >= 0),
  'the 25-syllable sentence is still in the transcript, where the learner can read it');
assert(!items.some((i) => flat(i.ko).indexOf(flat(UNCUTTABLE)) >= 0),
  'but no dictation row holds it, because the recording gives nowhere to cut it');
const f = c.dictation.filter || {};
assert(Array.isArray(f.keep) && Array.isArray(f.drop) && !!f.splitAtClause,
  'the rule the set was curated by ships with it');
assert(f.keep.some((k) => /유음화/.test(k)), "and the rule names this unit's own 발음 point");
assert(/unbroken span/.test(f.splitAtClause) && nfc(f.splitAtClause).indexOf(nfc('부모님께서')) >= 0,
  'and says which sentence was left out rather than trimmed, and why');

// ── 5. It leans on 유음화, in both directions ────────────────────────────────
console.log('\n--- 5. It leans on 유음화, both ways ---');
const tagged = items.filter((i) => (i.tags || []).indexOf('유음화') >= 0);
assert(tagged.length >= 12, 'at least twelve rows are tagged 유음화 (' + tagged.length + ' of ' + items.length + ')');
// The rule is computable from the spelling, so it is checked from the spelling rather than
// from the tags. A ㄹ in front of a ㄴ pulls it to [ㄹ]; a ㄹ behind a ㄴ does the same thing
// from the other side. Both have to be in the set or it teaches half a rule.
const seam = (s) => {
  const t = flat(s);
  const out = { forward: [], backward: [] };
  for (let i = 0; i + 1 < t.length; i++) {
    const a = t[i], b = t[i + 1];
    if (a < '가' || a > '힣' || b < '가' || b > '힣') continue;
    const fin = (a.charCodeAt(0) - 0xac00) % 28;
    const onset = Math.floor((b.charCodeAt(0) - 0xac00) / 588);
    if (fin === 8 && onset === 2) out.forward.push(a + b);    // 8 = 받침 ㄹ, 2 = onset ㄴ
    if (fin === 4 && onset === 5) out.backward.push(a + b);   // 4 = 받침 ㄴ, 5 = onset ㄹ
  }
  return out;
};
const forward = items.filter((i) => seam(i.ko).forward.length);
const backward = items.filter((i) => seam(i.ko).backward.length);
assert(forward.length >= 10, 'the ㄹ-then-ㄴ direction is drilled — 설날, 일 년, 사물놀이, 잘 나왔네요, 갈 날만 ('
  + forward.length + ' rows)');
assert(backward.length >= 1, 'and so is the ㄴ-then-ㄹ one — 연락 (' + backward.length + ' row)');
// Said out loud, because it is a limit of the material and not of the curation: 연락 is the
// only ㄴ+ㄹ word anyone says on any of the ten tracks. If another one ever arrives, this
// line fails and the note above it gets rewritten.
assert(backward.length === 1 && flat(backward[0].ko).indexOf('연락') >= 0,
  'the backward direction has exactly one sentence available on the whole tape, and this is it');
// A note that does not say what the sound is has not explained anything — and it has to hold
// for every row carrying the word, not just for one of them somewhere in the set.
const SOUNDS = { '설날': '설랄', '일년': '일련', '연락': '열락', '서울역': '서울력',
  '사물놀이': '사물로리', '잘나왔': '잘라완네요', '갈날만': '갈랄만' };
Object.entries(SOUNDS).forEach(([word, sound]) => {
  const carrying = items.filter((i) => flat(i.ko).indexOf(word) >= 0);
  const silent = carrying.filter((i) => nfc(i.why).indexOf(sound) < 0).map((i) => i.id);
  assert(carrying.length > 0 && silent.length === 0, word + ' is drilled by ' + carrying.length
    + ' row(s), and every one of their notes names [' + sound + ']'
    + (silent.length ? ' — silent on id ' + silent.join(',') : ''));
});
// The four grammar points get drilled too, or the tape is only a pronunciation exercise.
['V-아/어 놓다', 'N 대신', 'V-(으)ㄹ까 하다', 'A/V-(으)ㄹ 테니까'].forEach((g) => {
  assert(items.some((i) => (i.tags || []).indexOf(g) >= 0), g + ' is drilled');
});

// ── 6. Each clip matches its text ────────────────────────────────────────────
console.log('\n--- 6. Each clip matches its text ---');
const missing = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(missing.length === 0, 'every clip is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u16-d\d\d\.mp3$/.test(i.audio.src)), 'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The pace bands, per track. These are the numbers the cut was verified at; a re-cut at the
// wrong silence threshold or the wrong turn gap lands outside them.
const BAND = { 62: [4.3, 5.9], 63: [3.7, 5.1], 64: [3.8, 5.4], 65: [4.4, 5.3], 66: [4.3, 5.5],
  67: [3.7, 6.0], 68: [4.4, 6.4], 69: [3.9, 6.0], 70: [3.9, 4.8], 71: [3.3, 4.8] };
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
// And the bands have teeth — on eight of the ten tracks. They cannot on 63 and 70, whose two
// lines are 14/14 and 11/10 syllables long and take almost the same time to say: shifting
// the pairing there changes the pace by less than the band is wide. That is a real limit of
// this evidence and it is stated rather than hidden, because those two tracks are placed by
// the recorded gap instead, which section 3 checks for every line in the bank.
const BLUNT = ['63', '70'];
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => String(i.track) === String(n));
  if (list.length < 2) return;
  const [lo, hi] = BAND[n];
  const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
  const out = shifted.filter((r) => r < lo || r > hi).length;
  if (BLUNT.indexOf(n) >= 0) {
    assert(out === 0, 'track ' + n + ' is one of the two the band cannot bite on — its two lines are '
      + list.map((i) => syl(i.ko)).join('/') + ' syllables, so a swap is invisible to pace');
  } else {
    assert(out > 0, 'track ' + n + ' fails its band when the pairing is shifted by one ('
      + out + ' of ' + list.length + ' outside)');
  }
});

// ── 7. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 7. Wiring ---');
assert(/isUnit16World\(\)\) return '\/worlds\/unit16-cassette\.json'/.test(ui),
  'the cassette resolves Unit 16 to its own bank');
assert(/OPEN_ON = \{[^}]*'2b-unit-16': 64/.test(ui), 'the listen screen opens on 말하기 1, track 64');
assert(read('js/i18n.js').indexOf("'worlds/unit16-cassette.json'") >= 0,
  'the bank is a translatable source, or it ships in English at 100% coverage');
// Membership rather than the whole literal. Unit 12's suite named every unit in this array
// and Unit 16 being added to it broke that suite — the same check written the same way here
// would have broken on Unit 17.
const timingUnits = ((/const UNITS = \[([^\]]*)\]/.exec(read('scripts/cassette_timings.js')) || [])[1] || '')
  .split(',').map((s) => s.trim());
assert(timingUnits.indexOf('16') >= 0,
  'the timings tool knows about Unit 16');
assert(read('admin/lib/content.js').indexOf("'unit16'") >= 0, 'and so does the admin panel');
assert(read('scripts/vocab_examples.js').indexOf('worlds/unit16-cassette.json') >= 0,
  'and the example corpus, which is where these sentences become vocabulary examples');

// ── 8. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 8. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
['worlds/2b-unit-16.json', 'worlds/unit16-cassette.json']
  .forEach((rel) => assert(batch.has(rel), rel + ' publishes'));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit16_cassette: all passed');
