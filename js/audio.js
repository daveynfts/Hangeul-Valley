// ═══════════════ AUDIO MIXER ══════════════════════════════════════════════════
//
//   sfx voices ─┐
//   music ──────┼→ bus gain → master gain → limiter → destination
//   ambience ───┘
//
// Every sound used to connect straight to ctx.destination carrying its own
// hardcoded gain. Three things followed from that. The 🔇 button muted Korean
// speech but not the 89 click sites, so "muted" was not muted. Nothing stopped a
// harvest arpeggio, a level-up run and a click from summing past full scale. And
// there was nowhere to put a volume control, so there wasn't one.
//
// Korean voice deliberately does NOT run through this graph. The clips are
// HTMLAudioElements, and routing one through createMediaElementSource() makes its
// playback depend on the AudioContext already running. On iOS the context starts
// suspended, so a learner who taps a word as their first interaction would get
// silence where they currently get speech. Voice level is set on the element
// instead, and the graph reacts to voice by ducking everything else. Same audible
// result, none of the risk.

const AUDIO_KEYS = {
  master: 'hv_vol_master', music: 'hv_vol_music', ambience: 'hv_vol_ambience',
  sfx: 'hv_vol_sfx', voice: 'hv_vol_voice', muted: 'hv_audio_muted'
};
const AUDIO_DEFAULTS = { master: 0.8, music: 0.4, ambience: 0.5, sfx: 0.8, voice: 1 };
// voice is absent on purpose — it is an HTMLAudioElement level, not a bus.
const AUDIO_BUSES = ['music', 'ambience', 'sfx'];

// How far each bus drops while Korean is speaking. Voice is the reason this game
// exists, so the duck is deep rather than polite: a click at full level over a
// two-syllable word is exactly the collision that makes a learner replay it.
const AUDIO_DUCK = {
  music: 0.22, ambience: 0.5, sfx: 0.4,
  attack: 0.1, release: 0.45, tail: 0.22,
  // Longer than any single clip or spelled word, short enough that a duck which
  // loses its end event heals before the player wonders where the music went.
  maxHold: 6
};
const AUDIO_MAX_VOICES = 16;

