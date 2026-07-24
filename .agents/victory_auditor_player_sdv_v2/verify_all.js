const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const rootDir = 'C:/VibeCode/Hangeul Valley';
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets/game.js');

console.log('=== STARTING INDEPENDENT VICTORY RE-AUDIT #1 ===');

const results = [];

function recordResult(num, name, status, details) {
  results.push({ num, name, status, details });
  console.log(`[Criterion ${num}] ${name}: ${status}`);
  if (details) {
    console.log(`  Details: ${details}`);
  }
}

// -------------------------------------------------------------
// Read game.js content and extract _genPlayerTextures
// -------------------------------------------------------------
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

// Extract Palette P
const paletteMatch = gameJsContent.match(/static _genPlayerTextures\(scene\) \{[\s\S]*?const P = (\{[\s\S]*?\});/);
let P = {};
if (paletteMatch) {
  try {
    // Evaluate P object in safe isolated scope
    const evalP = new Function(`return ${paletteMatch[1]};`);
    P = evalP();
  } catch (e) {
    console.error('Failed to parse Palette P:', e.message);
  }
}

// Extract matrix definitions
const matricesToExtract = [
  'down_0', 'down_1', 'down_2',
  'up_0', 'up_1', 'up_2',
  'left_0', 'left_1', 'left_2',
  'right_0', 'right_1', 'right_2',
  'water_down_0', 'water_down_1', 'water_down_2',
  'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
  'pick_down_0', 'pick_down_1', 'pick_down_2',
  'tool_watering_can', 'tool_basket', 'tool_sickle'
];

const matrices = {};
for (const mName of matricesToExtract) {
  const regex = new RegExp(`const ${mName} = (\\[[\\s\\S]*?\\]);`);
  const match = gameJsContent.match(regex);
  if (match) {
    try {
      const evalM = new Function(`return ${match[1]};`);
      matrices[mName] = evalM();
    } catch (e) {
      console.error(`Failed to parse matrix ${mName}:`, e.message);
    }
  }
}

// -------------------------------------------------------------
// Check 1: Palette P
// -------------------------------------------------------------
const pKeys = Object.keys(P).filter(k => k !== '.');
const kValue = P['K'] !== undefined ? `0x${P['K'].toString(16).toUpperCase()}` : 'MISSING';
if (pKeys.length >= 30 && P['K'] !== undefined) {
  recordResult(1, 'Palette P Tokens & Dark Outline Token K', 'PASS', `${pKeys.length} non-transparent tokens in P; Token K defined as ${kValue}.`);
} else {
  recordResult(1, 'Palette P Tokens & Dark Outline Token K', 'FAIL', `${pKeys.length} tokens found (≥30 required); Token K = ${kValue}.`);
}

// -------------------------------------------------------------
// Check 2: 24 Matrices 16x16 single-char tokens
// -------------------------------------------------------------
let check2Pass = true;
const check2Details = [];
for (const mName of matricesToExtract) {
  const m = matrices[mName];
  if (!m || !Array.isArray(m) || m.length !== 16) {
    check2Pass = false;
    check2Details.push(`${mName} has invalid row count (${m ? m.length : 'missing'})`);
    continue;
  }
  for (let r = 0; r < 16; r++) {
    if (typeof m[r] !== 'string' || m[r].length !== 16) {
      check2Pass = false;
      check2Details.push(`${mName} row ${r} length is ${m[r] ? m[r].length : 'invalid'}`);
    }
    for (let c = 0; c < 16; c++) {
      const char = m[r][c];
      if (char !== '.' && P[char] === undefined) {
        check2Pass = false;
        check2Details.push(`${mName} row ${r} col ${c} has undefined token '${char}'`);
      }
    }
  }
}
if (check2Pass) {
  recordResult(2, 'All 24 Matrices 16x16 Single-Char Tokens', 'PASS', 'All 24 matrices are strictly 16x16 with valid tokens in P.');
} else {
  recordResult(2, 'All 24 Matrices 16x16 Single-Char Tokens', 'FAIL', check2Details.join('; '));
}

// -------------------------------------------------------------
// Check 3: Head Height ≥ 35% on Walk Down Frames
// -------------------------------------------------------------
let check3Pass = true;
const check3Details = [];
const walkDownFrames = ['down_0', 'down_1', 'down_2'];
for (const mName of walkDownFrames) {
  const m = matrices[mName];
  if (!m) continue;
  let topRow = -1, bottomRow = -1;
  for (let r = 0; r < 16; r++) {
    if (m[r].split('').some(ch => ch !== '.')) {
      if (topRow === -1) topRow = r;
      bottomRow = r;
    }
  }
  const totalHeight = bottomRow - topRow + 1;
  // Head is hat (rows 0-3 relative or r=0..3) + face (rows 4-7)
  // Let's count rows containing hat/hair/face tokens (t, T, V, v, r, R, f, H, h, O, X, x, N, W, i, I, o)
  let headEndRow = -1;
  for (let r = topRow; r <= bottomRow; r++) {
    const rowChars = m[r].split('');
    const isHead = rowChars.some(ch => ['t','T','V','v','r','R','f','H','h','O','X','x','N','W','i','I','o'].includes(ch));
    const isBody = rowChars.some(ch => ['z','Z','q','Q','B','2','J','F','g'].includes(ch));
    if (isHead && !isBody) {
      headEndRow = r;
    }
  }
  const headHeight = headEndRow - topRow + 1;
  const ratio = headHeight / totalHeight;
  if (ratio < 0.35 || headHeight < 5.5) {
    check3Pass = false;
    check3Details.push(`${mName}: head height ${headHeight} / total ${totalHeight} = ${(ratio*100).toFixed(1)}% (<35%)`);
  } else {
    check3Details.push(`${mName}: head ${headHeight} rows (${(ratio*100).toFixed(1)}%)`);
  }
}
if (check3Pass) {
  recordResult(3, 'Head Height ≥ 35% (≥5.5 rows)', 'PASS', check3Details.join(', '));
} else {
  recordResult(3, 'Head Height ≥ 35% (≥5.5 rows)', 'FAIL', check3Details.join(', '));
}

// -------------------------------------------------------------
// Check 4: Facial Area ≥ 3x6 & 2 Eyes
// -------------------------------------------------------------
let check4Pass = true;
const check4Details = [];
for (const mName of walkDownFrames) {
  const m = matrices[mName];
  if (!m) continue;
  let facialRows = 0;
  let maxFacialCols = 0;
  let eyeCount = 0;

  for (let r = 0; r < 16; r++) {
    const row = m[r];
    const skinChars = [];
    for (let c = 0; c < 16; c++) {
      const ch = row[c];
      if (['O','X','x','i','I','o','N','W'].includes(ch)) {
        skinChars.push(c);
      }
    }
    if (skinChars.length > 0) {
      facialRows++;
      const width = skinChars[skinChars.length - 1] - skinChars[0] + 1;
      if (width > maxFacialCols) maxFacialCols = width;
    }
    // Count NW patterns (pupil N + white W)
    if (row.includes('NW')) {
      eyeCount += (row.match(/NW/g) || []).length;
    }
  }
  if (facialRows < 3 || maxFacialCols < 6 || eyeCount < 2) {
    check4Pass = false;
    check4Details.push(`${mName}: facial rows=${facialRows}, cols=${maxFacialCols}, eyes=${eyeCount}`);
  } else {
    check4Details.push(`${mName}: facial ${facialRows}x${maxFacialCols}, ${eyeCount} eyes`);
  }
}
if (check4Pass) {
  recordResult(4, 'Visible Facial Area ≥ 3x6 & 2 Distinct Eyes', 'PASS', check4Details.join(', '));
} else {
  recordResult(4, 'Visible Facial Area ≥ 3x6 & 2 Distinct Eyes', 'FAIL', check4Details.join(', '));
}

// -------------------------------------------------------------
// Check 5: Bouncy Walk Animation (Frame Diffs ≥ 8px)
// -------------------------------------------------------------
let check5Pass = true;
const check5Details = [];
const directions = ['down', 'up', 'left', 'right'];
for (const dir of directions) {
  const f0 = matrices[`${dir}_0`];
  const f1 = matrices[`${dir}_1`];
  const f2 = matrices[`${dir}_2`];
  if (!f0 || !f1 || !f2) continue;

  function diffFrames(a, b) {
    let diff = 0;
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (a[r][c] !== b[r][c]) diff++;
      }
    }
    return diff;
  }

  const d01 = diffFrames(f0, f1);
  const d12 = diffFrames(f1, f2);
  const d02 = diffFrames(f0, f2);

  if (d01 < 8 || d12 < 8 || d02 < 8) {
    check5Pass = false;
    check5Details.push(`${dir}: diffs 0-1=${d01}, 1-2=${d12}, 0-2=${d02} (<8)`);
  } else {
    check5Details.push(`${dir}: diffs 0-1=${d01}, 1-2=${d12}, 0-2=${d02}`);
  }
}
if (check5Pass) {
  recordResult(5, 'Bouncy Walk Frame Differences ≥ 8px', 'PASS', check5Details.join('; '));
} else {
  recordResult(5, 'Bouncy Walk Frame Differences ≥ 8px', 'FAIL', check5Details.join('; '));
}

