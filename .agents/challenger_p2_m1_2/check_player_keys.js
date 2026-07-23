const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const matches = gameCode.match(/['"`]player_[a-zA-Z0-9_]+['"`]/g) || [];
console.log('All player_ texture keys referenced/created in game.js:');
console.log([...new Set(matches.map(m => m.replace(/['"`]/g, '')))].sort());
