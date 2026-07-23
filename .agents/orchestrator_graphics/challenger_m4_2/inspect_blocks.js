const fs = require('fs');

const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

function printRange(startLine, endLine, title) {
  console.log(`\n=================== ${title} (L${startLine}-L${endLine}) ===================`);
  for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

// Inspect level select, shop, trophies, memory minigame, duel system, intervals
printRange(3130, 3160, 'Level Select Event Listeners');
printRange(3630, 3660, 'Vocab & HUD Event Listeners');
printRange(6635, 6660, 'Memory Cards Event Listeners');
printRange(6760, 6785, 'Trophies Event Listeners');
printRange(7170, 7200, 'Interval L7179');
printRange(7320, 7345, 'Interval L7326');
