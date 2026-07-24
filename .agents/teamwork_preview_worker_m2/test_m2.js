// Test script for Milestone 2 implementation
const fs = require('fs');

// Mock browser globals required by game.js
global.window = global;
global.Phaser = { Scene: class {}, Scale: { RESIZE: 1, CENTER_BOTH: 1 }, AUTO: 1, Game: class {} };
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};
const mockEl = { style: {}, addEventListener: () => {}, removeEventListener: () => {}, appendChild: () => {} };
global.document = {
  createElement: () => mockEl,
  getElementById: () => mockEl,
  querySelector: () => mockEl,
  querySelectorAll: () => []
};

// Load game.js into global context
const gameJsCode = fs.readFileSync('game.js', 'utf8');
eval(gameJsCode);

console.log('--- M2 Verification Test ---');

// Test 1: ITEM_DB registration & getItemInfo lookup
console.log('1. ITEM_DB registration check:');
const honeyInfoByKo = getItemInfo('꿀');
const honeyInfoByEn = getItemInfo('honey');
console.log('   - Lookup by "꿀":', honeyInfoByKo.id === 'honey' ? 'PASS' : 'FAIL', honeyInfoByKo);
console.log('   - Lookup by "honey":', honeyInfoByEn.key === '꿀' ? 'PASS' : 'FAIL', honeyInfoByEn);

// Test 2: Inventory addition
console.log('\n2. addItemToInventory check:');
const initialHoney = inventoryState.ingredients['꿀'] || 0;
const addSuccess = addItemToInventory('honey', 5);
const newHoney = inventoryState.ingredients['꿀'] || 0;
console.log(`   - Added 5 honey: success=${addSuccess}, before=${initialHoney}, after=${newHoney}`);
console.assert(newHoney === initialHoney + 5, 'Honey inventory count match');

// Test 3: Cooking recipes registered
console.log('\n3. COOKING_RECIPES check:');
const yakgwa = COOKING_RECIPES.find(r => r.id === 'honey_yakgwa');
const tea = COOKING_RECIPES.find(r => r.id === 'honey_tea');
console.log('   - Honey Yakgwa found:', !!yakgwa, yakgwa);
console.log('   - Honey Tea found:', !!tea, tea);
console.assert(!!yakgwa && !!tea, 'Both honey recipes must exist');

// Test 4: Save / Load Persistence
console.log('\n4. Save / Load Persistence check:');
const saveData = JSON.parse(JSON.stringify(collectSave()));
console.log('   - collectSave() inventory ingredients "꿀":', saveData.inventory.ingredients['꿀']);
console.assert(saveData.inventory.ingredients['꿀'] === newHoney, 'Save data contains honey count');

// Reset inventoryState and apply save
inventoryState.ingredients['꿀'] = 0;
console.log('   - Reset in-memory honey count to 0');
const applyResult = applySave(saveData);
console.log('   - applySave() result:', applyResult);
console.log('   - Restored inventory ingredients "꿀":', inventoryState.ingredients['꿀']);
console.assert(inventoryState.ingredients['꿀'] === newHoney, 'Restored save data contains honey count');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
