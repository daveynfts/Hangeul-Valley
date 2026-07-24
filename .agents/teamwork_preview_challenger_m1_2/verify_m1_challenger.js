/**
 * Empirical Challenger Verification Harness for Milestone 1
 * Industrial Yellow Farmer Pixel Robot Replacement & Integration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const PROJECT_ROOT = 'd:\\Hangeul Valley';
const GAME_JS_PATH = path.join(PROJECT_ROOT, 'game.js');
const ASSETS_GAME_JS_PATH = path.join(PROJECT_ROOT, 'assets', 'game.js');

console.log('===========================================================');
console.log('CHALLENGER 2 VERIFICATION HARNESS - MILESTONE 1');
console.log('===========================================================');

let passAll = true;

// 1. File & Syntax Check
console.log('\n--- 1. File Synchronization & Syntax Check ---');
if (!fs.existsSync(GAME_JS_PATH)) {
  console.error(`[FAIL] game.js not found at ${GAME_JS_PATH}`);
  passAll = false;
}
if (!fs.existsSync(ASSETS_GAME_JS_PATH)) {
  console.error(`[FAIL] assets/game.js not found at ${ASSETS_GAME_JS_PATH}`);
  passAll = false;
}

const gameJsContent = fs.readFileSync(GAME_JS_PATH, 'utf8');
const assetsGameJsContent = fs.readFileSync(ASSETS_GAME_JS_PATH, 'utf8');

const hashGame = crypto.createHash('sha256').update(gameJsContent).digest('hex');
const hashAssets = crypto.createHash('sha256').update(assetsGameJsContent).digest('hex');

console.log(`game.js SHA256:        ${hashGame}`);
console.log(`assets/game.js SHA256: ${hashAssets}`);

if (hashGame === hashAssets) {
  console.log('[PASS] game.js and assets/game.js are 100% SHA256 hash identical.');
} else {
  console.error('[FAIL] SHA256 mismatch between game.js and assets/game.js!');
  passAll = false;
}

// 2. Load and Extract Textures & Matrices from game.js
console.log('\n--- 2. Extracting Player Matrices & Palette ---');

const createdTextures = {};
const createdAnims = {};

const mockScene = {
  make: {
    graphics: () => ({
      fillStyle: () => {},
      fillRect: () => {},
      generateTexture: () => {},
      destroy: () => {}
    })
  },
  textures: {
    exists: (key) => false,
    createCanvas: (key, width, height) => ({
      getContext: () => ({
        fillStyle: '',
        fillRect: () => {}
      }),
      refresh: () => {}
    })
  },
  anims: {
    exists: (key) => false,
    create: (config) => {
      createdAnims[config.key] = config;
    }
  }
};

// Evaluate game.js class context to extract PixelArtRenderer
const noop = () => {};
const sandbox = {
  console: console,
  setTimeout: noop,
  clearTimeout: noop,
  setInterval: noop,
  clearInterval: noop,
  localStorage: { getItem: noop, setItem: noop, removeItem: noop, clear: noop },
  module: {},
  exports: {},
  window: {
    addEventListener: noop,
    removeEventListener: noop,
    location: { reload: noop },
    setTimeout: noop,
    clearTimeout: noop
  },
  document: {
    addEventListener: noop,
    removeEventListener: noop,
    getElementById: () => ({ addEventListener: noop, removeEventListener: noop, style: {}, classList: { add: noop, remove: noop, toggle: noop } }),
    createElement: () => ({ getContext: () => null, style: {}, addEventListener: noop, appendChild: noop })
  },
  Phaser: {
    Scene: class {},
    Game: class {},
    AUTO: 0,
    Scale: { RESIZE: 0, CENTER_BOTH: 0 },
    Input: { Keyboard: { KeyCodes: {} } },
    Display: {
      Color: {
        IntegerToColor: (hex) => ({ r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff, a: 255 }),
        GetColor: (r, g, b) => (r << 16) | (g << 8) | b
      }
    },
    Textures: {
      FilterMode: {
        NEAREST: 0,
        LINEAR: 1
      }
    }
  }
};

vm.createContext(sandbox);

// Intercept PixelArtRenderer.createTexture
let capturedPalette = null;
const scriptCode = gameJsContent + `
  // Intercept texture calls
  PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width = 16, height = 16, ps = 3) {
    capturedTextures[key] = { matrix, palette, width, height, ps };
  };
  PixelArtRenderer._genPlayerTextures(mockScene);
`;

sandbox.capturedTextures = createdTextures;
sandbox.mockScene = mockScene;

try {
  vm.runInContext(scriptCode, sandbox);
  console.log(`[PASS] Dynamically executed _genPlayerTextures. Intercepted ${Object.keys(createdTextures).length} textures.`);
} catch (err) {
  console.error('[FAIL] Error executing _genPlayerTextures in vm sandbox:', err);
  passAll = false;
}

// 3. Palette Token Coverage Verification
console.log('\n--- 3. Palette Token Coverage Check ---');
const sampleTexKey = Object.keys(createdTextures)[0];
if (!sampleTexKey) {
  console.error('[FAIL] No textures extracted!');
  process.exit(1);
}

capturedPalette = createdTextures[sampleTexKey].palette;
console.log(`Extracted Palette tokens count: ${Object.keys(capturedPalette).length}`);

// Required hex colors
const requiredTokens = [
  { name: 'Yellow Casing Main (Yellow 400)', hex: 0xFACC15 },
  { name: 'Yellow Casing Mid (Yellow 500)', hex: 0xEAB308 },
  { name: 'Yellow Casing Shadow (Yellow 600)', hex: 0xCA8A04 },
  { name: 'Slate Body Light Base (Slate 400)', hex: 0x94A3B8 },
  { name: 'Slate Body Mid Base (Slate 500)', hex: 0x64748B },
  { name: 'Slate Body Frame (Slate 600)', hex: 0x475569 },
  { name: 'Slate Body Core (Slate 700)', hex: 0x334155 },
  { name: 'Cyan LED Visor Display (Sky 400)', hex: 0x38BDF8 },
  { name: 'Cyan LED Visor Screen (Cyan 500)', hex: 0x06B6D4 },
  { name: 'Cyan LED Visor Shadow (Sky 600)', hex: 0x0284C7 },
  { name: 'Antenna Glow (Orange 500)', hex: 0xF97316 },
  { name: 'Antenna Glow Tip', hex: 0xFFEDD5 },
  { name: '1px Dark Slate Outline (Slate 900)', hex: 0x0F172A }
];

const paletteValues = Object.values(capturedPalette);
let missingRequiredTokens = 0;

for (const req of requiredTokens) {
  const found = paletteValues.includes(req.hex);
  if (found) {
    console.log(`  [PASS] Palette contains ${req.name}: 0x${req.hex.toString(16).toUpperCase()}`);
  } else {
    console.error(`  [FAIL] MISSING Palette token for ${req.name}: 0x${req.hex.toString(16).toUpperCase()}`);
    missingRequiredTokens++;
  }
}

if (missingRequiredTokens > 0) {
  passAll = false;
}

// Check matrix character coverage against palette
let unmappedChars = 0;
for (const [texKey, texData] of Object.entries(createdTextures)) {
  for (let r = 0; r < texData.matrix.length; r++) {
    const rowStr = texData.matrix[r];
    for (let c = 0; c < rowStr.length; c++) {
      const char = rowStr[c];
      if (capturedPalette[char] === undefined) {
        console.error(`  [FAIL] Texture '${texKey}' row ${r} col ${c} uses unmapped char '${char}'`);
        unmappedChars++;
      }
    }
  }
}
if (unmappedChars === 0) {
  console.log('[PASS] All character tokens used in all matrices map to valid entries in palette P.');
} else {
  passAll = false;
}

// 4. Mechanical Tread Step Differences Verification
console.log('\n--- 4. Mechanical Tread Step Differences Verification (Rows 11-15) ---');
const walkDirections = ['down', 'up', 'left', 'right'];
let treadPass = true;

const calculateRowDiffs = (matrixA, matrixB, startRow, endRow) => {
  let diffs = 0;
  const details = [];
  for (let r = startRow; r <= endRow; r++) {
    let rowDiffs = 0;
    const strA = matrixA[r] || '';
    const strB = matrixB[r] || '';
    for (let c = 0; c < Math.max(strA.length, strB.length); c++) {
      if (strA[c] !== strB[c]) {
        diffs++;
        rowDiffs++;
      }
    }
    details.push(`row ${r}: ${rowDiffs} diffs`);
  }
  return { diffs, details };
};

for (const dir of walkDirections) {
  const key0 = `player_walk_${dir}_0`;
  const key1 = `player_walk_${dir}_1`;
  const key2 = `player_walk_${dir}_2`;

  const mat0 = createdTextures[key0]?.matrix;
  const mat1 = createdTextures[key1]?.matrix;
  const mat2 = createdTextures[key2]?.matrix;

  if (!mat0 || !mat1 || !mat2) {
    console.error(`[FAIL] Missing walk matrices for direction ${dir}`);
    treadPass = false;
    passAll = false;
    continue;
  }

  // 0-indexed rows 11..15 (indices 11, 12, 13, 14, 15)
  const diff01_0idx = calculateRowDiffs(mat0, mat1, 11, 15);
  const diff02_0idx = calculateRowDiffs(mat0, mat2, 11, 15);

  // 1-indexed rows 11..15 (indices 10, 11, 12, 13, 14)
  const diff01_1idx = calculateRowDiffs(mat0, mat1, 10, 14);
  const diff02_1idx = calculateRowDiffs(mat0, mat2, 10, 14);

  console.log(`\nDirection: ${dir.toUpperCase()}`);
  console.log(`  [0-indexed 11-15] frame_0 vs frame_1: ${diff01_0idx.diffs} pixel diffs (>= 8 threshold)`);
  console.log(`  [0-indexed 11-15] frame_0 vs frame_2: ${diff02_0idx.diffs} pixel diffs (>= 8 threshold)`);
  console.log(`  [1-indexed 11-15] frame_0 vs frame_1: ${diff01_1idx.diffs} pixel diffs`);
  console.log(`  [1-indexed 11-15] frame_0 vs frame_2: ${diff02_1idx.diffs} pixel diffs`);

  if (diff01_0idx.diffs < 8) {
    console.error(`  [FAIL] ${key0} vs ${key1} has ${diff01_0idx.diffs} diffs (< 8 required)`);
    treadPass = false;
  }
  if (diff02_0idx.diffs < 8) {
    console.error(`  [FAIL] ${key0} vs ${key2} has ${diff02_0idx.diffs} diffs (< 8 required)`);
    treadPass = false;
  }
}

if (treadPass) {
  console.log('\n[PASS] All walk cycle frame pairs meet or exceed the >= 8 pixel tread diff requirement.');
} else {
  passAll = false;
}

// 5. Mechanical Head / Torso Bobbing Dynamics Verification
console.log('\n--- 5. Mechanical Head / Torso Bobbing Dynamics Verification ---');

// Function to find top non-empty row (first row containing non-'.' pixel) and visor/eye row
const getFrameProfile = (matrix) => {
  let topRow = -1;
  let antennaRow = -1;
  let headTopRow = -1;
  let visorRow = -1;

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (topRow === -1 && row.replace(/\./g, '').length > 0) {
      topRow = r;
    }
    if (row.includes('O') || row.includes('o') || row.includes('R')) {
      if (antennaRow === -1) antennaRow = r;
    }
    if (row.includes('V') || row.includes('v') || row.includes('L') || row.includes('W')) {
      if (visorRow === -1) visorRow = r;
    }
  }

  return { topRow, antennaRow, visorRow };
};

let bobbingPass = true;
for (const dir of walkDirections) {
  const key0 = `player_walk_${dir}_0`;
  const key1 = `player_walk_${dir}_1`;
  const key2 = `player_walk_${dir}_2`;

  const prof0 = getFrameProfile(createdTextures[key0].matrix);
  const prof1 = getFrameProfile(createdTextures[key1].matrix);
  const prof2 = getFrameProfile(createdTextures[key2].matrix);

  console.log(`\nDirection: ${dir.toUpperCase()}`);
  console.log(`  frame_0: topRow=${prof0.topRow}, antennaRow=${prof0.antennaRow}, visorRow=${prof0.visorRow}`);
  console.log(`  frame_1: topRow=${prof1.topRow}, antennaRow=${prof1.antennaRow}, visorRow=${prof1.visorRow}`);
  console.log(`  frame_2: topRow=${prof2.topRow}, antennaRow=${prof2.antennaRow}, visorRow=${prof2.visorRow}`);

  const shift01 = prof1.topRow - prof0.topRow;
  const shift02 = prof2.topRow - prof0.topRow;

  console.log(`  Vertical Shift (frame_0 -> frame_1): ${shift01} px`);
  console.log(`  Vertical Shift (frame_0 -> frame_2): ${shift02} px`);

  if (Math.abs(shift01) > 0 || Math.abs(shift02) > 0) {
    console.log(`  [PASS] Dynamic bobbing detected between rest frame and step frames for ${dir}.`);
  } else {
    // Check if inner head or torso elements shifted
    const diff01_full = calculateRowDiffs(createdTextures[key0].matrix, createdTextures[key1].matrix, 0, 10);
    const diff02_full = calculateRowDiffs(createdTextures[key0].matrix, createdTextures[key2].matrix, 0, 10);
    if (diff01_full.diffs > 0 || diff02_full.diffs > 0) {
      console.log(`  [PASS] Upper body pixel offset detected (head/torso diffs frame_0 vs frame_1: ${diff01_full.diffs}, frame_0 vs frame_2: ${diff02_full.diffs}).`);
    } else {
      console.error(`  [FAIL] No bobbing or upper body shift detected for direction ${dir}!`);
      bobbingPass = false;
    }
  }
}

if (bobbingPass) {
  console.log('\n[PASS] Mechanical head/torso bobbing dynamics verified for all 4 walk cycles.');
} else {
  passAll = false;
}

// 6. Action Frames, Tools & Legacy Aliases Check
console.log('\n--- 6. Action Frames, Tools & Legacy Aliases Check ---');

const expectedActionFrames = [
  'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
  'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
  'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2'
];

const expectedTools = ['tool_watering_can', 'tool_basket', 'tool_sickle'];
const expectedAliases = ['farmer0', 'farmer1', 'farmer2', 'farmer3'];

let structPass = true;
for (const key of expectedActionFrames) {
  if (createdTextures[key]) {
    console.log(`  [PASS] Action frame '${key}' registered.`);
  } else {
    console.error(`  [FAIL] Action frame '${key}' MISSING!`);
    structPass = false;
  }
}

for (const key of expectedTools) {
  if (createdTextures[key]) {
    console.log(`  [PASS] Tool matrix '${key}' registered.`);
  } else {
    console.error(`  [FAIL] Tool matrix '${key}' MISSING!`);
    structPass = false;
  }
}

for (const key of expectedAliases) {
  if (createdTextures[key]) {
    console.log(`  [PASS] Legacy alias '${key}' registered.`);
  } else {
    console.error(`  [FAIL] Legacy alias '${key}' MISSING!`);
    structPass = false;
  }
}

// 7. Matrix Dimension Compliance & Animation Registrations
console.log('\n--- 7. Matrix Dimension Compliance & Animation Registrations ---');
let dimPass = true;
for (const [key, data] of Object.entries(createdTextures)) {
  if (data.matrix.length !== 16) {
    console.error(`  [FAIL] Texture '${key}' has ${data.matrix.length} rows (expected 16)`);
    dimPass = false;
  }
  for (let r = 0; r < data.matrix.length; r++) {
    if (data.matrix[r].length !== 16) {
      console.error(`  [FAIL] Texture '${key}' row ${r} has length ${data.matrix[r].length} (expected 16)`);
      dimPass = false;
    }
  }
}
if (dimPass) {
  console.log('[PASS] All 28 texture matrices are strictly 16x16 pixel grids.');
} else {
  structPass = false;
}

// Check animation registrations
const expectedAnims = [
  { key: 'player-walk-down', repeat: -1, frames: ['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2'] },
  { key: 'player-walk-up', repeat: -1, frames: ['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2'] },
  { key: 'player-walk-left', repeat: -1, frames: ['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2'] },
  { key: 'player-walk-right', repeat: -1, frames: ['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2'] },
  { key: 'player-water', repeat: 0, frames: ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1'] },
  { key: 'player-harvest', repeat: 0, frames: ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2'] },
  { key: 'player-pick', repeat: 0, frames: ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2'] }
];

let animPass = true;
for (const exp of expectedAnims) {
  const animConfig = createdAnims[exp.key];
  if (!animConfig) {
    console.error(`  [FAIL] Animation '${exp.key}' not registered!`);
    animPass = false;
  } else {
    const frameKeys = animConfig.frames.map(f => f.key);
    if (animConfig.repeat !== exp.repeat || JSON.stringify(frameKeys) !== JSON.stringify(exp.frames)) {
      console.error(`  [FAIL] Animation '${exp.key}' mismatch! Expected repeat=${exp.repeat}, frames=${JSON.stringify(exp.frames)}, got repeat=${animConfig.repeat}, frames=${JSON.stringify(frameKeys)}`);
      animPass = false;
    } else {
      console.log(`  [PASS] Animation '${exp.key}' verified (repeat=${animConfig.repeat}, frames=${frameKeys.join(', ')}).`);
    }
  }
}

if (!structPass || !animPass) passAll = false;

// Final Verdict
console.log('\n===========================================================');
if (passAll) {
  console.log('FINAL VERDICT: PASS');
  console.log('All empirical verification harness tests passed cleanly!');
} else {
  console.log('FINAL VERDICT: FAIL');
  console.log('One or more verification checks failed.');
}
console.log('===========================================================');

process.exit(passAll ? 0 : 1);
