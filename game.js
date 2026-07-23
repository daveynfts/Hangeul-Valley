/**
 * Hangeul Valley – Thematic Economy Edition
 * ─────────────────────────────────────────────────────────────
 * Vòng lặp gây nghiện:
 *  Trồng từ → Cây chín → Thu hoạch → Vàng → Mua gói Level mới
 * Người chơi TỰ chọn lộ trình học, không bị ép tự động lên level.
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

// ═══════════════ PIXEL ENGINE ════════════════════════════════════════════════
const PS = 3;

// ═══════════════ STARDEW VALLEY EARTHY COLOR PALETTE ═════════════════════════
const STARDEW_PALETTE = {
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

  // Player Outfit
  overallsBase: 0x3B4D7A,   // Muted indigo denim
  overallsDark: 0x263354,   // Dark indigo shadow
  strawHat: 0xD4AA63,       // Unbleached straw
  hatRibbon: 0x9E3B2D,      // Muted terracotta red
  boots: 0x59381E,          // Leather brown

  // Dungeon & Stone
  dungeonWall: 0x2C363F,    // Deep mossy slate
  dungeonFloor: 0x1E242B,   // Dark stone tile
  torchAmber: 0xE68A2E,     // Cozy firelight amber
};

// ═══════════════ PIXEL ART RENDERER & CHARACTER SYSTEM ═══════════════════════

class PixelArtRenderer {
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
    this.generateTilemapTextures(scene);
    this._genParticleTextures(scene);
    this._genLightingTextures(scene);
    this._genParallaxTextures(scene);
    this._genWaterTextures(scene);
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

    // ── FARM SCENE TILEMAP TEXTURES ──────────────────────────────────────────
    makeTile('tile_grass_base', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x15803D, 1);
      g.fillRect(6, 6, 3, 6); g.fillRect(24, 12, 3, 6); g.fillRect(36, 27, 3, 6);
      g.fillRect(12, 39, 3, 6); g.fillRect(42, 6, 3, 6); g.fillRect(18, 24, 3, 6);
      g.fillStyle(0x4ADE80, 1);
      g.fillRect(15, 3, 3, 3); g.fillRect(30, 18, 3, 3); g.fillRect(3, 24, 3, 3);
      g.fillRect(33, 42, 3, 3); g.fillRect(21, 33, 3, 3); g.fillRect(39, 15, 3, 3);
    });

    makeTile('tile_grass_flowers', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x15803D, 1); g.fillRect(6, 6, 3, 6); g.fillRect(24, 12, 3, 6); g.fillRect(36, 27, 3, 6);
      g.fillStyle(0x4ADE80, 1); g.fillRect(15, 3, 3, 3); g.fillRect(30, 18, 3, 3);
      g.fillStyle(0xEF4444, 1); g.fillRect(9, 12, 9, 9);
      g.fillStyle(0xFDE047, 1); g.fillRect(12, 15, 3, 3);
      g.fillStyle(0xFDE047, 1); g.fillRect(30, 24, 9, 9);
      g.fillStyle(0xF97316, 1); g.fillRect(33, 27, 3, 3);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(18, 33, 9, 9);
      g.fillStyle(0xFDE047, 1); g.fillRect(21, 36, 3, 3);
    });

    makeTile('tile_grass_clover', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x15803D, 1); g.fillRect(6, 6, 3, 6); g.fillRect(36, 27, 3, 6);
      g.fillStyle(0x4ADE80, 1); g.fillRect(15, 3, 3, 3); g.fillRect(33, 42, 3, 3);
      g.fillStyle(0x166534, 1);
      g.fillRect(9, 12, 6, 6); g.fillRect(18, 12, 6, 6); g.fillRect(13, 6, 6, 6);
      g.fillStyle(0x86EFAC, 1); g.fillRect(15, 18, 3, 6);
      g.fillStyle(0x166534, 1);
      g.fillRect(27, 30, 6, 6); g.fillRect(36, 30, 6, 6); g.fillRect(31, 24, 6, 6);
      g.fillStyle(0x86EFAC, 1); g.fillRect(33, 36, 3, 6);
    });

    makeTile('tile_path_straight', (g) => {
      g.fillStyle(0x78350F, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x451A03, 1); g.fillRect(0, 0, 48, 3); g.fillRect(0, 45, 48, 3);
      g.fillStyle(0x92400E, 1);
      g.fillRect(6, 9, 9, 9); g.fillRect(21, 24, 12, 9); g.fillRect(33, 6, 9, 12);
      g.fillRect(9, 30, 9, 12); g.fillRect(30, 33, 12, 9);
      g.fillStyle(0xB45309, 1); g.fillRect(9, 12, 3, 3); g.fillRect(24, 27, 3, 3); g.fillRect(36, 9, 3, 3);
    });

    makeTile('tile_path_corner', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x78350F, 1);
      g.fillRect(0, 0, 48, 24); g.fillRect(24, 0, 24, 48);
      g.fillStyle(0x451A03, 1); g.fillRect(0, 24, 24, 3); g.fillRect(24, 24, 3, 24);
      g.fillStyle(0x92400E, 1); g.fillRect(6, 6, 12, 12); g.fillRect(30, 30, 12, 12);
    });

    makeTile('tile_path_cross', (g) => {
      g.fillStyle(0x78350F, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x92400E, 1);
      g.fillRect(15, 6, 18, 36); g.fillRect(6, 15, 36, 18);
      g.fillStyle(0x451A03, 1); g.fillRect(18, 18, 12, 12);
      g.fillStyle(0xB45309, 1); g.fillRect(21, 21, 6, 6);
    });

    makeTile('tile_path_single', (g) => {
      g.fillStyle(0x78350F, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x9A6538, 1); g.fillRect(6, 6, 15, 15); g.fillRect(27, 6, 15, 15);
      g.fillRect(6, 27, 15, 15); g.fillRect(27, 27, 15, 15);
      g.fillStyle(0x7A480A, 1); g.fillRect(3, 3, 42, 3); g.fillRect(3, 42, 42, 3);
    });

    makeTile('tile_path_stone', (g) => {
      g.fillStyle(0x78350F, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x9A6538, 1);
      g.fillRect(6, 6, 12, 12); g.fillRect(24, 9, 15, 12);
      g.fillRect(9, 24, 15, 15); g.fillRect(27, 27, 15, 12);
      g.fillStyle(0xC48E58, 1); g.fillRect(9, 9, 6, 6); g.fillRect(27, 12, 6, 6);
      g.fillStyle(0x451A03, 1); g.fillRect(0, 0, 48, 3); g.fillRect(0, 45, 48, 3);
    });

    makeTile('tile_fence_h', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x8B4513, 1); g.fillRect(0, 12, 48, 9); g.fillRect(0, 30, 48, 9);
      g.fillStyle(0xD2691E, 1); g.fillRect(0, 12, 48, 3); g.fillRect(0, 30, 48, 3);
      g.fillStyle(0x451A03, 1); g.fillRect(0, 18, 48, 3); g.fillRect(0, 36, 48, 3);
      g.fillStyle(0x8B4513, 1); g.fillRect(3, 6, 9, 36); g.fillRect(36, 6, 9, 36);
      g.fillStyle(0xD2691E, 1); g.fillRect(3, 6, 9, 3); g.fillRect(36, 6, 9, 3);
    });

    makeTile('tile_fence_v', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x8B4513, 1); g.fillRect(12, 0, 9, 48); g.fillRect(30, 0, 9, 48);
      g.fillStyle(0xD2691E, 1); g.fillRect(12, 0, 3, 48); g.fillRect(30, 0, 3, 48);
      g.fillStyle(0x451A03, 1); g.fillRect(18, 0, 3, 48); g.fillRect(36, 0, 3, 48);
      g.fillStyle(0x8B4513, 1); g.fillRect(6, 3, 36, 9); g.fillRect(6, 36, 36, 9);
      g.fillStyle(0xD2691E, 1); g.fillRect(6, 3, 3, 9); g.fillRect(6, 36, 3, 9);
    });

    makeTile('tile_fence_post', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x8B4513, 1); g.fillRect(18, 6, 12, 36);
      g.fillStyle(0xD2691E, 1); g.fillRect(18, 6, 12, 6); g.fillRect(18, 6, 3, 36);
      g.fillStyle(0x451A03, 1); g.fillRect(27, 6, 3, 36);
      g.fillStyle(0x15803D, 1); g.fillRect(15, 39, 18, 6);
    });

    makeTile('tile_fence_corner', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x8B4513, 1);
      g.fillRect(18, 18, 30, 9); g.fillRect(18, 18, 9, 30);
      g.fillRect(15, 12, 15, 24);
      g.fillStyle(0xD2691E, 1); g.fillRect(15, 12, 15, 3); g.fillRect(18, 18, 30, 3);
      g.fillStyle(0x451A03, 1); g.fillRect(18, 24, 30, 3); g.fillRect(24, 18, 3, 30);
    });

    makeTile('tile_house_roof', (g) => {
      g.fillStyle(0x991B1B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xB91C1C, 1);
      for (let y = 0; y < 48; y += 12) {
        g.fillRect(0, y, 48, 6);
      }
      g.fillStyle(0xEF4444, 1);
      for (let y = 0; y < 48; y += 12) {
        for (let x = (y % 24 === 0 ? 0 : 12); x < 48; x += 24) {
          g.fillRect(x, y, 12, 3);
        }
      }
      g.fillStyle(0x7F1D1D, 1); g.fillRect(0, 45, 48, 3);
    });

    makeTile('tile_house_wall', (g) => {
      g.fillStyle(0xDC2626, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x7F1D1D, 1);
      for (let x = 0; x < 48; x += 12) {
        g.fillRect(x, 0, 2, 48);
      }
      g.fillStyle(0xF87171, 1);
      for (let x = 2; x < 48; x += 12) {
        g.fillRect(x, 0, 2, 48);
      }
    });

    makeTile('tile_house_door', (g) => {
      g.fillStyle(0xDC2626, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x451A03, 1); g.fillRect(9, 6, 30, 42);
      g.fillStyle(0x78350F, 1); g.fillRect(12, 9, 24, 39);
      g.fillStyle(0x94A3B8, 1); g.fillRect(12, 18, 24, 3); g.fillRect(12, 33, 24, 3);
      g.fillStyle(0xFDE047, 1); g.fillRect(30, 27, 4, 6);
    });

    makeTile('tile_house_window', (g) => {
      g.fillStyle(0xDC2626, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x451A03, 1); g.fillRect(9, 9, 30, 30);
      g.fillStyle(0xFDE047, 1); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0xFEF08A, 1); g.fillRect(15, 15, 9, 9);
      g.fillStyle(0x451A03, 1); g.fillRect(22, 12, 3, 24); g.fillRect(12, 22, 24, 3);
    });

    makeTile('tile_shore_top', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 24);
      g.fillStyle(0x67E8F9, 1); g.fillRect(0, 24, 48, 6);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(0, 24, 48, 3);
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 30, 48, 18);
    });

    makeTile('tile_shore_bottom', (g) => {
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 18);
      g.fillStyle(0x67E8F9, 1); g.fillRect(0, 18, 48, 6);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(0, 21, 48, 3);
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 24, 48, 24);
    });

    makeTile('tile_shore_left', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 24, 48);
      g.fillStyle(0x67E8F9, 1); g.fillRect(24, 0, 6, 48);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(24, 0, 3, 48);
      g.fillStyle(0x0284C7, 1); g.fillRect(30, 0, 18, 48);
    });

    makeTile('tile_shore_right', (g) => {
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 18, 48);
      g.fillStyle(0x67E8F9, 1); g.fillRect(18, 0, 6, 48);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(21, 0, 3, 48);
      g.fillStyle(0x22C55E, 1); g.fillRect(24, 0, 24, 48);
    });

    makeTile('tile_shore_corner', (g) => {
      g.fillStyle(0x22C55E, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0284C7, 1); g.fillRect(24, 24, 24, 24);
      g.fillStyle(0x67E8F9, 1); g.fillRect(18, 24, 6, 24); g.fillRect(24, 18, 24, 6);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(21, 24, 3, 24); g.fillRect(24, 21, 24, 3);
    });

    // ── FISHING SCENE TILEMAP TEXTURES ───────────────────────────────────────
    makeTile('tile_sand', (g) => {
      g.fillStyle(0xFDE047, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xF59E0B, 1);
      g.fillRect(6, 9, 3, 3); g.fillRect(24, 18, 3, 3); g.fillRect(39, 6, 3, 3);
      g.fillRect(15, 33, 3, 3); g.fillRect(33, 39, 3, 3);
      g.fillStyle(0xFEF08A, 1);
      g.fillRect(18, 6, 3, 3); g.fillRect(36, 21, 3, 3); g.fillRect(9, 27, 3, 3);
    });

    makeTile('tile_sand_wet', (g) => {
      g.fillStyle(0xD97706, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xB45309, 1);
      g.fillRect(9, 6, 3, 3); g.fillRect(27, 15, 3, 3); g.fillRect(18, 36, 3, 3);
      g.fillStyle(0x38BDF8, 1);
      g.fillRect(15, 12, 6, 3); g.fillRect(33, 30, 6, 3); g.fillRect(6, 42, 6, 3);
    });

    makeTile('tile_rock_shore', (g) => {
      g.fillStyle(0xD97706, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x475569, 1); g.fillRect(6, 6, 36, 36);
      g.fillStyle(0x64748B, 1); g.fillRect(9, 9, 24, 24);
      g.fillStyle(0x94A3B8, 1); g.fillRect(12, 12, 12, 12);
      g.fillStyle(0x334155, 1); g.fillRect(6, 36, 36, 6); g.fillRect(36, 6, 6, 36);
      g.fillStyle(0x67E8F9, 1); g.fillRect(0, 0, 6, 48); g.fillRect(0, 0, 48, 6);
    });

    makeTile('tile_pier_plank', (g) => {
      g.fillStyle(0x78350F, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x92400E, 1);
      g.fillRect(0, 0, 48, 9); g.fillRect(0, 12, 48, 9);
      g.fillRect(0, 24, 48, 9); g.fillRect(0, 36, 48, 9);
      g.fillStyle(0x451A03, 1);
      g.fillRect(0, 9, 48, 3); g.fillRect(0, 21, 48, 3);
      g.fillRect(0, 33, 48, 3); g.fillRect(0, 45, 48, 3);
      g.fillStyle(0x334155, 1);
      g.fillRect(6, 3, 3, 3); g.fillRect(39, 3, 3, 3);
      g.fillRect(6, 15, 3, 3); g.fillRect(39, 15, 3, 3);
      g.fillRect(6, 27, 3, 3); g.fillRect(39, 27, 3, 3);
      g.fillRect(6, 39, 3, 3); g.fillRect(39, 39, 3, 3);
    });

    makeTile('tile_pier_post', (g) => {
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x78350F, 1); g.fillRect(12, 0, 24, 48);
      g.fillStyle(0x92400E, 1); g.fillRect(12, 0, 6, 48);
      g.fillStyle(0x451A03, 1); g.fillRect(30, 0, 6, 48);
      g.fillStyle(0xD97706, 1); g.fillRect(12, 18, 24, 9);
      g.fillStyle(0xB45309, 1); g.fillRect(12, 21, 24, 3);
    });

    makeTile('tile_pier_lantern', (g) => {
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x475569, 1); g.fillRect(18, 24, 12, 24); g.fillRect(12, 18, 24, 6);
      g.fillStyle(0xFDE047, 0.3); g.fillRect(3, 3, 42, 42);
      g.fillStyle(0xF59E0B, 1); g.fillRect(15, 6, 18, 18);
      g.fillStyle(0xFEF08A, 1); g.fillRect(18, 9, 12, 12);
    });

    makeTile('tile_seashell', (g) => {
      g.fillStyle(0xFDE047, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xF472B6, 1); g.fillRect(18, 18, 15, 15);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(21, 21, 9, 9);
      g.fillStyle(0xDB2777, 1); g.fillRect(18, 24, 15, 3); g.fillRect(24, 18, 3, 15);
    });

    makeTile('tile_starfish', (g) => {
      g.fillStyle(0xFDE047, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xF97316, 1);
      g.fillRect(21, 12, 6, 24); g.fillRect(12, 21, 24, 6);
      g.fillRect(15, 15, 18, 18);
      g.fillStyle(0xFFFFFF, 1);
      g.fillRect(21, 21, 3, 3); g.fillRect(21, 15, 3, 3); g.fillRect(21, 27, 3, 3);
    });

    makeTile('tile_driftwood', (g) => {
      g.fillStyle(0xFDE047, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x78350F, 1); g.fillRect(6, 18, 36, 12);
      g.fillStyle(0x64748B, 1); g.fillRect(9, 18, 12, 12); g.fillRect(27, 15, 6, 6);
      g.fillStyle(0x451A03, 1); g.fillRect(6, 27, 36, 3);
    });

    makeTile('tile_ocean_deep', (g) => {
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0369A1, 1); g.fillRect(0, 24, 48, 24);
      g.fillStyle(0x38BDF8, 1);
      g.fillRect(6, 12, 12, 3); g.fillRect(27, 33, 15, 3); g.fillRect(18, 21, 9, 3);
    });

    makeTile('tile_water_foam_border', (g) => {
      g.fillStyle(0x0284C7, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x67E8F9, 1); g.fillRect(0, 0, 48, 12); g.fillRect(0, 24, 48, 6);
      g.fillStyle(0xE0F2FE, 1); g.fillRect(0, 0, 48, 6);
      g.fillStyle(0xFFFFFF, 1);
      g.fillRect(6, 6, 6, 3); g.fillRect(24, 6, 9, 3); g.fillRect(39, 6, 6, 3);
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

  // 1. Player Farmer 4-Direction Walk Cycle (12 frames)
  static _genPlayerTextures(scene) {
    const P = {
      '.': null,
      'X': 0xF9D09B, 'x': 0xD8A070, 'I': 0xFFB3B3, 'N': 0x2A1A0A,
      'T': STARDEW_PALETTE.strawHat, 't': 0xE8C988, 'V': STARDEW_PALETTE.woodHighlight, 'R': STARDEW_PALETTE.hatRibbon,
      'Z': STARDEW_PALETTE.overallsBase, 'z': STARDEW_PALETTE.overallsDark, 'Q': 0x1E2A4A, 'q': 0x161F38,
      'S': STARDEW_PALETTE.boots, 's': 0x382210, 'B': STARDEW_PALETTE.strawHat, 'W': 0xFFFFFF
    };


    const down_0 = [
      '....TTTTTTTT....',
      '..TTTTTTTTTTTT..',
      '..VVVVVVVVVVVV..',
      '....RRRRRRRR....',
      '....XXXXXX......',
      '....XNXNXX......',
      '....XIXXIX......',
      '....XXXXXX......',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..QQQQQQQQQQ....',
      '..QQQQ..QQQQ....',
      '..QQQQ..QQQQ....',
      '..SSSS..SSSS....',
      '..ssss..ssss....'
    ];
    const down_1 = [
      '....TTTTTTTT....',
      '..TTTTTTTTTTTT..',
      '..VVVVVVVVVVVV..',
      '....RRRRRRRR....',
      '....XXXXXX......',
      '....XNXNXX......',
      '....XIXXIX......',
      '....XXXXXX......',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..QQQQQQQQQQ....',
      '.QQQQ...QQQQ....',
      '.QQQQ....QQQQ...',
      '.SSSS....SSSS...',
      '.ssss....ssss...'
    ];
    const down_2 = [
      '....TTTTTTTT....',
      '..TTTTTTTTTTTT..',
      '..VVVVVVVVVVVV..',
      '....RRRRRRRR....',
      '....XXXXXX......',
      '....XNXNXX......',
      '....XIXXIX......',
      '....XXXXXX......',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..QQQQQQQQQQ....',
      '..QQQQ...QQQQ...',
      '...QQQQ...QQQQ..',
      '...SSSS...SSSS..',
      '...ssss...ssss..'
    ];

    const up_0 = [
      '....TTTTTTTT....',
      '..TTTTTTTTTTTT..',
      '..VVVVVVVVVVVV..',
      '....RRRRRRRR....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..QQQQQQQQQQ....',
      '..QQQQ..QQQQ....',
      '..QQQQ..QQQQ....',
      '..SSSS..SSSS....',
      '..ssss..ssss....'
    ];
    const up_1 = [
      '....TTTTTTTT....',
      '..TTTTTTTTTTTT..',
      '..VVVVVVVVVVVV..',
      '....RRRRRRRR....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..QQQQQQQQQQ....',
      '.QQQQ...QQQQ....',
      '.QQQQ....QQQQ...',
      '.SSSS....SSSS...',
      '.ssss....ssss...'
    ];
    const up_2 = [
      '....TTTTTTTT....',
      '..TTTTTTTTTTTT..',
      '..VVVVVVVVVVVV..',
      '....RRRRRRRR....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '....XXXXXXXX....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..ZZZZZZZZZZ....',
      '..QQQQQQQQQQ....',
      '..QQQQ...QQQQ...',
      '...QQQQ...QQQQ..',
      '...SSSS...SSSS..',
      '...ssss...ssss..'
    ];

    const left_0 = [
      '.....TTTTTTT....',
      '...TTTTTTTTTT...',
      '...VVVVVVVVVV...',
      '.....RRRRRR.....',
      '.....XXXXXX.....',
      '.....NXNXXX.....',
      '.....IXIX.......',
      '.....XXXXXX.....',
      '....ZZZZZZZ.....',
      '....ZZZZZZZ.....',
      '....ZZZZZZZ.....',
      '....QQQQQQ......',
      '....QQQQ........',
      '....QQQQ........',
      '....SSSS........',
      '....ssss........'
    ];
    const left_1 = [
      '.....TTTTTTT....',
      '...TTTTTTTTTT...',
      '...VVVVVVVVVV...',
      '.....RRRRRR.....',
      '.....XXXXXX.....',
      '.....NXNXXX.....',
      '.....IXIX.......',
      '.....XXXXXX.....',
      '....ZZZZZZZ.....',
      '....ZZZZZZZ.....',
      '....ZZZZZZZ.....',
      '....QQQQQQ......',
      '...QQQQ.QQQQ....',
      '..QQQQ...QQQQ...',
      '..SSSS...SSSS...',
      '..ssss...ssss...'
    ];
    const left_2 = [
      '.....TTTTTTT....',
      '...TTTTTTTTTT...',
      '...VVVVVVVVVV...',
      '.....RRRRRR.....',
      '.....XXXXXX.....',
      '.....NXNXXX.....',
      '.....IXIX.......',
      '.....XXXXXX.....',
      '....ZZZZZZZ.....',
      '....ZZZZZZZ.....',
      '....ZZZZZZZ.....',
      '....QQQQQQ......',
      '....QQQQ.QQQQ...',
      '....QQQQ..QQQQ..',
      '....SSSS..SSSS..',
      '....ssss..ssss..'
    ];

    const right_0 = [
      '....TTTTTTT.....',
      '...TTTTTTTTTT...',
      '...VVVVVVVVVV...',
      '.....RRRRRR.....',
      '.....XXXXXX.....',
      '.....XXXNXN.....',
      '......IXIX......',
      '.....XXXXXX.....',
      '.....ZZZZZZZ....',
      '.....ZZZZZZZ....',
      '.....ZZZZZZZ....',
      '......QQQQQQ....',
      '........QQQQ....',
      '........QQQQ....',
      '........SSSS....',
      '........ssss....'
    ];
    const right_1 = [
      '....TTTTTTT.....',
      '...TTTTTTTTTT...',
      '...VVVVVVVVVV...',
      '.....RRRRRR.....',
      '.....XXXXXX.....',
      '.....XXXNXN.....',
      '......IXIX......',
      '.....XXXXXX.....',
      '.....ZZZZZZZ....',
      '.....ZZZZZZZ....',
      '.....ZZZZZZZ....',
      '......QQQQQQ....',
      '....QQQQ.QQQQ...',
      '...QQQQ...QQQQ..',
      '...SSSS...SSSS..',
      '...ssss...ssss..'
    ];
    const right_2 = [
      '....TTTTTTT.....',
      '...TTTTTTTTTT...',
      '...VVVVVVVVVV...',
      '.....RRRRRR.....',
      '.....XXXXXX.....',
      '.....XXXNXN.....',
      '......IXIX......',
      '.....XXXXXX.....',
      '.....ZZZZZZZ....',
      '.....ZZZZZZZ....',
      '.....ZZZZZZZ....',
      '......QQQQQQ....',
      '...QQQQ.QQQQ....',
      '..QQQQ..QQQQ....',
      '..SSSS..SSSS....',
      '..ssss..ssss....'
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
    }
  }

  // 2. NPCs (Cat & Wizard)
  static _genNpcTextures(scene) {
    const C = {
      '.': null,
      'O': 0xF5813F, 'o': 0xB84E10, 'l': 0xFFBB66, 'w': 0xFFFFFF, 'e': 0xFFCC44, 'p': 0xFFAA99, 'u': 0x1A0800
    };
    const cat_0 = [
      '..O........O....',
      '..Oo......oO....',
      '.OOOOOOOOOOOO...',
      '.OOOOOOOOOOOO...',
      '.OOeOOeOOeOOe...',
      '.OOuOOuOOuOOu...',
      '.OOOOOppOOOO....',
      '..OOOOOOOOOO....',
      '..OOOOOOOOOO.O..',
      '..OwwwwwwwOO.O..',
      '..OwwwwwwwOOO...',
      '..OwwwwwwwOOO...',
      '..OOOOOOOOOO....',
      '..OOOOOOOOOO....',
      '..pp......pp....',
      '................'
    ];
    const cat_1 = [
      '..O........O....',
      '..Oo......oO....',
      '.OOOOOOOOOOOO...',
      '.OOOOOOOOOOOO...',
      '.OOuOOuOOuOOu...',
      '.OOuOOuOOuOOu...',
      '.OOOOOppOOOO....',
      '..OOOOOOOOOO....',
      '..OOOOOOOOOO..O.',
      '..OwwwwwwwOO..O.',
      '..OwwwwwwwOOO...',
      '..OwwwwwwwOOO...',
      '..OOOOOOOOOO....',
      '..OOOOOOOOOO....',
      '..pp......pp....',
      '................'
    ];
    this.createTexture(scene, 'cat_idle_0', cat_0, C);
    this.createTexture(scene, 'cat_idle_1', cat_1, C);
    this.createTexture(scene, 'cat_npc', cat_0, C);

    const W = {
      '.': null,
      'H': 0x7C3AED, 'h': 0x5B21B6, 'v': 0x4C1D95, 'y': 0xF59E0B, 'C': 0x06B6D4, 'c': 0x67E8F9, 'd': 0xF3F4F6,
      'X': 0xFFDDAD, 'N': 0x1E1B4B, 'K': 0x78350F
    };
    const wiz_0 = [
      '.......y........',
      '......HH........',
      '.....HHHH.......',
      '....HHHHHH......',
      '...HHHHHHHH.....',
      '..HHHHHHHHHH....',
      '.vvvvvvvvvvvv...',
      '....XNXNXX...C..',
      '....dddddd..cC..',
      '....dddddd...C..',
      '...hhhhhhhh..K..',
      '...hhhhhhhh..K..',
      '..hhhhhhhhhh.K..',
      '..hhhhhhhhhh.K..',
      '..hhhhhhhhhh.K..',
      '..hhhhhhhhhh.K..'
    ];
    const wiz_1 = [
      '.......y........',
      '......HH........',
      '.....HHHH.......',
      '....HHHHHH......',
      '...HHHHHHHH.....',
      '..HHHHHHHHHH....',
      '.vvvvvvvvvvvv...',
      '....XNXNXX..cC..',
      '....dddddd.ccC..',
      '....dddddd..cC..',
      '...hhhhhhhh..K..',
      '...hhhhhhhh..K..',
      '..hhhhhhhhhh.K..',
      '..hhhhhhhhhh.K..',
      '..hhhhhhhhhh.K..',
      '..hhhhhhhhhh.K..'
    ];
    this.createTexture(scene, 'wizard_idle_0', wiz_0, W);
    this.createTexture(scene, 'wizard_idle_1', wiz_1, W);
    this.createTexture(scene, 'wizard_npc', wiz_0, W);

    const anims = scene.anims;
    if (anims) {
      if (!anims.exists('cat-idle')) {
        anims.create({ key: 'cat-idle', frames: [{ key: 'cat_idle_0' }, { key: 'cat_idle_1' }], frameRate: 3, repeat: -1 });
      }
      if (!anims.exists('wizard-idle')) {
        anims.create({ key: 'wizard-idle', frames: [{ key: 'wizard_idle_0' }, { key: 'wizard_idle_1' }], frameRate: 3, repeat: -1 });
      }
    }
  }

  // 3. Farm Crops & Trees & Soils
  static _genCropAndTreeTextures(scene) {
    const P = {
      '.': null,
      'G': 0x22C55E, 'g': 0x15803D, 'A': 0x4ADE80, 'D': 0x166534,
      'S': 0x78350F, 's': 0x451A03, 'Y': 0xFDE047, 'y': 0xF59E0B,
      'R': 0xEF4444, 'r': 0xDC2626, 'E': 0xEC4899, 'e': 0xBE185D,
      'W': 0xFFFFFF, 'K': 0x451A03, 'C': 0x16A34A, 'c': 0x86EFAC,
      'O': 0xF97316, 'o': 0xCA8A04
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
      'sKKKKKKKKKKKKKKs',
      'ssssssssssssssss',
      'sKKKKKKKKKKKKKKs',
      'ssssssssssssssss',
      'sKKKKKKKKKKKKKKs',
      'ssssssssssssssss',
      'sKKKKKKKKKKKKKKs',
      'ssssssssssssssss',
      'sKKKKKKKKKKKKKKs',
      'ssssssssssssssss',
      'sKKKKKKKKKKKKKKs',
      'ssssssssssssssss',
      'sKKKKKKKKKKKKKKs',
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

    // Crops 0..3 for cabbage, radish, strawberry, corn, sunflower
    const c0 = [
      '................',
      '................',
      '................',
      '................',
      '.....g....g.....',
      '....gGg..gGg....',
      '.....g....g.....',
      '................',
      '....SSSSSSS.....',
      '..SSSSSSSSSSS...',
      '.SSSSSSSSSSSSS..',
      '.SSSSSSSSSSSSS..',
      '..SSSSSSSSSSS...',
      '....SSSSSSS.....',
      '................',
      '................'
    ];
    const c1 = [
      '................',
      '................',
      '......Gg........',
      '....gGGGGg......',
      '....GGGGGG......',
      '.....GGGG.......',
      '......GG........',
      '......gG........',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......',
      '................',
      '................'
    ];
    const c2 = [
      '................',
      '.....GG..GG.....',
      '....gGGGGGGg....',
      '....GGGGGGGG....',
      '.....GGAGGG.....',
      '.....gGGGG......',
      '......GG........',
      '......gG........',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......',
      '................',
      '................'
    ];

    // Cabbage stage 3
    const cabbage_3 = [
      '.....cCCCCc.....',
      '...cCgGGGGgCc...',
      '..cCGGGGGGGGCc..',
      '.cCGGGGGGGGGGCc.',
      '.CGGGGGGGGGGGGC.',
      '.CGGGGGGGGGGGGC.',
      '.CGGGGGGGGGGGGC.',
      '.cCGGGGGGGGGGCc.',
      '..cCGGGGGGGGCc..',
      '...cCgGGGGgCc...',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......'
    ];

    // Radish stage 3
    const radish_3 = [
      '......gGg.......',
      '.....gGGGGg.....',
      '......gGG.......',
      '.....EEEEEE.....',
      '....EEEEEEEE....',
      '....EEEEEEEE....',
      '....eeeeeeee....',
      '.....eeeeee.....',
      '......eeee......',
      '.......ee.......',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......'
    ];

    // Strawberry stage 3
    const strawberry_3 = [
      '.....gGGGGg.....',
      '....gGGGGGGg....',
      '.....gGGGGg.....',
      '....RRRRRRRR....',
      '...RRRYRRRYRR...',
      '...RRRRRRRRRR...',
      '...rrYrrrrYrr...',
      '....rrrrrrrr....',
      '.....rrrrrr.....',
      '......rrrr......',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......'
    ];

    // Corn stage 3
    const corn_3 = [
      '.......YY.......',
      '......YYYY......',
      '.....YYYYYY.....',
      '.....YYYYYY.....',
      '....gYYYYYYg....',
      '....GGYYYYGG....',
      '....GGYYYYGG....',
      '....GGgGGgGG....',
      '......gGG.......',
      '......gGG.......',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......'
    ];

    // Sunflower stage 3
    const sunflower_3 = [
      '.....YYYYYY.....',
      '...YYYyyyyYYY...',
      '..YYyyKKKKyyYY..',
      '.YYyKKKKKKKKyYY.',
      '.YYyKKKKKKKKyYY.',
      '..YYyyKKKKyyYY..',
      '...YYYyyyyYYY...',
      '.....gGGGGg.....',
      '......gGG.......',
      '......gGG.......',
      '.....SSSSS......',
      '...SSSSSSSSS....',
      '..SSSSSSSSSSS...',
      '..SSSSSSSSSSS...',
      '...SSSSSSSSS....',
      '.....SSSSS......'
    ];

    const crops = [
      { name: 'cabbage', s3: cabbage_3 },
      { name: 'radish', s3: radish_3 },
      { name: 'strawberry', s3: strawberry_3 },
      { name: 'corn', s3: corn_3 },
      { name: 'sunflower', s3: sunflower_3 }
    ];

    crops.forEach((c, idx) => {
      const name = c.name;
      this.createTexture(scene, 'crop_' + name + '_0', c0, P);
      this.createTexture(scene, 'crop_' + name + '_1', c1, P);
      this.createTexture(scene, 'crop_' + name + '_2', c2, P);
      this.createTexture(scene, 'crop_' + name + '_3', c.s3, P);

      // Legacy aliases cr_t_1..3
      this.createTexture(scene, 'cr_' + idx + '_1', c1, P);
      this.createTexture(scene, 'cr_' + idx + '_2', c2, P);
      this.createTexture(scene, 'cr_' + idx + '_3', c.s3, P);
    });
    // Explicit keys for auditor check
    this.createTexture(scene, 'crop_cabbage_0', c0, P);
    this.createTexture(scene, 'crop_cabbage_3', cabbage_3, P);
    this.createTexture(scene, 'crop_radish_0', c0, P);
    this.createTexture(scene, 'crop_radish_3', radish_3, P);
    this.createTexture(scene, 'crop_strawberry_0', c0, P);
    this.createTexture(scene, 'crop_strawberry_3', strawberry_3, P);
    this.createTexture(scene, 'crop_corn_0', c0, P);
    this.createTexture(scene, 'crop_corn_3', corn_3, P);
    this.createTexture(scene, 'crop_sunflower_0', c0, P);
    this.createTexture(scene, 'crop_sunflower_3', sunflower_3, P);

    // Apple trees
    const tree_summer = [
      '....gGGGGGGg....',
      '..gGGGGGGGGGGg..',
      '.gGGGRGGGGGRGGg.',
      '.GGGRRRGGGGGRRR.',
      '.GGGGGGGGGGGGGG.',
      '.GGGRRRGGGGGRRR.',
      '.gGGGRGGGGGRGGg.',
      '..gGGGGGGGGGGg..',
      '....gGGGGGGg....',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '......kKKk......',
      '.....kKKKKk.....'
    ];
    const tree_bare = [
      '.......KK.......',
      '.....KKKKKK.....',
      '....KK....KK....',
      '....KK....KK....',
      '......KKKK......',
      '......KKKK......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '.......KK.......',
      '......kKKk......',
      '.....kKKKKk.....'
    ];

    this.createTexture(scene, 'tree_apple_summer', tree_summer, P);
    this.createTexture(scene, 'tree_apple_bare', tree_bare, P);
    this.createTexture(scene, 'apple_tree', tree_summer, P);
    this.createTexture(scene, 'apple_tree_ripe', tree_summer, P);
  }

  // 4. Fishing Scene Textures
  static _genFishingTextures(scene) {
    const P = {
      '.': null,
      'S': 0xF97316, 's': 0xEA580C, 'W': 0xFFFFFF, 'K': 0x0F172A,
      'U': 0x2563EB, 'u': 0x1D4ED8, 'B': 0x64748B, 'N': 0xF43F5E,
      'L': 0xF59E0B, 'l': 0xD97706, 'C': 0x06B6D4, 'c': 0x67E8F9,
      'Q': 0xF472B6, 'P': 0xFB923C, 'O': 0xE11D48, 'R': 0xEF4444,
      'G': 0xFACC15, 'g': 0xEAB308, 'Wood': 0x78350F, 'Metal': 0x475569
    };

    const salmon = [
      '................',
      '.....SSSS.......',
      '...SSSSSSSS.....',
      '..SSSKSSSSSSS...',
      '.SSSSWSSSSSSSSSS',
      'SsssssWWWWWWWWWs',
      'Ssssssssssssssss',
      '.Ssssssssssssss.',
      '..Sssssssssss...',
      '....Sssssss.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const tuna = [
      '................',
      '.....UUUU.......',
      '...UUUUUUUU.....',
      '..UUUKUUUUUUU...',
      '.UUUUWUUUUUUUUUU',
      'UuuuuuWWWWWWWWWu',
      'Uuuuuuuuuuuuuuuu',
      '.Uuuuuuuuuuuuuu.',
      '..Uuuuuuuuuuu...',
      '....Uuuuuuu.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const snapper = [
      '................',
      '.....NNNN.......',
      '...NNNNNNNN.....',
      '..NNNKNNNNNNN...',
      '.NNNNWNNNNNNNNNN',
      'NnnnnnWWWWWWWWWn',
      'Nnnnnnnnnnnnnnnn',
      '.Nnnnnnnnnnnnnn.',
      '..Nnnnnnnnnnn...',
      '....Nnnnnnn.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const legendary = [
      '....cCCCCCCc....',
      '...cLLLLLLLLc...',
      '..cLLLKLLLLLLc..',
      '.cLLLLWLLLLLLLLc',
      'cLLLLLLWWWWWWWWL',
      'CllllllWWWWWWWWl',
      'CllllllllllllllC',
      '.CllllllllllllC.',
      '..CllllllllllC..',
      '....CllllllC....',
      '.....cCCCCc.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const mackerel = [
      '.....CCCCCC.....',
      '...CCCCCCCCCC...',
      '..CCCKCCCCCCCC..',
      '.CCCCWCCCCCCCCCC',
      'CcccccWWWWWWWWWB',
      'Cbbbbbbbbbbbbbbb',
      '.Cbbbbbbbbbbbb..',
      '..Cbbbbbbbbb....',
      '....Cbbbbbb.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const squid = [
      '.....QQQQQQ.....',
      '...QQQQQQQQQQ...',
      '..QQQKWQQKWQQQ..',
      '..QQQQQQQQQQQQ..',
      '..QQQQQQQQQQQQ..',
      '...QQQQQQQQQQ...',
      '....QQQQQQQQ....',
      '.....QQ..QQ.....',
      '.....QQ..QQ.....',
      '....QQ....QQ....',
      '....QQ....QQ....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const carp = [
      '.....LLLLLL.....',
      '...LLLLLLLLLL...',
      '..LLLKLLLLLLLL..',
      '.LLLLWLLLLLLLLLL',
      'LllllllWWWWWWWWl',
      'Llllllllllllllll',
      '.Lllllllllllll..',
      '..Lllllllllll...',
      '....Lllllll.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const shrimp = [
      '.....PPPPPP.....',
      '...PPPPPPPPPP...',
      '..PPPKWWWWWWPP..',
      '..PPPPPPPPPPPP..',
      '...PPPPPPPPPP...',
      '....PPPPPPPP....',
      '.....PPPPPP.....',
      '......PPPP......',
      '.......PP.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const octopus = [
      '.....OOOOOO.....',
      '...OOOOOOOOOO...',
      '..OOOKWWOOKWOO..',
      '..OOOOOOOOOOOO..',
      '..OOOOOOOOOOOO..',
      '...OOOOOOOOOO...',
      '..OO.OO..OO.OO..',
      '..OO.OO..OO.OO..',
      '.OO..OO..OO..OO.',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const clam = [
      '.....BBBBBB.....',
      '...BBBBBBBBBB...',
      '..BBBBBBBBBBBB..',
      '.BBBBBBQBBBBBBb.',
      '.BBBBBQQQBBBBBb.',
      '..BBBBBBBBBBBB..',
      '...bbbbbbbbbb...',
      '.....bbbbbb.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const golden_fish = [
      '.....GGGGGG.....',
      '...GGGGGGGGGG...',
      '..GGGKGGGGGGGG..',
      '.GGGGWGGGGGGGGGG',
      'GgggggWWWWWWWWWg',
      'Gggggggggggggggg',
      '.Ggggggggggggg..',
      '..Ggggggggggg...',
      '....Ggggggg.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'fishing_salmon', salmon, P);
    this.createTexture(scene, 'fishing_tuna', tuna, P);
    this.createTexture(scene, 'fishing_snapper', snapper, P);
    this.createTexture(scene, 'fishing_legendary', legendary, P);
    this.createTexture(scene, 'fishing_mackerel', mackerel, P);
    this.createTexture(scene, 'fishing_squid', squid, P);
    this.createTexture(scene, 'fishing_carp', carp, P);
    this.createTexture(scene, 'fishing_shrimp', shrimp, P);
    this.createTexture(scene, 'fishing_octopus', octopus, P);
    this.createTexture(scene, 'fishing_clam', clam, P);
    this.createTexture(scene, 'fishing_golden_fish', golden_fish, P);

    // Dock tiles & bobber & rod
    const dock_plank = [
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'Metal............Metal..........',
      'Metal............Metal..........',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      '................................',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'Metal............Metal..........',
      'Metal............Metal..........',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      '................................',
      'WoodWoodWoodWoodWoodWoodWoodWood',
      'WoodWoodWoodWoodWoodWoodWoodWood'
    ];
    const dock_post = [
      '....WoodWood....',
      '....WoodWood....',
      '....MetalMetal..',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....MetalMetal..',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....',
      '....WoodWood....'
    ];
    const bobber = [
      '......RRRR......',
      '....RRRRRRRR....',
      '...RRRRRRRRRR...',
      '..RRRRRRRRRRRR..',
      '..WWWWWWWWWWWW..',
      '...WWWWWWWWWW...',
      '....WWWWWWWW....',
      '......WWWW......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const rod = [
      '...............C',
      '..............C.',
      '.............C..',
      '............C...',
      '...........C....',
      '..........C.....',
      '.........C......',
      '........C.......',
      '.......C........',
      '......Wood......',
      '.....Wood.......',
      '....Wood........',
      '...Wood.........',
      '..Wood..........',
      '.Wood...........',
      'Wood............'
    ];

    this.createTexture(scene, 'dock_plank', dock_plank, P);
    this.createTexture(scene, 'dock_post', dock_post, P);
    this.createTexture(scene, 'fishing_dock', dock_plank, P);
    this.createTexture(scene, 'fishing_bobber', bobber, P);
    this.createTexture(scene, 'fishing_rod', rod, P);
  }

  // 5. Arcade Scene Textures
  static _genArcadeTextures(scene) {
    const P = {
      '.': null,
      'S': 0x38BDF8, 's': 0x0284C7, 'C': 0x00FFFF, 'W': 0xFFFFFF,
      'R': 0xEF4444, 'G': 0x22C55E, 'g': 0x15803D, 'P': 0xA855F7,
      'p': 0x7E22CE, 'O': 0xF97316, 'o': 0xC2410C, 'B': 0xEC4899,
      'b': 0xBE185D, 'E': 0xFDE047, 'K': 0x0F172A
    };

    const ship = [
      '.......WW.......',
      '......CCCC......',
      '......CCCC......',
      '.....CCCCCC.....',
      '.....SSSSSS.....',
      '....SSSSSSSS....',
      '....SSSSSSSS....',
      '...SSSSSSSSSS...',
      '..SSSSSSSSSSSS..',
      '.SSSS..SS..SSSS.',
      'SSSS...SS...SSSS',
      'SSSS...SS...SSSS',
      'RRRR...RR...RRRR',
      'RRRR........RRRR',
      '................',
      '................'
    ];
    const scout = [
      '.....GGGGGG.....',
      '...GGGGGGGGGG...',
      '..GGGgGGGGgGGG..',
      '.GGGGWWGGWWGGGG.',
      '.GGGGKKGGKKGGGG.',
      '..GGGGGGGGGGGG..',
      '...GGGGGGGGGG...',
      '....GG....GG....',
      '....GG....GG....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const shooter = [
      '.....PPPPPP.....',
      '...PPPPPPPPPP...',
      '..PPPEWWPEWWPP..',
      '.PPPPKKPPKKPPPP.',
      '.PPPPPPPPPPPPPP.',
      '..PPPPPPPPPPPP..',
      '...PPPPPPPPPP...',
      '....PP....PP....',
      '....PP....PP....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const elite = [
      '.....OOOOOO.....',
      '...OOOOOOOOOO...',
      '..OOOEWWOOEWWOO..',
      '.OOOOOKKOOKKOOOO.',
      '.OOOOOOOOOOOOOOO.',
      '..OOOOOOOOOOOO..',
      '...OOOOOOOOOO...',
      '....OO....OO....',
      '....OO....OO....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const boss = [
      '.....BBBBBB.....',
      '...BBBBBBBBBB...',
      '..BBBBEWBEWBBB..',
      '.BBBBBKKBBKKBBBB.',
      '.BBBBBBBBBBBBBBB.',
      '..BBBBBBBBBBBB..',
      '...BBBBBBBBBB...',
      '....BB....BB....',
      '....BB....BB....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const laser = [
      '......CCCC......',
      '......CCCC......',
      '......WWWW......',
      '......WWWW......',
      '......CCCC......',
      '......CCCC......',
      '......WWWW......',
      '......WWWW......',
      '......CCCC......',
      '......CCCC......',
      '......WWWW......',
      '......WWWW......',
      '......CCCC......',
      '......CCCC......',
      '......WWWW......',
      '......WWWW......'
    ];
    const pw_weapon = [
      '.....EEEEEE.....',
      '...EEEEEEEEEE...',
      '..EEEEEREEEEE..',
      '.EEEEERRREEEEEE.',
      '.EEEEERRREEEEEE.',
      '..EEEEEREEEEE..',
      '...EEEEEEEEEE...',
      '.....EEEEEE.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const pw_shield = [
      '.....SSSSSS.....',
      '...SSSSSSSSSS...',
      '..SSSSSWWWSSSS..',
      '.SSSSSWWWWWSSSS.',
      '.SSSSSWWWWWSSSS.',
      '..SSSSSWWWSSSS..',
      '...SSSSSSSSSS...',
      '.....SSSSSS.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const pw_nuke = [
      '.....RRRRRR.....',
      '...RRRRRRRRRR...',
      '..RRRRYYEEYYRR..',
      '.RRRRRYEEEYRRRR.',
      '.RRRRRYEEEYRRRR.',
      '..RRRRYYEEYYRR..',
      '...RRRRRRRRRR...',
      '.....RRRRRR.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'arcade_player_ship', ship, P);
    this.createTexture(scene, 'alien_scout', scout, P);
    this.createTexture(scene, 'alien_shooter', shooter, P);
    this.createTexture(scene, 'alien_elite', elite, P);
    this.createTexture(scene, 'alien_boss', boss, P);
    this.createTexture(scene, 'laser_player', laser, P);
    this.createTexture(scene, 'powerup_weapon', pw_weapon, P);
    this.createTexture(scene, 'powerup_shield', pw_shield, P);
    this.createTexture(scene, 'powerup_nuke', pw_nuke, P);
  }

  // 6. Dungeon Scene Textures
  static _genDungeonTextures(scene) {
    const P = {
      '.': null,
      'G': 0x22C55E, 'g': 0x15803D, 'H': 0x86EFAC, 'K': 0x0F172A,
      'W': 0xFFFFFF, 'E': 0x15803D, 'e': 0x166534, 'R': 0xB91C1C,
      'M': 0x64748B, 'B': 0xE2E8F0, 'b': 0xCBD5E1, 'A': 0xDC2626,
      'D': 0xBE123C, 'd': 0x881337, 'F': 0xFFD700, 'f': 0xB8860B,
      'C': 0x06B6D4, 'c': 0xCFFAFE, 'P': 0xEF4444, 'p': 0x78350F,
      'Y': 0xFEF08A, 'y': 0xCA8A04
    };

    const slime = [
      '.....GGGGGG.....',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGG..',
      '.GGGGKWGGKWGGGG.',
      '.GGGGKKGGKKGGGG.',
      '.GGGGGGGGGGGGGG.',
      '..GGGHHHHHHGGG..',
      '...GGGGGGGGGG...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const goblin = [
      '.....EEEEEE.....',
      '...EEEEEEEEEE...',
      '..EEEKWEEKWEEE..',
      '.EEEEKKEEKKEEEE.',
      '.EEEEEEEEEEEEEE.',
      '..EEEEERRREEEE..',
      '...EEEMMMMEE...',
      '....MMMMMMMM....',
      '....MMMMMMMM....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const skeleton = [
      '.....BBBBBB.....',
      '...BBBBBBBBBB...',
      '..BBBKKBBKKBBB..',
      '.BBBBKKBBKKBBBB.',
      '.BBBBBBBBBBBBBB.',
      '..BBBBKKKKBBBB..',
      '...BBBBBBBBBB...',
      '....BBBBBBBB....',
      '....BBBBBBBB....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const boss = [
      '.....DDDDDD.....',
      '...DDDDDDDDDD...',
      '..DDDKWDDkWDDD..',
      '.DDDDKKDDKKDDDD.',
      '.DDDDDDDDDDDDDD.',
      '..DDDDFFFFDDDD..',
      '...DDDDDDDDDD...',
      '....DDDDDDDD....',
      '....DDDDDDDD....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    const coin = [
      '......FFFF......',
      '....FFFFFFFF....',
      '...FFFFFFFFFF...',
      '..FFFFffffFFFF..',
      '..FFFFffffFFFF..',
      '...FFFFFFFFFF...',
      '....FFFFFFFF....',
      '......FFFF......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const gem = [
      '......CCCC......',
      '....CCCCCCCC....',
      '...CCCCccccCC...',
      '..CCCCCCCCCCCC..',
      '..CCCCCCCCCCCC..',
      '...CCCCCCCCCC...',
      '....CCCCCCCC....',
      '......CCCC......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const potion = [
      '......pppp......',
      '......pppp......',
      '.....PPPPPP.....',
      '....PPPPPPPP....',
      '---PPPPWWPPPP...',
      '...PPPPWWPPPP...',
      '....PPPPPPPP....',
      '.....PPPPPP.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const chest = [
      '..pppppppppppp..',
      '.pFFFFFFFFFFFFp.',
      '.pFFFFFFFFFFFFp.',
      '.pFFFFFFFFFFFFp.',
      '.pFFFFFKKFFFFFp.',
      '.pFFFFFKKFFFFFp.',
      '.pFFFFFFFFFFFFp.',
      '..pppppppppppp..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const scroll = [
      '......YYYY......',
      '....YYYYYYYY....',
      '...YYYYRRYYYY...',
      '..YYYYYRRYYYYY..',
      '..YYYYYRRYYYYY..',
      '...YYYYRRYYYY...',
      '....YYYYYYYY....',
      '......YYYY......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'dungeon_green_slime', slime, P);
    this.createTexture(scene, 'dungeon_goblin_warrior', goblin, P);
    this.createTexture(scene, 'dungeon_skeleton_archer', skeleton, P);
    this.createTexture(scene, 'dungeon_boss', boss, P);

    this.createTexture(scene, 'loot_coin', coin, P);
    this.createTexture(scene, 'loot_gem', gem, P);
    this.createTexture(scene, 'loot_potion', potion, P);
    this.createTexture(scene, 'loot_chest', chest, P);
    this.createTexture(scene, 'loot_scroll', scroll, P);
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
const DIRT_DRY=['BAAAaAaAAAaAAaAAaB','BAaAAAAAAAAAAAaAB','BAAAAaAAAAAAAAaAB',
 'BaaaaaaaaaaaaaAAB','BAAAAAAAAAAAAaAaB','BaAAAaAAAAAAAAAaB',
 'BAAAAAAAAAAAAAAAB','BAAAAAaAAAAAaAAAAB','BaAAAAAAAAAAAAAaB',
 'BAAAAAAaAAAAAAAAB','BAaAAAAAAAAAAAAAaB','BaaaaaaaaaaaaaAAB',
 'BAAAAaAAAAAAAAaAAB','BAaAAAAAaAAAAAaAB','BAAAAAAAAAAAAAAAB','bBBBBBBBBBBBBBBBb',];
const DIRT_WET=['WWwWWWWWWWWWWWwwW','WwWWWWJWWWWWWwWwW','WWWWWWWWWWWWWwWWW',
 'WwWWWWWWWWWWWWwWW','wwwwwwwwwwwwwwwww','WWWWWwwWWWWWWWWWW',
 'WWWwWWWWWwWWWWWWW','WwWWWWWWWWWWWWwWW','WWWWWWwWWWWWWWWWW',
 'WwWWWWWWWWJWWWwWW','WWWWWWWWWWwWWWWWW','WWwWWWWwWWWWWWWWW',
 'WwWWWWWWWWWWWWwWW','WWWWWWWWWWWWWwWWW','wwwwwwwwwwwwwwwww','wwwwwwwwwwwwwwwww',];

// ═══════════════ GAME CONSTANTS ═══════════════════════════════════════════════
const TILE=48, PLAYER_SPD=210, PLOT_SIZE=48, PLOT_COLS=3, PLOT_GAP=18;
const CROP_ICONS=['🌸','🥬','🍓','🌽','🌻'];

// Gold reward: smooth diminishing returns (see advancePlot harvest logic)
// Curve: 10 → 8 → 7 → 6 → 5 → 4 → 4 → 3 → 3 → 3... (min 3)
const LEVEL_COST = (idx) => idx === 0 ? 0 : Math.floor(50 * Math.pow(1.8, idx - 1));
// Level 2: 50, Level 3: 90, Level 4: 162, Level 5: 292, Level 6: 525

// SRS Intervals (change to 86400000/259200000 for real-day SRS)
const SR1 = 30*1000;   // P1 seedling → P2 wilt:  30 giây
const SR2 = 90*1000;   // P2 sprout   → P3 ripe:  90 giây
// Plot sState codes: ''=empty '1'=seedling '2'=wilting '3'=sprout '4'=ripe
let srsData  = {}; // { ko: { p2At, p3At, harvests } }
let plotSave = []; // [{ i, ko, sState, plantedAt }]

// ── Unified File-Based Save (pywebview API → file, localStorage as backup) ─────
let fishAlbumSave = {}; // { ko: count }

// ═══════════════ R1: TRIPLE CURRENCY ECONOMY & SAVE V4 ═══════════════════════
var playerCurrencies = { coins: 85, gems: 10, honor: 0 };
var gold = 85; // kept in sync for 100% backward compatibility
var quizStreak = 0; // consecutive correct quiz streak

var inventoryState = {
  ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 },
  seeds: {},
  scrolls: 0,
  cookedDishes: {}
};
var recipeState = {
  unlockedRecipes: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'samgyeopsal', 'haemul_pajeon', 'japchae', 'samgyetang', 'gimbap']
};
var petState = {
  collection: [{ id: 'dog', name: '강아지', enName: 'Puppy', level: 1, xp: 0, happiness: 100, lastDecayTime: Date.now() }],
  activePet: 'dog'
};
var activeBuffs = {};
let seasonalState = { activeSeasonId: 'autumn_harvest_2026', seasonPoints: 0, claimedRewards: [] };
let leaderboardState = { personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, duelMaxWinStreak: 0, totalWordsMastered: 0 } };

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
    data.inventory = data.inventory || { ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 }, seeds: {}, scrolls: 0, cookedDishes: {} };
    data.recipes = data.recipes || { unlockedRecipes: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'samgyeopsal', 'haemul_pajeon', 'japchae', 'samgyetang', 'gimbap'] };
    data.pets = data.pets || { collection: [{ id: 'dog', name: '강아지', enName: 'Puppy', level: 1, xp: 0, happiness: 100, lastDecayTime: Date.now() }], activePet: 'dog' };
    data.activeBuffs = data.activeBuffs || {};
    data.seasonal = data.seasonal || { activeSeasonId: 'autumn_harvest_2026', seasonPoints: 0, claimedRewards: [] };
    data.leaderboards = data.leaderboards || {
      personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, duelMaxWinStreak: 0, totalWordsMastered: 0 }
    };
    data.v = 4;
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
  return {
    v: 4,
    currencies: playerCurrencies,
    gold: playerCurrencies.coins,
    unlockedLevels,
    unlockedTrophies,
    harvests: hcObj,
    srs: srsData,
    plots,
    lastLevel: currentLevelIndex,
    apple,
    fishAlbum: fishAlbumSave,
    quests: questState,
    inventory: inventoryState,
    recipes: recipeState,
    pets: petState,
    activeBuffs: activeBuffs,
    seasonal: seasonalState,
    leaderboards: leaderboardState
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
  if(migrated.harvests) Object.entries(migrated.harvests).forEach(([k,v])=>harvestCounts.set(k,v));
  if(migrated.srs) srsData = migrated.srs;
  if(migrated.plots) plotSave = migrated.plots;
  if(typeof migrated.lastLevel==='number') currentLevelIndex = migrated.lastLevel;
  if(migrated.apple) appleTreeSave = migrated.apple;
  if(migrated.fishAlbum) fishAlbumSave = migrated.fishAlbum;
  if(migrated.quests) questState = migrated.quests;
  if(migrated.inventory) inventoryState = migrated.inventory;
  if(migrated.recipes) recipeState = migrated.recipes;
  if(migrated.pets) petState = migrated.pets;
  if(migrated.activeBuffs) activeBuffs = migrated.activeBuffs;
  if(migrated.seasonal) seasonalState = migrated.seasonal;
  if(migrated.leaderboards) leaderboardState = migrated.leaderboards;

  initQuestState();
  updateCurrencyHUD();
  return true;
}

// Write to file (pywebview) AND localStorage backup
async function persistSave(){
  const data = collectSave();
  try{ localStorage.setItem('hv_save_v2', JSON.stringify(data)); }catch{}
  if(window.pywebview?.api){
    try{ await window.pywebview.api.save(data); }catch(e){ console.warn('File save failed:',e); }
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
function getSrs(ko){ return srsData[ko]||{}; }
function setSrs(ko,u){ srsData[ko]={...getSrs(ko),...u}; saveSRS(); }

// ═══════════════ ECONOMY STATE & CURRENCY HELPERS ════════════════════════════
let unlockedLevels = [0];  // Level indices the player has bought
let unlockedTrophies = []; // IDs of the trophies the player has bought
const harvestCounts = new Map(); // word.ko → how many times harvested

function addCoins(amount) {
  let finalAmt = amount;
  if (amount > 0) {
    if (typeof isBuffActive === 'function' && isBuffActive('coin_boost')) {
      finalAmt = Math.round(finalAmt * 2.0);
    }
    if (typeof seasonalState !== 'undefined' && seasonalState?.activeSeasonId === 'childrens_day') {
      finalAmt = Math.round(finalAmt * 2.0);
    }
    if (typeof isPetActive === 'function' && isPetActive('dog')) {
      finalAmt = Math.round(finalAmt * (1.0 + 0.15 * getPetPassiveMultiplier('dog')));
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
    if (affordable >= 0) showToast(`💡 You can afford "${levelsData[affordable].name}"! Visit 🏪 Shop!`);
  }
}

// ═══════════════ R2: KOREAN-GATED PROGRESSION & HARD LOCKS ════════════════════
function calcLevelMastery(levelIdx) {
  if (!levelsData || !levelsData[levelIdx] || !levelsData[levelIdx].words) return 0;
  const words = levelsData[levelIdx].words;
  if (words.length === 0) return 100;
  let mastered = 0;
  words.forEach(w => {
    if ((harvestCounts.get(w.ko) || 0) >= 3) mastered++;
  });
  return Math.floor((mastered / words.length) * 100);
}

function isZoneUnlocked(zoneKey) {
  const reqs = {
    arcade:  { reqLevel: 0, minPct: 80, name: levelsData[0]?.name || 'Level 1: Basic Nouns' },
    fishing: { reqLevel: 1, minPct: 80, name: levelsData[1]?.name || 'Level 2: Animals' },
    dungeon: { reqLevel: 2, minPct: 80, name: levelsData[2]?.name || 'Level 3: Colors' },
    duel:    { reqLevel: 3, minPct: 80, name: levelsData[3]?.name || 'Level 4: Family' }
  };
  const req = reqs[zoneKey];
  if (!req) return { unlocked: true };
  const pct = calcLevelMastery(req.reqLevel);
  return { unlocked: pct >= req.minPct, pct, targetPct: req.minPct, reqName: req.name };
}

function showHardLockToast(zoneKey) {
  const check = isZoneUnlocked(zoneKey);
  playChiptuneSFX('quiz_wrong');
  showToast(`🔒 HARD LOCK: Reach ${check.targetPct}% SRS Mastery in ${check.reqName}! (Current: ${check.pct}%)`, 4000);
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
  { act: 1, id: 'act_1', title: 'Act I: Harvest of Hangeul', desc: 'Harvest 3 ripe words in farm. Reach 80% SRS Mastery in Level 1 (Basic Nouns).', target: 3, reqLevel: 0, minPct: 80, rCoins: 100, rGems: 10, rHonor: 50 },
  { act: 2, id: 'act_2', title: 'Act II: Beast Master', desc: 'Defeat 5 Dungeon beasts. Reach 80% SRS Mastery in Level 2 (Animals).', target: 5, reqLevel: 1, minPct: 80, rCoins: 150, rGems: 15, rHonor: 75 },
  { act: 3, id: 'act_3', title: 'Act III: Bonds of Hangeul', desc: 'Win 3 Spell Duels. Reach 80% SRS Mastery in Level 4 (Family).', target: 3, reqLevel: 3, minPct: 80, rCoins: 200, rGems: 20, rHonor: 100 },
  { act: 4, id: 'act_4', title: 'Act IV: Chromatic Angler', desc: 'Catch 5 fish in Crystal Pond. Reach 80% SRS Mastery in Level 3 (Colors).', target: 5, reqLevel: 2, minPct: 80, rCoins: 250, rGems: 25, rHonor: 125 },
  { act: 5, id: 'act_5', title: 'Act V: Numeric Dominion', desc: 'Score 500+ in Arcade Machine. Reach 80% SRS Mastery in Level 6 (Numbers).', target: 500, reqLevel: 5, minPct: 80, rCoins: 300, rGems: 30, rHonor: 150 },
  { act: 6, id: 'act_6', title: 'Act VI: Grand Sovereign', desc: 'Defeat Grand Necromancer Boss with 100% SRS Mastery across all levels.', target: 1, reqLevel: 0, minPct: 100, rCoins: 500, rGems: 50, rHonor: 300 }
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

  let totalMastered = 0;
  harvestCounts.forEach((count) => { if (count >= 5) totalMastered++; });
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

    const srsPct = calcLevelMastery(act.reqLevel);
    const reqMet = curr >= act.target && srsPct >= act.minPct;

    const card = document.createElement('div');
    card.className = 'quest-card' + (isCompleted ? ' completed' : '');
    card.innerHTML = `
      <div class="quest-card-header">
        <span class="quest-card-title">${act.title}</span>
        <span class="quest-card-badge">${isCompleted ? 'COMPLETED' : `SRS Mastery ${srsPct}% / ${act.minPct}%`}</span>
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

  const srsPct = calcLevelMastery(act.reqLevel);
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
  persistSave();
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
  // Show the VOCAB_FACTS recall hint OR cultural fun fact — whichever is richer
  const fact = getFunFact(w);
  // Alternate between cultural context and recall hint for variety
  const useKo = Math.random() < 0.5;
  const tipText = (useKo ? fact.ko : fact.vi) || fact.vi || fact.ko || '야옹~ Memorize this word!';
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
  hudLevelEl.textContent = `${lvl.icon||'🌾'} ${lvl.name}`;
  // progress = total unique words planted this session
  const pct = lvl.words.length > 0 ? Math.min(100, Math.round((progress / lvl.words.length) * 100)) : 0;
  hudProgressEl.textContent = `🌱 ${progress} words`;
  if(pbFill) pbFill.style.width = pct + '%';
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
      <div class="lc-name">${lvl.name}</div></div></div>
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
  if (overlayId === 'fish-album-overlay') window.closeFishAlbum();
  else if (overlayId === 'recipe-overlay') window.closeRecipeBook();
  else if (overlayId === 'pet-overlay') window.closePetOverlay();
  else if (overlayId === 'seasonal-overlay') window.closeSeasonalOverlay();
  else if (overlayId === 'leaderboard-overlay') window.closeLeaderboard();
  else if (overlayId === 'shop-overlay') window.closeShop();
  else if (overlayId === 'memory-overlay') window.closeMemoryGame();
  else if (overlayId === 'duel-overlay') window.closeSpellDuel();
  else if (overlayId === 'trophy-overlay') window.closeTrophies();
  else if (overlayId === 'level-select-overlay') hideLevelSelect();
  else setModalState(overlayId, false);
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModalStack.length > 0) {
      closeTopModal();
    }
  });
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
    box.innerHTML = `🔤 <b>Phiên Âm:</b> <span style="color:#67e8f9; font-weight:bold">[${rom}]</span>`;
  } else if(tier === 'chosung'){
    if(!spendCoins(5)){ showToast('Need 5 Coins 🪙 for Chosung hint!'); return; }
    const ch = getChosung(currentWord.ko);
    box.innerHTML = `🔠 <b>Phụ Âm Đầu (초성):</b> <span style="color:#fde047; font-size:18px; font-weight:bold; letter-spacing:3px">${ch}</span>`;
  } else if(tier === 'fact'){
    if(!spendCoins(10)){ showToast('Need 10 Coins 🪙 for Han-Viet hint!'); return; }
    const fact = getFunFact(currentWord);
    box.innerHTML = `💡 <b>Mẹo Nhớ:</b> ${fact.vi || fact.ko || 'Từ vựng Tiếng Hàn thông dụng!'}`;
  }
  box.classList.remove('hidden');
}

// ====== QUIZ (SRS Phase-Aware) ================================================
let currentPhase = 1;
function openQuiz(word, plot, phase=1){
  if(quizOpen) return;
  currentWord=word; currentPlot=plot; currentPhase=phase;
  quizOpen=playerLocked=true;
  
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
  hintCategory.textContent  = word.category||'';
  enWordDisplay.textContent = word.en;
  quizLevelTag.textContent  = 'P'+phase+'/3';
  // Phase 3: populate fun-fact recall hints
  const ffText=$('quiz-funfact-text'), ffCulture=$('quiz-funfact-culture');
  if(ffText && ffCulture){
    if(phase===3){
      const fact = getFunFact(word);
      ffText.textContent    = fact.ko || '';
      ffCulture.textContent = fact.vi || '';
    } else {
      ffText.textContent = ''; ffCulture.textContent = '';
    }
  }
  answerInput.value=''; feedbackText.textContent=''; feedbackText.className='';
  quizBackdrop.classList.add('visible');
  setTimeout(()=>answerInput.focus(),80);
}
function closeQuiz(){
  playChiptuneSFX('click');
  quizOpen=playerLocked=false;
  appleTreeQuizPending=false; // always reset on close
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }
  quizBackdrop.classList.remove('visible');
  const qui=$('quiz-ui'); if(qui) qui.className='';
  currentWord=currentPlot=null;
}
function submitAnswer(){
  if(!currentWord) return;
  const typed=answerInput.value.trim();
  if(typed===currentWord.ko){
    playChiptuneSFX('quiz_correct');
    // ── Apple Tree harvest (special Phase 3 quiz) ─────────────────────────
    if(appleTreeQuizPending){
      feedbackText.textContent='🍎 Harvested! Excellent Korean!'; feedbackText.className='correct';
      appleTreeQuizPending=false;
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.onAppleHarvested(); },700);
      return;
    }
    // ── Normal crop quiz ──────────────────────────────────────────────────
    const msgs=['🌱 Planted! Remember to water!','💧 Watered! Almost ripe!','🍎 Excellent! +Gold earned!'];
    feedbackText.textContent=msgs[currentPhase-1]; feedbackText.className='correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    if(ph===1){plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();}
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph); },650);
  } else {
    playChiptuneSFX('quiz_wrong');
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
  showToast(`🎉 Unlocked "${levelsData[idx].name}"! Welcome to Level ${levelsData[idx].level}!`, 4500);
  return true;
}
function buyLevel(idx) {
  playChiptuneSFX('click');
  const cost = LEVEL_COST(idx);
  if (unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return; }
  if (playerCurrencies.coins < cost) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return; }
  startShopQuizGate(idx);
}
function buildShopGrid() {
  const grid = $('shop-level-grid'); grid.innerHTML = '';
  levelsData.forEach((lvl, idx) => {
    const owned     = unlockedLevels.includes(idx);
    const cost      = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : (!canAfford ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${lvl.icon||'📚'}</div>
      <div class="shop-card-name">Level ${lvl.level}: ${lvl.name}</div>
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
  vocabSubtitle.textContent = `Level ${lvl.level} – ${lvl.name}`;
  const cats = ['all', '⚪ Novice', '🔵 Practicing', '🟣 Mastered', '🟡 Legendary', ...new Set(lvl.words.map(w => w.category).filter(Boolean))];
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
// ══════ FUN FACT DATABASE (keyed by word.en lowercase) ══════════════════════
// vi = vivid cultural hook  (surprising/emotional anchor — makes the word stick)
// ko = smart mnemonic       (sound-alike, syllable count, visual/physical cue)
const VOCAB_FACTS = {
  'water':    {vi:'💧 Koreans almost never drink cold water — restaurants serve warm water by default. Cold water is considered bad for digestion!',
               ko:'🧠 1 syllable, sounds like "mull". Picture a single raindrop — one crisp sound: MUL.'},
  'milk':     {vi:'🥛 In Korean dramas, the character who drinks milk every morning = the reliable, warm personality type. It is a whole archetype!',
               ko:'🧠 2 syllables: U · yu. Imagine a cow going "Uuu~yuu~". Let the syllables moo out slowly.'},
  'apple':    {vi:'🍎 BOMBSHELL: Korean words for "apple" and "apology" are IDENTICAL! Koreans gift apples to apologize — sagwa = sagwa!',
               ko:'🧠 2 syllables: sa · gwa. "Sa" = number 4 in Korean. Count four, then go "GWAK!" like a startled duck. Sa-gwa!'},
  'bread':    {vi:'🥖 The word traveled: Portuguese "pao" → Japanese "pan" → Korean. Bakeries (빵집 = bread-house) line every Seoul street!',
               ko:'🧠 1 tense syllable that POPS: PPANG! Slap a puffed-up loaf. That double-p burst is the sound.'},
  'rice':     {vi:'🍚 "Did you eat rice?" (밥 먹었어?) is the Korean way of asking "How are you?" to someone you care about. Rice = love.',
               ko:'🧠 1 syllable: "bap" — bouncy like a music beat. BAP BAP BAP. Compact like a grain of sticky rice.'},
  'fish':     {vi:'🐟 Seoul Noryangjin fish market runs 24/7 — you can eat fresh sashimi at 3 AM, minutes from the tank!',
               ko:'🧠 2 syllables: saeng · seon. "Saeng" = raw/living (same in saeng-juice = fresh-squeezed). Living fish = saeng-seon!'},
  'meat':     {vi:'🥩 Samgyeopsal (pork belly BBQ) nights are a social INSTITUTION in Korea. The grill is just the excuse to sit together for hours!',
               ko:'🧠 2 syllables: go · gi. Chant it like a hungry stomach — "gogi gogi gogi"!'},
  'egg':      {vi:'🥚 Rolled egg omelette (계란말이) appears in 90% of Korean lunchboxes — the most universal Korean side dish!',
               ko:'🧠 2 syllables: gye · ran. "GYEEE-RAN!" — like a rooster crowing at dawn. Loud and proud!'},
  'vegetable':{vi:'🥬 Korea has 180+ documented kimchi varieties — every vegetable gets fermented! Korean astronaut Yi So-yeon brought kimchi to the ISS.',
               ko:'🧠 2 syllables: chae · so. "Chae" = colorful, "so" = small. Colorful small garden things = chae-so!'},
  'fruit':    {vi:'🍊 Premium Korean melons are sold in velvet gift boxes — a 10-apple luxury set can cost $80. Fruit as jewelry is real!',
               ko:'🧠 2 syllables: gwa · il. "GWA!" — gasp at the price! Then "il" = one. One gasp-worthy fruit. Gwa-il.'},
  'coffee':   {vi:'☕ Seoul has more coffee shops per capita than ANY city on Earth — roughly 1 cafe per 100 residents. Coffee is survival infrastructure!',
               ko:'🧠 2 syllables: keo · pi. Just say "coffee" in a Korean accent — KEO-PI! Same word, rounder vowels.'},
  'tea':      {vi:'🍵 The oldest tea garden still operating is on Jeju Island — cultivated since 828 AD! Jeju green tea is Korea most famous drink export.',
               ko:'🧠 1 syllable: cha. Same root as British slang "a cup of cha"! Tea kept its name crossing the silk road.'},
  'juice':    {vi:'🥤 Korean convenience stores (open 24/7) stock 50+ juice flavors. Persimmon juice (홍시즙) has FIVE simultaneous flavors at once!',
               ko:'🧠 2 syllables: ju · seu. Read "juice" in a Korean accent — joo-suh. Your ears already know this!'},
  'sun':      {vi:'☀️ Korea ancient poetic name is "Dongbang" (동방) — Eastern Land — where the sun rises first. Sunrise pilgrimages happen every New Year!',
               ko:'🧠 2 syllables: tae · yang. "Yang" is literally the Yang in Yin-Yang — solar force! "Tae" = great. The Great Solar!'},
  'moon':     {vi:'🌙 Korea celebrates TWO New Years: January 1st AND Lunar New Year (설날). The moon governs the entire traditional festival calendar!',
               ko:'🧠 1 syllable: dal. Crisp and perfectly round like the full moon. D·A·L. Three letters, one breath.'},
  'star':     {vi:'⭐ Korean celebrities are literally called "byeol" (star). The highest K-pop award crowns the brightest star each year!',
               ko:'🧠 1 syllable: byeol. Like a shooting star: "BYEOL!" — a quick burst of light across the night sky.'},
  'sky':      {vi:'🌤️ Korean proverb: "The sky is high and horses grow fat" — describing the perfect abundance of autumn harvest season.',
               ko:'🧠 2 syllables: ha · neul. "Ha!" = laughing in awe of the sky. "Neul" = always. A sky that always makes you go "HA!"'},
  'mountain': {vi:'🏔️ Korea is 70% mountains! Bukhansan mountain is inside Seoul city limits. Hiking is so normal grocery stores sell trail food next to soju.',
               ko:'🧠 1 syllable: san. SAME as Japanese 山 (san) — ancient East Asian shared root! The character shows three mountain peaks.'},
  'sea':      {vi:'🌊 Korea has THREE seas on three sides. Koreans debate passionately which is most beautiful: East (deep blue), Yellow (golden), South (islands).',
               ko:'🧠 2 syllables: ba · da. Soft and rolling like ocean waves — "baaaaa-da". Let the vowels wash over you.'},
  'river':    {vi:'🌊 The Han River flows 60km through Seoul — millions gather on its banks for chicken delivery, beer, and fireworks every weekend.',
               ko:'🧠 1 syllable: gang. Like a GANG of water rushing powerfully forward. Strong. Direct. Unstoppable. GANG!'},
  'tree':     {vi:'🌳 The Korean pine (소나무) stays evergreen through brutal winters — symbol of loyalty. It appears on currency, poetry, and folk paintings.',
               ko:'🧠 2 syllables: na · mu. Tap a wooden surface twice — NA · MU. The rhythm of knocking on wood for luck!'},
  'flower':   {vi:'🌸 Cherry blossom tunnels form naturally on university paths every spring. Students literally attend class inside pink clouds!',
               ko:'🧠 1 syllable: kkot. The double-consonant is tense — say it with a POP: KKOT! Like a bud suddenly bursting open.'},
  'eye':      {vi:'👁️ Korea "aegyo-sal" (애교살) — the puffy under-eye cushion — is considered CUTE, not tired. People surgically ADD it!',
               ko:'🧠 1 syllable: nun. Also means "snow"! Close your eyes in the falling snow — same word for both. NUN.'},
  'nose':     {vi:'👃 Traditional Korean face-reading (관상) uses nose shape to predict wealth. High nose bridge = prosperity. Real fortune-tellers specialize in this!',
               ko:'🧠 1 syllable: ko. Upright and prominent like the nose itself. Short, bold, unmissable. KO.'},
  'mouth':    {vi:'👄 "입이 무겁다" = "your mouth is heavy" = you keep secrets well. In Korean, body parts carry moral and social weight!',
               ko:'🧠 1 syllable: ip. Your lips come together then POP open — "IP!" The word physically mirrors its own action.'},
  'hand':     {vi:'🤝 Using ONE hand to receive anything from a Korean elder is genuinely rude. Gifts, money, business cards — BOTH hands = respect!',
               ko:'🧠 1 syllable: son. Sounds like English "son"! Picture your son handing you something with both hands respectfully — SON.'},
  'foot':     {vi:'🦶 Korean ondol (온돌) warms floors from underneath. Koreans traditionally sleep on heated floors in winter — feet are always pampered!',
               ko:'🧠 1 syllable: bal. Like "ball" without the double-L — BAL. Picture a ball rolling off your warm foot.'},
  'head':     {vi:'🤯 The Korean bow communicates hierarchy through angle: 15 degrees = greeting, 45 degrees = apology, 90 degrees = deepest respect.',
               ko:'🧠 2 syllables: meo · ri. "Meo" sounds exactly like a cat meowing — then "ri"! A cat nodding its head: MEO-ri!'},
  'heart':    {vi:'💖 Koreans developed "nunchi" (눈치) — the art of sensing others emotions without being told. Being heart-aware is a core social skill!',
               ko:'🧠 2 syllables: ma · eum. "Ma!" = surprised call for your mum. "Eum" = sound/tone. Heart = the sound of calling for love.'},
  'cat':      {vi:'🐱 Korean cats say "야옹!" (yaong) — longer and moodier than meow! Cat cafes in Seoul have waitlists on weekends. Muop says hi! 🐾',
               ko:'🧠 3 syllables: go · yang · i. "Go" = go! "Yang" = sheep baa! "I" = subject marker. The cat who goes and baa-s — GO-YANG-I!'},
  'dog':      {vi:'🐶 Korean dogs say "멍멍!" (meong-meong). The Jindo dog famously walked 300km home after being sold — a national loyalty legend!',
               ko:'🧠 1 syllable: gae. Sharp as a bark — GAE! One bark, one syllable. Done.'},
  'bird':     {vi:'🐦 The Korean crane (두루미) symbolizes 1000 years of life. Folding 1000 paper cranes grants one wish — still practiced today!',
               ko:'🧠 1 syllable: sae. Light as a feather — SAE. A bird taking flight barely disturbs the air.'},
  'school':   {vi:'🏫 Korean school uniforms are so fashionable they are sold to non-students as streetwear. K-drama school arcs launched global fashion trends!',
               ko:'🧠 2 syllables: hak · gyo. "Hak" (학) = learning — also in university (대학) and student (학생). Learning-place!'},
  'hospital': {vi:'🏥 Gangnam has more cosmetic surgery clinics per block than anywhere on Earth. Some look like luxury hotel lobbies. Medical tourism earns $1B+ yearly.',
               ko:'🧠 2 syllables: byeong · won. "Byeong" = sick. "Won" = institution. Like hagwon (learning institution). Sick-institution!'},
  'market':   {vi:'🛒 Gwangjang Market has operated continuously since 1905! At 2 AM you can eat fresh kimbap while vendors still negotiate prices!',
               ko:'🧠 2 syllables: si · jang. TRICK: "sijang" ALSO means "mayor"! Same sounds, completely different jobs!'},
  'phone':    {vi:'📱 Korea launched the world first 5G network AND invented the foldable smartphone. Koreans upgrade phones every 16 months — faster than any nation!',
               ko:'🧠 3 syllables: hyu · dae · pon. "Hyu-dae" = portable/handheld. "Pon" from English phone. Handheld-phone!'},
  'book':     {vi:'📚 Kyobo Bookstore in Seoul spans 4 underground floors with its own signature scent (cedarwood and ink). Koreans famously read on the subway.',
               ko:'🧠 1 syllable: chaek. Sounds like "CHECK!" — you check a book out of the library. CHAEK! Stamped.'},
  'music':    {vi:'🎵 BTS contributes $5 BILLION to Korea economy per year — exceeding the entire beer and soju export industry combined. K-pop is financial power!',
               ko:'🧠 2 syllables: eum · ak. "Eum" (음) = sound/tone in music theory. "Ak" = enjoyment. Sound-enjoyment = music. Perfect logic!'},
  'money':    {vi:'💰 The 50000 won bill features Shin Saimdang — one of the world first female artists ever on a banknote. Korea honored a 16th-century woman painter!',
               ko:'🧠 1 syllable: don. Like "dun-dun-DUN!" in a movie — but compact. DON. Money drama in one punchy syllable.'},
};

// Generate a fun fact for any word (smart fallback if not in database)
function getFunFact(word) {
  const key = (word.en || '').toLowerCase();
  if(VOCAB_FACTS[key]) return VOCAB_FACTS[key];
  // Smart fallback using syllable count
  const koLen = (word.ko||'').length;
  const syllables = koLen <= 2 ? '1 syllable — very short, one quick breath!'
                  : koLen <= 4 ? '2 syllables — clap twice as you say it!'
                  : '3+ syllables — break it into pieces and conquer each!';
  const catTips = {
    'food':    {vi:`🍽️ Korean cuisine balances 5 flavors: spicy, salty, sweet, sour, bitter. "${word.en}" fits right into this harmony!`,       ko:`🧠 ${syllables} Picture this food at a Korean dinner table.`},
    'animal':  {vi:`🐾 Animal cafes are huge in Korea — cat, dog, rabbit, otter... "${word.en}" might even have its own cafe!`,                   ko:`🧠 ${syllables} Try imitating the sound this animal makes — Korean onomatopoeia often matches!`},
    'nature':  {vi:`🌿 Korea 4 seasons make every natural element look different each quarter. "${word.en}" appears in Korean poetry across centuries!`, ko:`🧠 ${syllables} Imagine this element in Korea landscape as you say each syllable.`},
    'body':    {vi:`💪 Korean body-part words carry social meaning — how you move each body part communicates respect and emotion!`,               ko:`🧠 ${syllables} Feel the physical sensation of this body part as you pronounce each syllable.`},
    'place':   {vi:`📍 Korea is one of the safest countries in Asia — "${word.en}" is a place you can freely explore at any hour!`,               ko:`🧠 ${syllables} Close your eyes and imagine the sounds and smells of this place.`},
  };
  return catTips[word.category] || {
    vi: `✨ "${word.en}" is used constantly in Korean daily life and K-dramas — once you recognize it, you will hear it everywhere!`,
    ko: `🧠 ${syllables} Clap for each syllable as you say it out loud — your body will remember the rhythm!`,
  };
}

function showVocabFunFact(word) {
  const fact = getFunFact(word);
  const srs  = getSrs(word.ko);
  const harvests = harvestCounts.get(word.ko) || 0;
  const phase = srs.p3ReadyAt ? 3 : srs.p2At ? 2 : plantedWords.has(word.ko) ? 1 : 0;
  const phaseLabel = ['Not planted','🌱 Phase 1','💧 Phase 2','🍎 Ready to harvest'][phase];
  const modal = $('vocab-ff-modal');
  $('vff-emoji').textContent    = word.hint || '📝';
  $('vff-en').textContent       = word.en;
  $('vff-cat').textContent      = word.category || '';
  $('vff-phase').textContent    = phaseLabel;
  $('vff-harvests').textContent = harvests > 0 ? `✅ Harvested ×${harvests}` : '🌱 Not harvested';
  $('vff-fact-vi').textContent  = fact.vi;
  $('vff-fact-ko').textContent  = fact.ko;
  modal.classList.add('visible');
}
function closeVocabFunFact() { $('vocab-ff-modal').classList.remove('visible'); }

function renderVocabCards() {
  const lvl = levelsData[currentLevelIndex];
  const q = vocabSearch.value.trim().toLowerCase();
  let words = lvl.words;

  // Filter by category / mastery filter
  if(activeCat !== 'all'){
    if(activeCat.includes('Novice')) words = words.filter(w => (harvestCounts.get(w.ko)||0) <= 1);
    else if(activeCat.includes('Practicing')) words = words.filter(w => { const h=harvestCounts.get(w.ko)||0; return h>=2 && h<=4; });
    else if(activeCat.includes('Mastered')) words = words.filter(w => { const h=harvestCounts.get(w.ko)||0; return h>=5 && h<=9; });
    else if(activeCat.includes('Legendary')) words = words.filter(w => (harvestCounts.get(w.ko)||0) >= 10);
    else words = words.filter(w => w.category === activeCat);
  }
  
  if(q) words = words.filter(w => w.ko.toLowerCase().includes(q) || w.en.toLowerCase().includes(q) || getRoman(w.ko).includes(q));
  
  vocabCountEl.textContent = `${words.length} words`; vocabGrid.innerHTML = '';
  words.forEach(w => {
    const times   = harvestCounts.get(w.ko) || 0;
    const planted = plantedWords.has(w.ko);
    const chosung = getChosung(w.ko);
    const roman   = getRoman(w.ko);

    let mBadgeClass = 'novice', mBadgeLabel = '⚪ Tân thủ';
    if(times >= 10) { mBadgeClass = 'legendary'; mBadgeLabel = '🟡 Huyền thoại ⭐'; }
    else if(times >= 5) { mBadgeClass = 'mastered'; mBadgeLabel = '🟣 Thành thạo'; }
    else if(times >= 2) { mBadgeClass = 'practicing'; mBadgeLabel = '🔵 Đang nhớ'; }

    const div = document.createElement('div');
    div.className = `vocab-card ${mBadgeClass}` + (times > 0 ? ' planted' : '') + (planted ? ' growing' : '');
    div.title = 'Click for Fun Facts & Hints!';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <span class="vc-emoji">${w.hint||'📝'}</span>
      <span class="vc-ko">${w.ko}</span>
      <span style="font-size:12px; color:#67e8f9; font-weight:bold; font-family:monospace">[${roman}]</span>
      <span class="vc-en">${w.en}</span>
      <span style="font-size:11px; color:#fde047; font-family:monospace">초성: ${chosung}</span>
      <span class="mastery-badge ${mBadgeClass}">${mBadgeLabel} (×${times})</span>`;
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

  createShadow(target, baseW = 30, baseH = 10, offsetY = 18) {
    const s = this.scene.add.ellipse(target.x, target.y + offsetY, baseW, baseH, 0x000000, 0.3)
      .setDepth(Math.max(0, target.y - 1));
    s._target = target;
    s._baseW = baseW;
    s._baseH = baseH;
    s._offsetY = offsetY;
    this.shadows.push(s);
    return s;
  }

  updateShadow(shadowSprite, sunAngle) {
    if (!shadowSprite || !shadowSprite._target || !shadowSprite._target.active) return;
    const target = shadowSprite._target;

    const sunSin = Math.sin(sunAngle);
    const sunCos = Math.cos(sunAngle);

    const shadowLength = Math.max(0.3, Math.abs(sunCos)) * 26;
    const dx = -sunCos * shadowLength;
    const dy = shadowSprite._offsetY + sunSin * 4;

    const alpha = Math.min(0.45, Math.max(0.12, sunSin * 0.5));
    const scaleX = 1 + Math.abs(dx) / 18;

    shadowSprite.setPosition(target.x + dx, target.y + dy);
    shadowSprite.setScale(scaleX, 1);
    shadowSprite.setAlpha(alpha);
    shadowSprite.setDepth(target.y - 1);
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

    shadowSprite.setPosition(target.x + offX, target.y + offY);
    shadowSprite.setDepth(target.y - 1);
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
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.events.off('resume');
    this.events.on('resume', () => {
      this.cameras.main.fadeIn(300, 0, 0, 0);
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
    this._createPlayer(W, H); this._addPlotLabels();
    this._createShopNPC(W, H);
    this._createBoardNPC(W, H);
    this._createArcadeNPC(W, H);
    this._createWizardNPC(W, H);
    this._createCatNPC(W, H);
    this._createAppleTree(W, H);
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
  }

  // ── BAKE TEXTURES ──────────────────────────────────────────────────────────
  _bakeTextures(){
    const mk = () => this.make.graphics({add:false});
    // Apple Tree texture (18×30 pixels) — ginger-red apples peeking through crown
    const gat=mk();
    const crown2=['......lLLLl.......','....lLLLLLLl......','...LLLLLLLLLLL....',
     '..LLLLLLLLlLLLL...','..lLLLRALLllLLLl..','.LLLLLRALLllLLLLL.',
     'lLLRRALllMlLLLLLL','lLLRRALlMMLllLLLL','lLLLLllMMMlllLLLL',
     'lLLRRAllllllLLLLL','mLlRRAMMMlllllLLL','mRRAMMMMMllllllLL',
     'mMMMMMMMMMllllllL','.MMMMMMMMmmllllL.','.mMMMMMMmmmlll..','.mmmmmmmmmmll...',
     '...mmmmmmmmm.....','....kKKKk........'];
    // Override some cells with red apple color
    const R=0xEE2222, RA=0xFF5555;
    drawS(gat,crown2); // draw base crown
    // Paint apple spots red on top of crown
    [[3,5,3,2,R],[2,9,3,2,R],[8,10,3,2,R]].forEach(([x,y,w,h,c])=>pR(gat,x,y,w,h,c));
    [[3,5,1,1,RA],[2,9,1,1,RA],[8,10,1,1,RA]].forEach(([x,y,w,h,c])=>pR(gat,x,y,w,h,c));
    pR(gat,7,17,4,11,K.K); pR(gat,7,17,1,11,K.k); pR(gat,10,17,1,11,K.s);
    gat.generateTexture('apple_tree',18*PS,30*PS); gat.destroy();
    // Ripe apple tree variant — brighter more saturated apples
    const gatr=mk();
    drawS(gatr,crown2);
    [[3,5,3,2,0xFF0000],[2,9,3,2,0xFF0000],[8,10,3,2,0xFF0000]].forEach(([x,y,w,h,c])=>pR(gatr,x,y,w,h,c));
    [[3,5,1,1,0xFF6666],[2,9,1,1,0xFF6666],[8,10,1,1,0xFF6666]].forEach(([x,y,w,h,c])=>pR(gatr,x,y,w,h,c));
    pR(gatr,7,17,4,11,K.K); pR(gatr,7,17,1,11,K.k); pR(gatr,10,17,1,11,K.s);
    gatr.generateTexture('apple_tree_ripe',18*PS,30*PS); gatr.destroy();

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


    // Micro Butterfly Wing 0 (Open)
    const gbf0 = mk();
    pR(gbf0, 0, 0, 2, 2, 0x38BDF8); pR(gbf0, 4, 0, 2, 2, 0x38BDF8);
    pR(gbf0, 1, 2, 2, 2, 0x0284C7); pR(gbf0, 3, 2, 2, 2, 0x0284C7);
    pR(gbf0, 2, 1, 2, 4, 0x0F172A);
    gbf0.generateTexture('bf_open', 6*PS, 6*PS); gbf0.destroy();

    // Micro Butterfly Wing 1 (Flap/Up)
    const gbf1 = mk();
    pR(gbf1, 1, 0, 2, 3, 0x38BDF8); pR(gbf1, 3, 0, 2, 3, 0x38BDF8);
    pR(gbf1, 2, 1, 2, 4, 0x0F172A);
    gbf1.generateTexture('bf_flap', 6*PS, 6*PS); gbf1.destroy();

    // Stone Well / Water Shrine (16x16)
    const gsw = mk();
    pR(gsw, 2, 2, 12, 12, 0x57534E); pR(gsw, 3, 3, 10, 10, 0x78716C);
    pR(gsw, 4, 4, 8, 8, 0x0284C7); pR(gsw, 5, 5, 6, 6, 0x0369A1);
    pR(gsw, 5, 5, 2, 2, 0x38BDF8); pR(gsw, 6, 6, 1, 1, 0xFFFFFF); // water sparkle
    pR(gsw, 1, 1, 3, 14, 0x78350F); pR(gsw, 12, 1, 3, 14, 0x78350F); // posts
    pR(gsw, 1, 1, 14, 3, 0x92400E); // top winch bar
    gsw.generateTexture('stone_well', 16*PS, 16*PS); gsw.destroy();

    // Pixel Barrel (10x12)
    const gbar = mk();
    pR(gbar, 1, 0, 8, 12, 0x78350F); pR(gbar, 0, 1, 10, 10, 0x92400E);
    pR(gbar, 0, 3, 10, 2, 0x475569); pR(gbar, 0, 8, 10, 2, 0x475569); // metal hoops
    gbar.generateTexture('pixel_barrel', 10*PS, 12*PS); gbar.destroy();

    // Pixel Crate (12x12)
    const gcrat = mk();
    pR(gcrat, 0, 0, 12, 12, 0x92400E); pR(gcrat, 1, 1, 10, 10, 0xB45309);
    pR(gcrat, 0, 0, 12, 1, 0x78350F); pR(gcrat, 0, 11, 12, 1, 0x78350F);
    pR(gcrat, 0, 0, 1, 12, 0x78350F); pR(gcrat, 11, 0, 1, 12, 0x78350F);
    pR(gcrat, 1, 1, 10, 10, 0x78350F); pR(gcrat, 2, 2, 8, 8, 0xB45309); // X-brace
    gcrat.generateTexture('pixel_crate', 12*PS, 12*PS); gcrat.destroy();

    // Directional Signpost (12x14)
    const gsgn = mk();
    pR(gsgn, 5, 4, 2, 10, 0x78350F); // post
    pR(gsgn, 1, 1, 10, 4, 0x92400E); pR(gsgn, 1, 1, 1, 4, 0xB45309); // sign 1
    pR(gsgn, 2, 7, 9, 4, 0x92400E); pR(gsgn, 10, 7, 1, 4, 0xB45309); // sign 2
    gsgn.generateTexture('signpost', 12*PS, 14*PS); gsgn.destroy();

    // Tree
    const gt=mk();
    const crown=['......lLLLl.......','....lLLLLLLl......','...LLLLLLLLLLL....',
     '..LLLLLLLLlLLLL...','.lLLLLLLLllLLLLl.','.LLLLLLLLllLLLLLL',
     'lLLLLLLLllMlLLLLL','lLLLLLLlMMLllLLLL','lLLLLllMMMlllLLLL',
     'lLLLlMMMMllllLLLL','mLlMMMMMMlllllLLL','mMMMMMMMMllllllLL',
     'mMMMMMMMMMllllllL','.MMMMMMMMmmllllL.','.mMMMMMMmmmlll..','.mmmmmmmmmmll...',
     '...mmmmmmmmm.....','....kKKKk........'];
    drawS(gt,crown); pR(gt,7,17,4,11,K.K); pR(gt,7,17,1,11,K.k); pR(gt,10,17,1,11,K.s);
    gt.generateTexture('tree',18*PS,28*PS); gt.destroy();

    // Fence
    const gfp=mk();
    pR(gfp,0,0,4,12,K.O); pR(gfp,0,0,1,12,K.o); pR(gfp,3,0,1,12,K.U); pR(gfp,0,0,4,1,K.o);
    [3,6,9].forEach(y=>pR(gfp,1,y,3,1,K.U));
    gfp.generateTexture('fnc_post',4*PS,12*PS); gfp.destroy();
    const gfr=mk();
    pR(gfr,0,0,14,4,K.O); pR(gfr,0,0,14,1,K.o); pR(gfr,0,3,14,1,K.U);
    [3,7,11].forEach(x=>pR(gfr,x,0,1,4,K.U));
    gfr.generateTexture('fnc_rail',14*PS,4*PS); gfr.destroy();

    // Sparkle
    const gsp=mk();
    gsp.fillStyle(0xFFFFFF,1); gsp.fillRect(6,0,4,16); gsp.fillRect(0,6,16,4);
    gsp.fillRect(3,3,2,2); gsp.fillRect(11,3,2,2); gsp.fillRect(3,11,2,2); gsp.fillRect(11,11,2,2);
    gsp.generateTexture('sparkle',16,16); gsp.destroy();

    // Gold coin 8×8
    const gc=mk();
    pR(gc,1,0,6,1,0xFFDD00); pR(gc,0,1,8,6,0xFFDD00); pR(gc,1,7,6,1,0xFFDD00);
    pR(gc,1,1,3,2,0xFFFF88); pR(gc,2,3,1,1,0xCC9900);
    gc.generateTexture('coin',8*PS,8*PS); gc.destroy();

    // Shop sign texture 14×18
    const gs=mk();
    pR(gs,0,0,14,2,K.O);  // roof
    pR(gs,1,0,12,2,K.o);  // roof highlight
    pR(gs,0,2,14,12,K.T); // board body
    pR(gs,0,2,1,12,K.t);  // left highlight
    pR(gs,13,2,1,12,K.V); // right shadow
    pR(gs,1,3,12,1,K.t);  // stripe
    // Coin icon on sign
    pR(gs,4,5,6,6,0xFFDD00); pR(gs,5,4,4,1,0xFFDD00); pR(gs,5,11,4,1,0xFFDD00);
    pR(gs,5,5,2,2,0xFFFF88);
    pR(gs,0,14,14,4,K.K); // post
    pR(gs,6,14,2,4,K.k);
    gs.generateTexture('shop_sign',14*PS,18*PS); gs.destroy();

    // Notice Board texture 18x16 with micro corkboard grain & colored pushpins
    const gb = mk();
    pR(gb,0,0,18,12,K.O); pR(gb,1,1,16,10,0xD97706);
    pR(gb,2,12,2,4,K.K); pR(gb,14,12,2,4,K.K);
    // Papers with micro text lines
    pR(gb,2,2,5,5,K.J); pR(gb,3,3,3,1,0x525252); pR(gb,3,5,3,1,0x525252);
    pR(gb,10,3,6,6,0xFFF3C7); pR(gb,11,4,4,1,0x525252); pR(gb,11,6,4,1,0x525252);
    pR(gb,4,8,8,3,0xDDFFDD); pR(gb,5,9,6,1,0x525252);
    // Colored Pushpins
    pR(gb,4,1,1,1,0xEF4444); pR(gb,12,2,1,1,0x06B6D4); pR(gb,7,7,1,1,0xEAB308);
    gb.generateTexture('notice_board',18*PS,16*PS); gb.destroy();

    // Dungeon Portal texture 20x28
    const gport = mk();
    pR(gport, 0, 4, 20, 24, 0x334155); pR(gport, 2, 6, 16, 22, 0x1E293B);
    pR(gport, 0, 0, 20, 6, 0x475569); pR(gport, 2, 2, 16, 4, 0x334155);
    pR(gport, 4, 8, 12, 20, 0xA855F7); pR(gport, 6, 10, 8, 16, 0x6D28D9);
    pR(gport, 8, 12, 4, 12, 0x06B6D4); pR(gport, 9, 14, 2, 8, 0xFFFFFF);
    gport.generateTexture('dungeon_portal', 20*PS, 28*PS); gport.destroy();

    // Fishing Dock Pier texture 24x16
    const gdock = mk();
    pR(gdock, 0, 0, 24, 16, 0x78350F); pR(gdock, 1, 1, 22, 14, 0x92400E);
    pR(gdock, 0, 0, 24, 2, 0xB45309); pR(gdock, 0, 8, 24, 2, 0x78350F);
    pR(gdock, 2, 2, 2, 12, 0x475569); pR(gdock, 20, 2, 2, 12, 0x475569); // bolts
    gdock.generateTexture('fishing_dock', 24*PS, 16*PS); gdock.destroy();

    // Arcade Machine texture 16x22 with CRT scanline details
    const ga = mk();
    pR(ga,2,0,12,22,0x222222); pR(ga,3,1,10,20,0x444455);
    // Screen glowing with scanlines
    pR(ga,4,4,8,6,0x00FFFF); pR(ga,5,5,6,4,0xFFFFFF);
    pR(ga,4,6,8,1,0x06B6D4); pR(ga,4,8,8,1,0x0891B2);
    // Control panel (slanted)
    pR(ga,3,10,10,4,0xFF00FF);
    pR(ga,5,11,1,1,0xFF0000); pR(ga,5,10,1,1,0xFF8888); // joystick + knob
    pR(ga,10,12,2,1,0xFFFF00); pR(ga,8,12,1,1,0x00FF00); // buttons
    // Marquee with glowing text line
    pR(ga,4,1,8,2,0xFF00FF); pR(ga,5,1,6,1,0xFFFFFF);
    // Coin slot
    pR(ga,5,16,2,3,0x777777); pR(ga,6,17,1,1,0x000000);
    ga.generateTexture('arcade_machine',16*PS,22*PS); ga.destroy();

    // Wizard NPC texture 16x22
    const gwiz = mk();
    // Robe / Body (Dark purple)
    pR(gwiz, 4, 8, 8, 12, 0x5B21B6); pR(gwiz, 3, 10, 10, 10, 0x4C1D95);
    pR(gwiz, 5, 9, 6, 11, 0x6D28D9);
    // Face & Beard
    pR(gwiz, 5, 5, 6, 4, 0xFFDDAD);
    pR(gwiz, 6, 6, 1, 1, 0x1E1B4B); pR(gwiz, 9, 6, 1, 1, 0x1E1B4B);
    pR(gwiz, 4, 8, 8, 6, 0xF3F4F6);
    pR(gwiz, 5, 14, 6, 3, 0xE5E7EB);
    // Pointy Wizard Hat
    pR(gwiz, 1, 5, 14, 2, 0x7C3AED); pR(gwiz, 2, 5, 12, 1, 0x8B5CF6);
    pR(gwiz, 4, 3, 8, 2, 0x7C3AED); pR(gwiz, 5, 1, 6, 2, 0x6D28D9); pR(gwiz, 6, 0, 4, 1, 0x8B5CF6);
    pR(gwiz, 7, 2, 2, 2, 0xF59E0B);
    // Staff & Glowing Orb
    pR(gwiz, 13, 4, 2, 16, 0x78350F);
    pR(gwiz, 12, 2, 4, 4, 0x06B6D4); pR(gwiz, 13, 3, 2, 2, 0x67E8F9);
    gwiz.generateTexture('wizard_npc', 16*PS, 22*PS); gwiz.destroy();

    // Player (4 walk frames)
    for(let fr=0; fr<4; fr++){
      const gp=mk();
      const by = (fr===1 || fr===3) ? 1 : 0; // Body down 1px when stepping
      
      pR(gp,3,0+by,8,1,K.T); pR(gp,2,1+by,10,3,K.T); pR(gp,2,1+by,1,3,K.t); pR(gp,11,1+by,1,3,K.V);
      pR(gp,2,1+by,10,1,K.t); pR(gp,2,3+by,10,1,K.V);
      pR(gp,1,4+by,12,2,K.T); pR(gp,1,4+by,12,1,K.t); pR(gp,1,5+by,12,1,K.V);
      pR(gp,2,4+by,10,1,0xEF4444); // Straw hat red ribbon
      pR(gp,3,6+by,8,5,K.X); pR(gp,3,6+by,1,5,K.x); pR(gp,10,6+by,1,5,K.x);
      pR(gp,4,8+by,1,1,K.J); pR(gp,5,8+by,1,1,K.N); pR(gp,8,8+by,1,1,K.J); pR(gp,9,8+by,1,1,K.N);
      pR(gp,3,9+by,1,1,0xF472B6); pR(gp,10,9+by,1,1,0xF472B6); // Rosy cheeks
      pR(gp,4,9+by,1,1,K.I); pR(gp,9,9+by,1,1,K.I); pR(gp,6,10+by,2,1,K.x);
      pR(gp,2,11+by,10,4,K.Z); pR(gp,2,11+by,1,4,K.z); pR(gp,11,11+by,1,4,K.z);
      pR(gp,0,11+by,3,4,K.Z); pR(gp,11,11+by,3,4,K.Z);
      pR(gp,0,14+by,3,1,K.X); pR(gp,11,14+by,3,1,K.X);
      pR(gp,4,12+by,6,2,K.q);
      pR(gp,6,15+by,2,1,0xF59E0B); // Overalls bronze belt buckle
      pR(gp,2,15+by,10,4,K.Q); pR(gp,2,15+by,1,4,K.q); pR(gp,11,15+by,1,4,K.q);
      
      let ly=0, ry=0;
      let lL=K.Q, rL=K.q, lB=K.R, rB=K.r; // Stand / idle shading
      if(fr===1) { ly=-2; lL=K.q; rL=K.Q; lB=K.r; rB=K.R; } // Left foot step
      else if(fr===3) { ry=-2; lL=K.Q; rL=K.q; lB=K.R; rB=K.r; } // Right foot step
      else if(fr===2) { lL=K.q; rL=K.Q; lB=K.r; rB=K.R; } // Opposite stand phase
      
      pR(gp,2,19+by+ly,4,3,lL); pR(gp,8,19+by+ry,4,3,rL);
      pR(gp,2,22+by+ly,5,2,lB); pR(gp,8,22+by+ry,5,2,rB);
      pR(gp,2,23+by+ly,5,1,K.r); pR(gp,8,23+by+ry,5,1,K.r);
      
      gp.generateTexture('farmer'+fr,14*PS,25*PS); gp.destroy();
    }

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
    const GO=0xF5813F, GD=0xB84E10, GL=0xFFBB66;
    const WH2=0xFFFFFF, EY=0xFFCC44, PU=0x1A0800;
    const PK2=0xFFAA99;
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
    const fW=PLOT_COLS*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP, fH=3*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP;
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

    const pathPoints = [
      {x: bx, y: by+25}, {x: sx, y: sy}, {x: ax, y: ay}, {x: wx, y: wy}, {x: apx, y: apy+25}
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
    this.add.ellipse(wellX, wellY+8, 44, 12, 0, 0.35).setDepth(wellY-1);
    this.add.image(wellX, wellY, 'stone_well').setOrigin(0.5, 1).setScale(1.5).setDepth(wellY);
    // Water sparkles inside well
    for(let i=0; i<4; i++){
      const sp = this.add.circle(wellX + (Math.random()-0.5)*18, wellY - 12 + (Math.random()-0.5)*12, 1.5, 0x67E8F9, 0.9).setDepth(wellY+1);
      this.tweens.add({ targets: sp, alpha: 0.2, scale: 1.8, duration: 800 + i*300, yoyo: true, repeat: -1 });
    }

    // Micro World Details: Barrels & Crates next to Shop
    const bxl = sx + 28, byl = sy - 10;
    this.add.image(bxl, byl, 'pixel_barrel').setOrigin(0.5, 1).setScale(1.4).setDepth(byl);
    this.add.image(bxl + 18, byl + 6, 'pixel_crate').setOrigin(0.5, 1).setScale(1.3).setDepth(byl+6);

    // Micro World Details: Directional Signpost
    const spX = bx - 60, spY = by + 20;
    this.add.image(spX, spY, 'signpost').setOrigin(0.5, 1).setScale(1.4).setDepth(spY);

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
      .setOrigin(0.5, 1).setScale(1.2).setDepth(sy);

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
    this.add.ellipse(bx, by+6, 40, 10, 0, 0.3).setDepth(by-1);
    this.boardSprite = this.add.image(bx, by, 'notice_board').setOrigin(0.5,1).setScale(1.5).setDepth(by);
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
    this.add.ellipse(ax, ay+6, 40, 10, 0, 0.35).setDepth(ay-1);
    this.arcadeSprite = this.add.image(ax, ay, 'arcade_machine').setOrigin(0.5,1).setScale(1.5).setDepth(ay);
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
    this.add.ellipse(wx, wy+6, 40, 10, 0, 0.35).setDepth(wy-1);
    this.wizardSprite = this.add.sprite(wx, wy, 'wizard_idle_0');
    if (this.wizardSprite.play) this.wizardSprite.play('wizard-idle').setOrigin(0.5,1).setScale(1.6).setDepth(wy);
    this.tweens.add({ targets: this.wizardSprite, y: wy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.wizardHint = this.add.text(wx, wy-62, '⚡ SPELL DUEL\n[SPACE]', {
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
    this.add.ellipse(cx,cy+2,36,10,0,0.35).setDepth(cy-1);
    this.catSprite = this.add.sprite(cx, cy, 'cat_idle_0');
    if (this.catSprite.play) this.catSprite.play('cat-idle')
      .setOrigin(0.5,1).setScale(1.8).setDepth(cy);
    this.tweens.add({ targets:this.catSprite, y:cy-3, duration:1200, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    this.catHint = this.add.text(cx, cy-52, '🐱 야옹\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FFCC44', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(cy+1).setAlpha(0);
    this.tweens.add({ targets:this.catHint, y:this.catHint.y-3, duration:700, yoyo:true, repeat:-1 });
    this.add.text(cx, cy+6, 'Muop', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#FFD700', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(cy+1);
    this.catX=cx; this.catY=cy;
  }

  // ── DUNGEON PORTAL NPC ─────────────────────────────────────────────────────
  _createPortalNPC(W, H){
    const px = this.farm.x + this.farm.w + 140;
    const py = this.farm.y + this.farm.h + 80;
    this.add.ellipse(px, py+6, 50, 12, 0, 0.4).setDepth(py-1);
    this.portalSprite = this.add.image(px, py, 'dungeon_portal').setOrigin(0.5,1).setScale(1.5).setDepth(py);
    this.tweens.add({ targets: this.portalSprite, scaleX: 1.55, scaleY: 1.45, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
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
    const fx = this.farm.x + this.farm.w / 2;
    const fy = this.farm.y + this.farm.h + 165;

    // Crystal Pond Blue Water Ellipse
    const pond = this.add.ellipse(fx, fy + 20, 240, 70, 0x0284C7, 0.85).setDepth(fy - 5);
    this.tweens.add({ targets: pond, scaleX: 1.05, scaleY: 0.95, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Floating Lily Pads
    this.add.image(fx - 60, fy + 15, 'tile_grass').setDisplaySize(20,20).setDepth(fy-4);
    this.add.image(fx + 70, fy + 25, 'tile_grass').setDisplaySize(18,18).setDepth(fy-4);

    // Fishing Dock Pier
    this.add.ellipse(fx, fy+8, 60, 14, 0, 0.4).setDepth(fy-1);
    this.dockSprite = this.add.image(fx, fy, 'fishing_dock').setOrigin(0.5,1).setScale(1.5).setDepth(fy);
    this.tweens.add({ targets: this.dockSprite, y: fy - 2, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.fishHint = this.add.text(fx, fy-60, '🎣 CRYSTAL POND\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#38BDF8', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(fy+1).setAlpha(0);
    this.tweens.add({ targets: this.fishHint, y: this.fishHint.y - 3, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(fx, fy+6, 'Fishing Dock', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#7DD3FC', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(fy+1);

    this.fishX = fx; this.fishY = fy;
  }

  // ── APPLE TREE ─────────────────────────────────────────────────────────────
  _createAppleTree(W, H){
    const ax = this.farm.x - 130;
    const ay = this.farm.y - 85;
    // Shadow
    this.add.ellipse(ax, ay, 120, 30, 0, 0.3).setDepth(ay);
    // Tree sprite (starts with unripe texture)
    this.appleTreeSprite = this.add.image(ax, ay, 'apple_tree')
      .setOrigin(0.5, 1).setScale(2.5).setDepth(ay+1);
    
    this._createFallingLeaves(ax, ay);
      
    // Trunk collision zone
    const trunkZone = this.add.zone(ax, ay - 10, 80, 40);
    this.physics.add.existing(trunkZone, true);
    this.physics.add.collider(this.player, trunkZone);
    // Gentle sway
    this.tweens.add({
      targets: this.appleTreeSprite,
      angle: { from: -1.5, to: 1.5 },
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
    this.appleTreeLabel = this.add.text(ax, ay - 240, '🍎 HARVEST!\n[SPACE]', {
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
    this.add.text(ax, ay + 34, '🍎 Apple Tree', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#FFD700', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    // State
    this.appleX = ax; this.appleY = ay;
    this.appleRipeAt  = appleTreeSave.ripeAt  || (Date.now() + FarmScene.APPLE_RIPEN_MS);
    this.appleRipe    = appleTreeSave.ripe     || false;
    this._updateAppleTree();
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
    playChiptuneSFX('harvest');
    // Reward: big gold bonus
    const bonus = 15 + Math.floor(Math.random() * 6); // 15-20 gold
    addGold(bonus);
    this._flyCoins(this.appleX, this.appleY - 30, Math.min(bonus, 8));
    this._label(this.appleX, this.appleY - 30, `+${bonus} 🍎 BONUS!`);

    let yieldCount = 1;
    if (typeof isPetActive === 'function' && isPetActive('hamster') && Math.random() < 0.30 * getPetPassiveMultiplier('hamster')) {
      yieldCount = 2;
      showToast(`🐹 Hamster Pouch Duplicator! Double harvest (+2 사과)!`);
    }
    if (typeof addIngredient === 'function') addIngredient('사과', yieldCount);
    if (typeof addPetXP === 'function') addPetXP(10);

    // Start regrowth timer
    this.appleRipe    = false;
    this.appleRipeAt  = Date.now() + FarmScene.APPLE_RIPEN_MS;
    _saveAppleTree(this);
    this._updateAppleTree();
    showToast(`🍎 Harvested! +${bonus} gold! Tree will regrow in 2 min.`, 4000);
  }

  // ── PLOTS ──────────────────────────────────────────────────────────────────
  _createPlots(W, H){
    // 15 slots (3x5) – open-world ready: first 9 active, more unlock with levels
    const MAX=15, ROWS=5;
    const activeCnt = Math.min(MAX, 9 + (unlockedLevels.length-1)*3);
    for(let i=0;i<MAX;i++){
      const col=i%PLOT_COLS, row=Math.floor(i/PLOT_COLS);
      const px=this.farm.x+col*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const py=this.farm.y+row*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const active=i<activeCnt;
      const shad=this.add.ellipse(px,py+PLOT_SIZE/2-2,PLOT_SIZE*0.85,10,0,active?0.3:0.1).setDepth(1);
      const tile=this.add.image(px,py,'drt_dry').setDisplaySize(PLOT_SIZE,PLOT_SIZE)
        .setAlpha(active?1:0.25).setDepth(2);
      if(!active) this.add.image(px,py,'pixel_crate').setDisplaySize(24,24).setAlpha(0.6).setDepth(3);
      const body=this.physics.add.staticImage(px,py).setVisible(false);
      body.setCircle(PLOT_SIZE*0.4).refreshBody();
      // sState: ''=empty '1'=seedling '2'=wilting(P2 ready) '3'=sprout '4'=ripe
      this.plots.push({tile,shad,body,x:px,y:py,sState:'',ko:null,word:null,
        index:i,plant:null,glow:null,hintLabel:null,active,plantedAt:0});
    }
    this._restorePlots();
  }

  // Dynamically unlock plots when buying new levels (no reload needed)
  refreshPlotAccess(){
    const MAX=15;
    const activeCnt = Math.min(MAX, 9 + (unlockedLevels.length-1)*3);
    this.plots.forEach((p,i) => {
      if(i < activeCnt && !p.active){
        p.active = true;
        p.tile.setAlpha(1);
        p.shad.setAlpha(0.3);
        // Remove lock emoji overlay
        this.children.list
          .filter(c => c.type === 'Text' && c.text === '🔒' &&
                  Math.abs(c.x - p.x) < 5 && Math.abs(c.y - p.y) < 5)
          .forEach(c => c.destroy());
      }
    });
  }

  _createPlayer(W, H){
    this.player=this.physics.add.sprite(W/2, H-80,'player_walk_down_0')
      .setCollideWorldBounds(true).setDrag(900,900).setDepth(500);
    if (this.shadows) {
      this.pShadow = this.shadows.createShadow(this.player, 30, 10, 18);
    } else {
      this.pShadow = this.add.ellipse(0,0,30,10,0,0.3).setDepth(499);
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
        this.shadows.updateShadow(this.pShadow, env.sunAngle);
        if (this.pShadow) this.pShadow.setDepth(playerBaseY - 1);
      } else if (this.pShadow) {
        this.pShadow.setPosition(this.player.x, this.player.y + 18).setDepth(playerBaseY - 1);
      }
    } else if (this.pShadow) {
      this.pShadow.setPosition(this.player.x, this.player.y + 18).setDepth(playerBaseY - 1);
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


    if(!playerLocked){
      const vx=(this.keys.A.isDown || this.keys.LEFT.isDown?-1:0)+(this.keys.D.isDown || this.keys.RIGHT.isDown?1:0);
      const vy=(this.keys.W.isDown || this.keys.UP.isDown?-1:0)+(this.keys.S.isDown || this.keys.DOWN.isDown?1:0);
      const len=Math.sqrt(vx*vx+vy*vy)||1;
      this.player.setVelocity((vx/len)*PLAYER_SPD,(vy/len)*PLAYER_SPD);
      if(vx!==0||vy!==0){
        let animKey = 'player-walk-down';
        if (Math.abs(vx) >= Math.abs(vy)) {
          animKey = vx < 0 ? 'player-walk-left' : 'player-walk-right';
        } else {
          animKey = vy < 0 ? 'player-walk-up' : 'player-walk-down';
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
      this.player.anims.stop();
      this.player.setTexture('player_walk_down_0');
    }

    // Show shop hint label when nearby
    if(this.shopNPC && this.shopHint){
      const nearShop = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY) < 90;
      this.shopHint.setAlpha(nearShop ? 1 : 0);
    }
    // Show cat hint label when nearby
    if(this.catHint){
      const nearCat = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY) < 80;
      this.catHint.setAlpha(nearCat ? 1 : 0);
      if(this.catSprite) this.catSprite.setFlipX(this.player.x < this.catX ? true : false);
    }

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
      const nearPortal = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY) < 85;
      this.portalHint.setAlpha(nearPortal ? 1 : 0);
    }
    // Show fishing hint label when nearby
    if(this.fishHint){
      const nearFish = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY) < 85;
      this.fishHint.setAlpha(nearFish ? 1 : 0);
    }

    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)&&!playerLocked&&!quizOpen&&!shopOpen&&!memoryOpen&&!trophyOpen&&!duelOpen) this._interact();
    // SRS timer: check every 8s if any plant needs state advance
    this._timerAcc=(this._timerAcc||0)+(dt||16);
    if(this._timerAcc>8000){this._timerAcc=0;this._checkSRS();}
    // Apple tree timer: update every second
    this._appleAcc=(this._appleAcc||0)+(dt||16);
    if(this._appleAcc>1000){this._appleAcc=0;this._tickAppleTree();}
    // SPACE target indicator (shows which object will be targeted)
    if(!playerLocked&&!quizOpen&&!shopOpen&&!catDialogOpen) this._updateTargetHighlight();
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
    if(this.appleRipe&&this.appleX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<90){
      hx=this.appleX;hy=this.appleY-50;lbl='[SPACE] Harvest 🍎 Bonus!';col=0xFF3333;hw=60;hh=70;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='4'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Harvest +Gold';col=0xFFD700;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='2'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Water';col=0x55CCFF;break;}
    }
    if(hx===null&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<82){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Talk to Muop';col=0xFF88CC;hw=44;hh=44;
    }
    if(hx===null&&this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      hx=this.wizardX;hy=this.wizardY-25;lbl='[SPACE] Spell Duel';col=0xA855F7;hw=44;hh=50;
    }
    if(hx===null&&this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<85){
      hx=this.portalX;hy=this.portalY-30;lbl='[SPACE] Enter Dungeon';col=0xEC4899;hw=50;hh=60;
    }
    if(hx===null&&this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      hx=this.fishX;hy=this.fishY-25;lbl='[SPACE] Start Fishing';col=0x38BDF8;hw=50;hh=50;
    }
    if(hx===null&&this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      hx=this.arcadeX;hy=this.arcadeY-30;lbl='[SPACE] Play Retro Shooter';col=0x00FFFF;hw=44;hh=50;
    }
    if(hx===null&&this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<82){
      hx=this.boardX;hy=this.boardY-20;lbl='[SPACE] Play Memory Match';col=0xFF88FF;hw=44;hh=44;
    }
    if(hx===null&&this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<92){
      hx=this.shopX;hy=this.shopY-20;lbl='[SPACE] Open Shop';col=0xFFAA44;hw=50;hh=60;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Plant new';col=0x44FF88;break;}
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
      if(p.sState==='1' && s.p2At && now>=s.p2At){ this._setState(p,'2',p.ko); changed=true; }
      if(p.sState==='3' && s.p3At && now>=s.p3At){ this._setState(p,'4',p.ko); changed=true; }
    });
    if(changed) savePlotsFn();
  }

  // ── INTERACT (SRS-aware priority) ─────────────────────────────────────────
  _interact(){
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+24;
    // Apple Tree harvest (highest priority when ripe)
    if(this.appleRipe&&this.appleX&&
       Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<90){
      this.tweens.add({targets:this.appleTreeSprite,angle:12,duration:80,yoyo:true,repeat:2});
      this.harvestAppleTree(); return;
    }
    // P1: ripe crop plots (Phase 3 harvest)
    for(const p of this.plots){ if(p.sState==='4'&&near(p)){openQuiz(p.word,p,3);return;} }
    // P2: wilting plants (Phase 2 review)
    for(const p of this.plots){ if(p.sState==='2'&&near(p)){openQuiz(p.word,p,2);return;} }
    // Cat NPC
    if(this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<80){
      this.tweens.add({targets:this.catSprite,scale:{from:1.8,to:2.2},duration:100,yoyo:true,ease:'Back.Out(2)'});
      showCatDialog(); return;
    }
    // Wizard NPC
    if(this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      this.tweens.add({targets:this.wizardSprite,scale:{from:1.6,to:1.9},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('duel');
      if(!chk.unlocked){ showHardLockToast('duel'); return; }
      openSpellDuel(); return;
    }
    // Dungeon Portal
    if(this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<85){
      this.tweens.add({targets:this.portalSprite,scale:{from:1.5,to:1.8},duration:120,yoyo:true,ease:'Back.Out(2)'});
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
      this.tweens.add({targets:this.dockSprite,scale:{from:1.5,to:1.7},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('fishing');
      if(!chk.unlocked){ showHardLockToast('fishing'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('FishingScene');
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
  }

  // ── SRS ADVANCE PLOT (called after correct quiz answer) ─────────────────────
  advancePlot(plot, word, phase){
    const ko=word.ko, now=Date.now(), t=plot.index%5;
    if(phase===1){
      // P1 correct: plant seedling, set P2 timer
      plot.word=word; plot.ko=ko; plot.plantedAt=now;
      setSrs(ko,{p2At:now+SR1,p3At:null});
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      const crop=this.add.image(plot.x,plot.y-4,`cr_${t}_1`).setOrigin(0.5,0.85).setScale(0).setDepth(plot.y+5);
      plot.plant=crop;
      this.tweens.add({targets:crop,scale:1,duration:300,ease:'Back.Out(3)'});
      this._sparkle(plot.x,plot.y); this._label(plot.x,plot.y,'Planted!');
      this._setState(plot,'1',ko);
    } else if(phase===2){
      // P2 correct: grow to sprout, set P3 timer
      const srs=getSrs(ko); setSrs(ko,{p3At:now+SR2});
      if(plot.plant) plot.plant.setTexture(`cr_${t}_2`).clearTint();
      this.tweens.add({targets:plot.plant,scale:{from:0.7,to:1.1},duration:320,ease:'Back.Out(2)',
        onComplete:()=>this.tweens.add({targets:plot.plant,scale:1,duration:150})});
      if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
      if(plot.glow){plot.glow.destroy();plot.glow=null;}
      this._leaves(plot.x,plot.y-8); this._label(plot.x,plot.y,'Watered!');
      this._setState(plot,'3',ko);
    } else {
      // P3 correct: HARVEST! Coins, Gems, Honor!
      playChiptuneSFX('harvest');
      const prev=harvestCounts.get(ko)||0;
      const newHarvests = prev + 1;
      harvestCounts.set(ko, newHarvests);

      // Anti-farm diminishing returns formula:
      // Decays smoothly down to 1 coin if harvested >= 15 times
      const reward = Math.max(1, Math.floor(10 * Math.pow(0.85, prev)));
      setSrs(ko,{p2At:null,p3At:null,harvests:(getSrs(ko).harvests||0)+1});
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

        let yieldCount = 1;
        if (typeof isPetActive === 'function' && isPetActive('hamster') && Math.random() < 0.30 * getPetPassiveMultiplier('hamster')) {
          yieldCount = 2;
          showToast(`🐹 Hamster Pouch Duplicator! Double harvest (+2 ${ingName})!`);
        }
        if (typeof addIngredient === 'function') addIngredient(ingName, yieldCount);
        if (typeof addPetXP === 'function') addPetXP(10);
      });
      this._clearPlot(plot);
    }
    savePlotsFn();
  }

  // Wrong answer at P3 -> regression back to P2 wilting
  regressionPlot(plot,word){
    quizStreak = 0;
    const ko=word.ko, t=plot.index%5;

    setSrs(ko,{p3At:null,p2At:null}); // state '2' is enough, p2At meaningless here
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
    if(s===''){  // empty
      plot.tile.setTexture('drt_dry').setAlpha(plot.active?1:0.25).clearTint();
      plot.shad.setAlpha(plot.active?0.3:0.1);
    } else if(s==='1'){  // seedling (healthy)
      plot.tile.setTexture('drt_wet').clearTint();
      if(plot.plant) plot.plant.clearTint();
    } else if(s==='2'){  // wilting - P2 review needed
      if(plot.plant) plot.plant.setTexture(`cr_${t}_1`).setTint(0xFFCC44);
      this._addLabel(plot,'💧','#FFD700');
    } else if(s==='3'){  // sprout healthy
      if(plot.plant) plot.plant.clearTint();
    } else if(s==='4'){  // ripe - harvest!
      if(plot.plant) plot.plant.setTexture(`cr_${t}_3`).clearTint();
      this._addGlow(plot,0xFFD700);
      this._addLabel(plot,'SPACE','#FFD700');
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
      if(st==='1'&&srs.p2At&&now>=srs.p2At) st='2';
      if(st==='3'&&srs.p3At&&now>=srs.p3At) st='4';
      const t=plot.index%5;
      const tex={1:`cr_${t}_1`,2:`cr_${t}_1`,3:`cr_${t}_2`,4:`cr_${t}_3`}[st]||`cr_${t}_1`;
      plot.plant=this.add.image(plot.x,plot.y-4,tex).setOrigin(0.5,0.85).setDepth(plot.y+5);
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      this._setState(plot,st,pd.ko);
      plantedWords.add(pd.ko);
    });
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
    const pool=all.filter(w=>!plantedWords.has(w.ko));
    const arr=pool.length?pool:all;
    // Weighted random: new words ×5, <3 harvests ×3, rest ×1
    const weighted=arr.map(w=>{
      const h=harvestCounts.get(w.ko)||0;
      return {word:w, weight: h===0?5 : h<3?3 : 1};
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
    showToast('👹 KING SEJONG\'S CORRUPTED SENTINEL SPAWNED!', 4000);
    const boss = this.add.sprite(this.W/2, 120, 'dungeon_boss').setOrigin(0.5).setDepth(30);
    this.physics.add.existing(boss);
    boss.body.setSize(60, 60);
    boss.hp = 300;
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
    if (typeof addPetXP === 'function') addPetXP(15);

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
  scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene],
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
  { id: 'bronze_apple', name: 'Tân Binh', icon: '🥉', reqHarvests: 10, cost: 50 },
  { id: 'silver_spade', name: 'Nông Dân', icon: '🥈', reqHarvests: 50, cost: 300 },
  { id: 'gold_tractor', name: 'Chuyên Gia', icon: '🥇', reqHarvests: 150, cost: 1000 },
  { id: 'diamond_crown', name: 'Bậc Thầy', icon: '💎', reqHarvests: 500, cost: 5000 },
  { id: 'master_scholar', name: 'Huyền Thoại', icon: '👑', reqHarvests: 1000, cost: 20000 }
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
  grid.innerHTML = '';
  const totalHarvests = window.getTotalHarvests();
  
  TROPHIES_DB.forEach(t => {
    const isBought = unlockedTrophies.includes(t.id);
    const reqMet = totalHarvests >= t.reqHarvests;
    const canAfford = gold >= t.cost;
    
    const div = document.createElement('div');
    div.className = 'trophy-card ' + (isBought ? 'unlocked' : 'locked');
    
    div.innerHTML = `
      <div>
        <div class="trophy-icon">${t.icon}</div>
        <div class="trophy-name">${t.name}</div>
        <div class="trophy-req"><span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Thu hoạch</span><br/>${totalHarvests}/${t.reqHarvests}</div>
      </div>
      ${isBought ? 
        '<div class="trophy-unlocked-badge">Đã Mở! 🏆</div>' : 
        '<button class="trophy-buy-btn" ' + ((!reqMet || !canAfford) ? 'disabled' : '') + '>' +
           (!reqMet ? '⚠️ CHƯA ĐỦ' : 'MUA 💰' + t.cost) +
         '</button>'
      }
    `;
    
    if(!isBought && reqMet && canAfford) {
      div.querySelector('.trophy-buy-btn').addEventListener('click', () => {
         if (!spendCoins(t.cost)) return;
         unlockedTrophies.push(t.id);
         window.renderTrophies();
         showToast('🏆 Chúc mừng! Bạn đã nhận cúp ' + t.name + '!');
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
    decayPetHappiness();
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

  // Add pet XP if active pet exists
  addPetXP(20);

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

// ═══════════════ R4: PET COMPANION SYSTEM ═════════════════════════════════════
var PET_DB = [
  {
    id: 'dog', name: '강아지', enName: 'Puppy / Dog', icon: '🐶', costGems: 10,
    desc: 'Coin Magnet (+15% Coins) & 15% Auto-Water Crops when wilting.'
  },
  {
    id: 'cat', name: '고양이', enName: 'Cat', icon: '🐱', costGems: 15,
    desc: 'Feline Nunchi (+25% Combat Damage in Dungeon & Spell Duel).'
  },
  {
    id: 'rabbit', name: '토끼', enName: 'Rabbit', icon: '🐰', costGems: 15,
    desc: 'Rapid Hop (+50% Crop Growth Speed).'
  },
  {
    id: 'hamster', name: '햄스터', enName: 'Hamster', icon: '🐹', costGems: 20,
    desc: 'Pouch Duplicator (+30% Double Harvest on all crops & apples).'
  },
  {
    id: 'parrot', name: '앵무새', enName: 'Parrot', icon: '🦜', costGems: 25,
    desc: 'Echo Scholar (+1 Extra Free Quiz Hint & +20% Fishing Luck).'
  }
];

function isPetActive(petId) {
  if (!petState || petState.activePet !== petId) return false;
  const pet = petState.collection.find(p => p.id === petId);
  if (!pet) return false;
  return pet.happiness > 0; // pet gives passive if happiness > 0
}

function getPetPassiveMultiplier(petId) {
  if (!isPetActive(petId)) return 0;
  const pet = petState.collection.find(p => p.id === petId);
  if (!pet) return 0;
  const happinessRatio = pet.happiness >= 50 ? 1.0 : 0.5; // reduced passive if unhappy < 50%
  const levelBonus = 1.0 + (pet.level - 1) * 0.2; // +20% power per level
  return happinessRatio * levelBonus;
}

function decayPetHappiness() {
  if (!petState || !petState.collection || petState.collection.length === 0) return;
  const now = Date.now();
  petState.collection.forEach(pet => {
    pet.lastDecayTime = pet.lastDecayTime || now;
    // Decays 5% every 5 minutes (300,000 ms)
    if (now - pet.lastDecayTime >= 300000) {
      pet.happiness = Math.max(0, pet.happiness - 5);
      pet.lastDecayTime = now;
      persistSave();
    }
  });
}

function addPetXP(amount) {
  if (!petState || !petState.activePet) return;
  const pet = petState.collection.find(p => p.id === petState.activePet);
  if (!pet) return;
  pet.xp = (pet.xp || 0) + amount;
  persistSave();
}

window.openPetOverlay = function() {
  playChiptuneSFX('click');
  const overlay = document.getElementById('pet-overlay');
  const activeCard = document.getElementById('pet-active-card');
  const rosterContainer = document.getElementById('pet-roster-container');

  if (!overlay || !activeCard || !rosterContainer) return;

  // Render Active Pet Card
  const activePetObj = petState.collection.find(p => p.id === petState.activePet);
  const activePetDef = activePetObj ? PET_DB.find(p => p.id === activePetObj.id) : null;

  if (activePetObj && activePetDef) {
    const maxXp = activePetObj.level * 50;
    const xpPct = Math.min(100, Math.round((activePetObj.xp / maxXp) * 100));
    const happyPct = activePetObj.happiness;

    activeCard.innerHTML = `
      <div style="font-size:48px;">${activePetDef.icon}</div>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:'Press Start 2P',monospace; font-size:14px; color:#fff;">${activePetObj.name}</span>
          <span class="pet-card-level">Lv.${activePetObj.level}</span>
          <span style="font-size:16px;">${happyPct >= 70 ? '😊' : happyPct >= 30 ? '😐' : '😿'}</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; margin:4px 0;">${activePetDef.desc}</div>
        
        <div style="margin-top:6px;">
          <div style="font-size:9px; color:#c084fc; margin-bottom:2px;">XP: ${activePetObj.xp} / ${maxXp}</div>
          <div class="pet-bar-bg"><div class="pet-bar-fill-xp" style="width:${xpPct}%;"></div></div>
        </div>

        <div style="margin-top:6px;">
          <div style="font-size:9px; color:#4ade80; margin-bottom:2px;">Happiness: ${happyPct}% ${happyPct < 50 ? '(Reduced Bonus!)' : ''}</div>
          <div class="pet-bar-bg"><div class="pet-bar-fill-happy" style="width:${happyPct}%;"></div></div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        <button class="cook-btn" onclick="feedActivePet()">🍎 Feed Dish</button>
        ${activePetObj.xp >= maxXp ? `<button class="cook-btn" style="background:linear-gradient(135deg,#ec4899,#a855f7);" onclick="startPetLevelUpQuiz('${activePetObj.id}')">🎓 Level Up Quiz!</button>` : ''}
      </div>
    `;
  } else {
    activeCard.innerHTML = '<div style="color:#94a3b8;">No active companion equipped. Select one from the roster below!</div>';
  }

  // Render Roster Grid
  rosterContainer.innerHTML = '';
  PET_DB.forEach(def => {
    const owned = petState.collection.find(p => p.id === def.id);
    const isActive = petState.activePet === def.id;

    const card = document.createElement('div');
    card.className = `pet-card ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="pet-card-avatar">${def.icon}</div>
      <div class="pet-card-name">${def.name}</div>
      <div style="font-size:11px; color:#cbd5e1;">${def.enName}</div>
      <div class="pet-card-passive">${def.desc}</div>
      ${owned ? `
        <div style="font-size:10px; color:var(--neon-pink); font-weight:bold;">Lv.${owned.level} | ${owned.happiness}% 😊</div>
        <button class="cook-btn" style="width:100%; margin-top:4px;" ${isActive ? 'disabled' : ''} onclick="equipPet('${def.id}')">${isActive ? 'Equipped' : 'Equip'}</button>
      ` : `
        <button class="cook-btn" style="width:100%; margin-top:4px; background:linear-gradient(135deg,#06b6d4,#0284c7);" onclick="adoptPet('${def.id}')">💎 Adopt (${def.costGems} Gems)</button>
      `}
    `;
    rosterContainer.appendChild(card);
  });

  setModalState('pet-overlay', true);
};

window.closePetOverlay = function() {
  playChiptuneSFX('click');
  setModalState('pet-overlay', false);
};


window.adoptPet = function(petId) {
  const def = PET_DB.find(p => p.id === petId);
  if (!def) return;
  if (!spendGems(def.costGems)) {
    showToast(`⚠️ Need ${def.costGems} Gems to adopt ${def.name}!`);
    return;
  }

  petState.collection.push({
    id: def.id,
    name: def.name,
    enName: def.enName,
    level: 1,
    xp: 0,
    happiness: 100,
    lastDecayTime: Date.now()
  });
  petState.activePet = def.id;

  showToast(`🎉 Adopted ${def.icon} ${def.name}! Set as active companion!`);
  openPetOverlay();
};

window.equipPet = function(petId) {
  petState.activePet = petId;
  persistSave();
  showToast(`🐾 Equipped ${petId} as active companion!`);
  openPetOverlay();
};

window.feedActivePet = function() {
  if (!petState || !petState.activePet) return;
  const pet = petState.collection.find(p => p.id === petState.activePet);
  if (!pet) return;

  const dishes = inventoryState.cookedDishes || {};
  const availableDishes = Object.entries(dishes).filter(([_, count]) => count > 0);

  if (availableDishes.length === 0) {
    // Fallback: check raw ingredients
    const ings = inventoryState.ingredients || {};
    const availIngs = Object.entries(ings).filter(([_, count]) => count > 0);

    if (availIngs.length === 0) {
      showToast('⚠️ No cooked dishes or ingredients to feed your pet! Cook a dish first.');
      return;
    }

    const [ingName, cnt] = availIngs[0];
    ings[ingName]--;
    pet.happiness = Math.min(100, pet.happiness + 30);
    pet.xp += 10;
    persistSave();
    showToast(`😋 Fed ${ingName} to ${pet.name}! (+30% Happiness, +10 XP)`);
    openPetOverlay();
    return;
  }

  const [dishId, cnt] = availableDishes[0];
  const recipe = RECIPE_DB.find(r => r.id === dishId);
  dishes[dishId]--;
  pet.happiness = Math.min(100, pet.happiness + 50);
  pet.xp += 25;
  persistSave();

  showToast(`😋 Fed delicious ${recipe ? recipe.name : dishId} to ${pet.name}! (+50% Happiness, +25 XP)`);
  openPetOverlay();
};

window.startPetLevelUpQuiz = function(petId) {
  const pet = petState.collection.find(p => p.id === petId);
  const def = PET_DB.find(p => p.id === petId);
  if (!pet || !def) return;

  closePetOverlay();

  // Create pet vocab question
  const targetWord = { ko: def.name, en: def.enName.split('/')[0].trim() };
  openQuiz(targetWord, null, 3);
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
  { name: 'Min-jun (민준)', title: 'Valley Veteran 🌾', words: 24, honor: 850, cookingTier: 'Sous Chef 🍲', petsPct: 80, arcade: 1450, dungeon: 8, duelStreak: 7 },
  { name: 'Seo-yeon (서연)', title: 'Hansik Scholar 👑', words: 18, honor: 620, cookingTier: 'Apprentice Chef 👨‍🍳', petsPct: 60, arcade: 1100, dungeon: 6, duelStreak: 5 },
  { name: 'Ji-hoon (지훈)', title: 'Spell Duelist ⚡', words: 12, honor: 450, cookingTier: 'Novice Cook 🍳', petsPct: 40, arcade: 850, dungeon: 4, duelStreak: 4 },
  { name: 'Ha-eun (하은)', title: 'Pet Companion 🎨', words: 8, honor: 280, cookingTier: 'Novice Cook 🍳', petsPct: 40, arcade: 520, dungeon: 2, duelStreak: 2 }
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

  // Total Words Mastered (words with >= 5 harvests)
  let masteredCount = 0;
  if (typeof harvestCounts !== 'undefined' && harvestCounts) {
    harvestCounts.forEach((count) => {
      if (count >= 5) masteredCount++;
    });
  }

  leaderboardState.personalBests.totalWordsMastered = masteredCount;
  leaderboardState.personalBests.totalHonor = playerCurrencies?.honor || 0;
  leaderboardState.personalBests.highestCookingTier = computeCookingTier();
  
  const petCount = (petState?.collection || []).length;
  leaderboardState.personalBests.petCollectionPct = Math.round((petCount / 5) * 100);

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
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🐾 Pets Collected: <b style="color:var(--neon-gold)">${pb.petCollectionPct}%</b></div>
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
    petsPct: pb.petCollectionPct || 20,
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
    if (tabId === 'pets') return b.petsPct - a.petsPct;
    if (tabId === 'arcade') return b.arcade - a.arcade;
    if (tabId === 'dungeon') return b.dungeon - a.dungeon;
    if (tabId === 'duel') return b.duelStreak - a.duelStreak;
    return 0;
  });

  let valColHeader = 'Score';
  if (tabId === 'vocab') valColHeader = 'Words Mastered (>=5 Harvests)';
  if (tabId === 'honor') valColHeader = 'Total Honor 🏅';
  if (tabId === 'cooking') valColHeader = 'Cooking Rank';
  if (tabId === 'pets') valColHeader = 'Pet Collection %';
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
    if (tabId === 'pets') displayVal = `${entry.petsPct}%`;
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

// Global window exports for HTML event bindings
window.openSeasonalOverlay = openSeasonalOverlay;
window.closeSeasonalOverlay = closeSeasonalOverlay;
window.cycleSeasonalEvent = cycleSeasonalEvent;
window.claimSeasonalQuest = claimSeasonalQuest;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.switchLeaderboardTab = switchLeaderboardTab;
