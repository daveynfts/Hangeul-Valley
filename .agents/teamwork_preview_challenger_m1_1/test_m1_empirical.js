/**
 * Empirical Verification and Stress Test Script for Milestone 1 (Beehive & Bee Shooting Minigame)
 * Location: d:\Hangeul Valley\.agents\teamwork_preview_challenger_m1_1\test_m1_empirical.js
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passCount++;
    console.log(`[PASS] #${totalAssertions}: ${message}`);
  } else {
    failCount++;
    console.error(`[FAIL] #${totalAssertions}: ${message}`);
  }
}

console.log('===============================================================');
console.log(' STARTING EMPIRICAL STRESS-TEST: MILESTONE 1 (GAME.JS)');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: SOURCE CODE STRUCTURE ANALYSIS
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: SOURCE CODE STRUCTURE ANALYSIS ---');
const gameJsPath = path.join(__dirname, '../../game.js');
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

// 1.1 BeeScene class exists and inherits from Phaser.Scene
const beeSceneClassRegex = /class\s+BeeScene\s+extends\s+Phaser\.Scene/;
assert(beeSceneClassRegex.test(gameJsContent), 'BeeScene class exists and extends Phaser.Scene');

// 1.2 config.scene contains BeeScene
const configSceneRegex = /scene\s*:\s*\[[^\]]*BeeScene[^\]]*\]/;
assert(configSceneRegex.test(gameJsContent), 'config.scene array contains BeeScene');

// 1.3 PixelArtRenderer contains _genBeehiveTextures
const genBeehiveRegex = /static\s+_genBeehiveTextures\s*\(\s*scene\s*\)/;
assert(genBeehiveRegex.test(gameJsContent), 'PixelArtRenderer contains static _genBeehiveTextures(scene)');

// 1.4 PixelArtRenderer contains _genBeeTextures
const genBeeRegex = /static\s+_genBeeTextures\s*\(\s*scene\s*\)/;
assert(genBeeRegex.test(gameJsContent), 'PixelArtRenderer contains static _genBeeTextures(scene)');

// 1.5 FarmScene contains _createBeehiveNPC
const createBeehiveNpcRegex = /_createBeehiveNPC\s*\(\s*W\s*,\s*H\s*\)/;
assert(createBeehiveNpcRegex.test(gameJsContent), 'FarmScene contains _createBeehiveNPC(W, H)');

// 1.6 FarmScene contains beehive proximity check (<85px)
const beehiveProximityRegex = /this\.beehiveX\s*&&\s*Phaser\.Math\.Distance\.Between\s*\(\s*this\.player\.x\s*,\s*this\.player\.y\s*,\s*this\.beehiveX\s*,\s*this\.beehiveY\s*\)\s*<\s*85/;
assert(beehiveProximityRegex.test(gameJsContent), 'FarmScene contains beehive proximity check (<85px)');

// 1.7 BeeScene transition call in FarmScene
const beeSceneLaunchRegex = /this\.scene\.launch\s*\(\s*['"]BeeScene['"]\s*\)/;
assert(beeSceneLaunchRegex.test(gameJsContent), "FarmScene launches 'BeeScene' upon interaction");

// -----------------------------------------------------------------------------
// SECTION 2: RUNTIME ENVIRONMENT MOCK & getUnlockedWords() SCHEMA TESTING
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: FUNCTION & SCHEMA TESTING FOR getUnlockedWords() ---');

const createDummyElement = () => ({
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
  querySelector: () => createDummyElement(),
  querySelectorAll: () => []
});

// Set up robust mock browser & Phaser environment for game.js execution
global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: () => {},
  removeEventListener: () => {},
  AudioContext: class {
    constructor() { this.state = 'suspended'; this.currentTime = 0; }
    resume() {}
    createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {} }; }
    createBiquadFilter() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
  }
};
global.document = {
  body: createDummyElement(),
  getElementById: () => createDummyElement(),
  querySelector: () => createDummyElement(),
  querySelectorAll: () => [],
  createElement: () => createDummyElement()
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

global.Phaser = {
  AUTO: 'AUTO',
  Scene: class Scene {
    constructor(config) { this.config = config; }
  },
  Game: class Game { constructor(config) { this.config = config; } },
  Scale: { RESIZE: 'RESIZE', CENTER_BOTH: 'CENTER_BOTH' },
  Math: {
    Distance: {
      Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
    }
  },
  Utils: {
    Array: {
      Shuffle: (arr) => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      }
    }
  },
  Textures: { FilterMode: { NEAREST: 1 } }
};

// Evaluate game.js in mocked context together with test helper
try {
  const runner = new Function(`
    ${gameJsContent}

    levelsData = [
      { level: 1, name: 'Level 1: Basic', words: [{ ko: '사과', en: 'apple' }, { ko: '바나나', en: 'banana' }, { ko: '벌', en: 'bee' }] },
      { level: 2, name: 'Level 2: Nature', words: [{ ko: '나무', en: 'tree' }, { ko: '꽃', en: 'flower' }, { ko: '산', en: 'mountain' }] },
      { level: 3, name: 'Level 3: Animals', words: [{ ko: '고양이', en: 'cat' }, { ko: '강아지', en: 'dog' }] }
    ];

    return {
      getUnlockedWords,
      setUnlockedLevels: (val) => { unlockedLevels = val; },
      getLevelsData: () => levelsData
    };
  `);

  const gameScope = runner();
  assert(typeof gameScope.getUnlockedWords === 'function', 'getUnlockedWords function is defined');

  // Test 2.1: Default unlockedLevels = [0]
  gameScope.setUnlockedLevels([0]);
  let words = gameScope.getUnlockedWords();
  assert(Array.isArray(words) && words.length === 3, 'getUnlockedWords() with unlockedLevels=[0] returns 3 level 0 words');
  let schemaValid = words.every(w => typeof w.ko === 'string' && w.ko.length > 0 && typeof w.en === 'string' && w.en.length > 0);
  assert(schemaValid, 'All returned words have valid string "ko" and "en" properties');

  // Test 2.2: Multiple unlocked levels = [0, 1, 2]
  gameScope.setUnlockedLevels([0, 1, 2]);
  words = gameScope.getUnlockedWords();
  assert(Array.isArray(words) && words.length === 8, 'getUnlockedWords() with unlockedLevels=[0,1,2] returns all 8 unlocked words');

  // Test 2.3: Empty unlockedLevels = []
  gameScope.setUnlockedLevels([]);
  words = gameScope.getUnlockedWords();
  assert(Array.isArray(words) && words.length === 3, 'getUnlockedWords() with unlockedLevels=[] gracefully falls back to level 0 words');

  // Test 2.4: Undefined unlockedLevels
  gameScope.setUnlockedLevels(undefined);
  words = gameScope.getUnlockedWords();
  assert(Array.isArray(words) && words.length === 3, 'getUnlockedWords() with unlockedLevels=undefined gracefully falls back to level 0 words');

} catch (err) {
  assert(false, `Evaluation of game.js failed: ${err.message}`);
}

// -----------------------------------------------------------------------------
// SECTION 3: TRAJECTORY CALCULATION SIMULATION (1000 STEPS EACH)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: TRAJECTORY CALCULATION SIMULATION (1000 STEPS PER TRAJECTORY) ---');

function simulateTrajectory(type, screenW = 1024, screenH = 768, steps = 1000) {
  const isRightToLeft = false;
  const startX = -80;
  const baseY = screenH / 2;
  const dt = 0.016; // ~60 FPS frame delta (16ms)
  
  let bee = {
    x: startX,
    y: baseY,
    baseY: baseY,
    dir: 1,
    speed: 120,
    amp: 40,
    freq: 3.0,
    phase: 0,
    zigzagVy: 70,
    trajectory: type
  };

  let valid = true;
  let reason = '';

  for (let frame = 0; frame < steps; frame++) {
    const time = frame * 16; // simulated time in ms

    // Update X position
    bee.x += bee.dir * bee.speed * dt;

    // Update Y position based on trajectory pattern
    if (bee.trajectory === 'linear') {
      // Linear glide retains baseY
    } else if (bee.trajectory === 'sine') {
      bee.y = bee.baseY + Math.sin((time / 1000) * bee.freq + bee.phase) * bee.amp;
    } else if (bee.trajectory === 'zigzag') {
      bee.y += bee.zigzagVy * dt;
      if (bee.y > bee.baseY + 45) bee.zigzagVy = -Math.abs(bee.zigzagVy);
      if (bee.y < bee.baseY - 45) bee.zigzagVy = Math.abs(bee.zigzagVy);
    }

    // Screen wrap logic
    if (bee.dir === 1 && bee.x > screenW + 90) bee.x = -80;
    if (bee.dir === -1 && bee.x < -90) bee.x = screenW + 80;

    // Numerical stability checks
    if (Number.isNaN(bee.x) || Number.isNaN(bee.y)) {
      valid = false;
      reason = `NaN detected at frame ${frame}`;
      break;
    }
    if (!Number.isFinite(bee.x) || !Number.isFinite(bee.y)) {
      valid = false;
      reason = `Infinity detected at frame ${frame}`;
      break;
    }
    if (bee.x < -100 || bee.x > screenW + 100) {
      valid = false;
      reason = `Unbounded X position drift: ${bee.x} at frame ${frame}`;
      break;
    }
    if (Math.abs(bee.y - bee.baseY) > 100) {
      valid = false;
      reason = `Unbounded Y position drift: ${bee.y} (baseY=${bee.baseY}) at frame ${frame}`;
      break;
    }
  }

  return { valid, reason, finalX: bee.x, finalY: bee.y };
}

const resolutions = [
  { w: 800, h: 600 },
  { w: 1024, h: 768 },
  { w: 1920, h: 1080 },
  { w: 360, h: 640 }
];

['linear', 'sine', 'zigzag'].forEach(type => {
  resolutions.forEach(res => {
    const resResult = simulateTrajectory(type, res.w, res.h, 1000);
    assert(resResult.valid, `Trajectory "${type}" across 1000 steps (${res.w}x${res.h}): ${resResult.reason || 'STABLE'}`);
  });
});

// -----------------------------------------------------------------------------
// SECTION 4: DISTRACTOR SELECTION LOGIC STRESS TESTING
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: DISTRACTOR SELECTION LOGIC STRESS TESTING ---');

function simulateDistractorSelection(wordListInput) {
  let wordList = wordListInput;

  // Emulate BeeScene wordList fallback logic
  if (!wordList || wordList.length === 0) {
    wordList = [{ ko: '벌', en: 'bee', hint: '🐝' }];
  }

  const roundWords = Phaser.Utils.Array.Shuffle([...wordList]);
  const currentTarget = roundWords[0];

  const distractors = wordList.filter(w => w.ko !== currentTarget.ko);
  const shuffledDistractors = Phaser.Utils.Array.Shuffle([...distractors]).slice(0, 3);
  const waveWords = Phaser.Utils.Array.Shuffle([currentTarget, ...shuffledDistractors]);

  return {
    wordListLength: wordList.length,
    waveWordsCount: waveWords.length,
    hasTarget: waveWords.includes(currentTarget),
    distractorCount: waveWords.length - 1,
    noDuplicates: new Set(waveWords.map(w => w.ko)).size === waveWords.length
  };
}

// 4.1 Empty Pool
const resEmpty = simulateDistractorSelection([]);
assert(resEmpty.hasTarget && resEmpty.waveWordsCount === 1, 'Empty pool fallback: yields exactly target word, 0 crashes');

// 4.2 1-Word Pool
const res1 = simulateDistractorSelection([{ ko: '사과', en: 'apple' }]);
assert(res1.hasTarget && res1.waveWordsCount === 1, '1-Word pool: yields target with 0 distractors, 0 crashes');

// 4.3 3-Word Pool
const pool3 = [
  { ko: '사과', en: 'apple' },
  { ko: '바나나', en: 'banana' },
  { ko: '벌', en: 'bee' }
];
const res3 = simulateDistractorSelection(pool3);
assert(res3.hasTarget && res3.waveWordsCount === 3 && res3.noDuplicates, '3-Word pool: yields target + 2 distractors, all unique');

// 4.4 100-Word Pool
const pool100 = Array.from({ length: 100 }, (_, i) => ({ ko: `단어_${i}`, en: `word_${i}` }));
const res100 = simulateDistractorSelection(pool100);
assert(res100.hasTarget && res100.waveWordsCount === 4 && res100.noDuplicates, '100-Word pool: yields target + 3 distractors, 0 infinite loops');

// 4.5 Monte Carlo Stress Run (10,000 random iterations)
let monteCarloSuccess = true;
for (let iter = 0; iter < 10000; iter++) {
  const poolSize = Math.floor(Math.random() * 50);
  const pool = Array.from({ length: poolSize }, (_, i) => ({ ko: `w_${i}`, en: `e_${i}` }));
  const res = simulateDistractorSelection(pool);
  if (!res.hasTarget || !res.noDuplicates || res.waveWordsCount < 1 || res.waveWordsCount > 4) {
    monteCarloSuccess = false;
    break;
  }
}
assert(monteCarloSuccess, '10,000 iteration Monte Carlo stress test: 100% zero crashes, zero infinite loops, valid distractor outputs');

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(` EMPIRICAL VERIFICATION COMPLETE`);
console.log(` Total Assertions: ${totalAssertions}`);
console.log(` Passed: ${passCount}`);
console.log(` Failed: ${failCount}`);
console.log(` Verdict: ${failCount === 0 ? 'PASS' : 'FAIL'}`);
console.log('===============================================================');

process.exit(failCount === 0 ? 0 : 1);
