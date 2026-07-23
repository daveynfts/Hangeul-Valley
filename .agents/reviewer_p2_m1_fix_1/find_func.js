const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');
console.log('--- Lines 5300 to 5350 ---');
for (let i = 5300; i < 5350; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
}

// Search backward for function declaration before line 5410
for (let i = 5410; i >= 1; i--) {
    if (lines[i - 1].includes('function') || lines[i - 1].includes('preload') || lines[i - 1].includes('create')) {
        console.log(`Line ${i}: ${lines[i - 1]}`);
    }
}
