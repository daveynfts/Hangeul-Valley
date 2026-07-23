const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Check all drawMatrix and createTexture calls across the entire file
const createTexRegex = /createTexture\s*\(\s*\w+\s*,\s*'([^']+)'\s*,\s*(\[[\s\S]*?\])\s*,\s*(\w+)/g;
let m;
let totalChecked = 0;

while ((m = createTexRegex.exec(code)) !== null) {
  const key = m[1];
  const matrixStr = m[2];
  const paletteName = m[3];
  
  // Find palette definition
  // E.g., const P = { ... } or P inside _genFishingTextures / _genNpcTextures
  totalChecked++;
}

console.log(`Scanned ${totalChecked} createTexture matrices.`);
