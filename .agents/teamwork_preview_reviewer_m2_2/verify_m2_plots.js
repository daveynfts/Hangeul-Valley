const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');

let passCount = 0;
let failCount = 0;

function assert(condition, title, detail = '') {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${title}${detail ? ' - ' + detail : ''}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${title}${detail ? ' - ' + detail : ''}`);
  }
}

console.log('===========================================================');
console.log('REVIEWER 2 - MILESTONE 2 FARM PLOTS EMPIRICAL VERIFICATION');
console.log('===========================================================');

// 1. Syntax Check
console.log('\n--- 1. Syntax Verification ---');
try {
  execSync('node -c game.js', { stdio: 'pipe' });
  assert(true, 'game.js syntax check (node -c)');
} catch (e) {
  assert(false, 'game.js syntax check (node -c)', e.message);
}
try {
  execSync('node -c assets/game.js', { stdio: 'pipe' });
  assert(true, 'assets/game.js syntax check (node -c)');
} catch (e) {
  assert(false, 'assets/game.js syntax check (node -c)', e.message);
}

// 2. SHA256 Sync Check
console.log('\n--- 2. SHA256 Synchronization Check ---');
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
const hashGame = sha256('game.js');
const hashAssetsGame = sha256('assets/game.js');
assert(hashGame === hashAssetsGame, 'SHA256 game.js <-> assets/game.js', `game.js (${hashGame.slice(0,10)}) vs assets/game.js (${hashAssetsGame.slice(0,10)})`);

const hashIndex = sha256('index.html');
const hashAssetsIndex = sha256('assets/index.html');
assert(hashIndex === hashAssetsIndex, 'SHA256 index.html <-> assets/index.html', `index.html (${hashIndex.slice(0,10)}) vs assets/index.html (${hashAssetsIndex.slice(0,10)})`);

// 3. Load VM & DOM Mock
console.log('\n--- 3. Functionality & State Logic Verification ---');
class ClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  contains(c) { return this._set.has(c); }
}

class MockElement {
  constructor(id = '', tagName = 'DIV') {
    this.id = id;
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.className = '';
    this.classList = new ClassList();
    this.eventListeners = {};
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  addEventListener(evt, fn) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(fn);
  }
  setAttribute(k, v) {}
  removeAttribute(k) {}
  querySelector(s) { return new MockElement(); }
  querySelectorAll(s) { return []; }
}

class MockDocument {
  constructor() {
    this.elements = new Map();
  }
  createElement(tag) {
    return new MockElement('', tag.toUpperCase());
  }
  getElementById(id) {
    if (!this.elements.has(id)) {
      this.elements.set(id, new MockElement(id));
    }
    return this.elements.get(id);
  }
}

const mockDoc = new MockDocument();

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  document: mockDoc,
  Phaser: {
    Scene: class {},
    Game: class { constructor(c) {} },
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Math: {
      Between: (min, max) => min,
      Distance: { Between: () => 0 },
      RandomDataGenerator: class {}
    }
  },
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    pywebview: null
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  $: (id) => mockDoc.getElementById(id)
};
sandbox.window.document = mockDoc;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);
const gameCode = fs.readFileSync('game.js', 'utf8');

try {
  vm.runInContext(gameCode, context);
  assert(true, 'VM load of game.js succeeded');
} catch (err) {
  assert(false, 'VM load of game.js failed', err.stack);
  process.exit(1);
}

// 4. Verify PLOT_UNLOCK_COSTS & plot helper
assert(Array.isArray(context.PLOT_UNLOCK_COSTS), 'PLOT_UNLOCK_COSTS is Array');
assert(JSON.stringify(context.PLOT_UNLOCK_COSTS) === '[100,200,350,500,750,1000]', 'PLOT_UNLOCK_COSTS is [100, 200, 350, 500, 750, 1000]', `Actual: ${JSON.stringify(context.PLOT_UNLOCK_COSTS)}`);

assert(context.isPlotUnlocked(0) === true, 'Plot 0 is unlocked');
assert(context.isPlotUnlocked(8) === true, 'Plot 8 is unlocked');
assert(context.isPlotUnlocked(9) === false, 'Plot 9 is locked initially');
assert(context.isPlotUnlocked(14) === false, 'Plot 14 is locked initially');

// 5. Verify Shop UI rendering
context.buildShopGrid();
const shopGrid = mockDoc.getElementById('shop-level-grid');
assert(shopGrid.children.length > 6, 'Shop grid rendered children (plot items + vocab items)');
const firstChild = shopGrid.children[0];
assert(firstChild.innerHTML.includes('🌾 Farm Plot Expansions'), 'Shop header contains "🌾 Farm Plot Expansions"');

// Check the 6 plot expansion cards (children[1] to children[6])
let plotCardsValid = true;
for (let i = 1; i <= 6; i++) {
  const card = shopGrid.children[i];
  const cost = context.PLOT_UNLOCK_COSTS[i - 1];
  if (!card.innerHTML.includes(`Plot #${i} Expansion`) || !card.innerHTML.includes(`${cost}`)) {
    plotCardsValid = false;
  }
}
assert(plotCardsValid, 'All 6 plot expansion cards rendered with correct Plot # and Gold cost');

