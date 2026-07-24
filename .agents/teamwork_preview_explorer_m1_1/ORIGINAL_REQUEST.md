## 2026-07-24T14:48:09Z
You are teamwork_preview_explorer_m1_1.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1`. Please write your analysis to `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1\analysis.md` and your handoff to `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1\handoff.md`.

Target Scope: Milestone 1 - Shop NPC Sprite Polish & Upgrade (R1).
Read the project specifications in `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md` and `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`.

Your objective:
1. Search `game.js` to locate all code responsible for baking, rendering, drawing, or instantiating the Shop NPC sprite and its shop counter / accessories.
2. Analyze the current baseline implementation of the Shop NPC sprite. Count distinct fill color tokens currently used in its bake/draw function.
3. Detail how to upgrade the Shop NPC sprite with:
   - Richer pixel art detail
   - Multi-tone clothing shading (base, shade, highlight)
   - Facial expression refinement (eyes, Korean merchant warm expression)
   - Accessory details (apron, hat, coins on counter)
   - Crisp 1px dark outlines for visual consistency with Robot character
   - Increased distinct color token count
4. Verify all collision, depth-sorting, scale, positioning, and Shop interaction logic (`openShop()` / shop modal overlay) to guarantee NO visual or functional regression.
5. Provide exact line numbers, code structure analysis, and precise recommendation for the implementation worker.
