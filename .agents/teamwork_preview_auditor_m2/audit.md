# Forensic Audit Report — Milestone 2

**Work Product**: Hangeul Valley — Expandable Locked Farm Plots & Decorative Fence Flowers
**Target Codebase**: `d:\Hangeul Valley`
**Profile**: General Project Forensic Audit
**Verdict**: **CLEAN**

---

## Executive Summary

A comprehensive forensic audit of Milestone 2 (Expandable Locked Farm Plots & Decorative Fence Flowers) was conducted on July 24, 2026. The target codebase was evaluated for code integrity, byte-level file synchronization, absence of facade/mock functions, authentic economic gold deduction, schema-v4 save persistence, and genuine Phaser animation loops.

All empirical checks passed with 100% compliance. No facade implementations, hardcoded test values, or integrity violations were detected.

---

## 1. SHA256 Synchronization Check

Exact byte-level file hash synchronization between primary source files and deployment assets was verified using SHA256.

| File Pair | SHA256 Hash | Result |
| :--- | :--- | :--- |
| `game.js` ↔ `assets/game.js` | `74F3FC61296474A0CFFDDE17EE1FACAA5EBBD3B4805EF19EB0EDFEBA635AF1AC` | **MATCH (100% Synchronized)** |
| `index.html` ↔ `assets/index.html` | `42E6473937F1950FFF14DC71074B3E01E848A927C328B35E96B3B13DB334FAAA` | **MATCH (100% Synchronized)** |

---

## 2. Static Code Analysis & Prohibited Pattern Detection

The codebase (`game.js`, `assets/game.js`, `index.html`, `assets/index.html`) was scanned for prohibited patterns under General Project Forensic Guidelines:

1. **Hardcoded Test Results**: None found. No static return strings or fake test assertions exist.
2. **Facade Implementations**: None found. All functions implement authentic game state mutations and rendering logic.
3. **Pre-populated Artifacts**: None pre-existed. All test outputs are dynamically produced during test execution.
4. **Execution Delegation**: None found. Core logic is genuinely written in vanilla JavaScript and Phaser 3.

---

## 3. Empirical Feature Verification

### 3.1 Expandable Locked Farm Plots
- **Default Grid**: Plots #1 through #9 (indices 0..8) are unlocked by default.
- **Expansion Grid**: Plots #10 through #15 (indices 9..14) are locked by default with static physics bodies, dimmed tile rendering (`alpha 0.35`, `tint 0x666666`), pixel crates, and `🔒` lock text overlays.
- **Unlocking Mechanism**: Calling `buyPlotExpansion(idx)` or interacting with a locked plot when near it triggers `unlockPlot(p)`, which clears tile tinting/alpha, destroys lock overlays, plays SFX, triggers particle sparkles, and sets plot `active = true`.

### 3.2 Shop Gold Deduction
- **Progression Costs**: `PLOT_UNLOCK_COSTS` are configured as `[100, 200, 350, 500, 750, 1000]` Gold.
- **Deduction Engine**: `spendCoins(cost)` verifies `playerCurrencies.coins >= cost`, subtracts the exact amount from `playerCurrencies.coins`, syncs the `gold` alias, updates the currency HUD, and triggers save persistence.
- **Boundary Checks**: Purchases are strictly rejected with an alert toast and error SFX if `playerCurrencies.coins < cost`.

### 3.3 Save Data Persistence (Schema V4)
- **Snapshot Collection**: `collectSave()` packages `unlockedPlots` array and `unlockedPlotCount` integer alongside player currencies, inventory, recipes, and plot state into save schema v4.
- **Storage Layer**: Dual-storage model via `persistSave()` (writes to native file via `pywebview.api.save(data)` with `localStorage.setItem('hv_save_v2', ...)` backup).
- **Restoration**: `applySave(d)` migrates legacy schemas if needed, restores `unlockedPlots` and `unlockedPlotCount`, updates HUD, and triggers `sceneRef.refreshPlotAccess()`.

