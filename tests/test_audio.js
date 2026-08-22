/**
 * tests/test_audio.js — mixer, SFX library, procedural music tables, panel wiring.
 *
 * The reason this file exists: the game called playChiptuneSFX('pickup'),
 * ('fanfare') and ('complete') while the engine implemented none of them, so
 * three moments were silent and nothing said so. The first assertion below ties
 * the set of sounds the game asks for to the set the library can make, in both
 * directions, so neither a dead call site nor a dead table entry survives.
 *
 * Run: node tests/test_audio.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const audioSrc = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
const musicSrc = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'music.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// ── A Web Audio stub that counts what the graph actually builds ───────────────
function makeParam(value) {
  return {
    value,
    setValueAtTime(v) { this.value = v; return this; },
    linearRampToValueAtTime(v) { this.value = v; return this; },
    exponentialRampToValueAtTime(v) {
      if (v === 0) throw new Error('exponentialRampToValueAtTime(0) is invalid');
      this.value = v; return this;
    },
    cancelScheduledValues() { return this; },
    setTargetAtTime(v) { this.value = v; return this; }
  };
}

function makeFakeAudio() {
  const counts = { osc: 0, gain: 0, buffer: 0, bufferSource: 0, filter: 0, compressor: 0 };
  const node = (extra) => Object.assign({
    connect() { return this; },
    disconnect() { return this; },
    start() { return this; },
    stop() { return this; }
  }, extra);

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.state = 'running';
      this.destination = node({});
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() { counts.gain++; return node({ gain: makeParam(1) }); }
    createOscillator() {
      counts.osc++;
      return node({ type: 'square', frequency: makeParam(440), detune: makeParam(0) });
    }
    createBiquadFilter() {
      counts.filter++;
      return node({ type: 'bandpass', frequency: makeParam(1000), Q: makeParam(1) });
    }
    createBufferSource() { counts.bufferSource++; return node({ buffer: null, loop: false }); }
    createBuffer(ch, len) {
      counts.buffer++;
      const data = new Float32Array(len);
      return { length: len, getChannelData: () => data };
    }
    createDynamicsCompressor() {
      counts.compressor++;
      return node({
        threshold: makeParam(-24), knee: makeParam(30), ratio: makeParam(12),
        attack: makeParam(0.003), release: makeParam(0.25)
      });
    }
  }
  return { FakeAudioContext, counts };
}

function makeStore() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); }
  };
}

function loadAudio(seed) {
  const { FakeAudioContext, counts } = makeFakeAudio();
  const store = makeStore();
  if (seed) Object.keys(seed).forEach((k) => store.setItem(k, seed[k]));
  const classList = { _s: new Set(), toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); },
    contains(c) { return this._s.has(c); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); } };
  const win = { AudioContext: FakeAudioContext, addEventListener() {} };
  const doc = {
    readyState: 'complete',
    documentElement: { classList },
    getElementById: () => null,
    addEventListener() {}
  };
  // A clock the test drives. The duck release is a timer, so without one the
  // release simply never happens and a broken ceiling would look like a pass.
  const clock = {
    now: 0, seq: 1, pending: new Map(),
    set(fn, ms) { const id = this.seq++; this.pending.set(id, { fn, at: this.now + (ms || 0) }); return id; },
    clear(id) { this.pending.delete(id); },
    tick(ms) {
      this.now += ms;
      [...this.pending.entries()]
        .filter(([, t]) => t.at <= this.now)
        .sort((a, b) => a[1].at - b[1].at)
        .forEach(([id, t]) => { this.pending.delete(id); t.fn(); });
    }
  };
  const ctx = {
    console: { log() {}, info() {}, warn() {}, error() {} },
    window: win, document: doc, localStorage: store,
    setTimeout: (fn, ms) => clock.set(fn, ms),
    clearTimeout: (id) => clock.clear(id),
    // A truthy id, because MusicDirector.playing() is "do I hold a timer" and a
    // stub returning 0 makes it answer no while the sequencer is running.
    setInterval: () => 1, clearInterval: () => {},
    TextEncoder
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(audioSrc, ctx);
  vm.runInContext(musicSrc, ctx);
  return { ctx, counts, store, clock, run: (expr) => vm.runInContext(expr, ctx) };
}

console.log('====================================================');
console.log('AUDIO MIXER');
console.log('====================================================\n');

// ── 1. The set the game asks for equals the set the library can make ─────────
console.log('--- 1. SFX coverage ---');
const jsFiles = [];
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) jsFiles.push(p);
  });
})(path.join(ROOT, 'js'));

const called = new Set();
jsFiles.forEach((f) => {
  const src = fs.readFileSync(f, 'utf8');
  const re = /playChiptuneSFX\(\s*'([a-z_]+)'\s*\)/g;
  let m;
  while ((m = re.exec(src))) called.add(m[1]);
});

const base = loadAudio();
const implemented = new Set(base.run('Object.keys(SFX)'));

assert(called.size >= 10, 'the game calls at least ten distinct sounds (' + called.size + ')');
const missing = [...called].filter((t) => !implemented.has(t));
assert(missing.length === 0, 'every called sound is implemented' + (missing.length ? ' — missing ' + missing.join(', ') : ''));
const unused = [...implemented].filter((t) => !called.has(t));
assert(unused.length === 0, 'every implemented sound is called' + (unused.length ? ' — unused ' + unused.join(', ') : ''));
// The three that were silent, named explicitly so a future refactor cannot quietly drop them.
['pickup', 'fanfare', 'complete'].forEach((t) => {
  assert(implemented.has(t) && called.has(t), t + ' is both called and implemented');
});
assert(implemented.has('denied') && !base.run("SFX.denied === SFX.quiz_wrong"),
  'a refused action has its own sound, not the wrong-answer sound');

// ── 2. Every sound actually builds nodes ─────────────────────────────────────
console.log('\n--- 2. Every sound renders ---');
[...implemented].forEach((type) => {
  const h = loadAudio();
  const before = h.counts.osc + h.counts.bufferSource;
  h.run("playChiptuneSFX('" + type + "')");
  const after = h.counts.osc + h.counts.bufferSource;
  assert(after > before, type + ' schedules at least one source node');
  assert(h.run('sfxDuration("' + type + '")') > 0, type + ' reports a duration');
});

// ── 3. Mute is actually mute ─────────────────────────────────────────────────
console.log('\n--- 3. Mute ---');
{
  const h = loadAudio();
  h.run('AudioMixer.init()');
  h.run('AudioMixer.setMuted(true)');
  const before = h.counts.osc;
  h.run("playChiptuneSFX('click'); playChiptuneSFX('quiz_correct'); playChiptuneSFX('fanfare')");
  assert(h.counts.osc === before, 'no oscillator is created while muted (this was the bug)');
  assert(h.run('AudioMixer.master.gain.value') === 0, 'master gain is 0 while muted');
  assert(h.run('AudioMixer.voiceLevel()') === 0, 'voice level is 0 while muted');
  assert(h.run('AudioMixer.target("music")') === 0, 'music bus target is 0 while muted');
  // Zero gain is not enough on its own: the sequencer would keep building
  // oscillators nobody can hear, which on a muted phone is pure battery.
  assert(h.run('MusicDirector.playing()') === false, 'mute parks the music sequencer');
  assert(h.run('AmbienceDirector.playing()') === false, 'mute parks the ambience bed');
  h.run('AudioMixer.setMuted(false)');
  const mid = h.counts.osc;
  h.run("playChiptuneSFX('click')");
  assert(h.counts.osc > mid, 'unmuting restores sound');
  assert(h.run('AudioMixer.master.gain.value') === 1, 'master gain returns to 1');
}

// ── 4. Volumes persist, clamp, and survive a reload ──────────────────────────
console.log('\n--- 4. Volume state ---');
{
  const h = loadAudio();
  h.run('AudioMixer.init()');
  h.run('AudioMixer.setVolume("music", 0.25)');
  assert(h.store.getItem('hv_vol_music') === '0.25', 'music volume is persisted');
  h.run('AudioMixer.setVolume("sfx", 5)');
  assert(h.run('AudioMixer.getVolume("sfx")') === 1, 'above-range volume clamps to 1');
  h.run('AudioMixer.setVolume("sfx", -3)');
  assert(h.run('AudioMixer.getVolume("sfx")') === 0, 'below-range volume clamps to 0');
  h.run('AudioMixer.setVolume("sfx", "banana")');
  assert(h.run('AudioMixer.getVolume("sfx")') === 0, 'a non-numeric volume does not become NaN');
  h.run('AudioMixer.setVolume("nonsense", 0.5)');
  assert(h.run('AudioMixer.getVolume("nonsense")') === 0, 'an unknown bus is ignored, not created');

  const reloaded = loadAudio({ hv_vol_music: '0.3', hv_vol_master: '0.5', hv_audio_muted: '1' });
  assert(reloaded.run('AudioMixer.getVolume("music")') === 0.3, 'music volume is restored from storage');
  assert(reloaded.run('AudioMixer.isMuted()') === true, 'mute is restored from storage');
  const corrupt = loadAudio({ hv_vol_music: 'not-a-number' });
  assert(corrupt.run('AudioMixer.getVolume("music")') === 0.4, 'a corrupt stored volume falls back to the default');
}

// ── 5. Ducking while Korean is spoken ────────────────────────────────────────
console.log('\n--- 5. Ducking ---');
{
  const h = loadAudio();
  h.run('AudioMixer.init()');
  const plain = h.run('AudioMixer.target("music")');
  assert(Math.abs(plain - 0.4 * 0.8) < 1e-9, 'music target is its own level times master');
  h.run('AudioMixer.voiceStart()');
  assert(h.run('AudioMixer.isDucked()') === true, 'voice start ducks the graph');
  const ducked = h.run('AudioMixer.target("music")');
  assert(ducked < plain, 'music drops while Korean plays');
  assert(Math.abs(ducked - plain * 0.22) < 1e-9, 'music ducks by the configured amount');
  assert(h.run('AudioMixer.target("sfx")') < h.run('AudioMixer.getVolume("sfx")'),
    'effects duck too — a click must not land on top of a word');
  assert(h.run('AudioMixer.target("ambience")') > h.run('AudioMixer.target("music")'),
    'ambience ducks less than music, so the world does not go dead silent');
  // Voice itself is deliberately outside the graph, so it must not be ducked.
  assert(h.run('AudioMixer.voiceLevel()') === h.run('AudioMixer.getVolume("voice") * AudioMixer.getVolume("master")'),
    'the voice level itself is never ducked');

  // The normal release: an end event arrives, the tail elapses, the duck lifts.
  h.run('AudioMixer.voiceEnd()');
  assert(h.run('AudioMixer.isDucked()') === true, 'the duck holds through the tail');
  h.clock.tick(400);
  assert(h.run('AudioMixer.isDucked()') === false, 'the duck lifts after the tail');
  assert(h.run('AudioMixer.target("music")') === plain, 'music returns to its full level');
}
{
  // The failure that shipped in the first draft of this file: voiceEnd() is only
  // reachable from onend/onerror, and a device with no Korean voice fires
  // neither. The duck held for the rest of the session and the music never came
  // back. There must be a ceiling that releases with no end event at all.
  const h = loadAudio();
  h.run('AudioMixer.init()');
  const plain = h.run('AudioMixer.target("music")');
  h.run('AudioMixer.voiceStart()');
  assert(h.run('AudioMixer.isDucked()') === true, 'speech ducks the graph');
  h.clock.tick(AUDIO_DUCK_MAX_MS(h) - 500);
  assert(h.run('AudioMixer.isDucked()') === true, 'the duck is still held just before the ceiling');
  h.clock.tick(1000);
  assert(h.run('AudioMixer.isDucked()') === false,
    'the duck releases at the ceiling even though no end event ever arrived');
  assert(h.run('AudioMixer.target("music")') === plain, 'and music is restored in full');

  // Speaking again must push the ceiling back rather than let it fire mid-word.
  const h2 = loadAudio();
  h2.run('AudioMixer.init()');
  h2.run('AudioMixer.voiceStart()');
  h2.clock.tick(AUDIO_DUCK_MAX_MS(h2) - 500);
  h2.run('AudioMixer.voiceStart()');
  h2.clock.tick(1000);
  assert(h2.run('AudioMixer.isDucked()') === true, 'a second utterance pushes the ceiling back');
}
function AUDIO_DUCK_MAX_MS(h) { return h.run('AUDIO_DUCK.maxHold') * 1000; }

// ── 6. The two guards the old engine lacked ──────────────────────────────────
console.log('\n--- 6. Throttle and polyphony ---');
{
  const h = loadAudio();
  h.run('AudioMixer.init()');
  assert(h.run("playChiptuneSFX('click')") === true, 'first click plays');
  assert(h.run("playChiptuneSFX('click')") === false, 'an immediate second click is dropped');
  assert(h.run("SFX.click.minGap > 0"), 'click carries a minimum gap — it has 89 call sites');
  assert(h.run("playChiptuneSFX('harvest')") === true, 'a different sound is not blocked by the click gap');
  assert(h.run("playChiptuneSFX('nope_not_a_sound')") === false, 'an unknown sound is a no-op, not a throw');

  const cap = loadAudio();
  cap.run('AudioMixer.init()');
  cap.run('AudioMixer._voices = 999');
  assert(cap.run("playChiptuneSFX('fanfare')") === false, 'the polyphony cap refuses new voices');
  assert(cap.run('AudioMixer.stats().dropped') > 0, 'dropped voices are counted rather than hidden');
}

// ── 7. The graph is a mixer, not a pile of sounds on destination ─────────────
console.log('\n--- 7. Graph shape ---');
{
  const h = loadAudio();
  h.run('AudioMixer.init()');
  assert(h.counts.compressor === 1, 'a limiter sits on the master path');
  assert(h.run('Object.keys(AudioMixer.buses).sort().join(",")') === 'ambience,music,sfx',
    'three buses exist: ambience, music, sfx');
  assert(h.run('!!AudioMixer.master && !!AudioMixer.limiter'), 'master and limiter are built');
  assert(h.run('AudioMixer.bus("sfx") !== AudioMixer.bus("music")'), 'buses are distinct nodes');
  assert(h.run('AUDIO_BUSES.indexOf("voice") < 0'),
    'voice is not a Web Audio bus — it stays on the media element so iOS cannot silence it');
  // Comments in audio.js explain why this call is avoided, so the check has to
  // run against code with the comments stripped or it matches the explanation.
  const audioCode = audioSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(audioCode.indexOf('createMediaElementSource') < 0,
    'no clip is routed through createMediaElementSource');
  assert(audioSrc.indexOf('createMediaElementSource') >= 0,
    'and the reason it is avoided is written down');
}

// ── 8. Procedural music tables ───────────────────────────────────────────────
console.log('\n--- 8. Music ---');
{
  const h = loadAudio();
  const tracks = h.run('Object.keys(MUSIC_TRACKS)');
  ['menu', 'farm', 'fishing', 'dungeon', 'arcade', 'bee'].forEach((name) => {
    assert(tracks.includes(name), 'a track exists for ' + name);
    assert(h.run('Object.keys(AMBIENCE)').includes(name) || name === 'menu',
      'an ambience bed exists for ' + name + ' (menu may have none)');
  });
  tracks.forEach((name) => {
    const t = h.run('MUSIC_TRACKS["' + name + '"]');
    assert(t.motif.length === 16, name + ' motif fills one bar of sixteenths');
    assert(t.progression.length > 0, name + ' has a chord progression');
    assert(t.bpm >= 50 && t.bpm <= 180, name + ' tempo is musical (' + t.bpm + ' bpm)');
    assert(MUSIC_SCALE_OK(h, t.scale), name + ' uses a defined scale');
    assert(t.motif.every((d) => d === -1 || (d >= 0 && d <= 8)), name + ' motif degrees are in range');
    assert(t.bassEvery >= 1 && 16 % t.bassEvery === 0, name + ' bass divides the bar evenly');
  });
  // Pentatonic on purpose: five notes with no semitone neighbours is what lets a
  // generated melody transpose across the progression without a wrong note.
  assert(h.run('MUSIC_SCALES.major_pent.length') === 5, 'major scale is pentatonic');
  assert(h.run('MUSIC_SCALES.minor_pent.length') === 5, 'minor scale is pentatonic');
  assert(Math.abs(h.run('musicMidiToHz(69)') - 440) < 1e-9, 'MIDI 69 is A440');
  assert(h.run('musicDegreeToMidi(60, "major_pent", 5)') === 72, 'degree 5 wraps to the next octave');
  assert(h.run('musicDegreeToMidi(60, "major_pent", -1)') === 57, 'a negative degree walks down an octave');
  assert(h.run('MusicDirector.play("farm")') === true, 'the director accepts a known track');
  assert(h.run('MusicDirector.play("no_such_track")') === false, 'the director refuses an unknown track');
  h.run('MusicDirector.setEnvironment({ hour: 23 })');
  assert(h.run('MusicDirector.isNight()') === true, 'hour 23 is night');
  h.run('MusicDirector.setEnvironment({ hour: 12 })');
  assert(h.run('MusicDirector.isNight()') === false, 'hour 12 is day');
  h.run('MusicDirector.setEnvironment({})');
  assert(h.run('MusicDirector.isNight()') === false, 'a reading with no hour changes nothing');
}
function MUSIC_SCALE_OK(h, scale) {
  return h.run('Object.keys(MUSIC_SCALES)').includes(scale);
}

// ── 9. Scenes ask for audio, and hand it back ────────────────────────────────
console.log('\n--- 9. Scene wiring ---');
{
  assert(manifest.includes('js/systems/music.js'), 'the music module is in js/manifest.json');
  assert(html.indexOf('js/systems/music.js') >= 0, 'the music module has a script tag');
  [['farm', 'farm'], ['arcade', 'arcade'], ['dungeon', 'dungeon'], ['fishing', 'fishing'], ['bee', 'bee']]
    .forEach(([file, track]) => {
      const src = fs.readFileSync(path.join(ROOT, 'js', 'scenes', file + '.js'), 'utf8');
      assert(src.indexOf("playSceneAudio('" + track + "')") >= 0, file + ' scene starts its own track');
    });
  ['arcade', 'dungeon', 'fishing', 'bee'].forEach((file) => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'scenes', file + '.js'), 'utf8');
    assert(/shutdown[\s\S]{0,120}playSceneAudio\('farm'\)/.test(src),
      file + ' returns the farm track on shutdown (it is launched over FarmScene)');
  });
  const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
  assert(ui.indexOf("playSceneAudio('menu')") >= 0, 'the level select plays the menu track');
  const farm = fs.readFileSync(path.join(ROOT, 'js', 'scenes', 'farm.js'), 'utf8');
  assert(farm.indexOf('MusicDirector.setEnvironment(env)') >= 0, 'the day/night cycle reaches the music');
  // A scene asks for audio before the player has clicked, so both directors
  // defer and both must be woken by the unlock handler. Ambience was missed the
  // first time and the bed never started.
  const unlockStart = audioSrc.indexOf('const unlockAudio');
  const unlockBlock = unlockStart < 0 ? '' : audioSrc.slice(unlockStart, unlockStart + 400);
  assert(unlockStart >= 0, 'the gesture unlock handler is present');
  assert(unlockBlock.indexOf('MusicDirector.onUnlock()') >= 0, 'unlock resumes deferred music');
  assert(unlockBlock.indexOf('AmbienceDirector.onUnlock()') >= 0, 'unlock resumes deferred ambience');
  // resume() is reachable from unmuting and from the tab regaining focus.
  // Neither may undo the other.
  const countIn = (hay, needle) => hay.split(needle).length - 1;
  assert(countIn(musicSrc, 'if (AudioMixer.isMuted()) return;') === 2,
    'both directors refuse to resume while muted');
  assert(countIn(musicSrc, "document.hidden) return;") === 2,
    'both directors refuse to resume while the tab is hidden');
}

// ── 10. The settings panel is wired end to end ───────────────────────────────
console.log('\n--- 10. Settings panel ---');
{
  const h = loadAudio();
  const keys = h.run('AUDIO_SLIDERS.map(s => s.key)');
  assert(keys.length === 5, 'five faders: master, music, ambience, effects, voice');
  keys.forEach((k) => {
    assert(html.indexOf('id="audio-vol-' + k + '"') >= 0, 'panel has a slider for ' + k);
    assert(html.indexOf('id="audio-val-' + k + '"') >= 0, 'panel shows a readout for ' + k);
    assert(html.indexOf("setAudioVolume('" + k + "'") >= 0, k + ' slider is wired to setAudioVolume');
    assert(k in h.run('AUDIO_DEFAULTS'), k + ' has a default');
    assert(h.run('AUDIO_KEYS["' + k + '"]').indexOf('hv_') === 0, k + ' has a storage key');
  });
  assert(html.indexOf('id="audio-mute-btn"') >= 0, 'panel has a mute switch');
  assert(html.indexOf('id="audio-speech-btn"') >= 0, 'panel has the Korean pronunciation switch');
  assert(html.indexOf('id="audio-overlay"') >= 0, 'the overlay exists');
  assert(html.indexOf('onclick="openAudioSettings()') >= 0, 'the HUD button opens the panel');
  // The button used to carry .tts-only, which hid it on a device with no Korean
  // system voice. It is now the only route to the mixer, so it must always show.
  const btn = html.match(/<button[^>]*id="tts-toggle-btn"[^>]*>/);
  assert(!!btn, 'the HUD audio button exists');
  assert(btn && btn[0].indexOf('tts-only') < 0, 'the HUD audio button is no longer hidden without a Korean voice');
  assert(css.indexOf('#audio-overlay') >= 0 && css.indexOf('.audio-slider') >= 0, 'the panel is styled');
  assert(css.indexOf('::-webkit-slider-thumb') >= 0 && css.indexOf('::-moz-range-thumb') >= 0,
    'sliders are styled for both vendor prefixes');
}

// ── 11. The TTS contract other tests rely on is intact ───────────────────────
console.log('\n--- 11. Korean voice contract ---');
{
  assert(audioSrc.indexOf("const TTS_CACHE_KEY = 'sunhi-1'") >= 0, 'clip cache key is unchanged');
  assert(audioSrc.indexOf("TTS_CLIP_DIR = 'audio/ko/'") >= 0, 'clip directory is unchanged');
  assert(audioSrc.indexOf('function ttsClipStem') >= 0, 'ttsClipStem is still exported');
  assert(audioSrc.indexOf('this._playClip') >= 0, 'CDN clips are still tried before speech synthesis');
  const h = loadAudio();
  assert(h.run("ttsClipUrl('한국어').indexOf('audio/ko/') === 0"), 'clip URLs still point at audio/ko');
  h.run('AudioMixer.init()');
  h.run('AudioMixer.setMuted(true)');
  assert(h.run("KoreanTTS.speak('한국어')") === false, 'mute stops Korean speech as well as sound effects');
  assert(h.run("KoreanTTS.spell('한국어')") === false, 'mute stops syllable spelling too');
}

// ── Silence at the study desk ───────────────────────────────────────────────
console.log('\n--- Music holds while the desk is open ---');
{
  const h = loadAudio();
  h.run('AudioMixer.init()');
  h.run('playSceneAudio("farm")');
  assert(h.run('MusicDirector.playing()') === true, 'the farm has a track before the desk opens');
  assert(h.run('AmbienceDirector.playing()') === true, 'and an ambience bed');

  h.run('MusicDirector.hold(); AmbienceDirector.hold()');
  assert(h.run('MusicDirector.playing()') === false, 'the hold parks the sequencer');
  assert(h.run('AmbienceDirector.playing()') === false, 'and the ambience bed');
  assert(h.run('MusicDirector.held()') === true, 'and the hold is readable');

  // The reasons music stops and starts have to stack rather than cancel: none
  // of them may put a track back under an open workbook.
  h.run('MusicDirector.resume(); AmbienceDirector.resume()');
  assert(h.run('MusicDirector.playing()') === false, 'a plain resume does not lift the hold');
  h.run('AudioMixer.setMuted(true); AudioMixer.setMuted(false)');
  assert(h.run('MusicDirector.playing()') === false, 'nor does unmuting at the desk');
  assert(h.run('AmbienceDirector.playing()') === false, 'nor for the ambience');
  h.run('MusicDirector.onUnlock(); AmbienceDirector.onUnlock()');
  assert(h.run('MusicDirector.playing()') === false, 'nor an audio-context unlock');
  // A scene re-announcing its own track is the one that would slip through
  // play(), which does not go via resume() at all.
  assert(h.run('MusicDirector.play("arcade")') === true, 'a held director still accepts a track');
  assert(h.run('MusicDirector.playing()') === false, 'but does not start it');
  h.run('playSceneAudio("farm")');
  assert(h.run('MusicDirector.playing()') === false, 'playSceneAudio cannot restart it either');
  assert(h.run('AmbienceDirector.playing()') === false, 'on either director');

  h.run('MusicDirector.release(); AmbienceDirector.release()');
  assert(h.run('MusicDirector.playing()') === true, 'leaving the desk gives the music back');
  assert(h.run('AmbienceDirector.playing()') === true, 'and the ambience');
  assert(h.run('MusicDirector.current()') === 'farm',
    'and it comes back as the track that was queued while held');

  // Muted before the desk, still muted after it.
  const m = loadAudio();
  m.run('AudioMixer.init()');
  m.run('playSceneAudio("farm")');
  m.run('AudioMixer.setMuted(true)');
  m.run('MusicDirector.hold()');
  m.run('MusicDirector.release()');
  assert(m.run('MusicDirector.playing()') === false,
    'releasing the hold does not unmute a player who muted themselves');
}

console.log('\n--- The desk drives the hold off the modal stack ---');
{
  const ui = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
  assert(/const STUDY_OVERLAYS = \[[^\]]*desk-menu-overlay/.test(ui)
    && /STUDY_OVERLAYS = \[[^\]]*workbook-overlay/.test(ui)
    && /STUDY_OVERLAYS = \[[^\]]*desk-quiz-overlay/.test(ui),
    'all three desk screens count as study');
  const sync = ui.slice(ui.indexOf('function syncStudyQuiet'), ui.indexOf('function setModalState'));
  assert(sync.indexOf('activeModalStack.some') >= 0,
    'the hold is decided from the modal stack, not counted up and down per screen');
  assert(sync.indexOf('d.hold()') >= 0 && sync.indexOf('d.release()') >= 0,
    'and both directions are wired');
  const setModal = ui.slice(ui.indexOf('function setModalState'), ui.indexOf('function closeTopModal'));
  assert(setModal.indexOf('syncStudyQuiet()') >= 0,
    'every open and close runs through it, so chaining the desk screens cannot desync');
  assert((setModal.match(/syncStudyQuiet\(\)/g) || []).length === 1,
    'once, at the end, after the stack has been updated');
}

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
