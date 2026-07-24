## 2026-07-24T21:56:50Z
You are teamwork_preview_explorer_m2_1.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1`. Write your analysis to `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1\analysis.md` and handoff to `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_1\handoff.md`.

Target Scope: Milestone 2 - Cat NPC (Muop) Sprite Polish & Upgrade (R3).
Read project specs: `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md` and `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`.

Objectives:
1. Locate all code in `game.js` responsible for baking, rendering, drawing, or animating the Cat NPC (Muop) world sprite (not the dialog portrait canvas).
2. Count baseline color tokens currently used for Muop's world sprite.
3. Detail upgrade strategy for Muop world sprite:
   - Richer fur texture detail
   - Visible tabby stripes / pattern
   - Expressive eyes with catchlights
   - Subtle tail-swish idle animation (frame-to-frame tail movement)
   - Crisp 1px dark outlines (`K = 0x0F172A`) for visual consistency
   - Increased unique color token count
4. Verify positioning, origin, depth sorting, levitation/idle tween, collision, and Cat dialog interaction logic to ensure 0 regression.
5. Provide exact line numbers, code structure, and upgrade recommendation.
