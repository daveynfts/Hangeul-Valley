# Milestone M1 Analysis Report: Farm Tilemap & Decorations + Fishing Scene Sprites Upgrade

**Agent:** `explorer_p2_m1`  
**Date:** 2026-07-23  
**Target File:** `C:\VibeCode\Hangeul Valley\game.js`  
**Working Directory:** `C:\VibeCode\Hangeul Valley\.agents\explorer_p2_m1\`

---

## 1. Overview & Scope
This analysis provides a comprehensive, read-only audit of texture generation, tilemaps, farm decorations, and fishing scene sprites in `game.js` for **Milestone M1**. The goal is to ensure 100% texture key parity, provide complete matrix specifications, palettes, and single-char token mappings for a multi-tone Stardew Valley aesthetic, and clearly mark all forbidden elements and their line locations so that Worker agents make no breaking changes.

---

## 2. Renderer & Matrix Engine Architecture

### 2.1 `drawMatrix()` Function Analysis
- **Location:** `game.js` lines 215–227
- **Signature:** `PixelArtRenderer.drawMatrix(g, matrix, palette, ox = 0, oy = 0, ps = 3)`
- **Behavior & Constraints:**
  - `g`: Phaser Graphics object (`scene.make.graphics({ add: false })`).
  - `matrix`: Array of strings where each string represents a row in the sprite grid.
  - `palette`: Key-value object mapping single-character tokens (e.g. `'K'`, `'g'`, `'G'`) to 24-bit hex color values (`0x0F172A`, `0x22C55E`, etc.).
  - `ox`, `oy`: Offset grid positions (defaults to 0, 0).
  - `ps`: Pixel scale multiplier (defaults to `PS = 3`). A 16x16 matrix drawn with `ps = 3` produces a 48x48 screen-pixel texture (`16 * 3 = 48`), perfectly matching Phaser's tile size `TILE = 48`.
  - **Transparent tokens:** Any character equal to `'.'` or `' '` is skipped.
  - **Matrix Row Width:** Every row string in a matrix must have equal character length (e.g., exactly 16 characters for 16x16 matrices, 18 characters for 18x28 trees, 24 characters for 24x16 docks).
  - **1px Dark Outline Convention:** The single-character token `'K'` is reserved for the outer 1-pixel dark contour outline (`0x0F172A`).

### 2.2 Texture Creator (`createTexture`)
- **Location:** `game.js` lines 229–245
- **Filter Mode:** `Phaser.Textures.FilterMode.NEAREST` (`1`) applied to prevent blurry scaling.

---

## 3. Complete Texture Key Audit & 100% Parity Checklist

### 3.1 `generateTilemapTextures()` Texture Keys (44 Keys)
Located at `game.js` lines 265–678.

#### Farm Scene Tilemaps (21 keys):
1. `tile_grass_base` (48x48)
2. `tile_grass_flowers` (48x48)
3. `tile_grass_clover` (48x48)
4. `tile_path_straight` (48x48)
5. `tile_path_corner` (48x48)
6. `tile_path_cross` (48x48)
7. `tile_path_single` (48x48)
8. `tile_path_stone` (48x48)
9. `tile_fence_h` (48x48)
10. `tile_fence_v` (48x48)
11. `tile_fence_post` (48x48)
12. `tile_fence_corner` (48x48)
13. `tile_house_roof` (48x48)
14. `tile_house_wall` (48x48)
15. `tile_house_door` (48x48)
16. `tile_house_window` (48x48)
17. `tile_shore_top` (48x48)
18. `tile_shore_bottom` (48x48)
19. `tile_shore_left` (48x48)
20. `tile_shore_right` (48x48)
21. `tile_shore_corner` (48x48)

#### Fishing Scene Tilemaps (11 keys):
22. `tile_sand` (48x48)
23. `tile_sand_wet` (48x48)
24. `tile_rock_shore` (48x48)
25. `tile_pier_plank` (48x48)
26. `tile_pier_post` (48x48)
27. `tile_pier_lantern` (48x48)
28. `tile_seashell` (48x48)
29. `tile_starfish` (48x48)
30. `tile_driftwood` (48x48)
31. `tile_ocean_deep` (48x48)
32. `tile_water_foam_border` (48x48)

#### Arcade & Dungeon Tilemaps (12 keys):
33. `tile_space_dark` (48x48)
34. `tile_stars_far` (48x48)
35. `tile_stars_near` (48x48)
36. `nebula_purple` (48x48)
37. `nebula_cyan` (48x48)
38. `planet_ringed` (48x48)
39. `planet_gas_giant` (48x48)
40. `tile_dungeon_floor` (48x48)
41. `tile_dungeon_cracked` (48x48)
42. `tile_dungeon_wall_moss` (48x48)
43. `dungeon_torch` (48x48)
44. `tile_dungeon_rune` (48x48)

### 3.2 Dynamic Water Tilemap Keys (`_genWaterTextures`) (8 Keys)
Located at `game.js` lines 820–860.
- `tile_ocean_deep_0`, `tile_ocean_deep_1`, `tile_ocean_deep_2`, `tile_ocean_deep_3` (48x48)
- `tile_water_foam_0`, `tile_water_foam_1`, `tile_water_foam_2`, `tile_water_foam_3` (48x48)

### 3.3 `_genFishingTextures()` Texture Keys (29 Keys)
Located at `game.js` lines 2164–2539.

#### Canonical Fish Keys (11 keys):
1. `fish_carp`
2. `fish_salmon`
3. `fish_tuna`
4. `fish_squid`
5. `fish_eel`
6. `fish_goldfish`
7. `fish_seabass`
8. `fish_shrimp`
9. `fish_octopus`
10. `fish_catfish`
11. `fish_mackerel`

#### Fishing Scene Legacy Aliases & Unique Fish (13 keys):
12. `fishing_carp` (alias to carp)
13. `fishing_salmon` (alias to salmon)
14. `fishing_tuna` (alias to tuna)
15. `fishing_squid` (alias to squid)
16. `fishing_eel` (alias to eel)
17. `fishing_golden_fish` (alias to goldfish)
18. `fishing_snapper` (alias to seabass)
19. `fishing_shrimp` (alias to shrimp)
20. `fishing_octopus` (alias to octopus)
21. `fishing_catfish` (alias to catfish)
22. `fishing_mackerel` (alias to mackerel)
23. `fishing_legendary` (legendary mythic fish)
24. `fishing_clam` (clam sprite)

#### Accessories & Dock Props (5 keys):
25. `dock_plank` (16x16)
26. `dock_post` (16x16)
27. `fishing_dock` (alias to `dock_plank` in `_genFishingTextures`; also generated as 24x16 in decor)
28. `fishing_bobber` (16x16)
29. `fishing_rod` (16x16)

### 3.4 Farm Scene Decoration Texture Keys (15 Keys)
Located at `game.js` lines 4960–5104.
1. `stone_well` (16x16) — Stone well with water sparkle
2. `pixel_barrel` (10x12) — Wood barrel with metal hoops
3. `pixel_crate` (12x12) — Wood crate with X-bracing
4. `signpost` (12x14) — Directional wooden signpost
5. `notice_board` (18x16) — Corkboard notice board with pushpins
6. `shop_sign` (14x18) — Wooden shop sign with coin icon
7. `arcade_machine` (16x22) — Retro arcade cabinet with glowing CRT screen
8. `dungeon_portal` (20x28) — Stone portal with purple swirl
9. `fishing_dock` (24x16) — Pier dock with plank texture
10. `tree` (18x28) — Large leafy oak/pine tree
11. `fnc_post` (4x12) — Vertical fence post
12. `fnc_rail` (14x4) — Horizontal fence rail
13. `sparkle` (16x16) — Sparkle effect
14. `coin` (8x8) — Small gold coin
15. `bf_open` & `bf_flap` (6x6) — Butterfly wings

---

## 4. Stardew Valley Aesthetic Specification (Multi-Tone & 1px Outline)

To achieve the multi-tone earthy Stardew Valley visual standard, sprites must move away from flat 1-2 color fill blocks and utilize **3+ shading tones** per material (Highlight, Base, Shadow, Deep Shadow) bounded by a **1px Dark Slate Outline** (`'K' = 0x0F172A`).

### 4.1 Master Multi-Tone Stardew Palette
```javascript
const STARDEW_M1_PALETTE = {
  // Outline & Contour
  '.': null,
  'K': 0x0F172A, // 1px Deep Dark Slate Outline (Universal)
  'k': 0x1E293B, // Soft Inner Shadow / Secondary Outline

  // Nature & Grass (4 Tones)
  'H': 0x8FD19E, // Spring Highlight Green
  'G': 0x4A7C59, // Warm Forest Green Base
  'g': 0x2D4E35, // Deep Shade Green
  'M': 0x1A3622, // Under-canopy Shadow

  // Earth / Soil / Dirt / Path (4 Tones)
  'B': 0xC4986C, // Sunlit Path Highlight
  'b': 0xA6754B, // Dry Dirt Base
  'A': 0x7E5436, // Rich Warm Earth
  'a': 0x573A23, // Moist Dark Loam Shadow

  // Wood / Timber / Fences / Pier (4 Tones)
  'O': 0xD99B66, // Sunlit Wood Highlight
  'o': 0xB3713D, // Warm Oak Highlight
  'W': 0x8F5428, // Cedar Wood Base
  'w': 0x573012, // Deep Timber Shadow

  // Stone / Rock / Cobble (4 Tones)
  't': 0xC7C1BD, // Specular Stone Highlight
  'T': 0x9E9793, // Weathered Cobble Base
  'S': 0x7D7571, // Dark Slate Base
  's': 0x4A4440, // Deep Mortar Shadow

  // Water & Ocean (4 Tones)
  'E': 0xE0F2FE, // Foam Specular
  'c': 0x6BB1D6, // Water Highlight
  'C': 0x3D7898, // Shimmer Blue Base
  'Z': 0x1E506B, // Deep Ocean Teal
  'z': 0x153A4F, // Abyssal Ocean Shadow

  // Metals & Accents
  'Y': 0xFDE047, // Bright Gold
  'y': 0xD97706, // Bronze / Gold Shadow
  'R': 0xEF4444, // Bright Red
  'r': 0x991B1B, // Deep Red Shadow
  'P': 0xA855F7, // Purple Portal Shimmer
  'p': 0x6D28D9  // Dark Purple Portal Shadow
};
```

---

## 5. Matrix Specifications & Tokens for Key Sprites

### 5.1 Farm Scene Tilemaps (16x16 Matrices)

#### 1. Grass Base (`tile_grass_base`)
```javascript
const tile_grass_base_matrix = [
  'GGGGGHGGGGGGGHGG',
  'GGGGGGGGGGGGGGGG',
  'GGgGGGGGGgGGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGHGGGGGGGGGG',
  'GgGGGGGGGGGGGGgG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGGgGGGGgGG',
  'GGGGGGGGGGGGGGGG',
  'GgGGGGGGGGGGGGGG',
  'GGGGGgGGGGGGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG',
  'GGGGGGGGGGGGGGGG',
  'gggggggggggggggg',
  'MMMMMMMMMMMMMMMM'
];
```

#### 2. Fence Post (`tile_fence_post`)
```javascript
const tile_fence_post_matrix = [
  '.....KKKKKK.....',
  '....KOOOOoOK....',
  '....KOOOOoOK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KOOWWwwK....',
  '....KggggggK....',
  '....KMMMMMMK....'
];
```

#### 3. House Roof Tile (`tile_house_roof`)
```javascript
const tile_house_roof_matrix = [
  'KKKKKKKKKKKKKKKK',
  'KRRRRRRRRRRRRRRK',
  'KRRRRRRRRRRRRRRK',
  'KrrrrrrrrrrrrrrK',
  'KKKKKKKKKKKKKKKK',
  'KRKKKKRRKKKKRRKK',
  'KRRRRRRRRRRRRRRK',
  'KrrrrrrrrrrrrrrK',
  'KKKKKKKKKKKKKKKK',
  'KKKKRRKKKKRRKKKK',
  'KRRRRRRRRRRRRRRK',
  'KrrrrrrrrrrrrrrK',
  'KKKKKKKKKKKKKKKK',
  'KRKKKKRRKKKKRRKK',
  'KrrrrrrrrrrrrrrK',
  'KKKKKKKKKKKKKKKK'
];
```

---

### 5.2 Farm Decorations

#### 1. Stone Well (`stone_well` — 16x16)
```javascript
const stone_well_matrix = [
  '..KKKKKKKKKKKK..',
  '.KOOOOOOOOOOOoK.',
  '.KOWWWWWWWWWwwK.',
  '.KOWKKKKKKKKwwK.',
  '.KOWKTTTTTTKwwK.',
  '.KOWKTSCCSTKwwK.',
  '.KOWKSCcCcSKwwK.',
  '.KOWKSCcCcSKwwK.',
  '.KOWKTSCCSTKwwK.',
  '.KOWKTTTTTTKwwK.',
  '.KOWKKKKKKKKwwK.',
  '.KOWWWWWWWWWwwK.',
  '.KSSSSssssssssK.',
  '.KSSSSssssssssK.',
  '.KKKKKKKKKKKKKK.',
  '................'
];
```

#### 2. Pixel Barrel (`pixel_barrel` — 10x12)
```javascript
const pixel_barrel_matrix = [
  '.KKKKKKKK.',
  'KOOOOOOOoK',
  'KOWWWWWWwK',
  'KKKKKKKKKK',
  'KtTTTTTTsK',
  'KOWWWWWWwK',
  'KOWWWWWWwK',
  'KOWWWWWWwK',
  'KtTTTTTTsK',
  'KKKKKKKKKK',
  'KOWWWWWWwK',
  '.KKKKKKKK.'
];
```

#### 3. Pixel Crate (`pixel_crate` — 12x12)
```javascript
const pixel_crate_matrix = [
  'KKKKKKKKKKKK',
  'KOOOOOOOOOoK',
  'KOWKKKKKKWwK',
  'KOWKOWWwKWwK',
  'KOWKKOWwKWwK',
  'KOWWKKWwKWwK',
  'KOWWKWKKKWwK',
  'KOWWKWwKKWwK',
  'KOWWKWwKOWwK',
  'KOWKKKKKKWwK',
  'KOwwwwwwwwwK',
  'KKKKKKKKKKKK'
];
```

---

### 5.3 Fishing Scene Species (16x16 Matrices)

#### 1. Carp (`fish_carp` / `fishing_carp`)
- Palette Tokens: `'K'`: `0x0F172A`, `'Z'`: `0xF59E0B`, `'z'`: `0xD97706`, `'Y'`: `0xFDE047`, `'y'`: `0xB45309`, `'W'`: `0xFFFFFF`, `'w'`: `0xF1F5F9`
```javascript
const carp_matrix = [
  '................',
  '.....KKKK.......',
  '...KKYZYYKK.....',
  '..KKYZZZYYYKK...',
  '.KKYZZZZYYYYYKK.',
  'KKYZZKZZYYYYYYyK',
  'KyzzzzWWWWWWWWyk',
  'Kyzzzzzzzzzzzzyk',
  '.Kyzzzzzzzzzzk..',
  '..Kyzzzzzzzyk...',
  '....Kyzzzzk.....',
  '.....KKKKK......',
  '................',
  '................',
  '................',
  '................'
];
```

#### 2. Salmon (`fish_salmon` / `fishing_salmon`)
- Palette Tokens: `'K'`: `0x0F172A`, `'S'`: `0xFB923C`, `'s'`: `0xEA580C`, `'H'`: `0xFFEDD5`, `'h'`: `0xC2410C`, `'W'`: `0xFFFFFF`
```javascript
const salmon_matrix = [
  '................',
  '.....KKKK.......',
  '...KKSSSHKK.....',
  '..KKSSSKSSSSKK..',
  '.KKSSSWSSSSSSSKS',
  'KSsssssWWWWWWWhs',
  'KSsssssssssssssh',
  '.KSsssssssssssh.',
  '..KSsssssssssk..',
  '....KSsssssk....',
  '.....KKKKKK.....',
  '................',
  '................',
  '................',
  '................',
  '................'
];
```

#### 3. Tuna (`fish_tuna` / `fishing_tuna`)
- Palette Tokens: `'K'`: `0x0F172A`, `'U'`: `0x2563EB`, `'u'`: `0x1D4ED8`, `'B'`: `0x60A5FA`, `'V'`: `0x1E3A8A`, `'W'`: `0xFFFFFF`
```javascript
const tuna_matrix = [
  '................',
  '.....KKKK.......',
  '...KKUUUBKK.....',
  '..KKUUUKUUUUKK..',
  '.KKUUUWUUUUUUUV+',
  'KUuuuuuWWWWWWWWu',
  'KUuuuuuuuuuuuuuu',
  '.KUuuuuuuuuuuuu.',
  '..KUuuuuuuuuuu..',
  '....KUuuuuuu....',
  '.....KKKKKK.....',
  '................',
  '................',
  '................',
  '................',
  '................'
];
```

#### 4. Legendary Fish (`fishing_legendary`)
- Palette Tokens: `'K'`: `0x0F172A`, `'Z'`: `0x9333EA`, `'z'`: `0x7E22CE`, `'Y'`: `0xFACC15`, `'W'`: `0xFFFFFF`
```javascript
const legendary_matrix = [
  '.....KKKKKK.....',
  '...KKKZZZZKKK...',
  '..KKZZZKZZZZKKK.',
  '.KKZZZZWZZZZZZKK',
  'KKZZZZZZWWWWWWWK',
  'KzzzzzzzWWWWWWWK',
  'KKzzzzzzzzzzzzKK',
  '.KKzzzzzzzzzzKK.',
  '..KKKzzzzzzKKK..',
  '....KKzzzzKK....',
  '.....KKKKKK.....',
  '................',
  '................',
  '................',
  '................',
  '................'
];
```

---

## 6. Forbidden Elements & Guarded Code Sections

To prevent accidental breakage of key character models, NPCs, and dynamic rendering engines, Worker agents **MUST NOT** modify or delete the following code ranges:

| Element | Component / Method | File Line Range | Description |
| :--- | :--- | :--- | :--- |
| **Player Farmer** | `STARDEW_PALETTE` Player Outfit/Skin | Lines 148–176 | Player skin/hair/outfit colors |
| **Player Farmer** | `_genPlayerTextures()` | Lines 863–1376 | Player 4-direction walk & action frames |
| **Ginger Cat NPC** | `STARDEW_PALETTE` Cat Fur | Lines 177–188 | Cat fur/eyes/nose colors |
| **Ginger Cat NPC** | `_genNpcTextures()` Cat Section | Lines 1378–1567, 1620–1628 | Cat idle/walk/sit/sleep matrices & anims |
| **Wizard Merlin NPC** | `STARDEW_PALETTE` Wizard Palette | Lines 190–204 | Wizard robe/beard/staff colors |
| **Wizard Merlin NPC** | `_genNpcTextures()` Wizard Section | Lines 1568–1616, 1630–1632 | Wizard idle matrices & anims |
| **Wizard Merlin NPC** | `_createFarmDecorations()` `gwiz` | Lines 5105–5120 | Procedural 16x22 wizard NPC texture |
| **DynamicShadowSystem** | `class DynamicShadowSystem` | Lines 4646–4735 | Shadow rendering system |
| **DynamicShadowSystem** | Scene Instantiations | Line 4862, Line 6894 | `this.shadows = new DynamicShadowSystem(this)` |

---

## 7. Key Findings & Next Steps

1. **Parity Guaranteed:** All 44 tilemap keys, 8 dynamic water keys, 29 fishing keys, and 15 farm decor keys have been completely enumerated.
2. **Matrix Standard:** Sprites utilize 16x16 (or prop dimensions) matrices rendered via `PixelArtRenderer.drawMatrix` at `ps = 3`.
3. **Outline Enforcement:** Universal 1px dark slate contour `'K' = 0x0F172A` must be enforced across all upgraded assets.
4. **Handoff Prepared:** The handoff document (`handoff.md`) contains full verification steps for the Worker agent.
