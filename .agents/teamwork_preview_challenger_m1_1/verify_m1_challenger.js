const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');

console.log('===============================================================');
console.log('   CHALLENGER 1: MILESTONE 1 EMPIRICAL VERIFICATION & STRESS TEST');
console.log('===============================================================');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    if (details) console.error(`         Details: ${details}`);
    findings.push({ testNum: totalTests, message, details });
  }
}

// -----------------------------------------------------------------------------
// STEP 1: Syntax & File Synchronization Checks
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 1: Node Syntax & File Synchronization ---');

let syntaxGameJs = false;
try {
  execSync('node -c game.js', { stdio: 'pipe' });
  syntaxGameJs = true;
} catch (e) {
  syntaxGameJs = false;
}
assert(syntaxGameJs, 'node -c game.js syntax check');

let syntaxAssetsGameJs = false;
try {
  execSync('node -c assets/game.js', { stdio: 'pipe' });
  syntaxAssetsGameJs = true;
} catch (e) {
  syntaxAssetsGameJs = false;
}
assert(syntaxAssetsGameJs, 'node -c assets/game.js syntax check');

const g1 = fs.readFileSync('game.js');
const g2 = fs.readFileSync('assets/game.js');
const hash1 = crypto.createHash('sha256').update(g1).digest('hex');
const hash2 = crypto.createHash('sha256').update(g2).digest('hex');

assert(hash1 === hash2 && g1.equals(g2), 'game.js and assets/game.js SHA256 match', `game.js: ${hash1}, assets: ${hash2}`);

// -----------------------------------------------------------------------------
// STEP 2: VM Sandbox Execution & Environment Setup
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Load game.js in Sandboxed Environment ---');

const dummyElem = {
  addEventListener: () => {},
  removeEventListener: () => {},
  setAttribute: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {} },
  textContent: '',
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  replaceChildren: () => {},
  querySelector: () => dummyElem,
  querySelectorAll: () => []
};

let toastsLogged = [];
let audioSfxLogged = [];

class MockContainer {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.scale = 1;
    this.depth = 0;
    this.active = true;
    this.children = [];
  }
  setDepth(d) { this.depth = d; return this; }
  setScale(s) { this.scale = s; return this; }
  add(arr) { if (Array.isArray(arr)) this.children.push(...arr); else this.children.push(arr); return this; }
  destroy() { this.active = false; }
}

class MockGraphics {
  constructor() { this.alpha = 1; }
  fillStyle() { return this; }
  fillCircle() { return this; }
  setAlpha(a) { this.alpha = a; return this; }
}

class MockText {
  constructor(x, y, text) { this.x = x; this.y = y; this.text = text; }
  setOrigin() { return this; }
}

class MockEllipse {
  constructor() {}
}

const phaserMock = {
  Game: class {},
  Scene: class {},
  Scale: { RESIZE: 1, FIT: 2, ENVELOP: 3, CENTER_BOTH: 1 },
  AUTO: 1, WEBGL: 1, CANVAS: 1,
  Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } }
};

const context = {
  document: {
    getElementById: () => dummyElem,
    createElement: () => ({ getContext: () => ({}) }),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: dummyElem
  },
  window: { addEventListener: () => {}, removeEventListener: () => {}, document: null },
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  Array: Array,
  Object: Object,
  Set: Set,
  Map: Map,
  JSON: JSON,
  Phaser: phaserMock,
  showToast: (msg) => { toastsLogged.push(msg); },
  playChiptuneSFX: (sfx) => { audioSfxLogged.push(sfx); }
};
context.window.document = context.document;

const ctx = vm.createContext(context);
const gameCode = g1.toString('utf8') + '\nwindow.FarmScene = FarmScene;';

try {
  vm.runInContext(gameCode, ctx);
  assert(true, 'game.js loaded without runtime errors in VM');
} catch (e) {
  assert(false, 'game.js load error', e.message);
}

