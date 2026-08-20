# Original User Request

> **Historical log.** This file records original agent briefs. The `assets/` mirror described throughout was retired on 2026-08-20; the shipped game is the files at repo root.

## Initial Request — 2026-07-22T08:41:03Z

Nâng cấp toàn diện giao diện người dùng (UI), trải nghiệm điều khiển (UX), phong cách đồ họa 64-Bit Retro Glassmorphism, hiệu ứng âm thanh Synthesized Web Audio API, và hoạt họa chuyển cảnh mượt mà cho game Hangeul Valley.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Requirements

### R1. 64-Bit Retro Glassmorphic HUD & Modal Design System
Xây dựng thiết kế giao diện HUD và Modals (Shop, Vocab Book, Quiz, Level Select, Fish Album) đồng bộ theo phong cách **64-Bit Retro Glassmorphism** (kết hợp hiệu ứng kính mờ sương hiện đại với các chi tiết pixel art 64-bit sắc nét, viền phát sáng neon, typography Tiếng Hàn và responsive trên mọi thiết bị).

### R2. Web Audio API Synthesized Sound Effects & Audio Feedback
Tích hợp trình tạo âm thanh Web Audio API chiptune 64-bit thuần JavaScript (không dùng file MP3 bên ngoài) cho tất cả tương tác: tiếng bấm nút, tiếng nổ thu hoạch cây, tiếng giật cá, tiếng vung kiếm và âm thanh đúng/sai khi giải đố.

### R3. Smooth Micro-Animations, Lighting & Scene Transitions
Thêm hiệu ứng hoạt họa vi mô (micro-animations) 64-bit, chuyển cảnh fade-in/out mượt mà giữa các Scene (Farm, Arcade, Dungeon, Fishing), và ánh sáng môi trường ngày/đêm dịu mắt.

## Acceptance Criteria

### UI/UX Quality & Integration
- [ ] Giao diện HUD và các bảng Modal (Shop, Vocab, Quiz, Fish Album) đạt phong cách 64-Bit Retro Glassmorphism hiện đại, không bị tràn màn hình.
- [ ] Mọi thao tác bấm nút, trồng cây, thu hoạch, giật cá, chém quái đều phát ra âm thanh Web Audio API 64-bit sống động.
- [ ] Chuyển cảnh mượt mà giữa các Phân cảnh Phaser mà không bị giật lag hay treo màn hình.
- [ ] Lệnh kiểm tra cú pháp `node -c game.js` vượt qua thành công 100% không có lỗi.

## Follow-up — 2026-07-22T09:56:34Z

Nâng cấp toàn diện cơ chế gameplay và xây dựng nền kinh tế game gây nghiện cho **Hangeul Valley** — một game học tiếng Hàn kết hợp farming, fishing, arcade shooter, dungeon crawler, spell duel, memory match, và cat NPC dialog. Mục tiêu: thiết kế vòng lặp **play → learn Korean → earn rewards → unlock → play more** khiến người chơi không muốn dừng lại, đồng thời học tiếng Hàn hiệu quả hơn gấp nhiều lần so với flashcard thông thường.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Architecture Context

Game là single-page web app (Phaser 3 + vanilla HTML/CSS/JS):
- **`index.html`**: Toàn bộ UI overlays (HUD, Shop, Quiz, Modals) — styled 64-Bit Retro Glassmorphism CSS
- **`game.js`**: Toàn bộ game logic Phaser 3 (~5000+ lines) — 7 scenes (Farm, Fishing, Arcade, Dungeon, SpellDuel, MemoryMatch, CatDialog)
- **`levels.json`**: Vocabulary data (Korean ↔ English word pairs organized by themed levels)
- **`save_data.json`**: Player persistence via pywebview API + localStorage fallback
- **`assets/`**: Mirror copy of root files (must stay synced)

**Existing economy** (to be refactored):
- Single currency: Gold (💰)
- Seed Shop: unlock vocabulary level packs (50–525💰 exponential pricing)
- Trophy Shop: milestone achievements (50–20,000💰)
- Diminishing returns per word harvest (10→8→7→6→5→4→3 Gold minimum)
- No crafting, no pets, no daily systems, no prestige, no multi-currency

## Requirements

### R1. Triple Currency Economy & Rebalanced Gold Sinks
Refactor the existing single-currency Gold system into a **triple currency economy**:
- **🪙 Coins (동전)**: Primary earnable currency from all gameplay activities (farming, fishing, dungeon, arcade, duel, memory). Used for everyday purchases (seeds, hints, basic items).
- **💎 Gems (보석)**: Premium rare currency earned ONLY from perfect quiz scores (100% accuracy streaks), rare fish catches (Legendary tier), boss kills with no damage taken, and daily login streak milestones. Used for premium unlocks (rare pets, cosmetics, special recipes).
- **🏅 Honor (명예)**: Reputation currency earned from completing quests, mastering vocabulary words to Legendary tier, crafting rare dishes, and seasonal event participation. Used for leaderboard ranking, unlocking prestige tiers, and elite content.

