const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');
const lines = gameJs.split('\n');

console.log('--- Lines 2905 to 2935 of game.js ---');
lines.slice(2904, 2935).forEach((l, i) => {
  console.log(`${2905 + i}: ${l}`);
});
