const fs = require('fs');

const content = fs.readFileSync('game.js', 'utf8');
const lines = content.split('\n');

console.log('=== Finding methods ===');
lines.forEach((line, idx) => {
    if (line.includes('playPlayerAction(') || line.includes('_updateCatNPC(')) {
        console.log(`L${idx+1}: ${line.trim()}`);
    }
});
