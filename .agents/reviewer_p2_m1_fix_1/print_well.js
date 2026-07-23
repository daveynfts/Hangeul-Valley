const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

console.log('--- Lines 5410 to 5490 ---');
for (let i = 5410; i <= 5490; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
