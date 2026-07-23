const fs = require('fs');
const game = fs.readFileSync('game.js', 'utf8');

['shop-close-btn', 'trophy-close-btn', 'level-select-overlay', 'hideLevelSelect'].forEach(id => {
  const matches = [...game.matchAll(new RegExp(id, 'g'))];
  console.log(`\nOccurrence count for ${id}: ${matches.length}`);
  matches.forEach(m => {
    const idx = m.index;
    console.log(`  Line around idx ${idx}: ${game.substring(idx - 30, idx + 100).replace(/\n/g, ' ')}`);
  });
});
