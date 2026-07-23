const fs = require('fs');
const lines = fs.readFileSync('game.js', 'utf8').split('\n');

// Extract PixelArtRenderer class (lines 117 to 1508)
const pixelArtRendererCode = lines.slice(116, 1508).join('\n');

class MockGraphics {
  constructor() { this.fills = []; this.rects = []; }
  fillStyle(col, alpha) { this.fills.push({col, alpha}); }
  fillRect(x, y, w, h) { this.rects.push({x, y, w, h}); }
  generateTexture(key, width, height) {
    this.key = key;
    this.width = width;
    this.height = height;
    mockScene.textures.createdTextures[key] = {
      key, width, height,
      rectCount: this.rects.length,
      filterMode: null,
      setFilter(mode) { this.filterMode = mode; }
    };
  }
  destroy() { this.destroyed = true; }
}

const mockScene = {
  make: {
    graphics: () => new MockGraphics()
  },
  textures: {
    createdTextures: {},
    exists: function(key) { return !!this.createdTextures[key]; },
    remove: function(key) { delete this.createdTextures[key]; },
    get: function(key) { return this.createdTextures[key]; }
  },
  anims: {
    registeredAnims: {},
    exists: function(key) { return !!this.registeredAnims[key]; },
    create: function(config) { this.registeredAnims[config.key] = config; }
  }
};

const vm = require('vm');
const context = vm.createContext({
  mockScene,
  Phaser: { Textures: { FilterMode: { NEAREST: 1 } } },
  console
});

try {
  vm.runInContext(pixelArtRendererCode, context);
  vm.runInContext('PixelArtRenderer.generateAllTextures(mockScene)', context);
  
  const created = mockScene.textures.createdTextures;
  const anims = mockScene.anims.registeredAnims;
  
  console.log('SUCCESS: PixelArtRenderer executed cleanly!');
  console.log('Total texture objects created:', Object.keys(created).length);
  console.log('Total animation objects registered:', Object.keys(anims).length);
  console.log('\n--- PLAYER WALK CYCLE TEXTURES & ANIMATIONS ---');
  const playerTextures = Object.keys(created).filter(k => k.startsWith('player_walk_'));
  playerTextures.forEach(k => {
    console.log(`  Texture '${k}': width=${created[k].width}px, height=${created[k].height}px, filterMode=${created[k].filterMode}, rectCount=${created[k].rectCount}`);
  });
  console.log('\n--- REGISTERED ANIMATIONS ---');
  Object.keys(anims).forEach(k => {
    console.log(`  Anim '${k}': frames=[${anims[k].frames.map(f=>f.key).join(', ')}], rate=${anims[k].frameRate}, repeat=${anims[k].repeat}`);
  });

  console.log('\n--- SAMPLE CATEGORY TEXTURES ---');
  ['cat_idle_0', 'wizard_idle_0', 'tile_tilled_soil', 'crop_cabbage_3', 'fishing_salmon', 'arcade_player_ship', 'dungeon_green_slime'].forEach(k => {
    if (created[k]) {
      console.log(`  Texture '${k}': ${created[k].width}x${created[k].height}px, rects=${created[k].rectCount}`);
    } else {
      console.log(`  MISSING: ${k}`);
    }
  });

} catch (err) {
  console.error('ERROR during test execution:', err);
  process.exit(1);
}
