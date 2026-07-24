const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log('=== Milestone 2 Empirical Verification ===');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function assertTest(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    results.push({ name, status: 'PASS', details });
    console.log(`[PASS] ${name} ${details ? '- ' + details : ''}`);
  } else {
    failedTests++;
    results.push({ name, status: 'FAIL', details });
    console.log(`[FAIL] ${name} ${details ? '- ' + details : ''}`);
  }
}

// 1. SHA256 Equality
const gameJsBuf = fs.readFileSync(gameJsPath);
const assetsJsBuf = fs.readFileSync(assetsGameJsPath);

const shaGame = crypto.createHash('sha256').update(gameJsBuf).digest('hex');
const shaAssets = crypto.createHash('sha256').update(assetsJsBuf).digest('hex');

assertTest(
  'Byte-level SHA256 Equality',
  shaGame === shaAssets,
  `game.js: ${shaGame.substring(0, 12)}... vs assets/game.js: ${shaAssets.substring(0, 12)}...`
);

// 2. Syntax check via node -c
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  assertTest('Syntax check: game.js', true, 'node -c passed with 0 exit code');
} catch (err) {
  assertTest('Syntax check: game.js', false, err.message);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  assertTest('Syntax check: assets/game.js', true, 'node -c passed with 0 exit code');
} catch (err) {
  assertTest('Syntax check: assets/game.js', false, err.message);
}

// 3. Extract Palettes and Matrices from game.js
const code = gameJsBuf.toString('utf8');

// Helper to safely extract object literal block starting after target string
function extractObjectBlock(source, startStr) {
  const idx = source.indexOf(startStr);
  if (idx === -1) return null;
  const braceIdx = source.indexOf('{', idx + startStr.length);
  if (braceIdx === -1) return null;
  let depth = 0;
  for (let i = braceIdx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.substring(braceIdx, i + 1);
      }
    }
  }
  return null;
}

// Helper to extract array block
function extractArrayBlock(source, startStr) {
  const idx = source.indexOf(startStr);
  if (idx === -1) return null;
  const bracketIdx = source.indexOf('[', idx + startStr.length);
  if (bracketIdx === -1) return null;
  let depth = 0;
  for (let i = bracketIdx; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']') {
      depth--;
      if (depth === 0) {
        return source.substring(bracketIdx, i + 1);
      }
    }
  }
  return null;
}

// Extract DECOR_PALETTE
const decorPalCode = extractObjectBlock(code, 'const DECOR_PALETTE =');
const DECOR_PALETTE = decorPalCode ? eval('(' + decorPalCode + ')') : {};

// Extract C palette
const cPalCode = extractObjectBlock(code, 'const C =');
if (!cPalCode) {
  assertTest('Extract C palette', false, 'Could not find const C = { ... } block');
} else {
  const C = eval('(' + cPalCode + ')');
  const cKeys = Object.keys(C);
  assertTest('Palette C size >= 19', cKeys.length >= 19, `Size: ${cKeys.length} (keys: ${cKeys.join(',')})`);
  assertTest('Outline token K in C is 0x0F172A', C['K'] === 0x0F172A, `Value: 0x${(C['K'] || 0).toString(16).toUpperCase()}`);

  // Extract Cat matrices
  const catMatrixMatches = [...code.matchAll(/const (cat_[a-z0-9_]+) = (\[[\s\S]*?\]);/g)];
  const catTokens = new Set();
  catMatrixMatches.forEach(m => {
    try {
      const arr = eval(m[2]);
      if (Array.isArray(arr)) {
        arr.forEach(row => {
          for (const char of row) catTokens.add(char);
        });
      }
    } catch(e) {}
  });

  const unusedC = cKeys.filter(k => !catTokens.has(k));
  assertTest(
    'C active tokens matrix usage',
    unusedC.length === 0,
    unusedC.length === 0 ? `All ${cKeys.length} tokens used in cat matrices` : `Unused tokens: ${unusedC.join(', ')}`
  );
}

// Extract BEEHIVE_PALETTE and matrix
const beehivePalCode = extractObjectBlock(code, 'const BEEHIVE_PALETTE =');
const beehiveMatCode = extractArrayBlock(code, "this.createTexture(scene, 'beehive',");

