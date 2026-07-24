# M2 Pet Companion System Analysis & Removal Blueprint

**Project**: Hangeul Valley  
**Target Module**: Complete Pet Companion System Removal  
**Target Files**: `game.js`, `assets/game.js`, `index.html`, `assets/index.html`  
**Date**: 2026-07-24  

---

## 1. Executive Summary

This report provides a comprehensive removal map and blueprint for completely decoupling and eliminating the **Pet Companion System (반려동물)** from the Hangeul Valley codebase.

The investigation mapped **100% of pet-related elements** across textures, runtime state variables, system methods, economy/passive hooks, persistence routines, HTML elements, and CSS stylesheets. 

Both `game.js` and `assets/game.js` maintain byte-identical logic (11,794 lines), and `index.html` and `assets/index.html` maintain identical UI structure (1,895 lines). All line numbers specified in this document apply to both pairs.

---

## 2. Element Classification Matrix

| Category | Element Identifiers | File & Line Range | Description / Impact |
|---|---|---|---|
| **Textures** | `_genPetTextures`, `pet_shiba`, `pet_cat`, `pet_dragon`, `pet_slime`, `pet_fox`, `pet_penguin`, `P_PET_SHIBA`, `P_PET_CAT`, `P_PET_DRAGON`, `P_PET_SLIME`, `P_PET_FOX`, `P_PET_PENGUIN` | `game.js`: 259, 3598–3751 | Static texture baking method and pixel matrices for 6 pet companion sprites. |
| **State / Variables** | `petState`, `activePet`, `petSprite`, `petShadow` | `game.js`: 3869–3872, 8323–8367 | Runtime state object storing pet collection and active pet ID, plus scene sprite instances. |
| **Core Functions** | `PET_DB`, `isPetActive`, `getPetPassiveMultiplier`, `decayPetHappiness`, `addPetXP`, `_updatePetCompanion` | `game.js`: 8323–8367, 11156–11216 | Core pet database, status checkers, decay timer, XP adder, and scene follow loop. |
| **UI Functions** | `openPetOverlay`, `closePetOverlay`, `adoptPet`, `equipPet`, `feedActivePet`, `startPetLevelUpQuiz` | `game.js`: 4820, 11218–11377 | Window handlers for modal opening, closing, pet adoption, equipping, feeding, and quiz trigger. |
| **Economy & Gameplay Hooks** | `addCoins` (dog passive), `_harvestAppleTree` (hamster passive & XP), `_harvestPlot` (hamster passive & XP), `catchSuccess` (XP), `onMinigameComplete` (XP), `buffHUDInterval` (decay call) | `game.js`: 4024–4026, 8247–8252, 8820–8825, 10233, 10917, 11120 | Inter-system passive bonuses and XP reward hooks scattered across fishing, farming, cooking, and economy routines. |
| **Save / Load Persistence** | `migrateSaveData`, `collectSave`, `applySave` | `game.js`: 3904, 3940, 3967 | Persistence schema keys (`pets`) for saving/loading pet collection and active pet state. |
| **Leaderboard Integration** | `updateLeaderboardMetrics`, `openLeaderboard`, `switchLeaderboardTab`, `LOCAL_RIVALS` | `game.js`: 11601–11604, 11642–11643, 11669, 11707, 11721, 11732, 11760 | Leaderboard metrics computation, personal best grid entry, tab filtering (`pets`), and rival entry fields (`petsPct`). |
| **HTML UI Elements** | `#pet-btn`, `#pet-overlay`, `#pet-panel`, `#pet-active-card`, `#pet-roster-container`, `#lbtab-pets` | `index.html`: 1315, 1760–1783, 1852 | Top HUD button, pet overlay modal container, active pet card container, roster grid container, leaderboard tab button. |
| **CSS Rules** | `#pet-overlay`, `#pet-overlay.visible`, `.pet-roster-grid`, `.pet-card`, `.pet-card.active`, `.pet-card-avatar`, `.pet-card-name`, `.pet-card-level`, `.pet-card-passive`, `.pet-bar-bg`, `.pet-bar-fill-xp`, `.pet-bar-fill-happy` | `index.html`: 1165, 1171, 1196–1211 | Modal visibility flexbox rules and card styling rules. |

---

## 3. Comprehensive File-by-File Removal Map

### A. `game.js` & `assets/game.js`

#### 1. Texture Generation
- **Line 259**: Delete call `this._genPetTextures(scene);` in `TextureGenerator.generateAll()`.
- **Lines 3598–3751**: Delete entire method `static _genPetTextures(scene) { ... }`.

#### 2. Persistence & State Management
- **Lines 3869–3872**: Delete `var petState = { collection: [...], activePet: 'dog' };`.
- **Line 3904**: Delete `data.pets = data.pets || { ... };` in `migrateSaveData()`.
- **Line 3940**: Delete `pets: petState,` in `collectSave()`.
- **Line 3967**: Delete `if(migrated.pets) petState = migrated.pets;` in `applySave()`.

#### 3. Economy & Gameplay Hooks
- **Lines 4024–4026**: Delete Dog passive multiplier check in `addCoins()`:
  ```javascript
  if (typeof isPetActive === 'function' && isPetActive('dog')) {
    finalAmt = Math.round(finalAmt * (1.0 + 0.15 * getPetPassiveMultiplier('dog')));
  }
  ```
- **Line 4820**: Delete `else if (overlayId === 'pet-overlay') window.closePetOverlay();` in `closeModalById()`.
- **Lines 8247–8250 & 8252**: Delete Hamster passive check and XP call in `_harvestAppleTree()`:
  ```javascript
  if (typeof isPetActive === 'function' && isPetActive('hamster') && Math.random() < 0.30 * getPetPassiveMultiplier('hamster')) { ... }
  if (typeof addPetXP === 'function') addPetXP(10);
  ```
