const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== FULL TEXTURE KEY PARITY INSPECTION ===\n');

// 1. Tilemap keys
const makeTileMatches = [...code.matchAll(/makeTile\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log(`Tilemaps (${makeTileMatches.length}):`);
console.log(makeTileMatches);

// 2. Dynamic Water Tiles
const waterKeys = [];
for (let f = 0; f < 4; f++) waterKeys.push(`tile_ocean_deep_${f}`);
for (let f = 0; f < 4; f++) waterKeys.push(`tile_water_foam_${f}`);

console.log(`\nDynamic Water Tiles (${waterKeys.length}):`);
console.log(waterKeys);
const waterCheck = waterKeys.every(k => code.includes(`makeTex(\`${k.replace(/_\d$/, '_${f}')}\``) || code.includes(`'${k}'`) || code.includes(`\`${k.replace(/_\d$/, '_${f}')}\``));
console.log('Water keys in code:', waterCheck);

// 3. Fishing Keys
const fishIdx = code.indexOf('_genFishingTextures(');
const fishBlock = code.slice(fishIdx, fishIdx + 12000);
const fishKeys = [];
const createTexReg = /createTexture\s*\(\s*['"]([^'"]+)['"]/g;
let m;
while ((m = createTexReg.exec(fishBlock)) !== null) {
  fishKeys.push(m[1]);
}
console.log(`\nFishing Keys (${fishKeys.length}):`);
console.log(fishKeys);

// 4. Farm Decor Keys
// Let's find all generateTexture / createTexture in _genCropAndTreeTextures and other farm decor sections
const farmDecorKeys = [
  'bf_open', 'bf_flap', 'stone_well', 'pixel_barrel', 'pixel_crate',
  'signpost', 'tree', 'fnc_post', 'fnc_rail', 'sparkle', 'coin',
  'shop_sign', 'notice_board', 'dungeon_portal', 'arcade_machine'
];
console.log(`\nFarm Decor Keys candidate list (${farmDecorKeys.length}):`);
console.log(farmDecorKeys);
farmDecorKeys.forEach(k => {
  console.log(`  ${k}: ${code.includes(`'${k}'`) || code.includes(`"${k}"`)}`);
});

// 5. Preserved Systems
console.log('\n--- Preserved Systems Check ---');
console.log('_genPlayerTextures:', code.includes('_genPlayerTextures('));
console.log('_genNpcTextures:', code.includes('_genNpcTextures('));
console.log('Player class:', code.includes('class Player') || code.includes('function Player'));
console.log('Ginger Cat / cat references:', code.includes('cat') || code.includes('Ginger Cat') || code.includes('ginger_cat'));
console.log('Wizard Merlin / wizard references:', code.includes('wizard') || code.includes('Merlin') || code.includes('wizard_merlin'));
console.log('DynamicShadowSystem:', code.includes('class DynamicShadowSystem') || code.includes('DynamicShadowSystem ='));
