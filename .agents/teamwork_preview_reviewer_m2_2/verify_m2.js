const fs = require('fs');
const vm = require('vm');

console.log('=== STARTING REVIEWER 2 EMPIRICAL VERIFICATION ===');

const code = fs.readFileSync('game.js', 'utf8');

function createMockElement(id = '') {
  return {
    id,
    tagName: 'DIV',
    className: '',
    style: {},
    classList: {
      add() {},
      remove() {},
      contains() { return false; }
    },
    appendChild() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    innerHTML: '',
    textContent: ''
  };
}

const listeners = {};
const mockDoc = {
  elements: new Map(),
  createElement: (tag) => createMockElement(tag),
  getElementById: (id) => createMockElement(id),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  activeElement: null
};

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  document: mockDoc,
  window: {
    listeners,
    addEventListener(evt, fn) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener() {}
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
    removeItem(k) { delete this._data[k]; }
  }
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

let passes = 0;
let fails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passes++;
  } else {
    console.error(`[FAIL] ${message}`);
    fails++;
  }
}

// 1. Inventory & Item DB Integration
console.log('\n--- CHECK 1: Item DB & Inventory Integration ---');

const honeyInfo = sandbox.getItemInfo('honey');
assert(honeyInfo && honeyInfo.key === '꿀', `getItemInfo('honey') maps to key '꿀' (got key: '${honeyInfo ? honeyInfo.key : 'undefined'}')`);
assert(honeyInfo && honeyInfo.id === 'honey', `getItemInfo('honey') has id 'honey'`);
assert(honeyInfo && honeyInfo.nameKo === '꿀', `getItemInfo('honey') has nameKo '꿀'`);

const honeyInfoKo = sandbox.getItemInfo('꿀');
assert(honeyInfoKo && honeyInfoKo.key === '꿀', `getItemInfo('꿀') maps to key '꿀'`);
assert(honeyInfoKo && honeyInfoKo.id === 'honey', `getItemInfo('꿀') has id 'honey'`);

// Test addItemToInventory & removeItemFromInventory
sandbox.inventoryState = { maxSlots: 20, ingredients: {}, seeds: {}, cookedDishes: {} };
const addRes1 = sandbox.addItemToInventory('honey', 3);
assert(addRes1 === true, `addItemToInventory('honey', 3) returned true`);
assert(sandbox.inventoryState.ingredients['꿀'] === 3, `inventoryState.ingredients['꿀'] is 3 after adding`);

const addRes2 = sandbox.addItemToInventory('honey', 2);
assert(addRes2 === true, `addItemToInventory('honey', 2) stacked existing item`);
assert(sandbox.inventoryState.ingredients['꿀'] === 5, `inventoryState.ingredients['꿀'] is 5 after stacking`);

const remRes1 = sandbox.removeItemFromInventory('honey', 2);
assert(remRes1 === true, `removeItemFromInventory('honey', 2) returned true`);
assert(sandbox.inventoryState.ingredients['꿀'] === 3, `inventoryState.ingredients['꿀'] is 3 after removing 2`);

const remRes2 = sandbox.removeItemFromInventory('honey', 3);
assert(remRes2 === true, `removeItemFromInventory('honey', 3) returned true`);
assert(sandbox.inventoryState.ingredients['꿀'] === undefined, `inventoryState.ingredients['꿀'] deleted when count hits 0`);

// Test inventory capacity limit
sandbox.inventoryState = { maxSlots: 2, ingredients: { '배추': 1, '무': 1 }, seeds: {}, cookedDishes: {} };
const addFullRes = sandbox.addItemToInventory('honey', 1);
assert(addFullRes === false, `addItemToInventory('honey', 1) respects maxSlots capacity limit (2 used / 2 max)`);

// 2. Cooking Recipe Validation
console.log('\n--- CHECK 2: Cooking Recipe Validation ---');
const recipes = sandbox.COOKING_RECIPES;
assert(Array.isArray(recipes), `COOKING_RECIPES is an array`);
assert(recipes.length === 12, `COOKING_RECIPES length is 12 (10 base + 2 honey recipes)`);

const yakgwa = recipes.find(r => r.id === 'honey_yakgwa');
assert(yakgwa !== undefined, `COOKING_RECIPES contains 'honey_yakgwa'`);
if (yakgwa) {
  assert(yakgwa.nameEn === 'Honey Yakgwa', `honey_yakgwa nameEn is 'Honey Yakgwa'`);
  assert(yakgwa.nameKo === '꿀약과', `honey_yakgwa nameKo is '꿀약과'`);
  assert(yakgwa.icon === '🥮', `honey_yakgwa icon is '🥮'`);
  assert(yakgwa.xpReward === 50, `honey_yakgwa xpReward is 50`);
  assert(yakgwa.goldReward === 60, `honey_yakgwa goldReward is 60`);
  assert(Array.isArray(yakgwa.ingredients) && yakgwa.ingredients.length === 2, `honey_yakgwa has 2 ingredients`);
  assert(yakgwa.ingredients[0].itemId === 'honey' && yakgwa.ingredients[0].count === 2, `honey_yakgwa ingredient 1: 2x honey`);
  assert(yakgwa.ingredients[1].itemId === 'cabbage' && yakgwa.ingredients[1].count === 1, `honey_yakgwa ingredient 2: 1x cabbage`);
}

