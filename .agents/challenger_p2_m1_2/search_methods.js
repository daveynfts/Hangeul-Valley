const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = gameCode.split('\n');

console.log('Searching for method definitions matching _gen or Decor or Fish...');
lines.forEach((line, idx) => {
  if (line.includes('_gen') || line.includes('Decor') || line.includes('Texture') || line.includes('stone_well')) {
    if (line.includes('static') || line.includes('function') || line.includes('(')) {
      console.log(`Line ${idx+1}: ${line.trim()}`);
    }
  }
});
