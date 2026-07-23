const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

function checkMatrices(funcName, codeSnippet, lineOffset = 1) {
  const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
  let match;
  const results = [];
  let matrixCount = 0;
  let errorCount = 0;

  while ((match = arrayRegex.exec(codeSnippet)) !== null) {
    try {
      const arr = new Function('return ' + match[0])();
      if (Array.isArray(arr) && arr.length > 0 && arr.every(item => typeof item === 'string')) {
        matrixCount++;
        const lineNo = lineOffset + codeSnippet.substring(0, match.index).split('\n').length - 1;
        const height = arr.length;
        const width0 = arr[0].length;
        let uniform = true;
        const mismatchedRows = [];

        arr.forEach((row, idx) => {
          if (row.length !== width0) {
            uniform = false;
            mismatchedRows.push({ rowIdx: idx, length: row.length, expected: width0 });
          }
        });

        if (!uniform) {
          errorCount++;
          console.log(`❌ [FAIL] Non-uniform row length in ${funcName} matrix #${matrixCount} at line ${lineNo}:`);
          mismatchedRows.forEach(r => {
            console.log(`    Row ${r.rowIdx + 1} length=${r.length}, expected=${r.expected}`);
          });
        } else {
          results.push({ lineNo, height, width: width0 });
        }
      }
    } catch (e) {}
  }
  return { funcName, matrixCount, errorCount, results };
}

// Extract generateTilemapTextures
const tilemapIdx = gameJs.indexOf('generateTilemapTextures');
const tilemapEnd = gameJs.indexOf('}', gameJs.indexOf('static generateTilemapTextures') + 20); // rough block
// Better: get exact brace block
function getFnBlock(name) {
  const idx = gameJs.indexOf(name);
  if (idx === -1) return null;
  const start = gameJs.indexOf('{', idx);
  let depth = 1;
  let end = start + 1;
  while (end < gameJs.length && depth > 0) {
    if (gameJs[end] === '{') depth++;
    else if (gameJs[end] === '}') depth--;
    end++;
  }
  const lineNo = gameJs.substring(0, idx).split('\n').length;
  return { body: gameJs.substring(idx, end), lineNo };
}

console.log('=== MATRIX UNIFORMITY & DIMENSION CHECK ===');

const tilemapBlock = getFnBlock('static generateTilemapTextures');
if (tilemapBlock) {
  const r = checkMatrices('generateTilemapTextures', tilemapBlock.body, tilemapBlock.lineNo);
  console.log(`generateTilemapTextures: ${r.matrixCount} matrices checked, ${r.errorCount} row length errors.`);
  // Also check if all tilemap matrices are 16x16
  const non16 = r.results.filter(m => m.width !== 16 || m.height !== 16);
  if (non16.length > 0) {
    console.log(`⚠️ Tilemap non-16x16 matrices: ${non16.length}`);
  } else {
    console.log(`✅ All ${r.results.length} tilemap matrices are exactly 16x16.`);
  }
}

const fishingBlock = getFnBlock('static _genFishingTextures');
if (fishingBlock) {
  const r = checkMatrices('_genFishingTextures', fishingBlock.body, fishingBlock.lineNo);
  console.log(`_genFishingTextures: ${r.matrixCount} matrices checked, ${r.errorCount} row length errors.`);
  const non16 = r.results.filter(m => m.width !== 16 || m.height !== 16);
  if (non16.length > 0) {
    console.log(`⚠️ Fishing non-16x16 matrices: ${non16.length}`);
  } else {
    console.log(`✅ All ${r.results.length} fishing matrices are exactly 16x16.`);
  }
}

// Decor matrices inside _bakeTextures
const bakeBlock = getFnBlock('_bakeTextures');
if (bakeBlock) {
  const r = checkMatrices('_bakeTextures (Decor)', bakeBlock.body, bakeBlock.lineNo);
  console.log(`_bakeTextures (Decor): ${r.matrixCount} matrices checked, ${r.errorCount} row length errors.`);
}
