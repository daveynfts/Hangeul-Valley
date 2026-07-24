# Handoff Report: Milestone 1 - Shop Integration for Plot Purchases (Requirement R2) Analysis

**Agent**: `teamwork_preview_explorer_m1_2`  
**Role**: Read-only Explorer  
**Task**: Milestone 1 - Requirement R2 (Shop Integration for Plot Purchases) Investigation & Strategy  
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2`  

---

## 1. Observation

Direct observations from code inspection of `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\index.html`:

1. **Shop UI Markup & Modal Overlay (`index.html:1475–1489`)**:
   `#shop-overlay` contains `#shop-panel`, `#shop-header`, `#shop-title` ("🏪 Seed Shop"), `#shop-gold-badge` (`💰 <span id="shop-gold-val">0</span>`), `#shop-close-btn`, and `#shop-level-grid`.

2. **Shop UI Styling & Card Classes (`index.html:595–646`)**:
   - `#shop-overlay`: `position: fixed`, `inset: 0`, `z-index: 480`, `display: none`, `backdrop-filter: var(--glass-blur)`. Class `.visible` toggles `display: flex`.
   - `#shop-panel`: `background: rgba(15, 23, 42, 0.92)`, `border: 2px solid var(--neon-cyan)`, `border-radius: 18px`, `max-width: 720px`, `max-height: 88vh`, `overflow-y: auto`.
   - `#shop-level-grid`: `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, `gap: 16px`.
   - `.shop-card`: `.shop-card.owned` (`border-color: var(--neon-green)`, `background: rgba(15, 35, 20, 0.7)`), `.shop-card.too-expensive` (`opacity: .45`).

3. **Shop Open/Close Flow (`game.js:5413–5424`)**:
   - `openShop()`: Sets `shopOpen = true`, updates currency HUD (`updateGoldHUD()`), calls `buildShopGrid()`, and executes `setModalState('shop-overlay', true)`.
   - `closeShop()`: Sets `shopOpen = false` and executes `setModalState('shop-overlay', false)`.
   - Trigger points: `#shop-btn` click listener (`game.js:5468`) and proximity check in `FarmScene.update` (`game.js:9532`): `Phaser.Math.Distance.Between(player.x, player.y, shopX, shopY) < 90`.

4. **Currency Management & Gold Deduction (`game.js:3941–3942`, `4075–4077`, `4313–4322`)**:
   - Currency state: `playerCurrencies = { coins: 85, gems: 10, honor: 0 }`.
   - Alias: `gold = playerCurrencies.coins` synced via `syncGoldAlias()`.
   - Deduction helper: `spendCoins(cost)` deducts `playerCurrencies.coins`, calls `syncGoldAlias()`, `persistSave()`, and `updateCurrencyHUD()`.

5. **Farm Plot Capacity & Scene Mechanics (`game.js:9164–9202`)**:
   - `_createPlots(W, H)` initializes 15 plot objects (indices 0..14).
   - Currently, active plots count is calculated as `Math.min(15, 9 + (unlockedLevels.length - 1) * 3)`.
   - `refreshPlotAccess()` loops over `this.plots`, setting `p.active = true`, `p.tile.setAlpha(1)`, `p.shad.setAlpha(0.3)`, and destroying lock graphics.

---

## 2. Logic Chain

1. **Observation 1 & 2** establish that the Shop UI is already equipped with modal container `#shop-panel`, gold badge `#shop-gold-val`, responsive grid layout `#shop-level-grid`, and CSS classes for card states (`.owned`, `.too-expensive`, `.shop-buy-btn`, `.shop-owned-badge`).
   **Inference**: Plot expansion cards can be seamlessly rendered inside `#shop-level-grid` (or under a designated Plot Expansion section / tab) using the existing CSS class system without creating new top-level HTML overlays.

2. **Observation 3 & 4** show that shop modal management (`openShop`/`closeShop`) and economy deduction (`spendCoins(cost)`) are fully established and central to `game.js`.
   **Inference**: Purchasing a farm plot can invoke `spendCoins(cost)`, deduct Gold, and persist save data using existing engine pathways.

3. **Observation 5** shows that farm plot rendering and activation in `FarmScene` relies on `p.active` flag and `refreshPlotAccess()` / tile transparency updates.
   **Inference**: Introducing an `unlockedPlots` state array (defaulting to `[0,1,2,3,4,5,6,7,8]` for 9 base plots) and calling `sceneRef.unlockPlot(plotIdx)` will immediately unlock the corresponding plot on the farm in real time, removing lock overlays and emitting particle sparkles.

---

## 3. Caveats

- **Backwards Compatibility**: Existing save files (schema `v: 4`) do not contain explicit `unlockedPlots` arrays. The save migration function (`migrateSaveData`) must populate `data.unlockedPlots = Array.isArray(data.unlockedPlots) ? data.unlockedPlots : [0,1,2,3,4,5,6,7,8]` to prevent crashes or plot state loss on existing save files.
- **Dual-File Mirroring**: Every modification to `game.js` and `index.html` during implementation in Milestone 2 must be duplicated to `assets/game.js` and `assets/index.html` to pass SHA256 sync verification.

---

## 4. Conclusion

The investigation of `game.js` and `index.html` for Requirement R2 is complete. The existing Shop UI modal, card styling, currency deduction engine (`spendCoins`), and plot grid infrastructure (`this.plots`) provide a straightforward path to implement the 6 plot expansions (Plots #10 through #15 priced at 100, 200, 350, 500, 750, 1000 Gold). Plot purchases will immediately deduct Gold, persist save data, update UI badges, and unlock farm plots in real time on the farm scene.

---

## 5. Verification Method

To verify implementation readiness and codebase consistency:

1. **Syntax Audit**:
   ```cmd
   node -c "d:\Hangeul Valley\game.js"
   node -c "d:\Hangeul Valley\assets\game.js"
   ```
   *Expectation*: 0 syntax errors.

2. **Dual-File SHA256 Hash Verification**:
   ```powershell
   Get-FileHash "d:\Hangeul Valley\game.js", "d:\Hangeul Valley\assets\game.js" -Algorithm SHA256
   Get-FileHash "d:\Hangeul Valley\index.html", "d:\Hangeul Valley\assets\index.html" -Algorithm SHA256
   ```
   *Expectation*: Identical hash values for both pairs.

3. **Shop UI & Plot Unlock Verification Plan**:
   - Open Shop UI in-game and verify 6 plot expansion items appear with prices 100, 200, 350, 500, 750, 1000 Gold.
   - Click "Unlock Plot" on Plot #10 with >= 100 Gold -> verify Gold decreases by 100, card badge updates to "✅ Unlocked", and Plot #10 on the farm immediately becomes active brown soil with lock icon removed.
