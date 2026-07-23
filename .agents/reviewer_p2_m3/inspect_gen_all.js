const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = code.split('\n');
lines.slice(246, 265).forEach((l, i) => console.log(`${247 + i}: ${l}`));
