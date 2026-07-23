const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log(' EMPIRICAL STRESS TEST SUITE: PIXELARTRENDERER & GAME SYSTEM ');
console.log('================================================================\n');

// --- TEST 1: SYNTAX VERIFICATION ---
console.log('--- TEST 1: SYNTAX CHECK ---');
try {
  const rootSyntax = execSync('node -c game.js', { cwd: path.join(__dirname, '../../') }).toString();
  const assetsSyntax = execSync('node -c assets/game.js', { cwd: path.join(__dirname, '../../') }).toString();
  console.log('[PASS] node -c game.js passed with 0 errors');
  console.log('[PASS] node -c assets/game.js passed with 0 errors');
} catch (err) {
  console.error('[FAIL] Syntax check failed:', err.message);
}

// --- TEST 2: FILE SYNCHRONIZATION ---
console.log('\n--- TEST 2: FILE SYNCHRONIZATION ---');
const rootGame = fs.readFileSync(path.join(__dirname, '../../game.js'));
const assetsGame = fs.readFileSync(path.join(__dirname, '../../assets/game.js'));
const isGameSynced = rootGame.equals(assetsGame);

const rootIndex = fs.readFileSync(path.join(__dirname, '../../index.html'));
const assetsIndex = fs.readFileSync(path.join(__dirname, '../../assets/index.html'));
const isIndexSynced = rootIndex.equals(assetsIndex);

console.log(`root/game.js (${rootGame.length} bytes) vs assets/game.js (${assetsGame.length} bytes): ${isGameSynced ? '100% IDENTICAL' : 'MISMATCH'}`);
console.log(`root/index.html (${rootIndex.length} bytes) vs assets/index.html (${assetsIndex.length} bytes): ${isIndexSynced ? '100% IDENTICAL' : 'MISMATCH'}`);

// --- TEST 3: PIXELARTRENDERER RUNTIME EXECUTION & KEY COLLISIONS ---
console.log('\n--- TEST 3: RUNTIME TEXTURE GENERATION & COLLISION DETECTION ---');
const gameContent = rootGame.toString('utf8');

const pixelArtCode = gameContent.substring(
  gameContent.indexOf('class PixelArtRenderer'),
  gameContent.indexOf('const K = {')
);

class MockPhaserScene {
  constructor() {
    this.createdTextures = [];
    this.removedKeys = [];
    this.textures = {
      exists: (key) => this.createdTextures.some(t => t.key === key),
      remove: (key) => this.removedKeys.push(key),
      get: (key) => ({ setFilter: () => {} })
    };
    this.anims = {
      exists: () => false,
      create: () => {}
    };
    this.make = {
      graphics: () => ({
        drawCount: 0,
        fillStyle: function() { this.drawCount++; },
        fillRect: function() { this.drawCount++; },
        generateTexture: (key, w, h) => {
          mockScene.createdTextures.push({ key, width: w, height: h, draws: this.drawCount });
        },
        destroy: () => {}
      })
    };
  }
}

const mockScene = new MockPhaserScene();
const evalFn = new Function('Phaser', pixelArtCode + '; return PixelArtRenderer;');
const PixelArtRenderer = evalFn({});

const startHr = process.hrtime.bigint();
PixelArtRenderer.generateAllTextures(mockScene);
const endHr = process.hrtime.bigint();
const totalTimeMs = Number(endHr - startHr) / 1e6;

console.log(`Total textures created during generateAllTextures: ${mockScene.createdTextures.length}`);
console.log(`Total time for texture generation batch: ${totalTimeMs.toFixed(3)} ms`);

// Key Collision Analysis
const keyCounts = {};
mockScene.createdTextures.forEach(t => {
  keyCounts[t.key] = (keyCounts[t.key] || 0) + 1;
});

