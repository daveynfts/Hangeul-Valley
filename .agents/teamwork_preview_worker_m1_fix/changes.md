# Changes Summary — Milestone 1 Fix (Ground Drop Persistence)

## Summary of Fixes
Fixed defect where ground dropped items saved in `collectSave()` were lost on initial game boot or scene restart.

## Modified Files
- `game.js`
- `assets/game.js` (mirrored copy)
- `assets/index.html` (mirrored copy)

## Detailed Changes in `game.js`
1. **Declared Global Save Buffer**: Added top-level `let droppedItemsSave = [];` near `plotSave` (line 3750) to buffer saved ground dropped items.
2. **Updated `collectSave()`**: Synced `droppedItemsSave = drops` when `collectSave()` executes so the buffer always retains the latest state.
3. **Updated `applySave(d)`**:
   - Stores `migrated.droppedItems` into `droppedItemsSave`.
   - If `sceneRef` is active, calls `sceneRef.clearAllDroppedItems()` and recreates items immediately.
   - If `sceneRef` is null (e.g. during cold boot load), keeps `droppedItemsSave` buffered for scene creation.
4. **Updated `FarmScene.create()`**:
   - When scene is created, checks `if (droppedItemsSave && droppedItemsSave.length > 0)` and restores each saved item via `this.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false)`.
5. **Asset Synchronization**:
   - Copied `game.js` to `assets/game.js`.
   - Copied `index.html` to `assets/index.html`.

## Verification Results
- `node -c game.js`: Passed (0 errors).
- `node -c assets/game.js`: Passed (0 errors).
- File match test (`Buffer.equals`): `game.js` <-> `assets/game.js` (true), `index.html` <-> `assets/index.html` (true).
