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

## Follow-up — 2026-07-24T01:50:44Z

Revamp hệ thống VOCAB_FACTS trong game **Hangeul Valley**: thay thế phần "Korean Culture" (fun facts) bằng **giải thích chi tiết về từ vựng** (nguồn gốc, cấu trúc, ngữ cảnh) và xây lại phần "Recall Hint" với **phân tích âm tiết + hình ảnh liên tưởng + câu ví dụ**. Tạo data cho **toàn bộ ~1,500 từ** trong `levels.json`.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Context

### Current System
- File `game.js` chứa object `VOCAB_FACTS` (line ~4822) với ~35 entries hardcoded dạng:
```js
const VOCAB_FACTS = {
  'water': {
    vi: '💧 Koreans almost never drink cold water...', // "Korean Culture" fun fact
    ko: '🧠 1 syllable, sounds like "mull"...'         // "Recall Hint" mnemonic
  },
  ...
};
```
- Hàm `getFunFact(word)` (line ~4904) lookup theo `word.en.toLowerCase()` → nếu không có trong VOCAB_FACTS thì dùng fallback generic dựa trên syllable count và category.
- Hiện tại chỉ 35/1500 từ có data riêng (2.3%). 97.7% từ dùng fallback chung chung.
- Data hiển thị ở: Cat NPC dialog, Phase 3 quiz hints, Vocab card modal, Quiz hint reveal.

### Data Source
- `levels.json` chứa 25 levels × 60 words = 1,500 từ. Mỗi từ có: `{ ko, en, hint, category }`.
- VOCAB_FACTS key = `word.en.toLowerCase()`.

### Problem
1. **"Korean Culture" (trường `vi`)**: Hiện tại là fun facts hời hợt, không giúp người học hiểu sâu về từ vựng. User muốn thay bằng **giải thích chi tiết về từ vựng**.
2. **"Recall Hint" (trường `ko`)**: Hiện tại quá chung chung ("1 syllable — say it once!"), không tạo ấn tượng ghi nhớ. User muốn xây lại hoàn toàn.

## Requirements

### R1. Thay thế "Korean Culture" bằng giải thích từ vựng chi tiết (trường `vi`)
Cho **mỗi từ trong 1,500 từ** của `levels.json`, tạo nội dung giải thích từ vựng chi tiết bằng tiếng Anh cho trường `vi`, bao gồm:
- **Nguồn gốc từ**: Phân loại rõ (từ Hán-Hàn 한자어, từ thuần Hàn 고유어, từ ngoại lai 외래어) và giải thích gốc Hán tự nếu có (ví dụ: 학교 = 學校 = learn + school)
- **Cách dùng trong câu**: Ít nhất 1 câu ví dụ tiếng Hàn ngắn + dịch tiếng Anh
- **Ngữ cảnh thường gặp**: Từ này hay gặp ở đâu (K-drama, TOPIK, daily life, formal/informal)

### R2. Xây lại hoàn toàn "Recall Hint" (trường `ko`)
Cho **mỗi từ trong 1,500 từ**, tạo nội dung recall hint mới bằng tiếng Anh cho trường `ko`, kết hợp:
- **Phân tích âm tiết**: Tách từ thành từng âm tiết Hangul và romanize rõ ràng
- **Hình ảnh liên tưởng**: Tạo mnemonic device sáng tạo gắn âm Hàn với hình ảnh/cảm xúc dễ nhớ
- **Câu ví dụ ngắn**: 1 câu Hàn siêu ngắn (3-5 từ) minh họa cách dùng + romanization

### R3. Giữ nguyên cấu trúc code và tương thích 100%
- VOCAB_FACTS phải giữ nguyên format: object keyed by `word.en.toLowerCase()`, value = `{ vi: string, ko: string }`.
- `getFunFact(word)` phải vẫn hoạt động đúng logic lookup.
- `node -c game.js` phải pass syntax check.
- File `game.js` và `assets/game.js` phải đồng bộ hoàn toàn.
- **KHÔNG ĐƯỢC** chỉnh sửa bất kỳ code nào khác ngoài object `VOCAB_FACTS` và hàm `getFunFact` fallback.

