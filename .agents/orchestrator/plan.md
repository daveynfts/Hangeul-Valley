# Execution Plan: Hangeul Valley Gameplay Mechanics & Economy Upgrade

## Objective
Implement R1 through R5 gameplay mechanics, triple currency economy, Korean-gated progression & quest system, crafting/cooking system, pet companion system, seasonal events & leaderboard system, preserving system integrity and backward compatibility.

## Execution Strategy

### Phase 1: Milestone 1 - Deep Codebase & Save Schema Exploration
- Dispatch 3 Explorers:
  - **Explorer 1**: Analyze `game.js` economy hooks, Gold spending/earning across scenes, shop system, diminishing return functions, and existing save/load logic in `save_data.json` & pywebview interface.
  - **Explorer 2**: Analyze progression system (zones, level select, SRS vocabulary tracking), quiz modals, boss encounter triggers, and UI layout in `index.html` & `game.js`.
  - **Explorer 3**: Analyze ingredient drop points (farming crops, fishing catches), item system, and existing modal styles to plan 64-Bit Retro Glassmorphism UI additions for Quest Log, Recipe Book, Cooking Minigame, Pet Panel, Leaderboard, Event Banner.
- Synthesize findings into `context.md`.

### Phase 2: Milestone 2 - R1 Triple Economy & R2 Progression & Quests
- Dispatch **Worker 1**:
  - Refactor Gold system into Coins (동전), Gems (보석), Honor (명예).
  - Add rebalanced sinks, diminishing returns, non-convertible currency loops.
  - Implement Hard Lock progression: zone unlock quiz checks, shop item quiz checks, boss attempt quiz checks.
  - Implement Quest System: Main storyline + Daily/Weekly side quests guiding through vocabulary themes.
  - Implement Quest Log UI modal in 64-Bit Retro Glassmorphism.
- Verification Gate:
  - **Reviewer 1** & **Reviewer 2**: Verify code correctness, economy balance, SRS gating logic, UI aesthetics.
  - **Challenger 1** & **Challenger 2**: Run syntax validation (`node -c game.js`), currency transactions, quiz gate flow.
  - **Forensic Auditor**: Run integrity checks.

### Phase 3: Milestone 3 - R3 Crafting/Cooking & R4 Pet Companion System
- Dispatch **Worker 2**:
  - Implement Recipe Book (요리책) with 8+ Korean recipes (김치, 비빔밥, 불고기, 떡볶이, 삼겹살, etc.), Korean ingredient names.
  - Implement Cooking Minigame (timed input selecting Korean ingredient names) + temporary gameplay buffs + cultural facts overlay.
  - Implement 5+ Pets (Dog, Cat, Rabbit, Hamster, Parrot) with passive abilities, XP leveling via Korean quizzes, happiness meter & dish feeding.
  - Implement Recipe Book, Cooking Minigame, and Pet Panel UI modals in 64-Bit Retro Glassmorphism.
- Verification Gate:
  - **Reviewers**, **Challengers**, **Forensic Auditor** verification.

### Phase 4: Milestone 4 - R5 Seasonal Events, Leaderboard & Asset Mirror Sync
- Dispatch **Worker 3**:
  - Implement Seasonal Event framework (Chuseok, Seollal, Children's Day) with limited quests, exclusive recipes/pet skins, bonus Honor.
  - Implement Local Leaderboard UI panel & persistence.
  - Ensure save backward compatibility & upgrade logic for legacy saves.
  - Synchronize `assets/` mirror copy (`assets/index.html`, `assets/game.js`, `assets/levels.json`, `assets/save_data.json`).
- Verification Gate:
  - **Reviewers**, **Challengers**, **Forensic Auditor** verification.

### Phase 5: Milestone 5 - Final E2E Integration & Verification
- Final full regression audit: `node -c game.js` 100% clean, complete test of save loading, mirror file sync check, and final victory report to Sentinel.
