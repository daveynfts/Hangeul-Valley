const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const assetsGameJsPath = path.join(__dirname, '..', '..', 'assets', 'game.js');

console.log('=== STARTING COMPREHENSIVE PHASE 2 CODE REVIEW ===\n');

// 1. Check Byte-for-Byte Sync
const gameContent = fs.readFileSync(gameJsPath);
const assetsContent = fs.readFileSync(assetsGameJsPath);

const hash1 = crypto.createHash('sha256').update(gameContent).digest('hex');
const hash2 = crypto.createHash('sha256').update(assetsContent).digest('hex');

console.log(`[Check 6] game.js SHA256:        ${hash1}`);
console.log(`[Check 6] assets/game.js SHA256: ${hash2}`);
if (hash1 === hash2) {
  console.log('=> PASSED: game.js and assets/game.js are 100% byte-for-byte identical.\n');
} else {
  console.error('=> FAILED: game.js and assets/game.js differ!\n');
}

// 2. Parse game.js content
const code = gameContent.toString('utf8');

// Helper to extract drawMatrix calls
// drawMatrix(graphics, [ matrix_rows ], palette, x, y, scale)
const drawMatrixRegex = /PixelArtRenderer\.drawMatrix\s*\(\s*[^,]+,\s*\[([\s\S]*?)\]\s*,\s*([A-Za-z0-9_]+)/g;

let match;
let totalMatrices = 0;
let matrixErrors = [];
let multiCharTokens = [];
let paletteMapsFound = {};

// Find palette object definitions in PixelArtRenderer
const paletteDefRegex = /(?:const|var|let)\s+([A-Z0-9_]+_PALETTE|[A-Z0-9_]+)\s*=\s*(\{[\s\S]*?\});/g;
let palMatch;
while ((palMatch = paletteDefRegex.exec(code)) !== null) {
  const palName = palMatch[1];
  const palBody = palMatch[2];
  // Parse keys in object body
  // e.g. 'K': 0x000000, '.': null, etc. or K: 0x000000
  const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
  let keyMatch;
  let keys = [];
  while ((keyMatch = keyRegex.exec(palBody)) !== null) {
    const k = keyMatch[1] || keyMatch[2] || keyMatch[3];
    keys.push(k);
    if (k.length !== 1) {
      multiCharTokens.push({ palette: palName, key: k });
    }
  }
  paletteMapsFound[palName] = keys;
}

console.log(`[Check 2] Found Palettes: ${Object.keys(paletteMapsFound).join(', ')}`);
if (multiCharTokens.length === 0) {
  console.log('=> PASSED: 100% single-character token keys in all defined palette maps.\n');
} else {
  console.error(`=> FAILED: Found multi-character tokens in palettes:`, multiCharTokens);
}

// Inspect every drawMatrix call in the codebase to check row lengths and inline palette tokens
const drawMatrixCallRegex = /PixelArtRenderer\.drawMatrix\s*\(\s*([^,]+),\s*\[([\s\S]*?)\]\s*,\s*([^,]+)/g;

let callMatch;
let rowLengthErrors = [];

while ((callMatch = drawMatrixCallRegex.exec(code)) !== null) {
  totalMatrices++;
  const targetGraphics = callMatch[1].trim();
  const rawRows = callMatch[2];
  const paletteName = callMatch[3].trim();

  // Extract string literal rows
  const rowStringRegex = /'([^']*)'|"([^"]*)"/g;
  let rowMatch;
  let rows = [];
  while ((rowMatch = rowStringRegex.exec(rawRows)) !== null) {
    rows.push(rowMatch[1] !== undefined ? rowMatch[1] : rowMatch[2]);
  }

  if (rows.length > 0) {
    const expectedLen = rows[0].length;
    for (let r = 0; r < rows.length; r++) {
      if (rows[r].length !== expectedLen) {
        rowLengthErrors.push({
          matrixIndex: totalMatrices,
          palette: paletteName,
          row: r,
          actualLen: rows[r].length,
          expectedLen: expectedLen,
          rowContent: rows[r]
        });
      }
    }
  }
}

console.log(`[Check 3] Examined ${totalMatrices} drawMatrix calls across the codebase.`);
if (rowLengthErrors.length === 0) {
  console.log('=> PASSED: Every matrix row string matches expected grid width across all matrices.\n');
} else {
  console.error(`=> FAILED: Matrix row length mismatches found:`, rowLengthErrors);
}

// Extract generated texture keys per section
const genTextureRegex = /\.generateTexture\s*\(\s*'([^']+)'|"([^"]+)"/g;
let allGeneratedKeys = new Set();
let sectionKeys = {
  farm: new Set(),
  fishing: new Set(),
  arcade: new Set(),
  dungeon: new Set(),
  other: new Set()
};

