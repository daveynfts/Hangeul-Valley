# Milestone 2: Recipe Data & Cooking Execution Engine Analysis

## Executive Summary
This report defines the **Recipe Data Architecture** and **Cooking Execution Engine (`cookRecipe`)** for Milestone 2 of Hangeul Valley. 

The architecture introduces:
1. **10 Authentic Korean Cooking Recipes** of tiered difficulty (Novice, Intermediate, Advanced, Master) using harvested crop ingredients (`배추`/Cabbage, `무`/Radish, `파`/Green Onion, `고추`/Chili, `마늘`/Garlic, `쌀`/Rice, `콩`/Soybean, `당근`/Carrot, `감자`/Potato, `옥수수`/Corn, `딸기`/Strawberry).
2. **`cookRecipe(recipeId)` Execution Engine**: A robust 7-step execution pipeline that verifies ingredient availability, deducts inventory items via `removeItemFromInventory()`, awards Gold and Vocab XP, tracks cooked dish metrics, triggers UI refreshes, and evaluates achievement/trophy unlocks upon 100% recipe completion.

---

## 1. Recipe Data Architecture

### Item & Ingredient Mapping Strategy
In `game.js`, `ITEM_DB` maps Korean item keys (`'배추'`) to English IDs (`'cabbage'`). The helper `getItemInfo(keyOrId)` supports lookup by either Korean key or English ID.

To ensure all harvested crops in the recipes are fully supported, `ITEM_DB` in `game.js` should include:
- `배추` (`cabbage`): Napa Cabbage 🥬
- `무` (`radish`): Korean Radish 🥔
- `파` (`green_onion`): Green Onion 🌱
- `고추` (`chili`): Chili Pepper 🌶️
- `마늘` (`garlic`): Garlic 🧄
- `쌀` (`rice`): Rice 🌾
- `콩` (`soybean`): Soybean 🫘
- `당근` (`carrot`): Carrot 🥕
- `감자` (`potato`): Potato 🥔 *(New crop addition)*
- `옥수수` (`corn`): Corn 🌽 *(New crop addition)*
- `딸기` (`strawberry`): Strawberry 🍓 *(New crop addition)*

### Recipe Schema
Each recipe is defined as an object with the following required schema:
```typescript
interface CookingRecipe {
  id: string; // Unique identifier (e.g. 'kimchi', 'bibimbap')
  nameEn: string; // English dish name (e.g. 'Kimchi')
  nameKo: string; // Korean dish name (e.g. '김치')
  icon: string; // Display emoji icon (e.g. '🥬')
  description: string; // Flavor text & lore
  ingredients: Array<{ itemId: string; count: number }>; // Required crops/items
  xpReward: number; // Vocab XP / Honor granted
  goldReward: number; // Gold/Coins awarded
}
```

### 10 Cooking Recipes Definition Matrix

| Tier | Recipe ID | Name (Ko / En) | Icon | Ingredients (`itemId` & `count`) | XP | Gold | Description |
|---|---|---|---|---|---|---|---|
| **Tier 1 (Novice)** | `kimchi` | 김치 / Kimchi | 🥬 | Cabbage: 1, Chili: 1, Garlic: 1 | 25 | 30 | Traditional fermented spicy Napa cabbage with chili and garlic. |
| **Tier 1 (Novice)** | `radish_rice` | 무밥 / Radish Rice | 🍚 | Rice: 1, Radish: 1 | 20 | 25 | Comforting Korean steamed rice infused with sweet sliced radish. |
| **Tier 1 (Novice)** | `roasted_corn` | 옥수수구이 / Roasted Corn | 🌽 | Corn: 2 | 20 | 20 | Sweet juicy corn on the cob roasted over open farm embers. |
| **Tier 1 (Novice)** | `strawberry_jam` | 딸기잼 / Strawberry Jam | 🍓 | Strawberry: 2 | 22 | 25 | Sweet homemade jam boiled down from fresh garden strawberries. |
| **Tier 2 (Intermediate)** | `gimbap` | 김밥 / Gimbap | 🍱 | Rice: 1, Carrot: 1, Radish: 1 | 40 | 50 | Savory seaweed rice roll filled with carrots and pickled radish. |
| **Tier 2 (Intermediate)** | `tteokbokki` | 떡볶이 / Tteokbokki | 🍢 | Rice: 2, Chili: 1, Green Onion: 1 | 45 | 55 | Chewy rice cakes simmered in spicy gochujang and green onion. |
| **Tier 3 (Advanced)** | `gamjajeon` | 감자전 / Potato Pancake | 🥔 | Potato: 2, Green Onion: 1, Garlic: 1 | 65 | 75 | Crispy pan-fried potato pancake with green onion and garlic. |
| **Tier 3 (Advanced)** | `bibimbap` | 비빔밥 / Bibimbap | 🥗 | Rice: 1, Cabbage: 1, Carrot: 1, Soybean: 1 | 75 | 90 | Nourishing rice bowl topped with cabbage, carrot, soybean & chili. |
| **Tier 4 (Master)** | `bulgogi` | 불고기 / Bulgogi | 🍖 | Green Onion: 2, Garlic: 2, Soybean: 1 | 95 | 115 | Flavorful marinated dish with garlic, green onion & soybeans. |
| **Tier 4 (Master)** | `samgyetang` | 궁중 삼계탕 / Samgyetang | 🍲 | Rice: 2, Garlic: 2, Radish: 1, Green Onion: 1 | 130 | 160 | Royal ginseng chicken soup cooked with rice, garlic, radish & green onion. |

