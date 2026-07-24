const fs = require('fs');
const path = require('path');

console.log("=========================================================");
console.log("       INDEPENDENT VICTORY AUDIT TEST RUNNER             ");
console.log("       Hangeul Valley - Storage & Cooking Systems       ");
console.log("=========================================================\n");

// Set up minimal browser environment mock for game.js in Node.js
global.window = global;
global.__eventListeners = {};
global.addEventListener = (event, handler) => {
  global.__eventListeners[event] = global.__eventListeners[event] || [];
  global.__eventListeners[event].push(handler);
};
global.fireKeyEvent = (evt) => {
  const handlers = global.__eventListeners['keydown'] || [];
  handlers.forEach(fn => fn(evt));
};

const mockElements = {};
const createMockElement = (id) => {
  const classListSet = new Set();
  return {
    id: id,
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      _set: classListSet,
      toggle: (cls, force) => {
        if (typeof force === 'boolean') {
          if (force) classListSet.add(cls); else classListSet.delete(cls);
        } else {
          if (classListSet.has(cls)) classListSet.delete(cls); else classListSet.add(cls);
        }
      },
      add: (...cls) => cls.forEach(c => classListSet.add(c)),
      remove: (...cls) => cls.forEach(c => classListSet.delete(c)),
      contains: (cls) => classListSet.has(cls)
    },
    appendChild: () => {},
    addEventListener: () => {}
  };
};

global.document = {
  activeElement: null,
  getElementById: (id) => {
    if (!mockElements[id]) {
      mockElements[id] = createMockElement(id);
    }
    return mockElements[id];
  },
  createElement: (tag) => createMockElement(tag),
  addEventListener: (event, handler) => {
    global.addEventListener(event, handler);
  }
};

global.localStorage = {
  _data: {},
  getItem: function(k) { return this._data[k] || null; },
  setItem: function(k, v) { this._data[k] = String(v); },
  removeItem: function(k) { delete this._data[k]; }
};

