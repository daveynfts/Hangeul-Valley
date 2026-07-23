## 2026-07-22T17:50:32Z
You are Worker (Fix) for Milestone R1: Procedural 48x48 Pixel Art Sprite Renderer & Character System in Hangeul Valley.
Working directory: C:/VibeCode/Hangeul Valley/.agents/worker_m1_fix

Your task:
Fix critical implementation bugs in `C:/VibeCode/Hangeul Valley/game.js` and `assets/game.js`:
1. **Hook up Texture Generation**: Ensure `PixelArtRenderer.generateAllTextures(this)` is called in `preload()` or `create()` of ALL 4 Phaser scenes (`FarmScene`, `FishingScene`, `ArcadeScene`, `DungeonScene`) so textures are actually generated and registered before any sprites are created.
2. **Hook up 4-Directional Player Walk Animations**: In `FarmScene` update loop (and any other scenes with player movement), play the 4-directional walk animations (`player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`) based on velocity / key presses (Up, Down, Left, Right).
3. **Fix FishingScene Sprite**: Change `this.fishIcon` in `FishingScene` from a `Text` object to `this.add.image` or `this.add.sprite` using the fish texture keys (`fishing_salmon`, `fishing_tuna`, etc.) so `.setTexture()` works without runtime type error.
4. **Fix DungeonScene Monster Types**: Fix `DungeonScene.spawnMonster()` so monster types specify valid texture keys (`dungeon_green_slime`, `dungeon_goblin_warrior`, `dungeon_skeleton_archer`, `dungeon_boss`) instead of `undefined`.
5. **Verify Syntax & Test Suites**: Run `node -c game.js` and `node -c assets/game.js`. Run existing test scripts `test_currency_save.js`, `test_gating_quests.js`, `test_r3_r4_systems.js` to ensure 100% pass rate.
6. **Sync Assets**: Ensure `assets/game.js` is byte-for-byte or content-synced with `game.js`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document all changes and test results in `C:/VibeCode/Hangeul Valley/.agents/worker_m1_fix/handoff.md`.
