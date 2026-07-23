const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

console.log('--- Lines 2800 to 2950 ---');
for (let i = 2800; i <= 2950; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
