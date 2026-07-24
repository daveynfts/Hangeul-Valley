const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = 'C:\\VibeCode\\Hangeul Valley';

const gameContent = fs.readFileSync(path.join(ROOT_DIR, 'game.js'), 'utf8');

console.log('====================================================');
console.log('     DETAILED AUDIT INVESTIGATION & FORENSICS      ');
console.log('====================================================\n');

// 1. EXTRACT VOCAB_FACTS and getFunFact SAFELY
let VOCAB_FACTS = null;
let getFunFact = null;

// Extract VOCAB_FACTS string
const vocabStart = gameContent.indexOf('const VOCAB_FACTS =');
const vocabEnd = gameContent.indexOf('};\n', vocabStart) + 2;
const vocabString = gameContent.slice(vocabStart, vocabEnd);

// Extract getFunFact string
const funFactStart = gameContent.indexOf('function getFunFact');
// Find end of getFunFact function
let braceCount = 0;
let started = false;
let funFactEnd = funFactStart;
for (let i = funFactStart; i < gameContent.length; i++) {
  if (gameContent[i] === '{') { braceCount++; started = true; }
  if (gameContent[i] === '}') {
    braceCount--;
    if (started && braceCount === 0) {
      funFactEnd = i + 1;
      break;
    }
  }
}
const funFactString = gameContent.slice(funFactStart, funFactEnd);

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(vocabString, sandbox);
vm.runInContext(funFactString, sandbox);

VOCAB_FACTS = sandbox.VOCAB_FACTS;
getFunFact = sandbox.getFunFact;

console.log(`Extracted VOCAB_FACTS entries: ${Object.keys(VOCAB_FACTS).length}`);
console.log(`Extracted getFunFact function: ${typeof getFunFact}\n`);

// --------------------------------------------------
// 2. CHECK R1 (`vi` field) DETAIL
// Requirement R1: origin: Hán-Hàn/고유어/외래어, Korean example sentence + English translation, usage context
// --------------------------------------------------
console.log('--- DETAILED R1 CHECK ---');
const r1Failures = [];
const originCounts = { 'Hán-Hàn': 0, '고유어': 0, '외래어': 0, '한자어': 0, 'Other/None': 0 };

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const vi = fact.vi || '';
  
  let origin = 'Other/None';
  if (vi.includes('Hán-Hàn') || vi.includes('Hán-Việt') || vi.includes('Hán Hàn')) origin = 'Hán-Hàn';
  else if (vi.includes('고유어')) origin = '고유어';
  else if (vi.includes('외래어')) origin = '외래어';
  else if (vi.includes('한자어')) origin = '한자어';

  originCounts[origin] = (originCounts[origin] || 0) + 1;

  // Check requirements:
  // Must have valid origin tag (Hán-Hàn / 고유어 / 외래어)
  const hasValidOrigin = (origin === 'Hán-Hàn' || origin === '고유어' || origin === '외래어');
  
  // Must have Korean example sentence + English translation
  const hasKoreanSentence = /[\uac00-\ud7af]{3,}/.test(vi);
  const hasEngTrans = /\([A-Za-z0-9\s\,\.\?\!\'\-]+\)/.test(vi) || /[A-Z][a-z0-9\s\,\.\?\!\'\-]{10,}/.test(vi);

  // Must have usage context (Văn cảnh / usage context)
  const hasContext = /Văn cảnh|văn cảnh|giao tiếp|chủ đề|sử dụng|thường dùng|bối cảnh/i.test(vi);

  if (!hasValidOrigin || !hasKoreanSentence || !hasEngTrans || !hasContext) {
    r1Failures.push({ word, origin, hasValidOrigin, hasKoreanSentence, hasEngTrans, hasContext, viSnippet: vi.slice(0, 120) });
  }
});

console.log('Origin Tag Breakdown:', originCounts);
console.log(`Total R1 violations: ${r1Failures.length} out of ${Object.keys(VOCAB_FACTS).length}`);
if (r1Failures.length > 0) {
  console.log('First 10 R1 Violations:');
  r1Failures.slice(0, 10).forEach(f => console.log(JSON.stringify(f, null, 2)));
}

// --------------------------------------------------
// 3. CHECK R2 (`ko` field) DETAIL
// Requirement R2: Syllable analysis + romanization, mnemonic device, short 3-5 word Korean example sentence + romanization
// --------------------------------------------------
console.log('\n--- DETAILED R2 CHECK ---');
const r2Failures = [];

