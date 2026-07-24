const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '../../');
const GAME_JS_PATH = path.join(ROOT_DIR, 'game.js');
const LEVELS_JSON_PATH = path.join(ROOT_DIR, 'levels.json');

console.log('====================================================');
console.log('EMPIRICAL VERIFICATION HARNESS — CHALLENGER M4 1 V2');
console.log('====================================================\n');

// 1. Load game.js in VM sandbox
const gameCode = fs.readFileSync(GAME_JS_PATH, 'utf8');
const dummyElem = { getContext: () => ({}), addEventListener: () => {}, style: {} };
const sandbox = {
  window: {},
  document: { 
    createElement: () => dummyElem,
    getElementById: () => dummyElem,
    querySelector: () => dummyElem,
    querySelectorAll: () => [],
    body: dummyElem,
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  location: { reload: () => {}, href: '' },
  navigator: { userAgent: 'node' },
  Phaser: { AUTO: 1, Scale: { RESIZE: 1, CENTER_BOTH: 1 }, Game: class {}, Scene: class {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  console: console,
  AudioContext: class {},
  webkitAudioContext: class {}
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(gameCode, sandbox);

const VOCAB_FACTS = vm.runInContext('VOCAB_FACTS', sandbox) || {};
const getFunFact = vm.runInContext('getFunFact', sandbox);

console.log(`[INIT] Loaded VOCAB_FACTS with ${Object.keys(VOCAB_FACTS).length} total dictionary entries.`);
console.log(`[INIT] Loaded getFunFact function: ${typeof getFunFact === 'function' ? 'YES' : 'NO'}\n`);

// 2. Load levels.json
const levelsData = JSON.parse(fs.readFileSync(LEVELS_JSON_PATH, 'utf8'));
const levelWords = [];
levelsData.forEach((lvl, lvlIdx) => {
  if (lvl.words && Array.isArray(lvl.words)) {
    lvl.words.forEach((w, wIdx) => {
      levelWords.push({
        level: lvl.id || (lvlIdx + 1),
        ko: w.ko,
        en: w.en,
        category: w.category,
        hint: w.hint
      });
    });
  }
});

console.log(`[LEVELS] Total words extracted from levels.json: ${levelWords.length}`);

const report = {
  timestamp: new Date().toISOString(),
  totalLevelsWords: levelWords.length,
  totalVocabFactsEntries: Object.keys(VOCAB_FACTS).length,
  metrics: {}
};

// ====================================================
// TEST 1: Coverage Check (Target: ≥ 1,400 / 100% of 1,500)
// ====================================================
let matchedCount = 0;
const missingWords = [];

levelWords.forEach(w => {
  const key = (w.en || '').toLowerCase().trim();
  if (VOCAB_FACTS[key] && typeof VOCAB_FACTS[key].vi === 'string' && typeof VOCAB_FACTS[key].ko === 'string') {
    matchedCount++;
  } else {
    missingWords.push(w);
  }
});

const coveragePct = ((matchedCount / levelWords.length) * 100).toFixed(2);
const coveragePass = matchedCount >= 1400 && matchedCount === levelWords.length;

report.metrics.coverage = {
  targetWords: levelWords.length,
  matchedCount,
  coveragePct: `${coveragePct}%`,
  requiredMin: 1400,
  pass: coveragePass,
  missingWords
};

console.log('----------------------------------------------------');
console.log(`TEST 1: Coverage Check`);
console.log(`Matched: ${matchedCount} / ${levelWords.length} (${coveragePct}%)`);
console.log(`Pass Criteria (≥1400 words, 100%): ${coveragePass ? 'PASS' : 'FAIL'}`);
console.log('----------------------------------------------------\n');

// ====================================================
// TEST 2: Format Check in 'vi': 0 un-tagged 한자어
// ====================================================
let hanjaTotalCount = 0;
let untaggedHanjaViolations = [];
let invalidHanjaFormatViolations = [];

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const vi = fact.vi || '';
  if (vi.includes('한자어')) {
    hanjaTotalCount++;
    const hasHanjaTag = vi.includes('Hán-Hàn') || vi.includes('từ Hán-Hàn');
    if (!hasHanjaTag) {
      untaggedHanjaViolations.push({ word, vi });
    }
  }
});

const formatViPass = untaggedHanjaViolations.length === 0;

report.metrics.format_vi_hanja = {
  hanjaTotalCount,
  untaggedHanjaCount: untaggedHanjaViolations.length,
  untaggedHanjaViolations,
  pass: formatViPass
};

console.log('----------------------------------------------------');
console.log(`TEST 2: Format Check in 'vi' (Sino-Korean / 한자어 tagging)`);
console.log(`Total Sino-Korean entries containing 한자어: ${hanjaTotalCount}`);
console.log(`Un-tagged 한자어 violations: ${untaggedHanjaViolations.length}`);
console.log(`Pass Criteria (0 un-tagged entries): ${formatViPass ? 'PASS' : 'FAIL'}`);
console.log('----------------------------------------------------\n');

// ====================================================
// TEST 3: Format Check in 'ko': 0 malformed [] or ()
// ====================================================
let emptyBracketsViolations = [];
let unbalancedBracketsViolations = [];
let undefinedOrNullViolations = [];

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const vi = fact.vi || '';
  const ko = fact.ko || '';

  // Check empty [] or ()
  const emptySquareInKo = /\[\s*\]/.test(ko);
  const emptyParenInKo = /\(\s*\)/.test(ko);
  const emptySquareInVi = /\[\s*\]/.test(vi);
  const emptyParenInVi = /\(\s*\)/.test(vi);

  if (emptySquareInKo || emptyParenInKo) {
    emptyBracketsViolations.push({ word, field: 'ko', ko, emptySquare: emptySquareInKo, emptyParen: emptyParenInKo });
  }
  if (emptySquareInVi || emptyParenInVi) {
    emptyBracketsViolations.push({ word, field: 'vi', vi, emptySquare: emptySquareInVi, emptyParen: emptyParenInVi });
  }

  // Check unbalanced []
  const koSqOpen = (ko.match(/\[/g) || []).length;
  const koSqClose = (ko.match(/\]/g) || []).length;
  const koParenOpen = (ko.match(/\(/g) || []).length;
  const koParenClose = (ko.match(/\)/g) || []).length;

  if (koSqOpen !== koSqClose || koParenOpen !== koParenClose) {
    unbalancedBracketsViolations.push({ word, ko, koSqOpen, koSqClose, koParenOpen, koParenClose });
  }

  if (/undefined|null/i.test(ko) || /undefined|null/i.test(vi)) {
    undefinedOrNullViolations.push({ word, ko, vi });
  }
});

