const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const lines = js.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('dayNightOverlay') || line.includes('_createButterflies') || line.includes('_createPortalNPC') || line.includes('_createFishSpot') || line.includes('Ambient Day/Night')) {
        console.log(`L${idx+1}: ${line}`);
    }
});
