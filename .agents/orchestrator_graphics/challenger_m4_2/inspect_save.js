const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

console.log('--- Lines 2285 - 2305 ---');
for (let i = 2284; i < 2305 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
