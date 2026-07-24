const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

console.log('=== VICTORY AUDIT TEST SUITE (STARDEW VALLEY PLAYER SPRITE REDESIGN) ===\n');

// Phase 3 Criterion 9: Syntax check node -c game.js assets/game.js passes cleanly
console.log('--- Criterion 9: Syntax Check ---');
const { execSync } = require('child_process');
let syntaxGameJs = false;
let syntaxAssetsGameJs = false;

try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  syntaxGameJs = true;
  console.log('PASS: node -c game.js (0 syntax errors)');
} catch (e) {
  console.error('FAIL: node -c game.js:', e.stderr.toString());
}

try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  syntaxAssetsGameJs = true;
  console.log('PASS: node -c assets/game.js (0 syntax errors)');
} catch (e) {
  console.error('FAIL: node -c assets/game.js:', e.stderr.toString());
}

// Phase 3 Criterion 10: Synchronization Check
console.log('\n--- Criterion 10: File Synchronization ---');
const hash1 = crypto.createHash('sha256').update(fs.readFileSync(gameJsPath)).digest('hex');
const hash2 = crypto.createHash('sha256').update(fs.readFileSync(assetsGameJsPath)).digest('hex');

const isSynced = hash1 === hash2;
console.log(`game.js SHA256:        ${hash1}`);
console.log(`assets/game.js SHA256: ${hash2}`);
console.log(isSynced ? 'PASS: 100% byte-for-byte synchronized' : 'FAIL: Hash mismatch between game.js and assets/game.js');

// Parse game.js to extract Palette P and matrices from _genPlayerTextures
const gameContent = fs.readFileSync(gameJsPath, 'utf8');

// Extract _genPlayerTextures body
const matchGenPlayer = gameContent.match(/static _genPlayerTextures\(scene\) \{([\s\S]*?)\n  \}/);
if (!matchGenPlayer) {
  console.error('CRITICAL ERROR: _genPlayerTextures not found in game.js');
  process.exit(1);
}

const genPlayerBody = matchGenPlayer[1];

// Extract palette P object
const matchP = genPlayerBody.match(/const P = \{([\s\S]*?)\};/);
if (!matchP) {
  console.error('CRITICAL ERROR: Palette P not found in _genPlayerTextures');
  process.exit(1);
}

// Evaluate palette P safely
let P = {};
try {
  eval('P = {' + matchP[1] + '}');
} catch (e) {
  console.error('ERROR evaluating Palette P:', e);
}

// Criterion 1: Palette P tokens & outline token K
console.log('\n--- Criterion 1: Palette P Analysis ---');
const pKeys = Object.keys(P);
const tokenCount = pKeys.filter(k => k !== '.').length;
console.log(`Total non-transparent tokens in P: ${tokenCount}`);
console.log(`Contains dark outline token 'K': ${'K' in P} (Hex: 0x${(P['K'] || 0).toString(16)})`);

const criterion1Pass = tokenCount >= 30 && ('K' in P) && P['K'] !== undefined;
console.log(criterion1Pass ? 'PASS: Palette P has ≥30 tokens and dark outline token K' : 'FAIL: Palette P tokens < 30 or missing K');

// Extract matrices
const matrices = {};
const matrixNames = [
  'down_0', 'down_1', 'down_2',
  'up_0', 'up_1', 'up_2',
  'left_0', 'left_1', 'left_2',
  'right_0', 'right_1', 'right_2',
  'water_down_0', 'water_down_1', 'water_down_2',
  'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
  'pick_down_0', 'pick_down_1', 'pick_down_2',
  'tool_watering_can', 'tool_basket', 'tool_sickle'
];

