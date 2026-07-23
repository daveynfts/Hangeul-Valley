# Gameplay Integration Analysis: Farmer Actions & Ginger Cat Contextual Behaviors

**Project**: Hangeul Valley Character Design Upgrade (M3)  
**Investigator**: Explorer 3 (Gameplay Integration Specialist)  
**Date**: 2026-07-23  

---

## Executive Summary

This investigation analyzes `game.js` (and its mirrored counterpart `assets/game.js`) to establish precise execution points and control flows for:
1. Triggering **Watering**, **Harvesting**, and **Fruit Picking** animations on the player sprite during SRS farm plot and apple tree interactions.
2. Managing **player movement locking** and state restoration so action animations play smoothly without being interrupted by the Phaser scene update loop.
3. Implementing a **contextual animation state machine** for the **Ginger Cat (Muop) NPC** based on player proximity and interaction states.
4. Documenting **file mirroring requirements** between `game.js` and `assets/game.js`.

---

## 1. Code Triggers & Exact Line Numbers in `game.js`

### A. Watering Action Trigger
- **Quiz Success Callback**: `submitAnswer()` in `game.js`, lines 3352–3369.
  - Line 3365–3369: When `typed === currentWord.ko` and `currentPhase === 2`, `submitAnswer()` displays feedback `'💧 Watered! Almost ripe!'` and invokes `setTimeout(() => { closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph); }, 650);`.
- **Plot Advance Logic**: `advancePlot(plot, word, phase)` in `FarmScene`, lines 5096–5166.
  - Lines 5108–5117 (`phase === 2` block):
    ```javascript
    5108: } else if(phase===2){
    5109:   // P2 correct: grow to sprout, set P3 timer
    5110:   const srs=getSrs(ko); setSrs(ko,{p3At:now+SR2});
    5111:   if(plot.plant) plot.plant.setTexture(`cr_${t}_2`).clearTint();
    5112:   this.tweens.add({targets:plot.plant,scale:{from:0.7,to:1.1},duration:320,ease:'Back.Out(2)',
    5113:     onComplete:()=>this.tweens.add({targets:plot.plant,scale:1,duration:150})});
    5114:   if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    5115:   if(plot.glow){plot.glow.destroy();plot.glow=null;}
    5116:   this._leaves(plot.x,plot.y-8); this._label(plot.x,plot.y,'Watered!');
    5117:   this._setState(plot,'3',ko);
    ```
- **Visual Soil Wetting**: Line 5102 & Line 5195 (`plot.tile.setTexture('drt_wet')`). `_setState(plot, '3', ko)` retains/sets the watered tile visuals.

### B. Harvesting Action Trigger
- **Quiz Success Callback**: `submitAnswer()` in `game.js`, lines 3352–3369.
  - Line 3365–3369: When `typed === currentWord.ko` and `currentPhase === 3`, `submitAnswer()` displays feedback `'🍎 Excellent! +Gold earned!'` and invokes `setTimeout(() => { closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph); }, 650);`.
- **Plot Advance Logic**: `advancePlot(plot, word, phase)` in `FarmScene`, lines 5118–5164.
  - Lines 5118–5164 (`phase === 3` harvest block):
    - Line 5120: `playChiptuneSFX('harvest');`
    - Line 5130: `this._sparkle(plot.x, plot.y);`
    - Line 5131: `this._label(plot.x, plot.y, prev===0?'+... COINS! NEW!':'+... COINS!');`
    - Lines 5146–5162: Delayed rewards (`addCoins(reward)`, quest progress checks, ingredient duplications).
    - Line 5163: `this._clearPlot(plot);`

### C. Fruit Picking Action Trigger
- **SPACE Interaction Check**: `_interact()` in `FarmScene`, lines 5020–5024.
  - Lines 5021–5023: Checks `if(this.appleRipe && ... Distance < 90) { this.harvestAppleTree(); return; }`.
- **Quiz Initiation**: `harvestAppleTree()` in `FarmScene`, lines 4713–4719.
  - Line 4717: `appleTreeQuizPending = true;`
  - Line 4718: `openQuiz(word, null, 3);`
- **Quiz Success Callback**: `submitAnswer()` in `game.js`, lines 3358–3363.
  - Lines 3358–3361: If `appleTreeQuizPending === true`, displays `'🍎 Harvested! Excellent Korean!'` and invokes `setTimeout(() => { closeQuiz(); if(sceneRef) sceneRef.onAppleHarvested(); }, 700);`.
