const fs = require('fs');
const game = fs.readFileSync('game.js', 'utf8');

const modalOverlays = [
  'level-select-overlay',
  'shop-overlay',
  'fish-album-overlay',
  'memory-overlay',
  'trophy-overlay',
  'duel-overlay',
  'recipe-overlay',
  'pet-overlay',
  'seasonal-overlay',
  'leaderboard-overlay'
];

console.log("=== CHECKING MODAL OPEN/CLOSE FUNCTIONS ===");

// Check each modal overlay function implementations
const functionsToCheck = [
  { id: 'shop-overlay', open: 'openShop', close: 'closeShop' },
  { id: 'fish-album-overlay', open: 'openFishAlbum', close: 'closeFishAlbum' },
  { id: 'memory-overlay', open: 'openMemoryGame', close: 'closeMemoryGame' },
  { id: 'trophy-overlay', open: 'openTrophies', close: 'closeTrophies' },
  { id: 'duel-overlay', open: 'openSpellDuel', close: 'closeSpellDuel' },
  { id: 'recipe-overlay', open: 'openRecipeBook', close: 'closeRecipeBook' },
  { id: 'pet-overlay', open: 'openPetOverlay', close: 'closePetOverlay' },
  { id: 'seasonal-overlay', open: 'openSeasonalOverlay', close: 'closeSeasonalOverlay' },
  { id: 'leaderboard-overlay', open: 'openLeaderboard', close: 'closeLeaderboard' },
  { id: 'level-select-overlay', open: 'showLevelSelect', close: 'hideLevelSelect' }
];

functionsToCheck.forEach(item => {
  const openRegex = new RegExp(`function\\s+${item.open}\\s*\\([\\s\\S]*?^\\}`, 'm');
  const closeRegex = new RegExp(`function\\s+${item.close}\\s*\\([\\s\\S]*?^\\}`, 'm');
  
  const openMatch = game.match(openRegex);
  const closeMatch = game.match(closeRegex);

  console.log(`\nModal: ${item.id}`);
  if (openMatch) {
    const usesSetModalState = openMatch[0].includes('setModalState');
    console.log(`  ${item.open}: ${usesSetModalState ? 'YES' : 'NO (MISSING setModalState)'}`);
  } else {
    console.log(`  ${item.open}: NOT FOUND`);
  }

  if (closeMatch) {
    const usesSetModalState = closeMatch[0].includes('setModalState');
    console.log(`  ${item.close}: ${usesSetModalState ? 'YES' : 'NO (MISSING setModalState)'}`);
  } else {
    console.log(`  ${item.close}: NOT FOUND`);
  }
});
