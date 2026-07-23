# Original User Request

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


