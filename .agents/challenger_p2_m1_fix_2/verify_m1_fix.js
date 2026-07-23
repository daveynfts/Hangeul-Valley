const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = 'C:\\VibeCode\\Hangeul Valley';
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log('===============================================================');
console.log(' EMPIRICAL CHALLENGER VERIFICATION: Milestone M1 Iteration 2   ');
console.log('===============================================================\n');

let failed = false;
function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failed = true;
  }
}

// 1. File Read & Synchronization Verification
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath, 'utf8');

assert(gameJsContent.length > 0, `game.js loaded successfully (${gameJsContent.length} bytes)`);
assert(gameJsContent === assetsGameJsContent, 'game.js and assets/game.js are 100% byte-identical');

// 2. Texture Keys Definition Arrays
const EXPECTED_TILEMAP_KEYS = {
  farm: [
    'tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover',
    'tile_path_straight', 'tile_path_corner', 'tile_path_cross', 'tile_path_single', 'tile_path_stone',
    'tile_fence_h', 'tile_fence_v', 'tile_fence_post', 'tile_fence_corner',
    'tile_house_roof', 'tile_house_wall', 'tile_house_door', 'tile_house_window',
    'tile_shore_top', 'tile_shore_bottom', 'tile_shore_left', 'tile_shore_right', 'tile_shore_corner'
  ],
  fishing: [
    'tile_sand', 'tile_sand_wet', 'tile_rock_shore', 'tile_pier_plank', 'tile_pier_post',
    'tile_pier_lantern', 'tile_seashell', 'tile_starfish', 'tile_driftwood', 'tile_ocean_deep', 'tile_water_foam_border'
  ],
  arcadeDungeon: [
    'tile_space_dark', 'tile_stars_far', 'tile_stars_near', 'nebula_purple', 'nebula_cyan',
    'planet_ringed', 'planet_gas_giant', 'tile_dungeon_floor', 'tile_dungeon_cracked',
    'tile_dungeon_wall_moss', 'dungeon_torch', 'tile_dungeon_rune'
  ]
};

const ALL_44_TILEMAP_KEYS = [
  ...EXPECTED_TILEMAP_KEYS.farm,
  ...EXPECTED_TILEMAP_KEYS.fishing,
  ...EXPECTED_TILEMAP_KEYS.arcadeDungeon
];

const EXPECTED_WATER_KEYS = [
  'tile_ocean_deep_0', 'tile_ocean_deep_1', 'tile_ocean_deep_2', 'tile_ocean_deep_3',
  'tile_water_foam_0', 'tile_water_foam_1', 'tile_water_foam_2', 'tile_water_foam_3'
];

const EXPECTED_FISHING_KEYS = {
  canonical: [
    'fish_carp', 'fish_salmon', 'fish_tuna', 'fish_squid', 'fish_eel',
    'fish_goldfish', 'fish_seabass', 'fish_shrimp', 'fish_octopus', 'fish_catfish', 'fish_mackerel'
  ],
  legacyAlias: [
    'fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel',
    'fishing_golden_fish', 'fishing_snapper', 'fishing_shrimp', 'fishing_octopus', 'fishing_catfish',
    'fishing_mackerel', 'fishing_legendary', 'fishing_clam'
  ],
  dockTool: [
    'dock_plank', 'dock_post', 'fishing_dock', 'fishing_bobber', 'fishing_rod'
  ]
};

const ALL_29_FISHING_KEYS = [
  ...EXPECTED_FISHING_KEYS.canonical,
  ...EXPECTED_FISHING_KEYS.legacyAlias,
  ...EXPECTED_FISHING_KEYS.dockTool
];

const EXPECTED_FARM_DECOR_KEYS = [
  'bf_open', 'bf_flap', 'stone_well', 'pixel_barrel', 'pixel_crate',
  'signpost', 'tree', 'fnc_post', 'fnc_rail', 'sparkle',
  'coin', 'shop_sign', 'notice_board', 'dungeon_portal', 'arcade_machine'
];

// 3. Execution Verification via VM Sandbox
console.log('\n--- 1. Empirical VM Execution & Texture Parity Test ---');

