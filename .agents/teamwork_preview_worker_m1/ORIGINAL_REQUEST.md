## 2026-07-24T11:28:51Z

You are Worker 1 for Milestone 1: Main Character Redesign & 4-Directional Walk Animations.
Your working directory is: d:\Hangeul Valley\.agents\teamwork_preview_worker_m1
Project root is: d:\Hangeul Valley

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
Completely redesign the main character sprite set and 4-directional walk animations in `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\assets\game.js` to match the Stardew Valley Chibi 1:2 ratio aesthetic (modern Korean farmer look with dungarees, straw hat, brown hair, cute large eyes).

Requirements & Specification:
1. Open and edit both `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\assets\game.js`.
2. Locate `PixelArtRenderer._genPlayerTextures(scene)`.
3. Replace Palette `P` with a rich palette (≥30 tokens) containing:
   - Outer outline token `'K'`: `0x1A1A2E`.
   - Skin tokens: `X` (light peach), `x` (base peach), `i` (shadow peach), `I` (blush), `O` (bright highlight), `o` (dark shadow) — at least 3 active in matrices.
   - Hair tokens: `f` (brown highlight), `H` (brown base), `h` (brown shadow) — at least 3 active in matrices.
   - Clothing tokens (denim dungarees / shirt): `z` (denim highlight), `Z` (denim base), `q` (denim shadow), `Q` (t-shirt white/yellow), `B` (t-shirt shadow), `2` (accent), `J` (pocket) — at least 3 active in matrices.
   - Eye tokens: `N` (dark pupil) and `W` (white highlight).
   - Hat/Ribbon/Boots tokens: `t`, `T`, `v`, `V`, `r`, `R`, `b`, `g`, etc.
4. Replace all 24 matrices ($16 \times 16$ arrays of 16-char strings):
   - 12 Walk matrices: `down_0`, `down_1`, `down_2`, `up_0`, `up_1`, `up_2`, `left_0`, `left_1`, `left_2`, `right_0`, `right_1`, `right_2`.
   - 9 Action matrices: `water_down_0..2`, `harvest_down_0..2`, `pick_down_0..2`.
   - 3 Tool matrices: `tool_watering_can`, `tool_basket`, `tool_sickle`.
5. Strict Verification Criteria to Satisfy:
   - Every row of every matrix must be exactly 16 characters.
   - Outer boundary rule: Every non-`.` token exposed to transparent `.` (up, down, left, right neighbor) MUST be `'K'`.
   - Head height on walk down frames must be ≥35% of height (≥5.5 rows).
   - Facial area on walk down frames must be ≥3 rows × 6 cols, containing at least 2 distinct `NW` eye pairs.
   - Walk animation diffs per direction (0-1, 1-2, 0-2) must be ≥8 characters for bouncy SDV motion.
   - Legacy `farmer0..3` aliases must be registered: `makeAlias('farmer0', 'player_walk_down_0')`, etc.
   - Animation keys must be registered: `player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`, `player-water`, `player-harvest`, `player-pick`.
6. File Sync & Syntax Verification:
   - Run `node -c "d:\Hangeul Valley\game.js"` and `node -c "d:\Hangeul Valley\assets\game.js"` to ensure 0 syntax errors.
   - Ensure `game.js` and `assets/game.js` are 100% identical in content.
   - Run node script `node "d:\Hangeul Valley\.agents\victory_auditor_player_sdv_v2\verify_all.js"` to verify all 10 victory audit checks pass 100%.

7. Output Artifacts:
   - Document your changes in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\changes.md`.
   - Deliver `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\handoff.md` with build/test results and notify parent when done.
