const fs = require('fs');
const vm = require('vm');

console.log('=== EMPIRICAL TEST HARNESS FOR MILESTONE R2 TILEMAPS & GRAPHICS API ===\n');

// 1. Setup Mock Browser / Phaser Environment
const mockCanvas = {
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8Array(4) }),
    putImageData: () => {},
    createImageData: () => {},
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
  }),
  width: 48,
  height: 48
};

const graphicsTracker = {
  createdCount: 0,
  destroyedCount: 0,
  currentlyActive: new Set(),
  calls: [],
  boundsErrors: [],
  colorErrors: [],
  texturesGenerated: new Map()
};

class MockGraphics {
  constructor(id) {
    this.id = id;
    this.currentStyle = { color: 0, alpha: 1 };
    this.drawnRects = [];
    this.destroyed = false;
  }

  fillStyle(color, alpha = 1) {
    if (this.destroyed) {
      graphicsTracker.calls.push({ type: 'ERROR', msg: `fillStyle called on destroyed Graphics #${this.id}` });
    }
    if (typeof color !== 'number' || isNaN(color) || color < 0 || color > 0xFFFFFF) {
      graphicsTracker.colorErrors.push({ id: this.id, color, alpha, reason: 'Invalid color value' });
    }
    if (typeof alpha !== 'number' || isNaN(alpha) || alpha < 0 || alpha > 1) {
      graphicsTracker.colorErrors.push({ id: this.id, color, alpha, reason: 'Invalid alpha value' });
    }
    this.currentStyle = { color, alpha };
    return this;
  }

  fillRect(x, y, width, height) {
    if (this.destroyed) {
      graphicsTracker.calls.push({ type: 'ERROR', msg: `fillRect called on destroyed Graphics #${this.id}` });
    }
    if ([x, y, width, height].some(v => typeof v !== 'number' || isNaN(v))) {
      graphicsTracker.boundsErrors.push({ id: this.id, x, y, width, height, reason: 'NaN or non-numeric argument' });
    }
    this.drawnRects.push({
      x, y, width, height,
      color: this.currentStyle.color,
      alpha: this.currentStyle.alpha,
      right: x + width,
      bottom: y + height
    });
    return this;
  }

  lineStyle(width, color, alpha = 1) {
    return this;
  }
  strokeRect(x, y, width, height) {
    return this;
  }
  beginPath() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  strokePath() { return this; }
  fillPath() { return this; }
  closePath() { return this; }

  generateTexture(key, width, height) {
    if (this.destroyed) {
      graphicsTracker.calls.push({ type: 'ERROR', msg: `generateTexture called on destroyed Graphics #${this.id}` });
    }
    if (typeof width !== 'number' || isNaN(width) || width <= 0 ||
        typeof height !== 'number' || isNaN(height) || height <= 0) {
      graphicsTracker.boundsErrors.push({ id: this.id, key, width, height, reason: 'Invalid texture dimensions' });
    }

    // Check drawn rect bounds against target texture size
    this.drawnRects.forEach(r => {
      if (r.x < 0 || r.y < 0 || r.right > width || r.bottom > height) {
        graphicsTracker.boundsErrors.push({
          id: this.id,
          key,
          rect: r,
          textureBounds: { width, height },
          reason: `Rect (${r.x},${r.y},${r.width},${r.height}) extends out of texture bounds (0,0,${width},${height})`
        });
      }
    });

    const memoryBytes = width * height * 4; // RGBA 4 bytes/pixel
    graphicsTracker.texturesGenerated.set(key, {
      width,
      height,
      rectCount: this.drawnRects.length,
      memoryBytes,
      graphicsId: this.id
    });

    return mockCanvas;
  }

  destroy() {
    if (this.destroyed) {
      graphicsTracker.calls.push({ type: 'WARNING', msg: `Graphics #${this.id} destroyed multiple times` });
    }
    this.destroyed = true;
    graphicsTracker.destroyedCount++;
    graphicsTracker.currentlyActive.delete(this);
  }
}

