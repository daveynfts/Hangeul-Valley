# Challenger 2 Empirical Verification Report — Milestone 2

## Challenge Summary

**Overall risk assessment**: **LOW**

All empirical and adversarial test targets for Milestone 2 — R2 (Shop UI Purchases), R3 (Fence Flowers), JS Syntax, and SHA256 Mirror Sync — have passed completely with 0 errors.

---

## Stress Test Results & Findings

### 1. R2 Shop UI Purchases (`buyPlotExpansion()` & `buildShopGrid()`)
- **VM Test Script**: `test_r2_shop_vm.js` (Executed in Node.js VM context)
- **Total Assertions**: 60
- **Passed**: 60 | **Failed**: 0
- **Verified Items**:
  1. **Plot Unlock Cost Curve**: Array `PLOT_UNLOCK_COSTS` = `[100, 200, 350, 500, 750, 1000]`.
  2. **Base Plot Initialization**: Base plots 0..8 (9 plots) unlocked initially. Expansion plots 9..14 (6 plots) locked initially.
  3. **Insufficient Gold Prevention**: Attempting `buyPlotExpansion(0)` with 50 coins (< 100 cost) leaves plot 9 locked, coins at 50, gold at 50, and displays toast `"Need 100 Gold 🪙 to unlock Farm Plot #10!"`.
  4. **Sequential Plot Unlocking Across All 6 Plots**:
     - Plot #1 Expansion (plotIndex 9): cost 100 → coins 3000 → 2900, plot unlocked.
     - Plot #2 Expansion (plotIndex 10): cost 200 → coins 2900 → 2700, plot unlocked.
     - Plot #3 Expansion (plotIndex 11): cost 350 → coins 2700 → 2350, plot unlocked.
     - Plot #4 Expansion (plotIndex 12): cost 500 → coins 2350 → 1850, plot unlocked.
     - Plot #5 Expansion (plotIndex 13): cost 750 → coins 1850 → 1100, plot unlocked.
     - Plot #6 Expansion (plotIndex 14): cost 1000 → coins 1100 → 100, plot unlocked.
     - Total gold deducted: 2900.
  5. **Duplicate Purchase Guard**: Calling `buyPlotExpansion(0)` when plot 9 is already unlocked does not deduct coins, emits `"You already unlocked this farm plot!"` toast.
  6. **Gold Balance Sync**: `playerCurrencies.coins` and `gold` alias remain in sync after every transaction via `syncGoldAlias()`.
  7. **Shop Card UI State Rendering**:
     - **Owned Card**: Card has `.owned` class, renders `✅ Owned` badge, displays disabled button with text `"Unlocked"`.
     - **Affordable Unowned Card**: Card has no `.owned` or `.too-expensive` class, renders cost `💰 200 gold`, displays enabled button with text `"🛒 Buy Now"`.
     - **Unaffordable Unowned Card**: Card has `.too-expensive` class, renders remaining gold required (e.g., `"Need 100 gold"`, `"Need 750 gold"`), displays button with `disabled` attribute.

### 2. R3 Fence Flowers & Animation Structure Inspection
- **File**: `game.js` (lines 8424–8491)
- **Flower Palette Count**: 4 distinct hex colors defined in `fenceFlowerColors` (`[0xEF4444, 0xFBBF24, 0xA855F7, 0xEC4899]`), exceeding the requirement of ≥ 3 colors.
- **Base Textures**: 3 textures used (`flw_red`, `flw_yellow`, `flw_purple`).
- **Sway Animation**:
  - Each fence post flower sprite (`flower`, `flowerL`, `flowerR`) is attached to a Phaser tween.
  - Tween configuration: `angle: { from: -6, to: 6 }`, `duration: 1400 + (postIdx * 170) % 800`, `yoyo: true`, `repeat: -1`, `ease: 'Sine.InOut'`.
  - Sway loops infinitely with phase offsets for visual fluidity.

### 3. Syntax Verification (`node -c`)
- `node -c game.js`: **PASS** (Exit code 0, 0 syntax errors)
- `node -c assets/game.js`: **PASS** (Exit code 0, 0 syntax errors)

### 4. SHA256 Mirror Sync Verification
- **Pair 1 (`game.js` ↔ `assets/game.js`)**:
  - `game.js`: `74F3FC61296474A0CFFDDE17EE1FACAA5EBBD3B4805EF19EB0EDFEBA635AF1AC`
  - `assets/game.js`: `74F3FC61296474A0CFFDDE17EE1FACAA5EBBD3B4805EF19EB0EDFEBA635AF1AC`
  - Result: **MATCH** (100% byte-for-byte identical)
- **Pair 2 (`index.html` ↔ `assets/index.html`)**:
  - `index.html`: `42E6473937F1950FFF14DC71074B3E01E848A927C328B35E96B3B13DB334FAAA`
  - `assets/index.html`: `42E6473937F1950FFF14DC71074B3E01E848A927C328B35E96B3B13DB334FAAA`
  - Result: **MATCH** (100% byte-for-byte identical)

---

## Unchallenged Areas
- WebGL rendering pipeline / canvas paint calls (outside Node VM scope).
- Sound playback audio buffer decoding (mocked in VM harness).
