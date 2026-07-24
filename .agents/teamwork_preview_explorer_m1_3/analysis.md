# Technical Analysis: UI/UX, Keybindings, HUD & Save System (R1)
**Milestone 1 — Inventory Storage System & Ground Drop Pipeline**
**Explorer**: Explorer 3 (UI/UX, Keybindings, HUD & Save System)
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_3`

---

## 1. Executive Summary

This report presents a thorough investigation of the existing codebase (`index.html`, `assets/index.html`, `game.js`, `assets/game.js`) and details the architectural design for the **Inventory Storage System UI/UX, Keybindings, HUD Controls, and Persistence (R1)**.

### Core Discoveries
1. **Modal Infrastructure**: The game uses a centralized modal manager (`setModalState`, `activeModalStack`, `closeTopModal`, `.glass-modal`) in `game.js:4675-4726`. All overlays (Recipe Book, Quest Log, Shop, Trophies, etc.) follow a glassmorphism theme (`rgba(15, 23, 42, 0.94)`, `border: 2px solid var(--neon-gold)` or `var(--neon-cyan)`).
2. **Toast System**: Built-in `showToast(msg, duration)` function (`game.js:4585`) manipulates `<div id="toast">` (`index.html:1459`).
3. **Save System**: `collectSave()` (`game.js:3811`) and `applySave()` (`game.js:3842`) already serialize/deserialize `inventoryState`. The current schema uses `inventoryState = { ingredients: {...}, seeds: {}, scrolls: 0, cookedDishes: {} }`.
4. **Input & Keybindings**: Phaser movement uses `W,A,S,D` / Arrow keys and `SPACE`. Modal Esc-key closes top modal. No active hotkeys currently bind `'I'` or `'E'`. Guard check against `document.activeElement` (`INPUT`, `TEXTAREA`) is necessary to prevent key collision during text input (e.g. in Quiz or Vocab search).

---

## 2. Existing Infrastructure Findings

### 2.1 DOM & HUD Layout (`index.html` / `assets/index.html`)
- **HUD Container** (`#hud` at line 218):
  - `.hud-group`: `#hud-status-group`, `#hud-currency-group`, `#hud-actions-group`.
  - `#hud-actions-group` holds primary action buttons: `📖 Vocab`, `🏪 Shop`, `📜 Quests`, `🍳 Cook`, `💾 Save`, `➕ More`, `☰ Menu`.
  - Buttons use `.hud-btn` class with hover transforms and neon-gold border highlights.
- **CRT Overlay Effect**:
  - CSS rule `#level-select-overlay::before, #quiz-ui::before, ...` applies 64-bit scanlines. `#inventory-panel::before` must be added to this selector array.
- **Toast Notifications** (`#toast` at line 1459):
  - Fixed position at bottom center with neon-gold box shadow and smooth opacity transitions.

### 2.2 Modal Manager (`game.js` / `assets/game.js`)
- `setModalState(overlayId, isOpen)` (`game.js:4678`):
  - Sets `overlay.classList.add('visible')`, locks player movement (`playerLocked = true`), and pushes `overlayId` to `activeModalStack`.
  - Closing pops `overlayId` from `activeModalStack` and unlocks player (`playerLocked = false`) when stack is empty.
- `closeModalById(overlayId)` (`game.js:4707`):
  - Dispatches close handlers for registered overlays. `inventory-overlay` must be added here as `else if (overlayId === 'inventory-overlay') window.closeInventoryUI();`.

### 2.3 Save & Load System (`collectSave` & `applySave`)
- `collectSave()` (`game.js:3811`):
  - Returns save object including `inventory: inventoryState`.
- `applySave()` (`game.js:3842`):
  - Calls `migrateSaveData(d)` (`game.js:3777`) which initializes missing keys.
  - Sets `inventoryState = migrated.inventory`.

---

## 3. Detailed Component Designs

### 3.1 Inventory UI Modal Layout & Design

#### HTML Template (`index.html` & `assets/index.html`)
To be inserted before `</body>`:
```html
<!-- ══════════════ INVENTORY STORAGE OVERLAY ══════════════ -->
<div id="inventory-overlay">
  <div id="inventory-panel" class="glass-modal" style="max-width:760px; width:94%; max-height:88vh; overflow-y:auto; padding:24px;">
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid rgba(56,189,248,0.4); padding-bottom:14px; margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:32px">🎒</span>
        <div>
          <div style="font-family:'Press Start 2P',monospace; font-size:16px; color:var(--neon-cyan)">INVENTORY STORAGE (가방)</div>
          <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-top:4px; font-family:'Press Start 2P',monospace">Manage harvested crops & cooked dishes</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <span id="inv-capacity-badge" style="font-family:'Press Start 2P',monospace; font-size:11px; background:rgba(56,189,248,0.15); border:1px solid var(--neon-cyan); color:var(--neon-cyan); padding:4px 10px; border-radius:8px;">0 / 20 slots</span>
        <button onclick="closeInventoryUI()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:8px; padding:4px 12px; font-size:16px; cursor:pointer;">✕</button>
      </div>
    </div>

    <!-- Inventory Sub-Header & Capacity Expansion Controls -->
    <div style="background:rgba(30,41,59,0.7); border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div style="font-size:13px; color:#cbd5e1; font-family:'Be Vietnam Pro',sans-serif;">
        Storage Limit: <strong id="inv-capacity-text" style="color:var(--neon-gold);">20 slots</strong> (Items stack automatically)
      </div>
      <button class="hud-btn" id="inv-expand-btn" onclick="expandInventoryCapacity()" style="padding:6px 14px; font-size:10px;">
        ➕ Expand (+5 slots for 50 🪙)
      </button>
    </div>

    <!-- Inventory Slot Grid Container -->
    <div id="inventory-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:12px;">
      <!-- Dynamic slot tiles rendered by JS -->
    </div>
  </div>
</div>
```

