# Hangeul Valley - Top HUD & Responsive Layout Design Specification

**Author**: Explorer 3 (CSS & UX Layout Architect)  
**Date**: 2026-07-23  
**Target Files**: `index.html`, `assets/index.html`  
**Scope**: Read-only design & diagnosis for Milestone M1

---

## 1. Executive Summary & Overlap Diagnosis

### 1.1 Current Overlap Cause (Root Cause Analysis)

In `index.html`, the top HUD elements (`#hud`, `#event-banner`, `#progress-bar-wrap`) are positioned independently using fixed positioning (`position: fixed`) and uncoordinated pixel offsets:

1. **`#hud`** (`index.html:217`):
   ```css
   position: fixed; top: 14px; left: 14px; z-index: 100;
   display: flex; align-items: center; gap: 10px;
   ```
   `#hud` currently contains **20 individual items** in a single non-wrapping flex row: icon, level text, progress text, 3 currency badges (coins, gems, honor), active buff container, and **12 action buttons**. Its unconstrained desktop width is **~1600px+**.

2. **`#event-banner`** (`index.html:1163`):
   ```css
   position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 850;
   ```
   `#event-banner` sits horizontally in the center of the top screen area (`x = 50% - 200px` to `50% + 200px`) at `top: 10px`.

3. **`#progress-bar-wrap`** (`index.html:263`):
   ```css
   position: fixed; top: 14px; right: 14px; z-index: 100;
   ```
   `#progress-bar-wrap` sits at the top right corner (`top: 14px; right: 14px`).

#### Conflict at 1024px+ (Desktop):
- `#hud` starts at `x = 14px` and spans horizontally over 1600px. On a 1024px to 1440px desktop screen, `#hud` expands directly across `#event-banner` in the center and `#progress-bar-wrap` on the right.
- Text and buttons collide visually, making top buttons unclickable and obscuring the event banner and progress bar.

#### Conflict at 768px (Tablet):
- The `@media (max-width: 768px)` rule (`index.html:922`) forces `#hud` to:
  ```css
  top: 8px !important; left: 8px !important; right: 8px !important;
  max-width: calc(100vw - 16px); overflow-x: auto;
  ```
- However, `#event-banner` has **no media query overrides** and stays anchored at `top: 10px; left: 50%`.
- As a result, `#event-banner` renders **directly on top of `#hud`** at the center top of the screen (`y = 8px..48px`), causing a 100% z-index overlap collision and blocking button clicks.

---

## 2. Layout Architecture Solution

To eliminate all top-area pixel overlaps while retaining retro 64-bit glassmorphism aesthetics, we establish a **2-Tier Responsive Floating Dock Architecture**:

```
+---------------------------------------------------------------------------------------------------+
| TIER 1: TOP DOCKING BAR (y = 10px - 56px)                                                          |
| +-------------------------------------------------------+   +-----------------------------------+ |
| | #hud (Glass Container)                                |   | #progress-bar-wrap (Glass Pill)   | |
| | [STATUS] 🌾 Level 1 | 🌱 0  [BUFFS]                  |   | Progress [======    ]             | |
| | [CURRENCY] 🪙 1,250  💎 45  🎖️ 120                   |   +-----------------------------------+ |
| | [ACTIONS] 📖Vocab 🏪Shop 📜Quests 🍳Cook 🐾Pets 💾Save ➕More ☰Menu                              | |
| +-------------------------------------------------------+                                         |
|                                                                                                   |
| TIER 2: EVENT SUB-BANNER (y = 66px - 106px)                                                       |
|                 +-------------------------------------------------------------+                   |
|                 | #event-banner (Glass Pill, Centered)                        |                   |
|                 | 🌾 추석 Harvest Festival  Pts: 150 ⭐ [🎉 Festival] [🔄]       |                   |
|                 +-------------------------------------------------------------+                   |
+---------------------------------------------------------------------------------------------------+

When ➕ More button is clicked:
                                        +---------------------------------------+
                                        | #hud-overflow-menu (Glass Dropdown)   |
                                        | 🎉 Event (Seasonal Festival)          |
                                        | 🏅 Ranks (Local Leaderboards)         |
                                        | ⚡ Duel  (Spell Quiz Duel)            |
                                        | 🐟 Fish  (Fish Encyclopedia)          |
                                        | 🏆 Trophies (Achievements)            |
                                        +---------------------------------------+
```

