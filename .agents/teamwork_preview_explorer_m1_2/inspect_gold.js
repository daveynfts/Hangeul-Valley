const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = content.split('\n');

for (let i = 2460 - 1; i < 2510; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
