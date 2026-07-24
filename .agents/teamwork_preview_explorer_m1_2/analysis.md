# Detailed Analysis Report: Ground Drop Pipeline & Entity Mechanics (R2)

**Explorer**: Explorer 2  
**Milestone**: Milestone 1 (Inventory Storage System & Ground Drop Pipeline)  
**Target Module**: Ground Drop Pipeline & Entity Mechanics (R2)  
**Date**: 2026-07-24  

---

## 1. Harvest Code Analysis & Current Implementation

### 1.1 Code Locations
The harvest system is implemented within `game.js` (and duplicated in `assets/game.js`) inside `class FarmScene extends Phaser.Scene`:

- **Plot Interaction Trigger**: `FarmScene._interact()` (lines 8601–8677).
  - Calculates player proximity to crop plots using `Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < PLOT_SIZE + 24`.
  - For mature crops (`p.sState === '4'`), it invokes `openQuiz(p.word, p, 3)`.
- **Apple Tree Harvest Trigger**: `FarmScene.harvestAppleTree()` / `onAppleHarvested()` (lines 8204–8231).
  - Checks proximity to Apple Tree (`this.appleX`, `this.appleY - 30` within 95px).
- **Harvest Execution & Reward Resolution**: `FarmScene.advancePlot(plot, word, phase)` (lines 8680–8751).
  - Executed upon answering the Phase 3 SRS quiz correctly (`phase === 3`).
  - Plays the harvesting player animation: `this.playPlayerAction('harvest', plot.x, plot.y, callback)`.

### 1.2 Current Direct-Grant Behavior
Currently, when a mature plot is harvested (lines 8740–8745):
```javascript
const cropIngredients = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근'];
const ingName = (ko && typeof KOREAN_INGREDIENTS !== 'undefined' && KOREAN_INGREDIENTS.includes(ko)) 
  ? ko 
  : cropIngredients[plot.index % cropIngredients.length];

let yieldCount = 1;
if (typeof addIngredient === 'function') addIngredient(ingName, yieldCount);
```
Similarly, for the Apple Tree (lines 8221–8222):
```javascript
let yieldCount = 1;
if (typeof addIngredient === 'function') addIngredient('사과', yieldCount);
```
**Observation**: Currently, ingredients are immediately added directly into the global inventory state (`inventoryState.ingredients`) without creating any physical or visual dropped item entity on the map.

---

## 2. Dropped Item Entity Architecture & Visual Design

### 2.1 Entity Structure (`DroppedItem`)
To support the R2 requirement, dropped item entities will be tracked in an array `this.droppedItems = []` on `FarmScene`. Each entity will be defined as follows:

```javascript
{
  id: "drop_" + Date.now() + "_" + Math.floor(Math.random() * 10000), // Unique entity ID
  itemId: "napa_cabbage",      // Item identifier (e.g. 'napa_cabbage', 'radish', 'garlic', 'apple')
  nameKo: "배추",              // Korean display name
  nameEn: "Napa Cabbage",       // English display name
  x: 420,                      // Base world ground X coordinate
  y: 350,                      // Base world ground Y coordinate
  spawnTime: Date.now(),       // Timestamp when entity was spawned
  bobOffset: Math.random() * Math.PI * 2, // Random phase angle for unsynchronized bobbing
  pickupCooldown: 0,           // Cooldown timestamp (ms) to debounce full-inventory warnings
  
  // Phaser visual references
  container: null,             // Phaser.GameObjects.Container holding all visual elements
  itemSprite: null,            // Phaser.GameObjects.Image / Sprite for pixel-art icon
  shadowSprite: null,          // Phaser.GameObjects.Ellipse for ground shadow
  glowRing: null               // Phaser.GameObjects.Graphics / Image for aura glow effect
}
```

### 2.2 Pixel-Art Icon & Sprite Rendering
- **Textures**: Reuse or generate pixel-art crop icons (`cr_0_2` through `cr_4_2` or dedicated icon textures created in `PixelArtRenderer`).
- **Mapping Table**:
  - `배추` (Napa Cabbage) $\rightarrow$ `cr_0_2` / `icon_cabbage`
  - `무` (Radish) $\rightarrow$ `cr_1_2` / `icon_radish`
  - `파` (Green Onion) $\rightarrow$ `cr_2_2` / `icon_green_onion`
  - `고추` (Red Pepper) $\rightarrow$ `cr_3_2` / `icon_chili`
  - `마늘` (Garlic) $\rightarrow$ `cr_4_2` / `icon_garlic`
  - `쌀` (Rice) $\rightarrow$ `icon_rice`
  - `콩` (Soybean) $\rightarrow$ `icon_soybean`
  - `당근` (Carrot) $\rightarrow$ `icon_carrot`
  - `사과` (Apple) $\rightarrow$ `icon_apple`

