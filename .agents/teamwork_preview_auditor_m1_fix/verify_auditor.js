const fs = require('fs');
const crypto = require('crypto');
const execSync = require('child_process').execSync;

console.log("=== Independent Auditor Verification for M1 Fix ===");

// 1. Check SHA256 byte match
const gameBuf = fs.readFileSync('game.js');
const assetsBuf = fs.readFileSync('assets/game.js');

const gameHash = crypto.createHash('sha256').update(gameBuf).digest('hex');
const assetsHash = crypto.createHash('sha256').update(assetsBuf).digest('hex');

console.log(`game.js SHA256:        ${gameHash}`);
console.log(`assets/game.js SHA256: ${assetsHash}`);

if (gameHash !== assetsHash) {
  console.error("FAIL: SHA256 mismatch!");
  process.exit(1);
} else {
  console.log("PASS: SHA256 100% byte match!");
}

// 2. Syntax check
try {
  execSync('node -c game.js', { stdio: 'inherit' });
  execSync('node -c assets/game.js', { stdio: 'inherit' });
  console.log("PASS: Node syntax check passed for both game.js and assets/game.js!");
} catch (e) {
  console.error("FAIL: Syntax check error!", e);
  process.exit(1);
}

// 3. Inspect WIZ_0 and WIZ_1
const code = gameBuf.toString('utf8');

// Extract W_PAL
const wpalMatch = code.match(/static W_PAL = (\{[\s\S]*?\n  \});/);
if (!wpalMatch) {
  console.error("FAIL: Could not find W_PAL");
  process.exit(1);
}
const wpalObj = eval('(' + wpalMatch[1] + ')');
const wpalKeys = Object.keys(wpalObj).filter(k => wpalObj[k] !== null && wpalObj[k] !== undefined);
console.log(`W_PAL defined non-null color keys count: ${wpalKeys.length}`);

// Extract WIZ_0
const wiz0Match = code.match(/static WIZ_0 = (\[[\s\S]*?\n  \]);/);
const wiz0Arr = eval('(' + wiz0Match[1] + ')');
console.log(`WIZ_0 rows: ${wiz0Arr.length}`);
const wiz0Uniform16 = wiz0Arr.every(row => row.length === 16);
console.log(`WIZ_0 all rows length 16: ${wiz0Uniform16}`);

// Extract WIZ_1
const wiz1Match = code.match(/static WIZ_1 = (\[[\s\S]*?\n  \]);/);
const wiz1Arr = eval('(' + wiz1Match[1] + ')');
console.log(`WIZ_1 rows: ${wiz1Arr.length}`);
const wiz1Uniform16 = wiz1Arr.every(row => row.length === 16);
console.log(`WIZ_1 all rows length 16: ${wiz1Uniform16}`);

// Check token usage across WIZ_0 and WIZ_1
const wizUsedTokens = new Set();
wiz0Arr.concat(wiz1Arr).forEach(row => {
  for (const ch of row) {
    if (ch !== '.' && ch !== ' ') {
      wizUsedTokens.add(ch);
    }
  }
});
console.log(`WIZ_0 + WIZ_1 total unique active tokens: ${wizUsedTokens.size}`);
const unusedWpal = wpalKeys.filter(k => !wizUsedTokens.has(k));
console.log(`Unused W_PAL tokens: ${JSON.stringify(unusedWpal)}`);

if (!wiz0Uniform16 || !wiz1Uniform16 || unusedWpal.length > 0) {
  console.error("FAIL: WIZ matrix or W_PAL token check failed");
  process.exit(1);
} else {
  console.log("PASS: Wizard matrices uniform 16-wide and all 32 W_PAL tokens actively used!");
}

// 4. Inspect shop_sign matrix and SHOP_PALETTE
const shopMatrixMatch = code.match(/PixelArtRenderer\.drawMatrix\(gs, (\[[\s\S]*?\n    \]), SHOP_PALETTE/);
const shopMatrixArr = eval('(' + shopMatrixMatch[1] + ')');

console.log(`shop_sign matrix rows: ${shopMatrixArr.length}`);
const shopUniform18 = shopMatrixArr.every(row => row.length === 18);
console.log(`shop_sign all rows length 18: ${shopUniform18}`);

const shopUsedTokens = new Set();
shopMatrixArr.forEach(row => {
  for (const ch of row) {
    if (ch !== '.' && ch !== ' ') {
      shopUsedTokens.add(ch);
    }
  }
});

console.log(`shop_sign active tokens: ${Array.from(shopUsedTokens).join(', ')}`);
console.log(`shop_sign token 'x' active: ${shopUsedTokens.has('x')}`);

if (!shopUniform18 || !shopUsedTokens.has('x')) {
  console.error("FAIL: shop_sign check failed");
  process.exit(1);
} else {
  console.log("PASS: shop_sign matrix uniform 18-wide and token 'x' active!");
}

console.log("=== ALL INDEPENDENT AUDITOR CHECKS PASSED: CLEAN ===");
