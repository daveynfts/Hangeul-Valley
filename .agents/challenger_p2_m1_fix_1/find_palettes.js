const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = code.split('\n');

console.log("Searching for PALETTE occurrences:");
lines.forEach((line, index) => {
  if (line.includes('DECOR_PALETTE') || line.includes('TILEMAP_PALETTE') || line.includes('STARDEW_PALETTE')) {
    console.log(`Line ${index + 1}: ${line.trim().slice(0, 100)}`);
  }
});
