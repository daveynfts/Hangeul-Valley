const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

console.log('--- Lines 2948 to 3000 ---');
for (let i = 2948; i <= 3000; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
