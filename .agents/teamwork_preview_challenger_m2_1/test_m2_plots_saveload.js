const fs = require('fs');
const vm = require('vm');
const path = require('path');

const gameJsPath = path.resolve(__dirname, '../../game.js');
const gameCode = fs.readFileSync(gameJsPath, 'utf8');

const mockLocalStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

const createMockElement = (tag = 'div') => ({
  tagName: tag.toUpperCase(),
  innerHTML: '',
  innerText: '',
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  appendChild: () => {},
  removeChild: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  children: []
});

const mockDocument = {
  getElementById: () => createMockElement(),
  createElement: (tag) => createMockElement(tag),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: createMockElement('body')
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: mockLocalStorage,
  pywebview: null,
  innerWidth: 1024,
  innerHeight: 768,
  document: mockDocument
};

const mockPhaser = {
  Scale: {
    RESIZE: 'RESIZE',
    CENTER_BOTH: 'CENTER_BOTH',
    FIT: 'FIT'
  },
  Input: {
    Keyboard: {
      KeyCodes: { SPACE: 32, ENTER: 13, ESC: 27, W: 87, A: 65, S: 83, D: 68 }
    }
  },
  Display: {
    Color: {
      HexStringToColor: () => ({ color: 0 }),
      IntegerToRGB: () => ({ r: 0, g: 0, b: 0 }),
      ValueToColor: () => ({ color: 0 })
    }
  },
  Math: {
    Distance: {
      Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
    },
    Between: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    FloatBetween: (a, b) => Math.random() * (b - a) + a,
    Clamp: (v, min, max) => Math.min(Math.max(v, min), max)
  },
  Scene: class Scene {
    constructor() {}
  },
  Game: class Game {
    constructor() {}
  },
  AUTO: 'AUTO',
  CANVAS: 'CANVAS',
  WEBGL: 'WEBGL'
};

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockLocalStorage,
  Phaser: mockPhaser,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  JSON: JSON,
  Array: Array,
  Object: Object,
  Set: Set,
  Map: Map,
  String: String,
  Number: Number,
  Boolean: Boolean,
  RegExp: RegExp,
  Error: Error,
  $: (id) => mockDocument.getElementById(id),
  navigator: { userAgent: 'NodeVM' }
};

sandbox.window.window = sandbox.window;
sandbox.window.document = mockDocument;

const context = vm.createContext(sandbox);

// Execute game.js in context
try {
  vm.runInContext(gameCode, context, { filename: 'game.js' });
  console.log('[VM Load] Successfully loaded game.js');
} catch (e) {
  console.error('[VM Load Error]', e);
  process.exit(1);
}

