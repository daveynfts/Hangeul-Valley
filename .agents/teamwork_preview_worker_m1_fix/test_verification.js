const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log('=== Worker M1 Fix Comprehensive Verification Harness ===');

let total = 0;
let passed = 0;
let failed = 0;

function check(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`[PASS] ${total}. ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${total}. ${msg}`);
  }
}

// 1. Dual-file SHA256 check
const gameBuf = fs.readFileSync(gameJsPath);
const assetsBuf = fs.readFileSync(assetsGameJsPath);
const gameHash = crypto.createHash('sha256').update(gameBuf).digest('hex');
const assetsHash = crypto.createHash('sha256').update(assetsBuf).digest('hex');

check(gameHash === assetsHash, `SHA256 match between game.js and assets/game.js (${gameHash})`);

// 2. Syntax check
try {
  execSync(`node -c "${gameJsPath}"`);
  check(true, 'node -c game.js passed with 0 syntax errors');
} catch (e) {
  check(false, `node -c game.js failed: ${e.message}`);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`);
  check(true, 'node -c assets/game.js passed with 0 syntax errors');
} catch (e) {
  check(false, `node -c assets/game.js failed: ${e.message}`);
}

// 3. Matrix & Palette analysis
const gameStr = gameBuf.toString('utf8');

const sandbox = { console, Math, Object, Array, String };
vm.createContext(sandbox);

const wPalMatch = gameStr.match(/static W_PAL = (\{[\s\S]*?\n  \});/);
const wiz0Match = gameStr.match(/static WIZ_0 = (\[[\s\S]*?\n  \]);/);
const wiz1Match = gameStr.match(/static WIZ_1 = (\[[\s\S]*?\n  \]);/);
const decorPalMatch = gameStr.match(/const DECOR_PALETTE = (\{[\s\S]*?\n    \});/);
const shopPalMatch = gameStr.match(/const SHOP_PALETTE = Object\.assign\(\{\}, DECOR_PALETTE, (\{[\s\S]*?\n    \})\);/);
const shopMatrixMatch = gameStr.match(/PixelArtRenderer\.drawMatrix\(gs,\s*(\[[\s\S]*?\n    \]),\s*SHOP_PALETTE/);

const wPal = vm.runInContext(`(${wPalMatch[1]})`, sandbox);
const wiz0 = vm.runInContext(`(${wiz0Match[1]})`, sandbox);
const wiz1 = vm.runInContext(`(${wiz1Match[1]})`, sandbox);
const decorPal = vm.runInContext(`(${decorPalMatch[1]})`, sandbox);
const shopExt = vm.runInContext(`(${shopPalMatch[1]})`, sandbox);
const shopPal = Object.assign({}, decorPal, shopExt);
const shopMatrix = vm.runInContext(`(${shopMatrixMatch[1]})`, sandbox);

// WIZ_0 & WIZ_1 dimensions
check(wiz0.length === 20, `WIZ_0 has 20 rows (found ${wiz0.length})`);
check(wiz0.every(r => r.length === 16), 'WIZ_0 all 20 rows are strictly 16 chars');

check(wiz1.length === 20, `WIZ_1 has 20 rows (found ${wiz1.length})`);
check(wiz1.every(r => r.length === 16), 'WIZ_1 all 20 rows are strictly 16 chars');

// W_PAL defined tokens (excluding '.')
const wPalTokens = Object.keys(wPal).filter(k => wPal[k] !== null);
check(wPalTokens.length === 32, `W_PAL has exactly 32 defined color tokens (found ${wPalTokens.length})`);

// Union of used tokens across WIZ_0 and WIZ_1
const usedWTokens = new Set();
[...wiz0, ...wiz1].forEach(row => {
  for (const c of row) {
    if (c !== '.' && wPal[c] !== undefined) {
      usedWTokens.add(c);
    }
  }
});
check(usedWTokens.size === 32, `All 32 W_PAL tokens are active in WIZ_0/WIZ_1 matrix arrays (found ${usedWTokens.size}/32)`);

// Unused tokens check
const unusedWTokens = wPalTokens.filter(t => !usedWTokens.has(t));
check(unusedWTokens.length === 0, `Unused W_PAL tokens count is 0 (unused: [${unusedWTokens.join(', ')}])`);

// Shop matrix dimensions
check(shopMatrix.length === 22, `shop_sign matrix has 22 rows (found ${shopMatrix.length})`);
check(shopMatrix.every(r => r.length === 18), 'shop_sign matrix all 22 rows are strictly 18 chars');

// SHOP_PALETTE tokens used
const usedShopTokens = new Set();
shopMatrix.forEach(row => {
  for (const c of row) {
    if (c !== '.' && shopPal[c] !== undefined) {
      usedShopTokens.add(c);
    }
  }
});
check(usedShopTokens.size === 18, `All 18 tokens defined/intended for shop_sign in SHOP_PALETTE are active (found ${usedShopTokens.size})`);
check(usedShopTokens.has('x'), "Token 'x' (0xF4A261) is actively rendered in shop_sign matrix");

console.log(`\nResults: ${passed}/${total} passed (${failed} failed)`);
if (failed > 0) process.exit(1);
