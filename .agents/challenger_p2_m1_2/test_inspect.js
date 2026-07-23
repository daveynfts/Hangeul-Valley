const fs = require('fs');

const gameCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('File length:', gameCode.length);

const keysToFind = [
  // 44 Tilemaps
  'tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover', 'tile_path_straight',
  'tile_path_corner', 'tile_path_cross', 'tile_path_single', 'tile_path_stone',
  'tile_fence_h', 'tile_fence_v', 'tile_fence_post', 'tile_fence_corner',
  'tile_house_roof', 'tile_house_wall', 'tile_house_door', 'tile_house_window',
  'tile_shore_top', 'tile_shore_bottom', 'tile_shore_left', 'tile_shore_right',
  'tile_shore_corner', 'tile_sand', 'tile_sand_wet', 'tile_rock_shore',
  'tile_pier_plank', 'tile_pier_post', 'tile_pier_lantern', 'tile_seashell',
  'tile_starfish', 'tile_driftwood', 'tile_ocean_deep', 'tile_water_foam_border',
  'tile_space_dark', 'tile_stars_far', 'tile_stars_near', 'nebula_purple',
  'nebula_cyan', 'planet_ringed', 'planet_gas_giant', 'tile_dungeon_floor',
  'tile_dungeon_cracked', 'tile_dungeon_wall_moss', 'dungeon_torch', 'tile_dungeon_rune',

  // 8 Dynamic water
  'tile_ocean_deep_0', 'tile_ocean_deep_1', 'tile_ocean_deep_2', 'tile_ocean_deep_3',
  'tile_water_foam_0', 'tile_water_foam_1', 'tile_water_foam_2', 'tile_water_foam_3',

  // 29 Fishing
  'fish_carp', 'fish_salmon', 'fish_tuna', 'fish_squid', 'fish_eel', 'fish_goldfish',
  'fish_seabass', 'fish_shrimp', 'fish_octopus', 'fish_catfish', 'fish_mackerel',
  'fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel',
  'fishing_golden_fish', 'fishing_snapper', 'fishing_shrimp', 'fishing_octopus',
  'fishing_catfish', 'fishing_mackerel', 'fishing_legendary', 'fishing_clam',
  'dock_plank', 'dock_post', 'fishing_dock', 'fishing_bobber', 'fishing_rod',

  // 15 Farm decor
  'stone_well', 'pixel_barrel', 'pixel_crate', 'signpost', 'notice_board',
  'shop_sign', 'arcade_machine', 'dungeon_portal', 'tree',
  'fnc_post', 'fnc_rail', 'sparkle', 'coin', 'bf_open', 'bf_flap'
];

console.log('\n--- Checking key occurrences ---');
for (const key of keysToFind) {
  const count = (gameCode.split(key).length - 1);
  console.log(`${key}: ${count} occurrences`);
}
