const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');
const gamePath = path.join(rootDir, 'game.js');
const assetsGamePath = path.join(rootDir, 'assets', 'game.js');

console.log('====================================================');
console.log('EMPIRICAL CHALLENGER VERIFICATION HARNESS - MILESTONE 1');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// 1. Syntax Validation
console.log('--- Step 1: Syntax Validation ---');
try {
  execSync(`node -c "${gamePath}"`, { stdio: 'pipe' });
  assert(true, 'node -c game.js passed with 0 errors');
} catch (e) {
  assert(false, `node -c game.js failed: ${e.message}`);
}

try {
  execSync(`node -c "${assetsGamePath}"`, { stdio: 'pipe' });
  assert(true, 'node -c assets/game.js passed with 0 errors');
} catch (e) {
  assert(false, `node -c assets/game.js failed: ${e.message}`);
}

// 2. SHA256 Checksum Equality
console.log('\n--- Step 2: Checksum Verification ---');
const gameBuf = fs.readFileSync(gamePath);
const assetsBuf = fs.readFileSync(assetsGamePath);
const gameHash = crypto.createHash('sha256').update(gameBuf).digest('hex');
const assetsHash = crypto.createHash('sha256').update(assetsBuf).digest('hex');

console.log(`game.js SHA256:        ${gameHash}`);
console.log(`assets/game.js SHA256: ${assetsHash}`);
assert(gameHash === assetsHash, 'game.js and assets/game.js SHA256 checksums are identical');
assert(gameBuf.length === assetsBuf.length, `Byte lengths match (${gameBuf.length} bytes)`);

// 3. Matrix & Key Parsing via VM Execution of _genPlayerTextures
console.log('\n--- Step 3: Parsing _genPlayerTextures in game.js ---');

const gameCode = gameBuf.toString('utf8');

// Find start of _genPlayerTextures and end of method
const startIdx = gameCode.indexOf('static _genPlayerTextures(scene) {');
const endIdx = gameCode.indexOf('static _genNpcTextures(scene) {');

if (startIdx === -1 || endIdx === -1) {
  console.error('[FAIL] Could not locate _genPlayerTextures method block bounds');
  process.exit(1);
}

const methodCode = gameCode.substring(startIdx, endIdx).trim();

// Context for VM execution
const texturesCreated = {};
const animsCreated = [];

const mockScene = {
  anims: {
    exists: (key) => false,
    create: (config) => {
      animsCreated.push(config);
    }
  }
};

const mockContext = {
  texturesCreated,
  mockScene,
  console: console
};

const scriptCode = `
class MockRenderer {
  static createTexture(scene, key, matrix, P) {
    texturesCreated[key] = { matrix, palette: P };
  }
  ${methodCode}
}
MockRenderer._genPlayerTextures(mockScene);
`;

try {
  vm.runInNewContext(scriptCode, mockContext);
  assert(true, '_genPlayerTextures executed successfully in VM sandbox');
} catch (err) {
  assert(false, `Error running _genPlayerTextures in VM: ${err.stack}`);
}

// 4. Validate Matrix Dimensions & Palette Tokens
console.log('\n--- Step 4: Sprite Matrix Dimension & Palette Verification ---');

const required24Keys = [
  'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
  'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
  'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
  'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
  'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
  'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
  'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
  'tool_watering_can', 'tool_basket', 'tool_sickle'
];

const legacyAliases = ['farmer0', 'farmer1', 'farmer2', 'farmer3'];

console.log(`Total textures registered in _genPlayerTextures: ${Object.keys(texturesCreated).length}`);

let allMatrices16x16 = true;
let invalidTokensTotal = 0;
const matrixDetail = {};

