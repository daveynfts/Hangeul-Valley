const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Extract TILEMAP_PALETTE
const tilemapPaletteMatch = code.match(/const TILEMAP_PALETTE = \{([\s\S]*?)\};/);
const tilemapTokens = new Set();
if (tilemapPaletteMatch) {
  const keysMatch = tilemapPaletteMatch[1].matchAll(/['"]([^'"]+)['"]\s*:/g);
  for (const m of keysMatch) tilemapTokens.add(m[1]);
}

// Extract DECOR_PALETTE
const decorPaletteMatch = code.match(/const DECOR_PALETTE = \{([\s\S]*?)\};/);
const decorTokens = new Set();
if (decorPaletteMatch) {
  const keysMatch = decorPaletteMatch[1].matchAll(/['"]([^'"]+)['"]\s*:/g);
  for (const m of keysMatch) decorTokens.add(m[1]);
}

console.log('Tilemap Tokens:', Array.from(tilemapTokens).join(', '));
console.log('Decor Tokens:', Array.from(decorTokens).join(', '));

// Check Tilemaps
const makeTileRegex = /makeTile\s*\(\s*'([^']+)'\s*,\s*\(g\)\s*=>\s*\{([\s\S]*?)\}\s*\);/g;
let tileMatch;
let missingTokensFound = false;

while ((tileMatch = makeTileRegex.exec(code)) !== null) {
  const key = tileMatch[1];
  const body = tileMatch[2];
  const matrixMatch = body.match(/drawTileMatrix\s*\(\s*g\s*,\s*(\[[\s\S]*?\])\s*\)/);
  if (matrixMatch) {
    const rows = eval(matrixMatch[1]);
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const char = rows[r][c];
        if (!tilemapTokens.has(char)) {
          console.error(`[MISSING TOKEN] Tilemap '${key}' row ${r} col ${c} uses token '${char}' which is NOT in TILEMAP_PALETTE!`);
          missingTokensFound = true;
        }
      }
    }
  }
}

// Check Farm Decor
const decorMatrixRegex = /PixelArtRenderer\.drawMatrix\s*\(\s*(\w+)\s*,\s*(\[[\s\S]*?\])\s*,\s*DECOR_PALETTE/g;
let dMatch;
const decorNames = [
  'bf_open', 'bf_flap', 'stone_well', 'pixel_barrel', 'pixel_crate',
  'signpost', 'tree', 'fnc_post', 'fnc_rail', 'sparkle', 'coin',
  'shop_sign', 'notice_board', 'dungeon_portal', 'fishing_dock', 'arcade_machine'
];
let idx = 0;

while ((dMatch = decorMatrixRegex.exec(code)) !== null) {
  const varName = dMatch[1];
  const rows = eval(dMatch[2]);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const char = rows[r][c];
      if (!decorTokens.has(char)) {
        console.error(`[MISSING TOKEN] Decor '${varName}' row ${r} col ${c} uses token '${char}' which is NOT in DECOR_PALETTE!`);
        missingTokensFound = true;
      }
    }
  }
  idx++;
}

if (!missingTokensFound) {
  console.log('All matrix tokens are defined in their respective palettes!');
}
