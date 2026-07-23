const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Find all function declarations or static methods or method definitions in PixelArtRenderer / FarmScene / FishingScene / etc.
const fnRegex = /(?:static\s+)?(?:function\s+)?(_?\w+)\s*\([^)]*\)\s*\{/g;
let match;
const functions = [];
while ((match = fnRegex.exec(gameJs)) !== null) {
  if (match[1].toLowerCase().includes('texture') || 
      match[1].toLowerCase().includes('tilemap') || 
      match[1].toLowerCase().includes('decor') || 
      match[1].toLowerCase().includes('fish') ||
      match[1].toLowerCase().includes('matrix') ||
      match[1].toLowerCase().includes('palette')) {
    functions.push({ name: match[1], index: match.index });
  }
}

console.log('Found functions related to texture/tilemap/decor/fish/matrix/palette:', functions);

// Search for PALETTE definitions
const paletteRegex = /([A-Z0-9_]*PALETTE)\s*=\s*\{([^}]+)\}/g;
while ((match = paletteRegex.exec(gameJs)) !== null) {
  console.log('Palette found:', match[1]);
}