const AudioMixer = {
  ctx: null,
  master: null,
  limiter: null,
  buses: Object.create(null),
  vol: Object.assign({}, AUDIO_DEFAULTS),
  muted: false,
  _ducked: false,
  _duckTimer: null,
  _duckMax: null,
  _voices: 0,
  _lastAt: Object.create(null),
  _dropped: 0,

  _clamp(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  },

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? this._clamp(n) : fallback;
    } catch { return fallback; }
  },

  load() {
    Object.keys(AUDIO_DEFAULTS).forEach((name) => {
      this.vol[name] = this._read(AUDIO_KEYS[name], AUDIO_DEFAULTS[name]);
    });
    try { this.muted = localStorage.getItem(AUDIO_KEYS.muted) === '1'; } catch { this.muted = false; }
    return this;
  },

  _persist(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  },

  ready() { return !!this.ctx; },

  // Built on the first gesture rather than at load, because a context created
  // before any interaction starts suspended and Safari counts it against the
  // page either way.
  init() {
    if (!this.ctx) {
      const AudioCtx = (typeof window !== 'undefined')
        && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.limiter = this.ctx.createDynamicsCompressor();
      // A safety limiter, not a sound: it should only engage when several
      // sounds land together, which on this graph is a click over a fanfare.
      this._set(this.limiter.threshold, -6);
      this._set(this.limiter.knee, 6);
      this._set(this.limiter.ratio, 12);
      this._set(this.limiter.attack, 0.003);
      this._set(this.limiter.release, 0.15);
      this.master.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
      AUDIO_BUSES.forEach((name) => {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.buses[name] = g;
      });
      this.apply(0);
    }
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch {}
    }
    return this.ctx;
  },

  _set(param, value) {
    if (param && typeof param.value === 'number') param.value = value;
    else if (param) param.value = value;
  },

  bus(name) {
    if (!this.ctx) this.init();
    return this.buses[name] || this.master || null;
  },

  // The level a bus should currently sit at: its own slider, scaled by master,
  // by the duck if voice is speaking, and zeroed by mute.
  target(name) {
    if (this.muted) return 0;
    const own = this._clamp(this.vol[name]);
    const duck = this._ducked ? (AUDIO_DUCK[name] !== undefined ? AUDIO_DUCK[name] : 1) : 1;
    return own * this._clamp(this.vol.master) * duck;
  },

  apply(ramp = 0.08) {
    if (!this.ctx) return;
    // master carries 1 and the buses carry the product, so one exposed knob
    // cannot be defeated by another writing the same param.
    this._ramp(this.master.gain, this.muted ? 0 : 1, ramp);
    AUDIO_BUSES.forEach((name) => {
      const g = this.buses[name];
      if (g) this._ramp(g.gain, this.target(name), ramp);
    });
  },

  _ramp(param, to, ramp) {
    if (!param) return;
    const now = this.ctx.currentTime;
    try {
      param.cancelScheduledValues(now);
      // Linear, never exponential: a bus legitimately sits at 0 when muted and
      // exponentialRampToValueAtTime(0) throws.
      param.setValueAtTime(param.value, now);
      if (ramp > 0) param.linearRampToValueAtTime(to, now + ramp);
      else param.setValueAtTime(to, now);
    } catch {
      try { param.value = to; } catch {}
    }
  },

  getVolume(name) { return this._clamp(this.vol[name]); },

  setVolume(name, value) {
    if (!(name in AUDIO_DEFAULTS)) return this;
    this.vol[name] = this._clamp(value);
    this._persist(AUDIO_KEYS[name], this.vol[name]);
    this.apply();
    if (name === 'voice' || name === 'master') this._applyVoice();
    return this;
  },

  isMuted() { return !!this.muted; },

  setMuted(on) {
    this.muted = !!on;
    this._persist(AUDIO_KEYS.muted, this.muted ? '1' : '0');
    this.apply(0.06);
    this._applyVoice();
    if (this.muted && typeof KoreanTTS !== 'undefined') KoreanTTS.stop();
    // Zero gain silences the generators but does not stop them. A muted player
    // was still paying for nine oscillators a second plus the ambience bed, so
    // mute parks the directors outright and unmuting starts them again.
    if (typeof MusicDirector !== 'undefined') {
      if (this.muted) MusicDirector.pause(); else MusicDirector.resume();
    }
    if (typeof AmbienceDirector !== 'undefined') {
      if (this.muted) AmbienceDirector.pause(); else AmbienceDirector.resume();
    }
    return this.muted;
  },

  toggleMuted() { return this.setMuted(!this.muted); },

  // The level any voice clip should play at. Mute has to reach the HTMLAudio
  // element too, since it is outside the graph the master gain controls.
  voiceLevel() {
    if (this.muted) return 0;
    return this._clamp(this.vol.voice) * this._clamp(this.vol.master);
  },

  _applyVoice() {
    if (typeof KoreanTTS !== 'undefined' && KoreanTTS._applyLevel) KoreanTTS._applyLevel();
  },

  // Called when voice starts and ends. Ends are not always observable — a
  // cancelled utterance may never fire onend — so the tail is a timer, and a
  // second voiceStart simply pushes it back.
  voiceStart() {
    if (!this.ctx) return;
    this._ducked = true;
    this.apply(AUDIO_DUCK.attack);
    if (this._duckTimer) { clearTimeout(this._duckTimer); this._duckTimer = null; }
    // The end of speech is not reliably observable. A cancelled utterance can
    // skip onend, a device with no Korean voice never starts one at all, and a
    // clip whose fallback also fails reports nothing. Any of those would hold
    // the duck for the rest of the session, so the ceiling releases it even
    // when no end ever arrives. Each new utterance pushes the ceiling back.
    if (this._duckMax) clearTimeout(this._duckMax);
    this._duckMax = setTimeout(() => { this._duckMax = null; this._release(); }, AUDIO_DUCK.maxHold * 1000);
  },

  _release() {
    this._duckTimer = null;
    this._ducked = false;
    this.apply(AUDIO_DUCK.release);
  },

  voiceEnd() {
    if (!this.ctx) return;
    if (this._duckTimer) clearTimeout(this._duckTimer);
    this._duckTimer = setTimeout(() => {
      if (this._duckMax) { clearTimeout(this._duckMax); this._duckMax = null; }
      this._release();
    }, AUDIO_DUCK.tail * 1000);
  },

  isDucked() { return !!this._ducked; },

  // Two guards, both of which the old engine lacked. `minGap` stops a held
  // pointer turning one sound into a buzzsaw; the voice cap stops a burst from
  // scheduling more oscillators than the graph can carry cleanly.
  allow(type, minGap) {
    const now = (this.ctx && this.ctx.currentTime) || (Date.now() / 1000);
    const last = this._lastAt[type];
    if (minGap && last !== undefined && now - last < minGap) return false;
    if (this._voices >= AUDIO_MAX_VOICES) { this._dropped++; return false; }
    this._lastAt[type] = now;
    return true;
  },

  hold(seconds) {
    this._voices++;
    const ms = Math.max(30, (seconds || 0.2) * 1000 + 40);
    setTimeout(() => { this._voices = Math.max(0, this._voices - 1); }, ms);
  },

  stats() { return { voices: this._voices, dropped: this._dropped, ducked: this._ducked }; }
};

