const fs = require('fs');
const vm = require('vm');

// 1. Read game.js code
const gameCode = fs.readFileSync('game.js', 'utf8');

// 2. Setup mock Phaser and Browser environment
const mockTextures = new Map();
const textureErrors = [];
const graphicsCalls = [];

const mockPhaser = {
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  Scale: {
    RESIZE: 1,
    CENTER_BOTH: 1,
    FIT: 2
  },
  Input: {
    Keyboard: {
      KeyCodes: {
        W: 87, A: 65, S: 83, D: 68,
        UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39,
        SPACE: 32, E: 69, ESC: 27
      }
    }
  },
  Textures: {
    FilterMode: {
      NEAREST: 0,
      LINEAR: 1
    }
  },
  Math: {
    Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    RandomDataGenerator: function(seeds) {
      return {
        between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
      };
    }
  },
  Utils: {
    Array: {
      GetRandom: (arr) => arr[Math.floor(Math.random() * arr.length)]
    }
  },
  Scene: class Scene {},
  Game: class Game {
    constructor(config) {
      this.config = config;
    }
  }
};

class MockGraphics {
  constructor(key) {
    this.commands = [];
    this.destroyed = false;
  }

  fillStyle(color, alpha = 1) {
    if (this.destroyed) throw new Error('Calling fillStyle on destroyed Graphics object');
    if (typeof color !== 'number' || isNaN(color)) {
      textureErrors.push(`Invalid color parameter in fillStyle: ${color}`);
    }
    if (typeof alpha !== 'number' || isNaN(alpha) || alpha < 0 || alpha > 1) {
      textureErrors.push(`Invalid alpha parameter in fillStyle: ${alpha}`);
    }
    this.commands.push({ cmd: 'fillStyle', color, alpha });
    return this;
  }

  fillRect(x, y, w, h) {
    if (this.destroyed) throw new Error('Calling fillRect on destroyed Graphics object');
    if ([x, y, w, h].some(v => typeof v !== 'number' || isNaN(v))) {
      textureErrors.push(`Invalid parameter in fillRect: (${x}, ${y}, ${w}, ${h})`);
    }
    if (w <= 0 || h <= 0) {
      textureErrors.push(`Zero or negative size in fillRect: w=${w}, h=${h}`);
    }
    this.commands.push({ cmd: 'fillRect', x, y, w, h });
    return this;
  }

  fillCircle(x, y, r) {
    if (this.destroyed) throw new Error('Calling fillCircle on destroyed Graphics object');
    if ([x, y, r].some(v => typeof v !== 'number' || isNaN(v))) {
      textureErrors.push(`Invalid parameter in fillCircle: (${x}, ${y}, ${r})`);
    }
    this.commands.push({ cmd: 'fillCircle', x, y, r });
    return this;
  }

  generateTexture(key, width, height) {
    if (this.destroyed) throw new Error('Calling generateTexture on destroyed Graphics object');
    if (!key || typeof key !== 'string') {
      textureErrors.push(`Invalid texture key: ${key}`);
    }
    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
      textureErrors.push(`Invalid texture dimensions for key ${key}: ${width}x${height}`);
    }

    const texObj = {
      key,
      width,
      height,
      filterMode: null,
      setFilter: function(mode) {
        this.filterMode = mode;
      }
    };
    mockTextures.set(key, texObj);
    graphicsCalls.push({ key, width, height, commandCount: this.commands.length });
    return this;
  }

  destroy() {
    this.destroyed = true;
  }
}

class MockScene {
  constructor() {
    this.textures = {
      exists: (key) => mockTextures.has(key),
      remove: (key) => mockTextures.delete(key),
      get: (key) => mockTextures.get(key)
    };
    this.make = {
      graphics: (opts) => new MockGraphics()
    };
    this.cache = {
      json: {
        get: (k) => [{ id: 1, name: 'Level 1' }]
      }
    };
  }
}

const createMockElement = (tag) => ({
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  setAttribute: () => {},
  getAttribute: () => '',
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  style: {},
  children: [],
  innerText: '',
  innerHTML: ''
});

const mockDocument = {
  getElementById: (id) => createMockElement('div'),
  querySelector: (sel) => createMockElement('div'),
  querySelectorAll: (sel) => [],
  createElement: (tag) => createMockElement(tag),
  addEventListener: () => {},
  removeEventListener: () => {},
  body: createMockElement('body')
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  document: mockDocument,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  innerWidth: 1024,
  innerHeight: 768,
  Phaser: mockPhaser
};

mockDocument.defaultView = mockWindow;

// 3. Create VM context with mock window/document/Phaser
const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockWindow.localStorage,
  Phaser: mockPhaser,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  typeof: (v) => typeof v
};
sandbox.global = sandbox;

vm.createContext(sandbox);

try {
  // Execute gameCode in sandbox
  vm.runInContext(gameCode, sandbox);
  console.log('Successfully evaluated game.js in VM context!');

  const PixelArtRenderer = sandbox.PixelArtRenderer || vm.runInContext('PixelArtRenderer', sandbox);
  if (!PixelArtRenderer) {
    console.error('PixelArtRenderer not found in global scope!');
    process.exit(1);
  }

  // Run generateTilemapTextures
  const mockScene = new MockScene();
  PixelArtRenderer.generateTilemapTextures(mockScene);

  console.log(`\nRegistered tilemap textures count: ${mockTextures.size}`);
  console.log('Errors logged during texture generation:', textureErrors);

  let successCount = 0;
  mockTextures.forEach((tex, key) => {
    const isCorrectSize = tex.width === 48 && tex.height === 48;
    const isNearestFilter = tex.filterMode === mockPhaser.Textures.FilterMode.NEAREST;
    if (isCorrectSize && isNearestFilter) {
      successCount++;
    } else {
      console.warn(`Texture mismatch for [${key}]: size=${tex.width}x${tex.height}, filterMode=${tex.filterMode}`);
    }
  });

  console.log(`\nValidation Summary: ${successCount} / ${mockTextures.size} tilemap textures fully valid and registered.`);

  // Test re-entrancy / idempotent re-generation
  console.log('\nTesting idempotent re-generation (calling generateTilemapTextures twice)...');
  const sizeBefore = mockTextures.size;
  // Reset flag on scene to test overwrite behavior
  delete mockScene._tilemapTexturesGenerated;
  PixelArtRenderer.generateTilemapTextures(mockScene);
  const sizeAfter = mockTextures.size;
  console.log(`Size before re-gen: ${sizeBefore}, size after re-gen: ${sizeAfter}`);
  if (sizeBefore === sizeAfter) {
    console.log('Idempotent re-generation test PASSED!');
  } else {
    console.error('Idempotent re-generation test FAILED!');
  }

} catch (err) {
  console.error('Execution error during test:', err.stack || err);
}
