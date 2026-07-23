## 2026-07-22T11:35:56Z
Milestone R4 failed its second verification gate due to two runtime bugs found by Challenger 2.
Please apply these two exact fixes to `game.js`:
1. `FarmScene._bakeTextures()` Runtime ReferenceError at ~L4001:
`gcs is not defined` because `const gcs = mk();` is missing before `pR(gcs, 10, 10, 4, 4, 0x57534E)`. Add `const gcs = mk();` right before it.
2. `collectSave()` TypeError on Null/Sparse Plot Array at ~L2295:
`sceneRef.plots.filter(p => p.ko)` throws if a plot is null. Update it to `sceneRef.plots.filter(p => p && p.ko)`.

Do NOT CHEAT. All implementations must be genuine.
Verify syntax with `node -c game.js`. Keep `game.js` and `assets/game.js` in sync.
Your working directory is C:/VibeCode/Hangeul Valley/.agents/orchestrator_graphics/worker_m4_fix_2. Write your handoff.md there.
