const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const dmIdx = code.indexOf('static drawMatrix(');
if (dmIdx !== -1) {
  const lineNum = code.slice(0, dmIdx).split('\n').length;
  const lines = code.split('\n');
  lines.slice(lineNum - 1, lineNum + 35).forEach((l, i) => console.log(`${lineNum + i}: ${l}`));
}