// ═══════════════ SFX LIBRARY ══════════════════════════════════════════════════
//
// Sounds are data, not an if/else chain. The chain is how the game ended up
// calling three sounds — pickup, fanfare, complete — that fell off the end of it
// and played nothing: nothing tied the set the game asks for to the set the
// engine can make. tests/test_audio.js now asserts those two sets are equal in
// both directions, so neither a dead call nor a dead entry can survive a commit.
//
// A layer is one of:
//   { osc, from, to, dur, at, gain, wave }   a tone, optionally gliding from→to
//   { noise, band, to, dur, at, gain, q }    a band-passed noise burst
//   { seq, step, dur, at, gain, wave }       a sequence of tones, one per step
const SFX = {
  // 89 call sites, so this one is quiet, short, and rate limited.
  click: { gain: 0.10, minGap: 0.035, layers: [
    { osc: 800, to: 1600, dur: 0.04, wave: 'square' }
  ]},

  // Was called from farm.js and produced nothing.
  pickup: { gain: 0.14, minGap: 0.05, layers: [
    { osc: 1046.5, to: 1396.9, dur: 0.07, wave: 'square' },
    { noise: true, band: 3000, to: 1800, dur: 0.03, gain: 0.35, q: 2 }
  ]},

  harvest: { gain: 0.18, layers: [
    { seq: [659.25, 987.77, 1318.51], step: 0.06, dur: 0.12, wave: 'triangle' }
  ]},

  fishing_pull: { gain: 0.18, minGap: 0.06, layers: [
    { osc: 200, to: 800, dur: 0.15, wave: 'sawtooth', curve: 'linear' }
  ]},

  sword_swing: { gain: 0.22, minGap: 0.05, layers: [
    { noise: true, band: 1200, to: 300, dur: 0.12, q: 1.2 }
  ]},

  quiz_correct: { gain: 0.16, layers: [
    { seq: [523.25, 659.25, 783.99, 1046.5], step: 0.07, dur: 0.18, wave: 'square' }
  ]},

  quiz_wrong: { gain: 0.18, layers: [
    { seq: [150, 120], step: 0.1, dur: 0.15, wave: 'sawtooth' }
  ]},

  // Distinct from quiz_wrong on purpose. A locked zone is not a wrong answer,
  // and economy.js was telling the player it was.
  denied: { gain: 0.16, minGap: 0.08, layers: [
    { osc: 300, to: 180, dur: 0.11, wave: 'square' },
    { noise: true, band: 500, to: 240, dur: 0.09, gain: 0.3, q: 1.5 }
  ]},

  coin: { gain: 0.12, minGap: 0.05, layers: [
    { seq: [1567.98, 2093.0], step: 0.045, dur: 0.09, wave: 'square' }
  ]},

  levelup: { gain: 0.18, layers: [
    { seq: [523.25, 659.25, 783.99, 1046.5, 1318.51], step: 0.08, dur: 0.28, wave: 'triangle' }
  ]},

  // Was called from overlays.js and produced nothing. Softer than levelup: it
  // marks finishing a step, not gaining a rank.
  complete: { gain: 0.16, layers: [
    { seq: [783.99, 1046.5, 1318.51], step: 0.075, dur: 0.22, wave: 'triangle' },
    { osc: 392.0, dur: 0.4, at: 0.15, gain: 0.5, wave: 'triangle' }
  ]},

  // Also silent until now, and it is the biggest moment the game has.
  fanfare: { gain: 0.2, layers: [
    { seq: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98], step: 0.085, dur: 0.3, wave: 'square' },
    { seq: [261.63, 329.63, 392.0], step: 0.17, dur: 0.5, gain: 0.55, wave: 'triangle' },
    { osc: 2093.0, dur: 0.9, at: 0.51, gain: 0.35, wave: 'triangle' },
    { noise: true, band: 6000, to: 3000, dur: 0.5, at: 0.5, gain: 0.12, q: 0.8 }
  ]}
};

