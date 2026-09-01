'use strict';
/**
 * tests/test_listen_loop.js — the waveform, the repeat and the A-B loop, on both the 듣기
 * and 받아쓰기 screens.
 *
 * Three things a listening station needs that a play button cannot give you: repeat the
 * track, repeat one phrase of it, and see where in the recording you are. The rules that
 * decide all three are small pure functions in js/ui.js, so they are lifted out and driven
 * here rather than eyeballed in a browser — the same way tests/test_unit11_cassette.js
 * drives the dictation aligner.
 *
 * What is worth testing and why:
 *
 *   1. csRange is the only thing standing between a listener and a loop that spins. A pair
 *      set backwards is the same loop the other way round; a pair a tenth of a second apart
 *      is a stutter. Both are decided here, once, rather than at each of the call sites.
 *
 *   2. csRangeSeek has an edge that only shows up on real audio: a loop whose end sits on
 *      the last frame of the track gets no tick before the element stops itself, so `ended`
 *      has to ask the same question and get 'jump' rather than 'stop'.
 *
 *   3. The peaks are decoded at runtime, not cut into the JSON. That is a deliberate choice
 *      — no peak file to regenerate when a clip is re-cut — and it only holds up if the
 *      decode is cached per recording and the strip still works when it fails. Both are
 *      driven against a fake AudioContext below.
 *
 *   4. Section 5b is a bug that shipped. The strip used to draw a row of uniform short bars
 *      while the decode was in flight, and a flat evenly-spaced comb is exactly what a real
 *      waveform of a silent recording looks like — so a strip that was merely still loading
 *      read as a fault. Measured afterwards: all 207 audio files in the repo decode, in
 *      49ms on average. Nothing was broken; the loading state was lying. There are three
 *      states now and only one of them draws bars.
 *
 * Run: node tests/test_listen_loop.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ui = read('js/ui.js');
const html = read('index.html');
const css = read('css/game.css');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('듣기 + 받아쓰기 · WAVEFORM, REPEAT, A-B LOOP');
console.log('====================================================');

// ── Lift the rules out of the shipped file ───────────────────────────────────
const from = ui.indexOf('const CS_PEAK_BUCKETS');
const to = ui.indexOf('// Which screens carry a strip');
assert(from > 0 && to > from, 'the waveform block is where the suite expects it');
// csWaveState reads the same cache and is the thing that decides which of the three
// drawings happens, so it comes along rather than being tested by regex.
const sFrom = ui.indexOf('function csWaveState');
const sTo = ui.indexOf('// The strip. Bars when');
assert(sFrom > 0 && sTo > sFrom, 'csWaveState is where the suite expects it');
const src = ui.slice(from, to) + ';\n' + ui.slice(sFrom, sTo);

let fetchCalls = 0;
let fetchReply = 'ok';
let decodeReply = 'ok';
const sandbox = {
  console: console,
  // The three globals the lifted block reads. Assigned per test below.
  fetch: (url) => {
    fetchCalls++;
    if (fetchReply === 'reject') return Promise.reject(new Error('offline'));
    if (fetchReply === 'http') return Promise.resolve({ ok: false });
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  },
  AudioContext: function () {
    this.closed = false;
    this.close = () => { this.closed = true; sandbox.closes++; };
    this.decodeAudioData = (buf, ok, bad) => {
      if (decodeReply === 'bad') return bad(new Error('not audio'));
      if (decodeReply === 'throw') throw new Error('nope');
      return ok({ getChannelData: () => new Float32Array([0, 0.5, -0.25, 0.1, -1, 0.75]) });
    };
  },
  closes: 0
};
vm.createContext(sandbox);
vm.runInContext(
  'var listenState = null, cassetteTrack = null, cassetteBank = null;\n'
  + src
  + '\nthis.f = { csPeaksFrom: csPeaksFrom, csRange: csRange, csRangeSeek: csRangeSeek,'
  + ' csTimeAtX: csTimeAtX, csLoadPeaks: csLoadPeaks, csWaveDur: csWaveDur,'
  + ' csHeadTime: csHeadTime, cache: csPeakCache, pending: csPeakPending,'
  + ' csWaveState: csWaveState,'
  + ' MIN: CS_AB_MIN, BUCKETS: CS_PEAK_BUCKETS, TICK: CS_TICK_MS, DRAG: CS_DRAG_PX };'
  + '\nthis.setState = function (s, t, b) { listenState = s; cassetteTrack = t; cassetteBank = b; };',
  sandbox);
const f = sandbox.f;

// ── 1. csRange — what counts as a loop ───────────────────────────────────────
console.log('\n--- 1. csRange: what counts as a loop ---');
assert(f.csRange(null, 5, 10) === null, 'one mark is not a loop');
assert(f.csRange(2, null, 10) === null, 'and neither is the other one alone');
assert(f.csRange(undefined, undefined, 10) === null, 'nor no marks at all');
const r1 = f.csRange(2, 6, 10);
assert(!!r1 && r1.a === 2 && r1.b === 6, 'a normal pair comes back as it went in');
const r2 = f.csRange(6, 2, 10);
assert(!!r2 && r2.a === 2 && r2.b === 6,
  'a pair set backwards is the same loop the other way round, not an error');
assert(f.csRange(3, 3.1, 10) === null,
  'a pair a tenth of a second apart is refused — a loop that short spins rather than repeats');
assert(f.csRange(3, 3 + f.MIN, 10) !== null, 'exactly the minimum is allowed (' + f.MIN + 's)');
const r3 = f.csRange(-4, 99, 10);
assert(!!r3 && r3.a === 0 && r3.b === 10, 'and a pair outside the track is clamped to it');
assert(f.csRange(NaN, 5, 10) === null, 'NaN is not a mark');
assert(f.csRange(1, Infinity, 10) === null, 'and neither is Infinity');
// A duration of zero happens for one paint: the element has no metadata and the track's own
// declared dur has not been read yet. It must not throw and must not invent a loop.
const r4 = f.csRange(1, 4, 0);
assert(!!r4 && r4.a === 1 && r4.b === 4, 'with no known duration the marks stand on their own');

// ── 2. csRangeSeek — when the playhead jumps ─────────────────────────────────
console.log('\n--- 2. csRangeSeek: when the playhead jumps ---');
const rr = { a: 2, b: 6 };
assert(f.csRangeSeek(3, null, false) === null, 'no loop armed, no jump');
assert(f.csRangeSeek(3, rr, false) === null, 'inside the loop, no jump');
assert(f.csRangeSeek(1, rr, false) === null,
  'before it either — playing in is a lead-in, not a fault to correct');
assert(f.csRangeSeek(6, rr, false) === 2, 'at the end it jumps back to the start');
assert(f.csRangeSeek(9.4, rr, false) === 2, 'and a late tick that overshot still jumps');
// The edge the browser produces: b on the last frame, so the element ends before any tick.
assert(f.csRangeSeek(0, rr, true) === 2,
  'on `ended` it jumps whatever the time says — a loop ending on the last frame gets no tick');
assert(f.csRangeSeek(0, null, true) === null, 'but `ended` with no loop armed still stops');

// ── 3. csTimeAtX — clicking the strip ────────────────────────────────────────
console.log('\n--- 3. csTimeAtX: clicking the strip ---');
assert(f.csTimeAtX(50, 100, 10) === 5, 'the middle of the strip is the middle of the track');
assert(f.csTimeAtX(-20, 100, 10) === 0, 'a drag off the left edge clamps to the start');
assert(f.csTimeAtX(400, 100, 10) === 10, 'and off the right edge to the end');
assert(f.csTimeAtX(50, 0, 10) === 0, 'an unlaid-out canvas reports 0 rather than NaN');
assert(f.csTimeAtX(50, 100, 0) === 0, 'and so does a track of unknown length');

// ── 4. csPeaksFrom — the bars ────────────────────────────────────────────────
console.log('\n--- 4. csPeaksFrom: the bars ---');
const samples = new Float32Array(1000);
for (let i = 0; i < 1000; i++) samples[i] = Math.sin(i / 7) * (i < 500 ? 0.2 : 1);
const peaks = f.csPeaksFrom(samples, 100);
assert(peaks.length === 100, 'one value per bucket');
assert(peaks.every((v) => v >= 0 && v <= 1), 'every value is 0..1');
assert(Math.max.apply(null, peaks) === 1,
  'normalised against the loudest bucket, so a quiet recording is not drawn as a flat line');
assert(peaks[10] < peaks[90], 'and the quiet half really is drawn quieter than the loud half');
const flat = f.csPeaksFrom(new Float32Array(64), 32);
assert(flat.length === 32 && flat.every((v) => v === 0),
  'silence does not divide by zero');
const sparse = f.csPeaksFrom(new Float32Array([0.5, -0.9]), 8);
assert(sparse.length === 8 && Math.max.apply(null, sparse) === 1,
  'more buckets than samples still fills every bucket');
assert(f.csPeaksFrom(null, 4).length === 4, 'and no samples at all returns a drawable row');

// ── 5. csLoadPeaks — decoded once, cached, and safe when it fails ────────────
// The peaks are not cut into the content. That is what keeps a re-cut clip from needing a
// second file regenerated beside it, and it only holds if the decode happens once per track
// and a failure degrades rather than breaks.
console.log('\n--- 5. csLoadPeaks: decoded once, cached, safe when it fails ---');
(async () => {
  fetchCalls = 0; fetchReply = 'ok'; decodeReply = 'ok';
  const a = await f.csLoadPeaks('audio/book/x.mp3');
  assert(Array.isArray(a) && a.length === f.BUCKETS,
    'a decoded track yields ' + f.BUCKETS + ' peaks (' + (a ? a.length : 'null') + ')');
  assert(fetchCalls === 1, 'fetched once');
  assert(sandbox.closes === 1, 'and the AudioContext was closed — a tab full of them is a leak');
  const b = await f.csLoadPeaks('audio/book/x.mp3');
  assert(b === a && fetchCalls === 1, 'the second ask is the cache, not a second decode');

  // Two callers on the same track before the first resolves must share one decode.
  fetchCalls = 0;
  const both = await Promise.all([f.csLoadPeaks('audio/book/y.mp3'), f.csLoadPeaks('audio/book/y.mp3')]);
  assert(fetchCalls === 1, 'two callers racing on one track share a single decode');
  assert(both[0] === both[1], 'and get the same array');

  fetchReply = 'http';
  const miss = await f.csLoadPeaks('audio/book/gone.mp3');
  assert(miss === null, 'a 404 gives null rather than throwing');
  const missAgain = await f.csLoadPeaks('audio/book/gone.mp3');
  assert(missAgain === null, 'and is remembered as tried-and-could-not');

  fetchReply = 'ok'; decodeReply = 'bad';
  assert(await f.csLoadPeaks('audio/book/notaudio.mp3') === null, 'an undecodable body gives null');
  decodeReply = 'throw';
  assert(await f.csLoadPeaks('audio/book/throws.mp3') === null, 'and so does a decoder that throws');
  fetchReply = 'reject';
  decodeReply = 'ok';
  assert(await f.csLoadPeaks('audio/book/offline.mp3') === null, 'and an offline fetch');

  // ── 5b. Three states, because two of them are not a waveform ──────────────
  // This is the bug that shipped and had to be fixed. The strip used to draw a row of
  // uniform short bars while the decode was in flight — and a flat evenly-spaced comb is
  // exactly what a real waveform of a silent recording looks like, so a strip that was
  // merely still loading read as broken. Three states now, and only one of them draws bars.
  console.log('\n--- 5b. Three states, and only one of them is bars ---');
  assert(f.csWaveState('') === 'none', 'no source at all is none');
  assert(f.csWaveState('audio/book/never-asked.mp3') === 'wait',
    'a recording nobody has asked for yet is wait, not none — asking is what starts the decode');
  assert(f.csWaveState('audio/book/x.mp3') === 'ready', 'a decoded one is ready');
  assert(f.csWaveState('audio/book/gone.mp3') === 'none',
    'and one that was tried and failed is none rather than waiting for ever');
  // The drawing itself: the only place bars are emitted has to be behind `if (peaks)`.
  const paint = ui.slice(ui.indexOf('function csPaintWave'), ui.indexOf('function csWaveLabel'));
  assert(paint.indexOf('fillRect(i * step + 1') > paint.indexOf('if (peaks)'),
    'bars are drawn only when there are peaks to draw them from');
  assert(!/let v = 0\.\d+;/.test(paint),
    'nothing invents a uniform bar height — that was the flat comb that looked like a fault');
  assert(/state === 'wait'/.test(paint) && /mid - 1, 8, 2/.test(paint),
    'the waiting state is dashes on the centre line, which nobody reads as audio');
  const label = ui.slice(ui.indexOf('function csWaveLabel'), ui.indexOf('function csWaveLoad'));
  assert(/WAVEFORM/.test(label) && /NO WAVEFORM/.test(label),
    'and it says so in words as well, so a slow decode is legible rather than mysterious');

  // ── 6. Where the duration and the playhead come from ───────────────────────
  // Before playback there is no element, so both have to come from the track the JSON
  // declares — otherwise the strip cannot be clicked until after it has been played.
  console.log('\n--- 6. Duration and playhead before playback ---');
  sandbox.setState({ i: 1, at: 4.5, a: null, b: null }, null,
    { tracks: [{ src: 'a.mp3', dur: 13.2 }, { src: 'b.mp3', dur: 45.9 }] });
  assert(f.csWaveDur() === 45.9, 'with no element the declared dur is used');
  assert(f.csHeadTime() === 4.5, 'and the remembered position is the playhead');
  sandbox.setState({ i: 1, at: 4.5 }, { el: { duration: 46.02, currentTime: 7.25 } },
    { tracks: [{ src: 'a.mp3', dur: 13.2 }, { src: 'b.mp3', dur: 45.9 }] });
  assert(f.csWaveDur() === 46.02, 'once it is playing the element is authoritative');
  assert(f.csHeadTime() === 7.25, 'for both');
  sandbox.setState(null, null, null);
  assert(f.csWaveDur() === 0 && f.csHeadTime() === 0, 'and a closed screen reports zero, not NaN');

  finish();
})();

function finish() {
  // ── 7. The screen ─────────────────────────────────────────────────────────
  console.log('\n--- 7. The screen ---');
  assert(html.indexOf('id="listen-wave"') >= 0, 'the waveform canvas is in the page');
  assert(/<canvas id="listen-wave"[^>]*width="\d+"[^>]*height="\d+"/.test(html),
    'sized in the markup, so it is crisp rather than scaled up from CSS pixels');
  assert(css.indexOf('#listen-wave') >= 0, 'and it is styled');
  assert(/#listen-wave[^}]*touch-action: none/.test(css),
    'with touch-action none, or the browser claims the drag for scrolling and A-B never fires');
  ['listen-loop', 'listen-seta', 'listen-setb', 'listen-abplay', 'listen-abclear', 'listen-abinfo']
    .forEach((id) => assert(html.indexOf('id="' + id + '"') >= 0, id + ' is in the page'));
  assert(css.indexOf('.cs-lb') >= 0 && css.indexOf('#listen-loopbar') >= 0, 'the loop bar is styled');
  // Slowing a recording down is what you reach for once you are looping one phrase of it.
  assert(/data-rate="0\.5"/.test(html), 'a 0.5x rate joined the transport');
  assert(html.indexOf('id="listen-search"') >= 0 && ui.indexOf('function listenFilter') >= 0,
    'a long track list can be searched without leaving the player');
  assert(html.indexOf('id="listen-script-toggle"') >= 0 && ui.indexOf('function listenToggleScript') >= 0,
    'the transcript can be hidden for a listening-first pass and restored in place');
  assert(/listenNudge\(-5\)/.test(html) && /listenNudge\(5\)/.test(html),
    'five-second back and forward controls are visible rather than hidden behind shortcuts');
  assert(css.indexOf('.cs-play-primary') >= 0 && css.indexOf('.cs-main-controls') >= 0,
    'the frequent playback controls have their own large, stable visual group');
  // Two progress readings on one row rounded differently and disagreed on screen.
  assert(html.indexOf('id="listen-bar"') < 0, 'the old thin progress bar is gone from the page');
  assert(css.indexOf('.cs-bar ') < 0 && css.indexOf('.cs-bar>') < 0 && css.indexOf('.cs-bar {') < 0,
    'and its CSS went with it rather than being left dead');
  assert(ui.indexOf("$('listen-bar')") < 0, 'and nothing still paints it');

  // ── 8. Wiring ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. Wiring ---');
  ['listenToggleLoop', 'listenSetA', 'listenSetB', 'listenClearAB', 'listenReplayAB', 'listenSeek']
    .forEach((fn) => {
      assert(ui.indexOf('window.' + fn) >= 0, fn + ' is exported for the markup');
      assert(ui.indexOf('function ' + fn) >= 0, 'and defined');
    });
  // Every onclick in the listen panel has to resolve to an export, or the button is a no-op
  // that looks live. This is the check that would have caught a rename on one side only.
  const panel = html.slice(html.indexOf('id="listen-overlay"'), html.indexOf('id="dictation-overlay"'));
  const calls = (panel.match(/onclick="([a-zA-Z]+)\(/g) || []).map((s) => s.slice(9, -1));
  const orphans = [...new Set(calls)].filter((fn) => ui.indexOf('window.' + fn + ' =') < 0);
  assert(orphans.length === 0, 'every onclick on the 듣기 panel is an exported function'
    + (orphans.length ? ' — ' + orphans.join(', ') : ''));

  assert(/function csPlay\(src, rate, onEnd, opts\)/.test(ui), 'csPlay takes the loop options');
  assert(/el\.loop = !!\(opts && opts\.loop\)/.test(ui), 'whole-track repeat is the element’s own loop');
  assert(/addEventListener\('loadedmetadata', seek/.test(ui),
    'and a resume waits for metadata — currentTime before it is ignored or throws');
  // Newline-agnostic on purpose: this repo has no .gitattributes, so the working copy is CRLF
  // on Windows and LF in CI. A regex with a literal \n in it passes on one and fails on the
  // other, which is the worst kind of test.
  const stop = ui.slice(ui.indexOf('function csStop'), ui.indexOf('// opts.loop repeats'));
  assert(/csTickStop\(\)\s*;[\s\S]{0,40}if \(!cassetteTrack\) return;/.test(stop),
    'csStop kills the ticker before anything else, so a stopped screen has no interval running');
  assert(new RegExp('setInterval\\(csTick, CS_TICK_MS\\)').test(ui), 'the ticker runs at CS_TICK_MS');
  assert(f.TICK <= 50, 'which is ' + f.TICK + 'ms — fine enough that an A-B jump is not heard as an overshoot');
  assert(f.DRAG >= 2 && f.DRAG <= 8, 'and a drag needs ' + f.DRAG + 'px, so a tap still lands as a seek');
  // A loop belongs to the track it was drawn on.
  const pick = ui.slice(ui.indexOf('function listenPick'), ui.indexOf('function listenToggle'));
  assert(/listenState\.a = null/.test(pick) && /listenState\.b = null/.test(pick),
    'changing track clears the marks rather than looping a different sentence');
  // An armed stretch has to win over the native wrap, or the track ends and the stretch
  // never gets its jump.
  assert(/el\.loop = !!st\.loop && !range/.test(ui), 'an armed A-B beats whole-track repeat');

  const keys = ui.slice(ui.indexOf("if (top === 'listen-overlay')"), ui.indexOf("if (top === 'desk-menu-overlay')"));
  [['listenSetA', 'a'], ['listenSetB', 'b'], ['listenToggleLoop', 'l'],
    ['listenReplayAB', 'r'], ['listenClearAB', 'c'], ['listenNudge', 'the arrows']]
    .forEach(([fn, key]) => assert(keys.indexOf(fn) >= 0, key + ' is bound on the 듣기 screen'));
  assert(keys.indexOf('listenToggle()') >= 0, 'and space still plays');

  // ── 8a. Daily use resumes where the learner left off ─────────────────────
  console.log('\n--- 8a. Daily-use memory and progressive controls ---');
  assert(/CASSETTE_PREFS_KEY = 'hv_cassette_prefs_v2'/.test(ui),
    'cassette navigation preferences have a versioned, isolated local key');
  assert(/track: cur\.n/.test(ui) && /dictationId: it\.id/.test(ui),
    'resume targets stable content ids rather than array positions');
  assert(/listenAt: Math\.max\(0, at\)/.test(ui) && /listenRate: csSafeRate/.test(ui),
    'the selected speed and playhead are remembered together');
  const openListen = ui.slice(ui.indexOf('function openListen'), ui.indexOf('function closeListen'));
  assert(/pref\.track/.test(openListen) && /pref\.listenAt/.test(openListen) && /pref\.showScript/.test(openListen),
    'opening Listen restores the track, position and transcript preference');
  const closeListen = ui.slice(ui.indexOf('function closeListen'), ui.indexOf('function listenPick'));
  assert(closeListen.indexOf('csRememberListen()') < closeListen.indexOf('csStop()'),
    'closing remembers the live playhead before the shared player clears it');
  const openDict = ui.slice(ui.indexOf('function openDictation'), ui.indexOf('function closeDictation'));
  assert(/pref\.dictationId/.test(openDict) && /pref\.dictationRate/.test(openDict),
    'dictation resumes the last sentence and speed instead of returning to line one');
  assert(html.indexOf('id="dict-progress-fill"') >= 0 && ui.indexOf("$('dict-progress-fill')") >= 0,
    'dictation has a visible sentence-progress strip');
  assert(ui.indexOf('function dictPrev') >= 0 && html.indexOf('onclick="dictPrev()"') >= 0,
    'dictation can move backwards as well as forwards');

  // ── 8b. 받아쓰기 carries the same strip ────────────────────────────────────
  // One component, two screens. A learner who has used the loop on 듣기 should not find a
  // different set of controls on the screen where looping three syllables matters most.
  console.log('\n--- 8b. 받아쓰기 carries the same strip ---');
  ['dict-wave', 'dict-loop', 'dict-seta', 'dict-setb', 'dict-abclear', 'dict-abinfo', 'dict-clock']
    .forEach((id) => assert(html.indexOf('id="' + id + '"') >= 0, id + ' is in the page'));
  assert(/#dict-wave/.test(css) && /#listen-wave, #dict-wave/.test(css),
    'and both strips share one rule rather than being styled twice');
  ['dictToggleLoop', 'dictSetA', 'dictSetB', 'dictClearAB', 'dictReplayAB', 'dictSeek', 'dictPrev']
    .forEach((fn) => {
      assert(ui.indexOf('window.' + fn) >= 0, fn + ' is exported');
      assert(ui.indexOf('function ' + fn) >= 0, 'and defined');
    });
  const dpanel = html.slice(html.indexOf('id="dictation-overlay"'), html.indexOf('</body>'));
  const dcalls = [...new Set((dpanel.match(/onclick="([a-zA-Z]+)\(/g) || []).map((s) => s.slice(9, -1)))];
  const dorphans = dcalls.filter((fn) => ui.indexOf('window.' + fn + ' =') < 0);
  assert(dorphans.length === 0, 'every onclick on the 받아쓰기 panel is an exported function'
    + (dorphans.length ? ' — ' + dorphans.join(', ') : ''));
  // Both screens go through one table and one painter.
  assert(/const CS_WAVES = \{/.test(ui) && /'listen-wave': \{/.test(ui) && /'dict-wave': \{/.test(ui),
    'both screens are entries in one table');
  assert(/function csPaintWave\(id\)/.test(ui) && /function csWaveBind\(id\)/.test(ui),
    'and the painter and the pointer binding take the id rather than assuming 듣기');
  const tick = ui.slice(ui.indexOf('function csTick()'), ui.indexOf('function csTickStart'));
  assert(/csLiveWave\(\)/.test(tick),
    'one ticker serves whichever strip is on screen rather than each growing its own timer');
  assert(/classList\.contains\('visible'\)/.test(ui.slice(ui.indexOf('function csLiveWave'), ui.indexOf('// \'ready\' once'))),
    'and it picks by the visible overlay, not by whichever state happens to be non-null');
  // THE reason there are no letter shortcuts on 받아쓰기: it has a text input.
  assert(html.indexOf('id="dict-input"') >= 0, '받아쓰기 has a text input');
  const dkeys = ui.slice(ui.indexOf("if (top === 'dictation-overlay')"), ui.indexOf("if (top === 'listen-overlay')"));
  assert(dkeys.indexOf('dictSetA') < 0 && dkeys.indexOf('dictToggleLoop') < 0,
    'so no letter is bound there — a dictation screen that ate the letter you typed would be worse than no shortcuts');

  // ── 9. The peaks are not content ──────────────────────────────────────────
  // If they were, every re-cut clip would need its peak file regenerated beside it, and a
  // stale one would draw a waveform for audio that is no longer there.
  console.log('\n--- 9. The peaks are not content ---');
  ['worlds/unit11-cassette.json', 'worlds/unit13-cassette.json', 'worlds/unit14-cassette.json']
    .forEach((rel) => {
      const raw = read(rel);
      assert(!/"(?:peaks|waveform|wave)"/.test(raw), rel + ' ships no peak data');
    });
  assert(/decodeAudioData/.test(ui), 'they are decoded at runtime instead');
  assert(/csPeakCache/.test(ui), 'and cached per track for the session');

  console.log('\n====================================================');
  console.log(passed + ' passed, ' + failed + ' failed');
  console.log('====================================================');
  if (failed) process.exit(1);
  console.log('\ntest_listen_loop: all passed');
}
