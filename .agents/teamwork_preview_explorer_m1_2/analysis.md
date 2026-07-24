# Requirement R2: Shop Integration for Plot Purchases — Analysis & Implementation Strategy

**Agent**: `teamwork_preview_explorer_m1_2`  
**Role**: Read-only Explorer  
**Task**: Milestone 1 - Shop Integration for Plot Purchases (Requirement R2) Analysis  
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2`  

---

## 1. Executive Summary

This report delivers a full architectural analysis of the Shop UI and economy systems in Hangeul Valley (`game.js` and `index.html`), focusing on **Requirement R2: Shop Integration for Plot Purchases**. 

The goal of Requirement R2 is to allow players to purchase locked farm plot expansions (Plots #10 through #15) directly from the Shop UI using Gold (100, 200, 350, 500, 750, 1000 Gold). Upon purchase, Gold is immediately deducted, save data is persisted, and the corresponding farm plot on the farm is unlocked in real time with visual feedback (sparkle animations, crate/lock removal, tile transparency restoration).

---

## 2. Technical Investigation & Findings

### 2.1 Shop UI Modal Structure, Rendering, Open/Close & Styling (`index.html` & `game.js`)

1. **HTML Modal Markup (`index.html:1475–1489`)**:
   ```html
   <div id="shop-overlay">
     <div id="shop-panel">
       <div id="shop-header">
         <div>
           <div id="shop-title">🏪 Seed Shop</div>
           <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px">Use gold to unlock new vocabulary packs & farm plot expansions</div>
         </div>
         <div style="display:flex;align-items:center;gap:10px">
           <div id="shop-gold-badge">💰 <span id="shop-gold-val">0</span></div>
           <button id="shop-close-btn">✕</button>
         </div>
       </div>
       <div id="shop-level-grid"></div>
     </div>
   </div>
   ```

2. **CSS Modal Styling (`index.html:595–646`)**:
   - `#shop-overlay`: Fixed full-screen overlay (`z-index: 480`), dark backdrop `rgba(10, 15, 30, 0.85)` with CSS glassmorphism blur `backdrop-filter: var(--glass-blur)`. Toggled via `.visible` CSS class (`display: flex`).
   - `#shop-panel`: Glass container with dark slate background `rgba(15, 23, 42, 0.92)`, neon cyan border `2px solid var(--neon-cyan)`, rounded corners `18px`, padded `28px`, max-width `720px`, max-height `88vh`, `overflow-y: auto`.
   - `#shop-level-grid`: Responsive CSS Grid layout (`display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;`).
   - `.shop-card`: Card element (`background: rgba(30, 41, 59, 0.7)`, border `1.5px solid rgba(56, 189, 248, 0.3)`).
     - State `.owned`: Green border `var(--neon-green)`, green tinted background `rgba(15, 35, 20, 0.7)`.
     - State `.too-expensive`: Opacity `0.45`, non-interactive buy button.
     - State hover (unowned & affordable): `-3px` Y-translation, cyan border `var(--neon-cyan)`, cyan box shadow glow.

3. **Open / Close Mechanics (`game.js:5413–5424`, `5467–5469`, `9532`)**:
   - `openShop()`: Triggers click SFX `playChiptuneSFX('click')`, sets `shopOpen = true`, updates HUD currency displays via `updateGoldHUD()`, calls `buildShopGrid()` to dynamically build cards, and adds `.visible` to `#shop-overlay`.
   - `closeShop()`: Triggers click SFX `playChiptuneSFX('click')`, sets `shopOpen = false`, and removes `.visible` from `#shop-overlay`.
   - Trigger entry points:
     - HUD Shop Button: `$('shop-btn').addEventListener('click', openShop)`.
     - Shop NPC interaction: Pressing `SPACE` when player distance to `(shopX, shopY) < 90px` (`game.js:9532`).
     - Level completion modal button (`game.js:7169`).

---

### 2.2 Economy, Item Definition & Gold Deduction Flow (`game.js`)

