const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

function printRange(start, end, title) {
    console.log(`\n=================== ${title} (L${start}-L${end}) ===================`);
    for (let i = start - 1; i < end && i < lines.length; i++) {
        console.log(`L${i+1}: ${lines[i]}`);
    }
}

// Find line where Ambient Day/Night Lighting Overlay is defined
lines.forEach((line, idx) => {
    if (line.includes('Ambient Day/Night Lighting Overlay')) {
        printRange(idx - 5, idx + 40, 'DAY/NIGHT LIGHTING OVERLAY');
    }
    if (line.includes('Warm Sunbeam Lighting Overlay')) {
        printRange(idx - 5, idx + 25, 'WARM SUNBEAM OVERLAY');
    }
    if (line.includes('_createShopNPC')) {
        printRange(idx - 2, idx + 80, 'NPC CREATION METHODS');
    }
});
