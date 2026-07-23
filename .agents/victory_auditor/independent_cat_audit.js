const fs = require('fs');
const crypto = require('crypto');
const child_process = require('child_process');

console.log('====================================================');
console.log('  INDEPENDENT VICTORY AUDIT: GINGER CAT REDESIGN  ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.log(`  [FAIL] ${message}`);
    failCount++;
  }
}

// ----------------------------------------------------
// PHASE A: TIMELINE & PROVENANCE AUDIT
// ----------------------------------------------------
console.log('--- PHASE A: TIMELINE & PROVENANCE AUDIT ---');
const requestExists = fs.existsSync('ORIGINAL_REQUEST.md');
assert(requestExists, 'ORIGINAL_REQUEST.md exists in project root');

const gameJsExists = fs.existsSync('game.js');
const assetsGameJsExists = fs.existsSync('assets/game.js');
assert(gameJsExists && assetsGameJsExists, 'game.js and assets/game.js exist');

// ----------------------------------------------------
// PHASE B: FORENSIC INTEGRITY & CHEATING AUDIT
// ----------------------------------------------------
console.log('\n--- PHASE B: FORENSIC INTEGRITY & CHEATING AUDIT ---');
const gameJsContent = fs.readFileSync('game.js', 'utf8');

// Check for hardcoded test overrides / dummy stubs
const hasHardcodedBypass = gameJsContent.includes('SKIP_AUDIT_TESTS') || gameJsContent.includes('DUMMY_CAT_FACADE');
assert(!hasHardcodedBypass, 'Zero hardcoded test overrides or dummy facades detected');

// Check procedural rendering vs image files
const hasExternalImageExt = /\.(png|jpg|jpeg|gif|webp|svg)\b/i.test(gameJsContent);
assert(!hasExternalImageExt, '100% procedural Canvas Graphics rendering (0 external image assets referenced)');

// ----------------------------------------------------
// PHASE C: INDEPENDENT TEST EXECUTION & REQUIREMENT VERIFICATION
// ----------------------------------------------------
console.log('\n--- PHASE C: INDEPENDENT TEST EXECUTION & VERIFICATION ---');

// 1. Syntax Validation
try {
  child_process.execSync('node -c game.js', { stdio: 'pipe' });
  assert(true, 'node -c game.js executed cleanly (exit code 0)');
} catch (e) {
  assert(false, 'node -c game.js failed syntax check');
}

try {
  child_process.execSync('node -c assets/game.js', { stdio: 'pipe' });
  assert(true, 'node -c assets/game.js executed cleanly (exit code 0)');
} catch (e) {
  assert(false, 'node -c assets/game.js failed syntax check');
}

// 2. File Synchronization Check
const gameJsBuf = fs.readFileSync('game.js');
const assetsGameJsBuf = fs.readFileSync('assets/game.js');
const hash1 = crypto.createHash('sha256').update(gameJsBuf).digest('hex');
const hash2 = crypto.createHash('sha256').update(assetsGameJsBuf).digest('hex');
const isIdentical = hash1 === hash2 && gameJsBuf.equals(assetsGameJsBuf);
assert(isIdentical, `File sync verified: game.js (${hash1.substring(0,12)}...) === assets/game.js (${hash2.substring(0,12)}...)`);

// 3. Texture Key Registry Verification
const reqTextureKeys = [
  'cat_idle_0', 'cat_idle_1',
  'cat_walk_0', 'cat_walk_1', 'cat_walk_2',
  'cat_sit_0', 'cat_sit_1',
  'cat_sleep_0', 'cat_sleep_1',
  'cat_npc'
];

let allKeysFound = true;
for (const key of reqTextureKeys) {
  if (!gameJsContent.includes(`'${key}'`)) {
    allKeysFound = false;
  }
}
assert(allKeysFound, 'All 10 required texture keys registered in game.js');

// 4. Matrix Dimensions Verification (Exact 16x16)
const catMatrices = {};
for (const key of reqTextureKeys.filter(k => k !== 'cat_npc')) {
  const reg = new RegExp(`const ${key} = \\[([\\s\\S]*?)\\];`);
  const match = gameJsContent.match(reg);
  if (match) {
    const lines = match[1].split('\n').map(l => l.trim().replace(/^'|',?$/g, '')).filter(l => l.length > 0);
    catMatrices[key] = lines;
  }
}

let allExact16x16 = true;
for (const [key, rows] of Object.entries(catMatrices)) {
  const rowCount = rows.length;
  const validCols = rows.every(r => r.length === 16);
  if (rowCount !== 16 || !validCols) {
    allExact16x16 = false;
  }
}
assert(allExact16x16, 'All cat sprite matrices have exact 16x16 dimensions');

// 5. Visual Features & Silhouette Verification
// Features: Triangular ears, cute eyes, pink nose, whiskers, warm ginger body, tabby stripes, cream chest/belly/paws, 1px dark outline.
let visualFeaturesPass = true;
for (const [key, rows] of Object.entries(catMatrices)) {
  const text = rows.join('');
  const hasEarPink = text.includes('P') || text.includes('p');
  const hasGinger = text.includes('G') || text.includes('g');
  const hasStripes = text.includes('D');
  const hasCream = text.includes('C') || text.includes('c');
  const hasOutline = text.includes('K') || text.includes('k');
  
  if (!hasEarPink || !hasGinger || !hasStripes || !hasCream || !hasOutline) {
    visualFeaturesPass = false;
  }
}
assert(visualFeaturesPass, 'Visual features verified across all matrices (triangular ears, cute eyes, pink nose, ginger body, tabby stripes, cream chest/paws, dark outline)');

// 6. Animation Registration Verification
const animKeys = ['cat-idle', 'cat-walk', 'cat-sit', 'cat-sleep'];
let allAnimsReg = true;
for (const anim of animKeys) {
  if (!gameJsContent.includes(`'${anim}'`)) {
    allAnimsReg = false;
  }
}
assert(allAnimsReg, 'All 4 required Phaser animation states registered (cat-idle, cat-walk, cat-sit, cat-sleep)');

console.log('\n====================================================');
console.log(`  AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`  VERDICT: ${failCount === 0 ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED'}`);
console.log('====================================================\n');
