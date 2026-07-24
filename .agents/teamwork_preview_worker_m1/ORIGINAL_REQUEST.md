## 2026-07-24T14:49:16Z
You are teamwork_preview_worker_m1.
Your working directory is `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1`. Please write your implementation notes to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\changes.md` and your handoff to `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\handoff.md`.

Target Scope: Milestone 1 - Shop NPC (R1) & Wizard NPC (R2) Sprite Polish & Upgrade.
Read the findings from Explorers:
- Shop NPC Explorer Handoff: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1\handoff.md`
- Wizard NPC Explorer Handoff: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2\handoff.md`
- Engine Explorer Handoff: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_3\handoff.md`
- Project Specs: `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md` and `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Update `game.js` for Shop NPC (R1):
   - Locate `_bakeTextures()` around line 7870.
   - Upgrade the `'shop_sign'` matrix to an expanded grid (e.g. 18x22) featuring a Korean merchant character with hat, warm facial expression, multi-tone clothing (hanbok vest, apron), wooden counter with shiny gold coins (`Y`), crisp 1px dark outlines (`K = 0x0F172A`), and increased distinct fill color tokens (from 6 to at least 14 unique colors).
   - Retain texture key name `'shop_sign'`, `setOrigin(0.5, 1)`, scale `1.3`, depth anchor, and `openShop()` trigger logic intact.

2. Update `game.js` for Wizard NPC (R2):
   - Locate `PixelArtRenderer._genNpcTextures(scene)` around line 2214 and `_bakeTextures()` around line 8004.
   - Upgrade `W_PAL` palette from 18 to 32 rich color tokens (deep purple robe shades, highlight purple, gold embroidery stars/moons, mystical beard gradients, staff wood, glowing cyan staff orb, magical aura sparkles, 1px dark outlines `K`).
   - Upgrade matrices `wiz_0` and `wiz_1` (16x20 size) and `gwiz` with detailed fabric fold shading, star/moon embroidery, flowing beard, glowing staff with particle highlights, micro-animation sparkles, and magical aura effect.
   - Retain texture keys `'wizard_idle_0'`, `'wizard_idle_1'`, `'wizard_npc'`, `setOrigin(0.5, 1)`, scale `1.8`, levitation tween, depth sorting, shadow anchor, and `openSpellDuel()` trigger logic intact.

3. Syntax Validation:
   - Run `node -c game.js` in powershell/cmd using run_command. Must pass with 0 syntax errors.

4. File Mirroring & SHA256 Sync:
   - Copy `game.js` to `assets/game.js`.
   - Run `node -c assets/game.js`.
   - Verify SHA256 hashes of `game.js` and `assets/game.js` match 100%.

5. Document all changes and verification commands in `d:\Hangeul Valley\.agents\teamwork_preview_worker_m1\handoff.md`.
