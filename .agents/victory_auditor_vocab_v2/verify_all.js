const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');
const levelsJsonPath = path.join(rootDir, 'levels.json');

const report = {
  timestamp: new Date().toISOString(),
  phaseA: { result: 'PASS', anomalies: [] },
  phaseB: { result: 'PASS', details: [] },
  phaseC: { result: 'PASS', testResults: {} },
  verdict: 'PENDING'
};

console.log('=== STARTING INDEPENDENT VICTORY RE-AUDIT V2 ===\n');

// -------------------------------------------------------------
// 1. FILE BINARY SYNC & TIMELINE
// -------------------------------------------------------------
const gameBuf = fs.readFileSync(gameJsPath);
const assetsBuf = fs.readFileSync(assetsGameJsPath);
const isIdentical = gameBuf.equals(assetsBuf);

console.log(`[CHECK 1] game.js vs assets/game.js binary sync: ${isIdentical ? 'PASS (100% Identical)' : 'FAIL (Mismatch)'}`);
report.phaseB.details.push({
  check: 'Binary Sync (game.js vs assets/game.js)',
  passed: isIdentical,
  info: `game.js (${gameBuf.length} bytes), assets/game.js (${assetsBuf.length} bytes)`
});

const gameStat = fs.statSync(gameJsPath);
const assetsStat = fs.statSync(assetsGameJsPath);
console.log(`  game.js mtime: ${gameStat.mtime.toISOString()}`);
console.log(`  assets/game.js mtime: ${assetsStat.mtime.toISOString()}`);

// -------------------------------------------------------------
// 2. SYNTAX CHECK (node -c)
// -------------------------------------------------------------
let syntaxGame = true;
let syntaxAssets = true;
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
} catch (e) {
  syntaxGame = false;
}
try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
} catch (e) {
  syntaxAssets = false;
}
console.log(`[CHECK 2] Syntax check: game.js=${syntaxGame ? 'PASS' : 'FAIL'}, assets/game.js=${syntaxAssets ? 'PASS' : 'FAIL'}`);
report.phaseB.details.push({
  check: 'Syntax Check (node -c)',
  passed: syntaxGame && syntaxAssets,
  info: `game.js: ${syntaxGame}, assets/game.js: ${syntaxAssets}`
});

// -------------------------------------------------------------
// 3. STRICT CONSTRAINT BOUNDARY CHECK
// -------------------------------------------------------------
const gameContent = gameBuf.toString('utf-8');
const lines = gameContent.split('\n');

// Locate VOCAB_FACTS and getFunFact
let vocabFactsStart = -1;
let vocabFactsEnd = -1;
let getFunFactStart = -1;
let getFunFactEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const VOCAB_FACTS = {') || line.includes('var VOCAB_FACTS = {') || line.includes('let VOCAB_FACTS = {')) {
    if (vocabFactsStart === -1) vocabFactsStart = i + 1; // 1-indexed
  }
  if (vocabFactsStart !== -1 && vocabFactsEnd === -1 && line.trim() === '};') {
    vocabFactsEnd = i + 1;
  }
  if (line.includes('function getFunFact(')) {
    if (getFunFactStart === -1) getFunFactStart = i + 1;
  }
}

// Find matching closing brace for getFunFact
if (getFunFactStart !== -1) {
  let depth = 0;
  for (let i = getFunFactStart - 1; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    if (depth === 0) {
      getFunFactEnd = i + 1;
      break;
    }
  }
}

console.log(`\n[CHECK 3] Code Boundaries:`);
console.log(`  VOCAB_FACTS: lines ${vocabFactsStart} to ${vocabFactsEnd}`);
console.log(`  getFunFact: lines ${getFunFactStart} to ${getFunFactEnd}`);

// Check between VOCAB_FACTS end and getFunFact start
const linesBetween = lines.slice(vocabFactsEnd, getFunFactStart - 1);
const nonCommentNonEmptyBetween = linesBetween.filter(l => {
  const trimmed = l.trim();
  return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
});

console.log(`  Lines between VOCAB_FACTS end and getFunFact start: ${linesBetween.length} total, ${nonCommentNonEmptyBetween.length} non-comment code lines.`);
if (nonCommentNonEmptyBetween.length > 0) {
  console.log('  [WARNING] Found code lines between VOCAB_FACTS and getFunFact:');
  nonCommentNonEmptyBetween.forEach(l => console.log(`    ${l}`));
}

// Search for helper functions/constants outside getFunFact
const helpers = ['RR_CHOSEONG', 'RR_JUNGSEONG', 'RR_JONGSEONG', 'decomposeHangulWord', 'getHangulRomanization'];
const helperViolations = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  // Check if line is outside getFunFact
  const isInsideGetFunFact = (lineNum >= getFunFactStart && lineNum <= getFunFactEnd);

  helpers.forEach(h => {
    if (line.includes(h)) {
      if (!isInsideGetFunFact) {
        helperViolations.push({ lineNum, helper: h, code: line.trim() });
      }
    }
  });
}

