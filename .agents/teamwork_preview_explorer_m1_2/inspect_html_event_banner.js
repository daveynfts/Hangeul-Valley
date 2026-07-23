const fs = require('fs');

const indexHtml = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');
const lines = indexHtml.split('\n');

console.log('=== EVENT BANNER MARKUP (LINES 1200 TO 1235) ===');
for (let i = 1199; i < 1235; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