// We can slice code by method names
const methodNames = [
  'generateTilemapTextures',
  '_genFishingTextures',
  '_genArcadeTextures',
  '_genDungeonTextures',
  '_genPlayerTextures',
  '_genCatTextures',
  '_genMerlinTextures'
];

function getMethodBody(code, methodName) {
  const idx = code.indexOf(methodName);
  if (idx === -1) return '';
  const startBrace = code.indexOf('{', idx);
  if (startBrace === -1) return '';
  let depth = 1;
  let pos = startBrace + 1;
  while (pos < code.length && depth > 0) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') depth--;
    pos++;
  }
  return code.slice(startBrace, pos);
}

const farmBody = getMethodBody(code, 'generateTilemapTextures');
const fishingBody = getMethodBody(code, '_genFishingTextures');
const arcadeBody = getMethodBody(code, '_genArcadeTextures');
const dungeonBody = getMethodBody(code, '_genDungeonTextures');

function extractKeysFromSnippet(snippet) {
  const keys = new Set();
  let m;
  const re = /\.generateTexture\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = re.exec(snippet)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

const farmKeys = extractKeysFromSnippet(farmBody);
const fishingKeys = extractKeysFromSnippet(fishingBody);
const arcadeKeys = extractKeysFromSnippet(arcadeBody);
const dungeonKeys = extractKeysFromSnippet(dungeonBody);

console.log(`[Check 1] Farm Scene generated keys (${farmKeys.size}):`, Array.from(farmKeys).sort());
console.log(`[Check 1] Fishing Scene generated keys (${fishingKeys.size}):`, Array.from(fishingKeys).sort());
console.log(`[Check 1] Arcade Scene generated keys (${arcadeKeys.size}):`, Array.from(arcadeKeys).sort());
console.log(`[Check 1] Dungeon Scene generated keys (${dungeonKeys.size}):`, Array.from(dungeonKeys).sort());

// Check expected specific keys per scene specification
const expectedFishingFish = [
  'fish_carp', 'fish_salmon', 'fish_catfish', 'fish_trout', 'fish_bass',
  'fish_tuna', 'fish_eel', 'fish_squid', 'fish_puffer', 'fish_goldfish',
  'fish_sturgeon', 'fish_octopus', 'fish_legendary'
];
const expectedFishingAcc = ['fishing_rod', 'fishing_bobber', 'dock_plank', 'dock_post'];

const missingFishingFish = expectedFishingFish.filter(k => !fishingKeys.has(k));
const missingFishingAcc = expectedFishingAcc.filter(k => !fishingKeys.has(k));

if (missingFishingFish.length === 0 && missingFishingAcc.length === 0) {
  console.log('=> PASSED: All 13 fishing species and 4 accessories present.\n');
} else {
  console.error('=> FAILED: Missing fishing keys:', { missingFishingFish, missingFishingAcc });
}

const expectedArcadeKeys = [
  'arcade_player', 'arcade_alien1', 'arcade_alien2', 'arcade_alien3', 'arcade_boss',
  'arcade_laser', 'powerup_shield', 'powerup_multishot', 'powerup_bomb'
];
const missingArcade = expectedArcadeKeys.filter(k => !arcadeKeys.has(k));

if (missingArcade.length === 0) {
  console.log('=> PASSED: All arcade spaceship, 4 aliens, laser, and 3 powerups present.\n');
} else {
  console.error('=> FAILED: Missing arcade keys:', missingArcade);
}

const expectedDungeonKeys = [
  'dungeon_slime', 'dungeon_skeleton', 'dungeon_goblin', 'dungeon_boss',
  'dungeon_coin', 'dungeon_gem', 'dungeon_chest', 'dungeon_key', 'dungeon_potion'
];
const missingDungeon = expectedDungeonKeys.filter(k => !dungeonKeys.has(k));

if (missingDungeon.length === 0) {
  console.log('=> PASSED: All dungeon 4 enemies and 5 loot items present.\n');
} else {
  console.error('=> FAILED: Missing dungeon keys:', missingDungeon);
}

const expectedFarmKeys = [
  'tile_grass', 'tile_path', 'fnc_post', 'fnc_rail', 'house_wall', 'house_roof',
  'sparkle', 'coin', 'shop_sign', 'notice_board', 'dungeon_portal', 'fishing_dock',
  'arcade_machine', 'tree_oak', 'flower_red', 'stone_well', 'barrel', 'crate'
];
const missingFarm = expectedFarmKeys.filter(k => !farmKeys.has(k));

if (missingFarm.length === 0) {
  console.log('=> PASSED: All farm tilemaps and decor keys present.\n');
} else {
  console.error('=> FAILED: Missing farm keys:', missingFarm);
}
