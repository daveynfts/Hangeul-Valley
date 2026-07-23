const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

const lines = content.split('\n');
console.log('=== FARMSCENE CREATE METHOD (lines 3380 to 3795) ===');
for (let i = 3379; i < 3795; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}
