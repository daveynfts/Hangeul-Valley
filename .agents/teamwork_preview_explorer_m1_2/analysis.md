# Analysis: JS HUD Bindings Inspection (`game.js`)

**Target File**: `C:\VibeCode\Hangeul Valley\game.js`  
**HTML File Reference**: `C:\VibeCode\Hangeul Valley\index.html`  
**Inspector**: Explorer 2 (JS HUD Bindings Inspector)  
**Timestamp**: 2026-07-23T01:45:45Z  

---

## 1. Executive Summary

This report analyzes all JavaScript DOM element references, state update functions, event listeners, and layout assumptions in `game.js` that interact with the top HUD (`#hud`), Seasonal Event Banner (`#event-banner`), Progress Bar (`#progress-bar-wrap`), currency displays (`#gold-val`, `#gems-val`, `#honor-val`), active buffs container (`#active-buff-bar`), and the 12 top action buttons.

### Key Finding
**`game.js` relies strictly on direct ID lookups (`document.getElementById(id)` or `$(id)` helper)**. It has **zero dependency on HTML element ordering, DOM tree hierarchy, or parent-child traversal** (`parentElement`, `children`, `nextElementSibling`, etc.) for any top HUD elements. Consequently, in Milestone 2 (M2), HTML restructuring, CSS grid/flex reorganization, button grouping, and dropdown menu creation can be performed safely as long as all target element IDs and event handlers (`onclick` / `addEventListener`) are preserved.

---

## 2. Complete Inventory of HUD Element IDs & JS Queries

The table below catalogs every top HUD element, its ID in `index.html` (and alias mapping), where/how `game.js` queries it, and its runtime purpose.

| Element Category | Element ID in `index.html` | Alias / Prompt Ref | Query Method in `game.js` | Line(s) in `game.js` | Purpose & Update Mechanism |
|---|---|---|---|---|---|
| **Top Container** | `hud` | `#hud` | `$('hud')` | 3053, 3216, 3221 | Top HUD container bar. Toggled `'none'` / `''` in `showLevelSelect()` / `hideLevelSelect()`. |
| **Event Banner** | `event-banner` | `#event-banner` | `document.getElementById('event-banner')` | 7771, 7787 | Seasonal banner container. Visibility set `display='flex'`, border color updated via `SEASONAL_EVENTS_CONFIG`. |
| **Progress Wrap** | `progress-bar-wrap` | `#progress-bar-wrap` | `$('progress-bar-wrap')` | 3053, 3216, 3221 | Outer wrapper for progress bar. Toggled `'none'` / `''` in `showLevelSelect()` / `hideLevelSelect()`. |
| **Progress Fill** | `progress-bar-fill` | `#progress-bar-fill` | `$('progress-bar-fill')` | 3054, 3085 | Inner fill `<div>`. Width updated dynamically in `updateHUD()` (`pbFill.style.width = pct + '%'`). |
| **Level Name** | `hud-level` | `#hud-level-name` / `#hud-level` | `$('hud-level')` | 3054, 3081 | Text node for active level. Updated in `updateHUD()` (`${lvl.icon} ${lvl.name}`). |
| **Level Progress** | `hud-progress` | `#hud-progress` | `$('hud-progress')` | 3054, 3084 | Text node for words planted. Updated in `updateHUD()` (`🌱 ${progress} words`). |
| **Currency: Gold** | `gold-val` | `#coins-val` / `#gold-val` | `document.getElementById('gold-val')` | 2463 | Displays gold coin count (`playerCurrencies.coins`). |
| **Gold Container** | `hud-gold` | `#hud-coins` / `#hud-gold` | `document.getElementById('hud-gold')` | 2476 | Gold badge wrapper. Briefly receives `.pop` CSS class in `updateCurrencyHUD(true)`. |
| **Currency: Gems** | `gems-val` | `#gems-val` | `document.getElementById('gems-val')` | 2470 | Displays gem count (`playerCurrencies.gems`). |
| **Currency: Honor** | `honor-val` | `#honor-val` | `document.getElementById('honor-val')` | 2472 | Displays honor point count (`playerCurrencies.honor`). |
| **Active Buff Bar** | `active-buff-bar` | `#active-buffs` / `#active-buff-bar` | `document.getElementById('active-buff-bar')` | 7197 | Container for dynamic buff badges. `updateBuffHUD()` clears `innerHTML` and appends `div.buff-badge`. |
| **Banner Icon** | `eb-icon` | N/A | `document.getElementById('eb-icon')` | 7775 | Displays seasonal event icon emoji. |
| **Banner Title** | `eb-title` | N/A | `document.getElementById('eb-title')` | 7777, 7780 | Displays seasonal event title & applies theme color. |
| **Banner Desc** | `eb-desc` | N/A | `document.getElementById('eb-desc')` | 7782 | Displays seasonal event active buff description. |
| **Banner Points** | `eb-pts-val` | N/A | `document.getElementById('eb-pts-val')` | 7784 | Displays active season event points (`seasonalState.seasonPoints`). |