- **Lines 8323–8367**: Delete method `_updatePetCompanion(dt) { ... }` in `FarmScene`.
- **Line 8479**: Delete `this._updatePetCompanion(dt);` in `FarmScene.update()`.
- **Lines 8820–8823 & 8825**: Delete Hamster passive check and XP call in `_harvestPlot()`:
  ```javascript
  if (typeof isPetActive === 'function' && isPetActive('hamster') && Math.random() < 0.30 * getPetPassiveMultiplier('hamster')) { ... }
  if (typeof addPetXP === 'function') addPetXP(10);
  ```
- **Line 10233**: Delete `if (typeof addPetXP === 'function') addPetXP(15);` in `catchSuccess()`.
- **Line 10917**: Delete `decayPetHappiness();` in `buffHUDInterval` interval loop.
- **Line 11120**: Delete `addPetXP(20);` in `onMinigameComplete()`.

#### 4. Pet Companion Module Block
- **Lines 11156–11377**: Delete the entire block from section header `// ═══════════════ R4: PET COMPANION SYSTEM ═════════════════════════════════════` through `window.startPetLevelUpQuiz`.
  - Removes `PET_DB`, `isPetActive`, `getPetPassiveMultiplier`, `decayPetHappiness`, `addPetXP`, `openPetOverlay`, `closePetOverlay`, `adoptPet`, `equipPet`, `feedActivePet`, `startPetLevelUpQuiz`.

#### 5. Leaderboard System
- **Lines 11601–11604**: Remove `petsPct` property from all `LOCAL_RIVALS` entries. Update Ha-eun's title from `'Pet Companion 🎨'` to `'Art Artisan 🎨'`.
- **Lines 11642–11643**: Delete pet metric calculation in `updateLeaderboardMetrics()`:
  ```javascript
  const petCount = (petState?.collection || []).length;
  leaderboardState.personalBests.petCollectionPct = Math.round((petCount / 5) * 100);
  ```
- **Line 11669**: Delete `<div ...>🐾 Pets Collected: ...</div>` in `openLeaderboard()`.
- **Line 11707**: Delete `petsPct: pb.petCollectionPct || 20,` in `playerEntry`.
- **Line 11721**: Delete `if (tabId === 'pets') return b.petsPct - a.petsPct;` sorting branch in `switchLeaderboardTab()`.
- **Line 11732**: Delete `if (tabId === 'pets') valColHeader = 'Pet Collection %';` header branch.
- **Line 11760**: Delete `if (tabId === 'pets') displayVal = \`${entry.petsPct}%\`;` display branch.

---

### B. `index.html` & `assets/index.html`

#### 1. CSS Stylesheet
- **Line 1165**: Remove `, #pet-overlay` from `#recipe-overlay, #cooking-minigame-overlay, #cultural-fact-overlay, #pet-overlay`.
- **Line 1171**: Remove `, #pet-overlay.visible` from `#recipe-overlay.visible, #cooking-minigame-overlay.visible, #cultural-fact-overlay.visible, #pet-overlay.visible`.
- **Lines 1196–1211**: Delete all pet CSS rules (`.pet-roster-grid`, `.pet-card`, `.pet-card.active`, `.pet-card-avatar`, `.pet-card-name`, `.pet-card-level`, `.pet-card-passive`, `.pet-bar-bg`, `.pet-bar-fill-xp`, `.pet-bar-fill-happy`).

#### 2. Navigation HUD
- **Line 1315**: Delete HUD button `<button class="hud-btn" id="pet-btn" title="Pet Companions (반려동물)" onclick="openPetOverlay()">🐾 Pets</button>`.

#### 3. Modal Overlays
- **Lines 1760–1783**: Delete entire HTML modal block `<!-- ══════════════ PET COMPANION (반려동물) OVERLAY ══════════════ -->` containing `<div id="pet-overlay">...</div>`.

#### 4. Leaderboard Overlay
- **Line 1852**: Delete Leaderboard tab button `<button class="lb-tab-btn" id="lbtab-pets" onclick="switchLeaderboardTab('pets')">🐾 Pet Collection</button>`.

---

## 4. Dependencies & Safety Verification Safeguards

1. **Defensive Coding Hooks**: The existing codebase uses defensive guards (`typeof isPetActive === 'function'`, `typeof addPetXP === 'function'`). When these functions are deleted, any lingering call (if missed) would evaluate to false without crashing. However, all call sites specified in Section 3 will be explicitly deleted to keep the codebase clean.
2. **Save Data Backward Compatibility**: Removing `petState` and `pets` from `collectSave` and `applySave` will not corrupt legacy save files. Older save data files with `data.pets` will simply ignore the unmapped `pets` property upon load.
3. **Synchronization Verification**: Any modifications made to `game.js` MUST be mirrored identically in `assets/game.js`. Likewise, modifications to `index.html` MUST be mirrored identically in `assets/index.html`.
4. **Verification Method**:
   - Run `node -c game.js` and `node -c assets/game.js`.
   - Run `node scripts/verify_m2_m3.js` to ensure byte sync and syntax validity.
   - Execute grep search for `petState`, `petSprite`, `petShadow`, `_updatePetCompanion`, `_genPetTextures`, `isPetActive`, `getPetPassiveMultiplier`, `addPetXP`, `#pet-overlay` across `game.js`, `assets/game.js`, `index.html`, `assets/index.html` to confirm **0 occurrences**.

---

## 5. Handoff & Next Steps

This analysis provides an exact line-by-line blueprint for the implementation agent (Implementer). Once the removal is performed, verification tests can validate complete pet system removal and clean execution.
