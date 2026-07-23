const fs = require('fs');

console.log("=================================================");
console.log("  MILESTONE M2 FORENSIC INTEGRITY AUDIT SUITE");
console.log("=================================================\n");

const fileContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Mock Phaser Scene and Graphics engine
class MockGraphics {
  constructor() {
    this.operations = [];
  }
  fillStyle(color, alpha) {
    this.operations.push({ op: 'fillStyle', color, alpha });
  }
  fillRect(x, y, w, h) {
    this.operations.push({ op: 'fillRect', x, y, w, h });
  }
  generateTexture(key, width, height) {
    this.generated = { key, width, height };
  }
  destroy() {
    this.destroyed = true;
  }
}

class MockTextureManager {
  constructor() {
    this.textures = new Map();
  }
  exists(key) {
    return this.textures.has(key);
  }
  remove(key) {
    this.textures.delete(key);
  }
  get(key) {
    return {
      setFilter: (mode) => {}
    };
  }
}

const mockScene = {
  make: {
    graphics: (opts) => new MockGraphics()
  },
  textures: new MockTextureManager()
};

// We will extract and execute the functions using VM context or by extracting the static methods from game.js
// Let's create an isolated execution scope for PixelArtRenderer
const vm = require('vm');

const context = {
  console: console,
  Phaser: { Textures: { FilterMode: { NEAREST: 1 } } }
};
vm.createContext(context);

// Evaluate PixelArtRenderer from game.js
// We extract lines containing PixelArtRenderer class definition
const classStartIndex = fileContent.indexOf('class PixelArtRenderer {');
const classEndIndex = fileContent.indexOf('\nconst K = {', classStartIndex);
const pixelArtRendererCode = fileContent.substring(classStartIndex, classEndIndex);

vm.runInContext(pixelArtRendererCode, context);
const PixelArtRenderer = context.PixelArtRenderer;

console.log("[VM EVALUATION] PixelArtRenderer successfully loaded into VM.");

// 1. Test _genArcadeTextures execution
console.log("\n--- Testing PixelArtRenderer._genArcadeTextures(scene) ---");
let arcadeSuccess = false;
try {
  PixelArtRenderer._genArcadeTextures(mockScene);
  console.log("PASS: _genArcadeTextures executed without errors.");
  arcadeSuccess = true;
} catch (err) {
  console.error("FAIL: _genArcadeTextures threw error:", err);
}

// 2. Test _genDungeonTextures execution
console.log("\n--- Testing PixelArtRenderer._genDungeonTextures(scene) ---");
let dungeonSuccess = false;
try {
  PixelArtRenderer._genDungeonTextures(mockScene);
  console.log("PASS: _genDungeonTextures executed without errors.");
  dungeonSuccess = true;
} catch (err) {
  console.error("FAIL: _genDungeonTextures threw error:", err);
}

// 3. Inspect registered textures in MockTextureManager
console.log("\n--- Registered Textures Verification ---");
const expectedArcadeKeys = [
  'arcade_player_ship', 'alien_scout', 'alien_shooter', 'alien_elite',
  'alien_boss', 'laser_player', 'powerup_weapon', 'powerup_shield', 'powerup_nuke'
];

const expectedDungeonKeys = [
  'dungeon_green_slime', 'dungeon_skeleton_archer', 'dungeon_goblin_warrior',
  'dungeon_boss', 'loot_chest', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_scroll'
];

// Let's inspect each method directly to extract matrix arrays and palettes for deeper matrix auditing!
console.log("\n=================================================");
console.log("  DETAILED MATRIX & PALETTE FORENSIC ANALYSIS");
console.log("=================================================\n");

// Regex to capture matrices and palettes defined inside game.js
// We will parse all matrix arrays and palette objects defined in _genArcadeTextures and _genDungeonTextures
const matrixDefs = [];

// Helper to extract matrix and palette pairs by variable names
const varPairs = [
  // Arcade
  { key: 'arcade_player_ship', paletteVar: 'P_SHIP', matrixVar: 'ship' },
  { key: 'alien_scout', paletteVar: 'P_SCOUT', matrixVar: 'scout' },
  { key: 'alien_shooter', paletteVar: 'P_SHOOTER', matrixVar: 'shooter' },
  { key: 'alien_elite', paletteVar: 'P_ELITE', matrixVar: 'elite' },
  { key: 'alien_boss', paletteVar: 'P_BOSS', matrixVar: 'boss' },
  { key: 'laser_player', paletteVar: 'P_LASER', matrixVar: 'laser' },
  { key: 'powerup_weapon', paletteVar: 'P_PW_WEAPON', matrixVar: 'pw_weapon' },
  { key: 'powerup_shield', paletteVar: 'P_PW_SHIELD', matrixVar: 'pw_shield' },
  { key: 'powerup_nuke', paletteVar: 'P_PW_NUKE', matrixVar: 'pw_nuke' },
  // Dungeon
  { key: 'dungeon_green_slime', paletteVar: 'P_SLIME', matrixVar: 'slime' },
  { key: 'dungeon_skeleton_archer', paletteVar: 'P_SKELETON', matrixVar: 'skeleton' },
  { key: 'dungeon_goblin_warrior', paletteVar: 'P_GOBLIN', matrixVar: 'goblin' },
  { key: 'dungeon_boss', paletteVar: 'P_DUNGEON_BOSS', matrixVar: 'boss' },
  { key: 'loot_chest', paletteVar: 'P_CHEST', matrixVar: 'chest' },
  { key: 'loot_coin', paletteVar: 'P_COIN', matrixVar: 'coin' },
  { key: 'loot_gem', paletteVar: 'P_GEM', matrixVar: 'gem' },
  { key: 'loot_potion', paletteVar: 'P_POTION', matrixVar: 'potion' },
  { key: 'loot_scroll', paletteVar: 'P_SCROLL', matrixVar: 'scroll' },
];

