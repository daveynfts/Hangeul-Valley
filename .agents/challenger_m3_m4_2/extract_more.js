const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

console.log('=== LINES 1000 - 1040 (DAY NIGHT OVERLAY) ===');
for (let i = 999; i < 1040 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}

console.log('\n=== LINES 1445 - 1600 (BUTTERFLIES, PORTAL, DOCK) ===');
for (let i = 1444; i < 1600 && i < lines.length; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
