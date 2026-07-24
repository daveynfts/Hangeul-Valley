const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = 'C:\\VibeCode\\Hangeul Valley';

console.log('====================================================');
console.log('       INDEPENDENT 3-PHASE VICTORY AUDIT            ');
console.log('====================================================\n');

// Phase A — Timeline & Provenance Audit
console.log('--- PHASE A: TIMELINE & PROVENANCE AUDIT ---');
const phaseA = {
  result: 'PASS',
  anomalies: [],
  details: {}
};

try {
  const gameStat = fs.statSync(path.join(ROOT_DIR, 'game.js'));
  const assetsGameStat = fs.statSync(path.join(ROOT_DIR, 'assets/game.js'));
  const levelsStat = fs.statSync(path.join(ROOT_DIR, 'levels.json'));

  phaseA.details = {
    gameMtime: gameStat.mtime.toISOString(),
    assetsGameMtime: assetsGameStat.mtime.toISOString(),
    levelsMtime: levelsStat.mtime.toISOString()
  };

  console.log(`game.js modified: ${phaseA.details.gameMtime}`);
  console.log(`assets/game.js modified: ${phaseA.details.assetsGameMtime}`);
  console.log(`levels.json modified: ${phaseA.details.levelsMtime}`);
} catch (e) {
  phaseA.result = 'FAIL';
  phaseA.anomalies.push(`Stat error: ${e.message}`);
}

// Phase B — Integrity & Forensic Checks
console.log('\n--- PHASE B: INTEGRITY & FORENSIC CHECKS ---');
const phaseB = {
  result: 'PENDING',
  checks: {}
};

// B1: Synchronization check
try {
  const g1 = fs.readFileSync(path.join(ROOT_DIR, 'game.js'));
  const g2 = fs.readFileSync(path.join(ROOT_DIR, 'assets/game.js'));
  const isSync = g1.equals(g2);
  phaseB.checks.synchronization = { pass: isSync, detail: isSync ? '100% binary identical' : 'Files differ' };
  console.log(`Synchronization Check (game.js vs assets/game.js): ${isSync ? 'PASS' : 'FAIL'}`);
} catch (e) {
  phaseB.checks.synchronization = { pass: false, detail: e.message };
}

// B2: Syntax check (`node -c`)
try {
  execSync('node -c game.js', { cwd: ROOT_DIR });
  execSync('node -c assets/game.js', { cwd: ROOT_DIR });
  phaseB.checks.syntax = { pass: true, detail: 'node -c passed for both files' };
  console.log('Syntax Check (`node -c`): PASS');
} catch (e) {
  phaseB.checks.syntax = { pass: false, detail: e.message };
  console.log('Syntax Check (`node -c`): FAIL');
}

// B3: Strict Constraint Check (Edits outside VOCAB_FACTS and getFunFact)
let vfStartLine = -1, vfEndLine = -1, gfStartLine = -1, gfEndLine = -1;
const gameContent = fs.readFileSync(path.join(ROOT_DIR, 'game.js'), 'utf8');
const lines = gameContent.split(/\r?\n/);

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

console.log(`VOCAB_FACTS line range: ${vfStartLine} - ${vfEndLine}`);
console.log(`getFunFact line range: ${gfStartLine} - ${gfEndLine}`);

const diff = execSync('git diff -U0 game.js', { encoding: 'utf8', cwd: ROOT_DIR, maxBuffer: 20 * 1024 * 1024 });
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

if (outsideEdits.length === 0) {
  phaseB.checks.strictConstraint = { pass: true, detail: 'Zero edits outside VOCAB_FACTS and getFunFact' };
  console.log('Strict Constraint Check: PASS');
} else {
  phaseB.checks.strictConstraint = {
    pass: false,
    detail: `Edits detected outside allowed ranges: lines ${outsideEdits.map(e => `${e.startLine}-${e.endLine}`).join(', ')}`,
    violatingRanges: outsideEdits
  };
  console.log(`Strict Constraint Check: FAIL (Found ${outsideEdits.length} violating diff hunks: lines ${outsideEdits.map(e => `${e.startLine}-${e.endLine}`).join(', ')})`);
}

phaseB.result = Object.values(phaseB.checks).every(c => c.pass) ? 'PASS' : 'FAIL';


// Phase C — Independent Test Execution
console.log('\n--- PHASE C: INDEPENDENT TEST EXECUTION ---');

// Extract VOCAB_FACTS dynamically
const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);

const vocabStart = gameContent.indexOf('const VOCAB_FACTS =');
const vocabEnd = gameContent.indexOf('};\n', vocabStart) + 2;
const vocabCode = gameContent.slice(vocabStart, vocabEnd) + '\nglobalThis.VOCAB_FACTS = VOCAB_FACTS;\n';

const helpersStart = gameContent.indexOf('const RR_CHOSEONG');
const helpersEnd = gameContent.indexOf('function showVocabFunFact');
const funFactCode = gameContent.slice(helpersStart, helpersEnd) + '\nglobalThis.getFunFact = getFunFact;\n';

vm.runInContext(vocabCode, sandbox);
vm.runInContext(funFactCode, sandbox);

const VOCAB_FACTS = sandbox.VOCAB_FACTS;
const getFunFact = sandbox.getFunFact;

// R3 Coverage check
const levelsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'levels.json'), 'utf8'));
const targetWords = new Set();
levelsData.forEach(lvl => {
  if (lvl.words) lvl.words.forEach(w => targetWords.add(w.en ? w.en.toLowerCase().trim() : w.toLowerCase().trim()));
});

