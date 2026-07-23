const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = code.split('\n');
for (let i = 1690; i < 1730; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
