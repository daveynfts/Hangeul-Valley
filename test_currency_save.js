const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// DOM and browser environment mocks for game.js execution in Node.js
function createGameContext(filePath) {
  const dummyElem = {
    textContent: '',
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    setAttribute: () => {},
    style: {}
  };

  const localStorageStore = {};

  const sandbox = {
    console: {
      log: () => {}, // suppress verbose logs during test
      warn: () => {},
      error: console.error
    },
    window: {
      addEventListener: () => {},
      pywebview: null
    },
    document: {
      getElementById: () => dummyElem,
      querySelector: () => dummyElem,
      querySelectorAll: () => [],
      createElement: () => dummyElem,
      addEventListener: () => {},
      body: dummyElem
    },
    localStorage: {
      getItem: (k) => localStorageStore[k] || null,
      setItem: (k, v) => { localStorageStore[k] = String(v); },
      removeItem: (k) => { delete localStorageStore[k]; }
    },
    setTimeout: (fn) => typeof fn === 'function' && fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    AudioContext: class { createBuffer() {} },
    webkitAudioContext: class { createBuffer() {} },
    Phaser: {
      Scene: class {},
      AUTO: 0,
      Game: class {},
      Scale: { RESIZE: 0, CENTER_BOTH: 0 }
    },
    Image: class {},
    Map: Map,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object
  };

  const context = vm.createContext(sandbox);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context);

  return {
    eval: (expr) => vm.runInContext(expr, context),
    exec: (fnName, ...args) => {
      const fn = vm.runInContext(fnName, context);
      return fn(...args);
    }
  };
}

function assertCurrencies(actual, expected, message) {
  assert.strictEqual(actual.coins, expected.coins, `${message} [coins]`);
  assert.strictEqual(actual.gems, expected.gems, `${message} [gems]`);
  assert.strictEqual(actual.honor, expected.honor, `${message} [honor]`);
}