function _sfxNoiseBuffer(ctx, seconds) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function _sfxEnvelope(ctx, gain, peak, t0, dur) {
  // 4ms of attack rather than an instant jump: a square starting at full
  // amplitude is the click-on-top-of-the-click that made stacked SFX harsh.
  const attack = Math.min(0.004, dur * 0.25);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function _sfxTone(ctx, dest, t0, freq, to, dur, wave, peak, curve) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (to && to !== freq) {
    if (curve === 'linear') osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  }
  _sfxEnvelope(ctx, gain, peak, t0, dur);
  osc.connect(gain); gain.connect(dest);
  osc.start(t0); osc.stop(t0 + dur + 0.01);
}

function _sfxNoise(ctx, dest, t0, band, to, dur, peak, q) {
  const src = ctx.createBufferSource();
  src.buffer = _sfxNoiseBuffer(ctx, dur + 0.02);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q || 1;
  filter.frequency.setValueAtTime(band, t0);
  if (to && to !== band) filter.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  const gain = ctx.createGain();
  _sfxEnvelope(ctx, gain, peak, t0, dur);
  src.connect(filter); filter.connect(gain); gain.connect(dest);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

function sfxDuration(name) {
  const def = SFX[name];
  if (!def) return 0;
  return def.layers.reduce((max, l) => {
    const at = l.at || 0;
    const span = l.seq ? (l.seq.length - 1) * (l.step || 0.06) + (l.dur || 0.1) : (l.dur || 0.1);
    return Math.max(max, at + span);
  }, 0);
}

function playChiptuneSFX(type) {
  const def = SFX[type];
  if (!def) return false;
  if (AudioMixer.muted) return false;
  if (!AudioMixer.allow(type, def.minGap)) return false;
  const ctx = AudioMixer.init();
  if (!ctx) return false;
  const dest = AudioMixer.bus('sfx');
  if (!dest) return false;
  const now = ctx.currentTime;
  const base = def.gain === undefined ? 0.15 : def.gain;
  def.layers.forEach((l) => {
    const t0 = now + (l.at || 0);
    const peak = base * (l.gain === undefined ? 1 : l.gain);
    if (l.noise) {
      _sfxNoise(ctx, dest, t0, l.band, l.to, l.dur || 0.1, peak, l.q);
    } else if (l.seq) {
      l.seq.forEach((f, i) => {
        _sfxTone(ctx, dest, t0 + i * (l.step || 0.06), f, l.to, l.dur || 0.12, l.wave, peak, l.curve);
      });
    } else {
      _sfxTone(ctx, dest, t0, l.osc, l.to, l.dur || 0.1, l.wave, peak, l.curve);
    }
  });
  AudioMixer.hold(sfxDuration(type));
  return true;
}

// Kept because the audit harnesses in .agents/ reach for it by name.
const ChiptuneSynth = {
  get ctx() { return AudioMixer.ctx; },
  init() { return AudioMixer.init(); },
  play(type) { return playChiptuneSFX(type); }
};

// ═══════════════ KOREAN PRONUNCIATION ═══════════════════════════════════════
// Primary: pre-rendered SunHi MP3s on the CDN (audio/ko/<utf8-hex>.mp3).
// Fallback: Web Speech API ko-KR, for a missing clip or a device that cannot
// play HTML audio. The stem helper must stay in lockstep with scripts/ttsClips.js.
const TTS_CLIP_DIR = 'audio/ko/';
const TTS_CACHE_KEY = 'sunhi-1';
function ttsClipStem(text) {
  const nfc = String(text || '').normalize('NFC');
  const bytes = (typeof TextEncoder !== 'undefined')
    ? new TextEncoder().encode(nfc)
    : [];
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += (bytes[i] + 256).toString(16).slice(1);
  return hex;
}
function ttsClipUrl(text) {
  return TTS_CLIP_DIR + ttsClipStem(text) + '.mp3?v=' + encodeURIComponent(TTS_CACHE_KEY);
}

const KoreanTTS = {
  _voice: null,
  _ready: false,
  _warned: false,
  _pendingSpeak: null,
  _speakTimer: null,
  _clip: null,
  enabled: true,

  supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance === 'function';
  },

  clipsSupported() {
    return typeof Audio !== 'undefined';
  },

  // Toggling the root class hides every .tts-only control at once. Written defensively
  // because the Node test harnesses run game.js against a partial document stub.
  _markAvailability() {
    try {
      const root = typeof document !== 'undefined' && document.documentElement;
      if (root && root.classList) root.classList.toggle('tts-unavailable', !this.isAvailable());
    } catch {}
  },

  _pickVoice(voices) {
    const list = voices || [];
    const lang = v => (v.lang || '').replace(/_/g, '-').toLowerCase();
    const label = v => ((v.name || '') + ' ' + (v.lang || '')).toLowerCase();
    return list.find(v => lang(v) === 'ko-kr')
      || list.find(v => lang(v).startsWith('ko'))
      || list.find(v => /korean|heami|google 한국|yuna|sora/.test(label(v)))
      || null;
  },

  refreshVoice() {
    if (!this.supported()) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    this._voice = this._pickVoice(voices);
    this._ready = true;
    if (!this._voice && !this._warned) {
      this._warned = true;
      console.info('[TTS] No Korean system voice — CDN clips still play.');
    }
    this._markAvailability();
    if (this._pendingSpeak) {
      const queued = this._pendingSpeak;
      this._pendingSpeak = null;
      this.speak(queued);
    }
  },

  isAvailable() {
    return this.clipsSupported() || (this.supported() && !!this._voice);
  },

  init() {
    try { this.enabled = localStorage.getItem('hv_tts_enabled') !== '0'; } catch { this.enabled = true; }
    this._markAvailability();
    if (!this.supported()) return;
    this.refreshVoice();
    try { window.speechSynthesis.onvoiceschanged = () => this.refreshVoice(); } catch {}
    setTimeout(() => this.refreshVoice(), 400);
    setTimeout(() => this.refreshVoice(), 1500);
  },

  // Mute and the voice slider both live outside the Web Audio graph, so they
  // have to be written onto the element that is actually playing.
  _applyLevel() {
    if (this._clip) {
      try { this._clip.volume = AudioMixer.voiceLevel(); } catch {}
    }
  },

  _clearSpeakTimer() {
    if (this._speakTimer) {
      clearTimeout(this._speakTimer);
      this._speakTimer = null;
    }
  },

  unlock() {
    if (!this.supported()) return;
    try { window.speechSynthesis.getVoices(); } catch {}
    this.refreshVoice();
  },

  stop() {
    if (this._clip) {
      try { this._clip.onended = null; this._clip.onerror = null; this._clip.pause(); this._clip.removeAttribute('src'); } catch {}
      this._clip = null;
    }
    this._clearSpeakTimer();
    if (this.supported()) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    AudioMixer.voiceEnd();
  },

  _utterance(text, rate) {
    const u = new SpeechSynthesisUtterance(String(text).normalize('NFC'));
    u.lang = (this._voice && this._voice.lang) || 'ko-KR';
    if (this._voice) u.voice = this._voice;
    u.rate = rate;
    u.pitch = 1;
    u.volume = AudioMixer.voiceLevel();
    u.onend = () => AudioMixer.voiceEnd();
    u.onerror = (ev) => {
      AudioMixer.voiceEnd();
      const err = ev && ev.error;
      if (!err || err === 'interrupted' || err === 'canceled') return;
      console.warn('[TTS] utterance error:', err);
    };
    return u;
  },

  _speakNow(utterances) {
    if (!this.supported()) return false;
    const synth = window.speechSynthesis;
    const list = Array.isArray(utterances) ? utterances : [utterances];
    try { if (synth.paused) synth.resume(); } catch {}
    if (synth.speaking || synth.pending) {
      try { synth.cancel(); } catch {}
    }
    AudioMixer.voiceStart();
    list.forEach((u) => synth.speak(u));
    try { synth.resume(); } catch {}
    return true;
  },

  _speakWeb(text, { rate = 0.85 } = {}) {
    if (!this.supported() || !text) return false;
    this.unlock();
    try {
      this._speakNow(this._utterance(text, rate));
      return true;
    } catch (e) {
      console.warn('[TTS] speak failed:', e);
      return false;
    }
  },

  _newClip(text) {
    const a = new Audio(ttsClipUrl(text));
    a.preload = 'auto';
    try { a.volume = AudioMixer.voiceLevel(); } catch {}
    return a;
  },

  _playClip(text, opts) {
    if (!this.clipsSupported() || !text) return false;
    try {
      const a = this._newClip(text);
      this._clip = a;
      AudioMixer.voiceStart();
      a.onended = () => {
        if (this._clip === a) this._clip = null;
        AudioMixer.voiceEnd();
      };
      a.onerror = () => {
        if (this._clip !== a) return;
        this._clip = null;
        this._speakWeb(text, opts);
      };
      const play = a.play();
      if (play && typeof play.catch === 'function') {
        play.catch(() => {
          if (this._clip !== a) return;
          this._clip = null;
          this._speakWeb(text, opts);
        });
      }
      return true;
    } catch {
      AudioMixer.voiceEnd();
      return false;
    }
  },

  _playClipQueue(parts, index, opts) {
    if (!parts || index >= parts.length) {
      this._clip = null;
      AudioMixer.voiceEnd();
      return;
    }
    if (!this.clipsSupported()) {
      this._speakNow(parts.map((s) => this._utterance(s, 0.7)));
      return;
    }
    const text = parts[index];
    const a = this._newClip(text);
    this._clip = a;
    AudioMixer.voiceStart();
    a.onended = () => {
      if (this._clip !== a) return;
      this._playClipQueue(parts, index + 1, opts);
    };
    a.onerror = () => {
      if (this._clip !== a) return;
      this._clip = null;
      const rest = parts.slice(index);
      if (this.supported()) this._speakNow(rest.map((s) => this._utterance(s, 0.7)));
      else AudioMixer.voiceEnd();
    };
    const play = a.play();
    if (play && typeof play.catch === 'function') {
      play.catch(() => {
        if (this._clip !== a) return;
        this._clip = null;
        if (this.supported()) this._speakNow(parts.slice(index).map((s) => this._utterance(s, 0.7)));
        else AudioMixer.voiceEnd();
      });
    }
  },

  speak(text, { rate = 0.85, force = false } = {}) {
    if (!text) return false;
    if (!this.enabled && !force) return false;
    if (AudioMixer.muted) return false;
    this._pendingSpeak = null;
    this.stop();
    if (this._playClip(text, { rate, force })) return true;
    return this._speakWeb(text, { rate, force });
  },

  spell(text, { force = false } = {}) {
    if (!text) return false;
    if (!this.enabled && !force) return false;
    if (AudioMixer.muted) return false;
    const syls = String(text).normalize('NFC').split('').filter(c => {
      const n = c.charCodeAt(0);
      return n >= 0xac00 && n <= 0xd7a3;
    });
    if (!syls.length) return this.speak(text, { force });
    this._pendingSpeak = null;
    this.stop();
    if (this.clipsSupported()) {
      this._playClipQueue(syls, 0, { force });
      return true;
    }
    if (!this.supported()) return false;
    this.unlock();
    try {
      this._speakNow(syls.map((s) => this._utterance(s, 0.7)));
      return true;
    } catch (e) {
      console.warn('[TTS] spell failed:', e);
      return false;
    }
  },

  setEnabled(on) {
    this.enabled = !!on;
    try { localStorage.setItem('hv_tts_enabled', this.enabled ? '1' : '0'); } catch {}
    if (!this.enabled) this.stop();
    return this.enabled;
  }
};

