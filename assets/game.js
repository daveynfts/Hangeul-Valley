/**
 * Hangeul Valley – Thematic Economy Edition
 * ─────────────────────────────────────────────────────────────
 * Core loop:
 *  Plant a word → crop ripens → harvest → earn Gold → buy the next Level pack
 * The player picks their own learning route; levels are never force-advanced.
 */

// ═══════════════ GLOBAL STATE ════════════════════════════════════════════════
let levelsData = [];
let sceneRef = null;
let currentLevelIndex = 0;
let progress = 0;

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
    }
  }
}
const ChiptuneSynth = new ChiptuneSynthEngine();
function playChiptuneSFX(type) { ChiptuneSynth.play(type); }
if (typeof window !== 'undefined') {
  const unlockAudio = () => { ChiptuneSynth.init(); window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('click', unlockAudio); };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('click', unlockAudio);
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

  // getVoices() is populated asynchronously and starts out empty in Chrome, so this
  // runs on load and again on voiceschanged.
  refreshVoice() {
    if (!this.supported()) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    this._voice =
      voices.find(v => v.lang === 'ko-KR') ||
      voices.find(v => (v.lang || '').toLowerCase().startsWith('ko')) ||
      null;
    this._ready = true;
    if (!this._voice && !this._warned) {
      this._warned = true;
      console.info('[TTS] No Korean voice installed — pronunciation playback disabled.');
    }
    this._markAvailability();
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

  // rate defaults slow: learners need the syllable boundaries, not native tempo.
  speak(text, { rate = 0.85 } = {}) {
    if (!this.enabled || !this.isAvailable() || !text) return false;
    try {
      window.speechSynthesis.cancel();   // don't queue behind a previous word
      const u = new SpeechSynthesisUtterance(String(text).normalize('NFC'));
      u.voice = this._voice;
      u.lang = this._voice.lang || 'ko-KR';
      u.rate = rate;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      console.warn('[TTS] speak failed:', e);
      return false;
    }
  },

  // Syllable-by-syllable, for when the learner wants the word broken apart.
  spell(text) {
    if (!this.enabled || !this.isAvailable() || !text) return false;
    const syls = String(text).normalize('NFC').split('').filter(c => {
      const n = c.charCodeAt(0);
      return n >= 0xac00 && n <= 0xd7a3;
    });
    if (!syls.length) return this.speak(text);
    try {
      window.speechSynthesis.cancel();
      syls.forEach(s => {
        const u = new SpeechSynthesisUtterance(s);
        u.voice = this._voice;
        u.lang = this._voice.lang || 'ko-KR';
        u.rate = 0.7;
        window.speechSynthesis.speak(u);
      });
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
function spellKorean(text) { return KoreanTTS.spell(text); }

// Reflect the persisted mute state on the HUD button. Purely cosmetic, and it runs at
// load time, so a partial DOM (the Node test harnesses stub one) must never break boot.
function syncTTSButton() {
  try {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const btn = document.getElementById('tts-toggle-btn');
    if (!btn) return;
    btn.textContent = KoreanTTS.enabled ? '🔊 Audio' : '🔇 Audio';
    if (btn.classList && btn.classList.toggle) btn.classList.toggle('hud-btn-off', !KoreanTTS.enabled);
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

// ═══════════════ PIXEL ENGINE ════════════════════════════════════════════════
const PS = 3;

// ═══════════════ STARDEW VALLEY EARTHY COLOR PALETTE ═════════════════════════
const STARDEW_PALETTE = {
  // Contour & Outlines
  outlineDark: 0x121016,      // Universal 1px deep dark contour outline
  outlineSoft: 0x251C2B,      // Soft inner shadow / joint line

  // Grass & Nature
  grassBase: 0x4A7C59,      // Warm forest green
  grassShadow: 0x2D4E35,    // Deep shade green
  grassHighlight: 0x6B9E77, // Soft spring green
  flowerRed: 0xD85858,      // Muted rose red
  flowerYellow: 0xE8B84B,   // Warm buttercup
  flowerPurple: 0x9B70C8,   // Soft lavender

  // Soil & Paths
  dirtDry: 0x7E5436,        // Warm rich earth
  dirtWet: 0x4E311B,        // Moist dark loam
  pathStone: 0x7D7571,      // Weathered cobble
  pathMortar: 0x4A4440,     // Dark mortar

  // Wood & Fences
  woodBase: 0x8F5428,       // Warm cedar brown
  woodHighlight: 0xB3713D,  // Warm oak highlight
  woodShadow: 0x573012,     // Deep timber shadow

  // Water & Beach
  oceanDeep: 0x1E506B,      // Deep teal ocean
  oceanShimmer: 0x3D7898,   // Subtle wave shimmer
  oceanFoam: 0x96C5D4,      // Desaturated seafoam
  sandBase: 0xEAD08B,       // Warm golden beach sand
  sandShadow: 0xCBA65B,     // Warm dune shadow

  // Player Outfit & Skin (Multi-tone)
  skinHighlight: 0xFAD8B0,
  skinBase: 0xEAA878,
  skinShadow: 0xC87858,
  skinDeepShadow: 0x984838,
  hairHighlight: 0x925A32,
  hairBase: 0x6A3E1E,
  hairShadow: 0x42240E,
  strawHatHighlight: 0xF8D88E,
  strawHatBase: 0xE4B663,
  strawHatShadow: 0xB88A3D,
  strawHatDeepShadow: 0x805A20,
  hatRibbonRed: 0xC0382B,
  hatRibbonShadow: 0x781D14,
  hatRibbonLight: 0xE74C3C,
  shirtLight: 0xF0EAE1,
  shirtBase: 0xD0D5DD,
  shirtShadow: 0x98A2B3,
  overallsHighlight: 0x5B6E9E,
  overallsBase: 0x3B4D7A,   // Muted indigo denim
  overallsShadow: 0x263354,  // Dark indigo shadow
  overallsDeepShadow: 0x161F38,
  brassButton: 0xE8C840,
  strawHat: 0xD4AA63,       // Unbleached straw
  hatRibbon: 0x9E3B2D,      // Muted terracotta red
  bootsHighlight: 0x7E4F2B,
  boots: 0x59381E,          // Leather brown
  bootsShadow: 0x382210,

  // Cat Fur & Details (Multi-tone)
  catFurHighlight: 0xFA9E50,
  catFurBase: 0xEE7B28,
  catFurShadow: 0xB84E10,
  catFurDeepShadow: 0x782D00,
  catWhiteFluff: 0xFFFFFF,
  catWhiteShadow: 0xE2E8F0,
  catNosePink: 0xFFB3C1,
  catEarInnerShadow: 0xE67E90,
  catEyeGreen: 0x55C655,
  catEyeHighlight: 0xA3F0A3,
  catEyePupil: 0x103B10,

  // Wizard Merlin Details (Multi-tone)
  wizRobeHighlight: 0xA78BFA,
  wizRobeBase: 0x8B5CF6,
  wizRobeShadow: 0x6D28D9,
  wizRobeDeepShadow: 0x4C1D95,
  wizBeardHighlight: 0xFFFFFF,
  wizBeardShadow: 0xE2E8F0,
  wizBeardDeepShadow: 0x94A3B8,
  wizGoldAccent: 0xFBBF24,
  wizGoldShadow: 0xD97706,
  wizCrystalHighlight: 0x7DD3FC,
  wizCrystalBase: 0x38BDF8,
  wizCrystalShadow: 0x0284C7,
  wizStaffWood: 0x78350F,
  wizStaffShadow: 0x451A03,

  // Dungeon & Stone
  dungeonWall: 0x2C363F,    // Deep mossy slate
  dungeonFloor: 0x1E242B,   // Dark stone tile
  torchAmber: 0xE68A2E,     // Cozy firelight amber
};

// ═══════════════ PIXEL ART RENDERER & CHARACTER SYSTEM ═══════════════════════

class PixelArtRenderer {
  static W_PAL = {
    '.': null,
    'K': 0x0F172A, // 1px Dark Slate Outline
    'k': 0x1E1B4B, // Deep shadow outline
    'p': 0xC084FC, // Bright lavender highlight
    'P': 0xA855F7, // Robe highlight purple
    'h': 0x8B5CF6, // Robe base purple
    'H': 0x7C3AED, // Robe mid purple
    'v': 0x6D28D9, // Robe deep purple
    'V': 0x4C1D95, // Robe shadow purple
    'u': 0x3B0764, // Robe darkest fold shadow
    'm': 0xFDE047, // Bright gold embroidery star/moon highlight
    'M': 0xF59E0B, // Gold embroidery midtone
    'y': 0xD97706, // Gold embroidery shadow
    'Y': 0xB45309, // Gold embroidery deep shadow
    'W': 0xFFFFFF, // Pure white beard highlight / aura glint
    'w': 0xF8FAFC, // Soft white beard top
    'd': 0xE2E8F0, // Light gray beard midtone
    'D': 0xCBD5E1, // Silver gray beard body
    'b': 0x94A3B8, // Blue-gray beard shadow
    'B': 0x64748B, // Deep beard shadow
    'S': 0x92400E, // Staff light wood
    's': 0x78350F, // Staff base wood
    'z': 0x451A03, // Staff dark wood shadow
    'q': 0xE0F2FE, // Orb core brilliant white-cyan
    'Q': 0xA5F3FC, // Orb inner glow cyan
    'c': 0x38BDF8, // Orb bright cyan
    'C': 0x0284C7, // Orb deep cyan
    'e': 0x0369A1, // Orb shadow cyan
    'a': 0xE9D5FF, // Mystical aura light purple sparkle
    'A': 0x67E8F9, // Mystical aura cyan sparkle
    'f': 0xFDE68A, // Star sparkle gold
    'X': 0xFFDDAD, // Skin peach
    'x': 0xC87858  // Skin shadow
  };

  static WIZ_0 = [
    '.......KfmK.....',
    '......KphhPK....',
    '.....KphHHHhK...',
    '....KphHHHHHhK.a',
    '...KphHHHHHHHhK.',
    '..KpvVVVVVVVVvpK',
    '..KmMMMyyMMMMMmK',
    '....KXxXKKXxXK.A',
    '....KwwWWwwwwK.q',
    '....KddDBBDddK.Q',
    '...KphHHDDbHHhKc',
    '..KphHHmMMmHHhKC',
    '..KphHHvVVvHHhKs',
    '..KphHHvVVvHHhKS',
    '.KphHHHvVVvHHHhS',
    '.KpvVVVuuuuVVvPS',
    '.KmMMMYYMMMMMmKS',
    '..KuuuuuuuuuuKs.',
    '.......KsK...KzK',
    '.......KzK......'
  ];

  static WIZ_1 = [
    '.......KmfK.....',
    '......KphhPK....',
    '.....KphHHHhK.a.',
    '....KphHHHHHhK..',
    '...KphHHHHHHHhKA',
    '..KpvVVVVVVVVvpK',
    '..KmMMMMMMMMMMmK',
    '....KXkXKKXkXK.a',
    '....KwwwwwwwwK.Q',
    '....KddDDDDddK.q',
    '...KphHHDDbHHhKC',
    '..KphHHmMMmHHhKe',
    '..KphHHvVVvHHhKs',
    '..KphHHvVVvHHhKS',
    '.KphHHHvVVvHHHhS',
    '.KpvVVVuuuuVVvPS',
    '.KmMMMMMMMMMMmKS',
    '..KuuuuuuuuuuKs.',
    '.......KsK...KzK',
    '.......KzK......'
  ];

  static drawMatrix(g, matrix, palette, ox = 0, oy = 0, ps = 3) {
    matrix.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const char = row[rx];
        if (char === '.' || char === ' ') continue;
        const col = palette[char];
        if (col !== undefined && col !== null) {
          g.fillStyle(col, 1);
          g.fillRect((ox + rx) * ps, (oy + ry) * ps, ps, ps);
        }
      }
    });
  }

  static createTexture(scene, key, matrix, palette, width = 16, height = 16, ps = 3) {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    const g = scene.make.graphics({ add: false });
    this.drawMatrix(g, matrix, palette, 0, 0, ps);
    g.generateTexture(key, width * ps, height * ps);
    g.destroy();
    const tex = scene.textures.get(key);
    if (tex) {
      const mode = (typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode)
        ? Phaser.Textures.FilterMode.NEAREST
        : 1;
      tex.setFilter(mode);
    }
    return key;
  }

  static generateAllTextures(scene) {
    if (!scene || !scene.textures) return;
    if (scene._pixelArtTexturesBaked) return;
    scene._pixelArtTexturesBaked = true;

    this._genPlayerTextures(scene);
    this._genNpcTextures(scene);
    this._genCropAndTreeTextures(scene);
    this._genFishingTextures(scene);
    this._genArcadeTextures(scene);
    this._genDungeonTextures(scene);
    this._genBossTextures(scene);
    this.generateTilemapTextures(scene);
    this._genParticleTextures(scene);
    this._genLightingTextures(scene);
    this._genParallaxTextures(scene);
    this._genWaterTextures(scene);
    this._genBeehiveTextures(scene);
    this._genBeeTextures(scene);
  }

  static generateTilemapTextures(scene) {
    if (!scene || !scene.textures) return;
    if (scene._tilemapTexturesGenerated) return;
    scene._tilemapTexturesGenerated = true;

    const makeTile = (key, renderFn) => {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
      const g = scene.make.graphics({ add: false });
      renderFn(g);
      g.generateTexture(key, 48, 48);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex) {
        const mode = (typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode)
          ? Phaser.Textures.FilterMode.NEAREST
          : 1;
        tex.setFilter(mode);
      }
      return key;
    };

    const TILEMAP_PALETTE = {
      '.': null,
      'K': 0x0F172A, // Dark slate outline / border
      'k': 0x1E293B, // Dark slate accent
      'H': 0x8FD19E, // Grass highlight green
      'G': 0x4A7C59, // Grass base green
      'g': 0x2D4E35, // Grass shade green
      'M': 0x1A3622, // Grass deep shadow green
      'B': 0xC4986C, // Path highlight tan
      'b': 0xA6754B, // Path base dirt
      'A': 0x7E5436, // Path rich earth brown
      'a': 0x573A23, // Path dark loam shadow
      'O': 0xD99B66, // Wood sunlit highlight
      'o': 0xB3713D, // Wood oak highlight
      'W': 0x8F5428, // Wood cedar base
      'w': 0x573012, // Wood deep shadow
      't': 0xC7C1BD, // Stone highlight
      'T': 0x9E9793, // Stone base
      'S': 0x7D7571, // Slate base
      's': 0x4A4440, // Mortar shadow
      'E': 0xE0F2FE, // Water foam white
      'c': 0x6BB1D6, // Water bright cyan
      'C': 0x3D7898, // Water medium blue
      'Z': 0x1E506B, // Water deep ocean teal
      'z': 0x153A4F, // Water abyss dark teal
      'Y': 0xFDE047, // Gold yellow
      'y': 0xD97706, // Amber orange
      'R': 0xEF4444, // Red highlight
      'r': 0x991B1B, // Red shadow
      'P': 0xA855F7, // Purple magic
      'p': 0x6D28D9, // Dark purple magic
      'F': 0xF472B6, // Pink flower
      'f': 0xDB2777, // Pink flower shadow
      'N': 0x475569, // Metal slate
      'n': 0x334155, // Metal dark slate
      'V': 0x38BDF8, // Cyan accent
      'v': 0x0284C7  // Deep cyan accent
    };

    const drawTileMatrix = (g, matrix) => {
      PixelArtRenderer.drawMatrix(g, matrix, TILEMAP_PALETTE, 0, 0, 3);
    };

    // ── FARM SCENE TILEMAP TEXTURES ──────────────────────────────────────────
    makeTile('tile_grass_base', (g) => {
      drawTileMatrix(g, [
        'GGGGGHGGGGGGGHGG',
        'GGGGGGGGGGGGGGGG',
        'GGgGGGGGGgGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGHGGGGGGGGGG',
        'GgGGGGGGGGGGGGgG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGgGGGGgGG',
        'GGGGGGGGGGGGGGGG',
        'GgGGGGGGGGGGGGGG',
        'GGGGGgGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGgGGGGG',
        'GGGGGGGGGGGGGGGG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_grass_flowers', (g) => {
      drawTileMatrix(g, [
        'GGGGGHGGGGGGGHGG',
        'GG.FRF.GGGG.Yy.G',
        'GGFfRfFGGGGYyYyG',
        'GG.FRF.GGgG.Yy.G',
        'GGGGGHGGGGGGGGGG',
        'GgGGGGGGGGGGGGgG',
        'GGGG.Ff.GGGGGGGG',
        'GGGFfFfFGGgGGgGG',
        'GGGG.Ff.GGGGGGGG',
        'GgGGGGGGGGGGGGGG',
        'GGGGGgGGGG.VRV.G',
        'GGGGGGGGGGVRVRVG',
        'GGGGGGGGGG.VRV.G',
        'GGGGGGGGGGGGGGGG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_grass_clover', (g) => {
      drawTileMatrix(g, [
        'GGGGGHGGGGGGGHGG',
        'G.HH.GGGGGG.HH.G',
        'GHHHHGGGGGGHHHHG',
        'G.HH.GGgGGG.HH.G',
        'GGGGGHGGGGGGGGGG',
        'GgGGGGGGGGGGGGgG',
        'GGGGGGGGGGGGGGGG',
        'GGGG.HH.GGgGGgGG',
        'GGGGHHHHGGGGGGGG',
        'GgGG.HH.GGGGGGGG',
        'GGGGGgGGGGGGGGGG',
        'GGGGGGGGGG.HH.GG',
        'GGGGGGGGGGHHHHGG',
        'GGGGGGGGGG.HH.GG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_path_straight', (g) => {
      drawTileMatrix(g, [
        'aaaaaAaAaAaaaaaa',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'aaaaaAaAaAaaaaaa'
      ]);
    });

    makeTile('tile_path_corner', (g) => {
      drawTileMatrix(g, [
        'aaaaaAaAaAaaaaaa',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAa',
        'ABBBBBBBBBBBBBAA',
        'AbbbbbbbbbbbbbAA',
        'AbbbbbbbbbbbbAAA',
        'AAAAAAAAAAAAAaAA',
        'ABBBBBBBBBAAaAAA',
        'AbbbbbbbbAAaAAAA',
        'AbbbbbbbAAaAAAAA',
        'AAAAAAAaAaAAAAAA',
        'AAAAAAaAaAAAAAAA',
        'aaaaaaAaAAAAAAAA',
        'aaaaaaaaaaaaaaaa'
      ]);
    });

    makeTile('tile_path_cross', (g) => {
      drawTileMatrix(g, [
        'aAaABBBBBBBAaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'AaAbbbbbbbbbaAaA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'ABBBBBBBBBBBBBBA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaABBBBBBBAaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'aaaaaaaaaaaaaaaa'
      ]);
    });

    makeTile('tile_path_single', (g) => {
      drawTileMatrix(g, [
        'gggggggggggggggg',
        'g.KKKKKKKKKKKK.g',
        'gKBBBBBBBBBBBBKg',
        'gKBbbbbbbbbbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbbbbbbbbbBKg',
        'gKBBBBBBBBBBBBKg',
        'g.KKKKKKKKKKKK.g',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_path_stone', (g) => {
      drawTileMatrix(g, [
        'aAaABBBBBBBAaAaA',
        'AaAKttTTTTsKaAaA',
        'aAaKtTTTTTSsAaAa',
        'AaAKtTTTTTSsAaAa',
        'aAaKSSSSSSSSAaAa',
        'AaAKKKKKKKKKaAaA',
        'aAaABBBBBBBAaAaA',
        'AaAKttTTTTsKaAaA',
        'aAaKtTTTTTSsAaAa',
        'AaAKtTTTTTSsAaAa',
        'aAaKSSSSSSSSAaAa',
        'AaAKKKKKKKKKaAaA',
        'aAaABBBBBBBAaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'aaaaaaaaaaaaaaaa'
      ]);
    });

    makeTile('tile_fence_h', (g) => {
      drawTileMatrix(g, [
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'GGGGGGGGGGGGGGGG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_fence_v', (g) => {
      drawTileMatrix(g, [
        'GGKKOKGKKOKGGGGG',
        'GGKKOKGKKOKGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKwWGKKwWGGGGG',
        'ggKKwWGKKwWGgggg',
        'MMKKKKGKKKKGMMMM'
      ]);
    });

    makeTile('tile_fence_post', (g) => {
      drawTileMatrix(g, [
        '.....KKKKKK.....',
        '....KOOOOoOK....',
        '....KOOOOoOK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KggggggK....',
        '....KMMMMMMK....'
      ]);
    });

    makeTile('tile_fence_corner', (g) => {
      drawTileMatrix(g, [
        '.....KKKKKK.....',
        '....KOOOOoOK....',
        '....KOOOOoOK....',
        '....KOOWWwwKKKKK',
        '....KOOWWwwOOOOK',
        '....KOOWWWWWWWwK',
        '....KOOWWwwKKKKK',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwKKKKK',
        '....KOOWWwwOOOOK',
        '....KOOWWWWWWWwK',
        '....KOOWWwwKKKKK',
        '....KOOWWwwK....',
        '....KggggggK....',
        '....KMMMMMMK....'
      ]);
    });

    makeTile('tile_house_roof', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRRRRRRRRRRRRRK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRKKKKRRKKKKRRKK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KKKKRRKKKKRRKKKK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRKKKKRRKKKKRRKK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_house_wall', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_house_door', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRKKKKKKKKRRRRK',
        'KRRKOOOOOOKRRRRK',
        'KrrKOWWWWwKrrrrK',
        'KKKKOWWWWwKKKKKK',
        'KRRKOWWWWwKRRRRK',
        'KRRKOWWWWwKRRRRK',
        'KrrKOWWYYwKrrrrK',
        'KKKKOWWYYwKKKKKK',
        'KRRKOWWWWwKRRRRK',
        'KRRKOWWWWwKRRRRK',
        'KrrKOWWWWwKrrrrK',
        'KKKKOWWWWwKKKKKK',
        'KRRKOWWWWwKRRRRK',
        'KrrKowwwwwKrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_house_window', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRKKKKKKKKRRRRK',
        'KRRKYYYYYYKRRRRK',
        'KrrKYYYYYYKrrrrK',
        'KKKKYYKKYYKKKKKK',
        'KRRKYYKKYYKRRRRK',
        'KRRKYYYYYYKRRRRK',
        'KrrKYYYYYYKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRRRRRRRRRRRK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_shore_top', (g) => {
      drawTileMatrix(g, [
        'GGGGGHGGGGGGGHGG',
        'GGGGGGGGGGGGGGGG',
        'GGgGGGGGGgGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGHGGGGGGGGGG',
        'GgGGGGGGGGGGGGgG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM',
        'EEEEEEEEEEEEEEEE',
        'cccccccccccccccc',
        'CCCCCCCCCCCCCCCC',
        'CCCCCCCCCCCCCCCC',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz'
      ]);
    });

    makeTile('tile_shore_bottom', (g) => {
      drawTileMatrix(g, [
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'CCCCCCCCCCCCCCCC',
        'CCCCCCCCCCCCCCCC',
        'cccccccccccccccc',
        'EEEEEEEEEEEEEEEE',
        'MMMMMMMMMMMMMMMM',
        'gggggggggggggggg',
        'GgGGGGGGGGGGGGgG',
        'GGGGGHGGGGGGGGGG',
        'GGgGGGGGGgGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGHGGGGGGGHGG',
        'GGGGGGGGGGGGGGGG'
      ]);
    });

    makeTile('tile_shore_left', (g) => {
      drawTileMatrix(g, [
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz'
      ]);
    });

    makeTile('tile_shore_right', (g) => {
      drawTileMatrix(g, [
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG'
      ]);
    });

    makeTile('tile_shore_corner', (g) => {
      drawTileMatrix(g, [
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGgM',
        'GGGGGGGGGGGGgMEC',
        'GGGGGGGGGGgMECZZ',
        'GGGGGGGGgMECZZzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGgMECZZzzzzz',
        'GGGGgMECZZzzzzzz',
        'GGGgMECZZzzzzzzz',
        'GGgMECZZzzzzzzzz',
        'GgMECZZzzzzzzzzz',
        'gMECZZzzzzzzzzzz',
        'MECZZzzzzzzzzzzz',
        'ECZZzzzzzzzzzzzz',
        'CZZzzzzzzzzzzzzz'
      ]);
    });

    // ── FISHING SCENE TILEMAP TEXTURES ───────────────────────────────────────
    makeTile('tile_sand', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYyYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYyYYYYYYYYYYyYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYyYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYyYYYYYYYYYYyYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYyYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYyYYYYYYYYYYyYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_sand_wet', (g) => {
      drawTileMatrix(g, [
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAVVVVAyAyAyA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAVVVVAyA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAVVVVAyAyAyAyA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy'
      ]);
    });

    makeTile('tile_rock_shore', (g) => {
      drawTileMatrix(g, [
        'yAyAyAyAyAyAyAyA',
        'AyAKKKKKKKKKKAAy',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKSSSSSSSSSSKAy',
        'AyKKKKKKKKKKKKAA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy'
      ]);
    });

    makeTile('tile_pier_plank', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'KKKKKKKKKKKKKKKK',
        'KN..N......N..NK',
        'KN..N......N..NK',
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'KKKKKKKKKKKKKKKK',
        'KN..N......N..NK',
        'KN..N......N..NK',
        'KKKKKKKKKKKKKKKK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_pier_post', (g) => {
      drawTileMatrix(g, [
        'ZZZZKKKKKKKKZZZZ',
        'ZZZZKOOOOoOKZZZZ',
        'ZZZZKOOOOoOKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'zzzzKzzzzzzKzzzz',
        'zzzzKzzzzzzKzzzz'
      ]);
    });

    makeTile('tile_pier_lantern', (g) => {
      drawTileMatrix(g, [
        'ZZZZZZKKKKZZZZZZ',
        'ZZZZZKYYYYKZZZZZ',
        'ZZZZKYYYYYYKZZZZ',
        'ZZZZKYYYYYYKZZZZ',
        'ZZZZZKYYYYKZZZZZ',
        'ZZZZZZKKKKZZZZZZ',
        'ZZZZKKKKKKKKZZZZ',
        'ZZZZKOOOOoOKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'zzzzKzzzzzzKzzzz',
        'zzzzKzzzzzzKzzzz'
      ]);
    });

    makeTile('tile_seashell', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYKKKKKKYYYYY',
        'YYYYKFFFFFFKYYYY',
        'YYYKFFFFFFffKYYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFFffFFfKYY',
        'YYYYKFFFFFFfKYYY',
        'YYYYYKKKKKKYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_starfish', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYKKYYYYYYY',
        'YYYYYYKyYKYYYYYY',
        'YYYYYYKyYKYYYYYY',
        'YYYYYKKyyKKYYYYY',
        'YKKSKyYYYYyKSKKY',
        'YKyKyYYYYYYyKyKY',
        'YYKKYYYYYYYYKKYY',
        'YYYYKyyyyyyKYYYY',
        'YYYKKSKyKySKKYYY',
        'YYYKyyKYYKyyKYYY',
        'YYYKyKYYYYKyKYYY',
        'YYYKKYYYYYYKKYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_driftwood', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YKKKKKKKKKKKKKYY',
        'KOOOOOOOOOOOOoKY',
        'KOWWWWWWWWWWWwKY',
        'KOWWWWWWWWWWWwKY',
        'KKwWWWWWWWWWWwKK',
        'YKKKKKKKKKKKKKYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_ocean_deep', (g) => {
      drawTileMatrix(g, [
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZzZZZZZZZZZZ',
        'ZZZZZzZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZzZZZZZZ',
        'ZZZZZZZZZzZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZzZZZZZZZZZZZZZ',
        'ZZzZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZzZZZZ',
        'ZZZZZZZZZZZzZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz'
      ]);
    });

    makeTile('tile_water_foam_border', (g) => {
      drawTileMatrix(g, [
        'EEEEEEEEEEEEEEEE',
        'EEEEEEEEEEEEEEEE',
        'cccccccccccccccc',
        'cccccccccccccccc',
        'CCCCCCCCCCCCCCCC',
        'CCCCCCCCCCCCCCCC',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz'
      ]);
    });

    // ── ARCADE SCENE TILEMAP TEXTURES ────────────────────────────────────────
    makeTile('tile_space_dark', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x1E1B4B, 0.4);
      g.fillRect(0, 0, 48, 1); g.fillRect(0, 0, 1, 48);
    });

    makeTile('tile_stars_far', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x38BDF8, 0.8);
      g.fillRect(6, 9, 2, 2); g.fillRect(36, 15, 2, 2); g.fillRect(21, 39, 2, 2);
      g.fillStyle(0xA855F7, 0.8);
      g.fillRect(27, 6, 2, 2); g.fillRect(12, 27, 2, 2);
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillRect(42, 33, 2, 2); g.fillRect(18, 18, 2, 2);
    });

    makeTile('tile_stars_near', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x00FFFF, 1); g.fillRect(15, 12, 3, 9); g.fillRect(12, 15, 9, 3);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(15, 15, 3, 3);
      g.fillStyle(0xF0ABFC, 1); g.fillRect(33, 30, 3, 9); g.fillRect(30, 33, 9, 3);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(33, 33, 3, 3);
    });

    makeTile('nebula_purple', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x581C87, 0.5); g.fillRect(6, 6, 36, 36);
      g.fillStyle(0x7E22CE, 0.6); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0xA855F7, 0.7); g.fillRect(18, 18, 12, 12);
      g.fillStyle(0xEC4899, 0.8); g.fillRect(21, 21, 6, 6);
    });

    makeTile('nebula_cyan', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x083344, 0.5); g.fillRect(6, 6, 36, 36);
      g.fillStyle(0x0E7490, 0.6); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0x06B6D4, 0.7); g.fillRect(18, 18, 12, 12);
      g.fillStyle(0x67E8F9, 0.8); g.fillRect(21, 21, 6, 6);
    });

    makeTile('planet_ringed', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xFDE047, 0.9); g.fillRect(3, 21, 42, 6);
      g.fillStyle(0x38BDF8, 0.8); g.fillRect(6, 24, 36, 3);
      g.fillStyle(0xEC4899, 1); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0x9333EA, 1); g.fillRect(15, 15, 18, 18);
      g.fillStyle(0xFDE047, 0.9); g.fillRect(9, 21, 30, 3);
    });

    makeTile('planet_gas_giant', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xF97316, 1); g.fillRect(9, 9, 30, 30);
      g.fillStyle(0xEAB308, 1); g.fillRect(9, 15, 30, 6); g.fillRect(9, 27, 30, 6);
      g.fillStyle(0xA855F7, 1); g.fillRect(12, 21, 24, 6);
      g.fillStyle(0x06B6D4, 1); g.fillRect(21, 21, 6, 6);
    });

    makeTile('tile_starfield', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(6, 12, 3, 3); g.fillRect(36, 9, 3, 3); g.fillRect(21, 33, 3, 3);
      g.fillStyle(0x38BDF8, 0.8); g.fillRect(12, 39, 2, 2); g.fillRect(42, 27, 2, 2);
      g.fillStyle(0xFDE047, 0.8); g.fillRect(27, 15, 2, 2); g.fillRect(9, 24, 2, 2);
      g.fillStyle(0xA855F7, 0.7); g.fillRect(30, 42, 2, 2); g.fillRect(18, 6, 2, 2);
    });

    makeTile('tile_cosmic_bridge', (g) => {
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x4338CA, 0.6); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x6366F1, 0.8); g.fillRect(3, 3, 42, 42);
      g.fillStyle(0x818CF8, 1);
      g.fillRect(0, 0, 48, 3); g.fillRect(0, 45, 48, 3);
      g.fillRect(0, 0, 3, 48); g.fillRect(45, 0, 3, 48);
      g.fillStyle(0xC084FC, 0.9); g.fillRect(21, 21, 6, 6);
    });

    // ── DUNGEON SCENE TILEMAP TEXTURES ───────────────────────────────────────
    makeTile('tile_dungeon_floor', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 2); g.fillRect(0, 0, 2, 48);
      g.fillStyle(0x334155, 1);
      g.fillRect(6, 6, 18, 18); g.fillRect(27, 27, 15, 15);
      g.fillStyle(0x475569, 1); g.fillRect(6, 6, 18, 3); g.fillRect(6, 6, 3, 18);
    });

    makeTile('tile_dungeon_cracked', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 2); g.fillRect(0, 0, 2, 48);
      g.fillStyle(0x020617, 1);
      g.fillRect(6, 6, 3, 12); g.fillRect(9, 18, 12, 3);
      g.fillRect(21, 21, 3, 15); g.fillRect(24, 36, 18, 3);
      g.fillStyle(0x475569, 1); g.fillRect(9, 6, 3, 12); g.fillRect(24, 21, 3, 15);
    });

    makeTile('tile_dungeon_wall_moss', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1);
      g.fillRect(0, 21, 48, 3); g.fillRect(21, 0, 3, 21); g.fillRect(36, 24, 3, 24);
      g.fillStyle(0x15803D, 1);
      g.fillRect(3, 15, 15, 9); g.fillRect(24, 18, 18, 9); g.fillRect(15, 33, 15, 9);
      g.fillStyle(0x22C55E, 1);
      g.fillRect(6, 18, 9, 3); g.fillRect(27, 21, 12, 3); g.fillRect(18, 36, 9, 3);
    });

    makeTile('dungeon_torch', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x475569, 1); g.fillRect(21, 24, 6, 18); g.fillRect(18, 39, 12, 3);
      g.fillStyle(0x78350F, 1); g.fillRect(18, 18, 12, 9);
      g.fillStyle(0xFDE047, 0.25); g.fillRect(6, 0, 36, 36);
      g.fillStyle(0xEF4444, 1); g.fillRect(18, 9, 12, 12);
      g.fillStyle(0xF59E0B, 1); g.fillRect(21, 6, 6, 12);
      g.fillStyle(0xFEF08A, 1); g.fillRect(22, 6, 4, 6);
    });

    makeTile('tile_dungeon_rune', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 2); g.fillRect(0, 0, 2, 48);
      g.fillStyle(0xA855F7, 0.4); g.fillRect(9, 9, 30, 30);
      g.fillStyle(0xA855F7, 1);
      g.fillRect(15, 12, 18, 3); g.fillRect(22, 15, 4, 21); g.fillRect(15, 24, 18, 3);
      g.fillStyle(0x67E8F9, 1); g.fillRect(22, 18, 4, 9);
    });
  }

  static _genParticleTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('p_drop')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('p_drop', 2, 8, (g) => {
      g.fillStyle(0x38BDF8, 0.9); g.fillRect(0, 0, 2, 8);
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(0, 0, 2, 2);
    });

    makeTex('p_snowflake', 5, 5, (g) => {
      g.fillStyle(0xE0F2FE, 0.7); g.fillRect(2, 0, 1, 5); g.fillRect(0, 2, 5, 1);
      g.fillStyle(0xFFFFFF, 1.0); g.fillRect(2, 2, 1, 1);
    });

    makeTex('p_fog', 32, 16, (g) => {
      g.fillStyle(0xCBD5E1, 0.25);
      g.fillCircle(10, 8, 8); g.fillCircle(22, 8, 8); g.fillCircle(16, 6, 6);
    });

    makeTex('p_leaf_green', 6, 6, (g) => {
      g.fillStyle(0x4ADE80, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
      g.fillStyle(0x15803D, 1); g.fillRect(2, 2, 2, 2);
    });

    makeTex('p_leaf_orange', 6, 6, (g) => {
      g.fillStyle(0xF97316, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
      g.fillStyle(0x9A3412, 1); g.fillRect(2, 2, 2, 2);
    });

    makeTex('p_dust', 4, 4, (g) => {
      g.fillStyle(0xD97706, 0.8); g.fillRect(0, 0, 4, 4);
      g.fillStyle(0xFDE047, 0.6); g.fillRect(1, 1, 2, 2);
    });

    makeTex('p_splash', 4, 4, (g) => {
      g.fillStyle(0x38BDF8, 0.9); g.fillRect(0, 0, 4, 4);
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(1, 1, 2, 2);
    });

    makeTex('p_spark', 3, 3, (g) => {
      g.fillStyle(0xF97316, 1); g.fillRect(0, 0, 3, 3);
      g.fillStyle(0xFEF08A, 1); g.fillRect(1, 1, 1, 1);
    });

    makeTex('p_sparkle', 8, 8, (g) => {
      g.fillStyle(0xFACC15, 1); g.fillRect(3, 0, 2, 8); g.fillRect(0, 3, 8, 2);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(3, 3, 2, 2);
    });
  }

  static _genLightingTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('light_glow_soft')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('light_glow_soft', 128, 128, (g) => {
      const rad = 64;
      for (let r = rad; r > 0; r -= 4) {
        const alpha = Math.pow(1 - (r / rad), 2) * 0.7;
        g.fillStyle(0xFFFB7D, alpha);
        g.fillCircle(rad, rad, r);
      }
    });

    makeTex('light_glow_torch', 96, 96, (g) => {
      const rad = 48;
      for (let r = rad; r > 0; r -= 3) {
        const alpha = Math.pow(1 - (r / rad), 2) * 0.8;
        g.fillStyle(0xF59E0B, alpha);
        g.fillCircle(rad, rad, r);
      }
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillCircle(rad, rad, 8);
    });

    makeTex('light_glow_lantern', 64, 64, (g) => {
      const rad = 32;
      for (let r = rad; r > 0; r -= 2) {
        const alpha = Math.pow(1 - (r / rad), 2) * 0.75;
        g.fillStyle(0x38BDF8, alpha);
        g.fillCircle(rad, rad, r);
      }
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillCircle(rad, rad, 5);
    });
  }

  static _genParallaxTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('bg_distant_mountains')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('bg_distant_mountains', 256, 128, (g) => {
      g.fillStyle(0x1E1B4B, 0.85);
      g.beginPath();
      g.moveTo(0, 128); g.lineTo(0, 70); g.lineTo(40, 30); g.lineTo(90, 80);
      g.lineTo(140, 20); g.lineTo(190, 75); g.lineTo(230, 40); g.lineTo(256, 85);
      g.lineTo(256, 128);
      g.closePath(); g.fillPath();
      g.fillStyle(0x312E81, 0.6); g.fillRect(0, 100, 256, 28);
    });

    makeTex('bg_rolling_hills', 256, 128, (g) => {
      g.fillStyle(0x14532D, 0.9);
      g.fillCircle(64, 128, 80); g.fillCircle(192, 128, 90);
      g.fillStyle(0x166534, 0.8); g.fillCircle(128, 128, 70);
    });
  }

  static _genWaterTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('tile_ocean_deep_0')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    for (let f = 0; f < 4; f++) {
      makeTex(`tile_ocean_deep_${f}`, 48, 48, (g) => {
        g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 48);
        g.fillStyle(0x0369A1, 1); g.fillRect(0, 24, 48, 24);
        g.fillStyle(0x38BDF8, 1);
        const offset = f * 12;
        g.fillRect((6 + offset) % 48, 12, 12, 3);
        g.fillRect((27 + offset) % 48, 33, 15, 3);
        g.fillRect((18 + offset) % 48, 21, 9, 3);
        g.fillStyle(0xE0F2FE, 0.8);
        g.fillRect((12 + offset) % 48, 14, 6, 2);
      });
    }

    for (let f = 0; f < 4; f++) {
      makeTex(`tile_water_foam_${f}`, 48, 48, (g) => {
        g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 48);
        const foamH = Math.round(6 + Math.sin(f * Math.PI / 2) * 4);
        g.fillStyle(0x67E8F9, 1); g.fillRect(0, 0, 48, foamH + 6);
        g.fillStyle(0xFFFFFF, 1); g.fillRect(0, 0, 48, foamH);
        g.fillStyle(0xE0F2FE, 1);
        g.fillRect((f * 12) % 48, foamH, 12, 3);
        g.fillRect((f * 12 + 24) % 48, foamH + 2, 8, 3);
      });
    }
  }

  static _genBeehiveTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('beehive')) return;

    const BEEHIVE_PALETTE = {
      '.': null,
      'K': 0x0F172A,
      'k': 0x1E293B,
      'b': 0x451A03,
      'B': 0x78350F,
      'W': 0x92400E,
      'w': 0xB45309,
      'O': 0xD97706,
      'S': 0x642404,
      'D': 0x853208,
      'A': 0xA7490A,
      'M': 0xC46808,
      'Y': 0xFACC15,
      'y': 0xFDE047,
      'H': 0xFEF08A,
      'C': 0xFFFBEB,
      'G': 0xF59E0B,
      'g': 0xE08208
    };

    this.createTexture(scene, 'beehive', [
      ".......KKKKKK.......",
      ".....KKyHHHHyyKK....",
      "....KyHHyYYYYyHHyK..",
      "...KyHYDMDMDMDMYyYK.",
      "..KyYYMDMDMDMDMDYYyK",
      "..KSSSACAMMACASSSyK.",
      ".KyHYDMDMKKKKMDMDMYK",
      ".KyYMDMDkKKKKkMDMYyK",
      "KyHYDMDkKKKKKKkMDMYK",
      "KyYMDMDkKKKKKKkMDYyK",
      "KyHYDMDkKKKKKKkMDMYK",
      "KyYMDMDMkKKKKkMDMYyK",
      ".KyHYDMDMAAAAMDMDMYK",
      ".KyYSSSSSACASSSSSSyK",
      "..KyYYYYYYYYYYYYYyK.",
      "..KSSSGgCGgCGgGSSyK.",
      "...KGgC..GgC..GgCK..",
      "...Kgg...gG...ggKK..",
      "..KbOOOOOOOOOOOOwKb.",
      ".bBWWWWWWWWWWWWWWBBb",
      "bBBBBBBBBBBBBBBBBBBb",
      "bKKKKKKKKKKKKKKKKKKb"
    ], BEEHIVE_PALETTE, 20, 22, 2);

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('p_tiny_bee', 5, 5, (g) => {
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 5, 5);
      g.fillStyle(0xFDE047, 1); g.fillRect(1, 1, 3, 3);
      g.fillStyle(0x1E293B, 1); g.fillRect(2, 1, 1, 3);
      g.fillStyle(0xE0F2FE, 1); g.fillRect(1, 0, 2, 1);
    });
  }

  static _genBeeTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('bee_fly_0')) return;

    const BEE_PALETTE = {
      '.': null,
      'K': 0x0F172A,
      'k': 0x1E293B,
      'Y': 0xFDE047,
      'y': 0xD97706,
      'W': 0xE0F2FE,
      'w': 0xBAE6FD,
      'H': 0xFFFFFF
    };

    this.createTexture(scene, 'bee_fly_0', [
      "..www.....www...",
      ".wWWw.....wWWw..",
      ".wWWw.....wWWw..",
      "..www.kkk.www...",
      "....kYYYYYK.....",
      "...kYkkkYkkkY...",
      "..kYkHkYkHkYk...",
      "..kYkkkYkkkYk...",
      "..kYYYYYYYYYk...",
      "..kykkkykkkyk...",
      "...kYYYYYYYk....",
      "....kyyyykk.....",
      ".....kkyk.......",
      "................",
      "................",
      "................"
    ], BEE_PALETTE, 16, 16, 3);

    this.createTexture(scene, 'bee_fly_1', [
      "................",
      "......kkk.......",
      "....kYYYYYK.....",
      "...kYkkkYkkkY...",
      ".wWWkHkYkHkYkWWw",
      "wWWwYkkkYkkkYwWWw",
      ".wwYYYYYYYYYww..",
      "..kykkkykkkyk...",
      "...kYYYYYYYk....",
      "....kyyyykk.....",
      ".....kkyk.......",
      "................",
      "................",
      "................",
      "................",
      "................"
    ], BEE_PALETTE, 16, 16, 3);

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('p_pollen', 6, 6, (g) => {
      g.fillStyle(0xFDE047, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(2, 2, 2, 2);
    });

    makeTex('p_honey_drip', 4, 8, (g) => {
      g.fillStyle(0xF59E0B, 0.9); g.fillRect(1, 0, 2, 8); g.fillRect(0, 4, 4, 4);
      g.fillStyle(0xFEF08A, 1); g.fillRect(1, 1, 1, 3);
    });
  }

  // 1. Player Farmer 4-Direction Walk Cycle & Action Animations (Industrial Yellow Farmer Pixel Robot)
  static _genPlayerTextures(scene) {
    const P = {
      '.': null,

      // 1px Dark Outline & Contours
      'K': 0x0F172A,   // Dark slate outline (Slate 900)
      'k': 0x1E293B,   // Dark inner contour / chassis shadow (Slate 800)

      // Industrial Yellow Metallic Casing
      'Y': 0xFEF08A,   // Yellow casing metallic highlight (Yellow 200)
      'y': 0xFACC15,   // Yellow casing main base (Yellow 400)
      'J': 0xEAB308,   // Yellow casing mid-shade (Yellow 500)
      'j': 0xCA8A04,   // Yellow casing shadow (Yellow 600)

      // Metallic Gray / Slate Body, Joints & Treads
      'C': 0xE2E8F0,   // Bright metal reflection (Slate 200)
      'c': 0xCBD5E1,   // Light joint cap / accent (Slate 300)
      'm': 0x94A3B8,   // Slate gray light base (Slate 400)
      'M': 0x64748B,   // Slate gray mid base (Slate 500)
      'd': 0x475569,   // Dark metal frame / housing (Slate 600)
      'D': 0x334155,   // Deep joint shadow / inner core (Slate 700)
      'S': 0x64748B,   // Slate mid base
      's': 0x475569,   // Dark slate shadow

      // Glowing LED Visor & Screen Expressions
      'W': 0xFFFFFF,   // Bright LED glare / eye white highlight
      'L': 0xE0F2FE,   // Visor glint highlight
      'V': 0x38BDF8,   // Glowing cyan eye / pixel display (Sky 400)
      'v': 0x06B6D4,   // Visor base screen (Cyan 500)
      'z': 0x0284C7,   // Deep visor screen shadow (Sky 600)
      'Z': 0x0369A1,   // Visor frame border (Sky 700)
      'B': 0x0284C7,   // Visor cyan shadow edge
      'b': 0x0369A1,   // Visor dark border

      // Antenna Tip & Gear Accent Details
      'O': 0xFFEDD5,   // Antenna tip white glow
      'o': 0xF97316,   // Warning beacon glow (Orange 500)
      'R': 0xEF4444,   // Warning light red / Amber-orange
      'r': 0xC2410C,   // Dark amber shadow
      'A': 0xF59E0B,   // Antenna bulb / brass gear core (Amber 500)
      'a': 0xD97706,   // Brass gear shadow (Amber 600)

      // Status Indicator, Action FX, Tool & Crop Compatibility Tokens
      'G': 0x22C55E,   // Status indicator green / Crop leaf green
      'g': 0x15803D,   // Dark green indicator
      'n': 0x78350F,   // Tool wood handle
      'u': 0x38BDF8,   // Water droplet cyan
      'U': 0x0284C7,   // Deep water splash blue
      'w': 0xE0F2FE,   // Water highlight white-blue
      'X': 0xFFE0C2,   // Action highlight / detail
      'q': 0x213252,   // Chassis accent shadow
      'Q': 0x141E36,   // Deep underchassis black/shadow
      '2': 0x1E3A8A,   // Deep accent shadow
      'F': 0xD5CFBF    // Tool/action metallic accent
    };

    // 12 Walk Matrices (Designed by Explorer 2)
    const down_0 = [
      '.......KK.......',
      '......KORK......',
      '.......KK.......',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '..KYyKbCCCCbYKK.',
      '..KYyKCLWCLWbYK.',
      '..KJJyKbbbbKYJK.',
      '..KKmYYYYYYmKK..',
      '..KSmYyGRyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKDDDKKKKDDDKK.',
      '.KDmSDKKKKDmSDK.',
      '.KDsDDKKKKDsDDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const down_1 = [
      '......KKKK......',
      '.......KK.......',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '..KYyKbCCCCbYKK.',
      '..KYyKCLWCLWbYK.',
      '..KJJyKbbbbKYJK.',
      '..KKmYYYYYYmKK..',
      '..KSmYyGRyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDDKK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const down_2 = [
      '.......KK.......',
      '......KORK......',
      '.......KK.......',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '..KYyKbCCCCbYKK.',
      '..KYyKCLWCLWbYK.',
      '..KJJyKbbbbKYJK.',
      '..KKmYYYYYYmKK..',
      '..KSmYyGRyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDsDDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const up_0 = [
      '.......KK.......',
      '......KORK......',
      '.......KK.......',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '...KYyJkkJyYK...',
      '...KYyJkkJyYK...',
      '...KJJyyyyJJK...',
      '..KKmYYYYYYmKK..',
      '..KSmYyDDyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKDDDKKKKDDDKK.',
      '.KDmSDKKKKDmSDK.',
      '.KDsDDKKKKDsDDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const up_1 = [
      '......KKKK......',
      '.......KK.......',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '...KYyJkkJyYK...',
      '...KYyJkkJyYK...',
      '...KJJyyyyJJK...',
      '..KKmYYYYYYmKK..',
      '..KSmYyDDyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDDKK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const up_2 = [
      '.......KK.......',
      '......KORK......',
      '.......KK.......',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '...KYyJkkJyYK...',
      '...KYyJkkJyYK...',
      '...KJJyyyyJJK...',
      '..KKmYYYYYYmKK..',
      '..KSmYyDDyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDsDDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const left_0 = [
      '.....KK.........',
      '....KORK........',
      '.....KK.........',
      '...KKYYKKKK.....',
      '..KYyyyyyyYK....',
      '.KYyKbCCCbYYK...',
      '.KYyKCLWbYYYK...',
      '.KJJyKbbbYYJK...',
      '..KKmYYYYYmKK...',
      '..KSmYyGRySK....',
      '.KKSsDDDDDsKK...',
      '.KKDDDDDDDDDKK..',
      '.KDmSmSmSmSmDK..',
      '.KDsDsDsDsDsDK..',
      '.KDmSmSmSmSmDK..',
      '.KKKKKKKKKKKKK..'
    ];

    const left_1 = [
      '....KKKK........',
      '.....KK.........',
      '...KKYYKKKK.....',
      '..KYyyyyyyYK....',
      '.KYyKbCCCbYYK...',
      '.KYyKCLWbYYYK...',
      '.KJJyKbbbYYJK...',
      '..KKmYYYYYmKK...',
      '..KSmYyGRySK....',
      '.KKSsDDDDDsKK...',
      '.KDsDsDsDsDsDK..',
      '.KDmSmSmSmSmDK..',
      '.KDsDsDsDsDsDK..',
      '.KDmSmSmSmSmDK..',
      '.KDsDsDsDsDsDK..',
      '.KKKKKKKKKKKKK..'
    ];

    const left_2 = [
      '.....KK.........',
      '....KORK........',
      '.....KK.........',
      '...KKYYKKKK.....',
      '..KYyyyyyyYK....',
      '.KYyKbCCCbYYK...',
      '.KYyKCLWbYYYK...',
      '.KJJyKbbbYYJK...',
      '..KKmYYYYYmKK...',
      '..KSmYyGRySK....',
      '.KKSsDDDDDsKK...',
      '.KKDDDDDDDDDKK..',
      '.KDmDmDmDmDmDK..',
      '.KDsDsDsDsDsDK..',
      '.KDmDmDmDmDmDK..',
      '.KKKKKKKKKKKKK..'
    ];

    const right_0 = [
      '.........KK.....',
      '........KORK....',
      '.........KK.....',
      '.....KKKKYYKK...',
      '....KYyyyyyyYK..',
      '...KYYbCCCbYyYK.',
      '...KYYYbWLCbYyYK',
      '...KJYYbbbKyJKK.',
      '..KKmYYYYYmKK...',
      '....KSyRGyYmSK..',
      '....KKsDDDDDsKK.',
      '...KKDDDDDDDDDKK',
      '..KDmSmSmSmSmDK.',
      '..KDsDsDsDsDsDK.',
      '..KDmSmSmSmSmDK.',
      '..KKKKKKKKKKKKK.'
    ];

    const right_1 = [
      '........KKKK....',
      '.........KK.....',
      '.....KKKKYYKK...',
      '....KYyyyyyyYK..',
      '...KYYbCCCbYyYK.',
      '...KYYYbWLCbYyYK',
      '...KJYYbbbKyJKK.',
      '..KKmYYYYYmKK...',
      '....KSyRGyYmSK..',
      '....KKsDDDDDsKK.',
      '..KKsDsDsDsDsDK.',
      '..KDmSmSmSmSmDK.',
      '..KDsDsDsDsDsDK.',
      '..KDmSmSmSmSmDK.',
      '..KDsDsDsDsDsDK.',
      '..KKKKKKKKKKKKK.'
    ];

    const right_2 = [
      '.........KK.....',
      '........KORK....',
      '.........KK.....',
      '.....KKKKYYKK...',
      '....KYyyyyyyYK..',
      '...KYYbCCCbYyYK.',
      '...KYYYbWLCbYyYK',
      '...KJYYbbbKyJKK.',
      '..KKmYYYYYmKK...',
      '....KSyRGyYmSK..',
      '....KKsDDDDDsKK.',
      '...KKDDDDDDDDSDK',
      '..KDmDmDmDmDmDK.',
      '..KDsDsDsDsDsDK.',
      '..KDmDmDmDmDmDK.',
      '..KKKKKKKKKKKKK.'
    ];

    // 9 Action Matrices (Designed by Explorer 3)
    const water_down_0 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdyKnKK',
      '.KKyJJJJJJJJmMMK',
      '..KKDDDDDDDKdMK.',
      '..KKdMMMMMMKdMK.',
      '.KKDDkDDkDDKdKKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const water_down_1 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdyFKKK',
      '.KKyJJJJJJJBFKnK',
      '..KKDDDDDDDZZKMm',
      '..KKdMMMMMM2KdUK',
      '.KKDDkDDkDD2KdWK',
      '.KKKKKKKKKKKKKUK'
    ];

    const water_down_2 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdyFKKK',
      '.KKyJJJJJJJBFKKK',
      '..KKDDDDDDDZFKnK',
      '..KKdMMMMMMZKMmK',
      '.KKDDkDDkDD2KdUK',
      '.KKKKKKKKKKKKdWK'
    ];

    const harvest_down_0 = [
      '................',
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const harvest_down_1 = [
      '................',
      '................',
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYGAAgGYmKK..',
      'KKmYZaAaAaXZqXKK',
      '.KKyZsDDsZJJQK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const harvest_down_2 = [
      '.......KK.......',
      '......KAoK......',
      '..KKgXaAaAXgKK..',
      '..KKXsDDsXKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const pick_down_0 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymXKK',
      '.KKyJJJJJJJJJKXK',
      '..KKDDDDDDDDKKKK',
      '..KKdMMMMMMdKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const pick_down_1 = [
      '.......KKKKKKKKK',
      '......KAoKKXaK..',
      '...KKKKcKKKaK...',
      '..KKyyyyyyyyKDKK',
      '.KKYYYYYYYYYKKKK',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '..KKdMMMMMMdKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const pick_down_2 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '..KKdMMMMMMdKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    // 3 Standalone Tool Sprites
    const tool_watering_can = [
      '................',
      '....KKKKKKKK....',
      '....KKnKKKnKK...',
      '....KKnCCCnKK...',
      '....KKnMMMnKK...',
      '...KKdYYYYYmKK..',
      '..KKdYYYYYYYmKK.',
      '..KKdYYAaYYYmKKK',
      '..KKdYYYYYYYmKnK',
      '..KKdYYYYYYYmKdK',
      '..KKdddddddddKUK',
      '...KKKKKKKKKKKWK',
      '.............KKK',
      '................',
      '................',
      '................'
    ];

    const tool_basket = [
      '.....KKKKKK.....',
      '.....KKmmKK.....',
      '....KKmKKmKK....',
      '....KKmKKmKKK...',
      '...KKmGAAgGmKK..',
      '..KKgXaAaAXgKKK.',
      '.KKgAYsDDsYAaGKK',
      'KKmYjYjYjYjYjYmK',
      'KKmjYjYjYjYjYjmK',
      'KKmYjYjYjYjYjYmK',
      'KKmjYjYjYjYjYjmK',
      '.KKmmmmmmmmmmKKK',
      '.KKKKKKKKKKKKKKK',
      '................',
      '................',
      '................'
    ];

    const tool_sickle = [
      '................',
      '......KKKKKK....',
      '....KKKKCCCKKK..',
      '...KKKCcVVKKK...',
      '..KKKCcVVdKK....',
      '.KKKCcVVdKK.....',
      '.KKCcVVdKK......',
      'KKKCcVVdK.......',
      'KKKCcVVdK.......',
      '.KKKcVdKK.......',
      '..KKKyyjK.......',
      '...KKKyjKK......',
      '....KKKjjKK.....',
      '.....KKKJKK.....',
      '......KKKK......',
      '................'
    ];

    this.createTexture(scene, 'player_walk_down_0', down_0, P);
    this.createTexture(scene, 'player_walk_down_1', down_1, P);
    this.createTexture(scene, 'player_walk_down_2', down_2, P);
    this.createTexture(scene, 'player_walk_up_0', up_0, P);
    this.createTexture(scene, 'player_walk_up_1', up_1, P);
    this.createTexture(scene, 'player_walk_up_2', up_2, P);
    this.createTexture(scene, 'player_walk_left_0', left_0, P);
    this.createTexture(scene, 'player_walk_left_1', left_1, P);
    this.createTexture(scene, 'player_walk_left_2', left_2, P);
    this.createTexture(scene, 'player_walk_right_0', right_0, P);
    this.createTexture(scene, 'player_walk_right_1', right_1, P);
    this.createTexture(scene, 'player_walk_right_2', right_2, P);

    this.createTexture(scene, 'player_water_down_0', water_down_0, P);
    this.createTexture(scene, 'player_water_down_1', water_down_1, P);
    this.createTexture(scene, 'player_water_down_2', water_down_2, P);
    this.createTexture(scene, 'player_harvest_down_0', harvest_down_0, P);
    this.createTexture(scene, 'player_harvest_down_1', harvest_down_1, P);
    this.createTexture(scene, 'player_harvest_down_2', harvest_down_2, P);
    this.createTexture(scene, 'player_pick_down_0', pick_down_0, P);
    this.createTexture(scene, 'player_pick_down_1', pick_down_1, P);
    this.createTexture(scene, 'player_pick_down_2', pick_down_2, P);

    this.createTexture(scene, 'tool_watering_can', tool_watering_can, P);
    this.createTexture(scene, 'tool_basket', tool_basket, P);
    this.createTexture(scene, 'tool_sickle', tool_sickle, P);

    // Legacy farmer0..3 aliases
    this.createTexture(scene, 'farmer0', down_0, P);
    this.createTexture(scene, 'farmer1', down_1, P);
    this.createTexture(scene, 'farmer2', down_0, P);
    this.createTexture(scene, 'farmer3', down_2, P);

    // Register animations
    const anims = scene.anims;
    if (anims) {
      const reg = (key, frames, fps = 8) => {
        if (!anims.exists(key)) {
          anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: fps, repeat: -1 });
        }
      };
      reg('player-walk-down', ['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2']);
      reg('player-walk-up', ['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2']);
      reg('player-walk-left', ['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2']);
      reg('player-walk-right', ['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2']);

      const regOnce = (key, frames, fps = 6) => {
        if (!anims.exists(key)) {
          anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: fps, repeat: 0 });
        }
      };
      regOnce('player-water', ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']);
      regOnce('player-harvest', ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']);
      regOnce('player-pick', ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']);
    }
  }

  // 2. NPCs (Ginger Cat & Wizard)
  static _genNpcTextures(scene) {
    const C = {
      '.': null,
      'K': 0x0F172A, 'k': 0x121016,
      'H': 0xFBAE68, 'G': 0xEE7B28, 'g': 0xC86228, 'D': 0x9E3B0E, 'd': 0x782D00,
      'W': 0xFFFFFF, 'C': 0xFFF3E0, 'c': 0xF1F5F9, 'w': 0xCBD5E1,
      'P': 0xFFB3C1, 'p': 0xE67E90,
      'E': 0x55C655, 'I': 0x22C55E, 'e': 0x1E4A1E, 'L': 0xA3F0A3,
      'Z': 0x93C5FD, 'z': 0xBFDBFE
    };
    const cat_idle_0 = [
      '................',
      '...KPK.....KPK..',
      '..KHpKK...KHpKK.',
      '.KGddGGGGGGGddGK',
      '.KGdGGGGGGGGGdGK',
      '.KGWEILGGGEILWGK',
      'wKGCCCpPCCCgGKw.',
      '.KGGCCCCCCCCGGGK',
      '..KGDDCCCCDDGGK.',
      '..KGGCCCCCCGGK.K',
      '..KGgCCCCCCgGK.K',
      '..KDGCCCCCCDGGKK',
      '.KGDGGGGGGGGDDGK',
      '.KCCCCG....CCCCK',
      '.KCcCcK....KCcCc',
      '................'
    ];
    const cat_idle_1 = [
      '................',
      '...KPK.....KPK..',
      '..KHpKK...KHpKK.',
      '.KGddGGGGGGGddGK',
      '.KGdGGGGGGGGGdGK',
      '.KGeKkGGGGeKkGgK',
      'wKGCCCpPCCCgGKw.',
      '.KGGCCCCCCCCGGGK',
      '..KGDDCCCCCCDDGK',
      '..KGGCCCCCCCgK.K',
      '..KGgCCCCCCCgKK.',
      '..KDGCCCCCCDGGK.',
      '.KGDGGGGGGGGDDGK',
      '.KCCCCG....CCCCK',
      '.KCcCcK....KCcCc',
      '................'
    ];

    const cat_walk_0 = [
      '................',
      '..KPK.....KPK...',
      '.KHpKK...KHpKK..',
      'KGddGGGGGGGddGK.',
      'KGdGGGGGGGGGdGK.',
      'KGWEILGGGEILWGgK',
      'wGCCCPPCCCgGKw..',
      'KGGCCCCCCCCGGGK.',
      '.KGDDCCCCDDGGK..',
      '.KGGCCCCCCGGGK.K',
      '.KGgCCCCCCgGGKK.',
      '.KDGCCCCCCDGGK..',
      '..KCCCCG..KCCCCK',
      '..KCcCcK...KCcCc',
      '................',
      '................'
    ];
    const cat_walk_1 = [
      '...KPK.....KPK..',
      '..KHpKK...KHpKK.',
      '.KGddGGGGGGGddGK',
      '.KGdGGGGGGGGGdGK',
      '.KGWEILGGGEILWGK',
      'wKGCCCpPCCCgGKw.',
      '.KGGCCCCCCCCGGGK',
      '..KGDDCCCCDDGGK.',
      '..KGGCCCCCCGGGK.',
      '..KGgCCCCCCgGGK.',
      '..KDGCCCCCCDGGK.',
      '..KGDGGGGGGDDGK.',
      '...KCCCC..KCCCCK',
      '...KCcCc..KCcCcK',
      '................',
      '................'
    ];
    const cat_walk_2 = [
      '................',
      '....KPK.....KPK.',
      '...KHpKK...KHpKK',
      '..KGddGGGGGGGddG',
      '..KGdGGGGGGGGGDG',
      '..KGWEILGGGEILWG',
      '.wKGCCCPPCCCgGKw',
      '..KGGCCCCCCCCGGG',
      '...KGDDCCCCDDGGK',
      'K..KGGCCCCCCGGGK',
      'KK.KGgCCCCCCgGGK',
      '.K.KDGCCCCCCDGGK',
      'KCCCCK...KCCCCG.',
      'KCcCcK....KCcCcK',
      '................',
      '................'
    ];

    const cat_sit_0 = [
      '................',
      '....KPK...KPK...',
      '...KHpKK.KHpKK..',
      '..KGddGGGGddGK..',
      '..KGdGGGGGGGdGK.',
      '..KGWEILGGGEILGK',
      '.wKGCCCPPCCCgGKw',
      '..KGGCCCCCCCCGK.',
      '..KGDDCCCCDDGGK.',
      '.KGGCCCCCCCCGGGK',
      '.KGgCCCCCCCCgGGK',
      'KDGCCCCCCCCCgGGK',
      'KCCCCCCCgGGGGGGK',
      'KCcCcCcGGGGGGGK.',
      'KGGDDGGGGGGGGK..',
      '................'
    ];
    const cat_sit_1 = [
      '................',
      '...KpKK...KPK...',
      '..KHpKK..KHpKK..',
      '..KGddGGGGddGK..',
      '..KGdGGGGGGGdGK.',
      '..KGeKkGGGeEWGgK',
      '.wKGCCCPPCCCgGKw',
      '..KGGCCCCCCCCGK.',
      '..KGDDCCCCDDGGK.',
      '.KGGCCCCCCCCGGGK',
      '.KGgCCCCCCCCgGGK',
      'KDGCCCCCCCCCgGGK',
      'KCCCCCCCgGGGGGGK',
      'KCcCcCcGGGGGGGK.',
      '.KGGDDGGGGGGGK..',
      '................'
    ];

    const cat_sleep_0 = [
      '................',
      '................',
      '................',
      '................',
      '....KPK...KPK...',
      '...KHpKK.KHpKK..',
      '..KGddGGGGddGGK.',
      '.KGGeKkGGGeKkGGK',
      '.KGCCCCPCCCCGGGK',
      'KGGCCCCCCCCCCGGK',
      'KGDDCCCCCCCCDDGK',
      'KGGGGGGGGGGGGGGK',
      '.KGGDDGGGGGGDDGK',
      '..KGGGGGGGGGGGK.',
      '................',
      '................'
    ];
    const cat_sleep_1 = [
      '.........Z......',
      '........Z.......',
      '.......z........',
      '................',
      '....KPK...KPK...',
      '...KHpKK.KHpKK..',
      '..KGddGGGGddGGK.',
      '.KGGeKkGGGeKkGGK',
      '.KGCCCCPCCCCGGGK',
      'KGGGCCCCCCCCCGGK',
      'KGDDDCCCCCCDDDGK',
      'KGGGGGGGGGGGGGGK',
      '.KGGDDGGGGGGDDGK',
      '..KGGGGGGGGGGGK.',
      '................',
      '................'
    ];
    const cat_npc = cat_idle_0;

    this.createTexture(scene, 'cat_idle_0', cat_idle_0, C);
    this.createTexture(scene, 'cat_idle_1', cat_idle_1, C);
    this.createTexture(scene, 'cat_walk_0', cat_walk_0, C);
    this.createTexture(scene, 'cat_walk_1', cat_walk_1, C);
    this.createTexture(scene, 'cat_walk_2', cat_walk_2, C);
    this.createTexture(scene, 'cat_sit_0', cat_sit_0, C);
    this.createTexture(scene, 'cat_sit_1', cat_sit_1, C);
    this.createTexture(scene, 'cat_sleep_0', cat_sleep_0, C);
    this.createTexture(scene, 'cat_sleep_1', cat_sleep_1, C);
    this.createTexture(scene, 'cat_npc', cat_npc, C);

    const W_PAL = PixelArtRenderer.W_PAL;
    const wiz_0 = PixelArtRenderer.WIZ_0;
    const wiz_1 = PixelArtRenderer.WIZ_1;
    this.createTexture(scene, 'wizard_idle_0', wiz_0, W_PAL, 16, 20);
    this.createTexture(scene, 'wizard_idle_1', wiz_1, W_PAL, 16, 20);
    this.createTexture(scene, 'wizard_npc', wiz_0, W_PAL, 16, 20);

    const anims = scene.anims;
    if (anims) {
      const regCatAnim = (key, frames, frameRate, repeat = -1) => {
        if (!anims.exists(key)) {
          anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: frameRate, repeat: repeat });
        }
      };
      regCatAnim('cat-idle', ['cat_idle_0', 'cat_idle_1'], 3, -1);
      regCatAnim('cat-walk', ['cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_walk_1'], 6, -1);
      regCatAnim('cat-sit', ['cat_sit_0', 'cat_sit_1'], 3, -1);
      regCatAnim('cat-sleep', ['cat_sleep_0', 'cat_sleep_1'], 2, -1);

      if (!anims.exists('wizard-idle')) {
        anims.create({ key: 'wizard-idle', frames: [{ key: 'wizard_idle_0' }, { key: 'wizard_idle_1' }], frameRate: 3, repeat: -1 });
      }
    }
  }

  // 3. Farm Crops & Trees & Soils
  static _genCropAndTreeTextures(scene) {
    const P = {
      '.': null,
      'K': 0x121016, 'B': 0x451A03,
      'S': 0x5C3A21, 's': 0x8B5A2B, 'd': 0xA67C52,
      'L': 0x86EFAC, 'l': 0x4ADE80, 'G': 0x22C55E, 'g': 0x15803D,
      'H': 0xFDBA74, 'O': 0xF97316, 'o': 0xEA580C, 'D': 0x9A3412,
      'W': 0xF8FAFC, 'w': 0xCBD5E1, 'P': 0xF472B6, 'p': 0xDB2777,
      'X': 0xE6F4EA, 'C': 0xA7F3D0, 'c': 0x34D399, 'V': 0x059669,
      'Y': 0xFCA5A5, 'R': 0xEF4444, 'r': 0xB91C1C, 'U': 0x7F1D1D,
      'A': 0xFEF08A, 'a': 0xEAB308, 'b': 0xCA8A04, 'J': 0x854D0E,
      '*': 0xFFFFFF, '+': 0xFEF08A,
      'E': 0xEC4899, 'e': 0xBE185D, 'k': 0x78350F
    };

    // Soils
    const soil_tilled = [
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSS'
    ];
    const soil_watered = [
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'ssssssssssssssss'
    ];
    const tile_grass = [
      'GGGGGGGGGGGGGGGG',
      'GGGGGAGGGGGGAGGG',
      'GGGGGGGGGGGGGGGG',
      'GGgGGGGGGGGgGGGG',
      'GGGGGGGGGGGGGGGG',
      'GAGGGGGGGGAGGGGG',
      'GGGGGGGGGGGGGGGG',
      'GGGGgGGGGGGGGgGG',
      'GGGGGGGGGGGGGGGG',
      'GGGAGGGGGGGAGGGG',
      'GGGGGGGGGGGGGGGG',
      'GGGGGGgGGGGGGGgG',
      'GGGGGGGGGGGGGGGG',
      'GGAGGGGGGGGAGGGG',
      'gggggggggggggggg',
      'gggggggggggggggg'
    ];

    this.createTexture(scene, 'tile_tilled_soil', soil_tilled, P);
    this.createTexture(scene, 'tile_watered_soil', soil_watered, P);
    this.createTexture(scene, 'tile_grass', tile_grass, P);
    this.createTexture(scene, 'drt_dry', soil_tilled, P);
    this.createTexture(scene, 'drt_wet', soil_watered, P);

    // Crop 1: Carrot (cr_0)
    const carrot_0=[
  '................',
  '................',
  '.....K...K......',
  '....KKKKKK......',
  '...KKGLGLK......',
  '....KGGGGK......',
  '....KgGGgK......',
  '....KSSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const carrot_1=[
  '......K.........',
  '.....KKK........',
  '....KKGKK.......',
  '...KKGLGKK......',
  '....KKGGK.......',
  '.....KGGK.......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const carrot_2=[
  '...KKKK.KKKK....',
  '..KKGLKKKLGKKK..',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KKGGGGGKK....',
  '....KKGGGGK.....',
  '.....KgOOgK.....',
  '....KKSOoSKKK...',
  '..KKKSSOoSSSKKK.',
  '.KKSSSdOoSSSSSKK',
  'KKSSSSSsOoSSSSSK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const carrot_3=[
  '..KKKKK.KKKKK...',
  '.KKLGLKKKLGLKKK.',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KKKGGGKKK....',
  '.....KHOHK......',
  '....KKOOOKK.....',
  '....KOOOOOK.....',
  '...KKOOOOOKK....',
  '...KKOOOOOKK....',
  '....KKOOOKK.....',
  '.....KKOKK......',
  '......KDK.......',
  '....KKKSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKKKKKKKKKKKKKK'
];

    // Crop 2: Radish (cr_1)
    const radish_0=[
  '................',
  '................',
  '.....K...K......',
  '....KKKKKK......',
  '...KKGLGLK......',
  '....KGGGGK......',
  '....KgGGgK......',
  '....KSSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const radish_1=[
  '....KKK.KKK.....',
  '...KKGKKKGKK....',
  '...KKGGKGGKK....',
  '....KKGGGKK.....',
  '.....KGGKK......',
  '.....KgGK.......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const radish_2=[
  '..KKKK...KKKK...',
  '.KKGLKK.KKGLKK..',
  '.KKGGGKKKGGGKK..',
  '..KKGGGGGGGKK...',
  '...KKKGGGKKK....',
  '.....KpPpK......',
  '....KKPWPKK.....',
  '....KSSWSSKK....',
  '..KKKSSWSSSKKK..',
  '.KKSSSdWSSSSSKKK',
  'KKSSSSSsSSSSSSSK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const radish_3=[
  '.KKKKK...KKKKK..',
  '.KLGLKK.KKGLGK..',
  '.KKGGGKKKGGGKK..',
  '..KKGGGGGGGKK...',
  '...KKKGGGKKK....',
  '.....KpPpK......',
  '....KKPWPKK.....',
  '...KKWWWWWKK....',
  '..KKWWWWWWWKK...',
  '..KKWWWWWWSKK...',
  '...KKWWWWSKK....',
  '....KKWWWKK.....',
  '.....KKSKK......',
  '......KwK.......',
  '....KKKSKKK.....',
  '..KKKKKKKKKKKKK.'
];

    // Crop 3: Cabbage (cr_2)
    const cabbage_0=[
  '................',
  '....K..K.K..K...',
  '...KKKKKKKKK....',
  '..KKKLKKKLGKK...',
  '....KKGKKGKK....',
  '.....KgKKKK.....',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const cabbage_1=[
  '...KKKK...KKKK..',
  '...KLLK...KLLK..',
  '..KKGLKKKKKLKK..',
  '...KKGGGGGGKK...',
  '....KKGGGKKK....',
  '.....KgGKK......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const cabbage_2=[
  '....KKKKKKKK....',
  '..KKKgGGGGgKKK..',
  '.KKCGGGGGGGGCKK.',
  'KKCGGGGGGGGGGCKK',
  'KCGGGGGGGGGGGGCK',
  'KKGGGGGGGGGGGGKK',
  '.KKCGGGGGGGGCKK.',
  '..KKKKGGGKKKKK..',
  '.....KgGKK......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKKKKKKKKKKKKK.'
];
    const cabbage_3=[
  '....KKKKKK......',
  '...KKCXXXKKKK...',
  '.KKKXCXXXXCXKKK.',
  'KKCXCCCCCCCCCXKK',
  'KCXCCCCcCCCCCCCK',
  'KCXCCCCcCcCCCCCK',
  'KCXCCCCcCcCCCCCK',
  'KCXCCCCcCCCCCCCK',
  'KKCXCCCCCCCCCXKK',
  '.KKKXCXXXXCXKKK.',
  '...KKCXXXXKKK...',
  '....KSSSSSK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKKKKKKKKKKKKKKK'
];

    // Crop 4: Pepper (cr_3)
    const pepper_0=[
  '................',
  '................',
  '.....K...K......',
  '....KKKKKK......',
  '...KKGLGLK......',
  '....KGGGGK......',
  '....KgGGgK......',
  '....KSSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const pepper_1=[
  '......K.........',
  '.....KKK........',
  '....KKGKK.......',
  '...KKGLGKK......',
  '....KKGGK.......',
  '.....KGGK.......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const pepper_2=[
  '...KKKK.KKKK....',
  '..KKGLKKKLGKKK..',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KKGG+gGKK....',
  '....KKGGGKK.....',
  '.....KgGgK......',
  '....KKSgSKKK....',
  '..KKKSSSSSSKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const pepper_3=[
  '..KKKKK.KKKKK...',
  '.KKLGLKKKLGLKKK.',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KgGGKKKgK....',
  '...KgGKK.KKKKK..',
  '..KKgKK...KKGKK.',
  '.KKRYK.....KYRKK',
  '.KRrRK.....KRrKK',
  '.KRrRK.KK.KKrRK.',
  '.KKrKKKKKKKKKrKK',
  '..KKK.KRrKK.KKK.',
  '.....KKrKK......',
  '......KUK.......',
  '....KKKSKKK.....',
  '..KKKKKKKKKKKKK.'
];

    // Crop 5: Rice (cr_4)
    const rice_0=[
  '......K.........',
  '......KKK.......',
  '.....KKlK.......',
  '.....KLLK.......',
  '.....KLlK.......',
  '.....KlLK.......',
  '.....KgLK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const rice_1=[
  '.....KKKKK......',
  '....KKlLlK......',
  '...KKLLLLKK.....',
  '....KKlLlLK.....',
  '.....KLLLLK.....',
  '.....KlLlLK.....',
  '.....KgLlLK.....',
  '....KKSSSSK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const rice_2=[
  '...KKKKKKKKKK...',
  '..KKlLlLlLlLKK..',
  '.KKLLLLLLLLLLKK.',
  '..KKlLlLlLlLKK..',
  '...KKGGGGGGKK...',
  '....KKGGGGKK....',
  '.....KgGGgK.....',
  '....KKSSSSK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const rice_3=[
  '..KKKKKKKKKKK...',
  '.KKAAKAaAKAAKK..',
  '.KKAAAaAaAAAKK..',
  '..KKAbAbAbAKK...',
  '...KKAbAbAKK....',
  '....KKAbAKK.....',
  '.....KJJJK......',
  '.....KJJJK......',
  '.....KgJgK......',
  '....KKSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSSK.',
  '..KKKKKKKKKKKKK.'
];

    const cropList = [
      { name: 'carrot', cr: 'cr_0', s0: carrot_0, s1: carrot_1, s2: carrot_2, s3: carrot_3 },
      { name: 'radish', cr: 'cr_1', s0: radish_0, s1: radish_1, s2: radish_2, s3: radish_3 },
      { name: 'cabbage', cr: 'cr_2', s0: cabbage_0, s1: cabbage_1, s2: cabbage_2, s3: cabbage_3 },
      { name: 'pepper', cr: 'cr_3', s0: pepper_0, s1: pepper_1, s2: pepper_2, s3: pepper_3 },
      { name: 'rice', cr: 'cr_4', s0: rice_0, s1: rice_1, s2: rice_2, s3: rice_3 }
    ];

    cropList.forEach((c) => {
      this.createTexture(scene, 'crop_' + c.name + '_0', c.s0, P);
      this.createTexture(scene, 'crop_' + c.name + '_1', c.s1, P);
      this.createTexture(scene, 'crop_' + c.name + '_2', c.s2, P);
      this.createTexture(scene, 'crop_' + c.name + '_3', c.s3, P);

      // Legacy aliases cr_X_0..3
      this.createTexture(scene, c.cr + '_0', c.s0, P);
      this.createTexture(scene, c.cr + '_1', c.s1, P);
      this.createTexture(scene, c.cr + '_2', c.s2, P);
      this.createTexture(scene, c.cr + '_3', c.s3, P);
    });

    // Also maintain strawberry, corn, sunflower keys for 100% key parity
    this.createTexture(scene, 'crop_strawberry_0', carrot_0, P);
    this.createTexture(scene, 'crop_strawberry_1', carrot_1, P);
    this.createTexture(scene, 'crop_strawberry_2', carrot_2, P);
    this.createTexture(scene, 'crop_strawberry_3', pepper_3, P);
    this.createTexture(scene, 'crop_corn_0', carrot_0, P);
    this.createTexture(scene, 'crop_corn_1', carrot_1, P);
    this.createTexture(scene, 'crop_corn_2', carrot_2, P);
    this.createTexture(scene, 'crop_corn_3', rice_3, P);
    this.createTexture(scene, 'crop_sunflower_0', carrot_0, P);
    this.createTexture(scene, 'crop_sunflower_1', carrot_1, P);
    this.createTexture(scene, 'crop_sunflower_2', carrot_2, P);
    this.createTexture(scene, 'crop_sunflower_3', radish_3, P);

    // Apple trees
    const tree_summer=[
  '...KKKKKKKKKK...',
  '.KKKGGGGGGGGKKK.',
  'KKGGGRGGGGGRGGKK',
  'KGGGRRRGGGGGRRRK',
  'KGGGGGGGGGGGGGGK',
  'KGGGRRRGGGGGRRRK',
  'KKGGGRGGGGGRGGKK',
  '.KKKGGGGGGGGKKK.',
  '...KKKKGGKKKK...',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '.....KKBBKK.....',
  '....KKKKKKKK....'
];
    const tree_bare=[
  '......KKKK......',
  '....KKKKKKKK....',
  '...KKBK..KBKK...',
  '...KKKK..KKKK...',
  '.....KKKKKK.....',
  '.....KKBBKK.....',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '.....KKBBKK.....',
  '....KKKKKKKK....'
];

    this.createTexture(scene, 'tree_apple_summer', tree_summer, P);
    this.createTexture(scene, 'tree_apple_bare', tree_bare, P);
    this.createTexture(scene, 'apple_tree', tree_summer, P);
    this.createTexture(scene, 'apple_tree_ripe', tree_summer, P);
  }

  // 4. Fishing Scene Textures
  static _genFishingTextures(scene) {
    const P = {
      '.': null,       // Transparent
      'K': 0x0F172A,   // 1px Dark Slate Outline
      'k': 0x1E293B,   // Secondary Outline / Fin Shadow
      'R': 0xEF4444,   // Bobber Red Cap / Red accent
      'r': 0x991B1B,   // Deep Red Shadow
      'W': 0xFFFFFF,   // Specular White Eye/Scale Highlight
      'w': 0xF1F5F9,   // Belly White/Cream
      'Y': 0xFDE047,   // Bright Gold / Yellow
      'y': 0xD97706,   // Gold Shadow / Amber
      'Z': 0xF59E0B,   // Carp Bronze / Orange Base
      'z': 0xB45309,   // Deep Bronze Shadow
      'S': 0xFB923C,   // Salmon Coral / Pink-Orange
      's': 0xEA580C,   // Salmon Mid Shadow
      'H': 0xFFEDD5,   // Salmon Belly Light
      'h': 0xC2410C,   // Salmon Deep Shadow
      'U': 0x2563EB,   // Tuna Royal Blue
      'u': 0x1D4ED8,   // Tuna Dark Blue
      'B': 0x60A5FA,   // Tuna Light Blue Highlight
      'V': 0x1E3A8A,   // Tuna Navy Shadow
      'Q': 0xF472B6,   // Squid Pink
      'q': 0xDB2777,   // Squid Deep Pink
      'E': 0xFBCFE8,   // Squid Light Highlight
      'I': 0xC084FC,   // Squid Purple Iridescence
      'N': 0x475569,   // Eel Slate Grey / Wood Iron
      'n': 0x334155,   // Eel Dark Slate
      'm': 0x94A3B8,   // Eel Light Slate
      'F': 0xFF6B00,   // Goldfish Flame Orange
      'f': 0xD94600,   // Goldfish Deep Orange
      'G': 0xFFBE98,   // Goldfish Tail Fin Light
      'g': 0xFFD000,   // Goldfish Gold Accent
      'M': 0x64748B,   // Seabass Grey Base
      'T': 0x94A3B8,   // Seabass Light Grey
      't': 0x0EA5E9,   // Seabass Blue Shimmer
      'P': 0xF87171,   // Shrimp Coral Pink
      'p': 0xDC2626,   // Shrimp Red Base
      'X': 0xFECACA,   // Shrimp Light Pink Shell
      'O': 0xE11D48,   // Octopus Crimson Base
      'o': 0x9F1239,   // Octopus Dark Crimson Shadow
      'C': 0xFFE4E6,   // Octopus Suction Cup Cream / Rod Ring
      'c': 0xFB7185,   // Octopus Pink Accent
      'A': 0x4B5563,   // Catfish Mud Olive Base
      'a': 0x1F2937,   // Catfish Dark Shadow
      'e': 0x6B7280,   // Catfish Mid Grey
      'L': 0x9333EA,   // Legendary Purple
      'l': 0x6D28D9,   // Legendary Dark Purple
      'j': 0xEAB308,   // Legendary Gold Shimmer
      'D': 0x8F5428,   // Wood Base
      'd': 0x573012,   // Wood Shadow
      'x': 0xD99B66    // Wood Highlight
    };

    const carp = [
      '................',
      '.....KKKK.......',
      '...KKYZYYKK.....',
      '..KKYZZZYYYKK...',
      '.KKYZZZZYYYYYKK.',
      'KKYZZKZZYYYYYYyK',
      'KyzzzzWWWWWWWWyk',
      'Kyzzzzzzzzzzzzyk',
      '.Kyzzzzzzzzzzk..',
      '..Kyzzzzzzzyk...',
      '....Kyzzzzk.....',
      '.....KKKKK......',
      '................',
      '................',
      '................',
      '................'
    ];
    const salmon = [
      '................',
      '.....KKKK.......',
      '...KKSSSHKK.....',
      '..KKSSSKSSSSKK..',
      '.KKSSSWSSSSSSSKS',
      'KSsssssWWWWWWWhs',
      'KSsssssssssssssh',
      '.KSsssssssssssh.',
      '..KSsssssssssk..',
      '....KSsssssk....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const tuna = [
      '................',
      '.....KKKK.......',
      '...KKUUUBKK.....',
      '..KKUUUKUUUUKK..',
      '.KKUUUWUUUUUUUVY',
      'KUuuuuuWWWWWWWWu',
      'KUuuuuuuuuuuuuuu',
      '.KUuuuuuuuuuuuu.',
      '..KUuuuuuuuuuu..',
      '....KUuuuuuu....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const squid = [
      '.....KKKKKK.....',
      '...KKEEEEEEKK...',
      '..KKQQQQQQQQKK..',
      '.KKQQQKWWKQQQKK.',
      '.KKQQQQQQQQQQKK.',
      '..KKQQQQQQQQKK..',
      '...KKqIqIqIKK...',
      '....KKqqqqKK....',
      '.....Kq..qK.....',
      '.....Kq..qK.....',
      '....Kq....qK....',
      '....Kq....qK....',
      '................',
      '................',
      '................',
      '................'
    ];
    const eel = [
      '................',
      '...KKKKKK.......',
      '..KNNNmNNNKK....',
      '.KNNNKNNNNNNKK..',
      'KNNNNwWWWWNNNNK.',
      '.KNnnnnnnnnnNNK.',
      '..KKNnnnnnnnKK..',
      '....KKNnnnnKK...',
      '......KKNNKK....',
      '........KK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const goldfish = [
      '.....KKKK.......',
      '...KKFFFFKK.....',
      '..KKFFFKFFFFKK..',
      '.KKFFFWFFFFFFFGG',
      'KFFFFffWWWWFFFGG',
      'KfffffffffffffGG',
      '.KffffffffffgG..',
      '..KfffffffffGG..',
      '....Kffffffk....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const seabass = [
      '.....KKKK.......',
      '...KKMMMTKK.....',
      '..KKMMMKMMMMKK..',
      '.KKMMMtWMMMMMMKM',
      'KMmmmmmWWWWWWWWm',
      'KMmmmmmmmmmmmmmm',
      '.KMmmmmmmmmmmmm.',
      '..KMmmmmmmmmmm..',
      '....KMmmmmmm....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const shrimp = [
      '.....KKKK.......',
      '...KKPPPPKK.....',
      '..KKPPPKWWWWKK..',
      '.KKPPPPPPPPPPKK.',
      '..KKXXXXXXXXKK..',
      '...KKppppppKK...',
      '....KKppppKK....',
      '.....KKppKK.....',
      '......KKKK......',
      '.......VV.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const octopus = [
      '.....KKKKKK.....',
      '...KKOOOOOOKK...',
      '..KKOOOKWWOOKK..',
      '.KKOOOOOOOOOOKK.',
      '.KKOOOOOOOOOOKK.',
      '..KKOOOOOOOOKK..',
      '..Ko.oCo..oCo.o.',
      '..Ko.oCo..oCo.o.',
      '.Ko..oCo..oCo..o',
      '.K...k...k...K..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const catfish = [
      '.....KKKK.......',
      '...KKAAAAKK.....',
      '..KKAAAKAAAAKK..',
      'WKKAAAAEAAAAAAKA',
      'WKAaaaaWWWWWWWWa',
      '.KAaaaaaaaaaaaaa',
      '.KAaaaaaaaaaaaa.',
      '..KAaaaaaaaaaa..',
      '....KAaaaaaa....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const mackerel = [
      '.....KKKK.......',
      '...KKKKKKKK.....',
      '..KKKZZKZZKK....',
      '.KKZZZWZZZZZZZKM',
      'KKkkkkkWWWWWWWWk',
      'KKWWWWWWWWWWWWWW',
      '.KkWkWkWkWkWkWk.',
      '..Kkkkkkkkkkkk..',
      '....Kkkkkkkk....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const legendary = [
      '.....KKKKKK.....',
      '...KKKLLLLKKK...',
      '..KKLLLKLLLLKKK.',
      '.KKLLLLWLLLLLLKK',
      'KKLLLLLLWWWWWWWK',
      'KlllllllWWWWWWWK',
      'KKlllllljjjjjjKK',
      '.KKlllljjjjjjKK.',
      '..KKKlllljjKKK..',
      '....KKllllKK....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const clam = [
      '.....KKKKKK.....',
      '...KKEEQQQQKK...',
      '..KKWWEEQQqqKK..',
      '.KKWWEEQKWWqqKK.',
      '.KKWWEEQQWWqqKK.',
      '..KKEEQQqqqqKK..',
      '...KKqqqqqqKK...',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // Canonical Fish Textures
    this.createTexture(scene, 'fish_carp', carp, P);
    this.createTexture(scene, 'fish_salmon', salmon, P);
    this.createTexture(scene, 'fish_tuna', tuna, P);
    this.createTexture(scene, 'fish_squid', squid, P);
    this.createTexture(scene, 'fish_eel', eel, P);
    this.createTexture(scene, 'fish_goldfish', goldfish, P);
    this.createTexture(scene, 'fish_seabass', seabass, P);
    this.createTexture(scene, 'fish_shrimp', shrimp, P);
    this.createTexture(scene, 'fish_octopus', octopus, P);
    this.createTexture(scene, 'fish_catfish', catfish, P);
    this.createTexture(scene, 'fish_mackerel', mackerel, P);

    // Legacy Aliases for fishing scene parity
    this.createTexture(scene, 'fishing_carp', carp, P);
    this.createTexture(scene, 'fishing_salmon', salmon, P);
    this.createTexture(scene, 'fishing_tuna', tuna, P);
    this.createTexture(scene, 'fishing_squid', squid, P);
    this.createTexture(scene, 'fishing_eel', eel, P);
    this.createTexture(scene, 'fishing_golden_fish', goldfish, P);
    this.createTexture(scene, 'fishing_snapper', seabass, P);
    this.createTexture(scene, 'fishing_shrimp', shrimp, P);
    this.createTexture(scene, 'fishing_octopus', octopus, P);
    this.createTexture(scene, 'fishing_catfish', catfish, P);
    this.createTexture(scene, 'fishing_mackerel', mackerel, P);
    this.createTexture(scene, 'fishing_legendary', legendary, P);
    this.createTexture(scene, 'fishing_clam', clam, P);

    // Dock tiles & bobber & rod
    const dock_plank = [
      'KKKKKKKKKKKKKKKK',
      'KOOOOOOOOOOOOOOK',
      'KOOWWWWWWWWWWOOK',
      'KKwWWWWWWWWWWwKK',
      'KKKKKKKKKKKKKKKK',
      'KN..N......N..NK',
      'KN..N......N..NK',
      'KKKKKKKKKKKKKKKK',
      'KOOOOOOOOOOOOOOK',
      'KOOWWWWWWWWWWOOK',
      'KKwWWWWWWWWWWwKK',
      'KKKKKKKKKKKKKKKK',
      'KN..N......N..NK',
      'KN..N......N..NK',
      'KKKKKKKKKKKKKKKK',
      'KKKKKKKKKKKKKKKK'
    ];
    const dock_post = [
      '.....KKKK.......',
      '.....KxDdK......',
      '.....KxNdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxNdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KKKK.......'
    ];
    const bobber = [
      '.....KKKKKK.....',
      '....KKRRRRKK....',
      '...KKRRRRrrKK...',
      '..KKRRRRrrrrKK..',
      '..KKWWWWWWWWKK..',
      '...KKWWWWwwKK...',
      '....KKWWwwKK....',
      '.....KKwwKK.....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const rod = [
      '.............KCK',
      '............KEK.',
      '...........KCK..',
      '..........KCK...',
      '.........KBK....',
      '........KCK.....',
      '.......KCK......',
      '......KCK.......',
      '.....KxK........',
      '....KDK.........',
      '...KdK..........',
      '..KDK...........',
      '.KdK............',
      'KDK.............',
      'KdK.............',
      'KK..............'
    ];

    this.createTexture(scene, 'dock_plank', dock_plank, P);
    this.createTexture(scene, 'dock_post', dock_post, P);
    this.createTexture(scene, 'fishing_dock', dock_plank, P);
    this.createTexture(scene, 'fishing_bobber', bobber, P);
    this.createTexture(scene, 'fishing_rod', rod, P);
  }

  // 5. Arcade Scene Textures
  static _genArcadeTextures(scene) {
    // 10. Player Ship Palette & Matrix
    const P_SHIP = {
      '.': null,
      'K': 0x0F172A, 'd': 0x0369A1, 'D': 0x0369A1, 'S': 0x0284C7, 'L': 0x38BDF8,
      'C': 0x06B6D4, 'A': 0x67E8F9, 'W': 0xE0F2FE, 'R': 0xEF4444,
      'O': 0xF97316, 'Y': 0xFDE047
    };
    const ship = [
      '.......KK.......',
      '......KWWK......',
      '......KAAK......',
      '.....KCAACK.....',
      '.....KLLLSK.....',
      '....KLLSSSDK....',
      '...KSLSSSSSDK...',
      '..KSLLSSSSSSDK..',
      '.KSSLLCCCCCCSSK.',
      'KRSSSK.WW.KSSSRK',
      'KRRSSK.KK.KSSRRK',
      'KKKSSK....KSSKKK',
      '..KOYK....KOYK..',
      '..KOOK....KOOK..',
      '...KK......KK...',
      '................'
    ];

    // 11. Alien Scout
    const P_SCOUT = {
      '.': null,
      'K': 0x0F172A, 'd': 0x052E16, 'g': 0x16A34A, 'G': 0x4ADE80,
      'H': 0x86EFAC, 'C': 0x06B6D4, 'R': 0xEF4444, 'Y': 0xFDE047,
      'W': 0xFFFFFF
    };
    const scout = [
      '..CK........KC..',
      '.CKK..KKKK..KKC.',
      '..KKdKGGGGKdKK..',
      '..KGGGHHHHGGGK..',
      '.KGGgGGGGGGgGGK.',
      'KGgKKYYYYYYKKgGK',
      'KGgKYYRWWRYYKgGK',
      'KGgKYYRRRRYYKgGK',
      '.KGGKYYYYYYKGGK.',
      '..KGGgGGGGgGGK..',
      '...KGGGGGGGGK...',
      '....KGgddgGK....',
      '....KCK..KCK....',
      '.....KK..KK.....',
      '................',
      '................'
    ];

    // 12. Alien Shooter
    const P_SHOOTER = {
      '.': null,
      'K': 0x0F172A, 'd': 0x3B0764, 'p': 0x6B21A8, 'P': 0x9333EA,
      'H': 0xC084FC, 'M': 0xEC4899, 'B': 0xF472B6, 'E': 0xFDE047,
      'W': 0xFFFFFF
    };
    const shooter = [
      '......KKKK......',
      '....KKHHHHKK....',
      '..KKPPHHHHPPKK..',
      '.KMKPPHPPPHPPKMK',
      '.KMBKPPEEEPPBKMK',
      '.KMBKPWWEWWPKMB.',
      '.KMPKPEEEEEPKPM.',
      '.KMPPKPPPPPKPPMK',
      '..KKPppPPPppKK..',
      '...KKpPPPPpKK...',
      '....KKppddppKK..',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................'
    ];

    // 13. Alien Elite
    const P_ELITE = {
      '.': null,
      'K': 0x0F172A, 'd': 0x431407, 'o': 0x9A3412, 'O': 0xEA580C,
      'Y': 0xFB923C, 'F': 0xFDE047, 'C': 0x06B6D4, 'A': 0x67E8F9,
      'W': 0xFFFFFF
    };
    const elite = [
      'KFK..........KFK',
      'KAFK........KFAK',
      '.KCYK......KYCK.',
      '..KYYK....KYYK..',
      '..KYYYYYYYYYYK..',
      '.KYYYOOOOOOYYYK.',
      '.KYYKCAAAACKYYK.',
      '.KYYKCAWWACKYYK.',
      '.KYYKCAAAACKYYK.',
      '.KYYOOOOOOOOYYK.',
      '..KdOOOOOOOOdK..',
      '...KdOOOOOOdK...',
      '....KFFKKFFK....',
      '....KK....KK....',
      '................',
      '................'
    ];

    // 14. Alien Boss (Dreadnought)
    const P_BOSS = {
      '.': null,
      'K': 0x0F172A, 'd': 0x500724, 'b': 0x881337, 'r': 0xBE123C,
      'R': 0xE11D48, 'H': 0xFB7185, 'G': 0x22C55E, 'P': 0xA855F7,
      'Y': 0xFDE047, 'W': 0xFFFFFF
    };
    const boss = [
      '..KKKKKKKKKKKK..',
      '.KRRHHHHHHHHRRK.',
      'KRRRRRRRRRRRRRRK',
      'KRRRKGKRRRKGKRRK',
      'KRRRKGKRRRKGKRRK',
      'KRRRKKKKKKKKRRRK',
      '.KRRRRKPPKRRRRK.',
      '.KRRRKPWWPKRRRK.',
      '..KRRRKPPKRRRK..',
      '..KRRRRRRRRRRK..',
      '.KbRbRRRRRRbRbK.',
      'KbRbKYYKYYKbRbK.',
      'KbRbKYYKYYKbRbK.',
      '.KKbKKKKKKKKbKK.',
      '...KK......KK...',
      '................'
    ];

    // 15. Laser Player
    const P_LASER = {
      '.': null,
      'K': 0x0F172A, 'd': 0x083344, 'C': 0x06B6D4, 'A': 0x38BDF8,
      'B': 0x67E8F9, 'W': 0xFFFFFF
    };
    const laser = [
      '.....KK....KK...',
      '....KABK..KABK..',
      '....KAWK..KAWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KAWK..KAWK..',
      '....KABK..KABK..',
      '.....KK....KK...',
      '................'
    ];

    // 16. Powerup Weapon
    const P_PW_WEAPON = {
      '.': null,
      'K': 0x0F172A, 'd': 0x451A03, 'y': 0xCA8A04, 'Y': 0xEAB308,
      'E': 0xFDE047, 'R': 0xEF4444, 'r': 0x991B1B, 'W': 0xFFFFFF
    };
    const pw_weapon = [
      '......KKKK......',
      '....KKEEEEKK....',
      '...KEEWWEEEEK...',
      '..KEEEKRRKEEEYK.',
      '.KEEEErRRrEEEEYK',
      '.KEEEErRRrEEEEYK',
      '.KEEEErRRrEEEEYK',
      '..KEEEKRRKEEEYK.',
      '...KYYEEEEYYYK..',
      '....KKYYYYKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 17. Powerup Shield
    const P_PW_SHIELD = {
      '.': null,
      'K': 0x0F172A, 'd': 0x0C4A6E, 's': 0x0284C7, 'S': 0x38BDF8,
      'C': 0xBAE6FD, 'w': 0xE0F2FE, 'W': 0xFFFFFF
    };
    const pw_shield = [
      '......KKKK......',
      '....KKCCCCKK....',
      '...KCCWWCCCCK...',
      '..KCCSSWWSSCCCK.',
      '.KCCSSSSWWSSCSCK',
      '.KCSSSSSSSSSSSCK',
      '.KCSSSSSSSSSSSCK',
      '..KCSSSSssssSCK.',
      '...KSSSSssssSK..',
      '....KKssssKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 18. Powerup Nuke
    const P_PW_NUKE = {
      '.': null,
      'K': 0x0F172A, 'd': 0x450A0A, 'r': 0x991B1B, 'R': 0xDC2626,
      'a': 0xF87171, 'Y': 0xFDE047, 'W': 0xFFFFFF
    };
    const pw_nuke = [
      '......KKKK......',
      '....KKaaaaKK....',
      '...KaaWWaaaaK...',
      '..KaaYYKKYYaaK..',
      '.KaaYYYYYYYYaaK.',
      '.KaaYYKKKKYYaaK.',
      '.KaaRKKYYKKRaaK.',
      '..KaaRRKKRRaaK..',
      '...KaaRRRRaaK...',
      '....KKRRRRKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'arcade_player_ship', ship, P_SHIP);
    this.createTexture(scene, 'alien_scout', scout, P_SCOUT);
    this.createTexture(scene, 'alien_shooter', shooter, P_SHOOTER);
    this.createTexture(scene, 'alien_elite', elite, P_ELITE);
    this.createTexture(scene, 'alien_boss', boss, P_BOSS);
    this.createTexture(scene, 'laser_player', laser, P_LASER);
    this.createTexture(scene, 'powerup_weapon', pw_weapon, P_PW_WEAPON);
    this.createTexture(scene, 'powerup_shield', pw_shield, P_PW_SHIELD);
    this.createTexture(scene, 'powerup_nuke', pw_nuke, P_PW_NUKE);
  }

  // 6. Dungeon Scene Textures
  static _genDungeonTextures(scene) {
    // 1. Slime
    const P_SLIME = {
      '.': null, 'K': 0x0F172A, 'd': 0x064E3B, 's': 0x059669,
      'G': 0x10B981, 'g': 0x34D399, 'H': 0xA7F3D0, 'Y': 0xFDE047,
      'W': 0xFFFFFF, 'D': 0x0F172A
    };
    const slime = [
      '.....KKKKKK.....',
      '...KKGGGGGGKK...',
      '..KGGgHHHHgGGK..',
      '.KGGgHYWYHYWgGK.',
      '.KGsHYDYHYDYsGK.',
      '.KGssgHHgHHgssGK',
      '.KGGssgGGgssGGK.',
      '.KGGGGsGGsGGGGK.',
      '..KGGGssssGGGK..',
      '...KKGGGGGGKK...',
      '....KGsddsGK....',
      '.....KdsddK.....',
      '......KdK.......',
      '................',
      '................',
      '................'
    ];

    // 2. Skeleton Archer
    const P_SKELETON = {
      '.': null, 'K': 0x0F172A, 'd': 0x1C1917, 'b': 0x78716C,
      'B': 0xD6D3D1, 'W': 0xF5F5F4, 'R': 0xEF4444, 'S': 0x78350F,
      'y': 0xD97706, 'M': 0x94A3B8, 'm': 0x64748B
    };
    const skeleton = [
      '.....KKKKKK.....',
      '...KKWWWWWWKK...',
      '..KWWbWWbWWWWK..',
      '.KWWKRKWKRKWWWK.',
      '.KWWKKKKKKKWWWK.',
      '..KWbWbWbWbWWK..',
      '...KKWWWWWWKK...',
      '....KSBBBBBSK.M.',
      '...KSBBWWWBBSSM.',
      '..KSBBWKKKWBSmS.',
      '.KSBBWK...KWBSmS',
      'KSyBBK....KWBSmS',
      'KSyBK......KBSmS',
      '.KSK.......KK.S.',
      '................',
      '................'
    ];

    // 3. Goblin Warrior
    const P_GOBLIN = {
      '.': null, 'K': 0x0F172A, 'd': 0x052E16, 'e': 0x14532D,
      'E': 0x16A34A, 'H': 0x4ADE80, 'm': 0x334155, 'M': 0x64748B,
      'w': 0xCBD5E1, 'R': 0xDC2626, 'W': 0xFFFFFF
    };
    const goblin = [
      '....KKK..KKK....',
      '...KEEEKKEEEK...',
      '..KEEHKEEKHEEK..',
      '.KEEERREEEERRKEK',
      '.KEEEEKKEEKKEEEK',
      '..KEEEWWWWEEEK..',
      '...KEEEEEEEEK...',
      '..KKMMMMMMMMKK..',
      '.KMMMmwMMwmMMMK.',
      '.KMmmmwMMwmMMMK.',
      '.KEEmMMMMMMmEEK.',
      '..KEKMMMMMMKEK..',
      '...KKEKKKKEK....',
      '....KEK..KEK....',
      '....KK....KK....',
      '................'
    ];

    // 4. Demon Lord Boss
    const P_DUNGEON_BOSS = {
      '.': null, 'K': 0x0F172A, 'd': 0x450A0A, 'b': 0x18181B, 'B': 0x18181B,
      'm': 0x52525B, 'M': 0x52525B, 'R': 0x991B1B, 'D': 0xDC2626, 'F': 0xF97316,
      'Y': 0xFDE047, 'E': 0xFEF08A, 'W': 0xFFFFFF
    };
    const boss = [
      'KBK..........KBK',
      'KMBK........KMBK',
      '.KMBKKKKKKKKMBK.',
      '..KMBBDDDDDDBMK.',
      '..KDDDFFFDDDDK..',
      '.KDDDKEKDDKEKDK.',
      '.KDDDKKKKKKKKDK.',
      '.KDDFDDWWDDFFDK.',
      '..KDDFYYFDDDK...',
      '...KDDDDDDDDK...',
      '..KKbBDDDDDbBKK.',
      '.KbMbKYYYYKbMbK.',
      '.KbMbKYFFYKbMbK.',
      '..KMbKKKKKKMbK..',
      '...KK......KK...',
      '................'
    ];

    // 5. Loot Chest
    const P_CHEST = {
      '.': null, 'K': 0x0F172A, 'd': 0x291E0B, 's': 0x451A03,
      'S': 0x78350F, 'y': 0xB45309, 'f': 0xB8860B, 'F': 0xEAB308,
      'Y': 0xFEF08A, 'N': 0x0F172A
    };
    const chest = [
      '....KKKKKKKK....',
      '..KKFYYYYYYFKK..',
      '.KFFsSSSSSSsFFK.',
      '.KFFsSSSSSSsFFK.',
      '.KFFFffffffFFFK.',
      '.KFFsSSNNSSsFFK.',
      '.KFFsSSNNSSsFFK.',
      '.KFFFffffffFFFK.',
      '.KFFsSSSSSSsFFK.',
      '.KFFsSSSSSSsFFK.',
      '..KKFYYYYYYFKK..',
      '....KKKKKKKK....',
      '................',
      '................',
      '................',
      '................'
    ];

    // 6. Loot Coin
    const P_COIN = {
      '.': null, 'K': 0x0F172A, 'd': 0x78350F, 'f': 0xCA8A04,
      'F': 0xEAB308, 'Y': 0xFDE047, 'E': 0xFEF08A, 'W': 0xFFFFFF
    };
    const coin = [
      '......KKKK......',
      '....KKYYYYKK....',
      '...KEEWWYYYYK...',
      '..KYYFFfFFYYYK..',
      '.KYYFFFfFFFYYYK.',
      '.KYYFFFfFFFYYYK.',
      '..KYYFFfFFYYYK..',
      '...KYYffffffK...',
      '....KKffffKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 7. Loot Gem
    const P_GEM = {
      '.': null, 'K': 0x0F172A, 'd': 0x083344, 'c': 0x0E7490,
      'C': 0x06B6D4, 'A': 0x38BDF8, 'W': 0xE0F2FE, 'S': 0xFFFFFF
    };
    const gem = [
      '......KKKK......',
      '....KKWWAAKK....',
      '...KSSAAAAAAK...',
      '..KWWCCCCcCCAK..',
      '.KWWCCCCCCccCAK.',
      '.KWWCCCCCCccCAK.',
      '..KWWCCCCcCCAK..',
      '...KWWccccAAK...',
      '....KKccccKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 8. Loot Potion
    const P_POTION = {
      '.': null, 'K': 0x0F172A, 'd': 0x450A0A, 'p': 0x78350F,
      'y': 0xD97706, 'r': 0x991B1B, 'P': 0xEF4444, 'a': 0xF87171,
      'A': 0xFCA5A5, 'Y': 0xFEF08A, 'W': 0xFFFFFF
    };
    const potion = [
      '......KKKK......',
      '......KppK......',
      '.....KKyyKK.....',
      '....KKaaWaaKK...',
      '...KaaWWaPaaAK..',
      '..KaaWPPYPPPAAK.',
      '..KaaWPPPPPAAK..',
      '...KaaPrrPAAK...',
      '....KKrrrrKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 9. Loot Scroll
    const P_SCROLL = {
      '.': null, 'K': 0x0F172A, 'd': 0x451A03, 's': 0xD97706,
      'Y': 0xFDE047, 'W': 0xFFFEF0, 'w': 0xFEF08A, 'r': 0x991B1B,
      'R': 0xEF4444, 'F': 0xF59E0B
    };
    const scroll = [
      '......KKKK......',
      '....KKWWYYKK....',
      '...KWWWWYYYYK...',
      '..KWWWWRRYYYYK..',
      '.KWWWWWRRYYYYYK.',
      '.KWWWWFRRRYYYYK.',
      '..KWWWWRRYYYYK..',
      '...KWWWWYYYYK...',
      '....KKssssKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'dungeon_green_slime', slime, P_SLIME);
    this.createTexture(scene, 'dungeon_goblin_warrior', goblin, P_GOBLIN);
    this.createTexture(scene, 'dungeon_skeleton_archer', skeleton, P_SKELETON);
    this.createTexture(scene, 'dungeon_boss', boss, P_DUNGEON_BOSS);

    this.createTexture(scene, 'loot_coin', coin, P_COIN);
    this.createTexture(scene, 'loot_gem', gem, P_GEM);
    this.createTexture(scene, 'loot_potion', potion, P_POTION);
    this.createTexture(scene, 'loot_chest', chest, P_CHEST);
    this.createTexture(scene, 'loot_scroll', scroll, P_SCROLL);
  }

  static _genBossTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('boss_fire_golem')) return;

    // 1. Fire Golem Boss
    const P_FIRE_GOLEM = {
      '.': null, 'K': 0x0F172A, 'r': 0x450A0A, 'R': 0x78350F,
      'f': 0xB91C1C, 'F': 0xEF4444, 'o': 0xF97316, 'Y': 0xFDE047, 'W': 0xFFFFFF
    };
    const fire_golem = [
      '.....KooooK.....',
      '....KoffffoK....',
      '..KKrrrrrrrrKK..',
      '.KrrRFFFFFFRrrK.',
      '.KrRFWYYYYWFREK.',
      '.KrRFYWWWWYFRrK.',
      '.KrrRFFFFFFRrEK.',
      '..KKrrrrrrrrKK..',
      '.KffRooooooooRffK',
      'KffRYYYYYYYYYRffK',
      'KffRYWYYYYWWYRFfK',
      '.KffRooooooooRffK',
      '..KKrrrrrrrrKK..',
      '..KrRrK..KrRrK..',
      '..KrRrK..KrRrK..',
      '..KKKKK..KKKKK..'
    ];

    // 2. Shadow Dragon Boss
    const P_SHADOW_DRAGON = {
      '.': null, 'K': 0x0F172A, 'd': 0x1E1B4B, 'v': 0x312E81,
      'p': 0x5B21B6, 'V': 0x7C3AED, 'E': 0xC084FC, 'W': 0xFFFFFF, 'w': 0x4C1D95
    };
    const shadow_dragon = [
      'K...KK....KK...K',
      'KwKKvdKKKKdvKKwK',
      'KwwwvdvvvvdvwwwK',
      '.KwwwvPPPPvwwwK.',
      '..KwKPPEEPPKwK..',
      '..KwPEWWWWEPwK..',
      '..KwPEWWWWEPwK..',
      '..KwKPPEEPPKwK..',
      '...KvvVVVVvvK...',
      '..KvvVVVVVVvvK..',
      '.KvvVVpVVpVVvvK.',
      '.KvvVVVVVVVVvvK.',
      '..KvvVVVVVVvvK..',
      '..KddK....KddK..',
      '..KddK....KddK..',
      '..KKKK....KKKK..'
    ];

    // 3. Ice Lich Boss
    const P_ICE_LICH = {
      '.': null, 'K': 0x0F172A, 'i': 0x0284C7, 'I': 0x0369A1,
      'c': 0x38BDF8, 'C': 0x7DD3FC, 'W': 0xE0F2FE, 'S': 0xFFFFFF, 'm': 0x1E293B
    };
    const ice_lich = [
      '.....KCSSCK.....',
      '....KCCCCCCK....',
      '...KcCCCCCCcK...',
      '..KicKWWWWKciK..',
      '..KiKWSWWSWKCiK.',
      '..KiKWSWWSWKCiK.',
      '..KicKWWWWKciK..',
      '...KcCCCCCCcK...',
      '..KmmCCCCCCmmK..',
      '.KmmmCWWWW CmmmK',
      '.KmmmCWSWSCmmmK.',
      '.KmmmCWWWW CmmmK',
      '..KmmCCCCCCmmK..',
      '...KmmmmmmmmK...',
      '....KmmmmmmK....',
      '.....KKKKKK.....'
    ];

    // 4. Cyber Kraken Boss
    const P_CYBER_KRAKEN = {
      '.': null, 'K': 0x0F172A, 'k': 0x111827, 'd': 0x1F2937,
      'n': 0x06B6D4, 'N': 0x22D3EE, 'p': 0xD946EF, 'P': 0xF0ABFC, 'W': 0xFFFFFF
    };
    const cyber_kraken = [
      '....KKNNNNKK....',
      '..KKNNWWWWNNKK..',
      '.KNNddNNNNddNNK.',
      'KNNdNNWWWWNNdNNK',
      'KNNdNPWWWWPNdNNK',
      'KNNdNPWWWWPNdNNK',
      'KNNdNNWWWWNNdNNK',
      '.KNNddNNNNddNNK.',
      '..KKNNPPPPNNKK..',
      '.KpPKNNNNNNKpPK.',
      'KpP...KNNK...PpK',
      'KpP...KNNK...PpK',
      'KpP...KNNK...PpK',
      '.KpPK.KNNK.KPpK.',
      '..KKK.KKKK.KKK..',
      '................'
    ];

    this.createTexture(scene, 'boss_fire_golem', fire_golem, P_FIRE_GOLEM);
    this.createTexture(scene, 'boss_shadow_dragon', shadow_dragon, P_SHADOW_DRAGON);
    this.createTexture(scene, 'boss_ice_lich', ice_lich, P_ICE_LICH);
    this.createTexture(scene, 'boss_cyber_kraken', cyber_kraken, P_CYBER_KRAKEN);
  }
}

const K = {
  '.':null,
  'G':0x5DA832,'g':0x4A9225,'H':0x77CC44,'d':0x3A7015,
  'A':0x9A6538,'a':0x7A480A,'B':0xC48E58,
  'W':0x5C3010,'w':0x3E1C08,'J':0xFFFFFF,
  'O':0xB87838,'o':0xD8A860,'U':0x885018,
  'L':0x4AC83A,'l':0x32A820,'M':0x227A12,'m':0x1A5C08,
  'K':0x886030,'k':0x604018,'s':0xA88048,
  'X':0xF9D09B,'x':0xD8A070,'N':0x2A1A0A,'I':0xFFB3B3,
  'T':0xB87838,'t':0xD8A060,'V':0x7A4E18,
  'Z':0x5B8DD9,'z':0x3A6BA8,
  'Q':0x3D5A80,'q':0x2D4A70,
  'R':0x6B3A18,'r':0x4A2810,'S':0x8B5A38,
  'P':0x3AA828,'p':0x228018,'v':0x5EC83A,
  'C':0xAEAA9E,'c':0x8C8880,'b':0xC8C4BA,
};
function drawS(g, rows, ox=0, oy=0) {
  rows.forEach((row, ry) => {
    for(let rx=0; rx<row.length; rx++) {
      const col=K[row[rx]]; if(col==null) continue;
      g.fillStyle(col,1); g.fillRect((ox+rx)*PS,(oy+ry)*PS,PS,PS);
    }
  });
}
function pR(g,x,y,w,h,col,a=1){g.fillStyle(col,a);g.fillRect(x*PS,y*PS,w*PS,h*PS);}

// ═══════════════ SPRITE DATA ══════════════════════════════════════════════════
const GRASS=[
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGHGGGGGGGGGG','GgGGGGGGGGGGGGGg','GGGGGGGGGGGGGGGG','GGGGGGGGgGGGGGgG',
  'GGGGGGGGGGGGGGGG','GgGGGGGGGGGGGGGG','GGGGGgGGGGGGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGJJJGGGGGGG',
  'GGGGGJdAJGGGGGGG','GgGGGGJJJGGGGGGg','GGGGGGGpGGGGGGGG','GGGGGGGpGGGGgGGG',
  'GGGGGGGGGGGGGGGG','GgGGGGGGGGGGGGGG','GGGGGgGGGGGGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGHGGGGGGGGGG','GgGGGGGGGGGGGGGg','GGGGGGGGGGGbbbGG','GGGGGGGGGGGCCCGG',
  'GGGGGGGGGGGcccGG','GgGGGGGGGGGGGGGG','GGGGGgGGGGGGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGpdGGGGGGGG',
  'GGGGGGpGGGGGGGGG','GgGGGpdpGGGGGGGg','GGGGGGpGpGGGGGGG','GGGGGdGGGGGGgGGG',
  'GGGGGGGGGGGGGGGG','GgGGGGGGGGGGGGGG','GGGGGGGGGGGpdGGG','GGGGGGGGGGGpGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
];
const DIRT_DRY=[
  'BAAAaAaAAAaAAaAA',
  'BAaAAAAAAAAAAAaA',
  'BAAAAaAAAAAAAAaA',
  'BaaaaaaaaaaaaaAA',
  'BAAAAAAAAAAAAaAa',
  'BaAAAaAAAAAAAAAa',
  'BAAAAAAAAAAAAAAA',
  'BAAAAAaAAAAAaAAA',
  'BaAAAAAAAAAAAAAa',
  'BAAAAAAaAAAAAAAA',
  'BAaAAAAAAAAAAAAA',
  'BaaaaaaaaaaaaaAA',
  'BAAAAaAAAAAAAAaA',
  'BAaAAAAAaAAAAAaA',
  'BAAAAAAAAAAAAAAA',
  'bBBBBBBBBBBBBBBB'
];
const DIRT_WET=[
  'WWwWWWWWWWWWWWww',
  'WwWWWWJWWWWWWwWw',
  'WWWWWWWWWWWWWwWW',
  'WwWWWWWWWWWWWWwW',
  'wwwwwwwwwwwwwwww',
  'WWWWWwwWWWWWWWWW',
  'WWWwWWWWWwWWWWWW',
  'WwWWWWWWWWWWWWwW',
  'WWWWWWwWWWWWWWWW',
  'WwWWWWWWWWJWWWwW',
  'WWWWWWWWWWwWWWWW',
  'WWwWWWWwWWWWWWWW',
  'WwWWWWWWWWWWWWwW',
  'WWWWWWWWWWWWWwWW',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww'
];

// ═══════════════ GAME CONSTANTS ═══════════════════════════════════════════════
const TILE=48, PLAYER_SPD=210, PLOT_SIZE=48, PLOT_COLS=3, PLOT_GAP=18;
const CROP_ICONS=['🌸','🥬','🍓','🌽','🌻'];

// Gold reward: smooth diminishing returns (see advancePlot harvest logic)
// Curve: 10 → 8 → 7 → 6 → 5 → 4 → 4 → 3 → 3 → 3... (min 3)
const LEVEL_COST = (idx) => idx === 0 ? 0 : Math.floor(50 * Math.pow(1.8, idx - 1));
// Level 2: 50, Level 3: 90, Level 4: 162, Level 5: 292, Level 6: 525

// ═══════════════ SPACED REPETITION SCHEDULER (SM-2) ═════════════════════════
//
// Previously `SR1`/`SR2` were the whole of "SRS": two fixed timers, 30 and 90 seconds,
// with no interval, ease factor or due date stored anywhere. That is crop-growth
// pacing, not spaced repetition — a player could reach "100% mastery" on 1500 words in
// one sitting and remember none of it the next day.
//
// The fix keeps the game feel intact by recognising that the existing three-touch loop
// (plant → 30s → water → 90s → harvest) is exactly Anki's *learning steps*. So those
// timers stay, and a day-scale review layer sits on top:
//
//   new ──plant──> learn ──steps──> review ──due in N days──> review ...
//                    ↑                  │
//                    └──── relearn <────┘  (failed a mature word)
//
// A word graduates when it is harvested, entering review with a 1-day interval. From
// then on it resurfaces when due, as a single recall rather than the full three-touch
// cycle. Scheduling is deliberately un-fuzzed so behaviour is reproducible and testable.
const SRS_CFG = {
  LEARN_STEPS:   [30 * 1000, 90 * 1000],  // matches the seedling → wilt → ripe pacing
  RELEARN_STEPS: [60 * 1000],
  GRADUATE_IVL: 1,     // days — every word enters review here, no shortcuts
  MATURE_IVL:   21,    // days — Anki's mature-card threshold, used for the Mastery stat
  START_EASE:   2.5,
  MIN_EASE:     1.3,
  MAX_EASE:     3.0,
  MAX_IVL:      730,   // 2 years
  LAPSE_IVL_MULT: 0.5, // a lapsed word keeps half its interval when it returns
  // Fraction of the scheduled interval that must actually elapse before a correct answer
  // is allowed to grow it. Reviewing early is not punished, it just earns nothing.
  EARLY_REVIEW_RATIO: 0.8,
};

const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;

const _clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function srsNewEntry() {
  return { st: 'new', step: 0, ivl: 0, ease: SRS_CFG.START_EASE, reps: 0, lapses: 0, due: 0, last: 0 };
}

// Pure: returns a fresh entry, never mutates its argument. `now` is injected so the
// scheduler can be tested across simulated days.
function srsSchedule(entry, grade, now) {
  const e = { ...srsNewEntry(), ...(entry || {}) };
  const g = _clamp(grade | 0, 0, 3);
  // Captured before e.last is overwritten — the review branch needs to know how long the
  // player actually waited, and reading e.last after the assignment always yields zero.
  const prevLast = e.last;
  e.last = now;

  const enterLearning = (steps, stateName) => {
    e.st = stateName;
    e.step = 0;
    e.due = now + steps[0];
  };

  const graduate = (ivlDays) => {
    e.st = 'review';
    e.step = 0;
    e.ivl = _clamp(Math.round(ivlDays), 1, SRS_CFG.MAX_IVL);
    e.due = now + e.ivl * DAY_MS;
    e.reps++;
  };

  if (e.st === 'new') {
    // First exposure always enters the learning steps, whatever the grade. Anki lets Easy
    // graduate a card immediately, but there Easy is a deliberate "I already knew this"
    // self-report; here the grade is inferred from answer speed, and a fast click on a
    // four-option question is not evidence of knowing anything.
    enterLearning(SRS_CFG.LEARN_STEPS, 'learn');
    return e;
  }

  if (e.st === 'learn' || e.st === 'relearn') {
    const steps = e.st === 'learn' ? SRS_CFG.LEARN_STEPS : SRS_CFG.RELEARN_STEPS;
    if (g === GRADE.AGAIN) {
      e.step = 0;
      e.due = now + steps[0];
      return e;
    }
    if (g === GRADE.HARD) {
      // Repeat the current step rather than advancing.
      e.due = now + steps[Math.min(e.step, steps.length - 1)];
      return e;
    }
    // GOOD and EASY both advance exactly one step, graduating off the end.
    //
    // Anki lets Easy skip the rest of the learning steps, but its Easy is the player saying
    // "I already knew this". Here it is inferred from answering inside six seconds, which a
    // learner shown the word thirty seconds ago will manage from short-term memory — that is
    // not evidence the word will survive a week. Requiring every step also keeps the
    // scheduler in step with the crop visuals: seedling, sprout, ripe, harvested.
    e.step++;
    if (e.step >= steps.length) {
      // A relearning word returns on the interval it kept when it lapsed.
      graduate(e.st === 'relearn' ? Math.max(SRS_CFG.GRADUATE_IVL, e.ivl) : SRS_CFG.GRADUATE_IVL);
    } else {
      e.due = now + steps[e.step];
    }
    return e;
  }

  // st === 'review'
  // Failing is always a lapse, whether or not the review was due.
  if (g === GRADE.AGAIN) {
    e.lapses++;
    e.ease = _clamp(e.ease - 0.20, SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
    e.ivl = _clamp(Math.round(e.ivl * SRS_CFG.LAPSE_IVL_MULT), 1, SRS_CFG.MAX_IVL);
    enterLearning(SRS_CFG.RELEARN_STEPS, 'relearn');
    return e;
  }

  // An interval is a claim about how long the word survives in memory, so it can only be
  // earned by actually waiting. Reviewing ahead of schedule proves nothing new: the answer
  // still counts as a rep and the card is rescheduled, but the interval does not grow.
  //
  // Without this a player could answer the same word three times in one minute and compound
  // 1d → 4d → 10d → 25d straight past the 21-day maturity line, which is precisely the
  // "100% mastery in one sitting" problem this scheduler exists to fix.
  const waitedMs = prevLast ? (now - prevLast) : e.ivl * DAY_MS;
  const onSchedule = waitedMs >= e.ivl * DAY_MS * SRS_CFG.EARLY_REVIEW_RATIO;
  if (!onSchedule) {
    graduate(e.ivl);   // same interval, new due date, rep still credited
    return e;
  }

  // Each branch advances by at least a day so an interval can never stall.
  if (g === GRADE.HARD) {
    e.ease = _clamp(e.ease - 0.15, SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
    graduate(Math.max(e.ivl + 1, e.ivl * 1.2));
  } else if (g === GRADE.GOOD) {
    graduate(Math.max(e.ivl + 1, e.ivl * e.ease));
  } else {
    e.ease = _clamp(e.ease + 0.15, SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
    graduate(Math.max(e.ivl + 1, e.ivl * e.ease * 1.3));
  }
  return e;
}

// ── Predicates ───────────────────────────────────────────────────────────────
// "graduated" gates content: reachable inside one session, so the minigames and quests
// do not sit locked for weeks. "mature" is the long-haul Mastery stat.
function srsIsGraduated(e) { return !!e && (e.st === 'review' || e.st === 'relearn'); }
function srsIsMature(e)    { return !!e && e.st === 'review' && e.ivl >= SRS_CFG.MATURE_IVL; }
function srsIsDue(e, now)  { return !!e && e.st !== 'new' && e.due > 0 && now >= e.due; }
function srsIsLearning(e)  { return !!e && (e.st === 'learn' || e.st === 'relearn'); }

// Human-readable interval, for the vocab book and dashboard.
function srsIntervalLabel(e) {
  if (!e || e.st === 'new') return 'new';
  if (srsIsLearning(e)) return 'learning';
  if (e.ivl >= 365) return (e.ivl / 365).toFixed(1) + 'y';
  if (e.ivl >= 30) return Math.round(e.ivl / 30) + 'mo';
  return e.ivl + 'd';
}

// Plot sState codes: ''=empty '1'=seedling '2'=wilting '3'=sprout '4'=ripe
let srsData  = {}; // { ko: srsNewEntry() }
let plotSave = []; // [{ i, ko, sState, plantedAt }]
let droppedItemsSave = []; // [{ itemId, nameKo, x, y }] persisted ground drops buffer
var PLOT_UNLOCK_COSTS = [100, 200, 350, 500, 750, 1000];
var BASE_PLOT_COUNT = 9;              // plots 0-8 are free from the start
var unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
var unlockedPlotCount = 9;

// Membership is decided by `unlockedPlots` alone. The old version also accepted
// `i < unlockedPlotCount`, which handed out a free plot: buying, say, plot 11 pushed
// unlockedPlots.length to 10, so unlockedPlotCount became 10 and plot index 9 —
// never paid for — passed the count check.
function isPlotUnlocked(i) {
  if (i < BASE_PLOT_COUNT) return true;
  if (Array.isArray(unlockedPlots) && unlockedPlots.includes(i)) return true;
  // Legacy saves (v3 and earlier) stored only a count, with plots unlocked in order.
  if (!Array.isArray(unlockedPlots) && typeof unlockedPlotCount === 'number') {
    return i < unlockedPlotCount;
  }
  return false;
}

// ── Unified File-Based Save (pywebview API → file, localStorage as backup) ─────
let fishAlbumSave = {}; // { ko: count }

// ═══════════════ R1: TRIPLE CURRENCY ECONOMY & SAVE V4 ═══════════════════════
var playerCurrencies = { coins: 85, gems: 10, honor: 0 };
var gold = 85; // kept in sync for 100% backward compatibility
var quizStreak = 0; // consecutive correct quiz streak

var ITEM_DB = {
  '배추': { id: 'cabbage', name: 'Napa Cabbage', nameKo: '배추', icon: '🥬', description: 'Fresh Napa cabbage harvested from the plot.' },
  '무': { id: 'radish', name: 'Korean Radish', nameKo: '무', icon: '🥔', description: 'Crunchy white Korean radish.' },
  '파': { id: 'green_onion', name: 'Green Onion', nameKo: '파', icon: '🌱', description: 'Fragrant green onions.' },
  '고추': { id: 'chili', name: 'Chili Pepper', nameKo: '고추', icon: '🌶️', description: 'Spicy red chili pepper.' },
  '마늘': { id: 'garlic', name: 'Garlic', nameKo: '마늘', icon: '🧄', description: 'Pungent garlic cloves.' },
  '쌀': { id: 'rice', name: 'Rice', nameKo: '쌀', icon: '🌾', description: 'Staple Korean white rice.' },
  '콩': { id: 'soybean', name: 'Soybean', nameKo: '콩', icon: '🫘', description: 'Nutritious yellow soybeans.' },
  '당근': { id: 'carrot', name: 'Carrot', nameKo: '당근', icon: '🥕', description: 'Sweet orange carrot.' },
  '감자': { id: 'potato', name: 'Potato', nameKo: '감자', icon: '🥔', description: 'Fresh farm potato.' },
  '옥수수': { id: 'corn', name: 'Corn', nameKo: '옥수수', icon: '🌽', description: 'Sweet farm corn on the cob.' },
  '딸기': { id: 'strawberry', name: 'Strawberry', nameKo: '딸기', icon: '🍓', description: 'Sweet garden strawberry.' },
  '사과': { id: 'apple', name: 'Apple', nameKo: '사과', icon: '🍎', description: 'Crisp Orchard Apple.' },
  '연어': { id: 'salmon', name: 'Salmon', nameKo: '연어', icon: '🐟', description: 'Fresh river salmon.' },
  '고등어': { id: 'mackerel', name: 'Mackerel', nameKo: '고등어', icon: '🐟', description: 'Flavorful ocean mackerel.' },
  '오징어': { id: 'squid', name: 'Squid', nameKo: '오징어', icon: '🦑', description: 'Tender ocean squid.' },
  '잉어': { id: 'carp', name: 'Carp', nameKo: '잉어', icon: '🐟', description: 'Crystal pond carp.' },
  '새우': { id: 'shrimp', name: 'Shrimp', nameKo: '새우', icon: '🦐', description: 'Fresh sea shrimp.' },
  '문어': { id: 'octopus', name: 'Octopus', nameKo: '문어', icon: '🐙', description: 'Giant sea octopus.' },
  '조개': { id: 'clam', name: 'Clam', nameKo: '조개', icon: '🦪', description: 'Fresh shore clam.' },
  '황금물고기': { id: 'golden_fish', name: 'Golden Fish', nameKo: '황금물고기', icon: '🐠', description: 'Rare golden fish.' },
  '꿀': { id: 'honey', name: 'Honey', nameKo: '꿀', icon: '🍯', type: 'ingredient', description: 'Sweet golden honey harvested from the beehive.' }
};

function getItemInfo(keyOrId) {
  if (!keyOrId) return { key: 'unknown', id: 'unknown', name: 'Item', nameKo: '아이템', icon: '📦', description: 'Unknown Item' };
  if (ITEM_DB[keyOrId]) return { key: keyOrId, ...ITEM_DB[keyOrId] };
  for (const [k, val] of Object.entries(ITEM_DB)) {
    if (val.id === keyOrId) return { key: k, ...val };
  }
  return { key: keyOrId, id: keyOrId, name: keyOrId, nameKo: keyOrId, icon: '📦', description: keyOrId };
}

var inventoryState = {
  maxSlots: 20,
  ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 },
  seeds: {},
  scrolls: 0,
  cookedDishes: {}
};

function getUsedInventorySlots() {
  if (!inventoryState) return 0;
  inventoryState.ingredients = inventoryState.ingredients || {};
  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.seeds = inventoryState.seeds || {};

  let count = 0;
  for (const k in inventoryState.ingredients) {
    if (inventoryState.ingredients[k] > 0) count++;
  }
  for (const k in inventoryState.cookedDishes) {
    if (inventoryState.cookedDishes[k] > 0) count++;
  }
  for (const k in inventoryState.seeds) {
    if (inventoryState.seeds[k] > 0) count++;
  }
  return count;
}

function addItemToInventory(itemId, qty = 1) {
  if (!itemId || qty <= 0) return false;
  inventoryState = inventoryState || {};
  inventoryState.ingredients = inventoryState.ingredients || {};
  inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;

  const info = getItemInfo(itemId);
  const key = info.key;

  // Stacking within existing slot
  if (typeof inventoryState.ingredients[key] !== 'undefined' && inventoryState.ingredients[key] > 0) {
    inventoryState.ingredients[key] += qty;
    if (typeof persistSave === 'function') persistSave();
    return true;
  }

  // Capacity check for new slot
  if (getUsedInventorySlots() >= inventoryState.maxSlots) {
    return false;
  }

  inventoryState.ingredients[key] = (inventoryState.ingredients[key] || 0) + qty;
  if (typeof persistSave === 'function') persistSave();
  return true;
}

function removeItemFromInventory(itemId, qty = 1) {
  if (!itemId || qty <= 0) return false;
  inventoryState = inventoryState || {};
  inventoryState.ingredients = inventoryState.ingredients || {};

  const info = getItemInfo(itemId);
  const key = info.key;

  if (!inventoryState.ingredients[key] || inventoryState.ingredients[key] < qty) {
    return false;
  }

  inventoryState.ingredients[key] -= qty;
  if (inventoryState.ingredients[key] <= 0) {
    delete inventoryState.ingredients[key];
  }
  if (typeof persistSave === 'function') persistSave();
  return true;
}

function expandInventoryCapacity() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  const cost = 50;
  inventoryState = inventoryState || {};
  inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  if (!spendCoins(cost)) {
    if (typeof showToast === 'function') showToast(`Need ${cost} Coins 🪙 to expand inventory capacity!`);
    return false;
  }
  inventoryState.maxSlots += 5;
  if (typeof persistSave === 'function') persistSave();
  if (typeof renderInventoryGrid === 'function') renderInventoryGrid();
  if (typeof showToast === 'function') showToast(`🎒 Capacity expanded +5 slots! Total: ${inventoryState.maxSlots} slots.`);
  return true;
}

var recipeState = {
  unlockedRecipes: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'samgyeopsal', 'haemul_pajeon', 'japchae', 'samgyetang', 'gimbap', 'honey_yakgwa', 'honey_tea']
};
var activeBuffs = {};
let seasonalState = { activeSeasonId: 'autumn_harvest_2026', seasonPoints: 0, claimedRewards: [] };
let leaderboardState = { personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, duelMaxWinStreak: 0, totalWordsMastered: 0 } };
var cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };

function syncGoldAlias() {
  gold = playerCurrencies.coins;
}

function migrateSaveData(d) {
  if (!d) return null;
  const data = JSON.parse(JSON.stringify(d));
  if (!data.v || data.v < 4) {
    console.log(`[Save Migration] Upgrading schema from v${data.v || 1} -> v4`);
    const legacyGold = typeof data.gold === 'number' ? data.gold : 0;
    data.currencies = data.currencies || {};
    data.currencies.coins = typeof data.currencies.coins === 'number' ? data.currencies.coins : legacyGold;
    data.currencies.gems = typeof data.currencies.gems === 'number' ? data.currencies.gems : 0;
    data.currencies.honor = typeof data.currencies.honor === 'number' ? data.currencies.honor : 0;

    data.gold = data.currencies.coins;
    data.quests = data.quests || {
      mainStep: 1,
      mainProgress: { harvests: 0, mastered: 0, kills: 0, fish: 0, score: 0, duels: 0 },
      mainCompleted: [],
      daily: [],
      weekly: [],
      lastDailyReset: 0,
      lastWeeklyReset: 0
    };
    data.inventory = data.inventory || { maxSlots: 20, ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 }, seeds: {}, scrolls: 0, cookedDishes: {} };
    data.inventory.maxSlots = typeof data.inventory.maxSlots === 'number' ? data.inventory.maxSlots : 20;
    data.recipes = data.recipes || { unlockedRecipes: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'samgyeopsal', 'haemul_pajeon', 'japchae', 'samgyetang', 'gimbap', 'honey_yakgwa', 'honey_tea'] };
    data.activeBuffs = data.activeBuffs || {};
    data.seasonal = data.seasonal || { activeSeasonId: 'autumn_harvest_2026', seasonPoints: 0, claimedRewards: [] };
    data.leaderboards = data.leaderboards || {
      personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, duelMaxWinStreak: 0, totalWordsMastered: 0 }
    };
    data.droppedItems = Array.isArray(data.droppedItems) ? data.droppedItems : [];
    data.v = 4;
  }

  // v4 -> v5: the SRS schema changed from {p2At, p3At, harvests} to a real SM-2 entry.
  //
  // Existing players must not be reset to zero. The old data has no interval or ease, but
  // harvest count is a usable proxy for how well a word was known: each harvest was a
  // successful three-touch recall. Seeding intervals from it means a veteran save keeps
  // its progress and simply starts getting sensible review dates from now on.
  //
  // Intervals are staggered by harvest count so a save with hundreds of learned words does
  // not dump all of them into a single day's review queue.
  if (!data.v || data.v < 5) {
    console.log(`[Save Migration] Upgrading SRS schema v${data.v || 4} -> v5 (SM-2)`);
    const now = Date.now();
    const oldSrs = (data.srs && typeof data.srs === 'object') ? data.srs : {};
    const harvests = (data.harvests && typeof data.harvests === 'object') ? data.harvests : {};
    const migrated = {};

    // Every word the old save knew about, from either source.
    const kos = new Set([...Object.keys(oldSrs), ...Object.keys(harvests)]);
    kos.forEach(ko => {
      const prev = oldSrs[ko] || {};
      // Already migrated (or written by a newer build) — leave it alone.
      if (prev.st) { migrated[ko] = prev; return; }

      const h = Math.max(0, (typeof harvests[ko] === 'number' ? harvests[ko] : 0) | 0,
                            (typeof prev.harvests === 'number' ? prev.harvests : 0) | 0);

      if (h <= 0) {
        // Seen but never completed a cycle. If it was mid-learning, keep it in learning.
        const e = srsNewEntry();
        if (prev.p2At || prev.p3At) { e.st = 'learn'; e.step = prev.p3At ? 1 : 0; e.due = now; }
        migrated[ko] = e;
        return;
      }

      // Graduated. Interval grows with harvest count but is capped below maturity, so
      // "mature" still has to be earned under the real scheduler rather than granted.
      const e = srsNewEntry();
      e.st = 'review';
      e.reps = h;
      e.ivl = Math.min(SRS_CFG.MATURE_IVL - 1, Math.max(1, Math.round(Math.pow(h, 1.4))));
      e.ease = _clamp(SRS_CFG.START_EASE + (h >= 5 ? 0.1 : 0), SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
      e.last = now;
      // Spread the queue: 1 day apart per harvest tier, so they do not all land at once.
      e.due = now + Math.min(e.ivl, 1 + (h % 7)) * DAY_MS;
      migrated[ko] = e;
    });

    data.srs = migrated;
    data.v = 5;
  }
  if (data.inventory && typeof data.inventory.maxSlots !== 'number') {
    data.inventory.maxSlots = 20;
  }

  if (Array.isArray(data.unlockedPlots)) {
    data.unlockedPlots = Array.from(new Set(data.unlockedPlots));
  } else if (typeof data.unlockedPlotCount === 'number') {
    const arr = [];
    for (let i = 0; i < Math.min(15, data.unlockedPlotCount); i++) arr.push(i);
    data.unlockedPlots = arr;
  } else {
    data.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  }
  data.unlockedPlotCount = typeof data.unlockedPlotCount === 'number'
    ? data.unlockedPlotCount
    : data.unlockedPlots.length;

  // Ensure data.cooking object exists and populate from inventory.cookedDishes if legacy save
  data.cooking = data.cooking || { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  data.cooking.cookedRecipes = Array.isArray(data.cooking.cookedRecipes) ? data.cooking.cookedRecipes : [];
  data.cooking.recipeStats = (typeof data.cooking.recipeStats === 'object' && data.cooking.recipeStats !== null) ? data.cooking.recipeStats : {};
  data.cooking.totalDishesCooked = typeof data.cooking.totalDishesCooked === 'number' ? data.cooking.totalDishesCooked : 0;

  if (data.inventory && data.inventory.cookedDishes && data.cooking.cookedRecipes.length === 0) {
    const cookedKeys = Object.keys(data.inventory.cookedDishes).filter(k => data.inventory.cookedDishes[k] > 0);
    if (cookedKeys.length > 0) {
      data.cooking.cookedRecipes = cookedKeys;
      data.cooking.recipeStats = { ...data.inventory.cookedDishes };
      let sum = 0;
      for (const val of Object.values(data.inventory.cookedDishes)) {
        sum += (typeof val === 'number' ? val : 0);
      }
      data.cooking.totalDishesCooked = sum;
    }
  }

  return data;
}

// Collect ALL game state into ONE object
function collectSave(){
  const hcObj={}; harvestCounts.forEach((v,k)=>hcObj[k]=v);
  const isFarm = sceneRef && Array.isArray(sceneRef.plots);
  const plots = isFarm
    ? sceneRef.plots.filter(p => p && p.ko).map(p => ({ i: p.index, ko: p.ko, sState: p.sState, plantedAt: p.plantedAt || 0 }))
    : plotSave;
  const apple = (sceneRef && typeof sceneRef.appleRipeAt !== 'undefined')
    ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe }
    : appleTreeSave;
  const drops = (sceneRef && Array.isArray(sceneRef.droppedItems))
    ? sceneRef.droppedItems.map(item => ({ itemId: item.itemId, nameKo: item.nameKo, x: item.curX, y: item.curY }))
    : droppedItemsSave;
  droppedItemsSave = drops;
  return {
    v: 5,
    currencies: playerCurrencies,
    gold: playerCurrencies.coins,
    unlockedLevels,
    unlockedTrophies,
    unlockedPlots,
    unlockedPlotCount,
    harvests: hcObj,
    srs: srsData,
    plots,
    lastLevel: currentLevelIndex,
    apple,
    fishAlbum: fishAlbumSave,
    quests: questState,
    inventory: inventoryState,
    recipes: recipeState,
    activeBuffs: activeBuffs,
    seasonal: seasonalState,
    leaderboards: leaderboardState,
    droppedItems: drops,
    cooking: cookingState
  };
}

// Apply a save snapshot to the in-memory state
function applySave(d){
  if(!d) return false;
  const migrated = migrateSaveData(d);
  if(!migrated) return false;
  
  playerCurrencies = migrated.currencies || { coins: migrated.gold || 0, gems: 0, honor: 0 };
  syncGoldAlias();
  
  unlockedLevels = Array.isArray(migrated.unlockedLevels) ? migrated.unlockedLevels : [0];
  unlockedTrophies = Array.isArray(migrated.unlockedTrophies) ? migrated.unlockedTrophies : [];
  if (Array.isArray(migrated.unlockedPlots)) {
    unlockedPlots = migrated.unlockedPlots.slice();
  } else if (typeof migrated.unlockedPlotCount === 'number') {
    // Legacy save: only a count was stored, with plots unlocked in order.
    unlockedPlots = Array.from({ length: migrated.unlockedPlotCount }, (_, i) => i);
  } else {
    unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  }
  // Grandfather any plot that already holds a crop. isPlotUnlocked used to accept
  // `i < unlockedPlotCount`, which let one purchase unlock an extra plot for free;
  // that plot was never recorded in unlockedPlots, so tightening the check would
  // strand a crop on a now-locked tile. Keep what players already planted.
  if (Array.isArray(migrated.plots)) {
    migrated.plots.forEach(p => {
      if (p && typeof p.i === 'number' && p.ko && !unlockedPlots.includes(p.i)) unlockedPlots.push(p.i);
    });
  }
  unlockedPlots.sort((a, b) => a - b);
  unlockedPlotCount = unlockedPlots.length;
  if(migrated.harvests) Object.entries(migrated.harvests).forEach(([k,v])=>harvestCounts.set(k,v));
  if(migrated.srs) srsData = migrated.srs;
  if(migrated.plots) plotSave = migrated.plots;
  if(typeof migrated.lastLevel==='number') currentLevelIndex = migrated.lastLevel;
  if(migrated.apple) appleTreeSave = migrated.apple;
  if(migrated.fishAlbum) fishAlbumSave = migrated.fishAlbum;
  if(migrated.quests) questState = migrated.quests;
  if(migrated.inventory) {
    inventoryState = migrated.inventory;
    inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  }
  if(migrated.recipes) recipeState = migrated.recipes;
  if(migrated.activeBuffs) activeBuffs = migrated.activeBuffs;
  if(migrated.seasonal) seasonalState = migrated.seasonal;
  if(migrated.leaderboards) leaderboardState = migrated.leaderboards;
  if(Array.isArray(migrated.droppedItems)) {
    droppedItemsSave = migrated.droppedItems;
    if(sceneRef) {
      sceneRef.clearAllDroppedItems();
      droppedItemsSave.forEach(drop => sceneRef.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
    }
  }
  if(migrated.cooking) {
    cookingState = {
      cookedRecipes: Array.isArray(migrated.cooking.cookedRecipes) ? migrated.cooking.cookedRecipes : [],
      totalDishesCooked: typeof migrated.cooking.totalDishesCooked === 'number' ? migrated.cooking.totalDishesCooked : 0,
      recipeStats: (typeof migrated.cooking.recipeStats === 'object' && migrated.cooking.recipeStats !== null) ? migrated.cooking.recipeStats : {}
    };
  } else {
    cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  }

  initQuestState();
  updateCurrencyHUD();
  if (sceneRef && typeof sceneRef.refreshPlotAccess === 'function') sceneRef.refreshPlotAccess();
  if (typeof checkCookingAchievements === 'function') checkCookingAchievements();
  return true;
}

// Write to file (pywebview) AND localStorage backup.
//
// collectSave() serializes the entire game state — currencies, SRS for 1500 words,
// plots, inventory, quests, recipes, buffs, seasonal, leaderboards, ground drops.
// persistSave() is called from ~35 places, including on every quiz answer, so writes
// are coalesced behind a trailing debounce. Use flushSave() when the state must reach
// disk immediately (scene shutdown, page unload, explicit Save button).
const SAVE_DEBOUNCE_MS = 800;
let _saveTimer = null;
let _savePending = false;

async function flushSave(){
  if(_saveTimer){ clearTimeout(_saveTimer); _saveTimer = null; }
  _savePending = false;
  const data = collectSave();
  try{ localStorage.setItem('hv_save_v2', JSON.stringify(data)); }catch{}
  if(window.pywebview?.api){
    try{ await window.pywebview.api.save(data); }catch(e){ console.warn('File save failed:',e); }
  }
}

function persistSave(){
  _savePending = true;
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; flushSave(); }, SAVE_DEBOUNCE_MS);
}

// Never drop a pending write when the page goes away. pagehide covers the mobile and
// Safari case where beforeunload does not fire; the synchronous localStorage leg of
// flushSave is what reliably lands during teardown.
if(typeof window !== 'undefined' && window.addEventListener){
  const flushIfPending = () => { if(_savePending) flushSave(); };
  window.addEventListener('beforeunload', flushIfPending);
  window.addEventListener('pagehide', flushIfPending);
  if(typeof document !== 'undefined' && document.addEventListener){
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden') flushIfPending();
    });
  }
}

// Read from file first, then localStorage backup
async function loadSave(){
  if(window.pywebview?.api){
    try{
      const d = await window.pywebview.api.load();
      if(d && applySave(d)){ console.log('[Save] Loaded from file ✓'); return; }
    }catch(e){ console.warn('File load failed:',e); }
  }
  try{
    const s = localStorage.getItem('hv_save_v2');
    if(s && applySave(JSON.parse(s))){ console.log('[Save] Loaded from localStorage ✓'); return; }
  }catch{}
  console.log('[Save] No save found – fresh start.');
}

// Legacy aliases
function saveSRS()   { persistSave(); }
function savePlotsFn() { persistSave(); }
function saveEconomy() { persistSave(); }
function loadSRS()   {}
function loadEconomy() {}
function getSrs(ko){ return srsData[ko] || srsNewEntry(); }
function setSrs(ko,u){ srsData[ko]={...getSrs(ko),...u}; saveSRS(); }

// Record a review outcome. This is the only place the scheduler is advanced.
function gradeWord(ko, grade, now = Date.now()){
  const next = srsSchedule(getSrs(ko), grade, now);
  srsData[ko] = next;
  saveSRS();
  return next;
}

// Words the player owns that are due for review right now, soonest first.
function srsDueWords(now = Date.now()){
  const seen = new Set();
  const out = [];
  unlockedLevels.forEach(idx => (levelsData[idx]?.words || []).forEach(w => {
    if (seen.has(w.ko)) return;
    seen.add(w.ko);
    const e = srsData[w.ko];
    if (srsIsDue(e, now)) out.push({ word: w, entry: e });
  }));
  out.sort((a, b) => a.entry.due - b.entry.due);
  return out;
}

// Review forecast for the next `days` days, for the progress dashboard.
function srsForecast(days = 7, now = Date.now()){
  const buckets = new Array(days).fill(0);
  Object.values(srsData).forEach(e => {
    if (!srsIsGraduated(e) || !e.due) return;
    const d = Math.floor((e.due - now) / DAY_MS);
    if (d >= 0 && d < days) buckets[d]++;
  });
  return buckets;
}

function srsStats(){
  const all = Object.values(srsData);
  const graduated = all.filter(srsIsGraduated);
  const reps = graduated.reduce((s, e) => s + (e.reps || 0), 0);
  const lapses = graduated.reduce((s, e) => s + (e.lapses || 0), 0);
  return {
    seen: all.length,
    learning: all.filter(srsIsLearning).length,
    graduated: graduated.length,
    mature: all.filter(srsIsMature).length,
    dueNow: srsDueWords().length,
    // Share of reviews answered without a lapse — the closest thing to a retention rate
    // the game can measure without logging every single answer.
    retention: reps + lapses > 0 ? Math.round((reps / (reps + lapses)) * 100) : null,
    avgEase: graduated.length
      ? +(graduated.reduce((s, e) => s + e.ease, 0) / graduated.length).toFixed(2)
      : null
  };
}

// ═══════════════ ECONOMY STATE & CURRENCY HELPERS ════════════════════════════
var unlockedLevels = [0];  // Level indices the player has bought
var unlockedTrophies = []; // IDs of the trophies the player has bought
const harvestCounts = new Map(); // word.ko → how many times harvested

// ── Display labels: English primary, Korean kept alongside ───────────────────
// levels.json carries both (`name`/`nameEn`, `category`/`categoryEn`); the Korean
// topic label is itself learnable content, so it is shown rather than discarded.
function levelName(lvl)   { return (lvl && (lvl.nameEn || lvl.name)) || ''; }
function levelNameKo(lvl) { return (lvl && lvl.nameEn && lvl.name) ? lvl.name : ''; }
function wordCategory(w)  { return (w && (w.categoryEn || w.category)) || ''; }

function getUnlockedWords() {
  if (typeof unlockedLevels === 'undefined' || !Array.isArray(unlockedLevels)) {
    return (typeof levelsData !== 'undefined' && levelsData[0]?.words) ? levelsData[0].words : [];
  }
  const words = unlockedLevels.flatMap(idx => (typeof levelsData !== 'undefined' && levelsData[idx]?.words) ? levelsData[idx].words : []);
  if (words.length > 0) return words;
  return (typeof levelsData !== 'undefined' && levelsData[0]?.words) ? levelsData[0].words : [];
}

function addCoins(amount) {
  let finalAmt = amount;
  if (amount > 0) {
    if (typeof isBuffActive === 'function' && isBuffActive('coin_boost')) {
      finalAmt = Math.round(finalAmt * 2.0);
    }
    if (typeof seasonalState !== 'undefined' && seasonalState?.activeSeasonId === 'childrens_day') {
      finalAmt = Math.round(finalAmt * 2.0);
    }
  }
  playerCurrencies.coins = Math.max(0, playerCurrencies.coins + finalAmt);
  syncGoldAlias();
  persistSave();
  updateCurrencyHUD(true);
  checkAffordablePacks();
}

function addGems(amount) {
  let finalGems = amount;
  if (amount > 0 && typeof seasonalState !== 'undefined' && seasonalState?.activeSeasonId === 'seollal') {
    finalGems += 1;
  }
  playerCurrencies.gems = Math.max(0, playerCurrencies.gems + finalGems);
  syncGoldAlias();
  persistSave();
  updateCurrencyHUD(true);
  showToast(`💎 Earned +${finalGems} Gem${finalGems > 1 ? 's' : ''}!`);
}

function addHonor(amount) {
  let finalHonor = amount;
  if (amount > 0 && typeof seasonalState !== 'undefined' && seasonalState?.activeSeasonId === 'chuseok') {
    finalHonor = Math.round(finalHonor * 1.5);
  }
  playerCurrencies.honor = Math.max(0, playerCurrencies.honor + finalHonor);
  syncGoldAlias();
  persistSave();
  updateCurrencyHUD(true);
  showToast(`🎖️ Earned +${finalHonor} Honor!`);
  checkQuestProgress('honor', { total: playerCurrencies.honor });
  if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
}

function spendCoins(amount) {
  if (playerCurrencies.coins >= amount) {
    playerCurrencies.coins -= amount;
    syncGoldAlias();
    persistSave();
    updateCurrencyHUD();
    return true;
  }
  return false;
}

function spendGems(amount) {
  if (playerCurrencies.gems >= amount) {
    playerCurrencies.gems -= amount;
    syncGoldAlias();
    persistSave();
    updateCurrencyHUD();
    return true;
  }
  return false;
}

function addGold(amount) {
  addCoins(amount);
}

function updateCurrencyHUD(pop = false) {
  const el = document.getElementById('gold-val');
  if (el) el.textContent = playerCurrencies.coins;
  const bg = document.getElementById('shop-gold-val');
  if (bg) bg.textContent = playerCurrencies.coins;
  const tz = document.getElementById('trophy-gold-val');
  if (tz) tz.textContent = playerCurrencies.coins;

  const gVal = document.getElementById('gems-val');
  if (gVal) gVal.textContent = playerCurrencies.gems;
  const hVal = document.getElementById('honor-val');
  if (hVal) hVal.textContent = playerCurrencies.honor;

  if (pop) {
    const hg = document.getElementById('hud-gold');
    if (hg) { hg.classList.add('pop'); setTimeout(() => hg.classList.remove('pop'), 300); }
  }
}

function updateGoldHUD(pop = false) {
  updateCurrencyHUD(pop);
}

function checkAffordablePacks() {
  if (levelsData && levelsData.length) {
    const affordable = levelsData.findIndex((_, i) =>
      !unlockedLevels.includes(i) && playerCurrencies.coins >= LEVEL_COST(i));
    if (affordable >= 0) showToast(`💡 You can afford "${levelName(levelsData[affordable])}"! Visit 🏪 Shop!`);
  }
}

// ═══════════════ R2: KOREAN-GATED PROGRESSION & HARD LOCKS ════════════════════
// Two separate metrics, deliberately.
//
// Under the real scheduler, "mastered" means an interval of 21+ days, which takes weeks of
// honest reviews to reach. Gating the minigames and quests on that would leave a new player
// staring at locked content for a month — so content gates use `calcLevelProgress`
// (graduated: learned through its steps at least once, reachable in a single session) while
// `calcLevelMastery` reports genuine maturity for the Mastery stat, trophies and dashboard.
function _levelPct(levelIdx, predicate) {
  if (!levelsData || !levelsData[levelIdx] || !levelsData[levelIdx].words) return 0;
  const words = levelsData[levelIdx].words;
  if (words.length === 0) return 100;
  let n = 0;
  words.forEach(w => { if (predicate(srsData[w.ko])) n++; });
  return Math.floor((n / words.length) * 100);
}

// % of the level graduated — drives content unlocks.
function calcLevelProgress(levelIdx) { return _levelPct(levelIdx, srsIsGraduated); }

// % of the level mature (interval >= 21 days) — the long-haul Mastery stat.
function calcLevelMastery(levelIdx) { return _levelPct(levelIdx, srsIsMature); }

function isZoneUnlocked(zoneKey) {
  const reqs = {
    arcade:  { reqLevel: 0, minPct: 80, name: levelName(levelsData[0]) || 'Level 1: Daily Life & People' },
    fishing: { reqLevel: 1, minPct: 80, name: levelName(levelsData[1]) || 'Level 2: Food & Dining' },
    dungeon: { reqLevel: 2, minPct: 80, name: levelName(levelsData[2]) || 'Level 3: Time & Weather' },
    duel:    { reqLevel: 3, minPct: 80, name: levelName(levelsData[3]) || 'Level 4: Places & Directions' }
  };
  const req = reqs[zoneKey];
  if (!req) return { unlocked: true };
  // Graduated, not mature — see calcLevelProgress. Mature gating would lock every zone
  // for weeks on a fresh save.
  const pct = calcLevelProgress(req.reqLevel);
  return { unlocked: pct >= req.minPct, pct, targetPct: req.minPct, reqName: req.name };
}

function showHardLockToast(zoneKey) {
  const check = isZoneUnlocked(zoneKey);
  playChiptuneSFX('quiz_wrong');
  showToast(`🔒 LOCKED: Learn ${check.targetPct}% of ${check.reqName} first! (Current: ${check.pct}%)`, 4000);
}

// ═══════════════ R2: SHOP PURCHASE QUIZ GATE ══════════════════════════════════
let shopQuizState = { targetIdx: null, questions: [], currentQ: 0, correctCount: 0 };

function startShopQuizGate(idx) {
  const allWords = unlockedLevels.flatMap(i => levelsData[i]?.words || []);
  const pool = allWords.length >= 4 ? allWords : (levelsData[0]?.words || []);

  const shuffled = Phaser.Utils.Array.Shuffle([...pool]);
  const questions = shuffled.slice(0, 3).map(target => {
    const distractors = pool.filter(w => w.ko !== target.ko);
    Phaser.Utils.Array.Shuffle(distractors);
    const options = [target, ...distractors.slice(0, 3)];
    Phaser.Utils.Array.Shuffle(options);
    return { target, options };
  });

  shopQuizState = { targetIdx: idx, questions, currentQ: 0, correctCount: 0 };
  playerLocked = true;
  document.getElementById('shop-quiz-overlay').classList.add('visible');
  renderShopQuizQuestion();
}

function renderShopQuizQuestion() {
  const q = shopQuizState.questions[shopQuizState.currentQ];
  if (!q) return;

  const ind = document.getElementById('sq-step-indicator');
  if (ind) ind.textContent = `Question ${shopQuizState.currentQ + 1} of 3`;
  const wKo = document.getElementById('sq-word-ko');
  if (wKo) wKo.textContent = q.target.ko;

  const grid = document.getElementById('sq-options-grid');
  if (!grid) return;
  grid.innerHTML = '';
  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'duel-option-btn';
    btn.textContent = opt.en;
    btn.onclick = () => answerShopQuiz(opt.ko === q.target.ko);
    grid.appendChild(btn);
  });
}

function answerShopQuiz(isCorrect) {
  if (isCorrect) {
    playChiptuneSFX('quiz_correct');
    shopQuizState.correctCount++;
    shopQuizState.currentQ++;
    if (shopQuizState.currentQ >= 3) {
      document.getElementById('shop-quiz-overlay').classList.remove('visible');
      playerLocked = false;
      const targetIdx = shopQuizState.targetIdx;
      if (_doLevelPurchase(targetIdx)) {
        const lsOverlay = document.getElementById('level-select-overlay');
        if (lsOverlay && !lsOverlay.classList.contains('hidden')) {
          buildLevelSelectScreen();
        }
        const shopOverlay = document.getElementById('shop-overlay');
        if (shopOverlay && shopOverlay.classList.contains('visible')) {
          buildShopGrid();
          closeShop();
          setTimeout(() => startLevel(targetIdx), 300);
        }
      }
    } else {
      renderShopQuizQuestion();
    }
  } else {
    playChiptuneSFX('quiz_wrong');
    document.getElementById('shop-quiz-overlay').classList.remove('visible');
    playerLocked = false;
    showToast(`❌ Quiz Gate Failed! 0 Coins deducted. Practice in farm to unlock!`, 4000);
  }
}

function cancelShopQuizGate() {
  document.getElementById('shop-quiz-overlay').classList.remove('visible');
  playerLocked = false;
  showToast('Purchase challenge cancelled.');
}

// ═══════════════ R2: BOSS ENTRANCE GATE CHALLENGE ═════════════════════════════
let bossGateState = { type: null, questions: [], currentQ: 0, callback: null };

function startBossGateChallenge(type, questionsCount, onCompleteCallback) {
  const allWords = unlockedLevels.flatMap(i => levelsData[i]?.words || []);
  const pool = allWords.length >= 4 ? allWords : (levelsData[0]?.words || []);

  const shuffled = Phaser.Utils.Array.Shuffle([...pool]);
  const questions = shuffled.slice(0, questionsCount).map(target => {
    const distractors = pool.filter(w => w.ko !== target.ko);
    Phaser.Utils.Array.Shuffle(distractors);
    const options = [target, ...distractors.slice(0, 3)];
    Phaser.Utils.Array.Shuffle(options);
    return { target, options };
  });

  bossGateState = { type, questions, currentQ: 0, callback: onCompleteCallback };
  playerLocked = true;
  document.getElementById('boss-gate-overlay').classList.add('visible');
  const tit = document.getElementById('bg-title');
  if (tit) tit.textContent = type === 'dungeon' ? 'DUNGEON BOSS ENTRANCE GATE' : 'GRAND NECROMANCER ENTRANCE GATE';
  renderBossGateQuestion();
}

function renderBossGateQuestion() {
  const q = bossGateState.questions[bossGateState.currentQ];
  if (!q) return;

  const ind = document.getElementById('bg-step-indicator');
  if (ind) ind.textContent = `Gate Challenge ${bossGateState.currentQ + 1} of ${bossGateState.questions.length}`;
  const wKo = document.getElementById('bg-word-ko');
  if (wKo) wKo.textContent = q.target.ko;

  const grid = document.getElementById('bg-options-grid');
  if (!grid) return;
  grid.innerHTML = '';
  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'duel-option-btn';
    btn.textContent = opt.en;
    btn.onclick = () => answerBossGate(opt.ko === q.target.ko);
    grid.appendChild(btn);
  });
}

function answerBossGate(isCorrect) {
  if (isCorrect) {
    playChiptuneSFX('quiz_correct');
    bossGateState.currentQ++;
    if (bossGateState.currentQ >= bossGateState.questions.length) {
      document.getElementById('boss-gate-overlay').classList.remove('visible');
      playerLocked = false;
      if (bossGateState.callback) bossGateState.callback(true);
    } else {
      renderBossGateQuestion();
    }
  } else {
    playChiptuneSFX('quiz_wrong');
    document.getElementById('boss-gate-overlay').classList.remove('visible');
    playerLocked = false;
    showToast(`❌ Entrance Gate Challenge Failed! Defeat review minions to try again.`, 4000);
    if (bossGateState.callback) bossGateState.callback(false);
  }
}

function cancelBossGate() {
  document.getElementById('boss-gate-overlay').classList.remove('visible');
  playerLocked = false;
  showToast('Retreated from Entrance Gate.');
}

// ═══════════════ R2: QUEST SYSTEM ═════════════════════════════════════════════
let questOverlayOpen = false;
let activeQuestTab = 'main';

let questState = {
  mainStep: 1,
  mainProgress: { harvests: 0, mastered: 0, kills: 0, fish: 0, score: 0, duels: 0 },
  mainCompleted: [],
  daily: [],
  weekly: [],
  lastDailyReset: 0,
  lastWeeklyReset: 0
};

const MAIN_STORYLINE = [
  { act: 1, id: 'act_1', title: 'Act I: Harvest of Hangeul', desc: 'Harvest 3 ripe words in farm. Learn 80% of Level 1 (Daily Life & People).', target: 3, reqLevel: 0, minPct: 80, rCoins: 100, rGems: 10, rHonor: 50 },
  { act: 2, id: 'act_2', title: 'Act II: Beast Master', desc: 'Defeat 5 Dungeon beasts. Learn 80% of Level 2 (Food & Dining).', target: 5, reqLevel: 1, minPct: 80, rCoins: 150, rGems: 15, rHonor: 75 },
  { act: 3, id: 'act_3', title: 'Act III: Bonds of Hangeul', desc: 'Win 3 Spell Duels. Learn 80% of Level 4 (Places & Directions).', target: 3, reqLevel: 3, minPct: 80, rCoins: 200, rGems: 20, rHonor: 100 },
  { act: 4, id: 'act_4', title: 'Act IV: Chromatic Angler', desc: 'Catch 5 fish in Crystal Pond. Learn 80% of Level 3 (Time & Weather).', target: 5, reqLevel: 2, minPct: 80, rCoins: 250, rGems: 25, rHonor: 125 },
  { act: 5, id: 'act_5', title: 'Act V: Numeric Dominion', desc: 'Score 500+ in Arcade Machine. Learn 80% of Level 6 (Hobbies & Leisure).', target: 500, reqLevel: 5, minPct: 80, rCoins: 300, rGems: 30, rHonor: 150 },
  { act: 6, id: 'act_6', title: 'Act VI: Grand Sovereign', desc: 'Defeat Grand Necromancer Boss after learning every word in all levels.', target: 1, reqLevel: 0, minPct: 100, rCoins: 500, rGems: 50, rHonor: 300 }
];

function initQuestState() {
  const now = Date.now();
  const DAY_MS = 24 * 3600 * 1000;
  const WEEK_MS = 7 * DAY_MS;

  if (!questState.lastDailyReset || now - questState.lastDailyReset > DAY_MS) {
    questState.lastDailyReset = now;
    questState.daily = [
      { id: 'dq_1', title: '🌾 Daily Harvest', desc: 'Harvest 3 ripe crops in your farm.', current: 0, target: 3, rCoins: 30, rGems: 2, rHonor: 10, claimed: false },
      { id: 'dq_2', title: '📖 Daily Scholar', desc: 'Answer 5 SRS review quizzes correctly.', current: 0, target: 5, rCoins: 40, rGems: 3, rHonor: 15, claimed: false },
      { id: 'dq_3', title: '⚔️ Daily Explorer', desc: 'Defeat 2 monsters or catch 2 fish.', current: 0, target: 2, rCoins: 50, rGems: 5, rHonor: 20, claimed: false }
    ];
  }

  if (!questState.lastWeeklyReset || now - questState.lastWeeklyReset > WEEK_MS) {
    questState.lastWeeklyReset = now;
    questState.weekly = [
      { id: 'wq_1', title: '🟣 Master Scholar', desc: 'Master 5 Korean words (harvest count >= 5).', current: 0, target: 5, rCoins: 150, rGems: 15, rHonor: 50, claimed: false },
      { id: 'wq_2', title: '⚡ Arena Champion', desc: 'Win 3 Spell Duels.', current: 0, target: 3, rCoins: 200, rGems: 20, rHonor: 60, claimed: false },
      { id: 'wq_3', title: '🎣 Master Angler', desc: 'Catch 10 fish in Crystal Pond.', current: 0, target: 10, rCoins: 180, rGems: 18, rHonor: 55, claimed: false }
    ];
  }
}

function checkQuestProgress(type, data = {}) {
  initQuestState();
  if (type === 'harvest') {
    questState.mainProgress.harvests += (data.count || 1);
    questState.daily.forEach(q => { if (q.id === 'dq_1') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'quiz') {
    questState.daily.forEach(q => { if (q.id === 'dq_2') q.current = Math.min(q.target, q.current + 1); });
  } else if (type === 'kill') {
    questState.mainProgress.kills += (data.count || 1);
    questState.daily.forEach(q => { if (q.id === 'dq_3') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'fish') {
    questState.mainProgress.fish += (data.count || 1);
    questState.daily.forEach(q => { if (q.id === 'dq_3') q.current = Math.min(q.target, q.current + (data.count || 1)); });
    questState.weekly.forEach(q => { if (q.id === 'wq_3') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'duel') {
    questState.mainProgress.duels += (data.count || 1);
    questState.weekly.forEach(q => { if (q.id === 'wq_2') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'score') {
    if (data.score > questState.mainProgress.score) questState.mainProgress.score = data.score;
  }

  // Mature under the scheduler, not "harvested five times".
  const totalMastered = Object.values(srsData).filter(srsIsMature).length;
  questState.weekly.forEach(q => { if (q.id === 'wq_1') q.current = Math.min(q.target, totalMastered); });

  persistSave();
  if (questOverlayOpen) renderQuestList();
}

function openQuestOverlay() {
  playChiptuneSFX('click');
  initQuestState();
  questOverlayOpen = playerLocked = true;
  document.getElementById('quest-overlay').classList.add('visible');
  renderQuestList();
}

function closeQuestOverlay() {
  playChiptuneSFX('click');
  questOverlayOpen = playerLocked = false;
  document.getElementById('quest-overlay').classList.remove('visible');
}

function switchQuestTab(tab) {
  playChiptuneSFX('click');
  activeQuestTab = tab;
  ['main', 'daily', 'weekly'].forEach(t => {
    const btn = document.getElementById(`qtab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  renderQuestList();
}

function renderQuestList() {
  const container = document.getElementById('quest-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (activeQuestTab === 'main') {
    const act = MAIN_STORYLINE.find(a => a.act === questState.mainStep) || MAIN_STORYLINE[MAIN_STORYLINE.length - 1];
    const isCompleted = questState.mainCompleted.includes(act.id);

    let curr = 0;
    if (act.act === 1) curr = questState.mainProgress.harvests;
    else if (act.act === 2) curr = questState.mainProgress.kills;
    else if (act.act === 3) curr = questState.mainProgress.duels;
    else if (act.act === 4) curr = questState.mainProgress.fish;
    else if (act.act === 5) curr = questState.mainProgress.score;
    else if (act.act === 6) curr = questState.mainProgress.duels >= 1 ? 1 : 0;

    const srsPct = calcLevelProgress(act.reqLevel);
    const reqMet = curr >= act.target && srsPct >= act.minPct;

    const card = document.createElement('div');
    card.className = 'quest-card' + (isCompleted ? ' completed' : '');
    card.innerHTML = `
      <div class="quest-card-header">
        <span class="quest-card-title">${act.title}</span>
        <span class="quest-card-badge">${isCompleted ? 'COMPLETED' : `Learned ${srsPct}% / ${act.minPct}%`}</span>
      </div>
      <div class="quest-card-desc">${act.desc}</div>
      <div class="quest-progress-bg">
        <div class="quest-progress-fill" style="width:${Math.min(100, Math.floor((curr / act.target) * 100))}%"></div>
      </div>
      <div class="quest-progress-text">Progress: ${curr} / ${act.target}</div>
      <div class="quest-rewards-row">
        <div class="quest-reward-tags">
          <span>🪙 +${act.rCoins}</span>
          <span>💎 +${act.rGems}</span>
          <span>🎖️ +${act.rHonor}</span>
        </div>
        ${isCompleted ? '<span style="color:var(--neon-green);font-weight:bold">✅ Claimed</span>' :
          `<button class="quest-claim-btn" ${reqMet ? '' : 'disabled'} onclick="claimMainQuest(${act.act})">Claim Rewards</button>`}
      </div>
    `;
    container.appendChild(card);
  } else {
    const list = activeQuestTab === 'daily' ? questState.daily : questState.weekly;
    list.forEach(q => {
      const card = document.createElement('div');
      card.className = 'quest-card' + (q.claimed ? ' completed' : '');
      const pct = Math.min(100, Math.floor((q.current / q.target) * 100));
      card.innerHTML = `
        <div class="quest-card-header">
          <span class="quest-card-title">${q.title}</span>
          <span class="quest-card-badge">${q.claimed ? 'CLAIMED' : `${pct}%`}</span>
        </div>
        <div class="quest-card-desc">${q.desc}</div>
        <div class="quest-progress-bg">
          <div class="quest-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="quest-progress-text">Progress: ${q.current} / ${q.target}</div>
        <div class="quest-rewards-row">
          <div class="quest-reward-tags">
            <span>🪙 +${q.rCoins}</span>
            <span>💎 +${q.rGems}</span>
            <span>🎖️ +${q.rHonor}</span>
          </div>
          ${q.claimed ? '<span style="color:var(--neon-green);font-weight:bold">✅ Claimed</span>' :
            `<button class="quest-claim-btn" ${q.current >= q.target ? '' : 'disabled'} onclick="claimSideQuest('${activeQuestTab}', '${q.id}')">Claim Rewards</button>`}
        </div>
      `;
      container.appendChild(card);
    });
  }
}

function claimMainQuest(actNum) {
  const act = MAIN_STORYLINE.find(a => a.act === actNum);
  if (!act || questState.mainCompleted.includes(act.id)) return;

  let curr = 0;
  if (act.act === 1) curr = questState.mainProgress.harvests;
  else if (act.act === 2) curr = questState.mainProgress.kills;
  else if (act.act === 3) curr = questState.mainProgress.duels;
  else if (act.act === 4) curr = questState.mainProgress.fish;
  else if (act.act === 5) curr = questState.mainProgress.score;
  else if (act.act === 6) curr = questState.mainProgress.duels >= 1 ? 1 : 0;

  const srsPct = calcLevelProgress(act.reqLevel);
  if (curr < act.target || srsPct < act.minPct) {
    showToast('⚠️ Quest requirements not met!');
    return;
  }

  questState.mainCompleted.push(act.id);
  if (questState.mainStep <= actNum && actNum < MAIN_STORYLINE.length) {
    questState.mainStep = actNum + 1;
  }

  addCoins(act.rCoins);
  addGems(act.rGems);
  addHonor(act.rHonor);

  showToast(`🎉 Main Story ${act.title} Complete! Earned rewards!`, 4000);
  renderQuestList();
}

function claimSideQuest(tab, qId) {
  const list = tab === 'daily' ? questState.daily : questState.weekly;
  const q = list.find(item => item.id === qId);
  if (!q || q.claimed || q.current < q.target) return;

  q.claimed = true;
  addCoins(q.rCoins);
  addGems(q.rGems);
  addHonor(q.rHonor);

  showToast(`🎉 Quest "${q.title}" Claimed! +${q.rCoins} Coins, +${q.rGems} Gems, +${q.rHonor} Honor!`, 4000);
  renderQuestList();
}

const PHASE_CFG = [
  {icon:'🌱', title:'Plant Seed', dots:'●○○', reward:'',    btn:'🌱 Plant Seed'},
  {icon:'💧', title:'Water',      dots:'●●○', reward:'',    btn:'💧 Water'},
  {icon:'🍎', title:'Harvest',    dots:'●●●', reward:'+🪙', btn:'🍎 Harvest'},
];

function saveAllGame(){
  flushSave();   // explicit user action — write through, don't debounce
  const btn=$('save-btn');
  if(btn){
    const prev=btn.textContent;
    btn.textContent='✅ Saved!';
    btn.style.background='linear-gradient(180deg,#22c55e,#16a34a)';
    setTimeout(()=>{ btn.textContent=prev; btn.style.background=''; }, 1800);
  }
  showToast('💾 Game saved successfully!', 2200);
}

// Run save load once pywebview is ready (or immediately if in browser)

function initSave(){
  // Always try file-based load first, localStorage as fallback
  if(window.pywebview?.api){
    loadSave().then(()=>{ _afterLoad(); });
  } else {
    // Browser mode: try immediately
    loadSave().then(()=>{ _afterLoad(); }).catch(()=>{ _afterLoad(); });
  }
}
function _afterLoad(){
  updateGoldHUD();
  buildLevelSelectScreen();
  if (typeof initSeasonalEvents === 'function') initSeasonalEvents();
  if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
  console.log('[Save] gold='+gold+', levels='+JSON.stringify(unlockedLevels)+', plots='+plotSave.length);
}
// pywebview fires this event when API is ready; otherwise we init on DOMLoaded
if(window.addEventListener){
  window.addEventListener('pywebviewready', ()=>{ console.log('[pywebview] API ready'); initSave(); }, {once:true});
  // Fallback: if pywebview doesn't fire in 400ms (browser mode), init anyway
  setTimeout(()=>{ if(gold===0 && harvestCounts.size===0) initSave(); }, 400);
}
let quizOpen=false, currentWord=null, currentPlot=null;
let playerLocked=false, plantedWords=new Set(); // words currently ON a plot
let shopOpen=false, catDialogOpen=false, memoryOpen=false, trophyOpen=false, duelOpen=false, fishAlbumOpen=false;
let appleTreeSave = {}; // { ripeAt, ripe } persisted across sessions

// ══════════════ FISH DATABASE ═════════════════════════════════════════════════
const FISH_DB = [
  { ko:'연어', en:'Salmon', hint:'🍣', rarity:'Common', weight:'2.4 kg', rom:'yeon-eo' },
  { ko:'고등어', en:'Mackerel', hint:'🐟', rarity:'Common', weight:'1.1 kg', rom:'go-deung-eo' },
  { ko:'오징어', en:'Squid', hint:'🦑', rarity:'Rare', weight:'0.8 kg', rom:'o-jing-eo' },
  { ko:'잉어', en:'Carp', hint:'🎏', rarity:'Rare', weight:'3.2 kg', rom:'ing-eo' },
  { ko:'새우', en:'Shrimp', hint:'🦐', rarity:'Common', weight:'0.1 kg', rom:'sae-u' },
  { ko:'문어', en:'Octopus', hint:'🐙', rarity:'Epic', weight:'4.5 kg', rom:'mun-eo' },
  { ko:'조개', en:'Clam', hint:'🐚', rarity:'Common', weight:'0.2 kg', rom:'jo-gae' },
  { ko:'황금물고기', en:'Golden Fish', hint:'🌟', rarity:'Legendary', weight:'5.0 kg', rom:'hwang-geum-mul-go-gi' }
];
let appleTreeQuizPending = false; // true when harvesting apple tree (not a crop plot)

function _saveAppleTree(scene){
  appleTreeSave = { ripeAt: scene.appleRipeAt, ripe: scene.appleRipe };
  persistSave();
}

// ══════════════ CAT NPC DIALOG ════════════════════════════════════════════════
// Draw the ginger tabby cat portrait pixel-by-pixel onto the <canvas> element
function drawCatPortrait(){
  const canvas=document.getElementById('cat-portrait-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const S=6; // pixel scale (6px per dot)
  // yOff=2 → shifts entire sprite down by 2 rows so ears at row 0 aren't clipped
  const yOff=2;
  const p=(x,y,col)=>{ ctx.fillStyle=col; ctx.fillRect(x*S,(y+yOff)*S,S,S); };
  const GO='#F5813F', GD='#B84E10', GL='#FFBB66';
  const WH='#FFFFFF', EY='#FFCC44', PU='#1A0800';
  const PK='#FFAA99';
  const SH='#3A1800';

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // === BODY (rows 8-15) ===
  [[1,8,10,8,GO],[2,9,8,6,GO]].forEach(([x,y,w,h,c])=>{for(let i=0;i<w;i++)for(let j=0;j<h;j++)p(x+i,y+j,c);});
  for(let j=9;j<16;j++) for(let i=3;i<9;i++) p(i,j,WH);
  [0,1].forEach(i=>{ for(let j=9;j<15;j++) p(i===0?1:10,j,GD); });
  [[3,14,GD],[3,11,GD],[8,14,GD],[8,11,GD]].forEach(([x,y,c])=>{ if(c)p(x,y,c); });
  for(let j=10;j<15;j+=2){ p(2,j,GD); p(9,j,GD); }

  // === FRONT PAWS (rows 14-15) ===
  [[2,14,2,2,WH],[8,14,2,2,WH]].forEach(([x,y,w,h,c])=>{ for(let i=0;i<w;i++)for(let j=0;j<h;j++)p(x+i,y+j,c); });
  p(2,15,PK); p(3,15,PK); p(8,15,PK); p(9,15,PK);

  // === HEAD (rows 2-7) ===
  for(let j=2;j<8;j++) for(let i=1;i<11;i++) p(i,j,GO);
  p(3,2,GD);p(4,2,GD); p(5,2,GO); p(6,2,GO); p(7,2,GD);p(8,2,GD);
  p(4,3,GD); p(6,3,GD); p(7,3,GD);
  for(let j=5;j<8;j++) for(let i=3;i<9;i++) p(i,j,WH);
  [[2,4,EY],[3,4,EY],[4,4,EY],[2,5,EY],[3,5,EY],[4,5,EY]].forEach(([x,y,c])=>p(x,y,c));
  [[7,4,EY],[8,4,EY],[9,4,EY],[7,5,EY],[8,5,EY],[9,5,EY]].forEach(([x,y,c])=>p(x,y,c));
  p(3,4,PU); p(8,4,PU);
  [2,3,4].forEach(x=>p(x,3,SH)); [7,8,9].forEach(x=>p(x,3,SH));
  p(5,6,PK); p(6,6,PK);
  p(1,6,GL); p(10,6,GL);

  // === EARS (row 0-2) — now visible thanks to yOff ===
  [[0,0,GO],[1,0,GO],[0,1,GO],[1,1,GO],[0,2,GD],[1,2,GD]].forEach(([x,y,c])=>p(x,y,c));
  p(0,1,PK);
  [[10,0,GO],[11,0,GO],[10,1,GO],[11,1,GO],[10,2,GD],[11,2,GD]].forEach(([x,y,c])=>p(x,y,c));
  p(11,1,PK);

  // === NECK ===
  for(let i=3;i<9;i++) p(i,8,WH);
}

function showCatDialog(){
  if(catDialogOpen) return;
  playChiptuneSFX('click');
  catDialogOpen=playerLocked=true;
  catSetWord(); // pick random word
  document.getElementById('cat-dialog').classList.add('visible');
  // Draw portrait after a tiny delay so canvas is visible
  setTimeout(drawCatPortrait, 30);
}
function closeCatDialog(){
  playChiptuneSFX('click');
  catDialogOpen=playerLocked=false;
  document.getElementById('cat-dialog').classList.remove('visible');
}
function catSetWord(){
  const allWords=unlockedLevels.flatMap(idx=>levelsData[idx]?.words||[]);
  if(!allWords.length) return;
  const w=allWords[Math.floor(Math.random()*allWords.length)];
  document.getElementById('cat-emoji').textContent = w.hint||'📝';
  document.getElementById('cat-ko').textContent    = w.ko;
  document.getElementById('cat-en').textContent    = w.en;
  // Show the word's origin OR its pronunciation shape — whichever is richer
  const fact = getFunFact(w);
  // Alternate between origin and pronunciation for variety
  const useStructure = Math.random() < 0.5;
  const tipText = (useStructure ? fact.structure : fact.origin)
    || fact.origin || fact.structure || fact.hint || '야옹~ Memorize this word!';
  document.getElementById('cat-dialog-tip').textContent = tipText;
}
function catAnotherWord(){
  const ko=document.getElementById('cat-ko');
  ko.animate([{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1)'}],{duration:250,easing:'ease-out'});
  catSetWord();
}
document.getElementById('cat-dialog').addEventListener('keydown',e=>e.stopPropagation());



const getCompleted  = ()=>{ try{return JSON.parse(localStorage.getItem('hv_done')||'[]')}catch{return[]} };
const markCompleted = i=>{ const c=getCompleted(); if(!c.includes(i)){c.push(i);localStorage.setItem('hv_done',JSON.stringify(c))} };

// ═══════════════ DOM REFS ════════════════════════════════════════════════════
const $=id=>document.getElementById(id);
const lsOverlay=$('level-select-overlay'), lsGrid=$('ls-grid');
const hud=$('hud'), pbWrap=$('progress-bar-wrap'), tipEl=$('controls-tip');
const hudLevelEl=$('hud-level'), hudProgressEl=$('hud-progress'), pbFill=$('progress-bar-fill');
const quizBackdrop=$('quiz-backdrop'), answerInput=$('answer-input');
const feedbackText=$('feedback-text'), submitBtn=$('submit-btn'), cancelBtn=$('cancel-btn');
const enWordDisplay=$('en-word-display'), hintEmoji=$('hint-emoji');
const hintCategory=$('hint-category'), quizLevelTag=$('quiz-level-tag');
const vocabOverlay=$('vocab-overlay'), vocabSubtitle=$('vocab-subtitle');
const vocabSearch=$('vocab-search'), catFiltersEl=$('cat-filters');
const vocabGrid=$('vocab-grid'), vocabCountEl=$('vocab-count');
const levelupOverlay=$('levelup-overlay'), levelupMsg=$('levelup-msg');
const levelupNextBtn=$('levelup-next-btn'), levelupMenuBtn=$('levelup-menu-btn');
const alldoneOverlay=$('alldone-overlay');
const replayBtn=$('replay-btn'), menuBtn=$('menu-btn');
const vocabBtn=$('vocab-btn'), hudMenuBtn=$('hud-menu-btn');

// ═══════════════ TOAST ═══════════════════════════════════════════════════════
let toastTimer=null;
function showToast(msg, dur=3500) {
  const t = $('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ═══════════════ HUD ═════════════════════════════════════════════════════════
function updateHUD() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  hudLevelEl.textContent = `${lvl.icon||'🌾'} ${levelName(lvl)}`;
  // The bar now tracks how much of the level has been learned, which persists across
  // sessions, rather than a session-local plant counter that reset every reload.
  const learnedPct = calcLevelProgress(currentLevelIndex);
  const due = srsDueWords().length;
  const maturePct = calcLevelMastery(currentLevelIndex);
  hudProgressEl.textContent = due > 0
    ? `⏰ ${due} due · 📗 ${learnedPct}%`
    : `📗 ${learnedPct}% learned${maturePct ? ` · 🌟 ${maturePct}%` : ''}`;
  hudProgressEl.title = `${learnedPct}% of this level learned, ${maturePct}% mature (21+ day interval)`;
  if(pbFill) pbFill.style.width = learnedPct + '%';
  updateGoldHUD();
}

// ═══════════════ LEVEL SELECT ════════════════════════════════════════════════
function buildLevelSelectScreen() {
  if(!lsGrid) return;
  if(!levelsData || !levelsData.length){
    if(typeof sceneRef !== 'undefined' && sceneRef?.cache?.json){
      levelsData = sceneRef.cache.json.get('levels') || [];
    }
    if(!levelsData || !levelsData.length){
      fetch('levels.json').then(r => r.json()).then(d => {
        levelsData = d;
        buildLevelSelectScreen();
      }).catch(err => console.error('Failed to load levels.json:', err));
      return;
    }
  }
  lsGrid.innerHTML = '';
  // ── RESUME BUTTON (shown when there's saved progress) ──────────────────────
  const hasSave = plotSave.length > 0 || gold > 0 || harvestCounts.size > 0;
  if(hasSave){
    const r = document.createElement('div');
    r.className = 'ls-resume-card';
    const planted = plotSave.length;
    r.innerHTML = `
      <div class="lsr-icon">▶</div>
      <div class="lsr-text">
        <div class="lsr-title">Continue Previous Session</div>
        <div class="lsr-sub">💰 ${gold} gold &nbsp;|&nbsp; 🌱 ${planted} crops growing &nbsp;|&nbsp; Level ${currentLevelIndex+1}</div>
      </div>`;
    r.addEventListener('click', resumeGame);
    lsGrid.appendChild(r);
  }
  // Separator if resume exists
  if(hasSave){
    const sep=document.createElement('div');
    sep.className='ls-sep';
    sep.textContent='── or select a level ──';
    lsGrid.appendChild(sep);
  }
  levelsData.forEach((lvl, idx) => {
    const owned = unlockedLevels.includes(idx);
    const cost  = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const c = document.createElement('div');
    c.className = 'level-card' + (!owned ? ' locked' : '');
    c.innerHTML = `<div class="lc-badge">${owned ? '✅' : (canAfford ? '💰' : '🔒')}</div>
      <div class="lc-top"><span class="lc-icon">${lvl.icon||'📚'}</span>
      <div class="lc-meta"><div class="lc-num">Level ${lvl.level}</div>
      <div class="lc-name">${levelName(lvl)}</div>
      <div class="lc-name-ko">${levelNameKo(lvl)}</div></div></div>
      <div class="lc-desc">${lvl.description||''}</div>
      <div class="lc-footer">
        <span class="lc-tag words">📝 ${lvl.words.length} words</span>
        ${owned ? `<span class="lc-tag" style="color:#4ade80">✅ Owned</span>`
                : `<span class="lc-tag target" style="color:${canAfford?'#f9c74f':'#aaa'}">💰 ${cost} gold</span>`}
      </div>`;
    if(owned) {
      // If clicking the CURRENT level → resume; if switching → confirm reset
      c.addEventListener('click', () => {
        if(idx === currentLevelIndex && hasSave){
          resumeGame(); // same level: just resume
        } else {
          startLevel(idx, true); // different level or no save: fresh start
        }
      });
    } else if(canAfford) {
      c.addEventListener('click', () => { buyLevelFromSelect(idx); });
      c.title='Click to buy!';
    }
    lsGrid.appendChild(c);
  });
}
// ═══════════════ CENTRALIZED UI GLASSMORPHISM MODAL MANAGER ═══════════════════
let activeModalStack = [];

function setModalState(overlayId, isOpen) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  if (isOpen) {
    overlay.classList.add('visible');
    overlay.classList.remove('hidden');
    playerLocked = true;
    if (!activeModalStack.includes(overlayId)) {
      activeModalStack.push(overlayId);
    }
  } else {
    overlay.classList.remove('visible');
    if (overlayId === 'level-select-overlay') {
      overlay.classList.add('hidden');
    }
    activeModalStack = activeModalStack.filter(id => id !== overlayId);
    if (activeModalStack.length === 0) {
      playerLocked = false;
    }
  }
}

function closeTopModal() {
  if (activeModalStack.length === 0) return false;
  const topId = activeModalStack[activeModalStack.length - 1];
  closeModalById(topId);
  return true;
}

function closeModalById(overlayId) {
  if (overlayId === 'inventory-overlay') window.closeInventoryUI();
  else if (overlayId === 'cooking-overlay') window.closeCookingUI();
  else if (overlayId === 'fish-album-overlay') window.closeFishAlbum();
  else if (overlayId === 'recipe-overlay') window.closeRecipeBook();
  else if (overlayId === 'seasonal-overlay') window.closeSeasonalOverlay();
  else if (overlayId === 'leaderboard-overlay') window.closeLeaderboard();
  else if (overlayId === 'shop-overlay') window.closeShop();
  else if (overlayId === 'memory-overlay') window.closeMemoryGame();
  else if (overlayId === 'duel-overlay') window.closeSpellDuel();
  else if (overlayId === 'trophy-overlay') window.closeTrophies();
  else if (overlayId === 'level-select-overlay') hideLevelSelect();
  // Needs its own branch: this overlay is hidden by the .hidden class, and the generic
  // fallback below only clears .visible, which would leave it on screen after Escape.
  else if (overlayId === 'progress-overlay') window.closeProgressOverlay();
  else setModalState(overlayId, false);
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    );

    if (e.key === 'Escape' && activeModalStack.length > 0) {
      closeTopModal();
      return;
    }

    if (!isInputFocused) {
      if (e.key === 'i' || e.key === 'I' || e.key === 'e' || e.key === 'E') {
        if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'inventory-overlay') {
          window.closeInventoryUI();
        } else if (activeModalStack.length === 0) {
          window.openInventoryUI();
        }
      }
      if (e.key === 'c' || e.key === 'C') {
        if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'cooking-overlay') {
          window.closeCookingUI();
        } else if (activeModalStack.length === 0) {
          window.openCookingUI();
        }
      }
    }
  });
}

function openInventoryUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderInventoryGrid();
  setModalState('inventory-overlay', true);
}

function closeInventoryUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('inventory-overlay', false);
}

function renderInventoryGrid() {
  const grid = document.getElementById('inventory-grid');
  const badge = document.getElementById('inv-capacity-badge');
  const capText = document.getElementById('inv-capacity-text');

  inventoryState = inventoryState || {};
  const maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  inventoryState.maxSlots = maxSlots;
  const usedSlots = getUsedInventorySlots();

  if (badge) badge.textContent = `${usedSlots} / ${maxSlots} slots`;
  if (capText) capText.textContent = `${maxSlots} slots`;

  if (!grid) return;
  grid.innerHTML = '';

  const items = [];

  // 1. Ingredients
  if (inventoryState.ingredients) {
    for (const [nameKo, qty] of Object.entries(inventoryState.ingredients)) {
      if (qty > 0) {
        const info = getItemInfo(nameKo);
        items.push({
          itemId: info.id || nameKo,
          name: info.name || nameKo,
          nameKo: info.nameKo || nameKo,
          qty: qty,
          icon: info.icon || '🥬',
          description: info.description || 'Harvested crop / ingredient'
        });
      }
    }
  }

  // 2. Cooked Dishes
  if (inventoryState.cookedDishes) {
    for (const [recipeId, qty] of Object.entries(inventoryState.cookedDishes)) {
      if (qty > 0) {
        let nameKo = recipeId;
        let nameEn = recipeId;
        let icon = '🍱';
        if (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES)) {
          const rec = COOKING_RECIPES.find(r => r.id === recipeId);
          if (rec) {
            nameKo = rec.name;
            nameEn = rec.enName || rec.name;
            icon = rec.icon || '🍱';
          }
        }
        items.push({
          itemId: recipeId,
          name: nameEn,
          nameKo: nameKo,
          qty: qty,
          icon: icon,
          description: 'Delicious cooked dish'
        });
      }
    }
  }

  // Render slots up to maxSlots
  for (let i = 0; i < maxSlots; i++) {
    const slotEl = document.createElement('div');
    if (i < items.length) {
      const item = items[i];
      slotEl.className = 'inv-slot';
      slotEl.title = `${item.nameKo} (${item.name}): ${item.description}`;
      slotEl.innerHTML = `
        <div class="inv-qty-badge">x${item.qty}</div>
        <div class="inv-slot-icon">${item.icon}</div>
        <div class="inv-slot-ko">${item.nameKo}</div>
        <div class="inv-slot-en">${item.name}</div>
      `;
    } else {
      slotEl.className = 'inv-slot empty';
      slotEl.innerHTML = `
        <div style="font-size:22px; opacity:0.3; margin-bottom:4px;">📦</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.3); font-family:'Press Start 2P',monospace;">Empty</div>
      `;
    }
    grid.appendChild(slotEl);
  }
}

if (typeof window !== 'undefined') {
  window.openInventoryUI = openInventoryUI;
  window.closeInventoryUI = closeInventoryUI;
  window.renderInventoryGrid = renderInventoryGrid;
  window.expandInventoryCapacity = expandInventoryCapacity;
  window.addItemToInventory = addItemToInventory;
  window.removeItemFromInventory = removeItemFromInventory;
  window.getUsedInventorySlots = getUsedInventorySlots;
  window.openCookingUI = openCookingUI;
  window.closeCookingUI = closeCookingUI;
  window.renderCookingGrid = renderCookingGrid;
  window.cookRecipe = cookRecipe;
  window.checkCookingAchievements = checkCookingAchievements;
}

function showLevelSelect() {
  setModalState('level-select-overlay', true);
  hud.style.display = pbWrap.style.display = tipEl.style.display = 'none';
  buildLevelSelectScreen();
}
function hideLevelSelect() {
  setModalState('level-select-overlay', false);
  hud.style.display = pbWrap.style.display = tipEl.style.display = '';
}

function buyLevelFromSelect(idx) {
  playChiptuneSFX('click');
  const cost = LEVEL_COST(idx);
  if (unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return; }
  if (playerCurrencies.coins < cost) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return; }
  startShopQuizGate(idx);
}

// ═══════════════ START LEVEL / RESUME ═════════════════════════════════════════
function startLevel(idx, resetCrops=true) {
  currentLevelIndex = idx;
  if(resetCrops){
    // Full fresh start: wipe everything
    progress = 0; plantedWords.clear();
    if(sceneRef) sceneRef.resetPlots(); // also removes hv_plots from localStorage
    plotSave = [];
  }
  hideLevelSelect();
  updateHUD(); updateVocabBook();
  persistSave(); // save the chosen level
}
// Resume last session WITHOUT resetting crops
function resumeGame(){
  currentLevelIndex = parseInt(localStorage.getItem('hv_lastLevel')||'0') || currentLevelIndex;
  hideLevelSelect();
  updateHUD(); updateVocabBook();
  showToast('▶ Resumed previous session!');
}

// ────── HANGUL CHOSUNG & ROMANIZATION HELPERS ─────────────────────────
const CHOSUNG_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChosung(str){
  if(!str) return '';
  let res = '';
  for(let i = 0; i < str.length; i++){
    const code = str.charCodeAt(i) - 44032;
    if(code >= 0 && code <= 11172){
      res += CHOSUNG_LIST[Math.floor(code / 588)];
    } else {
      res += str[i];
    }
  }
  return res;
}

const ROMAN_MAP = {
  '사과':'sa-gwa', '우유':'u-yu', '빵':'ppang', '밥':'bap', '생선':'saeng-seon',
  '고기':'go-gi', '계란':'gye-ran', '채소':'chae-so', '과일':'gwa-il', '커피':'keo-pi',
  '차':'cha', '주스':'ju-seu', '태양':'tae-yang', '달':'dal', '별':'byeol',
  '하늘':'ha-neul', '산':'san', '바다':'ba-da', '강':'gang', '나무':'na-mu',
  '꽃':'kkot', '눈':'nun', '코':'ko', '입':'ip', '손':'son',
  '발':'bal', '머리':'meo-ri', '마음':'ma-eum', '고양이':'go-yang-i', '개':'gae',
  '새':'sae', '학교':'hak-gyo', '병원':'byeong-won', '시장':'si-jang', '전화':'jeon-hwa',
  '물':'mul'
};
function getRoman(ko){
  return ROMAN_MAP[ko] || ko;
}

function revealQuizHint(tier){
  if(!currentWord) return;
  playChiptuneSFX('click');
  const box = $('quiz-hint-reveal-card');
  if(!box) return;
  
  if(tier === 'roman'){
    const rom = getRoman(currentWord.ko);
    box.innerHTML = `🔤 <b>Romanization:</b> <span style="color:#67e8f9; font-weight:bold">[${rom}]</span>`;
  } else if(tier === 'chosung'){
    if(!spendCoins(5)){ showToast('Need 5 Coins 🪙 for Chosung hint!'); return; }
    currentQuizMeta.paidHints++;
    const ch = getChosung(currentWord.ko);
    box.innerHTML = `🔠 <b>Initial consonants (초성):</b> <span style="color:#fde047; font-size:18px; font-weight:bold; letter-spacing:3px">${ch}</span>`;
  } else if(tier === 'audio'){
    // Hearing the word is effectively hearing the answer, so it is priced like the
    // origin hint rather than given away free as romanization is.
    if(!KoreanTTS.isAvailable()){ showToast('🔇 No Korean voice available on this device.'); return; }
    if(!spendCoins(10)){ showToast('Need 10 Coins 🪙 to hear the word!'); return; }
    currentQuizMeta.paidHints++;
    const ko = currentWord.ko;
    speakKorean(ko);
    // The word is embedded rather than read from `currentWord` at click time: the quiz
    // may have moved on, and inline handlers should not depend on mutable globals.
    box.innerHTML = `🔊 <b>Listen:</b>
      <button type="button" class="speak-btn" data-ko="${ko}">▶ Again</button>
      <button type="button" class="speak-btn" data-ko="${ko}" data-spell="1">🐢 Syllable by syllable</button>`;
    box.querySelectorAll('.speak-btn').forEach(b => b.addEventListener('click', () =>
      b.dataset.spell ? spellKorean(b.dataset.ko) : speakKorean(b.dataset.ko)));
  } else if(tier === 'fact'){
    if(!spendCoins(10)){ showToast('Need 10 Coins 🪙 for the origin hint!'); return; }
    currentQuizMeta.paidHints++;
    const fact = getFunFact(currentWord);
    box.innerHTML = `💡 <b>Word origin:</b> ${fact.origin || fact.hint}`;
  }
  box.classList.remove('hidden');
}

// ====== QUIZ (SRS Phase-Aware) ================================================
let currentPhase = 1;

// SM-2 wants Again/Hard/Good/Easy, but the quiz only knows right or wrong. These three
// signals stand in for self-assessed difficulty, and unlike a self-report they cannot be
// gamed: a player who needed a paid hint or several tries genuinely found the word hard.
let currentQuizMeta = { openedAt: 0, attempts: 0, paidHints: 0 };
const EASY_ANSWER_MS = 6000;
// Declared here rather than beside applyQuizMode below because deriveGrade reads it, and a
// `let` further down the file would still be in its temporal dead zone at that point.
let currentQuizMode = 'type';   // 'type' | 'recognise' | 'listen'
let currentChoices = [];

function resetQuizMeta(){ currentQuizMeta = { openedAt: Date.now(), attempts: 0, paidHints: 0 }; }

// ── Answer matching ──────────────────────────────────────────────────────────
// Comparison happens on decomposed jamo, not syllable blocks. 갑 vs 강 differs by a single
// jamo but is a whole different character, so a syllable-level edit distance would call
// them two edits apart while jamo-level correctly calls it one. Composed-form comparison
// would also treat a wrong vowel as a completely different symbol.
const _JAMO_L = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const _JAMO_V = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const _JAMO_T = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function toJamo(str){
  const out = [];
  for (const ch of String(str).normalize('NFC')) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const s = c - 0xac00;
      out.push(_JAMO_L[Math.floor(s / 588)], _JAMO_V[Math.floor((s % 588) / 28)]);
      const t = _JAMO_T[s % 28];
      if (t) out.push(t);
    } else if (ch !== ' ') {
      out.push(ch);
    }
  }
  return out;
}

function levenshtein(a, b){
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// A word may list alternates as "가다 / 걷다" or comma-separated; any of them is correct.
function acceptableAnswers(word){
  return String(word.ko || '').split(/[\/,]/).map(s => s.trim().normalize('NFC')).filter(Boolean);
}

// Returns 'exact' | 'close' | 'wrong'. 'close' is a one-jamo slip: the learner clearly
// knew the word, so it is accepted but graded Hard rather than thrown away.
function checkAnswer(typed, word){
  const t = String(typed).trim().normalize('NFC');
  if (!t) return 'wrong';
  const options = acceptableAnswers(word);
  if (options.includes(t)) return 'exact';
  const tj = toJamo(t);
  // Only forgive a slip on words long enough that one jamo cannot flip the meaning outright.
  for (const opt of options) {
    const oj = toJamo(opt);
    if (oj.length >= 4 && levenshtein(tj, oj) <= 1) return 'close';
  }
  return 'wrong';
}

function deriveGrade(wasClose = false){
  const m = currentQuizMeta;
  if (wasClose || m.attempts > 0 || m.paidHints > 0) return GRADE.HARD;
  // Easy is only inferable from a fast *typed* answer. On multiple choice a quick click is
  // one-in-four guessing, not fluency, so recognition and listening cap out at Good.
  if (currentQuizMode !== 'type') return GRADE.GOOD;
  const elapsed = Date.now() - (m.openedAt || Date.now());
  return elapsed <= EASY_ANSWER_MS ? GRADE.EASY : GRADE.GOOD;
}

function openQuiz(word, plot, phase=1){
  if(quizOpen) return;
  currentWord=word; currentPlot=plot; currentPhase=phase;
  quizOpen=playerLocked=true;
  resetQuizMeta();
  
  // Reset tier hint reveal card
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }

  const cfg=PHASE_CFG[phase-1];
  // Phase bar UI
  const pi=$('quiz-phase-icon'); if(pi) pi.textContent=cfg.icon;
  const pt=$('quiz-phase-title'); if(pt) pt.textContent=cfg.title;
  const pn=$('quiz-phase-name'); if(pn) pn.textContent=cfg.icon+' '+cfg.title;
  const pd=$('quiz-phase-dots'); if(pd) pd.textContent=cfg.dots;
  const gr=$('quiz-gold-reward'); if(gr) gr.textContent=cfg.reward;
  const sb=$('submit-btn'); if(sb) sb.textContent=cfg.btn;
  const qui=$('quiz-ui'); if(qui) qui.className='phase-'+phase;
  // Fill data (CSS controls visibility per phase)
  hintEmoji.textContent     = word.hint||'?';
  hintCategory.textContent  = wordCategory(word);
  enWordDisplay.textContent = word.en;
  quizLevelTag.textContent  = 'P'+phase+'/3';
  // Phase 3: populate fun-fact recall hints
  const ffText=$('quiz-funfact-text'), ffCulture=$('quiz-funfact-culture');
  if(ffText && ffCulture){
    if(phase===3){
      const fact = getFunFact(word);
      ffText.textContent    = fact.structure || '';
      ffCulture.textContent = fact.origin || fact.hint || '';
    } else {
      ffText.textContent = ''; ffCulture.textContent = '';
    }
  }
  answerInput.value=''; feedbackText.textContent=''; feedbackText.className='';
  applyQuizMode(word, phase);
  quizBackdrop.classList.add('visible');
  if(currentQuizMode === 'type') setTimeout(()=>answerInput.focus(),80);
}

// ── Question modes ───────────────────────────────────────────────────────────
// Every phase used to be "type the Korean for this English word", which is production
// recall — the hardest form. For a word the player has never seen that is not a test at
// all: the Korean is nowhere on screen, so the only way through is to buy a hint. (The
// code claimed "CSS controls visibility per phase", but no phase-1/2/3 rules ever existed,
// so all three phases rendered identically.)
//
// First contact is now recognition: the Korean is shown as the prompt and the player picks
// its meaning, which teaches the pairing. Production typing is kept for the graded recall
// at phase 3, where it belongs. (currentQuizMode / currentChoices are declared up beside
// currentQuizMeta so deriveGrade can read the mode.)

function pickQuizMode(word, phase){
  if (phase === 3) return 'type';                       // graded recall stays production
  const e = srsData[word.ko];
  const firstContact = !e || e.st === 'new';
  if (phase === 1 && firstContact) return 'recognise';
  // Second touch: listening where a Korean voice exists, otherwise typing.
  if (phase === 2 && KoreanTTS.isAvailable() && !firstContact) return 'listen';
  return 'type';
}

// Distractors are drawn from the same category where possible, so a choice cannot be made
// by elimination on topic alone.
function buildChoices(word, count = 4){
  const pool = unlockedLevels.flatMap(i => levelsData[i]?.words || []).filter(w => w.ko !== word.ko);
  const sameCat = pool.filter(w => wordCategory(w) === wordCategory(word));
  const from = sameCat.length >= count - 1 ? sameCat : pool;
  const picked = [];
  const used = new Set();
  while (picked.length < count - 1 && used.size < from.length) {
    const i = Math.floor(Math.random() * from.length);
    if (used.has(i)) continue;
    used.add(i);
    picked.push(from[i]);
  }
  const options = [...picked, word];
  for (let i = options.length - 1; i > 0; i--) {   // Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function applyQuizMode(word, phase){
  currentQuizMode = pickQuizMode(word, phase);
  const koPrompt = $('quiz-ko-prompt'), choices = $('quiz-choices'), qText = $('question-text');
  const hints = $('quiz-tier-hints');

  const showTyping = currentQuizMode === 'type';
  answerInput.classList.toggle('hidden', !showTyping);
  answerInput.style.display = showTyping ? '' : 'none';
  if ($('submit-btn')) $('submit-btn').style.display = showTyping ? '' : 'none';
  // Hints reveal the spelling, which is the answer in typing mode but pointless in the
  // others — the Korean is already on screen, or the question is about the meaning.
  if (hints) hints.style.display = showTyping ? '' : 'none';
  choices.classList.toggle('hidden', showTyping);
  koPrompt.classList.toggle('hidden', currentQuizMode !== 'recognise');
  enWordDisplay.style.display = showTyping ? '' : 'none';

  if (showTyping) { qText.textContent = 'Type in Korean for:'; currentChoices = []; return; }

  if (currentQuizMode === 'recognise') {
    qText.textContent = 'What does this word mean?';
    $('quiz-ko-word').textContent = word.ko;
    const speak = $('quiz-ko-speak');
    if (speak) speak.onclick = () => speakKorean(word.ko);
    speakKorean(word.ko);          // free here: the spelling is already visible
  } else {
    qText.textContent = '🔊 Listen — which word was that?';
    speakKorean(word.ko);
  }

  currentChoices = buildChoices(word);
  choices.innerHTML = '';
  currentChoices.forEach(opt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quiz-choice-btn';
    // Recognition shows the Korean, so options are meanings. Listening hides it, so
    // options are Korean spellings — the learner maps sound to spelling.
    b.textContent = currentQuizMode === 'recognise' ? opt.en : opt.ko;
    b.onclick = () => answerChoice(opt, b);
    choices.appendChild(b);
  });
}

function answerChoice(opt, btn){
  if(!currentWord || !quizOpen) return;
  const correct = opt.ko === currentWord.ko;
  const all = [...$('quiz-choices').querySelectorAll('.quiz-choice-btn')];
  all.forEach(b => { b.disabled = true; });
  btn.classList.add(correct ? 'correct' : 'wrong');
  if(!correct){
    // Always reveal the right answer — a wrong guess is the moment the word is learned.
    const idx = currentChoices.findIndex(o => o.ko === currentWord.ko);
    if(all[idx]) all[idx].classList.add('correct');
  }

  if(correct){
    playChiptuneSFX('quiz_correct');
    speakKorean(currentWord.ko);
    feedbackText.textContent = `✅ ${currentWord.ko} — ${currentWord.en}`;
    feedbackText.className = 'correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    const grade = deriveGrade();
    gradeWord(cw.ko, grade);
    if(ph===1){ plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook(); }
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph,grade); }, 950);
  } else {
    playChiptuneSFX('quiz_wrong');
    currentQuizMeta.attempts++;
    feedbackText.textContent = `❌ It's ${currentWord.ko} — ${currentWord.en}`;
    feedbackText.className = '';
    // Re-ask rather than punishing: this is a teaching step, not the graded recall.
    setTimeout(()=>{
      if(!quizOpen || !currentWord) return;
      applyQuizMode(currentWord, currentPhase);
      feedbackText.textContent = 'Try again — which one is it?';
    }, 1500);
  }
}
function closeQuiz(){
  playChiptuneSFX('click');
  quizOpen=playerLocked=false;
  appleTreeQuizPending=false; // always reset on close
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }
  quizBackdrop.classList.remove('visible');
  const qui=$('quiz-ui'); if(qui) qui.className='';
  // Restore the typing layout so the next quiz opens in a known state.
  const ch=$('quiz-choices'); if(ch){ ch.classList.add('hidden'); ch.innerHTML=''; }
  const kp=$('quiz-ko-prompt'); if(kp) kp.classList.add('hidden');
  const kw=$('quiz-ko-word'); if(kw) kw.textContent='';   // don't leave the answer staged
  answerInput.style.display=''; answerInput.classList.remove('hidden');
  if($('submit-btn')) $('submit-btn').style.display='';
  if($('quiz-tier-hints')) $('quiz-tier-hints').style.display='';
  enWordDisplay.style.display='';
  currentQuizMode='type'; currentChoices=[];
  currentWord=currentPlot=null;
}
function submitAnswer(){
  if(!currentWord) return;
  // Normalize to NFC before comparing: macOS/iOS Korean IMEs emit decomposed jamo
  // (NFD) while levels.json stores composed syllables, so 어머니 typed on a Mac
  // would never match 어머니 on disk despite looking identical.
  const typed=answerInput.value.trim().normalize('NFC');
  const verdict=checkAnswer(typed, currentWord);
  if(verdict!=='wrong'){
    playChiptuneSFX('quiz_correct');
    // Say the word back on a correct answer. Free, and only after the learner has
    // already produced it — so it reinforces the spelling→sound link without ever
    // acting as a hint. The chiptune SFX is short, so a small delay avoids overlap.
    const spokenWord = currentWord.ko;
    setTimeout(() => speakKorean(spokenWord), 180);
    // ── Apple Tree harvest (special Phase 3 quiz) ─────────────────────────
    if(appleTreeQuizPending){
      feedbackText.textContent='🍎 Harvested! Excellent Korean!'; feedbackText.className='correct';
      appleTreeQuizPending=false;
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.onAppleHarvested(); },700);
      return;
    }
    // ── Normal crop quiz ──────────────────────────────────────────────────
    const msgs=['🌱 Planted! Remember to water!','💧 Watered! Almost ripe!','🍎 Excellent! +Gold earned!'];
    feedbackText.textContent = verdict==='close'
      ? `✅ Close enough — it's ${currentWord.ko}`
      : msgs[currentPhase-1];
    feedbackText.className='correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    // Grade before the state changes, while the attempt/hint counters still describe
    // this answer. gradeWord is the single entry point into the scheduler.
    const grade = deriveGrade(verdict==='close');
    const srsAfter = gradeWord(cw.ko, grade);
    if(ph===3 && srsAfter.st==='review'){
      feedbackText.textContent = `🍎 ${srsAfter.reps===1 ? 'Learned' : 'Reviewed'}! Next review in ${srsIntervalLabel(srsAfter)}`;
    }
    if(ph===1){plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();}
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph,grade); },650);
  } else {
    playChiptuneSFX('quiz_wrong');
    // Counts toward the grade even if the next attempt succeeds — needing a retry is
    // exactly the signal SM-2's "Hard" is meant to capture.
    currentQuizMeta.attempts++;
    const isApple = appleTreeQuizPending;
    const wrong = isApple ? '❌ Wrong! Try again to harvest!' : (currentPhase===3?'❌ Wrong! Plant regressed to Phase 2!':'❌ Wrong! Try again.');
    feedbackText.textContent=wrong; feedbackText.className='';
    answerInput.value=''; answerInput.focus();
    answerInput.animate(
      [{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],
      {duration:260,easing:'ease-out'});
    // Apple tree quiz: no regression, just retry
    if(!isApple && currentPhase===3){
      const cp=currentPlot, cw=currentWord;
      appleTreeQuizPending=false;
      // Failing at phase 3 is a lapse: a mature word drops to relearning and loses half
      // its interval, a learning word restarts its steps.
      const after = gradeWord(cw.ko, GRADE.AGAIN);
      if(after.lapses > 0){
        feedbackText.textContent = `❌ Lapsed — interval reset to ${srsIntervalLabel(after)} after relearning.`;
      }
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.regressionPlot(cp,cw); },1400);
    }
  }
}
submitBtn.addEventListener('click', submitAnswer);
cancelBtn.addEventListener('click', closeQuiz);
answerInput.addEventListener('keydown', e => {
  if(e.key==='Enter'){e.preventDefault();submitAnswer();}
  if(e.key==='Escape') closeQuiz();
  e.stopPropagation();
});
quizBackdrop.addEventListener('keydown', e => e.stopPropagation());
quizBackdrop.addEventListener('keyup',   e => e.stopPropagation());

// ═══════════════ SHOP ════════════════════════════════════════════════════════
function openShop() {
  playChiptuneSFX('click');
  shopOpen = true;
  updateGoldHUD();
  buildShopGrid();
  setModalState('shop-overlay', true);
}
function closeShop() {
  playChiptuneSFX('click');
  shopOpen = false;
  setModalState('shop-overlay', false);
}

function _doLevelPurchase(idx) {
  const cost = LEVEL_COST(idx);
  if(unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return false; }
  if(!spendCoins(cost)) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return false; }
  unlockedLevels.push(idx);
  if(sceneRef) sceneRef.refreshPlotAccess();
  showToast(`🎉 Unlocked "${levelName(levelsData[idx])}"! Welcome to Level ${levelsData[idx].level}!`, 4500);
  return true;
}
function buyLevel(idx) {
  playChiptuneSFX('click');
  const cost = LEVEL_COST(idx);
  if (unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return; }
  if (playerCurrencies.coins < cost) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return; }
  startShopQuizGate(idx);
}
// Expansions must be bought in order, cheapest first. Without this the shop happily
// sold plot 6 before plot 1, which made the ascending cost curve meaningless.
function isPlotExpansionAvailable(idx) {
  return idx === 0 || isPlotUnlocked(BASE_PLOT_COUNT + idx - 1);
}

function buyPlotExpansion(idx) {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  const plotIndex = BASE_PLOT_COUNT + idx;
  const cost = PLOT_UNLOCK_COSTS[idx] || 1000;

  if (isPlotUnlocked(plotIndex)) {
    showToast('You already unlocked this farm plot!');
    return;
  }

  if (!isPlotExpansionAvailable(idx)) {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    showToast(`🔒 Unlock Farm Plot #${plotIndex} first!`);
    return;
  }

  if (playerCurrencies.coins < cost) {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    showToast(`Need ${cost} Gold 🪙 to unlock Farm Plot #${plotIndex + 1}!`);
    return;
  }

  spendCoins(cost);
  if (!unlockedPlots.includes(plotIndex)) unlockedPlots.push(plotIndex);
  // Derived from the array, never the other way round.
  unlockedPlotCount = unlockedPlots.length;

  if (sceneRef) {
    const p = sceneRef.plots ? sceneRef.plots[plotIndex] : null;
    if (p && typeof sceneRef.unlockPlot === 'function') {
      sceneRef.unlockPlot(p);
    } else if (typeof sceneRef.refreshPlotAccess === 'function') {
      sceneRef.refreshPlotAccess();
    }
  }

  persistSave();
  showToast(`🎉 Unlocked Farm Plot #${plotIndex + 1}!`);
  buildShopGrid();
  updateGoldHUD();
}

function buildShopGrid() {
  const grid = $('shop-level-grid'); if(!grid) return; grid.innerHTML = '';

  // Section 1: Farm Plot Expansions
  const plotHeader = document.createElement('div');
  plotHeader.className = 'shop-section-header';
  plotHeader.style.cssText = 'grid-column: 1 / -1; font-family: "Press Start 2P", monospace; font-size: 13px; color: var(--neon-gold, #FBBF24); margin: 10px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(251, 191, 36, 0.3); display: flex; align-items: center; gap: 8px;';
  plotHeader.innerHTML = `🌾 Farm Plot Expansions (${unlockedPlots.length}/15 Unlocked)`;
  grid.appendChild(plotHeader);

  PLOT_UNLOCK_COSTS.forEach((cost, idx) => {
    const plotIndex = BASE_PLOT_COUNT + idx;
    const isOwned = isPlotUnlocked(plotIndex);
    const available = isPlotExpansionAvailable(idx);
    const canAfford = playerCurrencies.coins >= cost;
    const buyable = available && canAfford;

    const card = document.createElement('div');
    card.className = 'shop-card' + (isOwned ? ' owned' : (!buyable ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${isOwned || available ? '🌾' : '🔒'}</div>
      <div class="shop-card-name">Plot #${idx + 1} Expansion</div>
      <div class="shop-card-desc">Unlock Farm Plot #${plotIndex + 1} for ${cost} Gold</div>
      <div class="shop-card-price">
        ${isOwned
          ? `<span class="shop-owned-badge">✅ Owned</span>
             <button class="shop-buy-btn" disabled>Unlocked</button>`
          : `<span class="shop-card-cost">💰 ${cost} gold</span>
             <button class="shop-buy-btn" ${buyable ? '' : 'disabled'} onclick="buyPlotExpansion(${idx})">
               ${!available
                  ? `Unlock Plot #${plotIndex} first`
                  : (canAfford ? '🛒 Buy Now' : `Need ${cost - playerCurrencies.coins} gold`)}
             </button>`}
      </div>`;
    grid.appendChild(card);
  });

  // Section 2: Vocabulary Level Packs
  const lvlHeader = document.createElement('div');
  lvlHeader.className = 'shop-section-header';
  lvlHeader.style.cssText = 'grid-column: 1 / -1; font-family: "Press Start 2P", monospace; font-size: 13px; color: var(--neon-cyan, #38BDF8); margin: 20px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; gap: 8px;';
  lvlHeader.innerHTML = `📚 Vocabulary Level Packs`;
  grid.appendChild(lvlHeader);

  levelsData.forEach((lvl, idx) => {
    const owned     = unlockedLevels.includes(idx);
    const cost      = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : (!canAfford ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${lvl.icon||'📚'}</div>
      <div class="shop-card-name">Level ${lvl.level}: ${levelName(lvl)}</div>
      <div class="shop-card-desc">${lvl.description||''} — ${lvl.words.length} words</div>
      <div class="shop-card-price">
        ${owned
          ? `<span class="shop-owned-badge">✅ Owned</span>
             <button class="shop-buy-btn" onclick="closeShop();startLevel(${idx})">🌾 Play</button>`
          : `<span class="shop-card-cost">💰 ${cost} gold</span>
             <button class="shop-buy-btn" ${canAfford?'':'disabled'} onclick="buyLevel(${idx})">
               ${canAfford ? '🛒 Buy Now' : `Need ${cost-gold} more gold`}
             </button>`}
      </div>`;
    grid.appendChild(card);
  });
}
$('shop-close-btn').addEventListener('click', closeShop);
$('shop-btn').addEventListener('click', openShop);
$('shop-overlay').addEventListener('keydown', e => e.stopPropagation());

// ═══════════════ VOCAB BOOK ══════════════════════════════════════════════════
let activeCat = 'all';
let activeMasteryFilter = 'all';

function buildVocabBook() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  const ko = levelNameKo(lvl);
  vocabSubtitle.textContent = `Level ${lvl.level} – ${levelName(lvl)}${ko ? ` (${ko})` : ''}`;
  const cats = ['all', '⏰ Due', '⚪ New', '🌱 Learning', '🍎 Review', '🌟 Mature', ...new Set(lvl.words.map(wordCategory).filter(Boolean))];
  catFiltersEl.innerHTML = '';
  cats.forEach(cc => {
    const b = document.createElement('button');
    b.className = 'cat-filter-btn' + (cc === activeCat ? ' active' : '');
    b.textContent = cc === 'all' ? '🌐 All' : cc;
    b.onclick = () => { activeCat = cc; buildVocabBook(); };
    catFiltersEl.appendChild(b);
  });
  renderVocabCards();
}
// ══════ WORD ORIGIN DATA ═════════════════════════════════════════════════════
// Loaded from facts.json, keyed by word.ko. This was an 803 KB inline literal
// (`VOCAB_FACTS`) until an audit found it was 99.7% templated filler: every entry
// repeated the same closing sentence and mnemonic scaffold, and the "example
// sentences" were string-concatenated and often ungrammatical. Regenerated by
// scripts/build_facts_json.js as ~58 KB of structured origin data.
//
// Romanization, syllable count and 받침 are derived from the Hangul at render
// time, so they are deliberately not stored.
let factsData = {};
let factsLoaded = false;

// Non-blocking: origins are only needed once a fun-fact panel is opened, and
// getFunFact() degrades to pronunciation-only until the fetch lands. Guarded so the
// script still evaluates where fetch is absent (Node test harnesses run game.js in
// a bare vm context).
function loadFacts(){
  // Browser-only: Node has a global fetch but no document, and a relative URL there
  // throws ERR_INVALID_URL. Checking for document keeps the test harnesses quiet.
  if (typeof fetch !== 'function' || typeof document === 'undefined') return Promise.resolve();
  return fetch('facts.json')
    .then(r => r.json())
    .then(d => { factsData = d || {}; factsLoaded = true; })
    .catch(e => { console.warn('facts.json failed to load:', e); factsData = {}; });
}
loadFacts();

// ── Hangul decomposition (Revised Romanization) ──────────────────────────────
const RR_CHOSEONG  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const RR_JUNGSEONG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','weo','we','wi','yu','eu','ui','i'];
const RR_JONGSEONG = ['','k','k','ks','n','nj','nh','t','l','lg','lm','lb','ls','lt','lp','lh','m','p','bs','t','t','ng','t','t','k','t','p','t'];

function decomposeHangulWord(str) {
  if (!str) return [];
  const syllables = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const c = Math.floor(s / 588);
      const j = Math.floor((s % 588) / 28);
      const z = s % 28;
      syllables.push({
        char: str[i],
        initial: RR_CHOSEONG[c],
        medial: RR_JUNGSEONG[j],
        final: RR_JONGSEONG[z],
        hasBatchim: z > 0,
        rom: RR_CHOSEONG[c] + RR_JUNGSEONG[j] + RR_JONGSEONG[z]
      });
    }
  }
  return syllables;
}

function getHangulRomanization(str) {
  if (!str) return '';
  const parts = [];
  let currentHangul = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const c = Math.floor(s / 588);
      const j = Math.floor((s % 588) / 28);
      const z = s % 28;
      currentHangul.push(RR_CHOSEONG[c] + RR_JUNGSEONG[j] + RR_JONGSEONG[z]);
    } else {
      if (currentHangul.length > 0) { parts.push(currentHangul.join('-')); currentHangul = []; }
      if (str[i] !== ' ' || parts.length > 0) parts.push(str[i]);
    }
  }
  if (currentHangul.length > 0) parts.push(currentHangul.join('-'));
  return parts.join('').trim();
}

// ── Origin / structure renderers ─────────────────────────────────────────────
const SINO = 'Sino-Korean (한자어)';

// [char, reading, meaning] → 父 (부) "father"
function _hanjaParts(parts) {
  if (!parts || !parts.length) return '';
  return parts.map(p => `${p[0]} (${p[1]}) “${p[2]}”`).join(' + ');
}

function renderOrigin(f) {
  if (!f) return '';
  const parts = _hanjaParts(f.p);
  switch (f.o) {
    case 'sino':
      return `${SINO} — ${f.h}${parts ? ' = ' + parts : ''}`;
    case 'sino-partial':
      return `${SINO} — built on ${f.h}${parts ? ' = ' + parts : ''}`;
    case 'sino-verb':
      return f.h
        ? `${SINO} verb — ${f.h} + ${f.s || '하다'}${parts ? ' = ' + parts : ''}`
        : `${SINO} verb — 하다 attaches to a Sino-Korean root`;
    case 'sino-passive':
      return f.h
        ? `${SINO} verb — ${f.h} + ${f.s || '되다'}${parts ? ' = ' + parts : ''}`
        : `${SINO} verb — 되다 / 시키다 forms the passive or causative`;
    case 'sino-adj':
      return f.h
        ? `${SINO} adjective — ${f.h} + ${f.s || '적'}${parts ? ' = ' + parts : ''}`
        : `${SINO} adjective — the suffix -적 turns a noun into a descriptive`;
    case 'sino-noun':
      return `${SINO} noun — formed with the suffix -성 / -력 / -감`;
    case 'mixed':
      return `${SINO} + native Korean — ${parts} + ${f.n} (native Korean)`;
    case 'mixed-loan':
      return `${SINO} + loanword — ${f.h}${parts ? ' = ' + parts : ''}, plus English “${f.l}”`;
    case 'loan':
      return `Loanword (외래어) — from ${f.l.includes('(') ? f.l : `English “${f.l}”`}`;
    case 'native':
      return `Native Korean (고유어)${f.note ? ' — ' + f.note : ''}`;
    default:
      return '';
  }
}

// Pronunciation and syllable shape, always derived from the Hangul itself.
function renderStructure(ko) {
  const syl = decomposeHangulWord(ko);
  const n = syl.length;
  if (!n) return '';
  const rom = getHangulRomanization(ko);
  const bits = [`[${rom}]`, `${n} syllable${n === 1 ? '' : 's'} (${syl.map(s => s.char).join(' · ')})`];
  const last = syl[n - 1];
  bits.push(last.hasBatchim
    ? `final syllable ${last.char} closes on a 받침 (-${last.final})`
    : `final syllable ${last.char} is open, no 받침`);
  return bits.join(' · ');
}

// English topical note, used when a word has no curated origin.
function renderCategoryHint(cat) {
  const c = (cat || '').toLowerCase();
  const has = (...ks) => ks.some(k => c.includes(k));
  if (has('food', '음식', '식당', '맛'))
    return '🍽️ Food & dining vocabulary. Korean meals are built around balancing flavours and sharing dishes at the table.';
  if (has('animal', '동물'))
    return '🐾 Animal vocabulary. Animals turn up constantly in Korean proverbs, folk tales and pet cafés.';
  if (has('nature', '자연', '계절', '날씨', '환경'))
    return '🌿 Nature & environment vocabulary. Korea has four sharply distinct seasons, so the scenery shifts dramatically through the year.';
  if (has('body', '신체', '건강', '증상'))
    return '💪 Body & health vocabulary. Many Korean body-part words double as metaphors for emotion and attitude.';
  if (has('place', '장소', '건물', '교통', '숙소'))
    return '📍 Places & transport vocabulary. Useful for getting around, asking directions and travelling in Korea.';
  if (has('가족', '사람', '관계'))
    return '👨‍👩‍👧 People & relationships vocabulary. Korean puts real weight on using the right title for the right relationship.';
  if (has('동작', '행동', '업무'))
    return '⚡ Action vocabulary. These land at the end of the sentence in Korean word order (subject – object – verb).';
  return '✨ Everyday Korean vocabulary — common in conversation, dramas and daily life.';
}

// Returns { origin, structure, hint } for any word.
// `origin` may be empty when the word's etymology is not curated; the old data
// asserted "Native Korean" for ~1090 words with no evidence, which mislabelled
// plenty of Sino-Korean vocabulary (건강검진, 환경오염, 기술혁신 …).
function getFunFact(word) {
  if (!word) word = {};
  const ko = (word.ko || '').normalize('NFC');
  return {
    origin: renderOrigin(factsData[ko]),
    structure: renderStructure(ko),
    hint: renderCategoryHint(word.categoryEn || word.category)
  };
}

function showVocabFunFact(word) {
  const fact = getFunFact(word);
  const srs  = getSrs(word.ko);
  const harvests = harvestCounts.get(word.ko) || 0;
  // Report the scheduler's own view of the word instead of guessing a phase from timers.
  let stageLabel = 'Not started';
  if (srsIsMature(srs))          stageLabel = '🌟 Mature';
  else if (srs.st === 'review')  stageLabel = '🍎 In review';
  else if (srs.st === 'relearn') stageLabel = '🔁 Relearning';
  else if (srs.st === 'learn')   stageLabel = '🌱 Learning';
  const modal = $('vocab-ff-modal');
  $('vff-emoji').textContent    = word.hint || '📝';
  $('vff-en').textContent       = word.en;
  $('vff-ko').textContent       = word.ko;
  $('vff-cat').textContent      = wordCategory(word) + (word.categoryEn && word.category ? ` · ${word.category}` : '');
  $('vff-phase').textContent    = stageLabel;
  $('vff-harvests').textContent = srsIsGraduated(srs)
    ? `⏱ Interval ${srsIntervalLabel(srs)} · ${srs.reps} review${srs.reps===1?'':'s'}${srs.lapses?` · ${srs.lapses} lapse${srs.lapses===1?'':'s'}`:''}`
    : (harvests > 0 ? `✅ Harvested ×${harvests}` : '🌱 Not harvested');
  $('vff-fact-origin').textContent    = fact.origin || fact.hint;
  $('vff-fact-structure').textContent = fact.structure;
  modal.classList.add('visible');
}
function closeVocabFunFact() { $('vocab-ff-modal').classList.remove('visible'); }

function renderVocabCards() {
  const lvl = levelsData[currentLevelIndex];
  const q = vocabSearch.value.trim().toLowerCase();
  let words = lvl.words;

  // Filter by learning stage / category. Stages come from the scheduler now, so they mean
  // something about retention rather than counting how often a plot was farmed.
  if(activeCat !== 'all'){
    if(activeCat.includes('New')) words = words.filter(w => !srsData[w.ko] || srsData[w.ko].st === 'new');
    else if(activeCat.includes('Learning')) words = words.filter(w => srsIsLearning(srsData[w.ko]));
    else if(activeCat.includes('Review')) words = words.filter(w => { const e=srsData[w.ko]; return e && e.st==='review' && !srsIsMature(e); });
    else if(activeCat.includes('Mature')) words = words.filter(w => srsIsMature(srsData[w.ko]));
    else if(activeCat.includes('Due')) words = words.filter(w => srsIsDue(srsData[w.ko], Date.now()));
    else words = words.filter(w => wordCategory(w) === activeCat);
  }
  
  if(q) words = words.filter(w => w.ko.toLowerCase().includes(q) || w.en.toLowerCase().includes(q) || getRoman(w.ko).includes(q));
  
  vocabCountEl.textContent = `${words.length} words`; vocabGrid.innerHTML = '';
  const now = Date.now();
  words.forEach(w => {
    const times   = harvestCounts.get(w.ko) || 0;
    const planted = plantedWords.has(w.ko);
    const chosung = getChosung(w.ko);
    const roman   = getRoman(w.ko);
    const e       = srsData[w.ko];

    // Badge reflects scheduler state; the suffix shows the current interval, which is the
    // number that actually tells a learner how well they know the word.
    let mBadgeClass = 'novice', mBadgeLabel = '⚪ New', mBadgeSuffix = '';
    if(srsIsMature(e))        { mBadgeClass='legendary'; mBadgeLabel='🌟 Mature'; }
    else if(e && e.st==='review'){ mBadgeClass='mastered';  mBadgeLabel='🍎 Review'; }
    else if(srsIsLearning(e)) { mBadgeClass='practicing'; mBadgeLabel = e.st==='relearn' ? '🔁 Relearning' : '🌱 Learning'; }
    if(srsIsGraduated(e)) mBadgeSuffix = ` (${srsIntervalLabel(e)})`;
    if(srsIsDue(e, now))  mBadgeSuffix += ' ⏰';

    const div = document.createElement('div');
    div.className = `vocab-card ${mBadgeClass}` + (times > 0 || srsIsGraduated(e) ? ' planted' : '') + (planted ? ' growing' : '');
    div.title = 'Click for Fun Facts & Hints!';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <button type="button" class="speak-btn vc-speak tts-only" title="Hear this word">🔊</button>
      <span class="vc-emoji">${w.hint||'📝'}</span>
      <span class="vc-ko">${w.ko}</span>
      <span style="font-size:12px; color:#67e8f9; font-weight:bold; font-family:monospace">[${roman}]</span>
      <span class="vc-en">${w.en}</span>
      <span style="font-size:11px; color:#fde047; font-family:monospace">초성: ${chosung}</span>
      <span class="mastery-badge ${mBadgeClass}">${mBadgeLabel}${mBadgeSuffix}</span>`;
    // Free here: the vocab book already shows the answer, so audio adds nothing to give away.
    div.querySelector('.vc-speak').addEventListener('click', (e) => {
      e.stopPropagation();          // don't also open the fun-fact modal
      speakKorean(w.ko);
    });
    div.addEventListener('click', () => showVocabFunFact(w));
    vocabGrid.appendChild(div);
  });
}
function updateVocabBook() { if(vocabOverlay.classList.contains('visible')) renderVocabCards(); }
vocabBtn.addEventListener('click', () => vocabOverlay.classList.contains('visible')
  ? vocabOverlay.classList.remove('visible')
  : (buildVocabBook(), vocabOverlay.classList.add('visible')));
$('vocab-close-btn').addEventListener('click', () => vocabOverlay.classList.remove('visible'));
vocabSearch.addEventListener('input', renderVocabCards);
hudMenuBtn.addEventListener('click', () => { closeQuiz(); showLevelSelect(); });

// Legacy overlays (now rarely triggered, economy is main flow)
levelupNextBtn && levelupNextBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); openShop(); });
levelupMenuBtn && levelupMenuBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); showLevelSelect(); });
replayBtn && replayBtn.addEventListener('click', () => { alldoneOverlay.classList.remove('visible'); startLevel(0); });
menuBtn   && menuBtn.addEventListener('click', ()   => { alldoneOverlay.classList.remove('visible'); showLevelSelect(); });

// ═══════════════ GRAPHICS & ATMOSPHERE SYSTEM CLASSES ═════════════════════════
class DayNightSystem {
  constructor(scene, cycleDurationSec = 240) {
    this.scene = scene;
    this.cycleDuration = cycleDurationSec * 1000;
    this.timeMs = 6 * 3600 * 1000; // Start at 06:00 AM (Dawn)

    this.ambientOverlay = scene.add.graphics()
      .setDepth(9990)
      .setScrollFactor(0);

    this.keyframes = [
      { hour: 0,  color: { r: 15, g: 23, b: 42 },   alpha: 0.65 }, // Night
      { hour: 4,  color: { r: 30, g: 27, b: 75 },   alpha: 0.50 }, // Late Night
      { hour: 6,  color: { r: 253, g: 186, b: 116 }, alpha: 0.20 }, // Dawn / Sunrise
      { hour: 8,  color: { r: 255, g: 255, b: 255 }, alpha: 0.00 }, // Day
      { hour: 17, color: { r: 249, g: 115, b: 22 },  alpha: 0.20 }, // Sunset
      { hour: 19, color: { r: 124, g: 58, b: 237 },  alpha: 0.40 }, // Dusk
      { hour: 21, color: { r: 15, g: 23, b: 42 },   alpha: 0.65 }, // Night
      { hour: 24, color: { r: 15, g: 23, b: 42 },   alpha: 0.65 }  // Cycle end
    ];

    if (scene.scale && scene.scale.on) {
      scene.scale.on('resize', (gameSize) => {
        this.width = gameSize.width;
        this.height = gameSize.height;
      });
    }
    this.width = scene.scale ? scene.scale.width : 1024;
    this.height = scene.scale ? scene.scale.height : 768;
  }

  update(dt = 16) {
    this.timeMs = (this.timeMs + dt) % (24 * 3600 * 1000);
    const hour = (this.timeMs / (3600 * 1000)) % 24;
    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;

    const state = this._interpolateLighting(hour);

    this.ambientOverlay.clear();
    if (state.alpha > 0.005) {
      const hexColor = (state.color.r << 16) | (state.color.g << 8) | state.color.b;
      const w = this.width || (this.scene.scale ? this.scene.scale.width : 1024);
      const h = this.height || (this.scene.scale ? this.scene.scale.height : 768);
      this.ambientOverlay.fillStyle(hexColor, state.alpha);
      this.ambientOverlay.fillRect(0, 0, w, h);
    }

    return { hour, sunAngle, state };
  }

  _interpolateLighting(hour) {
    let k1 = this.keyframes[0], k2 = this.keyframes[1];
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (hour >= this.keyframes[i].hour && hour <= this.keyframes[i+1].hour) {
        k1 = this.keyframes[i];
        k2 = this.keyframes[i+1];
        break;
      }
    }
    const span = k2.hour - k1.hour || 1;
    const t = (hour - k1.hour) / span;

    const r = Math.round(k1.color.r + (k2.color.r - k1.color.r) * t);
    const g = Math.round(k1.color.g + (k2.color.g - k1.color.g) * t);
    const b = Math.round(k1.color.b + (k2.color.b - k1.color.b) * t);
    const alpha = k1.alpha + (k2.alpha - k1.alpha) * t;

    return { color: { r, g, b }, alpha, hex: (r << 16) | (g << 8) | b };
  }
}

class AmbientLightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
  }

  addLight(x, y, textureKey = 'light_glow_soft', scale = 1, alpha = 0.6) {
    if (!this.scene.textures || !this.scene.textures.exists(textureKey)) return null;
    const blendMode = (typeof Phaser !== 'undefined' && Phaser.BlendModes) ? Phaser.BlendModes.ADD : 'ADD';
    const light = this.scene.add.image(x, y, textureKey)
      .setScale(scale)
      .setAlpha(alpha)
      .setBlendMode(blendMode)
      .setDepth(9985);
    this.lights.push(light);
    return light;
  }

  attachTo(target, textureKey = 'light_glow_lantern', scale = 0.8, alpha = 0.5) {
    const light = this.addLight(target.x, target.y, textureKey, scale, alpha);
    if (light) light._followTarget = target;
    return light;
  }

  update() {
    this.lights.forEach(l => {
      if (l && l._followTarget && l._followTarget.active) {
        l.setPosition(l._followTarget.x, l._followTarget.y);
      }
    });
  }
}

class DynamicShadowSystem {
  constructor(scene) {
    this.scene = scene;
    this.shadows = [];
  }

  createShadow(target, baseW = 30, baseH = 10, offsetY = 18, options = {}) {
    if (!target) return null;
    const shadowContainer = this.scene.add.container(target.x, target.y);

    // AO Core Layer (ground contact)
    const aoCore = this.scene.add.ellipse(0, offsetY, baseW * 0.7, baseH * 0.7, 0x000000, 0.22);
    // Dynamic Directional Penumbra Layer
    const penumbra = this.scene.add.ellipse(0, offsetY, baseW, baseH, 0x000000, 0.35);

    shadowContainer.add([aoCore, penumbra]);
    shadowContainer._target = target;
    shadowContainer._baseW = baseW;
    shadowContainer._baseH = baseH;
    shadowContainer._offsetY = offsetY;
    shadowContainer._aoCore = aoCore;
    shadowContainer._penumbra = penumbra;
    shadowContainer._type = options.type || 'directional';

    this.shadows.push(shadowContainer);
    return shadowContainer;
  }

  updateAllShadows(sunAngle, hour) {
    for (let i = this.shadows.length - 1; i >= 0; i--) {
      const s = this.shadows[i];
      if (!s || !s.active || !s._target || !s._target.active) {
        if (s && s.destroy) s.destroy();
        this.shadows.splice(i, 1);
        continue;
      }
      if (s._type === 'directional') {
        this.updateShadow(s, sunAngle, hour);
      }
    }
  }

  updateShadow(shadowSprite, sunAngle, hour = 12) {
    if (!shadowSprite || !shadowSprite._target || !shadowSprite._target.active) return;
    const target = shadowSprite._target;

    const sunSin = Math.sin(sunAngle);
    const sunCos = Math.cos(sunAngle);

    const isDay = hour >= 5.5 && hour <= 18.5;
    const sunAlt = Math.max(0, sunSin);
    const stretch = Math.max(0.35, Math.abs(sunCos) * 1.85 + (1 - sunAlt) * 0.65);

    const dx = -sunCos * (shadowSprite._baseW * 0.75) * stretch;
    const dy = shadowSprite._offsetY + sunSin * 3.5;

    const scaleX = 1 + Math.abs(dx) / (shadowSprite._baseW * 0.55);
    const scaleY = Math.max(0.4, 1 - Math.abs(sunCos) * 0.35);

    const alpha = isDay ? (0.22 + sunAlt * 0.26) : 0.12;

    const targetY = typeof target.y === 'number' ? target.y : 0;
    const groundDepth = Math.max(0, targetY - 1);

    shadowSprite.setPosition(target.x, target.y);
    shadowSprite.setDepth(groundDepth);

    if (shadowSprite._penumbra) {
      shadowSprite._penumbra.setPosition(dx, dy);
      shadowSprite._penumbra.setScale(scaleX, scaleY);
      shadowSprite._penumbra.setAlpha(alpha);
    } else {
      shadowSprite.setPosition(target.x + dx, target.y + dy);
      shadowSprite.setScale(scaleX, scaleY);
      shadowSprite.setAlpha(alpha);
    }
  }

  updatePointShadow(shadowSprite, lightX, lightY) {
    if (!shadowSprite || !shadowSprite._target || !shadowSprite._target.active) return;
    const target = shadowSprite._target;
    const dx = target.x - lightX;
    const dy = target.y - lightY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const shadowLength = Math.min(28, dist * 0.15);
    const offX = (dx / dist) * shadowLength;
    const offY = (dy / dist) * shadowLength + shadowSprite._offsetY;

    const targetY = typeof target.y === 'number' ? target.y : 0;
    const groundDepth = Math.max(0, targetY - 1);

    shadowSprite.setPosition(target.x, target.y);
    shadowSprite.setDepth(groundDepth);

    if (shadowSprite._penumbra) {
      shadowSprite._penumbra.setPosition(offX, offY);
      shadowSprite._penumbra.setAlpha(0.35);
    } else {
      shadowSprite.setPosition(target.x + offX, target.y + offY);
    }
  }
}

class WeatherEngine {
  constructor(scene) {
    this.scene = scene;
    this.currentWeather = 'clear';
    this.emitters = {};

    this.initEmitters();
  }

  initEmitters() {
    if (!this.scene.add || typeof this.scene.add.particles !== 'function') return;

    const W = (this.scene.scale ? this.scene.scale.width : 1024);
    const H = (this.scene.scale ? this.scene.scale.height : 768);

    if (this.scene.textures && this.scene.textures.exists('p_drop')) {
      try {
        this.emitters.rain = this.scene.add.particles(W / 2, -20, 'p_drop', {
          x: { min: -W / 2, max: W / 2 },
          speedY: { min: 450, max: 650 },
          speedX: { min: -60, max: -20 },
          lifespan: 1800,
          quantity: 4,
          scale: { start: 1, end: 1 },
          alpha: { start: 0.8, end: 0.2 },
          emitting: false
        }).setScrollFactor(0).setDepth(9950);
      } catch (e) {}
    }

    if (this.scene.textures && this.scene.textures.exists('p_snowflake')) {
      try {
        this.emitters.snow = this.scene.add.particles(W / 2, -20, 'p_snowflake', {
          x: { min: -W / 2, max: W / 2 },
          speedY: { min: 40, max: 90 },
          speedX: { min: -30, max: 30 },
          rotate: { min: 0, max: 360 },
          lifespan: 6000,
          quantity: 2,
          scale: { start: 0.8, end: 1.2 },
          alpha: { start: 0.9, end: 0.3 },
          emitting: false
        }).setScrollFactor(0).setDepth(9950);
      } catch (e) {}
    }

    if (this.scene.textures && this.scene.textures.exists('p_fog')) {
      try {
        this.emitters.fog = this.scene.add.particles(0, H / 2, 'p_fog', {
          y: { min: -H / 2, max: H / 2 },
          speedX: { min: 15, max: 40 },
          speedY: { min: -5, max: 5 },
          lifespan: 8000,
          quantity: 1,
          frequency: 600,
          scale: { start: 2, end: 3.5 },
          alpha: { start: 0, ease: 'Sine.easeInOut', to: 0.22, yoyo: true },
          emitting: false
        }).setScrollFactor(0).setDepth(9940);
      } catch (e) {}
    }
  }

  setWeather(type) {
    this.currentWeather = type;
    Object.keys(this.emitters).forEach(key => {
      if (this.emitters[key]) {
        try {
          if (key === type) {
            this.emitters[key].start();
          } else {
            this.emitters[key].stop();
          }
        } catch (e) {}
      }
    });
  }
}

// ═══════════════ PHASER SCENE ════════════════════════════════════════════════
class FarmScene extends Phaser.Scene {
  constructor(){ super({key:'FarmScene'}); }
  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
    this.load.json('levels','levels.json');
  }

  // ── APPLE TREE constants ──────────────────────────────────────────────────
  // Time for apple tree to ripen after last harvest (or game start)
  static get APPLE_RIPEN_MS() { return 2 * 60 * 1000; } // 2 minutes

  create(){
    sceneRef = this;
    this.droppedItems = [];
    if (droppedItemsSave && droppedItemsSave.length > 0) {
      droppedItemsSave.forEach(drop => this.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
    }
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.events.off('resume');
    this.events.on('resume', () => {
      this.cameras.main.fadeIn(300, 0, 0, 0);
      // Reviews can fall due while the player is off in a minigame.
      this._refreshDueReviews();
    });
    levelsData = this.cache.json.get('levels') || [];
    if(!levelsData.length){ console.error('levels.json missing'); return; }

    this._bakeTextures();
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBounds(0, 0, W, H);

    this._drawWorld(W, H);

    // Atmosphere & World Systems (Day/Night, Ambient Lighting, Dynamic Shadows, Weather)
    this.dayNight = new DayNightSystem(this);
    this.lighting = new AmbientLightingSystem(this);
    this.shadows = new DynamicShadowSystem(this);
    this.weather = new WeatherEngine(this);

    if (this.textures && this.textures.exists('p_sparkle') && typeof this.add.particles === 'function') {
      try {
        this.cropSparkleEmitter = this.add.particles(0, 0, 'p_sparkle', {
          speed: { min: 20, max: 60 },
          scale: { start: 1, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          emitting: false
        }).setDepth(500);
      } catch (e) {}
    }

    this.plots = []; this._createPlots(W, H);
    // After restoring saved plots, fill the free ones with whatever is due today.
    this._refreshDueReviews();
    this._createPlayer(W, H); this._addPlotLabels();
    this._createShopNPC(W, H);
    this._createBoardNPC(W, H);
    this._createArcadeNPC(W, H);
    this._createWizardNPC(W, H);
    this._createCatNPC(W, H);
    this._createAppleTree(W, H);
    this._createBeehiveNPC(W, H);
    this._createPortalNPC(W, H);
    this._createFishingSpot(W, H);

    this.keys = {
      W:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.walkFrame = 0; this.walkTimer = 0;

    buildLevelSelectScreen(); playerLocked = true;
    updateGoldHUD();

    // ── RESIZE HANDLER ─ update camera & world bounds on window resize ──
    this.scale.on('resize', (gameSize) => {
      const nw = gameSize.width, nh = gameSize.height;
      this.cameras.main.setBounds(0, 0, Math.max(nw, W), Math.max(nh, H));
      // Update weather/lighting overlays to cover new size
      if (this.lighting) {
        this.lighting.width = nw;
        this.lighting.height = nh;
      }
    });
  }

  // ── BAKE TEXTURES ──────────────────────────────────────────────────────────
  _bakeTextures(){
    const mk = () => this.make.graphics({add:false});
    // Apple Tree texture (22×32 pixels) — lush detailed canopy with individual apples
    const gat=mk();
    // Rich multi-tone crown with leaf detail, apples, and textured bark
    const appleTree_unripe=[
      '......vLLLLv.........',  // row 0  — crown tip
      '....vLLLLLLLv........',  // row 1
      '...LLLLLLLLLLL.......',  // row 2
      '..LLlLLLLLlLLLL......',  // row 3  — leaf variation
      '.LLLLLLLLLLLLLLLl....',  // row 4
      '.lLLLLLLLlLLLLLLLl...',  // row 5
      'LLLLLlLLLLLlLLLLLLL..',  // row 6
      'LLlLLLLLLLLLLLlLLLLL.',  // row 7
      'LLLLLLlLLLLLLLLLLLLLL',  // row 8  — widest
      'lLLLLLLLLlLLLLLLLLLLl',  // row 9
      'LLLLLlLLLLLlLLLLLLLLL',  // row 10
      'lLLLLLLLLLLLLLlLLLLLl',  // row 11
      '.LLLlLLLLLLLLLLLLLLL.',  // row 12
      '.lLLLLLlLLLLlLLLLLLl.',  // row 13
      '..LLLLLLLLLLLLLLLLl..',  // row 14
      '..lLLLLlLLLLlLLLLl...',  // row 15
      '...lLLLLLLLLLLLl.....',  // row 16
      '....llLLLLLLll.......',  // row 17  — crown bottom
      '.........KKK.........',  // row 18  — trunk top
      '........kKKKs........',  // row 19
      '........kKKKs........',  // row 20
      '........kKKKs........',  // row 21
      '........kKKKs........',  // row 22
      '........kKKKs........',  // row 23
      '........kKKKs........',  // row 24
      '.......kkKKKss.......',  // row 25  — trunk base wider
      '.......kKKKKKs.......',  // row 26
      '......kkKKKKKss......',  // row 27
      '.....mkkKKKKKssm.....',  // row 28  — roots
      '....mmm.KKK.mmm......',  // row 29
      '...mm.........mm.....',  // row 30
      '......................', // row 31
    ];
    drawS(gat, appleTree_unripe);
    // Paint small green unripe apples (subtle bumps in crown)
    const uG=0x66AA22, uGh=0x88CC44;
    [[4,5,uG],[5,5,uGh],[13,7,uG],[14,7,uGh],[3,10,uG],[4,10,uGh],
     [16,10,uG],[17,10,uGh],[8,13,uG],[9,13,uGh],[14,5,uG],[15,5,uGh]].forEach(([x,y,c])=>pR(gat,x,y,1,1,c));
    // Trunk bark knot details
    pR(gat,9,21,1,1,0x503018); pR(gat,10,24,1,1,0x503018);
    gat.generateTexture('apple_tree',22*PS,32*PS); gat.destroy();

    // Ripe apple tree — bright red apples with white highlight, golden leaf shimmer
    const gatr=mk();
    const appleTree_ripe=[
      '......vLLLLv.........',
      '....vLLLLLLLv........',
      '...LLLLLLLLLLL.......',
      '..LLlLLLLLlLLLL......',
      '.LLLLLLLLLLLLLLLl....',
      '.lLLLLLLLlLLLLLLLl...',
      'LLLLLlLLLLLlLLLLLLL..',
      'LLlLLLLLLLLLLLlLLLLL.',
      'LLLLLLlLLLLLLLLLLLLLL',
      'lLLLLLLLLlLLLLLLLLLLl',
      'LLLLLlLLLLLlLLLLLLLLL',
      'lLLLLLLLLLLLLLlLLLLLl',
      '.LLLlLLLLLLLLLLLLLLL.',
      '.lLLLLLlLLLLlLLLLLLl.',
      '..LLLLLLLLLLLLLLLLl..',
      '..lLLLLlLLLLlLLLLl...',
      '...lLLLLLLLLLLLl.....',
      '....llLLLLLLll.......',
      '.........KKK.........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '.......kkKKKss.......',
      '.......kKKKKKs.......',
      '......kkKKKKKss......',
      '.....mkkKKKKKssm.....',
      '....mmm.KKK.mmm......',
      '...mm.........mm.....',
      '......................',
    ];
    drawS(gatr, appleTree_ripe);
    // Paint juicy red apples with white specular highlights
    const aR=0xEE1111, aRd=0xAA0808, aRh=0xFF6666, aW=0xFFFFFF;
    // Apple 1 (upper-left)
    [[4,4,aRd],[5,4,aR],[4,5,aR],[5,5,aR],[5,4,aRh]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,4,4,1,1,aW); // highlight
    // Apple 2 (upper-right)
    [[14,5,aRd],[15,5,aR],[14,6,aR],[15,6,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,14,5,1,1,aW);
    // Apple 3 (mid-left)
    [[2,9,aRd],[3,9,aR],[2,10,aR],[3,10,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,2,9,1,1,aW);
    // Apple 4 (mid-right)
    [[16,9,aRd],[17,9,aR],[16,10,aR],[17,10,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,16,9,1,1,aW);
    // Apple 5 (center)
    [[9,11,aRd],[10,11,aR],[9,12,aR],[10,12,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,9,11,1,1,aW);
    // Apple 6 (lower-left)
    [[5,13,aRd],[6,13,aR],[5,14,aR],[6,14,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,5,13,1,1,aW);
    // Apple 7 (lower-right)
    [[14,13,aRd],[15,13,aR],[14,14,aR],[15,14,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,14,13,1,1,aW);
    // Trunk bark knot details
    pR(gatr,9,21,1,1,0x503018); pR(gatr,10,24,1,1,0x503018);
    gatr.generateTexture('apple_tree_ripe',22*PS,32*PS); gatr.destroy();

    GRASS.forEach((rows,i)=>{ const g=mk(); drawS(g,rows); g.generateTexture('grs'+i,16*PS,16*PS); g.destroy(); });
    const gd=mk(); drawS(gd,DIRT_DRY); gd.generateTexture('drt_dry',16*PS,16*PS); gd.destroy();
    const gw=mk(); drawS(gw,DIRT_WET); gw.generateTexture('drt_wet',16*PS,16*PS); gw.destroy();

    // Cobblestone Path texture (16x16)
    const gcs = mk();
    pR(gcs, 10, 10, 4, 4, 0x57534E);
    gcs.generateTexture('path_stone', 16*PS, 16*PS); gcs.destroy();

    // Wildflowers (8x8)
    const gflr = mk(); pR(gflr, 2, 2, 4, 4, STARDEW_PALETTE.flowerRed); pR(gflr, 3, 3, 2, 2, STARDEW_PALETTE.flowerYellow); pR(gflr, 3, 6, 2, 2, STARDEW_PALETTE.grassShadow); gflr.generateTexture('flw_red', 8*PS, 8*PS); gflr.destroy();
    const gfly = mk(); pR(gfly, 2, 2, 4, 4, STARDEW_PALETTE.flowerYellow); pR(gfly, 3, 3, 2, 2, 0xFFFFFF); pR(gfly, 3, 6, 2, 2, STARDEW_PALETTE.grassShadow); gfly.generateTexture('flw_yellow', 8*PS, 8*PS); gfly.destroy();
    const gflp = mk(); pR(gflp, 2, 2, 4, 4, STARDEW_PALETTE.flowerPurple); pR(gflp, 3, 3, 2, 2, STARDEW_PALETTE.flowerYellow); pR(gflp, 3, 6, 2, 2, STARDEW_PALETTE.grassShadow); gflp.generateTexture('flw_purple', 8*PS, 8*PS); gflp.destroy();


    const DECOR_PALETTE = {
      '.': null,
      'K': 0x0F172A, // 1px Dark Slate Outline
      'k': 0x1E293B, // Dark slate shadow
      'H': 0x8FD19E, // Leaf highlight green
      'G': 0x4A7C59, // Leaf base green
      'g': 0x2D4E35, // Leaf shade green
      'M': 0x1A3622, // Canopy shadow green
      'O': 0xD99B66, // Sunlit wood highlight
      'o': 0xB3713D, // Oak wood highlight
      'W': 0x8F5428, // Cedar wood base
      'w': 0x573012, // Deep timber shadow
      'D': 0x8F5428, // Wood post base
      'd': 0x573012, // Wood post shadow
      't': 0xC7C1BD, // Stone highlight
      'T': 0x9E9793, // Stone base
      'S': 0x7D7571, // Dark slate base
      's': 0x4A4440, // Deep mortar shadow
      'E': 0xE0F2FE, // Water sparkle
      'v': 0x38BDF8, // Bright cyan
      'V': 0x0284C7, // Water blue
      'C': 0x0369A1, // Deep water blue
      'c': 0x6BB1D6, // Cyan water basin
      'Y': 0xFDE047, // Bright gold
      'y': 0xD97706, // Gold/amber shadow
      'R': 0xEF4444, // Red accent
      'r': 0x991B1B, // Dark red shadow
      'P': 0xA855F7, // Purple portal glow
      'p': 0x6D28D9, // Dark purple shadow
      'b': 0xFFF3C7, // Notice paper parchment
      'N': 0x475569, // Metal slate
      'n': 0x334155  // Metal dark slate
    };

    // Micro Butterfly Wing 0 (Open)
    const gbf0 = mk();
    PixelArtRenderer.drawMatrix(gbf0, [
      'Kvv.vv',
      'vvv.vv',
      '.vvvv.',
      '..KK..',
      '.vvvv.',
      'Kvv.vv'
    ], DECOR_PALETTE, 0, 0, PS);
    gbf0.generateTexture('bf_open', 6*PS, 6*PS); gbf0.destroy();

    // Micro Butterfly Wing 1 (Flap/Up)
    const gbf1 = mk();
    PixelArtRenderer.drawMatrix(gbf1, [
      '.KvvK.',
      '.vvvv.',
      '..vv..',
      '..KK..',
      '..vv..',
      '.KvvK.'
    ], DECOR_PALETTE, 0, 0, PS);
    gbf1.generateTexture('bf_flap', 6*PS, 6*PS); gbf1.destroy();

    // Stone Well / Water Shrine (16x16)
    const gsw = mk();
    PixelArtRenderer.drawMatrix(gsw, [
      '..KKKKKKKKKKKK..',
      '.KOOOOOOOOOOOoK.',
      '.KOWWWWWWWWWwwK.',
      '.KOWKKKKKKKKwwK.',
      '.KOWKTTTTTTKwwK.',
      '.KOWKTSCCSTKwwK.',
      '.KOWKSCcCcSKwwK.',
      '.KOWKSCcCcSKwwK.',
      '.KOWKTSCCSTKwwK.',
      '.KOWKTTTTTTKwwK.',
      '.KOWKKKKKKKKwwK.',
      '.KOWWWWWWWWWwwK.',
      '.KSSSSssssssssK.',
      '.KSSSSssssssssK.',
      '.KKKKKKKKKKKKKK.',
      '................'
    ], DECOR_PALETTE, 0, 0, PS);
    gsw.generateTexture('stone_well', 16*PS, 16*PS); gsw.destroy();

    // Pixel Barrel (10x12)
    const gbar = mk();
    PixelArtRenderer.drawMatrix(gbar, [
      '.KKKKKKKK.',
      'KOOOOOOOoK',
      'KOWWWWWWwK',
      'KKKKKKKKKK',
      'KtTTTTTTsK',
      'KOWWWWWWwK',
      'KOWWWWWWwK',
      'KOWWWWWWwK',
      'KtTTTTTTsK',
      'KKKKKKKKKK',
      'KOWWWWWWwK',
      '.KKKKKKKK.'
    ], DECOR_PALETTE, 0, 0, PS);
    gbar.generateTexture('pixel_barrel', 10*PS, 12*PS); gbar.destroy();

    // Pixel Crate (12x12)
    const gcrat = mk();
    PixelArtRenderer.drawMatrix(gcrat, [
      'KKKKKKKKKKKK',
      'KOOOOOOOOOoK',
      'KOWKKKKKKWwK',
      'KOWKOWWwKWwK',
      'KOWKKOWwKWwK',
      'KOWWKKWwKWwK',
      'KOWWKWKKKWwK',
      'KOWWKWwKKWwK',
      'KOWWKWwKOWwK',
      'KOWKKKKKKWwK',
      'KOwwwwwwwwwK',
      'KKKKKKKKKKKK'
    ], DECOR_PALETTE, 0, 0, PS);
    gcrat.generateTexture('pixel_crate', 12*PS, 12*PS); gcrat.destroy();

    // Directional Signpost (12x14)
    const gsgn = mk();
    PixelArtRenderer.drawMatrix(gsgn, [
      '....KKKK....',
      '.KKKOOOOKKK.',
      '.KOWWWWWWWWK',
      '.KOWWWWWWWWK',
      '.KKKwwwwKKKK',
      '....KWWK....',
      '..KKKOOOOK..',
      '..KOWWWWWWK.',
      '..KOWWWWWWK.',
      '..KKKwwwwwK.',
      '....KWWK....',
      '....KWWK....',
      '....KWWK....',
      '....KKKK....'
    ], DECOR_PALETTE, 0, 0, PS);
    gsgn.generateTexture('signpost', 12*PS, 14*PS); gsgn.destroy();

    // Tree
    const gt = mk();
    PixelArtRenderer.drawMatrix(gt, [
      '.....KKKKKK.......',
      '...KKHHHHHHKK.....',
      '..KHHHHHHHHHHK....',
      '.KHHHHGGGGHHHHK...',
      '.KHHHGGGGGGGGHK...',
      'KHHHGGGGGGGGGGHK..',
      'KHHGGGGggggGGGGHK.',
      'KHHGGGggggggGGGHK.',
      'KHHGGGggggggGGGHK.',
      'KHHGGGggggggGGGHK.',
      'KHHGGGggggggGGGHK.',
      'KHHGGGggggggGGGHK.',
      '.KHHGGGgggggGGHK..',
      '.KHHHGGGGGGGGHK...',
      '..KHHHGGGGGGHK....',
      '...KKHHHHHHKK.....',
      '.....KKKKKK.......',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '......KWWK........',
      '.....KKKKKK.......'
    ], DECOR_PALETTE, 0, 0, PS);
    gt.generateTexture('tree', 18*PS, 28*PS); gt.destroy();

    // Fence
    const gfp = mk();
    PixelArtRenderer.drawMatrix(gfp, [
      'KKKK',
      'KOoK',
      'KOoK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KowK',
      'KKKK'
    ], DECOR_PALETTE, 0, 0, PS);
    gfp.generateTexture('fnc_post', 4*PS, 12*PS); gfp.destroy();

    const gfr = mk();
    PixelArtRenderer.drawMatrix(gfr, [
      'KKKKKKKKKKKKKK',
      'KOOOOOOOOOOOoK',
      'KOWWWWWWWWWWwK',
      'KKKKKKKKKKKKKK'
    ], DECOR_PALETTE, 0, 0, PS);
    gfr.generateTexture('fnc_rail', 14*PS, 4*PS); gfr.destroy();

    // Sparkle
    const gsp = mk();
    PixelArtRenderer.drawMatrix(gsp, [
      '......KKKK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      'KKKKKKKWWKKKKKKK',
      'KWWWWWWWWWWWWWWK',
      'KWWWWWWWWWWWWWWK',
      'KKKKKKKWWKKKKKKK',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KKKK......'
    ], DECOR_PALETTE, 0, 0, 1);
    gsp.generateTexture('sparkle', 16, 16); gsp.destroy();

    // Gold coin 8x8
    const gc = mk();
    PixelArtRenderer.drawMatrix(gc, [
      '..KKKK..',
      '.KYYYYK.',
      'KYYYYYYK',
      'KYYWWYYK',
      'KYYWWYYK',
      'KYYYYYYK',
      '.KYYYYK.',
      '..KKKK..'
    ], DECOR_PALETTE, 0, 0, PS);
    gc.generateTexture('coin', 8*PS, 8*PS); gc.destroy();

    // Shop sign texture 18x22 (Korean Merchant Character)
    const SHOP_PALETTE = Object.assign({}, DECOR_PALETTE, {
      'B': 0x1E293B, // Gat hat dark slate
      'A': 0x38BDF8, // Hat ribbon cyan blue
      'X': 0xFFDDAD, // Skin base warm peach
      'x': 0xF4A261, // Skin shadow
      'f': 0xFFF0D5, // Skin highlight
      'Q': 0xE76F51, // Warm cheek blush
      'U': 0xF8FAFC, // Hanbok white collar / apron highlight
      'u': 0xCBD5E1, // Cream apron shadow
      'J': 0x1E3A8A, // Navy hanbok vest
      'j': 0x172554, // Deep navy vest shadow
      'm': 0xF59E0B  // Gold embroidery on vest
    });
    const gs = mk();
    PixelArtRenderer.drawMatrix(gs, [
      '.....KKKKKKKK.....',
      '....KBBBBBBBBK....',
      '....KBBBBBBBBK....',
      '.KKKKKKKKKKKKKKKK.',
      '.KBBBBBBBBBBBBBBK.',
      '...KAAKXXXXKAAK...',
      '...KXffffffffXK...',
      '...KXKXXKKXXKXK...',
      '...KXfQffffQfXK...',
      '...KXxKKKKKKxXK...',
      '..KKUJJJJJJJJUKK..',
      '.KUuuJJmJJmJJuuUK.',
      '.KuuJmJJJJJJmJuuK.',
      '.KuuJjJjJjJjJjuuK.',
      'KKKKKKKKKKKKKKKKKK',
      'KOOOOOOOOOOOOOOOoK',
      'KOWWKYyKYyKYyKWwwK',
      'KOWWYYYYYYYYYYWwwK',
      'KOWWKYyYYYYyYKWwwK',
      'KOWWWWWWWWWWwwwwwK',
      'KOwwwwwwwwwwwwwwwK',
      'KKKKKKKKKKKKKKKKKK'
    ], SHOP_PALETTE, 0, 0, PS);
    gs.generateTexture('shop_sign', 18*PS, 22*PS); gs.destroy();

    // Notice Board texture 18x16
    const NOTICE_BOARD_PALETTE = Object.assign({}, DECOR_PALETTE, {
      'K': 0x0F172A,
      'O': 0xE5A96E,
      'o': 0xC8864B,
      'W': 0x965A2C,
      'w': 0x643714,
      'd': 0x3E2009,
      'b': 0xFFF3C7,
      'B': 0xFFFAF0,
      'u': 0xE2E8F0,
      'N': 0x334155,
      'n': 0x64748B,
      'R': 0xEF4444,
      'r': 0x991B1B,
      'M': 0x475569,
      'm': 0x1E293B,
      'Y': 0xFEF08A,
      'y': 0xF59E0B,
      'g': 0xFB7185
    });

    const gb = mk();
    PixelArtRenderer.drawMatrix(gb, [
      '.....KKKKKKKK.....',
      '....KKmMYYMYyKKK..',
      '..KKKKKMYgMYgKKKKK',
      '.KOOOOOOOOOOOOOOOo',
      '.KOWKKKKKKKKKKKKWw',
      '.KOWKRbBrKRbBrKKWw',
      '.KOWKbNnbKbNNbKKWw',
      '.KOWKbuubKbuubKKWw',
      '.KOWKdWWdKRbBbKKWw',
      '.KOWKbNNbKbNnbKKWw',
      '.KOWKbuubKbuubKKWw',
      '.KOWKKKKKKKKKKKKWw',
      '.KOwwwwwwwwwwwwwww',
      '.KKKKKKKKKKKKKKKKK',
      '..KdWWK......KdWWK',
      '..KKKK......KKKK..'
    ], NOTICE_BOARD_PALETTE, 0, 0, PS);
    gb.generateTexture('notice_board', 18*PS, 16*PS); gb.destroy();

    // Dungeon Portal texture 20x28
    const PORTAL_PALETTE = Object.assign({}, DECOR_PALETTE, {
      'K': 0x0F172A,
      't': 0xE2E8F0,
      'T': 0x94A3B8,
      'S': 0x475569,
      's': 0x1E293B,
      'C': 0x38BDF8,
      'Q': 0xF43F5E,
      'Y': 0xFACC15,
      'P': 0xD8B4FE,
      'p': 0x9333EA,
      'm': 0x581C87,
      'V': 0x2563EB,
      'v': 0x0284C7,
      'E': 0xA5F3FC,
      'W': 0xFFFFFF,
      'z': 0xF472B6,
      'X': 0xE0E7FF
    });

    const gport = mk();
    PixelArtRenderer.drawMatrix(gport, [
      '.......KKKKKK.......',
      '.....KKtTTTTtKK.....',
      '....KtTTSCSSTtK....',
      '...KtTTTTTTTTTTtK...',
      '..KtTTSQSSTSQSStK..',
      '.KtTTSKKKKKKKKSttSK.',
      '.KtSKPPPPPPzPPPPKSK.',
      'KTTKPPPPPzPPPPPPKTTK',
      'KTTKPpPvvVVvvPPpPKTTK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KCTKPpvVWEWEVvppPKCK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KQTKPpPvvVVvvPPpPKQK',
      'KTTKPmPvvVVvvPmPPKTTK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KYTKPpvVWEWEVvpPPKYK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KTTKPpPvvVVvvPPpPKTTK',
      'KCTKPppppXppppppPKCK',
      'KTTKPpppppppppppPKTTK',
      'KQTKPPPPPPPPPPPPKQK',
      'KTTKPPPPPzPPPPPPKTTK',
      'KTTKPPPPPPPPPPPPKTTK',
      '.KTTKPPPPPPPPPPKTTK.',
      '.KTTTTKKKKKKKKTTTTK.',
      'KTTTTTTSSSSSSSSTTTTK',
      'KssssssssssssssssssK',
      'KKKKKKKKKKKKKKKKKKKK'
    ], PORTAL_PALETTE, 0, 0, PS);
    gport.generateTexture('dungeon_portal', 20*PS, 28*PS); gport.destroy();

    // Wooden Fishing Rowboat texture 28x18 (top-down, detailed)
    const BOAT_PALETTE = {
      '.': null,
      'K': 0x0F172A, // Dark outline
      'H': 0xE8C992, // Hull highlight (sunlit plank)
      'h': 0xD99B66, // Hull warm mid
      'W': 0xB3713D, // Hull base wood
      'w': 0x8F5428, // Hull dark grain
      'D': 0x573012, // Deep shadow / keel
      'R': 0xC7C1BD, // Rope / oarlock metal light
      'r': 0x9E9793, // Rope shadow / metal dark
      'B': 0x7D7571, // Bucket body
      'b': 0x4A4440, // Bucket shadow
      'S': 0xFDE047, // Seat cushion highlight
      's': 0xD97706, // Seat cushion shade
      'N': 0x475569, // Oarlock / nail metal
    };
    const gdock = mk();
    PixelArtRenderer.drawMatrix(gdock, [
      '............KKKK............',  // row 0  — bow tip
      '..........KKhhhWKK..........',  // row 1  — bow curve
      '.........KHhRRhWwK..........',  // row 2  — bow + rope coil
      'K.......KHhhRRhhWwK.........',  // row 3  — bow interior + rope
      'KNK....KHhhhhhhhWwwK......K.',  // row 4  — left oar + hull
      'KHHK..KHhhhhhhhhhWwwK..KHHK.',  // row 5  — oar blade L + hull expand + oar blade R
      '.KK..KHhhwhhhhhhwhhWwK..KK..',  // row 6  — oar shafts + hull with grain
      '.....KHhhwhSSSShwhhWwK.....',  // row 7  — hull + front bench seat
      '....KHhhhwsSSSSswhhWwK.....',  // row 8  — hull + seat shadow
      '....KHhhhhhhhhhhhhhWwK.....',  // row 9  — hull mid open
      '....KHhhwhhhhhhhwhhWwK.....',  // row 10 — hull with grain
      '.....KHhhwSSSShwhhWwK......',  // row 11 — hull + rear bench seat
      '.....KHhhwsSSsswhhWwK......',  // row 12 — hull + seat shadow
      '......KHhhhBbhhhhWwK.......',  // row 13 — stern + bait bucket
      '.......KHhBKKbhhWwK........',  // row 14 — bucket detail
      '........KWhhhhWwK..........',  // row 15 — stern narrowing
      '.........KKWwWKK...........',  // row 16 — stern curve
      '..........KKKK..............',  // row 17 — stern tip
    ], BOAT_PALETTE, 0, 0, PS);
    gdock.generateTexture('fishing_dock', 28*PS, 18*PS); gdock.destroy();

    // Arcade Machine texture 16x22
    const ga = mk();
    PixelArtRenderer.drawMatrix(ga, [
      '....KKKKKKKK....',
      '....KPPPPPPK....',
      '....KPPPPPPK....',
      '..KKKKKKKKKKKK..',
      '..KSSSSSSSSSSK..',
      '..KSKvvvvvvKSK..',
      '..KSKvvvvvvKSK..',
      '..KSKvvvvvvKSK..',
      '..KSKvvvvvvKSK..',
      '..KSKvvvvvvKSK..',
      '..KSSSSSSSSSSK..',
      '..KKKKKKKKKKKK..',
      '..KRRRRRRRRRRK..',
      '..KRRRRRRRRRRK..',
      '..KKKKKKKKKKKK..',
      '..KSSSSSSSSSSK..',
      '..KSKYYKKYYKSK..',
      '..KSKYYKKYYKSK..',
      '..KSSSSSSSSSSK..',
      '..KSSSSSSSSSSK..',
      '..KSSSSSSSSSSK..',
      '..KKKKKKKKKKKK..'
    ], DECOR_PALETTE, 0, 0, PS);
    ga.generateTexture('arcade_machine', 16*PS, 22*PS); ga.destroy();

    // Wizard NPC texture 16x20
    const gwiz = mk();
    PixelArtRenderer.drawMatrix(gwiz, PixelArtRenderer.WIZ_0, PixelArtRenderer.W_PAL, 0, 0, PS);
    gwiz.generateTexture('wizard_npc', 16*PS, 20*PS); gwiz.destroy();


    // Crops (5 types × 3 stages) - Stardew Valley warm earthy tones
    const CC=[
      [0xD8587E, 0x8A1836, 0xE8A0B8], // Strawberry
      [0x6BB832, 0x3B6818, 0x98E060], // Cabbage
      [0xD83838, 0x8A1010, 0xE87070], // Tomato
      [0xE8A820, 0x9A6800, 0xF4CF60], // Corn
      [0xE0B830, 0x9A7800, 0xF0D470], // Wheat
    ];
    CC.forEach(([M,D,Li],t)=>{
      const g1=mk();
      pR(g1,5,14,2,6,K.P); pR(g1,5,14,1,6,K.v);
      pR(g1,3,12,4,3,K.P); pR(g1,6,12,3,3,K.p); pR(g1,5,11,2,2,K.v);
      g1.generateTexture(`cr_${t}_1`,12*PS,20*PS); g1.destroy();

      const g2=mk();
      pR(g2,5,8,2,12,K.P); pR(g2,5,8,1,12,K.v);
      pR(g2,1,8,5,5,K.p); pR(g2,1,8,1,1,K.P); pR(g2,6,8,5,5,K.P); pR(g2,10,8,1,1,K.p);
      pR(g2,2,12,4,3,K.p); pR(g2,6,12,4,3,K.P);
      g2.generateTexture(`cr_${t}_2`,12*PS,20*PS); g2.destroy();

      const g3=mk();
      pR(g3,5,6,2,14,K.P); pR(g3,5,6,1,14,K.v);
      pR(g3,1,9,5,6,K.p); pR(g3,6,9,5,6,K.P);
      pR(g3,2,14,4,4,K.p); pR(g3,6,14,4,4,K.P);
      g3.fillStyle(D,1); g3.fillRect(3*PS,0,6*PS,6*PS);
      g3.fillStyle(M,1); g3.fillRect(4*PS,0,4*PS,5*PS); g3.fillRect(3*PS,1*PS,6*PS,3*PS);
      g3.fillStyle(Li,0.8); g3.fillRect(4*PS,0,2*PS,2*PS);
      g3.generateTexture(`cr_${t}_3`,12*PS,20*PS); g3.destroy();
    });

    // ── GINGER TABBY CAT NPC (12×16 pixels) ─────────────────────────────────
    const GC=()=>this.make.graphics({add:false});
    const gc2=GC();
    const GO=0xEE7B28, GD=0x9E3B0E, GL=0xFBAE68;
    const WH2=0xFFFFFF, EY=0x55C655, PU=0x0F172A;
    const PK2=0xFFB3C1;
    const pr2=(x,y,w,h,c)=>pR(gc2,x,y,w,h,c);
    // Ginger body
    pr2(1,8,10,8,GO);
    // White belly/chest
    pr2(3,9,6,7,WH2); pr2(3,8,6,1,WH2);
    // Dark tabby flank stripes
    pr2(1,9,1,6,GD); pr2(10,9,1,6,GD);
    pr2(2,11,1,1,GD); pr2(9,11,1,1,GD);
    pr2(2,13,1,1,GD); pr2(9,13,1,1,GD);
    // White front-paw socks
    pr2(2,14,2,2,WH2); pr2(8,14,2,2,WH2);
    pr2(2,15,1,1,PK2); pr2(3,15,1,1,PK2); pr2(8,15,1,1,PK2); pr2(9,15,1,1,PK2);
    // Ginger head
    pr2(1,2,10,6,GO);
    // White muzzle / chin blaze
    pr2(3,5,6,3,WH2);
    // M-mark forehead stripes
    pr2(3,2,2,2,GD); pr2(7,2,2,2,GD); pr2(5,2,2,1,GO); pr2(5,3,2,2,GD);
    // Amber eyes (big round)
    pr2(2,4,3,2,EY); pr2(7,4,3,2,EY);
    pr2(3,4,1,2,PU); pr2(8,4,1,2,PU); // pupils
    pr2(2,3,3,1,PU); pr2(7,3,3,1,PU); // eyelash outline
    // Pink nose
    pr2(5,6,2,1,PK2);
    // Whisker accent
    pr2(1,6,1,1,GL); pr2(10,6,1,1,GL);
    // Airplane ears (spread sideways flat)
    pr2(0,0,2,2,GO); pr2(10,0,2,2,GO);
    pr2(0,2,2,1,GD); pr2(10,2,2,1,GD); // ear tip stripe
    pr2(0,1,1,1,PK2); pr2(11,1,1,1,PK2); // inner ear pink
    // Tail (curling to right)
    pr2(11,10,2,1,GO); pr2(12,9,1,2,GO); pr2(12,8,1,1,GL); pr2(11,8,1,1,GD);
    gc2.generateTexture('cat_npc',13*PS,16*PS); gc2.destroy();

    // Force nearest-neighbor filtering on all procedural textures
    ['apple_tree', 'apple_tree_ripe', 'drt_dry', 'drt_wet', 'path_stone', 'flw_red', 'flw_yellow', 'flw_purple',
     'bf_open', 'bf_flap', 'stone_well', 'pixel_barrel', 'pixel_crate', 'signpost', 'tree', 'fnc_post', 'fnc_rail',
     'sparkle', 'coin', 'shop_sign', 'notice_board', 'dungeon_portal', 'fishing_dock', 'arcade_machine', 'wizard_npc',
     'cat_npc'].forEach(k => {
       const t = this.textures.get(k);
       if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
         t.setFilter(Phaser.Textures.FilterMode.NEAREST);
       }
    });
    GRASS.forEach((_, i) => {
      const t = this.textures.get('grs' + i);
      if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
    for (let fr = 0; fr < 4; fr++) {
      const t = this.textures.get('farmer' + fr);
      if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    CC.forEach((_, tIdx) => {
      for (let s = 1; s <= 3; s++) {
        const t = this.textures.get(`cr_${tIdx}_${s}`);
        if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
          t.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    });
  }


  // ── WORLD ──────────────────────────────────────────────────────────────────
  _drawWorld(W, H){
    if (this.textures && this.textures.exists('bg_distant_mountains')) {
      this.bgMountains = this.add.tileSprite(W/2, 80, W * 2, 128, 'bg_distant_mountains')
        .setDepth(-10).setScrollFactor(0.1, 0.05);
    }
    if (this.textures && this.textures.exists('bg_rolling_hills')) {
      this.bgHills = this.add.tileSprite(W/2, 140, W * 2, 128, 'bg_rolling_hills')
        .setDepth(-9).setScrollFactor(0.3, 0.15);
    }

    const rng = new Phaser.Math.RandomDataGenerator(['sv16']);
    for(let r=0; r*TILE<=H+TILE; r++) for(let cc=0; cc*TILE<=W+TILE; cc++){
      this.add.image(cc*TILE+TILE/2, r*TILE+TILE/2, 'grs'+rng.between(0,3))
        .setDisplaySize(TILE,TILE).setDepth(0);
    }
    const fW=PLOT_COLS*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP, fH=5*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP;
    this.farm = {x:W/2-fW/2, y:H/2-fH/2-30, w:fW, h:fH};

    // Cobblestone connecting paths (Widened & Spaced)
    const bx = this.farm.x + this.farm.w / 2;
    const by = this.farm.y - 95;
    const sx = this.farm.x + this.farm.w + 175;
    const sy = this.farm.y + this.farm.h / 2 + 25;
    const ax = this.farm.x - 200;
    const ay = this.farm.y + 20;
    const wx = this.farm.x + this.farm.w + 160;
    const wy = this.farm.y - 85;
    const apx = this.farm.x - 130;
    const apy = this.farm.y - 85;
    const fx = this.farm.x - 190;
    const fy = this.farm.y + this.farm.h / 2 + 20;

    const pathPoints = [
      {x: bx, y: by+25}, {x: sx, y: sy}, {x: ax, y: ay}, {x: wx, y: wy}, {x: apx, y: apy+25}, {x: fx + 60, y: fy}
    ];
    pathPoints.forEach(pt => {
      for(let dx = -20; dx <= 20; dx += 20){
        for(let dy = -20; dy <= 20; dy += 20){
          if(Math.random() < 0.65){
            this.add.image(pt.x + dx, pt.y + dy, 'path_stone')
              .setDisplaySize(TILE, TILE).setDepth(1).setAlpha(0.85);
          }
        }
      }
    });

    // Scatter wildflowers naturally
    const flowers = ['flw_red', 'flw_yellow', 'flw_purple'];
    const flowerList = [];
    for(let i=0; i<35; i++){
      const fx = Phaser.Math.Between(40, W-40);
      const fy = Phaser.Math.Between(40, H-40);
      if(fx < this.farm.x - 20 || fx > this.farm.x + this.farm.w + 20 || fy < this.farm.y - 20 || fy > this.farm.y + this.farm.h + 20){
        const fl = this.add.image(fx, fy, Phaser.Utils.Array.GetRandom(flowers))
          .setScale(1.2).setDepth(fy);
        flowerList.push(fl);
        this.tweens.add({ targets: fl, angle: { from: -6, to: 6 }, duration: 1500 + Math.random()*1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }

    // Micro World Details: Stone Well & Water Sparkles (Widened Placement)
    const wellX = this.farm.x - 190;
    const wellY = this.farm.y + this.farm.h + 85;
    const wellSprite = this.add.image(wellX, wellY, 'stone_well').setOrigin(0.5, 1).setScale(1.1).setDepth(wellY);
    if (this.shadows) this.shadows.createShadow(wellSprite, 44, 14, 6);
    // Water sparkles inside well
    for(let i=0; i<4; i++){
      const sp = this.add.circle(wellX + (Math.random()-0.5)*18, wellY - 12 + (Math.random()-0.5)*12, 1.5, 0x67E8F9, 0.9).setDepth(wellY+1);
      this.tweens.add({ targets: sp, alpha: 0.2, scale: 1.8, duration: 800 + i*300, yoyo: true, repeat: -1 });
    }

    // Micro World Details: Barrels & Crates next to Shop
    const bxl = sx + 28, byl = sy - 10;
    const barrelSprite = this.add.image(bxl, byl, 'pixel_barrel').setOrigin(0.5, 1).setScale(0.9).setDepth(byl);
    const crateSprite = this.add.image(bxl + 18, byl + 6, 'pixel_crate').setOrigin(0.5, 1).setScale(0.9).setDepth(byl+6);
    if (this.shadows) {
      this.shadows.createShadow(barrelSprite, 18, 6, 0);
      this.shadows.createShadow(crateSprite, 20, 6, 0);
    }

    // Micro World Details: Directional Signpost
    const spX = bx - 60, spY = by + 20;
    const signpostSprite = this.add.image(spX, spY, 'signpost').setOrigin(0.5, 1).setScale(1.1).setDepth(spY);
    if (this.shadows) this.shadows.createShadow(signpostSprite, 18, 6, 0);

    // R3: Perimeter Fences & Decorative Animated Fence Flowers
    const fenceY = this.farm.y - 12;
    const fenceFlowerColors = [0xEF4444, 0xFBBF24, 0xA855F7, 0xEC4899];
    const fenceFlowerTexs = ['flw_red', 'flw_yellow', 'flw_purple'];
    let postIdx = 0;
    for (let fx = this.farm.x; fx <= this.farm.x + this.farm.w; fx += 28) {
      this.add.image(fx + 14, fenceY - 4, 'fnc_rail').setDisplaySize(28, 8).setDepth(fenceY - 1);
      const post = this.add.image(fx, fenceY, 'fnc_post').setOrigin(0.5, 1).setScale(1.1).setDepth(fenceY);
      if (this.shadows) this.shadows.createShadow(post, 14, 5, 0);

      // Decorative pixel-art flower on fence post
      const color = fenceFlowerColors[postIdx % fenceFlowerColors.length];
      const tex = fenceFlowerTexs[postIdx % fenceFlowerTexs.length];
      const flower = this.add.image(fx + (postIdx % 2 === 0 ? -2 : 2), fenceY - 14, tex)
        .setScale(0.9)
        .setTint(color)
        .setDepth(fenceY + 2);

      // Subtle idle sway animation loop
      this.tweens.add({
        targets: flower,
        angle: { from: -6, to: 6 },
        duration: 1400 + (postIdx * 170) % 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      postIdx++;
    }

    // Side perimeter fence posts with decorative animated flowers
    for (let fy = fenceY + 28; fy <= this.farm.y + this.farm.h + 10; fy += 28) {
      const postL = this.add.image(this.farm.x, fy, 'fnc_post').setOrigin(0.5, 1).setScale(1.1).setDepth(fy);
      if (this.shadows) this.shadows.createShadow(postL, 14, 5, 0);
      const colorL = fenceFlowerColors[postIdx % fenceFlowerColors.length];
      const texL = fenceFlowerTexs[postIdx % fenceFlowerTexs.length];
      const flowerL = this.add.image(this.farm.x - 2, fy - 14, texL)
        .setScale(0.9)
        .setTint(colorL)
        .setDepth(fy + 2);
      this.tweens.add({
        targets: flowerL,
        angle: { from: -6, to: 6 },
        duration: 1400 + (postIdx * 170) % 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      postIdx++;

      const postR = this.add.image(this.farm.x + this.farm.w, fy, 'fnc_post').setOrigin(0.5, 1).setScale(1.1).setDepth(fy);
      if (this.shadows) this.shadows.createShadow(postR, 14, 5, 0);
      const colorR = fenceFlowerColors[postIdx % fenceFlowerColors.length];
      const texR = fenceFlowerTexs[postIdx % fenceFlowerTexs.length];
      const flowerR = this.add.image(this.farm.x + this.farm.w + 2, fy - 14, texR)
        .setScale(0.9)
        .setTint(colorR)
        .setDepth(fy + 2);
      this.tweens.add({
        targets: flowerR,
        angle: { from: -6, to: 6 },
        duration: 1400 + (postIdx * 170) % 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      postIdx++;
    }

    // Micro Animated Fauna: Fluttering Butterflies
    this._createButterflies(flowerList);

    // Warm Sunbeam Lighting Overlay
    const vignette = this.add.graphics().setDepth(9980).setScrollFactor(0);
    vignette.fillStyle(0xFF9900, 0.04);
    vignette.fillRect(0, 0, W, H);

    // Micro Ambient Particle: Falling Leaves from Apple Tree
    this._createFallingLeaves(apx, apy);
  }

  _createFallingLeaves(ax, ay){
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const lf = this.add.rectangle(ax + Phaser.Math.Between(-20, 20), ay - 35, 4, 3, 0x86EFAC).setDepth(ay + 10);
        this.tweens.add({
          targets: lf,
          x: { value: `+=${Phaser.Math.Between(-30, 30)}`, ease: 'Sine.InOut' },
          y: ay + Phaser.Math.Between(10, 30),
          angle: 360,
          alpha: 0,
          duration: 3500,
          ease: 'Power1',
          onComplete: () => lf.destroy()
        });
      }
    });
  }

  _createButterflies(flowerList){
    if(!flowerList || !flowerList.length) return;
    for(let i=0; i<5; i++){
      const targetFlw = Phaser.Utils.Array.GetRandom(flowerList);
      const bf = this.add.image(targetFlw.x, targetFlw.y - 12, 'bf_open').setDepth(targetFlw.y + 50);
      
      // Flapping wings animation using texture toggle
      this.time.addEvent({
        delay: 180 + Math.random()*60,
        loop: true,
        callback: () => {
          if(bf && bf.active){
            bf.setTexture(bf.texture.key === 'bf_open' ? 'bf_flap' : 'bf_open');
          }
        }
      });

      // Gentle fluttering path
      this.tweens.add({
        targets: bf,
        x: { value: `+=${Phaser.Math.Between(-60, 60)}`, ease: 'Sine.InOut' },
        y: { value: `+=${Phaser.Math.Between(-40, 40)}`, ease: 'Sine.InOut' },
        duration: 3000 + Math.random()*2000,
        yoyo: true,
        repeat: -1
      });
    }
  }

  _createAmbientParticles(W, H){
    for(let i=0; i<30; i++){
      const px = Phaser.Math.Between(0, W);
      const py = Phaser.Math.Between(0, H);
      const col = Math.random() < 0.4 ? 0xFDE047 : (Math.random() < 0.7 ? 0xA855F7 : 0x67E8F9);
      const p = this.add.circle(px, py, Phaser.Math.Between(2, 4), col, Math.random()*0.6 + 0.2).setDepth(9985);
      
      this.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-40, 40),
        y: py + Phaser.Math.Between(-60, 20),
        alpha: { from: p.alpha, to: 0.1 },
        duration: 3000 + Math.random()*3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }
  }

  // ── SHOP NPC ───────────────────────────────────────────────────────────────
  _createShopNPC(W, H){
    const sx = this.farm.x + this.farm.w + 175;
    const sy = this.farm.y + this.farm.h / 2 + 25;
    this.shopNPC = this.add.image(sx, sy, 'shop_sign')
      .setOrigin(0.5, 1).setScale(1.3).setDepth(sy);
    if (this.shadows) this.shadows.createShadow(this.shopNPC, 48, 15, 4);

    this.tweens.add({ targets: this.shopNPC, y: sy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.shopHint = this.add.text(sx, sy + 10, '🏪 SHOP\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'14px',
      color:'#FFD700', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5, 0).setDepth(sy+1).setAlpha(0);

    this.shopX = sx; this.shopY = sy;
  }

  // ── NOTICE BOARD ───────────────────────────────────────────────────────────
  _createBoardNPC(W, H){
    const bx = this.farm.x + this.farm.w / 2;
    const by = this.farm.y - 95;
    this.boardSprite = this.add.image(bx, by, 'notice_board').setOrigin(0.5,1).setScale(1.3).setDepth(by);
    if (this.shadows) this.shadows.createShadow(this.boardSprite, 46, 13, 5);
    this.boardHint = this.add.text(bx, by-40, '📋 Minigame\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FF88FF', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(by+1).setAlpha(0);
    this.tweens.add({targets:this.boardHint, y:this.boardHint.y-3, duration:700, yoyo:true, repeat:-1});
    this.boardX = bx; this.boardY = by;
  }

  // ── ARCADE MACHINE ─────────────────────────────────────────────────────────
  _createArcadeNPC(W, H){
    const ax = this.farm.x - 200;
    const ay = this.farm.y + 20;
    this.arcadeSprite = this.add.image(ax, ay, 'arcade_machine').setOrigin(0.5,1).setScale(1.5).setDepth(ay);
    if (this.shadows) this.shadows.createShadow(this.arcadeSprite, 48, 14, 6);
    this.tweens.add({ targets: this.arcadeSprite, scaleY: { from: 1.5, to: 1.54 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.arcadeHint = this.add.text(ax, ay-60, '👾 ARCADE\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#00FFFF', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(ay+1).setAlpha(0);
    this.tweens.add({targets:this.arcadeHint, y:this.arcadeHint.y-3, duration:600, yoyo:true, repeat:-1});
    this.arcadeX = ax; this.arcadeY = ay;
  }

  // ── WIZARD NPC ─────────────────────────────────────────────────────────────
  _createWizardNPC(W, H){
    const wx = this.farm.x + this.farm.w + 160;
    const wy = this.farm.y - 85;
    this.wizardSprite = this.add.sprite(wx, wy, 'wizard_idle_0');
    if (this.wizardSprite.play) this.wizardSprite.play('wizard-idle').setOrigin(0.5,1).setScale(1.8).setDepth(wy);
    if (this.shadows) this.shadows.createShadow(this.wizardSprite, 38, 12, 6);
    this.tweens.add({ targets: this.wizardSprite, y: wy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.wizardHint = this.add.text(wx, wy-68, '⚡ SPELL DUEL\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#A855F7', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(wy+1).setAlpha(0);
    this.tweens.add({ targets: this.wizardHint, y: this.wizardHint.y - 3, duration: 600, yoyo: true, repeat: -1 });
    
    this.add.text(wx, wy+6, 'Merlin', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#C084FC', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(wy+1);

    this.wizardX = wx; this.wizardY = wy;
  }

  // ── CAT NPC ────────────────────────────────────────────────────────────────
  _createCatNPC(W, H){
    const cx = this.farm.x - 120;
    const cy = this.farm.y + this.farm.h + 75;
    this.catSprite = this.add.sprite(cx, cy, 'cat_idle_0');
    if (this.catSprite.play) this.catSprite.play('cat-idle')
      .setOrigin(0.5,1).setScale(0.75).setDepth(cy);
    if (this.shadows) this.shadows.createShadow(this.catSprite, 20, 6, 2);
    this.tweens.add({ targets:this.catSprite, y:cy-3, duration:1200, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    this.catHint = this.add.text(cx, cy-38, '🐱 야옹\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FFCC44', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(cy+1).setAlpha(0);
    this.tweens.add({ targets:this.catHint, y:this.catHint.y-3, duration:700, yoyo:true, repeat:-1 });
    this.add.text(cx, cy+6, 'Ginger Cat', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#FFD700', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(cy+1);
    this.catX=cx; this.catY=cy;
  }

  // ── DUNGEON PORTAL NPC ─────────────────────────────────────────────────────
  _createPortalNPC(W, H){
    const px = this.farm.x + this.farm.w + 140;
    const py = this.farm.y + this.farm.h + 80;
    this.portalSprite = this.add.image(px, py, 'dungeon_portal').setOrigin(0.5,1).setScale(1.6).setDepth(py);
    if (this.shadows) this.shadows.createShadow(this.portalSprite, 72, 20, 6);
    this.tweens.add({ targets: this.portalSprite, scaleX: 1.65, scaleY: 1.55, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.portalHint = this.add.text(px, py-75, '🌀 DUNGEON\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#EC4899', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(py+1).setAlpha(0);
    this.tweens.add({ targets: this.portalHint, y: this.portalHint.y - 3, duration: 600, yoyo: true, repeat: -1 });
    
    this.add.text(px, py+6, 'Dungeon Portal', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#F472B6', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(py+1);

    this.portalX = px; this.portalY = py;
  }

  // ── FISHING SPOT NPC / DOCK ────────────────────────────────────────────────
  _createFishingSpot(W, H){
    const fx = this.farm.x - 190;
    const fy = this.farm.y + this.farm.h / 2 + 20;
    this.dockSprite = null; // No boat — pure pond

    // ── Large stones (outer ring) ─────────────────────────────────────────
    const stoneColors = [0x7D7571, 0x6B6360, 0x8A8480, 0x5C5652];
    const pondRadiusX = 140, pondRadiusY = 50;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.22) {
      const jitter = 0.88 + Math.random() * 0.24;
      const px = fx + Math.cos(angle) * (pondRadiusX + 14) * jitter;
      const py = fy + 20 + Math.sin(angle) * (pondRadiusY + 14) * jitter;
      const size = 5 + Math.random() * 5;
      const col = stoneColors[Math.floor(Math.random() * stoneColors.length)];
      const stone = this.add.ellipse(px, py, size * 1.4, size, col, 0.95).setDepth(fy - 8);
      stone.setAngle(Math.random() * 360);
    }

    // ── Mid cobblestone ring ──────────────────────────────────────────────
    const pebbleColors = [0x9E9793, 0xC7C1BD, 0xB0A8A3, 0x8A827E];
    for (let angle = 0; angle < Math.PI * 2; angle += 0.16) {
      const jitter = 0.85 + Math.random() * 0.3;
      const px = fx + Math.cos(angle) * (pondRadiusX + 6) * jitter;
      const py = fy + 20 + Math.sin(angle) * (pondRadiusY + 6) * jitter;
      const size = 3 + Math.random() * 4;
      const col = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
      this.add.circle(px, py, size, col, 0.9).setDepth(fy - 7);
    }

    // ── Inner small pebbles ───────────────────────────────────────────────
    const smallColors = [0xC7C1BD, 0xB0A8A3, 0xD5CFCB, 0x9E9793];
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const jitter = 0.9 + Math.random() * 0.2;
      const px = fx + Math.cos(angle) * (pondRadiusX - 4) * jitter;
      const py = fy + 20 + Math.sin(angle) * (pondRadiusY - 4) * jitter;
      const size = 1.5 + Math.random() * 2.5;
      const col = smallColors[Math.floor(Math.random() * smallColors.length)];
      this.add.circle(px, py, size, col, 0.75).setDepth(fy - 6);
    }

    // ── Scattered accent rocks (random clusters) ──────────────────────────
    for (let i = 0; i < 14; i++) {
      const rAngle = Math.random() * Math.PI * 2;
      const rDist = 0.95 + Math.random() * 0.35;
      const rx = fx + Math.cos(rAngle) * (pondRadiusX + 22) * rDist;
      const ry = fy + 20 + Math.sin(rAngle) * (pondRadiusY + 22) * rDist;
      const rSize = 3 + Math.random() * 6;
      const rCol = stoneColors[Math.floor(Math.random() * stoneColors.length)];
      const rock = this.add.ellipse(rx, ry, rSize * 1.6, rSize, rCol, 0.85).setDepth(fy - 8);
      rock.setAngle(Math.random() * 360);
    }

    // ── Crystal Pond (multi-layer water) ──────────────────────────────────
    this.add.ellipse(fx, fy + 22, 260, 84, 0x0369A1, 0.95).setDepth(fy - 5);
    const pond = this.add.ellipse(fx, fy + 20, 250, 76, 0x0284C7, 0.88).setDepth(fy - 4);
    this.tweens.add({ targets: pond, scaleX: 1.03, scaleY: 0.97, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.ellipse(fx - 30, fy + 12, 80, 28, 0x38BDF8, 0.3).setDepth(fy - 3);
    this.add.ellipse(fx + 40, fy + 24, 50, 18, 0x38BDF8, 0.2).setDepth(fy - 3);

    // ── Water sparkle particles ───────────────────────────────────────────
    for (let i = 0; i < 8; i++) {
      const sx = fx + (Math.random() - 0.5) * 200;
      const sy = fy + 10 + (Math.random() - 0.5) * 50;
      const sparkle = this.add.circle(sx, sy, 1.5, 0xE0F2FE, 0.8).setDepth(fy - 2);
      this.tweens.add({
        targets: sparkle, alpha: { from: 0.2, to: 0.9 }, scale: { from: 0.8, to: 1.6 },
        duration: 1000 + i * 350, yoyo: true, repeat: -1, ease: 'Sine.InOut'
      });
    }

    // ── Floating Lily Pads ────────────────────────────────────────────────
    const lilyPositions = [[-65, 22], [75, 28], [-20, 30], [40, 15], [-85, 10]];
    lilyPositions.forEach(([lx, ly], i) => {
      const lSize = 12 + Math.random() * 8;
      const lily = this.add.ellipse(fx + lx, fy + ly, lSize, lSize * 0.6, 0x4A7C59, 0.55 + Math.random() * 0.2).setDepth(fy - 1);
      this.tweens.add({ targets: lily, y: `+=${1 + Math.random()}`, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });

    // ── Water ripple waves ────────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const ripple = this.add.ellipse(fx + (i - 1.5) * 40, fy + 20, 24, 7, 0x38BDF8, 0.3).setDepth(fy - 1);
      this.tweens.add({
        targets: ripple, scaleX: { from: 1, to: 2.8 }, scaleY: { from: 1, to: 1.4 }, alpha: { from: 0.3, to: 0 },
        duration: 3000, delay: i * 700, repeat: -1, ease: 'Quad.Out'
      });
    }

    // ── Hint & Label ──────────────────────────────────────────────────────
    this.fishHint = this.add.text(fx, fy - 40, '🎣 FISHING POND\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#38BDF8', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(fy+1).setAlpha(0);
    this.tweens.add({ targets: this.fishHint, y: this.fishHint.y - 3, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(fx, fy + 52, '🎣 Fishing Pond', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#7DD3FC', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(fy+1);

    this.fishX = fx; this.fishY = fy;

    // Ambient Fish Jumping Effect
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this._triggerFishJump(fx, fy) });
  }

  _triggerFishJump(fx, fy) {
    if (!this.sys || !this.sys.isActive()) return;
    const isLeft = Math.random() < 0.5;
    const jumpDist = Phaser.Math.Between(40, 70) * (isLeft ? -1 : 1);
    const startX = fx + Phaser.Math.Between(-40, 40);
    const startY = fy + 20 + Phaser.Math.Between(-8, 8);
    const endX = startX + jumpDist;
    const jumpHeight = Phaser.Math.Between(35, 45);
    const duration = 750;

    // Takeoff splash
    this._createSplashRipples(startX, startY);
    this._createSplashDroplets(startX, startY);

    const fish = this.add.image(startX, startY, 'fish_carp').setScale(1.0).setDepth(fy + 5);
    if (isLeft) fish.setFlipX(true);

    const startAngle = isLeft ? 40 : -40;
    const endAngle = isLeft ? -50 : 50;
    fish.setAngle(startAngle);

    const angleTween = this.tweens.add({
      targets: fish,
      angle: endAngle,
      duration: duration,
      ease: 'Linear'
    });

    const yTween = this.tweens.add({
      targets: fish,
      y: startY - jumpHeight,
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.Out'
    });

    const xTween = this.tweens.add({
      targets: fish,
      x: endX,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this._createSplashRipples(endX, startY);
        this._createSplashDroplets(endX, startY);
        angleTween.destroy();
        yTween.destroy();
        xTween.destroy();
        fish.destroy();
      }
    });
  }

  _createSplashRipples(rx, ry) {
    for (let i = 0; i < 2; i++) {
      const ring = this.add.ellipse(rx, ry, 8, 4).setStrokeStyle(1.5, 0x38BDF8, 0.9).setDepth(ry - 2);
      this.tweens.add({
        targets: ring,
        scaleX: 3.5 + i * 1.2,
        scaleY: 3.5 + i * 1.2,
        alpha: 0,
        delay: i * 80,
        duration: 450 + i * 100,
        ease: 'Quad.Out',
        onComplete: () => {
          ring.destroy();
        }
      });
    }
  }

  _createSplashDroplets(sx, sy) {
    const count = Phaser.Math.Between(4, 7);
    for (let i = 0; i < count; i++) {
      const drop = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2.2), 0x7DD3FC, 0.95).setDepth(sy + 4);
      const vx = Phaser.Math.FloatBetween(-30, 30);
      const vy = Phaser.Math.FloatBetween(-35, -15);
      const dropDuration = Phaser.Math.Between(350, 500);

      const xTween = this.tweens.add({
        targets: drop,
        x: sx + vx,
        duration: dropDuration,
        ease: 'Linear'
      });

      const yTween = this.tweens.add({
        targets: drop,
        y: sy + vy,
        duration: dropDuration / 2,
        yoyo: true,
        ease: 'Quad.Out'
      });

      const alphaTween = this.tweens.add({
        targets: drop,
        alpha: 0,
        duration: dropDuration,
        ease: 'Power1',
        onComplete: () => {
          xTween.destroy();
          yTween.destroy();
          alphaTween.destroy();
          drop.destroy();
        }
      });
    }
  }

  // ── APPLE TREE ─────────────────────────────────────────────────────────────
  _createAppleTree(W, H){
    const ax = this.farm.x - 130;
    const ay = this.farm.y - 85;
    // Tree sprite (starts with unripe texture — now 22×32 grid)
    this.appleTreeSprite = this.add.image(ax, ay, 'apple_tree')
      .setOrigin(0.5, 1).setScale(3.6).setDepth(ay+1);
    if (this.shadows) this.shadows.createShadow(this.appleTreeSprite, 170, 44, 0);

    this._createFallingLeaves(ax, ay);

    // Trunk collision zone (slightly wider for new tree)
    const trunkZone = this.add.zone(ax, ay - 10, 110, 52);
    this.physics.add.existing(trunkZone, true);
    this.physics.add.collider(this.player, trunkZone);
    // Gentle sway
    this.tweens.add({
      targets: this.appleTreeSprite,
      angle: { from: -1.2, to: 1.2 },
      duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
    // Floating harvest label (hidden until ripe)
    this.appleTreeLabel = this.add.text(ax, ay - 260, '🍎 HARVEST!\n[SPACE]', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '14px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5, 1).setDepth(ay + 100).setAlpha(0);
    this.tweens.add({ targets: this.appleTreeLabel, y: this.appleTreeLabel.y - 8,
      duration: 600, yoyo: true, repeat: -1 });
    // Glow ring (hidden until ripe)
    this.appleTreeGlow = this.add.graphics().setDepth(ay - 1);
    this.tweens.add({ targets: this.appleTreeGlow, alpha: { from: 1, to: 0.1 },
      duration: 750, yoyo: true, repeat: -1 });
    // Timer countdown label
    this.appleTreeTimer = this.add.text(ax, ay + 22, '', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#AAFFAA', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    // Name tag
    this.add.text(ax, ay + 38, '🍎 Apple Tree', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#FFD700', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    // State
    this.appleX = ax; this.appleY = ay;
    this.appleRipeAt  = appleTreeSave.ripeAt  || (Date.now() + FarmScene.APPLE_RIPEN_MS);
    this.appleRipe    = appleTreeSave.ripe     || false;
    this._updateAppleTree();
  }

  // ── BEEHIVE NPC ────────────────────────────────────────────────────────────
  _createBeehiveNPC(W, H){
    const bx = this.farm.x - 65;
    const by = this.farm.y - 70;
    this.beehiveX = bx;
    this.beehiveY = by;

    this.beehiveSprite = this.add.image(bx, by, 'beehive')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(by);
    if (this.shadows) this.shadows.createShadow(this.beehiveSprite, 38, 12, 2);

    this.tweens.add({
      targets: this.beehiveSprite,
      x: { from: bx - 1.5, to: bx + 1.5 },
      duration: 85,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.beehiveBees = [];
    const numBees = 4;
    for (let i = 0; i < numBees; i++) {
      const beeSprite = this.add.image(bx, by - 22, 'p_tiny_bee')
        .setScale(1.2).setDepth(by + 10);
      this.beehiveBees.push({
        sprite: beeSprite,
        baseX: bx,
        baseY: by - 22,
        angle: (Math.PI * 2 / numBees) * i,
        radiusX: 16 + (i % 2) * 6,
        radiusY: 10 + (i % 2) * 4,
        speed: 0.04 + i * 0.01
      });
    }

    this.beehiveHint = this.add.text(bx, by - 56, '🐝 Beehive\n[SPACE]', {
      fontFamily: '"Press Start 2P",monospace',
      fontSize: '12px',
      color: '#FFFFFF',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5, 1).setDepth(by + 100).setAlpha(0);

    this.tweens.add({
      targets: this.beehiveHint,
      y: this.beehiveHint.y - 6,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    this.add.text(bx, by + 6, '🐝 Beehive', {
      fontFamily: '"Press Start 2P",monospace',
      fontSize: '10px',
      color: '#FDE047',
      stroke: '#000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5, 0).setDepth(by + 10);
  }

  _createFallingLeaves(ax, ay){
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const leafKey = (this.textures && this.textures.exists('p_leaf_green'))
          ? (Math.random() < 0.5 ? 'p_leaf_green' : 'p_leaf_orange')
          : null;
        let lf;
        if (leafKey) {
          lf = this.add.image(ax + Phaser.Math.Between(-20, 20), ay - 35, leafKey).setDepth(ay + 10);
        } else {
          lf = this.add.rectangle(ax + Phaser.Math.Between(-20, 20), ay - 35, 4, 3, 0x86EFAC).setDepth(ay + 10);
        }
        this.tweens.add({
          targets: lf,
          x: { value: `+=${Phaser.Math.Between(-30, 30)}`, ease: 'Sine.InOut' },
          y: ay + Phaser.Math.Between(10, 30),
          angle: 360,
          alpha: 0,
          duration: 3500,
          ease: 'Power1',
          onComplete: () => lf.destroy()
        });
      }
    });
  }

  _updateAppleTree(){
    if(!this.appleTreeSprite) return;
    if(this.appleRipe){
      this.appleTreeSprite.setTexture('apple_tree_ripe');
      this.appleTreeLabel.setAlpha(1);
      this.appleTreeGlow.clear();
      this.appleTreeGlow.fillStyle(0xFFDD44, 0.25);
      this.appleTreeGlow.fillEllipse(this.appleX, this.appleY + 4, 150, 40);
      this.appleTreeTimer.setText('');
    } else {
      this.appleTreeSprite.setTexture('apple_tree');
      this.appleTreeLabel.setAlpha(0);
      this.appleTreeGlow.clear();
    }
  }

  _tickAppleTree(){
    if(this.appleRipe) return;
    const now = Date.now();
    const rem = Math.max(0, this.appleRipeAt - now);
    if(rem <= 0){
      this.appleRipe = true;
      _saveAppleTree(this);
      this._updateAppleTree();
      showToast('🍎 Apple Tree is ripe! Go harvest it!');
      return;
    }
    const secs = Math.ceil(rem / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    this.appleTreeTimer.setText(`🍎 ${m}m ${String(s).padStart(2,'0')}s`);
  }

  harvestAppleTree(){
    if(!this.appleRipe) return;
    // Pick a random word from unlocked levels for Phase 3 quiz
    const word = this._pickWord();
    appleTreeQuizPending = true;
    openQuiz(word, null, 3);
  }

  onAppleHarvested(){
    this.playPlayerAction('pick', this.appleX, this.appleY, () => {
      playChiptuneSFX('harvest');
      // Reward: big gold bonus
      const bonus = 15 + Math.floor(Math.random() * 6); // 15-20 gold
      addGold(bonus);
      this._flyCoins(this.appleX, this.appleY - 30, Math.min(bonus, 8));
      this._label(this.appleX, this.appleY - 30, `+${bonus} 🍎 BONUS!`);

      this.spawnDroppedItem('사과', this.appleX, this.appleY);

      // Start regrowth timer
      this.appleRipe    = false;
      this.appleRipeAt  = Date.now() + FarmScene.APPLE_RIPEN_MS;
      _saveAppleTree(this);
      this._updateAppleTree();
      showToast(`🍎 Harvested! +${bonus} gold! Tree will regrow in 2 min.`, 4000);
    });
  }

  // ── GROUND DROPPED ITEM PIPELINE ─────────────────────────────────────────
  spawnDroppedItem(itemId, x, y, playPopAnim = true) {
    if (!this.droppedItems) this.droppedItems = [];
    const info = getItemInfo(itemId);
    const nameKo = info.nameKo || itemId;

    const container = this.add.container(x, y - 10).setDepth(y + 5);

    // Ground Shadow
    const shadow = this.add.ellipse(0, 14, 22, 8, 0x000000, 0.4);
    
    // Glowing Aura
    const glow = this.add.graphics();
    glow.fillStyle(0x38bdf8, 0.25);
    glow.fillCircle(0, 0, 16);

    // Icon / Emoji
    const iconText = this.add.text(0, -4, info.icon || '🥬', { fontSize: '24px' }).setOrigin(0.5, 0.5);

    // Korean Label
    const labelText = this.add.text(0, 16, nameKo, {
      fontFamily: '"Press Start 2P", "Noto Sans KR", monospace',
      fontSize: '9px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    container.add([shadow, glow, iconText, labelText]);

    if (playPopAnim) {
      container.setScale(0.2);
      container.y = y - 30;
      this.tweens.add({
        targets: container,
        y: y - 10,
        scale: 1,
        duration: 400,
        ease: 'Bounce.Out'
      });
    }

    const dropEntity = {
      id: 'drop_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      itemId: itemId,
      nameKo: nameKo,
      curX: x,
      curY: y,
      bobOffset: Math.random() * Math.PI * 2,
      pickupCooldown: 0,
      container: container,
      glowGraphics: glow,
      shadowSprite: shadow
    };

    this.droppedItems.push(dropEntity);
    return dropEntity;
  }

  clearAllDroppedItems() {
    if (this.droppedItems && Array.isArray(this.droppedItems)) {
      this.droppedItems.forEach(item => {
        if (item.container && item.container.destroy) {
          item.container.destroy();
        }
      });
    }
    this.droppedItems = [];
  }

  updateDroppedItems(dt) {
    if (!this.droppedItems || this.droppedItems.length === 0) return;
    const gameTime = this.time ? this.time.now : Date.now();
    const now = Date.now();

    const isPlayerValid = !!this.player;
    const playerX = isPlayerValid ? this.player.x : 0;
    const playerBaseY = isPlayerValid ? (this.player.y + (this.player.displayHeight * (1 - this.player.originY))) : 0;

    const MAGNET_DIST = 65;
    const PICKUP_DIST = 32;

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      if (!item.container || !item.container.active) {
        this.droppedItems.splice(i, 1);
        continue;
      }

      // Continuous sine-wave bobbing
      const bob = Math.sin(gameTime * 0.005 + item.bobOffset) * 4;
      item.container.y = item.curY - 10 + bob;
      item.container.x = item.curX;
      item.container.setDepth(item.curY + 5);

      if (item.glowGraphics) {
        item.glowGraphics.setAlpha(0.25 + 0.15 * Math.sin(gameTime * 0.004 + item.bobOffset));
      }

      if (!isPlayerValid) continue;

      const dist = Phaser.Math.Distance.Between(playerX, playerBaseY, item.curX, item.curY);

      const isCooldownActive = now <= item.pickupCooldown;
      const isInvFull = getUsedInventorySlots() >= (inventoryState.maxSlots || 20);
      const isAlreadyOwned = inventoryState.ingredients && inventoryState.ingredients[getItemInfo(item.itemId).key] > 0;

      // Magnet zone (~60px)
      if (dist <= MAGNET_DIST && dist > PICKUP_DIST) {
        if (!isInvFull || isAlreadyOwned || !isCooldownActive) {
          item.curX += (playerX - item.curX) * 0.10;
          item.curY += (playerBaseY - item.curY) * 0.10;
        }
      }

      // Pickup zone (~30px)
      if (dist <= PICKUP_DIST) {
        if (now > item.pickupCooldown) {
          const added = addItemToInventory(item.itemId, 1);
          if (added) {
            if (typeof playChiptuneSFX === 'function') playChiptuneSFX('pickup');
            if (typeof this._sparkle === 'function') this._sparkle(item.curX, item.curY);
            if (typeof this._label === 'function') this._label(item.curX, item.curY - 15, `+1 ${item.nameKo}!`, '#4ade80');
            item.container.destroy();
            this.droppedItems.splice(i, 1);
          } else {
            if (typeof showToast === 'function') {
              showToast("🎒 Inventory Full! Cannot pick up " + item.nameKo, 2500);
            }
            item.pickupCooldown = now + 3000;
          }
        }
      }
    }
  }

  // ── PLAYER ACTION HELPER ───────────────────────────────────────────────────
  playPlayerAction(actionType, targetX, targetY, callback) {
    if (!this.player) { if (callback) callback(); return; }

    this.isPerformingAction = true;
    playerLocked = true;
    this.player.setVelocity(0, 0);

    if (typeof targetX === 'number' && typeof targetY === 'number') {
      const dx = targetX - this.player.x;
      const dy = targetY - this.player.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.player.setFlipX(dx < 0);
      } else {
        this.player.setFlipX(false);
      }
    }

    const animKey = `player-${actionType}`;
    const toolKey = actionType === 'water' ? 'tool_watering_can' :
                    actionType === 'harvest' ? 'tool_sickle' :
                    actionType === 'pick' ? 'tool_basket' : null;

    let toolSprite = null;
    if (toolKey && this.textures && this.textures.exists(toolKey)) {
      const offsetX = this.player.flipX ? -12 : 12;
      toolSprite = this.add.image(this.player.x + offsetX, this.player.y - 6, toolKey)
        .setDepth(this.player.depth + 1);
    }

    let cleanedUp = false;
    const restoreState = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (toolSprite) { toolSprite.destroy(); toolSprite = null; }
      this.isPerformingAction = false;
      playerLocked = false;
      if (this.player && this.player.active) {
        this.player.anims.stop();
        this.player.setTexture('player_walk_down_0');
      }
      if (typeof callback === 'function') callback();
    };

    const duration = 650;
    if (this.anims && this.anims.exists(animKey)) {
      this.player.anims.play(animKey, true);
      this.player.once(`animationcomplete-${animKey}`, restoreState);
      this.time.delayedCall(duration + 100, restoreState);
    } else {
      this.tweens.add({
        targets: this.player,
        scaleY: 0.8, scaleX: 1.2,
        duration: 150, yoyo: true, repeat: 1,
        onComplete: restoreState
      });
    }
  }

  // ── GINGER CAT BEHAVIOR STATE MACHINE ───────────────────────────────────────

  _updateCatNPC(dt) {
    if (!this.catSprite || !this.player) return;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.catX, this.catY);
    let targetAnim = 'cat-idle';
    const isCatTalking = typeof catDialogOpen !== 'undefined' && catDialogOpen;

    if (this.catIsMoving) {
      targetAnim = 'cat-walk';
    } else if (isCatTalking || dist < 65) {
      targetAnim = 'cat-sit';
      this.catSprite.setFlipX(this.player.x < this.catX);
      this.catIdleTimer = 0;
    } else if (dist > 250) {
      this.catIdleTimer = (this.catIdleTimer || 0) + (dt || 16);
      if (this.catIdleTimer > 5000) {
        targetAnim = 'cat-sleep';
      } else {
        targetAnim = 'cat-idle';
      }
    } else {
      this.catIdleTimer = 0;
      this.catSprite.setFlipX(this.player.x < this.catX);
      targetAnim = 'cat-idle';
    }

    if (this.catCurrentAnim !== targetAnim) {
      this.catCurrentAnim = targetAnim;
      if (this.anims && this.anims.exists(targetAnim)) {
        this.catSprite.play(targetAnim, true);
      }
    }
  }

  // ── PLOTS ──────────────────────────────────────────────────────────────────
  _createPlots(W, H){
    const MAX=15, ROWS=5;
    for(let i=0;i<MAX;i++){
      const col=i%PLOT_COLS, row=Math.floor(i/PLOT_COLS);
      const px=this.farm.x+col*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const py=this.farm.y+row*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const active = isPlotUnlocked(i);
      const shad = this.add.ellipse(px, py+PLOT_SIZE/2-2, PLOT_SIZE*0.85, 10, 0, active ? 0.3 : 0.1).setDepth(1);
      const tile = this.add.image(px, py, 'drt_dry').setDisplaySize(PLOT_SIZE, PLOT_SIZE).setDepth(2);

      let lockIcon = null;
      let lockText = null;
      if(!active){
        tile.setAlpha(0.35).setTint(0x666666);
        lockIcon = this.add.image(px, py - 4, 'pixel_crate').setDisplaySize(24, 24).setAlpha(0.7).setDepth(3);
        lockText = this.add.text(px, py, '🔒', { fontSize: '18px' }).setOrigin(0.5).setDepth(4);
      } else {
        tile.setAlpha(1.0).clearTint();
      }

      const body = this.physics.add.staticImage(px, py).setVisible(false);
      body.setCircle(PLOT_SIZE*0.4).refreshBody();

      this.plots.push({
        tile, shad, body, x: px, y: py, sState: '', ko: null, word: null,
        index: i, plant: null, glow: null, hintLabel: null, active, plantedAt: 0,
        lockIcon, lockText
      });
    }
    this._restorePlots();
  }

  unlockPlot(p){
    if(!p || p.active) return;
    p.active = true;
    if(!unlockedPlots.includes(p.index)) unlockedPlots.push(p.index);
    unlockedPlotCount = Math.max(unlockedPlotCount, unlockedPlots.length);

    p.tile.clearTint().setAlpha(1.0);
    p.shad.setAlpha(0.3);
    if(p.lockIcon){ p.lockIcon.destroy(); p.lockIcon = null; }
    if(p.lockText){ p.lockText.destroy(); p.lockText = null; }
    this.children.list
      .filter(c => c.type === 'Text' && c.text === '🔒' &&
              Math.abs(c.x - p.x) < 5 && Math.abs(c.y - p.y) < 5)
      .forEach(c => c.destroy());

    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
    this._sparkle(p.x, p.y);
    this._label(p.x, p.y, 'Plot Unlocked! 🔓');
    persistSave();
    if(typeof buildShopGrid === 'function' && shopOpen) buildShopGrid();
  }

  refreshPlotAccess(){
    if(!this.plots) return;
    this.plots.forEach((p, i) => {
      if(isPlotUnlocked(i) && !p.active){
        this.unlockPlot(p);
      }
    });
  }

  _createPlayer(W, H){
    this.player=this.physics.add.sprite(W/2, H-80,'player_walk_down_0')
      .setScale(1.8)
      .setCollideWorldBounds(true).setDrag(900,900).setDepth(500);
    this.player.body.setSize(24, 16).setOffset(12, 32);
    if (this.shadows) {
      this.pShadow = this.shadows.createShadow(this.player, 58, 18, 32);
    } else {
      this.pShadow = this.add.ellipse(0,0,58,18,0,0.3).setDepth(499);
    }
    if (this.lighting) {
      this.playerLantern = this.lighting.attachTo(this.player, 'light_glow_lantern', 0.8, 0.4);
    }
  }

  _addPlotLabels(){
    this.plots.forEach((p,i)=>{
      this.add.text(p.x,p.y+PLOT_SIZE/2+3,CROP_ICONS[i%5],{fontSize:'18px'})
        .setOrigin(0.5,0).setAlpha(0.4).setDepth(3);
    });
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(_t, dt){
    if(!this.player||!this.keys) return;
    const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
    this.player.setDepth(playerBaseY);

    if (this.dayNight) {
      const env = this.dayNight.update(dt || 16);
      if (this.shadows) {
        this.shadows.updateAllShadows(env.sunAngle, env.hour);
      }
    }
    if (this.lighting) this.lighting.update();

    // Dynamic Y-sort depth sorting for NPCs (using static base Y anchors)
    if (this.shopNPC) this.shopNPC.setDepth(this.shopY || this.shopNPC.y);
    if (this.boardSprite) this.boardSprite.setDepth(this.boardY || this.boardSprite.y);
    if (this.arcadeSprite) this.arcadeSprite.setDepth(this.arcadeY || this.arcadeSprite.y);
    if (this.wizardSprite) this.wizardSprite.setDepth(this.wizardY || this.wizardSprite.y);
    if (this.catSprite) this.catSprite.setDepth(this.catY || this.catSprite.y);
    if (this.portalSprite) this.portalSprite.setDepth(this.portalY || this.portalSprite.y);
    if (this.dockSprite) this.dockSprite.setDepth(this.fishY || this.dockSprite.y);
    if (this.appleTreeSprite) this.appleTreeSprite.setDepth(this.appleY || this.appleTreeSprite.y);

    // Plot crops Y-sort
    if (this.plots) {
      this.plots.forEach(p => {
        if (p.plant && p.plant.active) {
          p.plant.setDepth(p.y + 10);
        }
      });
    }

    this.updateDroppedItems(dt);


    if(!playerLocked && !this.isPerformingAction){
      const vx=(this.keys.A.isDown || this.keys.LEFT.isDown?-1:0)+(this.keys.D.isDown || this.keys.RIGHT.isDown?1:0);
      const vy=(this.keys.W.isDown || this.keys.UP.isDown?-1:0)+(this.keys.S.isDown || this.keys.DOWN.isDown?1:0);
      const len=Math.sqrt(vx*vx+vy*vy)||1;
      this.player.setVelocity((vx/len)*PLAYER_SPD,(vy/len)*PLAYER_SPD);
      if(vx!==0||vy!==0){
        let animKey = 'player-walk-down';
        if (Math.abs(vx) >= Math.abs(vy)) {
          animKey = vx < 0 ? 'player-walk-left' : 'player-walk-right';
          this.player.setScale(vx < 0 ? -1.8 : 1.8, 1.8);
        } else {
          animKey = vy < 0 ? 'player-walk-up' : 'player-walk-down';
          this.player.setScale(1.8, 1.8);
        }
        this.player.setFlipX(false);
        this.player.anims.play(animKey, true);

        this.walkTimer+=(dt||16);
        if(this.walkTimer>160){
          this.walkFrame=(this.walkFrame+1)%4;
          this.walkTimer=0;
          
          // Walking puff effect on stepping frames (1 and 3)
          if(this.walkFrame===1 || this.walkFrame===3){
            const dx = animKey === 'player-walk-left' ? 7 : (animKey === 'player-walk-right' ? -7 : 0);
            if (this.textures && this.textures.exists('p_dust')) {
              const dust = this.add.image(this.player.x + dx, this.player.y + 14, 'p_dust')
                .setScale(1).setAlpha(0.7).setDepth(this.player.y - 2);
              this.tweens.add({targets:dust, scale:2, y:dust.y-8, alpha:0, duration:400, ease:'Power1', onComplete:()=>dust.destroy()});
            } else {
              const puff = this.add.ellipse(this.player.x + dx, this.player.y + 14, 6, 4, 0xDDCCAA, 0.6).setDepth(this.player.y - 2);
              this.tweens.add({targets:puff, scale:2, y:puff.y-8, alpha:0, duration:400, ease:'Power1', onComplete:()=>puff.destroy()});
            }
          }
        }
      } else {
        this.player.anims.stop(); this.player.setTexture('player_walk_down_0'); this.walkTimer=0;
      }
    } else {
      this.player.setVelocity(0,0);
      if (!this.isPerformingAction) {
        this.player.anims.stop();
        this.player.setTexture('player_walk_down_0');
      }
    }

    // Show shop hint label when nearby
    if(this.shopNPC && this.shopHint){
      const nearShop = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY) < 90;
      this.shopHint.setAlpha(nearShop ? 1 : 0);
    }
    // Show cat hint label when nearby & update Cat NPC state machine
    if(this.catHint){
      const nearCat = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY) < 65;
      this.catHint.setAlpha(nearCat ? 1 : 0);
    }
    this._updateCatNPC(dt);

    // Show board hint label when nearby
    if(this.boardHint){
      const nearBoard = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY) < 80;
      this.boardHint.setAlpha(nearBoard ? 1 : 0);
    }
    // Show arcade hint label when nearby
    if(this.arcadeHint){
      const nearArcade = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY) < 80;
      this.arcadeHint.setAlpha(nearArcade ? 1 : 0);
    }
    // Show wizard hint label when nearby
    if(this.wizardHint){
      const nearWizard = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY) < 85;
      this.wizardHint.setAlpha(nearWizard ? 1 : 0);
    }
    // Show dungeon portal hint label when nearby
    if(this.portalHint){
      const nearPortal = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY) < 90;
      this.portalHint.setAlpha(nearPortal ? 1 : 0);
    }
    // Show fishing hint label when nearby
    if(this.fishHint){
      const nearFish = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY) < 85;
      this.fishHint.setAlpha(nearFish ? 1 : 0);
    }
    // Show beehive hint label when nearby & update beehive bees
    if(this.beehiveHint){
      const nearBeehive = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.beehiveX,this.beehiveY) < 85;
      this.beehiveHint.setAlpha(nearBeehive ? 1 : 0);
    }
    if (this.beehiveSprite) this.beehiveSprite.setDepth(this.beehiveY || this.beehiveSprite.y);
    if (this.beehiveBees && this.beehiveBees.length) {
      this.beehiveBees.forEach((bee) => {
        bee.angle += bee.speed;
        bee.sprite.x = bee.baseX + Math.cos(bee.angle) * bee.radiusX + Math.sin(bee.angle * 2.2) * 2;
        bee.sprite.y = bee.baseY + Math.sin(bee.angle) * bee.radiusY + Math.cos(bee.angle * 1.7) * 2;
      });
    }

    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)&&!playerLocked&&!this.isPerformingAction&&!quizOpen&&!shopOpen&&!memoryOpen&&!trophyOpen&&!duelOpen) this._interact();
    // SRS timer: check every 8s if any plant needs state advance
    this._timerAcc=(this._timerAcc||0)+(dt||16);
    if(this._timerAcc>8000){this._timerAcc=0;this._checkSRS();}
    // Apple tree timer: update every second
    this._appleAcc=(this._appleAcc||0)+(dt||16);
    if(this._appleAcc>1000){this._appleAcc=0;this._tickAppleTree();}
    // SPACE target indicator (shows which object will be targeted)
    if(!playerLocked&&!this.isPerformingAction&&!quizOpen&&!shopOpen&&!catDialogOpen) this._updateTargetHighlight();
    else if(this._tHL){ this._tHL.clear(); if(this._tLbl) this._tLbl.setAlpha(0); }
  }


  // ── SPACE TARGET HIGHLIGHT ─────────────────────────────────────────────────
  _updateTargetHighlight(){
    // Lazy-create graphics + label once
    if(!this._tHL){
      this._tHL  = this.add.graphics().setDepth(9997);
      this._tLbl = this.add.text(0,0,'',{
        fontFamily:'Arial,sans-serif', fontSize:'16px',
        color:'#fff', stroke:'#000', strokeThickness:4, align:'center',
        backgroundColor:'rgba(0,0,0,0.55)', padding:{x:6,y:3}
      }).setOrigin(0.5,1).setDepth(9998);
    }
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+26;
    const pulse=0.6+0.4*Math.sin(Date.now()/220);
    this._tHL.clear();
    let hx=null,hy=null,lbl='',col=0xFFD700,hw=PLOT_SIZE,hh=PLOT_SIZE;

    // Priority mirrors _interact(): apple > ripe > wilt > cat > shop > empty
    if(this.appleRipe&&this.appleX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<95){
      hx=this.appleX;hy=this.appleY-50;lbl='[SPACE] Harvest 🍎 Bonus!';col=0xFF3333;hw=60;hh=70;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='4'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Harvest +Gold';col=0xFFD700;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='2'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Water';col=0x55CCFF;break;}
    }
    if(hx===null&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<65){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Talk to Ginger Cat';col=0xFF88CC;hw=44;hh=44;
    }
    if(hx===null&&this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      hx=this.wizardX;hy=this.wizardY-25;lbl='[SPACE] Spell Duel';col=0xA855F7;hw=44;hh=50;
    }
    if(hx===null&&this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<90){
      hx=this.portalX;hy=this.portalY-30;lbl='[SPACE] Enter Dungeon';col=0xEC4899;hw=50;hh=60;
    }
    if(hx===null&&this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      hx=this.fishX;hy=this.fishY-25;lbl='[SPACE] Start Fishing';col=0x38BDF8;hw=50;hh=50;
    }
    if(hx===null&&this.beehiveX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.beehiveX,this.beehiveY)<85){
      hx=this.beehiveX;hy=this.beehiveY-25;lbl='[SPACE] Beehive Minigame';col=0xFACC15;hw=44;hh=50;
    }
    if(hx===null&&this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      hx=this.arcadeX;hy=this.arcadeY-30;lbl='[SPACE] Play Retro Shooter';col=0x00FFFF;hw=44;hh=50;
    }
    if(hx===null&&this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<80){
      hx=this.boardX;hy=this.boardY-20;lbl='[SPACE] Play Memory Match';col=0xFF88FF;hw=44;hh=44;
    }
    if(hx===null&&this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<90){
      hx=this.shopX;hy=this.shopY-20;lbl='[SPACE] Open Shop';col=0xFFAA44;hw=50;hh=60;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Plant new';col=0x44FF88;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(!p.active&&near(p)){
        const cost = PLOT_UNLOCK_COSTS[p.index - 9] || 1000;
        hx=p.x; hy=p.y;
        lbl=`[SPACE] Unlock Plot #${p.index + 1} (${cost} Gold) 🔒`;
        col=0xFFD700;
        break;
      }
    }

    if(hx!==null){
      // Subtle Corner brackets
      const ca=12; const pad=8;
      this._tHL.fillStyle(col, 0.8 + pulse*0.2);
      [[hx-hw/2-pad,hy-hh/2-pad], [hx+hw/2+pad,hy-hh/2-pad], [hx-hw/2-pad,hy+hh/2+pad], [hx+hw/2+pad,hy+hh/2+pad]].forEach(([cx,cy], i)=>{
        if(i===0) { this._tHL.fillRect(cx,cy-1,ca,3); this._tHL.fillRect(cx-1,cy,3,ca); } // Top-left
        if(i===1) { this._tHL.fillRect(cx-ca,cy-1,ca,3); this._tHL.fillRect(cx-1,cy,3,ca); } // Top-right
        if(i===2) { this._tHL.fillRect(cx,cy-1,ca,3); this._tHL.fillRect(cx-1,cy-ca,3,ca); } // Bottom-left
        if(i===3) { this._tHL.fillRect(cx-ca,cy-1,ca,3); this._tHL.fillRect(cx-1,cy-ca,3,ca); } // Bottom-right
      });
      // Action label above object
      this._tLbl.setPosition(hx, hy-hh/2-14).setText(lbl).setAlpha(0.9+pulse*0.1);
    } else {
      this._tLbl.setAlpha(0);
    }
  }

  _checkSRS(){
    const now=Date.now(); let changed=false;
    this.plots.forEach(p=>{
      if(!p.ko) return;
      const s=getSrs(p.ko);
      // A learning-step timer elapsing is what makes a crop need attention. Both
      // transitions read the same `due` field now; the plot state says which step we are on.
      if(p.sState==='1' && srsIsDue(s, now)){ this._setState(p,'2',p.ko); changed=true; }
      if(p.sState==='3' && srsIsDue(s, now)){ this._setState(p,'4',p.ko); changed=true; }
    });
    if(changed) savePlotsFn();
  }

  // ── INTERACT (SRS-aware priority) ─────────────────────────────────────────
  _interact(){
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+24;
    // Apple Tree harvest (highest priority when ripe)
    if(this.appleRipe&&this.appleX&&
       Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<95){
      this.tweens.add({targets:this.appleTreeSprite,angle:12,duration:80,yoyo:true,repeat:2});
      this.harvestAppleTree(); return;
    }
    // P1: ripe crop plots (Phase 3 harvest)
    for(const p of this.plots){ if(p.sState==='4'&&near(p)){openQuiz(p.word,p,3);return;} }
    // P2: wilting plants (Phase 2 review)
    for(const p of this.plots){ if(p.sState==='2'&&near(p)){openQuiz(p.word,p,2);return;} }
    // Cat NPC
    if(this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<65){
      this.tweens.add({targets:this.catSprite,scale:{from:0.75,to:0.95},duration:100,yoyo:true,ease:'Back.Out(2)'});
      showCatDialog(); return;
    }
    // Wizard NPC
    if(this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      this.tweens.add({targets:this.wizardSprite,scale:{from:1.8,to:2.1},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('duel');
      if(!chk.unlocked){ showHardLockToast('duel'); return; }
      openSpellDuel(); return;
    }
    // Dungeon Portal
    if(this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<90){
      this.tweens.add({targets:this.portalSprite,scale:{from:1.6,to:1.9},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('dungeon');
      if(!chk.unlocked){ showHardLockToast('dungeon'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('DungeonScene');
      });
      return;
    }
    // Fishing Dock
    if(this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      this.tweens.add({targets:this.dockSprite,scale:{from:1.6,to:1.8},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('fishing');
      if(!chk.unlocked){ showHardLockToast('fishing'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('FishingScene');
      });
      return;
    }
    // Beehive NPC
    if(this.beehiveX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.beehiveX,this.beehiveY)<85){
      this.tweens.add({targets:this.beehiveSprite,scale:{from:1.6,to:1.85},duration:120,yoyo:true,ease:'Back.Out(2)'});
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('BeeScene');
      });
      return;
    }
    // Arcade
    if(this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      this.tweens.add({targets:this.arcadeSprite,scale:{from:1.5,to:1.6},duration:100,yoyo:true});
      const chk = isZoneUnlocked('arcade');
      if(!chk.unlocked){ showHardLockToast('arcade'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('ArcadeScene');
      });
      return;
    }

    // Board
    if(this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<80){
      this.tweens.add({targets:this.boardSprite,angle:5,duration:100,yoyo:true,repeat:1});
      openMemoryGame(); return;
    }
    // Shop
    if(this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<90){openShop();return;}
    // P3: empty plots (Phase 1 plant, full hints)
    for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){
        this.tweens.add({targets:p.tile,scaleX:0.85,scaleY:0.85,duration:90,yoyo:true});
        openQuiz(this._pickWord(),p,1); return;
      }
    }
    // P4: locked plots (unlock interaction flow)
    for(const p of this.plots){
      if(!p.active&&near(p)){
        const cost = PLOT_UNLOCK_COSTS[p.index - 9] || 1000;
        if(gold >= cost){
          spendCoins(cost);
          this.unlockPlot(p);
        } else {
          if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
          showToast(`Need ${cost} Gold 🪙 to unlock Farm Plot #${p.index + 1}!`);
        }
        return;
      }
    }
  }

  // ── SRS ADVANCE PLOT (called after correct quiz answer) ─────────────────────
  // `grade` is the SM-2 grade already applied by submitAnswer; the scheduler owns all
  // timing now, so this method only drives visuals and rewards.
  advancePlot(plot, word, phase, grade = GRADE.GOOD){
    const ko=word.ko, now=Date.now(), t=plot.index%5;
    if(phase===1){
      // P1 correct: plant seedling. The next-step timer already lives in srsData.due.
      plot.word=word; plot.ko=ko; plot.plantedAt=now;
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      const crop=this.add.image(plot.x,plot.y-4,`cr_${t}_1`).setOrigin(0.5,0.85).setScale(0).setDepth(plot.y+5);
      plot.plant=crop;
      this.tweens.add({targets:crop,scale:1,duration:300,ease:'Back.Out(3)'});
      this._sparkle(plot.x,plot.y); this._label(plot.x,plot.y,'Planted!');
      this._setState(plot,'1',ko);
    } else if(phase===2){
      // P2 correct: grow to sprout, set P3 timer, play watering animation
      this.playPlayerAction('water', plot.x, plot.y, () => {
        if(plot.plant) plot.plant.setTexture(`cr_${t}_2`).clearTint();
        this.tweens.add({targets:plot.plant,scale:{from:0.7,to:1.1},duration:320,ease:'Back.Out(2)',
          onComplete:()=>this.tweens.add({targets:plot.plant,scale:1,duration:150})});
        if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
        if(plot.glow){plot.glow.destroy();plot.glow=null;}
        this._leaves(plot.x,plot.y-8); this._label(plot.x,plot.y,'Watered!');
        this._setState(plot,'3',ko);
        savePlotsFn();
      });
    } else {
      // P3 correct: HARVEST! Coins, Gems, Honor! Play harvesting animation
      this.playPlayerAction('harvest', plot.x, plot.y, () => {
        playChiptuneSFX('harvest');
        const prev=harvestCounts.get(ko)||0;
        const newHarvests = prev + 1;
        harvestCounts.set(ko, newHarvests);

        // Anti-farm diminishing returns formula:
        // Decays smoothly down to 1 coin if harvested >= 15 times
        const reward = Math.max(1, Math.floor(10 * Math.pow(0.85, prev)));
        plantedWords.delete(ko);
        this._sparkle(plot.x,plot.y);
        this._label(plot.x,plot.y,prev===0?`+${reward} COINS! NEW!`:`+${reward} COINS!`);

        // Legendary tier mastery check (>= 10 harvests) -> +10 Honor
        if (newHarvests === 10) {
          addHonor(10);
          showToast(`👑 Word "${ko}" reached Legendary Tier! +10 Honor!`, 4500);
        }

        // Quiz streak tracking: +3 Gems every 10 consecutive correct answers
        quizStreak++;
        if (quizStreak % 10 === 0) {
          addGems(3);
          showToast(`🔥 10-Quiz Perfect Streak! +3 Gems!`, 4000);
        }

        this.time.delayedCall(350,()=>{
          addCoins(reward);
          updateVocabBook();
          checkQuestProgress('harvest', { count: 1 });
          checkQuestProgress('quiz');

          const cropIngredients = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근'];
          const ingName = (ko && typeof KOREAN_INGREDIENTS !== 'undefined' && KOREAN_INGREDIENTS.includes(ko)) ? ko : cropIngredients[plot.index % cropIngredients.length];

          this.spawnDroppedItem(ingName, plot.x, plot.y);
        });
        this._clearPlot(plot);
        savePlotsFn();
      });
    }
    savePlotsFn();
  }

  // Wrong answer at P3 -> regression back to P2 wilting
  regressionPlot(plot,word){
    quizStreak = 0;
    const ko=word.ko, t=plot.index%5;

    // Scheduling was already applied by submitAnswer's AGAIN grade; this only regresses
    // the plot visuals back to "needs watering".
    if(plot.glow){plot.glow.destroy();plot.glow=null;}
    if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    if(plot.plant) plot.plant.setTexture(`cr_${t}_1`);
    this.tweens.add({targets:plot.plant,scale:0.5,duration:200,ease:'Power2.In',
      onComplete:()=>{
        if(plot.plant) plot.plant.setTint(0xFFCC44);
        this.tweens.add({targets:plot.plant,scale:1,duration:300,ease:'Back.Out(2)'});
      }});
    this._setState(plot,'2',ko);
    showToast('Plant regressed! Water it again.');
    savePlotsFn();
  }

  // Apply visual state to a plot
  _setState(plot, s, ko){
    plot.sState=s;
    const t=plot.index%5;
    if (plot.cropShadow) {
      if (plot.cropShadow.destroy) plot.cropShadow.destroy();
      plot.cropShadow = null;
    }
    if(s===''){  // empty
      plot.tile.setTexture('drt_dry').setAlpha(plot.active?1:0.25).clearTint();
      plot.shad.setAlpha(plot.active?0.3:0.1);
    } else if(s==='1'){  // seedling (healthy)
      plot.tile.setTexture('drt_wet').clearTint();
      if(plot.plant) plot.plant.clearTint();
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 14, 5, 12);
      }
    } else if(s==='2'){  // wilting - P2 review needed
      if(plot.plant) plot.plant.setTexture(`cr_${t}_1`).setTint(0xFFCC44);
      this._addLabel(plot,'💧','#FFD700');
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 20, 7, 10);
      }
    } else if(s==='3'){  // sprout healthy
      if(plot.plant) plot.plant.clearTint();
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 24, 8, 8);
      }
    } else if(s==='4'){  // ripe - harvest!
      if(plot.plant) plot.plant.setTexture(`cr_${t}_3`).clearTint();
      this._addGlow(plot,0xFFD700);
      this._addLabel(plot,'SPACE','#FFD700');
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 28, 9, 6);
      }
    }
  }

  _addGlow(plot,col){
    if(plot.glow) plot.glow.destroy();
    const g=this.add.graphics().setDepth(plot.y+4);
    g.lineStyle(4,col,1); g.strokeRect(plot.x-PLOT_SIZE/2,plot.y-PLOT_SIZE/2,PLOT_SIZE,PLOT_SIZE);
    plot.glow=g; this.tweens.add({targets:g,alpha:{from:1,to:0.15},duration:700,yoyo:true,repeat:-1});
  }
  _addLabel(plot,txt,color){
    if(plot.hintLabel) plot.hintLabel.destroy();
    const l=this.add.text(plot.x,plot.y-PLOT_SIZE/2-6,txt,{
      fontFamily:'"Press Start 2P",monospace',fontSize:'12px',color,stroke:'#000',strokeThickness:3
    }).setOrigin(0.5,1).setDepth(plot.y+6);
    plot.hintLabel=l;
    this.tweens.add({targets:l,y:l.y-3,duration:550,yoyo:true,repeat:-1});
  }
  _clearPlot(plot){
    if(plot.glow){plot.glow.destroy();plot.glow=null;}
    if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    if(plot.cropShadow){if(plot.cropShadow.destroy) plot.cropShadow.destroy(); plot.cropShadow=null;}
    if(plot.plant){plot.plant.destroy();plot.plant=null;}
    plot.sState=''; plot.ko=null; plot.word=null;
    plot.tile.setTexture('drt_dry').setAlpha(1).setDisplaySize(PLOT_SIZE,PLOT_SIZE).clearTint();
    plot.shad.setAlpha(0.3);
  }

  // Restore saved plots on startup
  _restorePlots(){
    if(!plotSave.length) return;
    const now=Date.now();
    plotSave.forEach(pd=>{
      const plot=this.plots[pd.i]; if(!plot) return;
      const word=this._findWord(pd.ko); if(!word) return;
      plot.word=word; plot.ko=pd.ko; plot.plantedAt=pd.plantedAt||0;
      const srs=getSrs(pd.ko);
      // Advance state if timers expired while offline
      let st=pd.sState||pd.state||'1';
      if(st==='1'&&srsIsDue(srs,now)) st='2';
      if(st==='3'&&srsIsDue(srs,now)) st='4';
      const t=plot.index%5;
      const tex={1:`cr_${t}_1`,2:`cr_${t}_1`,3:`cr_${t}_2`,4:`cr_${t}_3`}[st]||`cr_${t}_1`;
      plot.plant=this.add.image(plot.x,plot.y-4,tex).setOrigin(0.5,0.85).setDepth(plot.y+5);
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      this._setState(plot,st,pd.ko);
      plantedWords.add(pd.ko);
    });
  }

  // ── DAILY REVIEW LOOP ──────────────────────────────────────────────────────
  // Words whose review date has passed appear as already-ripe crops on free plots, so
  // opening the farm answers "what do I owe today?" the way Stardew answers it: you walk
  // in and see what needs harvesting. Reviews are a single recall — the three-touch
  // plant/water/harvest cycle is for learning a word the first time, and repeating it for
  // a word you already know would be busywork.
  //
  // Some plots are always left free, otherwise a large review backlog would lock the
  // player out of learning anything new.
  _plantDueReviews(){
    if(!this.plots) return 0;
    const now = Date.now();
    const due = srsDueWords(now).filter(d => d.entry.st === 'review' && !plantedWords.has(d.word.ko));
    if(!due.length) return 0;

    const freePlots = this.plots.filter(p => p.active && !p.ko);
    const RESERVED_FOR_NEW = 2;
    const capacity = Math.max(0, freePlots.length - RESERVED_FOR_NEW);
    const planting = due.slice(0, capacity);

    planting.forEach((d, i) => {
      const plot = freePlots[i];
      const t = plot.index % 5;
      plot.word = d.word; plot.ko = d.word.ko; plot.plantedAt = now;
      plot.plant = this.add.image(plot.x, plot.y-4, `cr_${t}_3`)
        .setOrigin(0.5,0.85).setDepth(plot.y+5).setScale(0);
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      this.tweens.add({ targets: plot.plant, scale: 1, duration: 260, delay: i*70, ease:'Back.Out(2)' });
      this._setState(plot, '4', d.word.ko);   // ripe: next interact opens the recall quiz
      plantedWords.add(d.word.ko);
    });

    if(planting.length) savePlotsFn();
    return { planted: planting.length, remaining: due.length - planting.length };
  }

  // Called on farm entry and again when the player returns from a minigame, since reviews
  // can come due while they are away.
  _refreshDueReviews(announce = true){
    const res = this._plantDueReviews();
    if(!res || !res.planted) return;
    const msg = res.remaining > 0
      ? `⏰ ${res.planted} word${res.planted===1?'':'s'} due for review — ${res.remaining} more waiting for free plots`
      : `⏰ ${res.planted} word${res.planted===1?'':'s'} due for review!`;
    if(announce) showToast(msg, 4200);
    updateHUD();
  }

  _findWord(ko){
    for(const lvl of levelsData){ const w=lvl.words.find(w=>w.ko===ko); if(w) return w; }
    return null;
  }

  _sparkle(x,y){
    if (this.cropSparkleEmitter) {
      try { this.cropSparkleEmitter.explode(10, x, y); } catch(e) {}
    }
    const c=[0xFFDD44,0xFFFFFF,0x88FF88,0xFF88CC];
    const spKey = (this.textures && this.textures.exists('p_sparkle')) ? 'p_sparkle' : 'sparkle';
    for(let i=0;i<8;i++){
      const sp=this.add.image(x,y,spKey).setScale(0.4+Math.random()*0.5).setTint(c[i%4]).setDepth(y+30);
      const ang=(i/8)*Math.PI*2,dist=28+Math.random()*16;
      this.tweens.add({targets:sp,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist-8,
        scale:0,alpha:0,duration:450+Math.random()*200,ease:'Power2.Out',onComplete:()=>sp.destroy()});
    }
  }
  _flyCoins(fx,fy,cnt){
    for(let i=0;i<Math.min(cnt,6);i++){
      this.time.delayedCall(i*60,()=>{
        const c=this.add.image(fx,fy,'coin').setScale(0.8).setDepth(fy+40);
        this.tweens.add({targets:c,x:fx+(Math.random()-.5)*40,y:fy-50-Math.random()*30,
          scale:1.4,duration:250,ease:'Back.Out(2)',
          onComplete:()=>this.tweens.add({targets:c,y:-20,alpha:0,scale:.3,duration:300,ease:'Power2.In',onComplete:()=>c.destroy()})});
      });
    }
  }
  _pickWord(){
    const all=unlockedLevels.flatMap(idx=>levelsData[idx]?.words||[]);
    let pool=all.filter(w=>!plantedWords.has(w.ko));
    // Manual planting is for learning new material; anything already in the review queue
    // resurfaces on its own schedule via _plantDueReviews, so it is excluded here rather
    // than letting the player grind a known word ahead of its due date.
    const unlearned=pool.filter(w=>!srsIsGraduated(srsData[w.ko]));
    if(unlearned.length) pool=unlearned;
    const arr=pool.length?pool:all;
    // Weighted random: untouched ×5, mid-learning ×3, everything else ×1
    const weighted=arr.map(w=>{
      const e=srsData[w.ko];
      return {word:w, weight: !e||e.st==='new' ? 5 : srsIsLearning(e) ? 3 : 1};
    });
    const total=weighted.reduce((s,w)=>s+w.weight,0);
    let r=Math.random()*total;
    for(const {word,weight} of weighted){
      r-=weight; if(r<=0) return word;
    }
    return arr[0];
  }
  _leaves(cx,cy){
    for(let i=0;i<6;i++){
      const ang=(i/6)*Math.PI*2, g=this.add.graphics().setDepth(cy+15);
      g.fillStyle(i%2?K.L:K.l,1); g.fillEllipse(0,0,8,4); g.setPosition(cx,cy);
      this.tweens.add({targets:g,x:cx+Math.cos(ang)*28,y:cy+Math.sin(ang)*18,
        angle:240*(i%2?1:-1),scale:0,alpha:0,duration:520,ease:'Power2.Out',onComplete:()=>g.destroy()});
    }
  }
  _label(x,y,msg){
    const txt=this.add.text(x,y,msg,{fontFamily:'"Press Start 2P",monospace',fontSize:'14px',
      color:'#FFD700',stroke:'#000',strokeThickness:4}).setOrigin(0.5,1).setDepth(y+40);
    this.tweens.add({targets:txt,y:y-65,alpha:0,scale:1.4,duration:1100,ease:'Power2.Out',onComplete:()=>txt.destroy()});
  }
  resetPlots(){
    this.plots.forEach(p=>{
      if(p.glow){p.glow.destroy();p.glow=null;}
      if(p.hintLabel){p.hintLabel.destroy();p.hintLabel=null;}
      if(p.plant){p.plant.destroy();p.plant=null;}
      if(p.ko) plantedWords.delete(p.ko);
      p.sState=''; p.ko=null; p.word=null;
      p.tile.setTexture('drt_dry').setAlpha(p.active?1:0.25).setDisplaySize(PLOT_SIZE,PLOT_SIZE).clearTint();
      p.shad.setAlpha(p.active?0.3:0.1);
    });
    localStorage.removeItem('hv_plots');
  }

  shutdown() {
    this.events.off('resume');
    // Flush before sceneRef is dropped: collectSave() reads plots and ground drops off
    // the live scene, so a debounced write firing after this would lose them.
    if (typeof flushSave === 'function') flushSave();
    if (this.cropSparkleEmitter) {
      try { this.cropSparkleEmitter.destroy(); } catch(e){}
    }
    if (sceneRef === this) sceneRef = null;
  }
}

class ArcadeScene extends Phaser.Scene {
  constructor(){ super({key:'ArcadeScene'}); }

  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create(){
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.W = this.scale.width;

    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    // Multi-layer Parallax Space Background
    // Layer 1: Dark Space Base Tile Grid
    for(let x = 0; x < this.W + TILE; x += TILE){
      for(let y = 0; y < this.H + TILE; y += TILE){
        this.add.image(x + TILE/2, y + TILE/2, 'tile_space_dark').setDisplaySize(TILE, TILE).setDepth(0);
      }
    }
    // Layer 2: Floating Nebulae
    const n1 = this.add.image(this.W * 0.25, this.H * 0.3, 'nebula_purple').setScale(3.5).setAlpha(0.35).setDepth(1);
    const n2 = this.add.image(this.W * 0.75, this.H * 0.6, 'nebula_cyan').setScale(4.0).setAlpha(0.35).setDepth(1);
    this.tweens.add({ targets: [n1, n2], alpha: { from: 0.25, to: 0.5 }, scale: { from: 3, to: 4.2 }, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Layer 3: Planet Silhouettes
    this.add.image(90, 90, 'planet_ringed').setDisplaySize(64, 64).setDepth(2).setAlpha(0.8);
    this.add.image(this.W - 100, 110, 'planet_gas_giant').setDisplaySize(72, 72).setDepth(2).setAlpha(0.8);

    // Layer 4: Distant Stars & Parallax Near Stars Layer using TileSprites
    if (this.textures && this.textures.exists('tile_stars_far')) {
      this.bgFarStars = this.add.tileSprite(this.W/2, this.H/2, this.W, this.H, 'tile_stars_far').setDepth(3).setScrollFactor(0);
    }
    if (this.textures && this.textures.exists('tile_stars_near')) {
      this.bgNearStars = this.add.tileSprite(this.W/2, this.H/2, this.W, this.H, 'tile_stars_near').setDepth(4).setScrollFactor(0);
    }

    this.nearStarsGroup = this.add.group();
    for(let i = 0; i < 8; i++){
      const sx = Phaser.Math.Between(40, this.W - 40);
      const sy = Phaser.Math.Between(40, this.H - 40);
      const st = this.add.image(sx, sy, 'tile_stars_near').setDisplaySize(36, 36).setDepth(4);
      this.nearStarsGroup.add(st);
      this.tweens.add({ targets: st, alpha: { from: 0.4, to: 1.0 }, duration: 1200 + Math.random()*800, yoyo: true, repeat: -1 });
    }

    this.score = 0;
    this.playerHP = 100;
    this.hasTripleShot = false;
    this.hasShield = false;
    this.nukeCount = 1;

    // UI Header
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#00FFFF'}).setDepth(10);
    this.hpText = this.add.text(20, 48, '❤️ HP: 100/100', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#EF4444'}).setDepth(10);
    this.powerText = this.add.text(20, 72, '💣 NUKES: 1 [PRESS B]', {fontFamily:'"Press Start 2P",monospace', fontSize:'12px', color:'#FDE047'}).setDepth(10);

    const exitTxt = this.add.text(this.W - 20, 20, '[ESC] EXIT', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#FF00FF', backgroundColor:'rgba(15,23,42,0.8)', padding:{x:8,y:4}})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitTxt.on('pointerdown', ()=>this.exitGame());
    this.input.keyboard.on('keydown-ESC', ()=>this.exitGame());

    // Nuke key [B]
    this.nukeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    // Player Hero Ship
    this.ship = this.add.sprite(this.W/2, this.H - 80, 'arcade_player_ship').setOrigin(0.5).setDepth(20);
    this.physics.add.existing(this.ship);
    this.ship.body.setCollideWorldBounds(true);
    this.ship.body.setSize(40, 40);

    // Shield aura graphic
    this.shieldAura = this.add.circle(this.ship.x, this.ship.y, 32, 0x38BDF8, 0.35).setStrokeStyle(3, 0x38BDF8).setVisible(false).setDepth(19);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    // Groups
    this.lasers = this.physics.add.group();
    this.bossBullets = this.physics.add.group();
    this.minions = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.wordOrbs = this.physics.add.group();

    this.physics.add.overlap(this.lasers, this.minions, this.hitMinion, null, this);
    this.physics.add.overlap(this.lasers, this.wordOrbs, this.hitWordOrb, null, this);
    this.physics.add.overlap(this.ship, this.bossBullets, this.hitPlayerWithBullet, null, this);
    this.physics.add.overlap(this.ship, this.powerups, this.collectPowerup, null, this);

    this.lastFired = 0;
    this.lastMinionSpawn = 0;
    this.lastBossBullet = 0;

    const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
    this.wordPool = all.length > 0 ? all : [{ko:'사과', en:'Apple'}, {ko:'우유', en:'Milk'}, {ko:'빵', en:'Bread'}];

    // Spawn BOSS
    this.spawnBoss();
  }

  spawnBoss(){
    this.bossHP = 600;
    this.maxBossHP = 600;
    this.bossPhase = 1; // 1: Bullet Hell, 2: Shield Spell Lock
    this.bossShielded = false;

    this.bossContainer = this.add.container(this.W/2, 120).setDepth(15);
    this.bossSprite = this.add.sprite(0, 0, 'alien_boss').setOrigin(0.5);
    this.bossName = this.add.text(0, -55, '🌌 KING HANGEUL ALIEN', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#EC4899', stroke:'#000', strokeThickness:4}).setOrigin(0.5);

    // Boss Shield Visual Barrier
    this.bossBarrier = this.add.circle(0, 0, 75, 0x38BDF8, 0.4).setStrokeStyle(4, 0x38BDF8).setVisible(false);

    this.bossContainer.add([this.bossSprite, this.bossName, this.bossBarrier]);
    this.physics.add.existing(this.bossContainer);
    this.bossContainer.body.setSize(120, 100);

    // Boss Health Bar Top HUD
    this.bossBarBg = this.add.rectangle(this.W/2, 35, 400, 16, 0x1E293B).setStrokeStyle(2, 0xEC4899).setDepth(50);
    this.bossBarFill = this.add.rectangle(this.W/2 - 200, 35, 400, 14, 0xEC4899).setOrigin(0, 0.5).setDepth(51);

    // Move Boss Left & Right
    this.tweens.add({ targets: this.bossContainer, x: {from: 140, to: this.W - 140}, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Enable overlap between Lasers and Boss
    this.physics.add.overlap(this.lasers, this.bossContainer, this.hitBoss, null, this);

    // ── RESIZE HANDLER ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setBounds(0, 0, Math.max(gameSize.width, this.W), Math.max(gameSize.height, this.H));
    });
  }

  update(t, dt){
    // Player Movement
    let vx = 0, vy = 0;
    const speed = 420;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.ship.body.setVelocity(vx, vy);
    if(this.shieldAura.visible){
      this.shieldAura.setPosition(this.ship.x, this.ship.y);
    }

    // Parallax Starfield scrolling
    if (this.bgFarStars) this.bgFarStars.tilePositionY -= 0.3 * ((dt || 16) / 16.6);
    if (this.bgNearStars) this.bgNearStars.tilePositionY -= 1.0 * ((dt || 16) / 16.6);
    if (this.nearStarsGroup) {
      this.nearStarsGroup.getChildren().forEach(st => {
        st.y += 0.5;
        if (st.y > this.H + 20) st.y = -20;
      });
    }

    // Nuke detonation [B]
    if(Phaser.Input.Keyboard.JustDown(this.nukeKey) && this.nukeCount > 0){
      this.detonateNuke();
    }

    // Firing Lasers
    if(t > this.lastFired) {
      this.fireLaser();
      this.lastFired = t + (this.hasTripleShot ? 180 : 240);
    }

    // Boss Bullet Spawns (Phase 1 Bullet Hell)
    if(this.bossHP > 0 && !this.bossShielded && t > this.lastBossBullet){
      this.fireBossBulletPattern(t);
      this.lastBossBullet = t + 700;
    }

    // Spawn Minion invaders
    if(t > this.lastMinionSpawn){
      this.spawnMinion();
      this.lastMinionSpawn = t + Phaser.Math.Between(2500, 4500);
    }

    // Trigger Phase 2 Shield Spell Lock periodically
    if(!this.bossShielded && this.bossHP > 0 && Math.random() < 0.003){
      this.triggerShieldSpellLock();
    }

    // Clean up offscreen bullets
    this.lasers.children.entries.forEach(l => { if(l && l.y < -50) l.destroy(); });
    this.bossBullets.children.entries.forEach(b => { if(b && b.y > this.H + 50) b.destroy(); });
  }

  fireLaser(){
    const createL = (x, vy, vx = 0) => {
      const laser = this.add.sprite(x, this.ship.y - 25, 'laser_player').setOrigin(0.5);
      this.physics.add.existing(laser);
      this.lasers.add(laser);
      laser.body.setVelocity(vx, vy);
    };

    if(this.hasTripleShot){
      createL(this.ship.x - 15, -600, -100);
      createL(this.ship.x, -650, 0);
      createL(this.ship.x + 15, -600, 100);
    } else {
      createL(this.ship.x, -650, 0);
    }
  }

  fireBossBulletPattern(t){
    // Spiral & Radial Bullet Spreads
    const count = 7;
    for(let i=0; i<count; i++){
      const angle = (i / count) * Math.PI + Math.sin(t/300) * 0.5;
      const bullet = this.add.circle(this.bossContainer.x, this.bossContainer.y + 40, 8, 0xEC4899);
      this.physics.add.existing(bullet);
      this.bossBullets.add(bullet);
      const speed = 220;
      bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  spawnMinion(){
    const x = Phaser.Math.Between(60, this.W - 60);
    const alienKeys = ['alien_scout', 'alien_shooter', 'alien_elite'];
    const minion = this.add.sprite(x, -40, Phaser.Utils.Array.GetRandom(alienKeys)).setOrigin(0.5);
    this.physics.add.existing(minion);
    this.minions.add(minion);
    minion.body.setVelocityY(Phaser.Math.Between(120, 200));
  }

  hitMinion(laser, minion){
    laser.destroy();
    const mx = minion.x, my = minion.y;
    minion.destroy();
    this.score += 15;
    this.scoreText.setText('SCORE: ' + this.score);

    // Drop Power-up chance (40%)
    if(Math.random() < 0.4){
      const pTypes = ['🔫', '🛡️', '💣'];
      const pType = Phaser.Utils.Array.GetRandom(pTypes);
      const pMap = { '🔫': 'powerup_weapon', '🛡️': 'powerup_shield', '💣': 'powerup_nuke' };
      const pItem = this.add.sprite(mx, my, pMap[pType] || 'powerup_weapon').setOrigin(0.5);
      pItem.pType = pType;
      this.physics.add.existing(pItem);
      this.powerups.add(pItem);
      pItem.body.setVelocityY(100);
    }
  }

  collectPowerup(ship, powerup){
    const type = powerup.pType;
    powerup.destroy();

    if(type === '🔫'){
      this.hasTripleShot = true;
      showToast('🔫 TRIPLE SHOT POWER-UP!', 2000);
      this.time.delayedCall(8000, () => this.hasTripleShot = false);
    } else if(type === '🛡️'){
      this.hasShield = true;
      this.shieldAura.setVisible(true);
      showToast('🛡️ ENERGY SHIELD ACTIVATED!', 2000);
    } else if(type === '💣'){
      this.nukeCount++;
      this.powerText.setText(`💣 NUKES: ${this.nukeCount} [PRESS B]`);
      showToast('💣 ATOMIC BOMB ACQUIRED!', 2000);
    }
  }

  detonateNuke(){
    this.nukeCount--;
    this.powerText.setText(`💣 NUKES: ${this.nukeCount} [PRESS B]`);
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(300, 0.03);

    // Clear all boss bullets & minions
    this.bossBullets.clear(true, true);
    this.minions.clear(true, true);
    showToast('💣 BOOM! SCREEN CLEARED!', 2500);
  }

  triggerShieldSpellLock(){
    this.bossShielded = true;
    this.bossBarrier.setVisible(true);

    const targetWord = Phaser.Utils.Array.GetRandom(this.wordPool);
    const wrongs = this.wordPool.filter(w => w.ko !== targetWord.ko);
    Phaser.Utils.Array.Shuffle(wrongs);
    const options = Phaser.Utils.Array.Shuffle([targetWord, wrongs[0]||{ko:'우유'}, wrongs[1]||{ko:'빵'}, wrongs[2]||{ko:'밥'}]);

    // Show Spell Prompt Banner
    this.spellBanner = this.add.container(this.W/2, 170).setDepth(40);
    const sBg = this.add.rectangle(0, 0, 480, 45, 0x0F172A, 0.95).setStrokeStyle(3, 0x38BDF8);
    const sTxt = this.add.text(0, 0, `🎯 SHOOT THE KOREAN WORD FOR: "${targetWord.en}"`, {
      fontFamily:'"Press Start 2P",monospace', fontSize:'11px', color:'#FDE047'
    }).setOrigin(0.5);
    this.spellBanner.add([sBg, sTxt]);

    // Spawn 4 Word Orbs orbiting around Boss
    options.forEach((opt, idx) => {
      const angle = (idx / 4) * Math.PI * 2;
      const ox = this.bossContainer.x + Math.cos(angle) * 160;
      const oy = this.bossContainer.y + Math.sin(angle) * 160;

      const orbBg = this.add.rectangle(ox, oy, 110, 36, 0x1E293B, 0.9).setStrokeStyle(2, 0x38BDF8);
      const orbTxt = this.add.text(ox, oy, opt.ko, {
        fontFamily:'"Noto Sans KR",sans-serif', fontSize:'18px', color:'#FFFFFF', fontWeight:'bold'
      }).setOrigin(0.5);

      const container = this.add.container(0,0, [orbBg, orbTxt]).setDepth(35);
      container.word = opt;
      container.isCorrect = (opt.ko === targetWord.ko);
      this.physics.add.existing(container);
      container.body.setSize(110, 36);
      this.wordOrbs.add(container);

      // Orbit animation
      this.tweens.add({
        targets: container,
        x: { from: ox, to: ox + 40 },
        y: { from: oy, to: oy + 20 },
        duration: 2000 + idx*300,
        yoyo: true, repeat: -1, ease: 'Sine.InOut'
      });
    });
  }

  hitWordOrb(laser, orb){
    laser.destroy();
    const isCorrect = orb.isCorrect;
    const w = orb.word;

    this.wordOrbs.clear(true, true);
    if(this.spellBanner) this.spellBanner.destroy();

    if(isCorrect){
      playChiptuneSFX('quiz_correct');
      // Shield Shatter & Boss Stun!
      this.bossShielded = false;
      this.bossBarrier.setVisible(false);
      this.bossHP = Math.max(0, this.bossHP - 120);
      this.updateBossHPBar();

      showToast(`🎯 CRITICAL HIT! "${w.ko}" (${w.en}) SHATTERED SHIELD! +120 DMG!`, 3500);
      this.cameras.main.flash(200, 56, 189, 248);
    } else {
      playChiptuneSFX('quiz_wrong');
      showToast(`❌ WRONG WORD! Shield Reflected Damage!`, 2000);
      this.bossShielded = false;
      this.bossBarrier.setVisible(false);
    }
  }

  hitBoss(laser, boss){
    laser.destroy();
    if(this.bossShielded){
      showToast('🛡️ BOSS IS SHIELDED! SHOOT THE CORRECT WORD ORB!');
      return;
    }

    this.bossHP = Math.max(0, this.bossHP - 15);
    this.score += 10;
    this.scoreText.setText('SCORE: ' + this.score);
    this.updateBossHPBar();

    this.bossSprite.setTint(0xFF0000);
    this.time.delayedCall(100, () => this.bossSprite.clearTint());

    if(this.bossHP <= 0){
      this.bossDefeated();
    }
  }

  updateBossHPBar(){
    const pct = Math.max(0, this.bossHP / this.maxBossHP);
    this.bossBarFill.setSize(400 * pct, 14);
  }

  bossDefeated(){
    this.bossContainer.destroy();
    this.bossBarBg.destroy();
    this.bossBarFill.destroy();

    this.cameras.main.flash(500, 253, 224, 71);
    this.cameras.main.shake(400, 0.03);

    addGold(150);
    showToast('🎉 BOSS DEFEATED! VICTORY! +150 GOLD REWARD!', 5000);

    this.time.delayedCall(3000, () => this.exitGame());
  }

  hitPlayerWithBullet(ship, bullet){
    bullet.destroy();
    if(this.hasShield){
      this.hasShield = false;
      this.shieldAura.setVisible(false);
      showToast('🛡️ SHIELD ABSORBED HIT!');
      return;
    }

    this.playerHP = Math.max(0, this.playerHP - 20);
    this.hpText.setText(`❤️ HP: ${this.playerHP}/100`);
    this.cameras.main.shake(150, 0.02);

    this.ship.setTint(0xFF0000);
    this.time.delayedCall(150, () => this.ship.clearTint());

    if(this.playerHP <= 0){
      showToast('💀 SHIP DESTROYED IN SPACE!');
      this.exitGame();
    }
  }

  exitGame(){
    if (typeof leaderboardState !== 'undefined' && leaderboardState.personalBests) {
      if (this.score > (leaderboardState.personalBests.arcadeHighScore || 0)) {
        leaderboardState.personalBests.arcadeHighScore = this.score;
        if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
      }
    }
    const earned = Math.floor(this.score / 15);
    if(earned > 0){
      addGold(earned);
      showToast(`🕹️ Arcade Cleared: +${earned} Gold!`);
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }

  shutdown() {
    if (this.nearStarsGroup) this.nearStarsGroup.clear(true, true);
  }
}


// ═══════════════ DUNGEON CRAWLER ARPG SCENE ════════════════════════════════════
class DungeonScene extends Phaser.Scene {
  constructor(){ super({key:'DungeonScene'}); }
  
  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create(){
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.W = this.scale.width;

    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);
    
    // Dark Stone Floor Grid, Mossy Perimeter Walls & Glowing Runes using Tilemaps
    for(let x = 0; x < this.W + TILE; x += TILE){
      for(let y = 0; y < this.H + TILE; y += TILE){
        const isBorder = (x < TILE || x >= this.W - TILE || y < TILE || y >= this.H - TILE);
        if (isBorder) {
          this.add.image(x + TILE/2, y + TILE/2, 'tile_dungeon_wall_moss').setDisplaySize(TILE, TILE).setDepth(1);
        } else {
          const rndVal = (Math.sin(x * 12.3 + y * 45.6) * 10000) % 1;
          const absRnd = Math.abs(rndVal);
          let floorKey = 'tile_dungeon_floor';
          if (absRnd < 0.15) floorKey = 'tile_dungeon_cracked';
          else if (absRnd > 0.90) floorKey = 'tile_dungeon_rune';
          this.add.image(x + TILE/2, y + TILE/2, floorKey).setDisplaySize(TILE, TILE).setDepth(0);
        }
      }
    }
    
    this.ambientOverlay = this.add.rectangle(this.W/2, this.H/2, this.W*2, this.H*2, 0x090D16, 0.70)
      .setDepth(9990).setScrollFactor(0);
    this.lighting = new AmbientLightingSystem(this);
    this.shadows = new DynamicShadowSystem(this);

    // Ambient Torch Lights at corners/walls
    this.torchLights = [ 
      {x: TILE * 1.5, y: TILE * 1.5}, 
      {x: this.W - TILE * 1.5, y: TILE * 1.5}, 
      {x: TILE * 1.5, y: this.H - TILE * 1.5}, 
      {x: this.W - TILE * 1.5, y: this.H - TILE * 1.5},
      {x: this.W / 2, y: TILE * 1.5}
    ];
    this.torchLights.forEach(t => {
      this.add.circle(t.x, t.y, 44, 0xF59E0B, 0.20).setDepth(2);
      this.lighting.addLight(t.x, t.y, 'light_glow_torch', 1.2, 0.7);
      const torch = this.add.image(t.x, t.y, 'dungeon_torch').setDisplaySize(36, 48).setDepth(3);
      this.tweens.add({ targets: torch, scaleY: { from: 0.95, to: 1.08 }, duration: 350 + Math.random()*200, yoyo: true, repeat: -1 });

      if (this.textures && this.textures.exists('p_spark') && typeof this.add.particles === 'function') {
        try {
          this.add.particles(t.x, t.y - 12, 'p_spark', {
            speedY: { min: -30, max: -70 },
            speedX: { min: -10, max: 10 },
            lifespan: 700,
            quantity: 1,
            frequency: 250,
            scale: { start: 1, end: 0.2 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD'
          }).setDepth(4);
        } catch (e) {}
      }
    });

    // Player Hero
    this.playerHP = 100;
    this.maxPlayerHP = 100;
    this.lootedGold = 0;
    this.lootedScrolls = 0;
    this.monstersKilled = 0;

    this.player = this.add.sprite(this.W/2, this.H/2, 'player_walk_down_0').setOrigin(0.5);
    this.pShadow = this.shadows.createShadow(this.player, 30, 10, 15);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(30, 30);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.monsters = this.physics.add.group();
    this.lootGroup = this.physics.add.group();

    // Physics overlaps
    this.physics.add.overlap(this.player, this.lootGroup, this.collectLoot, null, this);
    this.physics.add.overlap(this.player, this.monsters, this.hitPlayer, null, this);

    // Spawn timer for monsters
    this.lastMonsterSpawn = 0;
    this.invulnerableTime = 0;

    // Vocab pool
    const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
    this.wordPool = all.length > 0 ? all : [{ko:'한글', en:'Hangeul', hint:'📝'}];

    // HUD Header
    this.hpText = this.add.text(20, 20, '❤️ HP: 100/100', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#EF4444'}).setDepth(100);
    this.goldText = this.add.text(20, 50, '💰 GOLD: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#F59E0B'}).setDepth(100);
    this.scrollText = this.add.text(20, 80, '📜 SCROLLS: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#A855F7'}).setDepth(100);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] LEAVE DUNGEON', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#EC4899'})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitBtn.on('pointerdown', () => this.exitDungeon());
    this.input.keyboard.on('keydown-ESC', () => this.exitDungeon());

    // Title Toast
    const title = this.add.text(this.W/2, this.H/2 - 60, '⚔️ ANCIENT DUNGEON\nWASD to Move | SPACE / Click to Slash!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'18px', color:'#EC4899', align:'center', lineHeight:1.5, stroke:'#000', strokeThickness:4
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets:title, alpha:0, delay:2500, duration:1000, onComplete:()=>title.destroy() });

    // Click to Slash
    this.input.on('pointerdown', () => this.playerSlash());

    // ── RESIZE HANDLER ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setBounds(0, 0, Math.max(gameSize.width, this.W), Math.max(gameSize.height, this.H));
    });
  }

  update(t, dt){
    if(this.playerHP <= 0) return;

    // Dynamic Y-sort for player and shadow
    const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
    this.player.setDepth(playerBaseY);
    if (this.pShadow) this.pShadow.setDepth(playerBaseY - 1);

    if (this.torchLights && this.pShadow && this.shadows) {
      let closestTorch = this.torchLights[0];
      let minDist = 99999;
      this.torchLights.forEach(torch => {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, torch.x, torch.y);
        if (d < minDist) { minDist = d; closestTorch = torch; }
      });
      if (closestTorch) {
        this.shadows.updatePointShadow(this.pShadow, closestTorch.x, closestTorch.y);
      }
    }

    // Movement
    let vx = 0, vy = 0;
    const speed = 280;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.player.body.setVelocity(vx, vy);

    if(vx !== 0 || vy !== 0){
      let animKey = 'player-walk-down';
      if(Math.abs(vx) >= Math.abs(vy)){
        animKey = vx < 0 ? 'player-walk-left' : 'player-walk-right';
      } else {
        animKey = vy < 0 ? 'player-walk-up' : 'player-walk-down';
      }
      this.player.setFlipX(false);
      this.player.anims.play(animKey, true);
    } else {
      this.player.anims.stop();
      this.player.setTexture('player_walk_down_0');
    }

    // Slash input
    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)){
      this.playerSlash();
    }

    // Spawn Monster loop
    if(t > this.lastMonsterSpawn){
      this.spawnMonster();
      this.lastMonsterSpawn = t + Phaser.Math.Between(1200, 2200);
    }

    // Monster AI & dynamic Y-sort
    this.monsters.children.entries.forEach(m => {
      if(m && m.active){
        this.physics.moveToObject(m, this.player, m.moveSpeed || 100);
        const mBaseY = m.y + (m.displayHeight * (1 - m.originY));
        m.setDepth(mBaseY);
      }
    });

    // Loot floating animation & dynamic Y-sort
    this.lootGroup.children.entries.forEach(l => {
      if(l && l.active){
        l.setDepth(l.y + 8);
        if(l.sparkle){
          l.sparkle.x = l.x; l.sparkle.y = l.y - 12;
          l.sparkle.setDepth(l.y + 9);
        }
      }
    });
  }


  playerSlash(){
    if(!this.player || !this.player.active) return;
    playChiptuneSFX('sword_swing');

    // Sword slash arc visual
    const slash = this.add.sprite(this.player.x, this.player.y - 10, 'laser_player').setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: slash,
      scale: { from: 0.8, to: 1.6 },
      alpha: { from: 1, to: 0 },
      angle: { from: -45, to: 45 },
      duration: 220,
      ease: 'Power1',
      onComplete: () => slash.destroy()
    });

    // Check hit monsters in range (90px)
    const deadMonsters = [];
    this.monsters.children.entries.forEach(m => {
      if(m && m.active){
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
        if(dist < 95){
          m.hp -= 35;
          m.setTint(0xFF0000);
          this.time.delayedCall(120, () => { if(m.active) m.clearTint(); });
          
          // Floating damage text
          const dmg = this.add.text(m.x, m.y - 20, '-35', {
            fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#22C55E', stroke:'#000', strokeThickness:3
          }).setOrigin(0.5).setDepth(60);
          this.tweens.add({ targets:dmg, y:m.y-50, alpha:0, duration:600, onComplete:()=>dmg.destroy() });

          if(m.hp <= 0) deadMonsters.push(m);
        }
      }
    });

    deadMonsters.forEach(m => this.killMonster(m));
  }

  spawnMonster(){
    const types = [
      { key: 'dungeon_green_slime', name: 'Slime', hp: 30, speed: 90 },
      { key: 'dungeon_goblin_warrior', name: 'Goblin Warrior', hp: 50, speed: 120 },
      { key: 'dungeon_skeleton_archer', name: 'Skeleton Archer', hp: 40, speed: 110 },
      { key: 'dungeon_boss', name: 'Mini Boss', hp: 80, speed: 70 }
    ];
    const type = Phaser.Utils.Array.GetRandom(types);
    const word = Phaser.Utils.Array.GetRandom(this.wordPool) || {ko:'한글', en:'Hangeul'};

    let x, y;
    if(Math.random() < 0.5){
      x = Math.random() < 0.5 ? 20 : this.W - 20;
      y = Phaser.Math.Between(40, this.H - 40);
    } else {
      x = Phaser.Math.Between(40, this.W - 40);
      y = Math.random() < 0.5 ? 20 : this.H - 20;
    }

    const monster = this.add.sprite(x, y, type.key).setOrigin(0.5).setDepth(10);
    this.physics.add.existing(monster);
    monster.body.setSize(36, 36);
    monster.hp = type.hp;
    monster.moveSpeed = type.speed;
    monster.word = word;

    this.monsters.add(monster);
  }

  killMonster(m){
    const mx = m.x, my = m.y;
    const word = m.word;
    const isBoss = m.isBoss;
    m.destroy();

    this.monstersKilled++;
    checkQuestProgress('kill', { count: 1 });

    if (isBoss) {
      addCoins(200);
      addGems(10);
      addHonor(50);
      if (this.playerHP >= 100) {
        addGems(15);
        showToast('🛡️ ZERO-DAMAGE DUNGEON BOSS KILL! +15 Bonus Gems!', 4500);
      }
      showToast('🎉 DUNGEON BOSS DEFEATED! +200 Coins, +10 Gems, +50 Honor!', 5000);
    }

    if (this.monstersKilled >= 5 && !this.bossPortal) {
      this.spawnBossPortal();
    }

    for(let i=0; i<8; i++){
      const p = this.add.rectangle(mx, my, 5, 5, 0xA855F7).setDepth(20);
      this.tweens.add({
        targets: p,
        x: mx + Phaser.Math.Between(-50, 50),
        y: my + Phaser.Math.Between(-50, 50),
        scale: 0,
        duration: 500,
        onComplete: () => p.destroy()
      });
    }

    // Drop Vocab Scroll 📜
    const lootKeys = ['loot_scroll', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_chest'];
    const lKey = Phaser.Utils.Array.GetRandom(lootKeys);
    const loot = this.add.sprite(mx, my, lKey).setOrigin(0.5).setDepth(15);
    this.physics.add.existing(loot);
    loot.body.setSize(30, 30);
    loot.word = word;

    loot.sparkle = this.add.sprite(mx, my - 12, 'sparkle').setOrigin(0.5).setDepth(16);
    this.tweens.add({ targets: loot.sparkle, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });
    this.tweens.add({ targets: loot, y: my - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.lootGroup.add(loot);
  }

  spawnBossPortal(){
    if(this.bossPortal) return;
    const portal = this.add.sprite(this.W/2, 100, 'dungeon_portal').setOrigin(0.5).setDepth(20);
    this.physics.add.existing(portal);
    portal.body.setSize(48, 48);
    this.bossPortal = portal;

    this.add.text(this.W/2, 140, 'BOSS CHAMBER PORTAL', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px', color:'#EC4899', stroke:'#000', strokeThickness:3
    }).setOrigin(0.5).setDepth(21);

    this.physics.add.overlap(this.player, portal, () => {
      if(this.bossTriggered) return;
      this.bossTriggered = true;
      startBossGateChallenge('dungeon', 3, (passed) => {
        if(passed){
          this.spawnDungeonBoss();
        } else {
          this.bossTriggered = false;
          this.spawnMonster();
          this.spawnMonster();
        }
      });
    }, null, this);
  }

  spawnDungeonBoss(){
    if(this.bossPortal) this.bossPortal.destroy();
    const bossList = [
      { key: 'boss_fire_golem', name: '🔥 MOLTEN FIRE GOLEM' },
      { key: 'boss_shadow_dragon', name: '🐉 VOID SHADOW DRAGON' },
      { key: 'boss_ice_lich', name: '❄️ FROZEN ICE LICH' },
      { key: 'boss_cyber_kraken', name: '🐙 CYBER KRAKEN' },
      { key: 'dungeon_boss', name: '👹 KING SEJONG\'S CORRUPTED SENTINEL' }
    ];
    const chosen = Phaser.Utils.Array.GetRandom(bossList);
    showToast(`👹 ${chosen.name} SPAWNED!`, 4000);
    const boss = this.add.sprite(this.W/2, 120, chosen.key).setOrigin(0.5).setDepth(30);
    this.physics.add.existing(boss);
    boss.setDisplaySize(64, 64);
    boss.body.setSize(60, 60);
    boss.hp = 350;
    boss.moveSpeed = 85;
    boss.isBoss = true;
    boss.word = { ko: '왕', en: 'King' };
    this.monsters.add(boss);
  }

  collectLoot(player, loot){
    const word = loot.word;
    if(loot.sparkle) loot.sparkle.destroy();
    loot.destroy();

    this.lootedScrolls++;
    this.lootedGold += 25;

    this.goldText.setText(`💰 COINS: ${this.lootedGold}`);
    this.scrollText.setText(`📜 SCROLLS: ${this.lootedScrolls}`);

    this.showLootFlashcard(word);
  }

  showLootFlashcard(w){
    if(this.currentCard) this.currentCard.destroy();

    const card = this.add.container(this.W/2, 70).setDepth(200);
    const bg = this.add.rectangle(0, 0, 280, 70, 0x1E1B4B, 0.95).setStrokeStyle(3, 0xA855F7).setOrigin(0.5);
    const tk = this.add.text(0, -12, w.ko, {fontFamily:'"Noto Sans KR", sans-serif', fontSize:'28px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
    const te = this.add.text(0, 16, w.en, {fontFamily:'"Be Vietnam Pro", sans-serif', fontSize:'15px', color:'#C084FC', fontWeight:'bold'}).setOrigin(0.5);
    card.add([bg, tk, te]);

    this.currentCard = card;

    this.tweens.add({
      targets: card,
      scale: { from: 0.8, to: 1 },
      duration: 200,
      ease: 'Back.Out'
    });

    this.time.delayedCall(2200, () => {
      if(this.currentCard === card){
        this.tweens.add({
          targets: card,
          alpha: 0,
          y: 40,
          duration: 400,
          onComplete: () => card.destroy()
        });
      }
    });
  }

  hitPlayer(player, monster){
    if(this.time.now < this.invulnerableTime) return;
    this.invulnerableTime = this.time.now + 800;

    this.playerHP = Math.max(0, this.playerHP - 15);
    this.hpText.setText(`❤️ HP: ${this.playerHP}/100`);

    this.cameras.main.shake(200, 0.02);
    this.player.setTint(0xFF0000);
    this.time.delayedCall(200, () => { if(this.player.active) this.player.clearTint(); });

    if(this.playerHP <= 0){
      this.exitDungeon(true);
    }
  }

  exitDungeon(failed = false){
    const floorReached = Math.floor((this.monstersKilled || 0) / 5) + 1;
    if (typeof leaderboardState !== 'undefined' && leaderboardState.personalBests) {
      if (floorReached > (leaderboardState.personalBests.dungeonMaxFloor || 0)) {
        leaderboardState.personalBests.dungeonMaxFloor = floorReached;
        if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
      }
    }

    if(this.lootedGold > 0){
      addCoins(this.lootedGold);
    }

    if(failed){
      showToast(`💀 Defeated in Dungeon! Earned +${this.lootedGold} Coins & ${this.lootedScrolls} Vocab Scrolls!`, 4000);
    } else {
      showToast(`⚔️ Dungeon Cleared! Defeated ${this.monstersKilled} Monsters & Looted +${this.lootedGold} Coins!`, 4000);
    }

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }

  shutdown() {
    // Clear dungeon scene references and lighting overlays
  }
}


// ═══════════════ STARDEW-STYLE FISHING MINIGAME SCENE ════════════════════════
class FishingScene extends Phaser.Scene {
  constructor(){ super({key:'FishingScene'}); }

  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create(){
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.W = this.scale.width;

    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    // Ocean Coastline & Beach Terrain using Tilemaps
    // 1. Deep Ocean Water grid & Foam Border using animated TileSprites
    const oceanKey = (this.textures && this.textures.exists('tile_ocean_deep_0')) ? 'tile_ocean_deep_0' : 'tile_ocean_deep';
    this.oceanTileSprite = this.add.tileSprite(this.W/2, (this.H - 144)/2, this.W, this.H - 144, oceanKey).setDepth(0);
    const foamKey = (this.textures && this.textures.exists('tile_water_foam_0')) ? 'tile_water_foam_0' : 'tile_water_foam_border';
    this.foamTileSprite = this.add.tileSprite(this.W/2, this.H - 144 + TILE/2, this.W, TILE, foamKey).setDepth(1);
    this.waterFrame = 0;
    this.waterTimer = 0;

    if (this.textures && this.textures.exists('p_splash') && typeof this.add.particles === 'function') {
      try {
        this.splashEmitter = this.add.particles(0, 0, 'p_splash', {
          speed: { min: 30, max: 100 },
          angle: { min: 220, max: 320 },
          scale: { start: 1.2, end: 0.2 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 500,
          emitting: false
        }).setDepth(10);
      } catch (e) {}
    }
    // 3. Sandy Beach grid in lower shoreline area (y: H - 96 .. H)
    for(let x = 0; x < this.W + TILE; x += TILE){
      for(let y = this.H - 96; y < this.H + TILE; y += TILE){
        const sandKey = (Math.floor(x / TILE) + Math.floor(y / TILE)) % 3 === 0 ? 'tile_sand_wet' : 'tile_sand';
        this.add.image(x + TILE/2, y + TILE/2, sandKey).setDisplaySize(TILE, TILE).setDepth(0);
      }
    }

    // 4. Rocky Shore & Beach details scattered along shoreline
    this.add.image(60, this.H - 120, 'tile_rock_shore').setDisplaySize(TILE, TILE).setDepth(1);
    this.add.image(this.W - 60, this.H - 120, 'tile_rock_shore').setDisplaySize(TILE, TILE).setDepth(1);
    this.add.image(140, this.H - 60, 'tile_seashell').setDisplaySize(32, 32).setDepth(1);
    this.add.image(this.W - 150, this.H - 50, 'tile_starfish').setDisplaySize(32, 32).setDepth(1);
    this.add.image(220, this.H - 45, 'tile_driftwood').setDisplaySize(40, 24).setDepth(1);
    this.add.image(this.W - 240, this.H - 55, 'tile_seashell').setDisplaySize(28, 28).setDepth(1);

    // Sunlight Caustics Light Rays
    for(let i=0; i<6; i++){
      const ray = this.add.polygon(i * (this.W/5), 0, [0,0, 80,0, 140,this.H, 0,this.H], 0x38BDF8, 0.08).setOrigin(0).setDepth(1);
      this.tweens.add({ targets:ray, alpha:0.18, duration:3000+i*500, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    }

    // Floating Water Bubbles
    for(let i=0; i<20; i++){
      const bx = Math.random()*this.W, by = Math.random()*(this.H - 144);
      const bubble = this.add.circle(bx, by, Phaser.Math.Between(2, 5), 0x67E8F9, 0.4).setDepth(1);
      this.tweens.add({
        targets: bubble,
        y: by - 100,
        alpha: 0.1,
        duration: 3000 + Math.random()*2000,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    // 5. Wooden Pier Dock with Lanterns
    const pierY = this.H - 75;
    for(let px = TILE/2; px < this.W; px += TILE){
      this.add.image(px, pierY, 'tile_pier_plank').setDisplaySize(TILE, TILE).setDepth(2);
    }
    // Lanterns on Dock Posts
    [100, this.W - 100].forEach(lx => {
      this.add.image(lx, pierY - 15, 'tile_pier_lantern').setDisplaySize(36, 48).setDepth(3);
    });

    this.player = this.add.sprite(this.W/2, this.H - 110, 'player_walk_down_0').setOrigin(0.5).setDepth(10);

    // State: 'CASTING', 'WAITING', 'REELING', 'CATCH_QUIZ'
    this.state = 'CASTING';
    this.catchProgress = 0;
    this.targetFish = null;

    // UI Header Frame
    const infoBg = this.add.rectangle(this.W/2, 60, 520, 50, 0x0F172A, 0.9)
      .setStrokeStyle(3, 0x38BDF8).setOrigin(0.5);
    this.infoTxt = this.add.text(this.W/2, 60, '🎣 CLICK OR PRESS SPACE TO CAST LINE!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'13px', color:'#FDE047', align:'center'
    }).setOrigin(0.5);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] LEAVE POND', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'13px', color:'#7DD3FC', backgroundColor:'rgba(15,23,42,0.8)', padding:{x:8,y:4}
    }).setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitBtn.on('pointerdown', () => this.exitFishing());
    this.input.keyboard.on('keydown-ESC', () => this.exitFishing());

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => this.handleAction());

    this.buildTensionBar();
  }

  buildTensionBar(){
    this.barX = this.W/2 + 200;
    this.barY = this.H/2;
    this.barHeight = 260;
    this.barWidth = 44;

    this.meterBg = this.add.rectangle(this.barX, this.barY, this.barWidth, this.barHeight, 0x0F172A, 0.9)
      .setStrokeStyle(3, 0x38BDF8).setVisible(false);

    // Green Catching Zone (WIDER 110px FOR EASY & SMOOTH GAMEPLAY)
    this.catchZoneHeight = 110;
    this.catchZoneY = this.barY + this.barHeight/2 - this.catchZoneHeight/2;
    this.catchZone = this.add.rectangle(this.barX, this.catchZoneY, this.barWidth - 4, this.catchZoneHeight, 0x22C55E, 0.75)
      .setStrokeStyle(2, 0x4ADE80).setOrigin(0.5, 0).setVisible(false);

    // Fish Icon inside bar
    this.fishIconY = this.barY;
    this.fishIcon = this.add.sprite(this.barX, this.fishIconY, 'fishing_salmon')
      .setOrigin(0.5).setVisible(false);

    // Progress Bar (Left of tension bar)
    this.pbBg = this.add.rectangle(this.barX - 35, this.barY, 16, this.barHeight, 0x1E293B)
      .setStrokeStyle(2, 0x38BDF8).setVisible(false);
    this.pbFill = this.add.rectangle(this.barX - 35, this.barY + this.barHeight/2, 14, 0, 0x38BDF8)
      .setOrigin(0.5, 1).setVisible(false);

    // Dynamic "HOLD SPACE" helper label next to tension bar
    this.holdTip = this.add.text(this.barX - 110, this.barY, 'HOLD SPACE\nTO REEL!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px', color:'#4ADE80', align:'center', stroke:'#000', strokeThickness:3
    }).setOrigin(0.5).setVisible(false);

    // ── RESIZE HANDLER ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setBounds(0, 0, Math.max(gameSize.width, this.W), Math.max(gameSize.height, this.H));
    });
  }

  handleAction(){
    if(this.state === 'CASTING'){
      this.castLine();
    }
  }

  castLine(){
    playChiptuneSFX('fishing_pull');
    this.state = 'WAITING';
    this.infoTxt.setText('⏳ Waiting for a bite...');

    // Floating bobber with water ripples
    this.bobber = this.add.sprite(this.W/2 + Phaser.Math.Between(-60, 60), this.H/2 + 20, 'fishing_bobber').setOrigin(0.5);
    this.tweens.add({ targets: this.bobber, y: this.H/2 + 28, duration: 600, yoyo: true, repeat: -1 });

    if (this.splashEmitter && this.bobber) {
      try { this.splashEmitter.explode(8, this.bobber.x, this.bobber.y); } catch(e) {}
    }

    const waitTime = Phaser.Math.Between(1500, 3000);
    this.time.delayedCall(waitTime, () => {
      if(this.state !== 'WAITING') return;
      this.triggerBite();
    });
  }

  triggerBite(){
    playChiptuneSFX('fishing_pull');
    this.state = 'REELING';
    this.infoTxt.setText('❗ BITE! Hold SPACE to keep fish in Green Zone!');

    if (this.splashEmitter && this.bobber) {
      try { this.splashEmitter.explode(12, this.bobber.x, this.bobber.y); } catch(e) {}
    }

    const ex = this.add.text(this.bobber.x, this.bobber.y - 35, '💦 BITE!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'24px', color:'#EF4444', stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);
    this.tweens.add({ targets:ex, scale:1.4, alpha:0, duration:800, onComplete:()=>ex.destroy() });

    // Show Tension Bar & Helpers
    this.meterBg.setVisible(true);
    this.catchZone.setVisible(true);
    this.fishIcon.setVisible(true);
    this.pbBg.setVisible(true);
    this.pbFill.setVisible(true);
    this.holdTip.setVisible(true);

    this.catchProgress = 0.45; // Start 45% full
    this.targetFish = Phaser.Utils.Array.GetRandom(FISH_DB);
    const fishTexMap = {
      '연어': 'fishing_salmon',
      '고등어': 'fishing_mackerel',
      '오징어': 'fishing_squid',
      '잉어': 'fishing_carp',
      '새우': 'fishing_shrimp',
      '문어': 'fishing_octopus',
      '조개': 'fishing_clam',
      '황금물고기': 'fishing_golden_fish'
    };
    const texKey = fishTexMap[this.targetFish.ko] || 'fishing_salmon';
    this.fishIcon.setTexture(texKey);

    this.catchZoneVelocity = 0;
  }

  update(t, dt){
    this.waterTimer = (this.waterTimer || 0) + (dt || 16);
    if (this.waterTimer > 180) {
      this.waterTimer = 0;
      this.waterFrame = ((this.waterFrame || 0) + 1) % 4;
      if (this.textures && this.textures.exists(`tile_ocean_deep_${this.waterFrame}`)) {
        this.oceanTileSprite.setTexture(`tile_ocean_deep_${this.waterFrame}`);
      }
      if (this.textures && this.textures.exists(`tile_water_foam_${this.waterFrame}`)) {
        this.foamTileSprite.setTexture(`tile_water_foam_${this.waterFrame}`);
      }
    }
    if (this.oceanTileSprite) this.oceanTileSprite.tilePositionX += 0.4;
    if (this.foamTileSprite) this.foamTileSprite.tilePositionX -= 0.6;
    if(this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.state === 'CASTING'){
      this.castLine();
    }

    if(this.state !== 'REELING') return;

    // Smooth Tension Zone control with SPACE or Mouse Hold
    const isHolding = this.spaceKey.isDown || this.input.activePointer.isDown;
    if(isHolding){
      this.catchZoneVelocity -= 0.5;
    } else {
      this.catchZoneVelocity += 0.4;
    }
    this.catchZoneVelocity *= 0.90;
    this.catchZoneY = Phaser.Math.Clamp(this.catchZoneY + this.catchZoneVelocity, this.barY - this.barHeight/2, this.barY + this.barHeight/2 - this.catchZoneHeight);
    this.catchZone.setY(this.catchZoneY);

    // Smooth Sinewave Fish Movement (Smooth & Predictable!)
    const fishTargetY = this.barY + Math.sin(t / 600) * 75;
    this.fishIconY += (fishTargetY - this.fishIconY) * 0.08;
    this.fishIcon.setY(this.fishIconY);

    // Check if Fish is inside Catch Zone
    const fishTop = this.fishIconY - 10, fishBot = this.fishIconY + 10;
    const zoneTop = this.catchZoneY, zoneBot = this.catchZoneY + this.catchZoneHeight;
    const inside = fishTop >= zoneTop && fishBot <= zoneBot;

    if(inside){
      this.catchProgress = Math.min(1.0, this.catchProgress + 0.012); // Fills fast in ~2 seconds!
      this.catchZone.setFillStyle(0x22C55E, 0.85);
      this.holdTip.setText('🟢 REELING IN!').setColor('#4ADE80');
    } else {
      this.catchProgress = Math.max(0.0, this.catchProgress - 0.0015); // Very forgiving penalty!
      this.catchZone.setFillStyle(0xEF4444, 0.85);
      this.holdTip.setText('⚠️ HOLD SPACE!').setColor('#EF4444');
    }

    // Update Progress Bar
    const currentH = this.barHeight * this.catchProgress;
    this.pbFill.setSize(14, currentH);

    if(this.catchProgress >= 1.0){
      this.startVocabChallenge();
    } else if(this.catchProgress <= 0.0){
      this.loseFish();
    }
  }

  startVocabChallenge(){
    this.state = 'CATCH_QUIZ';
    this.hideTensionBar();

    const fish = this.targetFish;
    this.infoTxt.setText(`🐟 Reeled in ${fish.hint} ${fish.ko} [${fish.rom}]! Answer to Catch!`);

    // Pick 3 random wrong fish choices
    const wrongs = FISH_DB.filter(f => f.ko !== fish.ko);
    Phaser.Utils.Array.Shuffle(wrongs);
    const choices = Phaser.Utils.Array.Shuffle([fish, wrongs[0], wrongs[1], wrongs[2]]);

    // Render Quiz Card Overlay
    const container = this.add.container(this.W/2, this.H/2).setDepth(200);
    const bg = this.add.rectangle(0, 0, 360, 240, 0x0F172A, 0.95).setStrokeStyle(3, 0x38BDF8).setOrigin(0.5);
    const title = this.add.text(0, -90, `What is the English for "${fish.ko}"?`, {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px', color:'#38BDF8', align:'center'
    }).setOrigin(0.5);

    container.add([bg, title]);

    choices.forEach((c, idx) => {
      const cx = (idx % 2 === 0 ? -85 : 85);
      const cy = (idx < 2 ? -30 : 30);
      const btnBg = this.add.rectangle(cx, cy, 150, 44, 0x1E293B).setStrokeStyle(2, 0x0284C7).setInteractive({useHandCursor:true});
      const txt = this.add.text(cx, cy, c.en, {fontFamily:'"Be Vietnam Pro",sans-serif', fontSize:'15px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
      
      btnBg.on('pointerdown', () => {
        if(c.ko === fish.ko){
          playChiptuneSFX('quiz_correct');
          btnBg.setFillStyle(0x15803D);
          this.time.delayedCall(400, () => {
            container.destroy();
            this.catchSuccess(fish);
          });
        } else {
          playChiptuneSFX('quiz_wrong');
          btnBg.setFillStyle(0xB91C1C);
          this.cameras.main.shake(150, 0.01);
        }
      });

      container.add([btnBg, txt]);
    });
  }

  catchSuccess(fish){
    playChiptuneSFX('quiz_correct');
    playChiptuneSFX('harvest');
    fishAlbumSave[fish.ko] = (fishAlbumSave[fish.ko] || 0) + 1;
    addCoins(35);

    if (typeof addIngredient === 'function') addIngredient(fish.ko, 1);

    if (fish.rarity === 'Legendary' || fish.ko === '황금물고기') {
      addGems(5);
      showToast(`🌟 LEGENDARY CATCH! ${fish.hint} ${fish.ko} (${fish.en})! +35 Coins & +5 Gems!`, 4500);
    } else {
      showToast(`🎉 Caught ${fish.hint} ${fish.ko} (${fish.en})! +35 Coins!`, 4000);
    }

    checkQuestProgress('fish', { count: 1 });

    if(this.bobber) this.bobber.destroy();

    this.state = 'CASTING';
    this.infoTxt.setText('🎣 Caught! Press SPACE / Click to Cast Again!');
  }


  loseFish(){
    this.state = 'CASTING';
    this.hideTensionBar();
    if(this.bobber) this.bobber.destroy();
    showToast('💨 The fish got away! Try again.');
    this.infoTxt.setText('🎣 Click or Press SPACE to Cast Line Again!');
  }

  hideTensionBar(){
    this.meterBg.setVisible(false);
    this.catchZone.setVisible(false);
    this.fishIcon.setVisible(false);
    this.pbBg.setVisible(false);
    this.pbFill.setVisible(false);
    if(this.holdTip) this.holdTip.setVisible(false);
  }

  exitFishing(){
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }

  shutdown() {
    if (this.splashEmitter) {
      try { this.splashEmitter.destroy(); } catch(e){}
    }
  }
}


// ═══════════════ BEE SHOOTING MINIGAME SCENE ═════════════════════════════════
class BeeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BeeScene' });
  }

  preload() {
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    for (let x = 0; x < this.W + 48; x += 48) {
      for (let y = 0; y < this.H + 48; y += 48) {
        this.add.image(x + 24, y + 24, 'tile_grass_base').setDisplaySize(48, 48).setDepth(0);
      }
    }

    if (this.textures.exists('p_pollen') && typeof this.add.particles === 'function') {
      try {
        this.pollenEmitter = this.add.particles(0, 0, 'p_pollen', {
          speed: { min: 40, max: 140 },
          scale: { start: 1.2, end: 0.2 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          emitting: false
        }).setDepth(50);
      } catch (e) {}
    }

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctHits = 0;
    this.totalClicks = 0;
    this.currentWordIndex = 0;
    this.activeBees = [];
    this.isRoundOver = false;

    this.wordList = getUnlockedWords();
    if (!this.wordList || this.wordList.length === 0) {
      this.wordList = (typeof levelsData !== 'undefined' && levelsData[0]?.words)
        ? levelsData[0].words
        : [{ ko: '벌', en: 'bee', hint: '🐝' }];
    }

    let shuffled = Phaser.Utils.Array.Shuffle([...this.wordList]);
    while (shuffled.length < 10) {
      shuffled = shuffled.concat(Phaser.Utils.Array.Shuffle([...this.wordList]));
    }
    this.roundWords = shuffled.slice(0, 10);

    this.bannerBg = this.add.rectangle(this.W / 2, 45, 520, 56, 0x0F172A, 0.85)
      .setStrokeStyle(3, 0xF59E0B).setDepth(100);

    this.targetText = this.add.text(this.W / 2, 45, '', {
      fontFamily: '"Press Start 2P", "Galmuri11", monospace',
      fontSize: '18px',
      color: '#FDE047',
      stroke: '#0F172A',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setDepth(101);

    this.hudText = this.add.text(20, 20, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#FFFFFF',
      stroke: '#0F172A',
      strokeThickness: 4,
      lineSpacing: 6
    }).setDepth(100);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] EXIT', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#FF66B2',
      stroke: '#0F172A',
      strokeThickness: 4,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(100);

    exitBtn.on('pointerdown', () => this.exitMinigame());
    this.input.keyboard.on('keydown-ESC', () => this.exitMinigame());

    this.startWordWave();
  }

  startWordWave() {
    if (this.isRoundOver) return;

    this.activeBees.forEach(b => b.container.destroy());
    this.activeBees = [];

    if (this.currentWordIndex >= 10) {
      this.showResultsSummary();
      return;
    }

    const currentTarget = this.roundWords[this.currentWordIndex];
    const hintEmoji = currentTarget.hint ? ` ${currentTarget.hint}` : '';
    this.targetText.setText(`TARGET: "${currentTarget.en.toUpperCase()}"${hintEmoji}`);
    this.updateHUD();

    const distractors = this.wordList.filter(w => w.ko !== currentTarget.ko);
    const shuffledDistractors = Phaser.Utils.Array.Shuffle([...distractors]).slice(0, 3);
    const waveWords = Phaser.Utils.Array.Shuffle([currentTarget, ...shuffledDistractors]);

    const trajectories = ['linear', 'sine', 'zigzag'];
    const numBees = waveWords.length;
    const verticalSpacing = Math.floor((this.H - 240) / Math.max(1, numBees));

    waveWords.forEach((wordObj, i) => {
      const isRightToLeft = (i % 2 === 1);
      const startX = isRightToLeft ? (this.W + 80 + i * 40) : (-80 - i * 40);
      const baseY = 140 + i * verticalSpacing + Math.floor(Math.random() * 20);
      const trajectoryType = trajectories[i % trajectories.length];

      const container = this.add.container(startX, baseY).setDepth(10);
      const sprite = this.add.sprite(0, 0, 'bee_fly_0').setDisplaySize(48, 48);
      if (isRightToLeft) sprite.setFlipX(true);

      const text = this.add.text(0, 28, wordObj.ko, {
        fontFamily: '"Press Start 2P", "Galmuri11", sans-serif',
        fontSize: '15px',
        color: '#FFFFFF',
        stroke: '#0F172A',
        strokeThickness: 5,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5, 0);

      container.add([sprite, text]);
      container.setSize(60, 60);
      container.setInteractive({ useHandCursor: true });

      const speed = 100 + Math.random() * 40;
      const beeData = {
        container,
        sprite,
        wordObj,
        isCorrect: (wordObj.ko === currentTarget.ko),
        trajectory: trajectoryType,
        startX,
        baseY,
        dir: isRightToLeft ? -1 : 1,
        speed,
        amp: 35 + Math.random() * 25,
        freq: 2.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        zigzagTimer: 0,
        zigzagVy: 70
      };

      container.on('pointerdown', () => this.onBeeClicked(beeData));
      this.activeBees.push(beeData);
    });
  }

  onBeeClicked(bee) {
    if (this.isRoundOver) return;
    this.totalClicks++;

    if (bee.isCorrect) {
      this.correctHits++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const comboBonus = (this.combo - 1) * 20;
      const pts = 100 + comboBonus;
      this.score += pts;

      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');

      if (this.pollenEmitter) {
        this.pollenEmitter.emitParticleAt(bee.container.x, bee.container.y, 20);
      }

      const comboLabel = this.combo > 1 ? ` +${pts} (${this.combo}x Combo!)` : ` +${pts}`;
      const floatTxt = this.add.text(bee.container.x, bee.container.y - 20, comboLabel, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#FDE047',
        stroke: '#000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(30);

      this.tweens.add({
        targets: floatTxt,
        y: bee.container.y - 65,
        alpha: 0,
        duration: 950,
        ease: 'Power1',
        onComplete: () => floatTxt.destroy()
      });

      this.currentWordIndex++;
      this.startWordWave();
    } else {
      this.combo = 0;
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');

      this.cameras.main.shake(150, 0.012);

      bee.sprite.setTint(0xFF4444);
      this.time.delayedCall(300, () => {
        if (bee.sprite && bee.sprite.active) bee.sprite.clearTint();
      });

      this.tweens.add({
        targets: bee.container,
        x: bee.container.x + (bee.dir * -12),
        duration: 60,
        yoyo: true,
        repeat: 3
      });

      this.updateHUD();
    }
  }

  updateHUD() {
    const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;
    this.hudText.setText(`WORD: ${Math.min(10, this.currentWordIndex + 1)}/10\nSCORE: ${this.score}\nACCURACY: ${accuracy}%\nCOMBO: ${this.combo}x`);
  }

  update(time, delta) {
    if (this.isRoundOver) return;
    const dt = delta / 1000;

    this.activeBees.forEach(b => {
      if (!b.container || !b.container.active) return;

      const frameIdx = Math.floor(time / 130) % 2;
      b.sprite.setTexture(frameIdx === 0 ? 'bee_fly_0' : 'bee_fly_1');

      b.container.x += b.dir * b.speed * dt;

      if (b.trajectory === 'sine') {
        b.container.y = b.baseY + Math.sin((time / 1000) * b.freq + b.phase) * b.amp;
      } else if (b.trajectory === 'zigzag') {
        b.container.y += b.zigzagVy * dt;
        if (b.container.y > b.baseY + 45) b.zigzagVy = -Math.abs(b.zigzagVy);
        if (b.container.y < b.baseY - 45) b.zigzagVy = Math.abs(b.zigzagVy);
      }

      if (b.dir === 1 && b.container.x > this.W + 90) b.container.x = -80;
      if (b.dir === -1 && b.container.x < -90) b.container.x = this.W + 80;
    });
  }

  showResultsSummary() {
    this.isRoundOver = true;
    this.activeBees.forEach(b => b.container.destroy());
    this.activeBees = [];

    const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;

    const baseHoney = Math.max(1, Math.floor(this.score / 300));
    const bonusHoney = accuracy >= 90 ? 1 : 0;
    const totalHoney = baseHoney + bonusHoney;

    if (typeof addItemToInventory === 'function') {
      addItemToInventory('honey', totalHoney);
    }
    if (typeof showToast === 'function') {
      showToast('🍯 + ' + totalHoney + ' Honey added to inventory!');
    }

    this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0.6).setDepth(200);

    const modalWidth = Math.min(480, this.W - 40);
    const modalHeight = 320;
    this.add.rectangle(this.W / 2, this.H / 2, modalWidth, modalHeight, 0x0F172A, 0.94)
      .setStrokeStyle(4, 0xF59E0B).setDepth(201);

    this.add.text(this.W / 2, this.H / 2 - 110, '🐝 BEEHIVE HARVEST COMPLETE!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#FDE047',
      align: 'center'
    }).setOrigin(0.5).setDepth(202);

    const summaryText = 
      `SCORE: ${this.score}\n\n` +
      `ACCURACY: ${accuracy}%\n\n` +
      `MAX COMBO: ${this.maxCombo}x\n\n` +
      `HONEY REWARD: +${totalHoney} 🍯`;

    this.add.text(this.W / 2, this.H / 2 - 20, summaryText, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5).setDepth(202);

    const closeBtn = this.add.text(this.W / 2, this.H / 2 + 105, '[ RETURN TO FARM ]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#4ADE80',
      stroke: '#0F172A',
      strokeThickness: 3,
      backgroundColor: '#1E293B',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(202);

    closeBtn.on('pointerdown', () => this.exitMinigame());
  }

  exitMinigame() {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }
}


// ══════════════ FISH ALBUM OVERLAY LOGIC ══════════════════════════════════════
window.openFishAlbum = function(){
  playChiptuneSFX('click');
  const overlay = document.getElementById('fish-album-overlay');
  const grid = document.getElementById('fish-album-grid');
  if(!overlay || !grid) return;

  grid.innerHTML = '';
  FISH_DB.forEach(f => {
    const count = fishAlbumSave[f.ko] || 0;
    const unlocked = count > 0;
    const card = document.createElement('div');
    card.className = `fish-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="fish-card-icon">${f.hint}</div>
      <div class="fish-card-ko">${unlocked ? f.ko : '???'}</div>
      <div class="fish-card-rom">[${f.rom}]</div>
      <div class="fish-card-en">${unlocked ? f.en : 'Locked'}</div>
      <div class="fish-card-catches">${unlocked ? `Caught ×${count}` : '🔒 Uncaught'}</div>`;
    grid.appendChild(card);
  });

  setModalState('fish-album-overlay', true);
};

window.closeFishAlbum = function(){
  playChiptuneSFX('click');
  setModalState('fish-album-overlay', false);
};


// ═══════════════ PHASER CONFIG ════════════════════════════════════════════════
const config={
  type:Phaser.AUTO,
  width:window.innerWidth, height:window.innerHeight,
  backgroundColor:'#3A7015',
  render:{pixelArt:true, antialias:false, antialiasGL:false, roundPixels:true},
  physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
  scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene],
  parent:document.body,
  scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
};
const game=new Phaser.Game(config);

// ══════════════ MEMORY MINIGAME ══════════════════════════════════════════════
let memoryCards = [];
let flippedIndices = [];
let matchedPairs = 0;
let memoryFlips = 0;

window.openMemoryGame = function(){
  if(memoryOpen) return;
  playChiptuneSFX('click');
  memoryOpen = true;
  const overlay = document.getElementById('memory-overlay');
  const grid = document.getElementById('memory-grid');
  document.getElementById('memory-matches').textContent = 'Matches: 0/8';
  document.getElementById('memory-flips').textContent = 'Flips: 0';
  grid.innerHTML = '';
  flippedIndices = []; matchedPairs = 0; memoryFlips = 0;
  
  // Pick 8 random words
  const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  if(all.length < 8) {
     showToast('Not enough words unlocked! Buy more levels first.', 3000);
     memoryOpen = false; return;
  }
  let shuffledAll = [...all].sort(()=>Math.random()-0.5);
  const selected = shuffledAll.slice(0, 8);
  
  // Create 16 cards (8 Ko, 8 En)
  memoryCards = [];
  selected.forEach((w, id) => {
     memoryCards.push({ text: w.ko, type: 'ko', id });
     memoryCards.push({ text: w.en, type: 'en', id });
  });
  memoryCards.sort(()=>Math.random()-0.5);
  
  memoryCards.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.idx = idx;
    card.innerHTML = `
      <div class="mem-card-face mem-card-back">❓</div>
      <div class="mem-card-face mem-card-front">${c.text}</div>
    `;
    card.addEventListener('click', () => window.onMemoryCardClick(idx, card));
    grid.appendChild(card);
  });
  setModalState('memory-overlay', true);
};

window.onMemoryCardClick = function(idx, cardEl){
  if(flippedIndices.length >= 2) return;
  if(flippedIndices.includes(idx)) return;
  if(cardEl.classList.contains('matched')) return;
  
  cardEl.classList.add('flipped');
  flippedIndices.push(idx);
  
  if(flippedIndices.length === 2){
    memoryFlips++;
    document.getElementById('memory-flips').textContent = `Flips: ${memoryFlips}`;
    
    const i1 = flippedIndices[0], i2 = flippedIndices[1];
    const c1 = memoryCards[i1], c2 = memoryCards[i2];
    
    if(c1.id === c2.id && c1.type !== c2.type){
      // Match!
      playChiptuneSFX('quiz_correct');
      setTimeout(()=>{
        document.getElementById('memory-grid').children[i1].classList.add('matched');
        document.getElementById('memory-grid').children[i2].classList.add('matched');
        flippedIndices = [];
        matchedPairs++;
        document.getElementById('memory-matches').textContent = `Matches: ${matchedPairs}/8`;
        
        if(matchedPairs === 8){
           const reward = Math.max(15, 60 - memoryFlips);
           setTimeout(()=>{
             addGold(reward);
             showToast(`🎉 You matched all cards! +${reward} Gold!`);
             window.closeMemoryGame();
           }, 800);
        }
      }, 500);
    } else {
      // No match
      playChiptuneSFX('quiz_wrong');
      setTimeout(()=>{
        const grid = document.getElementById('memory-grid');
        grid.children[i1].classList.remove('flipped');
        grid.children[i2].classList.remove('flipped');
        flippedIndices = [];
      }, 1000);
    }
  }
};

window.closeMemoryGame = function(){
  playChiptuneSFX('click');
  memoryOpen = false;
  setModalState('memory-overlay', false);
};


// ══════════════ TROPHIES ═════════════════════════════════════════════════════
const TROPHIES_DB = [
  { id: 'bronze_apple', name: 'Rookie (신입)', icon: '🥉', reqHarvests: 10, cost: 50 },
  { id: 'silver_spade', name: 'Farmer (농부)', icon: '🥈', reqHarvests: 50, cost: 300 },
  { id: 'gold_tractor', name: 'Expert (전문가)', icon: '🥇', reqHarvests: 150, cost: 1000 },
  { id: 'diamond_crown', name: 'Master (달인)', icon: '💎', reqHarvests: 500, cost: 5000 },
  { id: 'master_scholar', name: 'Legend (전설)', icon: '👑', reqHarvests: 1000, cost: 20000 },
  { id: 'master_chef', name: 'Master Chef (요리 왕)', icon: '👨‍🍳', desc: 'Cook all 10 recipes at least once', type: 'cooking', reqRecipes: 10, cost: 0 }
];

window.getTotalHarvests = function() {
  let total = 0;
  for(let count of harvestCounts.values()){ total += count; }
  return total;
};

window.openTrophies = function() {
  if(trophyOpen) return;
  playChiptuneSFX('click');
  trophyOpen = true;
  setModalState('trophy-overlay', true);
  window.renderTrophies();
};

window.closeTrophies = function() {
  playChiptuneSFX('click');
  trophyOpen = false;
  setModalState('trophy-overlay', false);
};


window.renderTrophies = function() {
  const grid = document.getElementById('trophy-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const totalHarvests = window.getTotalHarvests();
  const totalCooked = cookingState && Array.isArray(cookingState.cookedRecipes) ? cookingState.cookedRecipes.length : 0;
  
  TROPHIES_DB.forEach(t => {
    const isBought = unlockedTrophies.includes(t.id);
    let reqMet = false;
    let reqText = '';

    if (t.type === 'cooking') {
      const targetCount = t.reqRecipes || (typeof COOKING_RECIPES !== 'undefined' ? COOKING_RECIPES.length : 10);
      reqMet = totalCooked >= targetCount;
      reqText = `<span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Cooking</span><br/>${totalCooked}/${targetCount}`;
    } else {
      reqMet = totalHarvests >= t.reqHarvests;
      reqText = `<span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Harvests</span><br/>${totalHarvests}/${t.reqHarvests}`;
    }

    const canAfford = gold >= t.cost;
    
    const div = document.createElement('div');
    div.className = 'trophy-card ' + (isBought ? 'unlocked' : 'locked');
    
    div.innerHTML = `
      <div>
        <div class="trophy-icon">${t.icon}</div>
        <div class="trophy-name">${t.name}</div>
        <div class="trophy-req">${reqText}</div>
      </div>
      ${isBought ? 
        '<div class="trophy-unlocked-badge">Unlocked! 🏆</div>' :
        '<button class="trophy-buy-btn" ' + ((!reqMet || (!canAfford && t.cost > 0)) ? 'disabled' : '') + '>' +
           (!reqMet ? '⚠️ LOCKED' : (t.cost > 0 ? ('BUY 💰' + t.cost) : 'CLAIM 🏆')) +
         '</button>'
      }
    `;
    
    if(!isBought && reqMet && (canAfford || t.cost === 0)) {
      div.querySelector('.trophy-buy-btn').addEventListener('click', () => {
         if (t.cost > 0 && !spendCoins(t.cost)) return;
         unlockedTrophies.push(t.id);
         window.renderTrophies();
         showToast('🏆 Congratulations! You earned the ' + t.name + ' trophy!');
      });
    }
    grid.appendChild(div);
  });
};

const trophyBtn = document.getElementById('trophy-btn');
if(trophyBtn) trophyBtn.addEventListener('click', window.openTrophies);
const trophyCloseBtn = document.getElementById('trophy-close-btn');
if(trophyCloseBtn) trophyCloseBtn.addEventListener('click', window.closeTrophies);

// ══════════════ SPELL QUIZ DUEL LOGIC ════════════════════════════════════════
let duelState = {
  playerHP: 100, maxPlayerHP: 100,
  enemyHP: 100, maxEnemyHP: 100,
  combo: 0,
  timer: null,
  currentQuestion: null,
  answering: false,
  enemyIndex: 0
};

const DUEL_ENEMIES = [
  { name: 'Dark Sorcerer', avatar: '🧙‍♀️', hp: 100, goldBonus: 50 },
  { name: 'Flame Archmage', avatar: '🔮', hp: 130, goldBonus: 80 },
  { name: 'Shadow Dragon', avatar: '🐲', hp: 160, goldBonus: 120 },
  { name: 'Grand Necromancer', avatar: '💀', hp: 200, goldBonus: 180 }
];

window.openSpellDuel = function(){
  if(duelOpen) return;
  playChiptuneSFX('click');
  
  const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  if(all.length < 4){
    showToast('⚠️ Need at least 4 unlocked words to duel! Unlock more in Shop.', 3000);
    return;
  }

  duelState.enemyIndex = Math.floor(Math.random() * DUEL_ENEMIES.length);

  // If Grand Necromancer Boss (index 3), trigger 5-word Entrance Gate!
  if (duelState.enemyIndex === 3) {
    startBossGateChallenge('necromancer', 5, (passed) => {
      if (passed) {
        openSpellDuelDirect();
      }
    });
    return;
  }

  openSpellDuelDirect();
};

function openSpellDuelDirect() {
  if (duelState.timer) {
    clearTimeout(duelState.timer);
    duelState.timer = null;
  }
  const enemy = DUEL_ENEMIES[duelState.enemyIndex];
  
  duelState.playerHP = 100;
  duelState.maxPlayerHP = 100;
  duelState.enemyHP = enemy.hp;
  duelState.maxEnemyHP = enemy.hp;
  duelState.combo = 0;
  duelState.answering = false;

  document.getElementById('duel-enemy-name').textContent = enemy.name;
  document.getElementById('duel-enemy-avatar').textContent = enemy.avatar;

  updateDuelHP();
  document.getElementById('duel-combo-badge').textContent = '🔥 Combo x0';

  duelOpen = true;
  setModalState('duel-overlay', true);

  nextDuelTurn();
}


function updateDuelHP(){
  const pFill = document.getElementById('duel-player-hp-fill');
  const pText = document.getElementById('duel-player-hp-text');
  const eFill = document.getElementById('duel-enemy-hp-fill');
  const eText = document.getElementById('duel-enemy-hp-text');

  const pPct = Math.max(0, Math.min(100, (duelState.playerHP / duelState.maxPlayerHP) * 100));
  const ePct = Math.max(0, Math.min(100, (duelState.enemyHP / duelState.maxEnemyHP) * 100));

  if(pFill){
    pFill.style.width = pPct + '%';
    pFill.style.background = pPct < 30 ? '#ef4444' : pPct < 60 ? '#f59e0b' : 'linear-gradient(90deg,#22c55e,#4ade80)';
  }
  if(pText) pText.textContent = `${Math.max(0, duelState.playerHP)} / ${duelState.maxPlayerHP} HP`;

  if(eFill){
    eFill.style.width = ePct + '%';
    eFill.style.background = ePct < 30 ? '#ef4444' : ePct < 60 ? '#f59e0b' : 'linear-gradient(90deg,#a855f7,#ec4899)';
  }
  if(eText) eText.textContent = `${Math.max(0, duelState.enemyHP)} / ${duelState.maxEnemyHP} HP`;
}

function nextDuelTurn(){
  if(!duelOpen) return;
  if(duelState.playerHP <= 0 || duelState.enemyHP <= 0) return;

  duelState.answering = false;
  const grid = document.getElementById('duel-options-grid');
  grid.innerHTML = '';

  const allWords = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  const target = Phaser.Utils.Array.GetRandom(allWords);
  
  const distractors = allWords.filter(w => w.ko !== target.ko);
  Phaser.Utils.Array.Shuffle(distractors);
  const selectedDistractors = distractors.slice(0, 3);

  const options = [target, ...selectedDistractors];
  Phaser.Utils.Array.Shuffle(options);

  duelState.currentQuestion = { target, options };

  document.getElementById('duel-target-word').textContent = target.ko;

  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'duel-option-btn';
    btn.innerHTML = `
      <span>${opt.en}</span>
      <span class="duel-option-badge">[${idx + 1}]</span>
    `;
    btn.onclick = () => window.selectDuelOption(idx);
    grid.appendChild(btn);
  });

  const timerFill = document.getElementById('duel-timer-bar-fill');
  if(timerFill){
    timerFill.style.transition = 'none';
    timerFill.style.width = '100%';
    setTimeout(() => {
      if(duelOpen && !duelState.answering){
        timerFill.style.transition = 'width 5s linear';
        timerFill.style.width = '0%';
      }
    }, 50);
  }

  if(duelState.timer) clearTimeout(duelState.timer);
  duelState.timer = setTimeout(() => {
    if(duelOpen && !duelState.answering){
      window.selectDuelOption(-1);
    }
  }, 5050);
}

window.selectDuelOption = function(idx){
  if(duelState.answering || !duelOpen) return;
  duelState.answering = true;
  if(duelState.timer) clearTimeout(duelState.timer);

  const grid = document.getElementById('duel-options-grid');
  const buttons = grid.querySelectorAll('.duel-option-btn');
  const target = duelState.currentQuestion.target;
  const isCorrect = idx >= 0 && duelState.currentQuestion.options[idx]?.ko === target.ko;

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if(duelState.currentQuestion.options[i]?.ko === target.ko){
      btn.classList.add('correct');
    } else if(i === idx){
      btn.classList.add('wrong');
    }
  });

  if(isCorrect){
    playChiptuneSFX('quiz_correct');
    duelState.combo++;
    const dmg = 25 + duelState.combo * 5;
    duelState.enemyHP = Math.max(0, duelState.enemyHP - dmg);
    document.getElementById('duel-combo-badge').textContent = `🔥 Combo x${duelState.combo}`;
    
    const playerBox = document.getElementById('duel-player-box');
    const enemyBox = document.getElementById('duel-enemy-box');
    if(playerBox) playerBox.classList.add('cast');
    if(enemyBox) enemyBox.classList.add('hit');
    showDmgPopup(enemyBox, `-${dmg} HP`, 'enemy-hit');

    setTimeout(() => {
      if(playerBox) playerBox.classList.remove('cast');
      if(enemyBox) enemyBox.classList.remove('hit');
    }, 400);

    updateDuelHP();

    if(duelState.enemyHP <= 0){
      setTimeout(() => endDuel(true), 600);
      return;
    }
  } else {
    playChiptuneSFX('quiz_wrong');
    duelState.combo = 0;
    const dmg = 22;
    duelState.playerHP = Math.max(0, duelState.playerHP - dmg);
    document.getElementById('duel-combo-badge').textContent = `🔥 Combo x0`;

    const playerBox = document.getElementById('duel-player-box');
    const enemyBox = document.getElementById('duel-enemy-box');
    if(enemyBox) enemyBox.classList.add('cast');
    if(playerBox) playerBox.classList.add('hit');
    showDmgPopup(playerBox, `-${dmg} HP`, 'player-hit');

    setTimeout(() => {
      if(enemyBox) enemyBox.classList.remove('cast');
      if(playerBox) playerBox.classList.remove('hit');
    }, 400);

    updateDuelHP();

    if(duelState.playerHP <= 0){
      setTimeout(() => endDuel(false), 600);
      return;
    }
  }

  setTimeout(() => {
    nextDuelTurn();
  }, 900);
};

function showDmgPopup(parentEl, text, typeClass){
  if(!parentEl) return;
  const popup = document.createElement('div');
  popup.className = `duel-dmg-popup ${typeClass}`;
  popup.textContent = text;
  popup.style.top = '10px';
  parentEl.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function endDuel(victory){
  if (typeof duelState.winStreak !== 'number') duelState.winStreak = 0;
  if(victory){
    duelState.winStreak++;
    if (typeof leaderboardState !== 'undefined' && leaderboardState.personalBests) {
      if (duelState.winStreak > (leaderboardState.personalBests.duelMaxWinStreak || 0)) {
        leaderboardState.personalBests.duelMaxWinStreak = duelState.winStreak;
        if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
      }
    }
    const enemyInfo = DUEL_ENEMIES[duelState.enemyIndex];
    const baseReward = enemyInfo.goldBonus + duelState.combo * 5 + Math.floor(duelState.playerHP / 2);
    addCoins(baseReward);

    if (duelState.enemyIndex === 3) {
      addGems(50);
      addHonor(100);
      if (duelState.playerHP >= 100) {
        addGems(15);
        showToast('🛡️ ZERO-DAMAGE BOSS KILL! +15 Bonus Gems!', 4500);
      }
      showToast(`💀 GRAND NECROMANCER DEFEATED! +${baseReward} Coins, +50 Gems, +100 Honor!`, 5000);
    } else {
      showToast(`⚡ VICTORY! Defeated ${enemyInfo.name}! +${baseReward} Coins!`, 3500);
    }
    checkQuestProgress('duel', { count: 1 });
  } else {
    duelState.winStreak = 0;
    showToast(`💀 DEFEAT! Practice more words and try again!`, 3500);
  }
  closeSpellDuel();
}


window.closeSpellDuel = function(){
  if(duelState.timer) {
    clearTimeout(duelState.timer);
    duelState.timer = null;
  }
  duelState.answering = false;
  playChiptuneSFX('click');
  duelOpen = false;
  setModalState('duel-overlay', false);
};


if(window.addEventListener){
  window.addEventListener('keydown', (e) => {
    if(duelOpen){
      if(['1', '2', '3', '4'].includes(e.key)){
        const idx = parseInt(e.key) - 1;
        window.selectDuelOption(idx);
      }
      if(e.key === 'Escape'){
        window.closeSpellDuel();
      }
    }
  });
}

// ═══════════════ R3: CRAFTING / COOKING SYSTEM & BUFFS ════════════════════════
var COOKING_RECIPES = [
  {
    id: 'kimchi',
    nameEn: 'Kimchi',
    nameKo: '김치',
    icon: '🥬',
    description: 'Traditional spicy fermented Napa cabbage with chili and garlic.',
    ingredients: [
      { itemId: 'cabbage', count: 1 },
      { itemId: 'chili', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 25,
    goldReward: 30
  },
  {
    id: 'radish_rice',
    nameEn: 'Radish Rice',
    nameKo: '무밥',
    icon: '🍚',
    description: 'Comforting Korean steamed rice infused with sweet sliced radish.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 20,
    goldReward: 25
  },
  {
    id: 'roasted_corn',
    nameEn: 'Roasted Corn',
    nameKo: '옥수수구이',
    icon: '🌽',
    description: 'Sweet juicy corn on the cob roasted over open farm embers.',
    ingredients: [
      { itemId: 'corn', count: 2 }
    ],
    xpReward: 20,
    goldReward: 20
  },
  {
    id: 'strawberry_jam',
    nameEn: 'Strawberry Jam',
    nameKo: '딸기잼',
    icon: '🍓',
    description: 'Sweet homemade jam boiled down from fresh garden strawberries.',
    ingredients: [
      { itemId: 'strawberry', count: 2 }
    ],
    xpReward: 22,
    goldReward: 25
  },
  {
    id: 'gimbap',
    nameEn: 'Gimbap',
    nameKo: '김밥',
    icon: '🍱',
    description: 'Savory seaweed rice roll filled with carrots and pickled radish.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'carrot', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 40,
    goldReward: 50
  },
  {
    id: 'tteokbokki',
    nameEn: 'Tteokbokki',
    nameKo: '떡볶이',
    icon: '🍢',
    description: 'Chewy rice cakes simmered in spicy gochujang and green onion.',
    ingredients: [
      { itemId: 'rice', count: 2 },
      { itemId: 'chili', count: 1 },
      { itemId: 'green_onion', count: 1 }
    ],
    xpReward: 45,
    goldReward: 55
  },
  {
    id: 'gamjajeon',
    nameEn: 'Potato Pancake',
    nameKo: '감자전',
    icon: '🥔',
    description: 'Crispy pan-fried potato pancake seasoned with green onions and garlic.',
    ingredients: [
      { itemId: 'potato', count: 2 },
      { itemId: 'green_onion', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 65,
    goldReward: 75
  },
  {
    id: 'bibimbap',
    nameEn: 'Bibimbap',
    nameKo: '비빔밥',
    icon: '🥗',
    description: 'Nourishing bowl of rice topped with cabbage, carrot, soybean, and chili.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'cabbage', count: 1 },
      { itemId: 'carrot', count: 1 },
      { itemId: 'soybean', count: 1 }
    ],
    xpReward: 75,
    goldReward: 90
  },
  {
    id: 'bulgogi',
    nameEn: 'Bulgogi',
    nameKo: '불고기',
    icon: '🍖',
    description: 'Flavorful marinated dish with garlic, green onions, and soybeans.',
    ingredients: [
      { itemId: 'green_onion', count: 2 },
      { itemId: 'garlic', count: 2 },
      { itemId: 'soybean', count: 1 }
    ],
    xpReward: 95,
    goldReward: 115
  },
  {
    id: 'samgyetang',
    nameEn: 'Samgyetang',
    nameKo: '궁중 삼계탕',
    icon: '🍲',
    description: 'Royal ginseng chicken soup cooked with rice, garlic, radish, and green onions.',
    ingredients: [
      { itemId: 'rice', count: 2 },
      { itemId: 'garlic', count: 2 },
      { itemId: 'radish', count: 1 },
      { itemId: 'green_onion', count: 1 }
    ],
    xpReward: 130,
    goldReward: 160
  },
  {
    id: 'honey_yakgwa',
    nameEn: 'Honey Yakgwa',
    nameKo: '꿀약과',
    icon: '🥮',
    description: 'Traditional Korean honey pastry made with wheat, honey, and sesame oil.',
    ingredients: [
      { itemId: 'honey', count: 2 },
      { itemId: 'cabbage', count: 1 }
    ],
    xpReward: 50,
    goldReward: 60
  },
  {
    id: 'honey_tea',
    nameEn: 'Honey Tea',
    nameKo: '꿀차',
    icon: '🍵',
    description: 'Warm soothing tea sweetened with fresh natural honey.',
    ingredients: [
      { itemId: 'honey', count: 2 }
    ],
    xpReward: 35,
    goldReward: 45
  }
];

if (typeof window !== 'undefined') {
  window.COOKING_RECIPES = COOKING_RECIPES;
}

let selectedRecipeId = 'kimchi';

function openCookingUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderCookingGrid(selectedRecipeId);
  setModalState('cooking-overlay', true);
}

function closeCookingUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('cooking-overlay', false);
}

function renderCookingGrid(selectId) {
  const pantryList = document.getElementById('cooking-pantry-list');
  const recipeListEl = document.getElementById('cooking-recipe-list');
  const detailViewEl = document.getElementById('cooking-detail-view');
  const progressBadge = document.getElementById('cooking-progress-badge');

  if (!recipeListEl) return;

  if (selectId && COOKING_RECIPES.some(r => r.id === selectId)) {
    selectedRecipeId = selectId;
  } else if (!COOKING_RECIPES.some(r => r.id === selectedRecipeId)) {
    selectedRecipeId = COOKING_RECIPES[0]?.id || 'kimchi';
  }

  const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
  const cookedRecipes = (cookingState && Array.isArray(cookingState.cookedRecipes)) ? cookingState.cookedRecipes : [];

  // 1. Pantry Stock Summary
  if (pantryList) {
    pantryList.innerHTML = '';
    const entries = Object.entries(ingMap).filter(([_, count]) => count > 0);
    if (entries.length === 0) {
      pantryList.innerHTML = '<span style="color:#94a3b8; font-size:11px;">No crop ingredients in pantry. Harvest crops to start cooking!</span>';
    } else {
      entries.forEach(([ingKey, cnt]) => {
        const info = getItemInfo(ingKey);
        const tag = document.createElement('span');
        tag.style.cssText = 'background:rgba(15,23,42,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:6px; padding:3px 8px; font-size:11px; font-family:"Noto Sans KR",sans-serif; color:#e2e8f0;';
        tag.textContent = `${info.icon || '📦'} ${info.nameKo || ingKey}: ×${cnt}`;
        pantryList.appendChild(tag);
      });
    }
  }

  // 2. Progress Badge
  if (progressBadge) {
    progressBadge.textContent = `Cooked: ${cookedRecipes.length} / ${COOKING_RECIPES.length}`;
  }

  // 3. Render Recipe List Cards
  recipeListEl.innerHTML = '';
  COOKING_RECIPES.forEach(r => {
    const isSelected = r.id === selectedRecipeId;
    const isCooked = cookedRecipes.includes(r.id);

    let canCook = true;
    r.ingredients.forEach(req => {
      const info = getItemInfo(req.itemId);
      const key = info.key || req.itemId;
      const have = ingMap[key] || 0;
      if (have < req.count) canCook = false;
    });

    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.cursor = 'pointer';
    card.style.border = isSelected ? '2px solid var(--neon-gold)' : (isCooked ? '1.5px solid #22c55e' : '1.5px solid rgba(245, 158, 11, 0.3)');
    card.style.background = isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(30, 41, 59, 0.7)';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:24px;">${r.icon}</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold);">${r.nameKo}</div>
            <div style="font-size:10px; color:#cbd5e1;">${r.nameEn}</div>
          </div>
        </div>
        ${isCooked ? '<span style="font-family:\'Press Start 2P\',monospace; font-size:8px; background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#4ade80; padding:2px 5px; border-radius:4px;">✓ Cooked</span>' : ''}
      </div>
    `;
    card.onclick = () => {
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
      selectedRecipeId = r.id;
      renderCookingGrid(r.id);
    };
    recipeListEl.appendChild(card);
  });

  // 4. Render Selected Recipe Detail View
  if (detailViewEl) {
    const recipe = COOKING_RECIPES.find(r => r.id === selectedRecipeId) || COOKING_RECIPES[0];
    if (recipe) {
      let canCook = true;
      let ingBadgesHtml = [];

      recipe.ingredients.forEach(req => {
        const info = getItemInfo(req.itemId);
        const key = info.key || req.itemId;
        const have = ingMap[key] || 0;
        if (have < req.count) canCook = false;

        if (have >= req.count) {
          ingBadgesHtml.push(`
            <span style="background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
              ${info.icon || '📦'} ${info.nameKo || req.itemId} ${have}/${req.count} ✓
            </span>
          `);
        } else {
          ingBadgesHtml.push(`
            <span style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#f87171; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
              ${info.icon || '📦'} ${info.nameKo || req.itemId} ${have}/${req.count} ✗
            </span>
          `);
        }
      });

      const isCooked = cookedRecipes.includes(recipe.id);

      detailViewEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:40px;">${recipe.icon}</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace; font-size:14px; color:var(--neon-gold);">${recipe.nameKo} (${recipe.nameEn})</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.7); margin-top:4px;">${recipe.description || ''}</div>
          </div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
          <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold); margin-bottom:6px;">Required Ingredients (재료):</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${ingBadgesHtml.join('')}
          </div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
          <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold); margin-bottom:6px;">Rewards:</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="background:rgba(168,85,247,0.18); border:1px solid #a855f7; color:#c084fc; padding:4px 10px; border-radius:6px; font-size:10px; font-family:'Press Start 2P',monospace;">⭐ +${recipe.xpReward} XP</span>
            <span style="background:rgba(245,158,11,0.18); border:1px solid #f59e0b; color:#fbbf24; padding:4px 10px; border-radius:6px; font-size:10px; font-family:'Press Start 2P',monospace;">🪙 +${recipe.goldReward} Gold</span>
            ${isCooked ? '<span style="background:rgba(34,197,94,0.18); border:1px solid #22c55e; color:#4ade80; padding:4px 10px; border-radius:6px; font-size:10px; font-family:\'Press Start 2P\',monospace;">✓ Dish Mastered</span>' : ''}
          </div>
        </div>

        <div style="margin-top:auto; padding-top:10px;">
          <button class="cook-btn" style="width:100%; padding:12px; font-family:'Press Start 2P',monospace; font-size:11px; ${canCook ? 'background:linear-gradient(135deg, #f59e0b, #d97706); cursor:pointer;' : 'opacity:0.45; cursor:not-allowed; filter:grayscale(0.5);'}" ${canCook ? '' : 'disabled'} onclick="cookRecipe('${recipe.id}')">
            🍳 Cook ${recipe.nameKo}
          </button>
        </div>
      `;
    }
  }
}

function cookRecipe(recipeId) {
  if (!recipeId) return false;

  const recipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
    ? COOKING_RECIPES
    : ((typeof RECIPE_DB !== 'undefined') ? RECIPE_DB : []);

  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) {
    if (typeof showToast === 'function') showToast(`⚠️ Recipe '${recipeId}' not found!`);
    return false;
  }

  let reqs = [];
  if (Array.isArray(recipe.ingredients)) {
    reqs = recipe.ingredients;
  } else if (recipe.req && typeof recipe.req === 'object') {
    reqs = Object.entries(recipe.req).map(([k, cnt]) => ({ itemId: k, count: cnt }));
  }

  const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
  for (const req of reqs) {
    const info = getItemInfo(req.itemId);
    const key = info.key || req.itemId;
    const have = ingMap[key] || 0;
    if (have < req.count) {
      if (typeof showToast === 'function') {
        showToast(`⚠️ Missing ingredient for ${recipe.nameKo || recipe.nameEn}: Need ${req.count}x ${info.nameKo || key} (have ${have})`);
      }
      return false;
    }
  }

  for (const req of reqs) {
    const ok = removeItemFromInventory(req.itemId, req.count);
    if (!ok) {
      if (typeof showToast === 'function') showToast(`⚠️ Failed to remove ingredient ${req.itemId}`);
      return false;
    }
  }

  const goldReward = recipe.goldReward || 0;
  const xpReward = recipe.xpReward || 0;

  if (goldReward > 0 && typeof addCoins === 'function') {
    addCoins(goldReward);
  }

  if (xpReward > 0) {
    if (typeof addHonor === 'function') {
      addHonor(xpReward);
    } else {
      inventoryState.vocabXP = (inventoryState.vocabXP || 0) + xpReward;
    }
  }

  cookingState = cookingState || { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  cookingState.cookedRecipes = Array.isArray(cookingState.cookedRecipes) ? cookingState.cookedRecipes : [];
  if (!cookingState.cookedRecipes.includes(recipe.id)) {
    cookingState.cookedRecipes.push(recipe.id);
  }
  cookingState.totalDishesCooked = (cookingState.totalDishesCooked || 0) + 1;
  cookingState.recipeStats = cookingState.recipeStats || {};
  cookingState.recipeStats[recipe.id] = (cookingState.recipeStats[recipe.id] || 0) + 1;

  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.cookedDishes[recipe.id] = cookingState.recipeStats[recipe.id];

  if (typeof persistSave === 'function') persistSave();
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('complete');

  if (typeof showToast === 'function') {
    showToast(`🍳 Cooked ${recipe.nameKo || recipe.nameEn}! +${goldReward} Gold 🪙, +${xpReward} XP ⭐`);
  }

  if (typeof renderInventoryGrid === 'function') renderInventoryGrid();
  renderCookingGrid(recipe.id);
  if (typeof updateCurrencyHUD === 'function') updateCurrencyHUD();

  checkCookingAchievements();
  return true;
}

function checkCookingAchievements() {
  const recipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
    ? COOKING_RECIPES
    : ((typeof RECIPE_DB !== 'undefined') ? RECIPE_DB : []);
  if (recipes.length === 0) return;

  cookingState = cookingState || { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  cookingState.cookedRecipes = Array.isArray(cookingState.cookedRecipes) ? cookingState.cookedRecipes : [];
  const totalCookedTypes = cookingState.cookedRecipes.length;

  unlockedTrophies = Array.isArray(unlockedTrophies) ? unlockedTrophies : [];

  if (totalCookedTypes >= recipes.length && !unlockedTrophies.includes('master_chef')) {
    unlockedTrophies.push('master_chef');
    if (typeof showToast === 'function') {
      showToast('🏆 ACHIEVEMENT UNLOCKED: Master Chef (요리 왕)! (100% Recipes Cooked! 🍳⭐)');
    }
    if (typeof playChiptuneSFX === 'function') {
      playChiptuneSFX('fanfare');
    }
    if (typeof persistSave === 'function') persistSave();
    if (typeof window.renderTrophies === 'function') window.renderTrophies();
  }
}

var KOREAN_INGREDIENTS = [
  '배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근', '사과',
  '연어', '고등어', '오징어', '잉어', '새우', '문어', '조개', '황금물고기'
];

var RECIPE_DB = [
  {
    id: 'kimchi', name: '김치', enName: 'Kimchi', icon: '🥬',
    req: { '배추': 1, '고추': 1, '마늘': 1 },
    buff: { type: 'coin_boost', name: '2x Coin Rate (김치 파워)', durationMs: 300000, value: 2.0 },
    culturalFact: 'Kimchi (김치) is Korea’s national fermented dish. Kimjang (김장), the collective winter Kimchi-making tradition, is inscribed on UNESCO’s Intangible Cultural Heritage list!'
  },
  {
    id: 'bibimbap', name: '비빔밥', enName: 'Bibimbap', icon: '🥗',
    req: { '쌀': 1, '당근': 1, '콩': 1 },
    buff: { type: 'crop_speed', name: '+50% Crop Speed (비빔밥 에너지)', durationMs: 360000, value: 0.50 },
    culturalFact: 'Bibimbap (비빔밥) translates to "mixed rice". Famous in Jeonju, it combines vegetables and gochujang, reflecting the five traditional Korean cardinal colors (오방색).'
  },
  {
    id: 'bulgogi', name: '불고기', enName: 'Bulgogi', icon: '🍖',
    req: { '파': 1, '마늘': 1, '콩': 1 },
    buff: { type: 'combat_damage', name: '+25% Combat Damage (불고기 힘)', durationMs: 420000, value: 0.25 },
    culturalFact: 'Bulgogi (불고기 - "fire meat") traces back over 1,000 years to Goguryeo as maekjeok. Thinly sliced beef is marinated in soy sauce, garlic, and sesame oil.'
  },
  {
    id: 'tteokbokki', name: '떡볶이', enName: 'Tteokbokki', icon: '🍢',
    req: { '쌀': 1, '고추': 1, '파': 1 },
    buff: { type: 'quiz_hints', name: '+1 Extra Quiz Hint (떡볶이 열정)', durationMs: 300000, value: 1 },
    culturalFact: 'Tteokbokki (떡볶이) originated as royal court soy sauce rice cakes. The iconic spicy gochujang street-food version was created in Seoul in 1953!'
  },
  {
    id: 'samgyeopsal', name: '삼겹살', enName: 'Samgyeopsal', icon: '🥓',
    req: { '마늘': 2, '파': 1 },
    buff: { type: 'combat_damage', name: '+25% Combat Damage (삼겹살 활력)', durationMs: 480000, value: 0.25 },
    culturalFact: 'Samgyeopsal (삼겹살 - "three-layer pork belly") is Korea’s favorite tabletop grill dish, eaten wrapped in lettuce with grilled garlic and ssamjang paste.'
  },
  {
    id: 'haemul_pajeon', name: '해물파전', enName: 'Seafood Pajeon', icon: '🥞',
    req: { '파': 2, '오징어': 1, '새우': 1 },
    buff: { type: 'fishing_luck', name: '+50% Fishing Luck (해물파전 행운)', durationMs: 360000, value: 0.50 },
    culturalFact: 'Haemul Pajeon (해물파전) is a crispy green onion pancake filled with fresh squid and shrimp. Koreans famously love eating Pajeon on rainy days!'
  },
  {
    id: 'japchae', name: '잡채', enName: 'Japchae', icon: '🍜',
    req: { '당근': 1, '파': 1, '무': 1 },
    buff: { type: 'coin_boost', name: '2x Coin Rate (잡채 잔치)', durationMs: 300000, value: 2.0 },
    culturalFact: 'Japchae (잡채) was created in the 17th century for King Gwanghaegun. Glass noodles stir-fried with sweet carrot and veggies are served at every festive celebration.'
  },
  {
    id: 'samgyetang', name: '삼계탕', enName: 'Samgyetang', icon: '🍲',
    req: { '쌀': 1, '마늘': 2, '무': 1 },
    buff: { type: 'crop_speed', name: '+50% Crop Speed (삼계탕 보양)', durationMs: 480000, value: 0.50 },
    culturalFact: 'Samgyetang (삼계탕 - ginseng chicken soup) is traditional stamina food eaten during Sambok (삼복), the peak heat of summer, to "fight heat with heat" (이열치열).'
  },
  {
    id: 'gimbap', name: '김밥', enName: 'Gimbap', icon: '🍱',
    req: { '쌀': 1, '당근': 1, '무': 1 },
    buff: { type: 'quiz_hints', name: '+1 Extra Quiz Hint (김밥 소풍)', durationMs: 300000, value: 1 },
    culturalFact: 'Gimbap (김밥) is dried seaweed (김) rolled with rice (밥) and pickled radish. It is the quintessential Korean picnic and travel comfort food!'
  }
];

function addIngredient(name, count = 1) {
  inventoryState.ingredients = inventoryState.ingredients || {};
  inventoryState.ingredients[name] = (inventoryState.ingredients[name] || 0) + count;
  persistSave();
}

function getBuff(type) {
  if (!activeBuffs || !activeBuffs[type]) return null;
  if (Date.now() > activeBuffs[type].expiresAt) {
    delete activeBuffs[type];
    persistSave();
    return null;
  }
  return activeBuffs[type];
}

function isBuffActive(type) {
  return getBuff(type) !== null;
}

function applyBuff(type, name, durationMs, value, icon) {
  activeBuffs[type] = {
    name,
    expiresAt: Date.now() + durationMs,
    value,
    icon
  };
  persistSave();
  updateBuffHUD();
  showToast(`✨ Active Buff: ${name}!`);
}

function updateBuffHUD() {
  const bar = document.getElementById('active-buff-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const now = Date.now();
  Object.keys(activeBuffs).forEach(type => {
    const buff = activeBuffs[type];
    if (now > buff.expiresAt) {
      delete activeBuffs[type];
      return;
    }
    const remSec = Math.ceil((buff.expiresAt - now) / 1000);
    const m = Math.floor(remSec / 60);
    const s = remSec % 60;
    const badge = document.createElement('div');
    badge.className = 'buff-badge';
    badge.innerHTML = `<span>${buff.icon || '✨'}</span> <span>${m}:${String(s).padStart(2, '0')}</span>`;
    badge.title = buff.name;
    bar.appendChild(badge);
  });
}

// Tick active buffs every second
if (typeof window !== 'undefined') {
  if (window.buffHUDInterval) clearInterval(window.buffHUDInterval);
  window.buffHUDInterval = setInterval(() => {
    if (typeof activeBuffs !== 'undefined' && Object.keys(activeBuffs).length > 0) {
      updateBuffHUD();
    }
  }, 1000);
}

// Open Recipe Overlay
window.openRecipeBook = function() {
  playChiptuneSFX('click');
  const overlay = document.getElementById('recipe-overlay');
  const pantryList = document.getElementById('recipe-pantry-list');
  const grid = document.getElementById('recipe-grid-container');
  if (!overlay || !grid || !pantryList) return;

  // Render pantry stock
  pantryList.innerHTML = '';
  const ingMap = inventoryState.ingredients || {};
  const entries = Object.entries(ingMap).filter(([_, count]) => count > 0);
  if (entries.length === 0) {
    pantryList.innerHTML = '<span style="color:#94a3b8;">No ingredients yet. Harvest crops or catch fish!</span>';
  } else {
    entries.forEach(([ing, cnt]) => {
      const tag = document.createElement('span');
      tag.style.cssText = 'background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:3px 8px;';
      tag.textContent = `${ing}: ×${cnt}`;
      pantryList.appendChild(tag);
    });
  }

  // Render Recipe Cards
  grid.innerHTML = '';
  RECIPE_DB.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    let canCook = true;
    let reqText = [];
    Object.entries(r.req).forEach(([ing, needed]) => {
      const have = (inventoryState.ingredients || {})[ing] || 0;
      if (have < needed) canCook = false;
      reqText.push(`${ing} ${have}/${needed}`);
    });

    card.innerHTML = `
      <div class="recipe-card-icon">${r.icon}</div>
      <div class="recipe-card-title">${r.name}</div>
      <div class="recipe-card-sub">${r.enName}</div>
      <div class="recipe-req-list"><b>Req:</b> ${reqText.join(', ')}</div>
      <div class="recipe-buff-badge">⚡ ${r.buff.name}</div>
      <div style="display:flex; gap:6px; margin-top:4px;">
        <button class="cook-btn" style="flex:1;" ${canCook ? '' : 'disabled'} onclick="startCookingMinigame('${r.id}')">🍳 Cook</button>
        <button class="hud-btn" style="padding:4px 8px; font-size:10px;" onclick="showCulturalFact('${r.id}')">🏺 Info</button>
      </div>
    `;
    grid.appendChild(card);
  });

  setModalState('recipe-overlay', true);
};

window.closeRecipeBook = function() {
  playChiptuneSFX('click');
  setModalState('recipe-overlay', false);
};


// ── COOKING MINIGAME LOGIC ────────────────────────────────────────────────────
let currentCookingRecipe = null;
let cookingStage = 0;
let cookingScore = 0;
let activeHeatInterval = null;

window.startCookingMinigame = function(recipeId) {
  const recipe = RECIPE_DB.find(r => r.id === recipeId);
  if (!recipe) return;

  // Check ingredients
  const ingMap = inventoryState.ingredients || {};
  for (const [ing, needed] of Object.entries(recipe.req)) {
    if ((ingMap[ing] || 0) < needed) {
      showToast(`⚠️ Missing required ingredient: ${ing}!`);
      return;
    }
  }

  // Deduct ingredients
  for (const [ing, needed] of Object.entries(recipe.req)) {
    ingMap[ing] -= needed;
  }
  persistSave();

  currentCookingRecipe = recipe;
  cookingStage = 1;
  cookingScore = 0;

  closeRecipeBook();
  const overlay = document.getElementById('cooking-minigame-overlay');
  if (overlay) overlay.classList.add('visible');

  renderCookingStage();
};

function renderCookingStage() {
  const dishIcon = document.getElementById('cmg-dish-icon');
  const dishName = document.getElementById('cmg-dish-name');
  const stepDesc = document.getElementById('cmg-step-desc');
  const container = document.getElementById('cmg-stage-container');

  if (!currentCookingRecipe || !container) return;

  dishIcon.textContent = currentCookingRecipe.icon;
  dishName.textContent = `${currentCookingRecipe.name} (${currentCookingRecipe.enName})`;

  if (cookingStage === 1) {
    stepDesc.textContent = 'Stage 1/2: Prep Ingredients - Select the correct Korean name!';
    const correctTarget = Object.keys(currentCookingRecipe.req)[0];
    const choices = [correctTarget];
    KOREAN_INGREDIENTS.forEach(ing => {
      if (ing !== correctTarget && choices.length < 4) choices.push(ing);
    });
    Phaser.Utils.Array.Shuffle(choices);

    container.innerHTML = `
      <div style="font-size:16px; color:#fff; margin-bottom:12px;">Which ingredient is needed first?</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%;">
        ${choices.map(choice => `
          <button class="cook-btn" style="padding:12px; font-size:14px;" onclick="handleCookingStage1('${choice}', '${correctTarget}')">${choice}</button>
        `).join('')}
      </div>
    `;
  } else if (cookingStage === 2) {
    stepDesc.textContent = 'Stage 2/2: Heat Adjustment - Click when heat is IN THE GREEN ZONE!';
    
    let sliderPos = 0;
    let direction = 1;
    container.innerHTML = `
      <div style="font-size:14px; color:#fff; margin-bottom:12px;">Adjust Cooking Temperature (불 조절):</div>
      <div style="width:100%; height:24px; background:#1e293b; border-radius:12px; position:relative; overflow:hidden; border:1px solid var(--neon-gold); margin-bottom:16px;">
        <div style="position:absolute; left:40%; width:20%; height:100%; background:rgba(34,197,94,0.6);"></div>
        <div id="heat-indicator" style="position:absolute; left:0%; width:10px; height:100%; background:#ef4444;"></div>
      </div>
      <button class="cook-btn" style="padding:12px 24px; font-size:12px;" id="heat-click-btn">🔥 STOP HEAT!</button>
    `;

    const indicator = document.getElementById('heat-indicator');
    const heatBtn = document.getElementById('heat-click-btn');

    if (activeHeatInterval) clearInterval(activeHeatInterval);
    activeHeatInterval = setInterval(() => {
      sliderPos += direction * 4;
      if (sliderPos >= 95) direction = -1;
      if (sliderPos <= 0) direction = 1;
      if (indicator) indicator.style.left = sliderPos + '%';
    }, 30);

    if (heatBtn) {
      heatBtn.onclick = () => {
        if (activeHeatInterval) {
          clearInterval(activeHeatInterval);
          activeHeatInterval = null;
        }
        if (sliderPos >= 40 && sliderPos <= 60) {
          cookingScore += 50; // Perfect heat!
          playChiptuneSFX('quiz_correct');
        } else {
          cookingScore += 20;
          playChiptuneSFX('quiz_wrong');
        }
        finishCookingMinigame();
      };
    }
  }
}

window.handleCookingStage1 = function(selected, target) {
  if (selected === target) {
    cookingScore += 50;
    playChiptuneSFX('quiz_correct');
  } else {
    cookingScore += 10;
    playChiptuneSFX('quiz_wrong');
  }
  cookingStage = 2;
  renderCookingStage();
};

function finishCookingMinigame() {
  closeCookingMinigame();

  let grade = 'B';
  let mult = 1.0;
  if (cookingScore >= 90) { grade = 'S'; mult = 1.5; }
  else if (cookingScore >= 70) { grade = 'A'; mult = 1.25; }
  else if (cookingScore < 40) { grade = 'F'; mult = 0.5; }

  const b = currentCookingRecipe.buff;
  const duration = Math.round(b.durationMs * mult);
  applyBuff(b.type, `${b.name} (${grade} Grade)`, duration, b.value, currentCookingRecipe.icon);

  // Store cooked dish for pet feeding
  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.cookedDishes[currentCookingRecipe.id] = (inventoryState.cookedDishes[currentCookingRecipe.id] || 0) + 1;
  persistSave();


  // Show cultural fact modal!
  showCulturalFact(currentCookingRecipe.id, grade);
}

window.closeCookingMinigame = function() {
  if (activeHeatInterval) {
    clearInterval(activeHeatInterval);
    activeHeatInterval = null;
  }
  const overlay = document.getElementById('cooking-minigame-overlay');
  if (overlay) overlay.classList.remove('visible');
};

window.showCulturalFact = function(recipeId, grade = null) {
  const recipe = RECIPE_DB.find(r => r.id === recipeId);
  if (!recipe) return;

  const iconEl = document.getElementById('cf-icon');
  const titleEl = document.getElementById('cf-title');
  const textEl = document.getElementById('cf-text');

  if (iconEl) iconEl.textContent = recipe.icon;
  if (titleEl) titleEl.textContent = grade ? `Grade ${grade}! ${recipe.name} (${recipe.enName})` : `${recipe.name} (${recipe.enName})`;
  if (textEl) textEl.textContent = recipe.culturalFact;

  const overlay = document.getElementById('cultural-fact-overlay');
  if (overlay) overlay.classList.add('visible');
};

window.closeCulturalFact = function() {
  const overlay = document.getElementById('cultural-fact-overlay');
  if (overlay) overlay.classList.remove('visible');
};


// ═══════════════ R5 SEASONAL EVENTS & LOCAL LEADERBOARD SYSTEM ═════════════════

const SEASONAL_EVENTS_CONFIG = {
  chuseok: {
    id: 'chuseok',
    name: '추석 (Chuseok - Harvest Festival)',
    icon: '🌾',
    themeColor: '#f59e0b',
    borderClass: 'neon-border-gold',
    desc: 'Harvest Festival: Bake Songpyeon 🍡, light Lunar Lanterns 🏮, and earn +50% Bonus Honor 🏅 on Quests!',
    buffText: '+50% Honor Rewards 🏅 on Quests & Harvests',
    themedVocab: [
      { ko: '추석', en: 'Chuseok (Harvest Festival)' },
      { ko: '송편', en: 'Songpyeon (Rice Cake)' },
      { ko: '달', en: 'Moon' },
      { ko: '한가위', en: 'Midautumn Festival' },
      { ko: '보름달', en: 'Full Moon' },
      { ko: '결실', en: 'Harvest Yield' }
    ],
    quests: [
      { id: 'chuseok_q1', title: '🌾 Harvest Festival Prep', desc: 'Harvest 5 crops during Chuseok', target: 5, reward: { honor: 50, coins: 100 }, icon: '🌾' },
      { id: 'chuseok_q2', title: '🍡 Bake Songpyeon', desc: 'Cook any dish in Recipe Book', target: 1, reward: { honor: 100, gems: 10 }, icon: '🍡' },
      { id: 'chuseok_q3', title: '🌕 Full Moon Wishes', desc: 'Earn 100 Season Points', target: 100, reward: { honor: 150, gems: 25 }, icon: '🌕' }
    ]
  },
  seollal: {
    id: 'seollal',
    name: '설날 (Seollal - Lunar New Year)',
    icon: '🧧',
    themeColor: '#38bdf8',
    borderClass: 'neon-border-cyan',
    desc: 'Lunar New Year: Cook Tteokguk 🥣, perform Sebae 🙇‍♂️ bowing, and earn Bonus Gems 💎!',
    buffText: '+1 Bonus Gem 💎 on Quests & Minigames',
    themedVocab: [
      { ko: '설날', en: 'Seollal (Lunar New Year)' },
      { ko: '떡국', en: 'Tteokguk (Rice Cake Soup)' },
      { ko: '세배', en: 'Sebae (New Year Bow)' },
      { ko: '복주머니', en: 'Lucky Pouch' },
      { ko: '덕담', en: 'New Year Blessing' },
      { ko: '연날리기', en: 'Kite Flying' }
    ],
    quests: [
      { id: 'seollal_q1', title: '🥣 New Year Tteokguk', desc: 'Cook 1 dish in Recipe Book', target: 1, reward: { gems: 15, coins: 150 }, icon: '🥣' },
      { id: 'seollal_q2', title: '🙇‍♂️ Sebae Bowing', desc: 'Complete 3 Korean Quizzes correctly', target: 3, reward: { gems: 25, honor: 50 }, icon: '🙇‍♂️' },
      { id: 'seollal_q3', title: '🧧 Lucky Pouch Collector', desc: 'Earn 100 Season Points', target: 100, reward: { gems: 50, honor: 200 }, icon: '🧧' }
    ]
  },
  childrens_day: {
    id: 'childrens_day',
    name: '어린이날 (Children\'s Day - May 5th)',
    icon: '🎈',
    themeColor: '#f43f5e',
    borderClass: 'neon-border-pink',
    desc: 'Children\'s Day: Play Dalgona minigame 🍭, unlock Balloon Auras 🎈 & enjoy 2x Coins 🪙 rate!',
    buffText: '2x Coins 🪙 Rate from all activities',
    themedVocab: [
      { ko: '어린이', en: 'Child / Children' },
      { ko: '달고나', en: 'Dalgona Candy' },
      { ko: '풍선', en: 'Balloon' },
      { ko: '장난감', en: 'Toy' },
      { ko: '선물', en: 'Gift / Present' },
      { ko: '동심', en: 'Childlike Innocence' }
    ],
    quests: [
      { id: 'childrens_q1', title: '🍭 Dalgona Challenge', desc: 'Complete 3 Quizzes without hints', target: 3, reward: { coins: 300, honor: 30 }, icon: '🍭' },
      { id: 'childrens_q2', title: '🎈 Balloon Party', desc: 'Earn 200 Coins from activities', target: 200, reward: { coins: 500, gems: 15 }, icon: '🎈' },
      { id: 'childrens_q3', title: '🧸 Happy Companion', desc: 'Feed your Pet companion 1 time', target: 1, reward: { gems: 30, honor: 100 }, icon: '🧸' }
    ]
  }
};

let currentLeaderboardTab = 'vocab';

function initSeasonalEvents() {
  if (typeof seasonalState === 'undefined' || !seasonalState) {
    seasonalState = { activeSeasonId: 'chuseok', seasonPoints: 0, claimedRewards: [] };
  }
  if (!seasonalState.activeSeasonId || !SEASONAL_EVENTS_CONFIG[seasonalState.activeSeasonId]) {
    seasonalState.activeSeasonId = 'chuseok';
  }
  updateSeasonalBanner();
}

function updateSeasonalBanner() {
  const cfg = SEASONAL_EVENTS_CONFIG[seasonalState.activeSeasonId] || SEASONAL_EVENTS_CONFIG.chuseok;
  const bannerEl = document.getElementById('event-banner');
  if (!bannerEl) return;

  bannerEl.style.borderColor = cfg.themeColor;
  const iconEl = document.getElementById('eb-icon');
  if (iconEl) iconEl.textContent = cfg.icon;
  const titleEl = document.getElementById('eb-title');
  if (titleEl) {
    titleEl.textContent = cfg.name;
    titleEl.style.color = cfg.themeColor;
  }
  const descEl = document.getElementById('eb-desc');
  if (descEl) descEl.textContent = cfg.buffText;
  const ptsEl = document.getElementById('eb-pts-val');
  if (ptsEl) ptsEl.textContent = seasonalState.seasonPoints || 0;

  bannerEl.style.display = 'flex';
}

function cycleSeasonalEvent() {
  const seasons = ['chuseok', 'seollal', 'childrens_day'];
  const curIdx = seasons.indexOf(seasonalState.activeSeasonId);
  const nextIdx = (curIdx + 1) % seasons.length;
  seasonalState.activeSeasonId = seasons[nextIdx];

  const cfg = SEASONAL_EVENTS_CONFIG[seasonalState.activeSeasonId];
  showToast(`🎉 Festival Changed to ${cfg.name}!`, 3500);
  persistSave();
  updateSeasonalBanner();
  const modal = document.getElementById('seasonal-overlay');
  if (modal && modal.classList.contains('visible')) {
    openSeasonalOverlay();
  }
}

function openSeasonalOverlay() {
  initSeasonalEvents();
  const cfg = SEASONAL_EVENTS_CONFIG[seasonalState.activeSeasonId];
  if (!cfg) return;

  const iconEl = document.getElementById('so-icon');
  if (iconEl) iconEl.textContent = cfg.icon;
  const titleEl = document.getElementById('so-title');
  if (titleEl) {
    titleEl.textContent = cfg.name;
    titleEl.style.color = cfg.themeColor;
  }
  const subEl = document.getElementById('so-subtitle');
  if (subEl) subEl.textContent = cfg.desc;

  const buffTextEl = document.getElementById('so-buff-text');
  if (buffTextEl) buffTextEl.textContent = cfg.buffText;

  const ptsEl = document.getElementById('so-pts-display');
  if (ptsEl) ptsEl.textContent = `${seasonalState.seasonPoints || 0} ⭐`;

  // Render Quests
  const qListContainer = document.getElementById('so-quests-list');
  if (qListContainer) {
    qListContainer.innerHTML = '';
    cfg.quests.forEach(q => {
      const isClaimed = (seasonalState.claimedRewards || []).includes(q.id);
      const qCard = document.createElement('div');
      qCard.style.cssText = 'background:rgba(30,41,59,0.7); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;';
      
      let rewardStr = '';
      if (q.reward.coins) rewardStr += `🪙+${q.reward.coins} `;
      if (q.reward.gems) rewardStr += `💎+${q.reward.gems} `;
      if (q.reward.honor) rewardStr += `🎖️+${q.reward.honor} `;

      qCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px">${q.icon}</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:#fff">${q.title}</div>
            <div style="font-size:11px; color:#cbd5e1; margin-top:2px">${q.desc}</div>
            <div style="font-size:10px; color:var(--neon-gold); margin-top:4px">Reward: ${rewardStr} +50 Pts ⭐</div>
          </div>
        </div>
        <button class="eb-btn" ${isClaimed ? 'disabled style="opacity:0.5;cursor:default;"' : `onclick="claimSeasonalQuest('${q.id}')"`}>
          ${isClaimed ? 'Claimed ✓' : 'Claim Reward'}
        </button>
      `;
      qListContainer.appendChild(qCard);
    });
  }

  // Render Themed Vocabulary Flashcards
  const vGridContainer = document.getElementById('so-vocab-grid');
  if (vGridContainer) {
    vGridContainer.innerHTML = '';
    cfg.themedVocab.forEach(v => {
      const vCard = document.createElement('div');
      vCard.className = 'seasonal-vocab-card';
      vCard.innerHTML = `
        <div style="font-family:'Noto Sans KR',sans-serif; font-size:18px; font-weight:bold; color:var(--neon-gold);">${v.ko}</div>
        <div style="font-size:11px; color:#e2e8f0; margin-top:4px;">${v.en}</div>
      `;
      vGridContainer.appendChild(vCard);
    });
  }

  setModalState('seasonal-overlay', true);
}

function closeSeasonalOverlay() {
  playChiptuneSFX('click');
  setModalState('seasonal-overlay', false);
}


function claimSeasonalQuest(questId) {
  const cfg = SEASONAL_EVENTS_CONFIG[seasonalState.activeSeasonId];
  if (!cfg) return;

  const quest = cfg.quests.find(q => q.id === questId);
  if (!quest) return;

  if (!seasonalState.claimedRewards) seasonalState.claimedRewards = [];
  if (seasonalState.claimedRewards.includes(questId)) return;

  seasonalState.claimedRewards.push(questId);
  seasonalState.seasonPoints = (seasonalState.seasonPoints || 0) + 50;

  if (quest.reward.coins) addCoins(quest.reward.coins);
  if (quest.reward.gems) addGems(quest.reward.gems);
  if (quest.reward.honor) addHonor(quest.reward.honor);

  persistSave();
  showToast(`🎉 Claimed Quest Reward: ${quest.title}! (+50 Event Pts ⭐)`);
  updateSeasonalBanner();
  openSeasonalOverlay();
  updateLeaderboardMetrics();
}

// ══════════════ LOCAL LEADERBOARD SYSTEM ═════════════════════════════════════

const LOCAL_RIVALS = [
  { name: 'Min-jun (민준)', title: 'Valley Veteran 🌾', words: 24, honor: 850, cookingTier: 'Sous Chef 🍲', arcade: 1450, dungeon: 8, duelStreak: 7 },
  { name: 'Seo-yeon (서연)', title: 'Hansik Scholar 👑', words: 18, honor: 620, cookingTier: 'Apprentice Chef 👨‍🍳', arcade: 1100, dungeon: 6, duelStreak: 5 },
  { name: 'Ji-hoon (지훈)', title: 'Spell Duelist ⚡', words: 12, honor: 450, cookingTier: 'Novice Cook 🍳', arcade: 850, dungeon: 4, duelStreak: 4 },
  { name: 'Ha-eun (하은)', title: 'Art Artisan 🎨', words: 8, honor: 280, cookingTier: 'Novice Cook 🍳', arcade: 520, dungeon: 2, duelStreak: 2 }
];

function computeCookingTier() {
  const dishes = inventoryState?.cookedDishes || {};
  const totalCooked = Object.values(dishes).reduce((a, b) => a + b, 0);
  if (totalCooked >= 50) return 'Grand Hansik Master 👑';
  if (totalCooked >= 30) return 'Master Chef 🌟';
  if (totalCooked >= 15) return 'Sous Chef 🍲';
  if (totalCooked >= 5) return 'Apprentice Chef 👨‍🍳';
  return 'Novice Cook 🍳';
}

function computeCookingTierScore(tierStr) {
  if (!tierStr) return 0;
  if (tierStr.includes('Grand')) return 500;
  if (tierStr.includes('Master Chef')) return 300;
  if (tierStr.includes('Sous Chef')) return 150;
  if (tierStr.includes('Apprentice')) return 50;
  return 10;
}

function updateLeaderboardMetrics() {
  if (typeof leaderboardState === 'undefined' || !leaderboardState) leaderboardState = { personalBests: {} };
  if (!leaderboardState.personalBests) leaderboardState.personalBests = {};

  // Total Words Mastered — mature under the scheduler (interval >= 21 days), not a
  // harvest tally, which a player could run up in a single session.
  const masteredCount = (typeof srsData !== 'undefined' && srsData)
    ? Object.values(srsData).filter(srsIsMature).length
    : 0;

  leaderboardState.personalBests.totalWordsMastered = masteredCount;
  leaderboardState.personalBests.totalHonor = playerCurrencies?.honor || 0;
  leaderboardState.personalBests.highestCookingTier = computeCookingTier();
  

  if (typeof leaderboardState.personalBests.arcadeHighScore !== 'number') {
    leaderboardState.personalBests.arcadeHighScore = 0;
  }
  if (typeof leaderboardState.personalBests.dungeonMaxFloor !== 'number') {
    leaderboardState.personalBests.dungeonMaxFloor = 0;
  }
  if (typeof leaderboardState.personalBests.duelMaxWinStreak !== 'number') {
    leaderboardState.personalBests.duelMaxWinStreak = 0;
  }

  persistSave();
}

function openLeaderboard(tab = 'vocab') {
  updateLeaderboardMetrics();

  // Render Personal Best Grid
  const pbGrid = document.getElementById('lb-pb-grid');
  if (pbGrid) {
    const pb = leaderboardState.personalBests;
    pbGrid.innerHTML = `
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">📖 Words Mastered: <b style="color:var(--neon-gold)">${pb.totalWordsMastered}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🎖️ Total Honor: <b style="color:var(--neon-gold)">${pb.totalHonor}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🍳 Cooking Tier: <b style="color:var(--neon-gold)">${pb.highestCookingTier}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">👾 Arcade Score: <b style="color:var(--neon-gold)">${pb.arcadeHighScore}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🗡️ Dungeon Floor: <b style="color:var(--neon-gold)">Floor ${pb.dungeonMaxFloor}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">⚡ Duel Streak: <b style="color:var(--neon-gold)">${pb.duelMaxWinStreak} Wins</b></div>
    `;
  }

  switchLeaderboardTab(tab);

  const modal = document.getElementById('leaderboard-overlay');
  setModalState('leaderboard-overlay', true);
}

function closeLeaderboard() {
  playChiptuneSFX('click');
  setModalState('leaderboard-overlay', false);
}


function switchLeaderboardTab(tabId) {
  currentLeaderboardTab = tabId;

  const tabBtns = document.querySelectorAll('.lb-tab-btn');
  tabBtns.forEach(btn => {
    if (btn.id === `lbtab-${tabId}` || btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const pb = leaderboardState.personalBests;
  const playerEntry = {
    name: 'Player (Hero Player) 🌟',
    title: 'Hangeul Learner',
    words: pb.totalWordsMastered || 0,
    honor: pb.totalHonor || 0,
    cookingTier: pb.highestCookingTier || 'Novice Cook 🍳',
    arcade: pb.arcadeHighScore || 0,
    dungeon: pb.dungeonMaxFloor || 0,
    duelStreak: pb.duelMaxWinStreak || 0,
    isPlayer: true
  };

  const allEntries = [...LOCAL_RIVALS, playerEntry];

  // Sort based on active tab
  allEntries.sort((a, b) => {
    if (tabId === 'vocab') return b.words - a.words;
    if (tabId === 'honor') return b.honor - a.honor;
    if (tabId === 'cooking') return computeCookingTierScore(b.cookingTier) - computeCookingTierScore(a.cookingTier);
    if (tabId === 'arcade') return b.arcade - a.arcade;
    if (tabId === 'dungeon') return b.dungeon - a.dungeon;
    if (tabId === 'duel') return b.duelStreak - a.duelStreak;
    return 0;
  });

  let valColHeader = 'Score';
  if (tabId === 'vocab') valColHeader = 'Words Mastered (>=5 Harvests)';
  if (tabId === 'honor') valColHeader = 'Total Honor 🏅';
  if (tabId === 'cooking') valColHeader = 'Cooking Rank';
  if (tabId === 'arcade') valColHeader = 'Arcade High Score';
  if (tabId === 'dungeon') valColHeader = 'Dungeon Max Floor';
  if (tabId === 'duel') valColHeader = 'Spell Duel Win Streak';

  let html = `
    <table class="lb-table">
      <thead>
        <tr>
          <th style="width:10%">Rank</th>
          <th style="width:35%">Valley Resident</th>
          <th style="width:25%">Title</th>
          <th style="width:30%">${valColHeader}</th>
        </tr>
      </thead>
      <tbody>
  `;

  allEntries.forEach((entry, idx) => {
    let rankBadge = `${idx + 1}`;
    if (idx === 0) rankBadge = '🥇 1st';
    if (idx === 1) rankBadge = '🥈 2nd';
    if (idx === 2) rankBadge = '🥉 3rd';

    let displayVal = '';
    if (tabId === 'vocab') displayVal = `${entry.words} words`;
    if (tabId === 'honor') displayVal = `${entry.honor} Honor 🏅`;
    if (tabId === 'cooking') displayVal = entry.cookingTier;
    if (tabId === 'arcade') displayVal = `${entry.arcade} pts`;
    if (tabId === 'dungeon') displayVal = `Floor ${entry.dungeon}`;
    if (tabId === 'duel') displayVal = `${entry.duelStreak} Win Streak`;

    const rowClass = entry.isPlayer ? 'class="lb-row-player"' : '';

    html += `
      <tr ${rowClass}>
        <td style="font-family:'Press Start 2P',monospace; font-size:10px">${rankBadge}</td>
        <td>${entry.name}</td>
        <td style="color:#94a3b8">${entry.title}</td>
        <td style="font-weight:bold; color:var(--neon-gold)">${displayVal}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  const container = document.getElementById('lb-table-container');
  if (container) container.innerHTML = html;
}

// ═══════════════ PROGRESS DASHBOARD ══════════════════════════════════════════
// A real scheduler is invisible without a readout: intervals live in a save file and the
// player has no way to tell whether they are actually retaining anything. This surfaces
// the four numbers that matter — what is due, what is mature, what is coming, and how
// often reviews are being failed.
function renderProgressOverlay() {
  const s = srsStats();
  const grid = $('prog-stat-grid');
  if (!grid) return;

  const totalWords = unlockedLevels.reduce((a, i) => a + (levelsData[i]?.words?.length || 0), 0);
  const cards = [
    { cls: 'gold',  val: s.dueNow,                       lbl: 'Due now' },
    { cls: 'green', val: s.mature,                       lbl: `Mature (${SRS_CFG.MATURE_IVL}d+)` },
    { cls: '',      val: s.graduated,                    lbl: 'Learned' },
    { cls: '',      val: s.learning,                     lbl: 'In learning' },
    { cls: '',      val: Math.max(0, totalWords - s.seen), lbl: 'Untouched' },
    { cls: s.retention !== null && s.retention < 80 ? 'rose' : 'green',
      val: s.retention === null ? '—' : s.retention + '%', lbl: 'Retention' },
  ];
  grid.innerHTML = cards.map(c =>
    `<div class="prog-stat ${c.cls}"><div class="prog-stat-val">${c.val}</div><div class="prog-stat-lbl">${c.lbl}</div></div>`
  ).join('');

  // 7-day forecast. Bars are scaled to the busiest day so a light week still reads clearly.
  const fc = srsForecast(7);
  const peak = Math.max(1, ...fc);
  const now = new Date();
  const labels = fc.map((_, i) => i === 0
    ? 'Today'
    : new Date(now.getTime() + i * DAY_MS).toLocaleDateString(undefined, { weekday: 'short' }));
  $('prog-forecast').innerHTML = fc.map((n, i) =>
    `<div class="prog-bar-col">
       <span class="prog-bar-n">${n || ''}</span>
       <div class="prog-bar ${i === 0 ? 'today' : ''}" style="height:${Math.round((n / peak) * 70)}%"></div>
       <span class="prog-bar-d">${labels[i]}</span>
     </div>`
  ).join('');

  // Per level: learned as the wide bar, mature overlaid, so the gap between "seen it" and
  // "actually retained it" is visible at a glance.
  $('prog-levels').innerHTML = unlockedLevels.slice().sort((a, b) => a - b).map(i => {
    const lvl = levelsData[i]; if (!lvl) return '';
    const learned = calcLevelProgress(i), mature = calcLevelMastery(i);
    return `<div class="prog-level-row">
      <span class="prog-level-name" title="${levelName(lvl)}">${lvl.icon || '📘'} ${levelName(lvl)}</span>
      <span class="prog-level-track">
        <span class="prog-level-learned" style="width:${learned}%"></span>
        <span class="prog-level-mature" style="width:${mature}%"></span>
      </span>
      <span class="prog-level-pct">${learned}% / ${mature}%</span>
    </div>`;
  }).join('');

  $('prog-footnote').innerHTML =
    `Cyan = learned, gold = mature. A word becomes <b>mature</b> once its review interval reaches
     ${SRS_CFG.MATURE_IVL} days, which takes several correctly spaced reviews — it cannot be rushed in
     one session. <b>Retention</b> is the share of reviews passed without a lapse.
     ${s.avgEase !== null ? `Average ease ${s.avgEase}.` : ''}`;
}

function openProgressOverlay() {
  playChiptuneSFX('click');
  renderProgressOverlay();
  setModalState('progress-overlay', true);
  $('progress-overlay').classList.remove('hidden');
}

function closeProgressOverlay() {
  playChiptuneSFX('click');
  $('progress-overlay').classList.add('hidden');
  setModalState('progress-overlay', false);
}

// Global window exports for HTML event bindings
window.openProgressOverlay = openProgressOverlay;
window.closeProgressOverlay = closeProgressOverlay;
window.openSeasonalOverlay = openSeasonalOverlay;
window.closeSeasonalOverlay = closeSeasonalOverlay;
window.cycleSeasonalEvent = cycleSeasonalEvent;
window.claimSeasonalQuest = claimSeasonalQuest;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.switchLeaderboardTab = switchLeaderboardTab;