// Also verify helper functions exist inside getFunFact
const getFunFactCode = lines.slice(getFunFactStart - 1, getFunFactEnd).join('\n');
const helpersInside = helpers.map(h => ({ helper: h, found: getFunFactCode.includes(h) }));

const boundaryPassed = (nonCommentNonEmptyBetween.length === 0) && (helperViolations.length === 0) && (helpersInside.every(h => h.found));

console.log(`  Helper violations outside getFunFact: ${helperViolations.length}`);
if (helperViolations.length > 0) {
  helperViolations.forEach(v => console.log(`    Line ${v.lineNum}: ${v.code}`));
}
helpersInside.forEach(h => console.log(`  Helper '${h.helper}' inside getFunFact: ${h.found ? 'YES' : 'NO'}`));
console.log(`  Strict Boundary Check: ${boundaryPassed ? 'PASS' : 'FAIL'}`);

report.phaseB.details.push({
  check: 'Strict Constraint Boundary Check',
  passed: boundaryPassed,
  info: `Non-comment code between: ${nonCommentNonEmptyBetween.length}, Helper violations outside: ${helperViolations.length}`
});

// -------------------------------------------------------------
// 4. LOAD VOCAB_FACTS AND LEVELS.JSON FOR AUDITING ENTRIES
// -------------------------------------------------------------
let VOCAB_FACTS = null;
let getFunFactFn = null;

try {
  const codeToRun = `
    ${lines.slice(vocabFactsStart - 1, vocabFactsEnd).join('\n')}
    ${lines.slice(getFunFactStart - 1, getFunFactEnd).join('\n')}
    return { VOCAB_FACTS, getFunFact };
  `;
  const evaluator = new Function(codeToRun);
  const result = evaluator();
  VOCAB_FACTS = result.VOCAB_FACTS;
  getFunFactFn = result.getFunFact;
} catch (e) {
  console.error('Error evaluating VOCAB_FACTS / getFunFact:', e);
}

const levelsData = JSON.parse(fs.readFileSync(levelsJsonPath, 'utf-8'));
const allLevelWords = new Set();
if (Array.isArray(levelsData)) {
  levelsData.forEach(lvl => {
    if (lvl.words && Array.isArray(lvl.words)) {
      lvl.words.forEach(w => {
        if (w.en) allLevelWords.add(w.en.toLowerCase().trim());
      });
    }
  });
} else if (levelsData.levels && Array.isArray(levelsData.levels)) {
  levelsData.levels.forEach(lvl => {
    if (lvl.words && Array.isArray(lvl.words)) {
      lvl.words.forEach(w => {
        if (w.en) allLevelWords.add(w.en.toLowerCase().trim());
      });
    }
  });
}

const totalTargetWords = allLevelWords.size;
const vocabFactKeys = Object.keys(VOCAB_FACTS || {});
let coveredCount = 0;
allLevelWords.forEach(w => {
  if (VOCAB_FACTS[w]) coveredCount++;
});

const coveragePct = (coveredCount / totalTargetWords) * 100;
const coveragePassed = coveredCount >= 1494 && coveragePct >= 93.0;

console.log(`\n[CHECK 4] Vocabulary Coverage:`);
console.log(`  Total unique words in levels.json: ${totalTargetWords}`);
console.log(`  Total entries in VOCAB_FACTS: ${vocabFactKeys.length}`);
console.log(`  Covered target words: ${coveredCount} / ${totalTargetWords} (${coveragePct.toFixed(2)}%)`);
console.log(`  Coverage Requirement (>= 1,494 / >= 93%): ${coveragePassed ? 'PASS' : 'FAIL'}`);

report.phaseC.testResults.coverage = {
  covered: coveredCount,
  total: totalTargetWords,
  pct: coveragePct,
  passed: coveragePassed
};

// -------------------------------------------------------------
// 5. R1 FIELD COMPLIANCE (`vi` field)
// -------------------------------------------------------------
// Requirement: 100% of Sino-Korean entries use `Hán-Hàn` or `từ Hán-Hàn (한자어)` tag with Hanja breakdown, and zero raw `한자어` without `Hán-Hàn` remain.
const r1Violations = [];
const sinoKoreanEntries = [];

vocabFactKeys.forEach(key => {
  const entry = VOCAB_FACTS[key];
  if (!entry || !entry.vi) {
    r1Violations.push({ key, issue: 'Missing or empty vi field' });
    return;
  }
  const vi = entry.vi;

  // Check for raw '한자어' without 'Hán-Hàn'
  if (vi.includes('한자어')) {
    sinoKoreanEntries.push(key);
    const hasHanHan = vi.includes('Hán-Hàn') || vi.includes('từ Hán-Hàn') || vi.includes('Hán Hàn');
    if (!hasHanHan) {
      r1Violations.push({ key, issue: 'Contains raw 한자어 without Hán-Hàn tag', sample: vi });
    }
  }

  // Check if Hanja characters are present without Hán-Hàn tag
  if (/[\u4e00-\u9fff]/.test(vi) && !vi.includes('Hán-Hàn') && !vi.includes('từ Hán-Hàn') && !vi.includes('Hán Hàn')) {
    r1Violations.push({ key, issue: 'Contains Hanja characters without Hán-Hàn tag', sample: vi });
  }
});

