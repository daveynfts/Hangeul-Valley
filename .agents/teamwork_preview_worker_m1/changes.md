# Changes Log — Milestone 1 (Storage & Ground Drop Pipeline)

## 1. Inventory Storage System (R1)
- **`game.js`**:
  - Defined `ITEM_DB` registry mapping Korean item keys (`'배추'`, `'무'`, `'사과'`, etc.) to item metadata (ID, English name, Korean name, icon, description).
  - Added helper `getItemInfo(keyOrId)` for bidirectional ID <-> key resolution.
  - Updated `inventoryState` to include `maxSlots: 20`.
  - Implemented `getUsedInventorySlots()`: counts distinct occupied slots across `ingredients`, `cookedDishes`, and `seeds`.
  - Implemented `addItemToInventory(itemId, qty)`: checks existing item stack first; if new item slot required, enforces `maxSlots` limit and returns `false` if full, otherwise adds item and returns `true`.
  - Implemented `removeItemFromInventory(itemId, qty)`: validates sufficient count, deducts quantity, cleans up empty key, and returns boolean result.
  - Implemented `expandInventoryCapacity()`: deducts 50 coins via `spendCoins(50)`, increases `maxSlots` by +5, updates save state, and re-renders inventory grid.
  - Updated `migrateSaveData(d)`, `collectSave()`, and `applySave(d)`: serialized `maxSlots` and active dropped ground items, handled legacy saves (`maxSlots = saveData.maxSlots || 20`).

## 2. Inventory UI & Keybindings (R1)
- **`index.html`**:
  - Added CSS styles for `#inventory-overlay`, `.inv-slot`, `.inv-slot:hover`, `.inv-slot.empty`, `.inv-slot-icon`, `.inv-slot-ko`, `.inv-slot-en`, `.inv-qty-badge`.
  - Included `#inventory-panel` in the 64-Bit CRT Scanlines texture overlay selector list.
  - Added `#inventory-btn` (`🎒 Bag`) button to `#hud-actions-group`.
  - Added `#inventory-overlay` modal HTML structure with capacity badge (`#inv-capacity-badge`), capacity info + expansion button (`#inv-expand-btn`), and grid container (`#inventory-grid`).
- **`game.js`**:
  - Implemented `openInventoryUI()`, `closeInventoryUI()`, and `renderInventoryGrid()`.
  - Integrated `inventory-overlay` with centralized modal manager (`setModalState`, `closeModalById`).
  - Added keydown listener for `'I'` / `'i'` and `'E'` / `'e'` with text input focus guard (`document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable`).

## 3. Harvest-to-Ground Drop Pipeline (R2)
- **`game.js`**:
  - Initialized `this.droppedItems = []` in `FarmScene.create()`.
  - Implemented `spawnDroppedItem(itemId, x, y, playPopAnim)`: creates Phaser container with ground shadow ellipse, glowing aura, emoji icon, Korean text label, initial pop-up bounce animation (`Bounce.Out`), and random sine-wave bobbing phase angle.
  - Implemented `updateDroppedItems(dt)` in `FarmScene.update(_t, dt)`:
    - Continuous sine-wave bobbing & aura pulse.
    - Magnet Zone (~60px): smooth glide towards player if inventory is not restricted by full-inventory cooldown.
    - Pickup Zone (~30px): attempts `addItemToInventory(itemId, 1)`. On success, plays pickup SFX, sparkle particles, floating text label (`+1 [Item]!`), and destroys entity container. On failure (full inventory), triggers `showToast("🎒 Inventory Full! Cannot pick up " + nameKo, 2500)` and applies a 3-second pickup cooldown debounce (`pickupCooldown = Date.now() + 3000`).
  - Modified crop harvest in `advancePlot()` and Apple harvest in `onAppleHarvested()` to call `this.spawnDroppedItem(...)` instead of direct inventory credit.
  - Added ground item serialization to `collectSave()` and re-spawning logic to `applySave()`.

## 4. File Mirroring & Verification
- Synchronized `game.js` -> `assets/game.js` and `index.html` -> `assets/index.html`.
- Executed `node -c game.js` and `node -c assets/game.js` — **0 syntax errors**.
