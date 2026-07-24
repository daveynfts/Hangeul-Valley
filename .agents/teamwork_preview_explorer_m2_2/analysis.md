# Detailed Technical Analysis: Cooking Recipe Integration (Milestone 2)

## 1. Executive Summary
This report analyzes the Cooking Recipe system in `game.js` and `index.html` for Milestone 2 (Cooking Recipe Integration). It details how recipes are structured, how ingredient checking and deduction work via `ITEM_DB` and `inventoryState`, how the Cooking Modal UI renders recipes and rewards, and how to seamlessly integrate authentic Korean honey-based recipes (e.g. **Honey Yakgwa / 꿀약과**, **Honey Tea / 꿀차**, **Honey Rice Cake / 꿀떡**).

---

## 2. Array Definition of `COOKING_RECIPES`
In `game.js` (lines 11752–11890), `COOKING_RECIPES` is defined as a global array of recipe objects and attached to `window.COOKING_RECIPES`.

```javascript
// game.js: lines 11752-11766
var COOKING_RECIPES = [
  {
    id: 'kimchi',
    nameEn: 'Kimchi',
    nameKo: '김치',
    icon: '🥬',
    description: 'Traditional spicy fermented Napa cabbage with chili and garlic.',
    ingredients: [
      { itemId: 'cabbage', count: 1 },
      { itemId: 'chili', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 25,
    goldReward: 30
  },
  ...
];
```

### Data Schema of a Recipe Object
| Property | Type | Description | Example |
|---|---|---|---|
| `id` | `String` | Unique recipe identifier | `'honey_yakgwa'` |
| `nameEn` | `String` | English dish name | `'Honey Yakgwa'` |
| `nameKo` | `String` | Korean dish name | `'꿀약과'` |
| `icon` | `String` | Emoji icon representing the dish | `'🥮'` |
| `description` | `String` | Description of the dish | `'Traditional deep-fried honey pastry...'` |
| `ingredients` | `Array` | List of requirement objects `{ itemId, count }` | `[{ itemId: 'honey', count: 2 }, { itemId: 'rice', count: 1 }]` |
| `xpReward` | `Number` | XP bonus granted on successful cooking | `50` |
| `goldReward` | `Number` | Coins/gold granted on successful cooking | `65` |

---

## 3. Ingredient Specification, Inventory Checking, and Deduction Mechanics

### 3.1 Item Metadata via `ITEM_DB` & `getItemInfo`
Items are registered in `ITEM_DB` (lines 3900–3921 in `game.js`). The dictionary maps Korean item keys to item objects:

```javascript
// game.js: lines 3900-3902
var ITEM_DB = {
  '배추': { id: 'cabbage', name: 'Napa Cabbage', nameKo: '배추', icon: '🥬', description: 'Fresh Napa cabbage harvested from the plot.' },
  '무': { id: 'radish', name: 'Korean Radish', nameKo: '무', icon: '🥔', description: 'Crunchy white Korean radish.' },
  ...
};
```

The function `getItemInfo(keyOrId)` (lines 3923–3930) bridges English `itemId` values (e.g. `'cabbage'`, `'honey'`) and Korean inventory keys (`'배추'`, `'꿀'`).

```javascript
// game.js: lines 3923-3930
function getItemInfo(keyOrId) {
  if (!keyOrId) return { key: 'unknown', id: 'unknown', name: 'Item', nameKo: '아이템', icon: '📦', description: 'Unknown Item' };
  if (ITEM_DB[keyOrId]) return { key: keyOrId, ...ITEM_DB[keyOrId] };
  for (const [k, val] of Object.entries(ITEM_DB)) {
    if (val.id === keyOrId) return { key: k, ...val };
  }
  return { key: keyOrId, id: keyOrId, name: keyOrId, nameKo: keyOrId, icon: '📦', description: keyOrId };
}
```

### 3.2 Required `ITEM_DB` Entry for Honey
To register `honey` in `ITEM_DB`, the following entry must be added:

```javascript
'꿀': { id: 'honey', name: 'Wild Honey', nameKo: '꿀', icon: '🍯', description: 'Sweet pure honey harvested from the farm beehive.' }
```

### 3.3 Stock Verification Logic
In `renderCookingGrid()` (lines 11954–11960, 11995–12014) and `cookRecipe()` (lines 12073–12084):
1. For each requirement in `recipe.ingredients`, `getItemInfo(req.itemId)` gets the resolved Korean key (`info.key`).
2. Current stock `have` is checked against `inventoryState.ingredients[key]`.
3. If `have < req.count`, `canCook` is set to `false`, the UI displays red warning badges (`✗`), and cooking is prevented.

```javascript
// game.js: lines 12073-12084
const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
for (const req of reqs) {
  const info = getItemInfo(req.itemId);
  const key = info.key || req.itemId;
  const have = ingMap[key] || 0;
  if (have < req.count) {
    if (typeof showToast === 'function') {
      showToast(`⚠️ Missing ingredient for ${recipe.nameKo || recipe.nameEn}: Need ${req.count}x ${info.nameKo || key} (have ${have})`);
    }
    return false;
  }
}
```