---

## 3. Top Action Buttons Binding Matrix

There are 12 top-level action buttons in `#hud`. Below is the complete breakdown of how each button is bound (via HTML `onclick` attributes or JS `addEventListener`):

| Button Purpose | HTML `id` | Prompt ID Alias | Event Binding Mechanism | Handler / Target Function | Line(s) in `game.js` |
|---|---|---|---|---|---|
| **Recipe Book** | `recipe-btn` | `#btn-cook` | HTML `onclick="openRecipeBook()"` | `openRecipeBook()` | 7230 |
| **Pet Companions** | `pet-btn` | `#btn-pets` | HTML `onclick="openPetOverlay()"` | `openPetOverlay()` | 7526 |
| **Seasonal Event** | `seasonal-btn` | `#btn-event` | HTML `onclick="openSeasonalOverlay()"` | `openSeasonalOverlay()` | 7806 |
| **Leaderboard** | `leaderboard-btn` | `#btn-ranks` | HTML `onclick="openLeaderboard()"` | `openLeaderboard()` | 7966 |
| **Quest Log** | `quest-btn` | `#btn-quests` | HTML `onclick="openQuestOverlay()"` | `openQuestOverlay()` | 2752 |
| **Save Game** | `save-btn` | `#btn-save` | HTML `onclick="saveAllGame()"` + JS `$('save-btn')` | `saveAllGame()` | 2901, 2903 |
| **Spell Duel** | `duel-btn` | `#btn-duel` | HTML `onclick="openSpellDuel()"` | `openSpellDuel()` | 6830 |
| **Fish Encyclopedia**| `fish-album-btn` | `#btn-fish` | HTML `onclick="openFishAlbum()"` | `openFishAlbum()` | 6593 |
| **Trophies** | `trophy-btn` | `#btn-trophies` | JS `addEventListener('click', ...)` | `window.openTrophies` / `openTrophies()` | 6753, 6808 |
| **Seed Shop** | `shop-btn` | `#btn-shop` | JS `addEventListener('click', ...)` | `openShop()` | 3453, 3398 |
| **Vocab Book** | `vocab-btn` | `#btn-vocab` | JS `addEventListener('click', ...)` | `vocabOverlay.classList.contains(...)` | 3066, 3643 |
| **Level Menu** | `hud-menu-btn` | `#btn-menu` | JS `addEventListener('click', ...)` | `closeQuiz(); showLevelSelect()` | 3066, 3648 |

---

## 4. JS Functions Updating HUD Elements

Below is a detailed analysis of every function in `game.js` that modifies or interacts with HUD state and DOM elements:

### 4.1 `updateHUD()` (Lines 3078–3087)
- **Trigger**: Called whenever level state or progress changes (e.g. planting words, level initialization).
- **HUD Operations**:
  - Updates `hudLevelEl.textContent` (`#hud-level`) to current level icon and name (`${lvl.icon||'🌾'} ${lvl.name}`).
  - Updates `hudProgressEl.textContent` (`#hud-progress`) to `🌱 ${progress} words`.
  - Calculates percentage (`pct`) of planted words relative to total level words.
  - Updates `pbFill.style.width` (`#progress-bar-fill`) to `pct + '%'`.
  - Invokes `updateGoldHUD()`.

### 4.2 `updateCurrencyHUD(pop = false)` & `updateGoldHUD(pop = false)` (Lines 2462–2483)
- **Trigger**: Called on earning/spending gold, gems, or honor (e.g., harvesting crops, completing quests, buying packs/items).
- **HUD Operations**:
  - Sets `gold-val.textContent` = `playerCurrencies.coins`.
  - Sets `shop-gold-val.textContent` = `playerCurrencies.coins`.
  - Sets `trophy-gold-val.textContent` = `playerCurrencies.coins`.
  - Sets `gems-val.textContent` = `playerCurrencies.gems`.
  - Sets `honor-val.textContent` = `playerCurrencies.honor`.
  - If `pop === true`, adds CSS class `'pop'` to `#hud-gold` and removes it after 300ms.

