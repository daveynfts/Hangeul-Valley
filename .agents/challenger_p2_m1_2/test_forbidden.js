const fs = require('fs');
const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = gameCode.split('\n');

console.log('=== FORBIDDEN ELEMENTS AUDIT ===\n');

// 1. DynamicShadowSystem class and instantiations
let shadowClassLine = -1;
const shadowInstantiations = [];
lines.forEach((line, idx) => {
  if (line.includes('class DynamicShadowSystem')) {
    shadowClassLine = idx + 1;
  }
  if (line.includes('new DynamicShadowSystem')) {
    shadowInstantiations.push({ line: idx + 1, content: line.trim() });
  }
});

console.log(`1. DynamicShadowSystem Class Line: ${shadowClassLine}`);
console.log(`   Instantiations (${shadowInstantiations.length}):`);
shadowInstantiations.forEach(inst => console.log(`   - Line ${inst.line}: ${inst.content}`));

// 2. Player Farmer Sprites
let genPlayerLine = -1;
const playerAnimKeys = [];
lines.forEach((line, idx) => {
  if (line.includes('_genPlayerTextures')) {
    genPlayerLine = idx + 1;
  }
  if (line.includes('player_walk_') || line.includes('player_water_') || line.includes('player_hoe_') || line.includes('player_axe_') || line.includes('player_pick_') || line.includes('player_fish_')) {
    if (line.includes('generateTexture') || line.includes('key') || line.includes('createTexture') || line.includes('makeTex')) {
      playerAnimKeys.push({ line: idx + 1, content: line.trim() });
    }
  }
});

console.log(`\n2. Player Farmer _genPlayerTextures Line: ${genPlayerLine}`);
console.log(`   Sample Player Texture Creation Calls (${playerAnimKeys.length}):`);
playerAnimKeys.slice(0, 10).forEach(p => console.log(`   - Line ${p.line}: ${p.content}`));

// 3. Ginger Cat NPC Frames
let genNpcLine = -1;
const catLines = [];
lines.forEach((line, idx) => {
  if (line.includes('_genNpcTextures')) {
    genNpcLine = idx + 1;
  }
  if (line.includes('cat_idle') || line.includes('cat_walk') || line.includes('cat_sit') || line.includes('cat_sleep') || line.includes('cat_npc')) {
    catLines.push({ line: idx + 1, content: line.trim() });
  }
});

console.log(`\n3. Ginger Cat NPC _genNpcTextures Line: ${genNpcLine}`);
console.log(`   Cat Frame Lines (${catLines.length}):`);
catLines.forEach(c => console.log(`   - Line ${c.line}: ${c.content}`));

// 4. Wizard Merlin NPC Frames
const wizardLines = [];
lines.forEach((line, idx) => {
  if (line.includes('wizard_idle') || line.includes('wizard_npc') || line.includes('gwiz')) {
    wizardLines.push({ line: idx + 1, content: line.trim() });
  }
});

console.log(`\n4. Wizard Merlin NPC Lines (${wizardLines.length}):`);
wizardLines.forEach(w => console.log(`   - Line ${w.line}: ${w.content}`));

