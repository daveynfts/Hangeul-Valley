const fs = require('fs');
const content = fs.readFileSync('C:/VibeCode/Hangeul Valley/game.js', 'utf8');
const lines = content.split('\n');
let currentClass = '';
lines.forEach((l, i) => {
  if (l.includes('class ')) currentClass = l.trim();
  if (l.includes('update(') || l.includes('update (')) {
    console.log(`Line ${i+1} [${currentClass}]: ${l.trim()}`);
  }
});