const mockScene = {
  plots: [],
  appleRipeAt: 0,
  appleRipe: true,
  droppedItems: [],
  player: { x: 100, y: 100, displayHeight: 0, originY: 0 },
  time: { now: 1000 },
  add: {
    container: (x, y) => new MockContainer(x, y),
    ellipse: () => new MockEllipse(),
    graphics: () => new MockGraphics(),
    text: (x, y, txt) => new MockText(x, y, txt)
  },
  tweens: { add: () => {} },
  _sparkle: () => {},
  _label: () => {},
  clearAllDroppedItems() {
    ctx.window.FarmScene.prototype.clearAllDroppedItems.call(this);
  },
  spawnDroppedItem(itemId, x, y, playPopAnim = true) {
    return ctx.window.FarmScene.prototype.spawnDroppedItem.call(this, itemId, x, y, playPopAnim);
  },
  updateDroppedItems(dt) {
    return ctx.window.FarmScene.prototype.updateDroppedItems.call(this, dt);
  }
};

ctx.mockScene = mockScene;
vm.runInContext("sceneRef = mockScene;", ctx);

// -----------------------------------------------------------------------------
// STEP 3: Inventory Capacity Limits & Stacking Verification
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Inventory Capacity Limits & Stacking ---');

// Default state verification
assert(ctx.inventoryState.maxSlots === 20, 'Default maxSlots is 20');
assert(ctx.getUsedInventorySlots() === 7, 'Default initial used slots is 7 (배추, 무, 파, 고추, 마늘, 쌀, 콩)');

// Test 1: Stacking on existing item
const initialCabbage = ctx.inventoryState.ingredients['배추'];
const stackResult = ctx.addItemToInventory('배추', 5);
assert(stackResult === true, 'addItemToInventory returns true when stacking existing item');
assert(ctx.inventoryState.ingredients['배추'] === initialCabbage + 5, `Cabbage quantity increased by 5 (now ${ctx.inventoryState.ingredients['배추']})`);
assert(ctx.getUsedInventorySlots() === 7, 'Used slots remains 7 after stacking existing item');

// Test 2: Filling inventory to capacity (20 slots)
const testItems = ['당근', '사과', '연어', '고등어', '오징어', '잉어', '새우', '문어', '조개', '황금물고기', 'item_11', 'item_12', 'item_13'];
testItems.forEach((itm, idx) => {
  const added = ctx.addItemToInventory(itm, 1);
  assert(added === true, `Added new unique item #${idx + 8} (${itm})`);
});
assert(ctx.getUsedInventorySlots() === 20, `Inventory is now full at ${ctx.getUsedInventorySlots()}/20 slots`);

// Test 3: Adding 21st unique item to FULL inventory (20 slots)
const overflowResult = ctx.addItemToInventory('overflow_item', 1);
assert(overflowResult === false, 'addItemToInventory returns false when adding new item to full inventory');
assert(ctx.getUsedInventorySlots() === 20, 'Used slots remains 20 after rejected addition');
assert(typeof ctx.inventoryState.ingredients['overflow_item'] === 'undefined', 'overflow_item was not added to inventory');

// Test 4: Partial stack / Stacking existing item when inventory is FULL (20/20 slots)
const fullStackResult = ctx.addItemToInventory('배추', 10);
assert(fullStackResult === true, 'addItemToInventory returns true when stacking existing item even when inventory is 20/20 full');
assert(ctx.inventoryState.ingredients['배추'] === initialCabbage + 5 + 10, 'Cabbage count incremented correctly in full inventory');

// Test 5: Max stack limits check (e.g. 9999 items)
const maxStackResult = ctx.addItemToInventory('배추', 9999);
assert(maxStackResult === true, 'Adding 9999 items to single stack succeeds');
assert(ctx.inventoryState.ingredients['배추'] === initialCabbage + 15 + 9999, `Stack size reached ${ctx.inventoryState.ingredients['배추']} without crashing`);

// Test 6: Removing items and slot freeing
const removeResult = ctx.removeItemFromInventory('당근', 1);
assert(removeResult === true, 'removeItemFromInventory returns true for existing item');
assert(ctx.getUsedInventorySlots() === 19, 'Used slots decreased from 20 to 19 after removing last 당근');
assert(typeof ctx.inventoryState.ingredients['당근'] === 'undefined', 'Key 당근 deleted when quantity reached 0');

// -----------------------------------------------------------------------------
// STEP 4: Inventory Capacity Expansion with Gold (Coins)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: Inventory Expansion with Gold ---');

