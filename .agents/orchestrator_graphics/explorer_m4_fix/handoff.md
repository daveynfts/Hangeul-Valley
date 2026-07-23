# Handoff Report: Milestone R4 Fix Strategy & Code Plan

## 1. Observation

Direct code examination of `game.js` (Size: 327,234 bytes, 8,050 lines) reveals exact locations and verbatim code patterns for the 3 issue categories identified by Challenger 2:

### Category 1: Missing Camera Transition Bounds
* **FarmScene** (`game.js` L3890 - L3915):
  ```javascript
  3902: create(){
  3903:   sceneRef = this;
  3904:   this.cameras.main.fadeIn(300, 0, 0, 0);
  3905:   this.cameras.main.setRoundPixels(true);
  ...
  3913:   const W = this.scale.width, H = this.scale.height;
  3915:   this._drawWorld(W, H);
  ```
  `this.cameras.main.setBounds(...)` is nowhere to be found in `FarmScene`.
* **ArcadeScene** (`game.js` L5317 - L5331):
  ```javascript
  5325: create(){
  5326:   this.cameras.main.fadeIn(300, 0, 0, 0);
  5327:   this.cameras.main.setRoundPixels(true);
  5328:   this.W = this.scale.width;
  5330:   this.H = this.scale.height;
  ```
  `this.cameras.main.setBounds(...)` is missing.
* **DungeonScene** (`game.js` L5749 - L5763):
  ```javascript
  5757: create(){
  5758:   this.cameras.main.fadeIn(300, 0, 0, 0);
  5759:   this.cameras.main.setRoundPixels(true);
  5760:   this.W = this.scale.width;
  5762:   this.H = this.scale.height;
  ```
  `this.cameras.main.setBounds(...)` is missing.
* **FishingScene** (`game.js` L6194 - L6208):
  ```javascript
  6202: create(){
  6203:   this.cameras.main.fadeIn(300, 0, 0, 0);
  6204:   this.cameras.main.setRoundPixels(true);
  6205:   this.W = this.scale.width;
  6207:   this.H = this.scale.height;
  ```
  `this.cameras.main.setBounds(...)` is missing.

### Category 2: Memory Usage & Event Listener Memory Leaks
* **Duplicate Phaser Event Listeners** (`game.js` L3906 - L3908):
  ```javascript
  3906: this.events.on('resume', () => {
  3907:   this.cameras.main.fadeIn(300, 0, 0, 0);
  3908: });
  ```
  Every time `FarmScene.create()` runs upon restart, a duplicate callback is attached to `this.events`.
* **Uncleared Global `setInterval` Tickers** (`game.js` L7179 - L7184):
  ```javascript
  7178: // Tick active buffs every second
  7179: setInterval(() => {
  7180:   if (typeof activeBuffs !== 'undefined' && Object.keys(activeBuffs).length > 0) {
  7181:     updateBuffHUD();
  7182:   }
  7183:   decayPetHappiness();
  7184: }, 1000);
  ```
  The interval handle is discarded into global scope without being stored or cleared.
* **Accumulation of DOM Event Listeners** (`game.js` L3113, L3142, L3150, L6764):
  `buildLevelSelectScreen()`, `openTrophies()`, and other UI rendering functions append elements with new event listeners every time UI renders or opens without unbinding previous listeners or ensuring idempotency.
* **Missing `shutdown()` Lifecycle Hooks**:
  Search for `shutdown` in `game.js` returned 0 occurrences. None of `FarmScene`, `ArcadeScene`, `DungeonScene`, or `FishingScene` implement Phaser's `shutdown()` lifecycle method.

### Category 3: State Machine Transitions
* **`collectSave()` Crash at L2293** (`game.js` L2291 - L2295):
  ```javascript
  2291: function collectSave(){
  2292:   const hcObj={}; harvestCounts.forEach((v,k)=>hcObj[k]=v);
  2293:   const plots = sceneRef?.plots.filter(p=>p.ko)
  2294:     .map(p=>({i:p.index, ko:p.ko, sState:p.sState, plantedAt:p.plantedAt||0})) || plotSave;
  2295:   const apple = sceneRef ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe } : appleTreeSave;
  ```
  When the player is in `ArcadeScene`, `DungeonScene`, or `FishingScene`, `sceneRef` is non-null (pointing to that active scene), but `sceneRef.plots` is `undefined`. Line 2293 attempts `undefined.filter(...)`, throwing `TypeError: Cannot read properties of undefined (reading 'filter')`.