---

## 3. Structural Item Grouping

The 20+ HUD items are restructured into **3 clear, scannable sub-groups** inside `#hud`:

### 3.1 Group 1: Status Group (`#hud-status-group`)
- **Icon**: `🌾`
- **Level Badge**: `<span id="hud-level">Level 1</span>`
- **Separator**: `<span id="hud-sep">|</span>`
- **Progress Pill**: `<span id="hud-progress">🌱 0</span>`
- **Active Buffs Container**: `<div id="active-buff-bar"></div>`

### 3.2 Group 2: Currency Group (`#hud-currency-group`)
- **Coins Badge**: `<span id="hud-gold" title="Coins">🪙 <span id="gold-val">0</span></span>`
- **Gems Badge**: `<span id="hud-gems" title="Gems">💎 <span id="gems-val">0</span></span>`
- **Honor Badge**: `<span id="hud-honor" title="Honor">🎖️ <span id="honor-val">0</span></span>`

### 3.3 Group 3: Action Buttons Group (`#hud-actions-group`)
Restructured to display **exactly 8 top-level buttons** (≤ 8 limit), with the remaining 5 feature buttons grouped inside an overflow dropdown (`#hud-overflow-menu`).

#### Top-Level Visible Buttons (8 items):
1. `#vocab-btn` — `📖 Vocab` (Core vocabulary book)
2. `#shop-btn` — `🏪 Shop` (Seed shop)
3. `#quest-btn` — `📜 Quests` (`openQuestOverlay()`)
4. `#recipe-btn` — `🍳 Cook` (`openRecipeBook()`)
5. `#pet-btn` — `🐾 Pets` (`openPetOverlay()`)
6. `#save-btn` — `💾 Save` (`saveAllGame()`)
7. `#hud-more-btn` — `➕ More` (`toggleHudOverflow()`)
8. `#hud-menu-btn` — `☰ Menu` (Level menu)

#### Overflow Dropdown Buttons (`#hud-overflow-menu`, 5 items):
1. `#seasonal-btn` — `🎉 Event` (`openSeasonalOverlay()`)
2. `#leaderboard-btn` — `🏅 Ranks` (`openLeaderboard()`)
3. `#duel-btn` — `⚡ Duel` (`openSpellDuel()`)
4. `#fish-album-btn` — `🐟 Fish` (`openFishAlbum()`)
5. `#trophy-btn` — `🏆 Trophies` (Trophy collection)

*Note: All element IDs, `onclick` attributes, and `game.js` event listeners are 100% preserved.*

---

## 4. Proposed HTML Markup Code

Replace lines 1206–1264 of `index.html` (and mirrored `assets/index.html`) with the following HTML:

