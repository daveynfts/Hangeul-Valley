const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

lines.forEach((line, idx) => {
    if (
        line.includes('#hud {') ||
        line.includes('#event-banner {') ||
        line.includes('#progress-bar-wrap {') ||
        line.includes('#hud-actions-group') ||
        line.includes('#hud-overflow-menu {') ||
        line.includes('#hud-status-group') ||
        line.includes('#hud-currency-group') ||
        line.includes('.hud-group') ||
        line.includes('.hud-btn')
    ) {
        console.log(`Line ${idx + 1}:`);
        console.log(lines.slice(idx, idx + 25).join('\n'));
        console.log('---');
    }
});