* **Re-entrant `startSpellDuel()` Timer Leak** (`game.js` L6823 - L6843, L7039 - L7044):
  ```javascript
  6823: function openSpellDuelDirect() {
  ...
  6842:   nextDuelTurn();
  6843: }
  ```
  `openSpellDuelDirect()` initializes a duel without clearing any pre-existing `duelState.timer`. Furthermore, `closeSpellDuel()` executes `if(duelState.timer) clearTimeout(duelState.timer);` without setting `duelState.timer = null` or cancelling pending `endDuel` async timeouts.
* **Cooking `heatInterval` Runaway** (`game.js` L7326 - L7335, L7386 - L7389):
  ```javascript
  7326: const heatInterval = setInterval(() => {
  7327:   sliderPos += direction * 4;
  7328:   if (sliderPos >= 95) direction = -1;
  7329:   if (sliderPos <= 0) direction = 1;
  7330:   if (indicator) indicator.style.left = sliderPos + '%';
  7331: }, 30);
  ```
  `heatInterval` is scoped locally within `renderCookingStage()`. If the cooking modal is closed or interrupted (via Escape key, close button, or scene change) before clicking `#heat-click-btn`, `closeCookingMinigame()` has no reference to `heatInterval` and cannot clear it, causing the interval to run indefinitely in the background.

---

## 2. Logic Chain

1. **Camera Transition Bounds**:
   - *Premise*: Phaser 3 cameras scroll freely across coordinate space unless constrained by `setBounds(x, y, width, height)`.
   - *Observation*: `FarmScene`, `ArcadeScene`, `DungeonScene`, and `FishingScene` omit `this.cameras.main.setBounds(...)` in their `create()` methods.
   - *Deduction*: During camera fade, zoom, or camera shake effects (e.g. `shake(300, 0.03)` at L5586), camera `scrollX` and `scrollY` drift into negative coordinates (`scrollX < 0`, `scrollY < 0`), showing rendering artifact voids outside map borders.
   - *Solution*: Call `this.cameras.main.setBounds(0, 0, width, height)` in `create()` for all four scenes.

2. **Memory Usage & Event Listener Leaks**:
   - *Premise*: Scene restarts in Phaser trigger `create()` again on the same scene instance. Global tickers or unmanaged event listeners persist across restarts.
   - *Observation*: L3906 attaches `this.events.on('resume')` on every restart; L7179 runs `setInterval` untracked; DOM elements receive multiple event listeners on UI rebuilds; no scene defines `shutdown()`.
   - *Deduction*: Duplicate callbacks accumulate in Phaser's EventEmitter and DOM nodes, while untracked intervals run forever, causing memory bloat and CPU waste.
   - *Solution*: Implement `shutdown()` lifecycle methods in all scenes to clean up event listeners (`this.events.off('resume')`), destroy emitters/tweens, reset `sceneRef`, store and clear global interval handles (`window.buffHUDInterval`), and ensure DOM listener setup is idempotent.

3. **State Machine Transitions**:
   - *Premise 1*: `collectSave()` must safely extract plot data regardless of which scene is active.
   - *Observation 1*: `sceneRef?.plots.filter(...)` evaluates `sceneRef.plots` as `undefined` when `sceneRef` is `ArcadeScene`, `DungeonScene`, or `FishingScene`, causing a fatal `TypeError`.
   - *Solution 1*: Guard plot and apple data extraction by verifying `sceneRef && Array.isArray(sceneRef.plots)`.
   - *Premise 2*: Minigame timers must be scoped and cleaned up on modal entry, exit, or interruption.
   - *Observation 2*: `openSpellDuelDirect()` fails to reset `duelState.timer`; `heatInterval` is locally scoped inside `renderCookingStage()` and omitted from `closeCookingMinigame()`.
   - *Solution 2*: Store `activeHeatInterval` globally/module-scoped and clear it in `closeCookingMinigame()`; clear `duelState.timer` explicitly upon spell duel entry and exit.

---

## 3. Caveats

