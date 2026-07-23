/**
 * Milestone M1 Verification Script
 * Author: challenger_p2_m1_2
 * Target: C:\VibeCode\Hangeul Valley\game.js
 */

const fs = require('fs');

const GAME_JS_PATH = 'C:\\VibeCode\\Hangeul Valley\\game.js';

console.log('====================================================');
console.log('   MILESTONE M1 ADVERSARIAL VERIFICATION HARNESS   ');
console.log('====================================================\n');

if (!fs.existsSync(GAME_JS_PATH)) {
  console.error(`CRITICAL ERROR: File not found at ${GAME_JS_PATH}`);
  process.exit(1);
}

const gameCode = fs.readFileSync(GAME_JS_PATH, 'utf8');

let totalFailures = 0;
let totalPassed = 0;

function reportCheck(category, name, passed, details = '') {
  if (passed) {
    totalPassed++;
    console.log(`[PASS] [${category}] ${name}`);
  } else {
    totalFailures++;
    console.error(`[FAIL] [${category}] ${name} - ${details}`);
  }
}

// ---------------------------------------------------------
// 1. TILEMAP TEXTURE KEYS CHECK (44 Keys)
// ---------------------------------------------------------
console.log('--- 1. Tilemap Texture Keys Check (44 Keys) ---');

const expectedTilemapKeys = [
  // Farm Scene Tilemaps (21)
  'tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover', 'tile_path_straight',
  'tile_path_corner', 'tile_path_cross', 'tile_path_single', 'tile_path_stone',
  'tile_fence_h', 'tile_fence_v', 'tile_fence_post', 'tile_fence_corner',
  'tile_house_roof', 'tile_house_wall', 'tile_house_door', 'tile_house_window',
  'tile_shore_top', 'tile_shore_bottom', 'tile_shore_left', 'tile_shore_right',
  'tile_shore_corner',
  // Fishing Scene Tilemaps (11)
  'tile_sand', 'tile_sand_wet', 'tile_rock_shore', 'tile_pier_plank',
  'tile_pier_post', 'tile_pier_lantern', 'tile_seashell', 'tile_starfish',
  'tile_driftwood', 'tile_ocean_deep', 'tile_water_foam_border',
  // Arcade & Dungeon Tilemaps (12)
  'tile_space_dark', 'tile_stars_far', 'tile_stars_near', 'nebula_purple',
  'nebula_cyan', 'planet_ringed', 'planet_gas_giant', 'tile_dungeon_floor',
  'tile_dungeon_cracked', 'tile_dungeon_wall_moss', 'dungeon_torch', 'tile_dungeon_rune'
];

expectedTilemapKeys.forEach(key => {
  const regex = new RegExp(`makeTile\\(['"\`]${key}['"\`]`);
  const found = regex.test(gameCode);
  reportCheck('Tilemaps (44)', key, found, 'makeTile call missing in game.js');
});

// ---------------------------------------------------------
// 2. DYNAMIC WATER TEXTURE KEYS CHECK (8 Keys)
// ---------------------------------------------------------
console.log('\n--- 2. Dynamic Water Texture Keys Check (8 Keys) ---');

const expectedWaterKeys = [
  'tile_ocean_deep_0', 'tile_ocean_deep_1', 'tile_ocean_deep_2', 'tile_ocean_deep_3',
  'tile_water_foam_0', 'tile_water_foam_1', 'tile_water_foam_2', 'tile_water_foam_3'
];

const hasWaterLoopDeep = gameCode.includes('`tile_ocean_deep_${f}`') || gameCode.includes("'tile_ocean_deep_' +");
const hasWaterLoopFoam = gameCode.includes('`tile_water_foam_${f}`') || gameCode.includes("'tile_water_foam_' +");

expectedWaterKeys.forEach(key => {
  const isDeep = key.startsWith('tile_ocean_deep_');
  const isFoam = key.startsWith('tile_water_foam_');
  const valid = (isDeep && hasWaterLoopDeep) || (isFoam && hasWaterLoopFoam) || gameCode.includes(key);
  reportCheck('Water (8)', key, valid, 'Dynamic water generation loop missing for key');
});

// ---------------------------------------------------------
// 3. FISHING TEXTURE KEYS CHECK (29 Keys)
// ---------------------------------------------------------
console.log('\n--- 3. Fishing Texture Keys Check (29 Keys) ---');

const expectedFishingKeys = [
  // Canonical Fish (11)
  'fish_carp', 'fish_salmon', 'fish_tuna', 'fish_squid', 'fish_eel',
  'fish_goldfish', 'fish_seabass', 'fish_shrimp', 'fish_octopus', 'fish_catfish', 'fish_mackerel',
  // Aliases & Unique Fish (13)
  'fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel',
  'fishing_golden_fish', 'fishing_snapper', 'fishing_shrimp', 'fishing_octopus',
  'fishing_catfish', 'fishing_mackerel', 'fishing_legendary', 'fishing_clam',
  // Accessories & Dock Props (5)
  'dock_plank', 'dock_post', 'fishing_dock', 'fishing_bobber', 'fishing_rod'
];

expectedFishingKeys.forEach(key => {
  const regex = new RegExp(`['"\`]${key}['"\`]`);
  const found = regex.test(gameCode);
  reportCheck('Fishing (29)', key, found, 'Key string literal missing in game.js');
});

// ---------------------------------------------------------
// 4. FARM DECOR TEXTURE KEYS CHECK (15 Keys)
// ---------------------------------------------------------
console.log('\n--- 4. Farm Decor Texture Keys Check (15 Keys) ---');

