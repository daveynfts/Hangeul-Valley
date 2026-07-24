const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log('=== Milestone 1 Empirical Verification Harness ===');
console.log('Target file:', gameJsPath);
console.log('Assets file:', assetsGameJsPath);

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] Assert ${totalAssertions}: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  [FAIL] Assert ${totalAssertions}: ${message}`);
  }
}

// 1. SHA256 Sync Verification
console.log('\n--- 1. SHA256 Synchronization Check ---');
const gameJsContent = fs.readFileSync(gameJsPath);
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath);

const hashGame = crypto.createHash('sha256').update(gameJsContent).digest('hex');
const hashAssets = crypto.createHash('sha256').update(assetsGameJsContent).digest('hex');

assert(gameJsContent.length > 0, `game.js is non-empty (${gameJsContent.length} bytes)`);
assert(assetsGameJsContent.length > 0, `assets/game.js is non-empty (${assetsGameJsContent.length} bytes)`);
assert(hashGame === hashAssets, `SHA256 hashes match: ${hashGame}`);

const gameJsStr = gameJsContent.toString('utf8');

// VM Context Sandbox
const sandbox = {
  console: console,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String
};
vm.createContext(sandbox);

// 2. Wizard NPC Verification (W_PAL, WIZ_0, WIZ_1)
console.log('\n--- 2. Wizard NPC (R2) Verification ---');

const wPalMatch = gameJsStr.match(/static W_PAL = (\{[\s\S]*?\n  \});/);
const wiz0Match = gameJsStr.match(/static WIZ_0 = (\[[\s\S]*?\n  \]);/);
const wiz1Match = gameJsStr.match(/static WIZ_1 = (\[[\s\S]*?\n  \]);/);

assert(wPalMatch !== null, 'Extracted W_PAL definition from game.js');
assert(wiz0Match !== null, 'Extracted WIZ_0 definition from game.js');
assert(wiz1Match !== null, 'Extracted WIZ_1 definition from game.js');

let wPal = {};
let wiz0 = [];
let wiz1 = [];

if (wPalMatch) {
  try {
    wPal = vm.runInContext(`(${wPalMatch[1]})`, sandbox);
  } catch (e) {
    console.error('Error evaluating W_PAL in VM:', e);
  }
}

if (wiz0Match) {
  try {
    wiz0 = vm.runInContext(`(${wiz0Match[1]})`, sandbox);
  } catch (e) {
    console.error('Error evaluating WIZ_0 in VM:', e);
  }
}

if (wiz1Match) {
  try {
    wiz1 = vm.runInContext(`(${wiz1Match[1]})`, sandbox);
  } catch (e) {
    console.error('Error evaluating WIZ_1 in VM:', e);
  }
}

const wPalNonNullKeys = Object.keys(wPal).filter(k => wPal[k] !== null);
console.log(`W_PAL non-null token count: ${wPalNonNullKeys.length}`);
console.log(`W_PAL tokens: [${wPalNonNullKeys.join(', ')}]`);

assert(wPalNonNullKeys.length === 32, `W_PAL color token count must be exactly 32 (found ${wPalNonNullKeys.length})`);
assert(wPal['K'] === 0x0F172A, `W_PAL['K'] outline color token is 0x0F172A (found 0x${(wPal['K']||0).toString(16).toUpperCase()})`);

assert(Array.isArray(wiz0) && wiz0.length > 0, 'WIZ_0 matrix is an array');
assert(Array.isArray(wiz1) && wiz1.length > 0, 'WIZ_1 matrix is an array');

// Validate Wizard Dimensions (16x20)
const wiz0Height = wiz0.length;
const wiz0Widths = wiz0.map(r => r.length);
const wiz0All16Wide = wiz0Widths.every(w => w === 16);

if (!wiz0All16Wide) {
  console.error('  [DIAGNOSTIC] WIZ_0 row lengths:', wiz0Widths);
}
assert(wiz0Height === 20 && wiz0All16Wide, `WIZ_0 matrix dimensions are 16x20 (height: ${wiz0Height}, widths uniform 16: ${wiz0All16Wide})`);

const wiz1Height = wiz1.length;
const wiz1Widths = wiz1.map(r => r.length);
const wiz1All16Wide = wiz1Widths.every(w => w === 16);

if (!wiz1All16Wide) {
  console.error('  [DIAGNOSTIC] WIZ_1 row length anomaly detected:');
  wiz1.forEach((row, idx) => {
    if (row.length !== 16) {
      console.error(`    Row index ${idx} ("${row}") has length ${row.length} (expected 16)`);
    }
  });
}
assert(wiz1Height === 20 && wiz1All16Wide, `WIZ_1 matrix dimensions are 16x20 (height: ${wiz1Height}, widths uniform 16: ${wiz1All16Wide})`);

// Validate 1px dark outlines in Wizard matrices (presence of 'K')
const wiz0HasK = wiz0.some(r => r.includes('K'));
const wiz1HasK = wiz1.some(r => r.includes('K'));
assert(wiz0HasK && wiz1HasK, 'Wizard matrices (WIZ_0 & WIZ_1) contain dark outline token K');

// Check tokens used in Wizard matrices vs W_PAL
const wiz0TokensUsed = new Set();
wiz0.forEach(row => { for (const c of row) if (c !== '.' && wPal[c] !== undefined) wiz0TokensUsed.add(c); });
const wiz1TokensUsed = new Set();
wiz1.forEach(row => { for (const c of row) if (c !== '.' && wPal[c] !== undefined) wiz1TokensUsed.add(c); });

console.log(`WIZ_0 distinct tokens used: ${wiz0TokensUsed.size} [${Array.from(wiz0TokensUsed).join(', ')}]`);
console.log(`WIZ_1 distinct tokens used: ${wiz1TokensUsed.size} [${Array.from(wiz1TokensUsed).join(', ')}]`);

// 3. Shop NPC Verification (SHOP_PALETTE & Matrix)
console.log('\n--- 3. Shop NPC (R1) Verification ---');

const decorPaletteMatch = gameJsStr.match(/const DECOR_PALETTE = (\{[\s\S]*?\n    \});/);
const shopPaletteMatch = gameJsStr.match(/const SHOP_PALETTE = Object\.assign\(\{\}, DECOR_PALETTE, (\{[\s\S]*?\n    \})\);/);
const shopMatrixMatch = gameJsStr.match(/PixelArtRenderer\.drawMatrix\(gs,\s*(\[[\s\S]*?\n    \]),\s*SHOP_PALETTE/);

assert(decorPaletteMatch !== null, 'Extracted DECOR_PALETTE definition from game.js');
assert(shopPaletteMatch !== null, 'Extracted SHOP_PALETTE definition from game.js');
assert(shopMatrixMatch !== null, 'Extracted shop_sign matrix from game.js');

let shopPaletteObj = {};
let shopMatrix = [];

if (decorPaletteMatch && shopPaletteMatch) {
  try {
    const decorPal = vm.runInContext(`(${decorPaletteMatch[1]})`, sandbox);
    const shopExt = vm.runInContext(`(${shopPaletteMatch[1]})`, sandbox);
    shopPaletteObj = Object.assign({}, decorPal, shopExt);
  } catch (e) {
    console.error('Error evaluating SHOP_PALETTE in VM:', e);
  }
}

if (shopMatrixMatch) {
  try {
    shopMatrix = vm.runInContext(`(${shopMatrixMatch[1]})`, sandbox);
  } catch (e) {
    console.error('Error evaluating shopMatrix in VM:', e);
  }
}

const shopPaletteNonNullKeys = Object.keys(shopPaletteObj).filter(k => shopPaletteObj[k] !== null);
assert(shopPaletteNonNullKeys.length > 0, `SHOP_PALETTE object evaluated with ${shopPaletteNonNullKeys.length} total non-null tokens`);
assert(Array.isArray(shopMatrix) && shopMatrix.length > 0, 'Shop matrix evaluated successfully');

// Count tokens used in Shop Matrix
const shopMatrixTokens = new Set();
shopMatrix.forEach(row => {
  for (const char of row) {
    if (char !== '.' && shopPaletteObj[char] !== undefined) {
      shopMatrixTokens.add(char);
    }
  }
});

console.log(`Shop matrix height: ${shopMatrix.length}`);
console.log(`Shop matrix width: ${shopMatrix[0] ? shopMatrix[0].length : 0}`);
console.log(`Shop matrix distinct tokens used: ${shopMatrixTokens.size} [${Array.from(shopMatrixTokens).join(', ')}]`);

// Shop matrix dimension assertion (18x22)
const shopHeight = shopMatrix.length;
const shopWidths = shopMatrix.map(r => r.length);
const shopAll18Wide = shopWidths.every(w => w === 18);
if (!shopAll18Wide) {
  console.error('  [DIAGNOSTIC] Shop row length anomaly detected:', shopWidths);
}
assert(shopHeight === 22 && shopAll18Wide, `Shop matrix dimensions are 18x22 (height: ${shopHeight}, widths uniform 18: ${shopAll18Wide})`);

// Shop color tokens assertions: > 6 and ≥ 14
assert(shopMatrixTokens.size > 6, `Shop NPC color token count > 6 (found ${shopMatrixTokens.size})`);
assert(shopMatrixTokens.size >= 14, `Shop NPC color token count ≥ 14 target (found ${shopMatrixTokens.size})`);

// Validate 1px dark outlines in Shop matrix
const shopHasK = shopMatrix.some(r => r.includes('K'));
assert(shopHasK, 'Shop matrix contains dark outline token K');
assert(shopPaletteObj['K'] === 0x0F172A, `SHOP_PALETTE['K'] outline color token is 0x0F172A (found 0x${(shopPaletteObj['K']||0).toString(16).toUpperCase()})`);

// 4. Node Syntax Verification (`node -c game.js` and `node -c assets/game.js`)
console.log('\n--- 4. Node Syntax Verification ---');
try {
  execSync(`node -c "${gameJsPath}"`);
  assert(true, 'node -c game.js passed with 0 syntax errors');
} catch (e) {
  assert(false, `node -c game.js failed: ${e.message}`);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`);
  assert(true, 'node -c assets/game.js passed with 0 syntax errors');
} catch (e) {
  assert(false, `node -c assets/game.js failed: ${e.message}`);
}

// 5. Summary
console.log('\n--- Test Summary ---');
console.log(`Total Assertions: ${totalAssertions}`);
console.log(`Passed Assertions: ${passedAssertions}`);
console.log(`Failed Assertions: ${failedAssertions}`);

if (failedAssertions === 0) {
  console.log('\nVERDICT: SUCCESS (All empirical checks passed)');
  process.exit(0);
} else {
  console.error('\nVERDICT: FAILURE (Some empirical checks failed)');
  process.exit(1);
}
