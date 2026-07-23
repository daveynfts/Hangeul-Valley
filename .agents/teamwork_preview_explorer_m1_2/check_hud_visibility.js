const fs = require('fs');

const gameJs = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = gameJs.split('\n');

console.log('=== SEARCHING FOR HUD VISIBILITY TOGGLES IN GAME.JS ===');

lines.forEach((line, idx) => {
  const lineNo = idx + 1;
  if (line.includes('hud.style.display') || line.includes('pbWrap.style.display') || line.includes('bannerEl.style.display') || line.includes("('hud')") || line.includes("('event-banner')") || line.includes("('progress-bar-wrap')")) {
    console.log(`Line ${lineNo}: ${line.trim()}`);
  }
});
