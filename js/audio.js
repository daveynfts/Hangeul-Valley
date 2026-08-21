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
  const unlockAudio = () => { ChiptuneSynth.init(); };
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
}

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

  _playClip(text, opts) {
    if (!this.clipsSupported() || !text) return false;
    const url = ttsClipUrl(text);
    try {
      const a = new Audio(url);
      a.preload = 'auto';
      this._clip = a;
      a.onended = () => {
        if (this._clip === a) this._clip = null;
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
      return false;
    }
  },

  _playClipQueue(parts, index, opts) {
    if (!parts || index >= parts.length) {
      this._clip = null;
      return;
    }
    if (!this.clipsSupported()) {
      this._speakNow(parts.map((s) => this._utterance(s, 0.7)));
      return;
    }
    const text = parts[index];
    const a = new Audio(ttsClipUrl(text));
    a.preload = 'auto';
    this._clip = a;
    a.onended = () => {
      if (this._clip !== a) return;
      this._playClipQueue(parts, index + 1, opts);
    };
    a.onerror = () => {
      if (this._clip !== a) return;
      this._clip = null;
      const rest = parts.slice(index);
      if (this.supported()) this._speakNow(rest.map((s) => this._utterance(s, 0.7)));
    };
    const play = a.play();
    if (play && typeof play.catch === 'function') {
      play.catch(() => {
        if (this._clip !== a) return;
        this._clip = null;
        if (this.supported()) this._speakNow(parts.slice(index).map((s) => this._utterance(s, 0.7)));
      });
    }
  },

  speak(text, { rate = 0.85, force = false } = {}) {
    if (!text) return false;
    if (!this.enabled && !force) return false;
    this._pendingSpeak = null;
    this.stop();
    if (this._playClip(text, { rate, force })) return true;
    return this._speakWeb(text, { rate, force });
  },

  spell(text, { force = false } = {}) {
    if (!text) return false;
    if (!this.enabled && !force) return false;
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
  window.ttsClipStem = ttsClipStem;
  window.ttsClipUrl = ttsClipUrl;
  // The HUD is built later in the file, so wait for the DOM before touching the button.
  if (typeof document !== 'undefined' && document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', syncTTSButton, { once: true });
  } else {
    syncTTSButton();
  }
}