1. **Currency Management & Gold Alias (`game.js:3941–3942`, `4075–4077`, `4335–4360`)**:
   - Primary currency object: `playerCurrencies = { coins: 85, gems: 10, honor: 0 }`.
   - `gold` variable is aliased to `playerCurrencies.coins` via `syncGoldAlias()` (`gold = playerCurrencies.coins`).
   - `spendCoins(amount)` deducts coins:
     ```javascript
     function spendCoins(amount) {
       if (playerCurrencies.coins >= amount) {
         playerCurrencies.coins -= amount;
         syncGoldAlias();
         persistSave();
         updateCurrencyHUD();
         return true;
       }
       return false;
     }
     ```
   - DOM HUD elements updated: `#gold-val` (HUD bar) and `#shop-gold-val` (Shop header badge).

2. **Save Data Schema & Persistence (`game.js:4079–4230`)**:
   - Schema version `v: 4`.
   - `collectSave()` serializes currency, levels, SRS, plots, and inventory into `hv_save_v2` (localStorage) and pywebview backend API.
   - `applySave(d)` deserializes save data into in-memory variables.

---

### 2.3 Definition of the 6 Locked Plot Expansion Items

The farm grid consists of **15 total plot slots** (indices `0` to `14`). The base farm starts with **9 active plots** (indices `0` to `8`).
The **6 locked plot expansions** correspond to plot indices `9` through `14` with exact price tiers specified in Requirement R2:

| Plot Expansion # | Farm Plot Index | Plot Label | Price (Gold) | Icon | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Plot Expansion 1** | Index 9 | Plot #10 | **100 Gold** | 🪴 | Expand farm capacity to 10 plots. |
| **Plot Expansion 2** | Index 10 | Plot #11 | **200 Gold** | 🌻 | Expand farm capacity to 11 plots. |
| **Plot Expansion 3** | Index 11 | Plot #12 | **350 Gold** | 🌿 | Expand farm capacity to 12 plots. |
| **Plot Expansion 4** | Index 12 | Plot #13 | **500 Gold** | 🌾 | Expand farm capacity to 13 plots. |
| **Plot Expansion 5** | Index 13 | Plot #14 | **750 Gold** | 🌽 | Expand farm capacity to 14 plots. |
| **Plot Expansion 6** | Index 14 | Plot #15 | **1000 Gold** | 🏞️ | Expand farm capacity to 15 plots. |

#### Data Specification in `game.js`:
```javascript
const PLOT_EXPANSIONS = [
  { index: 9,  plotNumber: 10, cost: 100,  icon: '🪴', name: 'Farm Plot #10', desc: 'Expand farm plot capacity to 10 crops.' },
  { index: 10, plotNumber: 11, cost: 200,  icon: '🌻', name: 'Farm Plot #11', desc: 'Expand farm plot capacity to 11 crops.' },
  { index: 11, plotNumber: 12, cost: 350,  icon: '🌿', name: 'Farm Plot #12', desc: 'Expand farm plot capacity to 12 crops.' },
  { index: 12, plotNumber: 13, cost: 500,  icon: '🌾', name: 'Farm Plot #13', desc: 'Expand farm plot capacity to 13 crops.' },
  { index: 13, plotNumber: 14, cost: 750,  icon: '🌽', name: 'Farm Plot #14', desc: 'Expand farm plot capacity to 14 crops.' },
  { index: 14, plotNumber: 15, cost: 1000, icon: '🏞️', name: 'Farm Plot #15', desc: 'Expand farm plot capacity to 15 crops.' }
];
```

---

### 2.4 Shop UI Distinction Strategy (Locked vs Owned / Unlocked)

To provide clear visual distinction between locked (available to buy) and owned/unlocked plots, `buildShopGrid()` will render cards using three distinct CSS visual states:

1. **Unlocked / Owned Plot State**:
   - **Condition**: `unlockedPlots.includes(item.index)`
   - **Card CSS**: `.shop-card.owned` (Green neon border `var(--neon-green)`, green glow, dark green background `rgba(15, 35, 20, 0.7)`).
   - **Badge / Action**: `<span class="shop-owned-badge">✅ Unlocked & Active</span>`.
   - **Button**: No purchase button needed (or disabled active badge).

2. **Locked & Affordable State**:
   - **Condition**: `!unlockedPlots.includes(item.index) && gold >= item.cost`
   - **Card CSS**: `.shop-card` (Standard neon cyan border).
   - **Price Badge**: `<span class="shop-card-cost">💰 100 gold</span>`.
   - **Button**: `<button class="shop-buy-btn" onclick="buyPlotExpansion(${item.index}, ${item.cost})">🛒 Unlock Plot</button>`.

