# Technical Context Index

## Project Structure
- Project Root: `C:/VibeCode/Hangeul Valley`
- Main Logic: `game.js` (~6000+ lines, Phaser 3 game engine, 7 scenes)
- User Interface: `index.html` (64-Bit Retro Glassmorphism HTML/CSS overlays)
- Assets Directory: `assets/` (mirror of root `game.js`, `index.html`, `levels.json`, `save_data.json`)
- Agent Workspace: `C:/VibeCode/Hangeul Valley/.agents/orchestrator_graphics/`

## Key Phaser 3 Graphics Techniques for 48x48 Procedural Pixel Art
- Create an offscreen Graphics object: `const g = scene.make.graphics({ x: 0, y: 0, add: false });`
- Use pixel grid drawing helper:
  ```js
  function drawPixelMatrix(g, palette, matrix, scale = 3) {
    // 16x16 matrix scaled by 3 = 48x48 pixels
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const colorIdx = matrix[r][c];
        if (colorIdx !== 0 && palette[colorIdx]) {
          g.fillStyle(palette[colorIdx], 1);
          g.fillRect(c * scale, r * scale, scale, scale);
        }
      }
    }
  }
  ```
- Generate texture and register key:
  `g.generateTexture('texture_key', 48, 48);`
  `g.destroy();`

## Stardew Valley Color Palette Standards
- Grass / Earthy Greens: `#4a7c59`, `#68a357`, `#345235`, `#2d402b`, `#88c070`
- Tilled Soil / Earthy Browns: `#7c4e2e`, `#5a351e`, `#3d2110`, `#a06941`
- Water / Sky Blues: `#3a7ca5`, `#2b5c7e`, `#1b3b52`, `#5ca0cc`, `#8ecae6`
- Harvest Gold / Warm Accents: `#e9c46a`, `#f4a261`, `#e76f51`, `#d4a373`
- Wood / Pier Browns: `#8c5a3c`, `#6e442a`, `#52311c`, `#b07d57`
- Stone / Dungeon Slate: `#4a5568`, `#2d3748`, `#1a202c`, `#718096`

## Syntax and Sync Validation
- Command: `node -c game.js`
- File mirror sync: copy updated `game.js` and `index.html` to `assets/game.js` and `assets/index.html`.
