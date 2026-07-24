const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../');

const filesToScan = [
  path.join(rootDir, 'game.js'),
  path.join(rootDir, 'assets', 'game.js'),
  path.join(rootDir, 'index.html'),
  path.join(rootDir, 'assets', 'index.html')
];

const forbiddenTerms = [
  'petState',
  'petSprite',
  'petShadow',
  '_updatePetCompanion',
  '_genPetTextures',
  'isPetActive',
  'getPetPassiveMultiplier',
  'addPetXP',
  'decayPetHappiness',
  'openPetOverlay',
  'adoptPet',
  'feedActivePet',
  'startPetLevelUpQuiz',
  'petsPct',
  '#pet-overlay',
  '#pet-btn',
  '#lbtab-pets'
];

const vocabTerms = [
  'civil petitioner',
  'civil petition'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function recordResult(testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    results.push({ testName, status: 'PASS', details });
    console.log(`[PASS] ${testName}`);
  } else {
    failedTests++;
    results.push({ testName, status: 'FAIL', details });
    console.error(`[FAIL] ${testName}: ${details}`);
  }
}

console.log('=== Running M2 Pet Companion System Removal Tests ===\n');

// 1. Zero occurrences of forbidden terms
for (const file of filesToScan) {
  const relativePath = path.relative(rootDir, file);
  if (!fs.existsSync(file)) {
    recordResult(`File existence check: ${relativePath}`, false, 'File does not exist');
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  for (const term of forbiddenTerms) {
    const occurrences = (content.match(new RegExp(escapeRegExp(term), 'g')) || []).length;
    const testName = `Zero occurrences of '${term}' in ${relativePath}`;
    recordResult(testName, occurrences === 0, occurrences === 0 ? '' : `Found ${occurrences} occurrence(s)`);
  }
}

// 2. Preserved VOCAB_FACTS dictionary terms
const jsFiles = [
  path.join(rootDir, 'game.js'),
  path.join(rootDir, 'assets', 'game.js')
];

for (const file of jsFiles) {
  const relativePath = path.relative(rootDir, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const term of vocabTerms) {
    const testName = `Preserved VOCAB_FACTS term '${term}' in ${relativePath}`;
    const exists = content.includes(term);
    recordResult(testName, exists, exists ? '' : `Term '${term}' missing from VOCAB_FACTS`);
  }
}

// 3. Syntax check via node -c
for (const file of jsFiles) {
  const relativePath = path.relative(rootDir, file);
  const testName = `Syntax check (node -c) for ${relativePath}`;
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    recordResult(testName, true, 'Syntax valid');
  } catch (err) {
    recordResult(testName, false, err.stderr ? err.stderr.toString() : err.message);
  }
}

// 4. Content equality check (game.js == assets/game.js and index.html == assets/index.html)
const gameJsRoot = fs.readFileSync(path.join(rootDir, 'game.js'), 'utf8');
const gameJsAssets = fs.readFileSync(path.join(rootDir, 'assets', 'game.js'), 'utf8');
recordResult(
  'File sync check: game.js equals assets/game.js',
  gameJsRoot === gameJsAssets,
  gameJsRoot === gameJsAssets ? '' : 'game.js and assets/game.js content differ'
);

const indexHtmlRoot = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const indexHtmlAssets = fs.readFileSync(path.join(rootDir, 'assets', 'index.html'), 'utf8');
recordResult(
  'File sync check: index.html equals assets/index.html',
  indexHtmlRoot === indexHtmlAssets,
  indexHtmlRoot === indexHtmlAssets ? '' : 'index.html and assets/index.html content differ'
);

console.log('\n=== Summary ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

// Write JSON summary for easy report generation
const reportData = {
  totalTests,
  passedTests,
  failedTests,
  verdict: failedTests === 0 ? 'PASS' : 'FAIL',
  results
};
fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(reportData, null, 2));

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
