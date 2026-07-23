const fs = require('fs');
const path = require('path');

console.log('=== STRESS TEST HARNESS FOR PIXEL ART RENDERER & GAME.JS ===\n');

// 1. File Synchronization Check
const rootGamePath = path.join(__dirname, '../../game.js');
const assetsGamePath = path.join(__dirname, '../../assets/game.js');

const rootGame = fs.readFileSync(rootGamePath);
const assetsGame = fs.readFileSync(assetsGamePath);

const isSynced = rootGame.equals(assetsGame);
console.log(`[FILE SYNC] Root game.js size: ${rootGame.length} bytes`);
console.log(`[FILE SYNC] Assets game.js size: ${assetsGame.length} bytes`);
console.log(`[FILE SYNC] Byte-for-byte sync status: ${isSynced ? 'SYNCHRONIZED (PASS)' : 'OUT OF SYNC (FAIL)'}`);

// 2. Texture Key Extraction & Collision Analysis
const gameContent = rootGame.toString('utf8');

// Find all createTexture calls
const createTexRegex = /createTexture\s*\(\s*scene\s*,\s*['"]([^'"]+)['"]/g;
const createdKeys = [];
let match;
while ((match = createTexRegex.exec(gameContent)) !== null) {
  createdKeys.push(match[1]);
}

console.log(`\n[TEXTURE KEYS] Total PixelArtRenderer.createTexture calls: ${createdKeys.length}`);
const keyCounts = {};
createdKeys.forEach(key => {
  keyCounts[key] = (keyCounts[key] || 0) + 1;
});

const duplicateKeys = Object.entries(keyCounts).filter(([k, c]) => c > 1);
console.log(`[TEXTURE KEYS] Unique keys created: ${Object.keys(keyCounts).length}`);
if (duplicateKeys.length > 0) {
  console.log(`[TEXTURE KEYS WARNING] Duplicate keys found within createTexture:`, duplicateKeys);
} else {
  console.log(`[TEXTURE KEYS] No duplicate keys found within createTexture calls.`);
}

// Find all Phaser texture references or creations in game.js outside PixelArtRenderer
const allTexturesAddRegex = /textures\.(addCanvas|generate|addBase64|add|create|get)\s*\(\s*['"]([^'"]+)['"]/g;
const phaserTextureCalls = [];
while ((match = allTexturesAddRegex.exec(gameContent)) !== null) {
  phaserTextureCalls.push({ method: match[1], key: match[2] });
}
console.log(`\n[PHASER TEXTURE CALLS] Total Phaser texture manager calls: ${phaserTextureCalls.length}`);

// Find all add.image / add.sprite calls and check if their key exists in PixelArtRenderer keys
const spriteImgRegex = /add\.(image|sprite)\s*\(\s*[^,]+,\s*[^,]+,\s*['"]([^'"]+)['"]/g;
const usedSpriteKeys = new Set();
while ((match = spriteImgRegex.exec(gameContent)) !== null) {
  usedSpriteKeys.add(match[2]);
}
console.log(`[SPRITE KEYS] Total unique sprite/image texture keys referenced: ${usedSpriteKeys.size}`);

// Check if any used sprite keys match PixelArtRenderer created keys
const pixelArtSet = new Set(createdKeys);
const matchedPixelArtKeys = Array.from(usedSpriteKeys).filter(k => pixelArtSet.has(k));
const missingPixelArtKeys = Array.from(usedSpriteKeys).filter(k => !pixelArtSet.has(k));
console.log(`[SPRITE KEYS] Sprite keys matching PixelArtRenderer: ${matchedPixelArtKeys.length}`);

// 3. PixelArtRenderer Matrix Analysis & Performance Benchmark Mock
// We will mock the scene and graphics object to measure drawing operations, matrix allocations, memory estimates
class MockGraphics {
  constructor() {
    this.operations = 0;
    this.rects = 0;
  }
  fillStyle(color, alpha) {
    this.operations++;
  }
  fillRect(x, y, w, h) {
    this.rects++;
    this.operations++;
  }
  generateTexture(key, width, height) {
    this.textureWidth = width;
    this.textureHeight = height;
  }
  destroy() {
    this.destroyed = true;
  }
}

class MockTextures {
  constructor() {
    this.textures = new Map();
  }
  exists(key) {
    return this.textures.has(key);
  }
  remove(key) {
    this.textures.delete(key);
  }
  get(key) {
    return this.textures.get(key);
  }
}

class MockScene {
  constructor() {
    this.textures = new MockTextures();
    this.anims = {
      exists: () => false,
      create: () => {}
    };
    this.make = {
      graphics: () => new MockGraphics()
    };
    this._pixelArtTexturesBaked = false;
  }
}

// Extract PixelArtRenderer code and evaluate in benchmark environment
try {
  const pixelArtRendererCode = gameContent.substring(
    gameContent.indexOf('class PixelArtRenderer'),
    gameContent.indexOf('const K = {')
  );

  // Evaluate PixelArtRenderer in context
  const evalFn = new Function('Phaser', pixelArtRendererCode + '; return PixelArtRenderer;');
  const PixelArtRenderer = evalFn({});

  console.log('\n--- EMPIRICAL BENCHMARK OF PIXEL ART RENDERER ---');
  const mockScene = new MockScene();

  const startTime = process.hrtime.bigint();
  PixelArtRenderer.generateAllTextures(mockScene);
  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1e6;

  console.log(`[BENCHMARK] Initial generateAllTextures execution time: ${durationMs.toFixed(3)} ms`);

  // Test re-baking bypass check
  const reBakeStart = process.hrtime.bigint();
  PixelArtRenderer.generateAllTextures(mockScene);
  const reBakeEnd = process.hrtime.bigint();
  const reBakeMs = Number(reBakeEnd - reBakeStart) / 1e6;
  console.log(`[BENCHMARK] Re-bake check execution time (_pixelArtTexturesBaked flag): ${reBakeMs.toFixed(4)} ms`);

  // Test forced re-baking performance (simulating scene restart or cache invalidation)
  const forceBakeTimes = [];
  for (let i = 0; i < 100; i++) {
    mockScene._pixelArtTexturesBaked = false;
    const t0 = process.hrtime.bigint();
    PixelArtRenderer.generateAllTextures(mockScene);
    const t1 = process.hrtime.bigint();
    forceBakeTimes.push(Number(t1 - t0) / 1e6);
  }
  const avgForceBake = forceBakeTimes.reduce((a, b) => a + b, 0) / forceBakeTimes.length;
  console.log(`[BENCHMARK] 100 Forced re-bakes average time: ${avgForceBake.toFixed(3)} ms per generation batch`);

  // Memory Estimate Analysis
  // Each texture in Phaser generated canvas: canvas 48x48 RGBA = 48 * 48 * 4 bytes = 9,216 bytes raw pixel data
  // Plus HTMLCanvasElement overhead (~2KB) + WebGL texture allocation (~9KB in GPU VRAM)
  const totalTextures = createdKeys.length;
  const bytesPerTexture48x48 = 48 * 48 * 4; // 9216 bytes
  const totalRAM48x48 = totalTextures * bytesPerTexture48x48;
  
  console.log(`\n--- MEMORY ALLOCATION ANALYSIS ---`);
  console.log(`[MEMORY] Number of procedural textures generated: ${totalTextures}`);
  console.log(`[MEMORY] Canvas dimensions per texture: 48x48 px (16x16 matrix with ps=3)`);
  console.log(`[MEMORY] Uncompressed RGBA byte size per texture: ${bytesPerTexture48x48} bytes (${(bytesPerTexture48x48/1024).toFixed(2)} KB)`);
  console.log(`[MEMORY] Total raw pixel memory for all ${totalTextures} textures: ${totalRAM48x48} bytes (${(totalRAM48x48/1024).toFixed(2)} KB)`);

} catch (err) {
  console.error('[ERROR] Failed to run mock benchmark:', err);
}