if (!beehivePalCode || !beehiveMatCode) {
  assertTest('Extract BEEHIVE_PALETTE and matrix', false, 'Could not extract BEEHIVE_PALETTE or beehive matrix');
} else {
  const BEEHIVE_PALETTE = eval('(' + beehivePalCode + ')');
  const beehiveKeys = Object.keys(BEEHIVE_PALETTE);
  assertTest('Palette BEEHIVE_PALETTE size >= 17', beehiveKeys.length >= 17, `Size: ${beehiveKeys.length} (keys: ${beehiveKeys.join(',')})`);
  assertTest('Outline token K in BEEHIVE_PALETTE is 0x0F172A', BEEHIVE_PALETTE['K'] === 0x0F172A, `Value: 0x${(BEEHIVE_PALETTE['K'] || 0).toString(16).toUpperCase()}`);

  const beehiveMat = eval(beehiveMatCode);
  const beehiveTokens = new Set();
  beehiveMat.forEach(row => {
    for (const char of row) beehiveTokens.add(char);
  });

  const unusedBeehive = beehiveKeys.filter(k => !beehiveTokens.has(k));
  assertTest(
    'BEEHIVE_PALETTE active tokens matrix usage',
    unusedBeehive.length === 0,
    unusedBeehive.length === 0 ? `All ${beehiveKeys.length} tokens used in beehive matrix` : `Unused tokens: ${unusedBeehive.join(', ')}`
  );
}

// Extract NOTICE_BOARD_PALETTE and matrix
const noticePalExtCode = extractObjectBlock(code, 'const NOTICE_BOARD_PALETTE = Object.assign({}, DECOR_PALETTE,');
const noticeMatCode = extractArrayBlock(code, 'PixelArtRenderer.drawMatrix(gb,');

if (!noticePalExtCode || !noticeMatCode) {
  assertTest('Extract NOTICE_BOARD_PALETTE and matrix', false, 'Could not extract NOTICE_BOARD_PALETTE or notice_board matrix');
} else {
  const noticeExt = eval('(' + noticePalExtCode + ')');
  const NOTICE_BOARD_PALETTE = Object.assign({}, DECOR_PALETTE, noticeExt);
  
  const noticeExtKeys = Object.keys(noticeExt);
  const noticeFullKeys = Object.keys(NOTICE_BOARD_PALETTE);
  
  assertTest('Palette NOTICE_BOARD_PALETTE size >= 18', noticeExtKeys.length >= 18, `Extension size: ${noticeExtKeys.length}, Merged size: ${noticeFullKeys.length}`);
  assertTest('Outline token K in NOTICE_BOARD_PALETTE is 0x0F172A', NOTICE_BOARD_PALETTE['K'] === 0x0F172A, `Value: 0x${(NOTICE_BOARD_PALETTE['K'] || 0).toString(16).toUpperCase()}`);

  const noticeMat = eval(noticeMatCode);
  const noticeTokens = new Set();
  noticeMat.forEach(row => {
    for (const char of row) noticeTokens.add(char);
  });

  const unusedNotice = noticeExtKeys.filter(k => !noticeTokens.has(k));
  assertTest(
    'NOTICE_BOARD_PALETTE active tokens matrix usage',
    unusedNotice.length === 0,
    unusedNotice.length === 0 ? `All ${noticeExtKeys.length} extension tokens used in notice board matrix` : `Unused tokens: ${unusedNotice.join(', ')}`
  );
}

// Extract PORTAL_PALETTE and matrix
const portalPalExtCode = extractObjectBlock(code, 'const PORTAL_PALETTE = Object.assign({}, DECOR_PALETTE,');
const portalMatCode = extractArrayBlock(code, 'PixelArtRenderer.drawMatrix(gport,');

if (!portalPalExtCode || !portalMatCode) {
  assertTest('Extract PORTAL_PALETTE and matrix', false, 'Could not extract PORTAL_PALETTE or dungeon_portal matrix');
} else {
  const portalExt = eval('(' + portalPalExtCode + ')');
  const PORTAL_PALETTE = Object.assign({}, DECOR_PALETTE, portalExt);
  
  const portalExtKeys = Object.keys(portalExt);
  const portalFullKeys = Object.keys(PORTAL_PALETTE);
  
  assertTest('Palette PORTAL_PALETTE size >= 17', portalExtKeys.length >= 17, `Extension size: ${portalExtKeys.length}, Merged size: ${portalFullKeys.length}`);
  assertTest('Outline token K in PORTAL_PALETTE is 0x0F172A', PORTAL_PALETTE['K'] === 0x0F172A, `Value: 0x${(PORTAL_PALETTE['K'] || 0).toString(16).toUpperCase()}`);

  const portalMat = eval(portalMatCode);
  const portalTokens = new Set();
  portalMat.forEach(row => {
    for (const char of row) portalTokens.add(char);
  });

  const unusedPortal = portalExtKeys.filter(k => !portalTokens.has(k));
  assertTest(
    'PORTAL_PALETTE active tokens matrix usage',
    unusedPortal.length === 0,
    unusedPortal.length === 0 ? `All ${portalExtKeys.length} extension tokens used in portal matrix` : `Unused tokens: ${unusedPortal.join(', ')}`
  );
}

console.log('\n=== SUMMARY ===');
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`VERDICT: ${failedTests === 0 ? 'PASS' : 'FAIL'}`);

fs.writeFileSync(
  path.join(__dirname, 'test_output.json'),
  JSON.stringify({ totalTests, passedTests, failedTests, verdict: failedTests === 0 ? 'PASS' : 'FAIL', results }, null, 2)
);
