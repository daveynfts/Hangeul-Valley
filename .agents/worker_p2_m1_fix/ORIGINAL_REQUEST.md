## 2026-07-23T07:35:50Z
<USER_REQUEST>
You are worker_p2_m1_fix, a worker subagent to fix Milestone M1 defects in `game.js` and `assets/game.js`.

Working directory: C:\VibeCode\Hangeul Valley\.agents\worker_p2_m1_fix\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

Defects to remediate in `C:\VibeCode\Hangeul Valley\game.js`:
1. `DECOR_PALETTE` Missing Token `'c'`:
   - Add `'c': 0x6BB1D6` to `DECOR_PALETTE` (around lines 5410-5439) so that `stone_well` matrix tokens `'c'` at lines 5473-5474 render cyan water basin pixels correctly.
2. Matrix Row Width Mismatch (`dock_plank` & `fishing_dock`):
   - Fix line 2915 and any line in `dock_plank` / `fishing_dock` where row string is 15 chars (`'KOWWWWWWWWWWOOK'`) — change to 16 chars (`'KOOWWWWWWWWWWOOK'`). Ensure EVERY row string in `dock_plank` and `fishing_dock` is exactly 16 characters.
3. Unmapped Space Token in `catfish` / `fishing_catfish`:
   - Fix line 2816 (row 5 of catfish matrix): change leading space `' KA...'` to `'.KA...'` (change space token `' '` to `'.'`).
4. Multi-Tone Shading (< 3 Body Tones) & Outline Upgrades:
   - `clam` / `fishing_clam`: Add a 3rd body shade tone to the palette and matrix (e.g. `'Q'` base, `'W'` light, `'E'` shadow).
   - `dock_post`: Add a 3rd wood shade tone to palette and matrix (e.g. `'O'` base, `'N'` highlight, `'M'` shadow).
   - `fishing_bobber`: Add a 3rd body tone to palette and matrix (e.g. `'R'` red base, `'W'` white, `'D'` dark red shadow).
   - `fishing_rod`: Add 1px dark slate outline `'K'` (`0x0F172A`) around the rod matrix AND add a 3rd tone (e.g. `'C'`, `'D'`, `'E'`).
5. Re-Sync & Syntax Check:
   - Fully sync `game.js` ↔ `assets/game.js`.
   - Run `node -c game.js` and `node -c assets/game.js` via run_command to verify 0 syntax errors.
6. Write your report to `C:\VibeCode\Hangeul Valley\.agents\worker_p2_m1_fix\handoff.md`.
7. Send message to orchestrator upon completion.
</USER_REQUEST>
