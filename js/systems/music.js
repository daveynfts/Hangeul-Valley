// ═══════════════ PROCEDURAL MUSIC & AMBIENCE ══════════════════════════════════
//
// Generated rather than streamed. The game ships no audio assets beyond the
// Korean clips, the stylistic target is the same square/triangle vocabulary the
// SFX already use, and a scheduler that writes its own notes can answer game
// state — which room you are in, whether it is night on the farm — in a way a
// looped file cannot. It also costs zero bytes and no licence.
//
// Both directors hang off the mixer's own buses, so the Music and Ambience
// sliders, mute, and the duck that fires while Korean is speaking all apply to
// them without either director knowing those features exist.

// Pentatonic throughout. Korean traditional music is pentatonic, and so is most
// chiptune that has to loop for an hour without grating: with no semitone
// neighbours, a wrong-sounding note is close to unreachable.
const MUSIC_SCALES = {
  major_pent: [0, 2, 4, 7, 9],
  minor_pent: [0, 3, 5, 7, 10]
};

// motif values index the scale; -1 is a rest. 16 slots to the bar (16th notes).
// progression transposes the whole bar by a scale degree, which is what gives a
// four-bar loop somewhere to go.
const MUSIC_TRACKS = {
  menu: {
    root: 57, scale: 'major_pent', bpm: 74, lead: 'triangle', bass: 'triangle',
    progression: [0, 3, 4, 3],
    motif: [0, -1, 2, -1, 4, -1, 2, -1, 3, -1, 2, -1, 0, -1, -1, -1],
    bassEvery: 8, drums: false, leadGain: 0.5, bassGain: 0.55
  },
  farm: {
    root: 60, scale: 'major_pent', bpm: 96, lead: 'square', bass: 'triangle',
    progression: [0, 2, 3, 1],
    motif: [0, 2, 4, 2, 3, -1, 2, 0, 1, 2, 3, -1, 4, 2, 0, -1],
    bassEvery: 4, drums: true, leadGain: 0.42, bassGain: 0.6
  },
  fishing: {
    root: 55, scale: 'major_pent', bpm: 64, lead: 'triangle', bass: 'triangle',
    progression: [0, 4, 2, 4],
    motif: [0, -1, -1, 2, -1, -1, 4, -1, -1, 3, -1, -1, 2, -1, -1, -1],
    bassEvery: 16, drums: false, leadGain: 0.45, bassGain: 0.5
  },
  dungeon: {
    root: 48, scale: 'minor_pent', bpm: 104, lead: 'square', bass: 'sawtooth',
    progression: [0, 0, 3, 2],
    motif: [0, -1, 1, 0, 3, -1, 2, -1, 0, -1, 1, 0, 4, 3, 2, -1],
    bassEvery: 2, drums: true, leadGain: 0.36, bassGain: 0.42
  },
  arcade: {
    root: 62, scale: 'major_pent', bpm: 132, lead: 'square', bass: 'square',
    progression: [0, 1, 3, 4],
    motif: [0, 2, 1, 3, 2, 4, 3, 2, 0, 2, 1, 3, 4, 3, 2, 1],
    bassEvery: 2, drums: true, leadGain: 0.34, bassGain: 0.4
  },
  bee: {
    root: 64, scale: 'major_pent', bpm: 116, lead: 'square', bass: 'triangle',
    progression: [0, 2, 4, 2],
    motif: [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 2, 3, 1, 0, -1],
    bassEvery: 4, drums: false, leadGain: 0.34, bassGain: 0.5
  }
};

const MUSIC_LOOKAHEAD = 0.18;   // seconds of notes to keep scheduled ahead
const MUSIC_TICK_MS = 25;
const MUSIC_CROSSFADE = 1.1;

function musicMidiToHz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

