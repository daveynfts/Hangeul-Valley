# Handoff Report: Korean-Gated Progression & Quest System (R2)

**Explorer**: Explorer 2 (teamwork_preview_explorer)  
**Working Directory**: `C:/VibeCode/Hangeul Valley/.agents/explorer_m1_2/`  
**Target Files**: `game.js`, `levels.json`, `index.html`  
**Date**: 2026-07-22  

---

## 1. Observation

### 1.1 Vocabulary SRS State & Word Mastery (`game.js` & `levels.json`)
* **`levels.json` Structure**:
  * Defines 6 distinct vocabulary levels: Level 1 (Basic Nouns, 50 words, target 8), Level 2 (Animals, 10 words, target 6), Level 3 (Colors, 10 words, target 6), Level 4 (Family, 10 words, target 6), Level 5 (Korean Food, 10 words, target 6), Level 6 (Numbers, 10 words, target 6).
  * Each word entry contains `{ ko, en, hint, category }`.
* **Level Pack Purchasing State (`game.js` lines 251, 740-783)**:
  * `unlockedLevels`: Array tracking owned level indices (default: `[0]`).
  * `currentLevelIndex`: Index of active level pack (default: `0`).
  * `LEVEL_COST(idx)`: Formula `idx === 0 ? 0 : Math.floor(50 * Math.pow(1.8, idx - 1))` (Level 1: 0g, Level 2: 50g, Level 3: 90g, Level 4: 162g, Level 5: 292g, Level 6: 525g).
  * `buyLevel(idx)` / `_doLevelPurchase(idx)`: Deducts gold and pushes `idx` to `unlockedLevels`.
* **SRS State Data Structure (`game.js` lines 180-246, 2019-2070)**:
  * `srsData`: Object mapping `word.ko` $\to$ `{ p2At, p3At, harvests }`.
  * Timers: `SR1 = 30000` ms (Phase 1 seedling $\to$ Phase 2 sprout review), `SR2 = 90000` ms (Phase 2 sprout $\to$ Phase 3 ripe harvest).
  * `harvestCounts`: `Map<string, number>` tracking `word.ko` $\to$ total times harvested.
  * Save/Load: `collectSave()` and `applySave()` serialize `v:3` schema to `localStorage` (`hv_save_v2`) and `window.pywebview.api.save()`.
* **Word Mastery Tiers (`game.js` lines 954-958)**:
  * **Novice** (⚪ Tân thủ): `harvests <= 1`
  * **Practicing** (🔵 Đang nhớ): `2 <= harvests <= 4`
  * **Mastered** (🟣 Thành thạo): `5 <= harvests <= 9`
  * **Legendary** (🟡 Huyền thoại): `harvests >= 10`

### 1.2 Zone Unlock Triggers (`game.js` `FarmScene` lines 1960-2015)
* Interaction radii ($\approx 80-90$px) trigger scene transitions:
  * **Fishing Spot / Dock**: `this.scene.launch('FishingScene')` (line 1992).
  * **Arcade Machine**: `this.scene.launch('ArcadeScene')` (line 2000).
  * **Dungeon Portal**: `this.scene.launch('DungeonScene')` (line 1984).
  * **Wizard NPC (Spell Duel)**: `openSpellDuel()` (line 1977).
* **Current Unlock State**: All 4 zones are currently **open by default without any vocabulary mastery gates or level requirements**.

### 1.3 Shop Item Interaction (`game.js` lines 727-787 & `index.html` lines 760-785)
* `#shop-overlay` displays available Level Packs.
* `buyLevel(idx)` directly completes purchase if `gold >= LEVEL_COST(idx)`.
* **Current Gate State**: No vocabulary test or quiz challenge gate currently exists before purchasing items/packs.

