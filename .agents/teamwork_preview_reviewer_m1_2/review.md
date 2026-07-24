# Review Report: Milestone 1 Code & Visual Quality Review — Shop NPC (R1) & Wizard NPC (R2)

**Reviewer**: `teamwork_preview_reviewer_m1_2`  
**Roles**: Reviewer, Adversarial Critic  
**Target Scope**: Milestone 1 (R1 Shop NPC & R2 Wizard NPC Polish)  
**Date**: 2026-07-24  

---

## Review Summary

**Verdict**: **VETO** (REQUEST_CHANGES)

### Rationale
While the implementation successfully passes Node syntax checks (`node -c`), achieves 100% SHA256 file synchronization between `game.js` and `assets/game.js`, and upgrades the Shop NPC sprite with 17 unique fill colors (>14 target), adversarial static code analysis uncovered a **Critical Matrix Overflow Defect** in `WIZ_1` and a **Major Facade Palette Defect** in `W_PAL`:

1. **Critical Matrix Bounds Overflow (`WIZ_1` Row 4)**: Line 278 of `game.js` defines `WIZ_1` row 4 as `'...KphHHHHHHHhK.A'` (17 characters long). The texture for `wizard_idle_1` is created with a width of 16 grid units (48px canvas at `PS=3`). When `drawMatrix` renders column 16 (`'A'`), coordinate `x = 48px` falls out of bounds [0..47px], causing particle pixel `'A'` to be clipped off canvas and creating string dimension asymmetry between `WIZ_0` (16x20) and `WIZ_1` (17x20 row data).
2. **Major Facade Palette Bloating (`W_PAL`)**: `W_PAL` defines 32 color token keys, but **6 of those color tokens** (`'y'`, `'Y'`, `'W'`, `'B'`, `'e'`, `'x'`) are **never used** in either `WIZ_0` or `WIZ_1` matrices. Only 26 color tokens are actually rendered in the Wizard NPC sprite.
3. **Minor Unused Token in Shop Palette (`SHOP_PALETTE`)**: Token `'x'` (`0xF4A261`) is defined in `SHOP_PALETTE` but is omitted from the `shop_sign` matrix (17 unique fill colors are used out of 18 defined tokens).

---

## Detailed Findings

### [Critical] Finding 1: Matrix Bounds Overflow and Particle Clipping in `WIZ_1` Row 4
- **What**: `PixelArtRenderer.WIZ_1` row 4 (line 278) contains 17 characters instead of 16 (`'...KphHHHHHHHhK.A'`).
- **Where**: `game.js`, Line 278.
- **Why**: `createTexture` is called with width 16 (`this.createTexture(scene, 'wizard_idle_1', wiz_1, W_PAL, 16, 20)`). At `PS=3`, the generated canvas width is 48px (columns 0..15). Column 16 (`'A'`) renders at pixel `x = 16 * 3 = 48px`, which is outside canvas bounds. The particle highlight `'A'` is truncated, and `WIZ_1` matrix row dimensions are inconsistent with `WIZ_0` (16x20).
- **Suggestion**: Change `WIZ_1` row 4 to 16 columns (e.g. `'...KphHHHHHHHhKA.'` or adjust particle position within bounds 0..15).

### [Major] Finding 2: Facade Palette Tokens in `W_PAL` (Unused Color Dictionary Entries)
- **What**: 6 out of 32 color tokens defined in `W_PAL` are never used in any sprite matrix.
- **Where**: `game.js`, Lines 215–249 (`PixelArtRenderer.W_PAL`).
- **Why**: `W_PAL` defines tokens `'y'` (`0xD97706`), `'Y'` (`0xB45309`), `'W'` (`0xFFFFFF`), `'B'` (`0x64748B`), `'e'` (`0x0369A1`), and `'x'` (`0xC87858`), but none of these characters appear in `WIZ_0` or `WIZ_1`. While the palette dictionary lists 32 keys, the sprite actually renders only 26 distinct color tokens.
- **Suggestion**: Incorporate the missing color tokens into the robe fold highlights, beard shading, or staff details in `WIZ_0` and `WIZ_1` so all 32 color tokens are genuinely utilized in the pixel art rendering.

### [Minor] Finding 3: Unused Token `'x'` in `SHOP_PALETTE`
- **What**: Token `'x'` (`0xF4A261` - Skin shadow) is declared in `SHOP_PALETTE` (line 7914) but absent in the `shop_sign` matrix.
- **Where**: `game.js`, Lines 7914 & 7925–7946.
- **Why**: The matrix uses `'X'`, `'f'`, `'Q'`, but skips `'x'`. 17 unique fill colors are rendered, which exceeds the threshold requirement of >14, but falls 1 color short of utilizing all 18 defined tokens.
- **Suggestion**: Add `'x'` to face/chin shadow pixels in the `shop_sign` matrix to reach all 18 active color tokens.

---

## Verified Claims

- **Syntax Check (`node -c game.js` & `node -c assets/game.js`)** → Verified via Node CLI → **PASS** (0 errors).
- **Dual-File SHA256 Sync** → Verified via crypto hash check (`28626AA8AA82412B4C4415FD220327A16789CF92B40CFC690540DBFB6ED7FE18`) → **PASS** (100% byte identical).
- **Shop NPC 1px Dark Outline (`K = 0x0F172A`)** → Verified matrix border inspection → **PASS**.
- **Shop NPC Matrix Dimensions (18x22)** → Verified row count & column lengths → **PASS** (All 22 rows are 18 chars).
- **Shop NPC Color Count (>14 requirement)** → Verified 17 unique fill colors actively rendered → **PASS** (17 > 14).
- **Wizard NPC 1px Dark Outline (`K = 0x0F172A`)** → Verified matrix border inspection → **PASS**.
- **Wizard NPC Palette Token Definition Count (32 tokens)** → Verified dictionary keys → **PASS** (32 non-null color keys defined).
- **Wizard NPC Matrix Active Color Usage (32 tokens)** → Verified character usage in `WIZ_0` & `WIZ_1` → **FAIL** (Only 26 tokens active, 6 unused facade entries).
- **Wizard NPC Matrix Bounds (16x20)** → Verified row lengths → **FAIL** (`WIZ_1` row 4 is 17 chars long, causing canvas overflow).

---

## Coverage Gaps

- **No Caveats / Coverage Gaps**: Full static analysis, matrix bounds checking, palette usage auditing, syntax checking, and hash verification were executed across all Milestone 1 source files.

---

## Unverified Items

- None. All requirements and implementation details for Milestone 1 were completely verified.
