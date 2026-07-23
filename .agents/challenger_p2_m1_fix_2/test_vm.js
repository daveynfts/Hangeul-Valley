const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const testCode = code + `
globalThis.runBakeTest = function() {
  const createdTextures = new Set();
  const mockScene = {
    _pixelArtTexturesBaked: false,
    _tilemapTexturesGenerated: false,
    textures: {
      exists: (key) => createdTextures.has(key),
      remove: (key) => createdTextures.delete(key),
      get: (key) => ({ setFilter: () => {} }),
      addCanvas: (key, canvas) => { createdTextures.add(key); },
      generate: (key, options) => { createdTextures.add(key); },
      createCanvas: (key, w, h) => {
        createdTextures.add(key);
        return {
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            clearRect: () => {},
            putImageData: () => {}
          })
        };
      }
    },
    make: {
      graphics: () => ({
        fillStyle: () => {},
        fillRect: () => {},
        fillCircle: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        fillPath: () => {},
        strokePath: () => {},
        lineStyle: () => {},
        fill: () => {},
        stroke: () => {},
        clear: () => {},
        generateTexture: (key, w, h) => { createdTextures.add(key); },
        destroy: () => {}
      })
    }
  };

  PixelArtRenderer.generateAllTextures(mockScene);
  PixelArtRenderer.generateTilemapTextures(mockScene);
  PixelArtRenderer._genWaterTextures(mockScene);
  PixelArtRenderer._genFishingTextures(mockScene);
  FarmScene.prototype._bakeTextures.call(mockScene);

  return createdTextures;
};
`;

const noop = () => {};
const mockElement = {
  addEventListener: noop,
  removeEventListener: noop,
  style: {},
  classList: { add: noop, remove: noop, contains: () => false },
  appendChild: noop,
  removeChild: noop,
  querySelector: () => null,
  querySelectorAll: () => []
};

class MockCanvas {
  constructor(w, h) {
    this.width = w || 32;
    this.height = h || 32;
  }
  getContext(type) {
    return {
      fillStyle: '',
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
      putImageData: () => {},
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    };
  }
}

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  RegExp: RegExp,
  Set: Set,
  Map: Map,
  Uint8ClampedArray: Uint8ClampedArray,
  document: {
    createElement: (tag) => {
      if (tag === 'canvas') return new MockCanvas(32, 32);
      return { ...mockElement };
    },
    addEventListener: noop,
    removeEventListener: noop,
    getElementById: () => mockElement,
    querySelector: () => mockElement,
    querySelectorAll: () => [],
    body: { appendChild: noop, addEventListener: noop }
  },
  window: {
    addEventListener: noop,
    removeEventListener: noop,
    AudioContext: class { createOscillator() { return { connect: noop, start: noop, stop: noop }; } createGain() { return { connect: noop, gain: { value: 0 } }; } },
    webkitAudioContext: class { createOscillator() { return { connect: noop, start: noop, stop: noop }; } createGain() { return { connect: noop, gain: { value: 0 } }; } },
    location: { reload: noop },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop }
  },
  Phaser: {
    AUTO: 0,
    WEBGL: 1,
    CANVAS: 2,
    Scale: { RESIZE: 1, CENTER_BOTH: 1, FIT: 2 },
    Physics: { ARCADE: 1 },
    Input: { Keyboard: { KeyCodes: {} } },
    Textures: { FilterMode: { NEAREST: 1 } },
    Scene: class {},
    Game: class {}
  }
};
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;

try {
  vm.createContext(sandbox);
  vm.runInContext(testCode, sandbox);

  const textures = sandbox.runBakeTest();
  console.log(`Bake test generated total ${textures.size} unique textures`);
  const decorKeys = [
    'bf_open', 'bf_flap', 'stone_well', 'pixel_barrel', 'pixel_crate',
    'signpost', 'tree', 'fnc_post', 'fnc_rail', 'sparkle',
    'coin', 'shop_sign', 'notice_board', 'dungeon_portal', 'arcade_machine'
  ];
  let missingDecor = decorKeys.filter(k => !textures.has(k));
  console.log(`Missing decor keys (${missingDecor.length}):`, missingDecor);
} catch (e) {
  console.error('Error executing bake test in VM context:', e.stack || e);
}
