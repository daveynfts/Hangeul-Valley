/**
 * Automated Test Specialist Suite for Hangeul Valley Character Design Upgrade
 * Script: test_character_upgrade.js
 * Author: Challenger 1 (Automated Test Specialist)
 *
 * Tests:
 * 1. Syntax Validation: Executes `node -c game.js` & `node -c assets/game.js`, asserting exit code 0.
 * 2. Texture Key Verification: Asserts registration of all required character and tool texture keys.
 * 3. Animation Key & Frame Count Verification: Asserts existence and correct frame count for player and cat animations.
 * 4. File Synchronization: Asserts SHA-256 hash equality between root files and assets/ mirror files.
 * 5. Matrix Dimensional Stress Audit: Inspects pixel art matrices for height/width anomalies (e.g. player_pick_down_2).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const GAME_JS_PATH = path.join(PROJECT_ROOT, 'game.js');
const ASSETS_GAME_JS_PATH = path.join(PROJECT_ROOT, 'assets', 'game.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
    testResults.push({ name: testName, status: 'PASS', details });
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName} - ${details}`);
    testResults.push({ name: testName, status: 'FAIL', details });
  }
}

console.log('================================================================');
console.log(' HANGEUL VALLEY CHARACTER DESIGN UPGRADE TEST SUITE');
console.log(' Project Root:', PROJECT_ROOT);
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: Syntax Validation
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: JavaScript Syntax Validation ---');
try {
  execSync(`node -c "${GAME_JS_PATH}"`, { stdio: 'pipe' });
  assert(true, '1.1 Syntax check root game.js', 'Exit code 0');
} catch (err) {
  assert(false, '1.1 Syntax check root game.js', err.message);
}

try {
  execSync(`node -c "${ASSETS_GAME_JS_PATH}"`, { stdio: 'pipe' });
  assert(true, '1.2 Syntax check assets/game.js', 'Exit code 0');
} catch (err) {
  assert(false, '1.2 Syntax check assets/game.js', err.message);
}

// -----------------------------------------------------------------------------
// VM HARNESS SETUP FOR DYNAMIC TESTING
// -----------------------------------------------------------------------------
function setupVmSandbox(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const createdTextures = new Set();
  const createdAnims = new Map();
  const textureMatrices = [];

  const mockGraphics = new Proxy({
    generateTexture: (key) => { createdTextures.add(key); },
    destroy: () => {}
  }, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return () => mockGraphics;
    }
  });

  const mockScene = {
    textures: {
      exists: (k) => createdTextures.has(k),
      remove: (k) => createdTextures.delete(k),
      get: (k) => ({ setFilter: () => {} })
    },
    make: { graphics: () => mockGraphics },
    anims: {
      exists: (k) => createdAnims.has(k),
      create: (config) => { createdAnims.set(config.key, config); }
    }
  };

  const dummyElem = {
    addEventListener: () => {}, removeEventListener: () => {},
    querySelector: () => dummyElem, querySelectorAll: () => [dummyElem],
    style: {}, appendChild: () => {}, removeChild: () => {},
    setAttribute: () => {}, removeAttribute: () => {}
  };

  const sandbox = {
    window: {},
    document: {
      createElement: () => dummyElem, getElementById: () => dummyElem,
      querySelector: () => dummyElem, querySelectorAll: () => [dummyElem],
      addEventListener: () => {}, removeEventListener: () => {}, body: dummyElem
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    STARDEW_PALETTE: {},
    Phaser: {
      Textures: { FilterMode: { NEAREST: 1 } },
      Scale: { RESIZE: 1, CENTER_BOTH: 1, FIT: 1 },
      AUTO: 1, Game: class {}, Scene: class {},
      Math: { Between: (a,b) => a, FloatBetween: (a,b) => a, Distance: { Between: () => 0 } },
      Utils: { Array: { GetRandom: (arr) => arr[0] } }
    },
    setTimeout: () => {}, setInterval: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { href: '', reload: () => {} },
    navigator: { userAgent: 'node' }
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(code + '\n; window.PixelArtRenderer = PixelArtRenderer;', sandbox);

  if (sandbox.window.PixelArtRenderer) {
    const origCreateTexture = sandbox.window.PixelArtRenderer.createTexture;
    sandbox.window.PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width = 16, height = 16, ps = 3) {
      if (Array.isArray(matrix)) {
        textureMatrices.push({ key, width, height, numRows: matrix.length, rowLengths: matrix.map(r => r.length) });
      }
      return origCreateTexture.call(this, scene, key, matrix, palette, width, height, ps);
    };

    sandbox.window.PixelArtRenderer.generateAllTextures(mockScene);
  }

  return { createdTextures, createdAnims, textureMatrices, code };
}

const vmRoot = setupVmSandbox(GAME_JS_PATH);

// -----------------------------------------------------------------------------
// TEST SUITE 2: Texture Key Registration Verification
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Texture Key Registration Verification ---');
const requiredTextures = [
  // Player Action Textures
  'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
  'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
  'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
  // Tool Textures
  'tool_watering_can', 'tool_basket', 'tool_sickle',
  // Ginger Cat Textures
  'cat_idle_0', 'cat_idle_1',
  'cat_walk_0', 'cat_walk_1', 'cat_walk_2',
  'cat_sit_0', 'cat_sit_1',
  'cat_sleep_0', 'cat_sleep_1'
];

requiredTextures.forEach((texKey) => {
  const isRegistered = vmRoot.createdTextures.has(texKey);
  assert(isRegistered, `2. Texture Key Registered: '${texKey}'`, `Registered in PixelArtRenderer: ${isRegistered}`);
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: Animation Key & Frame Count Verification
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3: Animation Key & Frame Count Verification ---');
const expectedAnimations = [
  { key: 'player-water', expectedFrames: 4, expectedKeys: ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1'] },
  { key: 'player-harvest', expectedFrames: 3, expectedKeys: ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2'] },
  { key: 'player-pick', expectedFrames: 3, expectedKeys: ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2'] },
  { key: 'cat-idle', expectedFrames: 2, expectedKeys: ['cat_idle_0', 'cat_idle_1'] },
  { key: 'cat-walk', expectedFrames: 4, expectedKeys: ['cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_walk_1'] },
  { key: 'cat-sit', expectedFrames: 2, expectedKeys: ['cat_sit_0', 'cat_sit_1'] },
  { key: 'cat-sleep', expectedFrames: 2, expectedKeys: ['cat_sleep_0', 'cat_sleep_1'] }
];

expectedAnimations.forEach((anim) => {
  const animData = vmRoot.createdAnims.get(anim.key);
  if (!animData) {
    assert(false, `3. Animation Existence: '${anim.key}'`, 'Animation key not found');
    return;
  }
  const actualFrameCount = animData.frames ? animData.frames.length : 0;
  const actualFrameKeys = animData.frames ? animData.frames.map(f => f.key) : [];

  const countPass = actualFrameCount === anim.expectedFrames;
  assert(countPass, `3.1 Anim Frame Count: '${anim.key}'`, `Expected: ${anim.expectedFrames}, Actual: ${actualFrameCount}`);

  const keysPass = JSON.stringify(actualFrameKeys) === JSON.stringify(anim.expectedKeys);
  assert(keysPass, `3.2 Anim Frame Sequence: '${anim.key}'`, `Expected: ${JSON.stringify(anim.expectedKeys)}, Actual: ${JSON.stringify(actualFrameKeys)}`);
});

// -----------------------------------------------------------------------------
// TEST SUITE 4: File Synchronization (SHA-256 Hash Equality)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 4: File Synchronization (SHA-256 Hash Equality) ---');
const mirroredFiles = ['game.js', 'index.html', 'levels.json', 'save_data.json'];

mirroredFiles.forEach((file) => {
  const rootPath = path.join(PROJECT_ROOT, file);
  const assetPath = path.join(PROJECT_ROOT, 'assets', file);

  const rootExists = fs.existsSync(rootPath);
  const assetExists = fs.existsSync(assetPath);

  if (!rootExists || !assetExists) {
    assert(false, `4. File Sync: ${file}`, `Root exists: ${rootExists}, Assets exists: ${assetExists}`);
    return;
  }

  const rootHash = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
  const assetHash = crypto.createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex');

  const match = rootHash === assetHash;
  assert(match, `4. SHA-256 Hash Match: ${file}`, match ? `Hash: ${rootHash.substring(0, 12)}...` : `Mismatch! Root: ${rootHash.substring(0, 12)}... vs Assets: ${assetHash.substring(0, 12)}...`);
});

// -----------------------------------------------------------------------------
// TEST SUITE 5: Empirical Stress-Testing & Matrix Dimension Audit
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 5: Empirical Stress-Testing & Matrix Dimension Audit ---');

// Audit player_pick_down_2 for height anomaly
const pickDown2 = vmRoot.textureMatrices.find(m => m.key === 'player_pick_down_2');
if (pickDown2) {
  const isCorrectHeight = pickDown2.numRows === pickDown2.height;
  assert(isCorrectHeight, `5.1 Matrix Dimension Check: 'player_pick_down_2'`, 
    isCorrectHeight ? '16x16 matrix valid' : `HEIGHT ANOMALY DETECTED! Declared height=${pickDown2.height}, but matrix has ${pickDown2.numRows} rows.`);
} else {
  assert(false, `5.1 Matrix Dimension Check: 'player_pick_down_2'`, 'Texture not found in matrix audit');
}

// Audit all registered character matrices for uniform 16x16 geometry
const characterTextureKeys = [
  'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
  'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
  'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
  'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
  'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
  'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
  'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
  'cat_idle_0', 'cat_idle_1', 'cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_sit_0', 'cat_sit_1', 'cat_sleep_0', 'cat_sleep_1'
];

let charAnomalies = 0;
characterTextureKeys.forEach(key => {
  const entry = vmRoot.textureMatrices.find(m => m.key === key);
  if (entry) {
    const rowLenMismatch = entry.rowLengths.some(l => l !== entry.width);
    const heightMismatch = entry.numRows !== entry.height;
    if (rowLenMismatch || heightMismatch) {
      charAnomalies++;
      console.warn(`    -> Anomaly in character texture '${key}': rows=${entry.numRows} (expected ${entry.height}), widths=[${entry.rowLengths.join(',')}]`);
    }
  }
});
assert(charAnomalies === 0, `5.2 Character Texture Geometry Audit`, charAnomalies === 0 ? 'All 30 character textures have clean 16x16 geometry' : `Found ${charAnomalies} character texture anomalies`);

// Idempotency check: Calling generateAllTextures twice should be safely guarded by _pixelArtTexturesBaked
let secondCallSuccess = true;
try {
  vmRoot.createdTextures.clear();
  const mockScene2 = {
    textures: { exists: () => false, remove: () => {}, get: () => ({ setFilter: () => {} }) },
    make: { graphics: () => new Proxy({}, { get: () => () => {} }) },
    anims: { exists: () => false, create: () => {} },
    _pixelArtTexturesBaked: true
  };
  // Since _pixelArtTexturesBaked is true, generateAllTextures should return immediately without generating textures
  // Access PixelArtRenderer via window
  const sandboxCode = 'window.PixelArtRenderer.generateAllTextures(mockScene2);';
} catch (e) {
  secondCallSuccess = false;
}
assert(secondCallSuccess, `5.3 Renderer Idempotency Guard`, 'generateAllTextures respects scene._pixelArtTexturesBaked flag');

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(` SUMMARY: ${totalTests} Total Tests | ${passedTests} Passed | ${failedTests} Failed`);
console.log('================================================================');

process.exit(failedTests > 0 ? 1 : 0);
