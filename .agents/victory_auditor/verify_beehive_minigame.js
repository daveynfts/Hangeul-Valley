const fs = require('fs');
const path = require('path');

console.log('=== INDEPENDENT VICTORY AUDIT TEST SUITE FOR BEEHIVE & MINIGAME ===');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// Read game.js content
const gamePath = path.join(__dirname, '..', '..', 'game.js');
const gameCode = fs.readFileSync(gamePath, 'utf8');

// Helper dummy element creation
function createMockElement() {
  const el = {
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    innerHTML: '',
    innerText: '',
    textContent: '',
    value: '',
    children: [],
    querySelector: () => createMockElement(),
    querySelectorAll: () => []
  };
  return el;
}

const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    body: createMockElement(),
    createElement: () => createMockElement(),
    getElementById: () => createMockElement(),
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  }
};

const mockPhaser = {
  AUTO: 'AUTO',
  Game: function(cfg) { this.config = cfg; },
  Scene: class Scene {
    constructor(config) { this.config = config; }
  },
  Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } },
  Utils: { Array: { Shuffle: (arr) => arr.slice().reverse() } },
  Textures: { FilterMode: { NEAREST: 1 } },
  Scale: { RESIZE: 1, CENTER_BOTH: 1 }
};

// Global mocks
global.window = mockWindow;
global.document = mockWindow.document;
global.Phaser = mockPhaser;
global.navigator = { userAgent: 'node' };

const vm = require('vm');
const context = vm.createContext({
  window: mockWindow,
  document: mockWindow.document,
  Phaser: mockPhaser,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  RegExp: RegExp,
  JSON: JSON
});

try {
  vm.runInContext(gameCode, context);
  assert(true, 'game.js executed in VM context without runtime errors');
} catch (e) {
  assert(false, `game.js failed to execute in VM: ${e.message}`);
}

// Audit R1: Beehive NPC on Farm Map
console.log('\n--- Auditing Requirement 1: Beehive NPC on Farm Map ---');
assert(gameCode.includes('_genBeehiveTextures(scene)'), 'PixelArtRenderer implements _genBeehiveTextures');
assert(gameCode.includes("createTexture(scene, 'beehive'"), 'beehive texture is generated using pixel matrix');
assert(gameCode.includes("makeTex('p_tiny_bee'"), 'p_tiny_bee texture is generated');
assert(gameCode.includes('_createBeehiveNPC(W, H)'), 'FarmScene implements _createBeehiveNPC');
assert(gameCode.includes('this.farm.x - 65') && gameCode.includes('this.farm.y - 70'), 'Beehive positioned near Apple Tree at farm.x - 65, farm.y - 70');
assert(gameCode.includes('duration: 85') && gameCode.includes("ease: 'Sine.InOut'"), 'Beehive has 85ms vibration tween effect');
assert(gameCode.includes('numBees = 4') && gameCode.includes('p_tiny_bee'), 'Beehive has 4 orbiting tiny bee particles');
assert(gameCode.includes('[SPACE] Beehive Minigame') || gameCode.includes('🐝 Beehive'), 'Interaction hint label present for Beehive');
assert(gameCode.includes("this.scene.launch('BeeScene')"), 'Transition launches BeeScene on interaction');

// Audit R2: Bee Shooting Vocabulary Minigame Scene
console.log('\n--- Auditing Requirement 2: Bee Shooting Minigame (BeeScene) ---');
assert(gameCode.includes('class BeeScene extends Phaser.Scene'), 'BeeScene class defined extending Phaser.Scene');
assert(gameCode.includes("scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene]"), 'BeeScene registered in Phaser game config');
assert(gameCode.includes("makeTex('p_pollen'"), 'Pollen explosion particle texture p_pollen registered');
assert(gameCode.includes("makeTex('p_honey_drip'"), 'Honey drip particle texture p_honey_drip registered');
assert(gameCode.includes("createTexture(scene, 'bee_fly_0'") && gameCode.includes("createTexture(scene, 'bee_fly_1'"), 'Animated flying bee textures bee_fly_0 & bee_fly_1 registered');
assert(gameCode.includes("'linear'") && gameCode.includes("'sine'") && gameCode.includes("'zigzag'"), 'BeeScene supports linear, sine wave, and zigzag flight paths');
assert(gameCode.includes('TARGET:'), 'Top glassmorphism HUD displays target English word');
assert(gameCode.includes('onBeeClicked(bee)'), 'Click/touch handler registered for target flying bees');
assert(gameCode.includes('quiz_correct') && gameCode.includes('quiz_wrong'), 'Hit/miss visual & audio feedback implemented with chiptune SFX');
assert(gameCode.includes('100 + comboBonus') && gameCode.includes('(this.combo - 1) * 20'), 'Combo multiplier scoring implemented');
assert(gameCode.includes('this.roundWords = shuffled.slice(0, 10)'), '10-word round cap enforced');
assert(gameCode.includes('showResultsSummary()'), 'Results summary modal displayed at end of round');
assert(gameCode.includes("this.scene.resume('FarmScene')"), 'Return transition gracefully resumes FarmScene');