### R4. Nâng cấp fallback trong getFunFact
Cải thiện fallback trong `getFunFact()` cho trường hợp từ không có trong VOCAB_FACTS (nếu có). Fallback nên thông minh hơn: ít nhất phải romanize `word.ko` và phân tích số âm tiết Hangul chính xác (không đếm ký tự raw).

## Acceptance Criteria

### Coverage
- [ ] VOCAB_FACTS có entries cho **≥ 1,400 từ** (≥93% coverage của 1,500 từ trong levels.json)
- [ ] Mỗi entry có cả 2 trường `vi` (giải thích từ vựng) và `ko` (recall hint), không rỗng
- [ ] Trường `vi` chứa ít nhất 1 câu ví dụ tiếng Hàn cho mỗi từ
- [ ] Trường `ko` chứa romanization cho mỗi từ

### Content Quality
- [ ] Trường `vi` có phân loại nguồn gốc từ (한자어/고유어/외래어) cho ≥80% entries
- [ ] Trường `ko` có mnemonic device (không chỉ là "say it X times" generic)
- [ ] Không có entry nào copy nguyên văn từ bộ 35 entries cũ mà không cải thiện

### Technical Integrity
- [ ] `node -c game.js` pass (0 lỗi syntax)
- [ ] Tất cả keys trong VOCAB_FACTS match với `word.en.toLowerCase()` từ levels.json
- [ ] `game.js` và `assets/game.js` đồng bộ hoàn toàn
- [ ] getFunFact(word) trả về object có cả `vi` và `ko` cho mọi input

## Follow-up — 2026-07-24T03:56:23Z

Nâng cấp khu vực **Fishing Dock** trong game **Hangeul Valley**: cải thiện đồ họa pixel art cho dock sprite, di chuyển vị trí dock + Crystal Pond sang **bên trái bản đồ** (hiện tại đang ở phía dưới farm), và thêm hiệu ứng **cá nhảy trên hồ** (ambient fish jumping animation).

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Context

### Current Fishing Dock System
- **Vị trí hiện tại**: Dock nằm ở **phía dưới farm** (center-bottom). Code tính position:
  ```js
  // _createFishingSpot() — line ~7722
  const fx = this.farm.x + this.farm.w / 2;     // center horizontally
  const fy = this.farm.y + this.farm.h + 165;    // below farm
  ```
- **Crystal Pond**: Ellipse (240×70px) màu xanh nước `0x0284C7`, có tween breathing.
- **Dock Sprite**: Texture `'fishing_dock'` — ma trận 24×16 characters, DECOR_PALETTE, scale 1.5, tween bobbing nhẹ.
- **Interaction**: Nhấn SPACE khi gần dock → mở Fishing Scene. Collision check dựa trên `this.fishX`, `this.fishY`.
- **Splash Effect**: Đã có particle `'p_splash'` dùng cho fishing minigame, nhưng **CHƯA có hiệu ứng cá nhảy ambient** trên pond ở Farm scene.

### Key Files
- `game.js` (line ~7229-7249): Dock texture generation
- `game.js` (line ~7720-7750): `_createFishingSpot()` — placement & pond rendering
- `game.js` (line ~8290-8300): Dock interaction proximity check
- `game.js` + `assets/game.js` phải sync

### Architecture Constraints
- Mọi sprites dùng `PixelArtRenderer.drawMatrix()` với single-character tokens
- `DECOR_PALETTE` chứa các màu dùng cho decorations
- `DynamicShadowSystem` cần `createShadow()` cho mọi entity mới
- Texture key `'fishing_dock'` phải giữ nguyên tên

## Requirements

### R1. Nâng cấp đồ họa Fishing Dock
Redesign sprite `'fishing_dock'` pixel art matrix với chất lượng cao hơn: cấu trúc cầu tàu gỗ rõ ràng hơn (ván gỗ ngang, cọc chống, lan can, đèn lồng hoặc dây thừng), multi-tone shading cho gỗ, và 1px dark outline. Kích thước có thể tăng hợp lý nếu cần nhưng phải giữ texture key `'fishing_dock'`.

### R2. Di chuyển Fishing Dock + Crystal Pond sang bên trái bản đồ
Thay đổi vị trí Fishing Dock và Crystal Pond trong `_createFishingSpot()` từ phía dưới farm sang **bên trái farm**. Cần đảm bảo:
- Không che khuất các decoration/NPC khác (apple tree, shop, etc.)
- Interaction proximity check vẫn hoạt động đúng
- Player có thể di chuyển đến vị trí mới mà không bị stuck
- Shadow system vẫn render đúng cho dock ở vị trí mới

