const fs = require('fs');
const path = require('path');

const gameJsPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';
const assetsGameJsPath = 'C:\\VibeCode\\Hangeul Valley\\assets\\game.js';

console.log('=== STARTING FORENSIC AUDIT SCRIPT ===');

// Check 1: File existence & byte sync
const gameJsBuf = fs.readFileSync(gameJsPath);
const assetsBuf = fs.readFileSync(assetsGameJsPath);

console.log(`game.js size: ${gameJsBuf.length} bytes`);
console.log(`assets/game.js size: ${assetsBuf.length} bytes`);
if (!gameJsBuf.equals(assetsBuf)) {
  console.error('FAIL: Byte sync discrepancy between game.js and assets/game.js');
} else {
  console.log('PASS: 100% byte synchronization confirmed');
}

const code = gameJsBuf.toString('utf8');

// Mock complete browser environment
const mockElement = () => ({
  style: {},
  appendChild: () => {},
  removeChild: () => {},
  querySelector: () => mockElement(),
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  setAttribute: () => {},
  getAttribute: () => '',
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  focus: () => {},
  blur: () => {}
});

global.window = global;
global.document = {
  getElementById: () => mockElement(),
  querySelector: () => mockElement(),
  querySelectorAll: () => [],
  createElement: () => mockElement(),
  body: mockElement(),
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.navigator = { userAgent: 'node' };
global.Image = class {};
global.Audio = class {};

// Trackers
let generatedTextures = new Map();
let colorMapKeys = new Set();
let invalidTokenKeys = [];
let matrixRowMismatch = [];
let missingOutlineK = [];
let incorrectKValue = [];
let spritePaletteToneCounts = [];

class MockTexture {
  constructor(key) {
    this.key = key;
  }
  getSourceImage() {
    return { width: 48, height: 48 };
  }
  setFilter() { return this; }
  add() { return this; }
  drawResized() {}
}

class MockTexturesManager {
  constructor() {
    this.list = {};
  }
  exists(key) {
    return !!this.list[key];
  }
  get(key) {
    if (!this.list[key]) {
      this.list[key] = new MockTexture(key);
    }
    return this.list[key];
  }
  generate(key, options) {
    this.list[key] = new MockTexture(key);
    return this.list[key];
  }
  addCanvas(key, canvas) {
    this.list[key] = new MockTexture(key);
    return this.list[key];
  }
  create(key, width, height) {
    this.list[key] = new MockTexture(key);
    return this.list[key];
  }
}

class MockGraphics {
  constructor() {
    this.fillStyleVal = null;
    this.fillStyleAlpha = 1;
    this.pixelsDrawn = [];
  }
  clear() {
    this.pixelsDrawn = [];
  }
  fillStyle(color, alpha = 1) {
    this.fillStyleVal = color;
    this.fillStyleAlpha = alpha;
    return this;
  }
  fillRect(x, y, w, h) {
    this.pixelsDrawn.push({ x, y, w, h, color: this.fillStyleVal, alpha: this.fillStyleAlpha });
    return this.fillStyleVal;
  }
  lineStyle(w, color, alpha = 1) {
    return this;
  }
  strokeRect(x, y, w, h) {
    return this;
  }
  fillCircle(x, y, r) {
    return this;
  }
  strokeCircle(x, y, r) {
    return this;
  }
  beginPath() { return this; }
  moveTo(x, y) { return this; }
  lineTo(x, y) { return this; }
  strokePath() { return this; }
  generateTexture(key, width, height) {
    generatedTextures.set(key, { width, height, pixelsCount: this.pixelsDrawn.length });
    return new MockTexture(key);
  }
  destroy() {}
}

class MockScene {
  constructor() {
    this.textures = new MockTexturesManager();
    this.add = {
      graphics: () => new MockGraphics()
    };
    this.make = {
      graphics: (opts) => new MockGraphics()
    };
  }
}

global.Phaser = {
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  Scale: {
    RESIZE: 1,
    FIT: 2,
    CENTER_BOTH: 1,
    NONE: 0
  },
  Math: {
    Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    FloatBetween: (min, max) => Math.random() * (max - min) + min
  },
  Game: class {
    constructor() {}
  },
  Scene: class {
    constructor() {}
  },
  Display: {
    Color: {
      HexStringToColor: (hex) => ({ color: parseInt(hex.replace('#', '0x'), 16) }),
      IntegerToColor: (num) => ({
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        rgba: `rgba(${ (num >> 16) & 255 },${ (num >> 8) & 255 },${ num & 255 },1)`
      })
    }
  }
};

console.log('\n--- Evaluating PixelArtRenderer ---');

try {
  const scriptToEval = code + '\nmodule.exports = { PixelArtRenderer, DynamicShadowSystem };';
  const evalResult = eval(scriptToEval);
  const PixelArtRenderer = evalResult.PixelArtRenderer;

  if (!PixelArtRenderer) {
    console.error('FAIL: PixelArtRenderer is not defined!');
  } else {
    console.log('PixelArtRenderer successfully loaded.');

    // Wrap drawMatrix to inspect all calls
    const originalDrawMatrix = PixelArtRenderer.drawMatrix;
    PixelArtRenderer.drawMatrix = function(graphics, matrix, palette, pixelSize = 1, offsetX = 0, offsetY = 0) {
      const rowCount = matrix.length;
      const expectedWidth = matrix[0] ? matrix[0].length : 0;

      // Check row length uniformity
      for (let r = 0; r < rowCount; r++) {
        if (matrix[r].length !== expectedWidth) {
          matrixRowMismatch.push({
            rowCount,
            rowIdx: r,
            actualLen: matrix[r].length,
            expectedWidth,
            rowSnippet: matrix[r]
          });
        }
      }

      // Check single-char tokens in palette
      const usedPaletteKeys = Object.keys(palette);
      let paletteToneColors = new Set();

      for (const k of usedPaletteKeys) {
        colorMapKeys.add(k);
        if (k.length !== 1) {
          invalidTokenKeys.push({ key: k, palette });
        }
        if (k !== '.' && palette[k] !== undefined && palette[k] !== null) {
          paletteToneColors.add(palette[k]);
        }
      }

      // Check outline 'K'
      if (palette['K'] !== undefined) {
        if (palette['K'] !== 0x0F172A) {
          incorrectKValue.push({ found: palette['K'], expected: 0x0F172A });
        }
      }

      spritePaletteToneCounts.push({
        matrixSize: `${expectedWidth}x${rowCount}`,
        toneCount: paletteToneColors.size,
        paletteKeys: usedPaletteKeys,
        tones: Array.from(paletteToneColors).map(t => '0x' + t.toString(16).toUpperCase())
      });

      return originalDrawMatrix.call(this, graphics, matrix, palette, pixelSize, offsetX, offsetY);
    };

    const mockScene = new MockScene();
    console.log('Running generateTilemapTextures...');
    if (typeof PixelArtRenderer.generateTilemapTextures === 'function') {
      PixelArtRenderer.generateTilemapTextures(mockScene);
    }
    console.log('Running _genFishingTextures...');
    if (typeof PixelArtRenderer._genFishingTextures === 'function') {
      PixelArtRenderer._genFishingTextures(mockScene);
    }
    console.log('Running _genArcadeTextures...');
    if (typeof PixelArtRenderer._genArcadeTextures === 'function') {
      PixelArtRenderer._genArcadeTextures(mockScene);
    }
    console.log('Running _genDungeonTextures...');
    if (typeof PixelArtRenderer._genDungeonTextures === 'function') {
      PixelArtRenderer._genDungeonTextures(mockScene);
    }

    console.log(`\nTotal generated textures count: ${generatedTextures.size}`);
    const keyList = Array.from(generatedTextures.keys());
    console.log('Generated Texture Keys count:', keyList.length);
    console.log('Keys:', keyList.join(', '));
  }
} catch (err) {
  console.error('Error evaluating PixelArtRenderer:', err);
}

// Print analysis results
console.log('\n--- ANALYSIS RESULTS ---');

console.log(`1. Invalid (multi-character) token keys found: ${invalidTokenKeys.length}`);
if (invalidTokenKeys.length > 0) {
  console.error('Invalid token keys:', invalidTokenKeys);
}

console.log(`2. Matrix row length mismatches: ${matrixRowMismatch.length}`);
if (matrixRowMismatch.length > 0) {
  console.error('Matrix row mismatches:', matrixRowMismatch);
}

console.log(`3. Incorrect 'K' outline color values: ${incorrectKValue.length}`);
if (incorrectKValue.length > 0) {
  console.error('Incorrect K values:', incorrectKValue);
}

const lowTonePalettes = spritePaletteToneCounts.filter(p => p.toneCount < 3);
console.log(`4. Palettes with less than 3 tones: ${lowTonePalettes.length} out of ${spritePaletteToneCounts.length}`);
if (lowTonePalettes.length > 0) {
  console.log('Palettes with < 3 tones:', lowTonePalettes);
}
