const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== STARTING EMPIRICAL MILESTONE 2 GATE VERIFICATION ===\n');

let passAll = true;

function logResult(testName, success, details) {
  if (success) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.log(`[FAIL] ${testName}`);
    passAll = false;
  }
  if (details) {
    console.log(`       Details: ${details}`);
  }
}

// 1. Syntax Validation
try {
  execSync('node -c "d:/Hangeul Valley/game.js"', { stdio: 'pipe' });
  logResult('Syntax Check: game.js', true, 'node -c game.js exited with 0 errors');
} catch (err) {
  logResult('Syntax Check: game.js', false, err.stderr.toString());
}

try {
  execSync('node -c "d:/Hangeul Valley/assets/game.js"', { stdio: 'pipe' });
  logResult('Syntax Check: assets/game.js', true, 'node -c assets/game.js exited with 0 errors');
} catch (err) {
  logResult('Syntax Check: assets/game.js', false, err.stderr.toString());
}

// 2. SHA256 Hash Sync
const gameContent = fs.readFileSync('d:/Hangeul Valley/game.js');
const assetsGameContent = fs.readFileSync('d:/Hangeul Valley/assets/game.js');

const hashGame = crypto.createHash('sha256').update(gameContent).digest('hex');
const hashAssets = crypto.createHash('sha256').update(assetsGameContent).digest('hex');

if (hashGame === hashAssets) {
  logResult('SHA256 Hash Sync', true, `Hashes match: ${hashGame}`);
} else {
  logResult('SHA256 Hash Sync', false, `Mismatch!\n  game.js:        ${hashGame}\n  assets/game.js: ${hashAssets}`);
}

// Read game.js code for pattern checking
const code = gameContent.toString();

// 3. Proximity / Interaction Radii Verification
const catRadiusMatch = code.match(/catX.*catY\)\s*<\s*65/g);
const boardRadiusMatch = code.match(/boardX.*boardY\)\s*<\s*80/g);
const portalRadiusMatch = code.match(/portalX.*portalY\)\s*<\s*90/g);
const beehiveRadiusMatch = code.match(/beehiveX.*beehiveY\)\s*<\s*85/g);

logResult('Cat Proximity Radius (<65px)', !!catRadiusMatch, `Found ${catRadiusMatch ? catRadiusMatch.length : 0} matches in game.js`);
logResult('Notice Board Proximity Radius (<80px)', !!boardRadiusMatch, `Found ${boardRadiusMatch ? boardRadiusMatch.length : 0} matches in game.js`);
logResult('Portal Proximity Radius (<90px)', !!portalRadiusMatch, `Found ${portalRadiusMatch ? portalRadiusMatch.length : 0} matches in game.js`);
logResult('Beehive Proximity Radius (<85px)', !!beehiveRadiusMatch, `Found ${beehiveRadiusMatch ? beehiveRadiusMatch.length : 0} matches in game.js`);

// 4. Sprite Origin (0.5, 1) and Scaling Factors
const catOriginScale = /catSprite[\s\S]*?\.setOrigin\(\s*0\.5\s*,\s*1\s*\)\.setScale\(\s*0\.75\s*\)/.test(code);
const boardOriginScale = /boardSprite[\s\S]*?\.setOrigin\(\s*0\.5\s*,\s*1\s*\)\.setScale\(\s*1\.3\s*\)/.test(code);
const portalOriginScale = /portalSprite[\s\S]*?\.setOrigin\(\s*0\.5\s*,\s*1\s*\)\.setScale\(\s*1\.6\s*\)/.test(code);
const beehiveOriginScale = /beehiveSprite[\s\S]*?\.setOrigin\(\s*0\.5\s*,\s*1\s*\)\.setScale\(\s*1\.6\s*\)/.test(code);

logResult('Cat Sprite Origin (0.5, 1) & Scale (0.75)', catOriginScale, catOriginScale ? 'Verified' : 'Failed to match pattern');
logResult('Notice Board Sprite Origin (0.5, 1) & Scale (1.3)', boardOriginScale, boardOriginScale ? 'Verified' : 'Failed to match pattern');
logResult('Portal Sprite Origin (0.5, 1) & Scale (1.6)', portalOriginScale, portalOriginScale ? 'Verified' : 'Failed to match pattern');
logResult('Beehive Sprite Origin (0.5, 1) & Scale (1.6)', beehiveOriginScale, beehiveOriginScale ? 'Verified' : 'Failed to match pattern');

// 5. Event Trigger Preservation
const catTrigger = /catX[\s\S]*?showCatDialog\(\)/.test(code);
const boardTrigger = /boardX[\s\S]*?openMemoryGame\(\)/.test(code);
const portalTrigger = /portalX[\s\S]*?DungeonScene/.test(code);
const beehiveTrigger = /beehiveX[\s\S]*?BeeScene/.test(code);

logResult('Cat Dialog Trigger (showCatDialog)', catTrigger, catTrigger ? 'Verified' : 'Failed to match pattern');
logResult('Memory Game Trigger (openMemoryGame)', boardTrigger, boardTrigger ? 'Verified' : 'Failed to match pattern');
logResult('Dungeon Scene Trigger (DungeonScene)', portalTrigger, portalTrigger ? 'Verified' : 'Failed to match pattern');
logResult('Bee Scene Trigger (BeeScene / enterBeeScene)', beehiveTrigger, beehiveTrigger ? 'Verified' : 'Failed to match pattern');

console.log('\n=== VERIFICATION SUMMARY ===');
if (passAll) {
  console.log('OVERALL VERDICT: PASS');
} else {
  console.log('OVERALL VERDICT: FAIL');
}
