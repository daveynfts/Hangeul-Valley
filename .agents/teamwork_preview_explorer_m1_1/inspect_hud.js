const fs = require('fs');
const path = require('path');

const htmlPath = 'C:\\VibeCode\\Hangeul Valley\\index.html';
const gameJsPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

console.log("HTML file size:", htmlContent.length);
console.log("game.js file size:", gameJsContent.length);

// Search for element listeners in game.js for buttons in HUD
const idsToSearch = [
  'recipe-btn', 'pet-btn', 'seasonal-btn', 'leaderboard-btn', 'quest-btn',
  'save-btn', 'duel-btn', 'fish-album-btn', 'trophy-btn', 'shop-btn',
  'vocab-btn', 'hud-menu-btn', 'event-banner', 'eb-icon', 'eb-title',
  'eb-desc', 'eb-pts-val', 'progress-bar-wrap', 'progress-bar-bg', 'progress-bar-fill',
  'hud', 'hud-level', 'hud-sep', 'hud-progress', 'hud-gold', 'gold-val',
  'hud-gems', 'gems-val', 'hud-honor', 'honor-val', 'active-buff-bar'
];

idsToSearch.forEach(id => {
  const matches = [];
  const regex = new RegExp(`['"]${id}['"]`, 'g');
  let match;
  while ((match = regex.exec(gameJsContent)) !== null) {
    const start = Math.max(0, match.index - 100);
    const end = Math.min(gameJsContent.length, match.index + 150);
    matches.push(gameJsContent.substring(start, end).replace(/\s+/g, ' '));
  }
  console.log(`\n=== Listener search for ID '${id}' in game.js (${matches.length} occurrences) ===`);
  matches.forEach((m, idx) => console.log(`  [${idx+1}] ...${m}...`));
});
