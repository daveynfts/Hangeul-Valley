const fs = require('fs');

const gameJsContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const findOccurrences = (target) => {
  console.log(`\n=== All occurrences for '${target}' ===`);
  let pos = 0;
  while ((pos = gameJsContent.indexOf(target, pos)) !== -1) {
    const start = Math.max(0, pos - 100);
    const end = Math.min(gameJsContent.length, pos + 200);
    console.log(`[Pos ${pos}] ...${gameJsContent.substring(start, end).replace(/\s+/g, ' ')}...`);
    pos += target.length;
  }
};

findOccurrences('vocab-btn');
findOccurrences('vocabBtn');
findOccurrences('hud-menu-btn');
findOccurrences('hudMenuBtn');
findOccurrences('shop-btn');
findOccurrences('shopBtn');