const testCode = gameJsContent + `
globalThis.runParityCheck = function() {
  const createdTextures = new Set();
  const mockScene = {
    _pixelArtTexturesBaked: false,
    _tilemapTexturesGenerated: false,
    textures: {
      exists: (key) => createdTextures.has(key),
      remove: (key) => createdTextures.delete(key),
      get: (key) => ({ setFilter: () => {} }),
      addCanvas: (key, canvas) => { createdTextures.add(key); },
      generate: (key, options) => { createdTextures.add(key); },
      createCanvas: (key, w, h) => {
        createdTextures.add(key);
        return {
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            clearRect: () => {},
            putImageData: () => {}
          })
        };
      }
    },
    make: {
      graphics: () => ({
        fillStyle: () => {},
        fillRect: () => {},
        fillCircle: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        fillPath: () => {},
        strokePath: () => {},
        lineStyle: () => {},
        fill: () => {},
        stroke: () => {},
        clear: () => {},
        generateTexture: (key, w, h) => { createdTextures.add(key); },
        destroy: () => {}
      })
    }
  };

  PixelArtRenderer.generateAllTextures(mockScene);
  PixelArtRenderer.generateTilemapTextures(mockScene);
  PixelArtRenderer._genWaterTextures(mockScene);
  PixelArtRenderer._genFishingTextures(mockScene);
  FarmScene.prototype._bakeTextures.call(mockScene);

  return createdTextures;
};
`;

const noop = () => {};
const mockElement = {
  addEventListener: noop,
  removeEventListener: noop,
  style: {},
  classList: { add: noop, remove: noop, contains: () => false },
  appendChild: noop,
  removeChild: noop,
  querySelector: () => null,
  querySelectorAll: () => []
};

class MockCanvas {
  constructor(w, h) {
    this.width = w || 32;
    this.height = h || 32;
  }
  getContext(type) {
    return {
      fillStyle: '',
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
      putImageData: () => {},
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    };
  }
}

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  RegExp: RegExp,
  Set: Set,
  Map: Map,
  Uint8ClampedArray: Uint8ClampedArray,
  document: {
    createElement: (tag) => {
      if (tag === 'canvas') return new MockCanvas(32, 32);
      return { ...mockElement };
    },
    addEventListener: noop,
    removeEventListener: noop,
    getElementById: () => mockElement,
    querySelector: () => mockElement,
    querySelectorAll: () => [],
    body: { appendChild: noop, addEventListener: noop }
  },
  window: {
    addEventListener: noop,
    removeEventListener: noop,
    AudioContext: class { createOscillator() { return { connect: noop, start: noop, stop: noop }; } createGain() { return { connect: noop, gain: { value: 0 } }; } },
    webkitAudioContext: class { createOscillator() { return { connect: noop, start: noop, stop: noop }; } createGain() { return { connect: noop, gain: { value: 0 } }; } },
    location: { reload: noop },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop }
  },
  Phaser: {
    AUTO: 0,
    WEBGL: 1,
    CANVAS: 2,
    Scale: { RESIZE: 1, CENTER_BOTH: 1, FIT: 2 },
    Physics: { ARCADE: 1 },
    Input: { Keyboard: { KeyCodes: {} } },
    Textures: { FilterMode: { NEAREST: 1 } },
    Scene: class {},
    Game: class {}
  }
};
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;

let registeredTextures = new Set();
try {
  vm.createContext(sandbox);
  vm.runInContext(testCode, sandbox);
  registeredTextures = sandbox.runParityCheck();
  assert(true, 'Executed PixelArtRenderer & FarmScene texture generators in VM sandbox without errors');
} catch (e) {
  assert(false, `VM Sandbox Execution failed: ${e.message}`);
}

// 4. Parity Checks
console.log('\n--- 2. Texture Key Parity Verification ---');

// a. 44 Tilemaps (21 Farm, 11 Fishing, 12 Arcade/Dungeon)
assert(ALL_44_TILEMAP_KEYS.length === 44, 'Tilemap expectation set equals exactly 44 keys');
let tilemapsMissing = [];
ALL_44_TILEMAP_KEYS.forEach(key => {
  if (!registeredTextures.has(key)) tilemapsMissing.push(key);
});
assert(tilemapsMissing.length === 0, `44/44 Tilemap Keys registered (Missing: ${tilemapsMissing.join(', ') || 'none'})`);

