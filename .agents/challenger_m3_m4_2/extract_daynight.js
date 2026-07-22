const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

console.log('=== LINES 1000 - 1030 ===');
for (let i = 999; i < 1030 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
