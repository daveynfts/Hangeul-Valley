const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

console.log('--- Lines 2592 to 2605 ---');
for (let i = 2592; i <= 2605; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
