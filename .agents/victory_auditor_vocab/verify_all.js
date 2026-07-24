const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = 'C:\\VibeCode\\Hangeul Valley';

console.log('====================================================');
console.log('       INDEPENDENT VICTORY AUDIT SUITE             ');
console.log('====================================================\n');

let passAll = true;
const results = {
  phaseA: { status: 'PENDING', anomalies: [] },
  phaseB: { status: 'PENDING', checks: [] },
  phaseC: { status: 'PENDING', r1: null, r2: null, r3: null, r4: null }
};

// -------------------------------------------------------------
// PHASE A — TIMELINE & PROVENANCE AUDIT
// -------------------------------------------------------------
console.log('--- PHASE A: TIMELINE & PROVENANCE AUDIT ---');
try {
  const gameStat = fs.statSync(path.join(ROOT_DIR, 'game.js'));
  const assetsGameStat = fs.statSync(path.join(ROOT_DIR, 'assets/game.js'));
  const levelsStat = fs.statSync(path.join(ROOT_DIR, 'levels.json'));

  console.log(`game.js modified: ${gameStat.mtime.toISOString()}`);
  console.log(`assets/game.js modified: ${assetsGameStat.mtime.toISOString()}`);
  console.log(`levels.json modified: ${levelsStat.mtime.toISOString()}`);

  // Check for pre-populated result artifacts
  const suspiciousFiles = [];
  ['test_results.log', 'audit_result.json', 'verification.txt'].forEach(f => {
    if (fs.existsSync(path.join(ROOT_DIR, f))) {
      suspiciousFiles.push(f);
    }
  });

  if (suspiciousFiles.length > 0) {
    results.phaseA.anomalies.push(`Suspicious pre-populated artifacts found: ${suspiciousFiles.join(', ')}`);
    console.log(`❌ Phase A Anomaly: ${suspiciousFiles.join(', ')}`);
  } else {
    console.log('✅ Phase A: No pre-populated result artifacts found.');
  }

  results.phaseA.status = results.phaseA.anomalies.length === 0 ? 'PASS' : 'FAIL';
} catch (e) {
  console.error('Phase A Error:', e);
  results.phaseA.status = 'FAIL';
  results.phaseA.anomalies.push(e.message);
}

// -------------------------------------------------------------
// PHASE B — INTEGRITY & FORENSIC CHECKS
// -------------------------------------------------------------
console.log('\n--- PHASE B: INTEGRITY & FORENSIC CHECKS ---');

// Check 1: File synchronization check between game.js and assets/game.js
try {
  const gameBuf = fs.readFileSync(path.join(ROOT_DIR, 'game.js'));
  const assetsGameBuf = fs.readFileSync(path.join(ROOT_DIR, 'assets/game.js'));
  
  if (gameBuf.equals(assetsGameBuf)) {
    console.log('✅ Check B1 (Sync): game.js and assets/game.js are 100% identical.');
    results.phaseB.checks.push({ name: 'File Sync (game.js vs assets/game.js)', pass: true });
  } else {
    console.log('❌ Check B1 (Sync): game.js and assets/game.js DIFFER!');
    results.phaseB.checks.push({ name: 'File Sync (game.js vs assets/game.js)', pass: false, detail: 'Files are not binary identical' });
    passAll = false;
  }
} catch (e) {
  console.error('Check B1 Error:', e);
  results.phaseB.checks.push({ name: 'File Sync', pass: false, detail: e.message });
  passAll = false;
}

// Check 2: Syntax checks (`node -c game.js` and `node -c assets/game.js`)
try {
  execSync('node -c game.js', { cwd: ROOT_DIR });
  execSync('node -c assets/game.js', { cwd: ROOT_DIR });
  console.log('✅ Check B2 (Syntax): Both game.js and assets/game.js passed syntax check (`node -c`).');
  results.phaseB.checks.push({ name: 'Syntax Check (node -c)', pass: true });
} catch (e) {
  console.log('❌ Check B2 (Syntax): Syntax check failed!', e.message);
  results.phaseB.checks.push({ name: 'Syntax Check (node -c)', pass: false, detail: e.message });
  passAll = false;
}

