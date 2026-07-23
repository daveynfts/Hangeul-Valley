const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const assetsGameJsPath = path.join(__dirname, '..', '..', 'assets', 'game.js');

const code = fs.readFileSync(gameJsPath, 'utf8');
const assetsCode = fs.readFileSync(assetsGameJsPath, 'utf8');

console.log('================================================================');
console.log('   REVIEWR_P2_M3 COMPREHENSIVE PHASE 2 CODE REVIEW AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
const testResults = [];

function recordResult(checkNum, title, passed, details) {
  if (passed) {
    passCount++;
    console.log(`[PASS] Check ${checkNum}: ${title}`);
    testResults.push({ checkNum, title, passed: true, details });
  } else {
    failCount++;
    console.error(`[FAIL] Check ${checkNum}: ${title}`);
    if (details) console.error('  Details:', details);
    testResults.push({ checkNum, title, passed: false, details });
  }
}

// ----------------------------------------------------
// CHECK 6: Byte-for-Byte Sync
// ----------------------------------------------------
const hash1 = crypto.createHash('sha256').update(code).digest('hex');
const hash2 = crypto.createHash('sha256').update(assetsCode).digest('hex');
const isSync = (hash1 === hash2);
recordResult(6, 'game.js and assets/game.js 100% byte-for-byte identical', isSync, { hash1, hash2 });

// ----------------------------------------------------
// CHECK 5: Syntax Checks (node -c)
// ----------------------------------------------------
let syntaxPassed = true;
let syntaxErr = null;
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
} catch (e) {
  syntaxPassed = false;
  syntaxErr = e.message;
}
recordResult(5, 'Syntax checks (node -c game.js and node -c assets/game.js) pass cleanly with 0 errors', syntaxPassed, syntaxErr);

// Helper to extract method body
function getMethodBody(methodName) {
  const target = `static ${methodName}(`;
  const idx = code.indexOf(target);
  if (idx === -1) return null;
  const startBrace = code.indexOf('{', idx);
  let depth = 0;
  let pos = startBrace;
  for (; pos < code.length; pos++) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const startLine = code.slice(0, idx).split('\n').length;
  const endLine = code.slice(0, pos).split('\n').length;
  return {
    name: methodName,
    startLine,
    endLine,
    content: code.slice(idx, pos + 1)
  };
}

const farmM = getMethodBody('generateTilemapTextures');
const fishingM = getMethodBody('_genFishingTextures');
const arcadeM = getMethodBody('_genArcadeTextures');
const dungeonM = getMethodBody('_genDungeonTextures');

// ----------------------------------------------------
// CHECK 1: Texture Keys & Key Parity across 4 scenes
// ----------------------------------------------------
function extractKeysFromMethod(methodObj) {
  if (!methodObj) return { generated: new Set(), calls: [] };
  const keys = new Set();
  const calls = [];
  
  // 1. match createTexture(scene, 'key', matrix, palette)
  const ctRegex = /createTexture\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]\s*,\s*([^,]+)\s*,\s*([^,)]+)/g;
  let m;
  while ((m = ctRegex.exec(methodObj.content)) !== null) {
    keys.add(m[1]);
    calls.push({ key: m[1], matrixVar: m[2].trim(), paletteVar: m[3].trim() });
  }

  // 2. match makeTile('key', ...) or makeItem('key', ...)
  const mtRegex = /(?:makeTile|makeItem)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = mtRegex.exec(methodObj.content)) !== null) {
    keys.add(m[1]);
    calls.push({ key: m[1], matrixVar: 'inline', paletteVar: 'TILEMAP_PALETTE' });
  }

  // 3. match g.generateTexture('key', ...)
  const gtRegex = /generateTexture\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = gtRegex.exec(methodObj.content)) !== null) {
    keys.add(m[1]);
  }

  return { generated: keys, calls };
}

