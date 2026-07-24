## 2026-07-24T12:47:18Z

<USER_REQUEST>
You are Worker 1 for Milestone 1: Industrial Yellow Farmer Pixel Robot Replacement & Integration.
Your working directory is: d:\Hangeul Valley\.agents\teamwork_preview_worker_m1
Project root: d:\Hangeul Valley
Scope document: d:\Hangeul Valley\.agents\orchestrator\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Input analysis from Explorers:
- Explorer 1: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1\analysis.md`
- Explorer 2: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2\analysis.md` and `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2\clean_walk_matrices.json`
- Explorer 3: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_3\analysis.md`

Your tasks:
1. Update `_genPlayerTextures(scene)` in `game.js` (~lines 1290–1870):
   - Completely wipe existing human player sprite matrices and replace them with the Industrial Yellow Farmer Pixel Robot implementation.
   - Define the updated palette `P` with tokens for yellow metallic casing (`0xFACC15`, `0xEAB308`, `0xCA8A04`), slate metallic chassis/treads (`0x94A3B8`, `0x64748B`, `0x475569`, `0x334155`), glowing LED visor/screen (`0x38BDF8`, `0x06B6D4`, `0x0284C7`), antenna/beacon glow, 1px dark outline (`0x0F172A`), and tool/action FX tokens.
   - Update all 12 walk matrices (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`) using the 16x16 matrices designed by Explorer 2 with mechanical tread step differences (>= 8px changes in tread rows 11-15) and 1px mechanical bobbing.
   - Update all 9 action matrices (`player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`) designed by Explorer 3.
   - Update all 3 tool sprite matrices (`tool_watering_can`, `tool_basket`, `tool_sickle`).
   - Preserve legacy aliases (`farmer0..3`).
2. Verify syntax by executing `node -c game.js`.
3. Copy `game.js` to `assets/game.js` to keep them byte-synchronized.
4. Verify syntax by executing `node -c assets/game.js`.
5. Verify SHA256 checksum match between `game.js` and `assets/game.js`.
6. Document changes in `changes.md` and write `handoff.md` in your working directory.
7. Send a message to orchestrator with your completion report when done.
</USER_REQUEST>
