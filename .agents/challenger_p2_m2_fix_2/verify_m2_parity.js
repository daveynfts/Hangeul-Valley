const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log(`=== M2 PARITY & CONSTRAINT RE-VERIFICATION HARNESS ===\n`);
console.log(`Root Directory: ${rootDir}`);
console.log(`game.js path: ${gameJsPath}`);
console.log(`assets/game.js path: ${assetsGameJsPath}\n`);

let testResults = [];
let passCount = 0;
let failCount = 0;

function reportTest(name, passed, details) {
  if (passed) {
    passCount++;
    console.log(`[PASS] ${name}`);
  } else {
    failCount++;
    console.log(`[FAIL] ${name}`);
  }
  if (details) {
    console.log(`       ${details.split('\n').join('\n       ')}`);
  }
  testResults.push({ name, passed, details });
}

// -------------------------------------------------------------
// 1. Arcade Texture Key Registration Check & Duplicate Method Check
// -------------------------------------------------------------
const expectedArcadeKeys = [
  'arcade_player_ship',
  'alien_scout',
  'alien_shooter',
  'alien_elite',
  'alien_boss',
  'laser_player',
  'powerup_weapon',
  'powerup_shield',
  'powerup_nuke'
];

try {
  const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

  // Check declaration count for _genArcadeTextures
  const arcadeMatches = gameJsCode.match(/static\s+_genArcadeTextures/g);
  const arcadeOccurrences = arcadeMatches ? arcadeMatches.length : 0;

  // Find static definition of _genArcadeTextures
  const arcadeDefIndex = gameJsCode.lastIndexOf('static _genArcadeTextures');
  if (arcadeDefIndex === -1) {
    reportTest('1. All 9 Arcade Texture Keys Present in _genArcadeTextures', false, 'static _genArcadeTextures method not found in game.js');
  } else {
    // Find next static method after _genArcadeTextures
    const nextStaticIndex = gameJsCode.indexOf('static ', arcadeDefIndex + 25);
    const arcadeSlice = nextStaticIndex !== -1 ? gameJsCode.slice(arcadeDefIndex, nextStaticIndex) : gameJsCode.slice(arcadeDefIndex);
    
    const arcadeRegex = /this\.createTexture\s*\(\s*scene\s*,\s*['"]([^'"]+)['"]/g;
    let match;
    const foundArcadeKeys = new Set();
    while ((match = arcadeRegex.exec(arcadeSlice)) !== null) {
      foundArcadeKeys.add(match[1]);
    }
    
    const missingArcadeKeys = expectedArcadeKeys.filter(k => !foundArcadeKeys.has(k));
    const extraArcadeKeys = Array.from(foundArcadeKeys).filter(k => !expectedArcadeKeys.includes(k));

    if (missingArcadeKeys.length === 0 && foundArcadeKeys.size === expectedArcadeKeys.length && arcadeOccurrences === 1) {
      reportTest(
        '1. All 9 Arcade Texture Keys Present in _genArcadeTextures (Single clean method)',
        true,
        `Found all 9 keys: ${expectedArcadeKeys.join(', ')}\nMethod declaration count: ${arcadeOccurrences}`
      );
    } else if (missingArcadeKeys.length === 0 && foundArcadeKeys.size === expectedArcadeKeys.length) {
      reportTest(
        '1. All 9 Arcade Texture Keys Present in _genArcadeTextures',
        true,
        `Found all 9 keys in active definition: ${expectedArcadeKeys.join(', ')}\nNote: Declared ${arcadeOccurrences} times.`
      );
    } else {
      reportTest(
        '1. All 9 Arcade Texture Keys Present in _genArcadeTextures',
        false,
        `Found ${foundArcadeKeys.size}/9 keys.\nFound keys: ${Array.from(foundArcadeKeys).join(', ')}\nMissing keys: ${missingArcadeKeys.join(', ')}\nExtra keys: ${extraArcadeKeys.join(', ')}`
      );
    }
  }
} catch (err) {
  reportTest('1. All 9 Arcade Texture Keys Present in _genArcadeTextures', false, err.message);
}

// -------------------------------------------------------------
// 2. Dungeon Texture Key Registration Check & Duplicate Method Check
// -------------------------------------------------------------
const expectedDungeonKeys = [
  'dungeon_green_slime',
  'dungeon_goblin_warrior',
  'dungeon_skeleton_archer',
  'dungeon_boss',
  'loot_coin',
  'loot_gem',
  'loot_potion',
  'loot_chest',
  'loot_scroll'
];

try {
  const gameJsCode = fs.readFileSync(gameJsPath, 'utf8');

  // Check for duplicate method definitions of _genDungeonTextures
  const dungeonMatches = gameJsCode.match(/static\s+_genDungeonTextures/g);
  const dungeonOccurrences = dungeonMatches ? dungeonMatches.length : 0;

  // Find active definition of _genDungeonTextures
  const dungeonDefIndex = gameJsCode.lastIndexOf('static _genDungeonTextures');
  if (dungeonDefIndex === -1) {
    reportTest('2. All 9 Dungeon Texture Keys Present in _genDungeonTextures', false, 'static _genDungeonTextures method not found in game.js');
  } else {
    // Find next static method or class end
    const nextStaticIndex = gameJsCode.indexOf('static ', dungeonDefIndex + 25);
    const dungeonSlice = nextStaticIndex !== -1 ? gameJsCode.slice(dungeonDefIndex, nextStaticIndex) : gameJsCode.slice(dungeonDefIndex);
    
    const dungeonRegex = /this\.createTexture\s*\(\s*scene\s*,\s*['"]([^'"]+)['"]/g;
    let match;
    const foundDungeonKeys = new Set();
    while ((match = dungeonRegex.exec(dungeonSlice)) !== null) {
      foundDungeonKeys.add(match[1]);
    }

    const missingDungeonKeys = expectedDungeonKeys.filter(k => !foundDungeonKeys.has(k));
    const extraDungeonKeys = Array.from(foundDungeonKeys).filter(k => !expectedDungeonKeys.includes(k));

    if (missingDungeonKeys.length === 0 && foundDungeonKeys.size === expectedDungeonKeys.length && dungeonOccurrences === 1) {
      reportTest(
        '2. All 9 Dungeon Texture Keys Present in _genDungeonTextures (Single clean method)',
        true,
        `Found all 9 keys: ${expectedDungeonKeys.join(', ')}\nMethod declaration count: ${dungeonOccurrences}`
      );
    } else if (missingDungeonKeys.length === 0 && foundDungeonKeys.size === expectedDungeonKeys.length) {
      reportTest(
        '2. All 9 Dungeon Texture Keys Present in _genDungeonTextures',
        true,
        `Found all 9 keys in active definition: ${expectedDungeonKeys.join(', ')}\nNote: Declared ${dungeonOccurrences} times.`
      );
    } else {
      reportTest(
        '2. All 9 Dungeon Texture Keys Present in _genDungeonTextures',
        false,
        `Found ${foundDungeonKeys.size}/9 keys.\nFound keys: ${Array.from(foundDungeonKeys).join(', ')}\nMissing keys: ${missingDungeonKeys.join(', ')}\nExtra keys: ${extraDungeonKeys.join(', ')}`
      );
    }
  }
} catch (err) {
  reportTest('2. All 9 Dungeon Texture Keys Present in _genDungeonTextures', false, err.message);
}

// -------------------------------------------------------------
// 3. Forbidden Elements Check
// -------------------------------------------------------------
try {
  let diffOutput = '';
  try {
    diffOutput = execSync('git diff HEAD game.js', { cwd: rootDir, encoding: 'utf8' });
  } catch (gitErr) {
    diffOutput = execSync('git diff game.js', { cwd: rootDir, encoding: 'utf8' });
  }

  const forbiddenTerms = [
    { name: 'Player Farmer / Farmer textures', regex: /farmer|_genFarmerTextures/i },
    { name: 'Ginger Cat NPC / Cat textures', regex: /ginger_cat|_genCatTextures/i },
    { name: 'Wizard Merlin NPC / Wizard textures', regex: /wizard_merlin|_genWizardTextures/i },
    { name: 'DynamicShadowSystem', regex: /DynamicShadowSystem/i }
  ];

  let forbiddenViolations = [];

  // Split diff into added/modified lines
  const diffLines = diffOutput.split('\n');
  const modifiedContent = diffLines
    .filter(line => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---'))
    .join('\n');

  for (const term of forbiddenTerms) {
    if (term.regex.test(modifiedContent)) {
      forbiddenViolations.push(term.name);
    }
  }

  if (forbiddenViolations.length === 0) {
    reportTest(
      '3. Forbidden Elements ZERO Modifications Check',
      true,
      'Verified 0 modifications to Player Farmer, Ginger Cat NPC, Wizard Merlin NPC, or DynamicShadowSystem in git diff.'
    );
  } else {
    reportTest(
      '3. Forbidden Elements ZERO Modifications Check',
      false,
      `Detected modifications to forbidden elements: ${forbiddenViolations.join(', ')}`
    );
  }
} catch (err) {
  reportTest('3. Forbidden Elements ZERO Modifications Check', false, `Git diff error: ${err.message}`);
}

// -------------------------------------------------------------
// 4. File Synchronization Check (game.js vs assets/game.js)
// -------------------------------------------------------------
try {
  const rootBuf = fs.readFileSync(gameJsPath);
  const assetsBuf = fs.readFileSync(assetsGameJsPath);

  const rootHash = crypto.createHash('sha256').update(rootBuf).digest('hex');
  const assetsHash = crypto.createHash('sha256').update(assetsBuf).digest('hex');

  const byteMatch = rootBuf.length === assetsBuf.length;
  const hashMatch = rootHash === assetsHash;
  const bufferMatch = rootBuf.equals(assetsBuf);

  if (byteMatch && hashMatch && bufferMatch) {
    reportTest(
      '4. File Sync (game.js <-> assets/game.js) 100% Identical Check',
      true,
      `Byte size: ${rootBuf.length} bytes\nSHA-256 Hash: ${rootHash}\nByte content match: EXACT`
    );
  } else {
    reportTest(
      '4. File Sync (game.js <-> assets/game.js) 100% Identical Check',
      false,
      `Mismatch detected!\nroot size: ${rootBuf.length}, assets size: ${assetsBuf.length}\nroot hash: ${rootHash}\nassets hash: ${assetsHash}`
    );
  }
} catch (err) {
  reportTest('4. File Sync (game.js <-> assets/game.js) 100% Identical Check', false, err.message);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n=================================================`);
console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`OVERALL STATUS: ${failCount === 0 ? 'PASS' : 'FAIL'}`);
console.log(`=================================================\n`);

process.exit(failCount === 0 ? 0 : 1);
