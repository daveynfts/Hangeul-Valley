const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GAME_JS_PATH = path.join(__dirname, '../../game.js');
const ASSETS_GAME_JS_PATH = path.join(__dirname, '../../assets/game.js');

const report = {
  verdict: 'PASS',
  checks: {
    syntaxCheck: { status: 'UNKNOWN', details: [] },
    fileSyncCheck: { status: 'UNKNOWN', details: [] },
    paletteKeysCheck: { status: 'UNKNOWN', details: [] },
    matrixRowWidthCheck: { status: 'UNKNOWN', details: [] }
  },
  failures: []
};

console.log('====================================================');
console.log('  MILESTONE M1 VERIFICATION SUITE (challenger_p2_m1_1)');
console.log('====================================================\n');

// --- Task 1a: Syntax Validation ---
console.log('1a. Checking syntax (node -c)...');
try {
  execSync(`node -c "${GAME_JS_PATH}"`, { stdio: 'pipe' });
  execSync(`node -c "${ASSETS_GAME_JS_PATH}"`, { stdio: 'pipe' });
  report.checks.syntaxCheck.status = 'PASS';
  report.checks.syntaxCheck.details.push('node -c game.js exit code: 0');
  report.checks.syntaxCheck.details.push('node -c assets/game.js exit code: 0');
  console.log('  ✅ PASS: Both files passed syntax validation.\n');
} catch (e) {
  report.checks.syntaxCheck.status = 'FAIL';
  const errMsg = e.stderr ? e.stderr.toString() : e.message;
  report.checks.syntaxCheck.details.push(`Syntax error: ${errMsg}`);
  report.failures.push(`Syntax Error: ${errMsg}`);
  report.verdict = 'FAIL';
  console.log(`  ❌ FAIL: Syntax validation failed: ${errMsg}\n`);
}

// --- Task 1b: String Equality / File Sync ---
console.log('1b. Verifying 100% file sync between game.js and assets/game.js...');
const contentGame = fs.readFileSync(GAME_JS_PATH, 'utf8');
const contentAssets = fs.readFileSync(ASSETS_GAME_JS_PATH, 'utf8');

if (contentGame === contentAssets) {
  report.checks.fileSyncCheck.status = 'PASS';
  report.checks.fileSyncCheck.details.push(`File sizes match exactly: ${contentGame.length} bytes.`);
  console.log(`  ✅ PASS: 100% string equality (${contentGame.length} bytes).\n`);
} else {
  report.checks.fileSyncCheck.status = 'FAIL';
  let diffOffset = -1;
  const minLen = Math.min(contentGame.length, contentAssets.length);
  for (let i = 0; i < minLen; i++) {
    if (contentGame[i] !== contentAssets[i]) {
      diffOffset = i;
      break;
    }
  }
  const msg = `game.js (len ${contentGame.length}) and assets/game.js (len ${contentAssets.length}) differ at index ${diffOffset}`;
  report.checks.fileSyncCheck.details.push(msg);
  report.failures.push(`File Mismatch: ${msg}`);
  report.verdict = 'FAIL';
  console.log(`  ❌ FAIL: ${msg}\n`);
}

