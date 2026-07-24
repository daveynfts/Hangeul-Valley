const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(6318, 6425).join('\n'));
