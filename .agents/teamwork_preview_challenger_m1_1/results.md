# Empirical Test Results: Milestone 1 Verification

**Agent**: `teamwork_preview_challenger_m1_1`  
**Date**: 2026-07-24  
**Target Scope**: Milestone 1 Empirical Verification — Color Tokens, Outlines & SHA256 Sync  
**Test Harness Script**: `d:\Hangeul Valley\.agents\teamwork_preview_challenger_m1_1\test_m1_challenger.js`  

---

## Executive Summary

| Total Assertions | Passed | Failed | Overall Verdict |
|------------------|--------|--------|-----------------|
| 25               | 24     | 1      | **FAILURE** (1 Matrix Dimension Defect Found) |

Empirical verification confirms that color token counts, 1px dark outline token definitions, Shop NPC matrix dimensions (18x22), Wizard `WIZ_0` matrix dimensions (16x20), SHA256 dual-file synchronization, and Node syntax checks all pass successfully.

However, an empirical defect was uncovered in **`PixelArtRenderer.WIZ_1` matrix row index 4**: the row string is **17 characters long** (`'...KphHHHHHHHhK.A'`), violating the required **16x20** grid dimension standard.

---

## Detailed Test Breakdown

### 1. File Integrity & SHA256 Dual-File Synchronization
- **Assert 1**: `game.js` non-empty check (1,510,798 bytes) — **PASS**
- **Assert 2**: `assets/game.js` non-empty check (1,510,798 bytes) — **PASS**
- **Assert 3**: SHA256 hash match (`28626aa8aa82412b4c4415fd220327a16789cf92b40cfc690540dbfb6ed7fe18`) — **PASS**

### 2. Wizard NPC (R2) Verification
- **Assert 4**: Extracted `W_PAL` definition from `game.js` — **PASS**
- **Assert 5**: Extracted `WIZ_0` definition from `game.js` — **PASS**
- **Assert 6**: Extracted `WIZ_1` definition from `game.js` — **PASS**
- **Assert 7**: `W_PAL` non-null color token count equals 32 — **PASS** (Found 32 tokens: `K, k, p, P, h, H, v, V, u, m, M, y, Y, W, w, d, D, b, B, S, s, z, q, Q, c, C, e, a, A, f, X, x`)
- **Assert 8**: `W_PAL['K']` 1px dark outline color token is `0x0F172A` — **PASS**
- **Assert 9**: `WIZ_0` matrix is a non-empty array — **PASS**
- **Assert 10**: `WIZ_1` matrix is a non-empty array — **PASS**
- **Assert 11**: `WIZ_0` matrix dimensions are strictly 16x20 — **PASS** (Height: 20 rows, Width: uniform 16 cols, 26 distinct color tokens used)
- **Assert 12**: `WIZ_1` matrix dimensions are strictly 16x20 — **FAIL**
  - *Diagnostic*: Row index 4 (`'...KphHHHHHHHhK.A'`) has length **17** (expected 16).
- **Assert 13**: Wizard matrices contain 1px dark outline token `K` — **PASS**

### 3. Shop NPC (R1) Verification
- **Assert 14**: Extracted `DECOR_PALETTE` definition from `game.js` — **PASS**
- **Assert 15**: Extracted `SHOP_PALETTE` definition from `game.js` — **PASS**
- **Assert 16**: Extracted `shop_sign` matrix definition from `game.js` — **PASS**
- **Assert 17**: `SHOP_PALETTE` evaluated with 41 total non-null tokens — **PASS**
- **Assert 18**: Shop matrix evaluated successfully — **PASS**
- **Assert 19**: Shop matrix dimensions are strictly 18x22 — **PASS** (Height: 22 rows, Width: uniform 18 cols)
- **Assert 20**: Shop NPC color token count > 6 — **PASS** (Found 17 distinct color tokens used: `K, B, A, X, f, Q, U, J, u, m, j, O, o, W, Y, y, w`)
- **Assert 21**: Shop NPC color token count ≥ 14 target — **PASS** (Found 17 distinct color tokens used)
- **Assert 22**: Shop matrix contains 1px dark outline token `K` — **PASS**
- **Assert 23**: `SHOP_PALETTE['K']` 1px dark outline color token is `0x0F172A` — **PASS**

### 4. Code Quality & Node Syntax Validation
- **Assert 24**: `node -c game.js` exited cleanly with 0 syntax errors — **PASS**
- **Assert 25**: `node -c assets/game.js` exited cleanly with 0 syntax errors — **PASS**

---

## Defect Deep Dive: `WIZ_1` Matrix Dimension Anomaly

### Empirical Evidence
- Location: `game.js` line 279 (and mirrored in `assets/game.js` line 279).
- Definition snippet:
  ```javascript
  static WIZ_1 = [
    '.......KmfK.....', // row 0: len 16
    '......KphhPK....', // row 1: len 16
    '.....KphHHHhK.a.', // row 2: len 16
    '....KphHHHHHhK..', // row 3: len 16
    '...KphHHHHHHHhK.A', // row 4: len 17  <-- DEFECT HERE!
    '..KpvVVVVVVVVvpK', // row 5: len 16
    ...
  ];
  ```