const r1Passed = r1Violations.length === 0;

console.log(`\n[CHECK 5] R1 (vi field origin tag compliance):`);
console.log(`  Sino-Korean entries checked: ${sinoKoreanEntries.length}`);
console.log(`  R1 Violations: ${r1Violations.length}`);
if (r1Violations.length > 0) {
  console.log('  Sample R1 Violations:');
  r1Violations.slice(0, 10).forEach(v => console.log(`    - [${v.key}]: ${v.issue} | Content: "${v.sample}"`));
}
console.log(`  R1 Compliance: ${r1Passed ? 'PASS' : 'FAIL'}`);

report.phaseC.testResults.r1 = {
  sinoCount: sinoKoreanEntries.length,
  violationsCount: r1Violations.length,
  passed: r1Passed,
  samples: r1Violations.slice(0, 5)
};

// -------------------------------------------------------------
// 6. R2 FIELD COMPLIANCE (`ko` field)
// -------------------------------------------------------------
// Requirement: Verify zero entries contain empty `[] ()` template placeholders.
const r2Violations = [];

vocabFactKeys.forEach(key => {
  const entry = VOCAB_FACTS[key];
  if (!entry || !entry.ko) {
    r2Violations.push({ key, issue: 'Missing or empty ko field' });
    return;
  }
  const ko = entry.ko;

  if (/\[\s*\]\s*\(\s*\)/.test(ko) || ko.includes('[] ()') || ko.includes('[]()')) {
    r2Violations.push({ key, issue: 'Contains empty [] () template placeholder', sample: ko });
  } else if (/\[\s*\]/.test(ko)) {
    r2Violations.push({ key, issue: 'Contains empty [] brackets', sample: ko });
  }
});

const r2Passed = r2Violations.length === 0;

console.log(`\n[CHECK 6] R2 (ko field template placeholder compliance):`);
console.log(`  R2 Violations: ${r2Violations.length}`);
if (r2Violations.length > 0) {
  console.log('  Sample R2 Violations:');
  r2Violations.slice(0, 10).forEach(v => console.log(`    - [${v.key}]: ${v.issue} | Content: "${v.sample}"`));
}
console.log(`  R2 Compliance: ${r2Passed ? 'PASS' : 'FAIL'}`);

report.phaseC.testResults.r2 = {
  violationsCount: r2Violations.length,
  passed: r2Passed,
  samples: r2Violations.slice(0, 5)
};

// -------------------------------------------------------------
// 7. R4 FALLBACK EXECUTION (`getFunFact(word)`)
// -------------------------------------------------------------
let r4Passed = true;
const r4TestResults = [];

if (typeof getFunFactFn === 'function') {
  // Test hit case
  const testHit = getFunFactFn({ en: 'apple' });
  const hitOk = testHit && testHit.vi && testHit.ko && !testHit.vi.includes('undefined');
  r4TestResults.push({ case: 'Hit (apple)', ok: hitOk, res: testHit });

  // Test miss case 1 (English word not in dict)
  const testMiss1 = getFunFactFn({ en: 'supercalifragilisticexpialidocious', category: 'General' });
  const miss1Ok = testMiss1 && testMiss1.vi && testMiss1.ko && !testMiss1.vi.includes('undefined');
  r4TestResults.push({ case: 'Miss (English word)', ok: miss1Ok, res: testMiss1 });

  // Test miss case 2 (Korean word)
  const testMiss2 = getFunFactFn({ ko: '사과', en: 'apple_test', category: 'Food' });
  const miss2Ok = testMiss2 && testMiss2.vi && testMiss2.ko && testMiss2.ko.includes('sa-gwa');
  r4TestResults.push({ case: 'Miss (Korean word sa-gwa)', ok: miss2Ok, res: testMiss2 });

  r4Passed = hitOk && miss1Ok && miss2Ok;
} else {
  r4Passed = false;
}

console.log(`\n[CHECK 7] R4 Fallback Function Execution:`);
r4TestResults.forEach(r => console.log(`  Test ${r.case}: ${r.ok ? 'PASS' : 'FAIL'}`));
console.log(`  R4 Compliance: ${r4Passed ? 'PASS' : 'FAIL'}`);

report.phaseC.testResults.r4 = {
  passed: r4Passed,
  details: r4TestResults
};

// -------------------------------------------------------------
// OVERALL VERDICT
// -------------------------------------------------------------
const allPassed = isIdentical && syntaxGame && syntaxAssets && boundaryPassed && coveragePassed && r1Passed && r2Passed && r4Passed;

report.verdict = allPassed ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED';

console.log('\n=================================================');
console.log(`FINAL VERDICT: ${report.verdict}`);
console.log('=================================================\n');

fs.writeFileSync(path.join(__dirname, 'audit_report.json'), JSON.stringify(report, null, 2));
