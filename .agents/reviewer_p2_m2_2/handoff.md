# Dungeon Sprites Review Handoff Report (Milestone P2 M2.2)

**Agent**: `reviewer_p2_m2_2` (Dungeon Sprites Reviewer)  
**Target Files**: `C:\VibeCode\Hangeul Valley\game.js`, `C:\VibeCode\Hangeul Valley\assets\game.js`  
**Verdict**: **REJECT / REQUEST_CHANGES**  

---

## 1. Observation

Direct observations and evidence collected from `game.js` and `assets/game.js`:

1. **Unmapped Palette Tokens in `boss` (Demon Lord Boss)**:
   - File: `game.js`, lines 3313-3322 (Decl 1) and lines 3549-3571 (Decl 2).
   - In `P_DUNGEON_BOSS`, the palette defines:
     `'b': 0x18181B, 'm': 0x52525B` (lowercase `'b'` and `'m'`).
   - In the `boss` matrix array, the following rows use uppercase `'B'` and `'M'`:
     - Line 3555 (Row 1): `'KBK..........KBK'` -> uses `'B'`
     - Line 3556 (Row 2): `'KMBK........KMBK'` -> uses `'M'`, `'B'`
     - Line 3557 (Row 3): `'.KMBKKKKKKKKMBK.'` -> uses `'M'`, `'B'`
     - Line 3558 (Row 4): `'..KMBBDDDDDDBMK.'` -> uses `'M'`, `'B'`
     - Lines 3565-3568 (Rows 11-14): `'..KKbBDDDDDbBKK.'`, `'.KbMbKYYYYKbMbK.'`, `'.KbMbKYFFYKbMbK.'`, `'..KMbKKKKKKMbK..'` -> uses uppercase `'B'` and `'M'`.
   - Result: `P_DUNGEON_BOSS['B']` and `P_DUNGEON_BOSS['M']` evaluate to `undefined`, causing missing pixels and rendering corruption on the Demon Lord Boss horns and silhouette.

2. **Matrix Row Width Violation in `skeleton` (Skeleton Archer)**:
   - File: `game.js`, lines 3279-3281 (Decl 1) and lines 3515-3517 (Decl 2).
   - Rows 11, 12, and 13 of the `skeleton` matrix have a character width of **17 characters** (expected exact width: **16 characters**):
     - Line 3515 (Row 11): `'.KSBBWK...KWBSmS.'` (17 chars)
     - Line 3516 (Row 12): `'KSyBBK....KWBSmS.'` (17 chars)
     - Line 3517 (Row 13): `'KSyBK......KBSmS.'` (17 chars)
   - Result: Directly violates Requirement 4 ("All matrix row strings have exact character width matching grid size (typically 16 chars)").

3. **Method Duplication & Dead Copy-Paste Code**:
   - File: `game.js`, lines 3236 and 3472.
   - `static _genDungeonTextures(scene)` is declared **twice** in `PixelArtRenderer`.
   - The first declaration at line 3236 contains copy-paste residue at lines 3460-3468:
     ```javascript
     this.createTexture(scene, 'arcade_player_ship', ship, P_SHIP);
     this.createTexture(scene, 'alien_scout', scout, P_SCOUT);
     ...
     ```
   - In Declaration 1, variables `ship`, `scout`, `P_SHIP`, etc., are out-of-scope and would throw runtime `ReferenceError`s if invoked. Declaration 2 (line 3472) overwrites Declaration 1 in JS AST, leaving Declaration 1 as dead, corrupted code.

4. **100% Identity between `game.js` and `assets/game.js`**:
   - Running SHA-256 hash comparison on `game.js` vs `assets/game.js`: Hash matches (`True`).
   - File size: 377,289 bytes for both.

5. **Syntax Verification**:
   - `node -c game.js` and `node -c assets/game.js` return 0 errors.

6. **Key Parity & Palette Quality**:
   - All 9 textures exist (`dungeon_green_slime`, `dungeon_goblin_warrior`, `dungeon_skeleton_archer`, `dungeon_boss`, `loot_coin`, `loot_gem`, `loot_potion`, `loot_chest`, `loot_scroll`).
   - All palette keys are single-character tokens.
   - Color count per sprite: Slime (9 tones), Skeleton (10 tones), Goblin (10 tones), Boss (10 tones), Chest (9 tones), Coin (7 tones), Gem (7 tones), Potion (10 tones), Scroll (9 tones). All meet or exceed the >=3 shading tones requirement.

---

## 2. Logic Chain

1. **Premise 1**: Requirement 4 demands that all matrix row strings have exact character width matching grid size (16 characters).
   - **Observation**: Rows 11, 12, and 13 of `skeleton` in `game.js` (lines 3515-3517) have length 17 (`'.KSBBWK...KWBSmS.'`, `'KSyBBK....KWBSmS.'`, `'KSyBK......KBSmS.'`).
   - **Deduction**: The `skeleton` sprite matrix violates Requirement 4.