global.Phaser = {
  Scene: class Scene {},
  Game: class Game {},
  Scale: {
    ScaleModes: { RESIZE: 'RESIZE', FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
    RESIZE: 'RESIZE',
    FIT: 'FIT',
    CENTER_BOTH: 'CENTER_BOTH'
  },
  AUTO: 'AUTO',
  Math: {
    Distance: {
      Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
    }
  }
};

// Global variables expected by game.js
global.playerCurrencies = { coins: 100, gems: 0, honor: 0 };
global.gold = 100;
global.unlockedLevels = [0];
global.unlockedTrophies = [];
global.harvestCounts = new Map();
global.srsData = {};
global.plotSave = [];
global.currentLevelIndex = 0;
global.appleTreeSave = { ripeAt: 0, ripe: false };
global.fishAlbumSave = [];
global.questState = {};
global.sceneRef = null;
global.droppedItemsSave = [];

// Mock audio & visual helpers
global.playChiptuneSFX = () => {};

let testsPassed = 0;
let testsFailed = 0;
const results = [];

function assert(condition, description) {
  if (condition) {
    testsPassed++;
    results.push(`  [PASS] ${description}`);
    console.log(`\x1b[32m  [PASS]\x1b[0m ${description}`);
  } else {
    testsFailed++;
    results.push(`  [FAIL] ${description}`);
    console.error(`\x1b[31m  [FAIL]\x1b[0m ${description}`);
  }
}

// Read and evaluate game.js in global context
const rawCode = fs.readFileSync(path.join(__dirname, '..', '..', 'game.js'), 'utf8');
const codeToEval = rawCode + '\nglobal.FarmScene = FarmScene;\nglobal.getActiveModalStack = () => activeModalStack;\nglobal.clearActiveModalStack = () => { activeModalStack.length = 0; };\n';
try {
  eval(codeToEval);
  console.log(">>> game.js successfully loaded and evaluated in Node context.\n");
} catch (err) {
  console.error("FATAL: Failed to evaluate game.js:", err);
  process.exit(1);
}

// Intercept showToast to capture messages during tests
const nativeShowToast = global.showToast;
global.showToast = (msg, dur) => {
  global.__lastToast = msg;
  if (typeof nativeShowToast === 'function') {
    try { nativeShowToast(msg, dur); } catch (e) {}
  }
};

// -----------------------------------------------------------------------------
// SECTION 1: SYNTAX AND SHA256 SYNCHRONIZATION
// -----------------------------------------------------------------------------
console.log("--- TEST SECTION 1: File Synchronization & Syntax Verification ---");

const crypto = require('crypto');
function sha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const gameJsHash = sha256(path.join(__dirname, '..', '..', 'game.js'));
const assetsGameJsHash = sha256(path.join(__dirname, '..', '..', 'assets', 'game.js'));
assert(gameJsHash === assetsGameJsHash, `SHA256 Match: game.js <-> assets/game.js (${gameJsHash})`);

const indexHtmlHash = sha256(path.join(__dirname, '..', '..', 'index.html'));
const assetsIndexHtmlHash = sha256(path.join(__dirname, '..', '..', 'assets', 'index.html'));
assert(indexHtmlHash === assetsIndexHtmlHash, `SHA256 Match: index.html <-> assets/index.html (${indexHtmlHash})`);

// -----------------------------------------------------------------------------
// SECTION 2: R1 STORAGE / INVENTORY SYSTEM
// -----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 2: R1 Storage / Inventory System ---");

// Reset inventory state
inventoryState = {
  maxSlots: 20,
  ingredients: {},
  seeds: {},
  scrolls: 0,
  cookedDishes: {}
};

assert(getUsedInventorySlots() === 0, "Initial empty inventory returns 0 used slots");
assert(inventoryState.maxSlots === 20, "Default inventory maxSlots is 20");

// Test item addition ('cabbage' resolves to Korean key '배추')
const cabbageKey = getItemInfo('cabbage').key;
assert(addItemToInventory('cabbage', 2) === true, "Add 2 cabbages to empty inventory succeeds");
assert(inventoryState.ingredients[cabbageKey] === 2, "Cabbage ('배추') count is 2");
assert(getUsedInventorySlots() === 1, "Used slots is 1");

// Test item stacking
assert(addItemToInventory('cabbage', 3) === true, "Stacking 3 more cabbages succeeds");
assert(inventoryState.ingredients[cabbageKey] === 5, "Stacked cabbage ('배추') count is 5");
assert(getUsedInventorySlots() === 1, "Used slots remains 1 after stacking");

// Test filling inventory slots to maxSlots
const ingredientsList = ['무', '파', '고추', '마늘', '쌀', '콩', '당근', '사과', '연어', '고등어', '오징어', '잉어', '새우', '문어', '조개', '황금물고기', 'corn', 'strawberry', 'potato'];
// We already have 1 slot (배추). Fill remaining 19 slots:
for (let i = 0; i < 19; i++) {
  addItemToInventory(ingredientsList[i], 1);
}
assert(getUsedInventorySlots() === 20, `Inventory filled to max capacity: 20 slots`);

// Attempt adding a NEW item type when full
assert(addItemToInventory('spinach', 1) === false, "Adding a 21st unique item type when maxSlots=20 fails");

// Stacking existing item when full STILL succeeds
assert(addItemToInventory('cabbage', 2) === true, "Stacking existing item type 'cabbage' when inventory full succeeds");
assert(inventoryState.ingredients[cabbageKey] === 7, "Cabbage ('배추') count updated to 7");

// Test Inventory Expansion
playerCurrencies.coins = 100;
const goldBefore = playerCurrencies.coins;
assert(expandInventoryCapacity() === true, "expandInventoryCapacity() succeeds with 100 gold");
assert(playerCurrencies.coins === goldBefore - 50, "50 Gold deducted for expansion (remaining 50)");
assert(inventoryState.maxSlots === 25, "Inventory maxSlots expanded by +5 to 25");

// Now adding new item 'spinach' succeeds because capacity is 25
assert(addItemToInventory('spinach', 1) === true, "Adding 'spinach' after expansion succeeds");
assert(getUsedInventorySlots() === 21, "Used slots updated to 21");

// Test item removal
assert(removeItemFromInventory('spinach', 1) === true, "Removing 1 spinach succeeds");
assert(getUsedInventorySlots() === 20, "Used slots decreased to 20 after removing spinach");
assert(typeof inventoryState.ingredients['spinach'] === 'undefined', "Spinach deleted from ingredients dictionary when count reached 0");

// -----------------------------------------------------------------------------
// SECTION 3: SAVE / LOAD PERSISTENCE FOR INVENTORY & COOKING
// -----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 3: Save / Load State Persistence ---");

inventoryState.maxSlots = 30;
inventoryState.ingredients = { '배추': 10, '무': 5 };
cookingState = { cookedRecipes: ['kimchi'], totalDishesCooked: 3, recipeStats: { 'kimchi': 3 } };
unlockedTrophies = ['master_chef'];

const saveData = collectSave();
assert(saveData.v === 4, "Save payload schema version is v4");
assert(saveData.inventory.maxSlots === 30, "Save payload includes inventory maxSlots (30)");
assert(saveData.inventory.ingredients['배추'] === 10, "Save payload includes ingredient count");
assert(saveData.cooking.cookedRecipes.includes('kimchi'), "Save payload includes cookedRecipes");
assert(saveData.unlockedTrophies.includes('master_chef'), "Save payload includes unlockedTrophies");

// Reset in-memory state and restore
inventoryState = { maxSlots: 20, ingredients: {} };
cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
unlockedTrophies = [];

const applyOk = applySave(saveData);
assert(applyOk === true, "applySave() returns true");
assert(inventoryState.maxSlots === 30, "Restored inventory maxSlots is 30");
assert(inventoryState.ingredients['배추'] === 10, "Restored ingredient count for 배추 is 10");
assert(cookingState.cookedRecipes.includes('kimchi'), "Restored cookingState.cookedRecipes includes 'kimchi'");
assert(unlockedTrophies.includes('master_chef'), "Restored unlockedTrophies includes 'master_chef'");

// -----------------------------------------------------------------------------
// SECTION 4: R2 HARVEST GROUND DROP PIPELINE
// -----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 4: R2 Harvest Ground Drop Pipeline ---");

// Mock Phaser Scene for testing dropped items pipeline
class MockScene {
  constructor() {
    this.droppedItems = [];
    this.time = { now: 1000 };
    this.player = { x: 100, y: 100, displayHeight: 32, originY: 0.5, setVelocity: () => {}, setFlipX: () => {} };
  }
  add = {
    container: (x, y) => ({
      setDepth: function() { return this; },
      setScale: function() { return this; },
      add: function() {},
      destroy: function() { this.active = false; },
      x: x,
      y: y,
      active: true
    }),
    ellipse: () => ({}),
    graphics: () => ({ setFillStyle: () => {}, fillStyle: () => {}, fillCircle: () => {}, setAlpha: () => {} }),
    text: () => ({ setOrigin: () => {} })
  };
  tweens = {
    add: (cfg) => {
      if (cfg.targets) {
        cfg.targets.y = cfg.y;
        cfg.targets.scale = cfg.scale;
      }
    }
  };
}

// Attach mock scene methods from FarmScene in game.js
const mockScene = new MockScene();
mockScene.spawnDroppedItem = global.FarmScene.prototype.spawnDroppedItem.bind(mockScene);
mockScene.clearAllDroppedItems = global.FarmScene.prototype.clearAllDroppedItems.bind(mockScene);
mockScene.updateDroppedItems = global.FarmScene.prototype.updateDroppedItems.bind(mockScene);

mockScene.clearAllDroppedItems();
assert(mockScene.droppedItems.length === 0, "clearAllDroppedItems() empties droppedItems array");

const drop = mockScene.spawnDroppedItem('cabbage', 200, 200, true);
assert(drop !== null && typeof drop === 'object', "spawnDroppedItem creates drop entity");
assert(drop.itemId === 'cabbage', "Drop entity itemId is 'cabbage'");
assert(drop.nameKo === 'Napa Cabbage' || drop.nameKo === '배추', "Drop entity nameKo is correctly resolved");
assert(mockScene.droppedItems.length === 1, "droppedItems array length is 1");

// Test Magnetic Pull: Player at (100, 100), Drop at (140, 140) (distance ~56px within magnet range 65px)
drop.curX = 140;
drop.curY = 140;
const initialX = drop.curX;
const initialY = drop.curY;
mockScene.updateDroppedItems(16);
assert(drop.curX < initialX && drop.curY < initialY, "Magnet pull moves dropped item closer to player position");

// Test Proximity Pickup: Move player right onto item at (140, 140)
inventoryState.ingredients = {};
inventoryState.maxSlots = 20;
mockScene.player.x = 140;
mockScene.player.y = 124; // base Y will be 124 + 16 = 140
drop.pickupCooldown = 0;
mockScene.updateDroppedItems(16);
assert(mockScene.droppedItems.length === 0, "Dropped item picked up and removed from ground when player steps on it");
assert(inventoryState.ingredients[cabbageKey] === 1, "Picked up item added to inventory");

// Test Full Inventory behavior for ground drop
inventoryState.maxSlots = 1;
inventoryState.ingredients = { '무': 1 }; // Fill 1/1 slot with '무'
const drop2 = mockScene.spawnDroppedItem('chili', 140, 140, false); // New item type 'chili'
drop2.pickupCooldown = 0;
mockScene.updateDroppedItems(16);
assert(mockScene.droppedItems.length === 1, "Dropped item STAYS on ground when inventory is full");
assert(drop2.pickupCooldown > Date.now(), "Pickup cooldown activated after failed pickup attempt");
const toastEl = global.document.getElementById('toast');
assert(toastEl && toastEl.textContent.includes("Inventory Full"), `Toast message displayed for full inventory ("${toastEl?.textContent}")`);

// -----------------------------------------------------------------------------
// SECTION 5: R3 COOKING SYSTEM WITH 10 RECIPES & ACHIEVEMENTS
// -----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 5: R3 Cooking System with 10 Recipes ---");

assert(Array.isArray(COOKING_RECIPES), "COOKING_RECIPES is an array");
assert(COOKING_RECIPES.length === 10, `COOKING_RECIPES contains exactly 10 recipes (found: ${COOKING_RECIPES.length})`);

const expectedRecipeIds = [
  'kimchi', 'radish_rice', 'roasted_corn', 'strawberry_jam', 'gimbap',
  'tteokbokki', 'gamjajeon', 'bibimbap', 'bulgogi', 'samgyetang'
];

let allRecipesValid = true;
COOKING_RECIPES.forEach(r => {
  if (!r.id || !r.nameEn || !r.nameKo || !r.icon || !r.ingredients || !Array.isArray(r.ingredients) || !r.xpReward || !r.goldReward) {
    allRecipesValid = false;
  }
});
assert(allRecipesValid, "All 10 recipes contain valid metadata, icon, ingredients list, xpReward, and goldReward");

// Reset state for cooking test
inventoryState = {
  maxSlots: 20,
  ingredients: { '배추': 2, '고추': 2, '마늘': 2 },
  cookedDishes: {}
};
cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
playerCurrencies.coins = 0;
unlockedTrophies = [];

// Attempt cooking 'kimchi' (requires cabbage x1, chili x1, garlic x1 -> 배추, 고추, 마늘)
const initialCoins = playerCurrencies.coins;
const cookResult = cookRecipe('kimchi');
assert(cookResult === true, "cookRecipe('kimchi') succeeds with required ingredients");
assert(inventoryState.ingredients['배추'] === 1, "1 Cabbage ('배추') deducted (remaining 1)");
assert(inventoryState.ingredients['고추'] === 1, "1 Chili ('고추') deducted (remaining 1)");
assert(inventoryState.ingredients['마늘'] === 1, "1 Garlic ('마늘') deducted (remaining 1)");
assert(playerCurrencies.coins === initialCoins + 30, "30 Gold awarded for cooking Kimchi");
assert(cookingState.cookedRecipes.includes('kimchi'), "Kimchi recorded in cookingState.cookedRecipes");

// Attempt cooking 'kimchi' again when missing cabbage (deduct 1 cabbage so 0 remaining)
removeItemFromInventory('cabbage', 1);
const cookResultFail = cookRecipe('kimchi');
assert(cookResultFail === false, "cookRecipe('kimchi') fails when missing required ingredients");

// Test Master Chef Achievement Unlock
cookingState.cookedRecipes = [...expectedRecipeIds];
unlockedTrophies = [];
checkCookingAchievements();
assert(unlockedTrophies.includes('master_chef'), "Master Chef trophy unlocked when 100% of recipes are cooked");

// -----------------------------------------------------------------------------
// SECTION 6: HOTKEY & MODAL KEYBOARD EVENT LISTENERS
// -----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 6: Keyboard Hotkeys ('I' / 'E' / 'C') ---");

const keydownHandlers = global.__eventListeners['keydown'] || [];
assert(keydownHandlers.length > 0, `Keydown event listeners registered on window (count: ${keydownHandlers.length})`);

const invOverlay = global.document.getElementById('inventory-overlay');
const cookingOverlay = global.document.getElementById('cooking-overlay');

// Ensure clean initial state
global.clearActiveModalStack();

// 1. Fire keydown event for 'i' -> opens inventory
global.fireKeyEvent({ key: 'i' });
assert(invOverlay.classList.contains('visible'), "'i' hotkey opens inventory-overlay modal");

// 2. Fire keydown event for 'i' again -> toggles closed
global.fireKeyEvent({ key: 'i' });
assert(!invOverlay.classList.contains('visible'), "'i' hotkey closes inventory-overlay modal when active");

// 3. Fire keydown event for 'e' -> opens inventory
global.clearActiveModalStack();
global.fireKeyEvent({ key: 'e' });
assert(invOverlay.classList.contains('visible'), "'e' hotkey opens inventory-overlay modal");

// 4. Fire keydown event for 'e' again -> closes inventory
global.fireKeyEvent({ key: 'e' });
assert(!invOverlay.classList.contains('visible'), "'e' hotkey closes inventory-overlay modal when active");

// 5. Fire keydown event for 'c' -> opens cooking
global.clearActiveModalStack();
global.fireKeyEvent({ key: 'c' });
assert(cookingOverlay.classList.contains('visible'), "'c' hotkey opens cooking-overlay modal");

// 6. Fire keydown event for 'c' again -> closes cooking
global.fireKeyEvent({ key: 'c' });
assert(!cookingOverlay.classList.contains('visible'), "'c' hotkey closes cooking-overlay modal when active");

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log("\n=========================================================");
console.log(`  INDEPENDENT AUDIT COMPLETE: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("=========================================================");

if (testsFailed === 0) {
  console.log("\n\x1b[32mSUCCESS: ALL INDEPENDENT VERIFICATION TESTS PASSED PERFECTLY!\x1b[0m\n");
  process.exit(0);
} else {
  console.error(`\n\x1b[31mFAILURE: ${testsFailed} tests failed!\x1b[0m\n`);
  process.exit(1);
}
