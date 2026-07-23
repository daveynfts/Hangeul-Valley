const fs = require('fs');
const game = fs.readFileSync('game.js', 'utf8');

const targets = [
  'closeFishAlbum',
  'closeRecipeBook',
  'closePetOverlay',
  'closeSeasonalOverlay',
  'closeLeaderboard',
  'closeShop',
  'closeMemoryGame',
  'closeSpellDuel',
  'closeTrophies',
  'hideLevelSelect'
];

targets.forEach(t => {
  const idx = game.indexOf(t);
  if (idx !== -1) {
    console.log(`\n=== FOUND ${t} at pos ${idx} ===`);
    console.log(game.substring(idx - 50, idx + 200));
  } else {
    console.log(`\n=== NOT FOUND ${t} ===`);
  }
});
