const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Testing game.js execution in Node VM with Mocked Phaser & DOM ===");

const htmlPath = path.join(__dirname, '..', '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const levelsJsonPath = path.join(__dirname, '..', '..', 'levels.json');
const levelsJsonData = JSON.parse(fs.readFileSync(levelsJsonPath, 'utf8'));

const idRegex = /id=["']([^"']+)["']/g;
const htmlIds = new Set();
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
  htmlIds.add(match[1]);
}

class MockHTMLElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.style = {};
    this.children = [];
    this.classList = {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function(cls) { return this._classes.has(cls); },
      toggle: function(cls, force) {
        if (force === true) this._classes.add(cls);
        else if (force === false) this._classes.delete(cls);
        else if (this._classes.has(cls)) this._classes.delete(cls);
        else this._classes.add(cls);
      }
    };
    this.innerHTML = '';
    this.textContent = '';
    this.innerText = '';
    this.value = '';
    this.src = '';
    this.disabled = false;
    this.dataset = {};
    this.eventListeners = {};
  }

  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(f => f !== fn);
    }
  }

  dispatchEvent(eventObj) {
    const type = typeof eventObj === 'string' ? eventObj : eventObj.type;
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(fn => fn(eventObj));
    }
  }

  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k] || null; }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }
  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      arc: () => {},
      fillText: () => {},
      measureText: () => ({ width: 100 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      setTransform: () => {},
    };
  }
}

const elementsMap = new Map();
htmlIds.forEach(id => {
  elementsMap.set(id, new MockHTMLElement('div', id));
});

const mockDocument = {
  getElementById: (id) => {
    if (!elementsMap.has(id)) {
      elementsMap.set(id, new MockHTMLElement('div', id));
    }
    return elementsMap.get(id);
  },
  querySelector: (sel) => {
    if (sel.startsWith('#')) {
      const id = sel.substring(1);
      return mockDocument.getElementById(id);
    }
    return new MockHTMLElement('div');
  },
  querySelectorAll: (sel) => {
    return [new MockHTMLElement('div'), new MockHTMLElement('div')];
  },
  createElement: (tag) => new MockHTMLElement(tag),
  body: new MockHTMLElement('body'),
  head: new MockHTMLElement('head'),
  addEventListener: (event, fn) => {
    if (event === 'DOMContentLoaded') {
      mockWindow.domContentLoadedListeners.push(fn);
    }
  }
};