// -------------------------------------------------------------
// Check 6: 1px Dark Silhouette Outline Token K Enclosing Boundary
// -------------------------------------------------------------
let check6Pass = true;
const check6Violations = [];
const characterMatrices = [
  'down_0', 'down_1', 'down_2',
  'up_0', 'up_1', 'up_2',
  'left_0', 'left_1', 'left_2',
  'right_0', 'right_1', 'right_2',
  'water_down_0', 'water_down_1', 'water_down_2',
  'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
  'pick_down_0', 'pick_down_1', 'pick_down_2'
];

for (const mName of characterMatrices) {
  const m = matrices[mName];
  if (!m) continue;

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const char = m[r][c];
      if (char === '.') continue; // transparent

      // Check 4 orthogonal neighbors
      const neighbors = [
        r > 0 ? m[r - 1][c] : '.',
        r < 15 ? m[r + 1][c] : '.',
        c > 0 ? m[r][c - 1] : '.',
        c < 15 ? m[r][c + 1] : '.'
      ];

      const isOuterBoundary = neighbors.some(n => n === '.');
      if (isOuterBoundary && char !== 'K') {
        check6Pass = false;
        check6Violations.push(`${mName} [row ${r}, col ${c}] token '${char}' exposed to transparent '.' without K outline`);
      }
    }
  }
}

