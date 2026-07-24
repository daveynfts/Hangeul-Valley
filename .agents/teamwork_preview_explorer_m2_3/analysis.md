# Comprehensive Analysis: Save/Load Persistence & Scene Transitions (Milestone 2)

**Agent**: Explorer 3 (Milestone 2)  
**Target File**: `d:\Hangeul Valley\game.js`  
**Date**: 2026-07-24  

---

## 1. Executive Summary

This investigation analyzes the Save/Load persistence system and Scene Transition architecture in `game.js` to establish full technical readiness for **Milestone 2** (Honey Rewards, Cooking Integration & Save/Load Persistence).

Key findings:
- `collectSave()` and `applySave()` manage unified state serialization across schema version `v: 4`.
- `inventoryState` and `cookingState` are fully serialized, but `'꿀'` (Honey) is not yet registered in `ITEM_DB`, and `BeeScene.showResultsSummary()` calculates `totalHoney` reward without calling `addItemToInventory('honey', totalHoney)`.
- Scene transitions between `FarmScene` and `BeeScene` utilize Phaser's `this.scene.pause()` and `this.scene.launch('BeeScene')`, preserving overworld coordinates, active crop growth timers (`plantedAt`), apple tree ripening timers (`appleRipeAt`), and dropped ground items seamlessly in memory.
- `node -c game.js` executes with **0 syntax errors**.

---

## 2. Deep Dive: Save/Load Architecture (`collectSave` & `applySave`)

### 2.1 Serialization Flow (`collectSave`)
Located at lines `4092–4126` in `game.js`.

`collectSave()` constructs a unified JSON snapshot object:
```javascript
function collectSave(){
  const hcObj={}; harvestCounts.forEach((v,k)=>hcObj[k]=v);
  const isFarm = sceneRef && Array.isArray(sceneRef.plots);
  const plots = isFarm
    ? sceneRef.plots.filter(p => p && p.ko).map(p => ({ i: p.index, ko: p.ko, sState: p.sState, plantedAt: p.plantedAt || 0 }))
    : plotSave;
  const apple = (sceneRef && typeof sceneRef.appleRipeAt !== 'undefined')
    ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe }
    : appleTreeSave;
  const drops = (sceneRef && Array.isArray(sceneRef.droppedItems))
    ? sceneRef.droppedItems.map(item => ({ itemId: item.itemId, nameKo: item.nameKo, x: item.curX, y: item.curY }))
    : droppedItemsSave;
  droppedItemsSave = drops;
  return {
    v: 4,
    currencies: playerCurrencies,
    gold: playerCurrencies.coins,
    unlockedLevels,
    unlockedTrophies,
    harvests: hcObj,
    srs: srsData,
    plots,
    lastLevel: currentLevelIndex,
    apple,
    fishAlbum: fishAlbumSave,
    quests: questState,
    inventory: inventoryState,
    recipes: recipeState,
    activeBuffs: activeBuffs,
    seasonal: seasonalState,
    leaderboards: leaderboardState,
    droppedItems: drops,
    cooking: cookingState
  };
}
```

Key features:
1. **Dynamic Fallbacks**: Checks `sceneRef` (the active `FarmScene` instance). If active, reads current plot growth states, apple tree ripening timestamp, and ground item drops directly from scene objects. If inactive/paused, falls back to global cached buffers (`plotSave`, `appleTreeSave`, `droppedItemsSave`).
2. **Data Structure Normalization**: Converts Map objects (`harvestCounts`) to plain JavaScript objects (`hcObj`) for standard JSON serialization.

---

### 2.2 Deserialization Flow (`applySave` & `migrateSaveData`)
Located at lines `4033–4089` (`migrateSaveData`) and lines `4129–4175` (`applySave`).