const vocabKeys = Object.keys(VOCAB_FACTS || {});
let matchedCount = 0;
targetWords.forEach(w => {
  if (VOCAB_FACTS[w]) matchedCount++;
});

const coveragePct = (matchedCount / targetWords.size) * 100;
const r3Pass = (matchedCount >= 1400) && (coveragePct >= 93.0) && phaseB.checks.strictConstraint.pass && phaseB.checks.synchronization.pass && phaseB.checks.syntax.pass;

const r3Result = {
  pass: r3Pass,
  matchedCount,
  totalTargetWords: targetWords.size,
  coveragePct: coveragePct.toFixed(2),
  totalVocabFacts: vocabKeys.length,
  strictConstraintPass: phaseB.checks.strictConstraint.pass
};
console.log(`R3 Coverage: ${matchedCount} / ${targetWords.size} (${coveragePct.toFixed(2)}%) -> ${r3Pass ? 'PASS' : 'FAIL'}`);


// R1 Compliance check
const r1Failures = [];
const originCounts = { 'Hán-Hàn': 0, '고유어': 0, '외래어': 0, '한자어': 0, 'Other': 0 };

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const vi = fact.vi || '';
  let origin = 'Other';
  if (vi.includes('Hán-Hàn') || vi.includes('Hán-Việt') || vi.includes('Hán Hàn')) origin = 'Hán-Hàn';
  else if (vi.includes('고유어')) origin = '고유어';
  else if (vi.includes('외래어')) origin = '외래어';
  else if (vi.includes('한자어')) origin = '한자어';

  originCounts[origin] = (originCounts[origin] || 0) + 1;

  const validOrigin = (origin === 'Hán-Hàn' || origin === '고유어' || origin === '외래어');
  const hasSentence = /[\uac00-\ud7af]{2,}/.test(vi);
  const hasTrans = /\([A-Za-z0-9\s\,\.\?\!\'\-]+\)/.test(vi) || /[A-Z][a-z0-9\s\,\.\?\!\'\-]{10,}/.test(vi);
  const hasContext = /Văn cảnh|văn cảnh|giao tiếp|chủ đề|sử dụng|thường dùng|bối cảnh/i.test(vi);

  if (!validOrigin || !hasSentence || !hasTrans || !hasContext) {
    r1Failures.push({ word, origin, validOrigin, hasSentence, hasTrans, hasContext, sample: vi.slice(0, 100) });
  }
});

const r1Result = {
  pass: r1Failures.length === 0,
  totalChecked: vocabKeys.length,
  originCounts,
  violationsCount: r1Failures.length,
  sampleViolations: r1Failures.slice(0, 5)
};
console.log(`R1 Compliance: ${r1Result.pass ? 'PASS' : 'FAIL'} (${r1Failures.length} violations out of ${vocabKeys.length})`);


// R2 Compliance check
const r2Failures = [];

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const ko = fact.ko || '';
  const hasSyllable = /\[.+\]/.test(ko) && !/\[\]/.test(ko);
  const hasMnemonic = /🧠|💡|mnemonic|ghi nhớ|tưởng tượng|picture/i.test(ko);
  const hasSentence = /[\uac00-\ud7af]/.test(ko);
  const hasRomanization = /\[[a-z\s\-·]+\]/i.test(ko);

  if (!hasSyllable || !hasMnemonic || !hasSentence || !hasRomanization) {
    r2Failures.push({ word, hasSyllable, hasMnemonic, hasSentence, hasRomanization, koSnippet: ko });
  }
});

const r2Result = {
  pass: r2Failures.length === 0,
  totalChecked: vocabKeys.length,
  violationsCount: r2Failures.length,
  sampleViolations: r2Failures.slice(0, 5)
};
console.log(`R2 Compliance: ${r2Result.pass ? 'PASS' : 'FAIL'} (${r2Failures.length} violations out of ${vocabKeys.length})`);


// R4 Function check
let r4Pass = true;
let r4Details = {};
try {
  const hit = getFunFact({ en: 'coffee', ko: '커피', category: 'food' });
  const miss = getFunFact({ en: 'nonexistent', ko: '안녕', category: 'greeting' });

  const hitValid = hit && typeof hit.vi === 'string' && typeof hit.ko === 'string';
  const missValid = miss && typeof miss.vi === 'string' && typeof miss.ko === 'string';

  r4Pass = hitValid && missValid;
  r4Details = { hit, miss, pass: r4Pass };
} catch (e) {
  r4Pass = false;
  r4Details = { error: e.message, pass: false };
}
console.log(`R4 getFunFact Fallback Function: ${r4Pass ? 'PASS' : 'FAIL'}`);


// Final Verdict calculation
const overallPass = phaseA.result === 'PASS' && phaseB.result === 'PASS' && r1Result.pass && r2Result.pass && r3Result.pass && r4Pass;
const finalVerdict = overallPass ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED';

console.log('\n====================================================');
console.log(`FINAL AUDIT VERDICT: ${finalVerdict}`);
console.log('====================================================');

const fullReport = {
  verdict: finalVerdict,
  phaseA,
  phaseB,
  phaseC: {
    r1: r1Result,
    r2: r2Result,
    r3: r3Result,
    r4: r4Details
  }
};

fs.writeFileSync(path.join(__dirname, 'audit_report.json'), JSON.stringify(fullReport, null, 2));
