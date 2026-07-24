const { execSync } = require('child_process');
const fs = require('fs');

const diff = execSync('git diff -U0 game.js', { encoding: 'utf8', cwd: 'C:\\VibeCode\\Hangeul Valley', maxBuffer: 20 * 1024 * 1024 });

const lines = diff.split('\n');
const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

console.log('--- ALL GIT DIFF HUNKS IN game.js ---');
lines.forEach(line => {
  if (line.startsWith('@@')) {
    console.log(line);
  }
});
