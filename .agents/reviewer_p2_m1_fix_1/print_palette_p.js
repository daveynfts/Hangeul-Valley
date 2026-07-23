const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

console.log('--- Lines 2700 to 2810 ---');
for (let i = 2700; i <= 2810; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
