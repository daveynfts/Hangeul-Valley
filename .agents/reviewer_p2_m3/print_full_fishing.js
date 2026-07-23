const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const idx = code.indexOf('static _genFishingTextures(');
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
const body = code.slice(idx, pos + 1);
console.log(body);
