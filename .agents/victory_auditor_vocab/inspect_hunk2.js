const fs = require('fs');
const lines = fs.readFileSync('game.js', 'utf8').split('\n');
console.log('--- Lines 6315 to 6375 of game.js ---');
for (let i = 6314; i < 6375; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
