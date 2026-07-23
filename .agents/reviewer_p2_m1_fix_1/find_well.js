const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('stone_well')) {
        console.log(`Line ${idx + 1}: ${line}`);
    }
});

