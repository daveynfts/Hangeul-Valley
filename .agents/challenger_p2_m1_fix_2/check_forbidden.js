const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== FORBIDDEN ELEMENTS DEEP INSPECTION ===\n');

// 1. Player Farmer
console.log('--- 1. Player Farmer ---');
console.log('_genPlayerTextures def:', code.includes('static _genPlayerTextures(scene)'));
console.log('farmer texture creation:', code.includes("generateTexture('farmer'") || code.includes("createTexture(scene, 'farmer'") || code.includes("createTexture(scene, 'player'"));
// Search for Player class or player creation
const playerClassMatch = code.match(/(class\s+Player\b|function\s+Player\b|this\.player\s*=)/g);
console.log('Player class or references:', playerClassMatch);
// Check player animation setup
console.log('player walk/action animations:', code.includes('farmer_walk') || code.includes('player_walk') || code.includes('_genPlayerTextures'));

// 2. Ginger Cat NPC
console.log('\n--- 2. Ginger Cat NPC ---');
console.log('_genNpcTextures def:', code.includes('static _genNpcTextures(scene)'));
console.log('cat_npc texture creation:', code.includes("generateTexture('cat_npc'") || code.includes("createTexture(scene, 'cat_npc'"));
console.log('cat NPC references:', code.includes('cat_npc') || code.includes('ginger_cat') || code.includes('Ginger Cat'));

// 3. Wizard Merlin NPC
console.log('\n--- 3. Wizard Merlin NPC ---');
console.log('wizard_npc texture creation:', code.includes("generateTexture('wizard_npc'") || code.includes("createTexture(scene, 'wizard_npc'"));
console.log('Wizard Merlin / merlin references:', code.includes('wizard_npc') || code.includes('Merlin') || code.includes('wizard_merlin'));

// 4. DynamicShadowSystem
console.log('\n--- 4. DynamicShadowSystem ---');
const shadowClassMatch = code.match(/class\s+DynamicShadowSystem[\s\S]*?\{/);
console.log('DynamicShadowSystem class definition:', shadowClassMatch !== null);
console.log('DynamicShadowSystem update / render:', code.includes('DynamicShadowSystem') && code.includes('castShadow') || code.includes('updateShadows') || code.includes('_genLightingTextures'));
