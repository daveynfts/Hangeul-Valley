# Storage (Inventory) & Ground Drop Pipeline Architecture Analysis

**Milestone 1 — Explorer 1 Report**  
**Working Directory:** `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1`  
**Date:** 2026-07-24  

---

## 1. Codebase State Investigation

### 1.1 Save/Load Architecture (`collectSave` / `applySave`)
* **Location:** `game.js` (lines 3811–3900) and `assets/game.js`.
* **Functions & Flow:**
  - `collectSave()` (line 3811): Serializes game state into a unified V4 schema snapshot object containing `currencies`, `gold`, `unlockedLevels`, `unlockedTrophies`, `harvests`, `srs`, `plots`, `apple`, `fishAlbum`, `quests`, `inventory`, `recipes`, `activeBuffs`, `seasonal`, `leaderboards`.
  - `applySave(d)` (line 3842): Calls `migrateSaveData(d)` to ensure schema compliance, then populates global variables (`playerCurrencies`, `inventoryState`, `recipeState`, `activeBuffs`, `seasonalState`, `leaderboardState`, etc.), triggers `syncGoldAlias()`, and updates currency HUD.
  - `migrateSaveData(d)` (line 3777): Upgrades legacy save schemas (< v4) to v4. Ensures default values for missing objects.
  - `persistSave()` (line 3871): Saves snapshot to `localStorage` under key `'hv_save_v2'` and calls `window.pywebview.api.save(data)` if pywebview API is present.
  - `loadSave()` (line 3880): Attempts loading from pywebview API first, falling back to `localStorage`.

### 1.2 Existing Player Inventory State
* **Location:** `game.js` (lines 3760–3765).
* **Legacy Structure:**
  ```javascript
  var inventoryState = {
    ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 },
    seeds: {},
    scrolls: 0,
    cookedDishes: {}
  };
  ```
* **Current Limitations:**
  - `inventoryState` lacks explicit capacity management (`maxSlots` property or slot capacity tracking).
  - Items are stored as flat dictionary counters under `ingredients` rather than structured slot objects.
  - There is no mechanism for expanding storage capacity via gold.

### 1.3 Crop Data & Harvest Logic
* **Location:** `game.js` (lines 8680–8752, `advancePlot`) and `KOREAN_INGREDIENTS` (line 10727).
* **Harvest Execution:**
  - In `advancePlot(plot, word, phase)` (line 8706), when a crop reaches Phase 3 (ripe) and the player answers the SRS quiz correctly:
    1. Coins, XP, and Honor rewards are granted.
    2. At line 8740–8745:
       ```javascript
       const cropIngredients = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근'];
       const ingName = (ko && typeof KOREAN_INGREDIENTS !== 'undefined' && KOREAN_INGREDIENTS.includes(ko)) ? ko : cropIngredients[plot.index % cropIngredients.length];
       let yieldCount = 1;
       if (typeof addIngredient === 'function') addIngredient(ingName, yieldCount);
       ```
    3. `addIngredient(name, count)` immediately increments `inventoryState.ingredients[name]` without spawning a ground drop entity or checking storage capacity limits.

### 1.4 Existing HUD Buttons & Modal Overlay System
* **Location:** `index.html` (lines 1290–1317) & `game.js` (lines 4676–4726).
* **HUD Action Buttons (`#hud-actions-group`):**
  - Primary buttons: `📖 Vocab` (`#vocab-btn`), `🏪 Shop` (`#shop-btn`), `📜 Quests` (`#quest-btn`), `🍳 Cook` (`#recipe-btn`), `💾 Save` (`#save-btn`), `➕ More` (`#hud-more-btn`), `☰ Menu` (`#hud-menu-btn`).
  - An Inventory HUD button (`🎒 Inventory`) can be cleanly integrated into `#hud-actions-group`.
* **Centralized Modal Manager (`setModalState`):**
  - `setModalState(overlayId, isOpen)` (line 4678): Toggles `.visible` CSS class on overlay elements, manages `activeModalStack`, and sets `playerLocked = true/false` automatically.
  - `closeTopModal()` (line 4700): Hooks into global `'Escape'` keydown handler (line 4721) to close the topmost active modal.

---

## 2. Storage & Inventory Architecture (R1 Design)

### 2.1 Inventory Item Database (`ITEM_DB`)
To support item types, names, icons, stacking, and metadata, we define an `ITEM_DB` dictionary mapping item IDs to item definitions:

