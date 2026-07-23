const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = gameCode.split('\n');
console.log(lines.slice(5800, 5835).join('\n'));