// Global test variables runner
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, name, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    results.tests.push({ name, status: 'PASS', details });
    console.log(`[PASS] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', details });
    console.log(`[FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: Plot State Initialization (R1 - 9 unlocked, 6 locked)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SECTION 1: Plot State Initialization ---');

// Check PLOT_UNLOCK_COSTS
assert(
  Array.isArray(context.PLOT_UNLOCK_COSTS) && context.PLOT_UNLOCK_COSTS.length === 6,
  'PLOT_UNLOCK_COSTS is array of length 6',
  `Found length: ${context.PLOT_UNLOCK_COSTS ? context.PLOT_UNLOCK_COSTS.length : 0}`
);

assert(
  JSON.stringify(context.PLOT_UNLOCK_COSTS) === JSON.stringify([100, 200, 350, 500, 750, 1000]),
  'PLOT_UNLOCK_COSTS matches expected progression [100, 200, 350, 500, 750, 1000]',
  `Actual: ${JSON.stringify(context.PLOT_UNLOCK_COSTS)}`
);

// Check unlockedPlots default state
assert(
  Array.isArray(context.unlockedPlots) && context.unlockedPlots.length === 9,
  'unlockedPlots defaults to 9 plots (indices 0..8)',
  `Actual: ${JSON.stringify(context.unlockedPlots)}`
);

assert(
  context.unlockedPlotCount === 9,
  'unlockedPlotCount defaults to 9',
  `Actual: ${context.unlockedPlotCount}`
);

// Verify isPlotUnlocked for all 15 plots
let unlockedCount = 0;
let lockedCount = 0;
for (let i = 0; i < 15; i++) {
  if (context.isPlotUnlocked(i)) {
    unlockedCount++;
  } else {
    lockedCount++;
  }
}

assert(
  unlockedCount === 9 && lockedCount === 6,
  'isPlotUnlocked correctly classifies 9 unlocked (0..8) and 6 locked (9..14)',
  `Unlocked: ${unlockedCount}, Locked: ${lockedCount}`
);

for (let i = 0; i < 9; i++) {
  assert(context.isPlotUnlocked(i) === true, `Plot #${i + 1} (index ${i}) is unlocked by default`);
}

for (let i = 9; i < 15; i++) {
  assert(context.isPlotUnlocked(i) === false, `Plot #${i + 1} (index ${i}) is locked by default`);
}

// -----------------------------------------------------------------------------
// SECTION 2: Locked Plot Interaction & Purchase Flow
// -----------------------------------------------------------------------------
console.log('\n--- TEST SECTION 2: Locked Plot Interaction & Purchase Flow ---');

// Reset currency to low amount (e.g. 50 Gold)
context.playerCurrencies.coins = 50;
context.syncGoldAlias();

const initialCoins = context.playerCurrencies.coins;
const costForPlot9 = context.PLOT_UNLOCK_COSTS[0]; // 100

console.log(`Testing purchase with insufficient gold: player has ${context.playerCurrencies.coins} gold, cost is ${costForPlot9}`);

// Attempt purchase with insufficient gold via buyPlotExpansion(0)
context.buyPlotExpansion(0);

assert(
  context.isPlotUnlocked(9) === false,
  'Purchase with insufficient Gold fails: plot index 9 remains locked',
  `isPlotUnlocked(9) = ${context.isPlotUnlocked(9)}`
);

assert(
  context.playerCurrencies.coins === initialCoins && context.gold === initialCoins,
  'Purchase with insufficient Gold fails: zero Gold deducted',
  `Coins remaining: ${context.playerCurrencies.coins}, Gold alias: ${context.gold}`
);

assert(
  context.unlockedPlots.length === 9,
  'Purchase with insufficient Gold fails: unlockedPlots array unchanged',
  `unlockedPlots count: ${context.unlockedPlots.length}`
);

// Now give sufficient Gold (e.g. 500 Gold) and purchase plot index 9 (cost 100)
console.log('\nTesting purchase with sufficient gold: player has 500 gold, cost is 100');
context.playerCurrencies.coins = 500;
context.syncGoldAlias();

const goldBeforePurchase = context.playerCurrencies.coins;
context.buyPlotExpansion(0);

assert(
  context.isPlotUnlocked(9) === true,
  'Purchase with sufficient Gold succeeds: plot index 9 is now unlocked',
  `isPlotUnlocked(9) = ${context.isPlotUnlocked(9)}`
);

assert(
  context.playerCurrencies.coins === goldBeforePurchase - costForPlot9 && context.gold === goldBeforePurchase - costForPlot9,
  `Purchase with sufficient Gold succeeds: exact cost (${costForPlot9}) deducted`,
  `Coins remaining: ${context.playerCurrencies.coins} (expected ${goldBeforePurchase - costForPlot9})`
);

assert(
  context.unlockedPlots.includes(9),
  'unlockedPlots array contains 9 after purchase',
  `unlockedPlots: ${JSON.stringify(context.unlockedPlots)}`
);

assert(
  context.unlockedPlotCount === 10,
  'unlockedPlotCount is updated to 10 after purchase',
  `unlockedPlotCount: ${context.unlockedPlotCount}`
);

// Attempt duplicate purchase of already unlocked plot
const coinsBeforeDuplicate = context.playerCurrencies.coins;
context.buyPlotExpansion(0);

assert(
  context.playerCurrencies.coins === coinsBeforeDuplicate,
  'Duplicate purchase attempt on unlocked plot does not deduct Gold',
  `Coins: ${context.playerCurrencies.coins}`
);

// Also test direct Scene interaction unlock logic via FarmScene prototype
console.log('\nTesting in-scene direct interaction unlock flow (_interact logic)');

// Mock a scene with plots array
const mockFarmPlots = [];
for (let i = 0; i < 15; i++) {
  mockFarmPlots.push({
    index: i,
    active: context.isPlotUnlocked(i),
    x: 100 + i * 50,
    y: 100,
    sState: '',
    ko: null,
    word: null,
    tile: { setAlpha: () => ({ setTint: () => {}, clearTint: () => ({ setAlpha: () => {} }) }) },
    shad: { setAlpha: () => {} }
  });
}

const mockScene = {
  plots: mockFarmPlots,
  player: { x: 100 + 10 * 50, y: 100 }, // positioned near plot index 10 (cost 200)
  unlockPlot: function(p) {
    if (context.FarmScene && context.FarmScene.prototype.unlockPlot) {
      context.FarmScene.prototype.unlockPlot.call(this, p);
    } else {
      if(!p || p.active) return;
      p.active = true;
      if(!context.unlockedPlots.includes(p.index)) context.unlockedPlots.push(p.index);
      context.unlockedPlotCount = Math.max(context.unlockedPlotCount, context.unlockedPlots.length);
      context.persistSave();
    }
  },
  refreshPlotAccess: function() {
    if (context.FarmScene && context.FarmScene.prototype.refreshPlotAccess) {
      context.FarmScene.prototype.refreshPlotAccess.call(this);
    }
  },
  _sparkle: () => {},
  _label: () => {},
  children: { list: [] },
  physics: {
    add: {
      staticImage: () => ({ setVisible: () => ({ setCircle: () => ({ refreshBody: () => {} }) }) })
    }
  }
};

context.sceneRef = mockScene;

// Test locked plot interaction near plot index 10 with insufficient gold (player has 50 gold)
context.playerCurrencies.coins = 50;
context.syncGoldAlias();
const plot10Cost = context.PLOT_UNLOCK_COSTS[1]; // 200

// Simulate scene _interact() for locked plot index 10
const plot10 = mockScene.plots[10]; // index 10 is locked
assert(plot10.active === false, 'Plot index 10 initially locked in scene');

// Execute locked plot interaction check manually as done in game.js _interact()
if (!plot10.active) {
  const cost = context.PLOT_UNLOCK_COSTS[plot10.index - 9] || 1000;
  if (context.gold >= cost) {
    context.spendCoins(cost);
    mockScene.unlockPlot(plot10);
  }
}

assert(
  plot10.active === false && context.isPlotUnlocked(10) === false,
  'Scene interact purchase with insufficient Gold fails (plot 10 remains locked)',
  `Plot 10 active: ${plot10.active}, Gold: ${context.gold}`
);

// Give sufficient gold (300 gold) and execute scene interact purchase for plot 10
context.playerCurrencies.coins = 300;
context.syncGoldAlias();
const coinsBeforeScenePurchase = context.playerCurrencies.coins;

if (!plot10.active) {
  const cost = context.PLOT_UNLOCK_COSTS[plot10.index - 9] || 1000;
  if (context.gold >= cost) {
    context.spendCoins(cost);
    mockScene.unlockPlot(plot10);
  }
}

assert(
  plot10.active === true && context.isPlotUnlocked(10) === true,
  'Scene interact purchase with sufficient Gold succeeds (plot 10 active & unlocked)',
  `Plot 10 active: ${plot10.active}, isPlotUnlocked(10): ${context.isPlotUnlocked(10)}`
);

assert(
  context.playerCurrencies.coins === coinsBeforeScenePurchase - plot10Cost,
  `Scene interact purchase deducts exact cost (${plot10Cost})`,
  `Coins remaining: ${context.playerCurrencies.coins} (expected ${coinsBeforeScenePurchase - plot10Cost})`
);

// Clear sceneRef so collectSave uses saved plot state instead of sceneRef.plots
context.sceneRef = null;

// -----------------------------------------------------------------------------
// SECTION 3: Save Serialization, Migration, and Restoration
// -----------------------------------------------------------------------------
console.log('\n--- TEST SECTION 3: Save Serialization, Migration, and Restoration ---');

// Test collectSave()
const savedData = context.collectSave();

assert(
  typeof savedData === 'object' && savedData !== null,
  'collectSave() returns a valid save object'
);

assert(
  savedData.v === 4,
  'collectSave() sets schema version v: 4',
  `v = ${savedData.v}`
);

assert(
  Array.isArray(savedData.unlockedPlots),
  'collectSave() includes unlockedPlots array',
  `unlockedPlots: ${JSON.stringify(savedData.unlockedPlots)}`
);

assert(
  savedData.unlockedPlotCount === context.unlockedPlotCount,
  'collectSave() includes unlockedPlotCount matching in-memory state',
  `unlockedPlotCount = ${savedData.unlockedPlotCount}`
);

assert(
  savedData.gold === context.playerCurrencies.coins,
  'collectSave() syncs gold field with currencies.coins',
  `gold = ${savedData.gold}, coins = ${savedData.currencies.coins}`
);

// Test migrateSaveData() with Legacy Saves (v1, v2, v3)
console.log('\nTesting migration of legacy save schemas...');

// 1. Legacy v1 Save without unlockedPlots or unlockedPlotCount
const legacyV1Save = {
  gold: 250,
  unlockedLevels: [0, 1],
  plots: [{ i: 0, ko: '배추', sState: '4', plantedAt: 123456789 }]
};

const migratedV1 = context.migrateSaveData(legacyV1Save);

assert(
  migratedV1.v === 4,
  'migrateSaveData upgrades v1 schema to v4',
  `migrated v = ${migratedV1.v}`
);

assert(
  migratedV1.currencies.coins === 250 && migratedV1.gold === 250,
  'migrateSaveData converts legacy gold into currencies.coins',
  `coins = ${migratedV1.currencies.coins}, gold = ${migratedV1.gold}`
);

assert(
  Array.isArray(migratedV1.unlockedPlots) && migratedV1.unlockedPlots.length === 9,
  'migrateSaveData defaults missing unlockedPlots to 9 default unlocked plots [0..8]',
  `unlockedPlots: ${JSON.stringify(migratedV1.unlockedPlots)}`
);

assert(
  migratedV1.unlockedPlotCount === 9,
  'migrateSaveData defaults missing unlockedPlotCount to 9',
  `unlockedPlotCount = ${migratedV1.unlockedPlotCount}`
);

// 2. Legacy Save with unlockedPlotCount = 12 but missing unlockedPlots array
const legacyCountOnlySave = {
  v: 2,
  gold: 500,
  unlockedPlotCount: 12
};

const migratedCountOnly = context.migrateSaveData(legacyCountOnlySave);

assert(
  Array.isArray(migratedCountOnly.unlockedPlots) && migratedCountOnly.unlockedPlots.length === 12,
  'migrateSaveData expands unlockedPlotCount = 12 into unlockedPlots array [0..11]',
  `unlockedPlots length: ${migratedCountOnly.unlockedPlots.length}`
);

assert(
  JSON.stringify(migratedCountOnly.unlockedPlots) === JSON.stringify([0,1,2,3,4,5,6,7,8,9,10,11]),
  'migrated unlockedPlots contains indices 0..11',
  `Actual: ${JSON.stringify(migratedCountOnly.unlockedPlots)}`
);

// 3. Save with duplicate entries in unlockedPlots
const duplicateSave = {
  v: 4,
  unlockedPlots: [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10]
};

const migratedDup = context.migrateSaveData(duplicateSave);

assert(
  JSON.stringify(migratedDup.unlockedPlots) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  'migrateSaveData deduplicates unlockedPlots using Set',
  `Deduplicated length: ${migratedDup.unlockedPlots.length}`
);

// Test applySave() Restoration
console.log('\nTesting applySave() restoration...');

// Custom save payload with 11 plots unlocked and specific planted crops
const customSavePayload = {
  v: 4,
  currencies: { coins: 1250, gems: 25, honor: 5 },
  gold: 1250,
  unlockedPlots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  unlockedPlotCount: 11,
  plots: [
    { i: 0, ko: '배추', sState: '4', plantedAt: 1000 },
    { i: 9, ko: '무', sState: '3', plantedAt: 2000 },
    { i: 10, ko: '고추', sState: '1', plantedAt: 3000 }
  ]
};

const applyResult = context.applySave(customSavePayload);

assert(
  applyResult === true,
  'applySave() returns true on valid save object'
);

assert(
  context.playerCurrencies.coins === 1250 && context.gold === 1250,
  'applySave() restores currencies.coins (1250) and syncs gold alias',
  `Coins: ${context.playerCurrencies.coins}, Gold: ${context.gold}`
);

assert(
  JSON.stringify(context.unlockedPlots) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  'applySave() restores unlockedPlots [0..10]',
  `unlockedPlots: ${JSON.stringify(context.unlockedPlots)}`
);

assert(
  context.unlockedPlotCount === 11,
  'applySave() restores unlockedPlotCount = 11',
  `unlockedPlotCount: ${context.unlockedPlotCount}`
);

assert(
  context.isPlotUnlocked(9) === true && context.isPlotUnlocked(10) === true && context.isPlotUnlocked(11) === false,
  'applySave() accurately updates isPlotUnlocked() (9 & 10 unlocked, 11 locked)',
  `isPlotUnlocked(9)=${context.isPlotUnlocked(9)}, isPlotUnlocked(10)=${context.isPlotUnlocked(10)}, isPlotUnlocked(11)=${context.isPlotUnlocked(11)}`
);

const savedPlotsAfterApply = context.collectSave().plots;
assert(
  savedPlotsAfterApply.length === 3 && savedPlotsAfterApply[1].ko === '무',
  'applySave() restores planted plot save states',
  `plots length: ${savedPlotsAfterApply.length}, plot[1].ko: ${savedPlotsAfterApply[1].ko}`
);

// Round-trip test: collectSave() -> applySave()
console.log('\nTesting Round-Trip collectSave() -> applySave()');

// Mutate state
context.buyPlotExpansion(2); // unlocks plot index 11 (cost 350, player had 1250 -> 900 left)
const roundtripExport = JSON.parse(JSON.stringify(context.collectSave()));

// Clear in-memory state
context.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
context.unlockedPlotCount = 9;
context.playerCurrencies = { coins: 0, gems: 0, honor: 0 };
context.syncGoldAlias();

// Apply exported save
context.applySave(roundtripExport);

assert(
  context.isPlotUnlocked(11) === true,
  'Round-trip save/load preserves plot 11 unlocked status',
  `isPlotUnlocked(11) = ${context.isPlotUnlocked(11)}`
);

assert(
  context.playerCurrencies.coins === 900,
  'Round-trip save/load preserves exact coin balance (900)',
  `Coins: ${context.playerCurrencies.coins}`
);

// Summary output
console.log('\n==================================================');
console.log(`TOTAL TESTS: ${results.total}`);
console.log(`PASSED:      ${results.passed}`);
console.log(`FAILED:      ${results.failed}`);
console.log(`VERDICT:     ${results.failed === 0 ? 'PASS' : 'FAIL'}`);
console.log('==================================================');

// Save JSON summary file
const jsonPath = path.resolve(__dirname, 'test_output.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

if (results.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