Rebalance ALL existing Gold rewards and prices to use the new Coins denomination, and introduce meaningful sinks across all three currencies so that no currency becomes trivially inflated.

### R2. Korean-Gated Progression & Quest System
Implement a **Hard Lock** progression system where ALL new content requires passing Korean language quizzes:
- **Zone Unlocks**: New farm areas, fishing spots, dungeon floors, and arcade levels require demonstrating mastery of previous zone's vocabulary (e.g., 80% of words at "Practicing" or above in SRS).
- **Shop Gating**: Premium shop items require answering a Korean quiz before purchase (not just spending currency).
- **Boss Gates**: Each major boss requires solving a Korean challenge to even attempt the fight.
- **Quest System**: Implement a main storyline quest chain + daily/weekly side quests that drive progression. Quests should naturally guide players through vocabulary themes (Food → Animals → Family → Colors → Numbers → advanced topics). Quest rewards should be the primary driver of Gems and Honor income.

### R3. Crafting/Cooking System with Korean Culture Integration
Build a **Korean cuisine crafting system** where players combine ingredients from farming + fishing to cook authentic Korean dishes:
- **Recipe Book (요리책)**: Collection of Korean recipes (김치, 비빔밥, 불고기, 떡볶이, 삼겹살, etc.) that players discover and unlock.
- **Ingredients**: Farm crops and caught fish become crafting ingredients. Each ingredient has a Korean name that players must learn.
- **Cooking Mini-game**: Simple timed-input cooking sequence where players must type/select Korean ingredient names correctly to succeed.
- **Buff System**: Cooked dishes provide temporary gameplay buffs (2x Coin earn rate, +50% fishing luck, faster crop growth, combat damage boost, extra quiz hints). Buffs should be meaningful enough to incentivize cooking but not game-breaking.
- **Cultural Learning**: Each recipe includes a cultural fact about the dish (origin, when it's traditionally eaten, regional variations).

### R4. Pet Companion System
Implement collectible **pet companions (반려동물)** that assist gameplay:
- **Pet Types**: At least 5 distinct pets (e.g., 강아지/Dog, 고양이/Cat, 토끼/Rabbit, 햄스터/Hamster, 앵무새/Parrot) each with unique passive abilities (auto-water crops, increase fishing catch rate, bonus combat damage, extra quiz hints, coin magnet).
- **Pet Acquisition**: Pets are obtained through Gem spending, rare quest rewards, or seasonal event prizes — NOT easily farmable.
- **Pet Leveling**: Pets gain XP when the player completes activities. Higher pet levels = stronger passive bonuses. Pet level-up requires answering Korean vocabulary questions about the pet's species/characteristics.
- **Pet Happiness**: Pets have a happiness meter that decays over time. Players maintain happiness by feeding cooked dishes (connecting to R3) and completing Korean practice. Unhappy pets provide reduced bonuses.

### R5. Seasonal Events & Leaderboard System
- **Seasonal Events**: Implement a framework for time-limited events tied to Korean cultural celebrations (추석 Chuseok, 설날 Seollal, 어린이날 Children's Day, etc.). Events introduce limited-time quests, exclusive recipes, rare pet skins, and bonus Honor rewards. Events should have unique Korean vocabulary themes.
- **Leaderboard**: Local leaderboard (stored in save data) tracking: total vocabulary mastered, total Honor earned, highest cooking tier achieved, pet collection completion %. Leaderboard data should be viewable from a dedicated UI panel.

## Acceptance Criteria

### Economy Balance & Flow
- [ ] All three currencies (Coins, Gems, Honor) are earnable through distinct, clearly communicated gameplay actions.
- [ ] No single activity can be "farmed" to trivially accumulate any currency — diminishing returns, cooldowns, or variety requirements must prevent degenerate strategies.
- [ ] A new player can afford their first meaningful purchase within 5-10 minutes of gameplay. Mid-game progression (unlocking 3rd zone) requires approximately 2-4 hours of mixed gameplay.
- [ ] Currency conversion or exchange between types is NOT allowed (each has its own earn/spend ecosystem).

### Korean Learning Integration
- [ ] Every new zone, shop item tier, and boss encounter is gated behind a Korean vocabulary quiz that the player must pass.
- [ ] The quest system guides players through at least 3 vocabulary themes in a logical pedagogical order.
- [ ] Crafting recipes require players to correctly identify Korean ingredient names to cook successfully.
- [ ] Pet leveling requires answering vocabulary questions — no passive/AFK leveling.

### System Integrity
- [ ] Running `node -c game.js` produces zero syntax errors.
- [ ] The save system correctly persists and loads all new data (currencies, quest progress, pet state, recipes unlocked, event progress, leaderboard scores) without corrupting existing save data or losing backward compatibility.
- [ ] All new UI panels (Quest Log, Recipe Book, Pet Panel, Leaderboard, Event Banner) are functional and styled consistently with the existing 64-Bit Retro Glassmorphism design system.
- [ ] Root files (`index.html`, `game.js`) and `assets/` copies remain synchronized.

### Gameplay Feel
- [ ] The crafting system has at least 8 distinct Korean recipes with unique ingredient combinations and buff effects.
- [ ] At least 5 pets are implemented with distinct passive abilities and visual emoji representations.
- [ ] The quest system has at least 10 quests forming a coherent progression path.
- [ ] At least 2 seasonal event templates are defined (even if not currently "active") with unique vocabulary, quests, and rewards.

## Follow-up — 2026-07-22T10:41:14Z

Nâng cấp toàn bộ đồ họa game **Hangeul Valley** từ emoji text sprites lên phong cách **HD Pixel Art kiểu Stardew Valley** sử dụng **Canvas Pixel Art** (Phaser 3 Graphics API — vẽ trực tiếp bằng rectangles, circles, polygons, không cần file ảnh bên ngoài). Kích thước sprite mục tiêu: **48×48 pixel**. Nâng cấp tất cả 7 scenes với hiệu ứng visual đẳng cấp: day/night cycle, weather, particle effects, animated water, smooth character animations, crop growth stages, và parallax scrolling backgrounds.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Architecture Context

Game là single-page web app (Phaser 3 + vanilla HTML/CSS/JS):
- **`game.js`**: Toàn bộ game logic Phaser 3 (~6000+ lines) — 7 scenes: FarmScene, FishingScene, ArcadeScene, DungeonScene, SpellDuel (HTML overlay), MemoryMatch (HTML overlay), CatDialog (HTML overlay)
- **`index.html`**: Toàn bộ UI overlays styled with 64-Bit Retro Glassmorphism CSS
- **`assets/`**: Mirror copy of root files (must stay synced)
- All current sprites are **emoji text** rendered via `this.add.text()` — no image files exist

**Key constraint**: The game must remain a **zero-external-assets web app** — all pixel art graphics must be generated programmatically using Phaser 3's built-in Graphics API (`this.add.graphics()`, `this.make.graphics()`, `generateTexture()`). No PNG/SVG/image files. This keeps the game deployable on Vercel as a single HTML+JS bundle.

## Requirements

### R1. Pixel Art Sprite Renderer & Character System
Replace ALL emoji text sprites across all scenes with **48×48 procedural pixel art** drawn using Phaser Graphics API (`graphics.fillRect()` grid patterns rendered to textures via `generateTexture()`). Each entity should look like a hand-crafted Stardew Valley pixel art character:
- **Player character**: Farmer with hat, overalls, and tool — 4-directional walk cycle animation (at least 3 frames per direction = 12 frames total).
- **NPCs**: Cat (Muop 🐱), Wizard (Merlin), each with idle animation and unique pixel art design.
- **Farm elements**: Crops with 4 growth stages (seed → sprout → growing → harvestable), each visually distinct. Apple tree with seasonal appearance. Farmland tiles (tilled soil, watered soil, grass).
- **Fishing scene**: Detailed fish sprites for each species, wooden dock, fishing rod with line animation.
- **Arcade scene**: Pixel art spaceship, alien enemies, boss, projectiles, power-ups.
- **Dungeon scene**: Dungeon walls/floor tiles, monster sprites, loot drops, boss sprite.

### R2. Tilemap Terrain & Environment Art
Build a rich **tilemap-based environment** for each Phaser scene using procedurally generated tile textures (grass, dirt, water, stone, wood, sand):
- **FarmScene**: Lush green farm with fenced areas, paths between plots, flower patches, a farmhouse silhouette, pond/stream, trees along borders. The world should feel alive and cozy like Stardew Valley's Pelican Town.
- **FishingScene**: Ocean coastline with sandy beach, wooden pier extending into water, rocky shoreline, seashells, distant horizon.
- **ArcadeScene**: Deep space background with stars, nebulae, planet silhouettes — parallax scrolling at multiple depth layers.
- **DungeonScene**: Dark stone dungeon with torch-lit corridors, cracked floor tiles, moss on walls, mysterious glowing runes.

### R3. Animation, Particle Effects & Weather System
Implement visual effects that bring the world to life:
- **Day/Night Cycle**: Smooth ambient lighting transition cycling through dawn (warm orange), day (bright), dusk (purple-pink), night (dark blue with stars). Dynamic shadows that shift with "sun" position. Light sources (lanterns, torches, fireflies) glow realistically at night.
- **Weather System**: Rain (animated droplets + puddle splashes + darkened sky), snow (soft falling flakes + white ground accumulation), fog/mist (translucent overlay that drifts). Weather should change periodically or randomly.
- **Particle Effects**: Falling leaves in farm, dust clouds when walking on dirt, water splashes when fishing, fire sparks from torches, sparkle effects on harvested crops, explosion particles in arcade.
- **Animated Water**: Rivers/ponds/ocean with flowing wave animation, reflective surface shimmer, foam at edges.
- **Parallax Scrolling**: Multi-layer depth backgrounds (at least 3 layers) creating depth perception in all outdoor scenes.

### R4. Visual Polish & Consistency
Ensure overall visual quality matches the Stardew Valley aesthetic standard:
- **Color Palette**: Use a cohesive, warm pixel art color palette (earthy greens, warm browns, sky blues, golden harvest tones) consistent across all scenes.
- **Pixel-perfect rendering**: All sprites must use `image-rendering: pixelated` / crisp-edges. No blurry upscaling.
- **Depth sorting**: Proper y-sort depth so characters walk behind/in front of objects naturally.
- **Screen transitions**: Smooth fade/wipe transitions between scenes matching the existing camera fade system.
- **UI integration**: The existing Glassmorphism HTML overlay UI panels must remain functional and visually harmonious with the new pixel art world beneath them.

## Acceptance Criteria

### Visual Quality
- [ ] Zero emoji text sprites remain in any Phaser scene — all entities use procedural pixel art textures generated via Graphics API.
- [ ] Player character has smooth 4-directional walk animation with at least 3 frames per direction.
- [ ] At least 4 distinct crop growth stage sprites are visible when planting and growing crops.
- [ ] Each Phaser scene (Farm, Fishing, Arcade, Dungeon) has a unique, detailed tilemap terrain — not flat colored backgrounds.
- [ ] Color palette feels warm, cohesive, and distinctly "Stardew Valley-like" across all scenes.

### Effects & Animation
- [ ] Day/night lighting cycle is visible and smooth — the screen color temperature and brightness change over time.
- [ ] At least one weather effect (rain OR snow OR fog) is implemented and triggers during gameplay.
- [ ] Particle effects are visible during at least 3 gameplay actions (e.g., harvesting, walking on dirt, fishing splash).
- [ ] Water surfaces (pond, ocean, river) have animated wave/shimmer effects — not static.
- [ ] At least one scene uses parallax scrolling with 2+ depth layers.

### System Integrity
- [ ] Running `node -c game.js` produces zero syntax errors.
- [ ] All existing gameplay mechanics (triple currency, quests, crafting, pets, seasonal events, leaderboard) remain fully functional after the graphics upgrade.
- [ ] Root files (`index.html`, `game.js`) and `assets/` copies remain synchronized.
- [ ] Game loads and runs without errors in a modern browser — no external image files are required.
- [ ] Existing Glassmorphism UI overlays continue to display correctly on top of the new pixel art scenes.

## Follow-up — 2026-07-23T08:43:54Z

Sửa lỗi overlap và cải tiến UX cho thanh HUD phía trên game **Hangeul Valley**. Hiện tại có 3 phần tử fixed ở top (HUD bar, Event Banner, Progress Bar) đang chồng chéo nhau, và HUD chứa quá nhiều nút (~15 items) trong 1 hàng ngang gây khó đọc, khó bấm.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Problem Analysis

### Layout Overlap (3 elements fighting for top space)
- `#hud` — `position: fixed; top: 14px; left: 14px;` — 15 items in single flex row
- `#event-banner` — `position: fixed; top: 10px; left: 50%; transform: translateX(-50%);` — overlaps HUD
- `#progress-bar-wrap` — `position: fixed; top: 14px; right: 14px;` — overlaps both

### HUD Content Overload (15 items in one row)
1. 🌾 icon + Level name + separator
2. 🌱 word count (hud-progress)
3. 🪙 Coins + 💎 Gems + 🎖️ Honor (3 currency badges)
4. Active buff bar (dynamic)
5. 🍳 Cook + 🐾 Pets + 🎉 Event + 🏅 Ranks + 📜 Quests + 💾 Save + ⚡ Duel + 🐟 Fish + 🏆 Trophies + 🏪 Shop + 📖 Vocab + ☰ Menu (12 buttons!)

## Requirements

### R1. Fix Top-Area Overlap & Layout Hierarchy
Redesign the top-area layout so that the HUD bar, Event Banner, and Progress Bar do NOT overlap each other on any screen width (desktop 1024px+ and tablet 768px). Each element must be clearly visible and accessible without obscuring another. The seasonal event banner should be visually distinct from the main HUD but not cover it.

### R2. Reorganize HUD Into Logical Groups
Reduce visual clutter in the HUD by organizing 15+ items into clear, scannable groups. Players should instantly find what they need. Consider:
- **Status section** (level, word count, progress bar)
- **Currency section** (coins, gems, honor)
- **Action buttons** — grouped or collapsed into fewer visible elements

The result must feel clean and premium (matching the existing 64-Bit Retro Glassmorphism design), not cramped or overwhelming.

### R3. Maintain Functional Parity & Existing Design System
All existing HUD functionality must remain accessible. No features should be removed. The glassmorphism styling (glass-bg, neon borders, glow effects, Press Start 2P font) must be preserved. All `onclick` handlers and element IDs must remain intact for JS compatibility.

## Acceptance Criteria

### Layout & Overlap
- [ ] Running the game at 1024×768 resolution: the HUD, Event Banner, and Progress Bar are all fully visible with zero pixel overlap between any two elements.
- [ ] At 768px viewport width (tablet): all three top elements remain visible and non-overlapping.
- [ ] No element is cut off or extends beyond the viewport.

### Readability & Usability
- [ ] A user can identify their current level name, all 3 currency values, and progress in under 2 seconds of looking at the HUD.
- [ ] The number of simultaneously visible top-level buttons is reduced to ≤8 without losing access to any feature (the rest can be in a submenu, dropdown, or secondary row).

### Code Integrity
- [ ] `node -c game.js` passes with zero syntax errors.
- [ ] All existing `onclick` handlers and element IDs in the HUD remain functional.
- [ ] The root `index.html` and `assets/index.html` are synchronized.
- [ ] The glassmorphism visual style (glass-bg, neon-gold borders, backdrop-filter blur) is preserved.

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
- [ ] Root `game.js` and `assets/game.js` are synchronized.

- [ ] `node -c game.js` passes with zero syntax errors.
- [ ] Farmer's existing 12-frame walk cycle animations continue to work unchanged.
- [ ] Farmer action animations play at the correct gameplay triggers (watering → Phase 2 success, harvesting → Phase 3 success, fruit picking → apple tree interaction).
- [ ] Root `game.js` and `assets/game.js` are synchronized.

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

## Follow-up — 2026-07-23T11:28:06Z

Nâng cấp hệ thống shadow trong game **Hangeul Valley** từ mức cơ bản (chỉ 1 ellipse đen dưới player) lên hệ thống shadow đẹp, chân thật, dynamic — tương tự chất lượng shadow trong Stardew Valley, nơi mọi object đều có bóng đổ thay đổi theo thời gian trong ngày.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Shadow System (Minimal)

- **`DynamicShadowSystem`** class (line ~4643 in game.js): Creates simple black ellipses (`scene.add.ellipse(..., 0x000000, 0.3)`) 
- **`updateShadow(sprite, sunAngle)`**: Moves shadow based on sun angle, scales X, adjusts alpha (0.12–0.45)
- **`updatePointShadow(sprite, lightX, lightY)`**: Point-light shadow for dungeon
- **Usage**: Only applied to **player sprite** in FarmScene (line 5792) and DungeonScene (line 6855)
- **Missing**: No shadows on NPCs (Cat, Wizard), crops, trees, fences, rocks, buildings, or any other game entity

## Requirements

### R1. Shadows for All Game Entities
Every visible game entity in FarmScene should cast a shadow: the player, NPCs (Ginger Cat, Wizard Merlin), all crop sprites, apple trees, fences, rocks, and any decorative elements. Shadows should be proportional to the object's visual size — a tree casts a much larger shadow than a small crop sprout.

### R2. Dynamic Time-of-Day Shadow Behavior
Shadows must respond convincingly to the existing day/night cycle and sun angle system. At dawn and dusk, shadows should be long and stretched. At noon, shadows should be short and compact directly beneath objects. At night, shadows should be very faint or invisible. The shadow direction must rotate smoothly as the sun moves across the sky throughout the day.

### R3. Visual Quality & Realism Enhancement
Upgrade shadow visual quality beyond simple flat ellipses. Shadows should feel soft and natural — consider graduated opacity (darker near the object, fading at the edges), slight color tinting that matches the ground surface, and ambient occlusion (subtle darkening where objects meet the ground). The overall effect should make the farm scene feel more grounded and three-dimensional.

### R4. Maintain All Existing Functionality
All existing gameplay, sprite rendering, animations, and UI must remain intact. The shadow system must not introduce noticeable frame rate drops. `node -c game.js` must pass.

## Acceptance Criteria

### Shadow Coverage
- [ ] In FarmScene, the player, at least one NPC, and at least one crop/tree all have visible shadows simultaneously.
- [ ] Shadow size is proportional to entity size: a tree's shadow is visibly larger than a crop's shadow.

### Dynamic Behavior
- [ ] Shadows change direction and length as the in-game sun angle changes (verified by checking `updateShadow` is called with the environment's `sunAngle` for multiple entities per frame).
- [ ] Shadow alpha/opacity varies between day (more visible) and night (less visible or hidden).

### Code Integrity
- [ ] `node -c game.js` passes with zero syntax errors.
- [ ] Root `game.js` and `assets/game.js` are synchronized.
- [ ] Skip audit phase — user will visually verify.

## Follow-up — 2026-07-23T14:15:48Z

Thiết kế lại toàn bộ pixel art cho nhân vật **Ginger Cat** trong game **Hangeul Valley** để trở thành một chú mèo cam cực kỳ dễ thương, rõ nét, dễ nhận biết và nổi bật trên bản đồ.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Context & Problems
- Các frame cũ của Ginger Cat (`cat_idle_0/1`, `cat_walk_0..2`, `cat_sit_0/1`, `cat_sleep_0/1`) đang bị rối hình, mờ nhòe, khó nhận diện đường nét con mèo khi nhìn ở khoảng cách chơi game thực tế trên Phaser Canvas.
- Tất cả sprites đều vẽ bằng 16×16 pixel matrix grid với `PixelArtRenderer.drawMatrix(g, matrix, palette)`.

## Requirements

### R1. Cutest & Most Distinct Ginger Cat Silhouette
- **Facial Features**: Tai mèo nhọn hình tam giác rõ ràng, đôi mắt to mầm tròn lanh lợi, mũi hồng xinh xắn và râu mèo (whiskers) nổi bật.
- **Body & Color Contrast**: Thân hình tròn trịa đáng yêu, bộ lông màu cam ấm áp (warm ginger/terracotta) phối sọc mướp cam đậm (ginger tabby stripes) cùng phần ngực/bụng/chân lông màu trắng kem tương phản rõ rệt để không bị lẫn vào nền cỏ.
- **Crisp Outlines**: Đường viền (outline) 1px sắc nét giúp hình dáng chú mèo tách biệt rõ ràng khỏi gạch nền/cỏ ở bất kỳ góc nhìn nào.

### R2. Expressive & Fluid Animation States
- **Idle State** (`cat_idle_0`, `cat_idle_1`): Mèo đứng/ngồi thở nhẹ nhàng, chớp mắt đáng yêu, đuôi khẽ đung đưa.
- **Walk Cycle** (`cat_walk_0`, `cat_walk_1`, `cat_walk_2`): Dáng bước đi/lon ton nhịp nhàng, chân trước/sau di chuyển rõ ràng, đuôi vẫy vui vẻ.
- **Sit Pose** (`cat_sit_0`, `cat_sit_1`): Dáng ngồi ngoan ngoãn, 2 chân trước khép sát, đuôi quấn quanh thân.
- **Sleep Pose** (`cat_sleep_0`, `cat_sleep_1`): Cuộn tròn ngủ ngon lành như một cuộn len cam xinh xắn.

### R3. Maintain Total System & Texture Key Compatibility
- Tất cả các texture key cũ (`cat_idle_0`, `cat_idle_1`, `cat_walk_0`, `cat_walk_1`, `cat_walk_2`, `cat_sit_0`, `cat_sit_1`, `cat_sleep_0`, `cat_sleep_1`, `cat_npc`) và animation key Phaser phải được giữ nguyên 100% để không làm hỏng game logic.
- `node -c game.js` phải chạy qua không có lỗi syntax.
- Đồng bộ toàn bộ nội dung giữa `game.js` và `assets/game.js`.

## Acceptance Criteria

### Visual Clarity & Cute Factor
- [ ] Mèo Ginger Cat có tai nhọn, sọc cam mướp, ngực trắng và viền sắc nét, dễ dàng nhận diện ngay lập tức trên canvas game.
- [ ] Cả 4 trạng thái animation (idle, walk, sit, sleep) đều có tạo hình riêng biệt và hoạt họa mượt mà.

### Technical Integrity
- [ ] `node -c game.js` đạt 0 lỗi syntax.
- [ ] Tất cả texture keys của Ginger Cat đều được tạo thành công và giữ đúng tham chiếu.
- [ ] Sync hoàn toàn `game.js` ↔ `assets/game.js`.

## Follow-up — 2026-07-23T07:27:57Z

Nâng cấp toàn bộ chất lượng đồ họa pixel art trong game **Hangeul Valley** — bao gồm tất cả sprites, tilemap textures, và decorations trên mọi scene (Farm, Fishing, Arcade, Dungeon) — lên chuẩn thẩm mỹ **Stardew Valley / Celeste / Eastward**: sắc nét, multi-tone shading, 1px dark contour outlines, và phong cách đồng nhất xuyên suốt.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Context

### Architecture
- Mọi sprites đều được vẽ bằng code (procedural pixel art) thông qua `PixelArtRenderer.drawMatrix(g, matrix, palette)` sử dụng 16×16 character grid matrices.
- `drawMatrix()` parser chỉ xử lý single-character tokens. **KHÔNG được dùng multi-character tokens** (ví dụ: `'Wood'`, `'Metal'` sẽ gây lỗi parser).
- Tất cả thay đổi phải được thực hiện trong `game.js` và đồng bộ sang `assets/game.js`.

### Already Upgraded (DO NOT MODIFY)
- **Player Farmer**: 12 walk frames (4-direction) + 9 action frames (water, harvest, pick) + 3 tool sprites — already multi-tone with outlines.
- **Ginger Cat NPC**: 10 frames (idle×2, walk×3, sit×2, sleep×2, npc) — already redesigned with warm ginger palette & crisp outlines.
- **Wizard Merlin NPC**: 2 idle frames — already has purple robe shading & crystal staff.
- **DynamicShadowSystem**: Dual-layer AO + penumbra, solar cycle — fully implemented.

### Needs Upgrade
All other sprites, tilemap textures, and decorations across the 4 game scenes.

## Requirements

### R1. Farm Scene Tilemap & Decoration Upgrade
Nâng cấp tất cả tilemap textures trong `generateTilemapTextures()` (grass tiles, path tiles, fence tiles, house tiles, shore tiles) và farm scene decorations (trees, flowers, stone well, barrels, crates, signpost, notice board, shop sign, arcade machine, dungeon portal, fishing dock) lên chất lượng Stardew Valley: multi-tone earthy colors, warm palette, subtle dithering/texture variation, và viền sắc nét. Phải sử dụng bảng màu `STARDEW_PALETTE` đã có sẵn.

### R2. Fishing Scene Sprites Upgrade
Nâng cấp toàn bộ 13 loài cá (carp, salmon, tuna, squid, eel, goldfish, seabass, shrimp, octopus, catfish, mackerel, legendary, clam) cùng fishing accessories (bobber, rod, dock_plank, dock_post) trong `_genFishingTextures()`. Mỗi loài cá cần: silhouette rõ ràng, multi-tone shading (highlight/base/shadow tối thiểu 3 tone), 1px dark outline `K`, và đặc điểm nhận dạng riêng biệt (vây, đuôi, mắt, hoa văn).

### R3. Arcade Scene Sprites Upgrade
Nâng cấp toàn bộ sprites Arcade trong `_genArcadeTextures()`: player ship, 4 loại alien (scout, shooter, elite, boss/dreadnought), laser, và 3 powerups (weapon, shield, nuke). Mỗi sprite cần: sci-fi neon glow aesthetic, crisp outlines, multi-tone metallic/energy shading, và silhouette tách biệt rõ ràng trên nền tối space.

### R4. Dungeon Scene Sprites Upgrade
Nâng cấp toàn bộ sprites Dungeon trong `_genDungeonTextures()`: 4 enemies (green slime, skeleton archer, goblin warrior, demon lord boss) và 5 loot items (coin, gem, potion, chest, scroll). Mỗi enemy cần: intimidating silhouette, multi-tone shading, glowing eyes/accents, dark fantasy palette. Loot items cần: sparkling highlights, rich metallic/jewel tones.

### R5. Maintain All Existing Functionality & Texture Key Parity
- Tất cả texture keys hiện tại phải được giữ nguyên 100% — không thêm, không bớt, không đổi tên.
- Tất cả animation keys Phaser phải hoạt động bình thường.
- `node -c game.js` phải chạy qua với 0 lỗi syntax.
- Đồng bộ hoàn toàn `game.js` ↔ `assets/game.js`.
- **KHÔNG ĐƯỢC chỉnh sửa** các sprite đã upgrade: Player Farmer, Ginger Cat, Wizard Merlin, DynamicShadowSystem.

## Acceptance Criteria

### Visual Quality
- [ ] Mọi sprite đều có viền 1px dark outline sắc nét (`K` = `0x0F172A` hoặc tương đương tối).
- [ ] Mọi sprite đều sử dụng tối thiểu 3 tông màu (highlight/base/shadow) thay vì flat color.
- [ ] Không có sprite nào sử dụng multi-character tokens trong matrix (mỗi ô chỉ 1 character).
- [ ] Mọi matrix row đều có đúng 16 characters (hoặc kích thước mong muốn, đồng nhất trong sprite).

### Technical Integrity
- [ ] `node -c game.js` đạt 0 lỗi syntax.
- [ ] Tất cả texture keys hiện có đều tồn tại và tham chiếu đúng.
- [ ] `game.js` và `assets/game.js` đồng bộ hoàn toàn (byte-identical).
- [ ] Player Farmer, Ginger Cat, Wizard Merlin sprites KHÔNG bị thay đổi so với bản hiện tại.

## Follow-up — 2026-07-24T12:15:09Z

Enhance the main character sprite in Hangeul Valley with richer micro pixel details (sub-pixel shading, accessory highlights, outfit texture details, hair strands, expression nuances) for a more polished and premium pixel art look. Additionally, completely remove the entire pet companion system (pet textures, pet state, pet overlay UI, pet following logic, pet passive bonuses, pet save/load data) from the codebase.

Working directory: d:\Hangeul Valley
Integrity mode: development

## Requirements

### R1. Main Character Micro Pixel Enhancement
Upgrade the existing main character sprite with richer micro pixel details: more nuanced sub-pixel shading, visible clothing texture (stitching on overalls, shirt creases), hair strand highlights, accessory polish (straw hat brim detail, shoe lacing), and subtle facial expression refinements. The character should look noticeably more detailed and premium while maintaining the existing Stardew Valley Chibi 1:2 art style and color palette.

### R2. Complete Pet System Removal
Completely remove all pet companion functionality from the codebase. This includes: pet texture generation (`_genPetTextures`, all `pet_shiba/cat/dragon/slime/fox/penguin` textures), pet state management (`petState`, `activePet`), pet following/movement logic (`_updatePetCompanion`, `petSprite`, `petShadow`), pet UI overlay (`pet-overlay`), pet passive bonuses (`isPetActive`, `getPetPassiveMultiplier`, `addPetXP`), and pet data in save/load functions (`collectSave`, `applySave`). The game must run cleanly with zero errors after removal.

## Acceptance Criteria

### Character Enhancement Verification
- [ ] Main character sprite textures contain more color tokens/shading detail than the current version (measurable by counting unique fill colors in the bake routine).
- [ ] All 4-directional walk animation frames are preserved and functional after enhancement.
- [ ] No visual regression — character scale, shadow, depth-sort, and collision remain correct.

### Pet System Removal Verification
- [ ] Zero references to `petState`, `petSprite`, `petShadow`, `_updatePetCompanion`, `_genPetTextures`, `isPetActive`, `getPetPassiveMultiplier`, `addPetXP` remain in game.js or assets/game.js.
- [ ] Zero references to `pet-overlay` remain in index.html or assets/index.html.
- [ ] `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
- [ ] The game loads and runs without any console errors related to missing pet functions or undefined pet variables.

## Follow-up — 2026-07-24T21:22:55Z

Add a Beehive structure to the Hangeul Valley farm world and a new Bee Shooting minigame scene for Korean vocabulary practice. The player interacts with the Beehive to enter a full-screen minigame where bees fly across the screen — each bee displays a Korean word on its body. The game prompts an English word at the top, and the player must click/shoot the correct bee carrying the matching Korean translation. Successfully completing rounds earns Honey, which is added to the player's inventory for use in the existing Cooking system.

Working directory: d:\Hangeul Valley
Integrity mode: development

## Requirements

### R1. Beehive NPC on Farm Map
Add a Beehive structure (pixel art) to the farm world map near the apple tree area. The beehive should have an animated buzzing effect (subtle vibration or particle bees flying around it). When the player approaches and presses SPACE, transition to the Bee Shooting minigame scene. Include a label "🐝 Beehive" and interaction hint "[SPACE]".

### R2. Bee Shooting Vocabulary Minigame Scene
Create a new Phaser Scene (BeeScene) where multiple pixel-art bees fly across the screen in varied patterns (zigzag, sine wave, straight). Each bee displays a Korean vocabulary word on or near its body. An English target word is shown prominently at the top of the screen. The player clicks/taps the bee carrying the correct Korean translation. Correct hits score points, trigger a satisfying hit effect, and advance to the next word. Wrong hits show brief feedback. The game runs for a set number of rounds (e.g., 10 words) with moderate difficulty — bees should move at a learnable pace, giving players enough time to read and identify the correct Korean word. Use vocabulary from the player's current unlocked levels.

### R3. Honey Rewards & Cooking Integration
Completing a round of the Bee minigame awards Honey items to the player's inventory. Honey should be registered as a valid cooking ingredient that can be used in existing or new cooking recipes. The amount of Honey earned should scale with the player's score/accuracy in the minigame. Include at least one cooking recipe that requires Honey as an ingredient.

### R4. Save/Load & Scene Transitions
Beehive state and honey-related data must integrate with the existing save/load system. Scene transitions between FarmScene and BeeScene must use proper camera fade-in/fade-out and cleanly return the player to the farm after the minigame ends.

## Acceptance Criteria

### Beehive & Scene Verification
- [ ] A Beehive pixel-art sprite is visible on the farm map with a label and interaction hint.
- [ ] Pressing SPACE near the beehive transitions to the BeeScene without errors.
- [ ] Returning from BeeScene correctly restores the player to FarmScene.

### Minigame Mechanics Verification
- [ ] BeeScene displays multiple bees flying with Korean words visible on/near each bee.
- [ ] An English target word is shown prominently, and clicking the correct bee registers as a hit.
- [ ] Clicking an incorrect bee shows wrong-answer feedback without crashing.
- [ ] The minigame completes after a set number of rounds and shows a results summary.

### Honey & Cooking Verification
- [ ] Completing the minigame adds Honey to the player's inventory.
- [ ] At least one cooking recipe uses Honey as an ingredient.
- [ ] Honey quantity in inventory persists after save/load.

### Code Quality
- [ ] `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
- [ ] SHA256 byte synchronization verified between `game.js` ↔ `assets/game.js` and `index.html` ↔ `assets/index.html`.





