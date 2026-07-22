# Handoff Report — Explorer 3: R3, R4, R5 & 64-Bit Retro Glassmorphism UI Analysis

## 1. Observation

### Codebase & System Inspection
1. **Project Directory Layout**:
   - `game.js` (3,634 lines, 169,935 bytes): Contains Phaser 3 main config and scenes (`FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`), Web Audio synthesizer (`ChiptuneSynthEngine`), global state management (`gold`, `unlockedLevels`, `srsData`, `plotSave`, `harvestCounts`, `fishAlbumSave`), save/load functions (`persistSave()`, `loadSave()`), and overlay UI handlers (`openShop()`, `openVocabBook()`, `openSpellDuel()`, `openMemoryGame()`, `openFishAlbum()`, `openTrophies()`).
   - `index.html` (1,319 lines, 71,692 bytes): Contains 64-bit retro glassmorphism CSS design system (`:root` variables, CRT scanline overlay `#overlay::before`, `.glass-modal`, `.glass-hud`, `.neon-border`, `.pixel-art-detail`), Google Web Fonts (`Be Vietnam Pro`, `Nunito`, `Noto Sans KR`, `Press Start 2P`, `VT323`), and DOM overlay containers (`#level-select-overlay`, `#hud`, `#quiz-backdrop`, `#vocab-overlay`, `#shop-overlay`, `#fish-album-overlay`, `#trophy-overlay`, `#duel-overlay`, `#memory-overlay`, `#vocab-ff-modal`, `#cat-dialog`).
   - `main.py` (127 lines): PyWebView desktop wrapper serving local HTTP server on port 8742 from `BASE_DIR`. Provides `GameSaveAPI` class exposing `window.pywebview.api.save(data)` and `window.pywebview.api.load()` for JSON save persistence to `save_data.json`.
   - `save_data.json` (633 bytes): Persisted save state containing version `v: 3`, `gold`, `unlockedLevels`, `unlockedTrophies`, `harvests`, `srs`, `plots`, `lastLevel`, `apple`, and `fishAlbum`.
   - `assets/`: Contains mirrored copies of `game.js`, `index.html`, and `levels.json`. Currently lacks `save_data.json` and active automated synchronization scripts.

2. **Ingredient Acquisition Mechanics**:
   - **Crops (`FarmScene`)**: 15 farm plot slots (3x5 grid). 5 crop sprite types (`cr_{t}_1`, `cr_{t}_2`, `cr_{t}_3`). Harvesting occurs when crops reach Phase 3 (Ripe `'4'`). Yields gold and harvested word counts recorded in `harvestCounts` Map. Apple Tree (`apple_tree_ripe`) yields apples + gold on a 2-minute regrowth cycle.
   - **Fish (`FishingScene`)**: 8 fish species defined in `FISH_DB`:
     - 연어 (*Salmon*, Common, 🍣)
     - 고등어 (*Mackerel*, Common, 🐟)
     - 오징어 (*Squid*, Rare, 🦑)
     - 잉어 (*Carp*, Rare, 🎏)
     - 새우 (*Shrimp*, Common, 🦐)
     - 문어 (*Octopus*, Epic, 🐙)
     - 조개 (*Clam*, Common, 🐚)
     - 황금물고기 (*Golden Fish*, Legendary, 🌟)
   - Catching mechanism: Sinewave fish motion in a tension bar meter, keep fish in green zone using `SPACE`/click hold, fill catch meter, complete a 4-choice Korean vocabulary quiz to store fish in `fishAlbumSave`.

---

## 2. Logic Chain

### 2.1 Crafting/Cooking System Architecture (R3)
- **Ingredient Acquisition Pipeline**:
  - Crops from `FarmScene`: 배추 (Napa Cabbage), 무 (Radish), 파 (Green Onion), 고추 (Chili), 마늘 (Garlic), 쌀 (Rice), 콩 (Soybean), 당근 (Carrot), 사과 (Apple).
  - Fish from `FishingScene`: 연어, 고등어, 오징어, 잉어, 새우, 문어, 조개, 황금물고기.
  - Store seasonings: 간장 (Soy Sauce), 고추장 (Chili Paste), 된장 (Soybean Paste), 참기름 (Sesame Oil).
