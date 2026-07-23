const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = path.resolve('C:\\VibeCode\\Hangeul Valley\\game.js');
const assetsPath = path.resolve('C:\\VibeCode\\Hangeul Valley\\assets\\game.js');

let results = {
  syntaxCheck: { pass: false, logs: [] },
  methodCountCheck: { pass: false, logs: [] },
  matrixWidthCheck: { pass: false, logs: [] },
  tokenCheck: { pass: false, logs: [] }
};

console.log("=== EMPIRICAL TEST RUNNER FOR M2 FIX ===");

// 1. SYNTAX CHECK
console.log("\n--- TEST 1: Syntax Check ---");
try {
  const rootResult = execSync(`node -c "${rootPath}"`, { encoding: 'utf8' });
  results.syntaxCheck.logs.push(`node -c game.js: PASSED (exit code 0)`);
  
  const assetsResult = execSync(`node -c "${assetsPath}"`, { encoding: 'utf8' });
  results.syntaxCheck.logs.push(`node -c assets/game.js: PASSED (exit code 0)`);
  
  results.syntaxCheck.pass = true;
} catch (err) {
  results.syntaxCheck.logs.push(`Syntax error: ${err.message}`);
  results.syntaxCheck.pass = false;
}

// 2. METHOD COUNT CHECK
console.log("\n--- TEST 2: Static Method Count Check ---");
const rootCode = fs.readFileSync(rootPath, 'utf8');
const assetsCode = fs.readFileSync(assetsPath, 'utf8');

