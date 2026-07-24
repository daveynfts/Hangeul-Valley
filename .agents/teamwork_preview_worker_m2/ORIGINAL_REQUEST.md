## 2026-07-24T13:30:56Z
You are Worker 3 for Milestone 2 (Cooking System with Recipes, UI & Achievements).
Your working directory for metadata is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2`.
Project root is `d:\Hangeul Valley`.

Read the specifications and designs in:
- `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md`
- `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`
- `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1\analysis.md` (Recipes & Cooking Engine)
- `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_2\analysis.md` (Cooking UI & HUD Integration)
- `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_3\analysis.md` (Achievements & Persistence Integration)

### Your Tasks:
1. **Cooking Recipes & Execution Engine (R3)**:
   - In `game.js`: Define `COOKING_RECIPES` array of 10 authentic Korean dishes (Novice to Master tier) requiring harvested crop ingredients (`cabbage`, `radish`, `green_onion`, `chili`, `garlic`, `rice`, `soybean`, `carrot`, `potato`, `corn`, `strawberry`).
   - Implement `cookRecipe(recipeId)`: checks owned vs needed ingredients in `inventoryState`, deducts ingredients using `removeItemFromInventory()`, awards vocab XP (`addHonor`) and Gold (`addCoins`), updates cooked recipes tracking in `cookingState`, refreshes UI grids, and triggers achievement checks.

2. **Cooking UI Modal & HUD Integration (R3)**:
   - In `index.html`: Add `#cooking-overlay` glass modal with header, recipe cards container `#cooking-recipe-list`, selected recipe detail container `#cooking-detail-view` (showing dish icon, Korean/English names, description, `owned / needed` ingredient badges in green/red, Cook action button, reward badges). Add `#cooking-btn` (`🍳 Cooking`) into HUD actions group.
   - In `game.js`: Add `openCookingUI()`, `closeCookingUI()`, `renderCookingGrid()`, and register keydown listener for `'C'` / `'c'` with text input focus guard (`INPUT`, `TEXTAREA`, `isContentEditable`).

3. **Master Chef Trophy & Save Persistence (R3)**:
   - In `game.js`: Add Master Chef trophy (`id: 'master_chef'`, `name: 'Master Chef (요리 왕)'`, `icon: '👨🍳'`, `desc: 'Cook all 10 recipes at least once'`) to `TROPHIES_DB`.
   - Implement `checkCookingAchievements()` to grant trophy when 100% of recipes have been cooked.
   - Update `collectSave()`, `applySave()`, and `migrateSaveData()` to persist `cookingState` (cooked recipe IDs, dish counts).

4. **Synchronization & Verification**:
   - Copy `game.js` to `assets/game.js` and `index.html` to `assets/index.html`.
   - Run `node -c game.js` and `node -c assets/game.js` to verify syntax (0 errors).
   - Document changes in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\changes.md` and `handoff.md`.

> MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Send a message to the orchestrator when completed with a summary of changes and syntax verification logs.
