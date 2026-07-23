const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

// Let's search for "well" or "stone" or "bobber" or "rod" or "generate" or texture creation functions
console.log('--- Functions in game.js ---');
const funcMatches = code.match(/function\s+([a-zA-Z0-9_]+)/g);
if (funcMatches) {
    console.log(funcMatches.join(', '));
}

// Search for references to DECOR_PALETTE
console.log('\n--- Where is DECOR_PALETTE used? ---');
let decorPalettePos = [];
let idx = 0;
while ((idx = code.indexOf('DECOR_PALETTE', idx)) !== -1) {
    decorPalettePos.push(idx);
    idx += 'DECOR_PALETTE'.length;
}
console.log(`Found ${decorPalettePos.length} usages of DECOR_PALETTE`);
decorPalettePos.forEach(p => {
    console.log(`Pos ${p}:`, JSON.stringify(code.substring(Math.max(0, p - 40), Math.min(code.length, p + 100))));
});

