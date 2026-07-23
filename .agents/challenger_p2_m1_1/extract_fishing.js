const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

const target = 'static _genFishingTextures';
const idx = gameJs.indexOf(target);
console.log('Index of static _genFishingTextures:', idx);
if (idx !== -1) {
  const startBrace = gameJs.indexOf('{', idx);
  let depth = 1;
  let end = startBrace + 1;
  while (end < gameJs.length && depth > 0) {
    if (gameJs[end] === '{') depth++;
    else if (gameJs[end] === '}') depth--;
    end++;
  }
  console.log('--- _genFishingTextures source ---');
  console.log(gameJs.substring(idx, Math.min(idx + 4000, end)));
}
