const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = content.split('\n');

console.log('=== LINE 7180 TO 7220 (ACTIVE BUFFS) ===');
for (let i = 7180 - 1; i < 7220; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

console.log('\n=== LINE 7760 TO 7810 (SEASONAL / EVENT BANNER) ===');
for (let i = 7760 - 1; i < 7810; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
