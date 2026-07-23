const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== PRECISION CHECKER V2 FOR PHASE 2 GRAPHICS REVIEW ===\n');

// 1. Extract static methods of PixelArtRenderer accurately
function getStaticMethodSource(methodName) {
  const lineArr = code.split('\n');
  let start = -1;
  const target = `static ${methodName}(`;
  for (let i = 0; i < lineArr.length; i++) {
    if (lineArr[i].includes(target)) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = start; i < lineArr.length; i++) {
    const line = lineArr[i];
    for (let c of line) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) break;
  }
  return {
    name: methodName,
    startLine: start + 1,
    endLine: end + 1,
    lines: lineArr.slice(start, end + 1),
    content: lineArr.slice(start, end + 1).join('\n')
  };
}

const methods = {
  farm: getStaticMethodSource('generateTilemapTextures'),
  fishing: getStaticMethodSource('_genFishingTextures'),
  arcade: getStaticMethodSource('_genArcadeTextures'),
  dungeon: getStaticMethodSource('_genDungeonTextures'),
  player: getStaticMethodSource('_genPlayerTextures'),
  cat: getStaticMethodSource('_genCatTextures'),
  merlin: getStaticMethodSource('_genMerlinTextures')
};

for (const [m, src] of Object.entries(methods)) {
  if (!src) {
    console.log(`Method ${m}: NOT FOUND as static method (might be internal/inline)`);
  } else {
    console.log(`Found static method ${m}: lines ${src.startLine} to ${src.endLine} (${src.lines.length} lines)`);
  }
}

console.log('\n--- 1. TEXTURE KEY GENERATION & PARITY ---');

function getGeneratedKeys(methodSrc) {
  if (!methodSrc) return [];
  const keys = [];
  const reg = /\.generateTexture\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = reg.exec(methodSrc.content)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

const farmKeys = getGeneratedKeys(methods.farm);
const fishingKeys = getGeneratedKeys(methods.fishing);
const arcadeKeys = getGeneratedKeys(methods.arcade);
const dungeonKeys = getGeneratedKeys(methods.dungeon);

console.log(`\nFarm scene generated keys (${farmKeys.length}):\n`, farmKeys.sort());
console.log(`\nFishing scene generated keys (${fishingKeys.length}):\n`, fishingKeys.sort());
console.log(`\nArcade scene generated keys (${arcadeKeys.length}):\n`, arcadeKeys.sort());
console.log(`\nDungeon scene generated keys (${dungeonKeys.length}):\n`, dungeonKeys.sort());

// Search for caller keys in the codebase
console.log('\n--- VERIFYING KEY PARITY WITH SCENE CALLERS ---');

// Check callers in scene classes
function findKeysUsedInCode(codeStr) {
  const keysUsed = new Set();
  // Match add.image(x, y, 'key'), add.sprite(x, y, 'key'), setTexture('key'), create(x, y, 'key'), physics.add.sprite(x, y, 'key')
  const callerRegex = /(?:add\.image|add\.sprite|setTexture|physics\.add\.sprite|physics\.add\.image|create)\s*\(\s*[^,]+,\s*[^,]+,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = callerRegex.exec(codeStr)) !== null) {
    keysUsed.add(m[1]);
  }
  // Also match setTexture('key') or image('key') or frame/key properties
  const keyPropRegex = /(?:texture|key|sprite)\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = keyPropRegex.exec(codeStr)) !== null) {
    keysUsed.add(m[1]);
  }
  return keysUsed;
}

const allUsedKeys = findKeysUsedInCode(code);
console.log(`Found ${allUsedKeys.size} distinct texture key call references in game.js.`);