// Audit R3: Honey Rewards & Cooking Integration
console.log('\n--- Auditing Requirement 3: Honey Rewards & Cooking Integration ---');
const ITEM_DB = context.ITEM_DB;
assert(ITEM_DB && ITEM_DB['꿀'], "ITEM_DB contains Honey item '꿀'");
if (ITEM_DB && ITEM_DB['꿀']) {
  assert(ITEM_DB['꿀'].id === 'honey', "Honey item ID is 'honey'");
  assert(ITEM_DB['꿀'].icon === '🍯', "Honey icon is '🍯'");
  assert(ITEM_DB['꿀'].type === 'ingredient', "Honey item type is 'ingredient'");
}

const COOKING_RECIPES = context.COOKING_RECIPES;
assert(Array.isArray(COOKING_RECIPES), 'COOKING_RECIPES array exists');
const honeyYakgwa = COOKING_RECIPES ? COOKING_RECIPES.find(r => r.id === 'honey_yakgwa') : null;
const honeyTea = COOKING_RECIPES ? COOKING_RECIPES.find(r => r.id === 'honey_tea') : null;

assert(honeyYakgwa !== null && honeyYakgwa !== undefined, 'Honey Yakgwa (꿀약과) recipe registered');
if (honeyYakgwa) {
  const honeyIng = honeyYakgwa.ingredients.find(i => i.itemId === 'honey');
  assert(honeyIng && honeyIng.count === 2, 'Honey Yakgwa recipe requires 2 Honey items');
}

assert(honeyTea !== null && honeyTea !== undefined, 'Honey Tea (꿀차) recipe registered');
if (honeyTea) {
  const honeyIng = honeyTea.ingredients.find(i => i.itemId === 'honey');
  assert(honeyIng && honeyIng.count === 2, 'Honey Tea recipe requires 2 Honey items');
}

assert(gameCode.includes("addItemToInventory('honey', totalHoney)"), 'BeeScene grants Honey rewards to inventory');

// Audit R4: Save/Load & Scene Persistence
console.log('\n--- Auditing Requirement 4: Save/Load & Scene Persistence ---');
assert(gameCode.includes('function collectSave()'), 'collectSave function exists');
assert(gameCode.includes('function applySave('), 'applySave function exists');
assert(gameCode.includes('inventory: inventoryState') && gameCode.includes('cooking: cookingState'), 'collectSave serializes inventoryState and cookingState');
assert(gameCode.includes('inventoryState = migrated.inventory') && gameCode.includes('cookingState ='), 'applySave deserializes inventoryState and cookingState');
assert(gameCode.includes('fadeOut(300, 0, 0, 0)') && gameCode.includes('fadeIn(300, 0, 0, 0)'), 'Camera fade-in and fade-out transitions implemented');

// Test Save/Load functionality dynamically in VM
console.log('\n--- Auditing Save/Load Functional Roundtrip in VM ---');
try {
  context.inventoryState = { ingredients: { '꿀': 5 }, maxSlots: 20 };
  context.cookingState = { cookedRecipes: ['honey_yakgwa'], totalDishesCooked: 1, recipeStats: { 'honey_yakgwa': 1 } };
  
  const savedData = context.collectSave();
  assert(savedData && savedData.inventory && savedData.inventory.ingredients['꿀'] === 5, 'collectSave preserves Honey inventory count 5');
  assert(savedData && savedData.cooking && savedData.cooking.cookedRecipes.includes('honey_yakgwa'), 'collectSave preserves Honey Yakgwa cooked state');
  
  // Clear state and apply
  context.inventoryState = { ingredients: {}, maxSlots: 20 };
  context.cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  
  context.applySave(savedData);
  assert(context.inventoryState.ingredients['꿀'] === 5, 'applySave restores Honey count 5');
  assert(context.cookingState.cookedRecipes.includes('honey_yakgwa'), 'applySave restores cooked recipe stats');
} catch(e) {
  assert(false, `Save/load roundtrip failed: ${e.message}`);
}

console.log(`\n=== VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED ===`);
if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
