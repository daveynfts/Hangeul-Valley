# Analysis Report: Vocabulary Integration & Minigame Scoring Flow (Milestone 1)

**Target Area**: `game.js` and `levels.json`  
**Author**: Explorer 3 (Milestone 1 - Vocabulary Integration & Minigame Scoring Flow)  
**Date**: 2026-07-24  

---

## Executive Summary

This report delivers a deep-dive technical investigation and architectural design for **Milestone 1: Vocabulary Integration & Minigame Scoring Flow** in Hangeul Valley. Specifically, it analyzes how vocabulary is stored in `levels.json`, accessed in game memory via `unlockedLevels` and SRS state, matched for round gameplay (target English ↔ distractor Korean bees), tracked during `BeeScene` progression, and displayed upon completion via a retro glassmorphism end-of-round results summary overlay.

---

## Detailed Investigation Findings

### 1. Vocabulary Loading & In-Memory Data Storage

#### A. Data Source (`levels.json`)
- Vocabulary levels are stored as a JSON array of level objects:
  ```json
  [
    {
      "level": 1,
      "name": "일상과 사람",
      "icon": "🏠",
      "description": "가족, 사람, 일상 동작 및 기본 상태 어휘",
      "target": 9,
      "words": [
        { "ko": "아버지", "en": "father", "hint": "👨", "category": "가족과 사람" },
        ...
      ]
    }
  ]
  ```
- **Word Data Contract**: Each word object contains:
  - `ko`: Korean Hangul representation (string, unique key across dictionary).
  - `en`: Primary English translation string.
  - `hint`: Emoji visual cue (string).
  - `category`: Sub-thematic classification string (e.g. "가족과 사람", "일상 동작").

#### B. Game Memory & State Variables (`game.js`)
- `levelsData` (`let levelsData = []`): Global array loaded asynchronously via `fetch('levels.json')` or cached in Phaser (`sceneRef.cache.json.get('levels')`).
- `unlockedLevels` (`var unlockedLevels = [0]`): Global array of unlocked level indices (0-indexed). Defaults to `[0]` (Level 1 unlocked by default). Players purchase additional level packs using gold in the shop.
- `harvestCounts` (`const harvestCounts = new Map()`): Tracks total harvest occurrences for each word (`w.ko`).
- `srsData` (`let srsData = {}`): Global object storing spaced repetition state for crop farming:
  ```javascript
  srsData[ko] = { p2At: timestamp, p3At: timestamp, harvests: count };
  ```
- `calcLevelMastery(levelIdx)`: Calculates percentage of words in a level harvested at least 3 times:
  $$\text{Mastery \%} = \lfloor \frac{\text{words harvested} \ge 3}{\text{total words in level}} \times 100 \rfloor$$

#### C. Standardization Helper Proposal: `getUnlockedWords()`
Currently, multiple features in `game.js` retrieve unlocked words using inline logic:
```javascript
const allWords = unlockedLevels.flatMap(i => levelsData[i]?.words || []);
const pool = allWords.length >= 4 ? allWords : (levelsData[0]?.words || []);
```
To ensure clean modular access across `BeeScene` and all future minigames, a central helper function `getUnlockedWords()` must be defined:
```javascript
function getUnlockedWords() {
  if (!levelsData || !levelsData.length) return [];
  const words = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  return words.length >= 4 ? words : (levelsData[0]?.words || []);
}
```

---

### 2. Target English Selection & Distractor Korean Matching

#### A. Round Selection Algorithm (10 Target Words)
For a standard `BeeScene` minigame round:
1. Retrieve unlocked pool: `const pool = getUnlockedWords();`.
2. Shuffle pool: `const shuffled = Phaser.Utils.Array.Shuffle([...pool]);`.
3. Pick 10 target words: `const roundTargets = shuffled.slice(0, 10);`. If `pool.length < 10`, cycle pool elements to guarantee 10 target rounds.

#### B. Wave Generation & Distractor Assembly
For each target word $T$ (with English prompt $T.\text{en}$ and Korean answer $T.\text{ko}$):
1. **Target Display**: Display target English word in the HUD banner: `TARGET: "father" 👨`.
2. **Distractor Pool**: Filter pool for words $W$ where $W.\text{ko} \neq T.\text{ko}$.
3. **Distractor Pick**: Shuffle distractors and pick $N$ distractor words (e.g. $N = 3$ for a 4-bee wave, or $N = 2$ for a 3-bee wave).
4. **Bee Payload Construction**:
   - 1 Correct Bee: `{ ko: T.ko, isCorrect: true, word: T }`
   - $N$ Distractor Bees: `{ ko: distractor[i].ko, isCorrect: false, word: distractor[i] }`
5. **Randomization**: Shuffle bee array using `Phaser.Utils.Array.Shuffle` so correct bee position is unpredictable.

#### C. Shooting / Selection Mechanics
- When player shoots or clicks a bee carrying Korean word $K$:
  - **Hit Correct ($K == T.\text{ko}$)**: Trigger success particles/audio, increment score and combo, advance to next word target (word counter +1).
  - **Hit Wrong ($K \neq T.\text{ko}$)**: Trigger wrong SFX, reset combo counter to 0, record wrong attempt in accuracy tracking, destroy wrong bee (target word remains active).

---

### 3. Round Progression & State Tracking in `BeeScene`

