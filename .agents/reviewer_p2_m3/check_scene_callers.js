const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

function findClassSource(className) {
  const target = `class ${className}`;
  const idx = code.indexOf(target);
  if (idx === -1) return null;
  
  let depth = 0;
  let startBrace = code.indexOf('{', idx);
  let pos = startBrace;
  for (; pos < code.length; pos++) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return code.slice(idx, pos + 1);
}

const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene', 'MainScene'];

scenes.forEach(sName => {
  const src = findClassSource(sName);
  console.log(`\n=================== SCENE: ${sName} ===================`);
  if (!src) {
    console.log('Class not found!');
    return;
  }
  
  // Find all string literals used with texture methods
  const textureKeys = new Set();
  const re1 = /(?:add\.image|add\.sprite|physics\.add\.sprite|physics\.add\.image|setTexture|create|textures\.get|textures\.exists)\s*\(\s*[^,]*,\s*[^,]*,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re1.exec(src)) !== null) {
    textureKeys.add(m[1]);
  }
  const re2 = /(?:setTexture|textures\.get|textures\.exists)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = re2.exec(src)) !== null) {
    textureKeys.add(m[1]);
  }
  const re3 = /key\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = re3.exec(src)) !== null) {
    textureKeys.add(m[1]);
  }
  
  console.log(`Texture keys referenced in ${sName} (${textureKeys.size}):`, Array.from(textureKeys).sort());
});