- Comparison with `WIZ_0` row 4 (line 255):
  ```javascript
  '...KphHHHHHHHhK.' // len 16
  ```
- Root Cause: During implementation of Wizard micro-animation particle glints (`A`), an extra trailing character was appended to row 4 without replacing the trailing `.` character, increasing row length from 16 to 17.

### Impact Assessment
- Texture dimensions specified in `_genNpcTextures(scene)` line 2300: `this.createTexture(scene, 'wizard_idle_1', wiz_1, W_PAL, 16, 20);`.
- Canvas rendering routines drawing row 4 of `wiz_1` with 17 columns will write pixels out-of-bounds or misalign rendering columns for the animated frame.

### Recommended Fix for Worker
In `game.js` (and mirrored to `assets/game.js`), change line 279 from:
```javascript
'...KphHHHHHHHhK.A'
```
to:
```javascript
'...KphHHHHHHHhKA'
```
(Length: 3 leading dots + 12 character robe outline + 1 aura particle `A` = 16 characters).

---

## Test Execution Command & Log

```powershell
node .agents/teamwork_preview_challenger_m1_1/test_m1_challenger.js
```

Full console log output:
```
=== Milestone 1 Empirical Verification Harness ===
Target file: D:\Hangeul Valley\game.js
Assets file: D:\Hangeul Valley\assets\game.js

--- 1. SHA256 Synchronization Check ---
  [PASS] Assert 1: game.js is non-empty (1510798 bytes)
  [PASS] Assert 2: assets/game.js is non-empty (1510798 bytes)
  [PASS] Assert 3: SHA256 hashes match: 28626aa8aa82412b4c4415fd220327a16789cf92b40cfc690540dbfb6ed7fe18

--- 2. Wizard NPC (R2) Verification ---
  [PASS] Assert 4: Extracted W_PAL definition from game.js
  [PASS] Assert 5: Extracted WIZ_0 definition from game.js
  [PASS] Assert 6: Extracted WIZ_1 definition from game.js
W_PAL non-null token count: 32
W_PAL tokens: [K, k, p, P, h, H, v, V, u, m, M, y, Y, W, w, d, D, b, B, S, s, z, q, Q, c, C, e, a, A, f, X, x]
  [PASS] Assert 7: W_PAL color token count must be exactly 32 (found 32)
  [PASS] Assert 8: W_PAL['K'] outline color token is 0x0F172A (found 0xF172A)
  [PASS] Assert 9: WIZ_0 matrix is an array
  [PASS] Assert 10: WIZ_1 matrix is an array
  [PASS] Assert 11: WIZ_0 matrix dimensions are 16x20 (height: 20, widths uniform 16: true)
  [DIAGNOSTIC] WIZ_1 row length anomaly detected:
    Row index 4 ("...KphHHHHHHHhK.A") has length 17 (expected 16)
  [FAIL] Assert 12: WIZ_1 matrix dimensions are 16x20 (height: 20, widths uniform 16: false)
  [PASS] Assert 13: Wizard matrices (WIZ_0 & WIZ_1) contain dark outline token K
WIZ_0 distinct tokens used: 26 [K, f, m, p, h, P, H, a, v, V, M, X, k, A, w, q, d, D, Q, b, c, C, s, S, u, z]
WIZ_1 distinct tokens used: 26 [K, m, f, p, h, P, H, a, A, v, V, M, X, k, w, Q, d, D, q, b, C, c, s, S, u, z]

--- 3. Shop NPC (R1) Verification ---
  [PASS] Assert 14: Extracted DECOR_PALETTE definition from game.js
  [PASS] Assert 15: Extracted SHOP_PALETTE definition from game.js
  [PASS] Assert 16: Extracted shop_sign matrix from game.js
  [PASS] Assert 17: SHOP_PALETTE object evaluated with 41 total non-null tokens
  [PASS] Assert 18: Shop matrix evaluated successfully
Shop matrix height: 22
Shop matrix width: 18
Shop matrix distinct tokens used: 17 [K, B, A, X, f, Q, U, J, u, m, j, O, o, W, Y, y, w]
  [PASS] Assert 19: Shop matrix dimensions are 18x22 (height: 22, widths uniform 18: true)
  [PASS] Assert 20: Shop NPC color token count > 6 (found 17)
  [PASS] Assert 21: Shop NPC color token count ≥ 14 target (found 17)
  [PASS] Assert 22: Shop matrix contains dark outline token K
  [PASS] Assert 23: SHOP_PALETTE['K'] outline color token is 0x0F172A (found 0xF172A)

--- 4. Node Syntax Verification ---
  [PASS] Assert 24: node -c game.js passed with 0 syntax errors
  [PASS] Assert 25: node -c assets/game.js passed with 0 syntax errors

--- Test Summary ---
Total Assertions: 25
Passed Assertions: 24
Failed Assertions: 1

VERDICT: FAILURE (Some empirical checks failed)
```
