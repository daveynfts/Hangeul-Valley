const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gameJsPath = path.resolve(__dirname, '../../game.js');
const assetsGameJsPath = path.resolve(__dirname, '../../assets/game.js');

let results = {
  totalTests: 0,
  passCount: 0,
  failCount: 0,
  details: []
};

function recordTest(description, passed, extraInfo = '') {
  results.totalTests++;
  if (passed) {
    results.passCount++;
    results.details.push(`[PASS] ${description}${extraInfo ? ' - ' + extraInfo : ''}`);
  } else {
    results.failCount++;
    results.details.push(`[FAIL] ${description}${extraInfo ? ' - ' + extraInfo : ''}`);
  }
}

console.log('====================================================');
console.log('M1 MAIN CHARACTER SPRITE MATRIX TEST HARNESS');
console.log('====================================================\n');

// 1. Syntax Check (node -c)
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  recordTest('node -c game.js', true, 'Syntax valid');
} catch (err) {
  recordTest('node -c game.js', false, err.message);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  recordTest('node -c assets/game.js', true, 'Syntax valid');
} catch (err) {
  recordTest('node -c assets/game.js', false, err.message);
}

// 2. Byte-identical check
try {
  const buf1 = fs.readFileSync(gameJsPath);
  const buf2 = fs.readFileSync(assetsGameJsPath);
  const isIdentical = buf1.equals(buf2);
  recordTest(
    'game.js and assets/game.js are byte-identical',
    isIdentical,
    `game.js size=${buf1.length}, assets/game.js size=${buf2.length}`
  );
} catch (err) {
  recordTest('game.js and assets/game.js byte parity', false, err.message);
}

// Helper to extract matrices & palette P from file content
function extractPlayerTextures(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const startMarker = 'static _genPlayerTextures(scene) {';
  const endMarker = 'static _genNpcTextures(scene) {';

  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) throw new Error(`Could not find "${startMarker}" in ${filePath}`);

  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) throw new Error(`Could not find "${endMarker}" after static _genPlayerTextures in ${filePath}`);

  const methodSource = content.substring(startIndex, endIndex);

  // Extract function body inside { ... }
  const bodyStart = methodSource.indexOf('{');
  const bodyEnd = methodSource.lastIndexOf('}');
  const bodyCode = methodSource.substring(bodyStart + 1, bodyEnd);

  const textures = [];
  let extractedP = null;

  const mockContext = {
    createTexture: (scene, key, matrix, P) => {
      if (!extractedP) extractedP = P;
      textures.push({ key, matrix, P });
    }
  };

  const mockScene = { anims: null };

  const fn = new Function('scene', bodyCode);
  fn.call(mockContext, mockScene);

  return { textures, P: extractedP };
}

// 3. Palette P Sub-Pixel Shading Tokens Check
const requiredTokens = ['1', 'o', '4', '5', '6', '8', 'J', '7', '3', '0'];

[
  { name: 'game.js', path: gameJsPath },
  { name: 'assets/game.js', path: assetsGameJsPath }
].forEach(fileObj => {
  try {
    const { textures, P } = extractPlayerTextures(fileObj.path);

    if (!P) {
      recordTest(`Palette P extraction for ${fileObj.name}`, false, 'Palette P was undefined');
      return;
    }

    recordTest(`Palette P extraction for ${fileObj.name}`, true, `Extracted ${Object.keys(P).length} tokens`);

    // Check required sub-pixel tokens
    let missingTokens = [];
    requiredTokens.forEach(tok => {
      if (!(tok in P)) missingTokens.push(tok);
    });

    recordTest(
      `Palette P sub-pixel shading tokens present in ${fileObj.name}`,
      missingTokens.length === 0,
      missingTokens.length === 0
        ? `All 10 required tokens present (${requiredTokens.join(', ')})`
        : `Missing tokens: ${missingTokens.join(', ')}`
    );

    // 4. Matrix dimension & token validity checks (24 matrices)
    // Filter to primary 24 texture definitions (ignore legacy farmer0..3 aliases for count)
    const primaryKeys = [
      'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
      'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
      'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
      'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
      'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
      'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
      'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
      'tool_watering_can', 'tool_basket', 'tool_sickle'
    ];

    const matrixMap = new Map();
    textures.forEach(t => matrixMap.set(t.key, t.matrix));

    recordTest(
      `All 24 primary player matrices present in ${fileObj.name}`,
      primaryKeys.length === 24 && primaryKeys.every(k => matrixMap.has(k)),
      `Found ${primaryKeys.filter(k => matrixMap.has(k)).length} / 24 matrices`
    );

    let allDimensionsValid = true;
    let allTokensValid = true;
    let invalidDimDetails = [];
    let invalidTokenDetails = [];

    primaryKeys.forEach(key => {
      const matrix = matrixMap.get(key);
      if (!matrix) {
        allDimensionsValid = false;
        invalidDimDetails.push(`${key} missing`);
        return;
      }

      if (matrix.length !== 16) {
        allDimensionsValid = false;
        invalidDimDetails.push(`${key} row count=${matrix.length} (expected 16)`);
      }

      matrix.forEach((row, rowIndex) => {
        if (row.length !== 16) {
          allDimensionsValid = false;
          invalidDimDetails.push(`${key} row ${rowIndex} length=${row.length} (expected 16)`);
        }

        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          const char = row[colIndex];
          if (!(char in P)) {
            allTokensValid = false;
            invalidTokenDetails.push(`${key}[${rowIndex}][${colIndex}] token '${char}' not in P`);
          }
        }
      });
    });

    recordTest(
      `24 player matrices dimension check (16x16) in ${fileObj.name}`,
      allDimensionsValid,
      allDimensionsValid ? 'All 24 matrices are 16x16' : invalidDimDetails.join('; ')
    );

    recordTest(
      `24 player matrices token validity against P in ${fileObj.name}`,
      allTokensValid,
      allTokensValid ? 'All tokens in all 24 matrices exist in P' : invalidTokenDetails.join('; ')
    );

  } catch (err) {
    recordTest(`Player texture evaluation for ${fileObj.name}`, false, err.stack || err.message);
  }
});

console.log('--- TEST RESULTS ---');
results.details.forEach(d => console.log(d));
console.log('\n====================================================');
console.log(`SUMMARY: Total=${results.totalTests}, Passed=${results.passCount}, Failed=${results.failCount}`);
console.log('====================================================');

if (results.failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
