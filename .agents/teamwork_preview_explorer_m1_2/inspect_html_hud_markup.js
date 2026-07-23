const fs = require('fs');

const indexHtml = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');
const lines = indexHtml.split('\n');

console.log('=== INDEX.HTML HUD MARKUP (SEARCHING FOR #hud) ===');
lines.forEach((line, idx) => {
  if (line.includes('id="hud"') || line.includes('id="event-banner"') || line.includes('id="progress-bar-wrap"')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});

// Print around where #hud is defined
const hudLineIdx = lines.findIndex(l => l.includes('id="hud"'));
if (hudLineIdx !== -1) {
  for (let i = Math.max(0, hudLineIdx - 10); i < Math.min(lines.length, hudLineIdx + 60); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
