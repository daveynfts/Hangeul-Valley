const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

// 1. Check texture generation
const textureMatches = [...content.matchAll(/generateTexture\(['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
console.log('=== GENERATE TEXTURE KEYS (' + textureMatches.length + ') ===');
console.log(textureMatches);

// 2. Check load.image or external image references
const imageLoadMatches = [...content.matchAll(/load\.image\([^)]+\)/g)];
console.log('\n=== LOAD.IMAGE CALLS (' + imageLoadMatches.length + ') ===');
imageLoadMatches.forEach(m => console.log(m[0]));

// 3. Search for external asset loading or img tags in game.js / index.html
const indexContent = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
const imgTagMatches = [...indexContent.matchAll(/<img[^>]+>/gi)].map(m => m[0]);
console.log('\n=== INDEX.HTML IMG TAGS (' + imgTagMatches.length + ') ===');
imgTagMatches.forEach(m => console.log(m));

// 4. Search for tilemap functions or tilemap generation in game.js
const lines = content.split('\n');
console.log('\n=== TILEMAP RELATED LINES ===');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('tilemap') || line.toLowerCase().includes('tile') || line.toLowerCase().includes('biome') || line.toLowerCase().includes('terrain')) {
        if (line.includes('function') || line.includes('class') || line.includes('generate') || line.includes('create') || line.includes('44')) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