// 6. Verify buyPlotExpansion with insufficient funds
context.playerCurrencies = { coins: 50, gems: 0, honor: 0 };
context.gold = 50;
context.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
context.unlockedPlotCount = 9;

context.buyPlotExpansion(0); // Plot 9 costs 100 gold
assert(context.playerCurrencies.coins === 50, 'Insufficient gold: coins remain 50');
assert(!context.unlockedPlots.includes(9), 'Insufficient gold: plot 9 remains locked');

// 7. Verify buyPlotExpansion with sufficient funds
context.playerCurrencies = { coins: 250, gems: 0, honor: 0 };
context.gold = 250;

context.buyPlotExpansion(0); // Plot 9 costs 100 gold
assert(context.playerCurrencies.coins === 150, 'Sufficient gold: coins deducted from 250 to 150 (-100)');
assert(context.gold === 150, 'Gold alias updated to 150');
assert(context.unlockedPlots.includes(9), 'Plot 9 added to unlockedPlots array');
assert(context.unlockedPlotCount === 10, 'unlockedPlotCount updated to 10');
assert(context.isPlotUnlocked(9) === true, 'isPlotUnlocked(9) returns true after purchase');

// 8. Save/Load Persistence Check
console.log('\n--- 4. Save/Load Persistence Verification ---');

const saveData = context.collectSave();
assert(Array.isArray(saveData.unlockedPlots), 'collectSave(): contains unlockedPlots array');
assert(saveData.unlockedPlots.includes(9), 'collectSave(): serialized unlockedPlots includes plot index 9');
assert(saveData.unlockedPlotCount === 10, 'collectSave(): serialized unlockedPlotCount === 10');

// Reset state
context.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
context.unlockedPlotCount = 9;

// Apply save
const applied = context.applySave(saveData);
assert(applied === true, 'applySave(): returned true');
assert(context.unlockedPlots.includes(9), 'applySave(): restored unlockedPlots array with plot 9');
assert(context.unlockedPlotCount === 10, 'applySave(): restored unlockedPlotCount (10)');

// Migration test: legacy save without unlockedPlots
const legacySave = {
  v: 3,
  gold: 500,
  unlockedLevels: [0],
  unlockedPlotCount: 12
};

const migrated = context.migrateSaveData(legacySave);
assert(migrated.v === 4, 'migrateSaveData(): upgraded schema version to 4');
assert(Array.isArray(migrated.unlockedPlots), 'migrateSaveData(): created unlockedPlots array');
assert(migrated.unlockedPlots.length === 12, 'migrateSaveData(): populated 12 plot indices [0..11]', `Length: ${migrated.unlockedPlots.length}`);
assert(migrated.unlockedPlots[11] === 11, 'migrateSaveData(): includes plot index 11');

// Migration test: legacy save without unlockedPlots or unlockedPlotCount
const legacySaveEmptyPlots = { v: 1, gold: 100 };
const migratedEmpty = context.migrateSaveData(legacySaveEmptyPlots);
assert(migratedEmpty.unlockedPlots.length === 9, 'migrateSaveData(): defaults to 9 plots [0..8]');
assert(migratedEmpty.unlockedPlotCount === 9, 'migrateSaveData(): defaults unlockedPlotCount to 9');

console.log('\n===========================================================');
console.log(`SUITE COMPLETE: Pass = ${passCount} | Fail = ${failCount}`);
console.log(`VERDICT: ${failCount === 0 ? 'ALL PASSED' : 'FAILURES DETECTED'}`);
console.log('===========================================================');
process.exit(failCount === 0 ? 0 : 1);
