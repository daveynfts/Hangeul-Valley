const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log('Target file:', gameJsPath);

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

const results = [];

function assert(description, condition, details = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    results.push({ id: totalAssertions, status: 'PASS', description, details: details ? String(details).trim().substring(0, 120) : '' });
    console.log(`[PASS] #${totalAssertions}: ${description}`);
  } else {
    failedAssertions++;
    results.push({ id: totalAssertions, status: 'FAIL', description, details: details ? String(details).trim().substring(0, 120) : '' });
    console.error(`[FAIL] #${totalAssertions}: ${description} - ${details}`);
  }
}

// Read game.js code
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('\n--- SUITE 1: Shop NPC Interaction & Proximity Trigger ---');
// _interact method check
const interactMethodMatch = code.match(/_interact\s*\(\s*\)\s*\{([\s\S]*?)\n  \}/);
assert('_interact() method defined in game.js', !!interactMethodMatch, interactMethodMatch ? 'Method found' : 'Missing _interact()');

const interactBody = interactMethodMatch ? interactMethodMatch[1] : '';

// Proximity check for shop NPC
const shopProximityRegex = /this\.shopX\s*&&\s*Phaser\.Math\.Distance\.Between\s*\(\s*this\.player\.x\s*,\s*this\.player\.y\s*,\s*this\.shopX\s*,\s*this\.shopY\s*\)\s*<\s*90/s;
const shopProximityMatch = shopProximityRegex.test(interactBody);
assert('Shop NPC proximity distance check (< 90px) inside _interact()', shopProximityMatch, shopProximityMatch ? 'Found `< 90` distance check' : 'Missing distance check pattern');

// openShop call site
const shopCallSiteRegex = /Phaser\.Math\.Distance\.Between\s*\(\s*this\.player\.x\s*,\s*this\.player\.y\s*,\s*this\.shopX\s*,\s*this\.shopY\s*\)\s*<\s*90\s*\)\s*{\s*openShop\(\)/s;
const shopCallSiteMatch = shopCallSiteRegex.test(interactBody);
assert('openShop() call site inside < 90px proximity block', shopCallSiteMatch, shopCallSiteMatch ? 'openShop() triggered on proximity < 90px' : 'openShop() call site mismatch');

console.log('\n--- SUITE 2: Wizard NPC Interaction & Proximity Trigger ---');
// Proximity check for wizard NPC
const wizardProximityRegex = /this\.wizardX\s*&&\s*Phaser\.Math\.Distance\.Between\s*\(\s*this\.player\.x\s*,\s*this\.player\.y\s*,\s*this\.wizardX\s*,\s*this\.wizardY\s*\)\s*<\s*85/s;
const wizardProximityMatch = wizardProximityRegex.test(interactBody);
assert('Wizard NPC proximity distance check (< 85px) inside _interact()', wizardProximityMatch, wizardProximityMatch ? 'Found `< 85` distance check' : 'Missing distance check pattern');

// openSpellDuel call site
const wizardCallSiteRegex = /this\.wizardX\s*&&\s*Phaser\.Math\.Distance\.Between\s*\(\s*this\.player\.x\s*,\s*this\.player\.y\s*,\s*this\.wizardX\s*,\s*this\.wizardY\s*\)\s*<\s*85\s*\)[\s\S]*?openSpellDuel\(\)/s;
const wizardCallSiteMatch = wizardCallSiteRegex.test(interactBody);
assert('openSpellDuel() call site inside < 85px proximity block', wizardCallSiteMatch, wizardCallSiteMatch ? 'openSpellDuel() triggered on proximity < 85px' : 'openSpellDuel() call site mismatch');

console.log('\n--- SUITE 3: Shop NPC Scene Placement, Origin, Scale & Levitation ---');
// Extract _createShopNPC function
const shopMethodMatch = code.match(/_createShopNPC\s*\([^)]*\)\s*\{([\s\S]*?)\n  \}/);
assert('_createShopNPC method defined in game.js', !!shopMethodMatch, shopMethodMatch ? 'Method found' : 'Method missing');

