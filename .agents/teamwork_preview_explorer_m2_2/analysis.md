# Technical Analysis & Architectural Specification: Cooking UI Modal & HUD Integration (Milestone 2)

**Explorer 2 Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m2_2`  
**Target Files**: `index.html`, `game.js`, `assets/index.html`, `assets/game.js`  
**Date**: 2026-07-24  

---

## 1. Executive Summary

This report establishes the complete structural, visual, and behavioral specification for the **Cooking UI Modal & HUD Integration** in **Hangeul Valley** (Milestone 2).

### Key Architectural Deliverables
1. **Modal Convention Audit**: Analysis of existing glassmorphism modals (`.glass-modal`, `#inventory-overlay`, `#quest-overlay`) to ensure 100% design system alignment.
2. **`#cooking-overlay` & `#cooking-panel` Design**: Glassmorphic modal overlay containing recipe selection grid, ingredient cards with dynamic `owned / needed` color-coded status badges, cook action buttons with input validation state, reward badges for XP, Gold & Buffs, and recipe completion tracking.
3. **HUD Action Button Integration**: Primary action button (`🍳 Cooking` / `요리`) placed seamlessly inside `#hud-actions-group`.
4. **Hotkey System ('C' / 'c') & Input Focus Guard**: Dedicated keyboard shortcut to toggle cooking UI, guarded by DOM input focus detection to prevent accidental triggers while typing in text fields.
5. **Dual-File Synchronization Specification**: Explicit blueprints for mirroring changes between `index.html` <-> `assets/index.html` and `game.js` <-> `assets/game.js`.

---

## 2. Examination of `index.html` Modal Conventions

### 2.1 CSS Design System Parameters
All overlay modals in Hangeul Valley follow a strict 64-bit glassmorphic theme defined in `index.html`:

| CSS Property | Modal Overlay standard | Glass Panel (`.glass-modal`) standard |
|---|---|---|
| **Positioning** | `fixed; inset: 0; align-items: center; justify-content: center;` | `position: relative; max-height: 88vh; overflow-y: auto;` |
| **Z-Index** | `870` (Inventory) / `880` (Quest) / `890` (Recipe/Cooking) | Inherits overlay stack level above Phaser canvas (`z-index: 1`) |
| **Backdrop Blur** | `backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);` | `background: rgba(15, 23, 42, 0.94);` |
| **Borders** | Overlay: borderless dimming layer (`background: rgba(10, 15, 30, 0.88)`) | `border: 2px solid var(--neon-gold); border-radius: 18px;` |
| **Box Shadow** | N/A | `box-shadow: 0 0 0 2px #0f172a, var(--glow-gold), 0 20px 60px rgba(0,0,0,.9);` |
| **Animation** | `animation: fadeIn .2s;` | Smooth scale/slide transition |

### 2.2 Header Layout Convention
Standard modal headers (e.g. `#inventory-panel`, `#quest-panel`, `#recipe-panel`) follow a consistent flexbox contract:
- **Left**: Icon (font-size 26px–32px) + Vertical stack of retro Title (`font-family: 'Press Start 2P', monospace; font-size: 16px; color: var(--neon-gold);`) and munted Subtitle (`font-size: 11px; color: rgba(255,255,255,0.6)`).
- **Right**: Badge indicators (e.g., `#inv-capacity-badge` or `#cooking-progress-badge`) + Close Button `✕` (`background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 4px 12px; font-size: 16px; cursor: pointer;`).
- **Divider**: `border-bottom: 1.5px solid rgba(245, 158, 11, 0.3); padding-bottom: 14px; margin-bottom: 16px;`.

---

## 3. Cooking UI Modal Design (`#cooking-overlay` & `#cooking-panel`)

### 3.1 HTML DOM Structure

