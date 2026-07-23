const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
    if (
        line.includes('id="hud"') ||
        line.includes('id="event-banner"') ||
        line.includes('id="progress-bar-wrap"') ||
        line.includes('hud-overflow-menu') ||
        line.includes('Press Start 2P') ||
        line.includes('.glass-hud')
    ) {
        console.log(`Line ${idx + 1}: ${line.trim().substring(0, 120)}`);
    }
});