### 4.3 `updateBuffHUD()` (Lines 7196–7216)
- **Trigger**: Called on `applyBuff()` and automatically every 1000ms via `window.buffHUDInterval`.
- **HUD Operations**:
  - Retrieves `#active-buff-bar`.
  - Clears existing badges: `bar.innerHTML = ''`.
  - Iterates through `activeBuffs` dictionary. Removes expired buffs.
  - Creates a new `div.buff-badge` for each active buff with formatted remaining time (`m:ss`), icon, and tooltip title (`badge.title = buff.name`). Appends badge to `#active-buff-bar`.

### 4.4 `updateSeasonalBanner()` (Lines 7769–7788)
- **Trigger**: Called on game startup (`initSeasonalEvents()`) and when cycling seasonal festivals (`cycleSeasonalEvent()`).
- **HUD Operations**:
  - Reads active season configuration from `SEASONAL_EVENTS_CONFIG[seasonalState.activeSeasonId]`.
  - Sets `#event-banner` border color (`bannerEl.style.borderColor = cfg.themeColor`).
  - Sets `#eb-icon` text to festival icon emoji.
  - Sets `#eb-title` text and text color to festival name and theme color.
  - Sets `#eb-desc` text to festival buff text.
  - Sets `#eb-pts-val` text to `seasonalState.seasonPoints`.
  - Forces `#event-banner` display to `'flex'` (`bannerEl.style.display = 'flex'`).

### 4.5 `showLevelSelect()` & `hideLevelSelect()` (Lines 3214–3222)
- **Trigger**: Called when user toggles level select screen or opens main level menu.
- **HUD Operations**:
  - `showLevelSelect()`: Hides top UI elements by setting `hud.style.display = pbWrap.style.display = tipEl.style.display = 'none'`.
  - `hideLevelSelect()`: Restores top UI elements by setting `hud.style.display = pbWrap.style.display = tipEl.style.display = ''`.

---

## 5. Verification of DOM Parent/Child & Ordering Assumptions

We performed a comprehensive code search across `game.js` for DOM hierarchy navigation methods (`parentElement`, `children`, `firstElementChild`, `nextElementSibling`, `closest`, relative `querySelector`).

### Findings:
1. **Zero Traversal on Top HUD**:
   - `game.js` **never** calls `.parentElement`, `.children`, `.nextElementSibling`, or `.closest()` on `#hud`, `#event-banner`, `#progress-bar-wrap`, currency badges, or top action buttons.
   - All references to top HUD components use explicit ID lookups (`document.getElementById(id)` or `$(id)`).
2. **Modal Internal Children References (Non-HUD)**:
   - DOM child queries exist strictly inside specific game overlays (e.g. `memory-grid.children` in Memory mini-game at lines 6703-6724; `duel-options-grid.querySelectorAll('.duel-option-btn')` in Duel overlay at line 6963). These do not touch or affect the top HUD.
3. **Display Restoration Behavior**:
   - `hideLevelSelect()` sets `hud.style.display = ''`. This resets inline `display` to empty, allowing `#hud` to naturally inherit whatever layout system (`flex`, `grid`, `inline-flex`) is specified in stylesheet rules.

---

## 6. Recommendations for Milestone 2 (HUD Redesign Implementation)

1. **Preserve All Element IDs**:
   Keep `#hud`, `#event-banner`, `#progress-bar-wrap`, `#progress-bar-fill`, `#hud-level`, `#hud-progress`, `#hud-gold`, `#gold-val`, `#hud-gems`, `#gems-val`, `#hud-honor`, `#honor-val`, `#active-buff-bar`, `#eb-icon`, `#eb-title`, `#eb-desc`, `#eb-pts-val`, `#controls-tip` unchanged in HTML.
2. **Preserve All 12 Action Button IDs & Handlers**:
   - Keep button IDs: `recipe-btn`, `pet-btn`, `seasonal-btn`, `leaderboard-btn`, `quest-btn`, `save-btn`, `duel-btn`, `fish-album-btn`, `trophy-btn`, `shop-btn`, `vocab-btn`, `hud-menu-btn`.
   - Preserve `onclick` attributes for the 8 HTML-wired buttons (`openRecipeBook()`, `openPetOverlay()`, `openSeasonalOverlay()`, `openLeaderboard()`, `openQuestOverlay()`, `saveAllGame()`, `openSpellDuel()`, `openFishAlbum()`).
   - Preserve IDs for the 4 JS-wired buttons (`trophy-btn`, `shop-btn`, `vocab-btn`, `hud-menu-btn`).
3. **Layout Flexibility**:
   The implementer can introduce new wrapping containers (e.g. `<div class="hud-left">`, `<div class="hud-center">`, `<div class="hud-right">`, `<div class="hud-dropdown-menu">`) or restructure the DOM hierarchy inside `#hud` without breaking any JavaScript code.
