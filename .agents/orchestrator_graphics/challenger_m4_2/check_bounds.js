const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
console.log('Includes setBounds:', code.includes('setBounds'));