### Complete `COOKING_RECIPES` Data Array (JavaScript)
```javascript
const COOKING_RECIPES = [
  {
    id: 'kimchi',
    nameEn: 'Kimchi',
    nameKo: '김치',
    icon: '🥬',
    description: 'Traditional spicy fermented Napa cabbage with chili and garlic.',
    ingredients: [
      { itemId: 'cabbage', count: 1 },
      { itemId: 'chili', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 25,
    goldReward: 30
  },
  {
    id: 'radish_rice',
    nameEn: 'Radish Rice',
    nameKo: '무밥',
    icon: '🍚',
    description: 'Comforting Korean steamed rice infused with sweet sliced radish.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 20,
    goldReward: 25
  },
  {
    id: 'roasted_corn',
    nameEn: 'Roasted Corn',
    nameKo: '옥수수구이',
    icon: '🌽',
    description: 'Sweet juicy corn on the cob roasted over open farm embers.',
    ingredients: [
      { itemId: 'corn', count: 2 }
    ],
    xpReward: 20,
    goldReward: 20
  },
  {
    id: 'strawberry_jam',
    nameEn: 'Strawberry Jam',
    nameKo: '딸기잼',
    icon: '🍓',
    description: 'Sweet homemade jam boiled down from fresh garden strawberries.',
    ingredients: [
      { itemId: 'strawberry', count: 2 }
    ],
    xpReward: 22,
    goldReward: 25
  },
  {
    id: 'gimbap',
    nameEn: 'Gimbap',
    nameKo: '김밥',
    icon: '🍱',
    description: 'Savory seaweed rice roll filled with carrots and pickled radish.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'carrot', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 40,
    goldReward: 50
  },
  {
    id: 'tteokbokki',
    nameEn: 'Tteokbokki',
    nameKo: '떡볶이',
    icon: '🍢',
    description: 'Chewy rice cakes simmered in spicy gochujang and green onion.',
    ingredients: [
      { itemId: 'rice', count: 2 },
      { itemId: 'chili', count: 1 },
      { itemId: 'green_onion', count: 1 }
    ],
    xpReward: 45,
    goldReward: 55
  },
  {
    id: 'gamjajeon',
    nameEn: 'Potato Pancake',
    nameKo: '감자전',
    icon: '🥔',
    description: 'Crispy pan-fried potato pancake seasoned with green onions and garlic.',
    ingredients: [
      { itemId: 'potato', count: 2 },
      { itemId: 'green_onion', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 65,
    goldReward: 75
  },
  {
    id: 'bibimbap',
    nameEn: 'Bibimbap',
    nameKo: '비빔밥',
    icon: '🥗',
    description: 'Nourishing bowl of rice topped with cabbage, carrot, soybean, and chili.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'cabbage', count: 1 },
      { itemId: 'carrot', count: 1 },
      { itemId: 'soybean', count: 1 }
    ],
    xpReward: 75,
    goldReward: 90
  },
  {
    id: 'bulgogi',
    nameEn: 'Bulgogi',
    nameKo: '불고기',
    icon: '🍖',
    description: 'Flavorful marinated dish with garlic, green onions, and soybeans.',
    ingredients: [
      { itemId: 'green_onion', count: 2 },
      { itemId: 'garlic', count: 2 },
      { itemId: 'soybean', count: 1 }
    ],
    xpReward: 95,
    goldReward: 115
  },
  {
    id: 'samgyetang',
    nameEn: 'Samgyetang',
    nameKo: '삼계탕',
    icon: '🍲',
    description: 'Royal ginseng chicken soup cooked with rice, garlic, radish, and green onions.',
    ingredients: [
      { itemId: 'rice', count: 2 },
      { itemId: 'garlic', count: 2 },
      { itemId: 'radish', count: 1 },
      { itemId: 'green_onion', count: 1 }
    ],
    xpReward: 130,
    goldReward: 160
  }
];
```

