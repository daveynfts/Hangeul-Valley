# Codebase Analysis & UI Architecture Report: HUD and Modals

**Milestone 1 — Explorer 1 Report**
**Working Directory**: `C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\`
**Target Files**: `C:\VibeCode\Hangeul Valley\index.html`, `C:\VibeCode\Hangeul Valley\game.js`

---

## 1. Observation

### 1.1 UI Architecture Overview
The user interface of Hangeul Valley employs a **hybrid dual-layer architecture**:
1. **DOM UI Overlay Layer**: Handled entirely via HTML structure and CSS styles inside `index.html`, managed dynamically by vanilla JS functions in `game.js`. Floating above the canvas with explicit `z-index` stacking (ranging from `100` to `850`), `position: fixed` / `position: absolute`, and CSS flexbox/grid layouts.
2. **Phaser 3 Canvas Engine Layer**: Managed in `game.js` via `Phaser.Game` (using `Phaser.Scale.RESIZE` mode), rendering the 2D world tiles, animated pixel art sprites (generated programmatically via graphics baking in `FarmScene._bakeTextures()`), ambient particles, and sub-game scenes (`FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`).

---

### 1.2 HUD and Modal Inventory (Mapped to Exact Selectors & Lines)

| Component Name | DOM ID / Class Selectors | CSS Line Range (`index.html`) | HTML Line Range (`index.html`) | Stacking Context (`z-index`) | JS Trigger & Management Functions (`game.js`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Main HUD Bar** | `#hud`, `#hud-level`, `#hud-progress`, `#hud-gold`, `.hud-btn` | `147 – 177` | `1056 – 1069` | `100` | `updateHUD()` (l. 363), `updateGoldHUD()` (l. 191), `addGold()` (l. 181), button click handlers (l. 868–873, 3236) |
| **Progress Bar** | `#progress-bar-wrap`, `#progress-bar-bg`, `#progress-bar-fill` | `180 – 200` | `1072 – 1075` | `100` | `updateHUD()` (l. 368) |
| **Controls Tip** | `#controls-tip`, `.key-badge` | `203 – 217` | `1078 – 1082` | `100` | Toggled via `hideLevelSelect()` / `showLevelSelect()` (l. 446, 451) |
| **Level Select Overlay** | `#level-select-overlay`, `.ls-title-wrap`, `.ls-grid`, `.ls-resume-card`, `.level-card` | `33 – 144` | `1044 – 1053` | `500` | `buildLevelSelectScreen()` (l. 375), `showLevelSelect()` (l. 445), `hideLevelSelect()` (l. 450), `startLevel()` (l. 461) |
| **Quiz Modal Backdrop & UI** | `#quiz-backdrop`, `#quiz-ui`, `#quiz-hint-box`, `#question-text`, `#en-word-display`, `#answer-input`, `#feedback-text`, `#submit-btn`, `#cancel-btn`, `#quiz-phase-bar`, `#quiz-funfact-box`, `#quiz-tier-hints`, `#quiz-hint-reveal-card` | `220 – 314`, `674 – 688`, `707 – 747` | `1085 – 1140` | `200` | `openQuiz()` (l. 535), `closeQuiz()` (l. 572), `submitAnswer()` (l. 580), `revealQuizHint()` (l. 511) |
| **Vocabulary Book** | `#vocab-overlay`, `#vocab-panel`, `#vocab-header`, `#vocab-controls`, `#vocab-search`, `.cat-filter-btn`, `#vocab-grid-wrap`, `#vocab-grid`, `.vocab-card`, `.mastery-badge` | `317 – 414`, `692 – 703` | `1158 – 1179` | `400` | `buildVocabBook()` (l. 685), `renderVocabCards()` (l. 824), `updateVocabBook()` (l. 867), toggle button (l. 868) |
| **Seed Shop Overlay** | `#shop-overlay`, `#shop-panel`, `#shop-header`, `#shop-gold-badge`, `#shop-level-grid`, `.shop-card`, `.shop-buy-btn` | `757 – 809` | `1195 – 1209` | `480` | `openShop()` (l. 624), `closeShop()` (l. 630), `buildShopGrid()` (l. 652), `buyLevel()` (l. 645) |
| **Fish Album Overlay** | `#fish-album-overlay`, `#fish-album-panel`, `#fish-album-header`, `#fish-album-grid`, `.fish-card` | `1004 – 1038` | `1143 – 1155` | `520` | `window.openFishAlbum()` (l. 3028), `window.closeFishAlbum()` (l. 3051) |
| **Trophy Overlay** | `#trophy-overlay`, `#trophy-panel`, `#trophy-header`, `#trophy-grid`, `.trophy-card` | `876 – 914` | `1309 – 1326` | `800` | `window.openTrophies()` (l. 3183), `window.closeTrophies()` (l. 3190), `window.renderTrophies()` (l. 3195) |
| **Spell Quiz Duel** | `#duel-overlay`, `#duel-panel`, `#duel-header`, `#duel-stage`, `.duel-char-box`, `#duel-question-wrap`, `#duel-options-grid`, `.duel-option-btn` | `917 – 1002` | `1328 – 1380` | `850` | `window.openSpellDuel()` (l. 3259), `nextDuelTurn()` (l. 3312), `window.selectDuelOption()` (l. 3365), `window.closeSpellDuel()` (l. 3459) |
| **Memory Minigame** | `#memory-overlay`, `#memory-panel`, `#memory-header`, `#memory-stats`, `#memory-grid`, `.mem-card` | `820 – 873` | `1276 – 1294` | `750` | `window.openMemoryGame()` (l. 3075), `window.onMemoryCardClick()` (l. 3116), `window.closeMemoryGame()` (l. 3161) |
| **Vocab Fun Fact Modal** | `#vocab-ff-modal`, `#vff-inner`, `#vff-header`, `#vff-word-row`, `.vff-section` | `600 – 672` | `1214 – 1241` | `600` | `showVocabFunFact()` (l. 806), `closeVocabFunFact()` (l. 822) |
| **Cat NPC Dialog** | `#cat-dialog`, `#cat-dialog-inner`, `#cat-dialog-header`, `#cat-dialog-body`, `#cat-portrait-canvas` | `497 – 598` | `1244 – 1274` | `490` | `showCatDialog()` (l. 297), `closeCatDialog()` (l. 305), `drawCatPortrait()` (l. 249), `catSetWord()` (l. 309) |
| **Level-Up / All-Done** | `#levelup-overlay`, `#levelup-card`, `#alldone-overlay`, `#alldone-card` | `417 – 491` | `1182 – 1192`, `1296 – 1306` | `300` | Overlay toggles (l. 876–879) |
| **Toast Notification** | `#toast`, `#toast.show` | `811 – 817` | `1212` | `600` | `showToast()` (l. 355) |

