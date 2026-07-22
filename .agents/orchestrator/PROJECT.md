# Project: Hangeul Valley UI/UX & Web Audio Engine Upgrade

## Architecture
- Game Engine: HTML5 + JavaScript (Phaser / Canvas / DOM Hybrid)
- Target Files: `index.html`, `game.js`, CSS/Assets, Web Audio API engine
- Requirements:
  - R1: 64-Bit Retro Glassmorphic HUD & Modal Design System (Shop, Vocab Book, Quiz, Level Select, Fish Album, HUD, responsive neon glow glassmorphism, pixel art details)
  - R2: Web Audio API Synthesized Sound Effects & Audio Feedback (pure JS 64-bit chiptune sound synthesis: button click, crop harvest, fishing pull, sword swing, correct/wrong quiz sounds)
  - R3: Smooth Micro-Animations, Lighting & Scene Transitions (64-bit micro-animations, fade-in/out transitions between Farm, Arcade, Dungeon, Fishing scenes, soothing day/night ambient lighting)
  - Validation: `node -c game.js` must pass with 100% success and 0 errors.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Codebase Exploration | Analyze game.js, index.html, levels.json, asset structures | None | DONE |
| M2 | R1: Retro Glassmorphic HUD & Modals | CSS & HTML/Phaser 64-bit retro glassmorphism design system for HUD, Shop, Vocab, Quiz, Level Select, Fish Album | M1 | DONE |
| M3 | R2: Web Audio API Sound Synthesizer | Pure JS Web Audio chiptune synthesis module & audio hooks for all interactions | M1 | DONE |
| M4 | R3: Micro-Animations & Scene Transitions | Scene fade transitions, ambient day/night lighting, micro-animations | M2, M3 | DONE |
| M5 | Final E2E Integration & Verification | Syntax validation (`node -c game.js`), UI layout check, audio & transition sanity verification | M4 | DONE |

## Interface Contracts
### Web Audio API Synthesizer Interface
- `playChiptuneSFX(type)`: handles 'click', 'harvest', 'fishing_pull', 'sword_swing', 'quiz_correct', 'quiz_wrong'.
- Fallback: Gracefully handles AudioContext unlock on user interaction.

### Retro Glassmorphism UI Components
- Modal classes (`.glass-modal`, `.glass-hud`, `.neon-border`, `.pixel-art-detail`) and modal lifecycle handlers in JS.

## Code Layout
- `game.js`: Primary Phaser/JS game logic, scene definitions, entity management, audio triggers, UI modal event handlers.
- `index.html`: DOM overlays, CSS stylesheets, retro glassmorphism modal structures, HUD markup.