### 1.4 Boss Fight Entry Points (`game.js` lines 2594-2886 & 3391-3633)
* **`DungeonScene`**: Spawns random wave monsters (`Skeleton`, `Golem`, `Demon`). No boss room or entrance gate currently exists.
* **`SpellDuelScene`**: `DUEL_ENEMIES` contains 4 enemies (`Dark Sorcerer`, `Flame Archmage`, `Shadow Dragon`, `Grand Necromancer`). Opponents are picked at random without progression locks or entrance challenge gates.

### 1.5 Quest System State (`game.js` & `index.html`)
* No quest data structures, quest overlays, daily/weekly task managers, or Gem/Honor currency handlers exist in the current codebase.

---

## 2. Logic Chain

### 2.1 Enforcing Hard Lock Gates (80% SRS Mastery Threshold)
1. **SRS Mastery Calculation Formula**:
   $$\text{MasteryPercentage}(\text{levelIdx}) = \frac{\text{Count of words in } \text{levelsData}[\text{levelIdx}] \text{ with } \text{harvestCounts} \ge 3}{\text{Total words in } \text{levelsData}[\text{levelIdx}]} \times 100$$
2. **Zone Gating Map**:
   * **Zone 1 (Farm / Level 1 Basic Nouns)**: Unlocked by default.
   * **Zone 2 (Arcade / Level 2 Animals)**: Requires $\ge 80\%$ SRS Mastery in Level 1.
   * **Zone 3 (Fishing Dock / Level 3 Colors)**: Requires $\ge 80\%$ SRS Mastery in Level 2.
   * **Zone 4 (Dungeon / Level 4 Family)**: Requires $\ge 80\%$ SRS Mastery in Level 3.
   * **Zone 5 (Spell Duel Arena / Level 5 Food & Level 6 Numbers)**: Requires $\ge 80\%$ SRS Mastery in Level 4.
3. **Execution Hook**:
   * Intercept interactions in `FarmScene.update()` (lines 1974-2002):
     ```javascript
     function isZoneUnlocked(zoneKey) {
       const reqs = {
         arcade:  { reqLevel: 0, minPct: 80, name: 'Basic Nouns' },
         fishing: { reqLevel: 1, minPct: 80, name: 'Animals' },
         dungeon: { reqLevel: 2, minPct: 80, name: 'Colors' },
         duel:    { reqLevel: 3, minPct: 80, name: 'Family' }
       };
       const req = reqs[zoneKey];
       if(!req) return { unlocked: true };
       const pct = calcLevelMastery(req.reqLevel);
       return { unlocked: pct >= req.minPct, pct, targetPct: req.minPct, reqName: req.name };
     }
     ```
   * If `isZoneUnlocked().unlocked === false`:
     * Block scene launch.
     * Play locked SFX (`chiptuneSynth.play('wrong')`).
     * Show UI Toast / Lock Modal: `🔒 HARD LOCK: Reach 80% SRS Mastery in ${reqName}! (Current: ${pct}%)`.
     * Display floating lock icon badge 🔒 above locked NPCs/Portals in `FarmScene`.

### 2.2 Shop Purchase Quiz Gates
1. Intercept `buyLevel(idx)` before deducting gold.
2. Verify `gold >= LEVEL_COST(idx)`. If false, reject.
3. Trigger **Shop Purchase Korean Challenge Modal**:
   * Draw 3 random vocabulary words from the player's unlocked pool.
   * Require 3 consecutive correct translation answers (Korean $\to$ English or English $\to$ Korean).
4. On 3/3 Pass $\to$ Deduct gold, push `idx` to `unlockedLevels`, call `persistSave()`, play celebratory chiptune.
5. On Fail $\to$ Preserve gold, cancel purchase, prompt player to practice in Farm.

