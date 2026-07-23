const fs = require('fs');
const path = require('path');

const projDir = 'C:/VibeCode/Hangeul Valley';
const htmlCode = fs.readFileSync(path.join(projDir, 'index.html'), 'utf8');
const gameCode = fs.readFileSync(path.join(projDir, 'game.js'), 'utf8');

console.log("=== HTML OVERLAYS & MODALS ===");
const idRegex = /id=["']([^"']*overlay[^"']*)["']/gi;
let match;
while ((match = idRegex.exec(htmlCode)) !== null) {
  console.log("Found modal ID in HTML:", match[1]);
}

console.log("\n=== DEPTH SORTING IN GAME.JS ===");
const depthLines = gameCode.split('\n').filter(l => l.includes('depth') || l.includes('setDepth') || l.includes('depthSort'));
console.log("Total depth-related lines found:", depthLines.length);
depthLines.slice(0, 20).forEach((l, i) => console.log(`${i+1}: ${l.trim()}`));

console.log("\n=== SEARCHING MINIGAME OVERLAY HTML IDS ===");
const minigameIds = ['arcade', 'spell', 'cook', 'mini', 'game'];
minigameIds.forEach(kw => {
  const m = htmlCode.match(new RegExp(`id=["'][^"']*${kw}[^"']*["']`, 'gi'));
  console.log(`Keyword '${kw}':`, m);
});
