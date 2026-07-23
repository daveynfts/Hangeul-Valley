const fs = require('fs');

const gameJs = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = gameJs.split('\n');

console.log('=== DOM NAVIGATION ASSUMPTIONS SEARCH ===');

lines.forEach((line, idx) => {
  const lineNo = idx + 1;
  const match = line.match(/(children|parentElement|parentNode|firstElementChild|lastElementChild|nextElementSibling|previousElementSibling|closest|querySelector)/);
  if (match) {
    // Filter to see if it's operating on HUD elements
    if (line.includes('hud') || line.includes('banner') || line.includes('progress') || line.includes('buff') || line.includes('gold') || line.includes('btn') || line.includes('memory') || line.includes('trophy') || line.includes('duel') || line.includes('lb')) {
      console.log(`Line ${lineNo}: ${line.trim()}`);
    }
  }
});
