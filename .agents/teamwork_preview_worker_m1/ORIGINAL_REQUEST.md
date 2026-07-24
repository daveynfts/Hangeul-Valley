## 2026-07-24T12:17:08Z
You are the M1 Character Sprite Worker for Hangeul Valley.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Implement the enhanced main character sprite palette and 24 micro-pixel matrix definitions in `d:\Hangeul Valley\game.js` according to the detailed spec in `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1\analysis.md`.

Steps:
1. Read `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1\analysis.md` for the exact expanded palette `P` and 24 matrix definitions.
2. Edit `d:\Hangeul Valley\game.js` (`_genPlayerTextures` method) to update the palette `P` and all 24 player matrices (`down_0..2`, `up_0..2`, `left_0..2`, `right_0..2`, `water_down_0..2`, `harvest_down_0..2`, `pick_down_0..2`, `tool_*`, `farmer0..3`).
3. Synchronize `d:\Hangeul Valley\game.js` to `d:\Hangeul Valley\assets\game.js` so both files are 100% identical.
4. Run syntax verification via run_command: `node -c "d:\Hangeul Valley\game.js"` and `node -c "d:\Hangeul Valley\assets\game.js"`. Ensure both pass with 0 syntax errors.
5. Document all changes in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\changes.md`.
6. Write your handoff report to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\handoff.md` and send a completion message to the parent orchestrator.
