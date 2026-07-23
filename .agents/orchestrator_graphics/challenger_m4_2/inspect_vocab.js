const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

console.log('--- Lines 3590 - 3610 ---');
for (let i = 3589; i < 3610 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