// Helper to extract function AST/block body safely from declaration
function getFunctionDeclarationBlock(source, funcPattern) {
  const regex = new RegExp(`(?:static\\s+)?(?:function\\s+)?${funcPattern}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  const match = regex.exec(source);
  if (!match) return null;
  const idx = match.index;
  const startBrace = source.indexOf('{', idx);
  if (startBrace === -1) return null;
  let depth = 1;
  let end = startBrace + 1;
  while (end < source.length && depth > 0) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
    end++;
  }
  const startLine = source.substring(0, idx).split('\n').length;
  return { name: funcPattern, body: source.substring(idx, end), startLine };
}

// --- Task 1c: Palette Token Verification ---
console.log('1c. Verifying single-character palette tokens in generateTilemapTextures() and _genFishingTextures()...');
let paletteOk = true;

const fnTilemap = getFunctionDeclarationBlock(contentGame, 'generateTilemapTextures');
const fnFishing = getFunctionDeclarationBlock(contentGame, '_genFishingTextures');

function auditPaletteObjects(fnObj) {
  if (!fnObj) return;
  const objRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(\{[\s\S]*?\n\s*\});/g;
  let match;
  while ((match = objRegex.exec(fnObj.body)) !== null) {
    const varName = match[1];
    const objStr = match[2];
    try {
      const obj = new Function('return ' + objStr)();
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        const keys = Object.keys(obj);
        keys.forEach(k => {
          if (k.length !== 1) {
            paletteOk = false;
            const err = `Invalid palette key '${k}' (len=${k.length}) in palette '${varName}' of ${fnObj.name}`;
            report.checks.paletteKeysCheck.details.push(err);
            report.failures.push(`Invalid Token: ${err}`);
          }
        });
      }
    } catch (e) {}
  }
}

auditPaletteObjects(fnTilemap);
auditPaletteObjects(fnFishing);

if (paletteOk) {
  report.checks.paletteKeysCheck.status = 'PASS';
  report.checks.paletteKeysCheck.details.push('All palette keys in generateTilemapTextures() and _genFishingTextures() have key.length === 1');
  console.log('  ✅ PASS: Every key in palette objects is exactly 1 character.\n');
} else {
  report.checks.paletteKeysCheck.status = 'FAIL';
  report.verdict = 'FAIL';
  console.log('  ❌ FAIL: Found invalid multi-character keys in palette objects.\n');
}

// --- Task 1d: Matrix Row Width Verification ---
console.log('1d. Verifying matrix row widths in tilemap/decor/fishing functions...');
let matrixOk = true;

function isPixelArtMatrix(arr) {
  // A pixel art matrix array consists of rows of pixel art color tokens (e.g. '.', 'K', 'G', 'W', 'y', etc.)
  // String length of rows in pixel art matrix is usually <= 64, and contain single-character pixel tokens.
  // Avoid string arrays containing identifier strings with underscores or spaces like "apple_tree_ripe".
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(row => typeof row === 'string' && !row.includes('_') && !row.includes(' ') && row.length <= 64);
}

function auditMatricesInFunction(fnObj, isSquareRequired = false) {
  if (!fnObj) return;
  const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
  let match;
  let matrixIdx = 0;
  while ((match = arrayRegex.exec(fnObj.body)) !== null) {
    try {
      const arr = new Function('return ' + match[0])();
      if (isPixelArtMatrix(arr)) {
        matrixIdx++;
        const lineNo = fnObj.startLine + fnObj.body.substring(0, match.index).split('\n').length - 1;
        const height = arr.length;
        // If square is required (like 16x16 tilemap/fishing tiles), expectedWidth is height.
        // Otherwise, expectedWidth is the uniform row width of the pixel art matrix.
        const expectedWidth = isSquareRequired ? height : arr[0].length;

        arr.forEach((row, rIdx) => {
          if (row.length !== expectedWidth) {
            matrixOk = false;
            const absoluteLine = lineNo + rIdx;
            const err = `Row length mismatch in ${fnObj.name} matrix #${matrixIdx} at line ${absoluteLine} (row ${rIdx + 1}): actual length=${row.length}, expected=${expectedWidth} chars. Content: "${row}"`;
            report.checks.matrixRowWidthCheck.details.push(err);
            report.failures.push(`Row Width Error: ${err}`);
            console.log(`  ❌ FAIL: ${err}`);
          }
        });
      }
    } catch (e) {}
  }
}

const fnDecor = getFunctionDeclarationBlock(contentGame, '_bakeTextures');

auditMatricesInFunction(fnTilemap, true);
auditMatricesInFunction(fnFishing, true);
auditMatricesInFunction(fnDecor, false);

if (matrixOk) {
  report.checks.matrixRowWidthCheck.status = 'PASS';
  report.checks.matrixRowWidthCheck.details.push('All matrix rows in tilemap/decor/fishing functions match expected matrix dimensions.');
  console.log('  ✅ PASS: All matrix row widths valid.\n');
} else {
  report.checks.matrixRowWidthCheck.status = 'FAIL';
  report.verdict = 'FAIL';
  console.log('  ❌ FAIL: Matrix row width mismatch detected.\n');
}

console.log('====================================================');
console.log(`  OVERALL VERDICT: ${report.verdict}`);
console.log('====================================================');

fs.writeFileSync(path.join(__dirname, 'verification_results.json'), JSON.stringify(report, null, 2), 'utf8');

process.exit(report.verdict === 'PASS' ? 0 : 1);
