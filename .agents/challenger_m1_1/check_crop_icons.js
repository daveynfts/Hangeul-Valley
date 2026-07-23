const fs = require('fs');

function checkCropIcons(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`CHECKING CROP_ICONS & EMOJI TEXT IN: ${filePath}`);
  console.log(`========================================\n`);

  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('CROP_ICONS')) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
}

checkCropIcons('game.js');
checkCropIcons('assets/game.js');
