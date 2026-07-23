const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const modalCloseFunctions = [
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

modalCloseFunctions.forEach(fn => {
  const matches = [...html.matchAll(new RegExp(`(?:onclick=["'][^"']*${fn}[^"']*["'])`, 'g'))];
  console.log(`\nFunction ${fn} referenced in index.html onclick: ${matches.length} times`);
  matches.forEach(m => console.log(`  ${m[0]}`));
});
