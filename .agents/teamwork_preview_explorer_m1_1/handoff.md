# Soft Handoff Report: Milestone 1 - Expandable Farm Plots (Requirement R1)

## 1. Observation

### 1.1 Existing Plot Definition & Layout
- **File**: `d:\Hangeul Valley\game.js`
- **Line 3921**: Constants definition:
  `const TILE=48, PLAYER_SPD=210, PLOT_SIZE=48, PLOT_COLS=3, PLOT_GAP=18;`
- **Lines 8246-8247**: Farm boundary definition:
  `const fW=PLOT_COLS*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP, fH=3*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP;`
  `this.farm = {x:W/2-fW/2, y:H/2-fH/2-30, w:fW, h:fH};`
- **Lines 9164-9184**: Plot creation method `_createPlots(W, H)`:
  ```javascript
  const MAX=15, ROWS=5;
  const activeCnt = Math.min(MAX, 9 + (unlockedLevels.length-1)*3);
  for(let i=0;i<MAX;i++){
    const col=i%PLOT_COLS, row=Math.floor(i/PLOT_COLS);
    const px=this.farm.x+col*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
    const py=this.farm.y+row*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
    const active=i<activeCnt;
    const shad=this.add.ellipse(px,py+PLOT_SIZE/2-2,PLOT_SIZE*0.85,10,0,active?0.3:0.1).setDepth(1);
    const tile=this.add.image(px,py,'drt_dry').setDisplaySize(PLOT_SIZE,PLOT_SIZE)
      .setAlpha(active?1:0.25).setDepth(2);
    if(!active) this.add.image(px,py,'pixel_crate').setDisplaySize(24,24).setAlpha(0.6).setDepth(3);
    const body=this.physics.add.staticImage(px,py).setVisible(false);
    body.setCircle(PLOT_SIZE*0.4).refreshBody();
    this.plots.push({tile,shad,body,x:px,y:py,sState:'',ko:null,word:null,
      index:i,plant:null,glow:null,hintLabel:null,active,plantedAt:0});
  }
  ```
- **Lines 9187-9201**: `refreshPlotAccess()` method updates plot active flags when levels change.

### 1.2 Interaction & Proximity Handlers
- **Lines 9383-9441**: `_updateHighlights()` handles proximity highlighting. Currently ignores locked (`!p.active`) plots.
- **Lines 9455-9540**: `_interact()` handles player action key `[SPACE]`. Currently ignores locked (`!p.active`) plots.

### 1.3 Save/Load System & File Mirroring
- **Line 3934**: Global plot state array: `let plotSave = [];`
- **Lines 4138-4172**: `collectSave()` serializes all game state into one JSON snapshot (v4 schema).
- **Lines 4175-4221**: `applySave(d)` deserializes JSON snapshot and restores global variables.
- **Lines 4223-4245**: `persistSave()` and `loadSave()` sync state between `localStorage` (`hv_save_v2`) and `save_data.json` via `pywebview.api`.
- **Mirror Sync**: `test_m1_challenger_harness.js` checks SHA256 equality between `game.js` and `assets/game.js`.

---

## 2. Logic Chain

