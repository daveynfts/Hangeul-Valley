# Implementation Notes — Milestone 2 Sprite Polish & Upgrade (R3, R4, R5)

**Worker**: `teamwork_preview_worker_m2`  
**Date**: 2026-07-24  
**Files Modified**:
- `game.js`
- `assets/game.js` (synced copy)

---

## Summary of Changes

### 1. Cat NPC (Muop) Sprite Polish & Upgrade (R3)
- **Palette Upgrade (`C`)**: Expanded from baseline 15 to **19 unique color tokens**:
  - `K` (`0x0F172A`): 1px dark slate outline
  - `k` (`0x121016`): Deep pupil / shadow
  - `H` (`0xFBAE68`): Ginger fur specular highlight
  - `G` (`0xEE7B28`): Vibrant ginger base fur
  - `g` (`0xC86228`): Mid-tone fur shadow
  - `D` (`0x9E3B0E`): Deep tabby stripe
  - `d` (`0x782D00`): Tabby forehead M-mark & flank stripe core
  - `W` (`0xFFFFFF`): Pure white eye catchlight & chest fluff highlight
  - `C` (`0xFFF3E0`): Cream muzzle & chest base
  - `c` (`0xF1F5F9`): Soft white shadow
  - `w` (`0xCBD5E1`): Under-fluff slate shadow / whisker accent
  - `P` (`0xFFB3C1`): Soft pink nose & inner ear
  - `p` (`0xE67E90`): Inner ear shadow
  - `E` (`0x55C655`): Emerald eye iris
  - `I` (`0x22C55E`): Deep iris green accent
  - `e` (`0x1E4A1E`): Deep eye shadow
  - `L` (`0xA3F0A3`): Eye specular shimmer
  - `Z` (`0x93C5FD`): Sleep Zzz cyan
  - `z` (`0xBFDBFE`): Sleep Zzz soft blue
- **Matrices (`cat_idle_0`, `cat_idle_1`, `cat_walk_*`, `cat_sit_*`, `cat_sleep_*`)**:
  - Upgraded all 9 frames with 1px dark slate outlines (`0x0F172A`).
  - Added M-mark forehead stripes (`d`), tabby flank stripes, and expressive eyes with catchlights (`W`, `E`, `I`, `L`).
  - Enhanced idle animation (`cat_idle_0` vs `cat_idle_1`) with a smooth frame-to-frame tail-swish motion.
  - Verified 100% of defined 19 tokens are active across the matrix set.
- **Fallback Bake (`gc2` in `FarmScene._bakeTextures`)**:
  - Updated color constants (`GO`, `GD`, `GL`, `EY`, `PU`, `PK2`) to align with the upgraded ginger cat palette.
- **Mechanics Preserved**:
  - Origin `(0.5, 1)`, scale `0.75`, Y-sorting depth (`catY`), shadow anchor `(20, 6, 2)`, proximity check (`65px`), and `showCatDialog()` modal trigger.

---

### 2. Notice Board & Dungeon Portal NPC Upgrade (R4)
- **Notice Board (`notice_board`)**:
  - Upgraded from 6 to **18 unique color tokens** (`NOTICE_BOARD_PALETTE`):
    - `K` (`0x0F172A`): 1px dark slate outline
    - `O` (`0xE5A96E`): Sunlit wood grain highlight
    - `o` (`0xC8864B`): Light oak frame
    - `W` (`0x965A2C`): Medium cedar wood base
    - `w` (`0x643714`): Dark timber shadow
    - `d` (`0x3E2009`): Deep wood grain line
    - `b` (`0xFFF3C7`): Warm parchment paper base
    - `B` (`0xFFFAF0`): Parchment paper highlight
    - `u` (`0xE2E8F0`): Parchment shadow edge
    - `N` (`0x334155`): Dark ink note mark
    - `n` (`0x64748B`): Light ink note mark
    - `R` (`0xEF4444`): Red pushpin accent
    - `r` (`0x991B1B`): Pushpin shadow
    - `M` (`0x475569`): Lantern iron housing
    - `m` (`0x1E293B`): Lantern iron shadow
    - `Y` (`0xFEF08A`): Lantern bright core
    - `y` (`0xF59E0B`): Lantern warm amber glow
    - `g` (`0xFB7185`): Lantern warm ambient glow
  - Features 1px dark slate outlines, rich wood grain texture, pinned parchment sheets with ink marks, red pushpins, and a warm hanging lantern housing with ambient glow.