---

### 1.3 Detailed Inspection of CSS Styles & Variables
- **CSS Variables defined** (`index.html:13-23`):
  - `--wood-l`: `#c4893a` (light wood)
  - `--wood-m`: `#8b5a2b` (medium wood)
  - `--wood-d`: `#4a2a0d` (dark wood)
  - `--parch`: `#f4d6a0` (parchment light)
  - `--parch-d`: `#e8c07a` (parchment dark)
  - `--grass`: `#3d7a1a`
  - `--gold`: `#f9c74f`
  - `--green-l`: `#4ade80`
  - `--green-d`: `#16a34a`
- **Current Aesthetic**: Mainly traditional rustic wood-and-parchment framing (`border: 3px solid var(--wood-m)`), with partial glassmorphism applied only to `#hud` (`backdrop-filter: blur(12px)`, `index.html:150`) and `#quiz-backdrop` (`backdrop-filter: blur(6px)`, `index.html:222`). Other overlays (`#shop-panel`, `#vocab-panel`, `#memory-panel`, `#duel-panel`) rely on solid opaque linear gradients (e.g. `linear-gradient(160deg,#4a2a0d,#2a1508)`).

---

## 2. Logic Chain

### 2.1 Stacking Context & Stacking Order Analysis
The current DOM stacking order (`z-index`) is structured as follows:
- `z-index: 100`: HUD bar (`#hud`), Progress Bar (`#progress-bar-wrap`), Controls Tip (`#controls-tip`)
- `z-index: 200`: Quiz Modal (`#quiz-backdrop`)
- `z-index: 300`: Level-Up (`#levelup-overlay`), All-Done (`#alldone-overlay`)
- `z-index: 400`: Vocab Book (`#vocab-overlay`)
- `z-index: 480`: Seed Shop (`#shop-overlay`)
- `z-index: 490`: Cat Dialog (`#cat-dialog`)
- `z-index: 500`: Level Select (`#level-select-overlay`)
- `z-index: 520`: Fish Album (`#fish-album-overlay`)
- `z-index: 600`: Toast (`#toast`), Vocab Fun Fact (`#vocab-ff-modal`)
- `z-index: 750`: Memory Minigame (`#memory-overlay`)
- `z-index: 800`: Trophy Overlay (`#trophy-overlay`)
- `z-index: 850`: Spell Quiz Duel (`#duel-overlay`)

