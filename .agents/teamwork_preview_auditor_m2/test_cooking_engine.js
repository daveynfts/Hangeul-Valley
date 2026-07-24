const fs = require('fs');
const vm = require('vm');

// Dummy element helper
function createDummyElement() {
  return {
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    innerHTML: '',
    textContent: '',
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

// Prepare comprehensive DOM mock environment for Node
const domWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  location: { reload: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: (id) => createDummyElement(),
    querySelector: () => createDummyElement(),
    querySelectorAll: () => [],
    createElement: () => createDummyElement(),
    body: createDummyElement()
  },
  Phaser: {
    Game: function() {},
    Scene: function() {},
    AUTO: 'AUTO',
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    Math: { Between: () => 0 },
    Physics: { ARCADE: 1 }
  },
  showToast: () => {},
  playChiptuneSFX: () => {},
  persistSave: () => {},
  updateCurrencyHUD: () => {},
  renderInventoryGrid: () => {},
  renderTrophies: () => {},
  setModalState: () => {}
};

domWindow.window = domWindow;

const code = fs.readFileSync('d:\\Hangeul Valley\\game.js', 'utf8');

// Execute game.js in vm context
const sandbox = vm.createContext(domWindow);
try {
  vm.runInContext(code, sandbox);
  console.log("✓ game.js loaded into VM successfully");
} catch (e) {
  console.error("❌ VM Execution Error:", e);
  process.exit(1);
}

// Extract functions & variables
const {
  COOKING_RECIPES,
  cookRecipe,
  checkCookingAchievements,
  addItemToInventory,
  removeItemFromInventory,
  collectSave,
  applySave,
  getItemInfo
} = sandbox;

console.log(`✓ Loaded ${COOKING_RECIPES.length} recipes.`);

// Reset inventory ingredients to empty for strict isolation test
sandbox.inventoryState.ingredients = {};

// Test 1: Cook without ingredients should FAIL
let res1 = cookRecipe('kimchi');
if (res1 === false) {
  console.log("✓ Test 1 Passed: Cannot cook Kimchi without ingredients.");
} else {
  console.error("❌ Test 1 Failed: Cooked Kimchi without ingredients!");
  process.exit(1);
}

// Test 2: Add partial ingredients for Kimchi (cabbage=1, chili=1, but missing garlic)
addItemToInventory('cabbage', 1);
addItemToInventory('chili', 1);
let res2 = cookRecipe('kimchi');
if (res2 === false) {
  console.log("✓ Test 2 Passed: Cannot cook Kimchi with missing garlic.");
} else {
  console.error("❌ Test 2 Failed: Cooked Kimchi with missing ingredient!");
  process.exit(1);
}

// Verify inventory items were NOT deducted on failed cook
if (sandbox.inventoryState.ingredients['배추'] === 1 && sandbox.inventoryState.ingredients['고추'] === 1) {
  console.log("✓ Test 2b Passed: Inventory was NOT deducted on failed cooking attempt.");
} else {
  console.error("❌ Test 2b Failed: Inventory was improperly deducted on failure!", sandbox.inventoryState.ingredients);
  process.exit(1);
}

// Record initial currency values before cooking Kimchi
const initialCoins = sandbox.playerCurrencies.coins;
const initialHonor = sandbox.playerCurrencies.honor;

// Test 3: Add remaining ingredient (garlic=1) and cook Kimchi
addItemToInventory('garlic', 1);
let res3 = cookRecipe('kimchi');
if (res3 === true) {
  console.log("✓ Test 3 Passed: Successfully cooked Kimchi when ingredients are present.");
} else {
  console.error("❌ Test 3 Failed: Failed to cook Kimchi despite having all ingredients!");
  process.exit(1);
}

// Check real inventory deduction
if (sandbox.inventoryState.ingredients['배추'] === undefined &&
    sandbox.inventoryState.ingredients['고추'] === undefined &&
    sandbox.inventoryState.ingredients['마늘'] === undefined) {
  console.log("✓ Test 3b Passed: Cabbage, chili, garlic accurately deducted and removed from inventory.");
} else {
  console.error("❌ Test 3b Failed: Inventory items were not deducted correctly!", sandbox.inventoryState.ingredients);
  process.exit(1);
}

// Check rewards granted (+30 Coins, +25 Honor XP)
console.log("Coins:", sandbox.playerCurrencies.coins, "Honor XP:", sandbox.playerCurrencies.honor);
if (sandbox.playerCurrencies.coins === initialCoins + 30 && sandbox.playerCurrencies.honor === initialHonor + 25) {
  console.log("✓ Test 3c Passed: Gold (+30) and Vocab Honor XP (+25) correctly granted for Kimchi.");
} else {
  console.error("❌ Test 3c Failed: Rewards not granted correctly!", sandbox.playerCurrencies);
  process.exit(1);
}

// Check cooking state update
if (sandbox.cookingState.cookedRecipes.includes('kimchi') && sandbox.cookingState.totalDishesCooked === 1) {
  console.log("✓ Test 3d Passed: cookingState updated correctly with 'kimchi' and totalDishesCooked = 1.");
} else {
  console.error("❌ Test 3d Failed: cookingState did not update!", sandbox.cookingState);
  process.exit(1);
}

// Test 4: Master Chef Trophy Unlock Condition (Cook all 10 recipes)
console.log("Testing 100% Cooking Achievement unlock...");

// Add ingredients for all remaining 9 recipes
// Recipe 2: radish_rice (rice 1, radish 1)
addItemToInventory('rice', 1); addItemToInventory('radish', 1);
cookRecipe('radish_rice');

// Recipe 3: roasted_corn (corn 2)
addItemToInventory('corn', 2);
cookRecipe('roasted_corn');

// Recipe 4: strawberry_jam (strawberry 2)
addItemToInventory('strawberry', 2);
cookRecipe('strawberry_jam');

// Recipe 5: gimbap (rice 1, carrot 1, radish 1)
addItemToInventory('rice', 1); addItemToInventory('carrot', 1); addItemToInventory('radish', 1);
cookRecipe('gimbap');

// Recipe 6: tteokbokki (rice 2, chili 1, green_onion 1)
addItemToInventory('rice', 2); addItemToInventory('chili', 1); addItemToInventory('green_onion', 1);
cookRecipe('tteokbokki');

// Recipe 7: gamjajeon (potato 2, green_onion 1, garlic 1)
addItemToInventory('potato', 2); addItemToInventory('green_onion', 1); addItemToInventory('garlic', 1);
cookRecipe('gamjajeon');

// Recipe 8: bibimbap (rice 1, cabbage 1, carrot 1, soybean 1)
addItemToInventory('rice', 1); addItemToInventory('cabbage', 1); addItemToInventory('carrot', 1); addItemToInventory('soybean', 1);
cookRecipe('bibimbap');

// Recipe 9: bulgogi (green_onion 2, garlic 2, soybean 1)
addItemToInventory('green_onion', 2); addItemToInventory('garlic', 2); addItemToInventory('soybean', 1);
cookRecipe('bulgogi');

// Before 10th recipe: master_chef trophy should NOT be unlocked yet (9/10 cooked)
if (!sandbox.unlockedTrophies.includes('master_chef')) {
  console.log("✓ Test 4a Passed: 'master_chef' trophy is NOT unlocked at 9/10 recipes.");
} else {
  console.error("❌ Test 4a Failed: 'master_chef' trophy was unlocked prematurely!");
  process.exit(1);
}

// Recipe 10: samgyetang (rice 2, garlic 2, radish 1, green_onion 1)
addItemToInventory('rice', 2); addItemToInventory('garlic', 2); addItemToInventory('radish', 1); addItemToInventory('green_onion', 1);
cookRecipe('samgyetang');

// After 10th recipe: master_chef trophy MUST be unlocked
if (sandbox.unlockedTrophies.includes('master_chef')) {
  console.log("✓ Test 4b Passed: 'master_chef' trophy unlocked upon 10/10 recipes cooked!");
} else {
  console.error("❌ Test 4b Failed: 'master_chef' trophy was NOT unlocked after cooking all 10 recipes!", sandbox.unlockedTrophies);
  process.exit(1);
}

// Test 5: Save/Load Roundtrip test
console.log("Testing Save / Load persistence...");
const savedData = collectSave();
if (!savedData.cooking || !Array.isArray(savedData.cooking.cookedRecipes) || savedData.cooking.cookedRecipes.length !== 10) {
  console.error("❌ Test 5a Failed: collectSave() did not capture cookingState properly!", savedData.cooking);
  process.exit(1);
}
console.log("✓ Test 5a Passed: collectSave() serialized cookingState with 10 cooked recipes.");

// Clear state and applySave
sandbox.cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
sandbox.unlockedTrophies = [];
applySave(savedData);

if (sandbox.cookingState.cookedRecipes.length === 10 && sandbox.unlockedTrophies.includes('master_chef')) {
  console.log("✓ Test 5b Passed: applySave() restored cookingState and re-checked achievements successfully.");
} else {
  console.error("❌ Test 5b Failed: applySave() failed to restore cooking state!", sandbox.cookingState, sandbox.unlockedTrophies);
  process.exit(1);
}

console.log("\n💯 ALL BEHAVIORAL INTEGRITY TESTS PASSED!");