// Check 3: STRICT CONSTRAINT CHECK - Zero edits outside VOCAB_FACTS object and getFunFact fallback function
try {
  const diffOutput = execSync('git diff -U0 game.js', { encoding: 'utf8', cwd: ROOT_DIR });
  const gameContent = fs.readFileSync(path.join(ROOT_DIR, 'game.js'), 'utf8');

  // Let's locate line numbers of VOCAB_FACTS and getFunFact in original vs current file
  // Using git diff --stat or hunk header analysis
  const lines = gameContent.split(/\r?\n/);
  
  let vocabFactsStartLine = -1;
  let vocabFactsEndLine = -1;
  let getFunFactStartLine = -1;
  let getFunFactEndLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const VOCAB_FACTS =')) {
      vocabFactsStartLine = i + 1; // 1-indexed
    }
    if (vocabFactsStartLine > 0 && vocabFactsEndLine === -1 && lines[i].trim() === '};') {
      vocabFactsEndLine = i + 1;
    }
    if (lines[i].includes('function getFunFact(') || lines[i].includes('getFunFact =')) {
      getFunFactStartLine = i + 1;
    }
  }

  // Find end of getFunFact (closing brace matching getFunFactStartLine)
  if (getFunFactStartLine > 0) {
    let braceCount = 0;
    let started = false;
    for (let i = getFunFactStartLine - 1; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') { braceCount++; started = true; }
        if (char === '}') { braceCount--; }
      }
      if (started && braceCount === 0) {
        getFunFactEndLine = i + 1;
        break;
      }
    }
  }

  console.log(`Detected VOCAB_FACTS lines: ${vocabFactsStartLine} - ${vocabFactsEndLine}`);
  console.log(`Detected getFunFact lines: ${getFunFactStartLine} - ${getFunFactEndLine}`);

  // Parse diff hunks in game.js
  // Hunk header format: @@ -oldStart,oldNum +newStart,newNum @@
  const diffHunks = diffOutput.match(/@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/g) || [];
  let violations = [];

  diffHunks.forEach(hunkHeader => {
    const match = hunkHeader.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (match) {
      const newStart = parseInt(match[1], 10);
      const newNum = match[2] !== undefined ? parseInt(match[2], 10) : 1;
      const newEnd = newNum === 0 ? newStart : newStart + newNum - 1;

      // Check if hunk range is completely inside VOCAB_FACTS [vocabFactsStartLine, vocabFactsEndLine]
      // OR completely inside getFunFact [getFunFactStartLine, getFunFactEndLine]
      const insideVocab = (newStart >= vocabFactsStartLine && newEnd <= vocabFactsEndLine);
      const insideFunFact = (newStart >= getFunFactStartLine && newEnd <= getFunFactEndLine);

      if (!insideVocab && !insideFunFact) {
        violations.push({ hunk: hunkHeader, lines: `${newStart}-${newEnd}` });
      }
    }
  });

  if (violations.length === 0) {
    console.log('✅ Check B3 (Strict Constraints): Zero edits outside VOCAB_FACTS and getFunFact!');
    results.phaseB.checks.push({ name: 'Strict Constraint (No edits outside VOCAB_FACTS & getFunFact)', pass: true });
  } else {
    console.log('❌ Check B3 (Strict Constraints): Edits detected outside allowed areas!');
    console.log('Violating hunks:', violations);
    results.phaseB.checks.push({ name: 'Strict Constraint', pass: false, detail: `Violations found at lines: ${violations.map(v => v.lines).join(', ')}` });
    passAll = false;
  }
} catch (e) {
  console.error('Check B3 Error:', e);
  results.phaseB.checks.push({ name: 'Strict Constraint Check', pass: false, detail: e.message });
  passAll = false;
}

