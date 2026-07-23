const fs = require('fs');
const game = fs.readFileSync('game.js', 'utf8');

const modalDetails = [
  { id: 'level-select-overlay', open: 'showLevelSelect', close: 'hideLevelSelect' },
  { id: 'shop-overlay', open: 'openShop', close: 'closeShop' },
  { id: 'fish-album-overlay', open: 'openFishAlbum', close: 'closeFishAlbum' },
  { id: 'memory-overlay', open: 'openMemoryGame', close: 'closeMemoryGame' },
  { id: 'trophy-overlay', open: 'openTrophies', close: 'closeTrophies' },
  { id: 'duel-overlay', open: 'openSpellDuel', close: 'closeSpellDuel' },
  { id: 'recipe-overlay', open: 'openRecipeBook', close: 'closeRecipeBook' },
  { id: 'pet-overlay', open: 'openPetOverlay', close: 'closePetOverlay' },
  { id: 'seasonal-overlay', open: 'openSeasonalOverlay', close: 'closeSeasonalOverlay' },
  { id: 'leaderboard-overlay', open: 'openLeaderboard', close: 'closeLeaderboard' }
];

modalDetails.forEach(m => {
  console.log(`\n=================== ${m.id} ===================`);
  
  // Find open function code snippet
  const openIdx = game.indexOf(m.open);
  if (openIdx !== -1) {
    const openSnippet = game.substring(openIdx, openIdx + 400);
    console.log(`[OPEN] Snippet (${m.open}):`);
    console.log(openSnippet.substring(0, 250).replace(/\n/g, ' '));
    console.log(`  Calls setModalState: ${openSnippet.includes(`setModalState('${m.id}', true)`) || openSnippet.includes(`setModalState("${m.id}", true)`)}`);
  } else {
    console.log(`[OPEN] ${m.open} NOT FOUND`);
  }

  // Find close function code snippet
  const closeIdx = game.indexOf(m.close);
  if (closeIdx !== -1) {
    const closeSnippet = game.substring(closeIdx, closeIdx + 400);
    console.log(`[CLOSE] Snippet (${m.close}):`);
    console.log(closeSnippet.substring(0, 250).replace(/\n/g, ' '));
    console.log(`  Calls setModalState: ${closeSnippet.includes(`setModalState('${m.id}', false)`) || closeSnippet.includes(`setModalState("${m.id}", false)`)}`);
  } else {
    console.log(`[CLOSE] ${m.close} NOT FOUND`);
  }
});
