const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const assetsGameJsPath = path.join(__dirname, '..', '..', 'assets', 'game.js');

console.log('Reading game.js from:', gameJsPath);
const gameJs = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJs = fs.readFileSync(assetsGameJsPath, 'utf8');

// Function to extract a static method body from class source
function getMethodBody(src, methodName) {
  const marker = 'static ' + methodName + '(';
  const startIdx = src.indexOf(marker);
  if (startIdx === -1) return null;

  const braceIdx = src.indexOf('{', startIdx);
  if (braceIdx === -1) return null;

  let depth = 1;
  let i = braceIdx + 1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(braceIdx + 1, i);
}

// Extract _genArcadeTextures
const arcadeBody = getMethodBody(gameJs, '_genArcadeTextures');
console.log('\n--- _genArcadeTextures Body Found ---', arcadeBody ? arcadeBody.length + ' chars' : 'NOT FOUND');

// Extract _genDungeonTextures
const dungeonBody = getMethodBody(gameJs, '_genDungeonTextures');
console.log('--- _genDungeonTextures Body Found ---', dungeonBody ? dungeonBody.length + ' chars' : 'NOT FOUND');

// Find all key parameters passed to drawMatrix or generateTexture or similar calls inside the methods
function extractKeys(body) {
  if (!body) return [];
  const keys = [];
  // Match drawMatrix(scene, 'key', ...) or generateTexture('key', ...) or scene.textures...
  const regex = /(?:drawMatrix|generateTexture|generateFrame|addTexture|create)\s*\(\s*(?:scene\s*,\s*)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

// Also let's inspect string literals passed in drawMatrix calls specifically
function extractDrawMatrixKeys(body) {
  if (!body) return [];
  const keys = [];
  const regex = /drawMatrix\s*\(\s*scene\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

console.log('\nKeys in _genArcadeTextures:', extractDrawMatrixKeys(arcadeBody));
console.log('Keys in _genDungeonTextures:', extractDrawMatrixKeys(dungeonBody));