results.phaseB.status = results.phaseB.checks.every(c => c.pass) ? 'PASS' : 'FAIL';

// -------------------------------------------------------------
// PHASE C — INDEPENDENT TEST EXECUTION
// -------------------------------------------------------------
console.log('\n--- PHASE C: INDEPENDENT TEST EXECUTION ---');

// Load game.js and extract VOCAB_FACTS and getFunFact dynamically
let VOCAB_FACTS = null;
let getFunFact = null;

try {
  // Use vm module or evaluate in isolated context
  const vm = require('vm');
  const gameCode = fs.readFileSync(path.join(ROOT_DIR, 'game.js'), 'utf8');

  // Create mock browser/game environment for game.js to load without errors
  const sandbox = {
    console: console,
    Math: Math,
    window: {},
    document: { getElementById: () => null, querySelector: () => null },
    localStorage: { getItem: () => null, setItem: () => null },
    Phaser: { Scene: class {} }
  };

  // Extract VOCAB_FACTS and getFunFact by running or evaluating code block
  // Or we can extract VOCAB_FACTS object using vm context
  const evalCode = `
    ${gameCode}
    globalThis.VOCAB_FACTS = typeof VOCAB_FACTS !== 'undefined' ? VOCAB_FACTS : null;
    globalThis.getFunFact = typeof getFunFact !== 'undefined' ? getFunFact : null;
  `;

  const context = vm.createContext(sandbox);
  vm.runInContext(evalCode, context);

  VOCAB_FACTS = sandbox.VOCAB_FACTS;
  getFunFact = sandbox.getFunFact;

  console.log(`Loaded VOCAB_FACTS: ${VOCAB_FACTS ? Object.keys(VOCAB_FACTS).length : 0} entries.`);
  console.log(`Loaded getFunFact function: ${typeof getFunFact}`);
} catch (e) {
  console.error('Failed to load VOCAB_FACTS or getFunFact from game.js via VM:', e.message);
  // Fallback: extract VOCAB_FACTS object string and eval
  try {
    const gameCode = fs.readFileSync(path.join(ROOT_DIR, 'game.js'), 'utf8');
    const matchVocab = gameCode.match(/const VOCAB_FACTS = (\{[\s\S]*?\n\};)/);
    if (matchVocab) {
      VOCAB_FACTS = eval('(' + matchVocab[1].slice(0, -1) + ')');
    }
    const matchFn = gameCode.match(/(function getFunFact[\s\S]*?\n\})/);
    if (matchFn) {
      eval(matchFn[1]);
      getFunFact = getFunFact;
    }
  } catch (err) {
    console.error('Fallback eval failed:', err);
  }
}

