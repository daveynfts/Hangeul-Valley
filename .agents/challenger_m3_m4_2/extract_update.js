const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

console.log('=== LINES 1825 - 2020 (PROXIMITY & INTERACTION) ===');
for (let i = 1824; i < 2020 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
