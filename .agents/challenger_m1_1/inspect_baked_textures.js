const fs = require('fs');

function findTextures(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`TEXTURE GENERATIONS IN: ${filePath}`);
  console.log(`========================================\n`);

  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('generateTexture')) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

findTextures('game.js');
findTextures('assets/game.js');
