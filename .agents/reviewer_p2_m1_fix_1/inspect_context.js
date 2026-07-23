const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const targetIndex = 194056;
const startLine = code.substring(0, targetIndex).split('\n').length;

console.log(`DECOR_PALETTE is at line ${startLine}`);

// Let's get the enclosing function or Phaser scene method around line 194056
const lines = code.split('\n');
console.log('--- Lines around 194056 (lines ' + (startLine - 30) + ' to ' + (startLine + 20) + ') ---');
for (let i = startLine - 30; i < startLine + 20; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}
