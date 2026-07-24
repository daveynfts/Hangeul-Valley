# Handoff Report — Explorer 1 (Milestone 2: Recipe Data & Cooking Execution Engine)

## 1. Observation

- **Project Root**: `d:\Hangeul Valley`
- **Working Metadata Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1`
- **File Inspection**:
  - `game.js` (lines 3761-3779): `ITEM_DB` defines crops/items with `id`, `name`, `nameKo`, `icon`, `description`. `getItemInfo(keyOrId)` (lines 3781-3788) resolves dual-directional queries (Korean key `'배추'` vs English ID `'cabbage'`).
  - `game.js` (lines 3790-3796): `inventoryState` structure contains `{ maxSlots, ingredients: {}, seeds: {}, scrolls, cookedDishes: {} }`.
  - `game.js` (lines 3817-3861): `addItemToInventory()` and `removeItemFromInventory()` manage item stacking and slot deletion.
  - `game.js` (lines 3928-4001): `collectSave()` and `applySave()` serialize `inventory: inventoryState`, `recipes: recipeState`, and `unlockedTrophies`.
  - `game.js` (lines 4041-4093): `addCoins(amount)` handles currency granting, HUD sync, and save persistence. `addHonor(amount)` handles language progress XP.
  - `game.js` (lines 11131-11186): `RECIPE_DB` has 9 prototype recipes with `req` objects and `buff` effects.
  - `game.js` (lines 11253-11304): `openRecipeBook()` renders ingredient stock and recipe cards.

## 2. Logic Chain

1. **Crop Data & Recipe Alignment**:
   - `ITEM_DB` already supports crops like `cabbage`, `radish`, `green_onion`, `chili`, `garlic`, `rice`, `soybean`, `carrot`, `apple`.
   - Adding missing crops (`potato`, `tomato`, `corn`, `strawberry`) into `ITEM_DB` completes the ingredient pool.
2. **Recipe Data Schema Design**:
   - 10 recipes of tiered difficulty (`kimchi`, `radish_rice`, `roasted_corn`, `strawberry_jam`, `gimbap`, `tteokbokki`, `gamjajeon`, `bibimbap`, `bulgogi`, `samgyetang`) are designed with `id`, `nameEn`, `nameKo`, `icon`, `description`, `ingredients: [{itemId, count}]`, `xpReward`, `goldReward`.
3. **Execution Engine (`cookRecipe`)**:
   - `cookRecipe(recipeId)` checks availability of each ingredient using `getItemInfo(itemId).key` against `inventoryState.ingredients`.
   - On success, `removeItemFromInventory()` deducts each required count.
   - Rewards are granted using existing state functions `addCoins(gold)` and `addHonor(xp)`.
   - Cooked dish count is incremented in `inventoryState.cookedDishes[recipe.id]`.
   - UI refreshes (`renderInventoryGrid()`, `openRecipeBook()`, `updateCurrencyHUD()`) are triggered.
   - Achievement check (`checkCookingAchievements()`) verifies if all 10 unique recipes are cooked, awarding `'trophy_master_chef'` into `unlockedTrophies`.

## 3. Caveats

- **Dual-File Synchronization**: `assets/game.js` must be updated synchronously with `game.js` during implementation to ensure byte-for-byte identity.
- **Recipe UI Event Handlers**: `cookRecipe(recipeId)` should be connected to the UI cook buttons in `openRecipeBook()` or `startCookingMinigame()`.

## 4. Conclusion

The recipe data architecture and `cookRecipe(recipeId)` algorithm are fully formulated and ready for implementation. The design leverages existing game functions (`removeItemFromInventory`, `addCoins`, `addHonor`, `persistSave`, `unlockedTrophies`) with zero architectural friction.

The complete specs, data schemas, and code implementations are documented in:
- `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1\analysis.md`

## 5. Verification Method

1. **Syntax Check**:
   Run node syntax validation on `game.js`:
   `node -c game.js`
2. **Algorithm Execution Verification**:
   - Call `addItemToInventory('cabbage', 2); addItemToInventory('chili', 2); addItemToInventory('garlic', 2);`
   - Call `cookRecipe('kimchi')` in JS console.
   - Check that 1 of each ingredient is deducted from `inventoryState.ingredients`.
   - Check `inventoryState.cookedDishes['kimchi'] === 1`.
   - Check player gold increases by 30.
3. **Achievement Completion Test**:
   - Set all 10 recipe keys in `inventoryState.cookedDishes` to `1`.
   - Execute `checkCookingAchievements()`.
   - Verify `unlockedTrophies` includes `'trophy_master_chef'`.