- **Apple Harvest Logic**: `onAppleHarvested()` in `FarmScene`, lines 4721–4743.
  - Line 4722: `playChiptuneSFX('harvest');`
  - Line 4725: `addGold(bonus);`
  - Line 4726: `this._flyCoins(this.appleX, this.appleY - 30, Math.min(bonus, 8));`
  - Line 4727: `this._label(this.appleX, this.appleY - 30, '+... 🍎 BONUS!');`
  - Lines 4738–4741: Resets tree state (`this.appleRipe = false`), schedules regrowth timer (`FarmScene.APPLE_RIPEN_MS`), calls `this._updateAppleTree()`.

---

## 2. Design for Player Action Animation Execution Flow

### A. Problem Analysis: Movement Lock vs Update Loop Override
In `FarmScene.update()` (lines 4845–4885):
```javascript
if (!playerLocked) {
  // Process movement input & playing walking animations
} else {
  this.player.setVelocity(0,0);
  this.player.anims.stop();
  this.player.setTexture('player_walk_down_0');
}
```
If `playerLocked` is set to `true` while playing an action animation, line 4883–4884 will execute every frame, immediately stopping `player.anims` and forcing `player_walk_down_0`.

### B. Solution: Action State Flag `isPerformingAction`
To prevent the fallback block from killing action animations:
1. Introduce a state variable `this.isPerformingAction = false` on `FarmScene`.
2. Modify `FarmScene.update()` lock logic:
```javascript
if (!playerLocked && !this.isPerformingAction) {
  // Normal movement
} else {
  this.player.setVelocity(0,0);
  if (!this.isPerformingAction) {
    this.player.anims.stop();
    this.player.setTexture('player_walk_down_0');
  }
}
```

### C. Helper Method: `playPlayerAction(actionType, targetX, targetY, callback)`
Add a centralized helper to `FarmScene`:
```javascript
playPlayerAction(actionType, targetX, targetY, callback) {
  if (!this.player) { if (callback) callback(); return; }

  this.isPerformingAction = true;
  playerLocked = true;
  this.player.setVelocity(0, 0);

  // 1. Orient player towards target
  if (typeof targetX === 'number' && typeof targetY === 'number') {
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.player.setFlipX(dx < 0);
    } else {
      this.player.setFlipX(false);
    }
  }

  // 2. Select animation & tool sprite keys
  const animKey = `player-${actionType}`; // 'player-water', 'player-harvest', 'player-pick'
  const toolKey = actionType === 'water' ? 'tool_watering_can' :
                  actionType === 'harvest' ? 'tool_sickle' :
                  actionType === 'pick' ? 'tool_basket' : null;

  // 3. Attach tool sprite overlay if available
  let toolSprite = null;
  if (toolKey && this.textures && this.textures.exists(toolKey)) {
    const offsetX = this.player.flipX ? -12 : 12;
    toolSprite = this.add.image(this.player.x + offsetX, this.player.y - 6, toolKey)
      .setDepth(this.player.depth + 1);
  }

  // 4. Cleanup & state restoration
  const restoreState = () => {
    if (toolSprite) toolSprite.destroy();
    this.isPerformingAction = false;
    playerLocked = false;
    if (this.player && this.player.active) {
      this.player.anims.stop();
      this.player.setTexture('player_walk_down_0');
    }
    if (typeof callback === 'function') callback();
  };

  // 5. Play animation with completion listener & fallback timer
  const duration = 650;
  if (this.anims && this.anims.exists(animKey)) {
    this.player.anims.play(animKey, true);
    this.player.once(`animationcomplete-${animKey}`, restoreState);
    this.time.delayedCall(duration + 100, () => {
      if (this.isPerformingAction) restoreState();
    });
  } else {
    // Fallback procedural bounce tween if frame animation key is not registered yet
    this.tweens.add({
      targets: this.player,
      scaleY: 0.8, scaleX: 1.2,
      duration: 150, yoyo: true, repeat: 1,
      onComplete: restoreState
    });
  }
}
```

### D. Integration Workflow Diagram
```
Quiz Correct Answer / Action Event
       │
       ▼
closeQuiz() completes
       │
       ▼
FarmScene.playPlayerAction(type, targetX, targetY, onComplete)
  ├── Set isPerformingAction = true, playerLocked = true
  ├── Lock velocity (0,0) & Orient player face direction
  ├── Attach Tool Sprite (Watering Can / Sickle / Basket)
  ├── Play Animation ('player-water', 'player-harvest', 'player-pick')
  └── Listen for 'animationcomplete'
       │
       ▼
Animation Complete Callback (or fallback timer)
  ├── Destroy tool sprite overlay
  ├── Set isPerformingAction = false, playerLocked = false
  ├── Restore player idle sprite ('player_walk_down_0')
  └── Execute plot updates / coin particle effects (onComplete)
```

---

## 3. Cat NPC Contextual Animation Switching Logic