```javascript
const ITEM_DB = {
  // Crops & Ingredients
  cabbage:     { id: 'cabbage',     nameKo: '배추', nameEn: 'Cabbage', icon: '🥬', category: 'crop', maxStack: 99, desc: 'Fresh Napa cabbage, perfect for Kimchi.' },
  radish:      { id: 'radish',      nameKo: '무',   nameEn: 'Radish',  icon: '🥕', category: 'crop', maxStack: 99, desc: 'Crisp Korean white radish.' },
  scallion:    { id: 'scallion',    nameKo: '파',   nameEn: 'Scallion',icon: '🧅', category: 'crop', maxStack: 99, desc: 'Aromatic green scallion.' },
  chili:       { id: 'chili',       nameKo: '고추', nameEn: 'Chili',   icon: '🌶️', category: 'crop', maxStack: 99, desc: 'Spicy red chili pepper.' },
  garlic:      { id: 'garlic',      nameKo: '마늘', nameEn: 'Garlic',  icon: '🧄', category: 'crop', maxStack: 99, desc: 'Pungent garlic cloves.' },
  rice:        { id: 'rice',        nameKo: '쌀',   nameEn: 'Rice',    icon: '🌾', category: 'crop', maxStack: 99, desc: 'Staple short-grain white rice.' },
  soybean:     { id: 'soybean',     nameKo: '콩',   nameEn: 'Soybean', icon: '🫛', category: 'crop', maxStack: 99, desc: 'Nutritious yellow soybeans.' },
  carrot:      { id: 'carrot',      nameKo: '당근', nameEn: 'Carrot',  icon: '🥕', category: 'crop', maxStack: 99, desc: 'Sweet orange carrot.' },
  apple:       { id: 'apple',       nameKo: '사과', nameEn: 'Apple',   icon: '🍎', category: 'fruit',maxStack: 99, desc: 'Crisp orchard apple.' },
  // Seafood
  salmon:      { id: 'salmon',      nameKo: '연어', nameEn: 'Salmon',  icon: '🐟', category: 'fish', maxStack: 99, desc: 'Fresh wild salmon.' },
  mackerel:    { id: 'mackerel',    nameKo: '고등어',nameEn:'Mackerel',icon: '🐟', category: 'fish', maxStack: 99, desc: 'Savory mackerel.' },
  squid:       { id: 'squid',       nameKo: '오징어',nameEn:'Squid',   icon: '🦑', category: 'fish', maxStack: 99, desc: 'Tender squid.' },
  carp:        { id: 'carp',        nameKo: '잉어', nameEn: 'Carp',    icon: '🐟', category: 'fish', maxStack: 99, desc: 'Freshwater carp.' },
  shrimp:      { id: 'shrimp',      nameKo: '새우', nameEn: 'Shrimp',  icon: '🦐', category: 'fish', maxStack: 99, desc: 'Plump shrimp.' },
  octopus:     { id: 'octopus',     nameKo: '문어', nameEn: 'Octopus', icon: '🐙', category: 'fish', maxStack: 99, desc: 'Fresh octopus.' },
  clam:        { id: 'clam',        nameKo: '조개', nameEn: 'Clam',    icon: '🦪', category: 'fish', maxStack: 99, desc: 'Fresh clam shell.' },
  golden_fish: { id: 'golden_fish', nameKo: '황금물고기', nameEn: 'Golden Fish', icon: '🐠', category: 'fish', maxStack: 99, desc: 'Rare shimmering golden fish.' }
};
```

### 2.2 Inventory Data Structure & Schema
`inventoryState` will be structured with explicit capacity and slot tracking:

```javascript
var inventoryState = {
  maxSlots: 20, // Default starting capacity: 20 slots
  slots: [
    { itemId: 'cabbage', qty: 3 },
    { itemId: 'radish', qty: 2 },
    { itemId: 'scallion', qty: 2 },
    { itemId: 'chili', qty: 1 },
    { itemId: 'garlic', qty: 2 },
    { itemId: 'rice', qty: 3 },
    { itemId: 'soybean', qty: 1 },
    null, null, null, null, null, null, null, null, null, null, null, null, null
  ],
  cookedDishes: {}
};
```

### 2.3 Storage API Contract
1. **`addItemToInventory(itemId, qty = 1)`**:
   - Locates existing slots of `itemId` where `qty < maxStack` and fills remaining space.
   - If `qty > 0`, finds the first empty slot (`null`) in `slots` (where `slotIndex < maxSlots`) and inserts `{ itemId, qty }`.
   - Returns `true` if all items were successfully added.
   - Returns `false` if inventory is full (no empty slots and no existing stack space).
2. **`removeItemFromInventory(itemId, qty = 1)`**:
   - Searches slots for `itemId` and deducts `qty`.
   - Clears slot to `null` if slot quantity reaches `0`.
   - Returns `true` if item was removed, `false` if insufficient quantity.
3. **`getIngredientCount(nameKo)`**:
   - Helper for cooking system / recipes. Sums quantities of slots where `ITEM_DB[slot.itemId].nameKo === nameKo`.
4. **`expandInventorySlots()`**:
   - Checks if `inventoryState.maxSlots < 50` (or max limit).
   - Calculates expansion cost in gold (e.g. `100` gold for +5 slots).
   - Deducts `playerCurrencies.coins`, increases `maxSlots += 5`, updates UI, and calls `persistSave()`.

---

## 3. Ground Drop Pipeline Architecture (R2 Interface Design)

### 3.1 Harvest Spawning Logic
When a crop plot is harvested in `advancePlot()`:
1. Determine harvested `itemId` based on crop Korean name `ko` or plot fallback.
2. Call `spawnDroppedItem(itemId, plot.x, plot.y)` instead of immediately invoking `addIngredient()`.

