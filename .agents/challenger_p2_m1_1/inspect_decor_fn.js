const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');
const lines = gameJs.split('\n');

console.log(lines.slice(5399, 5450).join('\n'));