2. **Premise 2**: Pixel art rendering maps matrix characters to hex color values defined in the palette object. In JS, object keys are case-sensitive.
   - **Observation**: `P_DUNGEON_BOSS` defines keys `'b'` and `'m'`. The `boss` matrix array uses `'B'` and `'M'`.
   - **Deduction**: Lookups for `'B'` and `'M'` fail (`undefined`), rendering blank/transparent pixels where dark armor accents and horn outlines should be. This violates functional correctness and visual fidelity.

3. **Premise 3**: Code structure must be clean, maintainable, and free of duplicate broken method definitions.
   - **Observation**: `static _genDungeonTextures` is declared twice (line 3236 and line 3472). The first declaration contains broken Arcade texture registration calls with undefined variables.
   - **Deduction**: Dead, duplicate method code must be removed.

---

## 3. Caveats

- The canvas rendering engine uses standard Phaser 3 texture generation from matrices. The issue with token case mismatch (`'B'`/`'M'`) is purely a dictionary mapping failure in JS code and does not depend on Phaser internal details.
- No other unmapped tokens or grid width mismatches were found in the other 8 dungeon sprites (`slime`, `goblin`, `chest`, `coin`, `gem`, `potion`, `scroll`).

---

## 4. Conclusion

**Verdict**: **REJECT / REQUEST_CHANGES**

**Actionable Remediation Required for Worker**:
1. Fix `P_DUNGEON_BOSS` token case parity in `game.js` and `assets/game.js`:
   - Either add `'B': 0x18181B, 'M': 0x52525B` to `P_DUNGEON_BOSS` or change `'B'` and `'M'` in the `boss` matrix rows to `'b'` and `'m'`.
2. Fix `skeleton` matrix row widths in `game.js` and `assets/game.js`:
   - Truncate / adjust rows 11, 12, and 13 of `skeleton` from 17 chars down to exact 16 chars (e.g. remove one of the extra '.' fill characters).
3. Remove the duplicate `static _genDungeonTextures` declaration at line 3236 in `game.js` and `assets/game.js`.
4. Ensure `game.js` and `assets/game.js` remain 100% identical after remediation.

---

## 5. Verification Method

To independently verify these findings:
1. Run the verification script:
   ```bash
   node .agents/reviewer_p2_m2_2/verify.js
   ```
2. Inspect line numbers in `game.js`:
   - `boss` matrix tokens: `game.js` lines 3313-3322 and 3549-3571.
   - `skeleton` row lengths: `game.js` lines 3515-3517.
   - Duplicate method: `game.js` line 3236 and line 3472.
3. Compare file hashes to verify 100% sync:
   ```powershell
   powershell -Command "(Get-FileHash 'game.js').Hash -eq (Get-FileHash 'assets/game.js').Hash"
   ```

---

## Review Summary Report

| Dimension | Assessment | Details |
|-----------|------------|---------|
| **1. Parity** | PASS | All 9 Dungeon textures present and mapped to correct keys |
| **2. Palette & Shading** | PASS | Dark fantasy palette, glowing accents, 7-10 shading tones per sprite |
| **3. Token Format** | PASS | Single-character keys ONLY |
| **4. Matrix Row Width** | **FAIL** | `skeleton` rows 11-13 are 17 chars wide (expected 16) |
| **5. Token Mapping** | **FAIL** | `boss` matrix uses unmapped tokens `'B'` and `'M'` |
| **6. Syntax & Code Quality** | **FAIL** | Duplicate method `_genDungeonTextures` at line 3236 with broken code |
| **7. File Sync** | PASS | `game.js` and `assets/game.js` 100% identical |

### Findings

- **[Critical] Finding 1: Unmapped Tokens in Demon Lord Boss Sprite**
  - Location: `game.js` lines 3314-3322 and 3550-3570.
  - Cause: Palette defines `'b'`/`'m'`, matrix uses `'B'`/`'M'`.
  - Fix: Standardize token casing between palette and matrix.

- **[Major] Finding 2: Matrix Row Width Mismatch in Skeleton Archer Sprite**
  - Location: `game.js` lines 3515-3517 (rows 11, 12, 13).
  - Cause: 17 characters in strings instead of 16.
  - Fix: Trim 1 background `'.'` character from rows 11, 12, 13 to make them 16 characters.

- **[Major] Finding 3: Duplicate Method Declaration**
  - Location: `game.js` line 3236 and line 3472.
  - Cause: Double paste of `static _genDungeonTextures(scene)` containing broken arcade texture calls.
  - Fix: Remove the first `_genDungeonTextures` block.

---

### Verified Claims
- `node -c game.js` -> verified 0 syntax errors -> PASS
- `node -c assets/game.js` -> verified 0 syntax errors -> PASS
- `game.js` vs `assets/game.js` hash -> verified identical -> PASS
- Single-char keys in palettes -> verified all len === 1 -> PASS

### Coverage Gaps
- None. Full static analysis covered all 9 sprites, palettes, matrices, syntax, and sync.

### Unverified Items
- None.
