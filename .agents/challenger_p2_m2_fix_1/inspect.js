const fs = require('fs');

const gameJsContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const assetsGameJsContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\assets\\game.js', 'utf8');

console.log("game.js size:", gameJsContent.length);
console.log("assets/game.js size:", assetsGameJsContent.length);

function countMatches(content, regex) {
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

console.log("game.js _genDungeonTextures matches:", countMatches(gameJsContent, /static\s+_genDungeonTextures\s*\(/g));
console.log("assets/game.js _genDungeonTextures matches:", countMatches(assetsGameJsContent, /static\s+_genDungeonTextures\s*\(/g));

console.log("game.js _genArcadeTextures matches:", countMatches(gameJsContent, /static\s+_genArcadeTextures\s*\(/g));
console.log("assets/game.js _genArcadeTextures matches:", countMatches(assetsGameJsContent, /static\s+_genArcadeTextures\s*\(/g));
