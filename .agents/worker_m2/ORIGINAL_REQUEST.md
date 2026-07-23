## 2026-07-23T09:07:12Z
<USER_REQUEST>
You are Worker M2 (Implementation & Code Synchronization Specialist) for Hangeul Valley Character Design Upgrade.

Working Directory: C:/VibeCode/Hangeul Valley/.agents/worker_m2
Project Root: C:/VibeCode/Hangeul Valley

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective:
Implement the complete character design upgrade and gameplay integration in game.js and index.html, and synchronize with assets/ mirror copies.

Reference Documents (MUST READ BEFORE CODING):
- C:/VibeCode/Hangeul Valley/.agents/explorer_m1_1/handoff.md and analysis.md (Farmer matrices, tool sprites & anim params)
- C:/VibeCode/Hangeul Valley/.agents/explorer_m2_1/handoff.md and analysis.md (Ginger Cat matrices, 4 animation states, "Muop" line numbers)
- C:/VibeCode/Hangeul Valley/.agents/explorer_m3_1/handoff.md and analysis.md (FarmScene trigger points, movement lock, playPlayerAction helper, _updateCatNPC state machine)

Specific Implementation Tasks:
1. Update `PixelArtRenderer` class and texture generation in `game.js`:
   - Add 9 Farmer action matrices (`player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`) and 3 tool sprite matrices (`tool_watering_can`, `tool_basket`, `tool_sickle`).
   - Register Phaser animations: `player-water`, `player-harvest`, `player-pick` (frameRate: 6, repeat: 0). Preserving existing 12 walk cycle frames (`player_walk_*`) and animations (`player-walk-*`).
   - Add 9 Ginger Cat matrices across 4 animation states (`cat_idle_0..1`, `cat_walk_0..2`, `cat_sit_0..1`, `cat_sleep_0..1`).
   - Register Phaser animations: `cat-idle` (frameRate: 3), `cat-walk` (frameRate: 6), `cat-sit` (frameRate: 3), `cat-sleep` (frameRate: 2).

2. Rename Cat NPC from "Muop" to "Ginger Cat":
   - Replace all occurrences in `game.js` (lines ~3537, ~4543, ~4965, etc.).
   - Replace occurrences in `index.html` (line ~1508 dialog header).
   - Verify case-sensitive search for "Muop" returns 0 matches in both files.

3. Implement Gameplay Action Triggers in `FarmScene` (`game.js`):
   - Add `isPerformingAction` state guard in `FarmScene.update()` to prevent movement key listener from overriding active action animations.
   - Implement `playPlayerAction(actionType, targetX, targetY, callback)` helper with tool sprite overlays and animation completion handler.
   - Wire Phase 2 quiz success (watering crop plot) to play `player-water` animation.
   - Wire Phase 3 quiz success (harvesting crop) to play `player-harvest` animation.
   - Wire Apple tree interaction (`this.appleRipe === true`) to play `player-pick` animation.

4. Implement Contextual Ginger Cat Behavior in `FarmScene` (`game.js`):
   - Implement `_updateCatNPC(dt)` state machine switching animations based on player proximity and interaction state (`cat-sit` when player is near/talking, `cat-walk` when moving, `cat-sleep` when player is far/idle, `cat-idle` default).

5. Synchronization & Code Integrity:
   - Copy updated `game.js` to `assets/game.js`.
   - Copy updated `index.html` to `assets/index.html`.
   - Verify `node -c game.js` and `node -c assets/game.js` run clean with zero syntax errors.

Write a complete report of all modifications and verification results to `C:/VibeCode/Hangeul Valley/.agents/worker_m2/changes.md` and `C:/VibeCode/Hangeul Valley/.agents/worker_m2/handoff.md`.
Then send a message to parent reporting completion.
</USER_REQUEST>

## 2026-07-23T10:16:45Z
<USER_REQUEST>
You are Worker M2 (Implementation & Code Sync Specialist) for the Hangeul Valley Pixel Art Quality Upgrade project.
Your working directory is: C:/VibeCode/Hangeul Valley/.agents/worker_m2/
Please create your working directory if it does not exist, and initialize your BRIEFING.md and progress.md there.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. Integrity violations WILL be detected and rejected.

Your mission is to apply all pixel art matrix and multi-tone palette redesigns to C:/VibeCode/Hangeul Valley/game.js, synchronize assets/game.js, and validate with `node -c game.js`:

1. Read the full design specifications from:
   - C:/VibeCode/Hangeul Valley/.agents/teamwork_preview_explorer_m1_1/analysis.md (Character Sprites: Farmer 12 walk + 9 action + 2 tools, Ginger Cat 8 frames, Wizard 2 frames)
   - C:/VibeCode/Hangeul Valley/.agents/teamwork_preview_explorer_m1_2/analysis.md (Crop & Fish Sprites: 20 crop textures, 11 fish species)
   - C:/VibeCode/Hangeul Valley/.agents/teamwork_preview_explorer_m1_3/analysis.md (Monsters, Bosses, Loot, Arcade Enemies, Player Ship, Projectiles, Powerups & 177 Key Inventory)

2. Update C:/VibeCode/Hangeul Valley/game.js:
   - Extend STARDEW_PALETTE and entity palette objects with multi-tone colors (≥3 tones per color area, 1px dark outline 0x121016, skin/hair/cloth/fur/leaf/scale highlights & shadows).
   - Update PixelArtRenderer matrix definitions for ALL character sprites, crops, fish, dungeon monsters, arcade enemies, loot items, and powerups as specified in analysis.md files.
   - Maintain 100% texture key parity — ensure all 177 texture keys inventoried by Explorer 3 remain registered and functional in `PixelArtRenderer.generateAllTextures()`.

3. Synchronize C:/VibeCode/Hangeul Valley/game.js to C:/VibeCode/Hangeul Valley/assets/game.js so both files are 100% identical.

4. Verify syntax with `node -c game.js`.

5. Write your implementation report to C:/VibeCode/Hangeul Valley/.agents/worker_m2/handoff.md and send a handoff message to the orchestrator.
</USER_REQUEST>

