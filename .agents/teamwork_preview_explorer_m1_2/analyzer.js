const fs = require('fs');

const gameJs = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const indexHtml = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');

console.log('=== DETAILED ANALYZER FOR GAME.JS HUD BINDINGS ===\n');

// 1. Functions touching HUD elements
const hudFunctions = [
  'updateHUD',
  'updateCurrencyHUD',
  'updateGoldHUD',
  'updateActiveBuffBar',
  'updateEventBannerHUD',
  'showToast',
  'saveAllGame',
  'openShop',
  'closeShop',
  'openRecipeBook',
  'closeRecipeBook',
  'openPetOverlay',
  'closePetOverlay',
  'openSeasonalOverlay',
  'closeSeasonalOverlay',
  'cycleSeasonalEvent',
  'openLeaderboard',
  'closeLeaderboard',
  'openQuestOverlay',
  'closeQuestOverlay',
  'openSpellDuel',
  'closeSpellDuel',
  'openFishAlbum',
  'closeFishAlbum',
  'openTrophies',
  'closeTrophies',
  'showLevelSelect'
];

hudFunctions.forEach(fn => {
  const regex = new RegExp(`function\\s+${fn}\\b|${fn}\\s*=\\s*function|window\\.${fn}\\s*=`, 'g');
  let match;
  let linesList = [];
  const lines = gameJs.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes(fn)) {
      linesList.push(idx + 1);
    }
  });
  console.log(`Function/Reference: "${fn}" | References on lines: ${linesList.join(', ')}`);
});

console.log('\n=== EVENT BANNER ANALYSIS IN GAME.JS ===');
const bannerLines = gameJs.split('\n').filter((l, i) => l.includes('event-banner') || l.includes('eb-') || l.includes('updateEventBannerHUD'));
bannerLines.forEach(l => console.log('  ', l.trim()));

console.log('\n=== ACTIVE BUFF BAR ANALYSIS IN GAME.JS ===');
const buffLines = gameJs.split('\n').filter((l, i) => l.includes('active-buff') || l.includes('activeBuffs') || l.includes('updateActiveBuffBar'));
buffLines.forEach(l => console.log('  ', l.trim()));
