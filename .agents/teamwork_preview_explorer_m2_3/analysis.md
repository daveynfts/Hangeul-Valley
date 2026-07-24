# Milestone 2 Focus Area Analysis Report: Cooking Achievements & Persistence Integration

**Agent**: Explorer 3 (Milestone 2)  
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_3`  
**Target Files Analyzed**: `game.js`, `index.html`, `assets/game.js`, `assets/index.html`  
**Date**: 2026-07-24  

---

## Executive Summary

This report provides a comprehensive read-only architectural analysis and integration design for Milestone 2 Cooking Achievements and Save/Load Persistence in Hangeul Valley.

### Core Findings:
1. **Existing Achievement & Trophy State**: Managed via global variable `unlockedTrophies` array and database array `TROPHIES_DB` (`game.js` lines 4038 & 10763). Currently contains 5 harvest-based trophies unlocked via gold purchase after harvest requirements are met.
2. **Master Chef ("요리 왕") Unlock Trigger**: Can be cleanly integrated into `TROPHIES_DB` with `id: 'master_chef'`, `type: 'cooking'`, `cost: 0`. The unlock trigger automatically fires when `cookingState.cookedRecipes.length >= COOKING_RECIPES.length` (9 recipes cooked at least once).
3. **`cookingState` Schema & Persistence Integration**: Proposed runtime object `cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} }` serialized inside `collectSave()` and hydrated in `applySave()`.
4. **Legacy Save Migration**: `migrateSaveData()` upgrades existing v1-v4 saves by safely populating `data.cooking` from legacy `data.inventory.cookedDishes` dictionary.

---

## 1. Evidence Chain & Observations

### 1.1 Existing Trophy & Achievement System (`game.js` & `index.html`)

- **Trophy DB Definition** (`game.js` line 10763-10769):
  ```javascript
  const TROPHIES_DB = [
    { id: 'bronze_apple', name: 'Tân Binh', icon: '🥉', reqHarvests: 10, cost: 50 },
    { id: 'silver_spade', name: 'Nông Dân', icon: '🥈', reqHarvests: 50, cost: 300 },
    { id: 'gold_tractor', name: 'Chuyên Gia', icon: '🥇', reqHarvests: 150, cost: 1000 },
    { id: 'diamond_crown', name: 'Bậc Thầy', icon: '💎', reqHarvests: 500, cost: 5000 },
    { id: 'master_scholar', name: 'Huyền Thoại', icon: '👑', reqHarvests: 1000, cost: 20000 }
  ];
  ```
- **Runtime Unlocked State** (`game.js` line 4038):
  `let unlockedTrophies = []; // IDs of the trophies the player has bought`
- **Trophy UI Rendering** (`game.js` line 10792-10829):
  `renderTrophies()` iterates over `TROPHIES_DB`, checking `unlockedTrophies.includes(t.id)` and `totalHarvests >= t.reqHarvests`.
- **Trophy UI Modal DOM** (`index.html` line 1589-1605):
  Container `#trophy-overlay` with card container `.trophy-grid#trophy-grid`.

### 1.2 Recipe Database & Existing Cooking Records (`game.js`)

- **Recipe Database** (`game.js` line 11131-11186):
  `RECIPE_DB` contains 9 Korean dish definitions (`kimchi`, `bibimbap`, `bulgogi`, `tteokbokki`, `samgyeopsal`, `haemul_pajeon`, `japchae`, `samgyetang`, `gimbap`), each with `id`, `name`, `enName`, `icon`, `req` ingredients, `buff`, and `culturalFact`.
- **Existing Dish Tracking** (`game.js` line 4928 & 11447):
  Currently tracks cooked dishes inside `inventoryState.cookedDishes[recipeId]`.

### 1.3 Save/Load Pipeline (`game.js`)

- **Schema Migration** (`game.js` line 3890-3926):
  `migrateSaveData(d)` upgrades schemas `< v4` to `v4`, defaulting missing properties for `currencies`, `quests`, `inventory`, `recipes`, `activeBuffs`, `seasonal`, `leaderboards`, and `droppedItems`.
- **Collect Save** (`game.js` line 3929-3962):
  `collectSave()` serializes all subsystem states into a single JSON object. Currently missing explicit top-level `cooking` key.
- **Apply Save** (`game.js` line 3965-4001):
  `applySave(d)` hydrates runtime variables from migrated save data.
