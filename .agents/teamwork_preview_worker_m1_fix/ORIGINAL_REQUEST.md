## 2026-07-24T11:31:41Z
You are Worker 2 for Milestone 1 Fix: Complete Removal of Legacy Player Sprite Baking Routines.
Your working directory is: d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix
Project root is: d:\Hangeul Valley

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
Completely remove the leftover legacy player sprite texture baking loop in `FarmScene._bakeTextures()` inside `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\assets\game.js`.

Detailed Steps:
1. Open `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\assets\game.js`.
2. Locate `_bakeTextures()` inside `FarmScene` (around lines 7586-7616).
3. Find the legacy player sprite texture baking block:
   ```javascript
   // Player (4 walk frames)
   for(let fr=0; fr<4; fr++){
     const gp=mk();
     ...
     gp.generateTexture('farmer'+fr, 14*PS, 25*PS); gp.destroy();
   }
   ```
4. Completely remove this block from `_bakeTextures()` in both `game.js` and `assets/game.js`. This guarantees that legacy texture aliases `farmer0..3` (registered in `PixelArtRenderer._genPlayerTextures`) are NOT overwritten at runtime by obsolete 14x25 procedural graphics.
5. Run syntax check:
   `node -c "d:\Hangeul Valley\game.js"`
   `node -c "d:\Hangeul Valley\assets\game.js"`
6. Confirm SHA256 equality between `game.js` and `assets/game.js`.
7. Execute tests:
   `node "d:\Hangeul Valley\.agents\victory_auditor_player_sdv_v2\verify_all.js"`
   `node "d:\Hangeul Valley\.agents\teamwork_preview_challenger_m1_2\test_harness.js"`
8. Verify `test_harness.js` confirms `farmer0` remains 48x48px (matching `player_walk_down_0`).
9. Document changes in `changes.md` and deliver `handoff.md`.
