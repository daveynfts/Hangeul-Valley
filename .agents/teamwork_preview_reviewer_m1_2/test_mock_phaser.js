const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '../../game.js');
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

class MockGraphics {
  constructor(texturesManager) {
    this.texturesManager = texturesManager;
  }
  fillStyle(color, alpha) {}
  fillRect(x, y, w, h) {}
  generateTexture(key, width, height) {
    this.texturesManager.textures.set(key, { setFilter: () => {} });
  }
  destroy() {}
}

class MockTexturesManager {
  constructor() {
    this.textures = new Map();
  }
  exists(key) {
    return this.textures.has(key);
  }
  remove(key) {
    this.textures.delete(key);
  }
  get(key) {
    return this.textures.get(key);
  }
}

class MockAnimsManager {
  constructor() {
    this.anims = new Map();
  }
  exists(key) {
    return this.anims.has(key);
  }
  create(config) {
    this.anims.set(config.key, config);
  }
}

class MockScene {
  constructor() {
    this.textures = new MockTexturesManager();
    this.anims = new MockAnimsManager();
    this.make = {
      graphics: () => new MockGraphics(this.textures)
    };
  }
}

global.window = global;
global.document = {};
global.Phaser = {
  Game: class {},
  Scene: class {},
  Math: { Between: () => 0 },
  Textures: { FilterMode: { NEAREST: 1 } }
};

try {
  const rendererMatch = gameJsContent.match(/class PixelArtRenderer \{[\s\S]*?\n\}/);
  if (!rendererMatch) {
    console.error("Could not find PixelArtRenderer class!");
    process.exit(1);
  }

  const rendererCode = rendererMatch[0];
  const evalRenderer = new Function('scene', `
    ${rendererCode}
    PixelArtRenderer._genPlayerTextures(scene);
    return scene;
  `);

  const mockScene = new MockScene();
  evalRenderer(mockScene);

  console.log("=== MOCK PHASER EXECUTION TEST ===");
  console.log(`Created textures count: ${mockScene.textures.textures.size}`);
  console.log("Textures keys:", Array.from(mockScene.textures.textures.keys()));
  console.log(`Created anims count: ${mockScene.anims.anims.size}`);
  console.log("Anims keys:", Array.from(mockScene.anims.anims.keys()));

  const expectedTextures = [
    'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
    'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
    'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
    'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
    'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
    'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
    'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle',
    'farmer0', 'farmer1', 'farmer2', 'farmer3'
  ];

  let missingTextures = [];
  for (const tex of expectedTextures) {
    if (!mockScene.textures.exists(tex)) {
      missingTextures.push(tex);
    }
  }

  if (missingTextures.length === 0) {
    console.log("[PASS] All expected 27 textures successfully created in texture manager!");
  } else {
    console.log(`[FAIL] Missing textures: ${missingTextures.join(', ')}`);
  }

  const expectedAnims = [
    'player-walk-down', 'player-walk-up', 'player-walk-left', 'player-walk-right',
    'player-water', 'player-harvest', 'player-pick'
  ];

  let missingAnims = [];
  for (const anim of expectedAnims) {
    if (!mockScene.anims.exists(anim)) {
      missingAnims.push(anim);
    }
  }

  if (missingAnims.length === 0) {
    console.log("[PASS] All expected 7 animations successfully created in anims manager!");
  } else {
    console.log(`[FAIL] Missing anims: ${missingAnims.join(', ')}`);
  }

} catch (e) {
  console.error("Execution error:", e);
}
