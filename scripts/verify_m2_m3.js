const fs = require('fs');
const { execSync } = require('child_process');
const vm = require('vm');
const path = require('path');

console.log('=== STARTING MILESTONE M2 & M3 EMPIRICAL VERIFICATION ===');
let overallPassed = true;

// 1. Syntax Check
console.log('\n--- TEST 1: Syntax Error Check (node -c) ---');
['game.js', 'assets/game.js'].forEach(file => {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    console.log(`[PASS] Syntax check passed with 0 errors for ${file}`);
  } catch (err) {
    overallPassed = false;
    console.log(`[FAIL] Syntax check failed for ${file}:\n${err.stderr ? err.stderr.toString() : err.message}`);
  }
});

// 2. Synchronization Check
console.log('\n--- TEST 2: Synchronization Check (byte-for-byte) ---');
const g1 = fs.readFileSync('game.js');
const g2 = fs.readFileSync('assets/game.js');
if (g1.equals(g2)) {
  console.log(`[PASS] game.js (${g1.length} bytes) and assets/game.js (${g2.length} bytes) are 100% byte-for-byte identical.`);
} else {
  overallPassed = false;
  console.log(`[FAIL] game.js and assets/game.js differ!`);
}

// 3. Database Coverage & Field Inspection
console.log('\n--- TEST 3: VOCAB_FACTS Entry Count & Field Verification ---');
const gameCode = g1.toString('utf8');
const startIdx = gameCode.indexOf('const VOCAB_FACTS = {');
const endIdx = gameCode.indexOf('function showVocabFunFact(word) {');

let snippet = gameCode.substring(startIdx, endIdx);
snippet = snippet.replace('const VOCAB_FACTS =', 'var VOCAB_FACTS =');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(snippet, sandbox);

const facts = sandbox.VOCAB_FACTS;
const keys = Object.keys(facts);
console.log(`Total VOCAB_FACTS entries: ${keys.length}`);

if (keys.length >= 1400) {
  console.log(`[PASS] VOCAB_FACTS coverage threshold met (>= 1400 entries: got ${keys.length}).`);
} else {
  overallPassed = false;
  console.log(`[FAIL] VOCAB_FACTS coverage threshold failed (< 1400 entries: got ${keys.length}).`);
}

// Inspect all fields for required content
let invalidFields = 0;
keys.forEach(k => {
  const item = facts[k];
  if (!item || typeof item.vi !== 'string' || typeof item.ko !== 'string' || item.vi.length === 0 || item.ko.length === 0) {
    invalidFields++;
  }
});

if (invalidFields === 0) {
  console.log(`[PASS] All ${keys.length} entries have non-empty 'vi' and 'ko' string fields.`);
} else {
  overallPassed = false;
  console.log(`[FAIL] Found ${invalidFields} entries with invalid/missing 'vi' or 'ko' fields.`);
}

// 4. getFunFact Function Testing (Direct & Fallback)
console.log('\n--- TEST 4: getFunFact Functional Tests ---');

// Test 4a: Direct Lookup
const directResult = sandbox.getFunFact({ en: 'father', ko: '아버지' });
if (directResult && directResult.vi && directResult.ko && directResult.vi.includes('아버지') && directResult.ko.includes('4 âm tiết')) {
  console.log('[PASS] Direct lookup returned rich vi and ko fields.');
} else {
  overallPassed = false;
  console.log('[FAIL] Direct lookup failed:', directResult);
}

const forbiddenProductionKeys = ['sync_test_vocab_key', 'complex_hangul_vocab_key', 'quote_test_key'];
const leakedKeys = forbiddenProductionKeys.filter(key => Object.prototype.hasOwnProperty.call(sandbox.VOCAB_FACTS, key));
if (leakedKeys.length === 0) {
  console.log('[PASS] No verification-only vocabulary keys leaked into production data.');
} else {
  overallPassed = false;
  console.log('[FAIL] Verification-only keys found in production:', leakedKeys);
}

// Test 4b: Dynamic Fallback
const fallbackResult = sandbox.getFunFact({ en: 'unknown_test_word', ko: '비빔밥', category: 'food' });
if (fallbackResult && fallbackResult.vi && fallbackResult.ko && fallbackResult.vi.includes('Ẩm thực') && fallbackResult.ko.includes('3 âm tiết')) {
  console.log('[PASS] Dynamic fallback returned rich vi and ko fields with exact Hangul decomposition.');
} else {
  overallPassed = false;
  console.log('[FAIL] Dynamic fallback failed:', fallbackResult);
}

// 5. Coverage against levels.json
console.log('\n--- TEST 5: levels.json Coverage Check ---');
const levels = JSON.parse(fs.readFileSync('levels.json', 'utf8'));
let matchedWords = 0;
let totalWords = 0;

levels.forEach(lvl => {
  if (lvl.words) {
    lvl.words.forEach(w => {
      totalWords++;
      const key = (w.en || '').toLowerCase().trim();
      if (facts[key]) matchedWords++;
    });
  }
});

console.log(`Matched ${matchedWords} out of ${totalWords} word items in levels.json (${(matchedWords / totalWords * 100).toFixed(2)}%).`);
if (matchedWords >= 1400) {
  console.log('[PASS] Covered >= 1,400 words from levels.json.');
} else {
  overallPassed = false;
  console.log('[FAIL] Coverage of levels.json below 1,400 words.');
}

console.log(`\n==================================================`);
console.log(`FINAL VERIFICATION RESULT: ${overallPassed ? 'PASS' : 'FAIL'}`);
console.log(`==================================================`);
