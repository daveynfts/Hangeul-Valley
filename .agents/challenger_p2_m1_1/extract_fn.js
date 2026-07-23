const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

function extractFunction(name) {
  const idx = gameJs.indexOf(name);
  if (idx === -1) return null;
  // find starting brace
  const startBrace = gameJs.indexOf('{', idx);
  let depth = 1;
  let end = startBrace + 1;
  while (end < gameJs.length && depth > 0) {
    if (gameJs[end] === '{') depth++;
    else if (gameJs[end] === '}') depth--;
    end++;
  }
  return gameJs.substring(idx, end);
}

console.log('=== generateTilemapTextures ===');
const tilemapFn = extractFunction('generateTilemapTextures');
console.log(tilemapFn ? tilemapFn.substring(0, 2000) : 'NOT FOUND');

console.log('=== _genFishingTextures ===');
const fishingFn = extractFunction('_genFishingTextures');
console.log(fishingFn ? fishingFn.substring(0, 3000) : 'NOT FOUND');