### A. Current Cat NPC Code Locations
- **Creation**: `_createCatNPC(W, H)` in `FarmScene`, lines 4530–4548.
  - Sprite: `this.catSprite = this.add.sprite(cx, cy, 'cat_idle_0')`.
  - Default animation: `'cat-idle'` (registered lines 1165–1167).
- **Proximity & Flip Update**: `FarmScene.update()`, lines 4893–4897.
  - Checks distance between player and `catX, catY` (< 80px).
  - Flips sprite horizontally: `this.catSprite.setFlipX(this.player.x < this.catX)`.
- **Target Highlight**: `_updateTargetHighlight()`, lines 4964–4966 (`[SPACE] Talk to Muop`).
- **Dialog Interaction**: `_interact()`, lines 5031–5034 (`showCatDialog()`).

### B. State Machine Design for Ginger Cat (Muop)

| State | Condition | Target Animation | Behavioral Detail |
|---|---|---|---|
| **`INTERACTING` / `NEARBY`** | Distance < 80px OR `catDialogOpen === true` | `cat-sit` / `cat-groom` | Faces player (`setFlipX`), sits attentively or grooms paw, hint label visible |
| **`IDLE_BLINK`** | 80px ≤ Distance ≤ 250px | `cat-idle` | Faces player, blinks periodically, tail twitches |
| **`SLEEPING`** | Distance > 250px AND idle > 5000ms | `cat-sleep` | Curls up into sleeping pose, slow zZz breathing pulse |
| **`WALKING` / `FOLLOWING`** | Cat moving along path / following player | `cat-walk` / `cat-trot` | Plays walking frames in movement direction |

### C. Implementation Plan for `_updateCatNPC(dt)`
Add `_updateCatNPC(dt)` inside `FarmScene.update()`:
```javascript
_updateCatNPC(dt) {
  if (!this.catSprite || !this.player) return;

  const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.catX, this.catY);
  let targetAnim = 'cat-idle';

  if (catDialogOpen || dist < 80) {
    // Interacting / Close State
    targetAnim = this.anims.exists('cat-sit') ? 'cat-sit' :
                (this.anims.exists('cat-groom') ? 'cat-groom' : 'cat-idle');
    this.catSprite.setFlipX(this.player.x < this.catX);
    this.catIdleTimer = 0;
  } else if (dist > 250) {
    // Player Far / Idle -> Sleeping State
    this.catIdleTimer = (this.catIdleTimer || 0) + (dt || 16);
    if (this.catIdleTimer > 5000 && this.anims.exists('cat-sleep')) {
      targetAnim = 'cat-sleep';
    } else {
      targetAnim = 'cat-idle';
    }
  } else {
    // Medium Distance -> Default Idle-Blink
    this.catIdleTimer = 0;
    this.catSprite.setFlipX(this.player.x < this.catX);
    targetAnim = 'cat-idle';
  }

  // Switch animation if state updated
  if (this.catCurrentAnim !== targetAnim) {
    this.catCurrentAnim = targetAnim;
    if (this.anims && this.anims.exists(targetAnim)) {
      this.catSprite.play(targetAnim, true);
    }
  }
}
```

---

## 4. Root `game.js` vs `assets/game.js` Mirroring Requirements

1. **File Locations**:
   - `C:\VibeCode\Hangeul Valley\game.js` (Root game logic)
   - `C:\VibeCode\Hangeul Valley\assets\game.js` (Assets directory copy)
2. **Current Verification**:
   - SHA-256 Hash check confirms both files are currently 100% identical (`F8ECDCE90F1E2F7C7E28E073C84E94FB132809429149C0E14B23412FEF6310E8`).
3. **Mandatory Mirroring Protocol**:
   - Every implementation edit made to `game.js` MUST be synchronized to `assets/game.js`.
   - Standard PowerShell command for verification/copy:
     ```powershell
     Copy-Item -Path "C:\VibeCode\Hangeul Valley\game.js" -Destination "C:\VibeCode\Hangeul Valley\assets\game.js" -Force
     ```

---

## Conclusion & Next Steps for Implementer

1. **Farmer Action Animations**:
   - Implement `isPerformingAction` state flag and `playPlayerAction()` helper in `FarmScene`.
   - Update `advancePlot()` (Phase 2 watering & Phase 3 harvesting) and `onAppleHarvested()` to invoke `playPlayerAction()`.
2. **Cat NPC State Machine**:
   - Add `_updateCatNPC(dt)` loop in `FarmScene.update()` to handle `cat-sit`, `cat-groom`, `cat-sleep`, and `cat-idle`.
3. **Mirror File Synchronization**:
   - Copy updated `game.js` to `assets/game.js` post-implementation.
