const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

console.log('--- Lines 6475 - 6515 ---');
for (let i = 6474; i < 6515 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
