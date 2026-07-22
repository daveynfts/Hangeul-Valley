# Handoff Report: Economy Refactoring (R1) & Save Persistence Analysis

- **Agent**: Explorer 1 (`teamwork_preview_explorer`)
- **Working Directory**: `C:/VibeCode/Hangeul Valley/.agents/explorer_m1_1/`
- **Target Files**: `C:/VibeCode/Hangeul Valley/game.js`, `save_data.json`, `index.html`, `main.py`
- **Date**: 2026-07-22

---

## 1. Observation

### 1.1 Codebase & Architecture Structure
- **Game Engine**: Phaser 3.70.0 HTML5 game hosted via PyWebView in a native desktop wrapper (`main.py`).
- **Save Persistence Flow**:
  - `main.py` (lines 42–74): Defines `GameSaveAPI` class with thread-safe `save(data)` and `load()` methods reading/writing `save_data.json`.
  - `game.js` (lines 187–245): Implements a dual-layer persistence engine:
    - Primary: `window.pywebview.api.save(data)` / `load()`.
    - Fallback: `localStorage.setItem('hv_save_v2', JSON.stringify(data))` / `getItem('hv_save_v2')`.
  - Legacy `localStorage` keys: `hv_done` (completed levels, line 433), `hv_lastLevel` (line 575), `hv_plots` (lines 566, 2205).

### 1.2 Full Mapping of Currency (`gold`) Across All 7 Phaser Scenes & Gameplay Modes

| # | Scene / Gameplay Mode | Implementation Location (`game.js`) | Currency Earning Formula / Action | Currency Spending / Costs | State Management |
|---|---|---|---|---|---|
| **1** | **FarmScene** | `class FarmScene extends Phaser.Scene` (Lines 989–2208) | **Plot Harvest**: $R(h) = \max(3, \lfloor 10 \times 0.85^h \rfloor)$ where $h = \text{harvestCounts.get}(ko)$ (lines 2046–2053).<br>**Apple Tree**: $+15\text{--}20$ Gold every 2 min (lines 1717–1737). | **Hint Tier 1**: $5$ Gold (line 622).<br>**Hint Tier 2**: $10$ Gold (line 627). | Modifies global `gold` variable & `harvestCounts` Map. |
| **2** | **ArcadeScene** | `class ArcadeScene extends Phaser.Scene` (Lines 2209–2593) | **Stage Clear**: $\lfloor \text{score} / 15 \rfloor$ (line 2582).<br>**Boss Defeat**: $+150$ Gold flat bonus (line 2553). | None inside scene. | Calls `addGold(earned)`. |
| **3** | **DungeonScene** | `class DungeonScene extends Phaser.Scene` (Lines 2594–2886) | **Monster/Chest Loot**: $+25$ Gold per kill/chest (line 2814). | None inside scene. | Local `this.lootedGold`, synced to global `gold` via `addGold(this.lootedGold)` upon exit (lines 2871–2877). |
| **4** | **FishingScene** | `class FishingScene extends Phaser.Scene` (Lines 2887–3212) | **Catch & Quiz Clear**: $+35$ Gold per fish (line 3135). | None inside scene. | Calls `addGold(35)` and records in `fishAlbumSave[ko]` (line 3134). |
| **5** | **Memory Minigame** | JS Overlay Handler (Lines 3213–3315) | **Match All Cards**: $\max(15, 60 - \text{memoryFlips})$ (line 3287). | None inside minigame. | Calls `addGold(reward)`. |
| **6** | **Spell Quiz Duel** | JS Overlay Handler (Lines 3391–3633) | **Enemy Defeat**: $\text{EnemyGoldBonus} + (\text{combo} \times 5) + \lfloor \text{PlayerHP} / 2 \rfloor$ (line 3603). Base bonuses: Dark Sorcerer (50), Flame Archmage (80), Shadow Dragon (120), Grand Necromancer (180). | None inside duel. | Calls `addGold(reward)`. |
| **7** | **Shop & Trophies** | JS Overlay Handlers (Lines 727–787, 3316–3390) | None. | **Level Pack Unlocks**: $\text{LEVEL\_COST}(idx) = \lfloor 50 \times 1.8^{idx-1} \rfloor$ (Level 1: 50, Level 2: 90, Level 3: 162, Level 4: 292, Level 5: 525) (lines 177, 741–744).<br>**Trophies**: Bronze Apple (50 Gold), Silver Spade (300 Gold), Gold Tractor (1,000 Gold), Diamond Crown (5,000 Gold), Master Scholar (20,000 Gold) (lines 3318–3374). | Calls `gold -= cost` and `persistSave()`. |

### 1.3 Inspection of `save_data.json`

