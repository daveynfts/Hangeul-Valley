## 2026-07-24T12:17:26Z
You are the M2 Pet System Removal Worker for Hangeul Valley.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Completely remove all pet companion system elements from `game.js`, `assets/game.js`, `index.html`, and `assets/index.html` as mapped in `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2\analysis.md`.

Steps:
1. Read `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2\analysis.md` for exact line numbers and deletion/refactoring blueprints across all 6 pet subsystems:
   - Pet textures (`_genPetTextures` call & definition)
   - Pet state & persistence (`petState`, `collectSave`, `applySave`, schema defaults)
   - Pet movement & companion loop (`_updatePetCompanion` call & definition)
   - Pet passives & XP hooks (`isPetActive`, `getPetPassiveMultiplier`, `addPetXP`, `decayPetHappiness`)
   - Pet functions & UI modals (`PET_DB`, `openPetOverlay`, `closePetOverlay`, `adoptPet`, `equipPet`, `feedActivePet`, `startPetLevelUpQuiz`, `#pet-overlay` HTML/CSS, `#pet-btn` HUD button)
   - Pet leaderboard tab (`#lbtab-pets`, `LOCAL_RIVALS` pet metrics, `pets` tab sorting/rendering)
2. Perform clean removals on `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\index.html`.
   (Note: Do NOT delete VOCAB_FACTS dictionary entries like "civil petitioner").
3. Synchronize `game.js` to `assets/game.js` and `index.html` to `assets/index.html`.
4. Run syntax verification via run_command:
   - `node -c "d:\Hangeul Valley\game.js"`
   - `node -c "d:\Hangeul Valley\assets\game.js"`
5. Document all changes in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\changes.md`.
6. Write your handoff report to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\handoff.md` and send a completion message to the parent orchestrator.
