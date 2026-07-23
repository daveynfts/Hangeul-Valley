const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

// Find all occurrences of DECOR_PALETTE definitions
let pos = 0;
while ((pos = code.indexOf('const DECOR_PALETTE', pos)) !== -1) {
    console.log(`Found 'const DECOR_PALETTE' at index ${pos}`);
    console.log(code.substring(pos, pos + 400));
    console.log('------------------------------------------------');
    pos += 'const DECOR_PALETTE'.length;
}

// Find all functions or blocks where textures are generated
const texGenMatches = code.match(/function\s+[a-zA-Z0-9_]*texture[a-zA-Z0-9_]*/gi);
console.log('Texture generation functions:', texGenMatches);

