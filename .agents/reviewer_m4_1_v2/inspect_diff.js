const { execSync } = require('child_process');
const diff = execSync('git diff -U0 game.js', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
const lines = diff.split('\n');
const hunks = [];
for (let line of lines) {
  if (line.startsWith('@@')) {
    hunks.push(line);
  }
}
console.log('Total diff hunks in game.js:', hunks.length);
console.log('Hunks:');
hunks.forEach(h => console.log(h));