// Convenience wrappers used by the UI.
function speakKorean(text, opts) { return KoreanTTS.speak(text, opts); }
function spellKorean(text, opts) { return KoreanTTS.spell(text, opts); }

// ═══════════════ AUDIO SETTINGS PANEL ═════════════════════════════════════════
// The HUD button used to be a bare Korean-pronunciation toggle, and it carried
// .tts-only — so on a device with no Korean system voice it hid itself. That was
// survivable while it only controlled speech; it is not once it is the only way
// to reach the mixer. The button opens this panel instead, and the speech toggle
// is one row inside it.
const AUDIO_SLIDERS = [
  { key: 'master',   label: 'Master',  icon: '🎚️' },
  { key: 'music',    label: 'Music',   icon: '🎵' },
  { key: 'ambience', label: 'Ambience', icon: '🌿' },
  { key: 'sfx',      label: 'Effects', icon: '🔔' },
  { key: 'voice',    label: 'Korean voice', icon: '🗣️' }
];

function syncAudioPanel() {
  try {
    if (typeof document === 'undefined' || !document.getElementById) return;
    AUDIO_SLIDERS.forEach(({ key }) => {
      const input = document.getElementById('audio-vol-' + key);
      if (input) input.value = String(Math.round(AudioMixer.getVolume(key) * 100));
      const out = document.getElementById('audio-val-' + key);
      if (out) out.textContent = Math.round(AudioMixer.getVolume(key) * 100) + '%';
    });
    const mute = document.getElementById('audio-mute-btn');
    if (mute) {
      const on = AudioMixer.isMuted();
      mute.textContent = on ? '🔇 Sound is off' : '🔊 Sound is on';
      mute.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (mute.classList && mute.classList.toggle) mute.classList.toggle('audio-off', on);
    }
    const speech = document.getElementById('audio-speech-btn');
    if (speech) {
      const on = !!KoreanTTS.enabled;
      speech.textContent = on ? '🗣️ Pronunciation on' : '🔇 Pronunciation off';
      speech.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (speech.classList && speech.classList.toggle) speech.classList.toggle('audio-off', !on);
    }
  } catch {}
}