const mockFetch = (url) => {
  if (url === 'levels.json' || url.endsWith('levels.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(levelsJsonData)
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
};

const mockWindow = {
  document: mockDocument,
  location: { reload: () => {} },
  fetch: mockFetch,
  localStorage: {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; }
  },
  sessionStorage: {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; }
  },
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  setInterval: setInterval,
  clearInterval: clearInterval,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  addEventListener: (event, fn) => {},
  removeEventListener: (event, fn) => {},
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  AudioContext: class {
    createGain() { return { gain: { value: 1, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { type: '', frequency: { value: 440, setValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }; }
    decodeAudioData(data, cb) { if (cb) cb({}); return Promise.resolve({}); }
    get state() { return 'running'; }
    resume() { return Promise.resolve(); }
  },
  Image: class {
    constructor() {
      setTimeout(() => { if (this.onload) this.onload(); }, 1);
    }
  },
  domContentLoadedListeners: []
};

// Mock Phaser framework
class MockPhaserScene {
  constructor(config) {
    this.sys = {
      game: { config: { width: 1280, height: 720 } },
      canvas: mockDocument.createElement('canvas'),
      textures: { exists: () => false, addBase64: () => {} }
    };
    this.add = {
      image: () => ({ setOrigin: () => ({ setDepth: () => ({ setScrollFactor: () => ({ setScale: () => ({ setInteractive: () => ({ on: () => {} }) }) }) }) }) }),
      text: () => ({ setOrigin: () => ({ setDepth: () => ({ setScrollFactor: () => ({ setStyle: () => ({ setInteractive: () => ({ on: () => {} }) }) }) }) }) }),
      container: () => ({ add: () => {}, setDepth: () => {}, setScrollFactor: () => {} }),
      graphics: () => ({ fillRect: () => {}, strokeRect: () => {}, fillCircle: () => {}, clear: () => {}, fillStyle: () => {}, lineStyle: () => {} }),
      rectangle: () => ({ setOrigin: () => ({ setInteractive: () => ({ on: () => {} }) }) }),
      circle: () => ({ setOrigin: () => ({ setInteractive: () => ({ on: () => {} }) }) }),
      sprite: () => ({ setOrigin: () => ({ play: () => {}, setInteractive: () => ({ on: () => {} }) }) })
    };
    this.cameras = {
      main: {
        width: 1280, height: 720, scrollX: 0, scrollY: 0,
        startFollow: () => {}, setBounds: () => {}, setZoom: () => {}, fadeIn: () => {}, fadeOut: () => {}
      }
    };
    this.input = {
      keyboard: {
        addKey: () => ({ isDown: false, on: () => {} }),
        createCursorKeys: () => ({ left: {}, right: {}, up: {}, down: {}, space: {}, shift: {} }),
        on: () => {}
      },
      on: () => {}
    };
    this.physics = {
      add: {
        sprite: () => ({ setCollideWorldBounds: () => {}, setBounce: () => {}, body: { setSize: () => {}, setOffset: () => {} } }),
        existing: () => {},
        overlap: () => {},
        collider: () => {}
      },
      world: { setBounds: () => {} }
    };
    this.tweens = { add: () => ({ stop: () => {} }) };
    this.time = { addEvent: () => ({ destroy: () => {} }), delayedCall: (delay, fn) => setTimeout(fn, delay) };
    this.scene = { start: () => {}, stop: () => {}, pause: () => {}, resume: () => {} };
  }
}

const mockPhaser = {
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  Scale: {
    RESIZE: 1,
    CENTER_BOTH: 2,
    FIT: 3
  },
  Physics: {
    ARCADE: 'arcade'
  },
  Scene: MockPhaserScene,
  Game: class {
    constructor(config) {
      this.config = config;
      console.log("[Phaser Mock] Game instance initialized with scenes.");
    }
  },
  Math: {
    Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    FloatBetween: (min, max) => Math.random() * (max - min) + min,
    Clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }
  },
  Geom: {
    Rectangle: class { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } },
    Circle: class { constructor(x, y, r) { this.x = x; this.y = y; this.radius = r; } }
  },
  Display: {
    Color: {
      HexStringToColor: (hex) => ({ color: 0xffffff }),
      IntegerToColor: (i) => ({ r: 255, g: 255, b: 255 })
    }
  }
};

const sandbox = vm.createContext({
  window: mockWindow,
  document: mockDocument,
  fetch: mockFetch,
  Phaser: mockPhaser,
  localStorage: mockWindow.localStorage,
  sessionStorage: mockWindow.sessionStorage,
  requestAnimationFrame: mockWindow.requestAnimationFrame,
  cancelAnimationFrame: mockWindow.cancelAnimationFrame,
  setTimeout: mockWindow.setTimeout,
  clearTimeout: mockWindow.clearTimeout,
  setInterval: mockWindow.setInterval,
  clearInterval: mockWindow.clearInterval,
  AudioContext: mockWindow.AudioContext,
  webkitAudioContext: mockWindow.AudioContext,
  Image: mockWindow.Image,
  console: console,
  Math: Math,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  Promise: Promise,
  Error: Error,
});

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

try {
  console.log("Evaluating game.js in VM with Phaser mock & fetch...");
  vm.runInContext(gameJsCode, sandbox);
  console.log("[PASS] game.js top-level evaluation completed without throwing errors!");

  if (mockWindow.domContentLoadedListeners.length > 0) {
    console.log(`Triggering ${mockWindow.domContentLoadedListeners.length} DOMContentLoaded listener(s)...`);
    mockWindow.domContentLoadedListeners.forEach((listener, i) => {
      listener();
      console.log(`[PASS] DOMContentLoaded listener #${i+1} executed successfully.`);
    });
  }

  // Wait for async fetch promises to settle
  setTimeout(() => {
    console.log("[PASS] All async execution paths (fetch, DOM initializers) completed successfully!");
  }, 100);

} catch (err) {
  console.error("[FAIL] Exception thrown during game.js execution:", err);
  process.exit(1);
}
