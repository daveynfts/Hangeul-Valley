const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('showQuizOverlay')) {
    console.log(`L${idx+1}: ${l.trim()}`);
  }
});
