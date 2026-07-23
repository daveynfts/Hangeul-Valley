const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('   HANGEUL VALLEY - PIXEL ART VERIFICATION HARNESS   ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureLog = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
    failureLog.push(message);
  }
}

const rootDir = path.resolve(__dirname, '../../');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

// ----------------------------------------------------
// TEST 1: SYNTAX VALIDATION
// ----------------------------------------------------
console.log('--- TEST 1: SYNTAX VALIDATION ---');
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  assert(true, 'node -c game.js executed cleanly (exit code 0)');
} catch (err) {
  assert(false, `node -c game.js failed: ${err.message}`);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  assert(true, 'node -c assets/game.js executed cleanly (exit code 0)');
} catch (err) {
  assert(false, `node -c assets/game.js failed: ${err.message}`);
}

// ----------------------------------------------------
// TEST 2: SHA256 FILE SYNCHRONIZATION
// ----------------------------------------------------
console.log('\n--- TEST 2: SHA256 FILE SYNCHRONIZATION ---');
let hash1 = '', hash2 = '';
try {
  const content1 = fs.readFileSync(gameJsPath);
  const content2 = fs.readFileSync(assetsGameJsPath);
  hash1 = crypto.createHash('sha256').update(content1).digest('hex');
  hash2 = crypto.createHash('sha256').update(content2).digest('hex');
  assert(hash1 === hash2, `SHA256 Match: game.js (${hash1.substring(0, 12)}...) === assets/game.js (${hash2.substring(0, 12)}...)`);
} catch (err) {
  assert(false, `SHA256 comparison failed: ${err.message}`);
}

// ----------------------------------------------------
// TEST 3: PIXEL ART MATRICES & PHASER ANIMATIONS
// ----------------------------------------------------
console.log('\n--- TEST 3: MATRICES & ANIMATIONS VERIFICATION ---');

const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

// Mock Phaser & Browser globals
const recordedMatrices = new Map(); // key -> { matrix, palette, width, height }
const createdTexturesSet = new Set();
const registeredAnims = new Map(); // key -> { frames, frameRate, repeat }

const mockGraphics = new Proxy({
  generateTexture: (key, w, h) => { createdTexturesSet.add(key); },
  destroy: () => {},
  clear: () => {}
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return () => {};
  }
});

const mockScene = {
  _pixelArtTexturesBaked: false,
  _tilemapTexturesGenerated: false,
  textures: {
    exists: (key) => createdTexturesSet.has(key),
    remove: (key) => createdTexturesSet.delete(key),
    get: (key) => ({ setFilter: () => {} })
  },
  make: {
    graphics: () => mockGraphics
  },
  anims: {
    exists: (key) => registeredAnims.has(key),
    create: (config) => {
      registeredAnims.set(config.key, config);
    }
  }
};

const sandbox = {
  console: { log: () => {}, warn: () => {}, error: console.error },
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  window: {
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  document: (() => {
    const createMockElem = () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      setAttribute: () => {},
      getAttribute: () => null,
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      querySelector: () => createMockElem(),
      querySelectorAll: () => [],
      appendChild: () => {},
      removeChild: () => {},
      focus: () => {}
    });
    return {
      addEventListener: () => {},
      removeEventListener: () => {},
      getElementById: () => createMockElem(),
      querySelector: () => createMockElem(),
      querySelectorAll: () => [],
      createElement: () => createMockElem(),
      body: createMockElem()
    };
  })(),
  AudioContext: class {},
  webkitAudioContext: class {},
  Phaser: {
    Scene: class Scene { constructor(config) {} },
    Game: class Game { constructor(config) {} },
    Scale: { RESIZE: 1, FIT: 2, CENTER_BOTH: 3 },
    AUTO: 0,
    CANVAS: 1,
    WEBGL: 2,
    Textures: { FilterMode: { NEAREST: 1 } },
    GameObjects: { Sprite: class {}, Image: class {} },
    Math: { Between: (a, b) => a, FloatBetween: (a, b) => a, Clamp: (v) => v }
  }
};

vm.createContext(sandbox);