---

## 2. Cooking Execution Engine (`cookRecipe`)

### 7-Step Algorithmic Pipeline
The `cookRecipe(recipeId)` function executes the following sequence:

1. **Recipe Resolution**:
   - Looks up `recipeId` in `COOKING_RECIPES`.
   - If not found, aborts with warning toast.

2. **Ingredient Availability Verification**:
   - Normalizes ingredient requirements list (`[{itemId, count}]`).
   - For each requirement, resolves the inventory key using `getItemInfo(itemId).key`.
   - Checks `inventoryState.ingredients[key] >= count`.
   - If any ingredient is insufficient, displays toast specifying missing item and amount, then returns `false`.

3. **Ingredient Deduction**:
   - Loops over requirements and calls `removeItemFromInventory(req.itemId, req.count)`.
   - `removeItemFromInventory` handles slot decrementing, removing empty keys, and calling `persistSave()`.

4. **Reward Distribution**:
   - Calls `addCoins(recipe.goldReward)` to update player gold/coins, sync aliases, and update HUD.
   - Calls `addHonor(recipe.xpReward)` or updates `inventoryState.vocabXP += recipe.xpReward` to reward language learning progress.

5. **Dish Record & State Update**:
   - Increments cooked dish count: `inventoryState.cookedDishes[recipe.id] = (inventoryState.cookedDishes[recipe.id] || 0) + 1`.
   - Persists state via `persistSave()`.
   - Triggers chiptune audio feedback (`playChiptuneSFX('complete')`).
   - Shows success toast: `"🍳 Cooked [nameKo]! +[gold] 🪙 Gold, +[xp] ⭐ XP!"`.

6. **UI Refresh**:
   - Calls `renderInventoryGrid()` if inventory modal is open.
   - Re-renders `openRecipeBook()` pantry stock and card states if cooking modal is active.
   - Calls `updateCurrencyHUD()`.

7. **Achievement & Trophy Check**:
   - Invokes `checkCookingAchievements()`.
   - Checks if total unique dishes cooked in `inventoryState.cookedDishes` equals `COOKING_RECIPES.length`.
   - If 100% completed, unlocks `'trophy_master_chef'` in `unlockedTrophies` and displays achievement toast!

### Complete `cookRecipe(recipeId)` Implementation (JavaScript)