### R3. Thêm hiệu ứng cá nhảy ambient trên Crystal Pond
Tạo hiệu ứng cá nhảy lên khỏi mặt nước trên Crystal Pond ở Farm scene — hiệu ứng ambient xảy ra ngẫu nhiên (không cần người chơi tương tác). Cá nhảy lên rồi rơi xuống tạo splash nhỏ, xuất hiện random vị trí trên pond với khoảng cách thời gian ngẫu nhiên.

### R4. Giữ nguyên tất cả chức năng hiện có
- Fishing interaction (SPACE to enter Fishing Scene) vẫn hoạt động
- Tất cả texture keys giữ nguyên
- `node -c game.js` pass syntax
- `game.js` và `assets/game.js` đồng bộ hoàn toàn
- KHÔNG chỉnh sửa code ngoài phạm vi fishing dock / pond

## Acceptance Criteria

### Visual
- [ ] Dock sprite mới có ≥ 3 tone màu gỗ (không flat color)
- [ ] Dock sprite mới có 1px dark outline
- [ ] Crystal Pond có hiệu ứng cá nhảy visible (animation arc lên-xuống)
- [ ] Cá nhảy có splash effect khi rơi xuống nước

### Position
- [ ] Fishing Dock + Pond nằm ở **bên trái** farm (fx < farm.x)
- [ ] Dock không overlap với apple tree, shop sign, hoặc các decoration khác
- [ ] Player có thể walk đến dock từ farm area

### Functionality
- [ ] Nhấn SPACE gần dock vẫn mở Fishing Scene đúng
- [ ] Cá nhảy ambient xảy ra tự động mỗi vài giây (không cần player input)
- [ ] `node -c game.js` pass (0 lỗi syntax)
- [ ] `game.js` và `assets/game.js` đồng bộ hoàn toàn

## Follow-up — 2026-07-24T07:59:14Z

**Xóa bỏ hoàn toàn** sprite nhân vật chính hiện tại và **vẽ lại từ đầu** theo phong cách **Stardew Valley**. Nhân vật hiện tại vẫn xấu sau lần redesign trước — lần này phải đạt chất lượng ngang tầm Stardew Valley: chibi proportions rõ ràng, warm earthy palette, rich shading, 1px dark outlines, clothing layers detail, và facial expressions nhìn được dù ở pixel size nhỏ.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Stardew Valley Art Style Reference

Phân tích kỹ từ game Stardew Valley — các đặc điểm PHẢI bắt chước:

### Body Proportions (Chibi Style)
- **Head chiếm ~40% chiều cao** nhân vật (row 1-6 trên 16 rows) — đầu tròn, rộng
- **Body compact** (row 7-11) — thân ngắn, vai rộng, tay ngắn cute
- **Legs ngắn** (row 12-16) — chân ngắn mập, boots rõ ràng
- **Tổng thể**: nhân vật trông "mũm mĩm" dễ thương, KHÔNG gầy hay dài

### Color & Shading (Warm Earthy Tones)
- **Palette ấm áp**: tông nâu, cam, vàng, xanh denim — KHÔNG lạnh hay xám
- **Mỗi vùng có 3-4 tones**: base + highlight (sáng hơn) + shadow (tối hơn) + deep shadow
- **Skin**: peach/tan base + bright highlight ở trán/má + warm shadow ở cằm/cổ
- **Hair**: 3 tones brown rõ ràng + bright highlight strand
- **Clothing**: denim overalls với highlight ở vai + shadow ở nếp gấp
- **1px dark outline** (`0x1A1A2E` hoặc tối tương tự) BAO QUANH toàn bộ silhouette

### Facial Features (CRITICAL — điểm yếu lần trước)
- **2 mắt rõ ràng**: mỗi mắt = 1px pupil (dark) + 1px white/highlight, đặt cách nhau ~4px
- **Tóc mái che 1 phần trán** nhưng KHÔNG che mắt
- **Skin tone khuôn mặt** phải fill đủ diện tích (~3 rows × 6-8 cols) để nhìn thấy biểu cảm
- Front view: 2 mắt + miệng/blush optional
- Side view: 1 mắt visible + profile mũi 1px nhô ra