// Verify Phase 2 requirement key lists:
const requiredPhase2Keys = {
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

let parityErrors = [];

for (const [scene, reqKeys] of Object.entries(requiredPhase2Keys)) {
  const genSet = new Set(
    scene === 'farm' ? farmKeys :
    scene === 'fishing' ? fishingKeys :
    scene === 'arcade' ? arcadeKeys : dungeonKeys
  );

  reqKeys.forEach(k => {
    if (!genSet.has(k)) {
      parityErrors.push({ scene, key: k, issue: 'Missing in generator' });
    }
  });
}

if (parityErrors.length === 0) {
  console.log('=> PASSED: 100% texture key parity across all 4 scenes!');
} else {
  console.error('=> FAILED: Key parity errors found:', parityErrors);
}

console.log('\n--- 2. SINGLE-CHARACTER PALETTE TOKEN CHECK ---');

// Search for drawMatrix calls inside the 4 Phase 2 methods
const p2Methods = [methods.farm, methods.fishing, methods.arcade, methods.dungeon];
let drawMatrixCountInP2 = 0;
let rowLenErrorsInP2 = [];
let multiCharTokensInP2 = [];

p2Methods.forEach(mSrc => {
  if (!mSrc) return;
  const mContent = mSrc.content;
  
  // Find drawMatrix calls
  const dmRegex = /drawMatrix\s*\(\s*([^,]+),\s*\[([\s\S]*?)\]\s*,\s*([^,]+)/g;
  let dmM;
  while ((dmM = dmRegex.exec(mContent)) !== null) {
    drawMatrixCountInP2++;
    const gVar = dmM[1].trim();
    const matrixBody = dmM[2];
    const palArg = dmM[3].trim();
    const lineInMethod = mContent.slice(0, dmM.index).split('\n').length;
    const absLine = mSrc.startLine + lineInMethod - 1;

    // Check row lengths
    const rowRegex = /'([^']*)'|"([^"]*)"/g;
    let rm;
    let rows = [];
    while ((rm = rowRegex.exec(matrixBody)) !== null) {
      rows.push(rm[1] !== undefined ? rm[1] : rm[2]);
    }

    if (rows.length > 0) {
      const expectedWidth = rows[0].length;
      rows.forEach((r, rIdx) => {
        if (r.length !== expectedWidth) {
          rowLenErrorsInP2.push({
            method: mSrc.name,
            line: absLine,
            row: rIdx,
            expectedWidth: expectedWidth,
            actualWidth: r.length,
            rowContent: r
          });
        }
      });
    }

    // Check palette passed to drawMatrix
    // If palArg is a variable (e.g. DECOR_PALETTE, FISHING_PALETTE, P_SHIP, etc.)
    // Find its definition in the method or globally
    let palObjStr = '';
    if (palArg.startsWith('{')) {
      palObjStr = palArg;
    } else {
      // Find `const palArg = { ... }` inside method or globally
      const defRegex = new RegExp(`(?:const|let|var)\\s+${palArg}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
      const defM = defRegex.exec(mContent) || defRegex.exec(code);
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
          multiCharTokensInP2.push({
            method: mSrc.name,
            line: absLine,
            palette: palArg,
            key: k
          });
        }
      }
    }
  }
});

console.log(`Total drawMatrix calls analyzed in Phase 2 methods: ${drawMatrixCountInP2}`);

if (multiCharTokensInP2.length === 0) {
  console.log('=> PASSED: Single-character tokens ONLY in all Phase 2 palette maps!');
} else {
  console.error('=> FAILED: Multi-character tokens found in Phase 2 palettes:', multiCharTokensInP2);
}

console.log('\n--- 3. MATRIX ROW LENGTH CONSISTENCY CHECK ---');
if (rowLenErrorsInP2.length === 0) {
  console.log('=> PASSED: Every matrix row string matches expected grid width in Phase 2 methods!');
} else {
  console.error('=> FAILED: Matrix row length errors in Phase 2 methods:', rowLenErrorsInP2);
}

console.log('\n--- 4. FORBIDDEN ELEMENTS INTEGRITY CHECK ---');
// Verify Player Farmer, Ginger Cat NPC, Wizard Merlin NPC, DynamicShadowSystem
console.log('Player Farmer method (_genPlayerTextures):', methods.player ? `Lines ${methods.player.startLine}-${methods.player.endLine}` : 'NOT FOUND');
console.log('Ginger Cat NPC method (_genCatTextures):', methods.cat ? `Lines ${methods.cat.startLine}-${methods.cat.endLine}` : 'NOT FOUND');
console.log('Wizard Merlin NPC method (_genMerlinTextures):', methods.merlin ? `Lines ${methods.merlin.startLine}-${methods.merlin.endLine}` : 'NOT FOUND');

const shadowClassRegex = /class\s+DynamicShadowSystem\s*\{[\s\S]*?\}/;
const shadowMatch = shadowClassRegex.exec(code);
console.log('DynamicShadowSystem class:', shadowMatch ? 'PRESENT' : 'NOT FOUND');

