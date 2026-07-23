const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Search for functions or methods with "decor" or "Decor"
const lines = gameJs.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('decor') || line.includes('Decor') || line.includes('DECOR')) {
    console.log(`Line ${idx+1}: ${line.trim()}`);
  }
});
