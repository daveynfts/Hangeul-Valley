## 2026-07-22T10:04:58Z
You are Worker M2 Fix (teamwork_preview_worker).
Your working directory is `C:/VibeCode/Hangeul Valley/.agents/worker_m2_fix/`.

Task: Fix the 2 Critical Reviewer Findings in `game.js` and `assets/game.js`.

Read the reviewer report at:
- `C:/VibeCode/Hangeul Valley/.agents/reviewer_m2_1/handoff.md`

Fix Instructions:
1. **Fix Critical Finding 1 (Shop Quiz Gate Bypass)**:
   - In `buyLevel(idx)` (around line 1262) and `buyLevelFromSelect(idx)` (around line 1066), do NOT call `_doLevelPurchase(idx)` directly.
   - Call `startShopQuizGate(idx)` so that the 3-question Korean translation quiz modal (`#shop-quiz-overlay`) is launched first.
   - Ensure `_doLevelPurchase(idx)` is executed ONLY when the player correctly answers all 3 quiz questions. If the player fails or cancels, the purchase must abort and coins must not be deducted.

2. **Fix Critical Finding 2 (Currency State Desync / Primitive `gold -= cost` Mutations)**:
   - In `_doLevelPurchase(idx)`, Trophy purchase listeners, Hint button handlers, and any other shop purchase functions, replace direct primitive `gold -= cost` / `gold += reward` with `spendCoins(cost)` or `addCoins(reward)`.
   - `spendCoins(cost)` must deduct from `playerCurrencies.coins`, call `syncGoldAlias()`, update HUD via `updateCurrencyHUD()`, and save via `persistSave()`.
   - Ensure `spendCoins` checks for sufficient balance (`playerCurrencies.coins >= cost`).

3. **Asset Mirror Sync**:
   - Mirror all changes from `game.js` to `assets/game.js`.

4. **Verification**:
   - Run `node -c game.js` and `node -c assets/game.js` to verify zero syntax errors.
   - Write your handoff report to `C:/VibeCode/Hangeul Valley/.agents/worker_m2_fix/handoff.md`.


## 2026-07-22T10:05:20Z
Received message from parent (1ed8fa99-4393-43b4-b954-c485a864f0e6):
**Context**: M2 Remediation
**Content**: Additional quality recommendation from Challenger 2: Please also add an internal guard check inside `claimMainQuest(actNum)` (in `game.js` and `assets/game.js`) to verify `act.progress >= act.target` (and SRS mastery requirements if applicable) before awarding Coins, Gems, and Honor rewards, preventing any programmatic bypass.
**Action**: Please include this guard check alongside your fixes for Critical Findings 1 and 2.

