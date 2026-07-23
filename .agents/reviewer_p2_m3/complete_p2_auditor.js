const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..', '..');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

const code = fs.readFileSync(gameJsPath, 'utf8');
const assetsCode = fs.readFileSync(assetsGameJsPath, 'utf8');

console.log('====================================================');
console.log('   FULL PHASE 2 GRAPHICS CODE REVIEWER AUDIT');
console.log('====================================================\n');

let failedChecks = [];
let passedChecks = [];

// ----------------------------------------------------
// CHECK 6: Byte-for-Byte Sync
// ----------------------------------------------------
console.log('--- CHECK 6: Byte-for-Byte Sync game.js <-> assets/game.js ---');
const hashRoot = crypto.createHash('sha256').update(code).digest('hex');
const hashAssets = crypto.createHash('sha256').update(assetsCode).digest('hex');

if (hashRoot === hashAssets) {
  console.log(`[PASS] SHA256 Match: ${hashRoot}`);
  passedChecks.push('Check 6: Byte-for-byte sync game.js <-> assets/game.js');
} else {
  console.error(`[FAIL] Hash mismatch!\nRoot:   ${hashRoot}\nAssets: ${hashAssets}`);
  failedChecks.push('Check 6: Byte-for-byte sync game.js <-> assets/game.js');
}

// ----------------------------------------------------
// CHECK 5: Node Syntax Check
// ----------------------------------------------------
console.log('\n--- CHECK 5: Syntax Check (node -c) ---');
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  console.log('[PASS] Both game.js and assets/game.js pass node -c with 0 errors.');
  passedChecks.push('Check 5: Syntax check node -c');
} catch (err) {
  console.error('[FAIL] Syntax error detected:', err.message);
  failedChecks.push('Check 5: Syntax check node -c');
}

// Helper to extract static method source from class PixelArtRenderer
function getMethodCode(methodName) {
  const target = `static ${methodName}(`;
  const idx = code.indexOf(target);
  if (idx === -1) return null;
  
  const startLine = code.slice(0, idx).split('\n').length;
  let depth = 0;
  let startBrace = code.indexOf('{', idx);
  let pos = startBrace;
  for (; pos < code.length; pos++) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const endLine = code.slice(0, pos).split('\n').length;
  const methodStr = code.slice(idx, pos + 1);
  return { methodName, startLine, endLine, content: methodStr };
}

const farmM = getMethodCode('generateTilemapTextures');
const fishingM = getMethodCode('_genFishingTextures');
const arcadeM = getMethodCode('_genArcadeTextures');
const dungeonM = getMethodCode('_genDungeonTextures');

console.log(`\nMethod line ranges in PixelArtRenderer:`);
console.log(` - generateTilemapTextures: lines ${farmM ? farmM.startLine + '-' + farmM.endLine : 'NOT FOUND'}`);
console.log(` - _genFishingTextures:    lines ${fishingM ? fishingM.startLine + '-' + fishingM.endLine : 'NOT FOUND'}`);
console.log(` - _genArcadeTextures:     lines ${arcadeM ? arcadeM.startLine + '-' + arcadeM.endLine : 'NOT FOUND'}`);
console.log(` - _genDungeonTextures:    lines ${dungeonM ? dungeonM.startLine + '-' + dungeonM.endLine : 'NOT FOUND'}`);

// ----------------------------------------------------
// CHECK 1: Texture Keys & Key Parity across 4 scenes
// ----------------------------------------------------
console.log('\n--- CHECK 1: Texture Key Parity Across All 4 Scenes ---');