Verbatim contents of `C:/VibeCode/Hangeul Valley/save_data.json`:
```json
{
  "v": 3,
  "gold": 85,
  "unlockedLevels": [
    0,
    1,
    2,
    3
  ],
  "unlockedTrophies": [],
  "harvests": {},
  "srs": {
    "손": {
      "p2At": 1784687627489,
      "p3At": 1784687806143
    },
    "눈": {
      "p2At": 1784687634119,
      "p3At": 1784687810223
    }
  },
  "plots": [
    {
      "i": 0,
      "ko": "손",
      "sState": "3",
      "plantedAt": 1784687597489
    },
    {
      "i": 1,
      "ko": "눈",
      "sState": "3",
      "plantedAt": 1784687604119
    }
  ],
  "lastLevel": 3,
  "apple": {
    "ripeAt": 1784687814695,
    "ripe": false
  }
}
```

---

## 2. Logic Chain

### 2.1 Diminishing Returns & Economic Equilibrium Analysis
1. **Farming Diminishing Returns**:
   - The harvest formula $R(h) = \max(3, \lfloor 10 \times 0.85^h \rfloor)$ incentivizes word discovery. A new word yields 10 Gold, decaying down to a floor of 3 Gold at $h \ge 7$.
   - **Flaw**: Because the floor is fixed at 3 Gold and crop growth cycles are short (SRS P1=30s, P2=90s), players can repeatedly harvest easy/mastered words to accumulate infinite currency with minimal cognitive effort.
2. **Minigame & Dungeon Disparities**:
   - DungeonScene yields $+25$ Gold per monster/chest, quickly yielding 200–500 Gold per run.
   - Spell Quiz Duel awards up to 250+ Gold per wizard victory.
   - Fishing awards a static 35 Gold.
   - Arcade awards score / 15 + 150 (Boss defeat).
   - Because all activities award the *exact same single currency (`gold`)*, players optimize for the fastest minigame rather than learning vocabulary.
3. **Currency Sink Deficit**:
   - Total Gold required to unlock all 6 Level Packs is $< 2,000$ Gold.
   - Total Gold for all 5 Trophies is $26,350$ Gold.
   - Once levels are unlocked, `gold` accumulates with zero sink utility. Expanding the game to include Crafting, Pets, Quests, and Seasonal Events requires separating everyday soft currency (Coins) from premium/prestige currencies (Gems, Honor).

### 2.2 Save Persistence & Migration Logic Chain
1. `save_data.json` uses version field `"v": 3`.
2. Current `applySave(d)` only accepts `d.v === 2 || d.v === 3`.
3. To add Coins (동전), Gems (보석), Honor (명예), Quest progress, Ingredient inventory, Unlocked recipes, Pet collection, Active pet, Seasonal events, and Leaderboard records:
   - We increment schema version to `v: 4`.
   - To guarantee **100% backward compatibility**, any existing save file (`v2` or `v3`) must automatically migrate on load:
     - `currencies.coins` takes the value of legacy `d.gold`.
     - `currencies.gems` defaults to `0`.
     - `currencies.honor` defaults to `0`.
     - `d.gold` is maintained as a property getter/alias pointing to `currencies.coins` to avoid breaking unrefactored UI elements during transition.
     - New objects (`quests`, `inventory`, `recipes`, `pets`, `seasonal`, `leaderboards`) receive safe empty defaults.

---

## 3. Caveats

- **Network Mode**: Investigation operated under `CODE_ONLY` mode; no external network requests were made.
- **Scope Limit**: Read-only analysis. No source files outside `.agents/explorer_m1_1/` were modified.
- **Uninvestigated Area**: UI rendering changes for multi-currency display (HUD layout overhaul) in HTML/CSS are left for the implementation phase.

---

## 4. Conclusion & Recommendations

### 4.1 Summary of Findings
1. Currency logic is spread across 4 Phaser Scenes (`FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`), 3 Overlay Minigames (`Memory`, `Spell Quiz Duel`, `Apple Tree`), and 2 Shop/Trophy systems (`openShop`, `openTrophies`).
2. Single-currency `gold` creates inflation and design bottlenecks because minigames bypass vocabulary learning to farm gold rapidly.
3. Save system uses PyWebView disk writing to `save_data.json` backed by `localStorage.hv_save_v2`.

### 4.2 Proposed Schema Version 4 Specification (`save_data.json`)

