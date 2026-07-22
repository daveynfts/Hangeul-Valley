# Code Review & Handoff Report — Requirements R1 & R2

**Reviewer**: Reviewer M2-1 (`teamwork_preview_reviewer`)  
**Date**: 2026-07-22  
**Target Files**: `game.js`, `index.html`, `save_data.json`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary

A comprehensive code review and adversarial analysis was conducted on Requirements **R1 (Triple Currency Economy & Save Schema v4)** and **R2 (Korean-Gated Progression & Quest System)** across `game.js`, `index.html`, and `save_data.json`.

While save migration (v2/v3 -> v4), 80% SRS Mastery hard-locking for minigames, Boss Entrance Gates, and the 6-Act Main/Daily/Weekly Quest System overlay are well-structured, **two critical defects and integrity violations** were discovered:
1. **Shop Quiz Gate Bypass (Facade Implementation)**: `startShopQuizGate(idx)` is implemented in `game.js` (line 448), but shop purchase handlers `buyLevel(idx)` (line 1262) and `buyLevelFromSelect(idx)` (line 1066) call `_doLevelPurchase(idx)` directly, completely bypassing the 3-question Korean quiz gate.
2. **Currency Alias Desynchronization & Infinite Coins Glitch**: Level purchases (`_doLevelPurchase`), trophy purchases, and vocab quiz hints mutate local primitive `gold -= cost` directly instead of calling `spendCoins(cost)`. Primitive `gold -= cost` does NOT deduct `playerCurrencies.coins`. When saving, `collectSave()` writes `playerCurrencies.coins` back to `gold`, restoring spent funds upon reload and desyncing currency state.

---

## 2. Review Findings

### 🔴 Critical Finding 1: [INTEGRITY VIOLATION / SHORTCUT] Shop Purchase Quiz Gate Bypassed in UI
- **Location**: `game.js` lines 1262-1269, lines 1066-1068, and lines 1288-1289.
- **Observation**:
  `game.js:1262-1269`:
  ```javascript
  function buyLevel(idx) {
    playChiptuneSFX('click');
    if(!_doLevelPurchase(idx)) return;
    buildShopGrid();
    closeShop();
    setTimeout(() => startLevel(idx), 300);
  }
  ```
  `game.js:1288-1289` (Shop UI button):
  ```html
  <button class="shop-buy-btn" ${canAfford?'':'disabled'} onclick="buyLevel(${idx})">
  ```
  `game.js:1066-1068`:
  ```javascript
  function buyLevelFromSelect(idx) {
    if(!_doLevelPurchase(idx)) return;
    buildLevelSelectScreen();
  }
  ```
- **Why this is a problem**: `startShopQuizGate(idx)` (defined on line 448) is NEVER called when a user purchases a level pack. The quiz gate overlay (`#shop-quiz-overlay`) is bypassed, allowing immediate purchases without testing Korean vocabulary mastery as required by R2.
- **Suggestion**: Modify `buyLevel(idx)` and `buyLevelFromSelect(idx)` to invoke `startShopQuizGate(idx)` when `playerCurrencies.coins >= LEVEL_COST(idx)`. Complete `_doLevelPurchase(idx)` only inside `answerShopQuiz(isCorrect)` when `shopQuizState.correctCount >= 3`.

---

### 🔴 Critical Finding 2: [BUG / INTEGRITY VIOLATION] `_doLevelPurchase`, Trophy Buy, and Quiz Hints Bypass `spendCoins` & Mutate Local Primitive `gold`
- **Location**: `game.js` line 1255, line 3982, line 1133, line 1138.
- **Observation**:
  `game.js:1255` in `_doLevelPurchase(idx)`:
  ```javascript
  gold -= cost;
  ```
  `game.js:3982` in Trophy purchase event listener:
  ```javascript
  gold -= t.cost;
  ```
  `game.js:1133` & `1138` in Quiz hints:
  ```javascript
  gold -= 5; persistSave(); updateGoldHUD();
  ```
- **Why this is a problem**: `gold` is declared on line 192 as a primitive `let gold = 85;`. Subtracting from `gold` does NOT modify `playerCurrencies.coins`. When `persistSave()` runs, `collectSave()` returns `{ currencies: playerCurrencies, gold: playerCurrencies.coins }`. Because `playerCurrencies.coins` was never decremented, calling `syncGoldAlias()` or reloading the save restores `gold` to `playerCurrencies.coins`. This gives infinite coins and breaks the currency helper contract.
- **Suggestion**: Replace `gold -= cost` with `spendCoins(cost)` across all purchase and hint handlers. In `_doLevelPurchase(idx)`:
  ```javascript
  if (!spendCoins(cost)) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return false; }
  ```
  Similarly, use `spendCoins(t.cost)` for trophies, `spendCoins(5)` for initial hint, and `spendCoins(10)` for full hint.

