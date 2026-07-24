const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== RUNTIME DRY-RUN VERIFICATION ===");

// Read game.js
const gameJsPath = path.resolve(__dirname, '../../game.js');
const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

// Mock a minimal DOM and window object for node VM execution
const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    getElementById: (id) => ({
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {}
    }),
    body: { appendChild: () => {} }
  },
  location: { reload: () => {} },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  Phaser: {
    Game: function() {},
    Scene: class {},
    Scale: { RESIZE: 1, CENTER_BOTH: 1 },
    AUTO: 0,
    WEBGL: 1,
    CANVAS: 2,
    Math: { Between: (a, b) => a }
  },
  console: console
};

mockWindow.window = mockWindow;
mockWindow.setTimeout = setTimeout;
mockWindow.clearTimeout = clearTimeout;
mockWindow.setInterval = setInterval;
mockWindow.clearInterval = clearInterval;

const context = vm.createContext(mockWindow);

try {
  // Execute top-level definitions in game.js to ensure no syntax errors, reference errors, or undefined variables
  vm.runInContext(gameJsCode, context);
  console.log("SUCCESS: game.js loaded and evaluated cleanly in VM context!");
} catch (err) {
  console.error("FAIL: game.js evaluation threw an error:", err);
  process.exit(1);
}
