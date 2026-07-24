# Review Report — Milestone 1 (Storage & Ground Drop Pipeline)

**Reviewer**: Reviewer 2 (reviewer, critic)  
**Date**: 2026-07-24  
**Target Files**: `game.js`, `index.html`, `assets/game.js`, `assets/index.html`, `.agents/teamwork_preview_worker_m1/changes.md`  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

### Summary Rationale
The Harvest-to-Ground Drop Pipeline is remarkably well implemented in terms of visual rendering, bounce animations, glowing aura FX, sine-wave bobbing, magnet attraction, pickup detection, and full-inventory toast notification debouncing. Syntax checks pass with 0 errors, and root/assets file mirrors are 100% synchronized.

However, a **Major Finding** was identified in Requirement 3 (**Persistence of dropped items on map across save/load roundtrips**): ground dropped items are lost on game startup because `applySave()` only spawns dropped items if `sceneRef` is active at the instant `applySave()` is invoked, and `FarmScene.create()` resets `this.droppedItems = []` without restoring saved drops from a persistent global buffer (unlike `plotSave` or `appleTreeSave`).

---

## Findings

### [Major] Finding 1: Ground Dropped Item State Lost on Game Startup & Scene Re-initialization
- **What**: Dropped items saved in save data are not restored when launching the game or initializing `FarmScene`.
- **Where**: `game.js` (lines 3988–3991 and line 7230) & `assets/game.js`.
- **Why**:
  1. `collectSave()` correctly serializes ground items into `data.droppedItems`.
  2. In `applySave(d)` (lines 3988–3991), the restoration logic is:
     ```javascript
     if(sceneRef && Array.isArray(migrated.droppedItems)) {
       sceneRef.clearAllDroppedItems();
       migrated.droppedItems.forEach(drop => sceneRef.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
     }
     ```
  3. When `initSave()` runs on page boot, `applySave(d)` executes before `FarmScene.create()` sets `sceneRef`. Because `sceneRef` is `null` at that moment, `migrated.droppedItems` is skipped and NOT stored in any persistent global variable.
  4. When `FarmScene.create()` executes, line 7230 runs `this.droppedItems = [];` without restoring saved items from disk/localStorage.
- **Suggestion**:
  1. Declare a top-level persistent variable `let droppedItemsSave = [];` near `plotSave`.
  2. In `applySave(d)`:
     ```javascript
     if (Array.isArray(migrated.droppedItems)) {
       droppedItemsSave = migrated.droppedItems;
       if (sceneRef) {
         sceneRef.clearAllDroppedItems();
         migrated.droppedItems.forEach(drop => sceneRef.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
       }
     }
     ```
  3. In `FarmScene.create()`, call a new method `_restoreDroppedItems()`:
     ```javascript
     _restoreDroppedItems() {
       if (!droppedItemsSave || !droppedItemsSave.length) return;
       droppedItemsSave.forEach(drop => this.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
     }
     ```

---

## Verified Claims

| Feature / Claim | Verification Method | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Syntax Checks** | `node -c game.js`, `node -c assets/game.js` | **PASS** | 0 syntax errors. |
| **File Mirroring** | Node buffer comparison (`readFileSync`) | **PASS** | `game.js` <-> `assets/game.js` & `index.html` <-> `assets/index.html` 100% match. |
| **Harvest Hooks** | `advancePlot()` & `onAppleHarvested()` code review | **PASS** | Spawns dropped items at crop/apple plot coordinates; handles Korean ingredients fallback. |
| **Visual Rendering & FX** | Code trace in `spawnDroppedItem` & `updateDroppedItems` | **PASS** | Container includes ground shadow ellipse, cyan aura, item emoji, Korean text stroke, bounce pop tween (`Bounce.Out`), continuous sine bobbing & pulsing aura. |
| **Magnet Attraction & Pickup** | Code trace in `updateDroppedItems` | **PASS** | Magnet zone at 65px radius; pickup zone at 32px radius; proper stacking check via `addItemToInventory`. |
| **Full Inventory Debounce** | Code trace in `updateDroppedItems` | **PASS** | 3-second `pickupCooldown` debounce prevents toast spam and repels magnet pull while full. |
| **Save/Load Persistence** | Execution flow analysis of `initSave`, `applySave`, `FarmScene.create` | **FAIL (REQUEST_CHANGES)** | See Finding 1 above. |

---

## Coverage Gaps & Stress Test Analysis

1. **Magnet attraction vs Stackable item**: Tested scenario where inventory is full but item is already owned (e.g. Napa Cabbage). `updateDroppedItems` correctly evaluates `isAlreadyOwned = true`, allowing magnet pull and successful stacking in existing slot.
2. **Reverse Loop Array Removal**: `updateDroppedItems` iterates backwards (`for (let i = this.droppedItems.length - 1; i >= 0; i--)`), preventing index skipping when items are picked up and spliced out.
3. **Boot-time Save Hydration Race Condition**: Uncovered that `sceneRef` is null when `applySave` runs on initial load, causing dropped items to be omitted during scene initialization.

---

## Recommendations for Worker 1

1. Implement `droppedItemsSave` global storage and `_restoreDroppedItems()` in `FarmScene` to complete Requirement 3 persistence across cold game reloads.
2. Maintain synchronized state between root files (`game.js`, `index.html`) and mirrored asset copies (`assets/game.js`, `assets/index.html`).
