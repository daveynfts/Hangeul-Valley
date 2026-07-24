const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

console.log('===========================================================');
console.log('AUDITOR M2 EMPIRICAL VERIFICATION SCRIPT');
console.log('===========================================================');

let passCount = 0;
let failCount = 0;

function assert(cond, name, details = '') {
  if (cond) {
    passCount++;
    console.log(`[PASS] ${name}${details ? ' - ' + details : ''}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${name}${details ? ' - ' + details : ''}`);
  }
}

// 1. SHA256 Sync Verification
const gameJsHash = crypto.createHash('sha256').update(fs.readFileSync('game.js')).digest('hex');
const assetsGameJsHash = crypto.createHash('sha256').update(fs.readFileSync('assets/game.js')).digest('hex');
assert(gameJsHash === assetsGameJsHash, 'SHA256 game.js ↔ assets/game.js sync', `Hash: ${gameJsHash}`);

const indexHtmlHash = crypto.createHash('sha256').update(fs.readFileSync('index.html')).digest('hex');
const assetsIndexHtmlHash = crypto.createHash('sha256').update(fs.readFileSync('assets/index.html')).digest('hex');
assert(indexHtmlHash === assetsIndexHtmlHash, 'SHA256 index.html ↔ assets/index.html sync', `Hash: ${indexHtmlHash}`);

// 2. Setup VM Sandbox for game.js execution
class MockElement {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.children = [];
    this.innerHTML = '';
    this.classList = { add: () => {}, remove: () => {}, contains: () => false };
  }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(ev, fn) {}
  removeEventListener(ev, fn) {}
  querySelector() { return new MockElement(); }
  querySelectorAll() { return []; }
}

const mockDoc = {
  getElementById: (id) => new MockElement(id),
  createElement: (t) => new MockElement(),
  body: new MockElement('body'),
  activeElement: null
};

const listeners = {};
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  document: mockDoc,
  window: {
    listeners,
    addEventListener: (ev, fn) => { listeners[ev] = listeners[ev] || []; listeners[ev].push(fn); },
    removeEventListener: () => {}
  },
  Phaser: {
    Game: class {},
    Scene: class {},
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Math: { RandomDataGenerator: class {}, Between: (a, b) => a }
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  }
};
sandbox.globalThis = sandbox;
sandbox.window.window = sandbox.window;
sandbox.window.document = mockDoc;

const ctx = vm.createContext(sandbox);
const gameCode = fs.readFileSync('game.js', 'utf8');
vm.runInContext(gameCode, ctx);

assert(typeof ctx.buyPlotExpansion === 'function', 'buyPlotExpansion function defined');
assert(typeof ctx.isPlotUnlocked === 'function', 'isPlotUnlocked function defined');
assert(typeof ctx.collectSave === 'function', 'collectSave function defined');
assert(typeof ctx.applySave === 'function', 'applySave function defined');

// 3. Test Plot Unlocking & Gold Deduction Logic
ctx.playerCurrencies = { coins: 0, gems: 0, honor: 0 };
ctx.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
ctx.unlockedPlotCount = 9;

// Attempt to buy Plot #10 (idx 0 -> plotIndex 9) with 0 coins
ctx.buyPlotExpansion(0);
assert(!ctx.unlockedPlots.includes(9), 'Plot Expansion 1 blocked when insufficient gold');

// Give 100 gold and buy Plot #10
ctx.playerCurrencies.coins = 100;
ctx.buyPlotExpansion(0);
assert(ctx.unlockedPlots.includes(9), 'Plot Expansion 1 unlocked with 100 gold');
assert(ctx.playerCurrencies.coins === 0, 'Gold deducted to 0 after purchasing Plot Expansion 1');
assert(ctx.gold === 0, 'gold alias updated to 0');

// Give 200 gold and buy Plot #11 (idx 1 -> plotIndex 10)
ctx.playerCurrencies.coins = 200;
ctx.buyPlotExpansion(1);
assert(ctx.unlockedPlots.includes(10), 'Plot Expansion 2 unlocked with 200 gold');
assert(ctx.playerCurrencies.coins === 0, 'Gold deducted to 0 after purchasing Plot Expansion 2');

// Test all remaining plot costs
const costs = [350, 500, 750, 1000];
costs.forEach((cost, idx) => {
  const plotIdx = idx + 2;
  const targetPlot = 9 + plotIdx;
  ctx.playerCurrencies.coins = cost;
  ctx.buyPlotExpansion(plotIdx);
  assert(ctx.unlockedPlots.includes(targetPlot), `Plot Expansion #${plotIdx + 1} (Plot #${targetPlot + 1}) unlocked with ${cost} gold`);
  assert(ctx.playerCurrencies.coins === 0, `Gold deducted to 0 after purchasing Plot Expansion #${plotIdx + 1}`);
});

assert(ctx.unlockedPlots.length === 15, 'All 15 plots unlocked after purchasing all 6 expansions');

// 4. Test Persistence & Reload
const saveSnapshot = ctx.collectSave();
assert(Array.isArray(saveSnapshot.unlockedPlots) && saveSnapshot.unlockedPlots.length === 15, 'collectSave contains all 15 unlocked plots');
assert(saveSnapshot.unlockedPlotCount === 15, 'collectSave unlockedPlotCount is 15');

// Reset state and restore
ctx.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
ctx.unlockedPlotCount = 9;
ctx.applySave(saveSnapshot);
assert(ctx.unlockedPlots.length === 15, 'applySave correctly restored 15 unlocked plots from save snapshot');
assert(ctx.unlockedPlotCount === 15, 'applySave correctly restored unlockedPlotCount = 15');

// 5. Inspect Decorative Fence Flower Animations Code in FarmScene
const farmSceneMatch = gameCode.match(/const fenceY = this\.farm\.y - 12;[\s\S]*?this\._createButterflies\(flowerList\);/);
assert(farmSceneMatch !== null, 'Found decorative fence flower creation & animation block in FarmScene');

if (farmSceneMatch) {
  const codeBlock = farmSceneMatch[0];
  assert(codeBlock.includes("fenceFlowerTexs = ['flw_red', 'flw_yellow', 'flw_purple']"), 'Fence flowers use flw_red, flw_yellow, flw_purple textures');
  assert(codeBlock.includes("targets: flower"), 'Fence flower Phaser sway animation targets flower sprite');
  assert(codeBlock.includes("angle: { from: -6, to: 6 }"), 'Fence flower sway animation swings angle -6 to +6 degrees');
  assert(codeBlock.includes("ease: 'Sine.InOut'"), 'Fence flower sway animation uses Sine.InOut easing');
  assert(codeBlock.includes("repeat: -1"), 'Fence flower sway animation loops infinitely (repeat: -1)');
}

console.log('===========================================================');
console.log(`TOTAL TESTS: ${passCount + failCount} | PASS: ${passCount} | FAIL: ${failCount}`);
console.log(`VERDICT: ${failCount === 0 ? 'CLEAN' : 'INTEGRITY VIOLATION'}`);
console.log('===========================================================');
process.exit(failCount === 0 ? 0 : 1);