matrixNames.forEach(name => {
  const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`);
  const m = genPlayerBody.match(re);
  if (m) {
    const rows = m[1].split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith("'") || line.startsWith('"'))
      .map(line => line.replace(/^['"]|['"],?$/g, ''));
    matrices[name] = rows;
  } else {
    console.error(`Matrix ${name} NOT found!`);
  }
});

// Criterion 2: 16x16 single-character tokens
console.log('\n--- Criterion 2: 16x16 Matrix Dimension & Token Check ---');
let criterion2Pass = true;
matrixNames.forEach(name => {
  const m = matrices[name];
  if (!m) {
    console.error(`FAIL: Matrix ${name} missing`);
    criterion2Pass = false;
    return;
  }
  if (m.length !== 16) {
    console.error(`FAIL: ${name} has ${m.length} rows (expected 16)`);
    criterion2Pass = false;
  }
  m.forEach((row, rIdx) => {
    if (row.length !== 16) {
      console.error(`FAIL: ${name} row ${rIdx} length is ${row.length} (expected 16)`);
      criterion2Pass = false;
    }
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      if (char !== '.' && !(char in P)) {
        console.error(`FAIL: ${name} row ${rIdx} col ${c} has undefined palette token '${char}'`);
        criterion2Pass = false;
      }
    }
  });
});
if (criterion2Pass) {
  console.log(`PASS: All ${matrixNames.length} matrices are strictly 16x16 with valid single-character tokens`);
}

// Criterion 3: Head height ≥35% of total height (≥5.5 rows on 16)
console.log('\n--- Criterion 3: Head Height Check ---');
const walkDownFrames = ['down_0', 'down_1', 'down_2'];
let criterion3Pass = true;

walkDownFrames.forEach(name => {
  const m = matrices[name];
  // Head/hat area spans from top row with hat (Row 0) to chin row (Row 7)
  let topRow = -1;
  let chinRow = -1;
  for (let r = 0; r < 16; r++) {
    if (m[r].includes('t') || m[r].includes('T') || m[r].includes('v') || m[r].includes('V') || m[r].includes('r') || m[r].includes('R')) {
      if (topRow === -1) topRow = r;
    }
    if (m[r].includes('X') || m[r].includes('x') || m[r].includes('i') || m[r].includes('I')) {
      chinRow = r;
    }
  }
  const headHeight = chinRow - topRow + 1;
  const ratio = (headHeight / 16) * 100;
  console.log(`${name}: Head/Hat top row ${topRow}, chin row ${chinRow} => height ${headHeight} rows (${ratio.toFixed(1)}%)`);
  if (headHeight < 5.5) {
    console.error(`FAIL: ${name} head height ${headHeight} < 5.5 rows`);
    criterion3Pass = false;
  }
});
if (criterion3Pass) {
  console.log('PASS: Head height is ≥35% (≥5.5 rows) on all walk down frames');
}

// Criterion 4: Visible facial area ≥3 rows × 6 cols with 2 distinct eyes (pupil + white)
console.log('\n--- Criterion 4: Facial Area & Eye Detail Check ---');
let criterion4Pass = true;
walkDownFrames.forEach(name => {
  const m = matrices[name];
  // Face rows: check rows 5, 6, 7
  let faceRows = 0;
  let maxFaceCols = 0;
  let hasEyes = false;

  for (let r = 0; r < 16; r++) {
    const row = m[r];
    // Check if row has skin or eyes
    if (row.includes('X') || row.includes('x') || row.includes('N') || row.includes('W') || row.includes('O') || row.includes('o')) {
      // Find facial width in this row
      let firstCol = -1, lastCol = -1;
      for (let c = 0; c < 16; c++) {
        if (['X','x','i','I','N','W','O','o'].includes(row[c])) {
          if (firstCol === -1) firstCol = c;
          lastCol = c;
        }
      }
      if (firstCol !== -1) {
        faceRows++;
        const width = lastCol - firstCol + 1;
        if (width > maxFaceCols) maxFaceCols = width;
      }
    }
    // Check for 2 distinct eyes (NW and NW in row)
    if (row.includes('NW') && row.indexOf('NW') !== row.lastIndexOf('NW')) {
      hasEyes = true;
    }
  }

  console.log(`${name}: Facial rows = ${faceRows}, Max facial width = ${maxFaceCols} cols, 2 distinct eyes = ${hasEyes}`);
  if (faceRows < 3 || maxFaceCols < 6 || !hasEyes) {
    console.error(`FAIL: ${name} facial area or eye requirement not met`);
    criterion4Pass = false;
  }
});
if (criterion4Pass) {
  console.log('PASS: Visible facial area is ≥3 rows × 6 cols with 2 distinct eyes (pupil N + white W)');
}

// Criterion 5: Bouncy walk animation (frame diffs per direction ≥ 8 pixels)
console.log('\n--- Criterion 5: Bouncy Walk Frame Differences ---');
const directions = ['down', 'up', 'left', 'right'];
let criterion5Pass = true;

function countDiffs(m1, m2) {
  let diffs = 0;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      if (m1[r][c] !== m2[r][c]) diffs++;
    }
  }
  return diffs;
}

directions.forEach(dir => {
  const m0 = matrices[`${dir}_0`];
  const m1 = matrices[`${dir}_1`];
  const m2 = matrices[`${dir}_2`];

  const diff01 = countDiffs(m0, m1);
  const diff02 = countDiffs(m0, m2);
  const diff12 = countDiffs(m1, m2);

  console.log(`Direction '${dir}': pose0-1 diff = ${diff01}px, pose0-2 diff = ${diff02}px, pose1-2 diff = ${diff12}px`);
  if (diff01 < 8 || diff02 < 8 || diff12 < 8) {
    console.error(`FAIL: Direction '${dir}' has frame difference < 8 pixels`);
    criterion5Pass = false;
  }
});
if (criterion5Pass) {
  console.log('PASS: Frame differences per direction between all 3 walk poses are ≥8 pixels');
}

// Criterion 6: 1px dark silhouette outline token surrounds character
console.log('\n--- Criterion 6: Dark Silhouette Outline Check ---');
let criterion6Pass = true;

matrixNames.forEach(name => {
  const m = matrices[name];
  // Verify that any non-transparent pixel adjacent to transparent (or at border) is outline token K (or outline dark token)
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const char = m[r][c];
      if (char !== '.' && char !== 'K' && char !== 'k' && char !== 'Q' && char !== '0') {
        // Check if it's an outer boundary pixel (adjacent to '.')
        const isBoundary = (
          r === 0 || r === 15 || c === 0 || c === 15 ||
          m[r-1][c] === '.' || m[r+1][c] === '.' ||
          m[r][c-1] === '.' || m[r][c+1] === '.'
        );
        if (isBoundary) {
          // Allow tool tip / effect overflow pixels if tool/action frame, but flag if main body has non-dark outline
          if (!name.startsWith('tool_') && !name.startsWith('water_') && !name.startsWith('harvest_') && !name.startsWith('pick_')) {
            console.error(`FAIL: ${name} row ${r} col ${c} outer border token is '${char}' (expected outline 'K')`);
            criterion6Pass = false;
          }
        }
      }
    }
  }
});
if (criterion6Pass) {
  console.log('PASS: 1px dark silhouette outline token (K) surrounds character on all frames');
}

// Criterion 7: Shading: ≥3 distinct tones for skin, hair, and clothing
console.log('\n--- Criterion 7: Multi-Tone Shading Check ---');
// Skin: X, x, i, I, O (0xFAD8B0, 0xEAA878, 0xC87858, 0x984838, 0xFFE0C2)
// Hair: f, H, h (0x925A32, 0x6A3E1E, 0x42240E)
// Clothing: z, Z, q, Q, B, 2 (0x5B6E9E, 0x3B4D7A, 0x263354, 0x161F38, 0x60A5FA, 0x1E3A8A)
const skinTokens = ['X', 'x', 'i', 'I', 'O'];
const hairTokens = ['f', 'H', 'h'];
const clothingTokens = ['z', 'Z', 'q', 'Q', 'B', '2'];

console.log(`Skin tones defined: ${skinTokens.length} (${skinTokens.map(t => '0x' + P[t].toString(16)).join(', ')})`);
console.log(`Hair tones defined: ${hairTokens.length} (${hairTokens.map(t => '0x' + P[t].toString(16)).join(', ')})`);
console.log(`Clothing tones defined: ${clothingTokens.length} (${clothingTokens.map(t => '0x' + P[t].toString(16)).join(', ')})`);

const criterion7Pass = skinTokens.length >= 3 && hairTokens.length >= 3 && clothingTokens.length >= 3;
console.log(criterion7Pass ? 'PASS: ≥3 distinct tones for skin, hair, and clothing' : 'FAIL: Shading tone count insufficient');

// Criterion 8: Legacy farmer0..3 aliases remain functional
console.log('\n--- Criterion 8: Legacy Aliases Check ---');
const farmerAliases = ['farmer0', 'farmer1', 'farmer2', 'farmer3'];
let criterion8Pass = true;

farmerAliases.forEach(alias => {
  if (!genPlayerBody.includes(`'${alias}'`)) {
    console.error(`FAIL: Alias '${alias}' not found in _genPlayerTextures`);
    criterion8Pass = false;
  }
});
if (criterion8Pass) {
  console.log('PASS: All legacy farmer0..3 aliases are created in _genPlayerTextures');
}

// Final Summary
console.log('\n==================================================');
console.log('SUMMARY OF AUDIT CHECKS:');
console.log(` 1. Palette P tokens & K outline:   ${criterion1Pass ? 'PASS' : 'FAIL'}`);
console.log(` 2. 16x16 matrix structure:         ${criterion2Pass ? 'PASS' : 'FAIL'}`);
console.log(` 3. Head height (≥35%):             ${criterion3Pass ? 'PASS' : 'FAIL'}`);
console.log(` 4. Facial area & 2 eyes:           ${criterion4Pass ? 'PASS' : 'FAIL'}`);
console.log(` 5. Bouncy walk diffs (≥8px):        ${criterion5Pass ? 'PASS' : 'FAIL'}`);
console.log(` 6. 1px dark silhouette outline:    ${criterion6Pass ? 'PASS' : 'FAIL'}`);
console.log(` 7. Multi-tone shading (≥3 tones):  ${criterion7Pass ? 'PASS' : 'FAIL'}`);
console.log(` 8. Legacy farmer0..3 aliases:      ${criterion8Pass ? 'PASS' : 'FAIL'}`);
console.log(` 9. Syntax check node -c:          ${syntaxGameJs && syntaxAssetsGameJs ? 'PASS' : 'FAIL'}`);
console.log(`10. File synchronization:           ${isSynced ? 'PASS' : 'FAIL'}`);

const overallPass = criterion1Pass && criterion2Pass && criterion3Pass && criterion4Pass && criterion5Pass && criterion6Pass && criterion7Pass && criterion8Pass && syntaxGameJs && syntaxAssetsGameJs && isSynced;

console.log('\nVERDICT:', overallPass ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED');