- **Dual File Sync**: `game.js` exists in both `C:/VibeCode/Hangeul Valley/game.js` and `C:/VibeCode/Hangeul Valley/assets/game.js`. The fix must update `game.js` and copy/sync it to `assets/game.js` so they remain 100% binary identical as verified by `test_r4_challenger_empirical.js`.
- **Scope Restriction**: The implementer must NOT modify existing visual assets or HTML structures outside `game.js`/`assets/game.js` unless required by modal binding updates.

---

## 4. Conclusion & Line-by-Line Code Fix Plan

### Exact Code Fix Instructions for Implementer

#### FIX 1: Camera Transition Bounds
* **Target File**: `game.js` (and synced to `assets/game.js`)
* **Line 3914 (`FarmScene.create`)**:
  ```javascript
  // BEFORE (L3913-3915):
  const W = this.scale.width, H = this.scale.height;
  this._drawWorld(W, H);

  // AFTER:
  const W = this.scale.width, H = this.scale.height;
  this.cameras.main.setBounds(0, 0, W, H);
  this._drawWorld(W, H);
  ```
* **Line 5330 (`ArcadeScene.create`)**:
  ```javascript
  // BEFORE (L5328-5330):
  this.W = this.scale.width;
  this.H = this.scale.height;

  // AFTER:
  this.W = this.scale.width;
  this.H = this.scale.height;
  this.cameras.main.setBounds(0, 0, this.W, this.H);
  ```
* **Line 5762 (`DungeonScene.create`)**:
  ```javascript
  // BEFORE (L5760-5762):
  this.W = this.scale.width;
  this.H = this.scale.height;

  // AFTER:
  this.W = this.scale.width;
  this.H = this.scale.height;
  this.cameras.main.setBounds(0, 0, this.W, this.H);
  ```
* **Line 6207 (`FishingScene.create`)**:
  ```javascript
  // BEFORE (L6205-6207):
  this.W = this.scale.width;
  this.H = this.scale.height;

  // AFTER:
  this.W = this.scale.width;
  this.H = this.scale.height;
  this.cameras.main.setBounds(0, 0, this.W, this.H);
  ```

---

#### FIX 2: Memory Usage, Event Listeners & `shutdown()` Hooks
* **Line 3906 (`FarmScene.create`)**:
  ```javascript
  // BEFORE:
  this.events.on('resume', () => {
    this.cameras.main.fadeIn(300, 0, 0, 0);
  });

  // AFTER:
  this.events.off('resume');
  this.events.on('resume', () => {
    this.cameras.main.fadeIn(300, 0, 0, 0);
  });
  ```
* **Add `shutdown()` methods to all Phaser Scenes**:
  - `FarmScene`:
    ```javascript
    shutdown() {
      this.events.off('resume');
      if (this.cropSparkleEmitter) {
        try { this.cropSparkleEmitter.destroy(); } catch(e){}
      }
      if (sceneRef === this) sceneRef = null;
    }
    ```
  - `ArcadeScene`:
    ```javascript
    shutdown() {
      if (this.nearStarsGroup) this.nearStarsGroup.clear(true, true);
    }
    ```
  - `DungeonScene`:
    ```javascript
    shutdown() {
      // Clear dungeon scene references and lighting overlays
    }
    ```
  - `FishingScene`:
    ```javascript
    shutdown() {
      if (this.splashEmitter) {
        try { this.splashEmitter.destroy(); } catch(e){}
      }
    }
    ```
* **Line 7179 (Buff HUD `setInterval`)**:
  ```javascript
  // BEFORE:
  setInterval(() => {
    if (typeof activeBuffs !== 'undefined' && Object.keys(activeBuffs).length > 0) {
      updateBuffHUD();
    }
    decayPetHappiness();
  }, 1000);

  // AFTER:
  if (typeof window !== 'undefined') {
    if (window.buffHUDInterval) clearInterval(window.buffHUDInterval);
    window.buffHUDInterval = setInterval(() => {
      if (typeof activeBuffs !== 'undefined' && Object.keys(activeBuffs).length > 0) {
        updateBuffHUD();
      }
      decayPetHappiness();
    }, 1000);
  }
  ```

---

