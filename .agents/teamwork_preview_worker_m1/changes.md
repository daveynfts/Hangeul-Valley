# Implementation Notes: Milestone 1 (Shop & Wizard NPC Polish)

**Agent**: `teamwork_preview_worker_m1`  
**Date**: 2026-07-24  
**Target Files**: `game.js`, `assets/game.js`

---

## Overview of Changes

### 1. Shop NPC (R1) Upgrade
- **Location**: `_bakeTextures()` around line 7870 in `game.js`.
- **Palette**: Created `SHOP_PALETTE` extending `DECOR_PALETTE` with 18 unique color tokens:
  - Outline: `K` (`0x0F172A` 1px Dark Slate Outline)
  - Gat Hat: `B` (`0x1E293B`), Ribbon `A` (`0x38BDF8`)
  - Face: `X` (`0xFFDDAD`), `x` (`0xF4A261`), `f` (`0xFFF0D5`), Cheek blush `Q` (`0xE76F51`)
  - Hanbok Vest & Apron: `J` (`0x1E3A8A`), `j` (`0x172554`), `U` (`0xF8FAFC`), `u` (`0xCBD5E1`), `m` (`0xF59E0B`)
  - Wooden Counter: `O` (`0xD99B66`), `o` (`0xB3713D`), `W` (`0x8F5428`), `w` (`0x573012`)
  - Gold Coins: `Y` (`0xFDE047`), `y` (`0xD97706`)
- **Matrix**: Upgraded `shop_sign` matrix from 14×18 signpost to an expanded 18×22 grid depicting a warm Korean merchant character wearing a traditional hat (gat), navy hanbok vest with gold embroidery, white collar, cream apron, standing behind a wooden counter loaded with stacks of shiny gold coins.
- **Contract Retention**: Texture key `'shop_sign'`, origin `(0.5, 1)`, scale `1.3`, depth sorting, and `openShop()` trigger logic remain 100% intact.

### 2. Wizard NPC (R2) Upgrade
- **Location**: `PixelArtRenderer` static definition (line 214), `_genNpcTextures(scene)` (line 2210), and `_bakeTextures()` (line 8000) in `game.js`.
- **Palette**: Upgraded `W_PAL` from 18 to 32 rich color tokens:
  - 1px Dark Outlines: `K` (`0x0F172A`), `k` (`0x1E1B4B`)
  - Robe Purple Shades: `p` (`0xC084FC`), `P` (`0xA855F7`), `h` (`0x8B5CF6`), `H` (`0x7C3AED`), `v` (`0x6D28D9`), `V` (`0x4C1D95`), `u` (`0x3B0764`)
  - Star/Moon Embroidery: `m` (`0xFDE047`), `M` (`0xF59E0B`), `y` (`0xD97706`), `Y` (`0xB45309`)
  - Flowing Beard Gradient: `W` (`0xFFFFFF`), `w` (`0xF8FAFC`), `d` (`0xE2E8F0`), `D` (`0xCBD5E1`), `b` (`0x94A3B8`), `B` (`0x64748B`)
  - Staff Wood: `S` (`0x92400E`), `s` (`0x78350F`), `z` (`0x451A03`)
  - Glowing Cyan Orb: `q` (`0xE0F2FE`), `Q` (`0xA5F3FC`), `c` (`0x38BDF8`), `C` (`0x0284C7`), `e` (`0x0369A1`)
  - Mystical Aura Sparkles: `a` (`0xE9D5FF`), `A` (`0x67E8F9`), `f` (`0xFDE68A`)
  - Face: `X` (`0xFFDDAD`), `x` (`0xC87858`)
- **Matrices**: Upgraded `wiz_0` and `wiz_1` matrices to 16×20 resolution featuring fabric fold shading, gold embroidery trim, flowing beard gradients, staff with glowing crystal orb, and micro-animated particle sparkles shifting between frames at 3 fps.
- **Texture Bake**: `gwiz` in `_bakeTextures()` now invokes `PixelArtRenderer.drawMatrix(gwiz, PixelArtRenderer.WIZ_0, PixelArtRenderer.W_PAL, 0, 0, PS)` to guarantee 100% visual consistency for `'wizard_npc'`.
- **Contract Retention**: Texture keys `'wizard_idle_0'`, `'wizard_idle_1'`, `'wizard_npc'`, origin `(0.5, 1)`, scale `1.8`, levitation tween, depth sorting, and `openSpellDuel()` trigger logic remain 100% intact.

### 3. Synchronization & Validation
- Executed `node -c game.js` (0 syntax errors).
- Mirrored `game.js` to `assets/game.js` via `fs.copyFileSync`.
- Executed `node -c assets/game.js` (0 syntax errors).
- Verified SHA256 byte-level hash match between `game.js` and `assets/game.js` (`28626aa8aa82412b4c4415fd220327a16789cf92b40cfc690540dbfb6ed7fe18`).

---

## Verification Summary
- `node -c game.js` -> Pass (0 errors)
- `node -c assets/game.js` -> Pass (0 errors)
- SHA256 Match -> `28626aa8aa82412b4c4415fd220327a16789cf92b40cfc690540dbfb6ed7fe18` (100% Identical)