function setAudioVolume(key, value) {
  AudioMixer.setVolume(key, Number(value) / 100);
  syncAudioPanel();
  syncTTSButton();
}

function toggleAudioMute() {
  const on = AudioMixer.toggleMuted();
  syncAudioPanel();
  syncTTSButton();
  if (typeof showToast === 'function') {
    showToast(on ? '🔇 Sound off' : '🔊 Sound on', 1500);
  }
  if (!on) playChiptuneSFX('click');
  return on;
}

// setModalState lives in ui.js, which loads after this file but is defined long
// before anyone can click. Going through it rather than toggling .visible directly
// is what puts the panel on the modal stack, so Escape closes it and the farmer
// stops walking while it is open.
function openAudioSettings() {
  AudioMixer.init();
  playChiptuneSFX('click');
  syncAudioPanel();
  if (typeof setModalState === 'function') { setModalState('audio-overlay', true); return; }
  const ov = typeof document !== 'undefined' && document.getElementById('audio-overlay');
  if (ov && ov.classList) ov.classList.add('visible');
}

function closeAudioSettings() {
  playChiptuneSFX('click');
  if (typeof setModalState === 'function') { setModalState('audio-overlay', false); return; }
  const ov = typeof document !== 'undefined' && document.getElementById('audio-overlay');
  if (ov && ov.classList) ov.classList.remove('visible');
}

