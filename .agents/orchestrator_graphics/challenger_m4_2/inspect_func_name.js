const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

console.log('--- Lines 6460 - 6475 ---');
for (let i = 6459; i < 6475 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
