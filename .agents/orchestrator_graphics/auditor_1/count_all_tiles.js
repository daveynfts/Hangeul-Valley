const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

// Find all makeTile calls or createTexture calls with 'tile_'
const tileMatches = [...content.matchAll(/makeTile\(['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
console.log('=== MAKETILE TILES (' + tileMatches.length + ') ===');
console.log(tileMatches);

const allTileTextures = [...content.matchAll(/['"`](tile_[^'"`]+)['"`]/g)].map(m => m[1]);
const uniqueTileTextures = [...new Set(allTileTextures)];
console.log('\n=== UNIQUE TILE_ TEXTURES IN GAME.JS (' + uniqueTileTextures.length + ') ===');
console.log(uniqueTileTextures);

// Check tilemaps in Scenes
console.log('\n=== SCENE TILEMAP GENERATION / USAGE ===');
const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
scenes.forEach(s => {
    const hasScene = content.includes(s);
    console.log(`Scene ${s}: present=${hasScene}`);
});