// Reflect the mute state on the HUD button. Purely cosmetic, and it runs at
// load time, so a partial DOM (the Node test harnesses stub one) must never break boot.
function syncTTSButton() {
  try {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const btn = document.getElementById('tts-toggle-btn');
    if (!btn) return;
    const on = !AudioMixer.isMuted();
    const inMenu = btn.classList && btn.classList.contains('hud-overflow-item');
    const label = on ? 'Audio' : 'Muted';
    if (typeof hudIconHtml === 'function' && inMenu) {
      btn.setAttribute('data-hud-label', label);
      btn.innerHTML = hudIconHtml('audio', on ? '🔊' : '🔇', 18) +
        '<span class="hud-overflow-label">' + label + '</span>';
    } else {
      btn.textContent = on
        ? (inMenu ? '🔊 Audio' : '🔊')
        : (inMenu ? '🔇 Muted' : '🔇');
    }
    if (btn.classList && btn.classList.toggle) btn.classList.toggle('hud-btn-off', !on);
  } catch {}
}

function toggleTTS() {
  const on = KoreanTTS.setEnabled(!KoreanTTS.enabled);
  syncAudioPanel();
  syncTTSButton();
  if (typeof showToast === 'function') {
    showToast(on ? '🔊 Korean pronunciation on' : '🔇 Korean pronunciation muted', 1800);
  }
  if (on) speakKorean('한국어');
  return on;
}

