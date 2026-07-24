const fs = require('fs');
const path = require('path');

const gameJsPath = path.resolve(__dirname, '../../game.js');
console.log('Reading game.js from:', gameJsPath);
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

// 1. Extract Palette P
const paletteMatch = gameJsContent.match(/static _genPlayerTextures\(scene\) \{[\s\S]*?const P = (\{[\s\S]*?\});/);
if (!paletteMatch) {
  console.error('ERROR: Palette P match failed!');
  process.exit(1);
}

const evalP = new Function(`return ${paletteMatch[1]};`);
const P = evalP();
const pTokens = Object.keys(P).filter(k => k !== '.');

console.log(`[Check 5.1] Palette P token count: ${pTokens.length} (Required: ≥30)`);
const passP = pTokens.length >= 30;

// Multi-tone shading checks (Skin, Hair, Clothing)
const skinTokens = ['X','x','i','I','O','o'].filter(t => P[t] !== undefined);
const hairTokens = ['f','H','h'].filter(t => P[t] !== undefined);
const clothingTokens = ['z','Z','q','Q','B','2','J'].filter(t => P[t] !== undefined);

console.log(`[Check 5.2] Multi-tone shading: Skin=${skinTokens.length} (${skinTokens.join(',')}), Hair=${hairTokens.length} (${hairTokens.join(',')}), Clothing=${clothingTokens.length} (${clothingTokens.join(',')})`);
const passShading = skinTokens.length >= 3 && hairTokens.length >= 3 && clothingTokens.length >= 3;

// 2. Extract 24 matrices
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
let missingMatrices = [];
let invalidDimMatrices = [];

for (const mName of matricesToExtract) {
  const regex = new RegExp(`const ${mName} = (\\[[\\s\\S]*?\\]);`);
  const match = gameJsContent.match(regex);
  if (match) {
    try {
      const evalM = new Function(`return ${match[1]};`);
      const m = evalM();
      matrices[mName] = m;
      if (!Array.isArray(m) || m.length !== 16 || !m.every(r => typeof r === 'string' && r.length === 16)) {
        invalidDimMatrices.push(mName);
      }
    } catch (e) {
      console.error(`Failed to parse matrix ${mName}:`, e.message);
      missingMatrices.push(mName);
    }
  } else {
    missingMatrices.push(mName);
  }
}

console.log(`[Check 1] Matrix count: ${Object.keys(matrices).length}/24 parsed.`);
const passDim = missingMatrices.length === 0 && invalidDimMatrices.length === 0;
if (!passDim) {
  console.log('  Missing matrices:', missingMatrices);
  console.log('  Invalid dimensions:', invalidDimMatrices);
}

// 3. Outer boundary 'K' enclosure rule on 21 character matrices
const characterMatrices = [
  'down_0', 'down_1', 'down_2',
  'up_0', 'up_1', 'up_2',
  'left_0', 'left_1', 'left_2',
  'right_0', 'right_1', 'right_2',
  'water_down_0', 'water_down_1', 'water_down_2',
  'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
  'pick_down_0', 'pick_down_1', 'pick_down_2'
];

let boundaryViolations = [];
for (const mName of characterMatrices) {
  const m = matrices[mName];
  if (!m) continue;

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const char = m[r][c];
      if (char === '.') continue; // transparent pixel

      const neighbors = [
        r > 0 ? m[r - 1][c] : '.',
        r < 15 ? m[r + 1][c] : '.',
        c > 0 ? m[r][c - 1] : '.',
        c < 15 ? m[r][c + 1] : '.'
      ];

      if (neighbors.includes('.') && char !== 'K') {
        boundaryViolations.push(`${mName}[r:${r},c:${c}]='${char}' neighbor is '.'`);
      }
    }
  }
}

console.log(`[Check 2] Outer boundary 'K' enclosure: ${boundaryViolations.length} violations found.`);
const passBoundary = boundaryViolations.length === 0;

// 4. Head height ≥ 35% & facial dimensions ≥ 3x6 with 2 'NW' eyes
const walkDownFrames = ['down_0', 'down_1', 'down_2'];
let headDetails = [];
let faceDetails = [];
let passHead = true;
let passFace = true;

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
  headDetails.push(`${mName}: ${headHeight}/${totalHeight} (${(ratio * 100).toFixed(1)}%)`);
  if (ratio < 0.35 || headHeight < 5.5) passHead = false;

  // Facial dimensions and eyes
  let facialRows = 0;
  let maxFacialCols = 0;
  let eyeCount = 0;

  for (let r = 0; r < 16; r++) {
    const row = m[r];
    const skinChars = [];
    for (let c = 0; c < 16; c++) {
      if (['O','X','x','i','I','o','N','W'].includes(row[c])) {
        skinChars.push(c);
      }
    }
    if (skinChars.length > 0) {
      facialRows++;
      const w = skinChars[skinChars.length - 1] - skinChars[0] + 1;
      if (w > maxFacialCols) maxFacialCols = w;
    }
    if (row.includes('NW')) {
      eyeCount += (row.match(/NW/g) || []).length;
    }
  }

  faceDetails.push(`${mName}: ${facialRows}x${maxFacialCols}, ${eyeCount} eyes`);
  if (facialRows < 3 || maxFacialCols < 6 || eyeCount < 2) passFace = false;
}

console.log(`[Check 3.1] Head height ≥35%: ${passHead ? 'PASS' : 'FAIL'} (${headDetails.join(', ')})`);
console.log(`[Check 3.2] Facial dimensions ≥3x6 & 2 'NW' eyes: ${passFace ? 'PASS' : 'FAIL'} (${faceDetails.join(', ')})`);

// 5. Walk cycle frame differences ≥ 8px
const directions = ['down', 'up', 'left', 'right'];
let diffDetails = [];
let passWalkDiff = true;

for (const dir of directions) {
  const f0 = matrices[`${dir}_0`];
  const f1 = matrices[`${dir}_1`];
  const f2 = matrices[`${dir}_2`];

  const diff = (a, b) => {
    let d = 0;
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (a[r][c] !== b[r][c]) d++;
      }
    }
    return d;
  };

  const d01 = diff(f0, f1);
  const d12 = diff(f1, f2);
  const d02 = diff(f0, f2);

  diffDetails.push(`${dir}: 0-1=${d01}, 1-2=${d12}, 0-2=${d02}`);
  if (d01 < 8 || d12 < 8 || d02 < 8) passWalkDiff = false;
}

console.log(`[Check 4] Walk frame diffs ≥ 8px: ${passWalkDiff ? 'PASS' : 'FAIL'}`);
console.log(`  Details: ${diffDetails.join('; ')}`);

// Final Summary
console.log('\n--- VERIFICATION SUMMARY ---');
const summary = {
  matrices24_16x16: passDim ? 'PASS' : 'FAIL',
  outerBoundaryK: passBoundary ? 'PASS' : 'FAIL',
  headHeight35: passHead ? 'PASS' : 'FAIL',
  facial3x6_2eyes: passFace ? 'PASS' : 'FAIL',
  walkDiffs8px: passWalkDiff ? 'PASS' : 'FAIL',
  palette30Tokens: passP ? 'PASS' : 'FAIL',
  multiToneShading3: passShading ? 'PASS' : 'FAIL'
};
console.log(JSON.stringify(summary, null, 2));

const allPass = Object.values(summary).every(v => v === 'PASS');
console.log(`OVERALL STATUS: ${allPass ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
process.exit(allPass ? 0 : 1);
