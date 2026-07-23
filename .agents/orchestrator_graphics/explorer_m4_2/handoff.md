# Handoff Report: Milestone R4 Graphics & UI Architecture Analysis

**Target Project**: Hangeul Valley  
**Milestone**: R4  
**Scope**: Camera Transitions, 64-Bit Retro Glassmorphism UI Integration, Root-Assets Synchronization Logic, and Fix Strategy  
**Mode**: Read-Only Analysis (No Code Implemented)

---

## 1. Observation

### A. Camera Transitions (Scene Switching & Fades)
Direct code inspection of `game.js` reveals synchronous scene pausing and stopping calls immediately following non-blocking camera fade invocations:

1. **`FarmScene` Minigame Triggers** (`game.js:4879–4901`):
   ```javascript
   // game.js:4879-4881 (Dungeon Portal)
   this.cameras.main.fadeOut(300, 0, 0, 0);
   this.scene.pause();
   this.scene.launch('DungeonScene');

   // game.js:4889-4891 (Fishing Dock)
   this.cameras.main.fadeOut(300, 0, 0, 0);
   this.scene.pause();
   this.scene.launch('FishingScene');

   // game.js:4899-4901 (Arcade)
   this.cameras.main.fadeOut(300, 0, 0, 0);
   this.scene.pause();
   this.scene.launch('ArcadeScene');
   ```
2. **Minigame Scene Exit Routines** (`game.js:5569–5571`, `game.js:5997–5999`, `game.js:6360–6362`):
   ```javascript
   // ArcadeScene (game.js:5569-5571)
   this.cameras.main.fadeOut(300, 0, 0, 0);
   this.scene.stop();
   this.scene.resume('FarmScene');

   // DungeonScene (game.js:5997-5999)
   this.cameras.main.fadeOut(300, 0, 0, 0);
   this.scene.stop();
   this.scene.resume('FarmScene');

   // FishingScene (game.js:6360-6362)
   this.cameras.main.fadeOut(300, 0, 0, 0);
   this.scene.stop();
   this.scene.resume('FarmScene');
   ```
3. **`FarmScene` Camera Creation and Resume** (`game.js:3806`):
   - `FarmScene.create()` contains `this.cameras.main.fadeIn(300, 0, 0, 0);`.
   - However, when `FarmScene` is resumed via `this.scene.resume('FarmScene')`, `create()` is **not** re-triggered, and no `'resume'` event listener exists to handle camera `fadeIn()`.
4. **HTML Level Select Overlay Transition** (`game.js:3118–3122`, `game.js:3132–3143`):
   - `hideLevelSelect()` directly toggles CSS `.hidden` on `#level-select-overlay` without invoking Phaser camera fades or smooth canvas transition effects.

### B. 64-Bit Retro Glassmorphism UI Integration (HTML/CSS Overlays over Canvas)
Inspection of `index.html` and `game.js` modal lifecycle logic reveals the following structure:

1. **CSS Custom Properties & Styling** (`index.html:14–51`, `index.html:973–998`):
   - Overlays utilize 64-Bit Pixel Glass variables (`--glass-bg-primary`, `--glass-blur: blur(16px)`, neon glows `--glow-cyan`, `--glow-gold`, `--glow-purple`, etc.) alongside CRT scanline pseudo-elements (`::before`).
2. **Unmanaged `playerLocked` State in HTML Modals**:
   - Movement and interaction check `if (!playerLocked)` (`game.js:4677`, `game.js:4757`).
   - Modal opening functions (`window.openFishAlbum` `game.js:6367`, `window.openRecipeBook` `game.js:6993`, `window.openPetOverlay` `game.js:7279`, `openSeasonalOverlay` `game.js:7558`, `openLeaderboard` `game.js:7718`) append `.visible` to HTML containers **without setting `playerLocked = true`**.
3. **Incomplete ESC Key Listener Mapping** (`game.js:6853–6865`):
   - Global `keydown` handler only checks `duelOpen` and `Escape`.
   - HTML overlays (`recipe-overlay`, `pet-overlay`, `seasonal-overlay`, `leaderboard-overlay`, `fish-album-overlay`, `shop-overlay`, `quest-overlay`) do not listen for `Escape` keypresses to close.
4. **Z-Index Hierarchy Layering**:
   - `#level-select-overlay` (`z-index: 500`) vs. higher-layer modals: `#fish-album-overlay` (`520`), `#memory-overlay` (`750`), `#trophy-overlay` (`800`), `#duel-overlay` (`850`), `#quest-overlay` (`880`), `#recipe-overlay` (`890`), `#pet-overlay` (`890`), `#shop-quiz-overlay` (`900`), `#boss-gate-overlay` (`910`).

### C. Root-Assets Synchronization Logic
File inspection and SHA256 checksum tests across root and `assets/` directories:

1. **File Duplication**:
   - `game.js` (Root: 311,481 bytes) == `assets/game.js` (311,481 bytes)
   - `index.html` (Root: 99,985 bytes) == `assets/index.html` (99,985 bytes)
   - `levels.json` (Root: 8,954 bytes) == `assets/levels.json` (8,954 bytes)
   - `save_data.json` (Root: 2,071 bytes) == `assets/save_data.json` (2,071 bytes)
2. **Server Root Binding** (`main.py:30–31`):
   ```python
   BASE_DIR = os.path.dirname(os.path.abspath(__file__))
   ASSETS = BASE_DIR # Serves directly from root, not assets/ folder
   ```
