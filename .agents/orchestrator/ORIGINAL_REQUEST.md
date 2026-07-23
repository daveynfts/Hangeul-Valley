# Original User Request

## Follow-up — 2026-07-23T09:04:25Z

Nâng cấp character design chuyên nghiệp cho game **Hangeul Valley**: thiết kế lại Farmer (nhân vật chính) với animation hành động mới (tưới nước, thu hoạch, hái quả), và đổi tên Cat NPC từ "Muop" thành "Ginger Cat" với character design phong phú hơn. Tất cả sprites phải được vẽ procedurally bằng Phaser Graphics API (zero external image files).

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Architecture Context

Game là single-page web app (Phaser 3 + vanilla HTML/CSS/JS):
- **`game.js`**: Toàn bộ game logic (~8000+ lines), bao gồm `PixelArtRenderer` class chứa tất cả procedural sprite generation
- **Sprite system**: `PixelArtRenderer.drawMatrix(g, matrix, palette)` → `generateTexture(key, w, h)` — tất cả sprites là 16×16 character matrix × PS=3 = 48×48 pixel textures
- **Animation system**: Phaser `scene.anims.create()` với multi-frame texture sequences
- **Key constraint**: Zero external image files — all pixel art must be generated via `fillRect()` grid patterns in `generateTexture()`

### Current Character State
- **Farmer**: 12 walk frames (4 directions × 3 frames) using STARDEW_PALETTE colors. NO action animations exist — watering/harvesting/picking are handled by particle effects only, with no player pose change
- **Cat NPC "Muop"**: 2 idle frames (eyes open/blink) + 1 legacy `cat_npc` texture. Simple ginger body with white belly. Name "Muop" hardcoded in 3 locations in game.js
- **Wizard "Merlin"**: 2 idle frames (staff sparkle). Purple robe, cyan staff orb — reference for NPC quality bar

### Current Farmer Sprite Details
- Color palette symbols: `.`=transparent, `X`=skin(0xF9D09B), `x`=skin-shadow(0xD8A070), `T`=straw-hat(STARDEW_PALETTE.strawHat=0xD4AA63), `t`=hat-highlight(0xE8C988), `V`=hat-brim(STARDEW_PALETTE.woodHighlight=0xB3713D), `R`=hat-ribbon(STARDEW_PALETTE.hatRibbon=0x9E3B2D), `Z`=overalls(STARDEW_PALETTE.overallsBase=0x3B4D7A), `z`=overalls-dark(0x263354), `Q`=pants(0x1E2A4A), `q`=pants-shadow(0x161F38), `S`=boots(STARDEW_PALETTE.boots=0x59381E), `s`=boots-shadow(0x382210), `N`=eyes(0x2A1A0A), `I`=blush(0xFFB3B3), `W`=white(0xFFFFFF)
- Texture keys: `player_walk_down_0/1/2`, `player_walk_up_0/1/2`, `player_walk_left_0/1/2`, `player_walk_right_0/1/2`
- Animations: `player-walk-down/up/left/right` at frameRate:8, repeat:-1

### Current Cat NPC Details
- Color palette: `O`=ginger(0xF5813F), `o`=dark-ginger(0xB84E10), `l`=light-ginger(0xFFBB66), `w`=white(0xFFFFFF), `e`=amber-eyes(0xFFCC44), `p`=pink-nose(0xFFAA99), `u`=dark-pupil(0x1A0800)
- Texture keys: `cat_idle_0`, `cat_idle_1`, `cat_npc`
- Animation: `cat-idle` at frameRate:3, repeat:-1
- Name "Muop" appears at: line ~3537 (vocab fact), line ~4543 (_createCatNPC text label), line ~4964 (_updateTargetHighlight)

### Gameplay Trigger Points for Action Animations
- **Watering**: In FarmScene, after Phase 2 quiz success, code changes plot texture to `drt_wet` and tints crop
- **Harvesting**: In FarmScene, after Phase 3 quiz success, code calls `_sparkle(x,y)`, `_flyCoins(...)`, removes crop
- **Fruit Picking**: In FarmScene, apple tree interaction when `this.appleRipe === true`

