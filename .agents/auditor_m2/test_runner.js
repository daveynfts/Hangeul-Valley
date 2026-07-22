const fs = require('fs');

const makeMockEl = () => ({
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  appendChild: () => {},
  innerHTML: '',
  textContent: '',
  style: {},
  value: ''
});

global.window = { addEventListener: () => {} };
global.document = {
  getElementById: () => makeMockEl(),
  querySelectorAll: () => [],
  querySelector: () => makeMockEl(),
  createElement: () => makeMockEl(),
  addEventListener: () => {}
};
global.Phaser = {
  Scene: class {},
  Scale: { RESIZE: 'RESIZE', FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
  AUTO: 'AUTO',
  Game: class {},
  Utils: { Array: { Shuffle: arr => arr, GetRandom: arr => arr[0] } }
};
global.localStorage = { setItem: () => {}, getItem: () => null };

const code = fs.readFileSync('game.js', 'utf8');

const runner = new Function(`
  ${code}

  levelsData = [
    { name: 'Level 1: Basic Nouns', words: [{ko: '손', en: 'hand'}, {ko: '눈', en: 'eye'}, {ko: '귀', en: 'ear'}, {ko: '입', en: 'mouth'}, {ko: '코', en: 'nose'}] }
  ];

  // Test 1: Save Migration
  const legacySave = { v: 1, gold: 500, unlockedLevels: [0] };
  const migrated = migrateSaveData(legacySave);
  console.log('TEST 1 (Migration):', (migrated.v === 4 && migrated.currencies.coins === 500 && migrated.gold === 500) ? 'PASS' : 'FAIL', migrated.currencies);

  // Test 2: Currency Management
  playerCurrencies = { coins: 100, gems: 10, honor: 5 };
  syncGoldAlias();
  const spendOk = spendCoins(40);
  const spendFail = spendCoins(100);
  console.log('TEST 2 (Currency):', (spendOk && !spendFail && playerCurrencies.coins === 60 && gold === 60) ? 'PASS' : 'FAIL', playerCurrencies);

  // Test 3: SRS 80% Mastery Calculation
  harvestCounts.set('손', 3);
  harvestCounts.set('눈', 3);
  harvestCounts.set('귀', 3);
  harvestCounts.set('입', 3); // 4 out of 5 = 80%
  const masteryPct = calcLevelMastery(0);
  console.log('TEST 3 (SRS Mastery):', masteryPct === 80 ? 'PASS' : 'FAIL', 'Pct:', masteryPct);

  // Test 4: Zone Unlock (80% gate check)
  const zoneCheck80 = isZoneUnlocked('arcade');
  harvestCounts.set('입', 0); // 3 out of 5 = 60%
  const zoneCheck60 = isZoneUnlocked('arcade');
  console.log('TEST 4 (Zone Lock):', (zoneCheck80.unlocked && !zoneCheck60.unlocked) ? 'PASS' : 'FAIL', '80% unlocked:', zoneCheck80.unlocked, '60% unlocked:', zoneCheck60.unlocked);

  // Test 5: Quest Progress Tracking
  initQuestState();
  checkQuestProgress('harvest', { count: 3 });
  const questHarvestOk = questState.mainProgress.harvests >= 3;
  console.log('TEST 5 (Quest Progress):', questHarvestOk ? 'PASS' : 'FAIL', 'Main harvests:', questState.mainProgress.harvests);
`);

try {
  runner();
} catch (e) {
  console.error('RUNNER ERROR:', e);
}
