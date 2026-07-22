# Project: Hangeul Valley Gameplay Mechanics & Economy Upgrade

## Architecture
- **Game Engine**: HTML5 + JavaScript (Phaser 3 / Canvas / DOM Hybrid)
- **Target Files**: `index.html`, `game.js`, `levels.json`, `save_data.json`, `assets/` (mirror copy)
- **Requirements Scope**:
  - **R1: Triple Currency Economy & Rebalanced Sinks**: Coins (동전), Gems (보석), Honor (명예). Rebalanced pricing & rewards across farming, fishing, dungeon, arcade, duel, memory match. Diminishing returns & non-convertible currency loops.
  - **R2: Korean-Gated Progression & Quest System**: Hard locks for zone unlocks, shop item quiz gates, boss attempt quiz gates. Main storyline quest chain + daily/weekly side quests guiding vocabulary themes.
  - **R3: Crafting/Cooking System with Korean Culture**: Recipe Book (요리책) with 8+ Korean recipes (김치, 비빔밥, 불고기, 떡볶이, 삼겹살, etc.), Korean ingredient names, cooking minigame, temporary gameplay buffs, cultural facts.
  - **R4: Pet Companion System**: 5+ collectible pets (강아지/Dog, 고양이/Cat, 토끼/Rabbit, 햄스터/Hamster, 앵무새/Parrot) with passive abilities, Gem/quest acquisition, XP leveling via vocabulary quizzes, happiness meter & dish feeding.
  - **R5: Seasonal Events & Leaderboard System**: Seasonal event framework (Chuseok, Seollal, Children's Day) with limited quests & exclusive rewards. Local leaderboard UI panel tracking vocabulary mastered, Honor, cooking tier, pet completion.
  - **System Integrity**: `node -c game.js` 100% clean, save system persistence & backward compatibility, 64-Bit Retro Glassmorphism UI styling, `assets/` mirror copy synchronization.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Deep Codebase & Save Schema Exploration | Analyze `game.js`, `index.html`, `save_data.json`, `levels.json`, mapping economy systems & UI hooks | None | DONE |
| M2 | R1 Triple Economy & R2 Progression & Quests | Implementation of triple currency, sinks, SRS hard-lock zone/shop/boss gates, Quest System & Quest Log UI | M1 | DONE |
| M3 | R3 Crafting/Cooking & R4 Pet Companion System | Implementation of Recipe Book, Cooking Minigame, Buffs, 5 Pets, Pet Leveling Quizzes, Happiness & Feeding UI | M2 | DONE |
| M4 | R5 Seasonal Events, Leaderboard & Asset Mirror Sync | Implementation of Seasonal Events, Local Leaderboard UI, Save Data Backward Compatibility, Sync `assets/` mirror | M3 | DONE |
| M5 | Full Verification, Syntax Check & Forensic Audit | Verification via `node -c game.js`, Reviewer code analysis, Challenger stress tests, Forensic Auditor integrity verdict | M4 | DONE |

## Interface Contracts
### Economy & Currency Interface
- `playerData.currencies`: `{ coins: number, gems: number, honor: number }`
- `addCoins(amount, source)`, `addGems(amount, source)`, `addHonor(amount, source)`
- Sinks & Cooldowns: anti-farming diminishing return timers.

### Progression & Quest Interface
- `playerData.quests`: `{ main: [...], daily: [...], weekly: [...] }`
- `playerData.zoneGates`: `{ farm2: boolean, fishing2: boolean, dungeon2: boolean, arcade2: boolean }`
- `checkQuizGate(requirementType, targetId, callback)`

### Crafting & Pet System Interface
- `playerData.recipes`: array of unlocked recipe IDs
- `playerData.inventory`: ingredient count dictionary using Korean names
- `playerData.activeBuffs`: temporary buff timers & multipliers
- `playerData.pets`: array of pet objects `{ id, name, level, happiness, xp, active }`

### Leaderboard & Event Interface
- `playerData.leaderboard`: array of local high score records
- `playerData.activeEvent`: current seasonal event status

## Code Layout
- `game.js`: Core Phaser 3 scenes, player state, economy logic, quiz gates, quest manager, crafting minigame logic, pet behavior, leaderboard & event logic.
- `index.html`: DOM overlays, 64-Bit Retro Glassmorphism CSS styles & modal structures for Quest Log, Recipe Book, Cooking Minigame, Pet Panel, Leaderboard, Seasonal Event Banner.
- `levels.json`: Vocabulary data grouped by themed levels.
- `save_data.json`: Player persistence state & default save template.
- `assets/`: Mirror copy of root files (`index.html`, `game.js`, `levels.json`, `save_data.json`).
