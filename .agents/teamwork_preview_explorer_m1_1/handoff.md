# Handoff Report — Explorer 1 (Milestone 1)

**Working Directory:** `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1`  
**Date:** 2026-07-24  

---

## 1. Observation

### 1.1 Save/Load System in `game.js`
* `game.js:3811`: `collectSave()` collects game state snapshot including `inventory: inventoryState`, `v: 4`, `currencies: playerCurrencies`, `gold: playerCurrencies.coins`, `recipes: recipeState`, `plots`, `srsData`, etc.
* `game.js:3842`: `applySave(d)` executes `migrateSaveData(d)` and restores `inventoryState`, `recipeState`, `playerCurrencies`.
* `game.js:3760`: `var inventoryState = { ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 }, seeds: {}, scrolls: 0, cookedDishes: {} };`
* `game.js:3777`: `migrateSaveData(d)` sets schema version to `v4` and populates default `data.inventory` if missing.
* `game.js:3871`: `persistSave()` writes to `localStorage` key `'hv_save_v2'` and calls `window.pywebview.api.save(data)`.

### 1.2 Harvest Logic in `game.js`
* `game.js:8706`: `advancePlot(plot, word, phase)` handles Phase 3 (ripe) harvest:
  - `game.js:8740`:
    ```javascript
    const cropIngredients = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근'];
    const ingName = (ko && typeof KOREAN_INGREDIENTS !== 'undefined' && KOREAN_INGREDIENTS.includes(ko)) ? ko : cropIngredients[plot.index % cropIngredients.length];
    let yieldCount = 1;
    if (typeof addIngredient === 'function') addIngredient(ingName, yieldCount);
    ```
* `game.js:10789`: `addIngredient(name, count)` directly increments `inventoryState.ingredients[name]` without checking capacity or spawning an on-ground entity.

### 1.3 Crop Data & Recipe Definitions
* `game.js:10727`: `var KOREAN_INGREDIENTS = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근', '사과', '연어', '고등어', '오징어', '잉어', '새우', '문어', '조개', '황금물고기'];`
* `game.js:10732`: `RECIPE_DB` contains 8 cooking recipes (`kimchi`, `bibimbap`, `bulgogi`, `tteokbokki`, `samgyeopsal`, `haemul_pajeon`, `japchae`, `samgyetang`, `gimbap`).

### 1.4 HUD & Modal Infrastructure
* `index.html:1299`: `<div id="hud-actions-group" class="hud-group">` contains HUD buttons (`vocab-btn`, `shop-btn`, `quest-btn`, `recipe-btn`, `save-btn`, `hud-more-btn`, `hud-menu-btn`).
* `game.js:4678`: `setModalState(overlayId, isOpen)` manages modal visibility class `.visible`, `activeModalStack`, and toggles `playerLocked`.
* `game.js:4721`: Global `window.addEventListener('keydown')` checks for `'Escape'` key to call `closeTopModal()`.

---

## 2. Logic Chain

1. **Observation:** `inventoryState` currently stores ingredients as an unconstrained object dictionary (`{ "배추": 3, ... }`) without slot capacity control (`maxSlots`), slot indexing, or item stacking limits.
   **Reasoning:** To meet Requirement 1 (R1 - Inventory Storage System), `inventoryState` must be restructured into a slot array with `maxSlots` (starting at 20, expandable via gold), item stacking limits (e.g. max 99), and item metadata defined in `ITEM_DB`.

2. **Observation:** In `advancePlot()` (`game.js:8740`), mature crops directly invoke `addIngredient(ingName, yieldCount)`, which immediately adds ingredients to `inventoryState.ingredients`.
   **Reasoning:** To implement Requirement 2 (R2 - Harvest-to-Ground Drop Pipeline), `advancePlot()` must instead call `spawnDroppedItem(itemId, plot.x, plot.y)`. The dropped item entity will animate on ground with subtle bounce, and proximity detection in Phaser scene `updateDroppedItems()` will attempt `addItemToInventory(itemId, qty)`. If full, it leaves the item on ground and displays a warning toast.

3. **Observation:** `setModalState(overlayId, isOpen)` handles glassmorphic modal overlays, stack management, `playerLocked` toggling, and Escape key listeners cleanly.
   **Reasoning:** An `#inventory-overlay` modal can be added to `index.html` following the exact `.glass-modal` structure of `#recipe-overlay`, and integrated into `setModalState` and `closeModalById` in `game.js`. Adding an Inventory button to `#hud-actions-group` and keydown listeners for `'I'` and `'E'` keys complete the R1 UI requirement.

4. **Observation:** `collectSave()`, `applySave(d)`, and `migrateSaveData(d)` handle V4 state persistence and migration.
   **Reasoning:** Schema migration in `migrateSaveData(d)` will automatically convert any legacy `inventoryState.ingredients` objects into slot array elements upon loading, guaranteeing 100% backward save compatibility.

---

## 3. Caveats

* **Dual File Sync:** Changes to `game.js` and `index.html` must be replicated in `assets/game.js` and `assets/index.html` for Milestone 3 synchronization.
* **Ground Drop Texture Baking:** Spawning dropped items requires using mature crop textures (`cr_0_3` .. `cr_4_3`) or rendering item icons cleanly in Phaser graphics/sprites.
* **Focus Check for Keyboard Shortcuts:** The `'I'` and `'E'` key listeners must check `document.activeElement` so keypresses while typing in quiz inputs or chat inputs do not trigger the inventory modal.

---

## 4. Conclusion

The codebase is fully investigated and ready for Milestone 1 implementation. The proposed R1 & R2 architecture cleanly integrates into existing systems:
1. `inventoryState` with `maxSlots` (starting at 20, expandable via Gold) and slot array.
2. `ITEM_DB` dictionary mapping item types (`cabbage`, `radish`, etc.) to names, icons, categories, and max stack sizes.
3. Spawning on-ground drop entities on crop harvest (`spawnDroppedItem`) with bounce animation and proximity auto-pickup (`addItemToInventory`).
4. HUD Inventory button in `#hud-actions-group`, keyboard shortcuts ('I'/'E'), and `#inventory-overlay` modal in `index.html`.
5. Seamless V4 save/load migration in `collectSave()`, `applySave()`, and `migrateSaveData()`.

---

## 5. Verification Method

1. **Syntax Validation:**
   Run `node -c game.js` and `node -c assets/game.js` to ensure zero syntax errors.
2. **Save Migration Verification:**
   Inspect `collectSave()` and `applySave()` outputs in browser console / test scripts to verify `inventoryState` structure, `maxSlots`, and legacy save compatibility.
3. **Ground Drop & Pickup Verification:**
   Plant and harvest a crop in-game, confirm pixel drop entity spawns with bounce animation, walk over entity to verify pickup when inventory has space, and verify toast warning when inventory is full.
