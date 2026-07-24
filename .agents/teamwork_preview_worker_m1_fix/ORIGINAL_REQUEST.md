## 2026-07-24T13:25:24Z

You are Worker 2 (Fix Worker for Milestone 1 Ground Drop Persistence).
Your working directory for metadata is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix`.
Project root is `d:\Hangeul Valley`.

Read Reviewer 2 report in `d:\Hangeul Valley\.agents\teamwork_preview_reviewer_m1_2\review.md`.

### Defect to Fix:
Ground drops saved in `collectSave()` are lost on initial game boot or scene restart. `applySave()` runs on initial page load before `FarmScene.create()` sets `sceneRef`, causing `migrated.droppedItems` to be skipped. Furthermore, `FarmScene.create()` resets `this.droppedItems = []` without restoring items from save.

### Fix Requirements in `game.js`:
1. Maintain top-level `let droppedItemsSave = []` to buffer saved dropped item data.
2. In `applySave(saveData)`: Store `migrated.droppedItems` into `droppedItemsSave`. If `sceneRef` is active, clear existing scene entities and immediately recreate dropped items. If `sceneRef` is not active yet, keep `droppedItemsSave` buffered for scene creation.
3. In `FarmScene.create()`: When initializing the scene, check `if (droppedItemsSave && droppedItemsSave.length > 0)`, spawn/restore those `DroppedItem` entities into `this.droppedItems`, and attach their Phaser game objects.
4. Copy `game.js` to `assets/game.js` and `index.html` to `assets/index.html`.
5. Run `node -c game.js` and `node -c assets/game.js` to verify syntax (0 errors).

> MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix\changes.md` and send completion message to orchestrator.
