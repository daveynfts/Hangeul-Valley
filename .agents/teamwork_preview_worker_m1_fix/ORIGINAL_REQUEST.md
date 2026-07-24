## 2026-07-24T14:54:40Z
<USER_REQUEST>
You are teamwork_preview_worker_m1_fix.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix`. Please write your implementation notes to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix\changes.md` and your handoff to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix\handoff.md`.

Target Scope: Milestone 1 Fixes — Matrix Row Length Bug & Unused Palette Token Integration in `game.js`.

Read the feedback from Challenger 1 (`d:\Hangeul Valley\.agents\teamwork_preview_challenger_m1_1\handoff.md`) and Reviewer 2 (`d:\Hangeul Valley\.agents\teamwork_preview_reviewer_m1_2\handoff.md`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

Fix Tasks:
1. **Fix `WIZ_1` Row 4 Character Count**:
   - In `game.js` around line 278-279 (`PixelArtRenderer.WIZ_1`), locate row index 4: `'...KphHHHHHHHhK.A'`.
   - Change it to `'...KphHHHHHHHhKA'` (exactly 16 characters long). Verify that all 20 rows of `WIZ_1` are strictly 16 characters long.

2. **Integrate Unused Palette Color Tokens**:
   - For `W_PAL`: Ensure tokens `'y'`, `'Y'`, `'W'`, `'B'`, `'e'`, `'x'` are used in `WIZ_0` and `WIZ_1` matrix arrays (e.g. for gold star embroidery highlights, robe fabric folds, crystal orb highlights, beard shading, or aura sparkles) so that ALL 32 tokens in `W_PAL` are actively rendered in the matrix.
   - For `SHOP_PALETTE`: Ensure token `'x'` (`0xF4A261`) is used in `shop_sign` matrix (e.g. counter wood highlight/shadow accent) so that ALL 18 tokens in `SHOP_PALETTE` are actively rendered.

3. **Syntax Validation & Sync**:
   - Run `node -c game.js` via run_command. Must return 0 syntax errors.
   - Copy `game.js` to `assets/game.js`.
   - Run `node -c assets/game.js`.
   - Verify 100% SHA256 byte match between `game.js` and `assets/game.js`.

4. Document all changes and verification commands in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1_fix\handoff.md`.

</USER_REQUEST>