1. **Observation**: `_createPlots` generates 15 plot objects (`MAX=15`, 3 columns x 5 rows). Plots 0..8 are the initial 9 active plots. Plots 9..14 are the 6 additional plots.
2. **Observation**: Currently, plot activation depends on `unlockedLevels.length` via `activeCnt = Math.min(MAX, 9 + (unlockedLevels.length-1)*3)`.
3. **Logic Step**: To satisfy Requirement R1 (6 Locked Farm Plots), plot unlocking must be decoupled from `unlockedLevels.length` and instead governed by explicit plot unlock state (`unlockedPlotCount` integer or `unlockedPlots` array).
4. **Observation**: Requirement R1 specifies a Gold cost progression of `100, 200, 350, 500, 750, 1000 Gold` for the 6 locked plots (indices 9 to 14).
5. **Logic Step**: Defining `const FARM_PLOT_UNLOCK_COSTS = [100, 200, 350, 500, 750, 1000];` maps plot index `i` (where `9 <= i <= 14`) directly to cost `FARM_PLOT_UNLOCK_COSTS[i - 9]`.
6. **Observation**: Currently, inactive plots (`!p.active`) display a `pixel_crate` sprite and lower tile alpha (`0.25`), with no interactive prompt.
7. **Logic Step**: To provide proper visual and interactive rendering for locked plots:
   - Visual: Set darkened soil tile (`p.tile.setAlpha(0.35).setTint(0x666666)`), overlay shadow, and a centered `'🔒'` text indicator (`p.lockIcon`).
   - Highlight: In `_updateHighlights()`, check `if (!p.active && near(p))` to display `[SPACE] Unlock Plot #${p.index + 1} (${cost} Gold) 🔒`.
   - Action: In `_interact()`, check `if (!p.active && near(p))` to invoke plot purchase/unlock logic via `spendCoins(cost)`.
8. **Observation**: `collectSave()` and `applySave()` store and restore game state to `localStorage` and `save_data.json`.
9. **Logic Step**: Adding `unlockedPlotCount` (or `unlockedPlots`) to `collectSave()`, `migrateSaveData()`, and `applySave()` guarantees full persistence of unlocked plot state across game reloads.

---

## 3. Caveats

- **No Caveats**: The codebase investigation of `game.js`, `assets/game.js`, and `test_m1_challenger_harness.js` is complete. All grid formulas, array definitions, highlight loops, interaction priority chains, and save/load mechanisms have been identified and traced.

---

## 4. Conclusion

Requirement R1 can be cleanly implemented without structural breaking changes to `FarmScene` grid physics or map dimensions.
The recommended design:
1. Maintain the existing 15 plot layout (3x5 grid).
2. Decouple `p.active` calculation from level purchases by introducing `var unlockedPlotCount = 9;` (or `var unlockedPlots = [0..8]`).
3. Render locked plots with darkened soil tint, lock overlay, and `'🔒'` text sprite.
4. Add proximity prompt `[SPACE] Unlock Plot #${p.index + 1} (${cost} Gold)` and `[SPACE]` interaction handler using `FARM_PLOT_UNLOCK_COSTS = [100, 200, 350, 500, 750, 1000]`.
5. Persist `unlockedPlotCount` / `unlockedPlots` in `collectSave()`, `migrateSaveData()`, and `applySave()`.
6. Mirror all changes 1:1 between `game.js` and `assets/game.js`.

---

## 5. Verification Method

To verify the investigation and subsequent implementation:

1. **Syntax Integrity Check**:
   ```bash
   node -c game.js
   node -c assets/game.js
   ```
   *Expected result*: Exit code 0, no syntax errors.

2. **File Mirror Sync Check**:
   ```bash
   node test_m1_challenger_harness.js
   ```
   *Expected result*: `game.js SHA256 match` and all Milestone 1 verification tests PASS.

3. **In-Memory & Storage State Verification**:
   Inspect `collectSave()` output in Node context:
   - Confirm `unlockedPlotCount` (or `unlockedPlots`) is serialized.
   - Verify `applySave()` correctly unlocks plots when loaded from `localStorage` snapshot.

---

## 6. Remaining Work (For Implementer)

1. Add `FARM_PLOT_UNLOCK_COSTS` and `unlockedPlotCount` state variables to `game.js` and `assets/game.js`.
2. Update `FarmScene._createPlots()` and `refreshPlotAccess()` to apply locked soil tint, lock icon, and `active` state according to `unlockedPlotCount`.
3. Add locked plot highlight detection in `_updateHighlights()`.
4. Add locked plot unlock handler in `_interact()` with gold check, SFX, particle effects, toast notifications, and `persistSave()`.
5. Update `collectSave()`, `migrateSaveData()`, and `applySave()` to persist plot unlock state.
6. Synchronize `assets/game.js` with `game.js` and execute `node test_m1_challenger_harness.js`.
