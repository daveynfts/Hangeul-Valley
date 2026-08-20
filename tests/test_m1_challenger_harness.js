// test_m1_challenger_harness.js
const fs = require('fs');
const path = require('path');

const { GAME_SCRIPTS, allGameScriptsExist, readGameSource } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');

console.log('====================================================');
console.log('STARTING MILESTONE 1 EMPIRICAL VERIFICATION HARNESS');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// 1. SHIPPED FILES
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Shipped files exist ---');

const indexHtmlPath = path.join(ROOT, 'index.html');
assert(allGameScriptsExist(), 'js/manifest.json scripts exist and are non-empty');
assert(GAME_SCRIPTS[GAME_SCRIPTS.length - 1] === 'js/boot.js', 'boot.js is last in the manifest');
assert(fs.existsSync(indexHtmlPath) && fs.statSync(indexHtmlPath).size > 0, 'index.html exists and is non-empty');


// -----------------------------------------------------------------------------
// 2. DOM & EVENT ENVIRONMENT SETUP FOR GAME.JS TESTING
// -----------------------------------------------------------------------------
console.log('\n--- SETTING UP SIMULATED DOM FOR GAME.JS ---');

const windowEventListeners = {};
const elementsMap = {};

function createMockElement(id, tagName = 'DIV') {
  const el = {
    id: id,
    tagName: tagName.toUpperCase(),
    classList: {
      classes: new Set(['hidden']),
      add(cls) { this.classes.add(cls); },
      remove(cls) { this.classes.delete(cls); },
      contains(cls) { return this.classes.has(cls); }
    },
    style: {},
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    innerHTML: '',
    textContent: '',
    isContentEditable: false,
    addEventListener(event, fn) {
      // Element-specific event listeners (do not bleed into window)
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(fn);
    }
  };
  elementsMap[id] = el;
  return el;
}

// Pre-create required elements
['inventory-overlay', 'inventory-grid', 'inv-capacity-badge', 'inv-capacity-text',
 'shop-overlay', 'cat-dialog', 'quizBackdrop', 'answerInput', 'fish-album-overlay',
 'recipe-overlay', 'leaderboard-overlay', 'memory-overlay',
 'duel-overlay', 'trophy-overlay', 'level-select-overlay'].forEach(id => createMockElement(id));

const mockActiveElement = {
  element: null
};

global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener(event, fn) {
    if (!windowEventListeners[event]) windowEventListeners[event] = [];
    windowEventListeners[event].push(fn);
  },
  removeEventListener() {},
  closeInventoryUI: null,
  openInventoryUI: null
};

global.document = {
  body: createMockElement('body'),
  activeElement: null,
  getElementById(id) {
    if (!elementsMap[id]) {
      return createMockElement(id);
    }
    return elementsMap[id];
  },
  createElement(tag) {
    return createMockElement('temp_' + Date.now(), tag);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};

global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; },
  clear() { this.data = {}; }
};

global.playChiptuneSFX = () => {};
global.showToast = () => {};
global.spendCoins = (amount) => true;

global.Phaser = {
  AUTO: 0,
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  Game: class { constructor() {} },
  Scene: class { constructor() {} },
  Math: {
    Distance: {
      Between(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
      }
    }
  }
};

// Load game.js into global context
const gameJsCode = readGameSource();

// Prepare game.js code to expose variables onto global scope
let preparedCode = gameJsCode
  .replace(/let activeModalStack = \[\];/g, 'global.activeModalStack = []; var activeModalStack = global.activeModalStack;')
  .replace('let playerLocked=false,', 'var playerLocked=false; global.getPlayerLocked = () => playerLocked; global.setPlayerLocked = (v) => playerLocked = v;');