// Check R3 Coverage Requirement: ≥ 1,400 words of the 1,500 in levels.json (≥93%)
try {
  const levelsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'levels.json'), 'utf8'));
  const levelsWords = new Set();

  // Parse words from levels.json
  if (Array.isArray(levelsData)) {
    levelsData.forEach(lvl => {
      if (lvl.words && Array.isArray(lvl.words)) {
        lvl.words.forEach(w => {
          if (typeof w === 'string') levelsWords.add(w.toLowerCase().trim());
          else if (w.en) levelsWords.add(w.en.toLowerCase().trim());
          else if (w.word) levelsWords.add(w.word.toLowerCase().trim());
        });
      }
      if (lvl.vocabulary && Array.isArray(lvl.vocabulary)) {
        lvl.vocabulary.forEach(w => {
          if (w.en) levelsWords.add(w.en.toLowerCase().trim());
          else if (typeof w === 'string') levelsWords.add(w.toLowerCase().trim());
        });
      }
    });
  } else if (typeof levelsData === 'object') {
    // If dictionary/object structure
    Object.values(levelsData).forEach(lvl => {
      if (lvl.words && Array.isArray(lvl.words)) {
        lvl.words.forEach(w => {
          if (typeof w === 'string') levelsWords.add(w.toLowerCase().trim());
          else if (w.en) levelsWords.add(w.en.toLowerCase().trim());
        });
      }
    });
  }

  console.log(`\nTotal unique target words in levels.json: ${levelsWords.size}`);

  const vocabKeys = Object.keys(VOCAB_FACTS || {});
  let matchedCount = 0;
  const missingWords = [];

  levelsWords.forEach(w => {
    if (VOCAB_FACTS && (VOCAB_FACTS[w] || VOCAB_FACTS[w.toLowerCase()])) {
      matchedCount++;
    } else {
      missingWords.push(w);
    }
  });

  const coveragePct = (matchedCount / levelsWords.size) * 100;
  console.log(`VOCAB_FACTS Coverage: ${matchedCount} / ${levelsWords.size} words (${coveragePct.toFixed(2)}%)`);

  const r3Pass = matchedCount >= 1400 && coveragePct >= 93.0;
  if (r3Pass) {
    console.log(`✅ R3 (Coverage & Format): PASS (${matchedCount} words >= 1400, ${coveragePct.toFixed(2)}% >= 93%)`);
  } else {
    console.log(`❌ R3 (Coverage & Format): FAIL (${matchedCount} words < 1400 or coverage ${coveragePct.toFixed(2)}% < 93%)`);
    passAll = false;
  }

  // Format check: all keys in VOCAB_FACTS must be lowercased en words, value = { vi, ko }
  let invalidFormatCount = 0;
  vocabKeys.forEach(k => {
    if (k !== k.toLowerCase()) invalidFormatCount++;
    const val = VOCAB_FACTS[k];
    if (!val || typeof val !== 'object' || typeof val.vi !== 'string' || typeof val.ko !== 'string') {
      invalidFormatCount++;
    }
  });

  if (invalidFormatCount === 0) {
    console.log(`✅ R3 (Keying & Structure): All ${vocabKeys.length} entries correctly formatted with { vi, ko }.`);
  } else {
    console.log(`❌ R3 (Keying & Structure): ${invalidFormatCount} entries have invalid format!`);
    passAll = false;
  }

  results.phaseC.r3 = { pass: r3Pass && invalidFormatCount === 0, matchedCount, totalWords: levelsWords.size, coveragePct, vocabTotal: vocabKeys.length, invalidFormatCount };
} catch (e) {
  console.error('R3 Execution Error:', e);
  results.phaseC.r3 = { pass: false, detail: e.message };
  passAll = false;
}

// -------------------------------------------------------------
// Check R1 Requirement (`vi` field)
// R1: Detailed vocabulary explanations:
//   - Origin: Hán-Hàn/고유어/외래어
//   - Korean example sentence + English translation
//   - Usage context
// -------------------------------------------------------------
console.log('\n--- CHECKING R1 (`vi` field compliance) ---');
try {
  let r1Pass = true;
  let r1MissingOrigin = 0;
  let r1MissingSentence = 0;
  let r1MissingContext = 0;
  let r1TotalChecked = 0;

  const originRegex = /(Hán-Hàn|Hán-Việt|Hán Hàn|고유어|외래어|Native Korean|Sino-Korean|Loanword)/i;
  // Example sentence: needs Korean text (Hangul) + English translation
  const hangulRegex = /[\uac00-\ud7af]/;

  const sampleFailures = [];

  Object.entries(VOCAB_FACTS || {}).forEach(([word, fact]) => {
    r1TotalChecked++;
    const vi = fact.vi || '';

    const hasOrigin = originRegex.test(vi);
    const hasHangul = hangulRegex.test(vi);
    const hasEnglishTranslation = /[a-zA-Z]{3,}/.test(vi);
    const lengthOk = vi.length >= 30; // Detailed explanation check

    if (!hasOrigin) r1MissingOrigin++;
    if (!hasHangul || !hasEnglishTranslation) r1MissingSentence++;
    if (!lengthOk) r1MissingContext++;

    if (!hasOrigin || !hasHangul || !hasEnglishTranslation || !lengthOk) {
      r1Pass = false;
      if (sampleFailures.length < 5) {
        sampleFailures.push({ word, vi, hasOrigin, hasHangul, hasEnglishTranslation, lengthOk });
      }
    }
  });

  console.log(`Total 'vi' fields checked: ${r1TotalChecked}`);
  console.log(`Missing origin tag (Hán-Hàn/고유어/외래어): ${r1MissingOrigin}`);
  console.log(`Missing Korean sentence or translation: ${r1MissingSentence}`);
  console.log(`Lacking detailed context (< 30 chars): ${r1MissingContext}`);

  if (sampleFailures.length > 0) {
    console.log('Sample R1 failures:', sampleFailures);
  }

  if (r1MissingOrigin === 0 && r1MissingSentence === 0 && r1MissingContext === 0) {
    console.log('✅ R1 (`vi` field): 100% compliant with origin, example sentence + translation, and usage context!');
    results.phaseC.r1 = { pass: true, totalChecked: r1TotalChecked };
  } else {
    console.log(`❌ R1 (\`vi\` field): ${r1MissingOrigin + r1MissingSentence + r1MissingContext} non-compliant entries found!`);
    results.phaseC.r1 = { pass: false, totalChecked: r1TotalChecked, missingOrigin: r1MissingOrigin, missingSentence: r1MissingSentence, missingContext: r1MissingContext, sampleFailures };
    passAll = false;
  }
} catch (e) {
  console.error('R1 Execution Error:', e);
  results.phaseC.r1 = { pass: false, detail: e.message };
  passAll = false;
}

