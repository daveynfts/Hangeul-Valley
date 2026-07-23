const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

console.log('=== SCRIPTS SEARCH (toggleHudOverflow) ===');
lines.forEach((line, idx) => {
    if (line.includes('toggleHudOverflow')) {
        console.log(`Line ${idx + 1}: ${line}`);
        console.log(lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 20)).join('\n'));
        console.log('---');
    }
});
