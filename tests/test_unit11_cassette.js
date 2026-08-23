'use strict';
/**
 * tests/test_unit11_cassette.js — the Unit 11 cassette player: the recordings, the
 * curated dictation set, and the checking.
 *
 * Three things are edited apart and have to stay joined, and each of them fails
 * quietly on its own:
 *
 *   1. A clip's audio versus the text printed beside it. Nothing on screen looks
 *      wrong when a clip carries the neighbouring sentence — you only hear it. What
 *      catches that is the reading pace: one narrator at one pace holds a steady
 *      syllables-per-second against the text, so a mispaired clip reads far too fast
 *      or too slow for the words next to it. Section 4 measures every clip against
 *      its own track's band, and the bands are per track because the two dialogues
 *      are read at different paces (4.9 vs 5.5 syl/s) — one band wide enough for
 *      both would pass anything.
 *
 *   2. The clips versus the upload batch. /audio/* is rewritten to the CDN, so a
 *      recording the content names but the batch omits is a play button that does
 *      nothing on the deployed site.
 *
 *   3. What the checker tells a learner who got it wrong. That is section 5, and it
 *      is the part with actual logic in it.
 *
 * Run: node tests/test_unit11_cassette.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
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

const c = readJson('worlds/unit11-cassette.json');
const ui = read('js/ui.js');
const farm = read('js/scenes/farm.js');
const html = read('index.html');
const css = read('css/game.css');
const tracks = c.tracks || [];
const items = (c.dictation && c.dictation.items) || [];

console.log('====================================================');
console.log('2B UNIT 11 · CASSETTE PLAYER');
console.log('====================================================');

// ── 1. The recordings ────────────────────────────────────────────────────────
console.log('\n--- 1. The recordings ---');
assert(tracks.length === 8, 'eight tracks, 12 through 19 (' + tracks.length + ')');
assert(tracks.map((t) => t.n).join(',') === '12,13,14,15,16,17,18,19', 'in the book’s own order');
tracks.forEach((t) => {
  assert(fs.existsSync(path.join(ROOT, t.src)), 'track ' + t.n + ' mp3 is on disk');
});
// The durations are a fidelity claim: they are how the track numbering in the book
// was confirmed to match the filenames in the first place — 11s grammar boxes, 46s
// and 50s dialogues, 77s and 83s listening sections.
const durOf = (rel) => Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, rel)],
  { encoding: 'utf8' }).trim());
let ffprobe = true;
try { durOf(tracks[0].src); } catch (e) { ffprobe = false; }
if (ffprobe) {
  const drift = tracks.filter((t) => Math.abs(durOf(t.src) - t.dur) > 0.6).map((t) => t.n);
  assert(drift.length === 0, 'each stated duration matches the file' + (drift.length ? ' — off for ' + drift.join(',') : ''));
} else {
  console.log('      (ffprobe not on this machine — duration and pace checks skipped)');
}

// ── 2. Every track carries a script ──────────────────────────────────────────
// This used to assert that 18 and 19 were listen-only, because the unit page prints
// their comprehension questions and not their transcript. The 듣기 지문 at the back of
// the book prints both, so they are scripted now and the claim is the stronger one.
console.log('\n--- 2. Every track carries a script ---');
const scripted = tracks.filter((t) => Array.isArray(t.lines));
assert(scripted.length === tracks.length, 'all ' + tracks.length + ' tracks carry a script');
assert(tracks.every((t) => !t.noteEn), 'and none needs a note explaining why it has none');
assert(scripted.every((t) => t.lines.every((l) => l.who && l.ko)), 'every script line has a speaker and Korean');
const listening = tracks.filter((t) => t.n === 18 || t.n === 19);
assert(listening.length === 2 && listening.every((t) => t.lines.length >= 11),
  'the two 듣기 tracks carry their full transcript (' + listening.map((t) => t.lines.length).join(' and ') + ' lines)');
const u11 = new Set((readJson('worlds/2b-unit-11.json').level.words || []).map((w) => nfc(w.ko)));
const scriptText = nfc(scripted.map((t) => t.lines.map((l) => l.ko).join(' ')).join(' '));
// A floor, not a target. 23 Unit 11 headwords are spoken across these eight scripts —
// it was 17 before the 듣기 지문 added the two listening transcripts. Unit 10's list
// scores 2 against the same text and Unit 14's scores 0, so 18 sits comfortably below
// the truth and still catches the failure this is for: scripts swapped for another
// unit's, which reads as perfectly good Korean.
const heard = [...u11].filter((w) => w.length > 1 && scriptText.indexOf(w) >= 0);
assert(heard.length >= 18, 'the scripts speak the unit’s own vocabulary (' + heard.length + ' headwords)');

// ── 3. The curated set ───────────────────────────────────────────────────────
console.log('\n--- 3. The curated set ---');
assert(items.length === 46, '46 sentences (' + items.length + ')');
const ids = items.map((i) => i.id);
assert(new Set(ids).size === ids.length && ids.every((v, k) => v === k + 1), 'ids are unique and sequential');
const incomplete = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length || !i.audio).map((i) => i.id);
assert(incomplete.length === 0, 'every row has text, gloss, reason, tags and a clip'
  + (incomplete.length ? ' — id ' + incomplete.join(',') : ''));
const band = items.filter((i) => syl(i.ko) < 5 || syl(i.ko) > 22).map((i) => i.id);
assert(band.length === 0, 'every sentence is 5-22 syllables, as the filter claims'
  + (band.length ? ' — id ' + band.join(',') : ''));
const stated = items.filter((i) => syl(i.ko) !== i.syl).map((i) => i.id);
assert(stated.length === 0, 'each stated syllable count is the one its Korean actually has'
  + (stated.length ? ' — id ' + stated.join(',') : ''));
// Dictation is checked against this string, so it must be Korean the clip really
// says — which a track with no printed script cannot supply.
const scriptedNs = new Set(scripted.map((t) => t.n));
assert(items.every((i) => scriptedNs.has(i.track)), 'every sentence comes from a track with a script');
// One per track at least: a set that skipped a track would leave part of the unit's
// audio undrilled while the count still looked healthy.
assert(tracks.every((t) => items.some((i) => i.track === t.n)),
  'and every track contributes at least one');
// A row shorter than the printed turn has to name the turn, or the change of shape
// reads as the book printing short lines.
const splits = items.filter((i) => i.splitFrom);
assert(splits.length === 11, 'the eleven rows split from a longer turn are marked (' + splits.length + ')');
assert(splits.every((i) => nfc(i.splitFrom).replace(/\s/g, '').indexOf(nfc(i.ko).replace(/\s/g, '')) >= 0),
  'and each is genuinely part of the turn it names');
splits.forEach((i) => {
  const t = tracks.find((x) => x.n === i.track);
  assert(!!t && t.lines.some((l) => nfc(l.ko).indexOf(nfc(i.splitFrom)) >= 0),
    'id' + i.id + '’s parent turn is one the script prints');
});
// Every sentence that is not a split must be a printed line verbatim — that is what
// makes the answer the book's answer rather than a paraphrase.
const verbatim = items.filter((i) => !i.splitFrom).filter((i) => {
  const t = tracks.find((x) => x.n === i.track);
  return !(t && t.lines.some((l) => nfc(l.ko).indexOf(nfc(i.ko)) >= 0));
}).map((i) => i.id);
assert(verbatim.length === 0, 'every unsplit sentence is a printed line, word for word'
  + (verbatim.length ? ' — id ' + verbatim.join(',') : ''));
const f = (c.dictation && c.dictation.filter) || {};
assert(Array.isArray(f.keep) && f.keep.length >= 3 && Array.isArray(f.drop) && f.drop.length >= 3,
  'the rule that chose these 25 ships with them');
// The unit's 발음 point is 종성 규칙 후 연음, so the set should lean on it. Checked as a
// floor: a set of grammar-only rows would miss what this chapter is actually about.
const liaison = items.filter((i) => (i.tags || []).indexOf('연음') >= 0).length;
assert(liaison >= 12, 'most rows turn on a sound-versus-spelling gap (' + liaison + ' of ' + items.length + ')');

// ── 4. Each clip matches the text beside it ──────────────────────────────────
console.log('\n--- 4. Each clip matches its text ---');
const missing = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
assert(missing.length === 0, 'every clip is on disk' + (missing.length ? ' — ' + missing.join(', ') : ''));
assert(items.every((i) => /^audio\/book\/2b-u11-d\d\d\.mp3$/.test(i.audio.src)),
  'each is named for the sentence it holds');
assert(new Set(items.map((i) => i.audio.src)).size === items.length, 'no two sentences share a clip');
if (ffprobe) {
  const long = items.filter((i) => { const d = durOf(i.audio.src); return d < 0.8 || d > 8; }).map((i) => i.id);
  assert(long.length === 0, 'each clip is one sentence long' + (long.length ? ' — id ' + long.join(',') : ''));
}
// The pace check. Bands are per track and deliberately not much wider than the
// spread actually measured when the clips were cut; shifting the pairing by one puts
// four of eight and four of nine outside them, which is what makes them worth having.
//
// Honest limit: tracks 12, 13, 15 and 16 hold two clips each, and on 12 and 15 the
// two lines are close enough in length that swapping them stays inside the band. What
// pins those is structure rather than pace — the recording plays the announcement,
// then A, then B, in the order the book prints, and there is no third possibility.
const BAND = { 12: [3.0, 5.5], 13: [4.5, 5.8], 14: [3.8, 6.5], 15: [3.8, 6.8], 16: [5.0, 6.0],
  17: [4.3, 6.6], 18: [3.6, 6.6], 19: [3.6, 6.4] };
if (ffprobe) {
  const byTrack = {};
  items.forEach((i) => {
    const rate = syl(i.ko) / i.audio.voiced;
    (byTrack[i.track] = byTrack[i.track] || []).push({ id: i.id, rate });
    assert(Math.abs(rate - i.audio.rate) < 0.05, 'id' + i.id + ' stores the pace it actually reads at');
  });
  Object.keys(byTrack).forEach((n) => {
    const [lo, hi] = BAND[n];
    const out = byTrack[n].filter((r) => r.rate < lo || r.rate > hi);
    const rs = byTrack[n].map((r) => r.rate);
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
    assert(out.length === 0, 'track ' + n + ': all ' + rs.length + ' clips read at a human pace for their text ('
      + mean.toFixed(2) + ' syl/s, band ' + lo + '-' + hi + ')'
      + (out.length ? ' — id ' + out.map((r) => r.id + '@' + r.rate.toFixed(2)).join(',') : ''));
  });
  // And the check has teeth: move each sentence's text onto the next one's clip
  // within the same track, and the two dialogues must break.
  // 12 and 15 hold two clips each whose lines are close enough in length that a swap
  // stays in band — the limit named at the top of this file. The four multi-clip tracks
  // do break, and 18 and 19 are the new ones, cut from the 듣기 지문.
  [14, 17, 18, 19].forEach((n) => {
    const list = items.filter((i) => i.track === n);
    const [lo, hi] = BAND[n];
    const shifted = list.map((it, k) => syl(list[(k + 1) % list.length].ko) / it.audio.voiced);
    const out = shifted.filter((r) => r < lo || r > hi).length;
    assert(out >= 3, 'track ' + n + ' fails its own band when the pairing is shifted by one ('
      + out + ' of ' + list.length + ' outside)');
  });
}

// ── 5. What the checker tells you ────────────────────────────────────────────
// The aligner is lifted out of the shipped file and driven, rather than eyeballed.
console.log('\n--- 5. What the checker tells you ---');
const alignSrc = ui.slice(ui.indexOf('function dictAlign'), ui.indexOf('// Spacing is worth marking'));
assert(alignSrc.indexOf('function dictAlign') === 0, 'dictAlign is where the suite expects it');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(alignSrc + '\nthis.align = dictAlign;', ctx);
const align = ctx.align;
const spaceless = (s) => nfc(s).replace(/\s+/g, '');
const report = (answer, typed) => {
  const { ans, got } = align(spaceless(answer), spaceless(typed));
  return {
    right: ans.filter((x) => x.ok).length, total: ans.length,
    missed: ans.filter((x) => !x.ok).map((x) => x.ch).join(''),
    extra: got.filter((x) => !x.ok).map((x) => x.ch).join('')
  };
};

let r = report('감기 아직 안 나았어요?', '감기 아직 안 나았어요?');
assert(r.right === r.total && !r.missed && !r.extra, 'a correct answer is wholly correct');

// Written as it sounds — the mistake the unit's 발음 page exists for.
r = report('감기 아직 안 나았어요?', '감기 아직 안 나아써요?');
assert(r.missed === '았어' && r.extra === '아써', 'writing 나아써요 for 나았어요 marks only the two syllables that differ');

// The ㅅ kept where it drops.
r = report('감기 아직 안 나았어요?', '감기 아직 안 낫았어요?');
assert(r.missed === '나' && r.extra === '낫', '낫았어요 marks the one syllable that is wrong');

// The liaison written out.
r = report('네, 기침이 계속 나요.', '네, 기치미 계속 나요.');
assert(r.missed === '침이' && r.extra === '치미', '기치미 for 기침이 marks the boundary, not the whole word');

// The case the alignment exists for: one syllable dropped must not redden the tail.
r = report('치과에 가 보는 게 어때요?', '치과에 보는 게 어때요?');
assert(r.missed === '가' && r.extra === '', 'a dropped syllable costs one mark and nothing after it');
r = report('이 약을 하루에 몇 번 먹어야 돼요?', '이 하루에 몇 번 먹어야 돼요?');
assert(r.missed === '약을' && r.extra === '', 'two dropped syllables cost two, still nothing after');

// An extra syllable is the mirror image.
r = report('이번 주말에 뭐 해요?', '이번에 주말에 뭐 해요?');
assert(r.missed === '' && r.extra === '에', 'an inserted syllable is marked as inserted, not as a mismatch');

// Nothing typed at all must not throw and must score zero.
r = report('요즘 이가 계속 아파요.', '');
assert(r.right === 0 && r.total === spaceless('요즘 이가 계속 아파요.').length && r.extra === '',
  'an empty answer scores zero rather than erroring');

// Whitespace is not what dictation is testing, so the score ignores it — while the
// answer on screen still shows the spacing the book prints.
const sp = report('네, 기침이 계속 나요.', '네,기침이계속나요.');
assert(sp.right === sp.total, 'spacing alone does not cost a mark');
assert(/it\.ko\.normalize\('NFC'\)/.test(ui) && /class="sp"/.test(ui),
  'and the answer line is still printed with the book’s spacing');
assert(/function dictNorm/.test(ui) && /replace\(\/\\s\+\/g, ''\)/.test(ui), 'that normalisation is a named function');

// ── 6. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 6. Wiring ---');
assert(/createTexture\(this, 'cassette_player'/.test(farm), 'the sprite is baked from a matrix');
const mtx = farm.slice(farm.indexOf("createTexture(this, 'cassette_player'"));
const rows = (mtx.slice(0, mtx.indexOf(']')).match(/'[.A-Za-z]{4,}'/g) || []).map((s) => s.slice(1, -1));
assert(rows.length === 18, 'the matrix is 18 rows (' + rows.length + ')');
assert(rows.every((x) => x.length === 20), 'every row is 20 wide');
const palBlock = farm.slice(farm.indexOf('const CASSETTE_PAL'), farm.indexOf("createTexture(this, 'cassette_player'"));
const keys = (palBlock.match(/'(.)':/g) || []).map((s) => s[1]);
const used = new Set(rows.join('').split(''));
assert([...used].every((ch) => keys.indexOf(ch) >= 0), 'every character it draws with is in the palette');
assert(keys.every((k) => used.has(k)), 'and every palette entry is used');
assert(farm.indexOf('_ensureCassette') >= 0 && farm.indexOf('_teardownCassette') >= 0,
  'the station spawns and tears down');
assert(/stations\.indexOf\('cassette'\) >= 0/.test(farm), 'driven by the pack, not by a unit check');
assert(/case 'cassette':[\s\S]{0,120}openCassette/.test(farm), 'interacting with it opens the player');
const layout = readJson('worlds/unit10-layout.json');
const slot = (layout.stations || []).find((s) => s.id === 'cassette');
assert(!!slot, 'it has a slot in the shared layout');
const spots = {};
let clash = '';
(layout.stations || []).forEach((s) => { const k = s.ox + ',' + s.oy; if (spots[k]) clash = s.id + ' on ' + spots[k]; spots[k] = s.id; });
assert(!clash, 'and no two stations stand in the same place' + (clash ? ' — ' + clash : ''));
assert(JSON.stringify(readJson('worlds/2b-unit-11.json').level.map.stations) === JSON.stringify(['desk', 'cassette']),
  'the world JSON lists it too — currentWorldPack reads the JSON over WORLD_PACKS, so a pack-only edit would not spawn it');
['cassette-overlay', 'listen-overlay', 'dictation-overlay'].forEach((id) => {
  assert(html.indexOf('id="' + id + '"') >= 0, id + ' is in the page');
  assert(css.indexOf('#' + id) >= 0, id + ' is styled');
});
assert(/STUDY_OVERLAYS = \[[\s\S]{0,200}'dictation-overlay'\]/.test(ui),
  'all three quiet the score, so the music is not playing over the recording');
['closeCassette', 'closeListen', 'closeDictation'].forEach((fn) => {
  assert(ui.indexOf('window.' + fn) >= 0, fn + ' is exported for the markup and for Escape');
});
assert(/overlayId === 'dictation-overlay'\) window\.closeDictation/.test(ui), 'Escape routes through the closers');
// One player, shared. Two recordings at once is the one thing a listening station
// must never do, and every screen here can start audio.
assert(/function csStop/.test(ui) && /function csPlay/.test(ui) && /csStop\(\);/.test(ui),
  'one shared player that stops before it starts');
assert(ui.indexOf("cassetteUrl") >= 0 && /isUnit11World/.test(ui.slice(ui.indexOf('function cassetteUrl'), ui.indexOf('function loadCassette'))),
  'the content is fetched only on Unit 11');

// ── 7. It reaches production ─────────────────────────────────────────────────
console.log('\n--- 7. It reaches production ---');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const named = [...tracks.map((t) => t.src), ...items.map((i) => i.audio.src)];
const absent = named.filter((s) => !batch.has(s));
assert(absent.length === 0, 'all ' + named.length + ' recordings are in the upload batch'
  + (absent.length ? ' — ' + absent.slice(0, 5).join(', ') : ''));
assert(batch.has('worlds/unit11-cassette.json'), 'and so is the content file');
// The collector used to reach only into a workbook's exercises, which would have
// left every one of these clips unuploaded while the disk looked perfectly right.
assert(/takeAudio/.test(read('scripts/r2Content.js')),
  'audio is collected by walking every world file, not per known shape');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit11_cassette: all passed');
