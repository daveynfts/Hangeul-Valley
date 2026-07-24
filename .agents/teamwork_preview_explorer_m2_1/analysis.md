# Technical Analysis: Honey Inventory & Rewards Integration (Milestone 2)

## 1. Executive Summary
This report analyzes the existing inventory system and minigame reward pipeline in `game.js` to prepare for Honey Inventory & Rewards Integration. 
Key finding: `BeeScene` calculates `totalHoney` reward during end-of-round summary calculation, but does not currently invoke `addItemToInventory()`, nor is `'꿀'` / `'honey'` registered in `ITEM_DB`.

---

## 2. Detailed Findings

### 2.1 Item Registration & Inventory Dictionary (`ITEM_DB`)
- **Location**: `game.js:3900-3921`
- **Current State**: The dictionary `ITEM_DB` maps Korean ingredient names to metadata objects:
  ```javascript
  var ITEM_DB = {
    '배추': { id: 'cabbage', name: 'Napa Cabbage', nameKo: '배추', icon: '🥬', description: '...' },
    ...
  };
  ```
- **Observation**: Neither `'꿀'` nor `'honey'` is present in `ITEM_DB`.
- **Resolution**: Add `'꿀'` definition to `ITEM_DB`:
  ```javascript
  '꿀': { id: 'honey', name: 'Honey', nameKo: '꿀', icon: '🍯', type: 'ingredient', description: 'Sweet golden honey harvested from the beehive.' }
  ```
- **Helper Compatibility**: `getItemInfo(keyOrId)` (lines 3923-3930) handles lookup by Korean key `'꿀'` or English `id: 'honey'`. Adding `'꿀'` to `ITEM_DB` enables seamless lookup through both `getItemInfo('honey')` and `getItemInfo('꿀')`.

---

### 2.2 Inventory Addition API (`addItemToInventory`)
- **Location**: `game.js:3959-3983`
- **Implementation Mechanism**:
  ```javascript
  function addItemToInventory(itemId, qty = 1) {
    if (!itemId || qty <= 0) return false;
    inventoryState = inventoryState || {};
    inventoryState.ingredients = inventoryState.ingredients || {};
    inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;

    const info = getItemInfo(itemId);
    const key = info.key;

    // Stacking within existing slot
    if (typeof inventoryState.ingredients[key] !== 'undefined' && inventoryState.ingredients[key] > 0) {
      inventoryState.ingredients[key] += qty;
      if (typeof persistSave === 'function') persistSave();
      return true;
    }

    // Capacity check for new slot
    if (getUsedInventorySlots() >= inventoryState.maxSlots) {
      return false;
    }

    inventoryState.ingredients[key] = (inventoryState.ingredients[key] || 0) + qty;
    if (typeof persistSave === 'function') persistSave();
    return true;
  }
  ```
- **Key Behavior**:
  - Automatically handles slot stacking vs. new slot capacity check (`getUsedInventorySlots()`).
  - Calls `persistSave()` upon mutation.
  - Returns `true` if item added successfully, `false` if inventory is full.

---

### 2.3 BeeScene End-of-Round Summary & Reward Pipeline
- **Location**: `game.js:11165-11215` (`showResultsSummary()`)
- **Current Calculation**:
  ```javascript
  const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;
  const baseHoney = Math.max(1, Math.floor(this.score / 300));
  const bonusHoney = accuracy >= 90 ? 1 : 0;
  const totalHoney = baseHoney + bonusHoney;
  ```
- **Gap Identified**:
  `totalHoney` is calculated and displayed on the results summary UI overlay (`HONEY REWARD: +${totalHoney} 🍯`), but `addItemToInventory('honey', totalHoney)` is never called!
- **Required Integration**:
  In `showResultsSummary()`, invoke `addItemToInventory('honey', totalHoney)` and trigger `showToast(...)`:
  ```javascript
  const awarded = addItemToInventory('honey', totalHoney);
  if (awarded) {
    if (typeof showToast === 'function') showToast(`🍯 Harvested +${totalHoney} Honey! Added to inventory.`, 4000);
  } else {
    if (typeof showToast === 'function') showToast(`🎒 Inventory full! Could not add +${totalHoney} Honey.`, 4000);
  }
  ```

---

### 2.4 Syntax Verification
- Executed `node -c game.js`:
  - **Result**: Command completed with 0 errors.

---

## 3. Implementation Plan Proposal

1. **Step 1: Register Honey in `ITEM_DB`**
   Add entry at line 3921:
   ```javascript
   '꿀': { id: 'honey', name: 'Honey', nameKo: '꿀', icon: '🍯', type: 'ingredient', description: 'Sweet golden honey harvested from the beehive.' }
   ```

2. **Step 2: Connect `addItemToInventory` in `BeeScene.showResultsSummary`**
   In `game.js` at line 11175:
   ```javascript
   const totalHoney = baseHoney + bonusHoney;
   const added = addItemToInventory('honey', totalHoney);
   if (added) {
     if (typeof showToast === 'function') showToast(`🍯 Harvested +${totalHoney} Honey! Added to inventory.`, 4000);
   } else {
     if (typeof showToast === 'function') showToast(`🎒 Inventory full! Could not store +${totalHoney} Honey.`, 4000);
   }
   ```

3. **Step 3: Verification**
   Run `node -c game.js` to ensure syntax validity.
