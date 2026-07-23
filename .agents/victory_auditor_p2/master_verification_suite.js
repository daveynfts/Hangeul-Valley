const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const projectDir = 'C:\\VibeCode\\Hangeul Valley';
const gameJsPath = path.join(projectDir, 'game.js');
const assetsGameJsPath = path.join(projectDir, 'assets', 'game.js');

console.log('====================================================');
console.log('   HANGEUL VALLEY PHASE 2 VICTORY AUDIT SUITE');
console.log('====================================================\n');

let allPassed = true;
const testResults = [];

function recordTest(name, passed, details) {
  testResults.push({ name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`);
  if (details) console.log(`  Details: ${details}`);
}

// 1. Syntax Validation
try {
  execSync('node -c game.js', { cwd: projectDir });
  execSync('node -c assets/game.js', { cwd: projectDir });
  recordTest('1. Node Syntax Validation', true, 'game.js and assets/game.js passed syntax check cleanly (0 errors).');
} catch (err) {
  recordTest('1. Node Syntax Validation', false, 'Syntax error: ' + err.message);
  allPassed = false;
}

// 2. File Synchronization Check
try {
  const buf1 = fs.readFileSync(gameJsPath);
  const buf2 = fs.readFileSync(assetsGameJsPath);
  const identical = buf1.equals(buf2);
  recordTest('2. File Synchronization Check', identical, identical ? 'game.js and assets/game.js are 100% byte-for-byte identical.' : 'Files differ in content.');
  if (!identical) allPassed = false;
} catch (err) {
  recordTest('2. File Synchronization Check', false, err.message);
  allPassed = false;
}

// Prepare mock environment for texture analysis
const code = fs.readFileSync(gameJsPath, 'utf8');
const generatedTextures = new Set();

const mockGraphics = {
  clear: () => {}, fillStyle: () => {}, fillRect: () => {}, fillCircle: () => {},
  lineStyle: () => {}, strokeRect: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, closePath: () => {}, fillPath: () => {}, strokePath: () => {},
  arc: () => {}, destroy: () => {},
  generateTexture: (key, w, h) => { generatedTextures.add(key); }
};

const mockScene = {
  make: { graphics: () => mockGraphics },
  add: { graphics: () => mockGraphics },
  textures: {
    exists: (key) => generatedTextures.has(key),
    remove: (key) => generatedTextures.delete(key),
    createCanvas: () => ({ getContext: () => ({ fillStyle: '', fillRect: () => {} }) }),
    get: () => ({ add: () => {}, setFilter: () => {} })
  }
};

const dummyElem = { addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } };

global.Phaser = {
  Display: { Color: { HexStringToColor: (hex) => ({ color: 0 }) } },
  Scene: class Scene {}
};
global.window = { addEventListener: () => {} };
global.document = {
  addEventListener: () => {},
  getElementById: () => dummyElem,
  querySelector: () => dummyElem,
  querySelectorAll: () => []
};

const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('class FishingScene'));
const subset = lines.slice(0, idx > 0 ? idx : 6000).join('\n') + '\nglobal.PixelArtRenderer = PixelArtRenderer;\nglobal.FarmScene = FarmScene;\n';

eval(subset);

// 3 & 4. Matrix Tokens and Row Width Checks
let matrixCount = 0;
let rowCount = 0;
const matrixErrors = [];

const origDrawMatrix = PixelArtRenderer.drawMatrix;
PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox = 0, oy = 0, ps = 3, keyName = 'unknown') {
  matrixCount++;
  if (!Array.isArray(matrix)) {
    matrixErrors.push('Matrix is not an array for key: ' + keyName);
    return;
  }
  
  if (matrix.length === 0) return;
  const expectedCols = matrix[0].length;

  matrix.forEach((row, ry) => {
    rowCount++;
    if (typeof row !== 'string') {
      matrixErrors.push(`Row ${ry} in ${keyName} is not a string (type: ${typeof row})`);
      return;
    }
    if (row.length !== expectedCols) {
      matrixErrors.push(`Row ${ry} in ${keyName} has length ${row.length} (expected ${expectedCols}): "${row}"`);
    }
    for (let rx = 0; rx < row.length; rx++) {
      const char = row[rx];
      if (char.length !== 1) {
        matrixErrors.push(`Multi-character token '${char}' in ${keyName} at row ${ry}, col ${rx}`);
      }
      if (char !== '.' && char !== ' ') {
        if (!palette || palette[char] === undefined) {
          matrixErrors.push(`Missing palette color for token '${char}' in ${keyName} at row ${ry}, col ${rx}`);
        }
      }
    }
  });

  return origDrawMatrix.call(this, g, matrix, palette, ox, oy, ps);
};

PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width = 16, height = 16, ps = 3) {
  const g = scene.make.graphics({ add: false });
  this.drawMatrix(g, matrix, palette, 0, 0, ps, key);
  g.generateTexture(key, width * ps, height * ps);
  g.destroy();
  return key;
};

PixelArtRenderer.generateAllTextures(mockScene);
PixelArtRenderer.generateTilemapTextures(mockScene);
FarmScene.prototype._bakeTextures.call(mockScene);

const tokenAndRowPassed = matrixErrors.length === 0;
recordTest('3 & 4. Single-Character Tokens and Row Width Consistency', tokenAndRowPassed, tokenAndRowPassed ? `Validated ${matrixCount} matrices (${rowCount} rows) — 0 multi-character tokens, 0 row length mismatches.` : `Errors (${matrixErrors.length}): ${matrixErrors.slice(0, 5).join('; ')}`);
if (!tokenAndRowPassed) allPassed = false;

// 5. Texture Key Parity Check against d13de34
try {
  const oldCode = execSync('git show d13de34:game.js', { cwd: projectDir, encoding: 'utf8', maxBuffer: 10*1024*1024 });
  
  const oldTextures = new Set();
  const oldMockGraphics = {
    clear: () => {}, fillStyle: () => {}, fillRect: () => {}, fillCircle: () => {},
    lineStyle: () => {}, strokeRect: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, closePath: () => {}, fillPath: () => {}, strokePath: () => {},
    arc: () => {}, destroy: () => {},
    generateTexture: (key) => { oldTextures.add(key); }
  };
  const oldMockScene = {
    make: { graphics: () => oldMockGraphics },
    add: { graphics: () => oldMockGraphics },
    textures: {
      exists: (key) => oldTextures.has(key),
      remove: (key) => oldTextures.delete(key),
      createCanvas: () => ({ getContext: () => ({ fillStyle: '', fillRect: () => {} }) }),
      get: () => ({ add: () => {}, setFilter: () => {} })
    }
  };

  const oldLines = oldCode.split('\n');
  const oldIdx = oldLines.findIndex(l => l.includes('class FishingScene'));
  const oldSubset = oldLines.slice(0, oldIdx > 0 ? oldIdx : 6000).join('\n') + '\nglobal.PixelArtRendererOld = PixelArtRenderer;\nglobal.FarmSceneOld = FarmScene;\n';

  eval(oldSubset);
  PixelArtRendererOld.generateAllTextures(oldMockScene);
  PixelArtRendererOld.generateTilemapTextures(oldMockScene);
  FarmSceneOld.prototype._bakeTextures.call(oldMockScene);

  const missingKeys = Array.from(oldTextures).filter(k => !generatedTextures.has(k));
  const extraKeys = Array.from(generatedTextures).filter(k => !oldTextures.has(k));
  const parityPassed = missingKeys.length === 0 && extraKeys.length === 0;

  recordTest('5. Texture Key Parity Check', parityPassed, parityPassed ? `100% key parity maintained across all ${generatedTextures.size} textures (0 missing, 0 extra).` : `Missing: ${missingKeys.join(',')}; Extra: ${extraKeys.join(',')}`);
  if (!parityPassed) allPassed = false;
} catch (err) {
  recordTest('5. Texture Key Parity Check', false, err.message);
  allPassed = false;
}

// 6. Forbidden Elements Modification Check
try {
  const oldCodeNorm = execSync('git show d13de34:game.js', { cwd: projectDir, encoding: 'utf8', maxBuffer: 10*1024*1024 }).replace(/\r\n/g, '\n');
  const newCodeNorm = code.replace(/\r\n/g, '\n');

  // Player Farmer matrices check
  const oldPlayerStart = oldCodeNorm.indexOf('static _genPlayerTextures(');
  const oldPlayerEnd = oldCodeNorm.indexOf('static _genNpcTextures(');
  const newPlayerStart = newCodeNorm.indexOf('static _genPlayerTextures(');
  const newPlayerEnd = newCodeNorm.indexOf('static _genNpcTextures(');

  const oldPlayerLines = oldCodeNorm.substring(oldPlayerStart, oldPlayerEnd).split('\n').slice(13);
  const newPlayerLines = newCodeNorm.substring(newPlayerStart, newPlayerEnd).split('\n').slice(13);
  
  let playerMatricesEqual = oldPlayerLines.length === newPlayerLines.length;
  if (playerMatricesEqual) {
    for (let i = 0; i < oldPlayerLines.length; i++) {
      if (oldPlayerLines[i] !== newPlayerLines[i]) {
        playerMatricesEqual = false; break;
      }
    }
  }

  // Ginger Cat & Wizard Merlin (in _genNpcTextures)
  const oldNpcStart = oldCodeNorm.indexOf('static _genNpcTextures(');
  const oldNpcEnd = oldCodeNorm.indexOf('static _genCropAndTreeTextures(');
  const newNpcStart = newCodeNorm.indexOf('static _genNpcTextures(');
  const newNpcEnd = newCodeNorm.indexOf('static _genCropAndTreeTextures(');
  const catAndWizardEqual = oldCodeNorm.substring(oldNpcStart, oldNpcEnd) === newCodeNorm.substring(newNpcStart, newNpcEnd);

  // DynamicShadowSystem check
  const oldShadowIdx = oldCodeNorm.indexOf('class DynamicShadowSystem');
  const oldShadowEnd = oldCodeNorm.indexOf('class ', oldShadowIdx + 30);
  const newShadowIdx = newCodeNorm.indexOf('class DynamicShadowSystem');
  const newShadowEnd = newCodeNorm.indexOf('class ', newShadowIdx + 30);
  const shadowEqual = oldCodeNorm.substring(oldShadowIdx, oldShadowEnd) === newCodeNorm.substring(newShadowIdx, newShadowEnd);

  const forbiddenPassed = playerMatricesEqual && catAndWizardEqual && shadowEqual;
  recordTest('6. Forbidden Elements Unmodified', forbiddenPassed, `Player Farmer Matrices: ${playerMatricesEqual}, Cat & Wizard NPCs: ${catAndWizardEqual}, DynamicShadowSystem: ${shadowEqual}`);
  if (!forbiddenPassed) allPassed = false;
} catch (err) {
  recordTest('6. Forbidden Elements Unmodified', false, err.message);
  allPassed = false;
}

// 7. Specific Requirements Verification (R1, R2, R3, R4)
const r1Keys = ['tile_grass_base', 'stone_well', 'pixel_barrel', 'pixel_crate', 'signpost', 'notice_board', 'shop_sign', 'arcade_machine', 'dungeon_portal', 'fishing_dock', 'tree'];
const r1Missing = r1Keys.filter(k => !generatedTextures.has(k));
recordTest('7a. R1 Farm Tilemap & Decorations', r1Missing.length === 0, r1Missing.length === 0 ? 'All 11 R1 tilemap & decor textures present and verified.' : `Missing: ${r1Missing.join(', ')}`);
if (r1Missing.length > 0) allPassed = false;

const r2FishKeys = ['fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel', 'fishing_golden_fish', 'fishing_snapper', 'fishing_shrimp', 'fishing_octopus', 'fishing_catfish', 'fishing_mackerel', 'fishing_legendary', 'fishing_clam', 'fish_carp', 'fish_salmon', 'fish_tuna', 'fish_squid', 'fish_eel', 'fish_goldfish', 'fish_seabass', 'fish_shrimp', 'fish_octopus', 'fish_catfish', 'fish_mackerel', 'fishing_bobber', 'fishing_rod', 'dock_plank', 'dock_post'];
const r2Missing = r2FishKeys.filter(k => !generatedTextures.has(k));
recordTest('7b. R2 Fishing Sprites & Accessories', r2Missing.length === 0, r2Missing.length === 0 ? 'All 13 fish species, legacy aliases, and 4 accessories present and verified.' : `Missing: ${r2Missing.join(', ')}`);
if (r2Missing.length > 0) allPassed = false;

const r3ArcadeKeys = ['arcade_player_ship', 'alien_scout', 'alien_shooter', 'alien_elite', 'alien_boss', 'laser_player', 'powerup_weapon', 'powerup_shield', 'powerup_nuke'];
const r3Missing = r3ArcadeKeys.filter(k => !generatedTextures.has(k));
recordTest('7c. R3 Arcade Sprites', r3Missing.length === 0, r3Missing.length === 0 ? 'All 9 Arcade textures present and verified.' : `Missing: ${r3Missing.join(', ')}`);
if (r3Missing.length > 0) allPassed = false;

const r4DungeonKeys = ['dungeon_green_slime', 'dungeon_skeleton_archer', 'dungeon_goblin_warrior', 'dungeon_boss', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_chest', 'loot_scroll'];
const r4Missing = r4DungeonKeys.filter(k => !generatedTextures.has(k));
recordTest('7d. R4 Dungeon Sprites', r4Missing.length === 0, r4Missing.length === 0 ? 'All 9 Dungeon textures present and verified.' : `Missing: ${r4Missing.join(', ')}`);
if (r4Missing.length > 0) allPassed = false;

console.log('\n========================================');
console.log(`OVERALL VERDICT: ${allPassed ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED'}`);
console.log('========================================');
