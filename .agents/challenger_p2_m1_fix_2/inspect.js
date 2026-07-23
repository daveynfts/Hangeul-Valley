const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Find all occurrences of function/method definitions related to _gen
const genMethods = [...code.matchAll(/(?:_gen|\bgen)[A-Za-z0-9_]*\s*\([^)]*\)\s*\{/g)].map(m => m[0]);
console.log('Gen methods found:', genMethods);

// Let's search for _genWaterTextures definition
const waterIdx = code.indexOf('_genWaterTextures(');
console.log('Water textures def index:', waterIdx);
if (waterIdx !== -1) {
  // Find second occurrence if first was call
  const secondWaterIdx = code.indexOf('_genWaterTextures(', waterIdx + 1);
  console.log('Second water textures def index:', secondWaterIdx);
  const targetIdx = secondWaterIdx !== -1 ? secondWaterIdx : waterIdx;
  console.log('Water block:\n', code.slice(targetIdx, targetIdx + 2000));
}

// Let's search for _genFishingTextures definition
const fishIdx = code.indexOf('_genFishingTextures(');
console.log('Fishing textures def index:', fishIdx);
if (fishIdx !== -1) {
  const secondFishIdx = code.indexOf('_genFishingTextures(', fishIdx + 1);
  const targetIdx = secondFishIdx !== -1 ? secondFishIdx : fishIdx;
  console.log('Fishing block:\n', code.slice(targetIdx, targetIdx + 3000));
}
