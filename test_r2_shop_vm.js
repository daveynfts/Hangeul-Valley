const fs = require('fs');
const vm = require('vm');

console.log('====================================================');
console.log('CHALLENGER 2: R2 SHOP UI & PLOT EXPANSION VM TEST');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// Mock DOM elements and document structure
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
    if (val === '') {
      this.children = [];
    }
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
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  location: { reload: () => {} },
  setInterval: () => 1,
  clearInterval: () => {}
};

class MockScene {
  constructor() {}
  refreshPlotAccess() {}
  unlockPlot() {}
}

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  navigator: { userAgent: 'node' },
  localStorage: mockWindow.localStorage,
  console: {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {}
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  AudioContext: function() {},
  webkitAudioContext: function() {},
  Image: function() {},
  Phaser: {
    Scene: MockScene,
    Game: function() {},
    AUTO: 1,
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Utils: { Array: { GetRandom: (arr) => arr[0] } }
  }
};

const context = vm.createContext(sandbox);
const gameCode = fs.readFileSync('game.js', 'utf8');

try {
  vm.runInContext(gameCode, context);
  console.log('-> game.js successfully loaded into Node VM context.\n');
} catch (e) {
  console.error('Failed to load game.js:', e);
  process.exit(1);
}

// Helper to evaluate in VM context
function execVM(codeStr) {
  return vm.runInContext(codeStr, context);
}

// ----------------------------------------------------
// TEST GROUP 1: PLOT_UNLOCK_COSTS & Initial State
// ----------------------------------------------------
console.log('--- TEST GROUP 1: PLOT_UNLOCK_COSTS Configuration ---');
const costs = execVM('PLOT_UNLOCK_COSTS');
assert(Array.isArray(costs) && costs.length === 6, 'PLOT_UNLOCK_COSTS is an array of length 6');
assert(JSON.stringify(costs) === '[100,200,350,500,750,1000]', `Costs match [100, 200, 350, 500, 750, 1000]: got [${costs}]`);

assert(execVM('isPlotUnlocked(0)') === true, 'Base Plot #1 (index 0) is unlocked initially');
assert(execVM('isPlotUnlocked(8)') === true, 'Base Plot #9 (index 8) is unlocked initially');
assert(execVM('isPlotUnlocked(9)') === false, 'Expansion Plot #1 (index 9) is locked initially');
assert(execVM('isPlotUnlocked(14)') === false, 'Expansion Plot #6 (index 14) is locked initially');

// ----------------------------------------------------
// TEST GROUP 2: Gold Balance Checks & Insufficient Gold Prevention
// ----------------------------------------------------
console.log('\n--- TEST GROUP 2: Gold Balance Checks & Insufficient Gold Prevention ---');
// Set coins to 50 (cannot afford plot idx 0 cost 100)
execVM('playerCurrencies.coins = 50; gold = 50;');

execVM('buyPlotExpansion(0)'); // Attempt buy plot idx 0 (plot 9)

const toastEl = getMockElement('toast');
assert(execVM('isPlotUnlocked(9)') === false, 'Plot 9 remains locked when coins (50) < cost (100)');
assert(execVM('playerCurrencies.coins') === 50, 'Coins remain 50 after failed purchase');
assert(execVM('gold') === 50, 'Gold alias remains 50 after failed purchase');
assert(toastEl.textContent.includes('Need 100 Gold'), `Toast notification shown: "${toastEl.textContent}"`);

// ----------------------------------------------------
// TEST GROUP 3: Sequential Purchase Across All 6 Expansion Plots
// ----------------------------------------------------
console.log('\n--- TEST GROUP 3: Sequential Purchase of All 6 Expansion Plots ---');
execVM('playerCurrencies.coins = 3000; gold = 3000; unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8]; unlockedPlotCount = 9;');

const expectedCosts = [100, 200, 350, 500, 750, 1000];
let currentCoins = 3000;

for (let idx = 0; idx < 6; idx++) {
  const plotIndex = 9 + idx;
  const cost = expectedCosts[idx];
  
  execVM(`buyPlotExpansion(${idx})`);
  currentCoins -= cost;

  assert(execVM(`isPlotUnlocked(${plotIndex})`) === true, `Expansion Plot #${idx + 1} (plotIndex ${plotIndex}) unlocked after purchase`);
  assert(execVM('playerCurrencies.coins') === currentCoins, `Player coins updated correctly to ${currentCoins} (-${cost})`);
  assert(execVM('gold') === currentCoins, `Gold alias synced to ${currentCoins}`);
  assert(execVM(`unlockedPlots.includes(${plotIndex})`), `unlockedPlots array contains plotIndex ${plotIndex}`);
  assert(execVM(`unlockedPlotCount >= ${plotIndex + 1}`), `unlockedPlotCount updated to >= ${plotIndex + 1}`);
  assert(toastEl.textContent.includes(`Unlocked Farm Plot #${plotIndex + 1}`), `Success toast shown: "${toastEl.textContent}"`);
}

