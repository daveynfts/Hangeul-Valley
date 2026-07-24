## 2026-07-24T14:58:01Z
<USER_REQUEST>
You are teamwork_preview_worker_m2.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2`. Please write your implementation notes to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\changes.md` and your handoff to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\handoff.md`.

Target Scope: Milestone 2 - Cat NPC (R3), Notice Board & Portal (R4), and Beehive (R5) Sprite Polish & Upgrade.

Read Explorer handoff reports:
- Cat NPC Explorer Handoff: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1\handoff.md`
- Board & Portal Explorer Handoff: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_2\handoff.md`
- Beehive Explorer Handoff: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_3\handoff.md`
- Project Specs: `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md` and `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implementation Tasks:
1. **Cat NPC Muop (R3)**:
   - In `game.js`, locate `PixelArtRenderer` static `CAT_PAL` / `C` dictionary and `cat_0` & `cat_1` matrices, plus `FarmScene._bakeTextures()` `gcat` bake.
   - Upgrade palette to 19 color tokens (ginger fur, white chest fluff, eye green with catchlight `W`, slate 1px dark outlines `K = 0x0F172A`).
   - Update `cat_0` and `cat_1` matrices to feature forehead M-mark, tabby flank stripes, expressive eyes with catchlights, and frame-to-frame tail-swish idle animation.
   - Ensure all defined palette tokens are actively used in the matrices.
   - Retain origin `(0.5, 1)`, scale `0.75`, depth sorting, shadow anchor, proximity check (65px), and `showCatDialog()` modal trigger.

2. **Notice Board & Dungeon Portal (R4)**:
   - In `game.js`, locate `_bakeTextures()` for `'notice_board'` and `'dungeon_portal'`.
   - Upgrade `'notice_board'` matrix from 6 to 18 color tokens with 1px dark slate outlines, detailed wood grain texture, pinned paper notes with visible text marks, red pushpins, and warm hanging lantern glow.
   - Upgrade `'dungeon_portal'` matrix from 4 to 17 color tokens with 1px dark slate outlines, multi-tone stone arch, glowing ancient runes (cyan, pink, amber gold), cosmic blue swirl core, white hot energy flash, and pulsing glow particles.
   - Ensure all defined palette tokens are actively used in the matrices.
   - Retain origin `(0.5, 1)`, scales, depth sorting, `openMemoryGame()` overlay trigger, and `DungeonScene` transition trigger.

3. **Beehive (R5)**:
   - In `game.js`, locate `_genBeehiveTextures` / `_bakeTextures()` for `'beehive'`.
   - Upgrade `'beehive'` matrix from 8 to 17 color tokens with 1px dark slate outlines (`K = 0x0F172A`), visible honeycomb surface micro-texture, 6-tier straw skep shading, glossy dripping honey droplets with specular catchlights, and multi-tone wooden base.
   - Ensure all defined palette tokens are actively used in the matrix.
   - Retain placement `(bx, by)`, origin `(0.5, 1)`, scale `1.6`, drop shadow, proximity check (<85px), and `enterBeeScene()` trigger.

4. **Syntax Check & Sync**:
   - Run `node -c game.js` via run_command. Must pass with 0 syntax errors.
   - Copy `game.js` to `assets/game.js`.
   - Run `node -c assets/game.js`.
   - Verify SHA256 hashes match 100%.

5. Document all changes and verification outputs in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\handoff.md`.

</USER_REQUEST>
