const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

console.log('================================================================');
console.log('  INDEPENDENT CRITICAL REVIEW SUITE — MILESTONE R4');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// ── TEST GROUP 1: SYNTAX & FILE SYNCHRONIZATION ───────────────────────────────
console.log('[TEST GROUP 1] Syntax & File Synchronization Check');

const rootDir = 'C:/VibeCode/Hangeul Valley';
const filesToSync = ['game.js', 'index.html', 'levels.json', 'save_data.json'];

filesToSync.forEach(file => {
  const rootPath = path.join(rootDir, file);
  const assetPath = path.join(rootDir, 'assets', file);
  
  assert(fs.existsSync(rootPath), `Root file ${file} exists`);
  assert(fs.existsSync(assetPath), `Asset copy ${file} exists`);
  
  if (fs.existsSync(rootPath) && fs.existsSync(assetPath)) {
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex');
    assert(h1 === h2, `${file} root & assets copies are byte-identical (${h1.substring(0, 8)})`);
  }
});

// ── TEST GROUP 2: NO EXTERNAL IMAGES ──────────────────────────────────────────
console.log('\n[TEST GROUP 2] External Images & Remote Asset Audit');

const gameContent = fs.readFileSync(path.join(rootDir, 'game.js'), 'utf8');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const extImgRegex = /https?:\/\/[^\s"']+\.(png|jpg|jpeg|gif|webp|svg)/i;
const hasExtImgJs = extImgRegex.test(gameContent);
const hasExtImgHtml = extImgRegex.test(htmlContent);

assert(!hasExtImgJs, 'game.js contains zero external image URLs');
assert(!hasExtImgHtml, 'index.html contains zero external image URLs');

const phaserImageLoadRegex = /this\.load\.(image|spritesheet|svg)\(/;
assert(!phaserImageLoadRegex.test(gameContent), 'game.js uses 100% procedural rendering (no Phaser external file loaders)');

// ── TEST GROUP 3: COLOR PALETTE AUDIT ─────────────────────────────────────────
console.log('\n[TEST GROUP 3] Stardew Valley Earthy Color Palette Audit');

assert(gameContent.includes('const STARDEW_PALETTE = {'), 'STARDEW_PALETTE global object is defined in game.js');
assert(gameContent.includes('grassBase: 0x4A7C59'), 'STARDEW_PALETTE contains warm forest green (0x4A7C59)');
assert(gameContent.includes('dirtDry: 0x7E5436'), 'STARDEW_PALETTE contains warm rich earth (0x7E5436)');
assert(gameContent.includes('overallsBase: 0x3B4D7A'), 'STARDEW_PALETTE contains muted denim indigo (0x3B4D7A)');

// Verify STARDEW_PALETTE usage in renderer and textures
const stardewUsageCount = (gameContent.match(/STARDEW_PALETTE\./g) || []).length;
assert(stardewUsageCount >= 10, `STARDEW_PALETTE referenced extensively (${stardewUsageCount} references)`);

// ── TEST GROUP 4: CRISP PIXEL-PERFECT RENDERING AUDIT ─────────────────────────
console.log('\n[TEST GROUP 4] Crisp Pixel-Art Rendering Settings Audit');

assert(htmlContent.includes('image-rendering: pixelated;'), 'index.html CSS includes image-rendering: pixelated');
assert(htmlContent.includes('image-rendering: crisp-edges;'), 'index.html CSS includes image-rendering: crisp-edges');
assert(htmlContent.includes('-ms-interpolation-mode: nearest-neighbor;'), 'index.html CSS includes -ms-interpolation-mode: nearest-neighbor');

assert(gameContent.includes('render:{pixelArt:true'), 'Phaser config explicitly sets render.pixelArt = true');
assert(gameContent.includes('roundPixels:true'), 'Phaser config explicitly sets render.roundPixels = true');

const roundPixelsCount = (gameContent.match(/\.setRoundPixels\(true\)/g) || []).length;
assert(roundPixelsCount >= 4, `setRoundPixels(true) set across all 4 main Phaser scenes (found ${roundPixelsCount})`);

assert(gameContent.includes('t.setFilter(Phaser.Textures.FilterMode.NEAREST)'), '_bakeTextures applies FilterMode.NEAREST loop to baked textures');

// ── TEST GROUP 5: DYNAMIC Y-SORT DEPTH SORTING ────────────────────────────────
console.log('\n[TEST GROUP 5] Dynamic Y-Sort Depth Sorting Logic');

assert(gameContent.includes('const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));'), 'FarmScene & DungeonScene calculate foot-level playerBaseY');
assert(gameContent.includes('this.player.setDepth(playerBaseY);'), 'Player depth dynamically updated to playerBaseY');
assert(gameContent.includes('this.pShadow.setDepth(playerBaseY - 1);'), 'Player shadow depth dynamically updated to playerBaseY - 1');
assert(gameContent.includes('const mBaseY = m.y + (m.displayHeight * (1 - m.originY));'), 'DungeonScene calculates foot-level mBaseY for monsters');
assert(gameContent.includes('m.setDepth(mBaseY);'), 'Monster depth dynamically updated to mBaseY');
assert(gameContent.includes('l.setDepth(l.y + 8);'), 'Dungeon loot drop depth dynamically updated');

// Test Y-sort calculation with simulated objects
const simPlayer = { y: 200, displayHeight: 48, originY: 0.5 };
const calcPlayerBaseY = simPlayer.y + (simPlayer.displayHeight * (1 - simPlayer.originY));
assert(calcPlayerBaseY === 224, `Simulated player foot Y correctly equals 224 (200 + 48*0.5)`);

const simMonster = { y: 220, displayHeight: 32, originY: 0.5 };
const calcMonsterBaseY = simMonster.y + (simMonster.displayHeight * (1 - simMonster.originY));
assert(calcMonsterBaseY === 236, `Simulated monster foot Y correctly equals 236 (220 + 32*0.5)`);
assert(calcMonsterBaseY > calcPlayerBaseY, `Monster standing below player sorts in front (depth ${calcMonsterBaseY} > ${calcPlayerBaseY})`);

// ── TEST GROUP 6: CAMERA FADE TRANSITIONS ──────────────────────────────────────
console.log('\n[TEST GROUP 6] Camera Fade Transitions & Event Handlers');

const cameraFadeOutCount = (gameContent.match(/\.cameras\.main\.fadeOut\(300/g) || []).length;
assert(cameraFadeOutCount >= 4, `fadeOut(300, 0, 0, 0) called for scene transitions (found ${cameraFadeOutCount})`);

const cameraFadeOnceCount = (gameContent.match(/\.cameras\.main\.once\('camerafadeoutcomplete'/g) || []).length;
assert(cameraFadeOnceCount >= 4, `camerafadeoutcomplete listeners use once() to prevent event leaks (found ${cameraFadeOnceCount})`);

assert(gameContent.includes("this.events.on('resume', () => {\n      this.cameras.main.fadeIn(300, 0, 0, 0);\n    })") || gameContent.includes("this.events.on('resume', () => {\n      this.cameras.main.fadeIn(300, 0, 0, 0);"), 'FarmScene registers resume event listener to fade in on return');

// ── TEST GROUP 7: GLASSMORPHISM MODAL MANAGER & STACK SIMULATION ─────────────
console.log('\n[TEST GROUP 7] Glassmorphism Modal Manager & Stack Simulation');

// Construct mock DOM environment to test modal manager in VM
const mockElements = {};
const mockDOM = {
  getElementById: (id) => {
    if (!mockElements[id]) {
      const classes = new Set();
      mockElements[id] = {
        id,
        classList: {
          add: (c) => classes.add(c),
          remove: (c) => classes.delete(c),
          contains: (c) => classes.has(c)
        }
      };
    }
    return mockElements[id];
  },
  addEventListener: () => {}
};

// Create VM context to run setModalState, closeTopModal, and closeModalById
const sandbox = {
  window: mockDOM,
  document: mockDOM,
  playerLocked: false,
  closeShopCalled: false,
  closePetCalled: false,
  console: console
};

const modalCode = `
var activeModalStack = [];
${gameContent.substring(gameContent.indexOf('function setModalState(overlayId, isOpen) {'), gameContent.indexOf('function showLevelSelect() {'))}
window.closeShop = function() { closeShopCalled = true; setModalState('shop-overlay', false); };
window.closePetOverlay = function() { closePetCalled = true; setModalState('pet-overlay', false); };
`;

vm.createContext(sandbox);
vm.runInContext(modalCode, sandbox);

function evalVM(expr) {
  return vm.runInContext(expr, sandbox);
}

// 1. Initial State
assert(evalVM('playerLocked') === false, 'Initial playerLocked is false');
assert(evalVM('activeModalStack.length') === 0, 'Initial activeModalStack is empty');

// 2. Open Single Modal (Shop)
evalVM("setModalState('shop-overlay', true)");
assert(evalVM('playerLocked') === true, 'Opening shop-overlay sets playerLocked = true');
assert(evalVM("activeModalStack.length === 1 && activeModalStack[0] === 'shop-overlay'"), 'activeModalStack contains shop-overlay');
assert(mockElements['shop-overlay'].classList.contains('visible'), 'shop-overlay element has visible class');

// 3. Open Second Modal (Pet)
evalVM("setModalState('pet-overlay', true)");
assert(evalVM('playerLocked') === true, 'Opening pet-overlay keeps playerLocked = true');
assert(evalVM("activeModalStack.length === 2 && activeModalStack[1] === 'pet-overlay'"), 'activeModalStack top is pet-overlay');

// 4. Test LIFO Close Top Modal (ESC key trigger)
const topClosed = evalVM('closeTopModal()');
assert(topClosed === true, 'closeTopModal() returned true when stack was non-empty');
assert(evalVM('closePetCalled') === true, 'closeTopModal invoked closePetOverlay() for top modal');
assert(evalVM("activeModalStack.length === 1 && activeModalStack[0] === 'shop-overlay'"), 'pet-overlay removed, shop-overlay remains in stack');
assert(evalVM('playerLocked') === true, 'playerLocked remains true while shop-overlay is still in stack');

// 5. Close Remaining Modal (Shop)
evalVM('closeTopModal()');
assert(evalVM('closeShopCalled') === true, 'closeTopModal invoked closeShop() for last modal');
assert(evalVM('activeModalStack.length') === 0, 'activeModalStack is now empty');
assert(evalVM('playerLocked') === false, 'playerLocked reset to false when activeModalStack becomes empty');

// 6. Test Closing when Stack is Empty
const emptyClose = evalVM('closeTopModal()');
assert(emptyClose === false, 'closeTopModal() safely returns false on empty stack without throwing');
assert(evalVM('playerLocked') === false, 'playerLocked remains false');

// ── VERDICT SUMMARY ───────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`  VERDICT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
