'use strict';
/**
 * tests/test_unit18_cassette.js — 카세트 플레이어 for 18과 한국에 온 지 벌써 6개월이 되었어요.
 *
 * Nine tracks, 82 to 90 — one fewer than the chapters before it. Two grammar boxes, 말하기 1,
 * two more, 말하기 2, the two 듣기 halves of one radio programme, and a single 발음 track. The
 * book's last chapter teaches no new pronunciation rule: track 90 re-reads the 읽기 passage in
 * 합니다체 with twenty-two words underlined, a review of the whole book, and there is no 준비 and
 * 연습 pair to make ten. Every track has a printed script — the unit pages carry seven and the
 * 듣기 지문 at the back of the book (printed p.266) carries the radio programme — so none of them
 * ships as listen-only.
 *
 * **Where the line timings come from.** Not counted silences. `lines.js` holds the transcript,
 * `align.js` fits it to the recording under a gap-restricted DP, `spans.js` turns that into
 * at/end pairs with a fixed 0.12s edge pad, and section 3 checks the result rather than the
 * process: every line forward, inside its track, in order, opening on a gap of at least 0.98s.
 *
 * **This tape broke two of the filters the last two built.** Unit 16 taught align.js to throw
 * away a ringback — a span that loses under 3 dB to a narrow band at 470 Hz — and Unit 17 a
 * doorbell, a span whose pitch does not move. On this tape both of them threw away speech.
 *
 *   · Track 87's 또 장마가 있어서 비가 많이 온다 opens on 또, a single 0.30s /o/ whose first
 *     formant sits at 470 Hz and loses only 2.3 dB to the band. The line came out at 5.24
 *     syl/s against a track mean of 4.55, missing its first word. A narrowband test only means
 *     anything about something sustained, so it now needs 0.7s, as the flatness test already did.
 *   · Track 86 is one sentence, 내일부터 방학이다, read flat by a male voice: an interquartile
 *     pitch spread of 0.074 against a threshold of 0.08, so the filter ate the only span on the
 *     track. Rather than move a number that had just been shown to sit on the data, the test
 *     now asks a second question — a sentence has syllables and a tone does not. Voice-band
 *     envelope dips come out at 1.97 a second for Unit 17's buzzer and 5.3 to 6.9 for every
 *     real utterance on either tape, and a span is a tone only if it is flat AND steady.
 *
 * **And two of its tracks have music under them.** 88 and 89 are a radio programme, and the
 * broadband level never drops to -40 dB between one sentence and the next, so silencedetect
 * heard 61 seconds of unbroken speech. The music sits 15-20 dB below the presenter; measuring
 * the voice band against a quantile of the track itself (0.62, above the bed and below the
 * voice) puts the pauses back. The pauses inside a sentence there are the bed showing through,
 * so those clips are cut in one piece rather than spliced — section 6 checks both halves of
 * that rule — and they have the music in them, because it is on the tape.
 *
 * Run: node tests/test_unit18_cassette.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const bank = JSON.parse(read(path.join('worlds', 'unit18-cassette.json')));
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
console.log('2B UNIT 18 · 카세트 플레이어 — tracks 82-90');
console.log('====================================================');

// ── 1. The bank belongs to the unit ──────────────────────────────────────────
console.log('\n--- 1. The bank ---');
assert(bank.unit === '2b-unit-18', 'the bank names its unit');
assert(bank.unitKo === '18과 한국에 온 지 벌써 6개월이 되었어요', 'and the chapter it is the tape of');
assert(/Unit 18/.test(bank.source || '') && /82-90/.test(bank.source || ''),
  'and says which recordings: ' + bank.source);
assert(typeof bank.listenOnly === 'string' && /듣기 지문/.test(bank.listenOnly),
  'and where the radio programme’s script came from, since it is not on the unit pages');
assert(/music/.test(bank.listenOnly) && /88/.test(bank.listenOnly) && /89/.test(bank.listenOnly),
  'and that tracks 88 and 89 have music under them, which their clips carry too');

// ── 2. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 2. The recordings ---');
assert(tracks.length === 9, 'nine tracks, not ten (found ' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '82,83,84,85,86,87,88,89,90',
  'numbered 82 to 90 in the book’s order (' + tracks.map((t) => t.n).join(',') + ')');
const SECTIONS = ['문법과 표현 1-1', '문법과 표현 1-2', '말하기 1', '문법과 표현 2-1',
  '문법과 표현 2-2', '말하기 2', '듣기 1', '듣기 2', '발음'];
assert(tracks.map((t) => t.sec).join('|') === SECTIONS.join('|'),
  'each names the page it belongs to, with a single 발음 track (' + tracks.map((t) => t.sec).join(', ') + ')');
const gone = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
assert(gone.length === 0, 'every mp3 is on disk' + (gone.length ? ' — ' + gone.join(', ') : ''));
assert(tracks.every((t) => /^audio\/book\/2b-u18-trk\d\d\.mp3$/.test(t.src)),
  'each is named for its track number');
assert(tracks.every((t) => t.dur > 5), 'and each records its own length');
assert(tracks.every((t) => Array.isArray(t.lines) && t.lines.length),
  'every track carries a script, so none of them needs a no-script note');
assert(tracks.every((t) => !t.noteEn), 'and none of them has one');

// ── 3. Every line is placed inside its track ─────────────────────────────────
console.log('\n--- 3. Every line is placed ---');
const lines = tracks.reduce((a, t) => a.concat(t.lines || []), []);
assert(lines.length === 62, '62 transcript lines in all (found ' + lines.length + ')');
const perTrack = tracks.map((t) => t.lines.length).join(',');
assert(perTrack === '2,2,10,1,1,14,8,15,9', 'as the book prints them (' + perTrack + ')');
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
const tooClose = [];
tracks.forEach((t) => (t.lines || []).forEach((l, i, a) => {
  if (i && (l.at + 0.12) - a[i - 1].end < 0.98) tooClose.push(t.n + ':' + (i + 1));
}));
assert(tooClose.length === 0, 'and every one opens on a gap of 0.98s or more — on the radio '
  + 'tracks too, once the music is measured out' + (tooClose.length ? ' — ' + tooClose.join(', ') : ''));
const bloated = lines.filter((l) => (l.end - l.at) / Math.max(1, syl(l.ko)) > 0.45)
  .map((l) => l.ko.slice(0, 18));
assert(bloated.length === 0, 'and none of them is long enough to have eaten the next one'
  + (bloated.length ? ' — ' + bloated.join(' | ') : ''));
// The radio programme's first line starts where the presenter does, not where the music does:
// set at the track's quartile the segmenter kept four seconds of the opening sting as speech.
const t88 = tracks.find((t) => t.n === 88).lines;
assert(t88[0].at > 15 && t88[0].at < 15.5, 'the programme opens on the presenter at 15.3s, not '
  + 'on the sting four seconds earlier (' + t88[0].at + ')');

// ── 4. The two lines the old filters threw away ──────────────────────────────
console.log('\n--- 4. The two lines the old filters threw away ---');
const t86 = tracks.find((t) => t.n === 86).lines;
assert(t86.length === 1 && t86[0].ko === '내일부터 방학이다.' && t86[0].end > t86[0].at,
  'track 86 keeps its one sentence, read flat enough to pass for a tone on pitch alone');
const t87 = tracks.find((t) => t.n === 87).lines;
const rain = t87.find((l) => /^또 장마가/.test(l.ko));
assert(!!rain, 'track 87 has 또 장마가 있어서 비가 많이 온다');
assert(rain && rain.at < 43.1, 'and it opens on 또 at 43.04s, not on 장마 at 43.73s (' + (rain && rain.at) + ')');
const rainRow = items.find((i) => i.ko === '또 장마가 있어서 비가 많이 온다.');
assert(rainRow && rainRow.audio.rate < 5.0, 'so its clip reads at ' + (rainRow && rainRow.audio.rate)
  + ' syl/s rather than the 5.2 it did without its first word');

// ── 5. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 5. The dictation set ---');
assert(items.length === 80, '80 dictation sentences (found ' + items.length + ')');
const thin = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length).map((i) => i.id);
assert(thin.length === 0, 'every one carries English, a note and at least one tag'
  + (thin.length ? ' — id ' + thin.join(',') : ''));
assert(items.every((i) => String(i.why).length >= 80), 'and a note worth reading');
const badSyl = items.filter((i) => syl(i.ko) !== i.syl || i.syl < 5 || i.syl > 22).map((i) => i.id);
assert(badSyl.length === 0, 'each is 5-22 syllables and says so truthfully'
  + (badSyl.length ? ' — id ' + badSyl.join(',') : ''));
const scripted = new Set(tracks.map((t) => t.n));
assert(items.every((i) => scripted.has(i.track)), 'and comes from a track this bank holds');
const splits = items.filter((i) => i.splitFrom);
assert(splits.length > 0, splits.length + ' rows are parts of longer printed turns');
const orphan = splits.filter((i) => flat(i.splitFrom).indexOf(flat(i.ko)) < 0).map((i) => i.id);
assert(orphan.length === 0, 'and each really is a part of the turn it names'
  + (orphan.length ? ' — id ' + orphan.join(',') : ''));
const printed = new Set(lines.map((l) => flat(l.ko)));
const unprinted = splits.filter((i) => !printed.has(flat(i.splitFrom))).map((i) => i.id);
assert(unprinted.length === 0, 'and the turn it names is a line of its own track'
  + (unprinted.length ? ' — id ' + unprinted.join(',') : ''));
const flats = items.map((i) => flat(i.ko));
const dup = [];
flats.forEach((a, i) => flats.forEach((b, j) => {
  if (i !== j && (a === b ? i < j : a.indexOf(b) >= 0)) dup.push(items[j].id + ' inside ' + items[i].id);
}));
assert(dup.length === 0, 'no sentence is drilled twice, and none contains another — 시간이 참 빨리 '
  + '지나간다 and 시간이 빨리 지나간다 included' + (dup.length ? ' — ' + dup.slice(0, 4).join(', ') : ''));
const f = (bank.dictation && bank.dictation.filter) || {};
assert((f.keep || []).length >= 3 && (f.drop || []).length >= 3,
  'the bank writes down what it keeps and what it drops');
assert(/no new/.test((f.keep || []).join(' ')) && /plain style/.test((f.keep || []).join(' ')),
  'and says there is no new 발음 rule to lean on, and that the plain style is what it leans on instead');
assert(typeof f.splitAtClause === 'string' && /89/.test(f.splitAtClause) && /48/.test(f.splitAtClause),
  'and says which turn was the longest and how it was cut');
// With no pronunciation rule of its own, the set leans on the register the chapter teaches:
// a sentence that ends on a bare 다 is in the plain style, and 합니다 does not count.
const plain = items.filter((i) => /[가-힣](?<!니)다[.!?”]?$/.test(nfc(i.ko).trim()));
assert(plain.length >= 15, plain.length + ' of the 80 sentences end in the plain style');
const review = items.filter((i) => i.track === 90);
assert(review.length === 12, 'and the closing review contributes a dozen, all in 합니다체 or its halves ('
  + review.length + ')');
assert(items.some((i) => /작년/.test(i.ko)) && items.some((i) => /못한/.test(i.ko))
  && items.some((i) => /할 수가/.test(i.ko)), 'the set holds 작년, 할 수가 and 못한, three of the underlined words');

// ── 6. Each clip matches its text ────────────────────────────────────────────
console.log('\n--- 6. Each clip matches its text ---');
const missing = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(missing.length === 0, 'every clip is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u18-d\d\d\.mp3$/.test(i.audio.src)),
  'each is named for its sentence');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
// The pace bands, per track, at the numbers the cut was verified at. Tracks 85 and 86 hold one
// row each and are checked on their own; every other track's band is checked for teeth below.
const BAND = { 82: [3.7, 4.8], 83: [4.6, 5.8], 84: [4.3, 5.9], 85: [3.9, 4.1], 86: [4.3, 4.5],
  87: [3.9, 5.2], 88: [3.8, 5.5], 89: [4.1, 6.2], 90: [4.5, 5.9] };
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
const blunt = [];
Object.keys(byTrack).forEach((n) => {
  const list = items.filter((i) => String(i.track) === String(n));
  if (list.length < 2) return;
  const [lo, hi] = BAND[n];
  const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
  if (!shifted.some((r) => r < lo || r > hi)) blunt.push(n);
});
assert(blunt.length === 0, 'every track with more than one row fails its band when the pairing '
  + 'is shifted by one — seven of seven' + (blunt.length ? ' — except ' + blunt.join(', ') : ''));
// One piece on the radio, spliced everywhere else. A whole-line clip off 88 or 89 is the line's
// whole window, pauses and music included; a whole-line clip off any other track with a pause
// inside it is shorter than its window, because the pause was replaced with a fixed breath.
const lineOf = (n, ko) => (tracks.find((t) => t.n === n).lines || []).find((l) => flat(l.ko) === flat(ko));
const whole = items.filter((i) => !i.splitFrom);
const radio = whole.filter((i) => i.track === 88 || i.track === 89);
const offWindow = radio.filter((i) => {
  const l = lineOf(i.track, i.ko);
  return !l || Math.abs(i.audio.voiced - (l.end - (l.at + 0.12))) > 0.01;
}).map((i) => i.id);
assert(radio.length >= 10 && offWindow.length === 0, 'the ' + radio.length + ' whole-line clips off the '
  + 'radio tracks are each their line’s whole window' + (offWindow.length ? ' — id ' + offWindow.join(',') : ''));
const spliced = whole.filter((i) => i.track !== 88 && i.track !== 89).filter((i) => {
  const l = lineOf(i.track, i.ko);
  return l && i.audio.voiced < (l.end - (l.at + 0.12)) - 0.1;
});
assert(spliced.length >= 10, 'while ' + spliced.length + ' whole-line clips elsewhere are shorter than '
  + 'their window, their pauses closed up');
// The numeral rows, counted as spoken — 6개월, 4시, 3주 and 10월 are one written character
// each and two or three spoken syllables.
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
assert(numeric.length >= 3, numeric.length + ' sentences have numerals in them');
const odd = numeric.filter((i) => {
  const spoken = syl(i.ko) + (i.ko.match(/\d+/g) || []).reduce((a, d) => a + sino(d), 0);
  const rate = spoken / i.audio.voiced;
  return rate < 3.2 || rate > 7.5;
}).map((i) => i.id);
assert(odd.length === 0, 'and once the numerals are counted as spoken, each reads at a normal pace'
  + (odd.length ? ' — id ' + odd.join(',') : ''));

// ── 7. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 7. Wiring ---');
assert(/isUnit18World\(\)\) return '\/worlds\/unit18-cassette\.json'/.test(ui),
  'the cassette resolves Unit 18 to its own bank');
assert(/OPEN_ON = \{[^}]*'2b-unit-18': 84/.test(ui), 'the listen screen opens on 말하기 1, track 84');
assert(read('js/i18n.js').indexOf("'worlds/unit18-cassette.json'") >= 0,
  'the bank is a translatable source, or it ships in English at 100% coverage');
const timingUnits = ((/const UNITS = \[([^\]]*)\]/.exec(read('scripts/cassette_timings.js')) || [])[1] || '')
  .split(',').map((s) => s.trim());
assert(timingUnits.indexOf('18') >= 0, 'the timings tool knows about Unit 18');
assert(read('admin/lib/content.js').indexOf("'unit18'") >= 0, 'and so does the admin panel');
assert(read('scripts/vocab_examples.js').indexOf('worlds/unit18-cassette.json') >= 0,
  'and the example corpus, which is where these sentences become vocabulary examples');

// ── 8. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 8. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
['worlds/2b-unit-18.json', 'worlds/unit18-cassette.json']
  .forEach((rel) => assert(batch.has(rel), rel + ' publishes'));

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit18_cassette: all passed');