const duplicateKeys = Object.entries(keyCounts).filter(([k, c]) => c > 1);
console.log(`Unique key count: ${Object.keys(keyCounts).length} / ${mockScene.createdTextures.length}`);
if (duplicateKeys.length > 0) {
  console.log('[WARN] RUNTIME KEY COLLISIONS DETECTED IN PIXELARTRENDERER:');
  duplicateKeys.forEach(([k, c]) => {
    console.log(`  - Key "${k}" generated ${c} times (causes redundant texture removal & re-allocation)`);
  });
}

// --- TEST 4: DIMENSION & KEY CONFLICT ANALYSIS (PIXELART VS LEGACY BAKE) ---
console.log('\n--- TEST 4: DIMENSION & KEY CONFLICT ANALYSIS (PIXELART VS LEGACY BAKE) ---');
const legacyGenRegex = /\.generateTexture\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,]+),\s*([^)]+)\)/g;
const legacyKeys = {};
let match;

// Search legacy texture calls in game.js after PixelArtRenderer
const legacySection = gameContent.substring(gameContent.indexOf('const K = {'));
while ((match = legacyGenRegex.exec(legacySection)) !== null) {
  legacyKeys[match[1]] = { w: match[2].trim(), h: match[3].trim() };
}

console.log(`Legacy _bakeTextures() generated keys count: ${Object.keys(legacyKeys).length}`);
const pixelArtKeyMap = new Map(mockScene.createdTextures.map(t => [t.key, t]));

const overlappingKeys = [];
Object.keys(legacyKeys).forEach(k => {
  if (pixelArtKeyMap.has(k)) {
    overlappingKeys.push({
      key: k,
      pixelArtDim: `${pixelArtKeyMap.get(k).width}x${pixelArtKeyMap.get(k).height}`,
      legacyDim: `${legacyKeys[k].w} x ${legacyKeys[k].h}`
    });
  }
});

console.log(`Overlapping texture keys between PixelArtRenderer and legacy _bakeTextures(): ${overlappingKeys.length}`);
overlappingKeys.forEach(o => {
  console.log(`  - Key "${o.key}": PixelArtRenderer (${o.pixelArtDim} px) vs Legacy _bakeTextures (${o.legacyDim})`);
});

// --- TEST 5: ORPHANED CODE CHECK ---
console.log('\n--- TEST 5: CALL SITE INVOCATION CHECK ---');
const isPixelArtInvoked = gameContent.includes('PixelArtRenderer.generateAllTextures');
console.log(`Is PixelArtRenderer.generateAllTextures() called in game.js? ${isPixelArtInvoked ? 'YES' : 'NO (ORPHANED/UNINVOKED)'}`);

// --- TEST 6: MEMORY ALLOCATION & RE-BAKE STRESS TEST ---
console.log('\n--- TEST 6: MEMORY ALLOCATION & RE-BAKE STRESS TEST ---');
const textureCount = mockScene.createdTextures.length;
const totalPixels = mockScene.createdTextures.reduce((acc, t) => acc + (t.width * t.height), 0);
const totalRgbBytes = totalPixels * 4;

console.log(`Total active procedural textures: ${textureCount}`);
console.log(`Total pixels rendered: ${totalPixels.toLocaleString()} px`);
console.log(`Raw uncompressed pixel RAM: ${totalRgbBytes.toLocaleString()} bytes (${(totalRgbBytes/1024).toFixed(2)} KB)`);

// Test 100 consecutive re-bakes to verify memory/garbage accumulation behavior
let reBakeTimes = [];
for (let i = 0; i < 100; i++) {
  const sceneTest = new MockPhaserScene();
  const t0 = process.hrtime.bigint();
  PixelArtRenderer.generateAllTextures(sceneTest);
  const t1 = process.hrtime.bigint();
  reBakeTimes.push(Number(t1 - t0) / 1e6);
}
const avgTime = reBakeTimes.reduce((a, b) => a + b, 0) / reBakeTimes.length;
console.log(`Average execution time over 100 un-cached re-bakes: ${avgTime.toFixed(3)} ms per batch`);