ctx.playerCurrencies.coins = 40;
ctx.syncGoldAlias();
assert(ctx.gold === 40, 'Gold alias in sync with playerCurrencies.coins (40)');

// Test 1: Expansion with insufficient gold (< 50 coins)
const failExpand = ctx.expandInventoryCapacity();
assert(failExpand === false, 'expandInventoryCapacity returns false when coins < 50');
assert(ctx.inventoryState.maxSlots === 20, 'maxSlots remains 20 after failed expansion');
assert(ctx.playerCurrencies.coins === 40, 'Coins unchanged after failed expansion');

// Test 2: Expansion with sufficient gold (>= 50 coins)
ctx.playerCurrencies.coins = 120;
ctx.syncGoldAlias();
const passExpand = ctx.expandInventoryCapacity();
assert(passExpand === true, 'expandInventoryCapacity returns true when coins >= 50');
assert(ctx.inventoryState.maxSlots === 25, 'maxSlots increased from 20 to 25 (+5 slots)');
assert(ctx.playerCurrencies.coins === 70, 'Coins reduced by 50 (120 -> 70)');

// Test 3: Adding 20th and 21st unique items after capacity expanded to 25
const reAddCarrot = ctx.addItemToInventory('당근', 1);
assert(reAddCarrot === true, 'Successfully added 당근 back (slot 20/25)');
const add21st = ctx.addItemToInventory('overflow_item', 1);
assert(add21st === true, 'Successfully added 21st unique item (overflow_item) after capacity expanded to 25!');
assert(ctx.getUsedInventorySlots() === 21, `Used inventory slots is now ${ctx.getUsedInventorySlots()}/25`);

// -----------------------------------------------------------------------------
// STEP 5: Save/Load Serialization & Deserialization Test
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: Save/Load Serialization & Deserialization ---');

// Setup complex state with dropped items
mockScene.clearAllDroppedItems();
mockScene.spawnDroppedItem('배추', 150, 250);
mockScene.spawnDroppedItem('사과', 300, 400);

assert(mockScene.droppedItems.length === 2, 'Two ground items spawned prior to serialization');

// Serialize state
const saveSnapshot = ctx.collectSave();

assert(saveSnapshot.v === 4, 'Snapshot version is 4');
assert(saveSnapshot.inventory.maxSlots === 25, 'Snapshot contains expanded maxSlots (25)');
assert(saveSnapshot.inventory.ingredients['overflow_item'] === 1, 'Snapshot contains overflow_item');
assert(Array.isArray(saveSnapshot.droppedItems), 'Snapshot contains droppedItems array');
assert(saveSnapshot.droppedItems.length === 2, 'Snapshot droppedItems length is 2');
assert(saveSnapshot.droppedItems[0].itemId === '배추' && saveSnapshot.droppedItems[0].x === 150 && saveSnapshot.droppedItems[0].y === 250, 'Ground drop 1 correctly serialized');
assert(saveSnapshot.droppedItems[1].itemId === '사과' && saveSnapshot.droppedItems[1].x === 300 && saveSnapshot.droppedItems[1].y === 400, 'Ground drop 2 correctly serialized');

// Test Save Migration with legacy schema (v2 save without maxSlots and droppedItems)
console.log('\n--- Testing Save Schema Migration (v2 -> v4) ---');
const legacySave = {
  v: 2,
  gold: 150,
  inventory: { ingredients: { "배추": 5 } }
};
const migrated = ctx.migrateSaveData(legacySave);
assert(migrated.v === 4, 'Migrated schema version upgraded to 4');
assert(migrated.inventory.maxSlots === 20, 'Migrated inventory assigned default maxSlots of 20');
assert(migrated.currencies.coins === 150, 'Migrated legacy gold to playerCurrencies.coins');
assert(Array.isArray(migrated.droppedItems) && migrated.droppedItems.length === 0, 'Migrated droppedItems initialized as empty array');

// Test Roundtrip Deserialization via applySave
console.log('\n--- Testing Roundtrip Deserialization (applySave) ---');

// Mutate in-memory state before applying snapshot
ctx.inventoryState = null;
ctx.playerCurrencies = { coins: 0, gems: 0, honor: 0 };
mockScene.clearAllDroppedItems();