#### FIX 3: State Machine Transitions
* **Lines 2293 - 2295 (`collectSave`)**:
  ```javascript
  // BEFORE:
  const plots = sceneRef?.plots.filter(p=>p.ko)
    .map(p=>({i:p.index, ko:p.ko, sState:p.sState, plantedAt:p.plantedAt||0})) || plotSave;
  const apple = sceneRef ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe } : appleTreeSave;

  // AFTER:
  const isFarm = sceneRef && Array.isArray(sceneRef.plots);
  const plots = isFarm
    ? sceneRef.plots.filter(p => p.ko).map(p => ({ i: p.index, ko: p.ko, sState: p.sState, plantedAt: p.plantedAt || 0 }))
    : plotSave;
  const apple = (sceneRef && typeof sceneRef.appleRipeAt !== 'undefined')
    ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe }
    : appleTreeSave;
  ```
* **Lines 6823 & 7039 (`startSpellDuel` / `closeSpellDuel`)**:
  ```javascript
  // BEFORE in openSpellDuelDirect (L6823):
  function openSpellDuelDirect() {
    const enemy = DUEL_ENEMIES[duelState.enemyIndex];
    ...

  // AFTER:
  function openSpellDuelDirect() {
    if (duelState.timer) {
      clearTimeout(duelState.timer);
      duelState.timer = null;
    }
    const enemy = DUEL_ENEMIES[duelState.enemyIndex];
    ...

  // BEFORE in closeSpellDuel (L7039):
  window.closeSpellDuel = function(){
    if(duelState.timer) clearTimeout(duelState.timer);
    duelOpen = false;
    setModalState('duel-overlay', false);
  };

  // AFTER:
  window.closeSpellDuel = function(){
    if(duelState.timer) {
      clearTimeout(duelState.timer);
      duelState.timer = null;
    }
    duelState.answering = false;
    duelOpen = false;
    setModalState('duel-overlay', false);
  };
  ```
* **Lines 7247, 7326, 7386 (Cooking `heatInterval`)**:
  ```javascript
  // L7247: Declare module-scoped variable
  let activeHeatInterval = null;

  // L7326 (renderCookingStage Stage 2):
  if (activeHeatInterval) clearInterval(activeHeatInterval);
  activeHeatInterval = setInterval(() => {
    sliderPos += direction * 4;
    if (sliderPos >= 95) direction = -1;
    if (sliderPos <= 0) direction = 1;
    if (indicator) indicator.style.left = sliderPos + '%';
  }, 30);

  if (heatBtn) {
    heatBtn.onclick = () => {
      if (activeHeatInterval) {
        clearInterval(activeHeatInterval);
        activeHeatInterval = null;
      }
      if (sliderPos >= 40 && sliderPos <= 60) {
        cookingScore += 50;
        playChiptuneSFX('quiz_correct');
      } else {
        cookingScore += 20;
        playChiptuneSFX('quiz_wrong');
      }
      finishCookingMinigame();
    };
  }

  // L7386 (closeCookingMinigame):
  window.closeCookingMinigame = function() {
    if (activeHeatInterval) {
      clearInterval(activeHeatInterval);
      activeHeatInterval = null;
    }
    const overlay = document.getElementById('cooking-minigame-overlay');
    if (overlay) overlay.classList.remove('visible');
  };
  ```

---

## 5. Verification Method

To verify that the fixes successfully address all 3 issue categories:

1. **Run Empirical Test Suite**:
   ```bash
   node test_r4_challenger_empirical.js
   ```
   Confirm all 61+ tests pass and root `game.js` and `assets/game.js` match binary identical hash.

2. **Verify Camera Bounds**:
   - Check that `FarmScene`, `ArcadeScene`, `DungeonScene`, and `FishingScene` all call `this.cameras.main.setBounds(0, 0, width, height)`.
   - Perform camera shakes/fades during scene transitions and verify `scrollX >= 0` and `scrollY >= 0` at all times.

3. **Verify State Machine & Saving**:
   - Switch to `ArcadeScene`, `DungeonScene`, or `FishingScene` and invoke `collectSave()`. Verify no `TypeError` occurs and save object is successfully produced.
   - Start cooking minigame Stage 2, press Escape to close modal mid-heating, and verify `activeHeatInterval` is cleared (`clearInterval` called).
   - Trigger spell duel re-entrantly and verify no lingering timer triggers delayed option selection.

4. **Verify Memory & Lifecycle**:
   - Restart scenes multiple times and verify event listener counts on `this.events` do not increase.
   - Verify `shutdown()` lifecycle methods are called upon scene changes.
