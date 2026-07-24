# Technical Analysis & Implementation Recommendations for Requirement R1: 6 Locked Farm Plots

## 1. Executive Summary & Problem Statement
The objective of Milestone 1 / Requirement R1 is to transform the Hangeul Valley farm grid by supporting **6 expandable farm plots that start locked** and can be unlocked sequentially by the player using Gold (`100, 200, 350, 500, 750, 1000 Gold`).

Currently, `game.js` creates 15 plots (`MAX = 15`), but plot activation is implicitly coupled to purchasing vocabulary level packs (`unlockedLevels.length`). Requirement R1 requires decoupling plot unlocking from level purchases, establishing dedicated state management for plot unlock progression, rendering locked plots with clear visual cues (dark soil, lock overlay, `'🔒'` indicator), adding interactive purchase prompts when approaching locked plots, and persisting unlock state across save/load sessions.

---

## 2. Current Codebase Architecture & Plot Grid Mechanics

### 2.1 Grid Geometry and Positioning
- **Constants** (`game.js:3921`):
  `TILE = 48`, `PLOT_SIZE = 48`, `PLOT_COLS = 3`, `PLOT_GAP = 18`. Step = `48 + 18 = 66px`.
- **Farm Boundary** (`game.js:8246-8247`):
  `fW = PLOT_COLS * (PLOT_SIZE + PLOT_GAP) - PLOT_GAP = 3 * 66 - 18 = 180px`.
  `fH = 3 * (PLOT_SIZE + PLOT_GAP) - PLOT_GAP = 180px`.
  `this.farm = { x: W / 2 - fW / 2, y: H / 2 - fH / 2 - 30, w: fW, h: fH };`
- **Plot Coordinates Indexing** (`game.js:9166-9172`):
  `MAX = 15`, `ROWS = 5`.
  For plot index `i` (`0 <= i < 15`):
  - Column: `col = i % 3` (0, 1, 2)
  - Row: `row = Math.floor(i / 3)` (0, 1, 2, 3, 4)
  - Center X: `px = this.farm.x + col * 66 + 24`
  - Center Y: `py = this.farm.y + row * 66 + 24`

### 2.2 Memory Representation (`this.plots`)
In `FarmScene._createPlots(W, H)` (`game.js:9164-9184`), each plot object in `this.plots[i]` has:
```javascript
{
  index: i,             // Integer 0..14
  x: px,                // World X coordinate
  y: py,                // World Y coordinate
  tile: PhaserImage,    // 'drt_dry' or 'drt_wet', display size 48x48, depth 2
  shad: PhaserEllipse,  // Shadow sprite under soil tile, depth 1
  body: StaticBody,     // Physics body (circle 48*0.4)
  sState: '',           // Crop state: ''=empty, '1'=seedling, '2'=wilting, '3'=sprout, '4'=ripe
  ko: null,             // Korean word key currently planted
  word: null,           // Word object
  plant: null,          // Crop image sprite (depth py + 5/10)
  glow: null,           // Selection highlight graphics box
  hintLabel: null,      // Hint text above crop
  active: boolean,      // True if unlocked/usable, false if locked
  plantedAt: 0          // Planting timestamp (ms)
}
```

### 2.3 Legacy Unlocking Mechanism (To Be Replaced)
Currently at `game.js:9167` & `9189`:
```javascript
const activeCnt = Math.min(MAX, 9 + (unlockedLevels.length - 1) * 3);
```
- Plots `0` through `8` (9 plots) start active for Level 1.
- Plots `9` through `14` (6 plots) start inactive (`active = false`).
- Locked plots currently set `tile.setAlpha(0.25)`, `shad.setAlpha(0.1)`, and display a `pixel_crate` image (`24x24`, alpha `0.6`).
- No interactive purchase prompt exists when approaching `active === false` plots.

---

## 3. Technical Requirements & Recommendations for Requirement R1

### 3.1 State Management & Decoupling
1. **Global Unlocked Plot Data**:
   Introduce explicit state variables for plot unlocking:
   ```javascript
   var unlockedPlotCount = 9; // Default 9 unlocked plots (indices 0..8)
   ```
   Or an array of unlocked indices:
   ```javascript
   var unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
   ```
2. **Gold Cost Table**:
   Define the cost progression array for unlocking the 6 locked plots (indices 9 to 14):
   ```javascript
   const FARM_PLOT_UNLOCK_COSTS = [100, 200, 350, 500, 750, 1000];
   ```
   For a locked plot at index `i` (`9 <= i <= 14`), the cost index is `lockedIdx = i - 9`, giving:
   - Plot index 9  (1st locked): **100 Gold**
   - Plot index 10 (2nd locked): **200 Gold**
   - Plot index 11 (3rd locked): **350 Gold**
   - Plot index 12 (4th locked): **500 Gold**
   - Plot index 13 (5th locked): **750 Gold**
   - Plot index 14 (6th locked): **1000 Gold**

### 3.2 Visual Rendering of Locked Plots
In `FarmScene._createPlots()` and `refreshPlotAccess()`:
- **Active Plot** (`p.active === true`):
  - Soil tile: `p.tile.setAlpha(1).clearTint()`
  - Shadow: `p.shad.setAlpha(0.3)`
  - Remove lock indicators and crates.