`BeeScene` maintains the following round state properties:

| State Variable | Data Type | Default / Range | Purpose & Calculation |
|---|---|---|---|
| `currentWordIndex` | `number` | `0` to `9` | Current target word step (e.g. "Word 1 / 10"). |
| `score` | `number` | `0+` | Cumulative score. $\text{Score} += 100 + (\text{comboCounter} \times 20)$. |
| `hits` | `number` | `0` to `10+` | Count of correct target hits. |
| `misses` | `number` | `0+` | Count of incorrect distractor hits or missed targets. |
| `comboCounter` | `number` | `0+` | Current streak of consecutive correct hits. Resets to 0 on miss. |
| `maxCombo` | `number` | `0+` | Highest combo streak achieved during the round. |
| `accuracy` | `number` | `0%` to `100%` | $\text{Accuracy} = \operatorname{Math.round}\left(\frac{\text{hits}}{\text{hits} + \text{misses}} \times 100\right)$. |
| `roundOver` | `boolean` | `false` | Set to `true` when 10th target word is completed. |

---

### 4. End-of-Round Results Summary Overlay Design

#### A. Aesthetic Style: Retro Glassmorphism
- **Backdrop**: Semi-transparent dark background (`rgba(15, 23, 42, 0.92)`).
- **Border**: Neon golden glow (`2px solid #F59E0B`, `box-shadow: 0 0 25px rgba(245, 158, 11, 0.4)`).
- **Blur**: Glassmorphism backdrop filter (`backdrop-filter: blur(12px)`).
- **Typography**: Retro arcade pixel-art headers (`"Press Start 2P", monospace`) and crisp readable stats.

#### B. Component Breakdown & Data Mapping
1. **Title Banner**: `🐝 BEEHIVE HARVEST COMPLETE!`
2. **Final Score Card**: `🏆 Score: 1,450 PTS`
3. **Accuracy Meter**: `🎯 Accuracy: 90% (10/11 hits)`
4. **Combo Peak**: `🔥 Max Combo: 6x`
5. **Honey Reward Preview**:
   - Base Honey Calculation: $\text{Base Honey} = \lfloor \frac{\text{score}}{300} \rfloor$ (minimum 1 Honey upon completing 10 words).
   - Accuracy Bonus: $+1$ Honey if $\text{Accuracy} \ge 90\%$.
   - Display: `🍯 Reward: +3 Honey` (adds item `'honey'` via `addItemToInventory('honey', count)` for M2).
6. **Navigation Action**:
   - Button text: `'Return to Farm'`
   - Functionality: Cleanly stops `BeeScene`, resumes/starts `FarmScene`, restoring player focus to the beehive NPC.

---

### 5. Syntax Verification Results

- Command executed: `node -c game.js`
- Result: **Passed (0 syntax errors)**.

---

## Architectural Design for R2 Vocabulary Integration & Scoring Flow

```
 +-----------------------------------------------------------------------+
 |                            levels.json                                |
 |  Level 1: 일상과 사람  | Level 2: 음식과 식생활 | Level 3: 시간과 날씨  |
 +-----------------------------------------------------------------------+
                                     |
                                     v
 +-----------------------------------------------------------------------+
 |                     game.js Memory & Progress                         |
 |  unlockedLevels = [0, 1, ...]                                         |
 |  getUnlockedWords() -> Pool of active Korean/English pairs            |
 +-----------------------------------------------------------------------+
                                     |
                                     v
 +-----------------------------------------------------------------------+
 |                             BeeScene                                  |
 |  - Select 10 target words: roundTargets = [W1, W2, ..., W10]          |
 |  - HUD target display: TARGET: "father" (W1.en)                       |
 |  - Spawn 1 correct bee (W1.ko) + 2-3 distractor bees (unlocked ko)     |
 |  - Real-time HUD: Score, Combo (x3), Word 1/10, Accuracy (100%)       |
 +-----------------------------------------------------------------------+
                                     |
                                     v (Round Completed: 10 Words)
 +-----------------------------------------------------------------------+
 |             Retro Glassmorphism Results Summary Overlay              |
 |  -------------------------------------------------------------------  |
 |  |                  🐝 BEEHIVE HARVEST COMPLETE!                   |  |
 |  |                                                                 |  |
 |  |   🏆 Score: 1,450 PTS         🎯 Accuracy: 90%                    |  |
 |  |   🔥 Max Combo: 6x            🍯 Honey Earned: +3 Honey          |  |
 |  |                                                                 |  |
 |  |                   [ 🌾 Return to Farm ]                         |  |
 |  -------------------------------------------------------------------  |
 +-----------------------------------------------------------------------+
                                     |
                                     v
 +-----------------------------------------------------------------------+
 |                        Return to FarmScene                            |
 |  - Honey item credited to inventory (M2 contract)                     |
 |  - Smooth scene transition back to Farm NPC position                  |
 +-----------------------------------------------------------------------+
```

---

## Conclusion & Next Steps

The existing game architecture cleanly supports vocabulary data loading from `levels.json` and memory management via `unlockedLevels`. Integrating `getUnlockedWords()` provides a unified vocabulary source for `BeeScene`. The scoring, combo, and distractor mechanics create an engaging learning loop, culminating in a retro glassmorphism overlay that bridges minigame completion back to farm gameplay.
