const fs = require('fs');

console.log('=== Running Verification Tests for Requirements R3 & R4 ===\n');

// 1. Verify save_data.json schema v4
const saveDataRaw = fs.readFileSync('save_data.json', 'utf8');
const saveData = JSON.parse(saveDataRaw);

console.log('1. Save Data Schema Verification:');
console.log(' - Schema Version (v):', saveData.v);
if (saveData.v !== 4) throw new Error('Save data version must be 4!');

if (!saveData.inventory || typeof saveData.inventory.ingredients !== 'object') {
  throw new Error('save_data.json missing inventory.ingredients');
}
console.log(' - inventory.ingredients:', Object.keys(saveData.inventory.ingredients).join(', '));

if (!saveData.recipes || !Array.isArray(saveData.recipes.unlockedRecipes)) {
  throw new Error('save_data.json missing recipes.unlockedRecipes');
}
console.log(' - recipes.unlockedRecipes count:', saveData.recipes.unlockedRecipes.length);

if (!saveData.pets || !Array.isArray(saveData.pets.collection)) {
  throw new Error('save_data.json missing pets.collection');
}
console.log(' - pets.collection:', saveData.pets.collection.map(p => `${p.name} (Lv.${p.level})`).join(', '));

if (typeof saveData.activeBuffs !== 'object') {
  throw new Error('save_data.json missing activeBuffs object');
}
console.log(' - activeBuffs initialized: PASS ✓\n');

// 2. Load game.js in mock environment
const createMockElement = () => ({
  classList: { add: () => {}, remove: () => {} },
  appendChild: () => {},
  addEventListener: () => {},
  style: {},
  innerHTML: '',
  textContent: ''
});

const domMock = {
  getElementById: (id) => createMockElement(),
  createElement: (tag) => createMockElement(),
  addEventListener: () => {}
};

global.window = {
  addEventListener: () => {},
  AudioContext: class { resume() {} createOscillator() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; } createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } }
};
global.document = domMock;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.Phaser = {
  Scene: class {},
  Game: class {},
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  AUTO: 1,
  Canvas: 1,
  Utils: { Array: { Shuffle: (arr) => arr } },
  Math: { Between: () => 10, Clamp: (v) => v },
  Input: { Keyboard: { JustDown: () => false } }
};

// Read and evaluate game.js
const gameCode = fs.readFileSync('game.js', 'utf8');
eval(gameCode);

console.log('2. Recipe System (R3) Checks:');
if (typeof RECIPE_DB === 'undefined' || RECIPE_DB.length < 8) {
  throw new Error('RECIPE_DB must contain 8+ Korean recipes');
}
console.log(` - Total Korean recipes in RECIPE_DB: ${RECIPE_DB.length}`);
RECIPE_DB.forEach(r => {
  console.log(`   • ${r.name} (${r.enName}) - Req: ${JSON.stringify(r.req)} | Buff: ${r.buff.name}`);
  if (!r.culturalFact) throw new Error(`Recipe ${r.id} missing culturalFact!`);
});
console.log(' - Recipe DB Verification: PASS ✓\n');

console.log('3. Pet Companion System (R4) Checks:');
if (typeof PET_DB === 'undefined' || PET_DB.length < 5) {
  throw new Error('PET_DB must contain 5 collectible pets');
}
console.log(` - Total Collectible Pets in PET_DB: ${PET_DB.length}`);
PET_DB.forEach(p => {
  console.log(`   • ${p.icon} ${p.name} (${p.enName}) - Cost: ${p.costGems} Gems | Passive: ${p.desc}`);
});
console.log(' - Pet DB Verification: PASS ✓\n');

console.log('4. Ingredient Acquisition Verification:');
if (typeof addIngredient !== 'function') throw new Error('addIngredient function missing!');
addIngredient('배추', 2);
if ((inventoryState.ingredients['배추'] || 0) < 5) {
  throw new Error('addIngredient failed to update inventoryState');
}
console.log(' - addIngredient test: PASS ✓ (배추 stock updated)\n');

console.log('5. Buff System Verification:');
if (typeof applyBuff !== 'function' || typeof isBuffActive !== 'function') {
  throw new Error('Buff system helper functions missing!');
}
applyBuff('coin_boost', '2x Coin Rate (Test)', 60000, 2.0, '🥬');
if (!isBuffActive('coin_boost')) throw new Error('isBuffActive returned false for active buff');
console.log(' - Active Buff System test: PASS ✓\n');

console.log('=== ALL R3 & R4 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
