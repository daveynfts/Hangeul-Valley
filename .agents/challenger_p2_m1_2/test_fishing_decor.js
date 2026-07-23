const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Search for _genFishingTextures line range and _createFarmDecorations line range
const lines = gameCode.split('\n');
let fishingStart = -1, fishingEnd = -1;
let decorStart = -1, decorEnd = -1;

lines.forEach((line, idx) => {
  if (line.includes('_genFishingTextures')) fishingStart = idx;
  if (line.includes('_createFarmDecorations')) decorStart = idx;
});

console.log('_genFishingTextures start:', fishingStart);
console.log('_createFarmDecorations start:', decorStart);

// Let's list all generateTexture / drawMatrix / texture creation calls in fishing and decor ranges
function findKeysInRange(startLine, numLines) {
  const section = lines.slice(startLine, startLine + numLines).join('\n');
  const keyMatches = [];
  
  // Find strings inside textures.generate, generateTexture, drawMatrix, etc.
  const regex = /(?:generateTexture|textures\.generate|textures\.create|makeTile|makeTex|drawMatrix|createTexture)\s*\(\s*['"`](.*?)['"`]/g;
  let m;
  while ((m = regex.exec(section)) !== null) {
    keyMatches.push(m[1]);
  }
  
  // Also look for literal key assignments like key = '...'
  const assignRegex = /key\s*:\s*['"`](.*?)['"`]/g;
  while ((m = assignRegex.exec(section)) !== null) {
    keyMatches.push(m[1]);
  }

  return [...new Set(keyMatches)];
}

if (fishingStart !== -1) {
  console.log('\nFishing texture keys found in range:');
  console.log(findKeysInRange(fishingStart, 500));
}

if (decorStart !== -1) {
  console.log('\nDecor texture keys found in range:');
  console.log(findKeysInRange(decorStart, 500));
}
