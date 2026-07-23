const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const idx = code.indexOf('createTexture(');
if (idx !== -1) {
  const lineNum = code.slice(0, idx).split('\n').length;
  console.log(`createTexture definition around line ${lineNum}:`);
  const lines = code.split('\n');
  lines.slice(lineNum - 5, lineNum + 15).forEach((l, i) => console.log(`${lineNum - 5 + i}: ${l}`));
} else {
  console.log('createTexture NOT FOUND');
}
