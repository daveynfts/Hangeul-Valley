const fs = require('fs');

const gameJsContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Find all addEventListener on vocabBtn, hudMenuBtn, shopBtn, trophyBtn, saveBtn etc.
const snippet = (str, len = 300) => str.replace(/\s+/g, ' ');

['vocabBtn', 'hudMenuBtn', 'trophyBtn', 'shopBtn', 'saveBtn'].forEach(name => {
  const idx = gameJsContent.indexOf(name);
  if (idx !== -1) {
    console.log(`\n--- Context around '${name}' in game.js ---`);
    console.log(gameJsContent.substring(Math.max(0, idx - 50), Math.min(gameJsContent.length, idx + 400)));
  }
});