3. **Locked & Too Expensive State**:
   - **Condition**: `!unlockedPlots.includes(item.index) && gold < item.cost`
   - **Card CSS**: `.shop-card.too-expensive` (Opacity `0.45`).
   - **Price Badge**: `<span class="shop-card-cost">💰 100 gold</span>`.
   - **Button**: `<button class="shop-buy-btn" disabled>Need ${item.cost - gold} more gold</button>`.

4. **Sequential Unlock Enforcement (Optional / Recommended)**:
   - For clean progression, plot expansions can be unlocked sequentially (e.g., Plot #11 requires Plot #10 to be unlocked first). If the previous plot is not owned, the card displays `Locked (Requires Plot #${item.plotNumber - 1})`.

---

### 2.5 Immediate Farm Plot Unlock & Real-Time Sync Mechanics

When a player clicks "Unlock Plot" in the Shop UI:

1. **Execution Flow (`buyPlotExpansion(plotIdx, cost)`)**:
   ```javascript
   function buyPlotExpansion(plotIdx, cost) {
     playChiptuneSFX('click');
     if (unlockedPlots.includes(plotIdx)) {
       showToast('This plot is already unlocked!');
       return;
     }
     if (playerCurrencies.coins < cost) {
       showToast(`Need ${cost} Gold! You have ${playerCurrencies.coins} 🪙`);
       return;
     }
     if (spendCoins(cost)) {
       unlockedPlots.push(plotIdx);
       persistSave();
       if (sceneRef) {
         sceneRef.unlockPlot(plotIdx);
       }
       buildShopGrid();
       showToast(`🎉 Unlocked Farm Plot #${plotIdx + 1}!`, 4500);
     }
   }
   ```

2. **Phaser Scene Unlock Routine (`FarmScene.unlockPlot(plotIdx)`)**:
   ```javascript
   unlockPlot(plotIdx) {
     const plot = this.plots[plotIdx];
     if (!plot) return;
     plot.active = true;
     plot.tile.setAlpha(1.0);
     plot.shad.setAlpha(0.3);
     
     // Remove lock emoji or pixel crate overlay graphics
     this.children.list
       .filter(c => (c.type === 'Text' && c.text === '🔒') || (c.texture && c.texture.key === 'pixel_crate'))
       .filter(c => Math.abs(c.x - plot.x) < 10 && Math.abs(c.y - plot.y) < 10)
       .forEach(c => c.destroy());
       
     // Trigger particle sparkles on the newly unlocked soil tile
     this._sparkle(plot.x, plot.y);
   }
   ```

3. **Save Data State Serialization**:
   - `unlockedPlots` state array (default `[0, 1, 2, 3, 4, 5, 6, 7, 8]`) serialized in `collectSave()`.
   - Restored in `applySave(d)` and migrated seamlessly in `migrateSaveData(d)`.

---

## 3. Recommended Implementation Strategy for Milestone 2

1. **State & Save Migration**:
   - Declare `var unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];` in `game.js`.
   - Add `unlockedPlots` to `collectSave()`, `applySave()`, and `migrateSaveData()`.

2. **Shop UI Expansion**:
   - Add section header rendering to `buildShopGrid()` inside `game.js` (or tab navigation: `[📚 Vocabulary Packs]` / `[🌾 Farm Plot Expansions]`).
   - Render plot cards alongside vocabulary level cards in `#shop-level-grid`.

3. **Scene Unlock Integration**:
   - Update `_createPlots(W, H)` to mark `plot.active = unlockedPlots.includes(i)`.
   - Add `unlockPlot(plotIdx)` method to `FarmScene` in `game.js`.

4. **Dual-File Mirroring**:
   - Ensure all changes to `game.js` are copied byte-for-byte to `assets/game.js`.
   - Ensure all changes to `index.html` are copied byte-for-byte to `assets/index.html`.

---

## 4. Verification & Syntax Criteria

- `node -c game.js` and `node -c assets/game.js` must yield zero syntax errors.
- SHA256 hash comparison between `game.js` and `assets/game.js` must be identical.
- SHA256 hash comparison between `index.html` and `assets/index.html` must be identical.
