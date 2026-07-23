## 2026-07-22T11:28:20Z
Milestone R4 failed its verification gate due to findings from Challenger 2. 
Please analyze `game.js` and design a fix strategy for the following specific issues:
1. Camera Transition Bounds: `setBounds()` is missing across `FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`, allowing camera scroll/shake/zoom transitions to spill past map borders into negative coordinate space (`scrollX < 0`, `scrollY < 0`).
2. Memory Usage & Event Listener Memory Leaks: Duplicate Phaser scene event listeners on restart (`this.events.on('resume')`), uncleared global `setInterval` tickers (`buffHUD`/`heatInterval`), accumulation of DOM event listeners on UI re-renders, and missing `shutdown()` lifecycle hooks across all scenes.
3. State Machine Transitions: `collectSave()` crashes with `TypeError: Cannot read properties of undefined (reading 'filter')` at L2293 when saving during non-farm scenes, re-entrant `startSpellDuel()` calls leak timers, and cooking heating intervals run indefinitely if interrupted.

Provide a clear fix strategy and exact line-by-line code plan. Do NOT implement the code yourself. No external images. Write your handoff.md to C:/VibeCode/Hangeul Valley/.agents/orchestrator_graphics/explorer_m4_fix/handoff.md.
