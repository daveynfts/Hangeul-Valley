## 2026-07-23T09:12:52+07:00
You are Worker M2 Fix Specialist for Hangeul Valley Character Design Upgrade.

Working Directory: C:/VibeCode/Hangeul Valley/.agents/worker_m2_fix
Project Root: C:/VibeCode/Hangeul Valley

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. A Forensic Auditor will independently verify your work.

Objective:
Fix the 17-row height anomaly in `player_pick_down_2` matrix in `game.js` so it is strictly 16 rows (16x16), and synchronize to `assets/game.js`.

Instructions:
1. Inspect `player_pick_down_2` in `game.js` (around lines 1190-1208).
2. Remove the duplicated hat brim row `'..VVVVVVVVVVVV..'` (or extra line) so that `player_pick_down_2` has exactly 16 string elements in its array.
3. Verify that all 9 Farmer action matrices (`player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`), 3 tool matrices (`tool_*`), and 9 Ginger Cat matrices (`cat_*`) have strictly 16 rows (16x16).
4. Synchronize `game.js` -> `assets/game.js`.
5. Run `node -c game.js` and `node -c assets/game.js` to ensure 0 syntax errors.
6. Run `python "C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\test_matrices.py"` or `node "C:\VibeCode\Hangeul Valley\.agents\challenger_m3_1\test_character_upgrade.js"` to confirm 100% matrix grid compliance.

Write a brief report to `C:/VibeCode/Hangeul Valley/.agents/worker_m2_fix/handoff.md` and send a message reporting completion.
