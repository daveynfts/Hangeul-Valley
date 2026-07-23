const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('generateAllTextures') || line.includes('generateTilemapTextures')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
