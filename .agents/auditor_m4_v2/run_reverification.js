const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT_DIR = 'C:\\VibeCode\\Hangeul Valley';

console.log('====================================================');
console.log(' FORENSIC AUDIT — ITERATION 2 RE-VERIFICATION      ');
console.log('====================================================\n');

const results = {
  sync: false,
  syntax: false,
  boundary: false,
  format1_sino_korean: false,
  format2_empty_placeholders: false,
  coverage: false,
  dynamic_fallback: false,
  prohibited_patterns: false,
  details: {}
};

// 1. Synchronization Check
const gameBuf = fs.readFileSync(path.join(ROOT_DIR, 'game.js'));
const assetsBuf = fs.readFileSync(path.join(ROOT_DIR, 'assets/game.js'));
const hash1 = crypto.createHash('sha256').update(gameBuf).digest('hex');
const hash2 = crypto.createHash('sha256').update(assetsBuf).digest('hex');

results.sync = (hash1 === hash2);
results.details.sync = {
  gameHash: hash1,
  assetsHash: hash2,
  gameSize: gameBuf.length,
  assetsSize: assetsBuf.length,
  pass: results.sync
};
console.log(`[CHECK 1] Hash Synchronization: ${results.sync ? 'PASS' : 'FAIL'}`);
console.log(`  game.js SHA256:   ${hash1} (${gameBuf.length} bytes)`);
console.log(`  assets/game.js:   ${hash2} (${assetsBuf.length} bytes)`);

// 2. Syntax Check
try {
  execSync('node -c game.js', { cwd: ROOT_DIR });
  execSync('node -c assets/game.js', { cwd: ROOT_DIR });
  results.syntax = true;
  results.details.syntax = { pass: true, output: 'node -c passed for both files' };
} catch (e) {
  results.syntax = false;
  results.details.syntax = { pass: false, error: e.message };
}
console.log(`\n[CHECK 2] Syntax Check (node -c): ${results.syntax ? 'PASS' : 'FAIL'}`);

// 3. Boundary Check
const gameContent = gameBuf.toString('utf8');
const lines = gameContent.split(/\r?\n/);

let vfStartLine = -1, vfEndLine = -1, gfStartLine = -1, gfEndLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const VOCAB_FACTS =')) vfStartLine = i + 1;
  if (vfStartLine > 0 && vfEndLine === -1 && lines[i].trim() === '};') vfEndLine = i + 1;
  if (lines[i].includes('function getFunFact(')) gfStartLine = i + 1;
}

if (gfStartLine > 0) {
  let bCount = 0, bStart = false;
  for (let i = gfStartLine - 1; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { bCount++; bStart = true; }
      if (ch === '}') { bCount--; }
    }
    if (bStart && bCount === 0) {
      gfEndLine = i + 1;
      break;
    }
  }
}

console.log(`\n[CHECK 3] Boundary Analysis`);
console.log(`  VOCAB_FACTS range: lines ${vfStartLine} - ${vfEndLine}`);
console.log(`  getFunFact range:  lines ${gfStartLine} - ${gfEndLine}`);

// Git diff hunks check
let diff = '';
try {
  diff = execSync('git diff -U0 game.js', { encoding: 'utf8', cwd: ROOT_DIR, maxBuffer: 20 * 1024 * 1024 });
} catch (e) {
  diff = '';
}

const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
let match;
const outsideEdits = [];

while ((match = hunkRegex.exec(diff)) !== null) {
  const newStart = parseInt(match[3], 10);
  const newCount = match[4] !== undefined ? parseInt(match[4], 10) : 1;
  const newEnd = newCount === 0 ? newStart : newStart + newCount - 1;

  const inVf = (newStart >= vfStartLine && newEnd <= vfEndLine);
  const inGf = (newStart >= gfStartLine && newEnd <= gfEndLine);

  if (!inVf && !inGf) {
    outsideEdits.push({ hunk: match[0], startLine: newStart, endLine: newEnd });
  }
}

// Check helper presence inside getFunFact body
const getFunFactBody = lines.slice(gfStartLine - 1, gfEndLine).join('\n');
const helpersInsideGf = (
  getFunFactBody.includes('RR_CHOSEONG') &&
  getFunFactBody.includes('decomposeHangulWord') &&
  getFunFactBody.includes('getHangulRomanization')
);

