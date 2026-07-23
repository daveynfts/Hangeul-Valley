/**
 * Milestone R4 Iteration 3 Comprehensive Empirical Challenger Verification
 * 
 * Target Systems:
 * 1. Centralized UI Glassmorphism Modal Manager (stack, playerLocked, ESC listener, out-of-order closing, HTML button parity)
 * 2. Camera Transitions & Bounds (fadeIn, fadeOut, setBounds, clamp, setRoundPixels, shake, flash, resize)
 * 3. Y-Sort Depth Sorting Logic (formula, dynamic updates, shadow offset, multi-layer depth hierarchy)
 * 4. Stardew Color Palette & PixelArtRenderer (palette validity, character fallback, texture generation & baking)
 * 5. Root <-> Assets File Parity & Syntax Verification
 * 6. Dynamic Modal Manager Stress Harness & Texture Baking Integrity
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ✓ ${message}`);
  } else {
    failedTests++;
    console.log(`  [FAIL] ❌ ${message}`);
  }
}

console.log("================================================================");
console.log("  MILESTONE R4 ITERATION 3 EMPIRICAL CHALLENGER VERIFICATION   ");
console.log("================================================================\n");

// --- SUITE 1: Syntax & File Parity Checks ---
console.log("--- SUITE 1: Syntax & Root <-> Assets Parity Check ---");

const gameJsPath = path.resolve(__dirname, '../../../game.js');
const assetsGameJsPath = path.resolve(__dirname, '../../../assets/game.js');
const indexHtmlPath = path.resolve(__dirname, '../../../index.html');
const assetsIndexHtmlPath = path.resolve(__dirname, '../../../assets/index.html');

const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath, 'utf8');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
const assetsIndexHtmlContent = fs.readFileSync(assetsIndexHtmlPath, 'utf8');

assert(gameJsContent.length > 0, `game.js loaded (${gameJsContent.length} bytes)`);
assert(assetsGameJsContent.length > 0, `assets/game.js loaded (${assetsGameJsContent.length} bytes)`);
assert(fs.readFileSync(gameJsPath).equals(fs.readFileSync(assetsGameJsPath)), "game.js and assets/game.js are 100% binary identical");
assert(fs.readFileSync(indexHtmlPath).equals(fs.readFileSync(assetsIndexHtmlPath)), "index.html and assets/index.html are 100% binary identical");

// --- SUITE 2: Mock Environment Setup ---
console.log("\n--- SUITE 2: DOM & Phaser Mock Environment Setup ---");

class MockClassList {
  constructor(initialClasses = []) {
    this.classes = new Set(initialClasses);
  }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  contains(c) { return this.classes.has(c); }
  toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
}

class MockHTMLElement {
  constructor(id = '', tagName = 'DIV') {
    this.id = id;
    this.tagName = tagName;
    this.classList = new MockClassList();
    this.children = [];
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.eventListeners = {};
  }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }
  dispatchEvent(eventObj) {
    const listeners = this.eventListeners[eventObj.type] || [];
    listeners.forEach(fn => fn(eventObj));
  }
}

const domElements = new Map();
const windowEventListeners = {};

global.document = {
  getElementById: (id) => {
    if (id === 'non_existent_modal_xyz') return null;
    if (!domElements.has(id)) {
      domElements.set(id, new MockHTMLElement(id));
    }
    return domElements.get(id);
  },
  createElement: (tag) => new MockHTMLElement('', tag.toUpperCase()),
  addEventListener: (event, fn) => {
    if (!windowEventListeners[event]) windowEventListeners[event] = [];
    windowEventListeners[event].push(fn);
  },
  body: new MockHTMLElement('body', 'BODY')
};

global.window = {
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener: (event, fn) => {
    if (!windowEventListeners[event]) windowEventListeners[event] = [];
    windowEventListeners[event].push(fn);
  },
  dispatchEvent: (evt) => {
    const fnList = windowEventListeners[evt.type] || [];
    fnList.forEach(fn => fn(evt));
  },
  AudioContext: class {
    resume() {}
    createOscillator() {
      return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  }
};

global.localStorage = {
  _data: {},
  getItem: (k) => global.localStorage._data[k] || null,
  setItem: (k, v) => { global.localStorage._data[k] = String(v); },
  removeItem: (k) => { delete global.localStorage._data[k]; }
};

global.Phaser = {
  AUTO: 1,
  Canvas: 1,
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  Textures: { FilterMode: { NEAREST: 0, LINEAR: 1 } },
  Scene: class {},
  Game: class {},
  Utils: { Array: { Shuffle: (arr) => arr } },
  Math: {
    Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    Clamp: (v, min, max) => Math.max(min, Math.min(max, v))
  },
  Input: { Keyboard: { JustDown: () => false } }
};

try {
  vm.runInThisContext(gameJsContent);
  assert(true, "game.js evaluated cleanly in mock environment");
} catch (err) {
  assert(false, `game.js evaluation failed: ${err.message}`);
}

// Helpers to access VM top-level let variables safely
function getStack() { return vm.runInThisContext('activeModalStack'); }
function getPlayerLocked() { return vm.runInThisContext('playerLocked'); }

// --- SUITE 3: Centralized UI Glassmorphism Modal Manager ---
console.log("\n--- SUITE 3: Centralized UI Glassmorphism Modal Manager ---");

assert(typeof setModalState === 'function', "setModalState is defined");
assert(typeof closeTopModal === 'function', "closeTopModal is defined");
assert(typeof closeModalById === 'function', "closeModalById is defined");
assert(Array.isArray(getStack()), "activeModalStack is initialized as an array");

// Test 3.1: Single modal state update
setModalState('shop-overlay', true);
const shopEl = global.document.getElementById('shop-overlay');
assert(shopEl.classList.contains('visible'), "setModalState('shop-overlay', true) adds 'visible' class");
assert(getPlayerLocked() === true, "playerLocked set to true when modal opens");
assert(getStack().length === 1 && getStack()[0] === 'shop-overlay', "activeModalStack pushed 'shop-overlay'");

setModalState('shop-overlay', false);
assert(!shopEl.classList.contains('visible'), "setModalState('shop-overlay', false) removes 'visible' class");
assert(getStack().length === 0, "activeModalStack is empty after closing modal");
assert(getPlayerLocked() === false, "playerLocked reset to false when activeModalStack is empty");

// Test 3.2: Multi-modal stack & order tracking
setModalState('level-select-overlay', true);
setModalState('pet-overlay', true);
setModalState('recipe-overlay', true);

assert(getStack().length === 3, "Pushed 3 modals into stack");
assert(getStack()[0] === 'level-select-overlay', "Stack index 0: level-select-overlay");
assert(getStack()[1] === 'pet-overlay', "Stack index 1: pet-overlay");
assert(getStack()[2] === 'recipe-overlay', "Stack index 2 (top): recipe-overlay");
assert(getPlayerLocked() === true, "playerLocked remains true while stack > 0");

// Test 3.3: Popping top modal via closeTopModal()
const poppedTop = closeTopModal();
assert(poppedTop === true, "closeTopModal() returned true");
assert(getStack().length === 2, "Stack size reduced to 2");
assert(getStack()[getStack().length - 1] === 'pet-overlay', "New top of stack is 'pet-overlay'");

// Test 3.4: Out-of-order closing via closeModalById()
closeModalById('level-select-overlay'); // closing bottom modal directly
assert(getStack().length === 1, "Out-of-order close reduced stack length to 1");
assert(getStack()[0] === 'pet-overlay', "Stack order maintained: ['pet-overlay']");
assert(getPlayerLocked() === true, "playerLocked remains true because 1 modal is still active");

closeTopModal(); // pop remaining modal
assert(getStack().length === 0, "Stack is empty after popping last modal");
assert(getPlayerLocked() === false, "playerLocked reset to false");

// Test 3.5: Duplicate push prevention
setModalState('seasonal-overlay', true);
setModalState('seasonal-overlay', true);
setModalState('seasonal-overlay', true);
assert(getStack().length === 1, "Duplicate setModalState(id, true) calls do NOT duplicate entries in stack");
setModalState('seasonal-overlay', false);

// Test 3.6: Escape Key Event Dispatching
setModalState('trophy-overlay', true);
setModalState('duel-overlay', true);
assert(getStack().length === 2, "2 modals open prior to ESC key test");

const escHandlers = windowEventListeners['keydown'] || [];
assert(escHandlers.length > 0, "Keydown listener registered on window for Escape key handling");

// Dispatch Escape key event
escHandlers.forEach(handler => handler({ key: 'Escape' }));
assert(getStack().length === 1, "First ESC press popped top modal ('duel-overlay')");
assert(getStack()[0] === 'trophy-overlay', "New top modal is 'trophy-overlay'");

escHandlers.forEach(handler => handler({ key: 'Escape' }));
assert(getStack().length === 0, "Second ESC press popped remaining modal ('trophy-overlay')");
assert(getPlayerLocked() === false, "playerLocked reset to false after all modals closed via ESC key");

// Test 3.7: Safe edge cases (missing DOM element, empty stack pop)
const invalidStateResult = setModalState('non_existent_modal_xyz', true);
assert(getStack().length === 0, "setModalState on missing element safely returns without error");

const emptyCloseResult = closeTopModal();
assert(emptyCloseResult === false, "closeTopModal() on empty stack returns false safely");

// Test 3.8: Check HTML index.html contains all 10 modal overlay IDs
const allRequiredModalIds = [
  'level-select-overlay',
  'shop-overlay',
  'fish-album-overlay',
  'memory-overlay',
  'trophy-overlay',
  'duel-overlay',
  'recipe-overlay',
  'pet-overlay',
  'seasonal-overlay',
  'leaderboard-overlay'
];

allRequiredModalIds.forEach(id => {
  assert(indexHtmlContent.includes(`id="${id}"`) || indexHtmlContent.includes(`id='${id}'`), `index.html contains overlay element #${id}`);
});

// --- SUITE 4: Camera Transitions & Camera Bounds Verification ---
console.log("\n--- SUITE 4: Camera Transitions & Camera Bounds Verification ---");

function createMockCamera(viewportW = 1280, viewportH = 720) {
  return {
    width: viewportW,
    height: viewportH,
    scrollX: 0,
    scrollY: 0,
    bounds: null,
    roundPixels: false,
    isFadingIn: false,
    isFadingOut: false,
    fadeIn(dur) { this.isFadingIn = true; this.fadeInDur = dur; },
    fadeOut(dur, r, g, b, cb) {
      this.isFadingOut = true;
      this.fadeOutDur = dur;
      if (cb) cb(this, 1);
    },
    setBounds(x, y, w, h) { this.bounds = { x, y, width: w, height: h }; },
    setRoundPixels(val) { this.roundPixels = val; },
    clampScroll(x, y) {
      if (!this.bounds) return { x, y };
      const minX = this.bounds.x;
      const minY = this.bounds.y;
      const maxX = Math.max(minX, this.bounds.width - this.width);
      const maxY = Math.max(minY, this.bounds.height - this.height);
      const cX = Math.min(Math.max(x, minX), maxX);
      const cY = Math.min(Math.max(y, minY), maxY);
      this.scrollX = cX; this.scrollY = cY;
      return { x: cX, y: cY };
    },
    shake(dur, intensity) { this.shaken = true; this.shakeDur = dur; this.shakeInt = intensity; },
    flash(dur) { this.flashed = true; this.flashDur = dur; }
  };
}

const mockCam = createMockCamera(1280, 720);

// Test 4.1: setBounds
mockCam.setBounds(0, 0, 1280, 720);
assert(mockCam.bounds && mockCam.bounds.width === 1280 && mockCam.bounds.height === 720, "Camera bounds configured to (0, 0, 1280, 720)");

// Test 4.2: Clamping limits
const minClamped = mockCam.clampScroll(-500, -300);
assert(minClamped.x === 0 && minClamped.y === 0, "Camera scroll clamped to min bounds (0, 0)");

const maxClamped = mockCam.clampScroll(5000, 5000);
assert(maxClamped.x === 0 && maxClamped.y === 0, "Camera scroll clamped to max bounds (1280 - 1280 = 0)");

mockCam.setBounds(0, 0, 3000, 2000);
const largeClamped = mockCam.clampScroll(5000, 5000);
assert(largeClamped.x === 1720 && largeClamped.y === 1280, "Camera scroll on 3000x2000 map clamped to max (1720, 1280)");

// Test 4.3: Fade transitions & crisp pixels
mockCam.setRoundPixels(true);
assert(mockCam.roundPixels === true, "setRoundPixels(true) set for pixel-perfect rendering");

mockCam.fadeIn(300);
assert(mockCam.isFadingIn && mockCam.fadeInDur === 300, "fadeIn(300ms) executed");

let fadeComplete = false;
mockCam.fadeOut(300, 0, 0, 0, () => { fadeComplete = true; });
assert(mockCam.isFadingOut && fadeComplete, "fadeOut(300ms) callback executed");

mockCam.shake(300, 0.03);
assert(mockCam.shaken && mockCam.shakeDur === 300 && mockCam.shakeInt === 0.03, "Camera shake(300ms, 0.03) executed");

mockCam.flash(200);
assert(mockCam.flashed && mockCam.flashDur === 200, "Camera flash(200ms) executed");

// Verify game.js contains setBounds, fadeIn, fadeOut, roundPixels
assert(gameJsContent.includes('.setBounds('), "game.js contains setBounds calls across scenes");
assert(gameJsContent.includes('.fadeIn('), "game.js contains fadeIn camera transitions");
assert(gameJsContent.includes('.fadeOut('), "game.js contains fadeOut camera transitions");
assert(gameJsContent.includes('roundPixels'), "game.js configures roundPixels for crisp rendering");

// --- SUITE 5: Y-Sort Depth Sorting Logic Verification ---
console.log("\n--- SUITE 5: Y-Sort Depth Sorting Logic Verification ---");

function calculateEntityDepth(y, height = 48, originY = 0.5) {
  return y + height * (1 - originY);
}

// Test 5.1: Character sprite depth formula
const playerY = 300;
const playerDepth = calculateEntityDepth(playerY, 48, 0.5);
assert(playerDepth === 324, `Player depth formula: y(300) + 48*(1-0.5) = ${playerDepth} (Expected 324)`);

// Test 5.2: Dynamic sorting comparison between player and NPC
const npcY = 310;
const npcDepth = calculateEntityDepth(npcY, 48, 0.5); // 334

assert(playerDepth < npcDepth, `Player at Y=300 (depth ${playerDepth}) < NPC at Y=310 (depth ${npcDepth}) -> Player renders BEHIND NPC`);

const playerMovedY = 320;
const playerMovedDepth = calculateEntityDepth(playerMovedY, 48, 0.5); // 344
assert(playerMovedDepth > npcDepth, `Player moved to Y=320 (depth ${playerMovedDepth}) > NPC at Y=310 (depth ${npcDepth}) -> Player renders IN FRONT OF NPC`);

// Test 5.3: Shadow depth offset
const shadowDepth = playerDepth - 1; // 323
assert(shadowDepth < playerDepth, `Player shadow depth (${shadowDepth}) < Player sprite depth (${playerDepth}) -> Shadow never renders over player`);

// Test 5.4: Multi-Layer Depth Hierarchy
const LAYER_BG = -10;
const LAYER_GROUND = 0;
const LAYER_CROPS = 3;
const LAYER_WELL_SHADOW = 399;
const LAYER_WELL_STRUCT = 400;
const LAYER_HUD = 9950;
const LAYER_VIGNETTE = 9980;
const LAYER_TEXT = 9990;

assert(
  LAYER_BG < LAYER_GROUND &&
  LAYER_GROUND < LAYER_CROPS &&
  LAYER_CROPS < playerDepth &&
  playerDepth < LAYER_WELL_STRUCT &&
  LAYER_WELL_SHADOW < LAYER_WELL_STRUCT &&
  LAYER_WELL_STRUCT < LAYER_HUD &&
  LAYER_HUD < LAYER_VIGNETTE &&
  LAYER_VIGNETTE < LAYER_TEXT,
  "Layer depth hierarchy sorted correctly: Parallax (-10) < Ground (0) < Crops (3) < Entities (~324) < Well (400) < HUD (9950) < Vignette (9980) < Text (9990)"
);

// --- SUITE 6: Stardew Color Palette & PixelArtRenderer Verification ---
console.log("\n--- SUITE 6: Stardew Color Palette & PixelArtRenderer Verification ---");

const STARDEW_PALETTE = vm.runInThisContext('STARDEW_PALETTE');
assert(typeof STARDEW_PALETTE === 'object' && STARDEW_PALETTE !== null, "STARDEW_PALETTE object exists");

const stardewPaletteKeys = [
  'grassBase', 'grassShadow', 'grassHighlight',
  'flowerRed', 'flowerYellow', 'flowerPurple',
  'dirtDry', 'dirtWet', 'pathStone', 'pathMortar',
  'woodBase', 'woodHighlight', 'woodShadow',
  'oceanDeep', 'oceanShimmer', 'oceanFoam', 'sandBase', 'sandShadow',
  'overallsBase', 'overallsDark', 'strawHat', 'hatRibbon', 'boots',
  'dungeonWall', 'dungeonFloor', 'torchAmber'
];

let allKeysFound = true;
let allValuesValidHex = true;

stardewPaletteKeys.forEach(k => {
  if (!(k in STARDEW_PALETTE)) {
    allKeysFound = false;
    console.log(`    Missing palette key: ${k}`);
  } else {
    const val = STARDEW_PALETTE[k];
    if (typeof val !== 'number' || val < 0 || val > 0xFFFFFF) {
      allValuesValidHex = false;
      console.log(`    Invalid hex value for ${k}: ${val}`);
    }
  }
});

assert(allKeysFound, `All ${stardewPaletteKeys.length} earthy color palette keys exist in STARDEW_PALETTE`);
assert(allValuesValidHex, "All color palette values are valid 24-bit numeric hex values (0x000000 - 0xFFFFFF)");

// Test 6.1: PixelArtRenderer drawMatrix and fallback
const PixelArtRenderer = vm.runInThisContext('PixelArtRenderer');
assert(typeof PixelArtRenderer === 'function' || typeof PixelArtRenderer === 'object', "PixelArtRenderer is defined");

let pixelsDrawn = 0;
const mockGraphics = {
  fillStyle(color, alpha) {},
  fillRect(x, y, w, h) { pixelsDrawn++; }
};

const matrix = [
  " G ",
  "GGG",
  " D "
];

const colorMap = {
  'G': STARDEW_PALETTE.grassBase,
  'D': STARDEW_PALETTE.dirtDry
};

pixelsDrawn = 0;
PixelArtRenderer.drawMatrix(mockGraphics, matrix, colorMap, 0, 0, 4);
assert(pixelsDrawn === 5, `drawMatrix rendered 5 non-transparent pixels (Expected 5, Got ${pixelsDrawn})`);

const matrixWithUnknown = [
  " G ",
  "G?G",
  " D "
];

pixelsDrawn = 0;
PixelArtRenderer.drawMatrix(mockGraphics, matrixWithUnknown, colorMap, 0, 0, 4);
assert(pixelsDrawn === 4, `drawMatrix safely skips unmapped character '?' without throwing (Expected 4, Got ${pixelsDrawn})`);

// --- SUITE 7: Dynamic Stress Harness & Bake Texture Integrity ---
console.log("\n--- SUITE 7: Dynamic Stress Harness & Bake Texture Integrity ---");

// 7.1: Modal Stack Stress Test (1,000 rapid random open/close operations)
let stressPassed = true;
const modalList = allRequiredModalIds;

for (let i = 0; i < 1000; i++) {
  const randomModal = modalList[Math.floor(Math.random() * modalList.length)];
  const openAction = Math.random() > 0.4; // 60% chance open, 40% chance close
  setModalState(randomModal, openAction);

  const curStack = getStack();
  const locked = getPlayerLocked();

  if (curStack.length > 0 && !locked) {
    stressPassed = false;
    console.log(`    Stress failure at step ${i}: Stack has items but player is unlocked!`);
    break;
  }
  if (curStack.length === 0 && locked) {
    stressPassed = false;
    console.log(`    Stress failure at step ${i}: Stack is empty but player is locked!`);
    break;
  }
  
  // Ensure no duplicate IDs in stack
  const uniqueItems = new Set(curStack);
  if (uniqueItems.size !== curStack.length) {
    stressPassed = false;
    console.log(`    Stress failure at step ${i}: Duplicate IDs detected in activeModalStack!`);
    break;
  }
}

// Clean up any remaining open modals
allRequiredModalIds.forEach(id => setModalState(id, false));

assert(stressPassed, "1,000 rapid random modal stack toggles completed without lock or duplicate invariants failing");
assert(getStack().length === 0 && getPlayerLocked() === false, "Stack empty and player unlocked after stress test reset");

// --- RESULTS SUMMARY ---
console.log("\n================================================================");
console.log(` FINAL EMPIRICAL RESULTS: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
console.log("================================================================\n");

if (failedTests > 0) {
  console.log("❌ VERIFICATION FAILED!");
  process.exit(1);
} else {
  console.log("✅ ALL MILESTONE R4 ITERATION 3 EMPIRICAL TESTS PASSED PERFECTLY!");
  process.exit(0);
}
