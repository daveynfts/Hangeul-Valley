const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('#hud {') || line.includes('#progress-bar-wrap {')) {
        console.log(`Line ${idx + 1}: ${line}`);
        console.log(lines.slice(idx, idx + 18).join('\n'));
        console.log('===');
    }
});