#### CSS Styling Extensions (`index.html`)
Add `#inventory-panel::before` to the scanline texture list at line 80:
```css
#level-select-overlay::before,
#quiz-ui::before,
...
#inventory-panel::before,
#levelup-card::before,
#alldone-card::before { ... }
```
Add overlay styling:
```css
#inventory-overlay {
  position: fixed; inset: 0; z-index: 870; display: none;
  background: rgba(10, 15, 30, 0.88); backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  align-items: center; justify-content: center; animation: fadeIn .2s;
}
#inventory-overlay.visible { display: flex; }

.inv-slot {
  background: rgba(30, 41, 59, 0.7);
  border: 1.5px solid rgba(56, 189, 248, 0.3);
  border-radius: 12px; padding: 10px; text-align: center;
  position: relative; transition: transform .15s, border-color .15s, box-shadow .15s;
  cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100px;
}
.inv-slot:hover { transform: translateY(-2px); border-color: var(--neon-cyan); box-shadow: 0 0 14px rgba(56, 189, 248, 0.35); }
.inv-slot.empty { opacity: 0.4; border-style: dashed; border-color: rgba(255,255,255,0.15); cursor: default; }
.inv-slot.empty:hover { transform: none; box-shadow: none; }
.inv-slot-icon { font-size: 32px; line-height: 1; margin-bottom: 4px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); }
.inv-slot-ko { font-family: 'Noto Sans KR', sans-serif; font-size: 15px; font-weight: bold; color: #fff; line-height: 1.2; }
.inv-slot-en { font-family: 'Be Vietnam Pro', sans-serif; font-size: 11px; color: var(--neon-cyan); margin-top: 2px; }
.inv-qty-badge {
  position: absolute; top: 6px; right: 6px;
  background: rgba(245, 158, 11, 0.95); color: #0f172a;
  font-family: 'Press Start 2P', monospace; font-size: 9px; font-weight: bold;
  padding: 2px 6px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
```

---

### 3.2 HUD Integration & Keyboard Shortcut Design

1. **HUD Button**:
   In `#hud-actions-group` (`index.html:1299`), insert the Inventory Bag button:
   ```html
   <button class="hud-btn" id="inventory-btn" title="Inventory Storage (🎒) [Key: I/E]" onclick="openInventoryUI()">🎒 Bag</button>
   ```

2. **Keyboard Listener (`game.js`)**:
   Add keydown event handler for `'I'` / `'i'` and `'E'` / `'e'`:
   ```javascript
   if (typeof window !== 'undefined' && window.addEventListener) {
     window.addEventListener('keydown', (e) => {
       // Guard against typing in active input elements
       const activeEl = document.activeElement;
       const isInputFocused = activeEl && (
         activeEl.tagName === 'INPUT' ||
         activeEl.tagName === 'TEXTAREA' ||
         activeEl.isContentEditable
       );
       if (isInputFocused) return;

       // Toggle Inventory UI on 'I' or 'E' key
       if (e.key === 'i' || e.key === 'I' || e.key === 'e' || e.key === 'E') {
         if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'inventory-overlay') {
           window.closeInventoryUI();
         } else if (activeModalStack.length === 0) {
           window.openInventoryUI();
         }
       }
     });
   }
   ```

3. **Conflict Prevention Matrix**:
   - `W, A, S, D` & Arrow Keys: Character Movement.
   - `SPACE`: Interaction (Plant / Harvest / Talk).
   - `ESC`: Close top modal via `activeModalStack`.
   - `I` / `E`: Toggles Inventory Modal only when no input element is focused and no other modal blocks the screen.

---

### 3.3 Persistence Requirements (`collectSave()` & `applySave()`)

#### State Data Structure
```javascript
var inventoryState = {
  maxSlots: 20,
  ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 },
  seeds: {},
  scrolls: 0,
  cookedDishes: {}
};
```