```json
{
  "v": 4,
  "currencies": {
    "coins": 85,
    "gems": 0,
    "honor": 0
  },
  "gold": 85,
  "unlockedLevels": [0, 1, 2, 3],
  "unlockedTrophies": [],
  "harvests": {
    "손": 2,
    "눈": 1
  },
  "srs": {
    "손": { "p2At": 1784687627489, "p3At": 1784687806143 },
    "눈": { "p2At": 1784687634119, "p3At": 1784687810223 }
  },
  "plots": [
    { "i": 0, "ko": "손", "sState": "3", "plantedAt": 1784687597489 },
    { "i": 1, "ko": "눈", "sState": "3", "plantedAt": 1784687604119 }
  ],
  "lastLevel": 3,
  "apple": {
    "ripeAt": 1784687814695,
    "ripe": false
  },
  "fishAlbum": {},
  "quests": {
    "activeQuests": [],
    "completedQuests": [],
    "dailyResetTimestamp": 0
  },
  "inventory": {
    "ingredients": {},
    "seeds": {},
    "scrolls": 0
  },
  "recipes": {
    "unlockedRecipes": []
  },
  "pets": {
    "collection": [],
    "activePet": null
  },
  "seasonal": {
    "activeSeasonId": "autumn_harvest_2026",
    "seasonPoints": 0,
    "claimedRewards": []
  },
  "leaderboards": {
    "personalBests": {
      "arcadeHighScore": 0,
      "dungeonMaxFloor": 0,
      "duelMaxWinStreak": 0,
      "totalWordsMastered": 0
    }
  }
}
```

### 4.3 JavaScript Migration Implementation Proposal (`game.js`)

```javascript
function migrateSaveData(d) {
  if (!d) return null;
  const data = JSON.parse(JSON.stringify(d));
  
  if (!data.v || data.v < 4) {
    console.log(`[Save Migration] Upgrading schema from v${data.v || 1} -> v4`);
    
    const legacyGold = typeof data.gold === 'number' ? data.gold : 0;
    data.currencies = data.currencies || {};
    data.currencies.coins = typeof data.currencies.coins === 'number' ? data.currencies.coins : legacyGold;
    data.currencies.gems = typeof data.currencies.gems === 'number' ? data.currencies.gems : 0;
    data.currencies.honor = typeof data.currencies.honor === 'number' ? data.currencies.honor : 0;
    
    // Backward compatibility alias
    data.gold = data.currencies.coins;
    
    data.quests = data.quests || { activeQuests: [], completedQuests: [], dailyResetTimestamp: Date.now() };
    data.inventory = data.inventory || { ingredients: {}, seeds: {}, scrolls: 0 };
    data.recipes = data.recipes || { unlockedRecipes: [] };
    data.pets = data.pets || { collection: [], activePet: null };
    data.seasonal = data.seasonal || { activeSeasonId: 'autumn_harvest_2026', seasonPoints: 0, claimedRewards: [] };
    data.leaderboards = data.leaderboards || {
      personalBests: {
        arcadeHighScore: 0,
        dungeonMaxFloor: 0,
        duelMaxWinStreak: 0,
        totalWordsMastered: 0
      }
    };
    
    data.v = 4;
  }
  return data;
}

function applySave(d) {
  if (!d) return false;
  const migrated = migrateSaveData(d);
  if (!migrated) return false;
  
  // Currencies
  playerCurrencies = migrated.currencies;
  gold = playerCurrencies.coins; // legacy alias sync
  
  // Progression & Save State
  unlockedLevels = Array.isArray(migrated.unlockedLevels) ? migrated.unlockedLevels : [0];
  unlockedTrophies = Array.isArray(migrated.unlockedTrophies) ? migrated.unlockedTrophies : [];
  if (migrated.harvests) Object.entries(migrated.harvests).forEach(([k, v]) => harvestCounts.set(k, v));
  if (migrated.srs) srsData = migrated.srs;
  if (migrated.plots) plotSave = migrated.plots;
  if (typeof migrated.lastLevel === 'number') currentLevelIndex = migrated.lastLevel;
  if (migrated.apple) appleTreeSave = migrated.apple;
  if (migrated.fishAlbum) fishAlbumSave = migrated.fishAlbum;
  
  // New R1 Systems
  questState = migrated.quests;
  inventoryState = migrated.inventory;
  recipeState = migrated.recipes;
  petState = migrated.pets;
  seasonalState = migrated.seasonal;
  leaderboardState = migrated.leaderboards;
  
  return true;
}
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. Run Python Migration Test:
   ```cmd
   python C:/VibeCode/Hangeul Valley/.agents/explorer_m1_1/script_test_migration.py
   ```
   *Expected Result*: Existing `v3` `save_data.json` successfully loads, converts `gold: 85` to `currencies.coins: 85`, initializes `gems: 0`, `honor: 0`, populates new schema fields, and outputs valid `v4` JSON.

2. Desktop PyWebView Execution Test:
   ```cmd
   python C:/VibeCode/Hangeul Valley/main.py
   ```
   *Expected Result*: PyWebView boots without syntax or save loading errors.

### 5.2 Invalidation Conditions
- If legacy save files containing `gold` fail to convert to `coins`, resulting in currency loss.
- If `applySave()` returns `false` for valid `v2` or `v3` JSON payloads.
- If PyWebView file lock fails during disk write in `main.py`.