class MockTexture {
  constructor(key) {
    this.key = key;
    this.filterMode = null;
  }
  setFilter(mode) {
    this.filterMode = mode;
  }
}

function createMockScene() {
  const textureStore = new Map();
  let graphicsIdCounter = 0;

  return {
    textures: {
      exists: (key) => textureStore.has(key),
      remove: (key) => textureStore.delete(key),
      add: (key) => {
        const tex = new MockTexture(key);
        textureStore.set(key, tex);
        return tex;
      },
      get: (key) => textureStore.get(key) || new MockTexture(key)
    },
    make: {
      graphics: (config) => {
        graphicsIdCounter++;
        const g = new MockGraphics(graphicsIdCounter);
        graphicsTracker.createdCount++;
        graphicsTracker.currentlyActive.add(g);
        return g;
      }
    },
    add: {
      graphics: (config) => {
        graphicsIdCounter++;
        const g = new MockGraphics(graphicsIdCounter);
        graphicsTracker.createdCount++;
        graphicsTracker.currentlyActive.add(g);
        return g;
      },
      image: () => ({ setOrigin: () => {}, setScrollFactor: () => {}, setDepth: () => {} }),
      sprite: () => ({ setOrigin: () => {}, setScrollFactor: () => {}, setDepth: () => {}, play: () => {} }),
      tileSprite: () => ({ setOrigin: () => {}, setScrollFactor: () => {}, setDepth: () => {} }),
      text: () => ({ setOrigin: () => {}, setScrollFactor: () => {}, setDepth: () => {} }),
      group: () => ({ add: () => {}, create: () => {} }),
      container: () => ({ add: () => {} })
    },
    cameras: { main: { setBounds: () => {}, startFollow: () => {}, setZoom: () => {} } },
    physics: {
      add: {
        group: () => ({ add: () => {}, create: () => {} }),
        existing: () => {},
        overlap: () => {},
        collider: () => {}
      }
    },
    events: { on: () => {}, emit: () => {} }
  };
}

// 2. Load game.js in Context
const gameJsCode = fs.readFileSync('game.js', 'utf8');

const sandbox = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    AudioContext: class {
      createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
      createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
      createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
      createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
      createBiquadFilter() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
      resume() {}
      get destination() { return {}; }
      get currentTime() { return 0; }
      get sampleRate() { return 44100; }
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  },
  document: {
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => mockCanvas,
    querySelector: () => ({ addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } }),
    getElementById: () => ({ addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } })
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: {},
  console: console,
  Math: Math,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Phaser: {
    Game: class {},
    Scene: class {},
    AUTO: 0,
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Textures: { FilterMode: { NEAREST: 1, LINEAR: 0 } }
  }
};

vm.createContext(sandbox);
sandbox.globalThis = sandbox;
sandbox.global = sandbox;
vm.runInContext(gameJsCode + ';\nglobalThis.PixelArtRenderer = PixelArtRenderer;\nglobalThis.FarmScene = typeof FarmScene !== "undefined" ? FarmScene : null;\nglobalThis.FishingScene = typeof FishingScene !== "undefined" ? FishingScene : null;\nglobalThis.ArcadeScene = typeof ArcadeScene !== "undefined" ? ArcadeScene : null;\nglobalThis.DungeonScene = typeof DungeonScene !== "undefined" ? DungeonScene : null;', sandbox);

console.log('✓ Loaded game.js in Node VM sandbox successfully.');

// 3. Test PixelArtRenderer.generateTilemapTextures(scene)
console.log('\n--- 1. Testing generateTilemapTextures ---');
const testScene = createMockScene();
sandbox.PixelArtRenderer.generateTilemapTextures(testScene);