const honeyTea = recipes.find(r => r.id === 'honey_tea');
assert(honeyTea !== undefined, `COOKING_RECIPES contains 'honey_tea'`);
if (honeyTea) {
  assert(honeyTea.nameEn === 'Honey Tea', `honey_tea nameEn is 'Honey Tea'`);
  assert(honeyTea.nameKo === '꿀차', `honey_tea nameKo is '꿀차'`);
  assert(honeyTea.icon === '🍵', `honey_tea icon is '🍵'`);
  assert(honeyTea.xpReward === 35, `honey_tea xpReward is 35`);
  assert(honeyTea.goldReward === 45, `honey_tea goldReward is 45`);
  assert(Array.isArray(honeyTea.ingredients) && honeyTea.ingredients.length === 1, `honey_tea has 1 ingredient`);
  assert(honeyTea.ingredients[0].itemId === 'honey' && honeyTea.ingredients[0].count === 2, `honey_tea ingredient 1: 2x honey`);
}

// Check cookRecipe execution
sandbox.inventoryState = { maxSlots: 20, ingredients: { '꿀': 4, '배추': 1 }, seeds: {}, cookedDishes: {} };
sandbox.cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };

const cookYakgwaRes = sandbox.cookRecipe('honey_yakgwa');
assert(cookYakgwaRes === true, `cookRecipe('honey_yakgwa') succeeded with required ingredients`);
assert(sandbox.inventoryState.ingredients['꿀'] === 2, `Honey stock decreased to 2 after cooking yakgwa`);
assert(sandbox.inventoryState.ingredients['배추'] === undefined, `Cabbage stock deleted after cooking yakgwa`);
assert(sandbox.cookingState.cookedRecipes.includes('honey_yakgwa'), `cookingState.cookedRecipes contains 'honey_yakgwa'`);

const cookTeaRes = sandbox.cookRecipe('honey_tea');
assert(cookTeaRes === true, `cookRecipe('honey_tea') succeeded with remaining 2 honey`);
assert(sandbox.inventoryState.ingredients['꿀'] === undefined, `Honey stock deleted after cooking honey_tea`);
assert(sandbox.cookingState.cookedRecipes.includes('honey_tea'), `cookingState.cookedRecipes contains 'honey_tea'`);

// 3. Persistence & Migration
console.log('\n--- CHECK 3: Persistence & Migration ---');
const savedData = sandbox.collectSave();
assert(savedData !== null && typeof savedData === 'object', `collectSave() returns non-null object`);
assert(savedData.inventory.cookedDishes['honey_yakgwa'] === 1, `collectSave() includes honey_yakgwa in cookedDishes`);
assert(savedData.cooking.cookedRecipes.includes('honey_yakgwa'), `collectSave() includes honey_yakgwa in cookingState`);

// Test applySave
sandbox.cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
sandbox.inventoryState = { maxSlots: 20, ingredients: {}, seeds: {}, cookedDishes: {} };

const applyRes = sandbox.applySave(savedData);
assert(applyRes === true, `applySave() returned true`);
assert(sandbox.cookingState.cookedRecipes.includes('honey_yakgwa'), `applySave() restored cookedRecipes containing 'honey_yakgwa'`);
assert(sandbox.cookingState.cookedRecipes.includes('honey_tea'), `applySave() restored cookedRecipes containing 'honey_tea'`);

// Migration test: v3 legacy save without cooking property
const legacySaveV3 = {
  v: 3,
  gold: 150,
  inventory: {
    maxSlots: 20,
    ingredients: { "꿀": 10, "배추": 5 },
    cookedDishes: { "kimchi": 2 }
  }
};

const applyLegacyRes = sandbox.applySave(legacySaveV3);
assert(applyLegacyRes === true, `applySave() successfully processed legacy v3 save`);
assert(sandbox.cookingState.cookedRecipes.includes('kimchi'), `Legacy migration hydrated cookedRecipes from legacy cookedDishes ('kimchi')`);
assert(sandbox.inventoryState.ingredients['꿀'] === 10, `Legacy migration preserved honey stock ('꿀': 10)`);
assert(sandbox.recipeState.unlockedRecipes.includes('honey_yakgwa'), `Legacy migration ensured 'honey_yakgwa' in unlockedRecipes`);
assert(sandbox.recipeState.unlockedRecipes.includes('honey_tea'), `Legacy migration ensured 'honey_tea' in unlockedRecipes`);

console.log(`\n==================================================`);
console.log(`VERIFICATION SUMMARY: TOTAL ASSERTS = ${passes + fails} | PASS = ${passes} | FAIL = ${fails}`);
console.log(`==================================================`);
