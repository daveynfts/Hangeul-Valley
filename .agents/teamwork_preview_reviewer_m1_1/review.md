# Code Review Report — Milestone 1: Storage / Inventory System & Harvest-to-Ground Drop Pipeline

**Reviewer**: Reviewer 1 (Teamwork Reviewer & Critic)  
**Date**: 2026-07-24  
**Target Files**: `game.js`, `index.html`, `assets/game.js`, `assets/index.html`  
**Verdict**: **APPROVE**

---

## Executive Summary

Worker 1 has delivered a robust, complete implementation of Milestone 1 (Storage / Inventory System & Harvest-to-Ground Drop Pipeline). All core functions, persistence mechanisms, UI components, keybindings, input guards, and ground drop physics perform as specified without regressions or integrity violations. Code syntax and file synchronization between root and `assets/` mirrors are 100% verified.

---

## 1. Storage API Evaluation

### 1.1 `addItemToInventory(itemId, qty = 1)`
- **Correctness**: Maps `itemId` (English ID or Korean Key) to canonical key using `getItemInfo(itemId).key`.
- **Item Stacking Logic**: If the item already exists in `inventoryState.ingredients` with `qty > 0`, it stacks into the existing slot regardless of capacity limits.
- **Capacity Enforcement**: For new items, verifies `getUsedInventorySlots() < inventoryState.maxSlots`. If capacity is exceeded, returns `false` to block pickup/addition.
- **Boundary Checks**: Returns `false` for invalid `itemId` or `qty <= 0`.
- **Persistence**: Triggers `persistSave()` on successful addition.

### 1.2 `removeItemFromInventory(itemId, qty = 1)`
- **Correctness**: Resolves item key via `getItemInfo(itemId).key` and verifies `inventoryState.ingredients[key] >= qty`.
- **Key Cleanup**: Subtracts `qty` and executes `delete inventoryState.ingredients[key]` if count drops to `<= 0`, freeing the inventory slot.
- **Boundary Checks**: Returns `false` if item doesn't exist or remaining quantity is insufficient.

### 1.3 `getUsedInventorySlots()`
- **Slot Counting**: Counts distinct occupied keys (`qty > 0`) across `ingredients`, `cookedDishes`, and `seeds`.
- **Safety**: Safe against uninitialized state (`inventoryState.ingredients = inventoryState.ingredients || {}`).

### 1.4 `expandInventoryCapacity()`
- **Economy Integration**: Invokes `spendCoins(50)` to deduct 50 coins. Returns `false` and alerts the user if coins are insufficient.
- **Capacity Update**: Increments `inventoryState.maxSlots` by +5, updates save state via `persistSave()`, re-renders grid (`renderInventoryGrid()`), and displays a toast notification.

---

## 2. Save/Load Persistence (`collectSave`, `applySave`, `migrateSaveData`)

- **Schema Migration (`migrateSaveData`)**: Upgrades save data to `v: 4`. Ensures `data.inventory.maxSlots` defaults to 20 if missing or invalid, and initializes `droppedItems` array.
- **Save Collection (`collectSave`)**: Serializes `v: 4`, `playerCurrencies`, `inventoryState` (including `maxSlots`), and active ground `droppedItems` (`itemId`, `nameKo`, `x`, `y`).
- **Save Restoration (`applySave`)**: Migrates data, restores `inventoryState`, and re-spawns active ground items on `FarmScene` via `sceneRef.spawnDroppedItem()`.

---

## 3. Inventory UI, CSS, HUD & Hotkeys

- **HTML Modal Structure**: `#inventory-overlay` contains `#inventory-panel` glass container, `#inv-capacity-badge` (`X / Y slots`), `#inv-expand-btn`, and `#inventory-grid`.
- **CSS & CRT Overlay**: Integrated `.inv-slot`, `.inv-slot:hover`, `.inv-slot.empty`, `.inv-qty-badge`, `.inv-slot-icon`, `.inv-slot-ko`, `.inv-slot-en`. Added `#inventory-panel` to 64-Bit CRT Scanlines overlay selector lists (`#inventory-panel::before`).
- **HUD Button**: Added `#inventory-btn` (`🎒 Bag`) to `#hud-actions-group` in `index.html`.
- **Hotkeys & Input Guard**: 'I' / 'i' and 'E' / 'e' toggle the inventory modal. Guarded by:
  ```js
  const activeEl = document.activeElement;
  const isInputFocused = activeEl && (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.isContentEditable
  );
  ```
  This prevents modal toggling while typing in text inputs or textareas.

---

## 4. Harvest-to-Ground Drop Pipeline

- **Spawning**: Harvest actions (`advancePlot` crop harvest and `onAppleHarvested`) trigger `spawnDroppedItem(itemId, x, y)`.
- **Physics & Visuals**: Entity container features ground shadow, glowing cyan aura, item emoji icon, Korean text label, pop-up bounce animation (`Bounce.Out`), and continuous sine-wave floating.
- **Magnet & Pickup Zones**:
  - Magnet Zone (~65px): Pulls item towards player if inventory is not full or item is already owned.
  - Pickup Zone (~32px): Attempts `addItemToInventory(itemId, 1)`. Plays pickup SFX, sparkle particles, floating `+1 [Item]!` text, and destroys drop container.
  - Full Inventory Handling: Shows toast (`🎒 Inventory Full! Cannot pick up [Item]`) and applies a 3-second pickup cooldown debounce to avoid toast spam.

---

## 5. Verification & Integrity Attestation

- **Syntax Check (`node -c`)**:
  - `node -c game.js`: **PASS** (0 errors)
  - `node -c assets/game.js`: **PASS** (0 errors)
- **File Synchronization (SHA256 Hashes)**:
  - `game.js` SHA256: `612717BEAC3E2AA7821B3BB1656201E53729B15DD0701C83481F526FE3459C0E`
  - `assets/game.js` SHA256: `612717BEAC3E2AA7821B3BB1656201E53729B15DD0701C83481F526FE3459C0E` (MATCH)
  - `index.html` SHA256: `72C0731982A8AE6D913B6C6FEA6E1AB632AD3905F1B8165CC8C96B70EB828138`
  - `assets/index.html` SHA256: `72C0731982A8AE6D913B6C6FEA6E1AB632AD3905F1B8165CC8C96B70EB828138` (MATCH)
- **Integrity Violation Assessment**:
  - Hardcoded test results / facade implementations: **NONE**
  - Task shortcuts: **NONE**
  - Self-certifying without verification: **NONE** (All claims verified by direct inspection and CLI commands).

---

## Findings & Advisory Recommendations

### Verified Claims
- `addItemToInventory` & `removeItemFromInventory` canonicalize item keys and enforce capacity: **VERIFIED (PASS)**
- Stacking existing items when inventory is full: **VERIFIED (PASS)**
- Coins deduction on expansion: **VERIFIED (PASS)**
- Schema migration v4 & save persistence: **VERIFIED (PASS)**
- CRT scanlines styling on `#inventory-panel`: **VERIFIED (PASS)**
- Input focus guards on hotkeys 'I' / 'E': **VERIFIED (PASS)**

### Advisory Recommendations (Non-blocking / Minor)
1. **`removeItemFromInventory` Scope**: Currently targets `inventoryState.ingredients`. If cooked dishes or seeds are removed via this generic helper in future milestones, consider extending `removeItemFromInventory` to search `cookedDishes` and `seeds` dictionaries.

---

## Final Verdict
**APPROVE** — Milestone 1 implementation is complete, correct, and ready for integration.
