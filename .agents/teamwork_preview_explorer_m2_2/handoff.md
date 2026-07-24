# Handoff Report: Cooking UI Modal & HUD Integration (Milestone 2)

**Agent Role**: Explorer 2 (Cooking UI & HUD Integration)  
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_2`  
**Target Files**: `index.html`, `game.js`, `assets/index.html`, `assets/game.js`  
**Date**: 2026-07-24  

---

## 1. Observation

1. **Existing Glass Modal Conventions in `index.html`**:
   - Lines 1071–1080 define `.glass-modal` styling: `background: rgba(15, 23, 42, 0.92) !important; backdrop-filter: var(--glass-blur); border: 2px solid var(--neon-gold); border-radius: 18px; box-shadow: 0 0 0 2px #0f172a, var(--glow-gold), 0 20px 60px rgba(0,0,0,.9);`.
   - Lines 122–128 (`#inventory-overlay`) & lines 1098–1104 (`#quest-overlay`) define backdrop overlays: `position: fixed; inset: 0; z-index: 870; display: none; background: rgba(10, 15, 30, 0.88); backdrop-filter: var(--glass-blur); animation: fadeIn .2s;`. `.visible` class toggles `display: flex;`.
   - Header standards: flex layout with retro `'Press Start 2P', monospace` title (`color: var(--neon-gold)`), subtitle in muted white, close button `✕` (`background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 8px; padding: 4px 12px; font-size: 16px; cursor: pointer;`).

2. **Existing HUD Action Group in `index.html`**:
   - Lines 1329–1337 define `#hud-actions-group`:
     ```html
     <button class="hud-btn" id="vocab-btn" title="Vocabulary Book">📖 Vocab</button>
     <button class="hud-btn" id="shop-btn" title="Seed shop">🏪 Shop</button>
     <button class="hud-btn" id="quest-btn" title="Quest Log" onclick="openQuestOverlay()">📜 Quests</button>
     <button class="hud-btn" id="recipe-btn" title="Recipe Book (요리책)" onclick="openRecipeBook()">🍳 Cook</button>
     <button class="hud-btn" id="inventory-btn" title="Inventory Storage (🎒) [Key: I/E]" onclick="openInventoryUI()">🎒 Bag</button>
     <button class="hud-btn" id="save-btn" title="Save game" onclick="saveAllGame()">💾 Save</button>
     ```

3. **Hotkey Listener Guard Convention in `game.js`**:
   - Lines 4855–4877 in `game.js` define hotkey listener for Inventory (`I` / `E`):
     ```javascript
     window.addEventListener('keydown', (e) => {
       const activeEl = document.activeElement;
       const isInputFocused = activeEl && (
         activeEl.tagName === 'INPUT' ||
         activeEl.tagName === 'TEXTAREA' ||
         activeEl.isContentEditable
       );
       if (e.key === 'Escape' && activeModalStack.length > 0) {
         closeTopModal();
         return;
       }
       if (!isInputFocused) {
         if (e.key === 'i' || e.key === 'I' || e.key === 'e' || e.key === 'E') { ... }
       }
     });
     ```

4. **Recipe Database Structure in `game.js`**:
   - Lines 11131–11186 define `RECIPE_DB` array containing 9 recipes (`kimchi`, `bibimbap`, `bulgogi`, `tteokbokki`, `samgyeopsal`, `haemul_pajeon`, `japchae`, `samgyetang`, `gimbap`), each with `id`, `name`, `enName`, `icon`, `req`, `buff`, `culturalFact`.

---

## 2. Logic Chain

1. **Observation 1** establishes the design parameters for `.glass-modal`, `#inventory-overlay`, and header components. Implementing `#cooking-overlay` and `#cooking-panel` with matching CSS classes, backdrop blurs, neon borders, and flex headers guarantees 100% UI consistency.
2. **Observation 2** shows where primary HUD buttons live in `#hud-actions-group`. Placing `<button class="hud-btn" id="cooking-btn" title="Cooking Kitchen (요리) [Key: C]" onclick="openCookingUI()">🍳 Cooking</button>` ensures the Cooking button has identical button dimensions, font, hover highlights, and placement as the Bag/Inventory button.
3. **Observation 3** provides the exact pattern for hotkey event handling and text input guards. Extending the `keydown` listener to listen for `e.key === 'c' || e.key === 'C'` while checking `!isInputFocused` guarantees hotkey responsiveness without interfering with user text typing.
4. **Observation 4** defines the data schema of `RECIPE_DB`. Combining this schema with `inventoryState.ingredients` allows dynamic rendering of `owned / needed` ingredient cards, green (`#4ade80`) vs red (`#f87171`) status badges, disabled vs enabled Cook button states, and XP/Gold reward badges.

---

## 3. Caveats

- **Dual-File Synchronization**: Project files exist in both project root (`index.html`, `game.js`) and `assets/` directory (`assets/index.html`, `assets/game.js`). Any modifications made by the implementer must be applied to both files identically.
- **Backend Cooking Execution**: Explorer 2 focused on the UI Modal & HUD integration specification. Backend execution details (XP award calculations, trophy unlock logic, save persistence) are detailed in Explorer 1 & 3 reports.

---

## 4. Conclusion

The specification for **Cooking UI Modal & HUD Integration** is complete and fully documented in `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_2\analysis.md`. The design provides:
1. Modal overlay `#cooking-overlay` and panel `#cooking-panel` with glassmorphic styling, pantry stock summary, and recipe card grid.
2. Requirement cards with green `owned / needed` badges (`owned >= needed`) and red badges (`owned < needed`).
3. Cook Action Button disabled when ingredients are missing, enabled with golden gradient hover when complete.
4. XP & Gold reward badges (`⭐ +50 XP`, `🪙 +30 Gold`) on every recipe card.
5. Primary HUD action button (`🍳 Cooking` / `요리`) in `#hud-actions-group` and hotkey toggle (`'C'` / `'c'`) with DOM input focus guard.

---

## 5. Verification Method

1. **File Inspection**:
   - Inspect `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_2\analysis.md` for complete code blueprints and CSS specifications.
2. **Syntax Verification**:
   - Execute `node -c game.js` and `node -c assets/game.js` to ensure 0 syntax errors.
3. **Interactive Verification**:
   - Open `index.html` in a web browser.
   - Click `🍳 Cooking` HUD button or press key `'C'` -> `#cooking-overlay` opens.
   - Test ingredient badge colors: Green when sufficient ingredients, Red when missing.
   - Verify Cook button disabled state when ingredients missing.
   - Focus text input field and press `'C'` -> verify keypress is not intercepted.
   - Press `Escape` -> verify `#cooking-overlay` closes.
