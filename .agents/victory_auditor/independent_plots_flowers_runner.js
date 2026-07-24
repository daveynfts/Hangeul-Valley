const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

console.log('================================================================');
console.log('VICTORY AUDITOR: INDEPENDENT EMPIRICAL VERIFICATION SUITE');
console.log('Target: 6 Expandable Farm Plots, Shop UI, Fence Post Flowers');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;
const testFailures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
    testFailures.push(message);
  }
}

// 1. Mock DOM Environment
const mockElements = {};

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.style = { cssText: '' };
    this.children = [];
    this._innerHTML = '';
    this.textContent = '';
    this.attributes = {};
    this.disabled = false;
    const classes = new Set();
    this.classList = {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      contains: (c) => classes.has(c),
      toString: () => Array.from(classes).join(' ')
    };
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = val;
    if (val === '') this.children = [];
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  addEventListener() {}
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
}

function getMockElement(id) {
  if (!mockElements[id]) {
    mockElements[id] = new MockElement('div');
    mockElements[id].id = id;
  }
  return mockElements[id];
}

const mockDocument = {
  getElementById: (id) => getMockElement(id),
  createElement: (tag) => new MockElement(tag),
  addEventListener: () => {},
  querySelector: () => new MockElement('div'),
  querySelectorAll: () => [],
  body: new MockElement('body')
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    _data: {},
    getItem: (k) => mockWindow.localStorage._data[k] || null,
    setItem: (k, v) => { mockWindow.localStorage._data[k] = String(v); },
    removeItem: (k) => { delete mockWindow.localStorage._data[k]; }
  },
  location: { reload: () => {} },
  setInterval: () => 1,
  clearInterval: () => {}
};

// 2. Mock Phaser Environment
const mockTweens = [];
const mockImages = [];

const mockPhaser = {
  AUTO: 1,
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  Math: {
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
    Between: (min, max) => Math.floor(min + (max - min) * 0.5),
    RandomDataGenerator: class RandomDataGenerator { between() { return 0; } }
  },
  Utils: {
    Array: {
      GetRandom: (arr) => arr[0]
    }
  },
  Game: class Game { constructor() {} },
  Scene: class Scene {}
};

// 3. Set up VM sandbox
const toasts = [];
const sfxLog = [];

const sandbox = {
  console: console,
  document: mockDocument,
  window: mockWindow,
  localStorage: mockWindow.localStorage,
  Phaser: mockPhaser,
  $: (id) => getMockElement(id),
  showToast: (msg) => { toasts.push(msg); console.log(`    [Toast] ${msg}`); },
  playChiptuneSFX: (name) => { sfxLog.push(name); },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Array: Array,
  Object: Object,
  Set: Set,
  JSON: JSON,
  Date: Date,
  parseInt: parseInt,
  parseFloat: parseFloat
};

sandbox.global = sandbox;
vm.createContext(sandbox);

