const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('_drawWorld') || line.includes('drawWorld')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