assert(ctx.inventoryState === null, 'In-memory inventory state cleared');
assert(mockScene.droppedItems.length === 0, 'In-memory ground items cleared');

const applyResult = ctx.applySave(saveSnapshot);
assert(applyResult === true, 'applySave returned true');
assert(ctx.inventoryState !== null, 'In-memory inventoryState restored');
assert(ctx.inventoryState.maxSlots === 25, 'Restored maxSlots is 25');
assert(ctx.inventoryState.ingredients['overflow_item'] === 1, 'Restored ingredients match snapshot');
assert(ctx.playerCurrencies.coins === 70, 'Restored currencies match snapshot');
assert(mockScene.droppedItems.length === 2, 'Restored droppedItems count is 2 on map');
assert(mockScene.droppedItems[0].itemId === '배추' && mockScene.droppedItems[0].curX === 150 && mockScene.droppedItems[0].curY === 250, 'Restored ground drop 1 location and item ID match exactly');

// -----------------------------------------------------------------------------
// STEP 6: Harvest-to-Ground Drop Pipeline & Magnet Pickup Stress Testing
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 6: Ground Drop Pipeline & Pickup Edge Cases ---');

mockScene.clearAllDroppedItems();

// Test Pickup when player is nearby (dist <= 32)
const drop1 = mockScene.spawnDroppedItem('배추', 100, 100);
mockScene.player = { x: 100, y: 100, displayHeight: 0, originY: 0 }; // distance = 0
mockScene.time = { now: 2000 };

assert(mockScene.droppedItems.length === 1, '1 ground item ready for pickup');

// Update dropped items simulation
mockScene.updateDroppedItems(16);

assert(mockScene.droppedItems.length === 0, 'Ground item picked up and removed from droppedItems array');
assert(ctx.inventoryState.ingredients['배추'] > 0, 'Picked up cabbage added to inventoryState');

// Test Pickup Failure when Inventory is 25/25 FULL and item is NEW (unstacked)
console.log('\n--- Ground Pickup with FULL Inventory ---');

// Fill all 25 slots with unique item keys
mockScene.clearAllDroppedItems();
ctx.inventoryState.ingredients = {};
for (let i = 1; i <= 25; i++) {
  ctx.inventoryState.ingredients[`full_slot_item_${i}`] = 1;
}
assert(ctx.getUsedInventorySlots() === 25, `Inventory is completely full at ${ctx.getUsedInventorySlots()}/25 slots`);

// Drop a NEW item that player doesn't own
const unownedDrop = mockScene.spawnDroppedItem('황금물고기', 100, 100);
mockScene.time = { now: 5000 };

mockScene.updateDroppedItems(16);

assert(mockScene.droppedItems.length === 1, 'Ground item NOT removed because inventory was full');
assert(unownedDrop.pickupCooldown > 5000, `Pickup cooldown activated until timestamp ${unownedDrop.pickupCooldown}`);
assert(typeof ctx.inventoryState.ingredients['황금물고기'] === 'undefined', 'Unowned item was NOT added to full inventory');

// Test Pickup Success for Ground Item that CAN stack with existing slot in full inventory
console.log('\n--- Ground Pickup for Stackable Item in FULL Inventory ---');

// Drop an item player ALREADY has in slot 1 ('full_slot_item_1')
const stackableDrop = mockScene.spawnDroppedItem('full_slot_item_1', 100, 100);
mockScene.time = { now: 10000 };

mockScene.updateDroppedItems(16);

assert(mockScene.droppedItems.length === 1, 'Ground item processed (unowned item still on ground, stackable item picked up)');
assert(ctx.inventoryState.ingredients['full_slot_item_1'] === 2, 'Stackable item successfully picked up and stacked (qty 1 -> 2) despite 25/25 full slots!');

// -----------------------------------------------------------------------------
// SUMMARY & FINDINGS REPORT
// -----------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`TOTAL TESTS EXECUTED: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('===============================================================');

if (failedTests > 0) {
  console.error('\nSUMMARY OF FAILURE FINDINGS:');
  findings.forEach(f => {
    console.error(`- Test #${f.testNum}: ${f.message}`);
    if (f.details) console.error(`  Details: ${f.details}`);
  });
} else {
  console.log('\nALL EMPIRICAL TESTS PASSED PERFECTLY!');
}