3. **Empirical Test Suite Enforcement** (`test_r3_challenger_empirical.js:45–48`):
   ```javascript
   const hash1 = crypto.createHash('sha256').update(gameContent).digest('hex');
   const hash2 = crypto.createHash('sha256').update(assetsContent).digest('hex');
   assert(hash1 === hash2, `game.js and assets/game.js are byte-for-byte identical...`);
   ```
4. **Automated Sync Mechanism**: **Zero build scripts, file watchers, or git pre-commit hooks exist in the project.**

---

## 2. Logic Chain

1. **Camera Transition Premature Truncation**:
   - In Phaser 3, `this.cameras.main.fadeOut(duration)` launches an asynchronous camera tween over `duration` milliseconds.
   - Calling `this.scene.pause()` or `this.scene.stop()` on the exact line immediately following `fadeOut()` freezes or kills the scene's execution loop on frame 1.
   - Therefore, `FarmScene` gets paused mid-fade, leaving its main camera state locked at zero alpha (faded to black).
   - When child scenes exit and call `this.scene.resume('FarmScene')`, `FarmScene` resumes with its camera still faded black because no `fadeIn()` or camera reset is triggered on resume.

2. **UI Overlay Input Leakage & Accessibility Void**:
   - `FarmScene.update()` evaluates `if (!playerLocked)` to process WASD and Arrow key player velocity.
   - Because `openFishAlbum`, `openRecipeBook`, `openPetOverlay`, `openSeasonalOverlay`, and `openLeaderboard` do not set `playerLocked = true`, opening these glassmorphism modals leaves `playerLocked = false`.
   - Therefore, keyboard interactions while browsing recipes, pets, or fish cause the player character underneath to walk around the map unnoticed.
   - Furthermore, because global `Escape` handling is missing for these overlays, keyboard users cannot close modals using standard UI conventions.

3. **Root-Assets Desynchronization Risk**:
   - `test_r3_challenger_empirical.js` strictly enforces SHA256 equality between `game.js` and `assets/game.js`.
   - Since `main.py` serves files from root (`ASSETS = BASE_DIR`), developers editing `game.js` in root without manually updating `assets/game.js` will cause the verification suite to fail.
   - Conversely, developers editing `assets/game.js` will observe no changes in PyWebView while breaking synchronization.

---

## 3. Caveats

- **No Caveats**: All relevant scene classes, HTML overlay elements, CSS style declarations, server hosting configurations, and test files were completely inspected and verified locally.

---

## 4. Conclusion

1. **Camera Transitions**: Current scene transition methods in `game.js` execute synchronous `pause()` and `stop()` calls before camera fade tweens complete, resulting in frozen camera fades, instant visual cuts, and black screen states upon resuming `FarmScene`.
2. **Glassmorphism UI Integration**: HTML overlays present complete CSS glass visual styling, but lack unified modal lifecycle management. Unmanaged `playerLocked` states lead to player movement leakage behind modals, while missing `ESC` key bindings hinder accessibility.
3. **Root-Assets Sync**: Root and `assets/` files are currently byte-identical, but lack automated synchronization scripts, making the codebase vulnerable to test suite failures whenever root files are modified.

---

## 5. Verification Method & Proposed Fix Strategy

### A. Independent Verification Commands
Run the existing verification test suites using Node.js:
```bash
node test_r3_r4_systems.js
node test_r3_challenger_empirical.js
node test_currency_save.js
```

### B. Proposed Fix Strategy (Do Not Implement)

#### 1. Camera Transitions Fix Strategy
Refactor scene transition routines in `game.js` to utilize Phaser's `FADE_OUT_COMPLETE` event listener:

```javascript
// Transition from FarmScene to child scene (e.g. DungeonScene):
this.cameras.main.fadeOut(300, 0, 0, 0);
this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
  this.scene.pause();
  this.scene.launch('DungeonScene');
});

// Register resume handler in FarmScene.create():
this.events.on('resume', () => {
  this.cameras.main.fadeIn(300, 0, 0, 0);
});

// Exit routine in child scenes (ArcadeScene, DungeonScene, FishingScene):
this.cameras.main.fadeOut(300, 0, 0, 0);
this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
  this.scene.stop();
  this.scene.resume('FarmScene');
});
```

#### 2. Glassmorphism UI Manager Fix Strategy
Implement a centralized modal lifecycle function in `game.js`:

```javascript
function setModalState(overlayId, isOpen) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  if (isOpen) {
    overlay.classList.add('visible');
    playerLocked = true;
    activeModalStack.push(overlayId);
  } else {
    overlay.classList.remove('visible');
    activeModalStack = activeModalStack.filter(id => id !== overlayId);
    if (activeModalStack.length === 0) playerLocked = false;
  }
}

// Global ESC key listener for all HTML modals:
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModalStack.length > 0) {
    const topModal = activeModalStack[activeModalStack.length - 1];
    closeModalById(topModal);
  }
});
```

#### 3. Automated Root-Assets Synchronization Strategy
Add an automated startup sync check in `main.py` before starting the HTTP server:

```python
# In main.py before server startup:
import shutil

for fname in ('game.js', 'index.html', 'levels.json', 'save_data.json'):
    src = os.path.join(BASE_DIR, fname)
    dst = os.path.join(BASE_DIR, 'assets', fname)
    if os.path.exists(src):
        os.makedirs(os.path.join(BASE_DIR, 'assets'), exist_ok=True)
        shutil.copy2(src, dst)
print("[Sync] Root asset files successfully synchronized to assets/ directory.")
```
