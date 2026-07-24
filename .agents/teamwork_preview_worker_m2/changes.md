# Code Changes Report - Milestone 2 (Cooking System)

## 1. Files Modified
- `game.js`
- `index.html`
- `assets/game.js` (Synchronized copy of `game.js`)
- `assets/index.html` (Synchronized copy of `index.html`)

## 2. Detailed Summary of Changes

### `game.js` & `assets/game.js`
1. **Added Crops to `ITEM_DB`**:
   - Added `'감자'` (`potato`), `'옥수수'` (`corn`), and `'딸기'` (`strawberry`) to `ITEM_DB` for crop ingredient mapping.

2. **Defined `COOKING_RECIPES` (10 Authentic Korean Dishes)**:
   - Defined `COOKING_RECIPES` array with 10 tiered recipes:
     - `kimchi` (Novice): Napa Cabbage 1, Chili 1, Garlic 1 | XP: 25, Gold: 30
     - `radish_rice` (Novice): Rice 1, Radish 1 | XP: 20, Gold: 25
     - `roasted_corn` (Novice): Corn 2 | XP: 20, Gold: 20
     - `strawberry_jam` (Novice): Strawberry 2 | XP: 22, Gold: 25
     - `gimbap` (Intermediate): Rice 1, Carrot 1, Radish 1 | XP: 40, Gold: 50
     - `tteokbokki` (Intermediate): Rice 2, Chili 1, Green Onion 1 | XP: 45, Gold: 55
     - `gamjajeon` (Advanced): Potato 2, Green Onion 1, Garlic 1 | XP: 65, Gold: 75
     - `bibimbap` (Advanced): Rice 1, Cabbage 1, Carrot 1, Soybean 1 | XP: 75, Gold: 90
     - `bulgogi` (Master): Green Onion 2, Garlic 2, Soybean 1 | XP: 95, Gold: 115
     - `samgyetang` (Master): Rice 2, Garlic 2, Radish 1, Green Onion 1 | XP: 130, Gold: 160

3. **Cooking Execution Engine (`cookRecipe`)**:
   - `cookRecipe(recipeId)`: Validates input, resolves ingredient keys using `getItemInfo()`, checks owned ingredient amounts in `inventoryState.ingredients`, deducts ingredients using `removeItemFromInventory()`, awards Gold (`addCoins`) & Vocab XP (`addHonor`), updates dish counts in `cookingState` and `inventoryState.cookedDishes`, triggers audio feedback and UI refresh, and executes `checkCookingAchievements()`.

4. **Cooking UI Modal Functions & Keyboard Shortcut ('C'/'c')**:
   - Added `openCookingUI()`, `closeCookingUI()`, and `renderCookingGrid(selectId)`.
   - Updated global keydown handler to support `'c'` / `'C'` hotkey with text focus guard checking `activeElement` (`INPUT`, `TEXTAREA`, `isContentEditable`).
   - Added `overlayId === 'cooking-overlay'` to `closeModalById()` for Escape key handling.
   - Bound cooking methods to `window`.

5. **Trophy & Achievement Integration**:
   - Added Master Chef trophy (`id: 'master_chef'`, `name: 'Master Chef (요리 왕)'`, `icon: '👨‍🍳'`, `desc: 'Cook all 10 recipes at least once'`, `type: 'cooking'`, `reqRecipes: 10`, `cost: 0`) to `TROPHIES_DB`.
   - Implemented `checkCookingAchievements()` to grant trophy when 100% (10/10) of recipes have been cooked.
   - Updated `renderTrophies()` to properly render cooking progress badges and claim buttons.

6. **Save State & Legacy Migration**:
   - Declared top-level `var cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} }`.
   - Updated `collectSave()` to persist `cooking: cookingState`.
   - Updated `applySave()` to restore `cookingState` and run `checkCookingAchievements()`.
   - Updated `migrateSaveData()` to populate `cookingState` from legacy `inventoryState.cookedDishes` if present.

### `index.html` & `assets/index.html`
1. **Added `#cooking-overlay` Glass Modal**:
   - Includes glass header with title "KOREAN COOKING KITCHEN (요리)", `#cooking-progress-badge`, and close button.
   - Pantry bar `#cooking-pantry-bar` displaying active crop ingredient stock summary.
   - Grid layout containing `#cooking-recipe-list` (recipe cards) and `#cooking-detail-view` (selected recipe details: dish icon, nameKo/nameEn, description, green/red owned/needed ingredient badges, Cook action button, reward badges).

2. **Added HUD Action Button `#cooking-btn`**:
   - Added `#cooking-btn` (`🍳 Cooking`) in `#hud-actions-group`.

3. **Updated CSS Selectors**:
   - Updated `#recipe-overlay, #cooking-overlay, #cooking-minigame-overlay, #cultural-fact-overlay` for modal display and transition.

## 3. Verification Logs
- `node -c game.js`: Passed (0 errors)
- `node -c assets/game.js`: Passed (0 errors)
- Unit execution test in Node environment: All 4 verification stages passed successfully.