### 3.4 Deduction Logic
In `cookRecipe()` (lines 12086–12092):
```javascript
for (const req of reqs) {
  const ok = removeItemFromInventory(req.itemId, req.count);
  if (!ok) return false;
}
```

`removeItemFromInventory(itemId, qty)` (lines 3985–4003) looks up `info.key`, subtracts `qty` from `inventoryState.ingredients[key]`, removes the key if zero, and triggers `persistSave()`.

---

## 4. Cooking UI Rendering & Reward Execution

### 4.1 UI Layout in `index.html` (lines 1859–1902)
- `#cooking-overlay`: Fullscreen glassmorphism overlay container.
- `#cooking-progress-badge`: Displays cooked dishes ratio (`Cooked: X / Y`).
- `#cooking-pantry-list`: Displays player's current ingredients in pantry.
- `#cooking-recipe-list`: Left grid column listing all recipe cards.
- `#cooking-detail-view`: Right pane presenting selected dish details, ingredient requirements (with green `✓` or red `✗` badges), rewards (Gold & XP), and the `🍳 Cook [Dish]` button.

### 4.2 Rewards & Progression System
When a recipe is cooked in `cookRecipe()`:
1. **Gold Reward**: `addCoins(recipe.goldReward)`.
2. **XP Reward**: `addHonor(recipe.xpReward)` (or `inventoryState.vocabXP += recipe.xpReward`).
3. **Mastery Tracking**:
   - `cookingState.cookedRecipes` records unique recipe IDs cooked.
   - `cookingState.recipeStats[recipe.id]` tracks total times cooked.
   - `inventoryState.cookedDishes[recipe.id]` updates cooked dish inventory.
4. **Persistence & Feedback**:
   - Calls `persistSave()` (serializing `inventoryState` & `cookingState`).
   - Plays `'complete'` SFX and shows toast notification.
   - Re-renders inventory grid, cooking UI grid, and currency HUD.
   - Triggers `checkCookingAchievements()` to award the `'master_chef'` trophy when all dishes are cooked.

---

## 5. Authentic Korean Honey Recipe Proposals

To integrate honey into the cooking system, we propose adding 1 to 3 authentic Korean recipes to `COOKING_RECIPES`:

### Recipe Option 1: Honey Yakgwa (꿀약과) - Recommended Primary Dish
```javascript
{
  id: 'honey_yakgwa',
  nameEn: 'Honey Yakgwa',
  nameKo: '꿀약과',
  icon: '🥮',
  description: 'Traditional Korean deep-fried honey pastry made with wild honey and grain.',
  ingredients: [
    { itemId: 'honey', count: 2 },
    { itemId: 'rice', count: 1 }
  ],
  xpReward: 50,
  goldReward: 60
}
```

### Recipe Option 2: Honey Tea (꿀차)
```javascript
{
  id: 'honey_tea',
  nameEn: 'Honey Tea',
  nameKo: '꿀차',
  icon: '🍵',
  description: 'Warm soothing Korean tea brewed with wild farm honey.',
  ingredients: [
    { itemId: 'honey', count: 2 }
  ],
  xpReward: 35,
  goldReward: 45
}
```

### Recipe Option 3: Honey Rice Cake (꿀떡)
```javascript
{
  id: 'honey_tteok',
  nameEn: 'Honey Rice Cake',
  nameKo: '꿀떡',
  icon: '🍡',
  description: 'Sweet chewy Korean rice cake filled with melted golden honey.',
  ingredients: [
    { itemId: 'honey', count: 1 },
    { itemId: 'rice', count: 2 }
  ],
  xpReward: 45,
  goldReward: 50
}
```

---

## 6. Detailed Implementation Plan for Implementer Agent

### Step 1: Register Honey in `ITEM_DB`
In `game.js` around line 3920, insert:
```javascript
'꿀': { id: 'honey', name: 'Wild Honey', nameKo: '꿀', icon: '🍯', description: 'Sweet pure honey harvested from the farm beehive.' }
```

### Step 2: Add Honey Recipes to `COOKING_RECIPES`
In `game.js` inside `var COOKING_RECIPES = [...]` (around line 11889), append:
```javascript
  {
    id: 'honey_yakgwa',
    nameEn: 'Honey Yakgwa',
    nameKo: '꿀약과',
    icon: '🥮',
    description: 'Traditional Korean deep-fried honey pastry made with wild honey and grain.',
    ingredients: [
      { itemId: 'honey', count: 2 },
      { itemId: 'rice', count: 1 }
    ],
    xpReward: 50,
    goldReward: 60
  },
  {
    id: 'honey_tea',
    nameEn: 'Honey Tea',
    nameKo: '꿀차',
    icon: '🍵',
    description: 'Warm soothing Korean tea brewed with wild farm honey.',
    ingredients: [
      { itemId: 'honey', count: 2 }
    ],
    xpReward: 35,
    goldReward: 45
  }
```

### Step 3: Verify Persistence & UI
Ensure `collectSave()` and `applySave()` maintain `inventoryState.ingredients['꿀']` and `cookingState.cookedRecipes` without schema changes.

### Step 4: Run Syntax Check
Execute:
```powershell
node -c game.js
```
Confirm exit code 0 and zero syntax errors.