### 2.3 Boss Fight Entry Points & Challenge Gates
1. **Dungeon Boss Gate (`DungeonScene`)**:
   * Spawn Boss Portal after clearing 5 dungeon wave monsters.
   * Stepping onto Boss Portal triggers a 3-word timed Korean entrance gate (8 seconds per word).
   * **Success**: Enter Boss Chamber vs. "King Sejong's Corrupted Sentinel" (300 HP, invulnerable until matching Korean word shield is broken).
   * **Failure**: Gate remains sealed, spawns 2 review minions.
2. **SpellDuel Boss Ladder (`SpellDuelScene`)**:
   * Enforce linear ladder progression: Dark Sorcerer $\to$ Flame Archmage $\to$ Shadow Dragon $\to$ Grand Necromancer (Boss).
   * Unlocking the Grand Necromancer Boss requires passing a 5-Word Korean Challenge Attempt Gate.

### 2.4 Quest System Architecture & Progression Chain
1. **Vocabulary Theme Roadmap**:
   $$\text{Food (Level 1/5)} \longrightarrow \text{Animals (Level 2)} \longrightarrow \text{Family (Level 4)} \longrightarrow \text{Colors (Level 3)} \longrightarrow \text{Numbers (Level 6)} \longrightarrow \text{Advanced (Boss)}$$
2. **Currencies & Economy**:
   * `Gold` 💰: Economy for seed buying & level pack unlocking.
   * `Gems` 💎: Quest rewards for cosmetic trophies & special items.
   * `Honor` 🎖️: Total quest reputation score.
3. **Quest Categories**:
   * **Main Storyline Chain (6 Acts)**:
     * *Act I: Harvest of Hangeul* — Plant 5 crops, harvest 3 ripe crops, reach 80% SRS Mastery in Level 1 (Reward: 100 Gold 💰, 10 Gems 💎, 50 Honor 🎖️).
     * *Act II: Beast Master* — Defeat 5 Dungeon beasts, reach 80% SRS Mastery in Level 2 (Reward: 150 Gold 💰, 15 Gems 💎, 75 Honor 🎖️).
     * *Act III: Bonds of Hangeul* — Win 3 Spell Duels, reach 80% SRS Mastery in Level 4 (Reward: 200 Gold 💰, 20 Gems 💎, 100 Honor 🎖️).
     * *Act IV: Chromatic Angler* — Catch 5 fish in Fishing Minigame, reach 80% SRS Mastery in Level 3 (Reward: 250 Gold 💰, 25 Gems 💎, 125 Honor 🎖️).
     * *Act V: Numeric Dominion* — Score 500+ in Arcade Machine, reach 80% SRS Mastery in Level 6 (Reward: 300 Gold 💰, 30 Gems 💎, 150 Honor 🎖️).
     * *Act VI: Grand Sovereign* — Defeat the Grand Necromancer Boss with 100% SRS Mastery across all levels (Reward: 500 Gold 💰, 50 Gems 💎, 300 Honor 🎖️, Crown Trophy 👑).
   * **Daily Quests (24h Reset)**:
     * *DQ1*: Harvest 3 crops (30 Gold 💰, 2 Gems 💎).
     * *DQ2*: Answer 5 SRS review quizzes (40 Gold 💰, 3 Gems 💎).
     * *DQ3*: Collect 2 Vocab Scrolls in Dungeon (50 Gold 💰, 5 Gems 💎).
   * **Weekly Quests (7-Day Reset)**:
     * *WQ1*: Master 5 Korean words ($\ge 5$ harvests) (150 Gold 💰, 15 Gems 💎).
     * *WQ2*: Win 3 Spell Duels (200 Gold 💰, 20 Gems 💎).
     * *WQ3*: Catch 10 fish in Fishing Minigame (180 Gold 💰, 18 Gems 💎).