function testFile(filePath) {
  console.log(`\n========================================`);
  console.log(`Testing File: ${path.relative(process.cwd(), filePath)}`);
  console.log(`========================================`);

  const ctx = createGameContext(filePath);

  // ----------------------------------------------------
  // TEST SUITE 1: Save Migration (v3 -> v4)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 1: Save Migration v3 -> v4 ---');

  // Test 1.1: migrateSaveData with legacy v3 save (gold: 500)
  const legacyV3Save = { v: 3, gold: 500, unlockedLevels: [0, 1] };
  const migrated1 = ctx.exec('migrateSaveData', legacyV3Save);

  assert.strictEqual(migrated1.v, 4, 'Migrated schema version should be 4');
  assertCurrencies(migrated1.currencies, { coins: 500, gems: 0, honor: 0 }, 'v3 gold=500 should migrate to coins=500, gems=0, honor=0');
  assert.strictEqual(migrated1.gold, 500, 'Migrated gold alias should match coins=500');
  console.log('✓ Test 1.1 Passed: Legacy v3 save (gold: 500) successfully migrated to v4 triple currency.');

  // Test 1.2: migrateSaveData with legacy save having no version tag (v undefined)
  const noVerSave = { gold: 120 };
  const migrated2 = ctx.exec('migrateSaveData', noVerSave);
  assert.strictEqual(migrated2.v, 4, 'Unversioned save should migrate to v4');
  assertCurrencies(migrated2.currencies, { coins: 120, gems: 0, honor: 0 }, 'Unversioned save should populate coins=120, gems=0, honor=0');
  assert.strictEqual(migrated2.gold, 120, 'Unversioned save gold alias should be 120');
  console.log('✓ Test 1.2 Passed: Unversioned legacy save successfully upgraded to v4.');

  // Test 1.3: migrateSaveData with v3 save having zero gold
  const zeroGoldSave = { v: 3, gold: 0 };
  const migrated3 = ctx.exec('migrateSaveData', zeroGoldSave);
  assert.strictEqual(migrated3.v, 4, 'Version should be 4');
  assertCurrencies(migrated3.currencies, { coins: 0, gems: 0, honor: 0 }, 'v3 gold=0 should migrate to coins=0, gems=0, honor=0');
  assert.strictEqual(migrated3.gold, 0, 'gold alias should be 0');
  console.log('✓ Test 1.3 Passed: v3 save with 0 gold properly initialized.');

  // Test 1.4: applySave with legacy v3 save
  const applySuccess = ctx.exec('applySave', { v: 3, gold: 750 });
  assert.strictEqual(applySuccess, true, 'applySave should return true');

  const playerCurrencies = ctx.eval('playerCurrencies');
  const goldAlias = ctx.eval('gold');

  assertCurrencies(playerCurrencies, { coins: 750, gems: 0, honor: 0 }, 'in-memory playerCurrencies updated');
  assert.strictEqual(goldAlias, 750, 'in-memory gold alias updated to 750');
  console.log('✓ Test 1.4 Passed: applySave(v3) correctly updates in-memory playerCurrencies and gold alias.');

  // Test 1.5: collectSave after v3 migration returns v4 structure
  const collected = ctx.exec('collectSave');
  assert.strictEqual(collected.v, 4, 'collected save should have v=4');
  assertCurrencies(collected.currencies, { coins: 750, gems: 0, honor: 0 }, 'collected currencies should match in-memory state');
  assert.strictEqual(collected.gold, 750, 'collected gold alias should match coins');
  console.log('✓ Test 1.5 Passed: collectSave() outputs valid v4 schema snapshot.');

  // ----------------------------------------------------
  // TEST SUITE 2: Currency Transactions & Gold Alias
  // ----------------------------------------------------
  console.log('\n--- Test Suite 2: Currency Transactions & Alias Sync ---');

  // Reset state to known values
  ctx.eval('petState.activePet = null');
  ctx.eval('playerCurrencies = { coins: 100, gems: 10, honor: 5 }');
  ctx.exec('syncGoldAlias');

  let cur = ctx.eval('playerCurrencies');
  let g = ctx.eval('gold');
  assertCurrencies(cur, { coins: 100, gems: 10, honor: 5 }, 'Initial reset currencies match');
  assert.strictEqual(g, 100);

  // Test 2.1: addCoins
  ctx.exec('addCoins', 50);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(cur.coins, 150, 'coins should be 150');
  assert.strictEqual(g, 150, 'gold alias must equal coins (150)');
  console.log('✓ Test 2.1 Passed: addCoins(50) updated coins to 150 and synchronized gold alias.');

  // Test 2.2: addGems
  ctx.exec('addGems', 25);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(cur.gems, 35, 'gems should be 35');
  assert.strictEqual(cur.coins, 150, 'coins should remain 150');
  assert.strictEqual(g, 150, 'gold alias must remain synchronized with coins (150)');
  console.log('✓ Test 2.2 Passed: addGems(25) updated gems to 35 without affecting coins/gold.');

  // Test 2.3: addHonor
  ctx.exec('addHonor', 40);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(cur.honor, 45, 'honor should be 45');
  assert.strictEqual(cur.coins, 150, 'coins should remain 150');
  assert.strictEqual(g, 150, 'gold alias must remain synchronized with coins (150)');
  console.log('✓ Test 2.3 Passed: addHonor(40) updated honor to 45.');

  // Test 2.4: spendCoins (successful spend)
  const spendCoinsSuccess = ctx.exec('spendCoins', 60);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(spendCoinsSuccess, true, 'spendCoins(60) should return true');
  assert.strictEqual(cur.coins, 90, 'coins should be 90');
  assert.strictEqual(g, 90, 'gold alias must equal coins (90)');
  console.log('✓ Test 2.4 Passed: spendCoins(60) succeeded, updated coins to 90 and gold alias to 90.');

  // Test 2.5: spendCoins (insufficient funds)
  const spendCoinsFail = ctx.exec('spendCoins', 500);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(spendCoinsFail, false, 'spendCoins(500) should return false');
  assert.strictEqual(cur.coins, 90, 'coins should remain 90');
  assert.strictEqual(g, 90, 'gold alias must remain 90');
  console.log('✓ Test 2.5 Passed: spendCoins(500) failed due to insufficient funds, state intact.');

  // Test 2.6: spendGems (successful spend)
  const spendGemsSuccess = ctx.exec('spendGems', 15);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(spendGemsSuccess, true, 'spendGems(15) should return true');
  assert.strictEqual(cur.gems, 20, 'gems should be 20');
  assert.strictEqual(g, 90, 'gold alias unaffected');
  console.log('✓ Test 2.6 Passed: spendGems(15) succeeded, gems updated to 20.');

  // Test 2.7: spendGems (insufficient gems)
  const spendGemsFail = ctx.exec('spendGems', 100);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(spendGemsFail, false, 'spendGems(100) should return false');
  assert.strictEqual(cur.gems, 20, 'gems should remain 20');
  console.log('✓ Test 2.7 Passed: spendGems(100) failed, gems unchanged.');

  // ----------------------------------------------------
  // TEST SUITE 3: Edge Cases & Stress Sequences
  // ----------------------------------------------------
  console.log('\n--- Test Suite 3: Edge Cases & Stress Testing ---');

  // Test 3.1: Negative additions (underflow prevention)
  ctx.exec('addCoins', -500);
  cur = ctx.eval('playerCurrencies');
  g = ctx.eval('gold');
  assert.strictEqual(cur.coins, 0, 'coins clamped to 0');
  assert.strictEqual(g, 0, 'gold alias clamped to 0');

  ctx.exec('addGems', -500);
  cur = ctx.eval('playerCurrencies');
  assert.strictEqual(cur.gems, 0, 'gems clamped to 0');

  ctx.exec('addHonor', -500);
  cur = ctx.eval('playerCurrencies');
  assert.strictEqual(cur.honor, 0, 'honor clamped to 0');
  console.log('✓ Test 3.1 Passed: Negative additions safely clamped to 0.');

  // Test 3.2: Rapid multi-step transaction loop
  console.log('Running 1,000 rapid randomized transaction operations...');
  ctx.eval('playerCurrencies = { coins: 1000, gems: 500, honor: 200 }');
  ctx.exec('syncGoldAlias');

  for (let i = 0; i < 1000; i++) {
    const op = i % 5;
    const amount = (i * 7) % 50 + 1;
    if (op === 0) ctx.exec('addCoins', amount);
    else if (op === 1) ctx.exec('addGems', amount);
    else if (op === 2) ctx.exec('addHonor', amount);
    else if (op === 3) ctx.exec('spendCoins', amount);
    else if (op === 4) ctx.exec('spendGems', amount);

    const c = ctx.eval('playerCurrencies');
    const goldVal = ctx.eval('gold');
    assert.strictEqual(goldVal, c.coins, `Invariant failed at step ${i}: gold (${goldVal}) != playerCurrencies.coins (${c.coins})`);
    assert(c.coins >= 0, `Coins went below 0 at step ${i}`);
    assert(c.gems >= 0, `Gems went below 0 at step ${i}`);
    assert(c.honor >= 0, `Honor went below 0 at step ${i}`);
  }
  console.log('✓ Test 3.2 Passed: 1,000 stress transaction operations maintained strict state invariants.');
}

try {
  testFile(path.join(__dirname, 'game.js'));
  testFile(path.join(__dirname, 'assets', 'game.js'));
  console.log('\n========================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✓');
  console.log('========================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
}
