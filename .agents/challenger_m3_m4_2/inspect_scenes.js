const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');

// Find all class definitions or Scene definitions
const sceneMatches = js.match(/class\s+\w+\s+extends\s+Phaser\.Scene/g) || [];
console.log('=== PHASER SCENES DEFINED ===');
console.log(sceneMatches);

// Find references to day/night or ambient overlay
console.log('\n=== LIGHTING / OVERLAY REFERENCES ===');
const overlayRegex = /([^\n]*overlay[^\n]*)/gi;
let match;
while ((match = overlayRegex.exec(js)) !== null) {
    console.log(match[1].trim());
}

// Check NPC setup methods or objects
console.log('\n=== NPC METHODS AND OBJECTS ===');
const npcRegex = /([^\n]*npc[^\n]*)/gi;
while ((match = npcRegex.exec(js)) !== null) {
    console.log(match[1].trim());
}