### 3.4 Decorative Fence Flower Animations
- **Perimeter Construction**: `FarmScene` populates top and side perimeter fence posts (`fnc_post`, `fnc_rail`).
- **Pixel-Art Flower Styling**: Flower textures (`flw_red`, `flw_yellow`, `flw_purple`) are instantiated on fence posts with color tinting (`0xEF4444`, `0xFBBF24`, `0xA855F7`, `0xEC4899`).
- **Phaser Tween Sway**: Each fence flower is bound to an individual Phaser tween loop:
  - `angle`: `{ from: -6, to: 6 }`
  - `duration`: `1400 + (postIdx * 170) % 800` ms
  - `yoyo`: `true`, `repeat`: `-1`, `ease`: `'Sine.InOut'`
- **Fauna Ecosystem**: Ambient fluttering butterflies (`_createButterflies`) target fence flowers dynamically.

---

## 4. Test Execution Evidence

### 4.1 SHA256 Sync & Matrix Test Suite (`test_m2_harness.js`)
```
Algorithm       Hash                                                             Path
---------       ----                                                             ----
SHA256          74F3FC61296474A0CFFDDE17EE1FACAA5EBBD3B4805EF19EB0EDFEBA635AF1AC D:\Hangeul Valley\game.js
SHA256          74F3FC61296474A0CFFDDE17EE1FACAA5EBBD3B4805EF19EB0EDFEBA635AF1AC D:\Hangeul Valley\assets\game.js
SHA256          42E6473937F1950FFF14DC71074B3E01E848A927C328B35E96B3B13DB334FAAA D:\Hangeul Valley\index.html
SHA256          42E6473937F1950FFF14DC71074B3E01E848A927C328B35E96B3B13DB334FAAA D:\Hangeul Valley\assets\index.html

FINAL VERIFICATION RESULT: PASS
```

### 4.2 Empirical Audit Suite (`test_m2_audit_empirics.js`)
```
===========================================================
AUDITOR M2 EMPIRICAL VERIFICATION SCRIPT
===========================================================
[PASS] SHA256 game.js ↔ assets/game.js sync - Hash: 74f3fc61296474a0cffdde17ee1facaa5ebbd3b4805ef19eb0edfeba635af1ac
[PASS] SHA256 index.html ↔ assets/index.html sync - Hash: 42e6473937f1950fff14dc71074b3e01e848a927c328b35e96b3b13db334faaa
[PASS] buyPlotExpansion function defined
[PASS] isPlotUnlocked function defined
[PASS] collectSave function defined
[PASS] applySave function defined
[PASS] Plot Expansion 1 blocked when insufficient gold
[PASS] Plot Expansion 1 unlocked with 100 gold
[PASS] Gold deducted to 0 after purchasing Plot Expansion 1
[PASS] gold alias updated to 0
[PASS] Plot Expansion 2 unlocked with 200 gold
[PASS] Gold deducted to 0 after purchasing Plot Expansion 2
[PASS] Plot Expansion #3 (Plot #12) unlocked with 350 gold
[PASS] Gold deducted to 0 after purchasing Plot Expansion #3
[PASS] Plot Expansion #4 (Plot #13) unlocked with 500 gold
[PASS] Gold deducted to 0 after purchasing Plot Expansion #4
[PASS] Plot Expansion #5 (Plot #14) unlocked with 750 gold
[PASS] Gold deducted to 0 after purchasing Plot Expansion #5
[PASS] Plot Expansion #6 (Plot #15) unlocked with 1000 gold
[PASS] Gold deducted to 0 after purchasing Plot Expansion #6
[PASS] All 15 plots unlocked after purchasing all 6 expansions
[PASS] collectSave contains all 15 unlocked plots
[PASS] collectSave unlockedPlotCount is 15
[PASS] applySave correctly restored 15 unlocked plots from save snapshot
[PASS] applySave correctly restored unlockedPlotCount = 15
[PASS] Found decorative fence flower creation & animation block in FarmScene
[PASS] Fence flowers use flw_red, flw_yellow, flw_purple textures
[PASS] Fence flower Phaser sway animation targets flower sprite
[PASS] Fence flower sway animation swings angle -6 to +6 degrees
[PASS] Fence flower sway animation uses Sine.InOut easing
[PASS] Fence flower sway animation loops infinitely (repeat: -1)
===========================================================
TOTAL TESTS: 31 | PASS: 31 | FAIL: 0
VERDICT: CLEAN
===========================================================
```

---

## Final Audit Verdict

**VERDICT: CLEAN**

The implementation of Milestone 2 (Expandable Locked Farm Plots & Decorative Fence Flowers) in Hangeul Valley is authentic, fully synchronized, and free of any integrity violations.