4. **Data Schema & Persistence**:
   ```javascript
   questSave = {
     mainStep: 1,
     mainProgress: { harvested: 0, mastered: 0, kills: 0, fish: 0, score: 0 },
     daily: [
       { id: 'd1', title: 'Daily Harvest', target: 3, current: 0, claimed: false, rewardGold: 30, rewardGems: 2 },
       { id: 'd2', title: 'Daily Review', target: 5, current: 0, claimed: false, rewardGold: 40, rewardGems: 3 },
       { id: 'd3', title: 'Daily Hunter', target: 2, current: 0, claimed: false, rewardGold: 50, rewardGems: 5 }
     ],
     weekly: [
       { id: 'w1', title: 'Master Scholar', target: 5, current: 0, claimed: false, rewardGold: 150, rewardGems: 15 },
       { id: 'w2', title: 'Arena Champion', target: 3, current: 0, claimed: false, rewardGold: 200, rewardGems: 20 },
       { id: 'w3', title: 'Legendary Angler', target: 10, current: 0, claimed: false, rewardGold: 180, rewardGems: 18 }
     ],
     gems: 0,
     honor: 0,
     lastDailyReset: 0,
     lastWeeklyReset: 0
   };
   ```

---

## 3. Caveats
* **Legacy Save File Compatibility**: Existing save files (`v:3`) do not contain `questSave` or `gems`. `applySave()` must initialize default fallback values for `questSave` and `gems` if missing to prevent `undefined` errors.
* **Mastery Criteria**: Mastery threshold is set to $\ge 3$ harvests per word (or $\ge 5$ harvests for full mastery tier). The 80% gate threshold requires 80% of words in the designated level to reach at least 3 harvests.
* **No Code Modification Undertaken**: Explorer 2 performed pure read-only analysis. No game source code files outside working directory were modified.

---

## 4. Conclusion
The codebase is structured cleanly to support R2 features:
1. SRS state (`srsData`, `harvestCounts`) and level packs (`unlockedLevels`, `levelsData`) provide all necessary primitives to implement the 80% SRS Mastery Hard Locks.
2. Scene transitions in `FarmScene.update()` can be cleanly intercepted to check zone unlock eligibility before scene launching.
3. Shop purchase flow in `buyLevel()` can easily host a 3-question Korean quiz challenge step.
4. `DungeonScene` and `SpellDuelScene` can host Boss Entry Gates with timed Korean challenge attempts.
5. A comprehensive Quest System (Main Storyline + Daily/Weekly quests) with Gold, Gems, and Honor rewards can be integrated into `collectSave()`, `persistSave()`, and a new UI modal (`#quest-overlay`).

---

## 5. Verification Method

### 5.1 Verification Commands
Run the game server locally using Python:
```bash
python main.py
```
Open `http://localhost:8000` (or local pywebview window) to inspect UI and interactions.

### 5.2 Step-by-Step Manual Verification Checklist
1. **SRS Mastery & Hard Lock Verification**:
   * Inspect `isZoneUnlocked('arcade')` when Level 1 mastery is $< 80\%$. Verify Arcade interaction shows lock modal and plays wrong SFX.
   * Harvest Level 1 crops until 80% of words have $\ge 3$ harvests. Verify Arcade interaction unlocks.
2. **Shop Korean Quiz Gate Verification**:
   * Open Shop, select locked Level 2 pack with sufficient gold.
   * Verify Korean Quiz Challenge modal appears before gold is deducted.
   * Intentionally fail quiz $\to$ Verify gold is NOT deducted and level remains locked.
   * Answer quiz correctly $\to$ Verify gold is deducted and level unlocks.
3. **Boss Entrance Gate Verification**:
   * In `DungeonScene`, clear 5 wave monsters. Verify Boss Portal appears and triggers timed Korean challenge on interaction.
   * In `SpellDuelScene`, select Grand Necromancer. Verify 5-word challenge attempt gate triggers before entering duel.
4. **Quest System Verification**:
   * Open `#quest-overlay`. Verify Main Storyline, Daily, and Weekly tabs display correctly.
   * Complete a harvest task $\to$ Verify quest progress updates and Gems/Honor rewards can be claimed.