console.log(`Graphics created: ${graphicsTracker.createdCount}`);
console.log(`Graphics destroyed: ${graphicsTracker.destroyedCount}`);
console.log(`Graphics currently active (leaked): ${graphicsTracker.currentlyActive.size}`);
console.log(`Textures generated in tilemap: ${graphicsTracker.texturesGenerated.size}`);

// Verify memory footprint of the 44 tilemap textures
let totalTilemapMemory = 0;
graphicsTracker.texturesGenerated.forEach((data, key) => {
  totalTilemapMemory += data.memoryBytes;
});
console.log(`Total memory for 44 tilemaps: ${(totalTilemapMemory / 1024).toFixed(2)} KB (${totalTilemapMemory} bytes)`);

// 4. Detailed Validation of Tilemap Keys & Bounds
const expectedTilemapKeys = [
  // Farm Scene (16)
  'tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover',
  'tile_path_straight', 'tile_path_corner', 'tile_path_cross', 'tile_path_single', 'tile_path_stone',
  'tile_fence_h', 'tile_fence_v', 'tile_fence_post', 'tile_fence_corner',
  'tile_house_roof', 'tile_house_wall', 'tile_house_door', 'tile_house_window',
  // Fishing Shore (5)
  'tile_shore_top', 'tile_shore_bottom', 'tile_shore_left', 'tile_shore_right', 'tile_shore_corner',
  // Fishing Scene (11)
  'tile_sand', 'tile_sand_wet', 'tile_rock_shore',
  'tile_pier_plank', 'tile_pier_post', 'tile_pier_lantern',
  'tile_seashell', 'tile_starfish', 'tile_driftwood',
  'tile_ocean_deep', 'tile_water_foam_border',
  // Arcade Scene (7)
  'tile_space_dark', 'tile_stars_far', 'tile_stars_near',
  'nebula_purple', 'nebula_cyan', 'planet_ringed', 'planet_gas_giant',
  // Dungeon Scene (5)
  'tile_dungeon_floor', 'tile_dungeon_cracked', 'tile_dungeon_wall_moss',
  'dungeon_torch', 'tile_dungeon_rune'
];

console.log(`\nExpected Tilemap Count: 44. Found: ${expectedTilemapKeys.length}`);
let missingKeys = [];
expectedTilemapKeys.forEach(k => {
  if (!graphicsTracker.texturesGenerated.has(k)) {
    missingKeys.push(k);
  }
});
if (missingKeys.length > 0) {
  console.log(`❌ Missing Tilemap Keys (${missingKeys.length}):`, missingKeys);
} else {
  console.log(`✓ All 44 expected tilemap textures are registered!`);
}

// Check bounds errors
if (graphicsTracker.boundsErrors.length > 0) {
  console.log(`\n⚠️ BOUNDS ERRORS DETECTED (${graphicsTracker.boundsErrors.length}):`);
  graphicsTracker.boundsErrors.forEach((e, i) => {
    console.log(`  [${i+1}] Key: ${e.key}, Reason: ${e.reason}`);
  });
} else {
  console.log(`✓ Zero Graphics API bounds errors detected across all tilemaps!`);
}

// Check color errors
if (graphicsTracker.colorErrors.length > 0) {
  console.log(`\n⚠️ COLOR ERRORS DETECTED (${graphicsTracker.colorErrors.length}):`);
  graphicsTracker.colorErrors.forEach((e, i) => {
    console.log(`  [${i+1}] Id: ${e.id}, Color: ${e.color}, Alpha: ${e.alpha}, Reason: ${e.reason}`);
  });
} else {
  console.log(`✓ Zero invalid color/alpha values in Graphics calls!`);
}

// Check memory leaks (Graphics objects not destroyed)
if (graphicsTracker.currentlyActive.size > 0) {
  console.log(`\n❌ MEMORY LEAK: ${graphicsTracker.currentlyActive.size} Graphics objects were not destroyed!`);
} else {
  console.log(`✓ Zero Graphics object memory leaks! (All graphics objects destroyed after generateTexture).`);
}

