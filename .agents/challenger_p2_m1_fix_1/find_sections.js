const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = code.split('\n');

for (let i = 2594; i < 2670; i++) {
  if (lines[i]) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