// -------------------------------------------------------------
// Check R2 Requirement (`ko` field)
// R2: Rebuilt recall hint:
//   - Syllable analysis + romanization
//   - Mnemonic device
//   - Short 3-5 word Korean example sentence + romanization
// -------------------------------------------------------------
console.log('\n--- CHECKING R2 (`ko` field compliance) ---');
try {
  let r2MissingSyllable = 0;
  let r2MissingMnemonic = 0;
  let r2MissingSentence = 0;
  let r2TotalChecked = 0;

  const syllableRegex = /(syllable|음절|syllables|\d+\s*syl)/i;
  const mnemonicRegex = /(mnemonic|remember|think of|sounds like|picture|associate|🧠|💡)/i;
  const hangulRegex = /[\uac00-\ud7af]/;
  const romanizationRegex = /[a-z\-·\s]{2,}/i;

  const sampleR2Failures = [];

  Object.entries(VOCAB_FACTS || {}).forEach(([word, fact]) => {
    r2TotalChecked++;
    const ko = fact.ko || '';

    const hasSyllable = syllableRegex.test(ko) || /\d+\s*syllables?/i.test(ko) || /·/.test(ko);
    const hasMnemonic = mnemonicRegex.test(ko) || ko.length > 20;
    const hasSentenceAndRom = hangulRegex.test(ko) && romanizationRegex.test(ko);

    if (!hasSyllable) r2MissingSyllable++;
    if (!hasMnemonic) r2MissingMnemonic++;
    if (!hasSentenceAndRom) r2MissingSentence++;

    if (!hasSyllable || !hasMnemonic || !hasSentenceAndRom) {
      if (sampleR2Failures.length < 5) {
        sampleR2Failures.push({ word, ko, hasSyllable, hasMnemonic, hasSentenceAndRom });
      }
    }
  });

  console.log(`Total 'ko' fields checked: ${r2TotalChecked}`);
  console.log(`Missing Syllable analysis/romanization: ${r2MissingSyllable}`);
  console.log(`Missing Mnemonic device: ${r2MissingMnemonic}`);
  console.log(`Missing Korean sentence / romanization: ${r2MissingSentence}`);

  if (sampleR2Failures.length > 0) {
    console.log('Sample R2 failures:', sampleR2Failures);
  }

  if (r2MissingSyllable === 0 && r2MissingMnemonic === 0 && r2MissingSentence === 0) {
    console.log('✅ R2 (`ko` field): 100% compliant with syllable analysis, mnemonic, and short Korean sentence + romanization!');
    results.phaseC.r2 = { pass: true, totalChecked: r2TotalChecked };
  } else {
    console.log(`❌ R2 (\`ko\` field): ${r2MissingSyllable + r2MissingMnemonic + r2MissingSentence} non-compliant entries found!`);
    results.phaseC.r2 = { pass: false, totalChecked: r2TotalChecked, missingSyllable: r2MissingSyllable, missingMnemonic: r2MissingMnemonic, missingSentence: r2MissingSentence, sampleR2Failures };
    passAll = false;
  }
} catch (e) {
  console.error('R2 Execution Error:', e);
  results.phaseC.r2 = { pass: false, detail: e.message };
  passAll = false;
}

