## 2026-07-24T20:20:08Z
You are Worker 1 for Milestone 1 (Storage / Inventory System & Harvest-to-Ground Drop Pipeline).
Your working directory for metadata is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1`.
Project root is `d:\Hangeul Valley`.

Read the specifications and designs in:
- `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md`
- `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`
- `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2\analysis.md` (Ground Drop Pipeline & Entity Physics)
- `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_3\analysis.md` (UI Modal, Keybindings, HUD & Save System)

### Your Tasks:
1. **Inventory Storage System (R1)**:
   - In `game.js`: Define/update `inventoryState` (slots array with `{ itemId, name, nameKo, qty, icon, description }` or item count map), `maxSlots` (starting at 20).
   - Implement `addItemToInventory(itemId, qty)` (returns true if added/stacked within capacity, false if full).
   - Implement `removeItemFromInventory(itemId, qty)` (returns true if removed, false if insufficient).
   - Implement `getUsedInventorySlots()` and capacity expansion function `expandInventoryCapacity()` (costs e.g. 50 gold, adds +5 slots).
   - Integrate persistence: Update `collectSave()` to serialize inventory & `maxSlots`. Update `applySave()` to restore state, handling legacy saves (`maxSlots = saveData.maxSlots || 20`).

2. **Inventory UI & Keybindings (R1)**:
   - In `index.html`: Add Inventory Modal (`#inventory-overlay`, `#inventory-panel`) with glass styling, header with `0 / 20 slots` capacity badge, `#inventory-grid` slot container, expand capacity button, and close button. Add `#inventory-btn` (`🎒 Bag`) into HUD actions group.
   - In `game.js`: Add `openInventoryUI()`, `renderInventoryGrid()`, and keydown listener for `'I'` / `'i'` and `'E'` / `'e'` (with text input focus guard: `document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'`).

3. **Harvest-to-Ground Drop Pipeline (R2)**:
   - In `game.js`: Modify crop harvest in `advancePlot()` and Apple harvest in `onAppleHarvested()` to spawn a `DroppedItem` entity in the world instead of instantly adding to inventory.
   - Implement `spawnDroppedItem(itemId, x, y)`: creates visual sprite (pixel-art icon or colored item gem with crop label), bounce arc animation, and sine-wave bobbing offset + glowing aura.
   - Implement `updateDroppedItems(dt)` in game update loop:
     - Magnet zone (within ~60px): item glides toward player.
     - Pickup zone (within ~30px): attempts `addItemToInventory(itemId, 1)`. If success, plays pickup effect/SFX and destroys entity. If full, triggers `showToast("🎒 Inventory Full! Cannot pick up " + nameKo, 2500)` with a 3-second pickup cooldown debounce.

4. **Synchronization & Verification**:
   - Copy `game.js` to `assets/game.js` and `index.html` to `assets/index.html`.
   - Run `node -c game.js` and `node -c assets/game.js` using terminal/run_command or powershell to confirm 0 syntax errors.
   - Document changes and verification results in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\changes.md` and `handoff.md`.