### Walk Animation (Smooth & Bouncy)
- **Frame 0** (idle): đứng thẳng, 2 chân cạnh nhau
- **Frame 1** (left step): chân trái bước ra trước, tay phải swing tới, body hơi nghiêng
- **Frame 2** (right step): chân phải bước ra trước, tay trái swing tới, body hơi nghiêng ngược
- SDV đặc trưng: nhân vật **bounce nhẹ** (body shift lên 1px ở mid-stride)
- Sự khác biệt giữa 3 frames phải **RẤT RÕ** ở chân + tay, không chỉ khác 1-2 pixel

## Context

### Current System (KHÔNG thay đổi)
- Method: `_genPlayerTextures(scene)` — line ~1294 trong `game.js`
- Mỗi frame = ma trận 16×16 characters  
- Palette object `P` (có thể THAY THẾ HOÀN TOÀN — user nói xóa bỏ phiên bản hiện tại)
- Texture keys: `player_walk_down_0..2`, `player_walk_up_0..2`, etc.
- Animations: `player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`
- Action frames: `player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`
- Tool sprites: `tool_watering_can`, `tool_basket`, `tool_sickle`
- Legacy aliases: `farmer0..3`
- Player scale = 1.8x

### Architecture Constraints
- Ma trận PHẢI 16×16 characters
- Single-character tokens, `.` = transparent
- `PixelArtRenderer.drawMatrix()` renders sprites
- Texture keys PHẢI giữ nguyên tên
- Animation registration PHẢI giữ nguyên

## Requirements

### R1. Xóa bỏ hoàn toàn palette và sprites hiện tại, vẽ lại từ đầu theo phong cách Stardew Valley
Thiết kế lại palette `P` hoàn toàn mới phù hợp phong cách Stardew Valley (warm earthy tones), và vẽ lại tất cả 12 walk cycle frames (4 hướng × 3 poses) từ đầu. Character design: farmer nam trẻ với mũ rơm, áo overalls xanh denim, boots nâu — theo đúng chibi proportions của Stardew Valley.

### R2. Vẽ lại 9 action frames + 3 tool sprites theo style mới
Tương tự R1, vẽ lại toàn bộ 9 action frames (watering/harvest/pick) và 3 tool sprites cho consistent với style SDV mới.

### R3. Giữ nguyên tương thích hệ thống
- Tất cả ma trận đúng 16×16
- Tất cả texture keys giữ nguyên tên
- Legacy farmer0..3 aliases vẫn hoạt động
- Animation registration không thay đổi
- `node -c game.js` pass
- `game.js` và `assets/game.js` đồng bộ hoàn toàn

## Acceptance Criteria

### Stardew Valley Art Quality
- [ ] Palette `P` hoàn toàn mới (≥30 tokens) với warm earthy tones — KHÔNG còn token palette cũ nếu không cần
- [ ] Mỗi walk down frame: khuôn mặt chiếm ≥ 3 rows cao × 6 columns rộng (visible facial area)
- [ ] Mỗi walk down frame: 2 mắt riêng biệt visible (mỗi mắt ≥ 1px pupil + 1px white)
- [ ] Head chiếm ≥ 35% tổng chiều cao sprite (≥ 5.5 rows trên 16)
- [ ] Mỗi hướng walk: 3 frames khác biệt ≥ 8 pixels ở phần chân + tay (không gần giống nhau)
- [ ] 1px dark outline token bao quanh silhouette nhân vật (viền ngoài cùng)
- [ ] Skin area có ≥ 3 distinct tones (base + highlight + shadow)
- [ ] Clothing area có ≥ 3 distinct tones (base + highlight + shadow)

### Consistency
- [ ] Character design nhất quán qua tất cả 24 frames
- [ ] Action frames cùng style với walk frames
- [ ] Tool sprites detail tương đương

### Technical Integrity
- [ ] Tất cả 24 ma trận đều đúng 16×16 characters (mỗi row đúng 16 chars)
- [ ] `node -c game.js` pass (0 lỗi syntax)
- [ ] `game.js` và `assets/game.js` đồng bộ hoàn toàn
- [ ] Legacy farmer0..3 textures vẫn được tạo đúng