// Check if any helper functions/constants exist in global scope outside getFunFact
const codeOutsideVfAndGf = lines.filter((_, idx) => {
  const lineNo = idx + 1;
  return lineNo < vfStartLine || (lineNo > vfEndLine && lineNo < gfStartLine) || lineNo > gfEndLine;
}).join('\n');

const hasGlobalHelpers = (
  /const\s+RR_CHOSEONG/.test(codeOutsideVfAndGf) ||
  /function\s+decomposeHangulWord/.test(codeOutsideVfAndGf) ||
  /function\s+getHangulRomanization/.test(codeOutsideVfAndGf)
);

results.boundary = (outsideEdits.length === 0) && helpersInsideGf && !hasGlobalHelpers;
results.details.boundary = {
  vfStartLine,
  vfEndLine,
  gfStartLine,
  gfEndLine,
  outsideEditsCount: outsideEdits.length,
  outsideEdits,
  helpersInsideGf,
  hasGlobalHelpers,
  pass: results.boundary
};
console.log(`  Helpers/constants inside getFunFact: ${helpersInsideGf ? 'YES' : 'NO'}`);
console.log(`  Zero helper functions/constants in global scope: ${!hasGlobalHelpers ? 'YES' : 'NO'}`);
console.log(`  Zero edits outside VOCAB_FACTS & getFunFact: ${outsideEdits.length === 0 ? 'YES' : 'NO'}`);
console.log(`  Boundary Check Verdict: ${results.boundary ? 'PASS' : 'FAIL'}`);


// Extract VOCAB_FACTS and getFunFact for data testing
const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);

const vocabCode = lines.slice(vfStartLine - 1, vfEndLine).join('\n') + '\nglobalThis.VOCAB_FACTS = VOCAB_FACTS;\n';
const gfCode = lines.slice(gfStartLine - 1, gfEndLine).join('\n') + '\nglobalThis.getFunFact = getFunFact;\n';

try {
  vm.runInContext(vocabCode, sandbox);
  vm.runInContext(gfCode, sandbox);
} catch (e) {
  console.error('VM Context Evaluation Error:', e);
}

const VOCAB_FACTS = sandbox.VOCAB_FACTS || {};
const getFunFact = sandbox.getFunFact;

// 4. Format Check 1: Sino-Korean format check
let sinoKoreanViolations = [];
let sinoKoreanEntriesCount = 0;

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const vi = fact.vi || '';
  // Check if entry contains 한자어
  if (vi.includes('한자어')) {
    sinoKoreanEntriesCount++;
    // Must be formatted as 'từ Hán-Hàn (한자어)' or 'Hán-Hàn'
    const isCorrectFormat = vi.includes('từ Hán-Hàn (한자어)') || vi.includes('Hán-Hàn');
    if (!isCorrectFormat) {
      sinoKoreanViolations.push({ word, vi });
    }
  }
});

results.format1_sino_korean = (sinoKoreanViolations.length === 0);
results.details.format1_sino_korean = {
  totalEntries: Object.keys(VOCAB_FACTS).length,
  sinoKoreanEntriesCount,
  violationsCount: sinoKoreanViolations.length,
  violations: sinoKoreanViolations,
  pass: results.format1_sino_korean
};
console.log(`\n[CHECK 4] Format Check 1 (Sino-Korean origin tag format): ${results.format1_sino_korean ? 'PASS' : 'FAIL'}`);
console.log(`  Total Sino-Korean entries containing 한자어: ${sinoKoreanEntriesCount}`);
console.log(`  Sino-Korean entries violating 'từ Hán-Hàn (한자어)' / 'Hán-Hàn' format: ${sinoKoreanViolations.length}`);

// 5. Format Check 2: Empty [] () placeholders check
let placeholderViolations = [];

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const vi = fact.vi || '';
  const ko = fact.ko || '';

  const hasEmptySquare = /\[\s*\]/.test(vi) || /\[\s*\]/.test(ko);
  const hasEmptyParen = /\(\s*\)/.test(vi) || /\(\s*\)/.test(ko);

  if (hasEmptySquare || hasEmptyParen) {
    placeholderViolations.push({ word, viHasEmptySquare: /\[\s*\]/.test(vi), koHasEmptySquare: /\[\s*\]/.test(ko), viHasEmptyParen: /\(\s*\)/.test(vi), koHasEmptyParen: /\(\s*\)/.test(ko) });
  }
});