- **Persist & Load** (`game.js` line 4004-4025):
  `persistSave()` writes to `localStorage.setItem('hv_save_v2', ...)` and pywebview. `loadSave()` reads and applies the snapshot.

---

## 2. Technical Design Specifications

### 2.1 `cookingState` Runtime Object & API

Define a clean top-level state object:
```javascript
let cookingState = {
  cookedRecipes: [],     // Array of unique recipe IDs cooked at least once, e.g., ['kimchi', 'bibimbap']
  totalDishesCooked: 0,  // Total cumulative dishes prepared
  recipeStats: {}        // Map of recipeId -> quantity cooked, e.g., { 'kimchi': 4, 'bibimbap': 2 }
};
```

#### Helper API Functions:
1. `recordRecipeCooked(recipeId)`:
   - Called upon successful recipe preparation.
   - Pushes `recipeId` into `cookingState.cookedRecipes` if not present.
   - Increments `cookingState.totalDishesCooked`.
   - Increments `cookingState.recipeStats[recipeId]`.
   - Syncs with `inventoryState.cookedDishes[recipeId]` for inventory UI compatibility.
   - Executes `checkCookingAchievements()`.
   - Calls `persistSave()`.

2. `checkCookingAchievements()`:
   - Evaluates achievement unlock triggers.

### 2.2 "Master Chef" (요리 왕) Achievement & Trophy Unlock Trigger

#### 1. Database Entry in `TROPHIES_DB`:
Add the following object to `TROPHIES_DB`:
```javascript
{
  id: 'master_chef',
  name: '요리 왕',
  nameEn: 'Master Chef',
  icon: '👨‍🍳',
  type: 'cooking',
  reqRecipes: 9,
  cost: 0,
  desc: 'Nấu tất cả 9 món ăn 요리'
}
```

#### 2. Automatic Trigger (`checkCookingAchievements`):
```javascript
function checkCookingAchievements() {
  const totalRecipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
    ? COOKING_RECIPES.length
    : (typeof RECIPE_DB !== 'undefined' ? RECIPE_DB.length : 9);

  if (cookingState.cookedRecipes.length >= totalRecipes && totalRecipes > 0) {
    if (!unlockedTrophies.includes('master_chef')) {
      unlockedTrophies.push('master_chef');
      if (typeof showToast === 'function') {
        showToast('🏆 Chúc mừng! Bạn đã đạt danh hiệu 요리 왕 (Master Chef)!');
      }
      if (typeof playChiptuneSFX === 'function') {
        playChiptuneSFX('fanfare');
      }
      if (typeof trophyOpen !== 'undefined' && trophyOpen && typeof window.renderTrophies === 'function') {
        window.renderTrophies();
      }
    }
  }
}
```

#### 3. Trophy UI Render Support (`renderTrophies` in `game.js`):
Update `renderTrophies()` to handle `t.type === 'cooking'`:
```javascript
  TROPHIES_DB.forEach(t => {
    const isBought = unlockedTrophies.includes(t.id);
    let reqMet = false;
    let reqText = '';

    if (t.type === 'cooking') {
      const cookedCount = cookingState.cookedRecipes.length;
      reqMet = cookedCount >= t.reqRecipes;
      reqText = `<span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Nấu ăn</span><br/>${cookedCount}/${t.reqRecipes}`;
    } else {
      reqMet = totalHarvests >= t.reqHarvests;
      reqText = `<span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Thu hoạch</span><br/>${totalHarvests}/${t.reqHarvests}`;
    }

    const canAfford = gold >= t.cost;
    // ... Render card HTML using reqText and handles auto-unlocked trophies ...
  });
```

---

### 2.3 Save / Load Integration & Legacy Migration Architecture

#### 1. Schema Definition (`collectSave`):
Add `cooking: cookingState` to `collectSave()` object:
```javascript
function collectSave() {
  const hcObj = {}; harvestCounts.forEach((v,k) => hcObj[k] = v);
  // ... existing farm plot, apple tree, dropped item serialization ...
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
    cooking: cookingState  // <--- Integrated cooking persistence
  };
}
```

