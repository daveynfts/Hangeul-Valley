const fs = require('fs');

function checkCalls(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`CHECKING PIXEL ART CALLS IN: ${filePath}`);
  console.log(`========================================\n`);

  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('PixelArtRenderer') || line.includes('generateAllTextures')) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

checkCalls('game.js');
checkCalls('assets/game.js');