// A scale index can run past the end of the scale; wrap it and carry the
// remainder into octaves so a motif of 0..4 can be transposed without clamping.
function musicDegreeToMidi(root, scale, degree) {
  const steps = MUSIC_SCALES[scale] || MUSIC_SCALES.major_pent;
  const len = steps.length;
  const oct = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return root + steps[idx] + oct * 12;
}

const MusicDirector = {
  _track: null,
  _name: null,
  _gain: null,
  _prev: null,
  _timer: null,
  _step: 0,
  _bar: 0,
  _nextAt: 0,
  _night: false,
  _paused: false,

  ctx() { return AudioMixer.ctx; },

  // Called when the mixer's context first exists, and again on later gestures.
  // Music that was requested before any interaction starts here.
  onUnlock() {
    if (this._name && !this._timer && !this._paused) this._start(this._name);
  },

  // Day and night are the one piece of world state worth hearing. At night the
  // drums drop out, the lead moves to a triangle and the tempo eases — the same
  // arrangement, dimmed, rather than a second track to cross-fade to.
  setEnvironment(env) {
    const hour = env && typeof env.hour === 'number' ? env.hour : null;
    if (hour === null) return;
    const night = hour < 6 || hour >= 19;
    if (night !== this._night) {
      this._night = night;
      if (this._name) this._retune();
    }
  },

  isNight() { return this._night; },
  current() { return this._name; },
  playing() { return !!this._timer; },

  _tempo() {
    const t = this._track;
    if (!t) return 0.125;
    const bpm = this._night ? t.bpm * 0.88 : t.bpm;
    return (60 / bpm) / 4; // one 16th note
  },

  _retune() { /* tempo and voicing are read per step, so nothing to rebuild */ },

  play(name) {
    if (!MUSIC_TRACKS[name]) return false;
    if (this._name === name && this._timer) return true;
    this._name = name;
    if (!AudioMixer.ready()) return true;  // resumes from onUnlock()
    this._start(name);
    return true;
  },

  _start(name) {
    const ctx = this.ctx();
    if (!ctx) return;
    const bus = AudioMixer.bus('music');
    if (!bus) return;
    this._fadeOutCurrent();
    this._track = MUSIC_TRACKS[name];
    this._gain = ctx.createGain();
    this._gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this._gain.gain.linearRampToValueAtTime(1, ctx.currentTime + MUSIC_CROSSFADE);
    this._gain.connect(bus);
    this._step = 0;
    this._bar = 0;
    this._nextAt = ctx.currentTime + 0.06;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this._tick(), MUSIC_TICK_MS);
  },

  _fadeOutCurrent() {
    const ctx = this.ctx();
    if (!ctx || !this._gain) return;
    const old = this._gain;
    this._gain = null;
    try {
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
      old.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + MUSIC_CROSSFADE);
    } catch {}
    setTimeout(() => { try { old.disconnect(); } catch {} }, (MUSIC_CROSSFADE + 0.2) * 1000);
  },

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._fadeOutCurrent();
    this._name = null;
    this._track = null;
  },

  // Backgrounded tabs still run timers, and a chiptune loop nobody can hear is
  // pure battery. The track resumes at the top of a bar rather than mid-phrase.
  pause() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    this._paused = true;
    this._fadeOutCurrent();
  },

  resume() {
    if (!this._paused) return;
    // Reachable from unmuting and from the tab regaining focus, so neither may
    // undo the other: a hidden tab that unmutes stays quiet, and a muted tab
    // coming back into view stays muted.
    if (AudioMixer.isMuted()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this._paused = false;
    if (this._name && AudioMixer.ready()) this._start(this._name);
  },

  _tick() {
    const ctx = this.ctx();
    if (!ctx || !this._track || !this._gain) return;
    const horizon = ctx.currentTime + MUSIC_LOOKAHEAD;
    let guard = 0;
    while (this._nextAt < horizon && guard++ < 64) {
      this._schedule(this._nextAt, this._step);
      this._nextAt += this._tempo();
      this._step = (this._step + 1) % 16;
      if (this._step === 0) this._bar = (this._bar + 1) % this._track.progression.length;
    }
  },

  _schedule(at, step) {
    const t = this._track;
    const transpose = t.progression[this._bar];
    const lead = t.motif[step];

    if (lead >= 0) {
      const midi = musicDegreeToMidi(t.root + 12, t.scale, lead + transpose);
      this._note(at, musicMidiToHz(midi), this._night ? 'triangle' : t.lead,
        this._tempo() * (this._night ? 2.6 : 1.9), t.leadGain * (this._night ? 0.8 : 1));
    }
    if (step % t.bassEvery === 0) {
      const midi = musicDegreeToMidi(t.root - 12, t.scale, transpose);
      this._note(at, musicMidiToHz(midi), t.bass, this._tempo() * 2.2, t.bassGain);
    }
    if (t.drums && !this._night) {
      // Kick on the beat, hat on the offbeat. Enough to carry a tempo without
      // becoming the loudest thing in a language game.
      if (step % 4 === 0) this._kick(at);
      else if (step % 2 === 0) this._hat(at, 0.05);
    }
  },

  _note(at, hz, wave, dur, gain) {
    const ctx = this.ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain * 0.18, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g); g.connect(this._gain);
    osc.start(at); osc.stop(at + dur + 0.02);
  },

  _kick(at) {
    const ctx = this.ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.09);
    g.gain.setValueAtTime(0.09, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    osc.connect(g); g.connect(this._gain);
    osc.start(at); osc.stop(at + 0.13);
  },

  _hat(at, dur) {
    const ctx = this.ctx();
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(hp); hp.connect(g); g.connect(this._gain);
    src.start(at); src.stop(at + dur + 0.01);
  }
};

