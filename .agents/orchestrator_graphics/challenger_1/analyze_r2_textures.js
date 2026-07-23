const fs = require('fs');

const code = fs.readFileSync('game.js', 'utf8');

// Find generateTilemapTextures method
const startIndex = code.indexOf('static generateTilemapTextures(scene)');
const endIndex = code.indexOf('static _genPlayerTextures(scene)', startIndex);

const tilemapBlock = code.substring(startIndex, endIndex);

const keys = [];
const regex = /makeTile\(\s*['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(tilemapBlock)) !== null) {
  keys.push(match[1]);
}

console.log('Total makeTile keys found in generateTilemapTextures:', keys.length);
console.log('Keys list:');
keys.forEach((k, i) => console.log(`${i + 1}. ${k}`));
