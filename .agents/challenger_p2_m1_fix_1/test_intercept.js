const fs = require('fs');
const vm = require('vm');

const gameJsContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const dummyElement = {
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {} }
};

const mockWindow = {
  AudioContext: class {},
  webkitAudioContext: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    createElement: () => dummyElement,
    getElementById: () => dummyElement,
    querySelector: () => dummyElement,
    querySelectorAll: () => [],
    body: dummyElement
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  }
};

const mockPhaser = {
  Textures: {
    FilterMode: { NEAREST: 1 }
  },
  Scale: { RESIZE: 0, CENTER_BOTH: 0 },
  Scene: class {},
  Game: class {},
  AUTO: 0
};

const sandbox = {
  window: mockWindow,
  document: mockWindow.document,
  localStorage: mockWindow.localStorage,
  AudioContext: mockWindow.AudioContext,
  webkitAudioContext: mockWindow.webkitAudioContext,
  Phaser: mockPhaser,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval
};

sandbox.global = sandbox;
sandbox.window.window = mockWindow;

vm.createContext(sandbox);

const scriptToRun = gameJsContent + "\nwindow.PixelArtRenderer = PixelArtRenderer;\n";
vm.runInContext(scriptToRun, sandbox);

const PixelArtRenderer = sandbox.window.PixelArtRenderer;

const mockGraphics = new Proxy({}, {
  get(target, prop) {
    if (prop === 'generateTexture' || prop === 'destroy') {
      return () => {};
    }
    return () => mockGraphics;
  }
});

const mockScene = {
  textures: {
    exists: () => false,
    remove: () => {},
    get: () => ({ setFilter: () => {} })
  },
  make: {
    graphics: () => mockGraphics
  },
  _pixelArtTexturesBaked: false,
  _tilemapTexturesGenerated: false
};

const capturedDraws = [];
const originalDrawMatrix = PixelArtRenderer.drawMatrix;

PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox, oy, ps) {
  capturedDraws.push({
    matrix,
    palette,
    ox, oy, ps
  });
  return originalDrawMatrix.call(this, g, matrix, palette, ox, oy, ps);
};

// Call generateAllTextures
console.log("Calling generateAllTextures...");
PixelArtRenderer.generateAllTextures(mockScene);
console.log(`Total matrices captured via drawMatrix: ${capturedDraws.length}`);

for (let i = 0; i < Math.min(10, capturedDraws.length); i++) {
  const draw = capturedDraws[i];
  console.log(`Draw #${i+1}: rows=${draw.matrix.length}, cols=${draw.matrix[0] ? draw.matrix[0].length : 0}`);
}
