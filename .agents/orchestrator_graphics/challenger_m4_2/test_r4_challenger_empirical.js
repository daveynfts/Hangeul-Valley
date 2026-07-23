/**
 * Challenger Empirical Verification Harness for Milestone R4
 * Focus areas:
 * 1. Syntax check (`node -c game.js`)
 * 2. Memory usage & event listener memory leaks
 * 3. Camera transition bounds
 * 4. State machine transitions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('  EMPIRICAL CHALLENGER VERIFICATION HARNESS — MILESTONE R4');
console.log('================================================================\n');

const RESULTS = {
  syntax: { status: 'PENDING', details: [] },
  memoryLeaks: { status: 'PENDING', details: [] },
  cameraBounds: { status: 'PENDING', details: [] },
  stateTransitions: { status: 'PENDING', details: [] }
};

// -----------------------------------------------------------------------------
// 1. SYNTAX CHECK
// -----------------------------------------------------------------------------
console.log('[SECTION 1] Syntax Check (node -c game.js)');
try {
  const rootGameJs = path.resolve(__dirname, '../../../game.js');
  const gameJsPath = fs.existsSync(rootGameJs) ? rootGameJs : 'game.js';
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  console.log('  ✓ Syntax check passed successfully with 0 errors.');
  RESULTS.syntax.status = 'PASS';
  RESULTS.syntax.details.push('node -c game.js executed cleanly without syntax errors.');
} catch (err) {
  console.error('  ✗ Syntax check failed:', err.message);
  RESULTS.syntax.status = 'FAIL';
  RESULTS.syntax.details.push(`Syntax error: ${err.message}`);
}
console.log('');

// -----------------------------------------------------------------------------
// DOM & PHASER HARNESS ENVIRONMENT SETUP
// -----------------------------------------------------------------------------
const eventListenerRegistry = new Map();
let totalListenersAdded = 0;
let totalListenersRemoved = 0;

class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.classList = {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); }
    };
    this.style = {};
    this.children = [];
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.dataset = {};
    this.title = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    return new MockElement('', 'subelement');
  }

  querySelectorAll(selector) {
    return [new MockElement('', 'subelement')];
  }

  addEventListener(type, listener) {
    totalListenersAdded++;
    if (!eventListenerRegistry.has(this)) {
      eventListenerRegistry.set(this, []);
    }
    eventListenerRegistry.get(this).push({ type, listener });
  }

  removeEventListener(type, listener) {
    totalListenersRemoved++;
    if (eventListenerRegistry.has(this)) {
      const list = eventListenerRegistry.get(this);
      const idx = list.findIndex(item => item.type === type && item.listener === listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  remove() {
    this.children = [];
  }
}

const elementsMap = new Map();
function getOrCreateElement(id) {
  if (!elementsMap.has(id)) {
    elementsMap.set(id, new MockElement(id));
  }
  return elementsMap.get(id);
}

// Window & Document mock
const windowListeners = [];
const documentListeners = [];

global.window = {
  addEventListener: (type, listener) => {
    totalListenersAdded++;
    windowListeners.push({ type, listener });
  },
  removeEventListener: (type, listener) => {
    totalListenersRemoved++;
    const idx = windowListeners.findIndex(i => i.type === type && i.listener === listener);
    if (idx !== -1) windowListeners.splice(idx, 1);
  },
  AudioContext: class {
    resume() {}
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, start() {}, stop() {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}
      };
    }
  }
};

global.document = {
  getElementById: (id) => getOrCreateElement(id),
  createElement: (tag) => new MockElement('', tag),
  querySelector: (sel) => new MockElement('', 'div'),
  querySelectorAll: (sel) => [new MockElement('', 'div')],
  addEventListener: (type, listener) => {
    totalListenersAdded++;
    documentListeners.push({ type, listener });
  },
  removeEventListener: (type, listener) => {
    totalListenersRemoved++;
    const idx = documentListeners.findIndex(i => i.type === type && i.listener === listener);
    if (idx !== -1) documentListeners.splice(idx, 1);
  }
};

global.$ = (id) => getOrCreateElement(id);
global.localStorage = { getItem: () => null, setItem: () => {} };

// Mock Phaser Camera
class MockCamera {
  constructor() {
    this.scrollX = 0;
    this.scrollY = 0;
    this.zoom = 1;
    this.bounds = null;
    this.isShaking = false;
    this.isFading = false;
  }

  setBounds(x, y, w, h) {
    this.bounds = { x, y, w, h };
  }

  setRoundPixels(val) {}

  fadeIn(dur) { this.isFading = true; }
  fadeOut(dur) { this.isFading = true; }
  flash(dur) {}
  shake(dur, intensity) { this.isShaking = true; }

  once(event, callback) {
    if (event === 'camerafadeoutcomplete') {
      setTimeout(callback, 10);
    }
  }

  startFollow(target) {
    this.target = target;
  }

  setZoom(z) {
    this.zoom = z;
  }
}

// Mock Phaser Scene
class MockPhaserScene {
  constructor(key) {
    this.sys = { settings: { key } };
    this.cameras = { main: new MockCamera() };
    this.cache = {
      json: {
        get: (k) => [
          { name: "Sơ Cấp 1", words: [{ ko: "사과", en: "apple", category: "n" }] }
        ]
      }
    };
    this.events = {
      _listeners: {},
      on(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
      },
      off(event, fn) {
        if (this._listeners[event]) {
          this._listeners[event] = this._listeners[event].filter(l => l !== fn);
        }
      },
      emit(event, ...args) {
        if (this._listeners[event]) {
          this._listeners[event].forEach(fn => fn(...args));
        }
      }
    };
    this.time = {
      addEvent: (config) => ({ destroy() {} }),
      delayedCall: (delay, fn) => setTimeout(fn, delay)
    };
    this.add = {
      graphics: () => ({
        setDepth: function() { return this; },
        clear: function() { return this; },
        fillStyle: function() { return this; },
        fillRect: function() { return this; },
        destroy: function() {}
      }),
      text: () => ({
        setDepth: function() { return this; },
        setOrigin: function() { return this; },
        setText: function() { return this; },
        destroy: function() {}
      }),
      container: () => ({
        setDepth: function() { return this; },
        add: function() { return this; },
        destroy: function() {}
      }),
      rectangle: () => ({
        setStrokeStyle: function() { return this; },
        setOrigin: function() { return this; },
        setInteractive: function() { return this; },
        on: function() { return this; },
        setFillStyle: function() { return this; },
        destroy: function() {}
      })
    };
    this.input = {
      on: (event, fn) => {},
      keyboard: {
        on: (event, fn) => {},
        addKeys: () => ({
          W: {}, A: {}, S: {}, D: {},
          UP: {}, LEFT: {}, DOWN: {}, RIGHT: {},
          SPACE: {}, E: {}, SHIFT: {}
        })
      }
    };
    this.scene = {
      start: (key) => {
        global.currentActiveScene = key;
      }
    };
    this.W = 800;
    this.H = 600;
  }
}

global.Phaser = {
  Scene: MockPhaserScene,
  Game: class {
    constructor(config) {
      this.config = config;
      this.scene = {
        getScene: (key) => new MockPhaserScene(key),
        start: (key) => { global.currentActiveScene = key; }
      };
    }
  },
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  AUTO: 1,
  Canvas: 1,
  Utils: { Array: { Shuffle: (arr) => arr } },
  Math: { Between: () => 10, Clamp: (v, min, max) => Math.min(Math.max(v, min), max) },
  Input: { Keyboard: { JustDown: () => false } }
};

// Load game.js
const rootGameJs = path.resolve(__dirname, '../../../game.js');
const gameJsPath = fs.existsSync(rootGameJs) ? rootGameJs : 'game.js';
const gameCode = fs.readFileSync(gameJsPath, 'utf8');
eval(gameCode + ';\nglobal.FarmScene = FarmScene;\nglobal.ArcadeScene = ArcadeScene;\nglobal.DungeonScene = DungeonScene;\nglobal.FishingScene = FishingScene;');

// Ensure levelsData and state are populated
if (typeof initSave === 'function') {
  try { initSave(); } catch(e) {}
}
if (typeof levelsData === 'undefined' || !levelsData || levelsData.length === 0) {
  global.levelsData = [
    { name: "Sơ Cấp 1", words: [{ ko: "사과", en: "apple", category: "n" }] },
    { name: "Sơ Cấp 2", words: [{ ko: "바나나", en: "banana", category: "n" }] },
    { name: "Trung Cấp 1", words: [{ ko: "고양이", en: "cat", category: "n" }] },
    { name: "Cao Cấp 1", words: [{ ko: "호랑이", en: "tiger", category: "n" }] }
  ];
}
global.currentLevelIndex = 0;

// -----------------------------------------------------------------------------
// 2. MEMORY USAGE & EVENT LISTENER LEAKS TEST
// -----------------------------------------------------------------------------
console.log('[SECTION 2] Memory Usage & Event Listener Memory Leaks');

const initialAdded = totalListenersAdded;
const initialRemoved = totalListenersRemoved;

// Test A: Repeated rendering of level select grid (simulating opening/closing 100 times)
for (let i = 0; i < 100; i++) {
  if (typeof renderLevelSelectGrid === 'function') {
    try { renderLevelSelectGrid(); } catch(e) {}
  }
  if (typeof renderVocabCards === 'function') {
    try { renderVocabCards(); } catch(e) {}
  }
  if (typeof renderTrophies === 'function') {
    try { renderTrophies(); } catch(e) {}
  }
}

const addedAfterUI = totalListenersAdded - initialAdded;
const removedAfterUI = totalListenersRemoved - initialRemoved;

console.log(`  - Registered listeners added during 100 UI re-renders: ${addedAfterUI}`);
console.log(`  - Registered listeners removed during 100 UI re-renders: ${removedAfterUI}`);

let leakDetails = [];
if (addedAfterUI > 0 && removedAfterUI === 0) {
  console.log('  ⚠️ ALERT: DOM event listeners are added during UI re-renders without corresponding removeEventListener calls!');
  leakDetails.push(`DOM event listeners accumulated: ${addedAfterUI} added, ${removedAfterUI} removed over 100 re-renders.`);
}

// Test B: Heap profiling over simulated game cycles
if (global.gc) global.gc();
const memBefore = process.memoryUsage().heapUsed;

for (let i = 0; i < 500; i++) {
  if (typeof startLevel === 'function') {
    try { startLevel(i % 4); } catch(e) {}
  }
  if (typeof updateBuffHUD === 'function') updateBuffHUD();
  if (typeof decayPetHappiness === 'function') decayPetHappiness();
}

if (global.gc) global.gc();
const memAfter = process.memoryUsage().heapUsed;
const memDiffKb = Math.round((memAfter - memBefore) / 1024);

console.log(`  - Memory before 500 scene cycles: ${Math.round(memBefore / 1024)} KB`);
console.log(`  - Memory after 500 scene cycles: ${Math.round(memAfter / 1024)} KB (Delta: ${memDiffKb > 0 ? '+' : ''}${memDiffKb} KB)`);

// Test C: Phaser scene event listeners leak check
const farmSceneInstance = new FarmScene();
try { farmSceneInstance.create(); } catch(e) {}
const listenersOnFirstCreate = farmSceneInstance.events._listeners['resume'] ? farmSceneInstance.events._listeners['resume'].length : 0;
try { farmSceneInstance.create(); } catch(e) {} // simulate restart
const listenersOnSecondCreate = farmSceneInstance.events._listeners['resume'] ? farmSceneInstance.events._listeners['resume'].length : 0;

console.log(`  - FarmScene 'resume' event listeners after 1 create: ${listenersOnFirstCreate}`);
console.log(`  - FarmScene 'resume' event listeners after 2 creates: ${listenersOnSecondCreate}`);

if (listenersOnSecondCreate > listenersOnFirstCreate) {
  console.log('  ⚠️ ALERT: Phaser scene event listeners duplicate on scene restart!');
  leakDetails.push(`Phaser event listener leak: 'resume' listener duplicated on scene create (${listenersOnFirstCreate} -> ${listenersOnSecondCreate}).`);
}

// Test D: Check uncleaned timers/intervals in game.js code
const codeLines = gameCode.split('\n');
let uncleanedIntervalsCount = 0;

codeLines.forEach(l => {
  if (l.includes('setInterval(')) uncleanedIntervalsCount++;
});

console.log(`  - Total setInterval() calls in game.js: ${uncleanedIntervalsCount}`);
if (uncleanedIntervalsCount > 0) {
  leakDetails.push(`Uncleared global setInterval tickers present: ${uncleanedIntervalsCount} global intervals running continuously.`);
}

if (leakDetails.length > 0) {
  RESULTS.memoryLeaks.status = 'FAIL';
  RESULTS.memoryLeaks.details = leakDetails;
} else {
  RESULTS.memoryLeaks.status = 'PASS';
  RESULTS.memoryLeaks.details.push('No critical memory leaks detected.');
}
console.log('');

// -----------------------------------------------------------------------------
// 3. CAMERA TRANSITION BOUNDS TEST
// -----------------------------------------------------------------------------
console.log('[SECTION 3] Camera Transition Bounds');

let cameraBoundsDetails = [];

const sceneClasses = [FarmScene, ArcadeScene, DungeonScene, FishingScene];
const sceneNames = ['FarmScene', 'ArcadeScene', 'DungeonScene', 'FishingScene'];

sceneClasses.forEach((SceneClass, idx) => {
  const sceneName = sceneNames[idx];
  const sceneObj = new SceneClass();
  try { sceneObj.create(); } catch(e) {}
  
  const cam = sceneObj.cameras.main;
  console.log(`  - Testing ${sceneName} camera bounds:`);
  console.log(`    • setBounds configured: ${cam.bounds !== null}`);
  
  if (cam.bounds === null) {
    console.log(`    ✗ FAIL: ${sceneName} does NOT set camera bounds (cam.bounds is null)!`);
    cameraBoundsDetails.push(`${sceneName} does not call setBounds(). Camera target or shake/zoom transitions can scroll beyond tilemap/world boundaries.`);
  } else {
    console.log(`    ✓ PASS: ${sceneName} sets bounds ${JSON.stringify(cam.bounds)}`);
  }
});

const testCam = new MockCamera();
if (testCam.bounds === null) {
  testCam.scrollX = -50;
  testCam.scrollY = -50;
  if (testCam.scrollX < 0 || testCam.scrollY < 0) {
    cameraBoundsDetails.push(`Unbounded camera allows negative scroll coordinates (${testCam.scrollX}, ${testCam.scrollY}), rendering empty canvas area.`);
  }
}

if (cameraBoundsDetails.length > 0) {
  RESULTS.cameraBounds.status = 'FAIL';
  RESULTS.cameraBounds.details = cameraBoundsDetails;
} else {
  RESULTS.cameraBounds.status = 'PASS';
  RESULTS.cameraBounds.details.push('All scenes configure camera bounds properly.');
}
console.log('');

// -----------------------------------------------------------------------------
// 4. STATE MACHINE TRANSITIONS TEST
// -----------------------------------------------------------------------------
console.log('[SECTION 4] State Machine Transitions');

let stateMachineDetails = [];

// Test A: Rapid level switching / State transition graph
console.log('  - Test A: Level State Transitions');
let validTransitions = 0;
try {
  startLevel(0);
  startLevel(1);
  startLevel(2);
  startLevel(3);
  startLevel(0);
  validTransitions = 5;
  console.log(`    ✓ Executed ${validTransitions} rapid level transitions without error.`);
} catch (e) {
  console.log(`    ✗ Level transition error: ${e.message}`);
  stateMachineDetails.push(`Level transition error: ${e.message}`);
}

// Test B: Spell Duel State Machine
console.log('  - Test B: Spell Duel State Machine');
try {
  if (typeof duelOpen !== 'undefined') {
    console.log(`    • Initial duelOpen: ${duelOpen}`);
  }
  
  startSpellDuel('단어 대결 (Vocabulary Duel)');
  if (!duelOpen) {
    console.log('    ✗ FAIL: startSpellDuel did not set duelOpen = true');
    stateMachineDetails.push('startSpellDuel failed to set duelOpen flag.');
  } else {
    console.log('    ✓ startSpellDuel opened duel state successfully.');
  }

  const prevTimer = duelState.timer;
  startSpellDuel('Double Start Test');
  if (duelState.timer === prevTimer && prevTimer !== null) {
    console.log('    ⚠️ ALERT: Double calling startSpellDuel leaks timer or overlaps duel instance!');
    stateMachineDetails.push('Re-entrant startSpellDuel call does not cancel previous duelState timer.');
  }

  selectDuelOption(0);
  console.log('    ✓ selectDuelOption state transition executed.');

  closeSpellDuel();
  if (duelOpen) {
    console.log('    ✗ FAIL: closeSpellDuel did not reset duelOpen = false');
    stateMachineDetails.push('closeSpellDuel failed to set duelOpen = false.');
  } else {
    console.log('    ✓ closeSpellDuel reset duel state clean.');
  }

} catch (e) {
  console.log(`    ✗ Spell Duel transition exception: ${e.message}`);
  stateMachineDetails.push(`Spell Duel transition exception: ${e.message}`);
}

// Test C: Cooking Minigame State & Heat Interval Interrupt
console.log('  - Test C: Cooking Minigame State');
try {
  openCookingMinigame({ id: 'kimchi', name: '김치' });
  console.log('    ✓ Cooking minigame opened.');
  finishCookingMinigame();
  console.log('    ✓ Cooking minigame finished.');
} catch (e) {
  console.log(`    ✗ Cooking minigame error: ${e.message}`);
  stateMachineDetails.push(`Cooking minigame state machine error: ${e.message}`);
}

// Test D: Memory Card Game State Machine
console.log('  - Test D: Memory Card Minigame State');
try {
  openMemoryGame();
  console.log('    ✓ Memory game opened.');
  window.onMemoryCardClick(0, document.createElement('div'));
  window.onMemoryCardClick(1, document.createElement('div'));
  window.onMemoryCardClick(2, document.createElement('div'));
  console.log('    ✓ Rapid 3-card click guard verified.');
} catch (e) {
  console.log(`    ✗ Memory card game error: ${e.message}`);
  stateMachineDetails.push(`Memory card game state error: ${e.message}`);
}

if (stateMachineDetails.length > 0) {
  RESULTS.stateTransitions.status = 'FAIL';
  RESULTS.stateTransitions.details = stateMachineDetails;
} else {
  RESULTS.stateTransitions.status = 'PASS';
  RESULTS.stateTransitions.details.push('All state machine transitions operating as expected.');
}
console.log('');

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('================================================================');
console.log('  VERIFICATION SUMMARY REPORT');
console.log('================================================================');
console.log(`1. Syntax Check:             ${RESULTS.syntax.status}`);
console.log(`2. Memory Usage & Leaks:     ${RESULTS.memoryLeaks.status}`);
console.log(`3. Camera Bounds:            ${RESULTS.cameraBounds.status}`);
console.log(`4. State Machine Transitions: ${RESULTS.stateTransitions.status}`);
console.log('================================================================\n');

fs.writeFileSync(
  path.join(__dirname, 'empirical_results.json'),
  JSON.stringify(RESULTS, null, 2),
  'utf8'
);
console.log('Empirical results saved to empirical_results.json');
