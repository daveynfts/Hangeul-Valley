const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = gameCode.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Water') || line.includes('ocean_deep') || line.includes('water_foam')) {
    console.log(`Line ${idx+1}: ${line}`);
  }
});
