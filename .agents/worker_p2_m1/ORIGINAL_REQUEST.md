## 2026-07-23T14:29:54Z
You are worker_p2_m1, a worker subagent for Milestone M1 (Farm Scene Tilemap & Decoration Upgrade + Fishing Scene Sprites Upgrade).

Working directory: C:\VibeCode\Hangeul Valley\.agents\worker_p2_m1\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Instructions:
1. Create your working directory C:\VibeCode\Hangeul Valley\.agents\worker_p2_m1\ if needed.
2. Read C:\VibeCode\Hangeul Valley\.agents\explorer_p2_m1\analysis.md and handoff.md for complete texture key lists, line locations, single-token palettes, and matrix specifications.
3. Update `generateTilemapTextures()` in `C:\VibeCode\Hangeul Valley\game.js`:
   - Upgrade Farm tilemaps (grass, path, fence, house, shore tiles) and farm scene decorations (trees, flowers, stone well, barrels, crates, signpost, notice board, shop sign, arcade machine, dungeon portal, fishing dock) using `drawMatrix()` or rich procedural canvas art.
   - Use multi-tone earthy Stardew Valley colors (`STARDEW_PALETTE`), subtle dithering/texture variation, 1px dark outline (`'K'` = 0x0F172A).
4. Update `_genFishingTextures()` in `C:\VibeCode\Hangeul Valley\game.js`:
   - Upgrade all 13 fish species (carp, salmon, tuna, squid, eel, goldfish, seabass, shrimp, octopus, catfish, mackerel, legendary, clam) and fishing accessories (bobber, rod, dock_plank, dock_post).
   - Ensure distinct silhouettes, multi-tone shading (at least 3 tones per fish), 1px dark outline (`'K'` = 0x0F172A).
5. STRICT CONSTRAINTS:
   - DO NOT MODIFY: Player Farmer (walk/action/tool sprites), Ginger Cat NPC (10 frames), Wizard Merlin NPC (2 frames), DynamicShadowSystem.
   - Single-character tokens ONLY in `drawMatrix()` palettes. NEVER use multi-character tokens (like 'Wood', 'Metal', etc.).
   - Matrix Row Width: Every row string in a matrix array MUST have exact character length matching grid size (e.g., 16 characters for 16x16 grid).
   - 100% Texture Key Parity: Keep all existing texture keys intact and unchanged (check list in explorer analysis).
6. File Sync & Validation:
   - Fully sync `game.js` ↔ `assets/game.js` (copy the updated `game.js` content to `assets/game.js`).
   - Run `node -c game.js` and `node -c assets/game.js` using run_command to verify 0 syntax errors.
7. Write your changes summary to `C:\VibeCode\Hangeul Valley\.agents\worker_p2_m1\changes.md` and handoff report to `C:\VibeCode\Hangeul Valley\.agents\worker_p2_m1\handoff.md`.
8. Send a message to orchestrator with your results.