if (shopMethodMatch) {
  const shopBody = shopMethodMatch[1];
  
  // Coordinates
  const sxMatch = /sx\s*=\s*this\.farm\.x\s*\+\s*this\.farm\.w\s*\+\s*175/.test(shopBody);
  assert('Shop NPC X coordinate calculation (sx = farm.x + farm.w + 175)', sxMatch, shopBody);

  const syMatch = /sy\s*=\s*this\.farm\.y\s*\+\s*this\.farm\.h\s*\/\s*2\s*\+\s*25/.test(shopBody);
  assert('Shop NPC Y coordinate calculation (sy = farm.y + farm.h / 2 + 25)', syMatch, shopBody);

  // Texture key
  const textureMatch = /this\.shopNPC\s*=\s*this\.add\.image\s*\(\s*sx\s*,\s*sy\s*,\s*['"]shop_sign['"]\s*\)/.test(shopBody);
  assert('Shop NPC texture key is shop_sign', textureMatch, shopBody);

  // Origin (0.5, 1)
  const originMatch = /\.setOrigin\(\s*0\.5\s*,\s*1\s*\)/.test(shopBody);
  assert('Shop NPC origin setting is (0.5, 1)', originMatch, shopBody);

  // Scale 1.3
  const scaleMatch = /\.setScale\(\s*1\.3\s*\)/.test(shopBody);
  assert('Shop NPC scale factor is 1.3', scaleMatch, shopBody);

  // Initial depth
  const depthMatch = /\.setDepth\(\s*sy\s*\)/.test(shopBody);
  assert('Shop NPC initial depth set to sy', depthMatch, shopBody);

  // Levitation tween
  const tweenMatch = /targets:\s*this\.shopNPC[\s\S]*?y:\s*sy\s*-\s*4[\s\S]*?duration:\s*900[\s\S]*?yoyo:\s*true[\s\S]*?repeat:\s*-1[\s\S]*?ease:\s*['"]Sine\.InOut['"]/.test(shopBody);
  assert('Shop NPC levitation tween configuration (y: sy-4, duration: 900, yoyo: true, ease: Sine.InOut)', tweenMatch, shopBody);
}

console.log('\n--- SUITE 4: Wizard NPC Scene Placement, Origin, Scale & Levitation ---');
// Extract _createWizardNPC function
const wizardMethodMatch = code.match(/_createWizardNPC\s*\([^)]*\)\s*\{([\s\S]*?)\n  \}/);
assert('_createWizardNPC method defined in game.js', !!wizardMethodMatch, wizardMethodMatch ? 'Method found' : 'Method missing');

if (wizardMethodMatch) {
  const wizardBody = wizardMethodMatch[1];

  // Coordinates
  const wxMatch = /wx\s*=\s*this\.farm\.x\s*\+\s*this\.farm\.w\s*\+\s*160/.test(wizardBody);
  assert('Wizard NPC X coordinate calculation (wx = farm.x + farm.w + 160)', wxMatch, wizardBody);

  const wyMatch = /wy\s*=\s*this\.farm\.y\s*-\s*85/.test(wizardBody);
  assert('Wizard NPC Y coordinate calculation (wy = farm.y - 85)', wyMatch, wizardBody);

  // Texture key
  const textureMatch = /this\.wizardSprite\s*=\s*this\.add\.sprite\s*\(\s*wx\s*,\s*wy\s*,\s*['"]wizard_idle_0['"]\s*\)/.test(wizardBody);
  assert('Wizard NPC texture key is wizard_idle_0', textureMatch, wizardBody);

  // Origin (0.5, 1)
  const originMatch = /\.setOrigin\(\s*0\.5\s*,\s*1\s*\)/.test(wizardBody);
  assert('Wizard NPC origin setting is (0.5, 1)', originMatch, wizardBody);

  // Scale 1.8
  const scaleMatch = /\.setScale\(\s*1\.8\s*\)/.test(wizardBody);
  assert('Wizard NPC scale factor is 1.8', scaleMatch, wizardBody);

  // Initial depth
  const depthMatch = /\.setDepth\(\s*wy\s*\)/.test(wizardBody);
  assert('Wizard NPC initial depth set to wy', depthMatch, wizardBody);

  // Levitation tween
  const tweenMatch = /targets:\s*this\.wizardSprite[\s\S]*?y:\s*wy\s*-\s*4[\s\S]*?duration:\s*900[\s\S]*?yoyo:\s*true[\s\S]*?repeat:\s*-1[\s\S]*?ease:\s*['"]Sine\.InOut['"]/.test(wizardBody);
  assert('Wizard NPC levitation tween configuration (y: wy-4, duration: 900, yoyo: true, ease: Sine.InOut)', tweenMatch, wizardBody);
}

console.log('\n--- SUITE 5: Depth Sorting in updateDepthSort() ---');
// Shop NPC depth sort in updateDepthSort
const shopDepthSortRegex = /if\s*\(\s*this\.shopNPC\s*\)\s*this\.shopNPC\.setDepth\(\s*this\.shopY\s*\|\|\s*this\.shopNPC\.y\s*\);/;
const shopDepthSortMatch = shopDepthSortRegex.test(code);
assert('Shop NPC depth sort update in updateDepthSort() using static base Y', shopDepthSortMatch, shopDepthSortMatch ? 'Found shopNPC.setDepth update' : 'Missing shop depth sort update');

// Wizard NPC depth sort in updateDepthSort
const wizardDepthSortRegex = /if\s*\(\s*this\.wizardSprite\s*\)\s*this\.wizardSprite\.setDepth\(\s*this\.wizardY\s*\|\|\s*this\.wizardSprite\.y\s*\);/;
const wizardDepthSortMatch = wizardDepthSortRegex.test(code);
assert('Wizard NPC depth sort update in updateDepthSort() using static base Y', wizardDepthSortMatch, wizardDepthSortMatch ? 'Found wizardSprite.setDepth update' : 'Missing wizard depth sort update');

// Player depth calculation in updateDepthSort
const playerDepthSortRegex = /const\s+playerBaseY\s*=\s*this\.player\.y\s*\+\s*\(\s*this\.player\.displayHeight\s*\*\s*\(\s*1\s*-\s*this\.player\.originY\s*\)\s*\);[\s\S]*?this\.player\.setDepth\(\s*playerBaseY\s*\);/;
const playerDepthSortMatch = playerDepthSortRegex.test(code);
assert('Player Y-sort depth calculation in updateDepthSort()', playerDepthSortMatch, playerDepthSortMatch ? 'Player Y-sort logic intact' : 'Player depth sort broken');

console.log('\n--- SUITE 6: Non-Regression & Dual-File Sync Audit ---');
// Syntax check game.js
let gameSyntaxPass = false;
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  gameSyntaxPass = true;
} catch (e) {
  gameSyntaxPass = false;
}
assert('game.js node syntax check (node -c game.js)', gameSyntaxPass, gameSyntaxPass ? 'Syntax valid' : 'Syntax error');

// Syntax check assets/game.js
let assetsSyntaxPass = false;
try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  assetsSyntaxPass = true;
} catch (e) {
  assetsSyntaxPass = false;
}
assert('assets/game.js node syntax check (node -c assets/game.js)', assetsSyntaxPass, assetsSyntaxPass ? 'Syntax valid' : 'Syntax error');

// SHA256 match
const h1 = crypto.createHash('sha256').update(fs.readFileSync(gameJsPath)).digest('hex');
const h2 = crypto.createHash('sha256').update(fs.readFileSync(assetsGameJsPath)).digest('hex');
const shaMatch = h1 === h2;
assert('game.js <-> assets/game.js SHA256 byte synchronization', shaMatch, `game.js: ${h1}, assets/game.js: ${h2}`);

// Summary
console.log('\n================ SUMMARY ================');
console.log(`Total Assertions: ${totalAssertions}`);
console.log(`Passed Assertions: ${passedAssertions}`);
console.log(`Failed Assertions: ${failedAssertions}`);
console.log(`Verdict: ${failedAssertions === 0 ? 'SUCCESS (ALL PASSED)' : 'FAILURE (SOME FAILED)'}`);

// Output summary object for reporting
const summaryData = {
  timestamp: new Date().toISOString(),
  totalAssertions,
  passedAssertions,
  failedAssertions,
  verdict: failedAssertions === 0 ? 'PASSED' : 'FAILED',
  sha256: h1,
  results
};

fs.writeFileSync(path.join(__dirname, 'test_output.json'), JSON.stringify(summaryData, null, 2));
