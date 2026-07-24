## 2026-07-24T15:26:28Z
<USER_REQUEST>
You are Worker M2 for Hangeul Valley Expandable Locked Farm Plots & Decorative Fence Flowers.
Working directory: d:\Hangeul Valley\.agents\teamwork_preview_worker_m2
Target codebase: d:\Hangeul Valley

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your instructions:
Implement all requirements R1, R2, and R3 in d:\Hangeul Valley\game.js (and index.html if UI requires HTML edits), then copy modifications to assets/game.js (and assets/index.html) so SHA256 hashes are identical.

Detailed Requirements:

1. R1: 6 Locked Expandable Farm Plots
   - In game.js, extend plot definition so 6 additional farm plots exist (total 15 plots, indices 0..14). Plots 0..8 start unlocked. Plots 9..14 start locked.
   - Cost progression array for locked plots (indices 9..14): [100, 200, 350, 500, 750, 1000] Gold.
   - Visually render locked plots distinctly: darker soil tint (0x666666 or 0x444444), reduced alpha (0.35), lock overlay graphic/icon, and '🔒' text indicator.
   - Proximity interaction: Approaching a locked plot shows a prompt e.g. [SPACE] Unlock Plot #${p.index + 1} (${cost} Gold) 🔒.
   - Interaction flow: Pressing [SPACE] near a locked plot checks player Gold. If Gold >= cost, deduct Gold, unlock plot (plot.active = true), update visual rendering (clear tint, alpha 1.0, destroy lock icon, play chiptune SFX and particle sparkle + float label Plot Unlocked! 🔓), and save game state. If Gold < cost, play error SFX and display toast message e.g. Need ${cost} Gold 🪙 to unlock Farm Plot #${plot.index + 1}!.
   - Save/Load persistence: Save unlocked plot state (unlockedPlotCount or unlockedPlots array) in collectSave(), migrate legacy saves in migrateSaveData(), restore state in applySave(), so unlocked plots persist across save/load.

2. R2: Shop UI Integration for Plot Purchases
   - Add the 6 locked plot expansion items to the Shop UI modal/tab in game.js (or index.html).
   - Prices: Plot #1: 100g, Plot #2: 200g, Plot #3: 350g, Plot #4: 500g, Plot #5: 750g, Plot #6: 1000g.
   - Shop UI must clearly display locked/available plot expansions vs. owned/unlocked plots (showing "Owned" or disabled state for already-unlocked plots).
   - Purchasing a plot expansion from the Shop UI deducts Gold, unlocks the corresponding plot immediately on the farm grid, updates visuals, and saves state.

3. R3: Decorative Animated Flowers on Farm Fences
   - Add pixel-art flower decorations growing on/along perimeter fence posts surrounding the farming area.
   - Use at least 3 distinct flower colors (e.g., red 0xEF4444, yellow 0xFBBF24, purple 0xA855F7, pink 0xEC4899).
   - Implement a subtle idle sway animation loop for the fence flowers.

4. Code Quality & Dual-File Synchronization
   - Execute node -c game.js and node -c assets/game.js to ensure 0 syntax errors.
   - Copy game.js to assets/game.js and index.html to assets/index.html (if index.html modified) to ensure exact SHA256 byte sync.
   - Write implementation report to d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\changes.md and soft handoff to d:\Hangeul Valley\.agents\teamwork_preview_worker_m2\handoff.md.
   - Send completion message to parent orchestrator.
</USER_REQUEST>