#### API Contracts & Helper Methods
```javascript
function getUsedInventorySlots() {
  const ingCount = Object.keys(inventoryState.ingredients || {}).length;
  const dishCount = Object.keys(inventoryState.cookedDishes || {}).length;
  const seedCount = Object.keys(inventoryState.seeds || {}).length;
  return ingCount + dishCount + seedCount;
}

function addItemToInventory(itemId, qty = 1) {
  inventoryState.ingredients = inventoryState.ingredients || {};
  const currentMax = inventoryState.maxSlots || 20;
  
  // If item already exists in stack, add quantity
  if (typeof inventoryState.ingredients[itemId] !== 'undefined') {
    inventoryState.ingredients[itemId] += qty;
    persistSave();
    return true;
  }
  
  // New item type requires 1 empty slot
  if (getUsedInventorySlots() >= currentMax) {
    showToast(`⚠️ Inventory full (${currentMax}/${currentMax} slots)! Make space or expand capacity.`);
    return false;
  }

  inventoryState.ingredients[itemId] = qty;
  persistSave();
  return true;
}

function removeItemFromInventory(itemId, qty = 1) {
  if (!inventoryState.ingredients || !inventoryState.ingredients[itemId]) return false;
  if (inventoryState.ingredients[itemId] < qty) return false;
  
  inventoryState.ingredients[itemId] -= qty;
  if (inventoryState.ingredients[itemId] <= 0) {
    delete inventoryState.ingredients[itemId];
  }
  persistSave();
  return true;
}

function expandInventoryCapacity() {
  playChiptuneSFX('click');
  const cost = 50; // 50 gold per 5 slots expansion
  if (playerCurrencies.coins < cost) {
    showToast(`Need ${cost} Coins 🪙 to expand inventory capacity!`);
    return;
  }
  if (spendCoins(cost)) {
    inventoryState.maxSlots = (inventoryState.maxSlots || 20) + 5;
    persistSave();
    openInventoryUI(); // Re-render grid
    showToast(`🎒 Capacity expanded +5 slots! Total: ${inventoryState.maxSlots} slots.`);
  }
}
```

#### Migration & Integration in `collectSave()` / `applySave()`
- In `migrateSaveData(d)`:
  `data.inventory.maxSlots = typeof data.inventory.maxSlots === 'number' ? data.inventory.maxSlots : 20;`
- In `collectSave()`:
  Automatically serializes `inventoryState` (including `maxSlots`, `ingredients`, `cookedDishes`).
- In `applySave(d)`:
  Restores `inventoryState = migrated.inventory`.

---

## 4. Item Definition Registry (`ITEM_DB`)

To ensure clean display of Korean and English names and icons across UI components:
```javascript
const ITEM_DB = {
  '배추': { id: 'cabbage', nameKo: '배추', nameEn: 'Napa Cabbage', icon: '🥬', desc: 'Fresh cabbage for Kimchi' },
  '무': { id: 'radish', nameKo: '무', nameEn: 'Korean Radish', icon: '🥔', desc: 'Crunchy white radish' },
  '파': { id: 'green_onion', nameKo: '파', nameEn: 'Green Onion', icon: '🌱', desc: 'Fragrant green onions' },
  '고추': { id: 'chili', nameKo: '고추', nameEn: 'Chili Pepper', icon: '🌶️', desc: 'Spicy red chili pepper' },
  '마늘': { id: 'garlic', nameKo: '마늘', nameEn: 'Garlic', icon: '🧄', desc: 'Pungent garlic cloves' },
  '쌀': { id: 'rice', nameKo: '쌀', nameEn: 'Rice', icon: '🌾', desc: 'Staple Korean white rice' },
  '콩': { id: 'soybean', nameKo: '콩', nameEn: 'Soybean', icon: '🫘', desc: 'Nutritious yellow soybeans' },
  '당근': { id: 'carrot', nameKo: '당근', nameEn: 'Carrot', icon: '🥕', desc: 'Sweet orange carrot' },
  '사과': { id: 'apple', nameKo: '사과', nameEn: 'Apple', icon: '🍎', desc: 'Crisp Orchard Apple' },
  '연어': { id: 'salmon', nameKo: '연어', nameEn: 'Salmon', icon: '🐟', desc: 'Fresh river salmon' },
  '고등어': { id: 'mackerel', nameKo: '고등어', nameEn: 'Mackerel', icon: '🐟', desc: 'Flavorful ocean mackerel' },
  '오징어': { id: 'squid', nameKo: '오징어', nameEn: 'Squid', icon: '🦑', desc: 'Tender ocean squid' },
  '잉어': { id: 'carp', nameKo: '잉어', nameEn: 'Carp', icon: '🐟', desc: 'Crystal pond carp' },
  '새우': { id: 'shrimp', nameKo: '새우', nameEn: 'Shrimp', icon: '🦐', desc: 'Fresh sea shrimp' },
  '문어': { id: 'octopus', nameKo: '문어', nameEn: 'Octopus', icon: '🐙', desc: 'Giant sea octopus' },
  '조개': { id: 'clam', nameKo: '조개', nameEn: 'Clam', icon: '🦪', desc: 'Fresh shore clam' },
  '황금물고기': { id: 'golden_fish', nameKo: '황금물고기', nameEn: 'Golden Fish', icon: '🐠', desc: 'Rare golden fish' }
};
```

---

## 5. Summary & Handoff Readiness

The designs outlined in this analysis are 100% compliant with the project architecture specifications (`PROJECT.md`). All implementations preserve backwards compatibility and ensure identical behavior across dual files (`game.js` <-> `assets/game.js`, `index.html` <-> `assets/index.html`).