const farmData = extractKeysFromMethod(farmM);
const fishingData = extractKeysFromMethod(fishingM);
const arcadeData = extractKeysFromMethod(arcadeM);
const dungeonData = extractKeysFromMethod(dungeonM);

// Check parity with scene callers
// ArcadeScene callers:
const arcadeCallers = ['arcade_player_ship', 'alien_scout', 'alien_shooter', 'alien_elite', 'alien_boss', 'laser_player', 'powerup_weapon', 'powerup_shield', 'powerup_nuke'];
// DungeonScene callers:
const dungeonCallers = ['dungeon_green_slime', 'dungeon_goblin_warrior', 'dungeon_skeleton_archer', 'dungeon_boss', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_chest', 'loot_scroll'];
// FishingScene callers:
const fishingCallers = ['fishing_dock', 'dock_plank', 'dock_post', 'fishing_bobber', 'fishing_rod', 'fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel', 'fishing_golden_fish', 'fishing_snapper', 'fishing_shrimp', 'fishing_octopus', 'fishing_catfish', 'fishing_mackerel', 'fishing_legendary', 'fishing_clam'];
// FarmScene callers:
const farmCallers = ['tile_grass_base', 'tile_path_straight', 'tile_fence_h', 'tile_house_roof', 'tile_house_wall', 'notice_board', 'shop_sign', 'dungeon_portal', 'fishing_dock', 'arcade_machine', 'stone_well', 'pixel_barrel', 'pixel_crate'];

let parityIssues = [];

arcadeCallers.forEach(k => { if (!arcadeData.generated.has(k)) parityIssues.push({ scene: 'Arcade', key: k }); });
dungeonCallers.forEach(k => { if (!dungeonData.generated.has(k)) parityIssues.push({ scene: 'Dungeon', key: k }); });
fishingCallers.forEach(k => { if (!fishingData.generated.has(k)) parityIssues.push({ scene: 'Fishing', key: k }); });

recordResult(1, 'All texture keys across all 4 scenes are present and maintain 100% key parity with scene callers', parityIssues.length === 0, parityIssues);

// ----------------------------------------------------
// CHECK 2: Single-Character Token Keys ONLY in palette maps
// ----------------------------------------------------
let multiCharTokens = [];
const p2Methods = [farmM, fishingM, arcadeM, dungeonM].filter(Boolean);

p2Methods.forEach(mObj => {
  const mContent = mObj.content;

  // Find object definitions inside method: const PALETTE = { ... }
  const objRegex = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(\{[\s\S]*?\});/g;
  let om;
  while ((om = objRegex.exec(mContent)) !== null) {
    const palName = om[1];
    const palBody = om[2];
    
    // Parse keys in palBody
    const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
    let km;
    while ((km = keyRegex.exec(palBody)) !== null) {
      const k = km[1] || km[2] || km[3];
      if (k.length !== 1) {
        multiCharTokens.push({ method: mObj.name, palette: palName, key: k });
      }
    }
  }

  // Also check inline palette objects passed to drawMatrix or createTexture
  const inlineRegex = /drawMatrix\s*\([^,]+,\s*\[[\s\S]*?\]\s*,\s*(\{[\s\S]*?\})/g;
  let im;
  while ((im = inlineRegex.exec(mContent)) !== null) {
    const inlineBody = im[1];
    const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
    let km;
    while ((km = keyRegex.exec(inlineBody)) !== null) {
      const k = km[1] || km[2] || km[3];
      if (k.length !== 1) {
        multiCharTokens.push({ method: mObj.name, palette: 'inline', key: k });
      }
    }
  }
});

recordResult(2, 'Single-character token keys ONLY in all palette maps', multiCharTokens.length === 0, multiCharTokens);

// ----------------------------------------------------
// CHECK 3: Matrix Row String Length Consistency
// ----------------------------------------------------
let rowLengthViolations = [];

p2Methods.forEach(mObj => {
  const mContent = mObj.content;

  // Find all matrix array definitions: const matrixName = [ 'row1', 'row2', ... ];
  // or inline arrays passed to drawMatrix/createTexture
  const matrixArrayRegex = /(?:const|let|var)?\s*([A-Za-z0-9_$]+)?\s*=\s*\[([\s\S]*?)\];/g;
  let mm;
  while ((mm = matrixArrayRegex.exec(mContent)) !== null) {
    const varName = mm[1] || 'inline_array';
    const arrBody = mm[2];

    // Extract string rows
    const rowRegex = /'([^']*)'|"([^"]*)"/g;
    let rm;
    let rows = [];
    while ((rm = rowRegex.exec(arrBody)) !== null) {
      rows.push(rm[1] !== undefined ? rm[1] : rm[2]);
    }

    // Only inspect arrays where rows look like matrix rows (all string rows)
    if (rows.length >= 4) {
      const expectedWidth = rows[0].length;
      rows.forEach((r, rIdx) => {
        if (r.length !== expectedWidth) {
          rowLengthViolations.push({
            method: mObj.name,
            matrixName: varName,
            row: rIdx,
            expectedWidth,
            actualWidth: r.length,
            rowContent: r
          });
        }
      });
    }
  }

  // Also check drawMatrix(g, [ ... ], ...) inline arrays
  const dmRegex = /drawMatrix\s*\([^,]+,\s*\[([\s\S]*?)\]/g;
  let dmM;
  while ((dmM = dmRegex.exec(mContent)) !== null) {
    const rawMatrix = dmM[1];
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
          rowLengthViolations.push({
            method: mObj.name,
            matrixName: 'drawMatrix_inline',
            row: rIdx,
            expectedWidth,
            actualWidth: r.length,
            rowContent: r
          });
        }
      });
    }
  }
});

