const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

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
  return { name, body: gameJs.substring(idx, end), startLine: gameJs.substring(0, idx).split('\n').length };
}

function verifyPaletteSingleCharKeys(fnInfo) {
  const objRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(\{[\s\S]*?\n\s*\});/g;
  let match;
  let objectCount = 0;
  let totalKeys = 0;
  let invalidKeys = [];

  while ((match = objRegex.exec(fnInfo.body)) !== null) {
    const varName = match[1];
    const objStr = match[2];
    try {
      const obj = new Function('return ' + objStr)();
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        objectCount++;
        const keys = Object.keys(obj);
        totalKeys += keys.length;
        keys.forEach(k => {
          if (k.length !== 1) {
            invalidKeys.push({ varName, key: k, length: k.length });
          }
        });
      }
    } catch (e) {}
  }
  return { fnName: fnInfo.name, objectCount, totalKeys, invalidKeys };
}

console.log('--- 1c. SINGLE-CHARACTER PALETTE TOKENS CHECK ---');

const tilemapFn = getFnBlock('static generateTilemapTextures');
if (tilemapFn) {
  const res = verifyPaletteSingleCharKeys(tilemapFn);
  console.log(`generateTilemapTextures: found ${res.objectCount} palette objects, ${res.totalKeys} keys total.`);
  if (res.invalidKeys.length > 0) {
    console.log(`❌ Invalid keys (len != 1):`, res.invalidKeys);
  } else {
    console.log('✅ All palette keys in generateTilemapTextures have length === 1.');
  }
}

const fishingFn = getFnBlock('static _genFishingTextures');
if (fishingFn) {
  const res = verifyPaletteSingleCharKeys(fishingFn);
  console.log(`_genFishingTextures: found ${res.objectCount} palette objects, ${res.totalKeys} keys total.`);
  if (res.invalidKeys.length > 0) {
    console.log(`❌ Invalid keys (len != 1):`, res.invalidKeys);
  } else {
    console.log('✅ All palette keys in _genFishingTextures have length === 1.');
  }
}
