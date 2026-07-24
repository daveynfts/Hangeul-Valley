const fs = require('fs');
const lines = fs.readFileSync('game.js', 'utf8').split('\n');
console.log('--- Lines 6340 to 6375 ---');
for (let i = 6340; i < 6375; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
