const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

const lines = content.split('\n');
let farmStart = -1;
let farmEnd = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('class FarmScene')) {
        farmStart = i;
    }
    if (farmStart > 0 && lines[i].includes('class FishingScene')) {
        farmEnd = i;
        break;
    }
}

console.log(`FarmScene lines: ${farmStart+1} to ${farmEnd+1}`);
for (let i = farmStart; i < farmEnd; i++) {
    const line = lines[i];
    if (line.includes('tile_') || line.includes('Tilemap') || line.includes('terrain') || line.includes('grid') || line.includes('map') || line.includes('create')) {
        console.log(`${i+1}: ${line}`);
    }
}
