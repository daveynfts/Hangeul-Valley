const fs = require('fs');
const game = fs.readFileSync('game.js', 'utf8');
const lines = game.split('\n');

console.log("=== KEY DEFINITIONS SEARCH ===");
lines.forEach((l, i) => {
  if (l.includes('activeModalStack') || l.includes('setModalState') || l.includes('closeTopModal') || l.includes('STARDEW_PALETTE') || l.includes('PixelArtRenderer')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
