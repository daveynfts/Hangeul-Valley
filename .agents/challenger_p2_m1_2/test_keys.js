const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Find all occurrences of generateTexture, makeTex, makeTile, drawMatrix, createTexture, etc.
const makeTileRegex = /makeTile\(['"`](.*?)['"`]/g;
const makeTexRegex = /makeTex\(['"`](.*?)['"`]/g;
const genTexRegex = /generateTexture\(['"`](.*?)['"`]/g;
const createTexRegex = /createTexture\(['"`](.*?)['"`]/g;

function getMatches(regex, str) {
  const matches = [];
  let m;
  while ((m = regex.exec(str)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

console.log('makeTile keys:', [...new Set(getMatches(makeTileRegex, gameCode))]);
console.log('makeTex keys:', [...new Set(getMatches(makeTexRegex, gameCode))]);
console.log('generateTexture keys count:', getMatches(genTexRegex, gameCode).length);
console.log('createTexture keys count:', getMatches(createTexRegex, gameCode).length);
