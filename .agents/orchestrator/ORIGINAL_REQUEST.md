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
- [x] Giao diện HUD và các bảng Modal (Shop, Vocab, Quiz, Fish Album) đạt phong cách 64-Bit Retro Glassmorphism hiện đại, không bị tràn màn hình.
- [x] Mọi thao tác bấm nút, trồng cây, thu hoạch, giật cá, chém quái đều phát ra âm thanh Web Audio API 64-bit sống động.
- [x] Chuyển cảnh mượt mà giữa các Phân cảnh Phaser mà không bị giật lag hay treo màn hình.
- [x] Lệnh kiểm tra cú pháp `node -c game.js` vượt qua thành công 100% không có lỗi.

## Follow-up Request — 2026-07-22T16:56:54Z

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

## System Integrity & Acceptance Criteria
- [ ] `node -c game.js` passes cleanly with 0 syntax errors.
- [ ] Save system persistence & backward compatibility preserved (existing saves upgrade gracefully).
- [ ] UI panels styled in 64-Bit Retro Glassmorphism (`.glass-modal`, `.glass-hud`, `.neon-border`, `.pixel-art-detail`).
- [ ] Sync `assets/` mirror copy with root files (`index.html`, `game.js`, `levels.json`, `save_data.json`).
