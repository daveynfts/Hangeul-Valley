const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Function to extract AST or parse array literals in specified functions
function scanMatricesInFunction(funcName, sourceCode) {
  const idx = sourceCode.indexOf(funcName);
  if (idx === -1) {
    console.log(`Function ${funcName} not found!`);
    return [];
  }
  const startBrace = sourceCode.indexOf('{', idx);
  let depth = 1;
  let end = startBrace + 1;
  while (end < sourceCode.length && depth > 0) {
    if (sourceCode[end] === '{') depth++;
    else if (sourceCode[end] === '}') depth--;
    end++;
  }
  const body = sourceCode.substring(idx, end);

  // Extract all array literals of strings
  const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
  let match;
  const results = [];
  while ((match = arrayRegex.exec(body)) !== null) {
    try {
      const arr = new Function('return ' + match[0])();
      if (Array.isArray(arr) && arr.length > 0 && arr.every(item => typeof item === 'string')) {
        // Calculate line number relative to game.js
        const lineNo = sourceCode.substring(0, idx + match.index).split('\n').length;
        results.push({ lineNo, arr });
      }
    } catch (e) {
      // Ignore invalid JS
    }
  }
  return results;
}

console.log('--- SCANNING TILEMAP MATRICES ---');
const tilemapMats = scanMatricesInFunction('generateTilemapTextures', gameJs);
console.log(`Found ${tilemapMats.length} matrices in generateTilemapTextures`);
let tilemapErrors = 0;
tilemapMats.forEach((m, idx) => {
  const expectedLen = m.arr.length;
  m.arr.forEach((row, r) => {
    if (row.length !== expectedLen) {
      console.log(`Mismatch in generateTilemapTextures matrix #${idx+1} at line ${m.lineNo}, row ${r+1}: row.length=${row.length}, expected=${expectedLen}`);
      tilemapErrors++;
    }
  });
});
if (tilemapErrors === 0) console.log('All tilemap matrices PASS row width check!');

console.log('\n--- SCANNING FISHING MATRICES ---');
const fishingMats = scanMatricesInFunction('static _genFishingTextures', gameJs);
console.log(`Found ${fishingMats.length} matrices in _genFishingTextures`);
let fishingErrors = 0;
fishingMats.forEach((m, idx) => {
  const expectedLen = m.arr.length;
  m.arr.forEach((row, r) => {
    if (row.length !== expectedLen) {
      console.log(`Mismatch in _genFishingTextures matrix #${idx+1} at line ${m.lineNo}, row ${r+1}: row.length=${row.length}, expected=${expectedLen}`);
      fishingErrors++;
    }
  });
});
if (fishingErrors === 0) console.log('All fishing matrices PASS row width check!');

console.log('\n--- SCANNING DECOR MATRICES ---');
// Decor matrices inside _bakeTextures or around DECOR_PALETTE
const decorIdx = gameJs.indexOf('DECOR_PALETTE');
const decorBody = gameJs.substring(decorIdx - 200, decorIdx + 15000);
const decorMats = [];
const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
let match;
while ((match = arrayRegex.exec(decorBody)) !== null) {
  try {
    const arr = new Function('return ' + match[0])();
    if (Array.isArray(arr) && arr.length > 0 && arr.every(item => typeof item === 'string')) {
      const lineNo = gameJs.substring(0, decorIdx - 200 + match.index).split('\n').length;
      decorMats.push({ lineNo, arr });
    }
  } catch (e) {}
}
console.log(`Found ${decorMats.length} decor matrices`);
let decorErrors = 0;
decorMats.forEach((m, idx) => {
  const expectedLen = m.arr.length;
  m.arr.forEach((row, r) => {
    if (row.length !== expectedLen) {
      console.log(`Mismatch in decor matrix #${idx+1} at line ${m.lineNo}, row ${r+1}: row.length=${row.length}, expected=${expectedLen}`);
      decorErrors++;
    }
  });
});
if (decorErrors === 0) console.log('All decor matrices PASS row width check!');
