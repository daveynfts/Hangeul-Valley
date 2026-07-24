/**
 * test_coverage.js - Empirical test script for Milestone 4 (Verification & Audit)
 * Challenger 1: Testing VOCAB_FACTS coverage and getFunFact outputs across all 1,500 words.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '../..');
const levelsPath = path.join(baseDir, 'levels.json');
const gameJsPath = path.join(baseDir, 'game.js');

console.log(`[TEST] Loading levels from: ${levelsPath}`);
console.log(`[TEST] Loading game.js from: ${gameJsPath}`);

// 1. Load levels.json
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

// 2. Load game.js in VM sandbox
const gameCode = fs.readFileSync(gameJsPath, 'utf8') + `
globalThis.VOCAB_FACTS = VOCAB_FACTS;
globalThis.getFunFact = getFunFact;
`;

const dummyElem = {
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelectorAll: () => [],
  classList: { add: () => {}, remove: () => {} },
  style: {},
  getContext: () => ({ drawImage: () => {}, fillRect: () => {}, clearRect: () => {} })
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  AudioContext: function() { return { createGain: () => ({ connect: () => {}, gain: { value: 1 } }) }; },
  webkitAudioContext: function() { return { createGain: () => ({ connect: () => {}, gain: { value: 1 } }) }; }
};

const Phaser = {
  Scene: class {},
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  AUTO: 0,
  Game: class { constructor() {} },
  Input: { Keyboard: { KeyCodes: {} } }
};

const sandbox = {
  console,
  Math,
  Date,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Map,
  Set,
  Phaser,
  window: mockWindow,
  document: {
    getElementById: () => dummyElem,
    querySelector: () => dummyElem,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => dummyElem,
    body: dummyElem
  },
  location: { href: '' },
  navigator: { userAgent: 'node' }
};

mockWindow.window = mockWindow;
mockWindow.document = sandbox.document;
mockWindow.Phaser = Phaser;

vm.createContext(sandbox);
vm.runInContext(gameCode, sandbox);

const VOCAB_FACTS = sandbox.VOCAB_FACTS;
const getFunFact = sandbox.getFunFact;

console.log(`[TEST] VOCAB_FACTS loaded with ${Object.keys(VOCAB_FACTS).length} keys.`);

// 3. Perform empirical testing across all words
let totalWords = 0;
let directHits = 0;
let fallbackHits = 0;
let validViKoCount = 0;

const fallbackWords = [];
const invalidOutputWords = [];

levels.forEach((lvl, lvlIdx) => {
  const levelNum = lvl.level || (lvlIdx + 1);
  const words = lvl.words || [];

  words.forEach((wordObj, wordIdx) => {
    totalWords++;
    const key = (wordObj.en || '').toLowerCase();
    const isDirectHit = !!VOCAB_FACTS[key];

    if (isDirectHit) {
      directHits++;
    } else {
      fallbackHits++;
      fallbackWords.push({
        level: levelNum,
        indexInLevel: wordIdx + 1,
        ko: wordObj.ko,
        en: wordObj.en,
        category: wordObj.category
      });
    }

    // Call getFunFact to check output quality
    const factObj = getFunFact(wordObj);
    const hasValidVi = factObj && typeof factObj.vi === 'string' && factObj.vi.trim().length > 0;
    const hasValidKo = factObj && typeof factObj.ko === 'string' && factObj.ko.trim().length > 0;

    if (hasValidVi && hasValidKo) {
      validViKoCount++;
    } else {
      invalidOutputWords.push({
        level: levelNum,
        ko: wordObj.ko,
        en: wordObj.en,
        factObj: factObj,
        hasValidVi,
        hasValidKo
      });
    }
  });
});

const hitPercentage = (directHits / totalWords) * 100;
const validViKoPercentage = (validViKoCount / totalWords) * 100;

// Requirements check
const reqHitCountPass = directHits >= 1400;
const reqHitPercentPass = hitPercentage >= 93.0;
const reqValidViKoPass = validViKoCount === totalWords;
const overallPass = reqHitCountPass && reqHitPercentPass && reqValidViKoPass;

console.log('\n==================================================');
console.log('            EMPIRICAL TEST RESULTS               ');
console.log('==================================================');
console.log(`Total Levels Tested:          ${levels.length}`);
console.log(`Total Words Tested:           ${totalWords}`);
console.log(`Direct VOCAB_FACTS Hits:      ${directHits} (${hitPercentage.toFixed(2)}%)`);
console.log(`Fallback getFunFact Count:    ${fallbackHits} (${(100 - hitPercentage).toFixed(2)}%)`);
console.log(`Requirement (>= 1400 hits):  ${reqHitCountPass ? 'PASS' : 'FAIL'} (${directHits} / 1400)`);
console.log(`Requirement (>= 93% hits):   ${reqHitPercentPass ? 'PASS' : 'FAIL'} (${hitPercentage.toFixed(2)}% / 93.00%)`);
console.log(`Valid vi & ko Strings:        ${validViKoCount} / ${totalWords} (${validViKoPercentage.toFixed(2)}%)`);
console.log(`Requirement (100% valid):    ${reqValidViKoPass ? 'PASS' : 'FAIL'}`);
console.log(`OVERALL TEST STATUS:          ${overallPass ? 'PASSED' : 'FAILED'}`);
console.log('==================================================\n');

if (fallbackWords.length > 0) {
  console.log(`[INFO] First 10 missing words falling back to getFunFact:`);
  fallbackWords.slice(0, 10).forEach(w => console.log(`  - Level ${w.level}: ${w.ko} (${w.en}) [cat: ${w.category}]`));
}

if (invalidOutputWords.length > 0) {
  console.error(`[ERROR] Words with invalid/empty vi or ko strings:`);
  invalidOutputWords.forEach(w => console.error(`  - Level ${w.level}: ${w.ko} (${w.en}) =>`, w.factObj));
}

// Save detailed summary to file for verification artifact
const reportData = {
  timestamp: new Date().toISOString(),
  totalLevels: levels.length,
  totalWords,
  directHits,
  fallbackHits,
  hitPercentage: Number(hitPercentage.toFixed(2)),
  validViKoCount,
  validViKoPercentage: Number(validViKoPercentage.toFixed(2)),
  invalidOutputCount: invalidOutputWords.length,
  overallPass,
  requirements: {
    directHitsGe1400: reqHitCountPass,
    directHitsGe93Percent: reqHitPercentPass,
    viKoValid100Percent: reqValidViKoPass
  },
  fallbackWordsSample: fallbackWords.slice(0, 20),
  invalidOutputWords
};

fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(reportData, null, 2), 'utf8');
console.log(`[TEST] Detailed test results written to test_results.json`);

if (!overallPass) {
  process.exit(1);
}