## Requirements

### R1. Farmer Action Animations & Tool Sprites
Create new procedural pixel art animation sets for the Farmer performing farming actions. Each action needs distinct poses showing the character using a tool, with at least 3 animation frames per action per direction (down-facing at minimum, side-facing recommended):

- **Watering** (bình tưới nước): Farmer holds watering can, tilts it to pour water. Should be triggered when player waters a crop (Phase 2 quiz success).
- **Harvesting** (thu hoạch): Farmer bends/reaches down to pick up a crop. Should be triggered when player harvests a mature crop (Phase 3 quiz success).
- **Fruit Picking** (hái quả): Farmer reaches up to pick fruit from the apple tree. Should be triggered when player picks apples.

Also create matching tool sprites (watering can, basket/sickle) as separate small textures for potential UI use.

### R2. Ginger Cat Character Redesign
Rename the cat NPC from "Muop" to "Ginger Cat" throughout the codebase, and significantly upgrade the character design with richer pixel art and more expressive animations:

- **Visual upgrade**: More detailed ginger tabby design — visible stripes pattern, expressive face with whiskers, fluffy tail with movement
- **Animation set**: At minimum 4 animation states: idle-blink (existing, improved), walking/trotting, sitting/grooming, sleeping/curled up
- **In-game integration**: The cat should use its new animations contextually in FarmScene (e.g., idle when player is nearby, walking when following, sleeping when player is away)

### R3. Seamless Integration With Existing Game Systems
All new animations must integrate with the existing `PixelArtRenderer` class and Phaser animation system. The Farmer's action animations must be triggered at the correct gameplay moments (watering on Phase 2, harvesting on Phase 3, fruit picking on apple tree interaction). The existing 12-frame walk cycle must remain intact.

## Acceptance Criteria

### Character Quality
- [ ] Farmer action animations (watering, harvesting, fruit picking) each have ≥3 distinct frames that clearly depict the action being performed — an independent reviewer can identify which action is being shown without context.
- [ ] Ginger Cat has ≥4 animation states (idle-blink, walk, sit, sleep) with ≥2 frames each.
- [ ] All new sprites use the 16×16 matrix format at PS=3 (48×48 rendered pixels), consistent with existing sprites.
- [ ] All new sprites use `STARDEW_PALETTE` colors or harmonious additions.

### Naming & Code
- [ ] All instances of "Muop" in game.js are replaced with "Ginger Cat" (verified by text search returning 0 results for "Muop").
- [ ] New textures are registered in `PixelArtRenderer` and generated via `generateAllTextures()`.
- [ ] New Phaser animations are created with appropriate frameRate and repeat settings.

### Integration & Stability
- [ ] `node -c game.js` passes with zero syntax errors.
- [ ] Farmer's existing 12-frame walk cycle animations continue to work unchanged.
- [ ] Farmer action animations play at the correct gameplay triggers (watering → Phase 2 success, harvesting → Phase 3 success, fruit picking → apple tree interaction).
## Follow-up — 2026-07-23T09:04:25Z

Nâng cấp character design chuyên nghiệp cho game **Hangeul Valley**: thiết kế lại Farmer (nhân vật chính) với animation hành động mới (tưới nước, thu hoạch, hái quả), và đổi tên Cat NPC từ "Muop" thành "Ginger Cat" với character design phong phú hơn. Tất cả sprites phải được vẽ procedurally bằng Phaser Graphics API (zero external image files).

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Follow-up — 2026-07-23T03:12:42Z

Nâng cấp toàn bộ chất lượng pixel art trong game **Hangeul Valley** lên đẳng cấp chuyên nghiệp. Hiện tại các sprites 16×16 quá đơn giản — thiếu shading, thiếu chi tiết giải phẫu, màu sắc phẳng. Mục tiêu: đạt chất lượng pixel art ngang tầm game indie chuyên nghiệp (Stardew Valley, Celeste, Eastward) với kỹ thuật shading nhiều tầng, dithering, anti-aliasing pixel, và sub-pixel animation.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Architecture Context

