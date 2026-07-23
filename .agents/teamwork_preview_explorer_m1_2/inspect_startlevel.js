const fs = require('fs');

const gameJs = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = gameJs.split('\n');

console.log('=== LINES 3210 TO 3235 IN GAME.JS ===');
for (let i = 3209; i < 3235; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
