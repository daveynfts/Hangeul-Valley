const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

console.log('game.js length:', gameJs.length);

// Find function definitions or methods matching tilemap, decor, fishing
const matches = gameJs.match(/(function\s+\w+|\w+\s*\([^)]*\)\s*\{|generate\w+|_gen\w+|\w+Tilemap\w*|\w+Decor\w*|\w+Fishing\w*)/g);

// Let's search specifically for generateTilemapTextures and _genFishingTextures
const tilemapIdx = gameJs.indexOf('generateTilemapTextures');
console.log('generateTilemapTextures idx:', tilemapIdx);

const fishingIdx = gameJs.indexOf('_genFishingTextures');
console.log('_genFishingTextures idx:', fishingIdx);