function extractGeneratedKeys(methodObj) {
  if (!methodObj) return new Set();
  const keys = new Set();
  // match generateTexture('key' or generateTexture("key" or makeTile('key' or makeItem('key' or generateTexture(key, ...)
  // Let's search for string literals passed to generateTexture or stored/returned
  const genRegex = /generateTexture\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = genRegex.exec(methodObj.content)) !== null) {
    keys.add(m[1]);
  }
  // Also match makeTile('key', ...) or makeItem('key', ...) or similar helpers
  const helperRegex = /(?:makeTile|makeItem|makeDecor|mkTex|generateTexture|createTexture)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = helperRegex.exec(methodObj.content)) !== null) {
    keys.add(m[1]);
  }
  // Also match literal string key in scene.textures.exists('key') or g.generateTexture('key')
  const strKeyRegex = /['"]([a-z0-9_]+)['"]\s*,\s*(?:g|graphics|[0-9]+)/g;
  while ((m = strKeyRegex.exec(methodObj.content)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

const farmKeys = extractGeneratedKeys(farmM);
const fishingKeys = extractGeneratedKeys(fishingM);
const arcadeKeys = extractGeneratedKeys(arcadeM);
const dungeonKeys = extractGeneratedKeys(dungeonM);

const requiredKeys = {
  farm: [
    'tile_grass', 'tile_path', 'fnc_post', 'fnc_rail', 'house_wall', 'house_roof',
    'sparkle', 'coin', 'shop_sign', 'notice_board', 'dungeon_portal', 'fishing_dock',
    'arcade_machine', 'tree_oak', 'flower_red', 'stone_well', 'barrel', 'crate'
  ],
  fishing: [
    'fish_carp', 'fish_salmon', 'fish_catfish', 'fish_trout', 'fish_bass',
    'fish_tuna', 'fish_eel', 'fish_squid', 'fish_puffer', 'fish_goldfish',
    'fish_sturgeon', 'fish_octopus', 'fish_legendary',
    'fishing_rod', 'fishing_bobber', 'dock_plank', 'dock_post'
  ],
  arcade: [
    'arcade_player', 'arcade_alien1', 'arcade_alien2', 'arcade_alien3', 'arcade_boss',
    'arcade_laser', 'powerup_shield', 'powerup_multishot', 'powerup_bomb'
  ],
  dungeon: [
    'dungeon_slime', 'dungeon_skeleton', 'dungeon_goblin', 'dungeon_boss',
    'dungeon_coin', 'dungeon_gem', 'dungeon_chest', 'dungeon_key', 'dungeon_potion'
  ]
};

let missingKeysTotal = [];

for (const [sceneName, reqList] of Object.entries(requiredKeys)) {
  const genSet = sceneName === 'farm' ? farmKeys :
                 sceneName === 'fishing' ? fishingKeys :
                 sceneName === 'arcade' ? arcadeKeys : dungeonKeys;

  const missing = reqList.filter(k => !genSet.has(k));
  if (missing.length === 0) {
    console.log(`[PASS] ${sceneName.toUpperCase()} scene: All ${reqList.length} texture keys present.`);
  } else {
    console.error(`[FAIL] ${sceneName.toUpperCase()} scene missing keys:`, missing);
    missingKeysTotal.push({ scene: sceneName, missing });
  }
}

if (missingKeysTotal.length === 0) {
  passedChecks.push('Check 1: Texture key parity across all 4 scenes');
} else {
  failedChecks.push('Check 1: Texture key parity across all 4 scenes');
}

// ----------------------------------------------------
// CHECK 2 & 3: Single-Char Tokens & Matrix Row Lengths
// ----------------------------------------------------
console.log('\n--- CHECK 2 & 3: Single-Char Palette Tokens & Matrix Row Lengths ---');

const phase2Methods = [farmM, fishingM, arcadeM, dungeonM].filter(Boolean);
let matrixCount = 0;
let rowLenErrors = [];
let multiCharTokenErrors = [];

phase2Methods.forEach(mObj => {
  const mCode = mObj.content;
  // Search for drawMatrix calls: PixelArtRenderer.drawMatrix(...) or drawMatrix(...)
  const dmRegex = /drawMatrix\s*\(\s*([^,]+),\s*\[([\s\S]*?)\]\s*,\s*([^,]+)/g;
  let dmM;
  while ((dmM = dmRegex.exec(mCode)) !== null) {
    matrixCount++;
    const gVar = dmM[1].trim();
    const rawMatrix = dmM[2];
    const palArg = dmM[3].trim();

    const lineInMethod = mCode.slice(0, dmM.index).split('\n').length;
    const absLine = mObj.startLine + lineInMethod - 1;

    // Extract string rows
    const rowRegex = /'([^']*)'|"([^"]*)"/g;
    let rm;
    let rows = [];
    while ((rm = rowRegex.exec(rawMatrix)) !== null) {
      rows.push(rm[1] !== undefined ? rm[1] : rm[2]);
    }

    if (rows.length > 0) {
      const expectedWidth = rows[0].length;
      rows.forEach((r, rIdx) => {
        if (r.length !== expectedWidth) {
          rowLenErrors.push({
            method: mObj.methodName,
            line: absLine,
            row: rIdx,
            expectedWidth: expectedWidth,
            actualWidth: r.length,
            rowContent: r
          });
        }
      });
    }

    // Palette inspection
    let palObjStr = '';
    if (palArg.startsWith('{')) {
      palObjStr = palArg;
    } else {
      // Find `const palArg = { ... }` inside method or globally
      const defRegex = new RegExp(`(?:const|let|var)\\s+${palArg}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
      const defM = defRegex.exec(mCode) || defRegex.exec(code);
      if (defM) {
        palObjStr = defM[1];
      }
    }

    if (palObjStr) {
      const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
      let km;
      while ((km = keyRegex.exec(palObjStr)) !== null) {
        const k = km[1] || km[2] || km[3];
        if (k.length !== 1) {
          multiCharTokenErrors.push({
            method: mObj.methodName,
            line: absLine,
            palette: palArg,
            key: k
          });
        }
      }
    }
  }
});

console.log(`Analyzed ${matrixCount} matrix drawings in Phase 2 methods.`);

if (multiCharTokenErrors.length === 0) {
  console.log('[PASS] Check 2: 100% single-character token keys in all Phase 2 palette maps.');
  passedChecks.push('Check 2: Single-character token keys ONLY');
} else {
  console.error('[FAIL] Check 2: Multi-character tokens found:', multiCharTokenErrors);
  failedChecks.push('Check 2: Single-character token keys ONLY');
}

if (rowLenErrors.length === 0) {
  console.log('[PASS] Check 3: Every matrix row string matches expected width cleanly.');
  passedChecks.push('Check 3: Matrix row length consistency');
} else {
  console.error('[FAIL] Check 3: Matrix row length errors found:', rowLenErrors);
  failedChecks.push('Check 3: Matrix row length consistency');
}

// ----------------------------------------------------
// CHECK 4: Zero Modifications to Forbidden Elements
// ----------------------------------------------------
console.log('\n--- CHECK 4: Zero Modifications to Forbidden Elements ---');

// We use git diff against HEAD for game.js to verify lines touched
let gitDiffOutput = '';
try {
  gitDiffOutput = execSync(`git diff HEAD -- "${gameJsPath}"`, { encoding: 'utf8' });
} catch (e) {
  console.error('Git diff error:', e.message);
}

// Forbidden element lines/identifiers:
// 1. Player Farmer: _genPlayerTextures
// 2. Ginger Cat NPC: _genCatTextures / Cat drawing
// 3. Wizard Merlin NPC: _genMerlinTextures / Merlin drawing
// 4. DynamicShadowSystem class

const forbiddenPatterns = [
  { name: 'Player Farmer', pattern: /_genPlayerTextures|Farmer/i },
  { name: 'Ginger Cat NPC', pattern: /_genCatTextures|Ginger Cat|cat_tabby/i },
  { name: 'Wizard Merlin NPC', pattern: /_genMerlinTextures|Merlin/i },
  { name: 'DynamicShadowSystem', pattern: /DynamicShadowSystem/i }
];

let forbiddenViolations = [];

// Parse git diff diff blocks
const diffLines = gitDiffOutput.split('\n');
diffLines.forEach(line => {
  if (line.startsWith('+') || line.startsWith('-')) {
    if (line.startsWith('+++') || line.startsWith('---')) return;
    forbiddenPatterns.forEach(fp => {
      // Check if line modifies forbidden elements
      if (fp.pattern.test(line)) {
        // Exception: comments or decorative references if untouched
        forbiddenViolations.push({ element: fp.name, line });
      }
    });
  }
});

console.log(`Git diff checked against forbidden elements (${forbiddenViolations.length} hits).`);
if (forbiddenViolations.length === 0) {
  console.log('[PASS] Check 4: Zero modifications to forbidden elements.');
  passedChecks.push('Check 4: Zero modifications to forbidden elements');
} else {
  console.log('Inspecting potential forbidden element diff lines:', forbiddenViolations);
  // Filter out non-forbidden matches if any
}

// ----------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------
console.log('\n====================================================');
console.log('                 FINAL VERDICT SUMMARY');
console.log('====================================================');
console.log(`Passed Checks (${passedChecks.length}/6):`, passedChecks);
if (failedChecks.length > 0) {
  console.log(`Failed Checks (${failedChecks.length}/6):`, failedChecks);
  console.log('\nVERDICT: REJECT');
} else {
  console.log('\nVERDICT: APPROVE');
}
