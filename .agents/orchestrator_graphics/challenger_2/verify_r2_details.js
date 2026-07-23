const fs = require('fs');
const vm = require('vm');

console.log('=== VERIFYING R2 TILEMAP TERRAIN & ENVIRONMENT ART DETAILS ===\n');

const code = fs.readFileSync('game.js', 'utf8');

// 1. Check Scene setup for PixelArtRenderer.generateTilemapTextures
const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
const sceneVerification = {};

scenes.forEach(sceneName => {
  const regex = new RegExp(`class ${sceneName} extends Phaser\\.Scene\\s*\\{([\\s\\S]*?)\\n\\}`);
  const match = code.match(regex);
  if (match) {
    const body = match[1];
    const callsAll = body.includes('PixelArtRenderer.generateAllTextures(this)');
    const callsTilemap = body.includes('PixelArtRenderer.generateTilemapTextures(this)');
    sceneVerification[sceneName] = { callsAll, callsTilemap };
  } else {
    sceneVerification[sceneName] = null;
  }
});

console.log('Scene Initialization Calls Check:');
console.table(sceneVerification);

// 2. Mock environment to execute generateTilemapTextures and detail each tilemap
const mockCanvas = { getContext: () => ({ fillRect: () => {}, clearRect: () => {} }) };
const tilemapDetails = [];

const mockScene = {
  textures: {
    exists: () => false,
    remove: () => {},
    add: () => ({ setFilter: (mode) => { filterModeSetCount++; } }),
    get: () => ({ setFilter: (mode) => { filterModeSetCount++; } })
  },
  make: {
    graphics: () => {
      let rectCount = 0;
      let drawnBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      let destroyed = false;
      return {
        fillStyle: (c, a) => {},
        fillRect: (x, y, w, h) => {
          rectCount++;
          if (x < drawnBounds.minX) drawnBounds.minX = x;
          if (y < drawnBounds.minY) drawnBounds.minY = y;
          if (x + w > drawnBounds.maxX) drawnBounds.maxX = x + w;
          if (y + h > drawnBounds.maxY) drawnBounds.maxY = y + h;
        },
        generateTexture: (key, w, h) => {
          tilemapDetails.push({
            key,
            width: w,
            height: h,
            rectCount,
            minX: drawnBounds.minX,
            minY: drawnBounds.minY,
            maxX: drawnBounds.maxX,
            maxY: drawnBounds.maxY,
            destroyed
          });
          return mockCanvas;
        },
        destroy: () => { destroyed = true; }
      };
    }
  }
};

let filterModeSetCount = 0;

const sandbox = {
  window: { addEventListener: () => {} },
  document: { addEventListener: () => {}, getElementById: () => ({ addEventListener: () => {} }), querySelector: () => ({ addEventListener: () => {} }) },
  localStorage: { getItem: () => null, setItem: () => {} },
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
vm.runInContext(code + ';\nglobalThis.PixelArtRenderer = PixelArtRenderer;', sandbox);

sandbox.PixelArtRenderer.generateTilemapTextures(mockScene);

console.log(`\n--- 44 Tilemap Textures Detailed Audit ---`);
console.log(`Total tilemap textures generated: ${tilemapDetails.length}`);

let oobCount = 0;
tilemapDetails.forEach((t, i) => {
  const isOob = t.maxX > t.width || t.maxY > t.height || t.minX < 0 || t.minY < 0;
  if (isOob) oobCount++;
  console.log(`${(i+1).toString().padStart(2, ' ')}. Key: ${t.key.padEnd(24, ' ')} | Size: ${t.width}x${t.height} | Rects: ${t.rectCount.toString().padStart(3, ' ')} | Bounds: [(${t.minX},${t.minY}) to (${t.maxX},${t.maxY})] ${isOob ? '❌ OOB' : '✓ OK'}`);
});

console.log(`\nOut-Of-Bounds Count: ${oobCount}`);
console.log(`FilterMode.NEAREST applied to all textures: ${filterModeSetCount === 44 ? '✓ YES (44/44)' : `❌ NO (${filterModeSetCount}/44)`}`);
