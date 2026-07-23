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
  localStorage: { getItem: () => null, setItem: () => {} }
};

const mockPhaser = {
  Textures: { FilterMode: { NEAREST: 1 } },
  Scale: { RESIZE: 0, CENTER_BOTH: 0 },
  Scene: class {}, Game: class {}, AUTO: 0
};

const sandbox = {
  window: mockWindow, document: mockWindow.document, localStorage: mockWindow.localStorage,
  AudioContext: mockWindow.AudioContext, webkitAudioContext: mockWindow.webkitAudioContext,
  Phaser: mockPhaser, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval
};
sandbox.global = sandbox; sandbox.window.window = mockWindow;
vm.createContext(sandbox);
vm.runInContext(gameJsContent + "\nwindow.PixelArtRenderer = PixelArtRenderer;\n", sandbox);

const PixelArtRenderer = sandbox.window.PixelArtRenderer;

const mockGraphics = new Proxy({}, {
  get(target, prop) {
    if (prop === 'generateTexture' || prop === 'destroy') return () => {};
    return () => mockGraphics;
  }
});

const mockScene = {
  textures: { exists: () => false, remove: () => {}, get: () => ({ setFilter: () => {} }) },
  make: { graphics: () => mockGraphics },
  _pixelArtTexturesBaked: false, _tilemapTexturesGenerated: false
};

const capturedDraws = [];
const originalDrawMatrix = PixelArtRenderer.drawMatrix;

PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox, oy, ps) {
  const err = new Error();
  capturedDraws.push({ matrix, palette, ox, oy, ps, stack: err.stack });
  return originalDrawMatrix.call(this, g, matrix, palette, ox, oy, ps);
};

PixelArtRenderer.generateAllTextures(mockScene);

const draw22 = capturedDraws[21]; // 0-indexed
console.log("Draw #22 details:");
console.log("Stack:", draw22.stack.split('\n').slice(0, 5).join('\n'));
console.log("Palette keys:", Object.keys(draw22.palette));
console.log("Matrix:");
draw22.matrix.forEach((r, idx) => {
  console.log(`${idx}: "${r}"`);
});