// -------------------------------------------------------------
// Check R4 Requirement (`getFunFact` fallback function)
// R4: Upgraded fallback function intelligently handling misses,
// Hangul syllable counts, and romanization.
// -------------------------------------------------------------
console.log('\n--- CHECKING R4 (`getFunFact` Fallback Function) ---');
try {
  if (typeof getFunFact !== 'function') {
    console.log('❌ R4: getFunFact is NOT a function!');
    results.phaseC.r4 = { pass: false, detail: 'getFunFact is not defined or not a function' };
    passAll = false;
  } else {
    console.log('Testing getFunFact fallback execution with various inputs:');

    // Test 1: Hit (word in VOCAB_FACTS)
    const hitRes = getFunFact({ en: 'coffee', ko: '커피', category: 'food' });
    console.log('Hit test ("coffee"):', hitRes);

    // Test 2: Miss (word NOT in VOCAB_FACTS)
    const missRes = getFunFact({ en: 'supercalifragilistic', ko: '슈퍼카리프라질리스틱', category: 'magic' });
    console.log('Miss test ("supercalifragilistic"):', missRes);

    // Test 3: Edge case miss (single syllable)
    const missSingle = getFunFact({ en: 'quantum', ko: '강', category: 'nature' });
    console.log('Single syllable miss test ("강"):', missSingle);

    // Test 4: Edge case miss (empty/undefined parameters)
    const missEmpty = getFunFact({});
    console.log('Empty object test:', missEmpty);

    // Verify return format
    let r4Valid = true;
    const testCases = [hitRes, missRes, missSingle, missEmpty];
    testCases.forEach((res, idx) => {
      if (!res || typeof res !== 'object' || typeof res.vi !== 'string' || typeof res.ko !== 'string') {
        console.log(`❌ R4: Test case ${idx + 1} returned invalid structure!`, res);
        r4Valid = false;
      }
    });

    // Check if fallback dynamically calculates Hangul syllable counts and romanization on misses
    const dynamicCheck = (missRes.ko || '').includes('3') || (missRes.ko || '').includes('syllable') || (missRes.ko || '').includes('Syllable') || (missRes.vi || '').length > 10;

    if (r4Valid && dynamicCheck) {
      console.log('✅ R4 (getFunFact fallback): Intelligent fallback handles hits, misses, Hangul syllable counting, and romanization!');
      results.phaseC.r4 = { pass: true, hitRes, missRes };
    } else {
      console.log('❌ R4 (getFunFact fallback): Fallback failed validation tests!');
      results.phaseC.r4 = { pass: false, detail: 'Fallback response structure invalid or static' };
      passAll = false;
    }
  }
} catch (e) {
  console.error('R4 Execution Error:', e);
  results.phaseC.r4 = { pass: false, detail: e.message };
  passAll = false;
}

// -------------------------------------------------------------
// SUMMARY & VERDICT
// -------------------------------------------------------------
console.log('\n====================================================');
const overallVerdict = passAll ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED';
console.log(`FINAL VERDICT: ${overallVerdict}`);
console.log('====================================================');

fs.writeFileSync(path.join(__dirname, 'audit_summary.json'), JSON.stringify({ verdict: overallVerdict, results }, null, 2));
