const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function createGameContext(filePath) {
  const dummyElem = {
    textContent: '',
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    setAttribute: () => {},
    style: {},
    innerHTML: ''
  };

  const localStorageStore = {};

  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: console.error
    },
    window: {
      addEventListener: () => {},
      pywebview: null
    },
    document: {
      getElementById: (id) => dummyElem,
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
      Scale: { RESIZE: 0, CENTER_BOTH: 0 },
      Utils: {
        Array: {
          Shuffle: (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
          }
        }
      }
    },
    Image: class {},
    Map: Map,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    Date: Date
  };

  const context = vm.createContext(sandbox);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context);

  return {
    context,
    eval: (expr) => vm.runInContext(expr, context),
    exec: (fnName, ...args) => {
      const fn = vm.runInContext(fnName, context);
      return fn(...args);
    },
    setVar: (varName, val) => {
      sandbox[varName] = val;
    }
  };
}

function sampleLevelsData() {
  return [
    {
      id: 'lvl_1',
      name: 'Level 1: Basic Nouns',
      words: [
        { ko: '사과', en: 'apple' },
        { ko: '바나나', en: 'banana' },
        { ko: '고양이', en: 'cat' },
        { ko: '개', en: 'dog' },
        { ko: '코끼리', en: 'elephant' }
      ]
    },
    {
      id: 'lvl_2',
      name: 'Level 2: Animals',
      words: [
        { ko: '호랑이', en: 'tiger' },
        { ko: '사자', en: 'lion' },
        { ko: '곰', en: 'bear' },
        { ko: '늑대', en: 'wolf' },
        { ko: '여우', en: 'fox' }
      ]
    },
    {
      id: 'lvl_3',
      name: 'Level 3: Colors',
      words: [
        { ko: '빨간색', en: 'red' },
        { ko: '파란색', en: 'blue' },
        { ko: '노란색', en: 'yellow' },
        { ko: '초록색', en: 'green' },
        { ko: '보라색', en: 'purple' }
      ]
    },
    {
      id: 'lvl_4',
      name: 'Level 4: Family',
      words: [
        { ko: '아버지', en: 'father' },
        { ko: '어머니', en: 'mother' },
        { ko: '형', en: 'older brother' },
        { ko: '누나', en: 'older sister' },
        { ko: '동생', en: 'younger sibling' }
      ]
    }
  ];
}