- **8+ Korean Recipes Matrix**:
  1. **김치 (Kimchi)**: 배추 + 고추 + 마늘 + 조개 (Salted seafood) → Buff: *Kimchi Power* (+25% Gold from all crop harvests for 5 minutes).
  2. **비빔밥 (Bibimbap)**: 쌀 + 계란 + 채소 + 고추장 → Buff: *Energy Surge* (+30% Player Movement Speed & 20% Auto-Watering chance for 8 minutes).
  3. **불고기 (Bulgogi)**: 고기 + 콩 (Soy sauce) + 파 + 마늘 → Buff: *Warrior's Feast* (+50% Slash Damage in Dungeon & Spell Duel for 10 minutes).
  4. **떡볶이 (Tteokbokki)**: 쌀 + 고추장 + 생선 (Fishcake) + 파 → Buff: *Sticky Precision* (+40% Tension Bar Green Zone Width in Fishing for 6 minutes).
  5. **삼겹살 (Samgyeopsal)**: 고기 + 마늘 + 채소 + 된장 → Buff: *Iron Heart* (+50 Max HP & +5 HP/sec Auto-Regen in Dungeon for 10 minutes).
  6. **삼계탕 (Samgyetang)**: 닭고기 + 인삼 + 마늘 + 쌀 → Buff: *Scholar's Stamina* (+100% Quiz XP & Pet Happiness decay frozen for 12 minutes).
  7. **해물파전 (Haemul Pajeon)**: 파 + 오징어 + 새우 + 계란 → Buff: *Seafood Magnet* (+100% Rare/Epic Fish Spawn Rate for 7 minutes).
  8. **잡채 (Japchae)**: 당근 + 버섯 + 고기 + 콩 → Buff: *Harvest Harmony* (+20% Double Crop Harvest Chance for 8 minutes).
  9. **김밥 (Kimbap)**: 쌀 + 김 + 계란 + 당근 → Buff: *Quick Snack* (Restores 30 Pet Happiness & +10% Speed for 5 minutes).
- **Timed Input Minigame**:
  - 3-stage cooking process:
    1. *Preparation (Chopping)*: Rhythm key press (WASD / Arrow prompts matching beat indicator).
    2. *Simmering / Frying*: Heat gauge slider maintenance (keep indicator inside green temperature zone).
    3. *Garnishing*: Precision timing click/space release.
  - Grades: **S Grade** (+100% Buff Duration & 2x Dish Yield), **A Grade** (+50% Buff Duration), **B Grade** (Standard Buff), **F Grade** (Burnt Dish, minor gold fallback).
- **Cultural Overlay Modal**:
  - Displays Hansik (한식) history, UNESCO intangible cultural heritage notes (e.g. Kimjang 김장 culture), ingredient regional origins, and linguistic etymology upon successful dish creation.

### 2.2 Pet Companion System Architecture (R4)
- **5 Pet Species & Passives**:
  1. **개 (Dog / 댕댕이)**: *Passive: Gold Sniffer* (+15% Extra Gold drops across all activities; scales to +35% at Level 5).
  2. **고양이 (Cat / 야옹이)**: *Passive: Feline Nunchi* (Automatically reveals 1 Free Hint in Quizzes without spending Gold).
  3. **토끼 (Rabbit / 토끼)**: *Passive: Rapid Hop* (Reduces crop SRS growth timers by 20%; scales to 40% at Level 5).
  4. **햄스터 (Hamster / 햄토리)**: *Passive: Pouch Duplicator* (15% chance to duplicate harvested crops & seeds).
  5. **앵무새 (Parrot / 앵무)**: *Passive: Echo Scholar* (+50% Bonus XP on correct quiz answer streaks).
- **Happiness & Decay Mechanics**:
  - Happiness meter (0 to 100%). Decays at -5% every 5 minutes of active gameplay.
  - At Happiness > 70%: Full passive bonus active.
  - At Happiness 30% - 70%: Passive bonus reduced to 50%.
  - At Happiness < 30%: Pet becomes sad (😿) and passive bonus is deactivated until fed.
  - Feeding: Feed crafted Korean dishes or raw ingredients to restore +40% to +100% Happiness.
- **XP Leveling & Korean Vocab Quizzes**:
  - Pets gain XP whenever the player completes quizzes in FarmScene, Spell Duel, or Pet Training Mode.
  - Leveling curve: Level 1 (0 XP) → Level 2 (100 XP) → Level 3 (300 XP) → Level 4 (600 XP) → Level 5 (1000 XP Max).
  - Unlocks pet titles, golden glowing aura, and increased passive effectiveness.

### 2.3 Seasonal Events & Local Leaderboard UI (R5)
- **Seasonal Events**:
  - **Chuseok (추석 - Harvest Festival)**:
    - Special crops: 밤 (Chestnut), 대추 (Jujube). Special Recipe: 송편 (Songpyeon).
    - Event Quest: "Craft 5 Songpyeon & Harvest 20 Crops" → Rewards: Chuseok Moon Frame HUD & +50% Gold Boost.
  - **Seollal (설날 - Lunar New Year)**:
    - Special items: 떡국떡 (Rice Cake Slices), 복주머니 (Lucky Pouch). Special Minigame: Sebae (세배) Bowing & Yut Nori.
    - Event Quest: "Cook 3 Tteokguk & Complete 10 Quizzes" → Rewards: Hanbok Character Skin & 200 Gold.
  - **Children's Day (어린이날 - May 5th)**:
    - Special items: 솜사탕 (Cotton Candy), 달고나 (Dalgona). Special Minigame: Dalgona Carving.
    - Event Quest: "Raise any Pet to Level 3" → Rewards: Rainbow Balloon Aura & 2x Pet XP.