// Let's execute an extraction script inside VM to inspect the actual runtime values of matrices and palettes!
const extractScript = `
  const results = {};
  // Save methods to test internal variables
  // We can re-run individual generation and capture arguments to createTexture
  const captured = {};
  const testScene = {
    make: { graphics: () => ({ fillStyle:()=>{}, fillRect:()=>{}, generateTexture:()=>{}, destroy:()=>{} }) },
    textures: { exists: ()=>false, remove: ()=>{}, get: ()=>({ setFilter: ()=>{} }) }
  };
  
  const origCreate = PixelArtRenderer.createTexture;
  PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width, height, ps) {
    captured[key] = { matrix, palette, width, height, ps };
    return origCreate.call(this, scene, key, matrix, palette, width, height, ps);
  };
  
  PixelArtRenderer._genArcadeTextures(testScene);
  PixelArtRenderer._genDungeonTextures(testScene);
  captured;
`;

const capturedData = vm.runInContext(extractScript, context);

let totalViolations = 0;

Object.keys(capturedData).forEach(key => {
  const data = capturedData[key];
  const { matrix, palette } = data;
  console.log(`=== SPRITE: '${key}' ===`);
  
  // 1. Matrix rows count
  const numRows = matrix.length;
  console.log(`  - Row count: ${numRows} (Expected: 16)`);
  if (numRows !== 16) {
    console.error(`  [VIOLATION] Row count is ${numRows}, expected 16!`);
    totalViolations++;
  }

  // 2. Matrix row widths
  let invalidRows = 0;
  matrix.forEach((row, idx) => {
    if (row.length !== 16) {
      console.error(`  [VIOLATION] Row ${idx} length is ${row.length}, expected 16!`);
      invalidRows++;
    }
  });
  if (invalidRows === 0) {
    console.log(`  - Row widths: ALL 16 rows have EXACTLY 16 characters (PASS)`);
  } else {
    totalViolations += invalidRows;
  }

  // 3. Palette tokens & dark slate outline check
  const paletteKeys = Object.keys(palette);
  console.log(`  - Palette colors count: ${paletteKeys.length - 1} (excluding '.')`);
  const hasDarkSlate = palette['K'] === 0x0F172A;
  console.log(`  - Dark slate outline ('K' = 0x0F172A): ${hasDarkSlate ? 'YES' : 'NO'}`);
  if (!hasDarkSlate) {
    console.error(`  [VIOLATION] Missing or incorrect dark slate outline 'K'=0x0F172A`);
    totalViolations++;
  }

  // 4. Token validation in matrix
  let unmappedTokens = 0;
  const tokenCounts = {};
  matrix.forEach(row => {
    for (let char of row) {
      tokenCounts[char] = (tokenCounts[char] || 0) + 1;
      if (char !== '.' && palette[char] === undefined) {
        console.error(`  [VIOLATION] Matrix contains token '${char}' not in palette!`);
        unmappedTokens++;
      }
    }
  });
  if (unmappedTokens === 0) {
    console.log(`  - Matrix tokens: ALL tokens properly mapped in palette (PASS)`);
  } else {
    totalViolations += unmappedTokens;
  }

  // 5. Pixel density & multi-tone audit
  const totalPixels = 16 * 16;
  const nonBlankPixels = totalPixels - (tokenCounts['.'] || 0);
  const uniqueTokensUsed = Object.keys(tokenCounts).filter(t => t !== '.');
  console.log(`  - Non-blank pixels: ${nonBlankPixels} / 256 (${((nonBlankPixels/256)*100).toFixed(1)}% density)`);
  console.log(`  - Unique color tokens used in matrix: ${uniqueTokensUsed.length}`);
  
  if (nonBlankPixels < 20) {
    console.error(`  [VIOLATION] Facade/empty matrix detected! Only ${nonBlankPixels} pixels.`);
    totalViolations++;
  }
  if (uniqueTokensUsed.length < 3) {
    console.error(`  [VIOLATION] Monochromatic/trivial sprite! Only ${uniqueTokensUsed.length} color tones.`);
    totalViolations++;
  }
  console.log("");
});

console.log(`=================================================`);
console.log(`TOTAL FORENSIC AUDIT MATRIX VIOLATIONS: ${totalViolations}`);
console.log(`=================================================`);