// ═══════════════ AMBIENCE ═════════════════════════════════════════════════════
// A continuous bed plus sparse one-shots. The bed is filtered noise with a slow
// LFO on the filter, which is enough to read as wind or water; the one-shots are
// what stop it sounding like a machine.
const AMBIENCE = {
  farm:    { bed: { band: 520, q: 0.7, gain: 0.09, lfoHz: 0.07, lfoDepth: 190 },
             oneShot: { kind: 'chirp', everyMs: [2600, 7000] } },
  fishing: { bed: { band: 380, q: 0.5, gain: 0.13, lfoHz: 0.13, lfoDepth: 240 },
             oneShot: { kind: 'drip', everyMs: [1800, 5200] } },
  dungeon: { bed: { band: 130, q: 1.6, gain: 0.11, lfoHz: 0.04, lfoDepth: 45 },
             oneShot: { kind: 'drip', everyMs: [3800, 11000] }, drone: 55 },
  arcade:  { bed: { band: 2400, q: 0.9, gain: 0.035, lfoHz: 0.9, lfoDepth: 500 },
             drone: 120 },
  bee:     { bed: { band: 900, q: 1.1, gain: 0.05, lfoHz: 0.5, lfoDepth: 260 },
             oneShot: { kind: 'chirp', everyMs: [3200, 9000] }, drone: 175 }
};

