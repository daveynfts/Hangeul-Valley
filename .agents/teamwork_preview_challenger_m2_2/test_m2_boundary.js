/**
 * test_m2_boundary.js
 * Empirical verification script for Milestone 2:
 * 1. BeeScene.showResultsSummary() honey reward calculations & inventory additions (50 simulated rounds)
 * 2. Legacy save data hydration & persistence (cookingState & '꿀' defaults)
 * 3. Cooking integration, recipe list rendering structure & pantry stock badge calculations
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Mock Browser & DOM Environment ---
class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.style = {};
    this.attributes = {};
    this.classList = {
      add: (cls) => {},
      remove: (cls) => {},
      contains: () => false
    };
    this.innerHTMLStr = '';
    this.textContentStr = '';
    this.onclick = null;
    this.disabled = false;
  }

  addEventListener(event, fn) {}
  removeEventListener(event, fn) {}

  get innerHTML() {
    if (this.children.length > 0) {
      return this.children.map(c => c.outerHTML || c.innerHTMLStr || c.textContentStr).join('');
    }
    return this.innerHTMLStr;
  }

  set innerHTML(val) {
    this.innerHTMLStr = val;
    this.children = [];
  }

  get textContent() {
    if (this.children.length > 0) {
      return this.children.map(c => c.textContent).join('');
    }
    return this.textContentStr;
  }

  set textContent(val) {
    this.textContentStr = val;
    this.innerHTMLStr = val;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

const domElements = {
  'gold-val': new MockElement('span', 'gold-val'),
  'shop-gold-val': new MockElement('span', 'shop-gold-val'),
  'trophy-gold-val': new MockElement('span', 'trophy-gold-val'),
  'gems-val': new MockElement('span', 'gems-val'),
  'honor-val': new MockElement('span', 'honor-val'),
  'hud-gold': new MockElement('div', 'hud-gold'),
  'cooking-pantry-list': new MockElement('div', 'cooking-pantry-list'),
  'cooking-recipe-list': new MockElement('div', 'cooking-recipe-list'),
  'cooking-detail-view': new MockElement('div', 'cooking-detail-view'),
  'cooking-progress-badge': new MockElement('div', 'cooking-progress-badge'),
  'cooking-overlay': new MockElement('div', 'cooking-overlay'),
  'fish-album-overlay': new MockElement('div', 'fish-album-overlay'),
  'fish-album-grid': new MockElement('div', 'fish-album-grid')
};

const mockDocument = {
  getElementById: (id) => {
    if (!domElements[id]) {
      domElements[id] = new MockElement('div', id);
    }
    return domElements[id];
  },
  createElement: (tagName) => new MockElement(tagName),
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => []
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  location: { href: '', reload: () => {} },
  navigator: { userAgent: 'node' },
  AudioContext: class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.destination = {};
    }
    resume() { this.state = 'running'; }
    createOscillator() {
      return {
        type: '',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
  }
};

const mockPhaser = {
  Scene: class Scene {
    constructor(config) {}
  },
  Scale: {
    RESIZE: 1,
    CENTER_BOTH: 2
  },
  AUTO: 0,
  Game: class Game {
    constructor(config) {}
  }
};

const mockLocalStorage = {
  _data: {},
  getItem: function(k) { return this._data[k] || null; },
  setItem: function(k, v) { this._data[k] = String(v); },
  removeItem: function(k) { delete this._data[k]; },
  clear: function() { this._data = {}; }
};

// Create VM context
const context = vm.createContext({
  console: console,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  Boolean: Boolean,
  JSON: JSON,
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  document: mockDocument,
  localStorage: mockLocalStorage,
  Phaser: mockPhaser,
  customElements: { define: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  location: { href: '', reload: () => {} },
  navigator: { userAgent: 'node' }
});

// Bind window to global inside context
vm.runInContext('window = globalThis;', context);

// Read and execute game.js inside context
const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

try {
  vm.runInContext(gameJsCode, context);
  console.log('[Setup] game.js loaded successfully into Node VM.');
} catch (err) {
  console.error('[Setup Error] Failed to execute game.js in VM:', err);
  process.exit(1);
}

// Global assertion counter
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    console.error(`❌ ASSERTION FAILED: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  totalAssertions++;
  if (actual === expected) {
    passedAssertions++;
  } else {
    console.error(`❌ ASSERTION FAILED: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

console.log('\n==================================================');
console.log('STARTING EMPIRICAL TEST SUITE FOR MILESTONE 2');
console.log('==================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: End-of-Round Honey Rewards Simulation (BeeScene.showResultsSummary)
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: BeeScene.showResultsSummary() Honey Rewards (50 Runs) ---');

// Define mock BeeScene constructor in context if not directly present
const BeeSceneClass = vm.runInContext('BeeScene', context);
assert(typeof BeeSceneClass === 'function', 'BeeScene class exists in game.js');

// 50 test configurations: score & click parameters
const testCases = [];
const scorePool = [-300, 0, 50, 299, 300, 450, 599, 600, 899, 900, 1200, 1500, 2400, 3000, 10000];
const clickPool = [
  { total: 0, correct: 0 },         // 100% default
  { total: 10, correct: 10 },       // 100%
  { total: 10, correct: 9 },        // 90%
  { total: 10, correct: 8 },        // 80%
  { total: 20, correct: 18 },       // 90%
  { total: 20, correct: 17 },       // 85%
  { total: 5, correct: 0 },         // 0%
];

for (let i = 0; i < 50; i++) {
  const score = scorePool[i % scorePool.length];
  const clickConf = clickPool[i % clickPool.length];
  testCases.push({ id: i + 1, score, totalClicks: clickConf.total, correctHits: clickConf.correct });
}

testCases.forEach(tc => {
  // Create mock instance of BeeScene
  const scene = new BeeSceneClass();
  scene.W = 800;
  scene.H = 600;
  scene.score = tc.score;
  scene.totalClicks = tc.totalClicks;
  scene.correctHits = tc.correctHits;
  scene.maxCombo = 5;
  scene.activeBees = [];
  const makeMockGameObject = () => {
    const obj = {
      setDepth: () => obj,
      setStrokeStyle: () => obj,
      setOrigin: () => obj,
      setInteractive: () => obj,
      on: () => obj,
      destroy: () => obj,
      lineSpacing: 0
    };
    return obj;
  };

  scene.add = {
    rectangle: makeMockGameObject,
    text: makeMockGameObject
  };

  // Reset inventoryState before run
  context.inventoryState = { maxSlots: 20, ingredients: {} };

  // Execute showResultsSummary
  scene.showResultsSummary();

  const accuracy = tc.totalClicks > 0 ? Math.round((tc.correctHits / tc.totalClicks) * 100) : 100;
  const expectedBaseHoney = Math.max(1, Math.floor(tc.score / 300));
  const expectedBonusHoney = accuracy >= 90 ? 1 : 0;
  const expectedTotalHoney = expectedBaseHoney + expectedBonusHoney;

  const actualHoney = context.inventoryState.ingredients['꿀'] || 0;

  assert(actualHoney >= 1, `[Run ${tc.id}] totalHoney must be non-negative & >= 1 (Got: ${actualHoney})`);
  assertEquals(actualHoney, expectedTotalHoney, `[Run ${tc.id}] totalHoney awarded correctly for Score=${tc.score}, Acc=${accuracy}%`);
  assert(context.inventoryState.ingredients['꿀'] !== undefined, `[Run ${tc.id}] Honey added to inventory key '꿀'`);
});

console.log(`✓ Completed 50 simulated BeeScene round outcome tests.\n`);


// -----------------------------------------------------------------------------
// TEST SUITE 2: Legacy Save Hydration & Persistence (applySave)
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 2: Legacy Save Data Hydration (applySave) ---');

// Test 2.1: Legacy Save v1/v2 without cooking object
const legacySave1 = {
  v: 1,
  gold: 250,
  inventory: { maxSlots: 20, ingredients: { "배추": 3, "무": 2 } },
  harvests: { "배추": 5 }
};

const applyRes1 = context.applySave(legacySave1);
assert(applyRes1 === true, 'applySave returns true for legacy save v1 without cooking object');
assert(typeof context.cookingState === 'object' && context.cookingState !== null, 'cookingState is initialized as object');
assert(Array.isArray(context.cookingState.cookedRecipes), 'cookingState.cookedRecipes is an array');
assertEquals(context.cookingState.cookedRecipes.length, 0, 'cookedRecipes is empty by default for clean legacy save');
assertEquals(context.cookingState.totalDishesCooked, 0, 'totalDishesCooked is 0 by default');

// Test 2.2: Save missing '꿀' key in ingredients
const legacySave2 = {
  v: 4,
  currencies: { coins: 100, gems: 5, honor: 10 },
  inventory: { maxSlots: 20, ingredients: { "쌀": 4 } },
  cooking: { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} }
};

const applyRes2 = context.applySave(legacySave2);
assert(applyRes2 === true, 'applySave returns true for save missing "꿀" key');
assertEquals(context.inventoryState.ingredients['꿀'], undefined, '"꿀" key is undefined initially without runtime crash');

// Test adding honey when key missing
context.addItemToInventory('honey', 2);
assertEquals(context.inventoryState.ingredients['꿀'], 2, 'addItemToInventory("honey", 2) safely creates "꿀" key in inventory');

// Test 2.3: Legacy save with inventory.cookedDishes but no cooking object
const legacySave3 = {
  v: 2,
  gold: 500,
  inventory: {
    maxSlots: 20,
    ingredients: { "배추": 1 },
    cookedDishes: { "kimchi": 3, "gimbap": 1 }
  }
};

const applyRes3 = context.applySave(legacySave3);
assert(applyRes3 === true, 'applySave returns true for legacy save with cookedDishes');
assert(context.cookingState.cookedRecipes.includes('kimchi'), 'cookingState.cookedRecipes contains "kimchi" migrated from cookedDishes');
assert(context.cookingState.cookedRecipes.includes('gimbap'), 'cookingState.cookedRecipes contains "gimbap" migrated from cookedDishes');
assertEquals(context.cookingState.totalDishesCooked, 4, 'cookingState.totalDishesCooked is sum of cookedDishes (4)');

// Test 2.4: Null / invalid save input
assert(context.applySave(null) === false, 'applySave(null) returns false safely');
assert(context.applySave(undefined) === false, 'applySave(undefined) returns false safely');

// Test 2.5: Round-trip Save / Load via collectSave()
context.inventoryState.ingredients['꿀'] = 5;
context.cookingState = { cookedRecipes: ['honey_tea'], totalDishesCooked: 1, recipeStats: { 'honey_tea': 1 } };
const collectedData = context.collectSave();

assert(collectedData.v === 4, 'collectSave includes version 4');
assert(collectedData.cooking.cookedRecipes.includes('honey_tea'), 'collectSave preserves cookingState.cookedRecipes');
assertEquals(collectedData.inventory.ingredients['꿀'], 5, 'collectSave preserves honey stock');

// Test 2.6: Malformed cookingState in save data (e.g. non-array cookedRecipes, non-number totalDishesCooked)
const malformedSave = {
  v: 4,
  cooking: { cookedRecipes: "invalid_string", totalDishesCooked: "invalid_number", recipeStats: null }
};
const applyRes4 = context.applySave(malformedSave);
assert(applyRes4 === true, 'applySave handles malformed cookingState safely');
assert(Array.isArray(context.cookingState.cookedRecipes), 'cookingState.cookedRecipes sanitized to array');
assertEquals(context.cookingState.totalDishesCooked, 0, 'cookingState.totalDishesCooked sanitized to number 0');
assert(typeof context.cookingState.recipeStats === 'object', 'cookingState.recipeStats sanitized to object');

console.log(`✓ Completed Legacy Save Data Hydration tests.\n`);


// -----------------------------------------------------------------------------
// TEST SUITE 3: Recipe List Rendering Structure & Pantry Stock Badge Calculations
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 3: Cooking UI, Recipe List Rendering & Stock Badges ---');

// Test 3.1: COOKING_RECIPES structure
const recipes = context.COOKING_RECIPES;
assert(Array.isArray(recipes), 'COOKING_RECIPES is an array');
assertEquals(recipes.length, 12, 'COOKING_RECIPES contains exactly 12 recipes');

const honeyYakgwa = recipes.find(r => r.id === 'honey_yakgwa');
assert(honeyYakgwa !== undefined, 'honey_yakgwa recipe exists in COOKING_RECIPES');
assert(honeyYakgwa.ingredients.some(i => i.itemId === 'honey'), 'honey_yakgwa requires honey');

const honeyTea = recipes.find(r => r.id === 'honey_tea');
assert(honeyTea !== undefined, 'honey_tea recipe exists in COOKING_RECIPES');
assert(honeyTea.ingredients.some(i => i.itemId === 'honey'), 'honey_tea requires honey');

// Test 3.2: renderCookingGrid Pantry Stock Badges Calculation
context.inventoryState = {
  maxSlots: 20,
  ingredients: { "배추": 5, "꿀": 3, "무": 2 }
};
context.cookingState = { cookedRecipes: ['kimchi'], totalDishesCooked: 1, recipeStats: { 'kimchi': 1 } };

// Render grid for kimchi
context.renderCookingGrid('kimchi');

const pantryListEl = domElements['cooking-pantry-list'];
assertEquals(pantryListEl.children.length, 3, 'Pantry list rendered 3 stock badges for 3 inventory items');

const badgeTexts = pantryListEl.children.map(c => c.textContent);
assert(badgeTexts.some(t => t.includes('배추: ×5')), 'Pantry badge correctly displays "배추: ×5"');
assert(badgeTexts.some(t => t.includes('꿀: ×3')), 'Pantry badge correctly displays "꿀: ×3"');
assert(badgeTexts.some(t => t.includes('무: ×2')), 'Pantry badge correctly displays "무: ×2"');

// Test 3.3: Progress Badge calculation
const progressBadgeEl = domElements['cooking-progress-badge'];
assertEquals(progressBadgeEl.textContent, 'Cooked: 1 / 12', 'Progress badge displays "Cooked: 1 / 12"');

// Test 3.4: Recipe Card List structure
const recipeListEl = domElements['cooking-recipe-list'];
assertEquals(recipeListEl.children.length, 12, 'Recipe list rendered 12 recipe card elements');

// Check cooked tag on kimchi card
const kimchiCard = recipeListEl.children[0];
assert(kimchiCard.innerHTML.includes('✓ Cooked'), 'Kimchi card displays "✓ Cooked" badge');

// Test 3.5: Detail View & Ingredient Stock Badges calculation for honey_yakgwa (Insufficient honey)
context.inventoryState.ingredients = { "꿀": 1, "배추": 2 }; // Need 2 honey, 1 cabbage
context.renderCookingGrid('honey_yakgwa');

const detailViewEl = domElements['cooking-detail-view'];
const detailHtml = detailViewEl.innerHTML;

assert(detailHtml.includes('꿀') && detailHtml.includes('1/2 ✗'), 'Detail view shows red/insufficient badge "1/2 ✗" for 꿀');
assert(detailHtml.includes('배추') && detailHtml.includes('2/1 ✓'), 'Detail view shows green/sufficient badge "2/1 ✓" for 배추');
assert(detailHtml.includes('disabled') || detailHtml.includes('cursor:not-allowed'), 'Cook button is disabled when ingredients are insufficient');

// Test 3.6: Fulfilling ingredients & executing cookRecipe('honey_yakgwa')
context.inventoryState.ingredients['꿀'] = 3; // Now 3/2 honey (sufficient)
context.renderCookingGrid('honey_yakgwa');

const detailHtml2 = domElements['cooking-detail-view'].innerHTML;
assert(detailHtml2.includes('3/2 ✓'), 'Detail view shows green badge "3/2 ✓" for 꿀 after stock increase');

// Execute cookRecipe
const cookResult = context.cookRecipe('honey_yakgwa');
assert(cookResult === true, 'cookRecipe("honey_yakgwa") returned true');

// Check ingredient consumption
assertEquals(context.inventoryState.ingredients['꿀'], 1, 'cookRecipe consumed 2 꿀 (3 -> 1)');
assertEquals(context.inventoryState.ingredients['배추'], 1, 'cookRecipe consumed 1 배추 (2 -> 1)');

// Check cookingState updates
assert(context.cookingState.cookedRecipes.includes('honey_yakgwa'), 'cookingState.cookedRecipes now includes "honey_yakgwa"');
assertEquals(context.cookingState.totalDishesCooked, 2, 'cookingState.totalDishesCooked incremented to 2');

console.log(`✓ Completed Cooking UI & Stock Badge Calculation tests.\n`);

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log('==================================================');
console.log(`TEST SUMMARY: Passed ${passedAssertions} / ${totalAssertions} assertions.`);
if (passedAssertions === totalAssertions) {
  console.log('VERDICT: PASS ✅');
} else {
  console.log('VERDICT: FAIL ❌');
  process.exit(1);
}
console.log('==================================================');
