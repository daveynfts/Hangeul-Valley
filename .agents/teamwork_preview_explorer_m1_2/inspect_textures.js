const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '../../game.js');
const content = fs.readFileSync(gameJsPath, 'utf8');

const cropKeys = new Set();
const fishKeys = new Set();

const cropRegex = /['"`](crop_[a-zA-Z0-9_]+)['"`]/g;
const fishRegex = /['"`](fish_[a-zA-Z0-9_]+)['"`]/g;
const fishingRegex = /['"`](fishing_[a-zA-Z0-9_]+)['"`]/g;

let match;
while ((match = cropRegex.exec(content)) !== null) {
  cropKeys.add(match[1]);
}
while ((match = fishRegex.exec(content)) !== null) {
  fishKeys.add(match[1]);
}
while ((match = fishingRegex.exec(content)) !== null) {
  fishKeys.add(match[1]);
}

console.log('--- CROP KEYS ---');
console.log(Array.from(cropKeys).sort());

console.log('\n--- FISH KEYS ---');
console.log(Array.from(fishKeys).sort());
