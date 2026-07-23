const fs = require('fs');
const lines = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8').split('\n');

lines.forEach((line, index) => {
  if (line.includes('class PixelArtRenderer') ||
      line.includes('generateTilemapTextures') ||
      line.includes('_genFishingTextures') ||
      line.includes('_genArcadeTextures') ||
      line.includes('_genDungeonTextures') ||
      line.includes('_genPlayerTextures') ||
      line.includes('_genCatTextures') ||
      line.includes('_genMerlinTextures') ||
      line.includes('DynamicShadowSystem')) {
    console.log(`Line ${index + 1}: ${line.slice(0, 100)}`);
  }
});