const formatKoPass = emptyBracketsViolations.length === 0 && unbalancedBracketsViolations.length === 0 && undefinedOrNullViolations.length === 0;

report.metrics.format_ko_brackets = {
  emptyBracketsCount: emptyBracketsViolations.length,
  emptyBracketsViolations,
  unbalancedBracketsCount: unbalancedBracketsViolations.length,
  unbalancedBracketsViolations,
  undefinedOrNullCount: undefinedOrNullViolations.length,
  undefinedOrNullViolations,
  pass: formatKoPass
};

console.log('----------------------------------------------------');
console.log(`TEST 3: Format Check in 'ko' (Malformed brackets & placeholders)`);
console.log(`Empty [] or () violations: ${emptyBracketsViolations.length}`);
console.log(`Unbalanced [] or () violations: ${unbalancedBracketsViolations.length}`);
console.log(`Undefined / null literal violations: ${undefinedOrNullViolations.length}`);
console.log(`Pass Criteria (0 malformed brackets): ${formatKoPass ? 'PASS' : 'FAIL'}`);
console.log('----------------------------------------------------\n');

// ====================================================
// TEST 4: Fallback getFunFact(word) Execution for Unknown Words
// ====================================================
const fallbackTestCases = [
  { name: 'Known Word Hit', input: { ko: '아버지', en: 'father', category: '가족과 사람' }, expectedOrigin: 'database' },
  { name: 'Unknown Animal', input: { ko: '사이버 호랑이', en: 'cyber tiger', category: 'animal' }, expectedOrigin: 'dynamic' },
  { name: 'Unknown Food', input: { ko: '비빔밥', en: 'bibimbap', category: 'food' }, expectedOrigin: 'database' },
  { name: 'Unknown Nature', input: { ko: '단풍', en: 'autumn leaves', category: 'nature' }, expectedOrigin: 'dynamic' },
  { name: 'Unknown Body', input: { ko: '심장', en: 'heart', category: 'body' }, expectedOrigin: 'database' },
  { name: 'Single Syllable Batchim', input: { ko: '물', en: 'water', category: 'nature' }, expectedOrigin: 'dynamic' },
  { name: 'Double Syllable Open Vowel', input: { ko: '나무', en: 'tree', category: 'nature' }, expectedOrigin: 'dynamic' },
  { name: 'Triple Syllable', input: { ko: '우주선', en: 'spaceship', category: '과학' }, expectedOrigin: 'dynamic' },
  { name: 'Empty Object Fallback', input: {}, expectedOrigin: 'fallback' },
  { name: 'Null Input Fallback', input: null, expectedOrigin: 'fallback' },
  { name: 'Undefined Input Fallback', input: undefined, expectedOrigin: 'fallback' }
];

let fallbackSuccessCount = 0;
const fallbackResults = [];

fallbackTestCases.forEach(tc => {
  try {
    const res = getFunFact(tc.input);
    const isValid = res && typeof res.vi === 'string' && typeof res.ko === 'string' && res.vi.length > 0 && res.ko.length > 0;
    if (isValid) fallbackSuccessCount++;
    fallbackResults.push({
      name: tc.name,
      input: tc.input,
      outputVi: res ? res.vi : null,
      outputKo: res ? res.ko : null,
      pass: isValid
    });
  } catch (err) {
    fallbackResults.push({
      name: tc.name,
      input: tc.input,
      error: err.message,
      pass: false
    });
  }
});

const fallbackPass = fallbackSuccessCount === fallbackTestCases.length;

report.metrics.fallback_execution = {
  totalTestCases: fallbackTestCases.length,
  passedCases: fallbackSuccessCount,
  fallbackResults,
  pass: fallbackPass
};

console.log('----------------------------------------------------');
console.log(`TEST 4: Fallback getFunFact Execution`);
console.log(`Passed test cases: ${fallbackSuccessCount} / ${fallbackTestCases.length}`);
console.log(`Pass Criteria (100% execution without errors): ${fallbackPass ? 'PASS' : 'FAIL'}`);
console.log('----------------------------------------------------\n');

// ====================================================
// OVERALL VERDICT
// ====================================================
const overallPass = coveragePass && formatViPass && formatKoPass && fallbackPass;
report.overallVerdict = overallPass ? 'PASS' : 'FAIL';

console.log('====================================================');
console.log(`FINAL EMPIRICAL VERIFICATION VERDICT: ${report.overallVerdict}`);
console.log('====================================================');

fs.writeFileSync(path.join(__dirname, 'test_output.json'), JSON.stringify(report, null, 2));
console.log(`\nTest output logged to test_output.json`);