**Inference**: The modal z-index ladder is functional, but lacks unified design tokens and responsive scaling rules across different viewports.

---

### 2.2 Integration Plan for 64-Bit Retro Glassmorphism & Neon Glows

To elevate the UI to a **Retro 64-Bit Glassmorphic & Neon Cyber-Farming Aesthetic**:

1. **Design System & Centralized CSS Variables**:
   Introduce modern 64-bit glassmorphic tokens in `:root`:
   ```css
   :root {
     /* 64-bit Glass Surfaces */
     --glass-bg-primary: rgba(15, 23, 42, 0.78);
     --glass-bg-secondary: rgba(30, 27, 75, 0.82);
     --glass-blur: blur(16px) saturate(180%);
     --glass-border-light: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1);

     /* Neon Glow Accents */
     --neon-cyan: #38bdf8;
     --neon-gold: #f59e0b;
     --neon-purple: #c084fc;
     --neon-green: #4ade80;
     --neon-pink: #f43f5e;

     /* Neon Shadows */
     --glow-cyan: 0 0 20px rgba(56, 189, 248, 0.45), inset 0 0 12px rgba(56, 189, 248, 0.2);
     --glow-gold: 0 0 22px rgba(245, 158, 11, 0.55), inset 0 0 14px rgba(245, 158, 11, 0.25);
     --glow-purple: 0 0 24px rgba(192, 132, 252, 0.5), inset 0 0 14px rgba(192, 132, 252, 0.2);
   }
   ```

2. **64-Bit Scanline & CRT Texture Overlays**:
   Add subtle retro CRT scanline overlays across modal panels using:
   ```css
   .glass-panel-64bit::before {
     content: '';
     position: absolute;
     inset: 0;
     background: repeating-linear-gradient(
       0deg,
       rgba(0, 0, 0, 0.12) 0px,
       rgba(0, 0, 0, 0.12) 1px,
       transparent 1px,
       transparent 2px
     );
     pointer-events: none;
     border-radius: inherit;
   }
   ```

3. **Pixel Art Beveled Borders**:
   Construct crisp pixelized double borders using `box-shadow`:
   ```css
   .pixel-glass-border {
     border: 2px solid var(--neon-cyan) !important;
     box-shadow:
       0 0 0 2px #0f172a,
       0 0 16px var(--neon-cyan),
       inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
   }
   ```

4. **Responsive Layout Adaptations**:
   - **Mobile Breakpoint (`@media (max-width: 768px)`)**:
     - `#hud`: Convert into horizontal scrolling flex bar (`overflow-x: auto`, `white-space: nowrap`), reducing button padding to `4px 8px` and font sizes to `10px`.
     - `#quiz-ui`, `#vocab-panel`, `#shop-panel`, `#fish-album-panel`, `#trophy-panel`, `#duel-panel`: Adjust width from desktop standard (`min(900px, 96vw)`) to `96vw`, and set `max-height: 92vh`.
     - Stacking multi-column layouts: convert `#cat-dialog-body`, `#duel-stage`, and `#duel-options-grid` to single-column flex flex-direction on screen widths below `640px`.

---

## 3. Caveats
- No source code modifications were performed during this read-only exploration task.
- Phaser canvas rendering performance must be monitored when heavy CSS `backdrop-filter: blur()` is active over high-resolution display densities.

---

## 4. Conclusion
The HUD and modal overlay structure of Hangeul Valley is clean, modular, and well-organized across `index.html` and `game.js`. All 14 UI modal components are fully cataloged with exact selectors, lines, z-indexes, and handler functions. Integrating a 64-bit glassmorphic theme with neon glows and responsive layouts can be achieved cleanly by updating CSS variables and modal panel container rules without breaking existing JS event triggers or Phaser game logic.

---

## 5. Verification Method

To verify these observations independently:
1. Inspect `index.html` lines `10-1039` for CSS rules and lines `1043-1385` for HTML overlay elements.
2. Inspect `game.js` for DOM functions (`openShop()`, `openQuiz()`, `openVocabBook()`, `openFishAlbum()`, `openSpellDuel()`, `openMemoryGame()`, `openTrophies()`).
3. Open `index.html` in a web browser, resize window below 768px, and trigger each overlay button in `#hud` to confirm modal positioning and z-index layering.
