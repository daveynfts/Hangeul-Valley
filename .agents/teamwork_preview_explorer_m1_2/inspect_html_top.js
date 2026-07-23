const fs = require('fs');

const indexHtml = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');
const lines = indexHtml.split('\n');

console.log('=== INDEX.HTML TOP UI (LINES 1 TO 130) ===');
for (let i = 0; i < 130 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
