const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const missingLookups = [];

// We will inspect all matrices and their assigned palettes
// Let's parse PixelArtRenderer methods and extract matrix definitions and the createTexture calls that use them

const lines = code.split('\n');

// Find all createTexture calls: this.createTexture(scene, key, matrixVar, paletteVar)
lines.forEach((line, idx) => {
  if (line.includes('this.createTexture(') || line.includes('PixelArtRenderer.createTexture(')) {
    const match = line.match(/createTexture\([^,]+,\s*['"]([^'"]+)['"]\s*,\s*([^,]+)\s*,\s*([^)]+)\)/);
    if (match) {
      const texKey = match[1];
      const matrixVarName = match[2].trim();
      const paletteVarName = match[3].trim();
    }
  }
});

