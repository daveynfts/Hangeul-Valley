const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== EMPIRICAL FORENSIC VERIFICATION HARNESS ===\n');

// 1. Check file existence & byte equality
const rootGamePath = path.join(__dirname, '../../game.js');
const assetsGamePath = path.join(__dirname, '../../assets/game.js');

const rootGame = fs.readFileSync(rootGamePath);
const assetsGame = fs.readFileSync(assetsGamePath);

console.log('Root game.js size:', rootGame.length, 'bytes');
console.log('Assets game.js size:', assetsGame.length, 'bytes');
const isByteEqual = rootGame.equals(assetsGame);
console.log('Byte-for-byte identical:', isByteEqual);

if (!isByteEqual) {
  console.error('FAILED: game.js and assets/game.js are NOT identical!');
  process.exit(1);
}

// 2. Mock Phaser Environment to test PixelArtRenderer & Scene preload methods
class MockGraphics {
  constructor(scene) {
    this.scene = scene;
    this.fills = [];
    this.rects = [];
  }
  fillStyle(col, alpha) {
    this.fills.push({ col, alpha });
  }
  fillRect(x, y, w, h) {
    this.rects.push({ x, y, w, h });
  }
  generateTexture(key, width, height) {
    this.scene.textures.createdTextures[key] = {
      key,
      width,
      height,
      rectCount: this.rects.length,
      filterMode: null,
      setFilter(mode) { this.filterMode = mode; }
    };
  }
  destroy() {}
}

function createMockScene(name) {
  const scene = {
    name,
    make: {
      graphics: () => new MockGraphics(scene)
    },
    textures: {
      createdTextures: {},
      exists(key) { return !!this.createdTextures[key]; },
      remove(key) { delete this.createdTextures[key]; },
      get(key) { return this.createdTextures[key]; }
    },
    anims: {
      registeredAnims: {},
      exists(key) { return !!this.registeredAnims[key]; },
      create(config) { this.registeredAnims[config.key] = config; }
    },
    load: {
      json() {}
    }
  };
  return scene;
}

const createMockElem = () => ({
  addEventListener: () => {},
  removeEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {} },
  appendChild: () => {},
  querySelector: () => createMockElem(),
  querySelectorAll: () => []
});

const mockWindow = {
  AudioContext: null,
  webkitAudioContext: null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

const mockDocument = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => createMockElem(),
  querySelector: () => createMockElem(),
  querySelectorAll: () => [],
  createElement: () => createMockElem()
};

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  Phaser: {
    Scene: class Scene {
      constructor(config) {
        this.config = config;
      }
    },
    Textures: { FilterMode: { NEAREST: 1 } },
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    AUTO: 0,
    Game: class Game { constructor() {} }
  },
  console: console,
  require: require,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval
};

vm.createContext(sandbox);

// Execute game.js in VM context
try {
  vm.runInContext(rootGame.toString('utf8'), sandbox);
  console.log('Successfully loaded and compiled game.js in VM context.');
} catch (err) {
  console.error('Failed to compile game.js:', err);
  process.exit(1);
}

// Test scene classes
const sceneNames = ['FarmScene', 'ArcadeScene', 'DungeonScene', 'FishingScene'];
const auditResults = {};

sceneNames.forEach(sceneName => {
  console.log(`\n--- Testing ${sceneName} ---`);
  let SceneClass;
  try {
    SceneClass = vm.runInContext(sceneName, sandbox);
  } catch (e) {
    console.error(`ERROR: Failed to evaluate ${sceneName}:`, e);
    process.exit(1);
  }

  if (!SceneClass) {
    console.error(`ERROR: ${sceneName} not found in global context!`);
    process.exit(1);
  }

  const mockInstance = createMockScene(sceneName);
  Object.setPrototypeOf(mockInstance, SceneClass.prototype);

  if (typeof mockInstance.preload !== 'function') {
    console.error(`ERROR: ${sceneName} does not have a preload() method!`);
    process.exit(1);
  }

  // Invoke preload() on the scene instance
  try {
    mockInstance.preload();
    const texturesCount = Object.keys(mockInstance.textures.createdTextures).length;
    const animsCount = Object.keys(mockInstance.anims.registeredAnims).length;

    console.log(`[PASS] ${sceneName}.preload() executed successfully.`);
    console.log(`  - Textures generated: ${texturesCount}`);
    console.log(`  - Animations registered: ${animsCount}`);

    // Verify 48x48 resolution on player walk textures
    const sampleTexture = mockInstance.textures.createdTextures['player_walk_down_0'];
    if (sampleTexture) {
      console.log(`  - Sample Texture 'player_walk_down_0': ${sampleTexture.width}x${sampleTexture.height}px (rects: ${sampleTexture.rectCount}, filterMode: ${sampleTexture.filterMode})`);
      if (sampleTexture.width !== 48 || sampleTexture.height !== 48) {
        console.error(`  - ERROR: Expected 48x48px, got ${sampleTexture.width}x${sampleTexture.height}px`);
        process.exit(1);
      }
    } else {
      console.error(`  - ERROR: Sample texture 'player_walk_down_0' missing in ${sceneName}!`);
      process.exit(1);
    }

    auditResults[sceneName] = {
      preloadDefined: true,
      texturesCount,
      animsCount,
      sampleWidth: sampleTexture.width,
      sampleHeight: sampleTexture.height
    };
  } catch (err) {
    console.error(`ERROR in ${sceneName}.preload():`, err);
    process.exit(1);
  }
});

console.log('\n=== ALL SCENE PRELOAD CHECKS PASSED SUCCESSFULLY ===');
