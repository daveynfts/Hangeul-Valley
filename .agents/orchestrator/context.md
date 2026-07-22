# Project Context & Architecture State

## Architecture & Codebase Map
- **Single Page Application**: `index.html` (DOM overlays & CSS), `game.js` (Phaser 3 scenes and game state), `levels.json` (vocabulary packs), `save_data.json` (player save state), `assets/` (mirror copy).
- **Phaser 3 Scenes**:
  - `FarmScene`: Crop planting, SRS timers, harvest rewards, apple tree, NPC interactions, zone portals.
  - `FishingScene`: Tension minigame, fish album dictionary (`fishAlbumSave`).
  - `ArcadeScene`: Retro space shooter, alien boss, score-based coin rewards.
  - `DungeonScene`: ARPG crawler, monster waves, vocab scroll loot drops.
  - `SpellDuel`: Turn-based spell quiz duel vs wizard ladder.
  - `MemoryMatch`: Card matching minigame.
  - `CatDialog`: NPC dialog box system.

## Milestone 1 Exploration Findings
1. **Save Schema Version 4 (`v: 4`)**:
   - `currencies`: `{ coins: number, gems: number, honor: number }`. Legacy `gold` maintained as getter alias for 100% backward compatibility.
   - Schema sections: `quests`, `inventory`, `recipes`, `pets`, `seasonal`, `leaderboards`.
   - `migrateSaveData()` safely upgrades `v2`/`v3` saves automatically on load.
2. **Economy Refactoring (R1)**:
   - `Coins (동전)`: Everyday currency from farming, fishing, arcade, dungeon, duel, memory. Used for seeds, hints, basic items.
   - `Gems (보석)`: Premium rare currency from perfect quiz streaks, legendary fish, zero-damage boss kills, daily logins. Used for pets, cosmetics, special recipes.
   - `Honor (명예)`: Reputation currency from quests, legendary word mastery, rare cooking, seasonal events. Used for leaderboards, prestige tiers.
3. **Korean-Gated Progression & Quest System (R2)**:
   - Hard Lock Zone Gating: 80% SRS Word Mastery required in previous level to unlock Arcade, Fishing, Dungeon, Spell Duel.
   - Shop Quiz Gates: 3-question Korean translation quiz challenge before shop purchases.
   - Boss Attempt Gates: Timed entrance quiz challenge for Dungeon Boss & Spell Duel Necromancer.
   - Quest System: 6-Act Main Storyline + Daily/Weekly side quests with Gems & Honor rewards. Quest Log UI panel.
4. **Crafting & Pets (R3 & R4)**:
   - 8+ Korean recipes, ingredient Korean names, timed cooking minigame, temporary gameplay buffs, cultural facts overlay.
   - 5+ Collectible Pets (Dog, Cat, Rabbit, Hamster, Parrot) with passives, XP leveling via Korean quizzes, happiness decay & dish feeding.
5. **Seasonal Events & Leaderboard (R5)**:
   - Event templates (Chuseok, Seollal, Children's Day) with limited quests & exclusive rewards.
   - Local Leaderboard UI panel tracking words mastered, Honor, cooking tier, pet completion.
   - `assets/` mirror synchronization.