```javascript
function applySave(d){
  if(!d) return false;
  const migrated = migrateSaveData(d);
  if(!migrated) return false;
  
  playerCurrencies = migrated.currencies || { coins: migrated.gold || 0, gems: 0, honor: 0 };
  syncGoldAlias();
  
  unlockedLevels = Array.isArray(migrated.unlockedLevels) ? migrated.unlockedLevels : [0];
  unlockedTrophies = Array.isArray(migrated.unlockedTrophies) ? migrated.unlockedTrophies : [];
  if(migrated.harvests) Object.entries(migrated.harvests).forEach(([k,v])=>harvestCounts.set(k,v));
  if(migrated.srs) srsData = migrated.srs;
  if(migrated.plots) plotSave = migrated.plots;
  if(typeof migrated.lastLevel==='number') currentLevelIndex = migrated.lastLevel;
  if(migrated.apple) appleTreeSave = migrated.apple;
  if(migrated.fishAlbum) fishAlbumSave = migrated.fishAlbum;
  if(migrated.quests) questState = migrated.quests;
  if(migrated.inventory) {
    inventoryState = migrated.inventory;
    inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  }
  if(migrated.recipes) recipeState = migrated.recipes;
  if(migrated.activeBuffs) activeBuffs = migrated.activeBuffs;
  if(migrated.seasonal) seasonalState = migrated.seasonal;
  if(migrated.leaderboards) leaderboardState = migrated.leaderboards;
  if(Array.isArray(migrated.droppedItems)) {
    droppedItemsSave = migrated.droppedItems;
    if(sceneRef) {
      sceneRef.clearAllDroppedItems();
      droppedItemsSave.forEach(drop => sceneRef.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
    }
  }
  if(migrated.cooking) {
    cookingState = {
      cookedRecipes: Array.isArray(migrated.cooking.cookedRecipes) ? migrated.cooking.cookedRecipes : [],
      totalDishesCooked: typeof migrated.cooking.totalDishesCooked === 'number' ? migrated.cooking.totalDishesCooked : 0,
      recipeStats: (typeof migrated.cooking.recipeStats === 'object' && migrated.cooking.recipeStats !== null) ? migrated.cooking.recipeStats : {}
    };
  } else {
    cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  }

  initQuestState();
  updateCurrencyHUD();
  if (typeof checkCookingAchievements === 'function') checkCookingAchievements();
  return true;
}
```

#### Migration Layer (`migrateSaveData`):
- Handles schema upgrades (v1–v3 to v4).
- Ensures missing root objects (`quests`, `inventory`, `recipes`, `activeBuffs`, `seasonal`, `leaderboards`, `droppedItems`, `cooking`) are assigned sensible default structures.
- Migrates legacy `inventory.cookedDishes` into `cooking.cookedRecipes`, `cooking.recipeStats`, and `cooking.totalDishesCooked`.

---

## 3. Serialized Data Inventory (All 19 Fields)

| Field Name | Type | Description / Content | Default / Restored Target |
|------------|------|-----------------------|---------------------------|
| `v` | Number | Save schema version (currently `4`) | `migrated.v` |
| `currencies` | Object | `{ coins, gems, honor }` | `playerCurrencies` |
| `gold` | Number | Legacy alias for `coins` | `gold` global (synced via `syncGoldAlias()`) |
| `unlockedLevels` | Array | Array of unlocked level indices `[0, 1, ...]` | `unlockedLevels` |
| `unlockedTrophies` | Array | Array of purchased trophy IDs | `unlockedTrophies` |
| `harvests` | Object | Map entries `{ "배추": 5, ... }` | `harvestCounts` Map |
| `srs` | Object | Word review spaced-repetition statistics | `srsData` |
| `plots` | Array | Active farm plot states `[{ i, ko, sState, plantedAt }]` | `plotSave` |
| `lastLevel` | Number | Index of last active vocabulary level | `currentLevelIndex` |
| `apple` | Object | Apple tree state `{ ripeAt, ripe }` | `appleTreeSave` |
| `fishAlbum` | Object | Caught fish counts `{ "연어": 3, ... }` | `fishAlbumSave` |
| `quests` | Object | Quest progression & daily/weekly reset timestamps | `questState` |
| `inventory` | Object | `{ maxSlots, ingredients, seeds, scrolls, cookedDishes }` | `inventoryState` |
| `recipes` | Object | `{ unlockedRecipes: [...] }` | `recipeState` |
| `activeBuffs` | Object | Active player stat boost buffs | `activeBuffs` |
| `seasonal` | Object | Season ID, points, claimed rewards | `seasonalState` |
| `leaderboards` | Object | Personal best scores across minigames | `leaderboardState` |
| `droppedItems` | Array | Items on overworld ground `[{ itemId, nameKo, x, y }]` | `droppedItemsSave` + scene respawn |
| `cooking` | Object | `{ cookedRecipes, totalDishesCooked, recipeStats }` | `cookingState` |

---

## 4. Inventory & Cooking Restoration Mechanism

### 4.1 Inventory System (`inventoryState`)
- `inventoryState` stores items in dictionary maps under `inventoryState.ingredients`:
  ```javascript
  inventoryState = {
    maxSlots: 20,
    ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 },
    seeds: {},
    scrolls: 0,
    cookedDishes: {}
  };
  ```
- `addItemToInventory(itemId, qty)` uses `getItemInfo(itemId)` to look up item metadata in `ITEM_DB`.
- `getItemInfo` checks `ITEM_DB[keyOrId]` or matches `val.id === keyOrId`.
- **Honey Gap Identified**:
  - Currently `ITEM_DB` (lines 3901–3920) contains 20 items (`배추`, `무`, `파`, `고추`, `마늘`, `쌀`, `콩`, `당근`, `감자`, `옥수수`, `딸기`, `사과`, `연어`, `고등어`, `오징어`, `잉어`, `새우`, `문어`, `조개`, `황금물고기`).
  - `'꿀'` (Honey) is **missing from `ITEM_DB`**.
  - Standard addition required in `ITEM_DB`:
    ```javascript
    '꿀': { id: 'honey', name: 'Honey', nameKo: '꿀', icon: '🍯', description: 'Sweet golden honey harvested from the beehive.' }
    ```

