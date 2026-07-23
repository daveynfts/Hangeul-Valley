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
  'hideLevelSelect',
  'showFishAlbum',
  'openFishAlbum',
  'showRecipeBook',
  'openRecipeBook',
  'showPetOverlay',
  'openPetOverlay',
  'showSeasonalOverlay',
  'openSeasonalOverlay',
  'showLeaderboard',
  'openLeaderboard',
  'showShop',
  'openShop',
  'showMemoryGame',
  'openMemoryGame',
  'showSpellDuel',
  'openSpellDuel',
  'showTrophies',
  'openTrophies',
  'showLevelSelect'
];

targets.forEach(t => {
  const matches = [...game.matchAll(new RegExp(`(?:window\\.)?${t}\\s*[:=]\\s*(?:function|\\()`, 'g'))];
  if (matches.length > 0) {
    console.log(`\nFound definition for ${t}:`);
    matches.forEach(m => {
      const idx = m.index;
      console.log(game.substring(idx, idx + 150).replace(/\n/g, ' '));
    });
  } else {
    // Check normal function decl
    const declMatches = [...game.matchAll(new RegExp(`function\\s+${t}\\s*\\(`, 'g'))];
    if (declMatches.length > 0) {
      console.log(`\nFound function declaration for ${t}:`);
      declMatches.forEach(m => {
        const idx = m.index;
        console.log(game.substring(idx, idx + 150).replace(/\n/g, ' '));
      });
    }
  }
});
