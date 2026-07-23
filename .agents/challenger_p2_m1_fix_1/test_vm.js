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
  Scale: {
    RESIZE: 0,
    CENTER_BOTH: 0
  },
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

try {
  vm.createContext(sandbox);
  // append expose line
  const scriptToRun = gameJsContent + "\nwindow.PixelArtRenderer = PixelArtRenderer;\nwindow.STARDEW_PALETTE = typeof STARDEW_PALETTE !== 'undefined' ? STARDEW_PALETTE : null;\nwindow.TILEMAP_PALETTE = typeof TILEMAP_PALETTE !== 'undefined' ? TILEMAP_PALETTE : null;\nwindow.DECOR_PALETTE = typeof DECOR_PALETTE !== 'undefined' ? DECOR_PALETTE : null;\n";
  vm.runInContext(scriptToRun, sandbox);
  console.log("Successfully evaluated game.js in VM!");
  console.log("PixelArtRenderer available:", typeof sandbox.window.PixelArtRenderer);
} catch (e) {
  console.error("Evaluation error:", e);
}
