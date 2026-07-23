const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

console.log('--- Lines 7035 - 7070 ---');
for (let i = 7034; i < 7070 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
