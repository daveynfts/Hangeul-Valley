const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const idx = code.indexOf('_genFishingTextures');
console.log('Index of _genFishingTextures:', idx);
if (idx !== -1) {
    console.log(code.substring(idx - 50, idx + 200));
}
