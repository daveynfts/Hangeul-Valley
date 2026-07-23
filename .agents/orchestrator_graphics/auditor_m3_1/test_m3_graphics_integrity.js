const fs = require('fs');
const vm = require('vm');

console.log('=== Independent Forensic Audit: Milestone R3 Graphics & Atmosphere ===\n');

// 1. Mock DOM and Phaser environment for VM sandbox
const mockTextures = new Map();

class MockGraphics {
  constructor() { this.destroyed = false; }
  fillStyle() { return this; }
  fillRect() { return this; }
  fillCircle() { return this; }
  beginPath() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  closePath() { return this; }
  fillPath() { return this; }
  clear() { return this; }
  setDepth() { return this; }
  setScrollFactor() { return this; }
  generateTexture(key, width, height) {
    const texObj = { key, width, height, filterMode: null, setFilter(m) { this.filterMode = m; } };
    mockTextures.set(key, texObj);
    return this;
  }
  destroy() { this.destroyed = true; }
}

const mockPhaser = {
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  BlendModes: { ADD: 'ADD' },
  Scale: { RESIZE: 1, CENTER_BOTH: 1, FIT: 2 },
  Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68 }, JustDown: () => false } },
  Textures: { FilterMode: { NEAREST: 0, LINEAR: 1 } },
  Math: {
    Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    Clamp: (v, min, max) => Math.min(Math.max(v, min), max),
    Distance: { Between: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2) }
  },
  Scene: class Scene {},
  Game: class Game { constructor(cfg) { this.config = cfg; } }
};

const mockDoc = {
  getElementById: () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {} }),
  querySelector: () => ({ classList: { add() {}, remove() {} } }),
  querySelectorAll: () => [],
  createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }),
  addEventListener() {},
  body: {}
};

const mockScene = {
  make: { graphics: () => new MockGraphics() },
  add: {
    graphics: () => new MockGraphics(),
    image: (x, y, key) => ({
      x, y, key, scale: 1, alpha: 1, blendMode: null, depth: 0, _followTarget: null,
      setScale: function(s) { this.scale = s; return this; },
      setAlpha: function(a) { this.alpha = a; return this; },
      setBlendMode: function(b) { this.blendMode = b; return this; },
      setDepth: function(d) { this.depth = d; return this; },
      setPosition: function(nx, ny) { this.x = nx; this.y = ny; return this; }
    }),
    ellipse: (x, y, w, h, color, alpha) => ({
      x, y, baseW: w, baseH: h, color, alpha, depth: 0, scaleX: 1, scaleY: 1,
      setDepth: function(d) { this.depth = d; return this; },
      setPosition: function(nx, ny) { this.x = nx; this.y = ny; return this; },
      setScale: function(sx, sy) { this.scaleX = sx; this.scaleY = sy; return this; },
      setAlpha: function(a) { this.alpha = a; return this; }
    }),
    particles: (x, y, key, config) => ({
      x, y, key, config, emitting: config.emitting,
      start: function() { this.emitting = true; },
      stop: function() { this.emitting = false; },
      setScrollFactor: function() { return this; },
      setDepth: function() { return this; }
    })
  },
  textures: {
    exists: (k) => mockTextures.has(k),
    remove: (k) => mockTextures.delete(k),
    get: (k) => mockTextures.get(k)
  },
  scale: { width: 1024, height: 768, on() {} },
  cache: { json: { get: () => [] } }
};

const sandbox = {
  window: { addEventListener() {}, document: mockDoc, localStorage: { getItem: () => null, setItem() {} }, innerWidth: 1024, innerHeight: 768, Phaser: mockPhaser },
  document: mockDoc,
  localStorage: { getItem: () => null, setItem() {} },
  Phaser: mockPhaser,
  console, setTimeout, clearTimeout, setInterval, clearInterval, Math
};
sandbox.global = sandbox;
vm.createContext(sandbox);

const gameCode = fs.readFileSync('C:/VibeCode/Hangeul Valley/game.js', 'utf8');
vm.runInContext(gameCode, sandbox);

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFailed++;
  }
}

// Extract classes from VM
const PixelArtRenderer = vm.runInContext('PixelArtRenderer', sandbox);
const DayNightSystem = vm.runInContext('DayNightSystem', sandbox);
const AmbientLightingSystem = vm.runInContext('AmbientLightingSystem', sandbox);
const DynamicShadowSystem = vm.runInContext('DynamicShadowSystem', sandbox);
const WeatherEngine = vm.runInContext('WeatherEngine', sandbox);

// Test 1: Class Existence
console.log('1. Verifying Class Declarations:');
assert(typeof PixelArtRenderer !== 'undefined', 'PixelArtRenderer defined');
assert(typeof DayNightSystem !== 'undefined', 'DayNightSystem defined');
assert(typeof AmbientLightingSystem !== 'undefined', 'AmbientLightingSystem defined');
assert(typeof DynamicShadowSystem !== 'undefined', 'DynamicShadowSystem defined');
assert(typeof WeatherEngine !== 'undefined', 'WeatherEngine defined');