const expectedDecorKeys = [
  'stone_well', 'pixel_barrel', 'pixel_crate', 'signpost', 'notice_board',
  'shop_sign', 'arcade_machine', 'dungeon_portal', 'fishing_dock', 'tree',
  'fnc_post', 'fnc_rail', 'sparkle', 'coin', 'bf_open', 'bf_flap'
];

expectedDecorKeys.forEach(key => {
  const regex = new RegExp(`['"\`]${key}['"\`]`);
  const found = regex.test(gameCode);
  reportCheck('Farm Decor (15)', key, found, 'Decor texture key missing in game.js');
});

// ---------------------------------------------------------
// 5. FORBIDDEN ELEMENTS CHECK
// ---------------------------------------------------------
console.log('\n--- 5. Forbidden Elements Check ---');

// a. Player Farmer Sprites
const hasPlayerMethod = gameCode.includes('_genPlayerTextures(scene)');
const playerWalkKeys = [
  'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
  'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
  'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
  'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2'
];
const playerActionKeys = [
  'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
  'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
  'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2'
];
const playerToolKeys = [
  'tool_watering_can', 'tool_basket', 'tool_sickle'
];

reportCheck('Forbidden: Player', '_genPlayerTextures method exists', hasPlayerMethod, 'Method missing');

playerWalkKeys.forEach(key => {
  reportCheck('Forbidden: Player Walk', key, gameCode.includes(`'${key}'`), 'Walk frame missing');
});

playerActionKeys.forEach(key => {
  reportCheck('Forbidden: Player Action', key, gameCode.includes(`'${key}'`), 'Action frame missing');
});

playerToolKeys.forEach(key => {
  reportCheck('Forbidden: Player Tool', key, gameCode.includes(`'${key}'`), 'Tool texture missing');
});

// Check legacy farmer0..3 textures
for (let i = 0; i < 4; i++) {
  reportCheck('Forbidden: Player Legacy', `farmer${i}`, gameCode.includes(`'farmer${i}'`) || gameCode.includes("'farmer'+fr") || gameCode.includes('`farmer${fr}`') || gameCode.includes('`farmer${i}`'), 'Legacy farmer texture missing');
}

// b. Ginger Cat NPC
const hasCatIdle = gameCode.includes("'cat_idle_0'");
const hasCatWalk = gameCode.includes("'cat_walk_0'");
const hasCatSit = gameCode.includes("'cat_sit_0'");
const hasCatSleep = gameCode.includes("'cat_sleep_0'");
const hasCatNpc = gameCode.includes("'cat_npc'");
const hasCatIdleAnim = gameCode.includes("'cat-idle'");
const hasCatWalkAnim = gameCode.includes("'cat-walk'");
const hasCatSitAnim = gameCode.includes("'cat-sit'");
const hasCatSleepAnim = gameCode.includes("'cat-sleep'");

reportCheck('Forbidden: Ginger Cat', 'cat_idle_0 frame present', hasCatIdle, 'Frame missing');
reportCheck('Forbidden: Ginger Cat', 'cat_walk_0 frame present', hasCatWalk, 'Frame missing');
reportCheck('Forbidden: Ginger Cat', 'cat_sit_0 frame present', hasCatSit, 'Frame missing');
reportCheck('Forbidden: Ginger Cat', 'cat_sleep_0 frame present', hasCatSleep, 'Frame missing');
reportCheck('Forbidden: Ginger Cat', 'cat_npc fallback present', hasCatNpc, 'Key missing');
reportCheck('Forbidden: Ginger Cat', 'cat-idle animation registered', hasCatIdleAnim, 'Anim missing');
reportCheck('Forbidden: Ginger Cat', 'cat-walk animation registered', hasCatWalkAnim, 'Anim missing');
reportCheck('Forbidden: Ginger Cat', 'cat-sit animation registered', hasCatSitAnim, 'Anim missing');
reportCheck('Forbidden: Ginger Cat', 'cat-sleep animation registered', hasCatSleepAnim, 'Anim missing');

// c. Wizard Merlin NPC
const hasWizIdle = gameCode.includes("'wizard_idle_0'");
const hasWizNpc = gameCode.includes("'wizard_npc'");
const hasWizAnim = gameCode.includes("'wizard-idle'");
const hasGwizProcedural = gameCode.includes('gwiz.generateTexture');

reportCheck('Forbidden: Wizard Merlin', 'wizard_idle_0 frame present', hasWizIdle, 'Frame missing');
reportCheck('Forbidden: Wizard Merlin', 'wizard_npc texture present', hasWizNpc, 'Texture missing');
reportCheck('Forbidden: Wizard Merlin', 'wizard-idle animation registered', hasWizAnim, 'Anim missing');
reportCheck('Forbidden: Wizard Merlin', 'gwiz procedural generation present', hasGwizProcedural, 'Procedural generation missing');

// d. DynamicShadowSystem
const hasShadowClass = gameCode.includes('class DynamicShadowSystem');
const shadowInstantiationsCount = (gameCode.match(/new DynamicShadowSystem/g) || []).length;

reportCheck('Forbidden: DynamicShadowSystem', 'class DynamicShadowSystem present', hasShadowClass, 'Class definition missing');
reportCheck('Forbidden: DynamicShadowSystem', 'DynamicShadowSystem instantiations present (>= 2)', shadowInstantiationsCount >= 2, `Found ${shadowInstantiationsCount} instantiations`);

// ---------------------------------------------------------
// VERDICT & SUMMARY
// ---------------------------------------------------------
console.log('\n====================================================');
console.log(`VERIFICATION SUMMARY: ${totalPassed} PASSED, ${totalFailures} FAILED`);
console.log(`FINAL VERDICT: ${totalFailures === 0 ? 'PASS' : 'FAIL'}`);
console.log('====================================================');

process.exit(totalFailures === 0 ? 0 : 1);