```html
  <!-- ══════════════ SEASONAL EVENT BANNER UI (TIER 2 SUB-BANNER) ══════════════════════ -->
  <div id="event-banner" class="glass-hud neon-border-gold">
    <div class="eb-left">
      <span class="eb-icon" id="eb-icon">🌾</span>
      <div>
        <div class="eb-title" id="eb-title">추석 (Chuseok) Harvest Festival</div>
        <div class="eb-subtitle" id="eb-desc">Bake Songpyeon & earn +50% Bonus Honor!</div>
      </div>
    </div>
    <div class="eb-right">
      <div class="eb-pts-badge">Pts: <span id="eb-pts-val">0</span> ⭐</div>
      <button class="eb-btn" onclick="openSeasonalOverlay()">🎉 Festival</button>
      <button class="eb-btn-switch" onclick="cycleSeasonalEvent()" title="Cycle Active Event Season">🔄</button>
    </div>
  </div>

  <!-- ══════════════ MAIN HUD BAR (TIER 1 TOP DOCK) ═══════════════════════ -->
  <div id="hud" class="glass-hud" style="display:none">
    <!-- Group 1: Status -->
    <div id="hud-status-group" class="hud-group">
      <span style="font-size:20px">🌾</span>
      <span id="hud-level">Level 1</span>
      <span id="hud-sep">|</span>
      <span id="hud-progress">🌱 0</span>
      <div id="active-buff-bar" style="display:inline-flex; gap:6px; align-items:center;"></div>
    </div>

    <!-- Group 2: Currency -->
    <div id="hud-currency-group" class="hud-group">
      <span id="hud-gold" title="Coins">🪙 <span id="gold-val">0</span></span>
      <span id="hud-gems" style="margin-left:4px;" title="Gems">💎 <span id="gems-val">0</span></span>
      <span id="hud-honor" style="margin-left:4px;" title="Honor">🎖️ <span id="honor-val">0</span></span>
    </div>

    <!-- Group 3: Primary Action Buttons + Overflow Menu -->
    <div id="hud-actions-group" class="hud-group">
      <button class="hud-btn" id="vocab-btn" title="Vocabulary Book">📖 Vocab</button>
      <button class="hud-btn" id="shop-btn" title="Seed shop">🏪 Shop</button>
      <button class="hud-btn" id="quest-btn" title="Quest Log" onclick="openQuestOverlay()">📜 Quests</button>
      <button class="hud-btn" id="recipe-btn" title="Recipe Book (요리책)" onclick="openRecipeBook()">🍳 Cook</button>
      <button class="hud-btn" id="pet-btn" title="Pet Companions (반려동물)" onclick="openPetOverlay()">🐾 Pets</button>
      <button class="hud-btn" id="save-btn" title="Save game" onclick="saveAllGame()">💾 Save</button>
      <button class="hud-btn" id="hud-more-btn" title="More Features" onclick="toggleHudOverflow(event)">➕ More</button>
      <button class="hud-btn hud-btn-menu" id="hud-menu-btn" title="Level Menu">☰ Menu</button>

      <!-- Overflow Dropdown Panel -->
      <div id="hud-overflow-menu" class="glass-bg neon-border hidden">
        <button class="hud-btn hud-overflow-item" id="seasonal-btn" title="Seasonal Events" onclick="openSeasonalOverlay(); toggleHudOverflow(false);">🎉 Event</button>
        <button class="hud-btn hud-overflow-item" id="leaderboard-btn" title="Local Leaderboard" onclick="openLeaderboard(); toggleHudOverflow(false);">🏅 Ranks</button>
        <button class="hud-btn hud-overflow-item" id="duel-btn" title="Spell Duel" onclick="openSpellDuel(); toggleHudOverflow(false);">⚡ Duel</button>
        <button class="hud-btn hud-overflow-item" id="fish-album-btn" title="Fish Encyclopedia" onclick="openFishAlbum(); toggleHudOverflow(false);">🐟 Fish</button>
        <button class="hud-btn hud-overflow-item" id="trophy-btn" title="Trophies" onclick="toggleHudOverflow(false);">🏆 Trophies</button>
      </div>
    </div>
  </div>

  <!-- Progress Bar (Tier 1 Top Right) -->
  <div id="progress-bar-wrap" style="display:none">
    <span>Progress</span>
    <div id="progress-bar-bg"><div id="progress-bar-fill"></div></div>
  </div>
```

---

## 5. Proposed CSS Code & Media Queries

Update CSS rules in `<style>` block of `index.html` (and `assets/index.html`):

