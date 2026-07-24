const fs = require('fs');
const crypto = require('crypto');

console.log("=== M1 FORENSIC INTEGRITY AUDIT HARNESS ===");

// 1. File Sync & Hash Verification
const pathGame = 'd:/Hangeul Valley/game.js';
const pathAssetsGame = 'd:/Hangeul Valley/assets/game.js';

const contentGame = fs.readFileSync(pathGame, 'utf8');
const contentAssetsGame = fs.readFileSync(pathAssetsGame, 'utf8');

const hashGame = crypto.createHash('sha256').update(contentGame).digest('hex');
const hashAssetsGame = crypto.createHash('sha256').update(contentAssetsGame).digest('hex');

console.log(`game.js SHA256:        ${hashGame}`);
console.log(`assets/game.js SHA256: ${hashAssetsGame}`);

const isSynced = hashGame === hashAssetsGame;
console.log(`Sync Status:           ${isSynced ? 'PASS (100% Identical)' : 'FAIL (Mismatch)'}`);

// 2. Parse _genPlayerTextures
const genMethodMatch = contentGame.match(/static _genPlayerTextures\(scene\) \{([\s\S]*?)\n  \}/);
if (!genMethodMatch) {
  console.error("FATAL: Could not locate _genPlayerTextures in game.js!");
  process.exit(1);
}

const genBody = genMethodMatch[1];

// Extract Palette P
const paletteMatch = genBody.match(/const P = \{([\s\S]*?)\n    \};/);
if (!paletteMatch) {
  console.error("FATAL: Could not locate palette P definition!");
  process.exit(1);
}

// Evaluate palette safely
let P;
try {
  eval('P = {' + paletteMatch[1] + '}');
} catch (e) {
  console.error("FATAL: Failed to parse palette P:", e);
  process.exit(1);
}

console.log(`Palette P parsed successfully. Token count: ${Object.keys(P).length}`);

// Extract all array constants in _genPlayerTextures
const arrayRegex = /const ([a-zA-Z0-9_]+) = \[([\s\S]*?)\];/g;
let match;
const matrices = {};
while ((match = arrayRegex.exec(genBody)) !== null) {
  const name = match[1];
  const arrayStr = '[' + match[2] + ']';
  try {
    matrices[name] = eval(arrayStr);
  } catch (e) {
    console.error(`Failed to eval matrix array ${name}:`, e);
  }
}

console.log(`Extracted ${Object.keys(matrices).length} matrix definitions: ${Object.keys(matrices).join(', ')}`);

// Audit matrices
let invalidTokenCount = 0;
let invalidDimCount = 0;
let placeholderCount = 0;
const matrixReport = [];

for (const [name, matrix] of Object.entries(matrices)) {
  let isDimValid = true;
  let isTokensValid = true;
  let isPlaceholder = false;

  if (!Array.isArray(matrix) || matrix.length !== 16) {
    isDimValid = false;
    invalidDimCount++;
  }

  const unmappedChars = new Set();
  const charCounts = {};

  matrix.forEach((row, ry) => {
    if (typeof row !== 'string' || row.length !== 16) {
      isDimValid = false;
    }
    for (let c of row) {
      charCounts[c] = (charCounts[c] || 0) + 1;
      if (c !== '.' && c !== ' ' && P[c] === undefined) {
        unmappedChars.add(c);
        isTokensValid = false;
      }
    }
  });

  if (!isDimValid) invalidDimCount++;
  if (!isTokensValid) invalidTokenCount++;

  // Check for dummy/placeholder patterns
  const uniqueChars = Object.keys(charCounts);
  if (uniqueChars.length <= 2 && !name.startsWith('tool_')) {
    isPlaceholder = true;
    placeholderCount++;
  }
  
  // Check for hardcoded string placeholders like 'PLACEHOLDER' or 'DUMMY' or 'TODO'
  const rowText = matrix.join('');
  if (rowText.includes('PLACEHOLDER') || rowText.includes('DUMMY') || rowText.includes('TODO')) {
    isPlaceholder = true;
    placeholderCount++;
  }

  matrixReport.push({
    name,
    rows: matrix.length,
    cols: matrix[0] ? matrix[0].length : 0,
    uniqueTokens: uniqueChars.length,
    unmappedTokens: Array.from(unmappedChars),
    isDimValid,
    isTokensValid,
    isPlaceholder
  });
}

console.log("\n--- Matrix Audit Summary ---");
console.table(matrixReport);

console.log(`\nInvalid Dimensions:   ${invalidDimCount}`);
console.log(`Invalid Tokens:       ${invalidTokenCount}`);
console.log(`Placeholders Detected: ${placeholderCount}`);

// 3. Texture creation calls audit
const createCalls = [];
const createCallRegex = /this\.createTexture\(scene,\s*'([^']+)',\s*([a-zA-Z0-9_]+),\s*P\)/g;
let cMatch;
while ((cMatch = createCallRegex.exec(genBody)) !== null) {
  createCalls.push({ textureKey: cMatch[1], matrixName: cMatch[2] });
}
console.log(`\nTexture Creation Calls Count: ${createCalls.length}`);
createCalls.forEach(c => console.log(`  - Key: ${c.textureKey.padEnd(25)} -> Matrix: ${c.matrixName}`));

// Check animation registrations
const animsMatch = genBody.includes("reg('player-walk-down'") &&
                   genBody.includes("reg('player-walk-up'") &&
                   genBody.includes("reg('player-walk-left'") &&
                   genBody.includes("reg('player-walk-right'") &&
                   genBody.includes("regOnce('player-water'") &&
                   genBody.includes("regOnce('player-harvest'") &&
                   genBody.includes("regOnce('player-pick'");

console.log(`Animation Registrations Check: ${animsMatch ? 'PASS' : 'FAIL'}`);

// Final Verdict Determination
const finalVerdict = (isSynced && invalidDimCount === 0 && invalidTokenCount === 0 && placeholderCount === 0 && animsMatch)
  ? 'CLEAN'
  : 'INTEGRITY VIOLATION';

console.log(`\n=== FINAL VERDICT: ${finalVerdict} ===`);