### 4.2 Cooking System (`cookingState` & `COOKING_RECIPES`)
- `COOKING_RECIPES` (lines 11752–11890) currently defines 10 recipes (`kimchi`, `radish_rice`, `roasted_corn`, `strawberry_jam`, `gimbap`, `tteokbokki`, `gamjajeon`, `bibimbap`, `bulgogi`, `samgyetang`).
- `cookingState` tracks:
  - `cookedRecipes`: array of recipe IDs cooked at least once.
  - `totalDishesCooked`: integer count of all dishes cooked.
  - `recipeStats`: map of `{ recipeId: count }`.
- In `applySave()`, if `migrated.cooking` exists, `cookingState` is directly restored. Legacy save files automatically migrate `inventory.cookedDishes` into `cookingState`.

---

## 5. Scene Transition & Lifecycle Architecture (`BeeScene` ↔ `FarmScene`)

### 5.1 Launch Phase (`FarmScene` → `BeeScene`)
Lines 9331–9339 in `FarmScene.update()`:
```javascript
if(this.beehiveX && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.beehiveX, this.beehiveY) < 85){
  this.tweens.add({targets:this.beehiveSprite, scale:{from:1.6, to:1.85}, duration:120, yoyo:true, ease:'Back.Out(2)'});
  this.cameras.main.fadeOut(300, 0, 0, 0);
  this.cameras.main.once('camerafadeoutcomplete', () => {
    this.scene.pause();
    this.scene.launch('BeeScene');
  });
  return;
}
```
1. **Camera Fade**: 300ms fade out to black.
2. **Scene Pause**: `this.scene.pause()` halts `FarmScene` physics, animation, and updates without destroying the scene instance.
3. **Overworld Position Preservation**: Player coordinates (`this.player.x`, `this.player.y`) remain intact on the paused `FarmScene` instance.
4. **Timer Preservation**: Crop growth timers (`p.plantedAt`) rely on absolute timestamp comparisons `(Date.now() - p.plantedAt)` in `FarmScene.update()`. Pausing the scene does not alter timestamps, so elapsed time in `BeeScene` is accurately counted towards crop growth upon return.

### 5.2 Return Phase (`BeeScene` → `FarmScene`)
Lines 11217–11224 in `BeeScene`:
```javascript
exitMinigame() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  this.cameras.main.fadeOut(300, 0, 0, 0);
  this.cameras.main.once('camerafadeoutcomplete', () => {
    this.scene.stop();
    this.scene.resume('FarmScene');
  });
}
```
1. `BeeScene` camera fades out (300ms).
2. `this.scene.stop()` destroys the active `BeeScene` instance.
3. `this.scene.resume('FarmScene')` resumes `FarmScene`.
4. `FarmScene` listens for the `'resume'` event (`lines 7438–7440`) and executes `this.cameras.main.fadeIn(300, 0, 0, 0)`, restoring visual focus cleanly.

---

## 6. Implementation Plan for Milestone 2

To achieve complete Milestone 2 persistence and scene integration:

1. **Register Honey Item in `ITEM_DB`**:
   Add `'꿀'` key to `ITEM_DB` in `game.js`:
   ```javascript
   '꿀': { id: 'honey', name: 'Honey', nameKo: '꿀', icon: '🍯', description: 'Sweet golden honey harvested from the beehive.' }
   ```

2. **Grant Honey Reward on BeeScene Completion**:
   In `BeeScene.showResultsSummary()`, add item award logic before exit:
   ```javascript
   addItemToInventory('honey', totalHoney);
   if (typeof showToast === 'function') showToast(`🍯 Received +${totalHoney} Honey! Saved to inventory.`);
   ```

3. **Register Honey Cooking Recipes**:
   Add new recipes to `COOKING_RECIPES`:
   - `honey_tea` (Honey Tea / 꿀차) requiring 1x `honey`.
   - `honey_yakgwa` (Honey Yakgwa / 약과) requiring 1x `honey` and 1x `rice`.
   Add recipe IDs to default `unlockedRecipes` array in `recipeState` and `migrateSaveData`.

4. **Beehive Minigame High Score / Stats Persistence (Optional Enhancement)**:
   Extend `leaderboardState.personalBests` with `beehiveHighScore` and `beehiveTotalHoney` to serialize player performance in `collectSave()` and restore in `applySave()`.

---

## 7. Forensic Verification & Syntax Check

Executed command:
```bash
node -c game.js
```
Result: **Exit Code 0 — Syntax OK (No errors or warnings)**.
