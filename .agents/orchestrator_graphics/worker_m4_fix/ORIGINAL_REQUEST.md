## 2026-07-22T18:30:35Z
<USER_REQUEST>
Implement Milestone R4 fixes.
Read the Explorer handoff report located at:
C:/VibeCode/Hangeul Valley/.agents/orchestrator_graphics/explorer_m4_fix/handoff.md

Follow its architectural design and line-by-line strategy to fix:
1. Camera Transition Bounds (`setBounds()`).
2. Memory Usage & Event Listener Memory Leaks (`shutdown()` hooks, `setInterval` cleanup, remove duplicate resume listeners).
3. State Machine Transitions (`collectSave()` crash, spell duel leaks).

DO NOT CHEAT. All implementations must be genuine. A Forensic Auditor will independently verify your work.
Verify syntax with `node -c game.js`. Keep `game.js` and `assets/game.js` in sync.
Your working directory is C:/VibeCode/Hangeul Valley/.agents/orchestrator_graphics/worker_m4_fix. Write your handoff.md there.
</USER_REQUEST>
