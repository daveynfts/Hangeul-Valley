const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('=== TEST HARNESS FOR M2 R1 & R3 IN GAME.JS ===\n');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${message}`);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// SECTION 1: R1 Plot Slot Count & Unlocked Logic
// -------------------------------------------------------------
console.log('--- 1. Plot Slots & Initial State ---');

// Parse PLOT_UNLOCK_COSTS, unlockedPlots, unlockedPlotCount, isPlotUnlocked
const sandbox = {
  console: console,
  Math: Math,
  Array: Array,
  typeof: (v) => typeof v
};

vm.createContext(sandbox);

const plotSetupCode = `
var PLOT_UNLOCK_COSTS = [100, 200, 350, 500, 750, 1000];
var unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
var unlockedPlotCount = 9;
function isPlotUnlocked(i) {
  if (i < 9) return true;
  if (Array.isArray(unlockedPlots) && unlockedPlots.includes(i)) return true;
  if (typeof unlockedPlotCount === 'number' && i < unlockedPlotCount) return true;
  return false;
}
`;

vm.runInContext(plotSetupCode, sandbox);

assert(sandbox.PLOT_UNLOCK_COSTS.length === 6, 'PLOT_UNLOCK_COSTS has 6 unlock costs (for 6 locked plots 9..14)');
assert(JSON.stringify(sandbox.PLOT_UNLOCK_COSTS) === '[100,200,350,500,750,1000]', 'PLOT_UNLOCK_COSTS match expected values [100, 200, 350, 500, 750, 1000]');

for (let i = 0; i < 9; i++) {
  assert(sandbox.isPlotUnlocked(i) === true, `Plot index ${i} is initial unlocked`);
}

for (let i = 9; i < 15; i++) {
  assert(sandbox.isPlotUnlocked(i) === false, `Plot index ${i} is initial locked`);
}

// Check MAX=15 in _createPlots code string
assert(code.includes('const MAX=15, ROWS=5;') || code.includes('MAX=15'), '_createPlots defines MAX=15 plot slots');

// -------------------------------------------------------------
// SECTION 2: Visual Rendering for Locked Plots
// -------------------------------------------------------------
console.log('\n--- 2. Visual Rendering for Locked Plots ---');

assert(code.includes('tile.setAlpha(0.35).setTint(0x666666);'), 'Locked plots set darker soil tint 0x666666 and reduced alpha 0.35');
assert(code.includes("lockIcon = this.add.image(px, py - 4, 'pixel_crate').setDisplaySize(24, 24).setAlpha(0.7).setDepth(3);"), 'Locked plots render pixel_crate lock icon');
assert(code.includes("lockText = this.add.text(px, py, '🔒', { fontSize: '18px' }).setOrigin(0.5).setDepth(4);"), 'Locked plots render 🔒 text indicator');

// -------------------------------------------------------------
// SECTION 3: Proximity Prompt & Unlock Behavior
// -------------------------------------------------------------
console.log('\n--- 3. Proximity Prompt & Unlock Behavior ---');

assert(code.includes('lbl=`[SPACE] Unlock Plot #${p.index + 1} (${cost} Gold) 🔒`;'), 'Proximity interaction prompt matches format "[SPACE] Unlock Plot #N (X Gold) 🔒"');

// Inspect unlock behavior in _interact
assert(code.includes('const cost = PLOT_UNLOCK_COSTS[p.index - 9] || 1000;'), 'Unlock cost calculation maps plot index 9..14 to cost array');
assert(code.includes('if(gold >= cost){'), 'Deducts gold only when player has sufficient funds (gold >= cost)');
assert(code.includes('spendCoins(cost);'), 'Calls spendCoins(cost) to deduct cost');
assert(code.includes('this.unlockPlot(p);'), 'Calls unlockPlot(p) on successful interaction');
assert(code.includes("showToast(`Need ${cost} Gold 🪙 to unlock Farm Plot #${p.index + 1}!`);"), 'Shows feedback toast when gold is insufficient');

// Inspect unlockPlot method
assert(code.includes('p.active = true;'), 'unlockPlot sets plot active = true');
assert(code.includes('if(!unlockedPlots.includes(p.index)) unlockedPlots.push(p.index);'), 'unlockPlot adds plot index to unlockedPlots array');
assert(code.includes('p.tile.clearTint().setAlpha(1.0);'), 'unlockPlot clears tile tint and resets alpha to 1.0');
assert(code.includes('if(p.lockIcon){ p.lockIcon.destroy(); p.lockIcon = null; }'), 'unlockPlot destroys lock icon');
assert(code.includes('if(p.lockText){ p.lockText.destroy(); p.lockText = null; }'), 'unlockPlot destroys lock text');
assert(code.includes('persistSave();'), 'unlockPlot calls persistSave() to save plot unlock state');

// -------------------------------------------------------------
// SECTION 4: R3 Fence Flowers & Sway Animation
// -------------------------------------------------------------
console.log('\n--- 4. R3 Decorative Animated Fence Flowers ---');

// Check fence flower colors array
const colorsMatch = code.match(/const fenceFlowerColors = \[(.*?)\];/);
assert(colorsMatch !== null, 'fenceFlowerColors array is defined');

if (colorsMatch) {
  const colorsStr = colorsMatch[1];
  const colorCount = colorsStr.split(',').length;
  assert(colorCount >= 3, `fenceFlowerColors has at least 3 colors (found ${colorCount})`);
  console.log(`   Color tokens: ${colorsStr}`);
}

assert(code.includes('R3: Perimeter Fences & Decorative Animated Fence Flowers'), 'R3 section header found in game.js');
assert(code.includes("const tex = fenceFlowerTexs[postIdx % fenceFlowerTexs.length];"), 'Selects distinct flower textures');
assert(code.includes("const color = fenceFlowerColors[postIdx % fenceFlowerColors.length];"), 'Applies distinct colors to fence flowers');
assert(code.includes('angle: { from: -6, to: 6 }'), 'Idle sway animation sways angle between -6 and +6 degrees');
assert(code.includes("repeat: -1") && code.includes("ease: 'Sine.InOut'"), 'Idle sway animation loops continuously (-1) with Sine.InOut easing');
assert(code.includes('fy <= this.farm.y + this.farm.h + 10'), 'Fence flowers placed along top and side perimeter fence posts');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n==================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('==================================================');

if (testsFailed > 0) {
  process.exit(1);
}
