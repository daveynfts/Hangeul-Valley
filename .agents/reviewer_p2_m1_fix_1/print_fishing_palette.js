const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

console.log('--- Lines 2600 to 2700 ---');
for (let i = 2600; i <= 2700; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
