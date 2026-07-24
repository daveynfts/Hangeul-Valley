# Milestone 1 Empirical Test Results — Interaction & Non-Regression

**Agent**: `teamwork_preview_challenger_m1_2`  
**Role**: Empirical Challenger (critic / specialist)  
**Target File**: `d:\Hangeul Valley\game.js` & `d:\Hangeul Valley\assets\game.js`  
**Date**: 2026-07-24  

---

## 1. Test Harness Overview

A dedicated Node.js static analysis and non-regression empirical test harness (`test_m1_interactions.js`) was written and executed to verify:
1. **Shop NPC Proximity & Interaction Trigger**: Proximity check `< 90px` and call site `openShop()`.
2. **Wizard NPC Proximity & Interaction Trigger**: Proximity check `< 85px` and call site `openSpellDuel()`.
3. **Shop NPC Setup & Placement**: Origin `(0.5, 1)`, scale factor `1.3`, base coordinates `(sx = farm.x + farm.w + 175, sy = farm.y + farm.h / 2 + 25)`, initial depth `sy`, levitation tween `y: sy - 4` (`duration: 900`, `yoyo: true`, `ease: Sine.InOut`).
4. **Wizard NPC Setup & Placement**: Origin `(0.5, 1)`, scale factor `1.8`, base coordinates `(wx = farm.x + farm.w + 160, wy = farm.y - 85)`, initial depth `wy`, levitation tween `y: wy - 4` (`duration: 900`, `yoyo: true`, `ease: Sine.InOut`).
5. **Depth Sorting**: Dynamic Y-sorting in `updateDepthSort()` using static base anchors (`this.shopY || this.shopNPC.y` and `this.wizardY || this.wizardSprite.y`) to avoid depth flickering during levitation animations.
6. **Non-Regression & File Mirroring**: Syntax validation (`node -c`) for `game.js` and `assets/game.js`, and 100% SHA256 byte synchronization match between both files.

---

## 2. Empirical Execution Results & Assertion Ledger

| Suite # | Suite Description | Assertions Count | Passed | Failed | Status |
|---|---|---|---|---|---|
| Suite 1 | Shop NPC Interaction & Proximity Trigger | 3 | 3 | 0 | PASSED |
| Suite 2 | Wizard NPC Interaction & Proximity Trigger | 2 | 2 | 0 | PASSED |
| Suite 3 | Shop NPC Scene Placement, Origin, Scale & Levitation | 8 | 8 | 0 | PASSED |
| Suite 4 | Wizard NPC Scene Placement, Origin, Scale & Levitation | 8 | 8 | 0 | PASSED |
| Suite 5 | Depth Sorting in `updateDepthSort()` | 3 | 3 | 0 | PASSED |
| Suite 6 | Non-Regression & Dual-File Sync Audit | 3 | 3 | 0 | PASSED |
| **Total** | **All Verification Suites** | **27** | **27** | **0** | **PASSED** |

---

## 3. Detailed Assertion Results

```
--- SUITE 1: Shop NPC Interaction & Proximity Trigger ---
[PASS] #1: _interact() method defined in game.js
[PASS] #2: Shop NPC proximity distance check (< 90px) inside _interact()
[PASS] #3: openShop() call site inside < 90px proximity block

--- SUITE 2: Wizard NPC Interaction & Proximity Trigger ---
[PASS] #4: Wizard NPC proximity distance check (< 85px) inside _interact()
[PASS] #5: openSpellDuel() call site inside < 85px proximity block

--- SUITE 3: Shop NPC Scene Placement, Origin, Scale & Levitation ---
[PASS] #6: _createShopNPC method defined in game.js
[PASS] #7: Shop NPC X coordinate calculation (sx = farm.x + farm.w + 175)
[PASS] #8: Shop NPC Y coordinate calculation (sy = farm.y + farm.h / 2 + 25)
[PASS] #9: Shop NPC texture key is shop_sign
[PASS] #10: Shop NPC origin setting is (0.5, 1)
[PASS] #11: Shop NPC scale factor is 1.3
[PASS] #12: Shop NPC initial depth set to sy
[PASS] #13: Shop NPC levitation tween configuration (y: sy-4, duration: 900, yoyo: true, ease: Sine.InOut)

--- SUITE 4: Wizard NPC Scene Placement, Origin, Scale & Levitation ---
[PASS] #14: _createWizardNPC method defined in game.js
[PASS] #15: Wizard NPC X coordinate calculation (wx = farm.x + farm.w + 160)
[PASS] #16: Wizard NPC Y coordinate calculation (wy = farm.y - 85)
[PASS] #17: Wizard NPC texture key is wizard_idle_0
[PASS] #18: Wizard NPC origin setting is (0.5, 1)
[PASS] #19: Wizard NPC scale factor is 1.8
[PASS] #20: Wizard NPC initial depth set to wy
[PASS] #21: Wizard NPC levitation tween configuration (y: wy-4, duration: 900, yoyo: true, ease: Sine.InOut)

--- SUITE 5: Depth Sorting in updateDepthSort() ---
[PASS] #22: Shop NPC depth sort update in updateDepthSort() using static base Y
[PASS] #23: Wizard NPC depth sort update in updateDepthSort() using static base Y
[PASS] #24: Player Y-sort depth calculation in updateDepthSort()

--- SUITE 6: Non-Regression & Dual-File Sync Audit ---
[PASS] #25: game.js node syntax check (node -c game.js)
[PASS] #26: assets/game.js node syntax check (node -c assets/game.js)
[PASS] #27: game.js <-> assets/game.js SHA256 byte synchronization (Hash: 28626aa8aa82412b4c4415fd220327a16789cf92b40cfc690540dbfb6ed7fe18)
```

---

## 4. Empirical Verdict

**VERDICT**: **CONFIRMED & VERIFIED** (0 Failures / 27 Assertions Passed).
- Shop NPC interaction call site (`openShop()`) and `< 90px` proximity check are strictly preserved.
- Wizard NPC interaction call site (`openSpellDuel()`) and `< 85px` proximity check are strictly preserved.
- Origins `(0.5, 1)` and scales (`1.3` for Shop, `1.8` for Wizard) are confirmed intact.
- Levitation tween definitions (`y: base - 4`, duration 900ms, yoyo: true, ease: Sine.InOut) are confirmed intact.
- Depth updates in `updateDepthSort()` use static base ground anchors (`this.shopY` / `this.wizardY`) preventing depth jitter during levitation.
- Dual-file SHA256 sync hash: `28626aa8aa82412b4c4415fd220327a16789cf92b40cfc690540dbfb6ed7fe18`.