// Test 2: Procedural Texture Generation
console.log('\n2. Testing Procedural Texture Pipeline:');
PixelArtRenderer._genParticleTextures(mockScene);
PixelArtRenderer._genLightingTextures(mockScene);
PixelArtRenderer._genParallaxTextures(mockScene);
PixelArtRenderer._genWaterTextures(mockScene);

const requiredTextures = [
  'p_drop', 'p_snowflake', 'p_fog', 'p_leaf_green', 'p_leaf_orange', 'p_dust', 'p_splash', 'p_spark', 'p_sparkle',
  'light_glow_soft', 'light_glow_torch', 'light_glow_lantern',
  'bg_distant_mountains', 'bg_rolling_hills',
  'tile_ocean_deep_0', 'tile_ocean_deep_1', 'tile_ocean_deep_2', 'tile_ocean_deep_3',
  'tile_water_foam_0', 'tile_water_foam_1', 'tile_water_foam_2', 'tile_water_foam_3'
];

requiredTextures.forEach(key => {
  const tex = mockTextures.get(key);
  assert(tex !== undefined, `Texture baked: ${key} (${tex?.width}x${tex?.height})`);
});

// Test 3: DayNightSystem Calculation
console.log('\n3. Testing DayNightSystem Dynamics:');
const dn = new DayNightSystem(mockScene, 240); // 240 sec cycle
const res1 = dn.update(0);
assert(res1.hour >= 0 && res1.hour <= 24, `Initial hour valid: ${res1.hour}`);

dn.timeMs = 8 * 3600 * 1000; // 08:00 AM
const res8am = dn.update(0.0001);
assert(res8am.state.alpha < 0.001, `08:00 AM ambient overlay alpha is 0 (full daylight, alpha=${res8am.state.alpha})`);

dn.timeMs = 12 * 3600 * 1000; // 12:00 PM Noon
const resNoon = dn.update(0.0001);
assert(resNoon.state.alpha > 0 && resNoon.state.alpha < 0.10, `Noon ambient overlay alpha is transitional daylight (alpha=${resNoon.state.alpha.toFixed(3)})`);

dn.timeMs = 0; // Midnight (00:00)
const resNight = dn.update(0);
assert(resNight.state.alpha > 0.5, `Midnight ambient overlay alpha > 0.5 (night tint applied, alpha=${resNight.state.alpha})`);
assert(resNight.state.color.r === 15 && resNight.state.color.g === 23 && resNight.state.color.b === 42, 'Midnight color matches keyframe #0F172A');

// Test 4: AmbientLightingSystem
console.log('\n4. Testing AmbientLightingSystem:');
const lighting = new AmbientLightingSystem(mockScene);
const light = lighting.addLight(100, 200, 'light_glow_torch', 1.0, 0.7);
assert(light && light.x === 100 && light.y === 200, 'Light object created at (100,200)');
assert(light.blendMode === 'ADD', 'Light blendMode set to ADD bloom');

const dummyTarget = { x: 300, y: 400, active: true };
const followLight = lighting.attachTo(dummyTarget, 'light_glow_lantern');
dummyTarget.x = 350;
dummyTarget.y = 450;
lighting.update();
assert(followLight.x === 350 && followLight.y === 450, 'Light dynamically follows target to (350,450)');

// Test 5: DynamicShadowSystem
console.log('\n5. Testing DynamicShadowSystem:');
const shadows = new DynamicShadowSystem(mockScene);
const shadow = shadows.createShadow(dummyTarget, 30, 10, 18);
assert(shadow !== null, 'Shadow ellipse object created');

// Test Directional Sun Shadow
shadows.updateShadow(shadow, resNoon.sunAngle);
const noonScaleX = shadow.scaleX;
dn.timeMs = 18 * 3600 * 1000; // Sunset (18:00)
const resSunset = dn.update(0);
shadows.updateShadow(shadow, resSunset.sunAngle);
assert(shadow.scaleX !== noonScaleX, `Sun shadow scale changes with time of day (noon scaleX=${noonScaleX}, sunset scaleX=${shadow.scaleX})`);

// Test Point Light Shadow
shadows.updatePointShadow(shadow, 100, 100);
assert(shadow.x !== dummyTarget.x, `Point light shadow calculates offset away from light source (target x=${dummyTarget.x}, shadow x=${shadow.x})`);

// Test 6: WeatherEngine
console.log('\n6. Testing WeatherEngine Emitter Management:');
const weather = new WeatherEngine(mockScene);
weather.setWeather('rain');
assert(weather.emitters.rain?.emitting === true, 'Rain emitter active when weather=rain');
assert(weather.emitters.snow?.emitting === false, 'Snow emitter inactive when weather=rain');

weather.setWeather('snow');
assert(weather.emitters.rain?.emitting === false, 'Rain emitter inactive when weather=snow');
assert(weather.emitters.snow?.emitting === true, 'Snow emitter active when weather=snow');

console.log(`\n=== Verification Results: ${totalPassed} Passed, ${totalFailed} Failed ===`);
if (totalFailed > 0) {
  process.exit(1);
}
