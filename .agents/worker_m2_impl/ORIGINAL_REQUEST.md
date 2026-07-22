## 2026-07-22T10:00:09Z
You are Worker M2 Impl (teamwork_preview_worker).
Your working directory is `C:/VibeCode/Hangeul Valley/.agents/worker_m2_impl/`.

Task: Implement Requirements R1 (Triple Currency Economy & Sinks) and R2 (Korean-Gated Progression & Quest System) in `game.js`, `index.html`, and `save_data.json`.

Read the detailed exploration reports at:
- `C:/VibeCode/Hangeul Valley/.agents/explorer_m1_1/handoff.md`
- `C:/VibeCode/Hangeul Valley/.agents/explorer_m1_2/handoff.md`
- `C:/VibeCode/Hangeul Valley/.agents/explorer_m1_3/handoff.md`

Specifications to implement:

1. **Save Schema Version 4 (`v: 4`) & Migration (`game.js`, `save_data.json`)**:
   - Update `save_data.json` and save logic in `game.js` to version 4 (`v: 4`).
   - `currencies`: `{ coins: legacyGold, gems: 0, honor: 0 }`.
   - Maintain `gold` alias for `coins` so any code reading `gold` works without breaking.
   - Add schema objects: `quests`, `inventory`, `recipes`, `pets`, `seasonal`, `leaderboards`.
   - Implement `migrateSaveData(data)` to automatically convert legacy `v2`/`v3` saves to `v4` on boot.

2. **Triple Currency Economy (R1)**:
   - Coins (동전 🪙): Primary currency earned from plot harvests, apple tree, fishing catches, arcade stages, dungeon loot drops, spell duel victories, memory match. Spent on seeds, hints, level packs.
   - Gems (보석 💎): Premium rare currency earned ONLY from perfect quiz streaks (100% accuracy), legendary fish catches, zero-damage boss kills, daily login milestones. Spent on rare unlocks.
   - Honor (명예 🏅): Reputation currency earned from completing quests, mastering words to Legendary tier (>=10 harvests), crafting rare dishes, seasonal events.
   - Functions: `addCoins(amt)`, `addGems(amt)`, `addHonor(amt)`.
   - Update HUD in `index.html` and `game.js` to display all 3 currencies (Coins 🪙, Gems 💎, Honor 🏅) styled in 64-Bit Retro Glassmorphism.

3. **Korean-Gated Progression & Quest System (R2)**:
   - Hard Lock Zone Unlocks: Enforce 80% SRS Word Mastery (words with >=3 harvests in level) to unlock Arcade (requires L1), Fishing (requires L2), Dungeon (requires L3), Spell Duel (requires L4). Display 🔒 Hard Lock modal/toast when blocked.
   - Shop Purchase Quiz Gates: Intercept `buyLevel(idx)` with a 3-question Korean translation quiz challenge. Require 3 correct answers before completing purchase.
   - Boss Entrance Challenge Gates: Add timed quiz entrance gate before Dungeon Boss and Spell Duel Necromancer.
   - Quest System: 6-Act Main Storyline Quest Chain + Daily (24h reset) & Weekly (7-day reset) side quests with Coins, Gems, and Honor rewards.
   - Quest Log UI Overlay (`#quest-overlay` in `index.html`) styled in 64-Bit Retro Glassmorphism (`.glass-modal`, `.glass-hud`, `.neon-border`, `.pixel-art-detail`) with Main, Daily, Weekly tabs and Claim buttons.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification Steps:
- Execute `node -c game.js` to ensure zero syntax errors.
- Verify `save_data.json` compatibility and v4 schema migration.
- Write your handoff report to `C:/VibeCode/Hangeul Valley/.agents/worker_m2_impl/handoff.md`.

Send your final summary to orchestrator via `send_message`.