for (const [key, data] of Object.entries(texturesCreated)) {
  const matrix = data.matrix;
  const palette = data.palette;
  
  if (!Array.isArray(matrix)) {
    console.error(`[FAIL] Key ${key} matrix is not an array`);
    allMatrices16x16 = false;
    continue;
  }

  if (matrix.length !== 16) {
    console.error(`[FAIL] Key ${key} matrix height is ${matrix.length}, expected 16`);
    allMatrices16x16 = false;
  }

  let rowLengthOk = true;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (typeof row !== 'string' || row.length !== 16) {
      console.error(`[FAIL] Key ${key} row ${r} length is ${row ? row.length : 0}, expected 16`);
      rowLengthOk = false;
      allMatrices16x16 = false;
    }
    // Check palette tokens
    if (row && palette) {
      for (let c = 0; c < row.length; c++) {
        const char = row[c];
        if (!(char in palette)) {
          console.error(`[FAIL] Key ${key} row ${r} col ${c} unknown token '${char}'`);
          invalidTokensTotal++;
        }
      }
    }
  }

  matrixDetail[key] = {
    rows: matrix.length,
    cols: matrix[0] ? matrix[0].length : 0,
    valid: matrix.length === 16 && rowLengthOk
  };
}

assert(allMatrices16x16, 'Every single sprite matrix is exactly 16 lines of 16 characters each (16x16 grid)');
assert(invalidTokensTotal === 0, `All matrix characters correspond to valid palette tokens (0 invalid)`);

// 5. Verify Presence of Required 24 Player Texture Keys & 4 Legacy Aliases
console.log('\n--- Step 5: Texture Keys Registration Verification ---');

let missing24Keys = 0;
for (const key of required24Keys) {
  if (key in texturesCreated) {
    // console.log(`  [OK] ${key}`);
  } else {
    console.error(`  [MISSING] ${key}`);
    missing24Keys++;
  }
}
assert(missing24Keys === 0, `All 24 required player texture keys are present and registered`);

let missingAliases = 0;
for (const alias of legacyAliases) {
  if (alias in texturesCreated) {
    // console.log(`  [OK] ${alias}`);
  } else {
    console.error(`  [MISSING] ${alias}`);
    missingAliases++;
  }
}
assert(missingAliases === 0, `All 4 legacy alias keys (farmer0..3) are present and registered`);

// 6. Verify Animation Registrations
console.log('\n--- Step 6: Phaser Animation Sequence Verification ---');
const expectedAnims = [
  { key: 'player-walk-down', repeat: -1, frames: ['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2'] },
  { key: 'player-walk-up', repeat: -1, frames: ['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2'] },
  { key: 'player-walk-left', repeat: -1, frames: ['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2'] },
  { key: 'player-walk-right', repeat: -1, frames: ['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2'] },
  { key: 'player-water', repeat: 0, frames: ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1'] },
  { key: 'player-harvest', repeat: 0, frames: ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2'] },
  { key: 'player-pick', repeat: 0, frames: ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2'] }
];

let animsOk = true;
for (const exp of expectedAnims) {
  const found = animsCreated.find(a => a.key === exp.key);
  if (!found) {
    console.error(`[FAIL] Animation ${exp.key} not registered`);
    animsOk = false;
    continue;
  }
  const framesList = found.frames.map(f => f.key);
  if (JSON.stringify(framesList) !== JSON.stringify(exp.frames)) {
    console.error(`[FAIL] Animation ${exp.key} frames mismatch. Expected ${JSON.stringify(exp.frames)}, got ${JSON.stringify(framesList)}`);
    animsOk = false;
  }
  if (found.repeat !== exp.repeat) {
    console.error(`[FAIL] Animation ${exp.key} repeat mismatch. Expected ${exp.repeat}, got ${found.repeat}`);
    animsOk = false;
  }
}
assert(animsOk, 'All 7 animation sequences (walk down/up/left/right, water, harvest, pick) are correctly registered');

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`VERDICT: ${failCount === 0 ? 'PASS' : 'FAIL'}`);
console.log('====================================================');

process.exit(failCount === 0 ? 0 : 1);