const AmbienceDirector = {
  _name: null,
  _nodes: [],
  _gain: null,
  _shotTimer: null,
  _paused: false,

  ctx() { return AudioMixer.ctx; },

  current() { return this._name; },
  playing() { return !!this._gain; },

  play(name) {
    if (!AMBIENCE[name]) return false;
    if (this._name === name && this._gain) return true;
    this._name = name;
    if (!AudioMixer.ready()) return true;
    this._start(name);
    return true;
  },

  onUnlock() {
    if (this._name && !this._gain && !this._paused) this._start(this._name);
  },

  _start(name) {
    const ctx = this.ctx();
    const bus = AudioMixer.bus('ambience');
    if (!ctx || !bus) return;
    this.stop(true);
    const def = AMBIENCE[name];
    this._name = name;
    this._gain = ctx.createGain();
    this._gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this._gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.4);
    this._gain.connect(bus);

    // One long noise buffer looped, rather than a buffer per second: the source
    // is started once and left running, so there is no seam to hear.
    const seconds = 4;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = def.bed.band;
    bp.Q.value = def.bed.q;
    const bedGain = ctx.createGain();
    bedGain.gain.value = def.bed.gain;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = def.bed.lfoHz;
    lfoGain.gain.value = def.bed.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    src.connect(bp); bp.connect(bedGain); bedGain.connect(this._gain);
    src.start();
    lfo.start();
    this._nodes.push(src, lfo);

    if (def.drone) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = def.drone;
      g.gain.value = 0.035;
      osc.connect(g); g.connect(this._gain);
      osc.start();
      this._nodes.push(osc);
    }

    if (def.oneShot) this._scheduleShot(def.oneShot);
  },

  _scheduleShot(shot) {
    const [lo, hi] = shot.everyMs;
    const wait = lo + Math.random() * (hi - lo);
    this._shotTimer = setTimeout(() => {
      if (this._gain) {
        if (shot.kind === 'chirp') this._chirp();
        else this._drip();
        this._scheduleShot(shot);
      }
    }, wait);
  },

  _chirp() {
    const ctx = this.ctx();
    if (!ctx || !this._gain) return;
    const at = ctx.currentTime + 0.01;
    // Two quick rising blips read as a bird far more reliably than one.
    [0, 0.09].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const base = 2200 + Math.random() * 900;
      osc.frequency.setValueAtTime(base, at + offset);
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, at + offset + 0.05);
      g.gain.setValueAtTime(0.0001, at + offset);
      g.gain.linearRampToValueAtTime(0.05 * (i ? 0.7 : 1), at + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.07);
      osc.connect(g); g.connect(this._gain);
      osc.start(at + offset); osc.stop(at + offset + 0.09);
    });
  },

  _drip() {
    const ctx = this.ctx();
    if (!ctx || !this._gain) return;
    const at = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const base = 700 + Math.random() * 500;
    osc.frequency.setValueAtTime(base * 1.8, at);
    osc.frequency.exponentialRampToValueAtTime(base, at + 0.11);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.06, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
    osc.connect(g); g.connect(this._gain);
    osc.start(at); osc.stop(at + 0.15);
  },

  stop(silent) {
    const ctx = this.ctx();
    if (this._shotTimer) { clearTimeout(this._shotTimer); this._shotTimer = null; }
    const nodes = this._nodes;
    this._nodes = [];
    const gain = this._gain;
    this._gain = null;
    if (!silent) this._name = null;
    if (ctx && gain) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      } catch {}
    }
    setTimeout(() => {
      nodes.forEach((n) => { try { n.stop && n.stop(); } catch {} try { n.disconnect(); } catch {} });
      if (gain) { try { gain.disconnect(); } catch {} }
    }, 900);
  },

  pause() {
    if (!this._gain) return;
    this._paused = true;
    this.stop(true);
  },

  resume() {
    if (!this._paused) return;
    if (AudioMixer.isMuted()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this._paused = false;
    if (this._name && AudioMixer.ready()) this._start(this._name);
  }
};

// One call for both, because every caller wants the pair to agree.
function playSceneAudio(name) {
  MusicDirector.play(name);
  AmbienceDirector.play(name);
}

if (typeof window !== 'undefined') {
  window.MUSIC_TRACKS = MUSIC_TRACKS;
  window.MUSIC_SCALES = MUSIC_SCALES;
  window.AMBIENCE = AMBIENCE;
  window.MusicDirector = MusicDirector;
  window.AmbienceDirector = AmbienceDirector;
  window.playSceneAudio = playSceneAudio;
  window.musicDegreeToMidi = musicDegreeToMidi;
  window.musicMidiToHz = musicMidiToHz;

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { MusicDirector.pause(); AmbienceDirector.pause(); }
      else { MusicDirector.resume(); AmbienceDirector.resume(); }
    });
  }
}