// 5. Test Full generateAllTextures (R1 + R2)
console.log('\n--- 2. Testing generateAllTextures (R1 + R2 Full Execution) ---');
const fullScene = createMockScene();
graphicsTracker.createdCount = 0;
graphicsTracker.destroyedCount = 0;
graphicsTracker.currentlyActive.clear();
graphicsTracker.boundsErrors = [];
graphicsTracker.colorErrors = [];
graphicsTracker.texturesGenerated.clear();

sandbox.PixelArtRenderer.generateAllTextures(fullScene);

console.log(`Total Textures Generated: ${graphicsTracker.texturesGenerated.size}`);
let totalAllMemory = 0;
graphicsTracker.texturesGenerated.forEach((data, key) => {
  totalAllMemory += data.memoryBytes;
});
console.log(`Total Texture Memory (R1 + R2): ${(totalAllMemory / 1024).toFixed(2)} KB (${totalAllMemory} bytes)`);
console.log(`Graphics created: ${graphicsTracker.createdCount}`);
console.log(`Graphics destroyed: ${graphicsTracker.destroyedCount}`);
console.log(`Graphics leaked: ${graphicsTracker.currentlyActive.size}`);

if (graphicsTracker.boundsErrors.length > 0) {
  console.log(`\n⚠️ BOUNDS ERRORS IN FULL TEXTURES (${graphicsTracker.boundsErrors.length}):`);
  graphicsTracker.boundsErrors.forEach((e, i) => {
    console.log(`  [${i+1}] Key: ${e.key}, Reason: ${e.reason}`);
  });
} else {
  console.log(`✓ Zero bounds errors in full R1+R2 texture generation!`);
}

// 6. Idempotency and Edge Case Testing
console.log('\n--- 3. Testing Idempotency & Edge Cases ---');

// Test 1: Idempotency (calling generateTilemapTextures twice on same scene)
const countBefore = graphicsTracker.texturesGenerated.size;
sandbox.PixelArtRenderer.generateTilemapTextures(fullScene);
const countAfter = graphicsTracker.texturesGenerated.size;
console.log(`Idempotency Check: Before=${countBefore}, After=${countAfter} (Expected equal: ${countBefore === countAfter})`);

// Test 2: Null / Undefined scene
try {
  sandbox.PixelArtRenderer.generateTilemapTextures(null);
  sandbox.PixelArtRenderer.generateTilemapTextures({});
  sandbox.PixelArtRenderer.generateAllTextures(null);
  console.log(`✓ Handled null/invalid scene without throwing uncaught exceptions.`);
} catch (e) {
  console.log(`❌ Exception when passing null scene:`, e.message);
}

// 7. Check Scenes in game.js for Scene-Level Memory / Graphics API Usage
console.log('\n--- 4. Codebase Search for Graphics Usage in Scene Classes ---');
const scenesToAudit = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
scenesToAudit.forEach(sceneName => {
  const sceneRegex = new RegExp(`class ${sceneName} extends Phaser\\.Scene\\s*\\{([\\s\\S]*?)\\n\\}`);
  const sMatch = gameJsCode.match(sceneRegex);
  if (sMatch) {
    const sBody = sMatch[1];
    const addGraphicsCalls = (sBody.match(/this\.add\.graphics\([^)]*\)/g) || []).length;
    const makeGraphicsCalls = (sBody.match(/this\.make\.graphics\([^)]*\)/g) || []).length;
    const tilemapUsages = (sBody.match(/createTilemap|make\.tilemap|add\.tilemap|tilemap/gi) || []).length;
    console.log(`Scene [${sceneName}]: add.graphics=${addGraphicsCalls}, make.graphics=${makeGraphicsCalls}, tilemap references=${tilemapUsages}`);
  }
});

console.log('\n=== EMPIRICAL TEST RUN COMPLETE ===');
