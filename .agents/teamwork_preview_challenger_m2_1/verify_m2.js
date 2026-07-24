const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

console.log("=== HANGEUL VALLEY MILESTONE 2 EMPIRICAL VERIFICATION SUITE ===");

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const assetsGameJsPath = path.join(__dirname, '..', '..', 'assets', 'game.js');
const indexHtmlPath = path.join(__dirname, '..', '..', 'index.html');
const assetsIndexHtmlPath = path.join(__dirname, '..', '..', 'assets', 'index.html');

let assertions = 0;
let passed = 0;
let failed = 0;
const failureDetails = [];

function assert(condition, description) {
  assertions++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${description}`);
    failureDetails.push(description);
  }
}

function assertEqual(actual, expected, description) {
  assertions++;
  if (actual === expected) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${description}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failureDetails.push(`${description} (Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

function assertDeepEqual(actual, expected, description) {
  assertions++;
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${description}: Expected ${expectedStr}, got ${actualStr}`);
    failureDetails.push(`${description} (Expected ${expectedStr}, got ${actualStr})`);
  }
}

// Prepare mock DOM & browser environment for VM
const mockElement = () => ({
  innerHTML: '',
  textContent: '',
  style: {},
  appendChild: () => {},
  removeChild: () => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  className: '',
  onclick: null,
  addEventListener: () => {},
  removeEventListener: () => {}
});

const mockDocument = {
  getElementById: (id) => mockElement(),
  createElement: (tag) => mockElement(),
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => mockElement(),
  querySelectorAll: () => [],
  body: mockElement(),
  head: mockElement()
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { href: '', reload: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  AudioContext: function() { return { createGain: () => ({ connect: () => {} }), destination: {} }; },
  webkitAudioContext: function() { return { createGain: () => ({ connect: () => {} }), destination: {} }; },
  document: mockDocument,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  RegExp: RegExp,
  Error: Error,
  Phaser: {
    Scene: class Scene { constructor() {} },
    Game: class Game { constructor() {} },
    AUTO: 0,
    Math: { Between: (a, b) => a, FloatBetween: (a, b) => a },
    Physics: { ARCADE: 0 },
    Scale: { RESIZE: 0, CENTER_BOTH: 0 }
  }
};

const sandbox = mockWindow;
sandbox.window = mockWindow;

const context = vm.createContext(sandbox);

const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

try {
  vm.runInContext(gameJsCode, context);
  console.log("Successfully loaded game.js in Node VM environment.\n");
} catch (err) {
  console.error("Error executing game.js in VM:", err);
  process.exit(1);
}

// SECTION 1: Dual-file synchronization & Syntax check
console.log("--- Section 1: File Integrity & Dual-File Synchronization ---");
const gameJsHash = crypto.createHash('sha256').update(fs.readFileSync(gameJsPath)).digest('hex');
const assetsGameJsHash = crypto.createHash('sha256').update(fs.readFileSync(assetsGameJsPath)).digest('hex');
assertEqual(gameJsHash, assetsGameJsHash, "game.js and assets/game.js SHA256 hash match");

const indexHtmlHash = crypto.createHash('sha256').update(fs.readFileSync(indexHtmlPath)).digest('hex');
const assetsIndexHtmlHash = crypto.createHash('sha256').update(fs.readFileSync(assetsIndexHtmlPath)).digest('hex');
assertEqual(indexHtmlHash, assetsIndexHtmlHash, "index.html and assets/index.html SHA256 hash match");

// SECTION 2: COOKING_RECIPES structure & validity
console.log("\n--- Section 2: COOKING_RECIPES Structure & Data Validity ---");
assert(Array.isArray(context.COOKING_RECIPES), "COOKING_RECIPES is an Array");
assertEqual(context.COOKING_RECIPES.length, 10, "COOKING_RECIPES contains exactly 10 recipes");

const expectedRecipeIds = [
  'kimchi', 'radish_rice', 'roasted_corn', 'strawberry_jam', 'gimbap',
  'tteokbokki', 'gamjajeon', 'bibimbap', 'bulgogi', 'samgyetang'
];

const actualRecipeIds = context.COOKING_RECIPES.map(r => r.id);
assertDeepEqual(actualRecipeIds, expectedRecipeIds, "COOKING_RECIPES contains all 10 expected recipe IDs");

context.COOKING_RECIPES.forEach((recipe, idx) => {
  assert(typeof recipe.id === 'string' && recipe.id.length > 0, `Recipe [${idx}] has non-empty string id`);
  assert(typeof recipe.nameEn === 'string' && recipe.nameEn.length > 0, `Recipe [${recipe.id}] has non-empty nameEn`);
  assert(typeof recipe.nameKo === 'string' && recipe.nameKo.length > 0, `Recipe [${recipe.id}] has non-empty nameKo`);
  assert(typeof recipe.icon === 'string' && recipe.icon.length > 0, `Recipe [${recipe.id}] has non-empty icon`);
  assert(typeof recipe.description === 'string', `Recipe [${recipe.id}] has string description`);
  assert(Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0, `Recipe [${recipe.id}] has non-empty ingredients array`);
  assert(typeof recipe.xpReward === 'number' && recipe.xpReward >= 0, `Recipe [${recipe.id}] has non-negative numeric xpReward (${recipe.xpReward})`);
  assert(typeof recipe.goldReward === 'number' && recipe.goldReward >= 0, `Recipe [${recipe.id}] has non-negative numeric goldReward (${recipe.goldReward})`);

  recipe.ingredients.forEach((ing, ingIdx) => {
    assert(typeof ing.itemId === 'string', `Recipe [${recipe.id}] ing[${ingIdx}] has string itemId`);
    assert(typeof ing.count === 'number' && ing.count > 0, `Recipe [${recipe.id}] ing[${ingIdx}] has count > 0`);
    
    // Verify getItemInfo resolves this itemId to a valid ITEM_DB item
    const itemInfo = context.getItemInfo(ing.itemId);
    assert(itemInfo && itemInfo.key && itemInfo.key !== 'unknown', `Recipe [${recipe.id}] ingredient '${ing.itemId}' resolves in ITEM_DB (key: ${itemInfo.key})`);
  });
});

// SECTION 3: cookRecipe logic & error handling
console.log("\n--- Section 3: cookRecipe Logic, Ingredient Deduction & Rewards ---");

function resetState() {
  context.playerCurrencies = { coins: 100, gems: 0, honor: 0 };
  context.gold = 100;
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
  context.unlockedTrophies = [];
}

resetState();

// 3.1 Invalid recipe IDs and edge cases
[null, undefined, '', 'non_existent_recipe', 123, {}].forEach(invalidId => {
  const result = context.cookRecipe(invalidId);
  assertEqual(result, false, `cookRecipe(${JSON.stringify(invalidId)}) safely returns false`);
});

// 3.2 Insufficient ingredients
resetState();
context.inventoryState.ingredients = { '배추': 1 }; // Needs 1 cabbage, 1 chili, 1 garlic for kimchi
const cookInsufficientResult = context.cookRecipe('kimchi');
assertEqual(cookInsufficientResult, false, "cookRecipe('kimchi') returns false with partial ingredients");
assertEqual(context.inventoryState.ingredients['배추'], 1, "Ingredients not consumed on failed cook");
assertEqual(context.cookingState.cookedRecipes.length, 0, "cookedRecipes empty on failed cook");

// 3.3 Zero and negative inventory count edge cases
resetState();
context.inventoryState.ingredients = { '배추': 0, '고추': 1, '마늘': 1 };
assertEqual(context.cookRecipe('kimchi'), false, "cookRecipe returns false when ingredient count is 0");

context.inventoryState.ingredients = { '배추': -5, '고추': 1, '마늘': 1 };
assertEqual(context.cookRecipe('kimchi'), false, "cookRecipe returns false when ingredient count is negative");

// 3.4 Multi-count requirement deduction (Samgyetang: 2 rice, 2 garlic, 1 radish, 1 green onion)
resetState();
context.inventoryState.ingredients = { '쌀': 5, '마늘': 3, '무': 1, '파': 2 };
const cookSamgyetangResult = context.cookRecipe('samgyetang');
assertEqual(cookSamgyetangResult, true, "cookRecipe('samgyetang') returns true with sufficient multi-count ingredients");
assertEqual(context.inventoryState.ingredients['쌀'], 3, "Rice count reduced from 5 to 3 (-2)");
assertEqual(context.inventoryState.ingredients['마늘'], 1, "Garlic count reduced from 3 to 1 (-2)");
assert(typeof context.inventoryState.ingredients['무'] === 'undefined', "Radish (-1) completely removed from ingredients");
assertEqual(context.inventoryState.ingredients['파'], 1, "Green Onion count reduced from 2 to 1 (-1)");
assertEqual(context.playerCurrencies.coins, 260, "Coins increased by 160 (100 -> 260)");
assertEqual(context.playerCurrencies.honor, 130, "Honor (XP) increased by 130 (0 -> 130)");

// 3.5 Successful cook of Kimchi
resetState();
context.inventoryState.ingredients = { '배추': 2, '고추': 1, '마늘': 1 };
const cookKimchiResult = context.cookRecipe('kimchi');
assertEqual(cookKimchiResult, true, "cookRecipe('kimchi') returns true with sufficient ingredients");
assertEqual(context.inventoryState.ingredients['배추'], 1, "1 Cabbage remaining after cooking Kimchi (2 -> 1)");
assert(typeof context.inventoryState.ingredients['고추'] === 'undefined', "Chili completely consumed and key removed from ingredients");
assert(typeof context.inventoryState.ingredients['마늘'] === 'undefined', "Garlic completely consumed and key removed from ingredients");
assertEqual(context.playerCurrencies.coins, 130, "Coins increased by 30 (100 -> 130)");
assertEqual(context.playerCurrencies.honor, 25, "Honor (XP) increased by 25 (0 -> 25)");
assertDeepEqual(context.cookingState.cookedRecipes, ['kimchi'], "cookingState.cookedRecipes contains ['kimchi']");
assertEqual(context.cookingState.totalDishesCooked, 1, "cookingState.totalDishesCooked is 1");
assertEqual(context.cookingState.recipeStats['kimchi'], 1, "cookingState.recipeStats['kimchi'] is 1");
assertEqual(context.inventoryState.cookedDishes['kimchi'], 1, "inventoryState.cookedDishes['kimchi'] is 1");

// 3.6 Cooking Kimchi a second time
context.inventoryState.ingredients = { '배추': 1, '고추': 1, '마늘': 1 };
const cookKimchi2Result = context.cookRecipe('kimchi');
assertEqual(cookKimchi2Result, true, "cookRecipe('kimchi') second time returns true");
assertEqual(context.playerCurrencies.coins, 160, "Coins increased by 30 again (130 -> 160)");
assertEqual(context.playerCurrencies.honor, 50, "Honor increased by 25 again (25 -> 50)");
assertDeepEqual(context.cookingState.cookedRecipes, ['kimchi'], "cookedRecipes still has no duplicates (['kimchi'])");
assertEqual(context.cookingState.totalDishesCooked, 2, "totalDishesCooked incremented to 2");
assertEqual(context.cookingState.recipeStats['kimchi'], 2, "recipeStats['kimchi'] incremented to 2");

// SECTION 4: Sequential All 10 Recipes Cooking & Master Chef Trophy
console.log("\n--- Section 4: Sequential All 10 Recipes Cooking & Master Chef Trophy ---");
resetState();
// Populate inventory with enough ingredients for ALL 10 recipes
context.inventoryState.ingredients = {
  '배추': 10, '무': 10, '파': 10, '고추': 10, '마늘': 10,
  '쌀': 10, '콩': 10, '당근': 10, '감자': 10, '옥수수': 10, '딸기': 10
};

expectedRecipeIds.forEach((recId, idx) => {
  assert(!context.unlockedTrophies.includes('master_chef'), `master_chef not unlocked before cooking recipe #${idx + 1} (${recId})`);
  const ok = context.cookRecipe(recId);
  assertEqual(ok, true, `Successfully cooked recipe #${idx + 1}: ${recId}`);
  if (idx < 9) {
    assert(!context.unlockedTrophies.includes('master_chef'), `master_chef still locked after cooking ${idx + 1}/10 recipes`);
  }
});

assert(context.unlockedTrophies.includes('master_chef'), "master_chef trophy AUTOMATICALLY UNLOCKED after cooking 10th recipe!");
assertEqual(context.cookingState.cookedRecipes.length, 10, "cookingState.cookedRecipes contains exactly 10 unique cooked recipes");
assertEqual(context.cookingState.totalDishesCooked, 10, "cookingState.totalDishesCooked is 10");

// Check idempotency (duplicate prevention)
context.checkCookingAchievements();
const trophyCount = context.unlockedTrophies.filter(t => t === 'master_chef').length;
assertEqual(trophyCount, 1, "master_chef trophy appears exactly once in unlockedTrophies after repeated achievement checks");

// SECTION 5: collectSave & applySave roundtrip persistence
console.log("\n--- Section 5: collectSave & applySave Roundtrip Persistence ---");

resetState();
context.playerCurrencies = { coins: 550, gems: 20, honor: 340 };
context.gold = 550;
context.inventoryState = {
  maxSlots: 25,
  ingredients: { '배추': 5, '쌀': 10 },
  seeds: {},
  scrolls: 2,
  cookedDishes: { 'kimchi': 3, 'radish_rice': 2 }
};
context.cookingState = {
  cookedRecipes: ['kimchi', 'radish_rice', 'roasted_corn'],
  totalDishesCooked: 5,
  recipeStats: { 'kimchi': 3, 'radish_rice': 2 }
};
context.unlockedTrophies = ['first_harvest', 'master_chef'];

const saveData = context.collectSave();
assert(saveData !== null && typeof saveData === 'object', "collectSave() returned a non-null save object");
assertEqual(saveData.v, 4, "Save data version is 4");
assertDeepEqual(saveData.cooking, context.cookingState, "collectSave() captured cookingState accurately");
assertDeepEqual(saveData.inventory, context.inventoryState, "collectSave() captured inventoryState accurately");
assertDeepEqual(saveData.unlockedTrophies, context.unlockedTrophies, "collectSave() captured unlockedTrophies accurately");

// Clear memory state
context.playerCurrencies = { coins: 0, gems: 0, honor: 0 };
context.gold = 0;
context.inventoryState = null;
context.cookingState = null;
context.unlockedTrophies = [];

// Apply save snapshot
const applyResult = context.applySave(saveData);
assertEqual(applyResult, true, "applySave returned true on valid save data");
assertEqual(context.playerCurrencies.coins, 550, "applySave restored coins: 550");
assertEqual(context.playerCurrencies.honor, 340, "applySave restored honor: 340");
assertEqual(context.inventoryState.maxSlots, 25, "applySave restored inventory maxSlots: 25");
assertEqual(context.inventoryState.ingredients['배추'], 5, "applySave restored inventory ingredient '배추': 5");
assertDeepEqual(context.cookingState.cookedRecipes, ['kimchi', 'radish_rice', 'roasted_corn'], "applySave restored cookingState.cookedRecipes");
assertEqual(context.cookingState.totalDishesCooked, 5, "applySave restored totalDishesCooked: 5");
assertDeepEqual(context.cookingState.recipeStats, { 'kimchi': 3, 'radish_rice': 2 }, "applySave restored recipeStats");
assert(context.unlockedTrophies.includes('master_chef'), "applySave restored master_chef trophy");

// Double roundtrip check (JSON stringify/parse cycle)
const jsonString = JSON.stringify(context.collectSave());
const parsedSave = JSON.parse(jsonString);
context.applySave(parsedSave);
assertEqual(context.cookingState.totalDishesCooked, 5, "Double roundtrip JSON serialization preserved totalDishesCooked");
assertDeepEqual(context.cookingState.cookedRecipes, ['kimchi', 'radish_rice', 'roasted_corn'], "Double roundtrip JSON serialization preserved cookedRecipes");

// SECTION 6: Legacy Save Data Migration (v1/v3 -> v4)
console.log("\n--- Section 6: Legacy Save Data Migration ---");

const legacySave = {
  v: 3,
  gold: 200,
  inventory: {
    maxSlots: 20,
    ingredients: { '배추': 2 },
    cookedDishes: { 'kimchi': 4, 'gimbap': 1 }
  }
};

context.applySave(legacySave);
assert(context.cookingState !== null, "Legacy save migrated cookingState object");
assertDeepEqual(context.cookingState.cookedRecipes.sort(), ['gimbap', 'kimchi'], "Legacy save reconstructed cookedRecipes from inventory.cookedDishes");
assertEqual(context.cookingState.totalDishesCooked, 5, "Legacy save calculated totalDishesCooked (4 + 1 = 5)");
assertEqual(context.cookingState.recipeStats['kimchi'], 4, "Legacy save reconstructed recipeStats for kimchi (4)");

// Corrupted / Partial Save Data Resilience
const corruptedSave = {
  v: 4,
  cooking: { cookedRecipes: null, totalDishesCooked: "invalid", recipeStats: null }
};
const corruptedApplyResult = context.applySave(corruptedSave);
assertEqual(corruptedApplyResult, true, "applySave handled corrupted cooking object without crashing");
assert(Array.isArray(context.cookingState.cookedRecipes), "Corrupted save normalized cookedRecipes to Array");
assertEqual(context.cookingState.totalDishesCooked, 0, "Corrupted save normalized totalDishesCooked to 0");

// SECTION 7: DOM Modal & UI Markup Audit in index.html
console.log("\n--- Section 7: DOM Modal & UI Markup Audit ---");
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

assert(indexHtmlContent.includes('id="cooking-overlay"'), "index.html contains #cooking-overlay modal element");
assert(indexHtmlContent.includes('id="cooking-recipe-list"'), "index.html contains #cooking-recipe-list container");
assert(indexHtmlContent.includes('id="cooking-detail-view"'), "index.html contains #cooking-detail-view container");
assert(indexHtmlContent.includes('id="cooking-pantry-bar"'), "index.html contains #cooking-pantry-bar element");
assert(indexHtmlContent.includes('id="cooking-progress-badge"'), "index.html contains #cooking-progress-badge element");
assert(indexHtmlContent.includes('openCookingUI()') || indexHtmlContent.includes('id="cooking-btn"'), "index.html contains cooking button / openCookingUI action");

// SUMMARY REPORT
console.log("\n==================================================");
console.log(`TEST RESULTS: ${passed} / ${assertions} PASSED (${failed} FAILED)`);
console.log("==================================================");

if (failed > 0) {
  console.error("FAILURES ENCOUNTERED:");
  failureDetails.forEach(f => console.error(` - ${f}`));
  process.exit(1);
} else {
  console.log("ALL EMPIRICAL VERIFICATION TESTS PASSED SUCCESSFULLY! ✅");
  process.exit(0);
}
