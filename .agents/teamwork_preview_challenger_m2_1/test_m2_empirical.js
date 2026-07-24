/**
 * Empirical Verification & Stress Test Harness for Milestone 2
 * (Honey Rewards, Cooking Integration & Save/Load Persistence)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalAssertions++;
  if (actual === expected) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message} (Value: ${JSON.stringify(actual)})`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`);
  }
}

function assertDeepEqual(actual, expected, message) {
  totalAssertions++;
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr === eStr) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}\n    Expected: ${eStr}\n    Actual:   ${aStr}`);
  }
}

// ── MOCK ENVIRONMENT SETUP ──────────────────────────────────────────────────
const localStorageStore = {};
const localStorageMock = {
  getItem: (k) => localStorageStore[k] || null,
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; },
  clear: () => { for (const k in localStorageStore) delete localStorageStore[k]; }
};

const elementsStore = {};
const createMockElement = (id) => ({
  id,
  textContent: '',
  innerHTML: '',
  style: {},
  classList: { add: () => {}, remove: () => {} },
  appendChild: () => {},
  addEventListener: () => {}
});

const documentMock = {
  getElementById: (id) => {
    if (!elementsStore[id]) elementsStore[id] = createMockElement(id);
    return elementsStore[id];
  },
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    textContent: '',
    innerHTML: '',
    appendChild: () => {},
    setAttribute: () => {}
  }),
  body: createMockElement('body')
};

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Math,
  Object,
  Array,
  String,
  Number,
  Boolean,
  JSON,
  RegExp,
  Date,
  window: null,
  document: documentMock,
  localStorage: localStorageMock,
  addEventListener: () => {},
  removeEventListener: () => {},
  Phaser: {
    AUTO: 0,
    Scene: class Scene { constructor() {} },
    Game: class Game { constructor() {} },
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Textures: { FilterMode: { NEAREST: 1 } },
    Math: { Between: (a, b) => a, Clamp: (v, min, max) => Math.min(Math.max(v, min), max) },
    Input: { Keyboard: { KeyCodes: {} } }
  }
};
sandbox.window = sandbox;

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
console.log(`Loading game.js from: ${gameJsPath}`);
const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

const context = vm.createContext(sandbox);
vm.runInContext(gameJsCode, context);

console.log("Successfully loaded game.js into VM context.\n");

// Access functions & globals from context
const getItemInfo = context.getItemInfo;
const addItemToInventory = context.addItemToInventory;
const removeItemFromInventory = context.removeItemFromInventory;
const cookRecipe = context.cookRecipe;
const collectSave = context.collectSave;
const applySave = context.applySave;
const getUsedInventorySlots = context.getUsedInventorySlots;
const COOKING_RECIPES = context.COOKING_RECIPES;

// Helper to reset state cleanly
function resetState() {
  context.inventoryState = {
    maxSlots: 20,
    ingredients: {},
    seeds: {},
    scrolls: 0,
    cookedDishes: {}
  };
  context.cookingState = {
    cookedRecipes: [],
    totalDishesCooked: 0,
    recipeStats: {}
  };
  context.playerCurrencies = { coins: 100, gems: 10, honor: 0 };
  context.syncGoldAlias();
  context.unlockedTrophies = [];
}

console.log("==================================================");
console.log("TEST SUITE 1: getItemInfo Bidirectional Resolution");
console.log("==================================================");
{
  const infoByHoneyId = getItemInfo('honey');
  assert(infoByHoneyId !== null && typeof infoByHoneyId === 'object', "getItemInfo('honey') returns valid object");
  assertEqual(infoByHoneyId.key, '꿀', "getItemInfo('honey').key is '꿀'");
  assertEqual(infoByHoneyId.id, 'honey', "getItemInfo('honey').id is 'honey'");
  assertEqual(infoByHoneyId.name, 'Honey', "getItemInfo('honey').name is 'Honey'");
  assertEqual(infoByHoneyId.nameKo, '꿀', "getItemInfo('honey').nameKo is '꿀'");
  assertEqual(infoByHoneyId.icon, '🍯', "getItemInfo('honey').icon is '🍯'");
  assertEqual(infoByHoneyId.type, 'ingredient', "getItemInfo('honey').type is 'ingredient'");

  const infoByHoneyKo = getItemInfo('꿀');
  assert(infoByHoneyKo !== null && typeof infoByHoneyKo === 'object', "getItemInfo('꿀') returns valid object");
  assertEqual(infoByHoneyKo.key, '꿀', "getItemInfo('꿀').key is '꿀'");
  assertEqual(infoByHoneyKo.id, 'honey', "getItemInfo('꿀').id is 'honey'");
  assertEqual(infoByHoneyKo.name, 'Honey', "getItemInfo('꿀').name is 'Honey'");
  assertEqual(infoByHoneyKo.nameKo, '꿀', "getItemInfo('꿀').nameKo is '꿀'");
  assertEqual(infoByHoneyKo.icon, '🍯', "getItemInfo('꿀').icon is '🍯'");
  assertEqual(infoByHoneyKo.type, 'ingredient', "getItemInfo('꿀').type is 'ingredient'");

  assertDeepEqual(infoByHoneyId, infoByHoneyKo, "getItemInfo('honey') and getItemInfo('꿀') return identical objects");
}

console.log("\n==================================================");
console.log("TEST SUITE 2: Inventory Addition & Stacking");
console.log("==================================================");
{
  resetState();

  // Test adding 0 items
  const res0 = addItemToInventory('honey', 0);
  assertEqual(res0, false, "addItemToInventory('honey', 0) returns false");
  assertEqual(context.inventoryState.ingredients['꿀'] || 0, 0, "Honey stock remains 0 after adding 0");

  // Test adding 1 item
  const res1 = addItemToInventory('honey', 1);
  assertEqual(res1, true, "addItemToInventory('honey', 1) returns true");
  assertEqual(context.inventoryState.ingredients['꿀'], 1, "Honey stock is 1 after adding 1");

  // Test adding 5 items
  const res5 = addItemToInventory('honey', 5);
  assertEqual(res5, true, "addItemToInventory('honey', 5) returns true");
  assertEqual(context.inventoryState.ingredients['꿀'], 6, "Honey stock is 6 after adding 5");

  // Test adding 100 items (stacking in existing slot)
  const res100 = addItemToInventory('honey', 100);
  assertEqual(res100, true, "addItemToInventory('honey', 100) returns true");
  assertEqual(context.inventoryState.ingredients['꿀'], 106, "Honey stock is 106 after adding 100");

  // Test adding via Korean key '꿀'
  const resKo = addItemToInventory('꿀', 4);
  assertEqual(resKo, true, "addItemToInventory('꿀', 4) returns true");
  assertEqual(context.inventoryState.ingredients['꿀'], 110, "Honey stock is 110 after adding 4 via '꿀'");
}

console.log("\n==================================================");
console.log("TEST SUITE 3: Capacity Limits Enforcement");
console.log("==================================================");
{
  resetState();
  context.inventoryState.maxSlots = 5;

  // Add 5 distinct items to reach max capacity (5/5 slots)
  const distinctItems = ['배추', '무', '파', '고추', '마늘'];
  distinctItems.forEach(item => {
    addItemToInventory(item, 1);
  });

  assertEqual(getUsedInventorySlots(), 5, "Inventory used slots count is 5/5");

  // Try adding a 6th NEW item type ('honey') when inventory is full
  const resFullNew = addItemToInventory('honey', 1);
  assertEqual(resFullNew, false, "addItemToInventory('honey', 1) returns false when inventory is at full capacity (5/5)");
  assertEqual(typeof context.inventoryState.ingredients['꿀'], 'undefined', "Honey is not added to inventory when capacity full");

  // Try adding an item that ALREADY exists in inventory ('배추') when full
  const resFullExisting = addItemToInventory('배추', 10);
  assertEqual(resFullExisting, true, "addItemToInventory('배추', 10) returns true (stacking in existing slot when full)");
  assertEqual(context.inventoryState.ingredients['배추'], 11, "Existing item ('배추') stock incremented to 11");

  // Increase capacity by 1 slot and now add 'honey'
  context.inventoryState.maxSlots = 6;
  const resAfterExpand = addItemToInventory('honey', 5);
  assertEqual(resAfterExpand, true, "addItemToInventory('honey', 5) returns true after capacity expansion to 6 slots");
  assertEqual(context.inventoryState.ingredients['꿀'], 5, "Honey stock is 5 after successful addition");
}

console.log("\n==================================================");
console.log("TEST SUITE 4: Cooking Integration (honey_yakgwa & honey_tea)");
console.log("==================================================");
{
  resetState();

  const yakgwaRecipe = COOKING_RECIPES.find(r => r.id === 'honey_yakgwa');
  const teaRecipe = COOKING_RECIPES.find(r => r.id === 'honey_tea');

  assert(!!yakgwaRecipe, "Recipe 'honey_yakgwa' exists in COOKING_RECIPES");
  assert(!!teaRecipe, "Recipe 'honey_tea' exists in COOKING_RECIPES");

  // 1. Rejection test: Insufficient ingredients
  // honey_yakgwa needs 2 honey, 1 cabbage.
  addItemToInventory('honey', 1); // 1 honey (need 2)
  addItemToInventory('cabbage', 1); // 1 cabbage

  const resCookFail = cookRecipe('honey_yakgwa');
  assertEqual(resCookFail, false, "cookRecipe('honey_yakgwa') rejected due to insufficient honey");
  assertEqual(context.inventoryState.ingredients['꿀'], 1, "Honey stock unchanged after failed cooking attempt");
  assertEqual(context.inventoryState.ingredients['배추'], 1, "Cabbage stock unchanged after failed cooking attempt");
  assertEqual(context.cookingState.totalDishesCooked, 0, "totalDishesCooked is 0 after failed cooking");

  // 2. Successful Cooking: honey_yakgwa
  addItemToInventory('honey', 5); // Now 6 honey
  // Currently: 6 honey, 1 cabbage
  const initialCoins = context.playerCurrencies.coins;
  const initialHonor = context.playerCurrencies.honor;

  const resCookYakgwa = cookRecipe('honey_yakgwa');
  assertEqual(resCookYakgwa, true, "cookRecipe('honey_yakgwa') succeeds with sufficient ingredients");
  assertEqual(context.inventoryState.ingredients['꿀'], 4, "Honey stock deducted by 2 (6 -> 4)");
  assertEqual(typeof context.inventoryState.ingredients['배추'], 'undefined', "Cabbage stock deducted by 1 (1 -> 0, key deleted)");

  const goldEarnedYakgwa = context.playerCurrencies.coins - initialCoins;
  const honorEarnedYakgwa = context.playerCurrencies.honor - initialHonor;
  assertEqual(goldEarnedYakgwa, yakgwaRecipe.goldReward, `Gold reward +${yakgwaRecipe.goldReward} granted for honey_yakgwa`);
  assertEqual(honorEarnedYakgwa, yakgwaRecipe.xpReward, `XP/Honor reward +${yakgwaRecipe.xpReward} granted for honey_yakgwa`);

  assert(context.cookingState.cookedRecipes.includes('honey_yakgwa'), "cookingState.cookedRecipes includes 'honey_yakgwa'");
  assertEqual(context.cookingState.totalDishesCooked, 1, "cookingState.totalDishesCooked is 1");
  assertEqual(context.cookingState.recipeStats['honey_yakgwa'], 1, "cookingState.recipeStats['honey_yakgwa'] is 1");
  assertEqual(context.inventoryState.cookedDishes['honey_yakgwa'], 1, "inventoryState.cookedDishes['honey_yakgwa'] is 1");

  // 3. Successful Cooking: honey_tea
  // Currently: 4 honey remaining. honey_tea needs 2 honey.
  const coinsBeforeTea = context.playerCurrencies.coins;
  const honorBeforeTea = context.playerCurrencies.honor;

  const resCookTea = cookRecipe('honey_tea');
  assertEqual(resCookTea, true, "cookRecipe('honey_tea') succeeds with 4 honey in stock");
  assertEqual(context.inventoryState.ingredients['꿀'], 2, "Honey stock deducted by 2 (4 -> 2)");

  const goldEarnedTea = context.playerCurrencies.coins - coinsBeforeTea;
  const honorEarnedTea = context.playerCurrencies.honor - honorBeforeTea;
  assertEqual(goldEarnedTea, teaRecipe.goldReward, `Gold reward +${teaRecipe.goldReward} granted for honey_tea`);
  assertEqual(honorEarnedTea, teaRecipe.xpReward, `XP/Honor reward +${teaRecipe.xpReward} granted for honey_tea`);

  assert(context.cookingState.cookedRecipes.includes('honey_tea'), "cookingState.cookedRecipes includes 'honey_tea'");
  assertEqual(context.cookingState.totalDishesCooked, 2, "cookingState.totalDishesCooked is 2");
  assertEqual(context.cookingState.recipeStats['honey_tea'], 1, "cookingState.recipeStats['honey_tea'] is 1");
  assertEqual(context.inventoryState.cookedDishes['honey_tea'], 1, "inventoryState.cookedDishes['honey_tea'] is 1");
}

console.log("\n==================================================");
console.log("TEST SUITE 5: Save/Load Persistence (100 Cycles)");
console.log("==================================================");
{
  resetState();

  // Populate state with specific honey inventory & cooking records
  addItemToInventory('honey', 42);
  addItemToInventory('cabbage', 10);

  cookRecipe('honey_tea');     // Uses 2 honey
  cookRecipe('honey_yakgwa');  // Uses 2 honey, 1 cabbage
  cookRecipe('honey_tea');     // Uses 2 honey

  // Initial state reference values
  const expectedHoneyStock = context.inventoryState.ingredients['꿀']; // 36
  const expectedCookedDishes = { ...context.inventoryState.cookedDishes };
  const expectedCookedRecipes = [...context.cookingState.cookedRecipes];
  const expectedTotalDishes = context.cookingState.totalDishesCooked;
  const expectedRecipeStats = { ...context.cookingState.recipeStats };
  const expectedCoins = context.playerCurrencies.coins;
  const expectedHonor = context.playerCurrencies.honor;

  console.log(`Starting state: Honey Stock=${expectedHoneyStock}, DishesCooked=${expectedTotalDishes}, Coins=${expectedCoins}, Honor=${expectedHonor}`);

  let currentSnapshot = collectSave();
  let persistenceFailed = false;

  for (let i = 1; i <= 100; i++) {
    // Corrupt / clear in-memory globals to ensure applySave cleanly restores everything
    context.inventoryState = null;
    context.cookingState = null;
    context.playerCurrencies = { coins: 0, gems: 0, honor: 0 };

    const restored = applySave(currentSnapshot);
    if (!restored) {
      persistenceFailed = true;
      console.error(`  ❌ Save restoration failed on cycle ${i}`);
      break;
    }

    // Re-collect snapshot for next iteration (stress testing serialization fidelity across cycles)
    currentSnapshot = collectSave();
  }

  assert(!persistenceFailed, "All 100 save/load cycles completed successfully");

  // Post-100 cycle verification
  assertEqual(context.inventoryState.ingredients['꿀'], expectedHoneyStock, "Honey stock intact (36) after 100 save/load cycles");
  assertDeepEqual(context.inventoryState.cookedDishes, expectedCookedDishes, "inventoryState.cookedDishes intact after 100 save/load cycles");
  assertDeepEqual(context.cookingState.cookedRecipes.sort(), expectedCookedRecipes.sort(), "cookingState.cookedRecipes intact after 100 save/load cycles");
  assertEqual(context.cookingState.totalDishesCooked, expectedTotalDishes, "cookingState.totalDishesCooked intact (3) after 100 save/load cycles");
  assertDeepEqual(context.cookingState.recipeStats, expectedRecipeStats, "cookingState.recipeStats intact after 100 save/load cycles");
  assertEqual(context.playerCurrencies.coins, expectedCoins, "playerCurrencies.coins intact after 100 save/load cycles");
  assertEqual(context.playerCurrencies.honor, expectedHonor, "playerCurrencies.honor intact after 100 save/load cycles");
}

console.log("\n==================================================");
console.log("TEST SUITE 6: Legacy Save Migration & High-Throughput Cooking");
console.log("==================================================");
{
  resetState();

  // Test Legacy Save Migration (v3 save without cooking field)
  const legacySaveV3 = {
    v: 3,
    gold: 500,
    inventory: {
      maxSlots: 20,
      ingredients: { "꿀": 15, "배추": 10 },
      cookedDishes: { "honey_yakgwa": 3, "honey_tea": 5 }
    }
  };

  const applyResult = applySave(legacySaveV3);
  assertEqual(applyResult, true, "applySave returns true for legacy v3 save data");
  assertEqual(context.cookingState.totalDishesCooked, 8, "Migrated legacy totalDishesCooked is 8 (3 + 5)");
  assert(context.cookingState.cookedRecipes.includes('honey_yakgwa'), "Migrated cookingState.cookedRecipes includes 'honey_yakgwa'");
  assert(context.cookingState.cookedRecipes.includes('honey_tea'), "Migrated cookingState.cookedRecipes includes 'honey_tea'");
  assertEqual(context.cookingState.recipeStats['honey_yakgwa'], 3, "Migrated recipeStats['honey_yakgwa'] is 3");
  assertEqual(context.cookingState.recipeStats['honey_tea'], 5, "Migrated recipeStats['honey_tea'] is 5");

  // High-Throughput Cooking Stress Test
  resetState();
  addItemToInventory('honey', 100);
  addItemToInventory('cabbage', 50);

  // Cook 25 honey_yakgwa in rapid succession (uses 50 honey, 25 cabbage)
  for (let i = 0; i < 25; i++) {
    const ok = cookRecipe('honey_yakgwa');
    if (!ok) break;
  }

  assertEqual(context.inventoryState.ingredients['꿀'], 50, "Honey stock is 50 after cooking 25 honey_yakgwa");
  assertEqual(context.inventoryState.ingredients['배추'], 25, "Cabbage stock is 25 after cooking 25 honey_yakgwa");
  assertEqual(context.cookingState.recipeStats['honey_yakgwa'], 25, "cookingState.recipeStats['honey_yakgwa'] is 25");

  // Cook 25 honey_tea in rapid succession (uses remaining 50 honey)
  for (let i = 0; i < 25; i++) {
    const ok = cookRecipe('honey_tea');
    if (!ok) break;
  }

  assertEqual(typeof context.inventoryState.ingredients['꿀'], 'undefined', "Honey stock is completely depleted and key deleted after 25 honey_tea");
  assertEqual(context.cookingState.recipeStats['honey_tea'], 25, "cookingState.recipeStats['honey_tea'] is 25");
  assertEqual(context.cookingState.totalDishesCooked, 50, "Total dishes cooked across rapid stress test is 50");
}

console.log("\n==================================================");
console.log("SUMMARY OF RESULTS");
console.log("==================================================");
console.log(`Total Assertions: ${totalAssertions}`);
console.log(`Passed:           ${passedAssertions}`);
console.log(`Failed:           ${failedAssertions}`);

if (failedAssertions === 0) {
  console.log("\nVERDICT: PASS");
  process.exit(0);
} else {
  console.log("\nVERDICT: FAIL");
  process.exit(1);
}
