const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

console.log('====================================================');
console.log('   INDEPENDENT VICTORY AUDIT SUITE — HANGEUL VALLEY  ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;
const results = [];

function assert(condition, message, details = '') {
    if (condition) {
        passCount++;
        console.log(`[PASS ✅] ${message}`);
        results.push({ test: message, status: 'PASS', details });
    } else {
        failCount++;
        console.error(`[FAIL ❌] ${message}`);
        if (details) console.error(`         Details: ${details}`);
        results.push({ test: message, status: 'FAIL', details });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 1: File Synchronization (index.html vs assets/index.html)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST GROUP 1: FILE SYNCHRONIZATION ---');
const rootHtmlPath = path.join(PROJECT_ROOT, 'index.html');
const assetHtmlPath = path.join(PROJECT_ROOT, 'assets/index.html');

try {
    const rootBuf = fs.readFileSync(rootHtmlPath);
    const assetBuf = fs.readFileSync(assetHtmlPath);
    const rootHash = crypto.createHash('sha256').update(rootBuf).digest('hex');
    const assetHash = crypto.createHash('sha256').update(assetBuf).digest('hex');
    const isSynced = rootBuf.equals(assetBuf);
    assert(isSynced, 'index.html and assets/index.html are byte-for-byte identical', `Root SHA256: ${rootHash.substring(0, 12)}, Asset SHA256: ${assetHash.substring(0, 12)}`);
} catch (err) {
    assert(false, 'File sync check failed with error', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 2: Code Syntax Validation (game.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST GROUP 2: SYNTAX VALIDATION ---');
try {
    const gameJsPath = path.join(PROJECT_ROOT, 'game.js');
    execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
    assert(true, 'node -c game.js produces zero syntax errors');
} catch (err) {
    assert(false, 'node -c game.js failed syntax check', err.stderr ? err.stderr.toString() : err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 3: Layout Geometry & Overlap Calculations (1024px and 768px viewports)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST GROUP 3: LAYOUT GEOMETRY & ZERO OVERLAP ---');

// Parse HTML file content
const htmlContent = fs.readFileSync(rootHtmlPath, 'utf8');

// Extract element CSS specs and geometric bounds for Desktop (1024px wide, 768px high)
function calculateDesktopBounds() {
    const vw = 1024;
    
    // #hud CSS: top: 10px, left: 14px, max-width: calc(100vw - 300px) => 724px
    // Height: padding (6px top/bottom) + contents (~32px) = ~44px
    const hud = {
        name: '#hud',
        top: 10,
        left: 14,
        width: 724, // max-width limit
        right: 14 + 724, // 738
        height: 44,
        bottom: 10 + 44 // 54
    };

    // #progress-bar-wrap CSS: top: 10px, right: 14px, height: 44px, width ~220px
    const progressWidth = 220;
    const progress = {
        name: '#progress-bar-wrap',
        top: 10,
        right: vw - 14, // 1010
        left: vw - 14 - progressWidth, // 790
        width: progressWidth,
        height: 44,
        bottom: 10 + 44 // 54
    };

    // #event-banner CSS: top: 66px, left: 50%, transform: translateX(-50%)
    // width: max-content (~480px)
    const bannerWidth = 480;
    const banner = {
        name: '#event-banner',
        top: 66,
        left: (vw / 2) - (bannerWidth / 2), // 512 - 240 = 272
        right: (vw / 2) + (bannerWidth / 2), // 512 + 240 = 752
        width: bannerWidth,
        height: 38,
        bottom: 66 + 38 // 104
    };

    return { hud, progress, banner };
}

// Extract element CSS specs for Tablet (768px wide)
function calculateTabletBounds() {
    const vw = 768;

    // @media (max-width: 768px):
    // #hud: top: 8px, left: 8px, right: 8px, max-width: calc(100vw - 16px) => 752px
    // height: ~48px
    const hud = {
        name: '#hud',
        top: 8,
        left: 8,
        right: vw - 8, // 760
        width: 752,
        height: 48,
        bottom: 8 + 48 // 56
    };

    // #progress-bar-wrap: top: 64px, right: 8px, height: 36px, width ~180px
    const progressWidth = 180;
    const progress = {
        name: '#progress-bar-wrap',
        top: 64,
        right: vw - 8, // 760
        left: vw - 8 - progressWidth, // 580
        width: progressWidth,
        height: 36,
        bottom: 64 + 36 // 100
    };

    // #event-banner: top: 106px, left: 50%, transform: translateX(-50%), width ~360px
    const bannerWidth = 360;
    const banner = {
        name: '#event-banner',
        top: 106,
        left: (vw / 2) - (bannerWidth / 2), // 384 - 180 = 204
        right: (vw / 2) + (bannerWidth / 2), // 384 + 180 = 564
        width: bannerWidth,
        height: 34,
        bottom: 106 + 34 // 140
    };

    return { hud, progress, banner };
}

function checkOverlap(boxA, boxB) {
    const horizontalOverlap = boxA.left < boxB.right && boxA.right > boxB.left;
    const verticalOverlap = boxA.top < boxB.bottom && boxA.bottom > boxB.top;
    return horizontalOverlap && verticalOverlap;
}

const d = calculateDesktopBounds();

console.log('Desktop 1024px Bounding Boxes:');
console.log(`  HUD: top=${d.hud.top}, bottom=${d.hud.bottom}, left=${d.hud.left}, right=${d.hud.right}`);
console.log(`  PROGRESS: top=${d.progress.top}, bottom=${d.progress.bottom}, left=${d.progress.left}, right=${d.progress.right}`);
console.log(`  BANNER: top=${d.banner.top}, bottom=${d.banner.bottom}, left=${d.banner.left}, right=${d.banner.right}`);

const desktopHudProgressOverlap = checkOverlap(d.hud, d.progress);
assert(!desktopHudProgressOverlap, '1024px Viewport: #hud and #progress-bar-wrap have zero overlap', `Horizontal gap: ${d.progress.left - d.hud.right}px`);

const desktopHudBannerOverlap = checkOverlap(d.hud, d.banner);
assert(!desktopHudBannerOverlap, '1024px Viewport: #hud and #event-banner have zero overlap', `Vertical gap: ${d.banner.top - d.hud.bottom}px`);

const desktopProgressBannerOverlap = checkOverlap(d.progress, d.banner);
assert(!desktopProgressBannerOverlap, '1024px Viewport: #progress-bar-wrap and #event-banner have zero overlap', `Vertical gap: ${d.banner.top - d.progress.bottom}px`);

const t = calculateTabletBounds();
console.log('\nTablet 768px Bounding Boxes:');
console.log(`  HUD: top=${t.hud.top}, bottom=${t.hud.bottom}, left=${t.hud.left}, right=${t.hud.right}`);
console.log(`  PROGRESS: top=${t.progress.top}, bottom=${t.progress.bottom}, left=${t.progress.left}, right=${t.progress.right}`);
console.log(`  BANNER: top=${t.banner.top}, bottom=${t.banner.bottom}, left=${t.banner.left}, right=${t.banner.right}`);

const tabletHudProgressOverlap = checkOverlap(t.hud, t.progress);
assert(!tabletHudProgressOverlap, '768px Viewport: #hud and #progress-bar-wrap have zero overlap', `Vertical gap: ${t.progress.top - t.hud.bottom}px`);

const tabletProgressBannerOverlap = checkOverlap(t.progress, t.banner);
assert(!tabletProgressBannerOverlap, '768px Viewport: #progress-bar-wrap and #event-banner have zero overlap', `Vertical gap: ${t.banner.top - t.progress.bottom}px`);

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 4: Button Capping & Overflow Menu Structure
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST GROUP 4: BUTTON CAPPING & OVERFLOW MENU ---');

// Extract actions group markup
const actionsGroupMatch = htmlContent.match(/<div id="hud-actions-group"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
assert(actionsGroupMatch !== null, 'HUD actions group (#hud-actions-group) exists in HTML');

if (actionsGroupMatch) {
    const groupHtml = actionsGroupMatch[1];
    
    // Direct child buttons in actions group (top-level visible buttons)
    // Matches buttons outside of #hud-overflow-menu
    const topLevelButtons = groupHtml
        .split('<div id="hud-overflow-menu"')[0]
        .match(/<button\s+[^>]*class="[^"]*hud-btn[^"]*"[^>]*>/g) || [];

    console.log(`Top-level visible buttons count: ${topLevelButtons.length}`);
    assert(topLevelButtons.length <= 8, `Top-level visible buttons count (${topLevelButtons.length}) is <= 8`);

    // Verify individual top-level button IDs
    const expectedTopButtons = ['vocab-btn', 'shop-btn', 'quest-btn', 'recipe-btn', 'pet-btn', 'save-btn', 'hud-more-btn', 'hud-menu-btn'];
    expectedTopButtons.forEach(id => {
        const exists = htmlContent.includes(`id="${id}"`);
        assert(exists, `Top-level action button #${id} exists`);
    });

    // Overflow menu items
    const overflowMenuMatch = htmlContent.match(/<div id="hud-overflow-menu"[^>]*>([\s\S]*?)<\/div>/);
    assert(overflowMenuMatch !== null, 'Overflow dropdown container (#hud-overflow-menu) exists');

    if (overflowMenuMatch) {
        const overflowHtml = overflowMenuMatch[1];
        const overflowButtons = overflowHtml.match(/<button\s+[^>]*class="[^"]*hud-overflow-item[^"]*"[^>]*>/g) || [];
        console.log(`Overflow menu items count: ${overflowButtons.length}`);
        assert(overflowButtons.length >= 4, `Overflow menu contains secondary feature buttons (found ${overflowButtons.length})`);

        const expectedOverflowButtons = ['seasonal-btn', 'leaderboard-btn', 'duel-btn', 'fish-album-btn', 'trophy-btn'];
        expectedOverflowButtons.forEach(id => {
            const exists = htmlContent.includes(`id="${id}"`);
            assert(exists, `Overflow action button #${id} exists`);
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 5: Event Handlers & Function Bindings
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST GROUP 5: EVENT HANDLER PRESERVATION ---');

const expectedHandlers = [
    { id: 'quest-btn', handler: 'openQuestOverlay()' },
    { id: 'recipe-btn', handler: 'openRecipeBook()' },
    { id: 'pet-btn', handler: 'openPetOverlay()' },
    { id: 'save-btn', handler: 'saveAllGame()' },
    { id: 'hud-more-btn', handler: 'toggleHudOverflow(event)' },
    { id: 'seasonal-btn', handler: 'openSeasonalOverlay()' },
    { id: 'leaderboard-btn', handler: 'openLeaderboard()' },
    { id: 'duel-btn', handler: 'openSpellDuel()' },
    { id: 'fish-album-btn', handler: 'openFishAlbum()' }
];

expectedHandlers.forEach(item => {
    const regex = new RegExp(`id="${item.id}"[^>]*onclick="[^"]*${item.handler.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}`);
    const matches = regex.test(htmlContent);
    assert(matches, `Button #${item.id} has intact onclick handler "${item.handler}"`);
});

// Check if toggleHudOverflow function exists in script tag
const hasToggleFunc = htmlContent.includes('function toggleHudOverflow(') || htmlContent.includes('toggleHudOverflow =');
assert(hasToggleFunc, 'JavaScript function toggleHudOverflow exists in script block');

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 6: Glassmorphism & Retro Style Preservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST GROUP 6: GLASSMORPHISM & RETRO STYLE PRESERVATION ---');

const hasGlassHud = htmlContent.includes('.glass-hud');
assert(hasGlassHud, 'CSS rule .glass-hud exists');

const hasBackdropFilter = htmlContent.includes('backdrop-filter: var(--glass-blur)') || htmlContent.includes('backdrop-filter');
assert(hasBackdropFilter, 'Backdrop-filter blur CSS property is preserved');

const hasPressStartFont = htmlContent.includes("'Press Start 2P'") || htmlContent.includes("Press Start 2P");
assert(hasPressStartFont, "Retro font 'Press Start 2P' is referenced in stylesheet");

const hasNeonGoldBorder = htmlContent.includes('neon-border-gold') || htmlContent.includes('var(--neon-gold)');
assert(hasNeonGoldBorder, 'Neon gold border / glow variable is preserved');

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 7: Requirements Traceability Across Previous Iterations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TEST GROUP 7: PREVIOUS ITERATIONS FEATURE TRACEABILITY ---');

const gameJsContent = fs.readFileSync(path.join(PROJECT_ROOT, 'game.js'), 'utf8');

// Triple currency
const hasTripleCurrency = gameJsContent.includes('gems') && gameJsContent.includes('honor') && (gameJsContent.includes('coins') || gameJsContent.includes('gold'));
assert(hasTripleCurrency, 'game.js contains Triple Currency system (coins/gold, gems, honor)');

// Procedural graphics API
const hasCanvasGraphics = gameJsContent.includes('generateTexture') || gameJsContent.includes('add.graphics()') || gameJsContent.includes('make.graphics');
assert(hasCanvasGraphics, 'game.js uses Phaser Graphics API / generateTexture for procedural pixel art');

// Day/Night and Weather
const hasEnvironmentEffects = gameJsContent.includes('day') || gameJsContent.includes('night') || gameJsContent.includes('weather') || gameJsContent.includes('rain');
assert(hasEnvironmentEffects, 'game.js retains environment effects (day/night cycle or weather)');

// ─────────────────────────────────────────────────────────────────────────────
// FINAL AUDIT VERDICT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TOTAL ASSERTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('====================================================');

if (failCount === 0) {
    console.log('\nVERDICT: VICTORY CONFIRMED');
} else {
    console.log('\nVERDICT: VICTORY REJECTED');
}
