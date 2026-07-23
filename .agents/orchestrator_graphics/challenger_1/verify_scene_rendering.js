const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

console.log('=== Checking Dynamic Texture Key Construction in game.js ===');

// Check if string concatenation like 'tile_' + ... exists in game.js
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes("'tile_'") || line.includes('"tile_"') || line.includes("`tile_")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

console.log('\n=== Inspecting Scene create/draw Methods ===');

const sceneNames = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
sceneNames.forEach(s => {
  console.log(`\n--- ${s} ---`);
  const idx = code.indexOf(`class ${s}`);
  if (idx !== -1) {
    const end = code.indexOf('class ', idx + 10);
    const body = code.substring(idx, end !== -1 ? end : code.length);

    // Look for tilemap or texture drawing in this scene
    const bodyLines = body.split('\n');
    bodyLines.forEach((l, i) => {
      if (/tile|grid|drawWorld|buildWorld|createMap|make\.tilemap/i.test(l) && !l.includes('generateTilemapTextures')) {
        if (l.trim().length > 0 && l.trim().length < 120) {
          console.log(`L${i + 1}: ${l.trim()}`);
        }
      }
    });
  }
});