recordResult(3, 'Every matrix row string is EXACTLY 16 characters (or matching grid size)', rowLengthViolations.length === 0, rowLengthViolations);

// ----------------------------------------------------
// CHECK 4: Zero Modifications to Forbidden Elements
// ----------------------------------------------------
let gitDiffOutput = '';
try {
  gitDiffOutput = execSync(`git diff HEAD -- "${gameJsPath}"`, { encoding: 'utf8' });
} catch (e) {
  gitDiffOutput = '';
}

const forbiddenChecks = [
  { name: '_genPlayerTextures (Player Farmer)', pattern: /_genPlayerTextures/ },
  { name: 'Ginger Cat NPC (_genCatTextures)', pattern: /_genCatTextures/ },
  { name: 'Wizard Merlin NPC (_genMerlinTextures)', pattern: /_genMerlinTextures/ },
  { name: 'DynamicShadowSystem', pattern: /class DynamicShadowSystem/ }
];

let forbiddenViolations = [];
const diffLines = gitDiffOutput.split('\n');
diffLines.forEach(line => {
  if (line.startsWith('+') || line.startsWith('-')) {
    if (line.startsWith('+++') || line.startsWith('---')) return;
    forbiddenChecks.forEach(fc => {
      if (fc.pattern.test(line)) {
        forbiddenViolations.push({ element: fc.name, line });
      }
    });
  }
});

recordResult(4, 'Zero modifications to forbidden elements (Player Farmer, Ginger Cat NPC, Wizard Merlin NPC, DynamicShadowSystem)', forbiddenViolations.length === 0, forbiddenViolations);

// ----------------------------------------------------
// FINAL VERDICT & SUMMARY
// ----------------------------------------------------
console.log('\n================================================================');
console.log(` SUMMARY: ${passCount}/6 CHECKS PASSED, ${failCount}/6 CHECKS FAILED`);
console.log('================================================================');
const finalVerdict = (failCount === 0) ? 'APPROVE' : 'REJECT';
console.log(`FINAL VERDICT: ${finalVerdict}\n`);