Object.entries(VOCAB_FACTS).forEach(([word, fact]) => {
  const ko = fact.ko || '';

  // Check Syllable analysis + romanization: e.g. [음절 분석: ...], [X syllables: ...], [X âm tiết: ...]
  const hasSyllableAnalysis = (/음절|syllable|âm tiết|syllables/i.test(ko) || /\[.*\]/.test(ko)) && !/\[\]/.test(ko);
  
  // Check Mnemonic device
  const hasMnemonic = /🧠|💡|mnemonic|ghi nhớ|tưởng tượng|hình dung|rhymes with|picture/i.test(ko);

  // Check Korean example sentence + romanization
  const hasHangul = /[\uac00-\ud7af]/.test(ko);
  const hasRomanization = /\[[a-z\s\-·]+\]/i.test(ko);

  if (!hasSyllableAnalysis || !hasMnemonic || !hasHangul || !hasRomanization) {
    r2Failures.push({ word, hasSyllableAnalysis, hasMnemonic, hasHangul, hasRomanization, koSnippet: ko });
  }
});

console.log(`Total R2 violations: ${r2Failures.length} out of ${Object.keys(VOCAB_FACTS).length}`);
if (r2Failures.length > 0) {
  console.log('First 10 R2 Violations:');
  r2Failures.slice(0, 10).forEach(f => console.log(JSON.stringify(f, null, 2)));
}

// --------------------------------------------------
// 4. CHECK R4 (`getFunFact` Fallback Function) DETAIL
// --------------------------------------------------
console.log('\n--- DETAILED R4 CHECK ---');
try {
  const hitTest = getFunFact({ en: 'coffee', ko: '커피', category: 'food' });
  const missTest = getFunFact({ en: 'nonexistentword', ko: '안녕', category: 'greeting' });
  const nullTest = getFunFact(null);
  const undefinedTest = getFunFact(undefined);

  console.log('Hit test result:', hitTest);
  console.log('Miss test result:', missTest);
  console.log('Null test result:', nullTest);
  console.log('Undefined test result:', undefinedTest);

  // Check getFunFact function code for fallback logic:
  console.log('\ngetFunFact implementation snippet:');
  console.log(funFactString.slice(0, 400));
} catch (e) {
  console.error('R4 Error:', e);
}

// --------------------------------------------------
// 5. CHECK STRICT CONSTRAINT (Git Diff outside allowed ranges)
// --------------------------------------------------
console.log('\n--- STRICT CONSTRAINT CHECK (GIT DIFF OUTSIDE VOCAB_FACTS & getFunFact) ---');

// Calculate 1-indexed line numbers of VOCAB_FACTS and getFunFact
const gameLines = gameContent.split(/\r?\n/);
let vfStart = -1, vfEnd = -1, gfStart = -1, gfEnd = -1;

for (let i = 0; i < gameLines.length; i++) {
  if (gameLines[i].includes('const VOCAB_FACTS =')) vfStart = i + 1;
  if (vfStart > 0 && vfEnd === -1 && gameLines[i].trim() === '};') vfEnd = i + 1;
  if (gameLines[i].includes('function getFunFact(')) gfStart = i + 1;
}

if (gfStart > 0) {
  let bCount = 0, bStart = false;
  for (let i = gfStart - 1; i < gameLines.length; i++) {
    for (const ch of gameLines[i]) {
      if (ch === '{') { bCount++; bStart = true; }
      if (ch === '}') { bCount--; }
    }
    if (bStart && bCount === 0) {
      gfEnd = i + 1;
      break;
    }
  }
}

console.log(`Allowed line range 1 (VOCAB_FACTS): ${vfStart} to ${vfEnd}`);
console.log(`Allowed line range 2 (getFunFact): ${gfStart} to ${gfEnd}`);

// Run git diff on game.js
const diff = execSync('git diff -U0 game.js', { encoding: 'utf8', cwd: ROOT_DIR });
const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
let match;
const invalidEdits = [];

while ((match = hunkRegex.exec(diff)) !== null) {
  const newStart = parseInt(match[3], 10);
  const newCount = match[4] !== undefined ? parseInt(match[4], 10) : 1;
  const newEnd = newCount === 0 ? newStart : newStart + newCount - 1;

  const inVf = (newStart >= vfStart && newEnd <= vfEnd);
  const inGf = (newStart >= gfStart && newEnd <= gfEnd);

  if (!inVf && !inGf) {
    invalidEdits.push({ hunk: match[0], startLine: newStart, endLine: newEnd });
  }
}

console.log(`Edits outside allowed sections count: ${invalidEdits.length}`);
if (invalidEdits.length > 0) {
  console.log('Invalid edits details:');
  invalidEdits.forEach(e => console.log(`  Lines ${e.startLine}-${e.endLine}: ${e.hunk}`));
} else {
  console.log('✅ ZERO edits outside VOCAB_FACTS and getFunFact!');
}