```html
<!-- ══════════════ COOKING KITCHEN (요리) OVERLAY ══════════════ -->
<div id="cooking-overlay">
  <div id="cooking-panel" class="glass-modal" style="max-width:800px; width:94%; max-height:88vh; overflow-y:auto; padding:24px;">
    
    <!-- Modal Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid rgba(245,158,11,0.3); padding-bottom:14px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:32px">🍳</span>
        <div>
          <div style="font-family:'Press Start 2P',monospace; font-size:16px; color:var(--neon-gold)">KOREAN COOKING KITCHEN (요리)</div>
          <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-top:4px; font-family:'Press Start 2P',monospace">Craft Hansik dishes, gain Vocab XP, Gold & powerful buffs!</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <span id="cooking-progress-badge" style="font-family:'Press Start 2P',monospace; font-size:11px; background:rgba(245,158,11,0.15); border:1px solid var(--neon-gold); color:var(--neon-gold); padding:4px 10px; border-radius:8px;">Cooked: 0 / 9</span>
        <button onclick="closeCookingUI()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:8px; padding:4px 12px; font-size:16px; cursor:pointer;">✕</button>
      </div>
    </div>

    <!-- Pantry Stock Summary Bar -->
    <div id="cooking-pantry-bar" style="background:rgba(30,41,59,0.7); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold)">🧺 My Ingredients Stock (재료):</div>
      <div id="cooking-pantry-list" style="display:flex; flex-wrap:wrap; gap:8px; font-size:12px; color:#cbd5e1;">
        <!-- Rendered by JS -->
      </div>
    </div>

    <!-- Recipe Selection Cards Grid -->
    <div id="cooking-recipe-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:14px;">
      <!-- Dynamic recipe cards rendered by JS -->
    </div>

  </div>
</div>
```

### 3.2 Recipe Card Layout & Badge Specifications

Each card in `#cooking-recipe-grid` contains 5 key sections:

```
┌─────────────────────────────────────────────────────────┐
│ [Icon: 🥬]      김치 (Kimchi)             [Status Badge] │
├─────────────────────────────────────────────────────────┤
│ Required Ingredients:                                   │
│  • 배추 1/1 ✓ [GREEN]    • 고추 0/1 ✗ [RED]             │
├─────────────────────────────────────────────────────────┤
│ Rewards & Buffs:                                        │
│  [⭐ +50 XP]  [🪙 +30 Gold]  [⚡ 2x Coin Rate (5m)]      │
├─────────────────────────────────────────────────────────┤
│ [ 🍳 Cook Recipe ]    [ 🏺 Culture Info ]              │
└─────────────────────────────────────────────────────────┘
```

#### Ingredient Requirement Cards (`owned / needed` Badges)
For each ingredient requirement entry in `recipe.req`:
- `owned = inventoryState.ingredients[ingName] || 0`
- `needed = reqCount`
- **Sufficient Badge** (`owned >= needed`):
  - CSS: `background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #4ade80;`
  - HTML text: `<span>${ingIcon} ${ingName} ${owned}/${needed} ✓</span>`
- **Missing Badge** (`owned < needed`):
  - CSS: `background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171;`
  - HTML text: `<span>${ingIcon} ${ingName} ${owned}/${needed} ✗</span>`

#### Reward Badges
- **XP Reward Badge**: `background: rgba(168, 85, 247, 0.18); border: 1px solid #a855f7; color: #c084fc; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-family: 'Press Start 2P', monospace;`
- **Gold Reward Badge**: `background: rgba(245, 158, 11, 0.18); border: 1px solid #f59e0b; color: #fbbf24; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-family: 'Press Start 2P', monospace;`
- **Gameplay Buff Badge**: `background: rgba(6, 182, 212, 0.15); border: 1px solid var(--neon-cyan); color: var(--neon-cyan); padding: 4px; border-radius: 6px; font-size: 10px; text-align: center; font-weight: bold;`

#### Cook Button State (`.cook-btn`)
- **Enabled State** (`allIngredientsMet === true`):
  - CSS: `background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 8px; color: #fff; font-family: 'Press Start 2P', monospace; font-size: 10px; padding: 8px; cursor: pointer;`
  - Hover: `opacity: 0.95; transform: scale(1.02); box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);`
- **Disabled State** (`allIngredientsMet === false`):
  - Attributes: `disabled`
  - CSS: `opacity: 0.45; cursor: not-allowed; transform: none; filter: grayscale(0.5);`

