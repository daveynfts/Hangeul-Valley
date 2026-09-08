/**
 * tests/test_cassette_timings.js — the per-line spans, and the two defects that produced them.
 *
 * A stretch selected on the waveform before pressing play landed somewhere else once playback
 * started. The strip maps x to a time through the track's duration, and it had two different
 * durations to choose from: the number written into the cassette JSON by hand, and the real
 * one the <audio> element reports. Unit 15's written numbers were out by up to 19% — track 55
 * said 8.7s against a file of 10.76 — so the scale changed under the player the instant the
 * element loaded, and the selection moved with it.
 *
 * Both halves are covered here. The durations must match their files, and the strip must
 * prefer a measured length over a written one.
 *
 * The spans themselves (`at`/`end` per line) come from scripts/cassette_timings.js, which
 * needs ffmpeg. CI has none, so this asserts the shape and the ordering of what that script
 * wrote rather than re-deriving it — the same split as the unit cassette suites, which skip
 * their ffprobe checks when the tool is absent.
 *
 * Run: node tests/test_cassette_timings.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const UNITS = [10, 11, 13, 14, 15];

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const banks = UNITS.map((u) => ({ u, rel: 'worlds/unit' + u + '-cassette.json', data: read('worlds/unit' + u + '-cassette.json') }));

// ── 1. Spans are well formed ─────────────────────────────────────────────────
console.log('\n--- 1. Every span that exists is usable ---');
{
  const bad = [];
  const backwards = [];
  const overrun = [];
  let timed = 0, lines = 0;
  banks.forEach(({ u, data }) => {
    (data.tracks || []).forEach((t) => {
      let prevEnd = -1;
      (t.lines || []).forEach((l, li) => {
        lines++;
        const has = Object.prototype.hasOwnProperty.call(l, 'at');
        if (!has) {
          // `end` without `at` would be a span with no start — a half-written edit.
          if (Object.prototype.hasOwnProperty.call(l, 'end')) bad.push('u' + u + ' trk' + t.n + ' line' + li + ' has end but no at');
          return;
        }
        timed++;
        const where = 'u' + u + ' trk' + t.n + ' line' + li;
        if (typeof l.at !== 'number' || typeof l.end !== 'number'
          || !isFinite(l.at) || !isFinite(l.end)) { bad.push(where + ' is not a pair of numbers'); return; }
        if (!(l.end > l.at)) { bad.push(where + ' does not run forwards'); return; }
        if (l.at < 0 || l.end > (t.dur || 0) + 0.25) overrun.push(where + ' (' + l.at + '-' + l.end + ' of ' + t.dur + ')');
        // A transcript is in order, so the spans have to be too: a line that starts before
        // the one above it ended would play the wrong sentence for at least one of them.
        if (l.at < prevEnd - 0.05) backwards.push(where);
        prevEnd = l.end;
      });
    });
  });
  assert(bad.length === 0, 'every span is a forward pair of finite numbers' + (bad.length ? ' — ' + bad.slice(0, 4).join('; ') : ''));
  assert(overrun.length === 0, 'and lies inside its track' + (overrun.length ? ' — ' + overrun.slice(0, 4).join('; ') : ''));
  assert(backwards.length === 0, 'and follows the line above it' + (backwards.length ? ' — ' + backwards.slice(0, 4).join('; ') : ''));
  console.log('      ' + timed + ' of ' + lines + ' transcript lines carry a span');
  // A floor, not an exact count: re-running the measurement after a transcript edit may move
  // one line in or out, and that should not be a failing build. A collapse should be.
  assert(timed >= 120, 'the measured spans are still there (' + timed + ', floor 120)');
}

// ── 2. A line offers a button only where there is audio for it ───────────────
console.log('\n--- 2. Every line the script offers to play has something to play ---');
{
  const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[.,!?~…"'‘’“”]/g, '');
  let playable = 0, viaSpan = 0, viaClip = 0, missing = 0;
  const gone = [];
  banks.forEach(({ u, data }) => {
    const items = ((data.dictation || {}).items) || [];
    const clip = new Map();
    items.forEach((i) => { const k = norm(i.ko); if (!clip.has(k) && i.audio && i.audio.src) clip.set(k, i.audio.src); });
    (data.tracks || []).forEach((t) => {
      (t.lines || []).forEach((l) => {
        const span = typeof l.at === 'number';
        const c = clip.get(norm(l.ko));
        if (span) viaSpan++;
        else if (c) viaClip++;
        else { missing++; return; }
        playable++;
        // The button plays a file. If that file is not on disk the button is a dead end.
        const src = span ? t.src : c;
        if (!fs.existsSync(path.join(ROOT, src))) gone.push('u' + u + ' trk' + t.n + ' -> ' + src);
      });
    });
  });
  assert(gone.length === 0, 'and the file behind it is on disk' + (gone.length ? ' — ' + gone.slice(0, 4).join('; ') : ''));
  console.log('      playable ' + playable + '  (span ' + viaSpan + ', dictation clip ' + viaClip + ')  no audio ' + missing);
  assert(playable >= 160, 'the transcript is mostly playable (' + playable + ', floor 160)');
}

// ── 3. The strip prefers a measured length over a written one ────────────────
console.log('\n--- 3. The waveform does not change scale when playback starts ---');
{
  const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
  assert(/const csDurCache = \{\}/.test(ui), 'the decode records the track length');
  assert(/if \(audio && audio\.duration > 0\) csDurCache\[src\] = audio\.duration;/.test(ui),
    'and records it from the same AudioBuffer that draws the bars');
  const durFn = ui.slice(ui.indexOf('function csWaveDur()'), ui.indexOf('function csHeadTime()'));
  assert(durFn.indexOf('csDurCache') > 0, 'csWaveDur consults it');
  // Order is the whole point: the written number must be the last resort, not the first.
  assert(durFn.indexOf('csDurCache') < durFn.indexOf('cur.dur'),
    'and consults it before falling back to the number in the JSON');
  const dictFn = ui.slice(ui.indexOf('function dictWaveDur()'), ui.indexOf('function dictHeadTime()'));
  assert(dictFn.indexOf('csDurCache') > 0, 'the dictation strip does the same');
}

// ── 4. Pressing a line hands it to the transport ─────────────────────────────
console.log('\n--- 4. A line with a span becomes the armed stretch ---');
{
  // This started out the other way round: a line previewed on a private element that left the
  // transport alone, so a press could not move somebody's place in the recording. That made
  // the line a dead end — the waveform showed nothing, and repeat, ↺ Play A–B and the 0.75×
  // / 0.5× buttons, all of which exist for exactly this, could not reach what was playing.
  // Arming the range instead hands the line to every one of them.
  const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
  const fn = ui.slice(ui.indexOf('function listenPlayLine('), ui.indexOf('function csArmedScriptLine('));
  assert(fn.length > 200, 'found listenPlayLine');
  assert(/st\.a = line\.at;/.test(fn) && /st\.b = end > line\.at \? end : null;/.test(fn),
    'a line with a span arms A–B to exactly that span');
  assert(/listenReplayAB\(\);/.test(fn),
    'and starts through listenReplayAB, so there is one way an armed stretch begins');

  // The line a stretch belongs to is read back off the marks rather than remembered, so
  // clearing them, moving them, or changing track cannot leave a stale highlight behind.
  assert(/function csArmedScriptLine\(\)/.test(ui), 'the armed line is derived from the marks');
  const paint = ui.slice(ui.indexOf('function csPaintScriptPlaying()'), ui.indexOf('function listenReplayAB('));
  assert(/csArmedScriptLine\(\)/.test(paint) && /csClipLine/.test(paint),
    'and the highlight follows either route');
  const playing = ui.slice(ui.indexOf('function csPaintPlaying()'), ui.indexOf('function csPaintProgress('));
  assert(/csPaintScriptPlaying\(\)/.test(playing),
    'the script buttons repaint whenever the transport starts or stops');

  // The other route is still there for the lines that have no span: their sentence exists
  // only as a separate dictation clip, which is not in this track and cannot be pointed at.
  assert(/function csClipPlay\(/.test(ui) && /function csClipStop\(/.test(ui),
    'a line with no span still previews from its own clip');
  const stop = ui.slice(ui.indexOf('function csStop()'), ui.indexOf('function csPlay('));
  assert(stop.indexOf('csClipStop()') > 0, 'starting the transport stops such a preview');
  const clipPlay = ui.slice(ui.indexOf('function csClipPlay('), ui.indexOf('function csIsPlaying('));
  assert(clipPlay.indexOf('csStop()') > 0, 'and the preview stops the transport — never both at once');
  assert(/to > 0 && \(el\.currentTime \|\| 0\) >= to/.test(clipPlay),
    'a clip stops where the line stops rather than reading on');

  assert(/window\.listenPlayLine = listenPlayLine;/.test(ui),
    'the button in the script pane resolves to an export, like every other onclick');
  assert(/class="cs-lineplay cs-lineplay-off"/.test(ui),
    'a line with no audio gets a spacer rather than a button that does nothing');

  const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
  assert(/\.cs-lineplay \{/.test(css) && /\.cs-line\.playing \{/.test(css),
    'the button and the line it is playing are styled');
  // A long transcript has to scroll. #listen-right is a grid item, and its default
  // min-height:auto refused to shrink below its content: it grew to 1016px inside a 614px
  // row, .cs-script never overflowed and so never scrolled, and #listen-panel clips at
  // overflow:hidden — the last lines of unit 15's interview were unreachable.
  const right = css.slice(css.indexOf('#listen-right {'), css.indexOf('#listen-right {') + 200);
  assert(/min-height:\s*0/.test(right), 'the script column can shrink below its content');
  const script = css.slice(css.indexOf('.cs-script { padding'), css.indexOf('.cs-script { padding') + 160);
  assert(/overflow-y:\s*auto/.test(script) && /min-height:\s*0/.test(script),
    'so the transcript itself is what scrolls');
}

// ── 5. Re-running the measuring script cannot undo hand work ─────────────────
console.log('\n--- 5. The measuring script fills gaps rather than clearing them ---');
{
  // It used to clear every span on a track before measuring it. That was fine while its own
  // output was the only output; once units 10 and 15 were finished by hand in the admin's
  // Timings tab, an ordinary re-run would have thrown away 55 lines of listening and put back
  // the 49 it can derive. Deleting the script was the other way to stop that, and the wrong
  // one — a new unit still wants it. Asserted at source, because the behaviour needs ffmpeg
  // and CI has none.
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'cassette_timings.js'), 'utf8');
  const clears = /t\.lines\.forEach\(\(l\) => \{ delete l\.at; delete l\.end; \}\);/.exec(src);
  assert(!!clears, 'the clearing step still exists — it is what --redo is');
  const before = src.slice(0, clears.index);
  assert(/if \(redo\) \{\s*$/m.test(before.slice(-40)) || /if \(redo\)/.test(before.slice(-80)),
    'and it is reachable only under --redo');
  assert(/const redo = argv\.includes\('--redo'\)/.test(src), '--redo is a named flag');
  // The anchor step must not overwrite either, or the flag alone would not be enough.
  const anchors = src.slice(src.indexOf('// 1. Anchors.'), src.indexOf('// 2. Brackets'));
  assert(/if \(typeof l\.at === 'number'\) return;/.test(anchors),
    'a line that already has a span is skipped rather than re-measured');
  assert(/how: 'kept'/.test(src), 'and what was left alone is counted in the report');
}

// ── 6. The written durations match the files ─────────────────────────────────
console.log('\n--- 6. Each track says how long it really is ---');
{
  const durOf = (rel) => Number(execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, rel)],
    { encoding: 'utf8' }).trim());
  let ffprobe = true;
  try { durOf(banks[0].data.tracks[0].src); } catch (e) { ffprobe = false; }
  if (!ffprobe) {
    console.log('      (ffprobe not on this machine — duration check skipped)');
  } else {
    // Tight, because these are now written by measurement rather than by hand. The 0.6s the
    // unit suites allow was a tolerance for a human reading a stopwatch; unit 15 sat inside
    // no tolerance at all, and this is the check it never had.
    const drift = [];
    banks.forEach(({ u, data }) => {
      (data.tracks || []).forEach((t) => {
        if (!t.src || !fs.existsSync(path.join(ROOT, t.src))) return;
        const real = durOf(t.src);
        if (Math.abs(real - (t.dur || 0)) > 0.05) drift.push('u' + u + ' trk' + t.n + ': says ' + t.dur + ', is ' + real.toFixed(2));
      });
    });
    assert(drift.length === 0, 'every stated duration is within 0.05s of its file'
      + (drift.length ? ' — ' + drift.slice(0, 6).join('; ') : ''));
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_cassette_timings: all passed');