```javascript
function cookRecipe(recipeId) {
  if (!recipeId) return false;

  // 1. Find Recipe Definition
  const recipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
    ? COOKING_RECIPES
    : ((typeof RECIPE_DB !== 'undefined') ? RECIPE_DB : []);

  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) {
    if (typeof showToast === 'function') showToast(`⚠️ Recipe '${recipeId}' not found!`);
    return false;
  }

  // Normalize ingredients format
  let reqs = [];
  if (Array.isArray(recipe.ingredients)) {
    reqs = recipe.ingredients;
  } else if (recipe.req && typeof recipe.req === 'object') {
    reqs = Object.entries(recipe.req).map(([k, cnt]) => ({ itemId: k, count: cnt }));
  }

  // 2. Ingredient Availability Verification
  const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
  for (const req of reqs) {
    const info = getItemInfo(req.itemId);
    const key = info.key || req.itemId;
    const have = ingMap[key] || 0;
    if (have < req.count) {
      if (typeof showToast === 'function') {
        showToast(`⚠️ Missing ingredient for ${recipe.nameKo || recipe.nameEn}: Need ${req.count}x ${info.nameKo || key} (have ${have})`);
      }
      return false;
    }
  }

  // 3. Deduct Ingredients via removeItemFromInventory
  for (const req of reqs) {
    const success = removeItemFromInventory(req.itemId, req.count);
    if (!success) {
      if (typeof showToast === 'function') {
        showToast(`⚠️ Failed to remove ingredient ${req.itemId}!`);
      }
      return false;
    }
  }

  // 4. Reward Distribution (Gold & Vocab XP)
  const gold = recipe.goldReward || 0;
  const xp = recipe.xpReward || 0;

  if (gold > 0 && typeof addCoins === 'function') {
    addCoins(gold);
  }

  if (xp > 0) {
    if (typeof addHonor === 'function') {
      addHonor(xp);
    } else {
      inventoryState.vocabXP = (inventoryState.vocabXP || 0) + xp;
    }
  }

  // 5. Record Cooked Dish Count
  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.cookedDishes[recipe.id] = (inventoryState.cookedDishes[recipe.id] || 0) + 1;

  if (typeof persistSave === 'function') persistSave();
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('complete');

  if (typeof showToast === 'function') {
    showToast(`🍳 Cooked ${recipe.nameKo || recipe.nameEn}! +${gold} Gold 🪙, +${xp} XP ⭐`);
  }

  // 6. UI Refresh
  if (typeof renderInventoryGrid === 'function') renderInventoryGrid();
  if (typeof openRecipeBook === 'function' && document.getElementById('recipe-overlay')?.classList.contains('visible')) {
    openRecipeBook();
  }
  if (typeof updateCurrencyHUD === 'function') updateCurrencyHUD();

  // 7. Achievement Check
  checkCookingAchievements();

  return true;
}

function checkCookingAchievements() {
  const recipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES)) ? COOKING_RECIPES : [];
  if (recipes.length === 0) return;

  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  const totalCookedTypes = Object.keys(inventoryState.cookedDishes).filter(id => inventoryState.cookedDishes[id] > 0).length;

  unlockedTrophies = Array.isArray(unlockedTrophies) ? unlockedTrophies : [];

  // Achievement 1: Novice Cook (3 unique recipes cooked)
  if (totalCookedTypes >= 3 && !unlockedTrophies.includes('trophy_novice_cook')) {
    unlockedTrophies.push('trophy_novice_cook');
    if (typeof showToast === 'function') {
      showToast('🏆 ACHIEVEMENT UNLOCKED: Novice Cook! (3 Dishes Cooked! 🍳)');
    }
    if (typeof persistSave === 'function') persistSave();
  }

  // Achievement 2: Master Chef (100% of all recipes cooked)
  if (totalCookedTypes >= recipes.length && !unlockedTrophies.includes('trophy_master_chef')) {
    unlockedTrophies.push('trophy_master_chef');
    if (typeof showToast === 'function') {
      showToast('🏆 ACHIEVEMENT UNLOCKED: Master Chef! (100% Recipes Cooked! 🍳⭐)');
    }
    if (typeof persistSave === 'function') persistSave();
  }
}

if (typeof window !== 'undefined') {
  window.COOKING_RECIPES = COOKING_RECIPES;
  window.cookRecipe = cookRecipe;
  window.checkCookingAchievements = checkCookingAchievements;
}
```

---

## 3. Key Findings & Codebase Integration Points

1. **Dual Save System Integration**:
   - `inventoryState.cookedDishes` is automatically included in `collectSave()` and reloaded in `applySave(d)`.
   - `unlockedTrophies` is serialized in `collectSave()`, maintaining achievement progress across browser refreshes.

2. **Inventory Dual-Key Compatibility**:
   - `removeItemFromInventory()` correctly translates English IDs (`cabbage`) to Korean keys (`배추`) using `getItemInfo()`.

3. **Dual-File Sync Requirement (Milestone 3 Prep)**:
   - Any code added to `game.js` must be duplicated to `assets/game.js` byte-for-byte to maintain system integrity.
   - Any markup added to `index.html` must be duplicated to `assets/index.html`.

---

## 4. Verification Method

1. **Syntax Check**:
   ```bash
   node -c game.js
   node -c assets/game.js
   ```
2. **Ingredient Deduction Test**:
   - Set `inventoryState.ingredients = { '배추': 1, '고추': 1, '마늘': 1 }`.
   - Call `cookRecipe('kimchi')`.
   - Verify `inventoryState.ingredients['배추']` is deleted/0.
   - Verify `inventoryState.cookedDishes['kimchi'] === 1`.
   - Verify Gold increased by 30 and toast notification fired.
3. **Achievement Unlock Test**:
   - Set all 10 recipes in `inventoryState.cookedDishes` to >= 1.
   - Trigger `checkCookingAchievements()`.
   - Verify `unlockedTrophies` contains `'trophy_master_chef'`.