```css
/* ── MAIN HUD BAR & GROUPS ───────────────────────────────────────────── */
#hud {
  position: fixed; top: 10px; left: 14px;
  max-width: calc(100vw - 260px);
  z-index: 100;
  background: rgba(15, 23, 42, 0.88) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  border: 2px solid var(--neon-gold) !important;
  border-radius: 14px !important; padding: 6px 14px !important;
  color: #e2e8f0; font-size: 14px; font-weight: 700;
  box-shadow: 0 0 0 2px #0f172a, var(--glow-gold), 0 10px 30px rgba(0, 0, 0, 0.7) !important;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  user-select: none;
}

.hud-group {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}

#hud-status-group {
  font-family: 'Press Start 2P', monospace; font-size: 11px; color: var(--neon-gold);
}

#hud-currency-group {
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0 10px;
}

#hud-actions-group {
  position: relative;
}

/* ── HUD OVERFLOW DROPDOWN MENU ──────────────────────────────────────── */
#hud-overflow-menu {
  position: absolute; top: calc(100% + 8px); right: 0;
  z-index: 950; display: flex; flex-direction: column; gap: 6px;
  padding: 10px; min-width: 170px;
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  border: 1.5px solid var(--neon-gold) !important;
  border-radius: 12px !important;
  box-shadow: 0 0 0 2px #0f172a, var(--glow-gold), 0 14px 36px rgba(0, 0, 0, 0.8) !important;
  animation: popIn .18s cubic-bezier(.4,0,.2,1);
}
#hud-overflow-menu.hidden { display: none !important; }

.hud-overflow-item {
  width: 100%; text-align: left;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px !important; font-size: 10px !important;
  border-radius: 6px !important;
}

/* ── PROGRESS BAR ────────────────────────────────────────────────────── */
#progress-bar-wrap {
  position: fixed; top: 10px; right: 14px; z-index: 100;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1.5px solid var(--neon-green); border-radius: 12px;
  padding: 6px 14px 6px 12px; height: 44px;
  color: var(--neon-green); font-family: 'VT323', monospace; font-size: 19px;
  display: flex; align-items: center; gap: 10px; pointer-events: none;
  box-shadow: 0 0 0 2px #0f172a, var(--glow-green);
}

/* ── SEASONAL EVENT BANNER (TIER 2) ─────────────────────────────────── */
#event-banner {
  position: fixed; top: 66px; left: 50%; transform: translateX(-50%); z-index: 850;
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  width: max-content; max-width: 90vw; padding: 6px 16px;
  background: rgba(15, 23, 42, 0.9); backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1.5px solid var(--neon-gold); border-radius: 24px;
  box-shadow: var(--glow-gold), 0 8px 24px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

/* ── RESPONSIVE MEDIA QUERIES (TABLET 768px & MOBILE 480px) ─────────── */
@media (max-width: 768px) {
  #hud {
    top: 8px !important; left: 8px !important; right: 8px !important;
    max-width: calc(100vw - 16px) !important;
    padding: 6px 10px !important; gap: 8px !important;
    border-radius: 12px !important;
    flex-wrap: wrap;
  }
  .hud-group { gap: 6px; }
  #hud-currency-group { border-left: none; border-right: none; padding: 0 2px; }
  .hud-btn { padding: 5px 8px !important; font-size: 9px !important; }

  #progress-bar-wrap { top: 64px; right: 8px; font-size: 15px; padding: 4px 10px; height: 36px; }
  #progress-bar-bg { width: 80px; height: 10px; }

  #event-banner {
    top: 106px; left: 50%; transform: translateX(-50%);
    padding: 5px 12px; gap: 8px; border-radius: 18px;
  }
  .eb-title { font-size: 9px; }
  .eb-subtitle { display: none; }
}

@media (max-width: 480px) {
  #hud { padding: 6px 8px !important; gap: 6px !important; }
  #hud-gold, #hud-gems, #hud-honor { padding: 2px 6px !important; font-size: 9px !important; }
  #progress-bar-wrap { top: 86px; right: 8px; }
  #event-banner { top: 128px; max-width: 96vw; }
}
```

---

## 6. JavaScript Helper Function Specification

Add the following lightweight script snippet to `index.html` (before `</body>`):

```html
<script>
  function toggleHudOverflow(evt) {
    if (evt && evt.stopPropagation) evt.stopPropagation();
    const menu = document.getElementById('hud-overflow-menu');
    if (!menu) return;
    if (typeof evt === 'boolean') {
      menu.classList.toggle('hidden', !evt);
    } else {
      menu.classList.toggle('hidden');
    }
  }

  // Auto-close overflow menu on click outside
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('hud-overflow-menu');
    const moreBtn = document.getElementById('hud-more-btn');
    if (menu && !menu.classList.contains('hidden')) {
      if (!menu.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
        menu.classList.add('hidden');
      }
    }
  });
</script>
```

---

## 7. Synchronization Requirement

As per `PROJECT.md` interface guidelines, `index.html` and `assets/index.html` must remain 100% mirrored in markup and CSS. The implementer must apply these updates identically to both files.
