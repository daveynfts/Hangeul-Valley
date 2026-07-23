const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Find all generateTexture or createTexture calls in the entire file
const allGenTexMatches = [];
const reg = /(?:generateTexture|createTexture)\s*\(\s*['"]([^'"]+)['"]/g;
let m;
while ((m = reg.exec(code)) !== null) {
  allGenTexMatches.push(m[1]);
}

console.log(`Total generateTexture/createTexture literal calls: ${allGenTexMatches.length}`);
console.log(allGenTexMatches);

// Also check makeTile calls
const makeTileMatches = [...code.matchAll(/makeTile\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log(`\nTotal makeTile calls: ${makeTileMatches.length}`);
console.log(makeTileMatches);