// 4. Load game.js into VM
const gameCode = fs.readFileSync('game.js', 'utf8');
console.log('Loading game.js into Node VM...');
vm.runInContext(gameCode, sandbox);
const FarmScene = vm.runInContext('FarmScene', sandbox);
console.log('game.js loaded successfully.\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: Plot Cost Definitions & Initial Unlocked State
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: Plot Cost & Initial State Checks ---');
assert(Array.isArray(sandbox.PLOT_UNLOCK_COSTS), 'PLOT_UNLOCK_COSTS is defined as an array');
assert(sandbox.PLOT_UNLOCK_COSTS.length === 6, 'PLOT_UNLOCK_COSTS has exactly 6 elements');
assert(JSON.stringify(sandbox.PLOT_UNLOCK_COSTS) === JSON.stringify([100, 200, 350, 500, 750, 1000]), 
  'PLOT_UNLOCK_COSTS matches [100, 200, 350, 500, 750, 1000] exactly');

assert(Array.isArray(sandbox.unlockedPlots), 'unlockedPlots array is defined');
assert(sandbox.unlockedPlots.length === 9, 'unlockedPlots initially contains 9 plots (indices 0..8)');

for (let i = 0; i < 9; i++) {
  assert(sandbox.isPlotUnlocked(i) === true, `Plot #${i + 1} (index ${i}) is unlocked by default`);
}
for (let i = 9; i < 15; i++) {
  assert(sandbox.isPlotUnlocked(i) === false, `Plot #${i + 1} (index ${i}) is locked by default`);
}

// -----------------------------------------------------------------------------
// TEST SUITE 2: Plot Purchasing & Gold Deduction Logic
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Plot Purchasing & Gold Deduction ---');

// Reset currencies & unlocked plots to clean initial state
sandbox.playerCurrencies.coins = 500;
sandbox.syncGoldAlias();
sandbox.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
sandbox.unlockedPlotCount = 9;

// Mock FarmScene in sceneRef
const sceneMock = {
  farm: { x: 100, y: 100, w: 500, h: 400 },
  plots: [],
  children: { list: [] },
  tweens: {
    add: (t) => { mockTweens.push(t); return t; }
  },
  add: {
    image: (x, y, tex) => {
      const img = {
        x, y, tex,
        setDisplaySize: function() { return this; },
        setDepth: function() { return this; },
        setOrigin: function() { return this; },
        setScale: function(s) { this.scale = s; return this; },
        setAlpha: function(a) { this.alpha = a; return this; },
        setTint: function(t) { this.tint = t; return this; },
        clearTint: function() { this.tint = null; this.alpha = 1.0; return this; },
        destroy: function() { this.destroyed = true; }
      };
      mockImages.push(img);
      return img;
    },
    ellipse: () => ({ setDepth: function() { return this; }, setAlpha: function() { return this; } }),
    circle: () => ({ setDepth: function() { return this; }, setAlpha: function() { return this; } }),
    tileSprite: () => ({ setDepth: function() { return this; }, setScrollFactor: function() { return this; } }),
    graphics: () => ({ setDepth: function() { return this; }, setScrollFactor: function() { return this; }, fillStyle: function() { return this; }, fillRect: function() { return this; } }),
    text: () => ({ setOrigin: function() { return this; }, setDepth: function() { return this; }, destroy: function() { this.destroyed = true; } }),
    imageList: []
  },
  physics: {
    add: {
      staticImage: () => ({ setVisible: function() { return this; }, setCircle: function() { return this; }, refreshBody: function() { return this; } })
    }
  },
  _sparkle: () => {},
  _label: () => {},
  _restorePlots: () => {},
  clearAllDroppedItems: () => {},
  spawnDroppedItem: () => {},
  unlockPlot: function(p) {
    FarmScene.prototype.unlockPlot.call(this, p);
  }
};

// Call _createPlots on sceneMock using FarmScene prototype
sandbox.sceneMock = sceneMock;
vm.runInContext('sceneRef = sceneMock', sandbox);
FarmScene.prototype._createPlots.call(sceneMock, 800, 600);

assert(sceneMock.plots.length === 15, 'FarmScene creates 15 total plots');
assert(sceneMock.plots[9].active === false, 'Plot index 9 (Plot #10) tile is inactive');
assert(sceneMock.plots[9].tile.alpha === 0.35, 'Locked plot tile has alpha 0.35');

// Attempt to buy Plot #1 Expansion (plot index 9, cost 100 Gold) with 500 Gold
console.log('Testing buyPlotExpansion(0)...');
const initialGold = sandbox.playerCurrencies.coins;
sandbox.buyPlotExpansion(0); // Plot index 9

assert(sandbox.playerCurrencies.coins === initialGold - 100, `Gold deducted by 100 (from 500 to 400, actual: ${sandbox.playerCurrencies.coins})`);
assert(sandbox.isPlotUnlocked(9) === true, 'Plot index 9 is now unlocked');
assert(sceneMock.plots[9].active === true, 'Plot 9 on farm scene is marked active');
assert(sceneMock.plots[9].tile.alpha === 1.0, 'Plot 9 tile alpha updated to 1.0');

// Attempt to buy already owned plot
console.log('Testing buyPlotExpansion(0) when already owned...');
const goldBeforeOwned = sandbox.playerCurrencies.coins;
sandbox.buyPlotExpansion(0);
assert(sandbox.playerCurrencies.coins === goldBeforeOwned, 'Gold remains unchanged when buying already owned plot');

// Attempt to buy Plot #6 Expansion (index 14, cost 1000 Gold) with 400 Gold (insufficient)
console.log('Testing buyPlotExpansion(5) with insufficient Gold...');
const goldBeforeFail = sandbox.playerCurrencies.coins;
sandbox.buyPlotExpansion(5); // Plot index 14, cost 1000
assert(sandbox.playerCurrencies.coins === goldBeforeFail, 'Gold remains unchanged on failed purchase');
assert(sandbox.isPlotUnlocked(14) === false, 'Plot index 14 remains locked');

// -----------------------------------------------------------------------------
// TEST SUITE 3: Shop UI Rendering & Interaction
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3: Shop UI Integration ---');

const shopGrid = getMockElement('shop-level-grid');
sandbox.buildShopGrid();

assert(shopGrid.children.length > 0, 'Shop grid rendered children elements');
const sectionHeaders = shopGrid.children.filter(c => c.className === 'shop-section-header');
assert(sectionHeaders.length >= 1, 'Shop section header present');
assert(sectionHeaders[0].innerHTML.includes('Farm Plot Expansions'), 'Section header title includes "Farm Plot Expansions"');

// Check expansion cards count (should render 6 expansion cards)
const cards = shopGrid.children.filter(c => c.className && c.className.includes('shop-card'));
const plotCards = cards.filter(c => c.innerHTML.includes('Plot #'));
assert(plotCards.length === 6, 'Shop UI renders 6 Farm Plot Expansion cards');

// Check card 0 (owned) vs card 1 (unlocked cost 200)
assert(plotCards[0].className.includes('owned'), 'First plot card (Plot #10 / Expansion 1) shows owned class');
assert(plotCards[0].innerHTML.includes('✅ Owned'), 'First plot card displays ✅ Owned badge');
assert(!plotCards[1].className.includes('owned'), 'Second plot card is not owned');
assert(plotCards[1].innerHTML.includes('💰 200 gold'), 'Second plot card displays price 200 gold');

// -----------------------------------------------------------------------------
// TEST SUITE 4: Save / Load Persistence of Plot Unlocks
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 4: Save / Load Persistence ---');

// Unlock plot index 10 (cost 200) as well
sandbox.buyPlotExpansion(1); // Unlocks index 10

const savedData = sandbox.collectSave();
assert(Array.isArray(savedData.unlockedPlots), 'collectSave() contains unlockedPlots array');
assert(savedData.unlockedPlots.includes(9), 'collectSave() includes unlocked plot index 9');
assert(savedData.unlockedPlots.includes(10), 'collectSave() includes unlocked plot index 10');
assert(savedData.unlockedPlotCount >= 11, 'collectSave() includes unlockedPlotCount >= 11');

// Reset global state
sandbox.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
sandbox.unlockedPlotCount = 9;
assert(sandbox.isPlotUnlocked(9) === false, 'State reset: plot 9 locked');
assert(sandbox.isPlotUnlocked(10) === false, 'State reset: plot 10 locked');

// Apply save data snapshot
const loadResult = sandbox.applySave(savedData);
assert(loadResult === true, 'applySave() executed successfully');
assert(sandbox.isPlotUnlocked(9) === true, 'applySave() restored plot 9 unlocked status');
assert(sandbox.isPlotUnlocked(10) === true, 'applySave() restored plot 10 unlocked status');
assert(sandbox.isPlotUnlocked(11) === false, 'applySave() maintained plot 11 locked status');

// -----------------------------------------------------------------------------
// TEST SUITE 5: Decorative Perimeter Fence Post Flowers
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 5: Fence Post Flowers & Sway Animation ---');

mockTweens.length = 0;
mockImages.length = 0;

// Execute _drawWorld or fence building logic
const mockFarmScene = new FarmScene();
mockFarmScene.farm = { x: 100, y: 100, w: 500, h: 400 };
mockFarmScene.add = sceneMock.add;
mockFarmScene.tweens = sceneMock.tweens;
mockFarmScene.shadows = null;
mockFarmScene.textures = { get: () => null, exists: () => false };
mockFarmScene.time = { addEvent: () => {} };

FarmScene.prototype._drawWorld.call(mockFarmScene, 800, 600);

// Check generated flower tweens
assert(mockTweens.length > 0, `Fence post flowers created sway tweens (total tweens: ${mockTweens.length})`);
const flowerTweens = mockTweens.filter(t => t.ease === 'Sine.InOut' && t.repeat === -1 && t.angle && t.angle.from === -6 && t.angle.to === 6);
assert(flowerTweens.length >= 10, `At least 10 fence post flower sway tweens configured (found: ${flowerTweens.length})`);

// -----------------------------------------------------------------------------
// TEST SUITE 6: Syntax Check & SHA256 Mirror Synchronization
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 6: Syntax & SHA256 Mirror Synchronization ---');

const gameJsHash = crypto.createHash('sha256').update(fs.readFileSync('game.js')).digest('hex');
const assetsGameJsHash = crypto.createHash('sha256').update(fs.readFileSync('assets/game.js')).digest('hex');
console.log(`game.js SHA256:        ${gameJsHash}`);
console.log(`assets/game.js SHA256: ${assetsGameJsHash}`);
assert(gameJsHash === assetsGameJsHash, 'game.js and assets/game.js are 100% byte-identical');

const indexHtmlHash = crypto.createHash('sha256').update(fs.readFileSync('index.html')).digest('hex');
const assetsIndexHtmlHash = crypto.createHash('sha256').update(fs.readFileSync('assets/index.html')).digest('hex');
console.log(`index.html SHA256:        ${indexHtmlHash}`);
console.log(`assets/index.html SHA256: ${assetsIndexHtmlHash}`);
assert(indexHtmlHash === assetsIndexHtmlHash, 'index.html and assets/index.html are 100% byte-identical');

// -----------------------------------------------------------------------------
// SUMMARY RESULTS
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`AUDIT RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILURES:');
  testFailures.forEach(f => console.error(` - ${f}`));
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL TESTS PASSED CLEANLY.');
  process.exit(0);
}
