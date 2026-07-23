# Handoff Report — Empirical Verification of Milestone R4

## 1. Observation

Empirical testing was conducted on `game.js` across four core focus areas: syntax validity, memory usage and event listener memory leaks, camera transition bounds, and state machine transitions.

### Key Empirical Findings:

1. **Syntax Check**:
   - Command: `node -c game.js`
   - Output: Exit code 0 (clean, 0 errors).

2. **Camera Transition Bounds (`game.js`)**:
   - Inspection of `FarmScene` (L3902), `ArcadeScene` (L5325), `DungeonScene` (L5757), and `FishingScene` (L6202) reveals zero calls to `this.cameras.main.setBounds(...)`.
   - Running `test_r4_challenger_empirical.js` confirms `cam.bounds === null` across all four Phaser scenes.
   - Without bounds, camera scrolling, camera follow (`startFollow`), camera shake (`shake()`), and zoom (`setZoom()`) allow the viewport scroll position to move into negative coordinate territory (`scrollX < 0`, `scrollY < 0`), rendering blank canvas background beyond map boundaries.

3. **Event Listener Memory Leaks & Memory Usage (`game.js`)**:
   - **Phaser Scene Listener Duplication**: In `FarmScene.create()` (L3906), `this.events.on('resume', ...)` registers an event listener without removing previous listeners on scene restart or shutdown (`events.off('resume')` is missing). Executing `create()` twice increases active listeners from 1 to 2.
   - **Uncleared Global Tickers**: `setInterval()` at L7179 (buff/pet ticker) and `heatInterval` at L7326 (cooking minigame) run continuously without lifecycle bound cleanup.
   - **DOM Event Listener Accumulation**: UI helper functions (`showLevelSelect`, `renderVocabCards`, `renderTrophies`) call `addEventListener` directly on elements upon each open/render call without invoking `removeEventListener` or using one-time event bindings.
   - **Scene Shutdown Hooks Missing**: None of the four Phaser scenes implement `shutdown()` or `destroy()` methods to unbind scene input listeners or destroy graphics overlays.

4. **State Machine Transitions & Unhandled Exception Crash (`game.js`)**:
   - **Critical Save Crash on Non-Farm Scenes**: In `collectSave()` (L2293):
     ```javascript
     const plots = sceneRef?.plots.filter(p=>p.ko)
       .map(p=>({i:p.index, ko:p.ko, sState:p.sState, plantedAt:p.plantedAt||0})) || plotSave;
     ```
     When `sceneRef` points to `ArcadeScene`, `DungeonScene`, or `FishingScene`, `sceneRef` is non-null but `sceneRef.plots` is `undefined`. Evaluating `(undefined).filter(...)` throws `TypeError: Cannot read properties of undefined (reading 'filter')`.
   - **Spell Duel State Re-entrancy**: Calling `startSpellDuel()` while a duel is already active does not clear `duelState.timer` (L7040), causing timer leak and overlapping duel logic.
   - **Cooking Minigame Interrupt**: Prematurely closing the cooking overlay leaves `heatInterval` running indefinitely in background.

---

## 2. Logic Chain

1. **Syntax Integrity**: `node -c game.js` verifies that `game.js` is syntactically valid Javascript and parses without syntax errors.
2. **Camera Bounds Failure**:
   - A Phaser camera requires explicit `setBounds(x, y, width, height)` to constrain movement within tilemap dimensions.
   - Since `setBounds` is omitted in all scenes (`FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`), `cameras.main.bounds` defaults to `null`.
   - Therefore, any camera operation (player follow, camera shake, zoom, or fade) allows scroll coordinates to cross world boundaries (`scrollX < 0` or `scrollX > mapWidth`), creating visible visual artifacts (black/empty canvas edges).
3. **Memory & Listener Leak Failure**:
   - Phaser scene instances emit `resume`, `shutdown`, and `destroy` events.
   - Attaching listeners using `this.events.on('resume', ...)` inside `create()` appends a callback every time the scene creates or restarts.
   - Because `this.events.off('resume', ...)` is never called and `shutdown()` hooks are absent, listeners accumulate on each scene transition.
   - Likewise, `setInterval` calls for `activeBuffs`/`heatInterval` lack teardown logic, causing background execution and memory retention.
4. **State Machine & Save Crash Failure**:
   - `collectSave()` assumes `sceneRef` is either `null` or a `FarmScene` instance containing `.plots`.
   - When switching to `ArcadeScene`, `DungeonScene`, or `FishingScene`, `sceneRef` is updated to that active scene instance.
   - `sceneRef?.plots` evaluates to `undefined` because non-farm scenes have no `plots` property.
   - Evaluating `.filter()` on `undefined` causes an uncaught `TypeError` that crashes save collection during active gameplay in non-farm scenes.

---

## 3. Caveats

- **Mock Phaser Environment**: The test harness relies on a lightweight DOM and Phaser mock environment to run headlessly in Node.js. WebGL shader/texture VRAM consumption was not directly profiled via GPU devtools.
- **Garbage Collection Variance**: V8 heap profiling diffs (+280KB to +350KB) vary slightly depending on Node.js GC timing.

---

## 4. Conclusion

Milestone R4 **FAILS** empirical verification due to 3 critical defect categories:

1. **Camera Transition Bounds (FAIL)**: Missing `setBounds()` in `FarmScene`, `ArcadeScene`, `DungeonScene`, and `FishingScene` allows camera scroll overflow past map borders.
2. **Memory Leaks (FAIL)**: Event listeners duplicate on scene restart, global intervals persist without cleanup, and scene shutdown lifecycle hooks are missing.
3. **State Machine & Save System Crash (FAIL)**: `collectSave()` crashes with a `TypeError` when auto-saving or persisting progress during `ArcadeScene`, `DungeonScene`, or `FishingScene`.

Syntax check (`node -c game.js`) **PASSES**.

---

## 5. Verification Method

To independently verify these findings, run the following commands from the project root (`C:/VibeCode/Hangeul Valley`):

```bash
# 1. Verify JS Syntax
node -c game.js

# 2. Run Headless Empirical Verification Harness
node .agents/orchestrator_graphics/challenger_m4_2/test_r4_challenger_empirical.js

# 3. Verify Save Crash in Non-Farm Scenes
node .agents/orchestrator_graphics/challenger_m4_2/verify_save_crash.js
```

### Invalidation Conditions:
- The camera test passes if `cameras.main.setBounds(...)` is added to all 4 scene `create()` methods and `cam.bounds` is non-null.
- The memory leak test passes if `this.events.off()` or `.once()` is used for scene listeners, scene `shutdown()` methods clear intervals, and DOM listeners are sanitized.
- The save state test passes if `sceneRef?.plots?.filter` or `Array.isArray(sceneRef?.plots)` check is added to `collectSave()`.