if (typeof window !== 'undefined') {
  AudioMixer.load();
  KoreanTTS.init();
  window.AudioMixer = AudioMixer;
  window.SFX = SFX;
  window.playChiptuneSFX = playChiptuneSFX;
  window.sfxDuration = sfxDuration;
  window.ChiptuneSynth = ChiptuneSynth;
  window.KoreanTTS = KoreanTTS;
  window.speakKorean = speakKorean;
  window.spellKorean = spellKorean;
  window.toggleTTS = toggleTTS;
  window.syncTTSButton = syncTTSButton;
  window.syncAudioPanel = syncAudioPanel;
  window.setAudioVolume = setAudioVolume;
  window.toggleAudioMute = toggleAudioMute;
  window.openAudioSettings = openAudioSettings;
  window.closeAudioSettings = closeAudioSettings;
  window.ttsClipStem = ttsClipStem;
  window.ttsClipUrl = ttsClipUrl;

  // A context created before any gesture starts suspended, and browsers may
  // suspend it again when the tab is backgrounded, so this stays subscribed
  // rather than unbinding after the first hit.
  const unlockAudio = () => {
    AudioMixer.init();
    if (typeof MusicDirector !== 'undefined') MusicDirector.onUnlock();
    if (typeof AmbienceDirector !== 'undefined') AmbienceDirector.onUnlock();
  };
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  window.addEventListener('keydown', unlockAudio, { capture: true });

  // The HUD is built later in the file, so wait for the DOM before touching the button.
  if (typeof document !== 'undefined' && document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', syncTTSButton, { once: true });
  } else {
    syncTTSButton();
  }
}