- **Sprite system**: `PixelArtRenderer.drawMatrix(g, matrix, palette)` → `generateTexture(key, w, h)` — 16×16 character matrix × PS=3 = 48×48 pixel textures
- **Key constraint**: Zero external image files — all pixel art must be generated via `fillRect()` grid patterns
- **Existing characters**: Farmer (12 walk + 9 action frames), Ginger Cat (8 frames), Wizard Merlin (2 frames), 11 fish species, 5 crop types × 4 growth stages, arcade enemies, dungeon monsters
- **Color palette**: `STARDEW_PALETTE` object with earthy warm tones

## Requirements

### R1. Professional-Grade Character Sprite Redesign
Redesign ALL character sprites (Farmer, Ginger Cat, Wizard Merlin) with professional pixel art techniques:
- **Multi-tone shading**: Each color area must use at least 3 tones (highlight, base, shadow) instead of current flat 1-2 tone fills
- **Anatomical detail**: Visible arms/hands separate from body, proper head-to-body proportions, distinguishable clothing folds
- **Pixel-level polish**: Consistent 1px dark outline on all characters, anti-aliasing pixels at curves (selectively placed intermediate-color pixels), dithering patterns for texture on clothing/fur
- **Animation fluidity**: Walk cycles should show weight shift, arm swing, and head bob. Action animations (watering, harvesting, picking) should have clear anticipation-action-follow-through poses
- **Ginger Cat**: Detailed tabby stripe patterns with fur texture dithering, visible whiskers, expressive tail positions per animation state, ear movement
- **Wizard Merlin**: Flowing robe with fabric fold shading, beard detail with individual hair strands, staff crystal with inner glow effect (multiple translucent color layers)

### R2. Enhanced Environment & Entity Sprites
Upgrade crop sprites, fish sprites, dungeon monsters, and arcade enemies with the same professional shading treatment:
- **Crops**: Each growth stage should be visually distinct with detailed leaf shapes, stem structure, and harvest-ready sparkle/color richness
- **Fish**: Distinct scale patterns, fin detail, species-specific coloring with iridescent highlights
- **Dungeon monsters**: Menacing character design with animated idle breathing/pulsing, detailed weapon/armor on skeleton/goblin
- **Arcade enemies**: Sleek sci-fi design with engine glow effects, distinct silhouettes per enemy type

### R3. Maintain All Existing Functionality
All existing texture keys, animation keys, gameplay triggers, and scene integrations must remain intact. The upgrade is purely visual — no gameplay logic changes. Existing walk cycles, action animations, and idle animations must continue to work with the same keys.

## Acceptance Criteria

### Sprite Quality
- [ ] Every character sprite (Farmer, Ginger Cat, Wizard) uses ≥3 distinct color tones per major color area (e.g., hat has highlight, base, shadow; overalls have highlight, base, shadow, deep shadow).
- [ ] Farmer sprites have visible separate arms in at least the down-facing walk frames.
- [ ] Ginger Cat sprites show visible stripe/tabby pattern using dithering or alternating color pixels.
- [ ] All character sprites have a consistent 1px dark outline on their outer edges.

### Technical Integrity
- [ ] `node -c game.js` passes with zero syntax errors.
- [ ] All existing texture keys (`player_walk_down_0` through `player_pick_down_2`, `cat_idle_0/1`, `cat_walk_0/1`, `cat_sit_0/1`, `cat_sleep_0/1`, `wizard_idle_0/1`, all fish/crop/enemy keys) remain registered and functional.
- [ ] Root `game.js` and `assets/game.js` are synchronized.
- [ ] Total number of registered textures is ≥ the current count (no textures removed).

### Process
- [ ] Skip victory audit phase — user will visually audit the results themselves.