function testFile(filePath) {
  const relPath = path.relative(process.cwd(), filePath);
  console.log(`\n========================================`);
  console.log(`Testing File: ${relPath}`);
  console.log(`========================================`);

  const ctx = createGameContext(filePath);
  ctx.eval('levelsData = ' + JSON.stringify(sampleLevelsData()));
  ctx.eval('unlockedLevels = [0]');
  ctx.eval('harvestCounts.clear()');

  // ----------------------------------------------------
  // SUITE 1: calcLevelMastery & SRS 80% Zone Gating Logic
  // ----------------------------------------------------
  console.log('\n--- Suite 1: calcLevelMastery & Zone Gating Logic ---');

  // 1.1 Invalid / Out of bounds level indices
  assert.strictEqual(ctx.exec('calcLevelMastery', -1), 0, 'Level -1 should return 0% mastery');
  assert.strictEqual(ctx.exec('calcLevelMastery', 99), 0, 'Level 99 should return 0% mastery');
  assert.strictEqual(ctx.exec('calcLevelMastery', null), 0, 'Level null should return 0% mastery');
  console.log('✓ Test 1.1 Passed: Out of bounds / invalid levelIdx returns 0.');

  // 1.2 Empty words array in level
  ctx.eval('levelsData.push({ id: "lvl_empty", name: "Empty Level", words: [] })');
  const emptyIdx = ctx.eval('levelsData.length - 1');
  assert.strictEqual(ctx.exec('calcLevelMastery', emptyIdx), 100, 'Empty word list level returns 100%');
  ctx.eval('levelsData.pop()');
  console.log('✓ Test 1.2 Passed: Empty level words array returns 100%.');

  // 1.3 Mastery calculation with harvestCounts >= 3
  const hc = ctx.eval('harvestCounts');
  // Initially 0 harvests -> 0%
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 0, '0 harvested words -> 0% mastery');

  // Add harvests below 3 (count = 2) -> still 0%
  hc.set('사과', 2);
  hc.set('바나나', 1);
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 0, 'Harvest counts < 3 should not count toward mastery');

  // 1 word with harvest count 3 -> 1/5 = 20%
  hc.set('사과', 3);
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 20, '1/5 words with harvest >= 3 should return 20%');

  // 2 words with harvest count 3 -> 2/5 = 40%
  hc.set('바나나', 4);
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 40, '2/5 words with harvest >= 3 should return 40%');

  // 3 words with harvest count 3 -> 3/5 = 60%
  hc.set('고양이', 3);
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 60, '3/5 words with harvest >= 3 should return 60%');

  // 4 words with harvest count 3 -> 4/5 = 80%
  hc.set('개', 3);
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 80, '4/5 words with harvest >= 3 should return 80%');

  // 5 words with harvest count 3 -> 5/5 = 100%
  hc.set('코끼리', 10);
  assert.strictEqual(ctx.exec('calcLevelMastery', 0), 100, '5/5 words with harvest >= 3 should return 100%');
  console.log('✓ Test 1.3 Passed: calcLevelMastery correctly computes percentages based on harvestCounts >= 3.');

  // 1.4 Floor rounding verification (7 / 9 = 77.77% -> 77%)
  const levelWith9Words = {
    id: 'lvl_9', name: 'Level 9',
    words: Array.from({length: 9}, (_, i) => ({ ko: `word_${i}`, en: `en_${i}` }))
  };
  ctx.eval(`levelsData.push(${JSON.stringify(levelWith9Words)})`);
  const idx9 = ctx.eval('levelsData.length - 1');
  for (let i = 0; i < 7; i++) hc.set(`word_${i}`, 3);
  assert.strictEqual(ctx.exec('calcLevelMastery', idx9), 77, '7/9 words mastered should floor to 77%');
  ctx.eval('levelsData.pop()');
  console.log('✓ Test 1.4 Passed: Math.floor correctly applied for non-integer percentages (77.77% -> 77%).');

  // 1.5 Zone Gating Hard Lock Gating (isZoneUnlocked)
  // Re-test Zone unlocks for 'arcade' (requires level 0 mastery >= 80%)
  // Reset level 0 harvests: 3 words mastered = 60% (< 80%)
  hc.clear();
  hc.set('사과', 3);
  hc.set('바나나', 3);
  hc.set('고양이', 3); // 3/5 = 60%

  let resArcade = ctx.exec('isZoneUnlocked', 'arcade');
  assert.strictEqual(resArcade.unlocked, false, 'Arcade zone should be LOCKED at 60% mastery');
  assert.strictEqual(resArcade.pct, 60, 'Current percentage reported as 60');
  assert.strictEqual(resArcade.targetPct, 80, 'Target percentage required is 80');

  // Add 4th word -> 4/5 = 80% (== 80% boundary)
  hc.set('개', 3);
  resArcade = ctx.exec('isZoneUnlocked', 'arcade');
  assert.strictEqual(resArcade.unlocked, true, 'Arcade zone should be UNLOCKED at exactly 80% mastery');
  assert.strictEqual(resArcade.pct, 80);

  // Test dungeon zone (requires level 2 mastery >= 80%)
  // Level 2 has 0 words harvested -> 0%
  let resDungeon = ctx.exec('isZoneUnlocked', 'dungeon');
  assert.strictEqual(resDungeon.unlocked, false, 'Dungeon zone should be LOCKED at 0% level 2 mastery');

  // Master 4 words in level 2 (80%)
  hc.set('빨간색', 3);
  hc.set('파란색', 3);
  hc.set('노란색', 3);
  hc.set('초록색', 3);
  resDungeon = ctx.exec('isZoneUnlocked', 'dungeon');
  assert.strictEqual(resDungeon.unlocked, true, 'Dungeon zone should be UNLOCKED at 80% level 2 mastery');

  // Unknown zone key
  const resUnknown = ctx.exec('isZoneUnlocked', 'non_existent_zone');
  assert.strictEqual(resUnknown.unlocked, true, 'Unknown zone key should default to unlocked: true');

  console.log('✓ Test 1.5 Passed: Zone gating hard lock correctly blocks < 80% and unlocks >= 80%.');

  // ----------------------------------------------------
  // SUITE 2: Shop Purchase Quiz Gates
  // ----------------------------------------------------
  console.log('\n--- Suite 2: Shop Purchase Quiz Gates ---');

  ctx.eval('unlockedLevels = [0, 1]');
  ctx.exec('startShopQuizGate', 2); // Attempt to unlock Level 3 (index 2)

  let sqState = ctx.eval('shopQuizState');
  assert.strictEqual(sqState.targetIdx, 2, 'Shop quiz target index is 2');
  assert.strictEqual(sqState.questions.length, 3, 'Shop quiz generates 3 questions');
  assert.strictEqual(sqState.currentQ, 0, 'Current question starts at 0');
  assert.strictEqual(sqState.correctCount, 0, 'Correct count starts at 0');

  // Check structure of first question
  const q0 = sqState.questions[0];
  assert(q0.target && q0.target.ko, 'Question target word has ko field');
  assert.strictEqual(q0.options.length, 4, 'Question options array contains 4 choices (1 target + 3 distractors)');
  assert(q0.options.some(opt => opt.ko === q0.target.ko), 'Options array contains the correct target word');

  // Test failure path: answering wrong question immediately fails quiz without charging coins
  ctx.eval('playerCurrencies.coins = 500');
  ctx.exec('syncGoldAlias');
  const initialCoins = ctx.eval('playerCurrencies.coins');

  ctx.exec('answerShopQuiz', false); // Answer incorrectly
  const coinsAfterFail = ctx.eval('playerCurrencies.coins');
  const lockedStateFail = ctx.eval('playerLocked');
  assert.strictEqual(coinsAfterFail, initialCoins, '0 coins deducted on shop quiz failure');
  assert.strictEqual(lockedStateFail, false, 'playerLocked reset to false on failure');
  console.log('✓ Test 2.1 Passed: Answering Shop Quiz incorrectly fails gate, deducts 0 coins, unlocks player.');

  // Test success path: 3 consecutive correct answers
  ctx.exec('startShopQuizGate', 2);
  ctx.exec('answerShopQuiz', true);
  assert.strictEqual(ctx.eval('shopQuizState.currentQ'), 1);
  ctx.exec('answerShopQuiz', true);
  assert.strictEqual(ctx.eval('shopQuizState.currentQ'), 2);

  // Answering 3rd correctly triggers purchase & unlock
  ctx.exec('answerShopQuiz', true);
  const lockedStateSuccess = ctx.eval('playerLocked');
  assert.strictEqual(lockedStateSuccess, false, 'playerLocked reset to false on quiz completion');
  console.log('✓ Test 2.2 Passed: 3 consecutive correct answers complete shop quiz gate.');

  // Test cancel flow
  ctx.exec('startShopQuizGate', 2);
  ctx.exec('cancelShopQuizGate');
  assert.strictEqual(ctx.eval('playerLocked'), false, 'cancelShopQuizGate resets playerLocked to false');
  console.log('✓ Test 2.3 Passed: cancelShopQuizGate properly resets player locked state.');

  // ----------------------------------------------------
  // SUITE 3: Boss Entrance Gates
  // ----------------------------------------------------
  console.log('\n--- Suite 3: Boss Entrance Gates ---');

  ctx.eval('bossCallbackResult = null');
  ctx.eval('bossCallback = (passed) => { bossCallbackResult = passed; }');

  // Test Dungeon Boss Entrance Gate (3 questions)
  ctx.eval('startBossGateChallenge("dungeon", 3, bossCallback)');
  let bgState = ctx.eval('bossGateState');
  assert.strictEqual(bgState.type, 'dungeon');
  assert.strictEqual(bgState.questions.length, 3);
  assert.strictEqual(ctx.eval('playerLocked'), true);

  // Pass 3 questions
  ctx.exec('answerBossGate', true);
  ctx.exec('answerBossGate', true);
  ctx.exec('answerBossGate', true);
  assert.strictEqual(ctx.eval('bossCallbackResult'), true, 'Boss gate callback received true on passing all questions');
  assert.strictEqual(ctx.eval('playerLocked'), false, 'playerLocked reset after passing boss gate');
  console.log('✓ Test 3.1 Passed: Dungeon Boss Entrance Gate (3 questions) passed successfully.');

  // Test Grand Necromancer Gate (5 questions) - Test Failure on question 4
  ctx.eval('bossCallbackResult = null');
  ctx.eval('startBossGateChallenge("necromancer", 5, bossCallback)');
  bgState = ctx.eval('bossGateState');
  assert.strictEqual(bgState.questions.length, 5);

  ctx.exec('answerBossGate', true);
  ctx.exec('answerBossGate', true);
  ctx.exec('answerBossGate', true);
  ctx.exec('answerBossGate', false); // Fail on Q4
  assert.strictEqual(ctx.eval('bossCallbackResult'), false, 'Boss gate callback received false on wrong answer');
  assert.strictEqual(ctx.eval('playerLocked'), false, 'playerLocked reset after failing boss gate');
  console.log('✓ Test 3.2 Passed: Grand Necromancer Boss Gate (5 questions) failed on wrong answer.');

  // Test Cancel Boss Gate
  ctx.eval('startBossGateChallenge("dungeon", 3, bossCallback)');
  ctx.exec('cancelBossGate');
  assert.strictEqual(ctx.eval('playerLocked'), false, 'cancelBossGate resets playerLocked to false');
  console.log('✓ Test 3.3 Passed: cancelBossGate properly resets player locked state.');

  // ----------------------------------------------------
  // SUITE 4: Quest System Logic & Timestamp Resets
  // ----------------------------------------------------
  console.log('\n--- Suite 4: Quest System Logic & Timestamps ---');

  ctx.exec('initQuestState');
  let qState = ctx.eval('questState');
  assert(qState.daily && qState.daily.length === 3, 'Daily quests initialized with 3 quests');
  assert(qState.weekly && qState.weekly.length === 3, 'Weekly quests initialized with 3 quests');
  assert(qState.lastDailyReset > 0, 'lastDailyReset timestamp set');
  assert(qState.lastWeeklyReset > 0, 'lastWeeklyReset timestamp set');
  console.log('✓ Test 4.1 Passed: Quest state initialized with daily/weekly lists and valid timestamps.');

  // 4.2 Daily Quest progress tracking
  ctx.exec('checkQuestProgress', 'harvest', { count: 2 });
  qState = ctx.eval('questState');
  assert.strictEqual(qState.mainProgress.harvests, 2, 'Main progress harvests updated to 2');
  const dq1 = qState.daily.find(q => q.id === 'dq_1');
  assert.strictEqual(dq1.current, 2, 'Daily quest dq_1 progress updated to 2');

  ctx.exec('checkQuestProgress', 'quiz');
  const dq2 = qState.daily.find(q => q.id === 'dq_2');
  assert.strictEqual(dq2.current, 1, 'Daily quest dq_2 progress updated to 1');

  ctx.exec('checkQuestProgress', 'kill', { count: 1 });
  const dq3 = qState.daily.find(q => q.id === 'dq_3');
  assert.strictEqual(dq3.current, 1, 'Daily quest dq_3 progress updated to 1');

  ctx.exec('checkQuestProgress', 'fish', { count: 1 });
  assert.strictEqual(dq3.current, 2, 'Daily quest dq_3 progress updated to 2 (max target)');

  const wq3 = qState.weekly.find(q => q.id === 'wq_3');
  assert.strictEqual(wq3.current, 1, 'Weekly quest wq_3 progress updated to 1');

  ctx.exec('checkQuestProgress', 'duel', { count: 1 });
  const wq2 = qState.weekly.find(q => q.id === 'wq_2');
  assert.strictEqual(wq2.current, 1, 'Weekly quest wq_2 progress updated to 1');

  // Master Scholar weekly quest (wq_1) relies on harvestCounts >= 5
  hc.clear();
  hc.set('사과', 5);
  hc.set('바나나', 5);
  ctx.exec('checkQuestProgress', 'harvest', { count: 1 });
  const wq1 = ctx.eval('questState.weekly.find(q => q.id === "wq_1")');
  assert.strictEqual(wq1.current, 2, 'Weekly quest wq_1 progress updated to 2 (2 words harvested >= 5 times)');
  console.log('✓ Test 4.2 Passed: checkQuestProgress correctly routes and caps progress for main, daily, weekly quests.');

  // 4.3 Side Quest Claiming
  // Claiming before target met -> should fail (dq_2 is 1/5)
  ctx.exec('claimSideQuest', 'daily', 'dq_2');
  assert.strictEqual(ctx.eval('questState.daily.find(q => q.id === "dq_2").claimed'), false, 'Cannot claim uncompleted quest dq_2');

  // Complete dq_1 (ensure current is 3)
  ctx.eval('petState.activePet = null');
  const coinsBeforeClaim = ctx.eval('playerCurrencies.coins');
  ctx.exec('claimSideQuest', 'daily', 'dq_1');
  const coinsAfterClaim = ctx.eval('playerCurrencies.coins');
  const dq1Claimed = ctx.eval('questState.daily.find(q => q.id === "dq_1").claimed');
  assert.strictEqual(dq1Claimed, true, 'dq_1 claimed set to true');
  assert.strictEqual(coinsAfterClaim, coinsBeforeClaim + 30, 'Coins increased by dq_1 reward (+30)');

  // Duplicate claim attempt -> no extra reward
  ctx.exec('claimSideQuest', 'daily', 'dq_1');
  assert.strictEqual(ctx.eval('playerCurrencies.coins'), coinsAfterClaim, 'Duplicate claim yields no extra coins');
  console.log('✓ Test 4.3 Passed: Side quest claiming enforces completion and prevents double claiming.');

  // 4.4 Timestamp Reset Logic Stress Testing
  const DAY_MS = 24 * 3600 * 1000;
  const WEEK_MS = 7 * DAY_MS;

  // Mark dq_2 as claimed for test
  ctx.eval('questState.daily.find(q => q.id === "dq_2").claimed = true');
  const initialDailyResetTime = ctx.eval('questState.lastDailyReset');

  // Test 4.4.1: Call initQuestState with time elapsed < 24 hours (12 hours)
  ctx.eval(`Date.now = () => ${initialDailyResetTime + 12 * 3600 * 1000}`);
  ctx.exec('initQuestState');
  let dq2Check = ctx.eval('questState.daily.find(q => q.id === "dq_2")');
  assert.strictEqual(dq2Check.claimed, true, 'Daily quest should NOT reset after only 12 hours');

  // Test 4.4.2: Advance time past 24 hours (24h + 1000ms)
  const resetDailyTime = initialDailyResetTime + DAY_MS + 1000;
  ctx.eval(`Date.now = () => ${resetDailyTime}`);
  ctx.exec('initQuestState');
  dq2Check = ctx.eval('questState.daily.find(q => q.id === "dq_2")');
  assert.strictEqual(dq2Check.claimed, false, 'Daily quest MUST reset after 24 hours');
  assert.strictEqual(dq2Check.current, 0, 'Daily quest progress reset to 0');
  assert.strictEqual(ctx.eval('questState.lastDailyReset'), resetDailyTime, 'lastDailyReset timestamp updated');
  console.log('✓ Test 4.4 Passed: Daily quest reset logic correctly triggers after 24 hours elapsed.');

  // Test 4.4.3: Weekly reset after 7 days
  const initialWeeklyResetTime = ctx.eval('questState.lastWeeklyReset');
  ctx.eval('questState.weekly.find(q => q.id === "wq_3").claimed = true');

  // Time elapsed < 7 days (5 days)
  ctx.eval(`Date.now = () => ${initialWeeklyResetTime + 5 * DAY_MS}`);
  ctx.exec('initQuestState');
  let wq3Check = ctx.eval('questState.weekly.find(q => q.id === "wq_3")');
  assert.strictEqual(wq3Check.claimed, true, 'Weekly quest should NOT reset after only 5 days');

  // Time elapsed > 7 days (7d + 1000ms)
  const resetWeeklyTime = initialWeeklyResetTime + WEEK_MS + 1000;
  ctx.eval(`Date.now = () => ${resetWeeklyTime}`);
  ctx.exec('initQuestState');
  wq3Check = ctx.eval('questState.weekly.find(q => q.id === "wq_3")');
  assert.strictEqual(wq3Check.claimed, false, 'Weekly quest MUST reset after 7 days');
  assert.strictEqual(wq3Check.current, 0, 'Weekly quest progress reset to 0');
  assert.strictEqual(ctx.eval('questState.lastWeeklyReset'), resetWeeklyTime, 'lastWeeklyReset timestamp updated');
  console.log('✓ Test 4.5 Passed: Weekly quest reset logic correctly triggers after 7 days elapsed.');

  // Restore Date.now
  ctx.eval('Date.now = Date.prototype.constructor.now');

  // ----------------------------------------------------
  // SUITE 5: Edge Cases & Vulnerability Exploits
  // ----------------------------------------------------
  console.log('\n--- Suite 5: Adversarial Edge Cases & Stress Tests ---');

  // 5.1 Main Quest Direct Execution Vulnerability Check
  ctx.eval('questState.mainProgress.harvests = 0');
  ctx.eval('questState.mainCompleted = []');
  ctx.eval('questState.mainStep = 1');

  const coinsBeforeExploit = ctx.eval('playerCurrencies.coins');
  ctx.exec('claimMainQuest', 1);
  const coinsAfterExploit = ctx.eval('playerCurrencies.coins');
  const act1Completed = ctx.eval('questState.mainCompleted.includes("act_1")');

  if (act1Completed && coinsAfterExploit > coinsBeforeExploit) {
    console.warn('⚠️ FLAMMABLE AUDIT FINDING: claimMainQuest(actNum) lacks internal validation check!');
    console.warn('   It relies exclusively on UI button disabled attribute, allowing direct function invocation to bypass requirements.');
  } else {
    console.log('✓ Main quest claim validated requirements internally.');
  }

  // 5.2 Rapid Action Stress Test (1,000 progress events)
  console.log('Executing 1,000 rapid randomized checkQuestProgress operations...');
  const eventTypes = ['harvest', 'quiz', 'kill', 'fish', 'duel', 'score'];
  for (let i = 0; i < 1000; i++) {
    const type = eventTypes[i % eventTypes.length];
    const data = { count: (i % 3) + 1, score: i * 2 };
    ctx.exec('checkQuestProgress', type, data);
  }
  assert(ctx.eval('questState.mainProgress.harvests') > 0, 'Harvests accumulated safely');
  assert(!isNaN(ctx.eval('questState.mainProgress.score')), 'Score remains valid number');
  console.log('✓ Test 5.2 Passed: 1,000 rapid quest progress events completed without errors or invalid state.');
}

try {
  testFile(path.join(__dirname, 'game.js'));
  testFile(path.join(__dirname, 'assets', 'game.js'));
  console.log('\n========================================');
  console.log('ALL GATING & QUEST TESTS COMPLETED! ✓');
  console.log('========================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
}
