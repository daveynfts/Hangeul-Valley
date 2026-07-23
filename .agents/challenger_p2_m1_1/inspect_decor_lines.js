const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');
const lines = gameJs.split('\n');

console.log('--- Lines 5570 to 5610 ---');
console.log(lines.slice(5569, 5610).join('\n'));
