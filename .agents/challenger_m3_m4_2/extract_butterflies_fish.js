const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

console.log('=== LINES 1444 - 1475 ===');
for (let i = 1443; i < 1475 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}

console.log('\n=== LINES 1601 - 1650 ===');
for (let i = 1600; i < 1650 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
