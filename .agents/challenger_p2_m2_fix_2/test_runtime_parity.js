const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gameJsPath = path.resolve(__dirname, '../../game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log(`=== RUNTIME EMULATION PARITY TEST ===\n`);

const noop = () => {};
const mockTextures = new Map();
const createdTextures = [];

const mockScene = {
  textures: {
    exists: (key) => mockTextures.has(key),
    get: (key) => ({ setFilter: noop }),
    remove: (key) => mockTextures.delete(key)
  },
  make: {
    graphics: () => ({
      fillStyle: () => {},
      fillRect: () => {},
      generateTexture: (key, w, h) => {
        createdTextures.push({ key, w, h });
        mockTextures.set(key, true);
      },
      destroy: () => {}
    })
  }
};

const mockElement = {
  addEventListener: noop,
  removeEventListener: noop,
  style: {},
  classList: { add: noop, remove: noop, toggle: noop },
  setAttribute: noop,
  removeAttribute: noop
};

// Create sandbox with browser & timer mocks
const sandbox = {
  console,
  setTimeout: noop,
  clearTimeout: noop,
  setInterval: noop,
  clearInterval: noop,
  localStorage: { getItem: () => null, setItem: noop },
  Phaser: {
    Textures: { FilterMode: { NEAREST: 1 } },
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Game: function() {},
    Scene: function() {},
    Math: { Between: () => 0, FloatBetween: () => 0 }
  },
  window: {
    addEventListener: noop,
    removeEventListener: noop,
    innerWidth: 1024,
    innerHeight: 768,
    AudioContext: function() { return { createGain: () => ({ connect: noop }), destination: {} }; },
    webkitAudioContext: function() { return { createGain: () => ({ connect: noop }), destination: {} }; }
  },
  document: {
    addEventListener: noop,
    removeEventListener: noop,
    createElement: () => ({ getContext: () => ({ fillRect: noop, drawImage: noop }), style: {}, classList: mockElement.classList }),
    getElementById: () => mockElement,
    querySelector: () => mockElement,
    querySelectorAll: () => [mockElement]
  },
  navigator: { userAgent: 'node' }
};

vm.createContext(sandbox);

try {
  vm.runInContext(code, sandbox);
  console.log('[PASS] game.js successfully loaded in Node VM context.');

  const PixelArtRenderer = vm.runInContext('PixelArtRenderer', sandbox);
  if (!PixelArtRenderer) {
    throw new Error('PixelArtRenderer class evaluate failed');
  }

  // Clear created textures
  createdTextures.length = 0;
  mockTextures.clear();

  // Test Arcade Textures
  PixelArtRenderer._genArcadeTextures(mockScene);
  const arcadeKeys = createdTextures.map(t => t.key);
  console.log(`\nArcade Textures Registered (${arcadeKeys.length}):`);
  arcadeKeys.forEach(k => console.log(`  - ${k}`));

  const expectedArcade = [
    'arcade_player_ship', 'alien_scout', 'alien_shooter', 'alien_elite',
    'alien_boss', 'laser_player', 'powerup_weapon', 'powerup_shield', 'powerup_nuke'
  ];

  const missingArcade = expectedArcade.filter(k => !arcadeKeys.includes(k));
  if (missingArcade.length > 0) {
    console.error(`[FAIL] Missing Arcade keys: ${missingArcade.join(', ')}`);
    process.exit(1);
  }
  console.log(`[PASS] All 9 Arcade texture keys present and registered via PixelArtRenderer._genArcadeTextures().`);

  // Clear created textures
  createdTextures.length = 0;
  mockTextures.clear();

  // Test Dungeon Textures
  PixelArtRenderer._genDungeonTextures(mockScene);
  const dungeonKeys = createdTextures.map(t => t.key);
  console.log(`\nDungeon Textures Registered (${dungeonKeys.length}):`);
  dungeonKeys.forEach(k => console.log(`  - ${k}`));

  const expectedDungeon = [
    'dungeon_green_slime', 'dungeon_goblin_warrior', 'dungeon_skeleton_archer',
    'dungeon_boss', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_chest', 'loot_scroll'
  ];

  const missingDungeon = expectedDungeon.filter(k => !dungeonKeys.includes(k));
  if (missingDungeon.length > 0) {
    console.error(`[FAIL] Missing Dungeon keys: ${missingDungeon.join(', ')}`);
    process.exit(1);
  }
  console.log(`[PASS] All 9 Dungeon texture keys present and registered via PixelArtRenderer._genDungeonTextures().`);

  console.log(`\n=================================================`);
  console.log(`RUNTIME EMULATION PARITY RESULT: PASS`);
  console.log(`=================================================\n`);
} catch (err) {
  console.error('[FAIL] VM execution error:', err);
  process.exit(1);
}
