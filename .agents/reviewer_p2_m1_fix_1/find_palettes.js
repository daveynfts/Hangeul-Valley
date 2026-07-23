const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

// Find all PALETTE declarations
const paletteMatches = code.match(/const\s+([A-Z_]*PALETTE)\s*=\s*\{[\s\S]*?\};/g);
if (paletteMatches) {
    paletteMatches.forEach(p => {
        const nameMatch = p.match(/const\s+([A-Z_]*PALETTE)/);
        console.log('Found palette:', nameMatch ? nameMatch[1] : 'unknown');
        // print first 5 lines
        console.log(p.split('\n').slice(0, 8).join('\n'));
        console.log('...\n');
    });
} else {
    console.log('No PALETTE constants found with regex');
}

// Find all occurrence of stone_well, fishing_bobber, fishing_rod, clam, catfish, dock_post in game.js
['stone_well', 'dock_plank', 'catfish', 'clam', 'dock_post', 'fishing_bobber', 'fishing_rod', 'generateTilemapTextures'].forEach(term => {
    const regex = new RegExp(`['"]?${term}['"]?\\s*[:=]`, 'g');
    let matches = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
        matches.push(match.index);
    }
    console.log(`Term '${term}': found ${matches.length} occurrences`);
    matches.forEach(idx => {
        const start = Math.max(0, idx - 50);
        const end = Math.min(code.length, idx + 150);
        console.log(`  Context at ${idx}:`, JSON.stringify(code.substring(start, end)));
    });
});