### 2.3 Animation Physics & Visual Effects
1. **Spawn Pop Arc (Initial Spawn)**:
   - When `spawnDroppedItem(itemId, x, y)` is invoked during harvest, a Phaser tween pops the item sprite upward:
     - Start position: `(x + randOffset, y - 20)`
     - Pop arc: `y` tweened up to `y - 35`, then bouncing down to base ground position `y` over `400ms` with `ease: 'Bounce.Out'`.
2. **Continuous Bobbing Animation**:
   - Updated in `FarmScene.update(_t, dt)`:
     $$\text{yOffset} = -8 + \sin(\text{gameTime} \times 0.005 + \text{bobOffset}) \times 5$$
     $$y_{\text{render}} = y_{\text{base}} + \text{yOffset}$$
3. **Dynamic Ground Shadow**:
   - A semi-transparent black ellipse (`0x000000`, alpha 0.4) positioned at base ground `(x, y)`:
     $$\text{shadowScale} = 1.0 - 0.2 \times \sin(\text{gameTime} \times 0.005 + \text{bobOffset})$$
     $$\text{shadowAlpha} = 0.4 - 0.1 \times \sin(\text{gameTime} \times 0.005 + \text{bobOffset})$$
4. **Pulsating Glow Aura**:
   - Outer circular glow ring rendering a soft color tint:
     $$\alpha_{\text{glow}} = 0.35 + 0.25 \times \cos(\text{gameTime} \times 0.004 + \text{bobOffset})$$

---

## 3. Proximity & Collision Detection Mechanics

### 3.1 Proximity Detection Algorithm
Inside `FarmScene.update(_t, dt)` (lines 8392+):
1. Iterate over active `this.droppedItems`.
2. Compute Euclidean distance between player base `(this.player.x, playerBaseY)` and item ground anchor `(item.x, item.y)`:
   $$\text{dist} = \text{Phaser.Math.Distance.Between}(\text{player.x}, \text{playerBaseY}, \text{item.x}, \text{item.y})$$

### 3.2 Distance Thresholds
- **Magnet Attraction Zone ($30\text{px} < \text{dist} \le 65\text{px}$)**:
  - If inventory is not full, the item smoothly slides towards the player:
    $$item.x += (\text{player.x} - item.x) \times 0.12$$
    $$item.y += (\text{playerBaseY} - item.y) \times 0.12$$
- **Pickup Zone ($\text{dist} \le 30\text{px}$ or Key Interaction 'E' / Space)**:
  - Triggers the pickup routine:
    ```javascript
    const added = addItemToInventory(item.itemId, 1);
    ```

### 3.3 Pickup Execution Sequence
When `added === true`:
1. **Audio Feedback**: Play pickup sound effect (`playChiptuneSFX('pickup')`).
2. **Visual Feedback**:
   - Spawn floating label: `this._label(item.x, item.y - 15, "+1 " + item.nameKo, '#4ade80')`.
   - Spawn particle sparkles: `this._sparkle(item.x, item.y)`.
3. **Entity Cleanup**:
   - Destroy Phaser game objects (`item.container.destroy()`).
   - Remove item entity from `this.droppedItems` array.

---

## 4. Full-Inventory Behavior & Toast Warning

### 4.1 State Handling on Full Inventory
When `addItemToInventory(item.itemId, 1)` returns `false`:
1. **Item Retention**: The item entity **remains on the ground** at its world coordinates.
2. **Magnet Repulsion**: Magnet pull is suspended for that item to prevent it from clipping directly inside the player.
3. **Toast Notification**:
   - Call existing global toast helper: `showToast("🎒 Inventory Full! Cannot pick up " + item.nameKo, 2500)`.
4. **Debounce / Cooldown Protection**:
   - To prevent spamming toast notifications on every frame (60 FPS) while the player stands near the item, set:
     `item.pickupCooldown = Date.now() + 3000;` (3-second debounce).
   - Pickup check verifies `Date.now() > item.pickupCooldown` before attempting another pickup / triggering another toast.

---

## 5. Save/Load Persistence Strategy

To ensure dropped ground items are not lost if the player saves or reloads the game:
- **`collectSave()`**: Include active ground items in save data:
  ```javascript
  droppedItems: this.droppedItems.map(item => ({
    itemId: item.itemId,
    nameKo: item.nameKo,
    x: item.x,
    y: item.y
  }))
  ```
- **`applySave(data)`**: Re-spawn ground items from saved state upon scene load:
  ```javascript
  if (data.droppedItems && Array.isArray(data.droppedItems)) {
    data.droppedItems.forEach(d => this.spawnDroppedItem(d.itemId, d.x, d.y, false));
  }
  ```

---

## 6. Summary of Interface Contracts for R2

```javascript
// Ground Drop API in FarmScene:
spawnDroppedItem(itemId, x, y, playPopAnim = true)
updateDroppedItems(dt)
clearAllDroppedItems()
```

---
*Report compiled by Explorer 2.*
