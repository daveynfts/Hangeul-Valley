'use strict';

const fs = require('fs');
const path = require('path');
const { GAME_SCRIPTS, checkGameScripts } = require('./gameSource');

console.log('=== STARTING MILESTONE M2 & M3 EMPIRICAL VERIFICATION ===');
let overallPassed = true;

console.log('\n--- TEST 1: Syntax Error Check (node --check) ---');
try {
  checkGameScripts();
  console.log('[PASS] Syntax check passed with 0 errors for ' + GAME_SCRIPTS.length + ' files');
} catch (err) {
  overallPassed = false;
  console.log('[FAIL] Syntax check failed:\n' + (err.stderr ? err.stderr.toString() : err.message));
}

console.log('\n--- TEST 2: facts.json coverage ---');
const facts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'facts.json'), 'utf8'));
const keys = Object.keys(facts);
console.log('Total facts.json entries: ' + keys.length);
if (keys.length >= 1400) {
  console.log('[PASS] facts.json coverage threshold met (>= 1400 entries: got ' + keys.length + ').');
} else {
  overallPassed = false;
  console.log('[FAIL] facts.json coverage threshold failed (< 1400 entries: got ' + keys.length + ').');
}

console.log('\n--- TEST 3: levels.json Coverage Check ---');
const levels = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels.json'), 'utf8'));
let matchedWords = 0;
let totalWords = 0;
levels.forEach((lvl) => {
  if (lvl.words) {
    lvl.words.forEach((w) => {
      totalWords++;
      if (facts[w.ko]) matchedWords++;
    });
  }
});
console.log('Matched ' + matchedWords + ' out of ' + totalWords + ' word items in levels.json (' +
  ((matchedWords / totalWords) * 100).toFixed(2) + '%).');
if (matchedWords >= 1400) {
  console.log('[PASS] Covered >= 1,400 words from levels.json.');
} else {
  overallPassed = false;
  console.log('[FAIL] Coverage of levels.json below 1,400 words.');
}

console.log('\n==================================================');
console.log('FINAL VERIFICATION RESULT: ' + (overallPassed ? 'PASS' : 'FAIL'));
console.log('==================================================');
process.exit(overallPassed ? 0 : 1);