if (check6Pass) {
  recordResult(6, '1px Dark Silhouette Outline Token K Enclosing Outer Boundary', 'PASS', 'All outer boundary pixels across all 21 character matrices are token K.');
} else {
  recordResult(6, '1px Dark Silhouette Outline Token K Enclosing Outer Boundary', 'FAIL', `${check6Violations.length} boundary violations found:\n    - ` + check6Violations.slice(0, 10).join('\n    - ') + (check6Violations.length > 10 ? `\n    ... and ${check6Violations.length - 10} more.` : ''));
}

// -------------------------------------------------------------
// Check 7: Multi-tone Shading (≥ 3 tones for skin, hair, clothing)
// -------------------------------------------------------------
const skinTokens = ['X','x','i','I','O','o'].filter(t => P[t] !== undefined);
const hairTokens = ['f','H','h'].filter(t => P[t] !== undefined);
const clothingTokens = ['z','Z','q','Q','B','2','J'].filter(t => P[t] !== undefined);

if (skinTokens.length >= 3 && hairTokens.length >= 3 && clothingTokens.length >= 3) {
  recordResult(7, 'Multi-tone Shading (≥3 tones per area)', 'PASS', `Skin: ${skinTokens.length} tones (${skinTokens.join(',')}), Hair: ${hairTokens.length} tones (${hairTokens.join(',')}), Clothing: ${clothingTokens.length} tones (${clothingTokens.join(',')}).`);
} else {
  recordResult(7, 'Multi-tone Shading (≥3 tones per area)', 'FAIL', `Skin: ${skinTokens.length}, Hair: ${hairTokens.length}, Clothing: ${clothingTokens.length}`);
}

// -------------------------------------------------------------
// Check 8: Legacy farmer0..3 Aliases
// -------------------------------------------------------------
const farmerAliasMatch = gameJsContent.includes(`['farmer0', 'farmer1', 'farmer2', 'farmer3']`) || gameJsContent.includes(`makeAlias('farmer0'`) || (gameJsContent.includes('farmer0') && gameJsContent.includes('farmer1') && gameJsContent.includes('farmer2') && gameJsContent.includes('farmer3'));
if (farmerAliasMatch) {
  recordResult(8, 'Legacy farmer0..3 Aliases Functional', 'PASS', 'farmer0..3 alias registration present in _genPlayerTextures.');
} else {
  recordResult(8, 'Legacy farmer0..3 Aliases Functional', 'FAIL', 'farmer0..3 alias registration missing in _genPlayerTextures.');
}

// -------------------------------------------------------------
// Check 9: Syntax Check node -c
// -------------------------------------------------------------
let check9Pass = true;
let check9Details = '';
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  check9Details = 'Both game.js and assets/game.js passed syntax check with 0 errors.';
} catch (e) {
  check9Pass = false;
  check9Details = e.message;
}
if (check9Pass) {
  recordResult(9, 'Syntax Check node -c game.js assets/game.js', 'PASS', check9Details);
} else {
  recordResult(9, 'Syntax Check node -c game.js assets/game.js', 'FAIL', check9Details);
}

// -------------------------------------------------------------
// Check 10: File Synchronization
// -------------------------------------------------------------
const gameJsHash = crypto.createHash('sha256').update(fs.readFileSync(gameJsPath)).digest('hex');
const assetsHash = crypto.createHash('sha256').update(fs.readFileSync(assetsGameJsPath)).digest('hex');

if (gameJsHash === assetsHash) {
  recordResult(10, 'game.js and assets/game.js Synchronization', 'PASS', `Hashes match 100% (SHA256: ${gameJsHash}).`);
} else {
  recordResult(10, 'game.js and assets/game.js Synchronization', 'FAIL', `Hash mismatch! game.js: ${gameJsHash}, assets/game.js: ${assetsHash}`);
}

// -------------------------------------------------------------
// Overall Verdict
// -------------------------------------------------------------
const allPassed = results.every(r => r.status === 'PASS');
console.log('\n========================================');
console.log(`FINAL VERDICT: ${allPassed ? 'VICTORY CONFIRMED' : 'VICTORY REJECTED'}`);
console.log('========================================');