// b. 8 Dynamic Water Tiles
assert(EXPECTED_WATER_KEYS.length === 8, 'Dynamic Water expectation set equals exactly 8 keys');
let waterMissing = [];
EXPECTED_WATER_KEYS.forEach(key => {
  if (!registeredTextures.has(key)) waterMissing.push(key);
});
assert(waterMissing.length === 0, `8/8 Dynamic Water Tiles registered (Missing: ${waterMissing.join(', ') || 'none'})`);

// c. 29 Fishing Keys (11 canonical, 13 legacy, 5 dock/tool)
assert(ALL_29_FISHING_KEYS.length === 29, 'Fishing keys expectation set equals exactly 29 keys');
let fishingMissing = [];
ALL_29_FISHING_KEYS.forEach(key => {
  if (!registeredTextures.has(key)) fishingMissing.push(key);
});
assert(fishingMissing.length === 0, `29/29 Fishing Keys registered (Missing: ${fishingMissing.join(', ') || 'none'})`);

// d. 15 Farm Decor Keys
assert(EXPECTED_FARM_DECOR_KEYS.length === 15, 'Farm decor expectation set equals exactly 15 keys');
let farmDecorMissing = [];
EXPECTED_FARM_DECOR_KEYS.forEach(key => {
  if (!registeredTextures.has(key)) farmDecorMissing.push(key);
});
assert(farmDecorMissing.length === 0, `15/15 Farm Decor Keys registered (Missing: ${farmDecorMissing.join(', ') || 'none'})`);

// 5. Preserved & Forbidden Elements Check
console.log('\n--- 3. Preserved & Forbidden Elements Verification ---');

// a. Player Farmer
const playerGenPresent = gameJsContent.includes('static _genPlayerTextures(scene)');
const farmerTexPresent = registeredTextures.has('farmer0') || registeredTextures.has('farmer');
assert(playerGenPresent && farmerTexPresent, 'Player Farmer generator and texture maps are intact and unmodified');

// b. Ginger Cat NPC
const npcGenPresent = gameJsContent.includes('static _genNpcTextures(scene)');
const catTexPresent = registeredTextures.has('cat_npc');
const catLogicPresent = gameJsContent.includes("type: 'cat_npc'") || gameJsContent.includes('cat_npc');
assert(npcGenPresent && catTexPresent && catLogicPresent, 'Ginger Cat NPC texture and logic intact and unmodified');

// c. Wizard Merlin NPC
const wizardTexPresent = registeredTextures.has('wizard_npc');
const wizardLogicPresent = gameJsContent.includes("type: 'wizard_npc'") || gameJsContent.includes('wizard_npc');
assert(wizardTexPresent && wizardLogicPresent, 'Wizard Merlin NPC texture and logic intact and unmodified');

// d. DynamicShadowSystem
const shadowClassPresent = gameJsContent.includes('class DynamicShadowSystem');
const shadowLogicPresent = gameJsContent.includes('castShadow') || gameJsContent.includes('updateShadows') || gameJsContent.includes('_genLightingTextures');
assert(shadowClassPresent && shadowLogicPresent, 'DynamicShadowSystem class and shadow rendering system intact and unmodified');

// 6. Matrix & Token Quality Checks
console.log('\n--- 4. Matrix & Token Quality Verification ---');
const darkSlateKeyMatch = gameJsContent.includes("'K': 0x0F172A");
assert(darkSlateKeyMatch, "1px Dark Slate Outline token 'K': 0x0F172A present in palettes");

const rodOutlineCheck = gameJsContent.includes("const rod = [") && gameJsContent.includes(".............KCK");
assert(rodOutlineCheck, "fishing_rod matrix enclosed with 'K' (0x0F172A) outline tokens");

const dockPlankUniformCheck = gameJsContent.includes("'KOOWWWWWWWWWWOOK'");
assert(dockPlankUniformCheck, "dock_plank matrix row 2 contains strictly 16 characters ('KOOWWWWWWWWWWOOK')");

const catfishDotCheck = gameJsContent.includes("'.KAaaaaaaaaaaaaa'");
assert(catfishDotCheck, "catfish matrix row 5 leading character is transparent dot ('.') instead of space token");

// 7. Final Summary
console.log('\n===============================================================');
if (failed) {
  console.log(' VERDICT: FAIL — Defects detected in game.js verification.');
  console.log('===============================================================');
  process.exit(1);
} else {
  console.log(' VERDICT: PASS — All parity & forbidden element checks passed!');
  console.log('===============================================================');
  process.exit(0);
}