// Evaluate in global context
try {
  const script = new (require('vm').Script)(preparedCode);
  script.runInThisContext();
  console.log('✅ game scripts evaluated successfully in mock environment');
  
  if (typeof closeShop === 'function') global.window.closeShop = closeShop;
  if (typeof openShop === 'function') global.window.openShop = openShop;
  if (typeof openInventoryUI === 'function') global.window.openInventoryUI = openInventoryUI;
  if (typeof closeInventoryUI === 'function') global.window.closeInventoryUI = closeInventoryUI;
} catch (e) {
  console.error('❌ Error evaluating game scripts:', e);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 3. UI EVENT HANDLERS, HOTKEYS & MODAL STACK TESTS
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: UI Event Handlers, Input Focus Guards & Modal Stack ---');

// Helper to simulate keydown
function dispatchKeyDown(key, activeElementObj = null) {
  global.document.activeElement = activeElementObj;
  const event = { key: key, preventDefault() {}, stopPropagation() {} };
  if (windowEventListeners['keydown']) {
    windowEventListeners['keydown'].forEach(fn => fn(event));
  }
}

// Test 3.1: Hotkey toggling when no modal open
assert(typeof activeModalStack !== 'undefined', 'activeModalStack exists');
activeModalStack.length = 0; // reset
setPlayerLocked(false);

dispatchKeyDown('i');
assert(activeModalStack.includes('inventory-overlay'), "'i' opens inventory when stack empty");
assert(getPlayerLocked() === true, 'playerLocked is true when inventory is open');

dispatchKeyDown('i');
assert(!activeModalStack.includes('inventory-overlay'), "'i' closes inventory when inventory is top modal");
assert(getPlayerLocked() === false, 'playerLocked is false when inventory is closed');

dispatchKeyDown('I');
assert(activeModalStack.includes('inventory-overlay'), "'I' opens inventory");

dispatchKeyDown('I');
assert(!activeModalStack.includes('inventory-overlay'), "'I' closes inventory");

dispatchKeyDown('e');
assert(activeModalStack.includes('inventory-overlay'), "'e' opens inventory");

dispatchKeyDown('E');
assert(!activeModalStack.includes('inventory-overlay'), "'E' closes inventory via uppercase 'E'");

// Test 3.2: Input Focus Guards
const mockInput = { tagName: 'INPUT', isContentEditable: false };
const mockTextarea = { tagName: 'TEXTAREA', isContentEditable: false };
const mockEditable = { tagName: 'DIV', isContentEditable: true };

activeModalStack.length = 0;
dispatchKeyDown('i', mockInput);
assert(activeModalStack.length === 0, "'i' ignored when INPUT focused");

dispatchKeyDown('e', mockTextarea);
assert(activeModalStack.length === 0, "'e' ignored when TEXTAREA focused");

dispatchKeyDown('I', mockEditable);
assert(activeModalStack.length === 0, "'I' ignored when contentEditable focused");

// Test 3.3: Escape key modal stack behavior
activeModalStack.length = 0;
setPlayerLocked(false);

setModalState('shop-overlay', true);
console.log('After opening shop: playerLocked =', getPlayerLocked(), 'stack =', activeModalStack);
assert(activeModalStack.length === 1 && activeModalStack[0] === 'shop-overlay', "Shop overlay pushed to stack");
assert(getPlayerLocked() === true, "playerLocked true when shop open");

setModalState('inventory-overlay', true);
console.log('After opening inventory: playerLocked =', getPlayerLocked(), 'stack =', activeModalStack);
assert(activeModalStack.length === 2 && activeModalStack[1] === 'inventory-overlay', "Inventory pushed on top of Shop");

// Test hotkey 'i' when inventory is on top of shop
dispatchKeyDown('i');
console.log('After pressing i: playerLocked =', getPlayerLocked(), 'stack =', activeModalStack);
assert(!activeModalStack.includes('inventory-overlay') && activeModalStack.length === 1 && activeModalStack[0] === 'shop-overlay',
  "'i' closes inventory without closing shop underneath");

// Re-open inventory on top of shop
setModalState('inventory-overlay', true);
console.log('After re-opening inventory: playerLocked =', getPlayerLocked(), 'stack =', activeModalStack);
assert(activeModalStack.length === 2, "Re-opened inventory on top of shop");

// Press Escape -> should close top modal (inventory)
dispatchKeyDown('Escape');
console.log('After Escape 1: playerLocked =', getPlayerLocked(), 'stack =', activeModalStack);
assert(!activeModalStack.includes('inventory-overlay') && activeModalStack.length === 1 && activeModalStack[0] === 'shop-overlay',
  "Escape closes top modal (inventory), shop remains");
assert(getPlayerLocked() === true, "playerLocked remains true while shop is open");

// Press Escape again -> should close shop
dispatchKeyDown('Escape');
assert(activeModalStack.length === 0, "Escape closes shop modal, stack now empty");
assert(getPlayerLocked() === false, "playerLocked turns false when stack empty");

// Test 3.4: Modal Stack Duplicate Prevention & Mid-stack removal
setModalState('shop-overlay', true);
setModalState('shop-overlay', true); // duplicate call
assert(activeModalStack.filter(id => id === 'shop-overlay').length === 1, "Duplicate modal push prevented");

setModalState('inventory-overlay', true);
setModalState('fish-album-overlay', true);
assert(activeModalStack.length === 3, "Stack has 3 modals: shop, inventory, fish-album");

// Close middle modal (inventory) directly
setModalState('inventory-overlay', false);
assert(activeModalStack.length === 2 && activeModalStack[0] === 'shop-overlay' && activeModalStack[1] === 'fish-album-overlay',
  "Middle modal removed correctly from stack");

// Reset stack
activeModalStack.length = 0;
setPlayerLocked(false);


// -----------------------------------------------------------------------------
// 4. STORAGE / INVENTORY SYSTEM TESTING
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Storage & Inventory System ---');

inventoryState = {
  maxSlots: 20,
  ingredients: {},
  seeds: {},
  cookedDishes: {}
};

assert(getUsedInventorySlots() === 0, "Empty inventory uses 0 slots");

addItemToInventory('배추', 5);
assert(inventoryState.ingredients['배추'] === 5, "Added 5 Napa Cabbage");
assert(getUsedInventorySlots() === 1, "Used slots is 1");

// Fill up to max slots with distinct items
const testItems = ['무', '파', '고추', '마늘', '쌀', '콩', '당근', '사과', '연어', '고등어',
                   '오징어', '잉어', '새우', '문어', '조개', '황금물고기', 'kimchi', 'bibimbap', 'bulgogi'];

testItems.forEach(item => addItemToInventory(item, 1));
assert(getUsedInventorySlots() === 20, "Inventory now full (20 / 20 slots)");

// Try to add a NEW item to full inventory -> should fail
const addedNew = addItemToInventory('tteokbokki', 1);
assert(addedNew === false, "Adding NEW item to full inventory returns false");
assert(inventoryState.ingredients['tteokbokki'] === undefined, "New item was NOT added to inventory");

// Try to add MORE of an EXISTING item ('배추') to full inventory -> should succeed (stacking!)
const addedExisting = addItemToInventory('배추', 3);
assert(addedExisting === true, "Adding EXISTING item to full inventory succeeds via stacking");
assert(inventoryState.ingredients['배추'] === 8, "Napa Cabbage quantity increased to 8");

// Remove items
const removed = removeItemFromInventory('배추', 8);
assert(removed === true, "Removed 8 Napa Cabbage");
assert(inventoryState.ingredients['배추'] === undefined, "Napa Cabbage entry deleted when qty reaches 0");
assert(getUsedInventorySlots() === 19, "Used slots decreased to 19");

// Expand Capacity
const startMax = inventoryState.maxSlots;
expandInventoryCapacity();
assert(inventoryState.maxSlots === startMax + 5, "Inventory capacity expanded by +5 slots");


// -----------------------------------------------------------------------------
// 5. HARVEST-TO-GROUND DROP PIPELINE TESTING
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Harvest-to-Ground Drop Pipeline ---');

const mockScene = {
  droppedItems: [],
  player: { x: 100, y: 100, displayHeight: 32, originY: 0.5 },
  time: { now: 1000 },
  tweens: { add() {} },
  add: {
    container(x, y) {
      const c = {
        x: x, y: y, active: true, scale: 1, depth: 0,
        add() { return c; },
        setDepth(d) { this.depth = d; return c; },
        setScale(s) { this.scale = s; return c; },
        destroy() { this.active = false; }
      };
      return c;
    },
    ellipse() { return {}; },
    graphics() { return { fillStyle() {}, fillCircle() {}, setAlpha() {} }; },
    text() { return { setOrigin() {} }; }
  },
  _sparkle() {},
  _label() {}
};

// Bind FarmScene prototype functions
mockScene.spawnDroppedItem = FarmScene.prototype.spawnDroppedItem.bind(mockScene);
mockScene.updateDroppedItems = FarmScene.prototype.updateDroppedItems.bind(mockScene);
mockScene.clearAllDroppedItems = FarmScene.prototype.clearAllDroppedItems.bind(mockScene);

// Test 5.1: Spawning dropped item
const drop1 = mockScene.spawnDroppedItem('배추', 200, 200);
assert(mockScene.droppedItems.length === 1, "Ground item spawned successfully");
assert(drop1.nameKo === '배추', "Ground item nameKo is 배추");
assert(drop1.curX === 200 && drop1.curY === 200, "Ground item position is (200, 200)");

// Test 5.2: Magnet Zone behavior
// Player is at (100, 116 base Y). Drop is at (150, 116). Distance = 50px (inside Magnet Zone 32px-65px).
mockScene.player.x = 100;
mockScene.player.y = 100; // base Y = 100 + 32*0.5 = 116
drop1.curX = 150;
drop1.curY = 116;

const startX = drop1.curX;
mockScene.updateDroppedItems(16);
assert(drop1.curX < startX, "Magnet zone pulls item toward player");

// Test 5.3: Pickup Zone behavior with available slot
// Move drop inside pickup zone (distance <= 32px)
drop1.curX = 110;
drop1.curY = 116; // dist = 10px
inventoryState.ingredients = {}; // clear inventory

mockScene.updateDroppedItems(16);
assert(mockScene.droppedItems.length === 0, "Item picked up and removed from ground when inside pickup zone");
assert(inventoryState.ingredients['배추'] === 1, "Picked up item added to player inventory");

// Test 5.4: Pickup Zone behavior with FULL INVENTORY and NEW ITEM
// Fill inventory to max (25 slots now after expansion)
inventoryState.ingredients = {};
for (let i = 0; i < 25; i++) {
  inventoryState.ingredients['test_item_' + i] = 1;
}
assert(getUsedInventorySlots() === 25, "Inventory full with 25 items");

// Spawn a new item on ground near player that is NOT owned in inventory
const dropFull = mockScene.spawnDroppedItem('새우', 105, 116);
assert(mockScene.droppedItems.length === 1, "Spawned new item near player");

const nowBefore = Date.now();
mockScene.updateDroppedItems(16);

assert(mockScene.droppedItems.length === 1, "Item NOT picked up because inventory is full");
assert(dropFull.pickupCooldown >= nowBefore + 2900, "Pickup cooldown set (3s) to prevent spamming toasts");

// Test 5.5: Pickup Zone behavior with FULL INVENTORY and EXISTING ITEM (Stacking)
// Spawn an item that IS already in inventory ('test_item_0')
const dropStack = mockScene.spawnDroppedItem('test_item_0', 105, 116);
mockScene.updateDroppedItems(16);

assert(inventoryState.ingredients['test_item_0'] === 2, "Full inventory picks up stackable ground item!");

console.log('\n====================================================');
console.log(`VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
