const fs = require('fs');

const code = fs.readFileSync('game.js', 'utf8');

const keys = [
  'tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover', 'tile_path_straight', 'tile_path_corner',
  'tile_path_cross', 'tile_path_single', 'tile_path_stone', 'tile_fence_h', 'tile_fence_v',
  'tile_fence_post', 'tile_fence_corner', 'tile_house_roof', 'tile_house_wall', 'tile_house_door',
  'tile_house_window', 'tile_shore_top', 'tile_shore_bottom', 'tile_shore_left', 'tile_shore_right',
  'tile_shore_corner', 'tile_sand', 'tile_sand_wet', 'tile_rock_shore', 'tile_pier_plank',
  'tile_pier_post', 'tile_pier_lantern', 'tile_seashell', 'tile_starfish', 'tile_driftwood',
  'tile_ocean_deep', 'tile_water_foam_border', 'tile_space_dark', 'tile_stars_far', 'tile_stars_near',
  'nebula_purple', 'nebula_cyan', 'planet_ringed', 'planet_gas_giant', 'tile_dungeon_floor',
  'tile_dungeon_cracked', 'tile_dungeon_wall_moss', 'dungeon_torch', 'tile_dungeon_rune'
];

console.log('=== Checking Texture Key Usage in game.js ===');
const usages = {};

keys.forEach(key => {
  const matches = [];
  const regex = new RegExp(`\\b${key}\\b`, 'g');
  let match;
  let count = 0;
  while ((match = regex.exec(code)) !== null) {
    count++;
  }
  // subtract 1 for definition in PixelArtRenderer
  usages[key] = count - 1;
});

console.log('Texture Key Reference Counts (excluding definition):');
let unusedCount = 0;
keys.forEach(k => {
  console.log(`${k}: ${usages[k]} references`);
  if (usages[k] === 0) unusedCount++;
});

console.log(`\nUnused keys in game.js: ${unusedCount} out of ${keys.length}`);
