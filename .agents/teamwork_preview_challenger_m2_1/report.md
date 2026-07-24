# Empirical Challenge & Stress-Test Report: R1 Expandable Farm Plots & Save/Load Persistence

**Agent**: Challenger 1 (`teamwork_preview_challenger_m2_1`)  
**Target Codebase**: `d:\Hangeul Valley\game.js`  
**Milestone**: Milestone 2 — Expandable Farm Plots & Save/Load Persistence  
**Date**: 2026-07-24  
**Overall Verdict**: **PASS (52 / 52 Assertions Passed, 0 Failures)**

---

## Executive Summary

An adversarial empirical verification suite (`test_m2_plots_saveload.js`) was constructed and executed in a Node.js v25.8.0 VM sandbox context to stress-test Requirement 1 (6 Locked Farm Plots) and Save/Load Persistence in `game.js`. 

All 52 empirical test assertions passed cleanly. Syntax verification via `node -c "game.js"` confirmed zero syntax errors.

---

## Core Findings & Assertion Breakdown

### 1. Plot State Initialization (R1 Specification) — 19 Assertions PASSED
- **Total Plots**: 15 plots total (`MAX = 15`, indices `0..14`).
- **Default Unlocked Plots**: Exactly 9 plots (indices `0..8`) unlocked on a fresh game state.
- **Default Locked Plots**: Exactly 6 plots (indices `9..14`) locked on a fresh game state.
- **Unlock Cost Progression**: `PLOT_UNLOCK_COSTS` matches exact progression `[100, 200, 350, 500, 750, 1000]` for locked plots (indices 9 to 14).
- **`isPlotUnlocked(i)` Logic**: Returns `true` for `i < 9` by default, `false` for `i >= 9` until explicitly purchased/unlocked.

### 2. Locked Plot Interaction & Purchase Flow — 14 Assertions PASSED
- **Insufficient Gold Safeguard**: 
  - Attempting to purchase plot #10 (index 9, cost 100 Gold) with 50 Gold via `buyPlotExpansion(0)` fails gracefully.
  - `isPlotUnlocked(9)` remains `false`.
  - 0 Gold is deducted (`playerCurrencies.coins` and `gold` alias remain at 50).
  - `unlockedPlots` array length remains 9.
- **Sufficient Gold Purchase**:
  - Purchasing plot #10 with 500 Gold succeeds.
  - Plot index 9 is added to `unlockedPlots` array (`unlockedPlots = [0,1,2,3,4,5,6,7,8,9]`).
  - `unlockedPlotCount` updates from 9 to 10.
  - `isPlotUnlocked(9)` returns `true`.
  - Exact cost of 100 Gold is deducted (`500 - 100 = 400` Gold remaining).
- **Duplicate Purchase Guard**: Attempting to re-purchase an already unlocked plot via `buyPlotExpansion(0)` aborts immediately without deducting Gold.
- **In-Scene Interaction Flow (`_interact()`)**:
  - Interacting with locked plot index 10 (cost 200 Gold) with 50 Gold fails to unlock plot 10 and leaves Gold unchanged.
  - Interacting with locked plot index 10 with 300 Gold unlocks plot index 10 (`active = true`, `isPlotUnlocked(10) = true`) and deducts exactly 200 Gold (`300 - 200 = 100` Gold remaining).

### 3. Save Serialization, Migration, and Restoration — 19 Assertions PASSED
- **Serialization (`collectSave()`)**:
  - Generates valid schema version `v: 4`.
  - Exports `unlockedPlots` array, `unlockedPlotCount`, `currencies` object, `gold` alias, and `plots` array (crop type, growth stage `sState`, `plantedAt` timestamp).
- **Migration Engine (`migrateSaveData()`)**:
  - **Legacy Schema Upgrade (v1/v2/v3 -> v4)**: Successfully upgrades legacy v1 save without plot tracking to v4 schema, setting `unlockedPlots` to `[0,1,2,3,4,5,6,7,8]` (9 plots) and `unlockedPlotCount` to 9.
  - **Count-Only Migration**: Successfully migrates legacy saves containing only `unlockedPlotCount = 12` by auto-populating `unlockedPlots = [0,1,2,3,4,5,6,7,8,9,10,11]`.
  - **Deduplication**: Deduplicates array entries using `Set` if `unlockedPlots` contains duplicate indices.
- **Restoration (`applySave()`)**:
  - Restores `unlockedPlots`, `unlockedPlotCount`, `playerCurrencies`, `gold` alias, and planted crops state.
  - Re-evaluates `isPlotUnlocked(i)` correctly across all 15 plot indices.
- **Round-Trip Serialization Integrity**:
  - Exporting state via `collectSave()`, clearing in-memory globals, and restoring via `applySave()` preserves plot unlock states (e.g. plot index 11 remaining unlocked) and exact currency balances (e.g. 900 Gold).

---

## Adversarial Stress-Test Matrix

| Stress Test Scenario | Tested Condition | Expected Result | Observed Result | Status |
|----------------------|------------------|-----------------|-----------------|--------|
| **Fresh Start Init** | Check `unlockedPlots` & `isPlotUnlocked` for 0..14 | 9 Unlocked (0..8), 6 Locked (9..14) | 9 Unlocked, 6 Locked | **PASS** |
| **Insufficient Gold** | Call `buyPlotExpansion(0)` with 50 Gold | Plot remains locked, Gold = 50 | Locked, Gold = 50 | **PASS** |
| **Sufficient Gold** | Call `buyPlotExpansion(0)` with 500 Gold | Plot 9 unlocked, Gold = 400 | Unlocked, Gold = 400 | **PASS** |
| **Duplicate Purchase** | Call `buyPlotExpansion(0)` on unlocked plot | Toast warning, 0 Gold deducted | 0 Gold deducted | **PASS** |
| **Scene Proximity Interact** | Intercept locked plot in `_interact()` with 300 Gold | Plot 10 unlocked, Gold = 100 | Unlocked, Gold = 100 | **PASS** |
| **Legacy v1 Save Migration** | `migrateSaveData({ gold: 250 })` | Upgrades to v4, `unlockedPlots` = [0..8] | Upgraded to v4, 9 plots | **PASS** |
| **Legacy Count Migration** | `migrateSaveData({ unlockedPlotCount: 12 })` | `unlockedPlots` = [0..11] | `unlockedPlots` length = 12 | **PASS** |
| **Array Deduplication** | `migrateSaveData` with duplicate entries in `unlockedPlots` | `Set` deduplication removes duplicates | Clean array [0..10] | **PASS** |
| **Round-Trip Save/Load** | `collectSave()` -> JSON -> `applySave()` | Exact state & currency restored | Plot 11 unlocked, 900 Gold | **PASS** |

---

## Verification Artifacts Created
1. `d:\Hangeul Valley\.agents\teamwork_preview_challenger_m2_1\test_m2_plots_saveload.js` — Empirical Node.js VM test runner (52 assertions).
2. `d:\Hangeul Valley\.agents\teamwork_preview_challenger_m2_1\test_output.json` — Structured test results JSON file.
3. `d:\Hangeul Valley\.agents\teamwork_preview_challenger_m2_1\report.md` — Full adversarial test report.
4. `d:\Hangeul Valley\.agents\teamwork_preview_challenger_m2_1\handoff.md` — 5-component self-contained handoff report.
