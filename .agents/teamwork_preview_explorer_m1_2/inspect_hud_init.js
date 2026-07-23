const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = content.split('\n');

function printRange(startLine, endLine) {
  console.log(`=== LINES ${startLine} TO ${endLine} ===`);
  for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

printRange(3050, 3100);
