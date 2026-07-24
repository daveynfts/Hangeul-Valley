const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== STRICT CONSTRAINT DIFF CHECK ===');

const diff = execSync('git diff -U0 game.js', { encoding: 'utf8', cwd: 'C:\\VibeCode\\Hangeul Valley' });

const lines = diff.split('\n');
let currentHunk = null;
const hunks = [];

for (const line of lines) {
  if (line.startsWith('@@')) {
    currentHunk = line;
    hunks.push(line);
  }
}

console.log(`Total diff hunks in game.js: ${hunks.length}`);
console.log('Hunks:');
hunks.forEach(h => console.log('  ', h));

// Let's load game.js content and locate VOCAB_FACTS and getFunFact boundaries
const gameContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const vocabFactsStart = gameContent.indexOf('const VOCAB_FACTS =');
const vocabFactsEnd = gameContent.indexOf('};', vocabFactsStart) + 2;

const getFunFactStart = gameContent.indexOf('function getFunFact');
// getFunFact end line: let's find matching closing brace or next top-level statement
console.log(`VOCAB_FACTS index range: ${vocabFactsStart} to ${vocabFactsEnd}`);
console.log(`getFunFact index range start: ${getFunFactStart}`);