- **Locked Plot** (`p.active === false`):
  - Soil tile: Darkened soil effect using `p.tile.setAlpha(0.35).setTint(0x666666)` (or dark earth tint `0x444444`).
  - Shadow: `p.shad.setAlpha(0.1)`
  - Overlay & Indicator: Centered text object displaying `'🔒'` icon (`fontSize: '20px'`, origin `(0.5, 0.5)`, depth `4`).
  - Store handle on plot object: `p.lockIcon = lockTextObj;` for easy removal upon unlock.

### 3.3 Interactive Unlock Flow & Proximity Prompt
1. **Proximity Action Hint (`_updateHighlights` - `game.js:9383-9441`)**:
   Add a check for locked plots:
   ```javascript
   if (hx === null) {
     for (const p of this.plots) {
       if (!p.active && near(p)) {
         const lockedIdx = p.index - 9;
         const cost = FARM_PLOT_UNLOCK_COSTS[lockedIdx] || 100;
         hx = p.x; hy = p.y;
         lbl = `[SPACE] Unlock Plot #${p.index + 1} (${cost} Gold) 🔒`;
         col = 0xFFD700; // Gold highlight box
         break;
       }
     }
   }
   ```
2. **Interaction Dispatch (`_interact` - `game.js:9455-9540`)**:
   Add an interaction check when player presses `[SPACE]` near a locked plot:
   ```javascript
   for (const p of this.plots) {
     if (!p.active && near(p)) {
       this.promptUnlockPlot(p);
       return;
     }
   }
   ```
3. **Purchase Confirmation & Processing (`promptUnlockPlot(plot)`)**:
   - Calculate cost: `const cost = FARM_PLOT_UNLOCK_COSTS[plot.index - 9];`
   - Check player currency (`playerCurrencies.coins` / `gold`).
   - If player has enough Gold:
     - Deduct currency via `spendCoins(cost)`.
     - Update plot state: `plot.active = true; unlockedPlotCount = Math.max(unlockedPlotCount, plot.index + 1);` (or `unlockedPlots.push(plot.index)`).
     - Visual transition:
       - Restore soil tile: `plot.tile.setAlpha(1).clearTint(); plot.shad.setAlpha(0.3);`
       - Destroy lock indicator: `if (plot.lockIcon) { plot.lockIcon.destroy(); plot.lockIcon = null; }`
       - Play feedback: `playChiptuneSFX('harvest')`, burst particles `this._sparkle(plot.x, plot.y)`.
       - Float label: `this._label(plot.x, plot.y, 'Plot Unlocked! 🔓');`
       - Show toast: `showToast(`🔓 Farm Plot #${plot.index + 1} Unlocked for ${cost} Gold!`);`
     - Save game: Call `persistSave()`.
   - If player lacks Gold:
     - Play error SFX: `playChiptuneSFX('quiz_wrong')`.
     - Show toast: `showToast(`Need ${cost} Gold 🪙 to unlock Farm Plot #${plot.index + 1}!`);`

### 3.4 Save/Load Persistence Architecture
1. **Schema Serialization (`collectSave` - `game.js:4138-4172`)**:
   Include plot unlock state in the saved JSON payload:
   ```javascript
   return {
     v: 4,
     currencies: playerCurrencies,
     gold: playerCurrencies.coins,
     unlockedLevels,
     unlockedPlotCount, // Serializes plot unlock level (default 9, max 15)
     unlockedPlots,     // Alternative: array of unlocked plot indices [0..8]
     ...
   };
   ```
2. **Schema Migration (`migrateSaveData` - `game.js:4079-4135`)**:
   Handle backwards compatibility for existing saves:
   ```javascript
   if (typeof data.unlockedPlotCount !== 'number') {
     data.unlockedPlotCount = 9; // Fallback for legacy save files
   }
   if (!Array.isArray(data.unlockedPlots)) {
     data.unlockedPlots = Array.from({ length: data.unlockedPlotCount }, (_, i) => i);
   }
   ```
3. **State Restoration (`applySave` - `game.js:4175-4221`)**:
   Restore global plot state and notify active scene:
   ```javascript
   if (typeof migrated.unlockedPlotCount === 'number') {
     unlockedPlotCount = migrated.unlockedPlotCount;
   }
   if (sceneRef && typeof sceneRef.refreshPlotAccess === 'function') {
     sceneRef.refreshPlotAccess();
   }
   ```
4. **Dual Storage Persistence (`persistSave` & `loadSave` - `game.js:4223-4245`)**:
   - `persistSave()` serializes state to `localStorage.setItem('hv_save_v2', ...)` and `window.pywebview.api.save(data)`.
   - `loadSave()` loads snapshot from `pywebview.api.load()` or `localStorage` and executes `applySave()`.

---

## 4. Mirror Sync & Verification Strategy
- **File Sync Requirement**:
  Per `PROJECT.md`, `assets/game.js` must be kept 100% byte-identical to `game.js`.
- **Automated Verification**:
  - Run syntax check: `node -c game.js` and `node -c assets/game.js`.
  - Run Milestone 1 harness: `node test_m1_challenger_harness.js`.