---

## 3. Evaluation of Specific Check Items

| Item | Requirement | Status | Detailed Assessment |
|---|---|---|---|
| 1 | Save Schema v4 & Migration | ⚠️ PARTIAL | `save_data.json` has `v: 4`, `currencies`, and `gold` alias. `migrateSaveData()` upgrades legacy `v2`/`v3` saves. However, primitive `gold` mutations desync `playerCurrencies.coins` upon save. |
| 2 | Triple Currency Economy | ⚠️ PARTIAL | `addCoins`, `addGems`, `addHonor`, `spendCoins`, `spendGems` helper functions and HUD elements are implemented, but purchase handlers bypass `spendCoins` by mutating `gold -= cost` directly. |
| 3 | 80% SRS Word Mastery Hard-Locking | ✅ PASS | `isZoneUnlocked(zoneKey)` checks `calcLevelMastery(reqLevel) >= 80%` and correctly blocks entry to Arcade, Fishing, Dungeon, and Spell Duel in `FarmScene`. |
| 4 | Korean Quiz & Boss Gates | 🔴 FAIL | Boss Entrance Gates (Dungeon 3-q, Necromancer 5-q) function properly. However, Shop Purchase Quiz Gate (`startShopQuizGate`) is bypassed by `buyLevel()` and `buyLevelFromSelect()`. |
| 5 | Quest System & `#quest-overlay` | ✅ PASS | 6-Act Main Storyline, Daily (24h), and Weekly (7d) quests are cleanly implemented, integrated with game events (`checkQuestProgress`), and connected to `#quest-overlay`. |

---

## 4. Observation & Logic Chain

### Observation 1
In `game.js:448`, `startShopQuizGate(idx)` is defined and manages `#shop-quiz-overlay`. In `game.js:1262`, `buyLevel(idx)` is defined as:
```javascript
function buyLevel(idx) {
  playChiptuneSFX('click');
  if(!_doLevelPurchase(idx)) return;
  ...
}
```

### Logic Chain 1
1. `startShopQuizGate(idx)` is the function responsible for launching the 3-question Korean quiz gate.
2. `buyLevel(idx)` is triggered when clicking `🛒 Buy Now` in the shop UI (`line 1288`).
3. `buyLevel(idx)` calls `_doLevelPurchase(idx)` directly without calling `startShopQuizGate(idx)`.
4. Therefore, users can purchase level packs without ever answering the 3-question Korean quiz, violating Requirement R2.

### Observation 2
In `game.js:191-192`, state is initialized as:
```javascript
let playerCurrencies = { coins: 85, gems: 0, honor: 0 };
let gold = 85;
```
In `game.js:1255`, `_doLevelPurchase(idx)` executes `gold -= cost;`.
In `game.js:246-247`, `collectSave()` returns:
```javascript
currencies: playerCurrencies,
gold: playerCurrencies.coins,
```

### Logic Chain 2
1. `gold` is a primitive number, not an object reference to `playerCurrencies.coins`.
2. Executing `gold -= cost` reduces local `gold`, but leaves `playerCurrencies.coins` untouched.
3. `collectSave()` serializes `playerCurrencies.coins` as the saved currency state.
4. When `loadSave()` or `syncGoldAlias()` runs, `gold = playerCurrencies.coins` restores `gold` to its pre-purchase value.
5. Therefore, level purchases fail to deduct coins from `playerCurrencies`, breaking currency persistence and helper encapsulation.

---

## 5. Caveats
- No caveats. The codebase syntax is valid (`node -c game.js` passed), and all file paths and line numbers were verified independently.

---

## 6. Conclusion

**Verdict**: **REQUEST_CHANGES**

The implementation is well-structured in several areas (Quest UI, SRS hard-locking, Boss gates), but cannot be approved in its current state due to the Shop Quiz Gate bypass and the currency desync bug in level/trophy purchases.

---

## 7. Verification Method

To independently verify these findings:
1. Syntax check:
   ```bash
   node -c game.js
   ```
2. Check `startShopQuizGate` calls:
   ```powershell
   Select-String -Path game.js -Pattern "startShopQuizGate"
   ```
   *Expected output*: Only line 448 (definition). It is not called inside `buyLevel` or `buyLevelFromSelect`.
3. Check direct `gold` mutations:
   ```powershell
   Select-String -Path game.js -Pattern "gold\s*-="
   ```
   *Expected output*: Lines 1133, 1138, 1255, 3982 directly mutate `gold` instead of calling `spendCoins()`.
