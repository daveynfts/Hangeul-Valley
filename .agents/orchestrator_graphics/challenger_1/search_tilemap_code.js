const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');
console.log('=== Searching for Tilemap & Texture usage in game.js ===');
lines.forEach((line, idx) => {
  if (/tilemap|tileset|addTilesetImage|createLayer|createBlankLayer|putTileAt|createFromTiles/i.test(line)) {
    console.log(`${idx + 1}: ${line.trim().substring(0, 120)}`);
  }
});