---

## 4. HUD Action Button & Hotkey Toggle ('C' / 'c')

### 4.1 HUD Action Button Integration
The Cooking HUD button must be placed in `#hud-actions-group` in `index.html` alongside `Vocab`, `Shop`, `Quests`, and `Bag`:

```html
<!-- In index.html line ~1333 -->
<div id="hud-actions-group" class="hud-group">
  <button class="hud-btn" id="vocab-btn" title="Vocabulary Book">📖 Vocab</button>
  <button class="hud-btn" id="shop-btn" title="Seed shop">🏪 Shop</button>
  <button class="hud-btn" id="quest-btn" title="Quest Log" onclick="openQuestOverlay()">📜 Quests</button>
  <button class="hud-btn" id="cooking-btn" title="Cooking Kitchen (요리) [Key: C]" onclick="openCookingUI()">🍳 Cooking</button>
  <button class="hud-btn" id="inventory-btn" title="Inventory Storage (🎒) [Key: I/E]" onclick="openInventoryUI()">🎒 Bag</button>
  <button class="hud-btn" id="save-btn" title="Save game" onclick="saveAllGame()">💾 Save</button>
  <button class="hud-btn" id="hud-more-btn" title="More Features" onclick="toggleHudOverflow(event)">➕ More</button>
  <button class="hud-btn hud-btn-menu" id="hud-menu-btn" title="Level Menu">☰ Menu</button>
</div>
```

### 4.2 Hotkey Toggle ('C' / 'c') with Input Guard Logic

In `game.js` (and `assets/game.js`), the keyboard listener handles hotkey toggling with active input element protection:

```javascript
// Global keydown handler for UI hotkeys
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', (e) => {
    // 1. Text Input Guard Check
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    );
    if (isInputFocused) return; // Do not intercept keypresses when user is typing

    // 2. Escape Key (Close Top Modal)
    if (e.key === 'Escape' && activeModalStack.length > 0) {
      closeTopModal();
      return;
    }

    // 3. Hotkey 'I' / 'E' -> Inventory Storage
    if (!isInputFocused && (e.key === 'i' || e.key === 'I' || e.key === 'e' || e.key === 'E')) {
      if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'inventory-overlay') {
        window.closeInventoryUI();
      } else if (activeModalStack.length === 0) {
        window.openInventoryUI();
      }
    }

    // 4. Hotkey 'C' / 'c' -> Cooking Kitchen UI
    if (!isInputFocused && (e.key === 'c' || e.key === 'C')) {
      if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'cooking-overlay') {
        window.closeCookingUI();
      } else if (activeModalStack.length === 0) {
        window.openCookingUI();
      }
    }
  });
}
```

---

## 5. JavaScript Implementation Blueprint for `game.js`

### 5.1 Modal State & Rendering Functions

