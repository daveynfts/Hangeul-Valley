const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

console.log('=== LINES 3200 - 3220 ===');
for (let i = 3199; i < 3220 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
