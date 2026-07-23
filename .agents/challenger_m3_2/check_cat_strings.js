const fs = require('fs');

const content = fs.readFileSync('game.js', 'utf8');
const lines = content.split('\n');

console.log('=== All Cat String References in game.js ===');
lines.forEach((line, idx) => {
    if (/cat/i.test(line)) {
        // filter for user-facing strings or text assignments
        if (line.includes('add.text') || line.includes('lbl=') || line.includes('vi:') || line.includes('dialog') || line.includes('Ginger') || line.includes('Cat')) {
            console.log(`L${idx+1}: ${line.trim()}`);
        }
    }
});
