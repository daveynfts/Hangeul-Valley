const fs = require('fs');

const content = fs.readFileSync('game.js', 'utf8');
const lines = content.split('\n');

console.log('Total lines in game.js:', lines.length);

// Find line numbers of VOCAB_FACTS and getFunFact and helper symbols
lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  if (line.includes('const VOCAB_FACTS') || line.includes('function getFunFact') || line.includes('RR_CHOSEONG') || line.includes('decomposeHangulWord') || line.includes('getHangulRomanization')) {
    console.log(`Line ${lineNum}: ${line.trim()}`);
  }
});
