const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = 'C:\\VibeCode\\Hangeul Valley';
const indexHtmlPath = path.join(projectRoot, 'index.html');
const assetsIndexHtmlPath = path.join(projectRoot, 'assets', 'index.html');
const gameJsPath = path.join(projectRoot, 'game.js');
const assetsGameJsPath = path.join(projectRoot, 'assets', 'game.js');

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const assetsIndexHtml = fs.readFileSync(assetsIndexHtmlPath, 'utf8');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');

const results = [];
let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}${details ? ' - ' + details : ''}`);
    results.push({ name: testName, status: 'PASS', details });
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}${details ? ' - ' + details : ''}`);
    results.push({ name: testName, status: 'FAIL', details });
  }
}

console.log('=== STARTING AUTOMATED BUTTON INTERACTIVITY AND PARITY HARNESS ===\n');

// 1. Verify index.html and assets/index.html identity
const isIdentical = (indexHtml === assetsIndexHtml);
assert(isIdentical, 'HTML Parity Check', `index.html (${indexHtml.length} bytes) vs assets/index.html (${assetsIndexHtml.length} bytes)`);

// 2. Button ID presence check helper
function checkElementIdInDom(id) {
  const regex = new RegExp(`id=["']${id}["']`, 'i');
  const inIndex = regex.test(indexHtml);
  const inAssets = regex.test(assetsIndexHtml);
  return inIndex && inAssets;
}

// Button target specs
const buttonSpecs = [
  {
    id: 'recipe-btn',
    expectedFn: 'openRecipeBook',
    checker: (html, js) => html.includes('id="recipe-btn"') && html.includes('onclick="openRecipeBook()')
  },
  {
    id: 'pet-btn',
    expectedFn: 'openPetOverlay',
    checker: (html, js) => html.includes('id="pet-btn"') && html.includes('onclick="openPetOverlay()')
  },
  {
    id: 'seasonal-btn',
    expectedFn: 'openSeasonalOverlay',
    checker: (html, js) => html.includes('id="seasonal-btn"') && html.includes('onclick="openSeasonalOverlay()')
  },
  {
    id: 'leaderboard-btn',
    expectedFn: 'openLeaderboard',
    checker: (html, js) => html.includes('id="leaderboard-btn"') && html.includes('onclick="openLeaderboard()')
  },
  {
    id: 'quest-btn',
    expectedFn: 'openQuestOverlay',
    checker: (html, js) => html.includes('id="quest-btn"') && html.includes('onclick="openQuestOverlay()')
  },
  {
    id: 'save-btn',
    expectedFn: 'saveAllGame',
    checker: (html, js) => html.includes('id="save-btn"') && html.includes('onclick="saveAllGame()')
  },
  {
    id: 'duel-btn',
    expectedFn: 'openSpellDuel',
    checker: (html, js) => html.includes('id="duel-btn"') && html.includes('onclick="openSpellDuel()')
  },
  {
    id: 'fish-album-btn',
    expectedFn: 'openFishAlbum',
    checker: (html, js) => html.includes('id="fish-album-btn"') && html.includes('onclick="openFishAlbum()')
  },
  {
    id: 'trophy-btn',
    expectedFn: 'openTrophies',
    checker: (html, js) => js.includes("getElementById('trophy-btn')") && js.includes('window.openTrophies')
  },
  {
    id: 'shop-btn',
    expectedFn: 'openShop',
    checker: (html, js) => js.includes("$('shop-btn')") && js.includes("addEventListener('click', openShop)")
  },
  {
    id: 'vocab-btn',
    expectedFn: 'toggleVocab (vocabOverlay toggle)',
    checker: (html, js) => js.includes("const vocabBtn=$('vocab-btn')") && js.includes("vocabBtn.addEventListener('click'")
  },
  {
    id: 'hud-menu-btn',
    expectedFn: 'showLevelSelect',
    checker: (html, js) => js.includes("hudMenuBtn=$('hud-menu-btn')") && js.includes("hudMenuBtn.addEventListener('click', () => { closeQuiz(); showLevelSelect(); })")
  }
];

// Check all 12 buttons
buttonSpecs.forEach(btn => {
  const domOk = checkElementIdInDom(btn.id);
  assert(domOk, `DOM Presence: #${btn.id}`, `Exists in index.html and assets/index.html`);

  const boundOk = btn.checker(indexHtml, gameJs);
  assert(boundOk, `Button Binding: #${btn.id} -> ${btn.expectedFn}`, `Verified connection in HTML / game.js`);
});

// 3. Verify #hud-more-btn and #hud-overflow-menu
const hudMoreDom = checkElementIdInDom('hud-more-btn');
assert(hudMoreDom, 'DOM Presence: #hud-more-btn', 'Exists in index.html and assets/index.html');

const hudMoreBinding = indexHtml.includes('id="hud-more-btn"') && indexHtml.includes('onclick="toggleHudOverflow(event)"');
assert(hudMoreBinding, 'Button Binding: #hud-more-btn -> toggleHudOverflow(event)', 'Verified inline onclick in index.html');

const hudMenuDom = checkElementIdInDom('hud-overflow-menu');
assert(hudMenuDom, 'DOM Presence: #hud-overflow-menu', 'Exists in index.html and assets/index.html');

// 4. Run `node -c game.js` and `node -c assets/game.js`
let syntaxSuccess = false;
let syntaxOutput = '';
try {
  const stdout = execSync('node -c game.js', { cwd: projectRoot, encoding: 'utf8' });
  const stdoutAssets = execSync('node -c assets/game.js', { cwd: projectRoot, encoding: 'utf8' });
  syntaxSuccess = true;
  syntaxOutput = 'No syntax errors found in game.js or assets/game.js';
} catch (err) {
  syntaxSuccess = false;
  syntaxOutput = err.message || err.toString();
}
assert(syntaxSuccess, 'Syntax Check: node -c game.js', syntaxOutput);

console.log('\n--- VERIFICATION SUMMARY ---');
console.log(`Total Tests Run: ${results.length}`);
console.log(`Total Passed: ${passCount}`);
console.log(`Total Failed: ${failCount}`);

const summary = {
  timestamp: new Date().toISOString(),
  total: results.length,
  passCount,
  failCount,
  verdict: failCount === 0 ? 'PASS' : 'FAIL',
  results
};

fs.writeFileSync(
  path.join(__dirname, 'verification_result.json'),
  JSON.stringify(summary, null, 2)
);

if (failCount > 0) {
  console.log('\nOVERALL VERDICT: FAIL');
  process.exit(1);
} else {
  console.log('\nOVERALL VERDICT: PASS');
  process.exit(0);
}
