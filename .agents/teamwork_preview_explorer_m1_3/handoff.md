# Handoff Report: UI/UX, Keybindings, HUD & Save System (R1)
**Agent**: Explorer 3 (UI/UX, Keybindings, HUD & Save System)
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_3`
**Date**: 2026-07-24

---

## 1. Observation

1. **Modal Management Architecture**:
   - `game.js:4676`: `let activeModalStack = [];`
   - `game.js:4678`:
     ```javascript
     function setModalState(overlayId, isOpen) {
       const overlay = document.getElementById(overlayId);
       if (!overlay) return;
       if (isOpen) {
         overlay.classList.add('visible');
         overlay.classList.remove('hidden');
         playerLocked = true;
         if (!activeModalStack.includes(overlayId)) {
           activeModalStack.push(overlayId);
         }
       } else {
         overlay.classList.remove('visible');
         activeModalStack = activeModalStack.filter(id => id !== overlayId);
         if (activeModalStack.length === 0) {
           playerLocked = false;
         }
       }
     }
     ```
   - `game.js:4707`: `closeModalById(overlayId)` handles teardown for all modals.
   - `game.js:4721-4726`:
     ```javascript
     window.addEventListener('keydown', (e) => {
       if (e.key === 'Escape' && activeModalStack.length > 0) {
         closeTopModal();
       }
     });
     ```

2. **Toast System**:
   - `index.html:1459`: `<div id="toast"></div>`
   - `game.js:4585`:
     ```javascript
     function showToast(msg, dur=3500) {
       const t = $('toast'); if(!t) return;
       t.textContent = msg; t.classList.add('show');
       clearTimeout(toastTimer);
       toastTimer = setTimeout(() => t.classList.remove('show'), dur);
     }
     ```

3. **HUD Layout**:
   - `index.html:1281-1317`: `#hud` container with `#hud-actions-group` holding buttons: `📖 Vocab`, `🏪 Shop`, `📜 Quests`, `🍳 Cook`, `💾 Save`, `➕ More`, `☰ Menu`.

4. **Persistence & Save System**:
   - `game.js:3760`: `var inventoryState = { ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 }, seeds: {}, scrolls: 0, cookedDishes: {} };`
   - `game.js:3811`: `collectSave()` collects `inventory: inventoryState`.
   - `game.js:3842`: `applySave(d)` executes `migrateSaveData(d)` and assigns `inventoryState = migrated.inventory`.

5. **Existing Key Inputs**:
   - `game.js:7020-7030`: Phaser `WASD`, Arrow keys, and `SPACE` configured for movement and interaction. No bindings for `'I'` or `'E'`.

---

## 2. Logic Chain

1. **Observation 1 & 3 → Glassmorphism Modal Integration**:
   - All game modals share `.glass-modal` styling and registered integration with `setModalState`.
   - Creating `#inventory-overlay` and `#inventory-panel` using standard modal classes (`.glass-modal`, `#inventory-overlay.visible`) allows standard LIFO stacking, backdrop blurring, CRT scanline overlay, and automatic `playerLocked` control when opened or closed.

2. **Observation 2 → Notification UX**:
   - Full inventory warnings during crop harvest or ground item pickup can directly invoke `showToast('⚠️ Inventory full! (20/20 slots)')` without requiring new UI components.

3. **Observation 4 → Backward Compatibility in Save Data**:
   - Existing `inventoryState` uses `{ ingredients: {...}, seeds: {}, cookedDishes: {} }`.
   - Extending `inventoryState` with `maxSlots: 20` preserves all existing ingredient entries while adding total capacity limits.
   - `collectSave()` and `applySave()` already handle `inventoryState` reference, ensuring zero breaking changes to saving/loading mechanics.

4. **Observation 5 → Shortcut Collision Prevention**:
   - Binds `'I'` / `'i'` and `'E'` / `'e'` to `toggleInventoryUI()`.
   - Guarding key listener with `document.activeElement.tagName === 'INPUT' || 'TEXTAREA'` ensures users typing Korean answers in the Quiz or searching words in the Vocab book will not trigger the inventory modal.

---

## 3. Caveats

- **No Caveats**: The codebase and dependencies for HUD, Keybindings, Modal Management, and Save Persistence were fully inspected and documented.

---

## 4. Conclusion

The UI/UX, Keybindings, HUD & Save System design for Milestone 1 (R1) is fully complete, self-contained, and ready for implementer execution.

- **HTML/CSS Design**: Modal layout `#inventory-overlay` with responsive slot grid, item icons, Korean/English labels, quantity badges, capacity counter, and gold expansion button.
- **HUD Integration**: Added `🎒 Bag` button to `#hud-actions-group` and controls tip display.
- **Keybindings**: Binds `'I'` and `'E'` keys with active text input guards.
- **Persistence**: Exact payload integration in `collectSave()` and restoration in `applySave()`.

---

## 5. Verification Method

1. **Syntax Verification**:
   Run syntax checks on both primary JS files:
   ```powershell
   node -c game.js
   node -c assets/game.js
   ```
   *Expected Result*: 0 errors.

2. **File Inspection**:
   - Inspect `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_3\analysis.md` for complete DOM/CSS code specifications.
   - Inspect `index.html` and `game.js` for matching modal IDs (`#inventory-overlay`) and state definitions (`inventoryState.maxSlots`).

3. **Invalidation Conditions**:
   - If modal fails to open on pressing 'I' or 'E' while player is moving in farm scene.
   - If pressing 'I' or 'E' while typing inside `#answer-input` toggles the inventory modal (indicates missing input focus guard).
   - If expanding capacity with gold does not persist across `collectSave()` and `loadSave()`.