#### 2. Migration Logic (`migrateSaveData`):
Add safe legacy migration in `migrateSaveData(d)`:
```javascript
  // Ensure data.cooking object exists
  data.cooking = data.cooking || {
    cookedRecipes: [],
    totalDishesCooked: 0,
    recipeStats: {}
  };

  // Backwards compatibility migration from inventoryState.cookedDishes
  if (data.inventory && data.inventory.cookedDishes && data.cooking.cookedRecipes.length === 0) {
    const cookedKeys = Object.keys(data.inventory.cookedDishes).filter(k => data.inventory.cookedDishes[k] > 0);
    if (cookedKeys.length > 0) {
      data.cooking.cookedRecipes = cookedKeys;
      data.cooking.recipeStats = { ...data.inventory.cookedDishes };
      let sum = 0;
      for (const val of Object.values(data.inventory.cookedDishes)) {
        sum += (typeof val === 'number' ? val : 0);
      }
      data.cooking.totalDishesCooked = sum;
    }
  }
```

#### 3. State Hydration & Retroactive Achievement Check (`applySave`):
```javascript
function applySave(d) {
  if (!d) return false;
  const migrated = migrateSaveData(d);
  if (!migrated) return false;

  // ... hydrate existing states ...

  if (migrated.cooking) {
    cookingState = {
      cookedRecipes: Array.isArray(migrated.cooking.cookedRecipes) ? migrated.cooking.cookedRecipes : [],
      totalDishesCooked: typeof migrated.cooking.totalDishesCooked === 'number' ? migrated.cooking.totalDishesCooked : 0,
      recipeStats: (typeof migrated.cooking.recipeStats === 'object' && migrated.cooking.recipeStats !== null) ? migrated.cooking.recipeStats : {}
    };
  } else {
    cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  }

  // Retroactive achievement check on save load
  checkCookingAchievements();

  return true;
}
```

---

## 3. Implementation Proposal Code Patch

The following proposed patch summarizes all edits needed for `game.js`:

```javascript
// Proposed Changes for game.js:

// 1. Initial State Declaration (near line 3885):
let cookingState = {
  cookedRecipes: [],
  totalDishesCooked: 0,
  recipeStats: {}
};

// 2. Add master_chef trophy definition to TROPHIES_DB (near line 10764):
// { id: 'master_chef', name: '요리 왕', icon: '👨‍🍳', type: 'cooking', reqRecipes: 9, cost: 0 }

// 3. Helper function recordRecipeCooked & checkCookingAchievements (near line 11450):
function recordRecipeCooked(recipeId) {
  if (!cookingState.cookedRecipes.includes(recipeId)) {
    cookingState.cookedRecipes.push(recipeId);
  }
  cookingState.totalDishesCooked = (cookingState.totalDishesCooked || 0) + 1;
  cookingState.recipeStats[recipeId] = (cookingState.recipeStats[recipeId] || 0) + 1;
  
  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.cookedDishes[recipeId] = cookingState.recipeStats[recipeId];

  checkCookingAchievements();
  persistSave();
}

function checkCookingAchievements() {
  const totalRecipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
    ? COOKING_RECIPES.length
    : (typeof RECIPE_DB !== 'undefined' ? RECIPE_DB.length : 9);

  if (cookingState.cookedRecipes.length >= totalRecipes && totalRecipes > 0) {
    if (!unlockedTrophies.includes('master_chef')) {
      unlockedTrophies.push('master_chef');
      if (typeof showToast === 'function') {
        showToast('🏆 Chúc mừng! Bạn đã đạt danh hiệu 요리 왕 (Master Chef)!');
      }
      if (typeof playChiptuneSFX === 'function') {
        playChiptuneSFX('fanfare');
      }
      if (typeof trophyOpen !== 'undefined' && trophyOpen && typeof window.renderTrophies === 'function') {
        window.renderTrophies();
      }
    }
  }
}
```

---

## 4. Verification Method

1. **Syntax Check**: Run `node -c game.js` and `node -c assets/game.js` to ensure 0 syntax errors.
2. **Dual-File SHA256 Sync**: Ensure exact byte synchronization between `game.js` <-> `assets/game.js` and `index.html` <-> `assets/index.html`.
3. **Save/Load Unit Test**:
   - Save game with `collectSave()`, inspect JSON output to confirm `cooking` key contains `cookedRecipes`, `totalDishesCooked`, `recipeStats`.
   - Clear `cookingState`, execute `applySave(saveData)`, verify `cookingState` and `unlockedTrophies` are correctly restored.
4. **Achievement Trigger Verification**:
   - Cook all 9 recipes. Verify `unlockedTrophies.includes('master_chef')` becomes `true`.
   - Verify toast notification and trophy UI rendering in `#trophy-overlay`.

---
