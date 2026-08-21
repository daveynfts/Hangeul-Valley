// ═══════════════ WEB AUDIO API CHIPTUNE SYNTHESIZER ═════════════════════════
class ChiptuneSynthEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  play(type) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (type === 'click') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.04);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'harvest') {
      [659.25, 987.77, 1318.51].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.2, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.12);
      });
    } else if (type === 'fishing_pull') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'sword_swing') {
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
      noise.start(now);
    } else if (type === 'quiz_correct') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.18, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.18);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.18);
      });
    } else if (type === 'quiz_wrong') {
      [150, 120].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.15);
      });
    } else if (type === 'levelup') {
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.28);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.28);
      });
    }
  }
}
const ChiptuneSynth = new ChiptuneSynthEngine();
function playChiptuneSFX(type) { ChiptuneSynth.play(type); }
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    ChiptuneSynth.init();
    if (typeof KoreanTTS !== 'undefined' && KoreanTTS.unlock) KoreanTTS.unlock();
  };
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  window.addEventListener('click', unlockAudio, { capture: true });
}

// ═══════════════ KOREAN PRONUNCIATION (Web Speech API) ═══════════════════════
// Reads Hangul aloud in ko-KR. Korean spelling does not map one-to-one onto sound —
// 받침 assimilation, 연음 liaison and the tense consonants ㄲㄸㅃㅆㅉ all shift in
// running speech — so a learner who only ever sees romanization learns it wrong.
//
// Everything here degrades silently: no speechSynthesis, no voices, or a system with
// no Korean voice installed all end with isAvailable() false and the 🔊 controls hidden.
const KoreanTTS = {
  _voice: null,
  _ready: false,
  _warned: false,
  _pendingSpeak: null,
  _speakTimer: null,
  enabled: true,

  supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance === 'function';
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

  // getVoices() is populated asynchronously and starts out empty in Chrome, so this
  // runs on load and again on voiceschanged.
  refreshVoice() {
    if (!this.supported()) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    this._voice = this._pickVoice(voices);
    this._ready = true;
    if (!this._voice && !this._warned) {
      this._warned = true;
      console.info('[TTS] No Korean voice installed — speaking with lang=ko-KR anyway.');
    }
    this._markAvailability();
    if (this._pendingSpeak) {
      const queued = this._pendingSpeak;
      this._pendingSpeak = null;
      this.speak(queued);
    }
  },

  isAvailable() {
    return this.supported() && !!this._voice;
  },

  init() {
    if (!this.supported()) { this._markAvailability(); return; }
    try { this.enabled = localStorage.getItem('hv_tts_enabled') !== '0'; } catch { this.enabled = true; }
    this.refreshVoice();
    try { window.speechSynthesis.onvoiceschanged = () => this.refreshVoice(); } catch {}
    // Chrome sometimes needs a beat before voices land even without the event.
    setTimeout(() => this.refreshVoice(), 400);
    setTimeout(() => this.refreshVoice(), 1500);
  },

  _clearSpeakTimer() {
    if (this._speakTimer) {
      clearTimeout(this._speakTimer);
      this._speakTimer = null;
    }
  },

  // First user tap wakes Chrome's voice list and unsticks a paused synth. Must stay
  // inside the gesture — a delayed speak() is dropped as if it had no audio permission.
  unlock() {
    if (!this.supported()) return;
    try { window.speechSynthesis.getVoices(); } catch {}
    this.refreshVoice();
    try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch {}
  },

  _utterance(text, rate) {
    const u = new SpeechSynthesisUtterance(String(text).normalize('NFC'));
    u.lang = (this._voice && this._voice.lang) || 'ko-KR';
    if (this._voice) u.voice = this._voice;
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    u.onerror = (ev) => {
      const err = ev && ev.error;
      if (!err || err === 'interrupted' || err === 'canceled') return;
      console.warn('[TTS] utterance error:', err);
      if (typeof showToast === 'function') {
        showToast('🔇 Korean voice failed' + (err === 'not-allowed' ? ' — click Hear again' : ''), 2600);
      }
    };
    return u;
  },

  // Speak in the current turn. setTimeout after cancel() loses the click gesture in
  // Chrome, which is why Hear again showed up but played silence.
  _speakNow(utterances) {
    const synth = window.speechSynthesis;
    const list = Array.isArray(utterances) ? utterances : [utterances];
    try { if (synth.paused) synth.resume(); } catch {}
    if (synth.speaking || synth.pending) {
      try { synth.cancel(); } catch {}
    }
    list.forEach((u) => synth.speak(u));
    try { synth.resume(); } catch {}
  },

  // rate defaults slow: learners need the syllable boundaries, not native tempo.
  // `force` is for explicit buttons (Hear again): HUD mute only blocks auto-play.
  speak(text, { rate = 0.85, force = false } = {}) {
    if (!this.supported() || !text) return false;
    if (!this.enabled && !force) return false;
    this._pendingSpeak = null;
    this._clearSpeakTimer();
    this.unlock();
    try {
      this._speakNow(this._utterance(text, rate));
      return true;
    } catch (e) {
      console.warn('[TTS] speak failed:', e);
      return false;
    }
  },

  // Syllable-by-syllable, for when the learner wants the word broken apart.
  spell(text, { force = false } = {}) {
    if (!this.supported() || !text) return false;
    if (!this.enabled && !force) return false;
    this.unlock();
    const syls = String(text).normalize('NFC').split('').filter(c => {
      const n = c.charCodeAt(0);
      return n >= 0xac00 && n <= 0xd7a3;
    });
    if (!syls.length) return this.speak(text, { force });
    this._pendingSpeak = null;
    this._clearSpeakTimer();
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
    if (!this.enabled && this.supported()) window.speechSynthesis.cancel();
    return this.enabled;
  }
};

// Convenience wrappers used by the UI.
function speakKorean(text, opts) { return KoreanTTS.speak(text, opts); }
function spellKorean(text, opts) { return KoreanTTS.spell(text, opts); }

// Reflect the persisted mute state on the HUD button. Purely cosmetic, and it runs at
// load time, so a partial DOM (the Node test harnesses stub one) must never break boot.
function syncTTSButton() {
  try {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const btn = document.getElementById('tts-toggle-btn');
    if (!btn) return;
    const on = !!KoreanTTS.enabled;
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
  syncTTSButton();
  showToast(on ? '🔊 Korean pronunciation on' : '🔇 Korean pronunciation muted', 1800);
  if (on) speakKorean('한국어');
  return on;
}

if (typeof window !== 'undefined') {
  KoreanTTS.init();
  window.KoreanTTS = KoreanTTS;
  window.speakKorean = speakKorean;
  window.spellKorean = spellKorean;
  window.toggleTTS = toggleTTS;
  window.syncTTSButton = syncTTSButton;
  // The HUD is built later in the file, so wait for the DOM before touching the button.
  if (typeof document !== 'undefined' && document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', syncTTSButton, { once: true });
  } else {
    syncTTSButton();
  }
}