```javascript
// Open Cooking UI Modal
window.openCookingUI = function() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderCookingGrid();
  setModalState('cooking-overlay', true);
};

// Close Cooking UI Modal
window.closeCookingUI = function() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('cooking-overlay', false);
};

// Render Cooking Grid & Ingredients
function renderCookingGrid() {
  const pantryList = document.getElementById('cooking-pantry-list');
  const grid = document.getElementById('cooking-recipe-grid');
  const progressBadge = document.getElementById('cooking-progress-badge');
  if (!grid) return;

  const ingMap = inventoryState.ingredients || {};
  const cookedMap = cookingState.cookedRecipes || {};

  // 1. Update Pantry Ingredients Summary
  if (pantryList) {
    pantryList.innerHTML = '';
    const entries = Object.entries(ingMap).filter(([_, count]) => count > 0);
    if (entries.length === 0) {
      pantryList.innerHTML = '<span style="color:#94a3b8; font-size:11px;">No ingredients in pantry. Harvest crops to get cooking ingredients!</span>';
    } else {
      entries.forEach(([ing, cnt]) => {
        const tag = document.createElement('span');
        tag.style.cssText = 'background:rgba(15,23,42,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:6px; padding:3px 8px; font-size:11px; font-family:"Noto Sans KR",sans-serif;';
        tag.textContent = `${ing}: ×${cnt}`;
        pantryList.appendChild(tag);
      });
    }
  }

  // 2. Update Progress Badge
  const cookedCount = Object.keys(cookedMap).length;
  const totalRecipes = RECIPE_DB.length;
  if (progressBadge) {
    progressBadge.textContent = `Cooked: ${cookedCount} / ${totalRecipes}`;
  }

  // 3. Render Recipe Cards
  grid.innerHTML = '';
  RECIPE_DB.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    if (cookedMap[r.id]) {
      card.style.borderColor = 'var(--neon-green)';
    }

    let canCook = true;
    let reqBadgesHtml = [];

    Object.entries(r.req).forEach(([ing, needed]) => {
      const have = ingMap[ing] || 0;
      if (have < needed) canCook = false;

      if (have >= needed) {
        reqBadgesHtml.push(`
          <span style="background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:bold;">
            ${ing} ${have}/${needed} ✓
          </span>
        `);
      } else {
        reqBadgesHtml.push(`
          <span style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#f87171; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:bold;">
            ${ing} ${have}/${needed} ✗
          </span>
        `);
      }
    });

    const isCooked = !!cookedMap[r.id];
    const xp = r.xpReward || 50;
    const gold = r.goldReward || 30;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:32px;">${r.icon}</div>
        ${isCooked ? '<span style="font-family:\'Press Start 2P\',monospace; font-size:9px; background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#4ade80; padding:3px 6px; border-radius:6px;">✓ Cooked</span>' : ''}
      </div>
      <div class="recipe-card-title">${r.name}</div>
      <div class="recipe-card-sub">${r.enName}</div>
      
      <div style="font-size:10px; color:#cbd5e1; margin-top:2px;"><b>Required:</b></div>
      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px;">
        ${reqBadgesHtml.join('')}
      </div>

      <div style="display:flex; gap:6px; margin-bottom:4px;">
        <span style="background:rgba(168,85,247,0.18); border:1px solid #a855f7; color:#c084fc; padding:2px 6px; border-radius:6px; font-size:9px; font-family:'Press Start 2P',monospace;">⭐ +${xp} XP</span>
        <span style="background:rgba(245,158,11,0.18); border:1px solid #f59e0b; color:#fbbf24; padding:2px 6px; border-radius:6px; font-size:9px; font-family:'Press Start 2P',monospace;">🪙 +${gold}</span>
      </div>

      <div class="recipe-buff-badge">⚡ ${r.buff.name}</div>

      <div style="display:flex; gap:6px; margin-top:6px;">
        <button class="cook-btn" style="flex:1;" ${canCook ? '' : 'disabled'} onclick="cookRecipe('${r.id}')">🍳 Cook Dish</button>
        <button class="hud-btn" style="padding:4px 8px; font-size:10px;" onclick="showCulturalFact('${r.id}')">🏺 Info</button>
      </div>
    `;
    grid.appendChild(card);
  });
}
```

---

## 6. Verification Method & Checklists

### 6.1 Interactive UI Verification
1. Click `🍳 Cooking` HUD Button or press `'C'` / `'c'` key on keyboard -> Modal `#cooking-overlay` appears cleanly centered.
2. Type into an input field (e.g. search bar or cat dialog) and press `'c'` / `'C'` -> Hotkey is ignored and character `c`/`C` is typed normally.
3. Check ingredient cards:
   - When player has 0/1 Cabbage -> Badge is RED (`#f87171`), Cook Button disabled.
   - When player has 1/1 Cabbage -> Badge is GREEN (`#4ade80`), Cook Button enabled.
4. Click disabled Cook button -> No action.
5. Click enabled Cook button -> Ingredients deducted, XP & Gold added, completion tracked, toast displayed.
6. Press `Escape` -> Cooking UI modal closes immediately.

### 6.2 Code & File Integrity Check
1. Run `node -c game.js` and `node -c assets/game.js` -> 0 syntax errors.
2. Dual-file SHA256 sync check: `game.js` <-> `assets/game.js` and `index.html` <-> `assets/index.html`.

---
*End of Analysis Report.*
