/**
 * Independent Forensic Audit Empirical Test Suite for Milestone R4 (Graphics & UI Polish)
 * Auditor Working Directory: C:\VibeCode\Hangeul Valley\.agents\orchestrator_graphics\auditor_m4_1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log(' FORENSIC INTEGRITY AUDIT TEST SUITE — MILESTONE R4 GRAPHICS & UI');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
const violations = [];

function assert(condition, testName, failureDetail = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL/VIOLATION: ${testName} - ${failureDetail}`);
    failCount++;
    violations.push({ testName, failureDetail });
  }
}

// -----------------------------------------------------------------------------
// 1. FILE SYNCHRONIZATION & SYNTAX
// -----------------------------------------------------------------------------
console.log('[CHECK 1] File Synchronization & Syntax Checks');
const gamePath = path.resolve(__dirname, '../../../game.js');
const assetsGamePath = path.resolve(__dirname, '../../../assets/game.js');
const indexPath = path.resolve(__dirname, '../../../index.html');
const assetsIndexPath = path.resolve(__dirname, '../../../assets/index.html');

const gameContent = fs.readFileSync(gamePath, 'utf8');
const assetsGameContent = fs.readFileSync(assetsGamePath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');
const assetsIndexContent = fs.readFileSync(assetsIndexPath, 'utf8');

const gameHash = crypto.createHash('sha256').update(gameContent).digest('hex');
const assetsGameHash = crypto.createHash('sha256').update(assetsGameContent).digest('hex');
assert(gameHash === assetsGameHash, 'game.js and assets/game.js SHA256 synchronization', `Hashes differ: ${gameHash} vs ${assetsGameHash}`);

const indexHash = crypto.createHash('sha256').update(indexContent).digest('hex');
const assetsIndexHash = crypto.createHash('sha256').update(assetsIndexContent).digest('hex');
assert(indexHash === assetsIndexHash, 'index.html and assets/index.html SHA256 synchronization', `Hashes differ: ${indexHash} vs ${assetsIndexHash}`);


// -----------------------------------------------------------------------------
// 2. COLOR PALETTE VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n[CHECK 2] Stardew Valley Earthy Color Palette Verification');
assert(gameContent.includes('const STARDEW_PALETTE = {'), 'STARDEW_PALETTE object definition exists');

const requiredColors = [
  'grassBase', 'grassShadow', 'grassHighlight', 'flowerRed', 'flowerYellow', 'flowerPurple',
  'dirtDry', 'dirtWet', 'pathStone', 'pathMortar', 'woodBase', 'woodHighlight', 'woodShadow',
  'oceanDeep', 'oceanShimmer', 'oceanFoam', 'sandBase', 'sandShadow', 'overallsBase',
  'overallsDark', 'strawHat', 'hatRibbon', 'boots', 'dungeonWall', 'dungeonFloor', 'torchAmber'
];

requiredColors.forEach(colorKey => {
  assert(gameContent.includes(`${colorKey}:`), `STARDEW_PALETTE includes key: ${colorKey}`);
});

// Check usage of STARDEW_PALETTE in pixel art generation
assert(gameContent.includes('STARDEW_PALETTE.strawHat') && gameContent.includes('STARDEW_PALETTE.overallsBase'), 'STARDEW_PALETTE used in player walk cycle generation');
assert(gameContent.includes('STARDEW_PALETTE.flowerRed') && gameContent.includes('STARDEW_PALETTE.flowerYellow'), 'STARDEW_PALETTE used in wildflower baking');


// -----------------------------------------------------------------------------
// 3. PIXEL-PERFECT CRISP RENDERING VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n[CHECK 3] Pixel-Perfect Crisp Rendering Verification');
assert(indexContent.includes('image-rendering: pixelated;'), 'index.html CSS includes image-rendering: pixelated');
assert(indexContent.includes('image-rendering: crisp-edges;'), 'index.html CSS includes image-rendering: crisp-edges');
assert(indexContent.includes('-ms-interpolation-mode: nearest-neighbor;'), 'index.html CSS includes -ms-interpolation-mode: nearest-neighbor');

// Check setRoundPixels(true) across scenes in game.js
const roundPixelMatches = (gameContent.match(/this\.cameras\.main\.setRoundPixels\(true\);/g) || []).length;
assert(roundPixelMatches >= 4, `setRoundPixels(true) called in all core scenes (found ${roundPixelMatches} calls)`);

// Check FilterMode.NEAREST on textures
assert(gameContent.includes('Phaser.Textures.FilterMode.NEAREST'), 'FilterMode.NEAREST applied to baked procedural textures');


// -----------------------------------------------------------------------------
// 4. DYNAMIC Y-SORT DEPTH SORTING VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n[CHECK 4] Dynamic Y-Sort Depth Sorting Verification');
assert(gameContent.includes('const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));'), 'Player base Y calculation formula implemented');
assert(gameContent.includes('this.player.setDepth(playerBaseY);'), 'Player depth dynamically updated with playerBaseY');
assert(gameContent.includes('this.pShadow.setDepth(playerBaseY - 1);'), 'Player shadow depth maintained behind playerBaseY');
assert(gameContent.includes('if (this.shopNPC) this.shopNPC.setDepth(') && gameContent.includes('if (this.catSprite) this.catSprite.setDepth('), 'FarmScene static/animated NPCs depth sorted dynamically');
assert(gameContent.includes('m.setDepth(mBaseY);'), 'DungeonScene monster depth sorted dynamically by foot Y');


// -----------------------------------------------------------------------------
// 5. CAMERA FADE TRANSITIONS VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n[CHECK 5] Camera Fade Transitions Verification');
assert(gameContent.includes("this.cameras.main.once('camerafadeoutcomplete'"), 'camerafadeoutcomplete event listener registered for async scene transitions');
assert(gameContent.includes('this.cameras.main.fadeOut(300'), 'fadeOut(300) called on scene exits');
assert(gameContent.includes('this.cameras.main.fadeIn(300'), 'fadeIn(300) called on scene entry / resume');


// -----------------------------------------------------------------------------
// 6. CENTRALIZED UI GLASSMORPHISM & MODAL MANAGER VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n[CHECK 6] Centralized UI Glassmorphism & Modal Manager Verification');
assert(gameContent.includes('function setModalState(overlayId, isOpen)'), 'Centralized setModalState function defined');
assert(gameContent.includes('let activeModalStack = [];'), 'activeModalStack state variable defined');
assert(gameContent.includes('function closeTopModal()'), 'closeTopModal function implemented');
assert(gameContent.includes("e.key === 'Escape'"), 'Global Escape key listener implemented for modal teardown');

// Check modal open/close function updates to setModalState
const modalsToCheck = [
  'shop-overlay', 'fish-album-overlay', 'recipe-overlay', 'pet-overlay',
  'seasonal-overlay', 'leaderboard-overlay', 'memory-overlay', 'duel-overlay', 'trophy-overlay', 'level-select-overlay'
];
modalsToCheck.forEach(modalId => {
  assert(gameContent.includes(`setModalState('${modalId}', true)`) || gameContent.includes(`setModalState("${modalId}", true)`), `Modal '${modalId}' opens via setModalState`);
});

// Check Glassmorphism CSS in index.html
assert(indexContent.includes('backdrop-filter: var(--glass-blur);'), 'backdrop-filter: var(--glass-blur) CSS applied');
assert(indexContent.includes('--glass-blur: blur(16px);'), '--glass-blur variable defined in index.html');
assert(indexContent.includes('class="glass-modal"') || indexContent.includes("class='glass-modal'"), 'glass-modal class used on modal overlays');


// -----------------------------------------------------------------------------
// 7. PROHIBITED PATTERNS & INTEGRITY CHECKS
// -----------------------------------------------------------------------------
console.log('\n[CHECK 7] Prohibited Patterns & Forensic Integrity Audit');

// A. External Image Check
const externalImgPattern = /https?:\/\/[^\s'"\`]+\.(png|jpg|jpeg|gif|webp|svg|ico)/i;
const dataImgPattern = /data:image\//i;
assert(!externalImgPattern.test(gameContent) && !externalImgPattern.test(indexContent), 'NO external http/https image URLs found');
assert(!dataImgPattern.test(gameContent) && !dataImgPattern.test(indexContent), 'NO data:image base64 embedded images found');

// B. Check for hardcoded test bypasses or facades
const prohibitedFakes = [
  'function closeShop() { return true; }',
  'function setModalState() { return; }',
  'return "PASS"',
  'console.log("PASS ✓")' // check if test results are fake strings inside game.js logic
];
prohibitedFakes.forEach(fake => {
  assert(!gameContent.includes(fake), `No hardcoded facade '${fake}' in game.js`);
});


// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(` AUDIT TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED / VIOLATIONS`);
console.log('================================================================\n');

if (failCount > 0) {
  console.error('VERDICT: INTEGRITY VIOLATION');
  console.error('Violations detail:', JSON.stringify(violations, null, 2));
  process.exit(1);
} else {
  console.log('VERDICT: CLEAN');
  process.exit(0);
}
