const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const targetLines = [5292, 7099, 7536, 7987];
const lines = code.split('\n');

targetLines.forEach(lineNum => {
  // Look backwards for class declaration
  for (let i = lineNum - 1; i >= 0; i--) {
    if (lines[i].includes('class ')) {
      console.log(`Line ${lineNum} is inside ${lines[i].trim()}`);
      break;
    }
  }
});