### 3.2 Dropped Item Entity & Animation
* **Function:** `spawnDroppedItem(itemId, x, y)`
* **Entity representation:**
  - Create a Phaser Container or Sprite at `(x, y)`.
  - Display item pixel texture or emoji icon with a glowing aura circle underneath.
  - Play smooth bobbing tween animation:
    ```javascript
    scene.tweens.add({
      targets: droppedItemSprite,
      y: y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    ```
  - Store entity in scene's `droppedItems` array: `{ itemId, qty: 1, x, y, entity, createdAt: Date.now() }`.

### 3.3 Proximity Detection & Pickup Loop
* **Function:** `updateDroppedItems(dt)` in Phaser Scene `update()` loop:
  - Iterates through `droppedItems` array.
  - Measures distance between player position `(player.x, player.y)` and item `(item.x, item.y)`.
  - Pickup threshold: `dist < 40` pixels.
  - When player enters pickup radius:
    - Attempt `addItemToInventory(item.itemId, item.qty)`.
    - **If success (`true`):**
      - Play pickup chiptune SFX (`playChiptuneSFX('pickup')`).
      - Spawn floating text popup `+1 배추 (Cabbage)!`.
      - Destroy entity sprite and remove from `droppedItems` array.
      - Update Inventory HUD / modal if open.
    - **If failure (`false` - Inventory Full):**
      - Item remains on ground.
      - Show debounced toast message: `⚠️ Inventory Full! Clear space to pick up item.` (throttled to once every 3 seconds to avoid spam).

---

## 4. UI & Key Shortcut Specifications

### 4.1 HUD Button Addition (`index.html`)
Add `<button class="hud-btn" id="inventory-btn" title="Inventory Storage (E/I)" onclick="openInventoryOverlay()">🎒 Inventory</button>` into `#hud-actions-group` in `index.html`.

### 4.2 Keyboard Shortcut Handler
Add `'I'` and `'E'` keydown handlers in `game.js`:
```javascript
window.addEventListener('keydown', (e) => {
  if (['i', 'I', 'e', 'E'].includes(e.key)) {
    // Ignore keypress if focus is inside an input box or text area
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
    
    if (activeModalStack.includes('inventory-overlay')) {
      closeInventoryOverlay();
    } else if (activeModalStack.length === 0) {
      openInventoryOverlay();
    }
  }
});
```

### 4.3 Inventory Modal UI Layout (`#inventory-overlay`)
* **Header:**
  - Title: `🎒 INVENTORY STORAGE (소지품)`
  - Subtitle: `Capacity: <span id="inv-capacity-text">7 / 20</span> Slots`
  - Upgrade Button: `<button class="cook-btn" id="inv-upgrade-btn" onclick="expandInventorySlots()">➕ Expand (+5 Slots) - 100 🪙</button>`
  - Close button: `✕` (`closeInventoryOverlay()`)
* **Slot Grid Container (`#inventory-grid`):**
  - CSS Grid with `grid-template-columns: repeat(5, 1fr); gap: 10px;`.
  - Displays all `maxSlots` slots (20 to 50 slots).
  - Empty slots: Faint dashed border with slot index number.
  - Occupied slots: Item icon (`🥬`), quantity badge (`x3`), Korean name (`배추`), and tooltip on hover/click.
* **Footer / Details Panel:**
  - Shows details of selected slot: Name (Korean + English), description, and action button `🗑️ Drop 1 Item` (spawns dropped item near player on ground).

---

## 5. Backward Compatibility & Migration Strategy

To guarantee existing save files loading without data loss:
1. `migrateSaveData(d)`:
   - Checks if `d.inventory` is in legacy format `{ ingredients: { "배추": 3, ... } }`.
   - Automatically maps legacy ingredient key names (e.g. `"배추"`) to `itemId` (e.g. `'cabbage'`) and populates `inventoryState.slots`.
   - Preserves `cookedDishes` object.
2. `addIngredient(nameKo, count)`:
   - Maintained as a wrapper function calling `addItemToInventory(koToItemId(nameKo), count)` to ensure any legacy callers function seamlessly.
3. Serialization in `collectSave()` & `applySave(d)`:
   - `collectSave()` includes `{ maxSlots: inventoryState.maxSlots, slots: inventoryState.slots, cookedDishes: inventoryState.cookedDishes }`.
   - `applySave(d)` loads `inventoryState` and refreshes UI.

---

## 6. Recommended Task Division for Implementation
* **R1 (Inventory Storage Core & UI Modal):** Implement `ITEM_DB`, `inventoryState` array, `addItemToInventory`, `removeItemFromInventory`, `expandInventorySlots`, `#inventory-overlay` markup, inventory CSS grid, HUD button, keyboard shortcuts ('I'/'E'), and save/load migration.
* **R2 (Ground Drop Entity Pipeline):** Implement `spawnDroppedItem()`, bobbing bounce animation, proximity pickup collision loop in Phaser scene, pickup sound, floating text, and full inventory warning toast.
