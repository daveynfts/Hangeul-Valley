## 2026-07-24T15:00:08Z

<USER_REQUEST>
You are Worker M3 for Milestone 3 of Hangeul Valley NPC Sprite Polish & Upgrade.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m3`.

Your task:
1. Create your working directory `d:\Hangeul Valley\.agents\teamwork_preview_worker_m3` and initialize state/progress files.
2. Synchronize mirror files:
   - Copy `d:\Hangeul Valley\game.js` to `d:\Hangeul Valley\assets\game.js`.
   - Copy `d:\Hangeul Valley\index.html` to `d:\Hangeul Valley\assets\index.html` (if `index.html` exists).
3. Run syntax validation:
   - `node -c d:\Hangeul Valley\game.js`
   - `node -c d:\Hangeul Valley\assets\game.js`
4. Calculate and compare SHA256 hashes of:
   - `game.js` vs `assets/game.js`
   - `index.html` vs `assets/index.html`
5. Verify 100% SHA256 hash match between root and asset mirror files.
6. Write your handoff report to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m3\handoff.md`.
7. Send a message to orchestrator (`271beac4-82f5-4128-b9b0-62d62497fc69`) with the verification results, syntax check outputs, and SHA256 hashes.
</USER_REQUEST>
