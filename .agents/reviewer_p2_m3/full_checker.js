const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== PRECISION CHECKER FOR PHASE 2 GRAPHICS REVIEW ===\n');

// 1. Extract method content accurately
function getMethodSource(methodName) {
  const lineArr = code.split('\n');
  let start = -1;
  for (let i = 0; i < lineArr.length; i++) {
    if (lineArr[i].includes(`static ${methodName}(`) || lineArr[i].includes(`${methodName}(`)) {
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
    startLine: start + 1,
    endLine: end + 1,
    lines: lineArr.slice(start, end + 1),
    content: lineArr.slice(start, end + 1).join('\n')
  };
}

const methods = {
  farm: getMethodSource('generateTilemapTextures'),
  fishing: getMethodSource('_genFishingTextures'),
  arcade: getMethodSource('_genArcadeTextures'),
  dungeon: getMethodSource('_genDungeonTextures')
};

// Check method existence
for (const [m, src] of Object.entries(methods)) {
  if (!src) {
    console.error(`ERROR: Method ${m} not found!`);
  } else {
    console.log(`Found method ${m}: lines ${src.startLine} to ${src.endLine} (${src.lines.length} lines)`);
  }
}

console.log('\n--- 1. TEXTURE KEY GENERATION & PARITY ---');

function getGeneratedKeys(methodSrc) {
  if (!methodSrc) return [];
  const keys = [];
  // Match generateTexture('key' or generateTexture("key"
  const reg = /\.generateTexture\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = reg.exec(methodSrc.content)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

const farmGenerated = getGeneratedKeys(methods.farm);
const fishingGenerated = getGeneratedKeys(methods.fishing);
const arcadeGenerated = getGeneratedKeys(methods.arcade);
const dungeonGenerated = getGeneratedKeys(methods.dungeon);

console.log(`Farm scene generated keys (${farmGenerated.length}):`, farmGenerated.sort());
console.log(`Fishing scene generated keys (${fishingGenerated.length}):`, fishingGenerated.sort());
console.log(`Arcade scene generated keys (${arcadeGenerated.length}):`, arcadeGenerated.length === 0 ? 'NONE! Wait let us check how arcade textures are generated!' : arcadeGenerated.sort());
console.log(`Dungeon scene generated keys (${dungeonGenerated.length}):`, dungeonGenerated.sort());

// Check callers in scene classes
function findKeyUsagesInScene(sceneClassName) {
  const src = getMethodSource(sceneClassName) || { content: '' };
  // Search for add.image, add.sprite, setTexture, etc.
}

// Search scene classes in code
console.log('\n--- 2. PALETTE DICTIONARY TOKENS CHECK ---');

// Search for all objects passed as 3rd parameter to PixelArtRenderer.drawMatrix(g, [...], PALETTE, ...)
// or drawMatrix(g, [...], PALETTE, ...)
const drawMatrixCalls = [];
const dmRegex = /drawMatrix\s*\(\s*([^,]+),\s*\[([\s\S]*?)\]\s*,\s*([^,]+)/g;
let dmM;
while ((dmM = dmRegex.exec(code)) !== null) {
  const graphicsVar = dmM[1].trim();
  const matrixContent = dmM[2];
  const paletteArg = dmM[3].trim();
  const lineNum = code.slice(0, dmM.index).split('\n').length;
  drawMatrixCalls.push({
    line: lineNum,
    graphics: graphicsVar,
    matrixContent: matrixContent,
    palette: paletteArg
  });
}

console.log(`Total drawMatrix calls found in entire game.js: ${drawMatrixCalls.length}`);

// Inspect palette dictionaries used in drawMatrix calls
const palettesUsedInDrawMatrix = new Set();
drawMatrixCalls.forEach(c => palettesUsedInDrawMatrix.add(c.palette));
console.log('Palettes passed to drawMatrix:', Array.from(palettesUsedInDrawMatrix));

// Check multi-character keys in any palette passed to drawMatrix
let multiCharMatrixTokens = [];
palettesUsedInDrawMatrix.forEach(palName => {
  if (palName.startsWith('{')) {
    // Inline palette
    const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
    let km;
    while ((km = keyRegex.exec(palName)) !== null) {
      const k = km[1] || km[2] || km[3];
      if (k.length !== 1) {
        multiCharMatrixTokens.push({ palette: 'inline', key: k });
      }
    }
  } else {
    // Look for palette definition in code: const palName = { ... }
    const defRegex = new RegExp(`(?:const|let|var)\\s+${palName}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
    const defM = defRegex.exec(code);
    if (defM) {
      const palBody = defM[1];
      const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
      let km;
      while ((km = keyRegex.exec(palBody)) !== null) {
        const k = km[1] || km[2] || km[3];
        if (k.length !== 1) {
          multiCharMatrixTokens.push({ palette: palName, key: k });
        }
      }
    }
  }
});

console.log('Multi-char tokens in drawMatrix palettes:', multiCharMatrixTokens);

console.log('\n--- 3. MATRIX ROW LENGTH CONSISTENCY CHECK ---');
let rowErrors = [];
drawMatrixCalls.forEach((dm, index) => {
  // Extract string rows
  const rowRegex = /'([^']*)'|"([^"]*)"/g;
  let rm;
  let rows = [];
  while ((rm = rowRegex.exec(dm.matrixContent)) !== null) {
    rows.push(rm[1] !== undefined ? rm[1] : rm[2]);
  }

  if (rows.length > 0) {
    const expectedLen = rows[0].length;
    rows.forEach((r, rIdx) => {
      if (r.length !== expectedLen) {
        rowErrors.push({
          callIndex: index + 1,
          line: dm.line,
          palette: dm.palette,
          row: rIdx,
          expectedLen: expectedLen,
          actualLen: r.length,
          content: r
        });
      }
    });
  }
});

if (rowErrors.length === 0) {
  console.log('=> PASSED: Every matrix row string matches expected grid width across ALL drawMatrix calls!');
} else {
  console.error('=> FAILED: Row length mismatches found:', rowErrors);
}