const rootDungeonMatches = (rootCode.match(/static\s+_genDungeonTextures\s*\(/g) || []).length;
const assetsDungeonMatches = (assetsCode.match(/static\s+_genDungeonTextures\s*\(/g) || []).length;
const rootArcadeMatches = (rootCode.match(/static\s+_genArcadeTextures\s*\(/g) || []).length;
const assetsArcadeMatches = (assetsCode.match(/static\s+_genArcadeTextures\s*\(/g) || []).length;

results.methodCountCheck.logs.push(`game.js static _genDungeonTextures count: ${rootDungeonMatches}`);
results.methodCountCheck.logs.push(`assets/game.js static _genDungeonTextures count: ${assetsDungeonMatches}`);
results.methodCountCheck.logs.push(`game.js static _genArcadeTextures count: ${rootArcadeMatches}`);
results.methodCountCheck.logs.push(`assets/game.js static _genArcadeTextures count: ${assetsArcadeMatches}`);

if (rootDungeonMatches === 1 && assetsDungeonMatches === 1 && rootArcadeMatches === 1 && assetsArcadeMatches === 1) {
  results.methodCountCheck.pass = true;
} else {
  results.methodCountCheck.pass = false;
}

// Helper to capture textures from code
function captureTextures(fileContent, fileName) {
  const captured = [];
  
  // Create a mock class context
  const mockClass = {
    createTexture(scene, key, matrix, palette) {
      captured.push({ key, matrix, palette, file: fileName });
    }
  };

  // Extract body of _genArcadeTextures and _genDungeonTextures
  function extractBody(code, methodName) {
    const startIdx = code.indexOf(`static ${methodName}(`);
    if (startIdx === -1) return null;
    let braceCount = 0;
    let started = false;
    let endIdx = startIdx;
    for (let i = startIdx; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        started = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
    const fullMethod = code.substring(startIdx, endIdx + 1);
    // Extract inner body between first { and last }
    const firstBrace = fullMethod.indexOf('{');
    const lastBrace = fullMethod.lastIndexOf('}');
    return fullMethod.substring(firstBrace + 1, lastBrace);
  }

  const arcadeBody = extractBody(fileContent, '_genArcadeTextures');
  const dungeonBody = extractBody(fileContent, '_genDungeonTextures');

  const runBody = (body, methodName) => {
    if (!body) throw new Error(`Method ${methodName} not found in ${fileName}`);
    const fn = new Function('scene', body);
    fn.call(mockClass, {});
  };

  runBody(arcadeBody, '_genArcadeTextures');
  runBody(dungeonBody, '_genDungeonTextures');

  return captured;
}

// 3 & 4. MATRIX WIDTH AND TOKEN VALIDATION CHECKS
console.log("\n--- TEST 3 & 4: Matrix Row Width and Token Validation ---");
const rootCaptured = captureTextures(rootCode, 'game.js');
const assetsCaptured = captureTextures(assetsCode, 'assets/game.js');

let widthFailures = 0;
let tokenFailures = 0;

function validateTextures(textures, label) {
  console.log(`Checking ${textures.length} textures for ${label}...`);
  for (const item of textures) {
    const { key, matrix, palette, file } = item;
    
    // Check matrix array exists and is array
    if (!Array.isArray(matrix)) {
      results.matrixWidthCheck.logs.push(`[${file}] FAIL: ${key} matrix is not an array`);
      widthFailures++;
      continue;
    }

    if (matrix.length !== 16) {
      results.matrixWidthCheck.logs.push(`[${file}] WARN/FAIL: ${key} matrix height is ${matrix.length} rows (expected 16)`);
    }

    // Check each row width
    let keyWidthOk = true;
    matrix.forEach((row, rowIdx) => {
      if (typeof row !== 'string') {
        results.matrixWidthCheck.logs.push(`[${file}] FAIL: ${key} row ${rowIdx} is not a string`);
        keyWidthOk = false;
        widthFailures++;
      } else if (row.length !== 16) {
        results.matrixWidthCheck.logs.push(`[${file}] FAIL: ${key} row ${rowIdx} length is ${row.length} (expected 16): "${row}"`);
        keyWidthOk = false;
        widthFailures++;
      }
    });
    if (keyWidthOk) {
      results.matrixWidthCheck.logs.push(`[${file}] OK: ${key} all ${matrix.length} rows are exactly 16 chars`);
    }

    // Check tokens against palette
    if (!palette || typeof palette !== 'object') {
      results.tokenCheck.logs.push(`[${file}] FAIL: ${key} palette missing or invalid`);
      tokenFailures++;
      continue;
    }

    let keyTokensOk = true;
    const definedTokens = new Set(Object.keys(palette));
    const usedTokens = new Set();
    const undefinedTokensUsed = new Set();

    matrix.forEach((row, rowIdx) => {
      for (let c = 0; c < row.length; c++) {
        const token = row[c];
        usedTokens.add(token);
        if (!palette.hasOwnProperty(token)) {
          undefinedTokensUsed.add(token);
          results.tokenCheck.logs.push(`[${file}] FAIL: ${key} row ${rowIdx} col ${c} uses undefined token '${token}'`);
          keyTokensOk = false;
          tokenFailures++;
        }
      }
    });

    if (keyTokensOk) {
      results.tokenCheck.logs.push(`[${file}] OK: ${key} all tokens [${Array.from(usedTokens).sort().join(',')}] explicitly defined in palette`);
    }
  }
}

validateTextures(rootCaptured, 'game.js');
validateTextures(assetsCaptured, 'assets/game.js');

results.matrixWidthCheck.pass = (widthFailures === 0);
results.tokenCheck.pass = (tokenFailures === 0);

console.log("\n=== SUMMARY RESULTS ===");
console.log("Syntax Check:", results.syntaxCheck.pass ? "PASS" : "FAIL");
console.log("Method Count Check:", results.methodCountCheck.pass ? "PASS" : "FAIL");
console.log("Matrix Width Check:", results.matrixWidthCheck.pass ? "PASS" : "FAIL");
console.log("Token Check:", results.tokenCheck.pass ? "PASS" : "FAIL");

fs.writeFileSync(
  path.resolve(__dirname, 'test_results.json'),
  JSON.stringify(results, null, 2)
);
