const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

const target = 'static _genFishingTextures';
const idx = gameJs.indexOf(target);
const start = gameJs.indexOf('{', idx);
let depth = 1;
let end = start + 1;
while (end < gameJs.length && depth > 0) {
  if (gameJs[end] === '{') depth++;
  else if (gameJs[end] === '}') depth--;
  end++;
}
const body = gameJs.substring(idx, end);

const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
let match;
let count = 0;
while ((match = arrayRegex.exec(body)) !== null) {
  try {
    const arr = new Function('return ' + match[0])();
    if (Array.isArray(arr) && arr.length > 0 && arr.every(item => typeof item === 'string')) {
      count++;
      const lineNo = gameJs.substring(0, idx + match.index).split('\n').length;
      console.log(`\n--- Matrix #${count} at line ${lineNo} ---`);
      arr.forEach((row, r) => {
        if (row.length !== 16) {
          console.log(`  Line ${r+1}: len=${row.length} (Expected 16) -> "${row}"`);
        } else {
          console.log(`  Line ${r+1}: len=${row.length}`);
        }
      });
    }
  } catch (e) {}
}
