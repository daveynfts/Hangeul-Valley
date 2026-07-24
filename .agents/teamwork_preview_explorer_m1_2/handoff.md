# Handoff Report: Ground Drop Pipeline & Entity Mechanics (R2)

**Agent**: Explorer 2 (`teamwork_preview_explorer_m1_2`)  
**Milestone**: Milestone 1 (Inventory Storage System & Ground Drop Pipeline)  
**Date**: 2026-07-24  

---

## 1. Observation

- **Project Location**: Root `d:\Hangeul Valley`, target files `game.js`, `index.html`, `assets/game.js`, and `assets/index.html`.
- **Harvest Logic Location**:
  - `game.js` line 8601–8677: `FarmScene._interact()` handles player interaction with plots (`sState === '4'`) by calling `openQuiz(p.word, p, 3)`.
  - `game.js` line 8680–8751: `FarmScene.advancePlot(plot, word, phase)` processes Phase 3 mature crop harvesting.
  - `game.js` line 8740–8745: Direct ingredient addition code:
    ```javascript
    const cropIngredients = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근'];
    const ingName = (ko && typeof KOREAN_INGREDIENTS !== 'undefined' && KOREAN_INGREDIENTS.includes(ko)) ? ko : cropIngredients[plot.index % cropIngredients.length];
    let yieldCount = 1;
    if (typeof addIngredient === 'function') addIngredient(ingName, yieldCount);
    ```
  - `game.js` line 8212–8231: `FarmScene.onAppleHarvested()` handles Apple Tree harvesting and directly adds apples:
    ```javascript
    if (typeof addIngredient === 'function') addIngredient('사과', yieldCount);
    ```
- **Dropped Items Absence**: Searching `game.js` for `dropped` returned 0 matches; ground drop entities are currently not implemented.
- **Toast UI Component**:
  - `index.html` line 1460 contains `<div id="toast"></div>`.
  - `game.js` contains global helper `showToast(msg, duration)`.
- **Scene Update Loop**:
  - `game.js` line 8392: `FarmScene.update(_t, dt)` runs frame-by-frame updates for player movement, environment, Y-sorting, and interaction highlights.

---

## 2. Logic Chain

1. **Observation 1 (Harvest Code Direct Addition)**: Lines 8740–8745 in `advancePlot()` and lines 8221–8222 in `onAppleHarvested()` directly call `addIngredient(ingName, yieldCount)`, bypassing world entity instantiation.
   - **Reasoning**: To transition to R2, this direct-grant call should be replaced or wrapped by a call to `this.spawnDroppedItem(itemId, x, y)`.

2. **Observation 2 (Dropped Item Entity Structure & Visual Design)**:
   - **Reasoning**: Dropped items need persistent world position `(x, y)`, random phase offset `bobOffset`, timestamp `spawnTime`, and Phaser visual components (`container`, `itemSprite`, `shadowSprite`, `glowRing`).
   - Trigonometric function $y_{\text{render}} = y_{\text{base}} - 8 + \sin(t \times 0.005 + \text{bobOffset}) \times 5$ provides unsynchronized bobbing. Shadow scaling $scale = 1.0 - 0.2 \times \sin(\dots)$ provides realistic depth perception.

3. **Observation 3 (Proximity & Collision Mechanics)**:
   - **Reasoning**: Checking distance inside `FarmScene.update(_t, dt)` via `Phaser.Math.Distance.Between` allows two zones:
     - Magnet zone ($30\text{px} < \text{dist} \le 65\text{px}$): Item glides towards player.
     - Pickup zone ($\text{dist} \le 30\text{px}$ or interaction key): Invokes `addItemToInventory(item.itemId, 1)`.

4. **Observation 4 (Full Inventory Behavior & Debounce)**:
   - **Reasoning**: When `addItemToInventory()` returns `false`, leaving the item on ground without a cooldown would trigger `showToast()` 60 times per second while standing over the item. Adding `item.pickupCooldown = Date.now() + 3000` debounces the notification to once every 3 seconds per item.

---

## 3. Caveats

- **Dual-File Sync**: Any implementation of ground drop entities in `game.js` MUST be duplicated identically in `assets/game.js` to pass Milestone 3 SHA256 sync checks.
- **Inventory Integration**: Ground drop pickup depends on R1's `addItemToInventory(itemId, qty)` returning a boolean (`true` if added, `false` if inventory is full).
- **Save State Scope**: Ground items can be saved via `collectSave()` / `applySave()` so dropped items remain on ground across page reloads.

---

## 4. Conclusion

The Ground Drop Pipeline (R2) design is complete and fully scoped:
1. **Harvest Integration**: Modify `advancePlot()` and `onAppleHarvested()` to call `spawnDroppedItem(itemId, x, y)`.
2. **Entity Rendering & Animation**: Render pixel-art item sprites with shadow, glow aura, initial pop tween, and continuous sine-wave bobbing offset.
3. **Proximity & Collision**: Magnet attraction within 65px, pickup collision within 30px invoking `addItemToInventory()`.
4. **Full Inventory Handling**: Leave entity on ground, invoke `showToast("🎒 Inventory Full! Cannot pick up " + nameKo, 2500)`, and enforce a 3-second debounce cooldown.

---

## 5. Verification Method

To independently verify these findings and design:
1. **Inspect harvest lines**: Read `game.js` lines 8680–8751 and 8212–8231 to verify harvest callbacks.
2. **Check toast container**: Read `index.html` line 1460 to verify `<div id="toast"></div>` presence.
3. **Check syntax validation**: Run `node -c game.js` and `node -c assets/game.js` after implementation to verify syntax.
