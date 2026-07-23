const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');
const lines = gameJs.split('\n');

for (let i = 5410; i >= 0; i--) {
  if (lines[i].includes('function') || lines[i].includes('static') || lines[i].includes('{')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
    if (lines[i].includes('function') || lines[i].includes('static')) {
      break;
    }
  }
}
