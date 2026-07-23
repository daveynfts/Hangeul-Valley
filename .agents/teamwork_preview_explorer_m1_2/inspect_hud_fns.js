const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = content.split('\n');

function printRange(startLine, endLine) {
  console.log(`=== LINES ${startLine} TO ${endLine} ===`);
  for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

// Search for updateGoldHUD definition
lines.forEach((line, idx) => {
  if (line.includes('updateGoldHUD') || line.includes('coins-val') || line.includes('gems-val') || line.includes('honor-val') || line.includes('updateActiveBuffBar') || line.includes('updateEventBannerHUD')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
