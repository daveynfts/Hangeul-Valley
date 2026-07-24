const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '../../game.js');
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');

// Extract Palette P
const paletteMatch = gameJsContent.match(/static _genPlayerTextures\(scene\) \{[\s\S]*?const P = (\{[\s\S]*?\});/);
if (!paletteMatch) {
  console.error("COULD NOT FIND PALETTE P!");
  process.exit(1);
}
const P = eval(`(${paletteMatch[1]})`);

// Extract all matrices in _genPlayerTextures
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

const matrices = {};
for (const mName of matrixNames) {
  const regex = new RegExp(`const ${mName} = (\\[[\\s\\S]*?\\]);`);
  const match = gameJsContent.match(regex);
  if (match) {
    matrices[mName] = eval(`(${match[1]})`);
  } else {
    console.error(`Missing matrix ${mName}`);
  }
}

console.log("=== INDEPENDENT DETAILED REVIEW ANALYSIS ===");

// 1. Boundary check for ALL matrices
console.log("\n--- 1. Boundary Check (K Outline) ---");
let totalBoundaryViolations = 0;
for (const mName of Object.keys(matrices)) {
  const m = matrices[mName];
  let violations = 0;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const char = m[r][c];
      if (char === '.') continue;

      const top = r > 0 ? m[r - 1][c] : '.';
      const bot = r < 15 ? m[r + 1][c] : '.';
      const left = c > 0 ? m[r][c - 1] : '.';
      const right = c < 15 ? m[r][c + 1] : '.';

      if ((top === '.' || bot === '.' || left === '.' || right === '.') && char !== 'K') {
        violations++;
        console.log(`  [VIOLATION] Matrix ${mName} at row ${r}, col ${c} char '${char}' touches '.'`);
      }
    }
  }
  if (violations === 0) {
    console.log(`  [PASS] ${mName}: 100% K outline boundary.`);
  } else {
    totalBoundaryViolations += violations;
  }
}
console.log(`Total boundary violations across all matrices: ${totalBoundaryViolations}`);

// 2. Head Height Ratio Check
console.log("\n--- 2. Head Height Ratio Check (down_0, down_1, down_2) ---");
const walkDownFrames = ['down_0', 'down_1', 'down_2'];
for (const mName of walkDownFrames) {
  const m = matrices[mName];
  let topRow = -1, bottomRow = -1;
  for (let r = 0; r < 16; r++) {
    if (m[r].split('').some(ch => ch !== '.')) {
      if (topRow === -1) topRow = r;
      bottomRow = r;
    }
  }
  const totalHeight = bottomRow - topRow + 1;
  // Let's analyze head tokens vs body tokens per row
  console.log(`  ${mName}: full sprite span row ${topRow}..${bottomRow} (total ${totalHeight} rows)`);
  for (let r = topRow; r <= bottomRow; r++) {
    console.log(`    Row ${r.toString().padStart(2, ' ')}: ${m[r]}`);
  }
}

// 3. Facial Area and Eyes Check
console.log("\n--- 3. Facial Area & Eyes Check (down_0, down_1, down_2) ---");
for (const mName of walkDownFrames) {
  const m = matrices[mName];
  let eyePairs = 0;
  for (let r = 0; r < 16; r++) {
    const row = m[r];
    const matches = row.match(/NW/g);
    if (matches) eyePairs += matches.length;
  }
  console.log(`  ${mName}: NW eye pairs count = ${eyePairs}`);
}

// 4. Bouncy Walk Frame Differences
console.log("\n--- 4. Bouncy Walk Frame Differences ---");
const dirs = ['down', 'up', 'left', 'right'];
for (const d of dirs) {
  const f0 = matrices[`${d}_0`];
  const f1 = matrices[`${d}_1`];
  const f2 = matrices[`${d}_2`];
  let d01 = 0, d12 = 0, d02 = 0;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      if (f0[r][c] !== f1[r][c]) d01++;
      if (f1[r][c] !== f2[r][c]) d12++;
      if (f0[r][c] !== f2[r][c]) d02++;
    }
  }
  console.log(`  Direction '${d}': 0-1 diff = ${d01}, 1-2 diff = ${d12}, 0-2 diff = ${d02}`);
}

// 5. Multi-tone Shading Check
console.log("\n--- 5. Multi-tone Shading ---");
console.log("Palette Tokens in P:");
for (const k of Object.keys(P)) {
  if (k === '.') continue;
  const hex = '0x' + P[k].toString(16).toUpperCase().padStart(6, '0');
  console.log(`  Token '${k}': ${hex}`);
}
