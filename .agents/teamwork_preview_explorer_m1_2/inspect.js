const fs = require('fs');
const path = require('path');

const gameJsPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';
const content = fs.readFileSync(gameJsPath, 'utf8');
const lines = content.split('\n');

console.log('--- ALL DOM ELEMENT REFERENCES & HUD BINDINGS IN GAME.JS ---');

const patterns = [
  /document\.getElementById\(['"]([^'"]+)['"]\)/g,
  /document\.querySelector\(['"]([^'"]+)['"]\)/g,
  /document\.querySelectorAll\(['"]([^'"]+)['"]\)/g,
  /\$\(['"]([^'"]+)['"]\)/g
];

const foundIds = new Map();

lines.forEach((line, idx) => {
  const lineNo = idx + 1;
  patterns.forEach(pat => {
    let match;
    const regex = new RegExp(pat);
    while ((match = regex.exec(line)) !== null) {
      const id = match[1];
      if (!foundIds.has(id)) {
        foundIds.set(id, []);
      }
      foundIds.get(id).push({ lineNo, line: line.trim() });
    }
  });
});

console.log(`Total unique IDs queried: ${foundIds.size}\n`);
for (const [id, occurrences] of foundIds.entries()) {
  console.log(`ID/Selector: "${id}" (${occurrences.length} refs)`);
  occurrences.forEach(occ => {
    console.log(`   Line ${occ.lineNo}: ${occ.line}`);
  });
}
