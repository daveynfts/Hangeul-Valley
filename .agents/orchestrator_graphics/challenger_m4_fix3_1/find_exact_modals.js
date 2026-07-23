const fs = require('fs');
const game = fs.readFileSync('game.js', 'utf8');
const lines = game.split('\n');

function findFunc(name) {
  console.log(`\n================ SEARCH: ${name} ================`);
  lines.forEach((line, idx) => {
    if (line.includes(name) && (line.includes('function') || line.includes('='))) {
      console.log(`Line ${idx + 1}: ${line.substring(0, 120)}`);
      for (let j = idx; j < Math.min(idx + 15, lines.length); j++) {
        console.log(`  L${j + 1}: ${lines[j]}`);
        if (lines[j].includes('}') && j > idx + 1) break;
      }
    }
  });
}

findFunc('openFishAlbum');
findFunc('closeFishAlbum');
findFunc('openRecipeBook');
findFunc('closeRecipeBook');
findFunc('openPetOverlay');
findFunc('closePetOverlay');
findFunc('openSeasonalOverlay');
findFunc('closeSeasonalOverlay');
findFunc('openLeaderboard');
findFunc('closeLeaderboard');
findFunc('openMemoryGame');
findFunc('closeMemoryGame');
findFunc('openSpellDuel');
findFunc('closeSpellDuel');
findFunc('openTrophies');
findFunc('closeTrophies');