- **Dungeon Portal (`dungeon_portal`)**:
  - Upgraded from 4 to **17 unique color tokens** (`PORTAL_PALETTE`):
    - `K` (`0x0F172A`): 1px dark slate outline
    - `t` (`0xE2E8F0`): Stone arch highlight
    - `T` (`0x94A3B8`): Stone base slate
    - `S` (`0x475569`): Dark stone slate
    - `s` (`0x1E293B`): Stone shadow folds
    - `C` (`0x38BDF8`): Glowing rune cyan
    - `Q` (`0xF43F5E`): Glowing rune pink/ruby
    - `Y` (`0xFACC15`): Glowing rune amber gold
    - `P` (`0xD8B4FE`): Portal bright lavender outer
    - `p` (`0x9333EA`): Portal vivid purple layer
    - `m` (`0x581C87`): Portal deep violet void
    - `V` (`0x2563EB`): Swirling cosmic blue core
    - `v` (`0x0284C7`): Cyan core vortex streak
    - `E` (`0xA5F3FC`): Plasma energy spark core
    - `W` (`0xFFFFFF`): White hot energy flash
    - `z` (`0xF472B6`): Pulsing glow particle
    - `X` (`0xE0E7FF`): Floating aura spark
  - Features 1px dark slate outlines, multi-tone stone arch, glowing ancient runes (cyan, pink, amber gold), swirling cosmic blue energy core, white hot flash center, and floating glow particles.
- **Mechanics Preserved**:
  - Notice Board: origin `(0.5, 1)`, scale `1.3`, depth sorting, distance check (`<80px`), and `openMemoryGame()` overlay launcher.
  - Dungeon Portal: origin `(0.5, 1)`, scale `1.6`, depth sorting, distance check (`<90px`), and `DungeonScene` transition trigger (including `spawnBossPortal` reuse).

---

### 3. Beehive Sprite Polish & Upgrade (R5)
- **Beehive (`beehive`)**:
  - Upgraded from 8 to **17 unique color tokens** (`BEEHIVE_PALETTE`):
    - `K` (`0x0F172A`): 1px dark slate outline & aperture core
    - `k` (`0x1E293B`): Aperture inner shadow
    - `b` (`0x451A03`): Dark walnut base border
    - `B` (`0x78350F`): Deep mahogany base fill
    - `W` (`0x92400E`): Warm teak base midtone
    - `w` (`0xB45309`): Rich amber wood transition
    - `O` (`0xD97706`): Polished wood edge bevel
    - `S` (`0x642404`): Tier overhang shadow
    - `D` (`0x853208`): Honeycomb cell shadow
    - `A` (`0xA7490A`): Amber contour & entrance arch
    - `M` (`0xC46808`): Golden amber shading transition
    - `Y` (`0xFACC15`): Honey gold primary body
    - `y` (`0xFDE047`): Sunflower yellow top highlight
    - `H` (`0xFEF08A`): Light cream specular highlight
    - `C` (`0xFFFBEB`): Pure specular catchlight
    - `G` (`0xF59E0B`): Glossy honey drip core
    - `g` (`0xE08208`): Honey drip edge shadow
  - Features 1px dark slate outlines (`K`), 6-tier straw skep shading, visible honeycomb cell micro-patterns (`D`, `M`, `y`, `H`), glossy dripping honey droplets with specular catchlights (`G`, `g`, `C`), and a bevelled multi-tone wooden stand.
  - All 17 tokens actively rendered in 20x22 grid.
- **Mechanics Preserved**:
  - Placement `(bx, by)`, origin `(0.5, 1)`, scale `1.6`, drop shadow `(38, 12, 2)`, dynamic depth sorting, proximity check (`<85px`), and `BeeScene` launch trigger on SPACE.

---

## Verification Results

1. **Syntax Check (`game.js`)**:
   - Command: `node -c game.js`
   - Output: 0 syntax errors (passed successfully).
2. **File Sync (`assets/game.js`)**:
   - Command: `Copy-Item -Force game.js assets/game.js`
   - Command: `node -c assets/game.js`
   - Output: 0 syntax errors (passed successfully).
3. **SHA256 Byte Hash Integrity**:
   - `game.js`: `46466CD4188CE2FB112D564928685BBB77F8B0036523919E6C72B8B68A56E43C`
   - `assets/game.js`: `46466CD4188CE2FB112D564928685BBB77F8B0036523919E6C72B8B68A56E43C`
   - Match: 100% byte-for-byte parity.