assert(execVM('playerCurrencies.coins') === 100, 'Remaining coins equal 3000 - 2900 = 100');

// ----------------------------------------------------
// TEST GROUP 4: Double Purchase / Duplicate Purchase Prevention
// ----------------------------------------------------
console.log('\n--- TEST GROUP 4: Duplicate Purchase Prevention ---');
const coinsBeforeDup = execVM('playerCurrencies.coins');
execVM('buyPlotExpansion(0)'); // Plot 9 is already unlocked

assert(execVM('playerCurrencies.coins') === coinsBeforeDup, 'Coins not deducted when attempting to buy already owned plot');
assert(toastEl.textContent.includes('already unlocked'), `Toast indicates plot is already unlocked: "${toastEl.textContent}"`);

// ----------------------------------------------------
// TEST GROUP 5: Shop UI Card Rendering & Owned / Expensive States
// ----------------------------------------------------
console.log('\n--- TEST GROUP 5: Shop Card Rendering & Owned / Expensive States ---');
// Reset state to test shop rendering with mixed states:
// Plots 0..8 unlocked, Plot 9 (idx 0) unlocked, Plots 10..14 locked.
// Coins = 250 (Plot idx 1 cost 200 is affordable, Plot idx 2 cost 350 is too expensive)
execVM('unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; unlockedPlotCount = 10; playerCurrencies.coins = 250; gold = 250;');

execVM('buildShopGrid()');

const gridEl = mockDocument.getElementById('shop-level-grid');
const plotCards = gridEl.children.slice(1, 7);

// Card 0 (Plot #1 expansion, plotIndex 9, cost 100): OWNED
const card0 = plotCards[0];
assert(card0.className.includes('owned'), 'Owned plot card has "owned" class');
assert(card0.innerHTML.includes('shop-owned-badge') && card0.innerHTML.includes('✅ Owned'), 'Owned card displays "✅ Owned" badge');
assert(card0.innerHTML.includes('<button class="shop-buy-btn" disabled>Unlocked</button>'), 'Owned card displays disabled "Unlocked" button');

// Card 1 (Plot #2 expansion, plotIndex 10, cost 200): UNOWNED & AFFORDABLE (coins = 250)
const card1 = plotCards[1];
assert(!card1.className.includes('owned') && !card1.className.includes('too-expensive'), 'Affordable card has neither "owned" nor "too-expensive" class');
assert(card1.innerHTML.includes('💰 200 gold'), 'Affordable card displays cost "💰 200 gold"');
assert(card1.innerHTML.includes('🛒 Buy Now') && !card1.innerHTML.includes('disabled'), 'Affordable card displays enabled "🛒 Buy Now" button');

// Card 2 (Plot #3 expansion, plotIndex 11, cost 350): NOT YET AVAILABLE — plot 10 unowned.
// Expansions sell in order now, so the card reports the sequential lock rather than a gold
// shortfall; quoting a price for something you cannot buy yet would be misleading.
const card2 = plotCards[2];
assert(card2.className.includes('too-expensive'), 'Not-yet-available card has "too-expensive" class');
assert(card2.innerHTML.includes('Unlock Plot #11 first'), 'Not-yet-available card tells you which plot to buy first');
assert(!card2.innerHTML.includes('Need 100 gold'), 'Not-yet-available card does not quote a gold shortfall');
assert(card2.innerHTML.includes('disabled'), 'Not-yet-available card button has "disabled" attribute');
assert(card2.innerHTML.includes('🔒'), 'Not-yet-available card shows the lock icon');

// Card 5 (Plot #6 expansion, plotIndex 14, cost 1000): NOT YET AVAILABLE — plot 13 unowned
const card5 = plotCards[5];
assert(card5.className.includes('too-expensive'), 'Plot #6 card has "too-expensive" class');
assert(card5.innerHTML.includes('Unlock Plot #14 first'), 'Plot #6 card reports the sequential lock');

// Available but unaffordable: card 1 (plotIndex 10, cost 200) is next in line, so dropping
// coins below its price must surface the gold shortfall instead of a lock message.
execVM('playerCurrencies.coins = 50; syncGoldAlias(); buildShopGrid();');
const poorCard1 = mockDocument.getElementById('shop-level-grid').children.slice(1, 7)[1];
assert(poorCard1.className.includes('too-expensive'), 'Available-but-unaffordable card has "too-expensive" class');
assert(poorCard1.innerHTML.includes('Need 150 gold'), 'Available-but-unaffordable card displays "Need 150 gold"');
assert(!poorCard1.innerHTML.includes('Unlock Plot'), 'Available card does not show a sequential lock message');
execVM('playerCurrencies.coins = 250; syncGoldAlias(); buildShopGrid();');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
