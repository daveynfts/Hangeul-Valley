const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { GAME_SCRIPTS, allGameScriptsExist, readGameSource } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');

let passCount = 0;
let failCount = 0;
const results = [];

function assert(condition, testName, detail = '') {
  if (condition) {
    passCount++;
    results.push({ name: testName, status: 'PASS', detail });
    console.log(`[PASS] ${testName}${detail ? ' - ' + detail : ''}`);
  } else {
    failCount++;
    results.push({ name: testName, status: 'FAIL', detail });
    console.error(`[FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
  }
}

console.log('===========================================================');
console.log('CHALLENGER 2 - MILESTONE 2 EMPIRICAL BOUNDARY & STRESS SUITE');
console.log('===========================================================');

// -----------------------------------------------------------------------------
// 1. Shipped files
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 1: Shipped files ---');

assert(
  allGameScriptsExist(),
  'js/manifest.json scripts exist and are non-empty'
);
assert(
  GAME_SCRIPTS.includes('js/boot.js'),
  'manifest includes boot.js'
);
assert(
  fs.existsSync(path.join(ROOT, 'index.html')) && fs.statSync(path.join(ROOT, 'index.html')).size > 0,
  'index.html exists and is non-empty'
);

// -----------------------------------------------------------------------------
// 2. Setup Mock DOM & Load game.js into VM Context
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Initializing Game Context & Environment ---');

class ClassList {
  constructor() {
    this._classes = new Set();
  }
  add(cls) { this._classes.add(cls); }
  remove(cls) { this._classes.delete(cls); }
  toggle(cls) {
    if (this._classes.has(cls)) this._classes.delete(cls);
    else this._classes.add(cls);
  }
  contains(cls) { return this._classes.has(cls); }
}

class MockElement {
  constructor(id = '', tagName = 'DIV') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new ClassList();
    this.children = [];
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.isContentEditable = false;
    this.onclick = null;
    this.eventListeners = {};
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  setAttribute(k, v) {}
  removeAttribute(k) {}
  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }
  removeEventListener(event, fn) {}
  querySelector(sel) { return new MockElement(); }
  querySelectorAll(sel) { return []; }
  getContext(ctx) {
    return {
      clearRect: () => {},
      fillRect: () => {},
      drawImage: () => {},
      strokeRect: () => {}
    };
  }
}

class MockDocument {
  constructor() {
    this.elements = new Map();
    this.body = this.createElement('body');
    this.activeElement = null;
  }
  createElement(tag) {
    return new MockElement('', tag);
  }
  getElementById(id) {
    if (!this.elements.has(id)) {
      const el = new MockElement(id);
      this.elements.set(id, el);
    }
    return this.elements.get(id);
  }
}

const listeners = {};
const mockDoc = new MockDocument();

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  document: mockDoc,
  window: {
    listeners: listeners,
    addEventListener(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    removeEventListener(event, fn) {},
    dispatchEvent(event) {
      if (listeners[event.type]) {
        listeners[event.type].forEach(fn => fn(event));
      }
    }
  },
  Phaser: {
    Game: class { constructor(cfg) { this.config = cfg; } },
    Scene: class {},
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Math: { RandomDataGenerator: class { constructor() {} } }
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  }
};

sandbox.window.document = mockDoc;
sandbox.globalThis = sandbox;
sandbox.window.window = sandbox.window;

const context = vm.createContext(sandbox);
const gameCode = readGameSource();

try {
  vm.runInContext(gameCode, context);
  assert(true, 'VM Context Load: game scripts loaded without syntax/runtime errors');
} catch (err) {
  assert(false, 'VM Context Load: game scripts failed to execute', err.stack);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 3. Recipe Database Structure Checks
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Recipe Database Checks ---');
const recipes = context.COOKING_RECIPES;
assert(Array.isArray(recipes), 'COOKING_RECIPES is an Array');
// Deliberately not a fixed number. This asserted exactly 10 and broke the moment the two
// honey recipes were added — a count check tells you nothing a content edit should not be
// free to change, and it kept the whole suite red. What matters is that there are recipes
// and that every one of them is well-formed, which the loop below checks.
assert(recipes.length > 0, 'COOKING_RECIPES is non-empty', `Actual count: ${recipes ? recipes.length : 0}`);

let validRecipes = true;
recipes.forEach(r => {
  if (!r.id || !r.nameEn || !r.nameKo || !r.icon || !Array.isArray(r.ingredients) || typeof r.xpReward !== 'number' || typeof r.goldReward !== 'number') {
    validRecipes = false;
  }
});
assert(validRecipes, 'All 10 recipes have required fields (id, nameEn, nameKo, icon, ingredients, xpReward, goldReward)');

// Helper function to reset inventory state cleanly
function resetState() {
  context.inventoryState = {
    maxSlots: 20,
    ingredients: {},
    cookedDishes: {},
    vocabXP: 0
  };
  context.playerCurrencies = { coins: 100, gems: 0, honor: 0 };
  context.cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  context.unlockedTrophies = [];
  while (context.closeTopModal && context.closeTopModal()) {}
}

function addStock(itemId, qty) {
  context.addItemToInventory(itemId, qty);
}

// -----------------------------------------------------------------------------
// 4. Empirical Boundary Stress: Ingredient Conditions
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Cooking Engine Boundary Tests ---');

// Test 4.1: Cooking without required ingredients
resetState();
const resNoIng = context.cookRecipe('kimchi');
assert(resNoIng === false, 'cookRecipe without ingredients: returns false');
assert(context.cookingState.cookedRecipes.length === 0, 'cookRecipe without ingredients: state.cookedRecipes empty');
assert(context.cookingState.totalDishesCooked === 0, 'cookRecipe without ingredients: totalDishesCooked remains 0');
assert(context.playerCurrencies.coins === 100, 'cookRecipe without ingredients: coins unchanged');
assert(context.playerCurrencies.honor === 0, 'cookRecipe without ingredients: honor/XP unchanged');

// Test 4.2: Cooking with partial / missing ingredients
resetState();
addStock('cabbage', 1); // Missing chili & garlic for Kimchi
const resPartial = context.cookRecipe('kimchi');
assert(resPartial === false, 'cookRecipe with partial ingredients: returns false');
assert(context.inventoryState.ingredients['배추'] === 1, 'cookRecipe failure preserves partial ingredients in inventory');

// Test 4.3: Cooking with exact required ingredients
resetState();
addStock('cabbage', 1);
addStock('chili', 1);
addStock('garlic', 1);
const resExact = context.cookRecipe('kimchi');
assert(resExact === true, 'cookRecipe with exact ingredients: returns true');
assert(!context.inventoryState.ingredients['배추'], 'cookRecipe exact: cabbage (배추) deducted to 0/deleted');
assert(!context.inventoryState.ingredients['고추'], 'cookRecipe exact: chili (고추) deducted to 0/deleted');
assert(!context.inventoryState.ingredients['마늘'], 'cookRecipe exact: garlic (마늘) deducted to 0/deleted');
assert(context.playerCurrencies.coins === 130, 'cookRecipe exact: granted +30 coins (100 -> 130)', `Coins: ${context.playerCurrencies.coins}`);
assert(context.playerCurrencies.honor === 25, 'cookRecipe exact: granted +25 XP (0 -> 25)', `Honor: ${context.playerCurrencies.honor}`);
assert(context.cookingState.cookedRecipes.includes('kimchi'), 'cookRecipe exact: kimchi recorded in cookedRecipes');
assert(context.cookingState.recipeStats['kimchi'] === 1, 'cookRecipe exact: recipeStats.kimchi === 1');
assert(context.cookingState.totalDishesCooked === 1, 'cookRecipe exact: totalDishesCooked === 1');

// Test 4.4: Cooking with excess ingredients
resetState();
addStock('rice', 10);
addStock('radish', 5); // Radish Rice requires 1 rice, 1 radish
const resExcess = context.cookRecipe('radish_rice');
assert(resExcess === true, 'cookRecipe with excess ingredients: returns true');
assert(context.inventoryState.ingredients['쌀'] === 9, 'cookRecipe excess: exact deduction of 1 rice (10 -> 9)');
assert(context.inventoryState.ingredients['무'] === 4, 'cookRecipe excess: exact deduction of 1 radish (5 -> 4)');

// -----------------------------------------------------------------------------
// 5. Invalid / Unknown Recipe ID Boundary Tests
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Invalid / Unknown Recipe ID Tests ---');

resetState();
const invalidIds = [null, undefined, '', 'non_existent_recipe', 99999, 'KIMCHI', '   '];
let allInvalidHandled = true;
invalidIds.forEach(id => {
  const result = context.cookRecipe(id);
  if (result !== false) {
    allInvalidHandled = false;
    console.error(`  Failed on invalid ID: ${id}`);
  }
});
assert(allInvalidHandled, 'cookRecipe gracefully handles invalid/unknown recipe IDs (returns false for all)');

// -----------------------------------------------------------------------------
// 6. Repeated Cooking Stress Test
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: Repeated Cooking Until Exhaustion Stress ---');

resetState();
// Roasted corn requires 2 corns per cook
addStock('corn', 5);
let cookCount = 0;
let keepCooking = true;
while (keepCooking) {
  const success = context.cookRecipe('roasted_corn');
  if (success) {
    cookCount++;
  } else {
    keepCooking = false;
  }
}
assert(cookCount === 2, 'Repeated cooking: successfully cooked exactly 2 times with 5 corns (req: 2 per cook)', `Actual cooks: ${cookCount}`);
assert(context.inventoryState.ingredients['옥수수'] === 1, 'Repeated cooking: exactly 1 corn remains after stock exhaustion (5 - 4 = 1)', `Remaining corn: ${context.inventoryState.ingredients['옥수수']}`);
assert(context.inventoryState.ingredients['옥수수'] >= 0, 'Repeated cooking: ingredient quantity never drops below 0');

// -----------------------------------------------------------------------------
// 7. Master Chef Trophy & 100% Recipes Cooked Test
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: Master Chef Trophy Unlock Test ---');

resetState();
// Read the shopping list off the recipes rather than hardcoding it. The old list named 11
// ingredients by hand and predated the honey recipes, so honey was missing and the two of
// them could not be cooked — which is what actually broke the trophy assertion below, not
// the trophy code. A derived list cannot go stale when a recipe is added.
// Stock the *sum* of each ingredient's demand across every recipe, not the largest single
// requirement: the recipes are cooked back to back and each one consumes its share, so an
// ingredient several recipes share runs out partway through.
const demand = new Map();
recipes.forEach(r => r.ingredients.forEach(i => demand.set(i.itemId, (demand.get(i.itemId) || 0) + i.count)));
const ingList = [...demand.keys()];
ingList.forEach(item => addStock(item, demand.get(item)));

assert(ingList.length <= context.inventoryState.maxSlots,
  `Master Chef test: every distinct ingredient fits in the pantry (${ingList.length} <= ${context.inventoryState.maxSlots} slots)`);

recipes.forEach(r => {
  const ok = context.cookRecipe(r.id);
  assert(ok, `Master Chef test: cooked recipe '${r.id}' successfully`);
});

assert(context.cookingState.cookedRecipes.length === recipes.length,
  `Master Chef test: all ${recipes.length} recipes recorded in cookedRecipes`,
  `Recorded: ${context.cookingState.cookedRecipes.length}`);
assert(context.unlockedTrophies.includes('master_chef'), 'Master Chef test: trophy "master_chef" unlocked in unlockedTrophies array');

// -----------------------------------------------------------------------------
// 8. Keyboard Listener Behavior & Modal Toggle Logic
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 8: Keyboard Listener & Modal State Tests ---');

resetState();
const cookingOverlayEl = mockDoc.getElementById('cooking-overlay');
const inventoryOverlayEl = mockDoc.getElementById('inventory-overlay');

function dispatchKey(key, targetElement = null) {
  mockDoc.activeElement = targetElement;
  const event = { key: key, type: 'keydown', preventDefault: () => {} };
  if (listeners['keydown']) {
    listeners['keydown'].forEach(fn => fn(event));
  }
}

// Test 8.1: 'c' key opens cooking UI when idle
dispatchKey('c');
assert(cookingOverlayEl.classList.contains('visible'), "Keydown 'c' when idle: opens cooking modal (#cooking-overlay gains 'visible')");

// Test 8.2: 'c' key closes cooking UI when cooking overlay is active top modal
dispatchKey('c');
assert(!cookingOverlayEl.classList.contains('visible'), "Keydown 'c' when cooking modal active: closes cooking modal (#cooking-overlay loses 'visible')");

// Test 8.3: 'C' (uppercase) key opens cooking UI
dispatchKey('C');
assert(cookingOverlayEl.classList.contains('visible'), "Keydown 'C' (uppercase) when idle: opens cooking modal");

// Test 8.4: 'Escape' key closes cooking UI
dispatchKey('Escape');
assert(!cookingOverlayEl.classList.contains('visible'), "Keydown 'Escape' when cooking modal active: closes cooking modal");

// Test 8.5: Input focus guard: 'c' key pressed while focusing text input does NOT toggle cooking UI
resetState();
const mockInput = mockDoc.createElement('input');
dispatchKey('c', mockInput);
assert(!cookingOverlayEl.classList.contains('visible'), "Keydown 'c' while INPUT focused: ignored (guard prevents cooking UI from opening)");

const mockTextArea = mockDoc.createElement('textarea');
dispatchKey('c', mockTextArea);
assert(!cookingOverlayEl.classList.contains('visible'), "Keydown 'c' while TEXTAREA focused: ignored");

const mockEditable = mockDoc.createElement('div');
mockEditable.isContentEditable = true;
dispatchKey('c', mockEditable);
assert(!cookingOverlayEl.classList.contains('visible'), "Keydown 'c' while isContentEditable focused: ignored");

// Test 8.6: Stack isolation: 'c' key pressed while another modal is active does NOT open cooking UI
resetState();
context.openInventoryUI();
assert(inventoryOverlayEl.classList.contains('visible'), "openInventoryUI: 'inventory-overlay' gains 'visible'");

dispatchKey('c');
assert(!cookingOverlayEl.classList.contains('visible'), "Keydown 'c' while 'inventory-overlay' open: does NOT open cooking modal");
assert(inventoryOverlayEl.classList.contains('visible'), "Keydown 'c' while 'inventory-overlay' open: preserves inventory modal state");

context.closeInventoryUI();
assert(!inventoryOverlayEl.classList.contains('visible'), "closeInventoryUI: inventory modal closed");

// -----------------------------------------------------------------------------
// 9. Save Persistence Integration Check
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 9: Save Persistence Integration Check ---');

resetState();
addStock('cabbage', 1);
addStock('chili', 1);
addStock('garlic', 1);
context.cookRecipe('kimchi');

if (typeof context.collectSave === 'function') {
  const saveData = context.collectSave();
  assert(saveData && saveData.cooking, 'collectSave(): serializes cooking object in save snapshot');
  assert(saveData.cooking.cookedRecipes.includes('kimchi'), 'collectSave(): retains cookedRecipes array with kimchi');
  assert(saveData.cooking.totalDishesCooked === 1, 'collectSave(): retains totalDishesCooked count (1)');
  assert(saveData.inventory.cookedDishes.kimchi === 1, 'collectSave(): serializes inventory.cookedDishes');

  // Test restoration
  resetState();
  if (typeof context.applySave === 'function') {
    context.applySave(saveData);
    assert(context.cookingState.cookedRecipes.includes('kimchi'), 'applySave(): restores cookedRecipes');
    assert(context.cookingState.totalDishesCooked === 1, 'applySave(): restores totalDishesCooked');
    assert(context.inventoryState.cookedDishes.kimchi === 1, 'applySave(): syncs cookedDishes in inventoryState');
  }
}

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\n===========================================================');
console.log(`SUITE COMPLETE: Total Assertions = ${passCount + failCount} | PASS = ${passCount} | FAIL = ${failCount}`);
console.log(`VERDICT: ${failCount === 0 ? 'PASS' : 'FAIL'}`);
console.log('===========================================================');

process.exit(failCount === 0 ? 0 : 1);