try {
  vm.runInContext(gameJsContent + '\nthis.PixelArtRenderer = PixelArtRenderer;', sandbox);
  assert(typeof sandbox.PixelArtRenderer === 'function', 'PixelArtRenderer class is defined in game.js');
} catch (err) {
  assert(false, `Failed to evaluate game.js in VM: ${err.message}`);
}

if (sandbox.PixelArtRenderer) {
  // Override createTexture to record matrix data
  const originalCreateTexture = sandbox.PixelArtRenderer.createTexture;
  sandbox.PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width = 16, height = 16, ps = 3) {
    recordedMatrices.set(key, { matrix, palette, width, height, ps });
    return originalCreateTexture.call(this, scene, key, matrix, palette, width, height, ps);
  };

  // Run generateAllTextures
  try {
    sandbox.PixelArtRenderer.generateAllTextures(mockScene);
    assert(true, 'PixelArtRenderer.generateAllTextures executed without throwing errors');
  } catch (err) {
    assert(false, `generateAllTextures threw error: ${err.message}`);
  }

  // A. Verify Character & NPC Textures Existence and Matrix Dimensions
  console.log('\n  --- Matrix Validation (16x16 Arrays) ---');
  const expectedTextures = [
    // Walk down/up/left/right
    'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
    'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
    'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
    'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
    // Actions & Tools
    'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
    'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
    'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle',
    // Cat
    'cat_idle_0', 'cat_idle_1',
    'cat_walk_0', 'cat_walk_1', 'cat_walk_2',
    'cat_sit_0', 'cat_sit_1',
    'cat_sleep_0', 'cat_sleep_1',
    // Wizard
    'wizard_idle_0', 'wizard_idle_1'
  ];

  expectedTextures.forEach((texKey) => {
    const texData = recordedMatrices.get(texKey);
    if (!texData) {
      assert(false, `Texture '${texKey}' is missing from recorded matrices`);
      return;
    }
    const matrix = texData.matrix;
    if (!Array.isArray(matrix)) {
      assert(false, `Texture '${texKey}' matrix is not an array`);
      return;
    }
    const rowCount = matrix.length;
    let colWidthValid = true;
    matrix.forEach((row) => {
      if (typeof row !== 'string' || row.length !== 16) {
        colWidthValid = false;
      }
    });

    const is16x16 = rowCount === 16 && colWidthValid;
    assert(is16x16, `Texture '${texKey}' matrix is a valid 16x16 array (rows=${rowCount}, cols=${matrix.map(r => r.length).join(',')})`);
  });

  // B. Verify Phaser Animation Keys
  console.log('\n  --- Phaser Animation Keys Registration ---');
  const requiredAnims = [
    { key: 'player-walk-down', expectedFrames: 4 },
    { key: 'player-walk-up', expectedFrames: 4 },
    { key: 'player-walk-left', expectedFrames: 4 },
    { key: 'player-walk-right', expectedFrames: 4 },
    { key: 'player-water', expectedFrames: 4 },
    { key: 'player-harvest', expectedFrames: 3 },
    { key: 'player-pick', expectedFrames: 3 },
    { key: 'cat-idle', expectedFrames: 2 },
    { key: 'cat-walk', expectedFrames: 4 },
    { key: 'cat-sit', expectedFrames: 2 },
    { key: 'cat-sleep', expectedFrames: 2 },
    { key: 'wizard-idle', expectedFrames: 2 }
  ];

  requiredAnims.forEach(({ key, expectedFrames }) => {
    const anim = registeredAnims.get(key);
    if (!anim) {
      assert(false, `Phaser animation key '${key}' is missing`);
    } else {
      const actualFrames = anim.frames ? anim.frames.length : 0;
      assert(
        actualFrames === expectedFrames,
        `Phaser animation key '${key}' created properly (frames=${actualFrames}, expected=${expectedFrames})`
      );
    }
  });
}

// ----------------------------------------------------
// SUMMARY & VERDICT
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`   TEST SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('====================================================');

const verdict = failedTests === 0 ? 'PASS' : 'FAIL';
console.log(`VERDICT: ${verdict}\n`);

if (failedTests > 0) {
  console.log('FAILURES DETECTED:');
  failureLog.forEach(f => console.log(` - ${f}`));
  process.exit(1);
} else {
  process.exit(0);
}