- **Local Leaderboard UI**:
  - Saved in `save_data.json` (`leaderboard` key). Fully offline compatible.
  - Tabs: High Scores (Total Gold), Fast Cooking Times (Minigame Speedrun), Fishing Master (Most Fish Caught), Vocab Scholar (Total Quiz Streak).
  - Displays top 10 local entries with custom player nicknames, rank badges (🥇🥈🥉), timestamps, and 64-bit neon styling.

### 2.4 64-Bit Retro Glassmorphism UI Mapping (`index.html`)
- Design System Classes:
  - Base Glass Container: `.glass-modal`, `.glass-hud`
  - Neon Accent Borders: `.neon-border-cyan`, `.neon-border-gold`, `.neon-border-purple`, `.neon-border-pink`, `.neon-border-green`
  - Retro Details: `.pixel-art-detail`, `.crt-scanlines`
- New DOM Structures to Integrate into `index.html`:
  1. **Quest Log Modal** (`#quest-overlay` / `.glass-modal`): Daily, Seasonal, and Pet Quests with progress bars and claim buttons.
  2. **Recipe Book Modal** (`#recipe-overlay` / `.glass-modal`): Grid of 9 Korean dishes with ingredient checklist, dish stats, and "Cook Dish" button.
  3. **Cooking Minigame Overlay** (`#cooking-overlay` / `.glass-modal`): Interactive cooking station with rhythm prompts, temperature meter, and dish result display.
  4. **Pet Panel Modal** (`#pet-overlay` / `.glass-modal`): Pet selection carousel, happiness meter, XP progress bar, feed inventory slot, and passive ability status.
  5. **Leaderboard Modal** (`#leaderboard-overlay` / `.glass-modal`): Tabbed high-score tables, rank badges, local record input.
  6. **Seasonal Event Banner** (`#event-banner` / `.glass-hud`): Top HUD banner displaying active festival name, countdown timer, and quick quest access button.

### 2.5 File Mirroring & Synchronization Requirements
- Root files (`index.html`, `game.js`, `levels.json`, `save_data.json`) vs `assets/` copies (`assets/index.html`, `assets/game.js`, `assets/levels.json`, `assets/save_data.json`):
  - **Issue Identified**: Currently `assets/` has copies of `index.html`, `game.js`, `levels.json` but they are not automatically synced upon edits to root files, creating potential version mismatch if static wrappers or bundlers serve from `assets/`.
  - **Sync Requirement**:
    1. Create an automated synchronization script `sync_assets.py` or npm/bat script.
    2. Mirror all changes in root `index.html`, `game.js`, `levels.json`, `save_data.json` directly into `assets/`.
    3. Ensure `main.py` asset path definitions are consistent across environments.

---

## 3. Caveats
- Read-only constraint: Explorer 3 performs analysis and architectural synthesis. Implementation will be executed by Implementer subagents.
- Performance: Multi-overlay DOM elements with backdrop blurs (`backdrop-filter: blur(16px)`) must be hidden (`display: none`) when inactive to prevent GPU compositor overhead in PyWebView.
- Audio: SFX calls for cooking and pet interactions should utilize `ChiptuneSynthEngine` to maintain zero external asset dependencies.

---

## 4. Conclusion
The proposed architecture seamlessly integrates Crafting/Cooking (R3), Pet Companions (R4), Seasonal Events & Leaderboards (R5), and 64-Bit Retro Glassmorphism UI into `game.js` and `index.html` while maintaining 100% offline desktop playability via `main.py` PyWebView.

---

## 5. Verification Method

### Step-by-Step Verification Instructions:
1. **File Integrity Verification**:
   - Inspect `index.html` to confirm presence of modal overlay containers: `#quest-overlay`, `#recipe-overlay`, `#cooking-overlay`, `#pet-overlay`, `#leaderboard-overlay`, `#event-banner`.
   - Inspect `game.js` to confirm functions: `openRecipeBook()`, `startCookingMinigame()`, `openPetPanel()`, `feedPet()`, `openLeaderboard()`, `checkSeasonalEvents()`.
2. **Sync Verification**:
   - Run a hash comparison between root files and `assets/` files:
     ```cmd
     fc /b "C:\VibeCode\Hangeul Valley\index.html" "C:\VibeCode\Hangeul Valley\assets\index.html"
     fc /b "C:\VibeCode\Hangeul Valley\game.js" "C:\VibeCode\Hangeul Valley\assets\game.js"
     fc /b "C:\VibeCode\Hangeul Valley\levels.json" "C:\VibeCode\Hangeul Valley\assets\levels.json"
     ```
3. **Execution Verification**:
   - Launch application via `run.bat` or `python main.py` and test UI modal opening, crop/fish ingredient collection, recipe cooking minigame, pet feeding, and leaderboard recording.
