const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = code.split('\n');
for (let i = 5375; i < 5415; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