results.format2_empty_placeholders = (placeholderViolations.length === 0);
results.details.format2_empty_placeholders = {
  totalEntries: Object.keys(VOCAB_FACTS).length,
  violationsCount: placeholderViolations.length,
  violations: placeholderViolations,
  pass: results.format2_empty_placeholders
};
console.log(`\n[CHECK 5] Format Check 2 (Empty [] () placeholders): ${results.format2_empty_placeholders ? 'PASS' : 'FAIL'}`);
console.log(`  Entries with empty [] or () placeholders: ${placeholderViolations.length}`);

// 6. Database Coverage Check
const levelsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'levels.json'), 'utf8'));
const targetWords = new Set();
levelsData.forEach(lvl => {
  if (lvl.words) lvl.words.forEach(w => targetWords.add(w.en ? w.en.toLowerCase().trim() : w.toLowerCase().trim()));
});

let matchedCount = 0;
targetWords.forEach(w => {
  if (VOCAB_FACTS[w]) matchedCount++;
});
const coveragePct = (matchedCount / targetWords.size) * 100;
results.coverage = (matchedCount === targetWords.size);
results.details.coverage = {
  matchedCount,
  totalTargetWords: targetWords.size,
  coveragePct: coveragePct.toFixed(2),
  pass: results.coverage
};
console.log(`\n[CHECK 6] VOCAB_FACTS Coverage: ${matchedCount} / ${targetWords.size} (${coveragePct.toFixed(2)}%): ${results.coverage ? 'PASS' : 'FAIL'}`);

// 7. Functional Fallback Execution
let fallbackTestResult = null;
try {
  const hit = getFunFact({ en: 'father', ko: '아버지' });
  const miss = getFunFact({ en: 'cyber tiger', ko: '사이버 호랑이', category: 'animal' });

  const hitValid = hit && typeof hit.vi === 'string' && typeof hit.ko === 'string';
  const missValid = miss && typeof miss.vi === 'string' && miss.vi.includes('sa-i-beo ho-rang-i') && miss.ko.includes('sa-i-beo ho-rang-i');

  results.dynamic_fallback = hitValid && missValid;
  fallbackTestResult = { hit, miss, pass: results.dynamic_fallback };
} catch (e) {
  results.dynamic_fallback = false;
  fallbackTestResult = { error: e.message, pass: false };
}
results.details.dynamic_fallback = fallbackTestResult;
console.log(`\n[CHECK 7] Dynamic getFunFact Execution: ${results.dynamic_fallback ? 'PASS' : 'FAIL'}`);
if (fallbackTestResult && fallbackTestResult.miss) {
  console.log(`  Unseen word 'cyber tiger' output vi:`, fallbackTestResult.miss.vi);
  console.log(`  Unseen word 'cyber tiger' output ko:`, fallbackTestResult.miss.ko);
}

// 8. Static Analysis for Prohibited Patterns
const prohibitedKeywords = ['istest', 'testmode', 'bypass', 'fake', 'facade', 'hardcode', 'mock'];
const foundProhibited = [];
prohibitedKeywords.forEach(kw => {
  const matches = (gameContent.match(new RegExp(kw, 'gi')) || []);
  if (matches.length > 0) {
    foundProhibited.push({ keyword: kw, count: matches.length });
  }
});

results.prohibited_patterns = (foundProhibited.length === 0);
results.details.prohibited_patterns = {
  found: foundProhibited,
  pass: results.prohibited_patterns
};
console.log(`\n[CHECK 8] Prohibited Patterns (Static Bypass Keywords): ${results.prohibited_patterns ? 'PASS' : 'FAIL'}`);

// Overall Verdict
const checkKeys = ['sync', 'syntax', 'boundary', 'format1_sino_korean', 'format2_empty_placeholders', 'coverage', 'dynamic_fallback', 'prohibited_patterns'];
const overallVerdict = checkKeys.every(k => results[k] === true);
const finalVerdictString = overallVerdict ? 'CLEAN' : 'INTEGRITY VIOLATION';

console.log('\n====================================================');
console.log(`FINAL RE-VERIFICATION VERDICT: ${finalVerdictString}`);
console.log('====================================================');

fs.writeFileSync(path.join(__dirname, 'reverification_report.json'), JSON.stringify(results, null, 2));
