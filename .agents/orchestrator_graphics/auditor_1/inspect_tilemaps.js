const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

// Search for generateTilemapTextures method and view lines around it
const lines = content.split('\n');
let inMethod = false;
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('generateTilemapTextures')) {
        console.log(`Line ${i+1}: ${lines[i]}`);
        startLine = i + 1;
        break;
    }
}

// Print lines 150 to 400 or wherever generateTilemapTextures is defined
if (startLine > 0) {
    for (let i = startLine - 5; i < startLine + 250 && i < lines.length; i++) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
