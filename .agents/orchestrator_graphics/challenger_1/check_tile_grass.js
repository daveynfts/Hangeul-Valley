const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const matches = [];
const regex = /'tile_grass'/g;
let match;
while ((match = regex.exec(code)) !== null) {
  matches.push(match.index);
}
console.log(`Occurrences of 'tile_grass': ${matches.length}`);

lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes("'tile_grass'")) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
