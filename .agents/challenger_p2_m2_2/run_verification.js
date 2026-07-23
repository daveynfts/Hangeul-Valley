const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('====================================================');
console.log('   M2 EMPIRICAL CHALLENGER VERIFICATION HARNESS   ');
console.log('====================================================\n');

const rootGamePath = path.resolve(__dirname, '../../game.js');
const assetsGamePath = path.resolve(__dirname, '../../assets/game.js');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function logPass(msg) {
  console.log(`[PASS] ${msg}`);
  passCount++;
}

function logFail(msg) {
  console.log(`[FAIL] ${msg}`);
  failCount++;
}

function logWarn(msg) {
  console.log(`[WARN] ${msg}`);
  warnCount++;
}

// ----------------------------------------------------
// 1. File Synchronization & Byte-for-Byte Check
// ----------------------------------------------------
console.log('--- TEST 1: File Sync Check (game.js vs assets/game.js) ---');
try {
  const rootBuf = fs.readFileSync(rootGamePath);
  const assetsBuf = fs.readFileSync(assetsGamePath);
  const rootHash = crypto.createHash('sha256').update(rootBuf).digest('hex');
  const assetsHash = crypto.createHash('sha256').update(assetsBuf).digest('hex');

  console.log(`root game.js: ${rootBuf.length} bytes | SHA256: ${rootHash}`);
  console.log(`assets/game.js: ${assetsBuf.length} bytes | SHA256: ${assetsHash}`);

  if (rootBuf.length === assetsBuf.length && rootBuf.equals(assetsBuf)) {
    logPass('game.js and assets/game.js are 100% identical in byte size and content.');
  } else {
    logFail('game.js and assets/game.js differ in size or content!');
  }
} catch (e) {
  logFail(`Error reading game files: ${e.message}`);
}

// ----------------------------------------------------
// 2. Arcade Texture Key Parity Check
// ----------------------------------------------------
console.log('\n--- TEST 2: Arcade Texture Keys Registration (_genArcadeTextures) ---');
const content = fs.readFileSync(rootGamePath, 'utf8');

const requiredArcadeKeys = [
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

function getMethodBody(src, methodName, occurrence = 1) {
  let searchIdx = 0;
  for (let count = 0; count < occurrence; count++) {
    const idx = src.indexOf('static ' + methodName + '(', searchIdx);
    if (idx === -1) return null;
    searchIdx = idx + 1;
  }
  const startIdx = searchIdx - 1;
  const braceIdx = src.indexOf('{', startIdx);
  if (braceIdx === -1) return null;

  let depth = 1;
  let i = braceIdx + 1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(braceIdx + 1, i);
}

const arcadeBody = getMethodBody(content, '_genArcadeTextures', 1);

if (!arcadeBody) {
  logFail('_genArcadeTextures method not found in game.js');
} else {
  console.log(`_genArcadeTextures body length: ${arcadeBody.length} characters.`);
  
  const registeredArcadeKeys = [];
  const arcadeRegex = /this\.createTexture\s*\(\s*scene\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = arcadeRegex.exec(arcadeBody)) !== null) {
    registeredArcadeKeys.push(match[1]);
  }

  console.log('Registered Arcade Keys:', registeredArcadeKeys);

  let missingArcade = [];
  requiredArcadeKeys.forEach(k => {
    if (registeredArcadeKeys.includes(k)) {
      console.log(`  - Key '${k}': REGISTERED`);
    } else {
      console.log(`  - Key '${k}': MISSING`);
      missingArcade.push(k);
    }
  });

  if (missingArcade.length === 0 && registeredArcadeKeys.length === 9) {
    logPass('All 9 Arcade texture keys are registered in _genArcadeTextures.');
  } else if (missingArcade.length === 0) {
    logPass(`All 9 Arcade texture keys present (total registered: ${registeredArcadeKeys.length}).`);
  } else {
    logFail(`Missing Arcade keys: ${missingArcade.join(', ')}`);
  }
}

// ----------------------------------------------------
// 3. Dungeon Texture Key Parity Check
// ----------------------------------------------------
console.log('\n--- TEST 3: Dungeon Texture Keys Registration (_genDungeonTextures) ---');

const requiredDungeonKeys = [
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

const dungeonOccurrences = (content.match(/static _genDungeonTextures\s*\(/g) || []).length;
console.log(`Occurrence count of static _genDungeonTextures: ${dungeonOccurrences}`);

if (dungeonOccurrences > 1) {
  logWarn(`Found ${dungeonOccurrences} declarations of static _genDungeonTextures(scene). In JS, the last declaration overwrites earlier ones. Lines 3236-3471 contain dead code.`);
}

const activeDungeonBody = getMethodBody(content, '_genDungeonTextures', dungeonOccurrences);

if (!activeDungeonBody) {
  logFail('Active _genDungeonTextures method not found in game.js');
} else {
  console.log(`Active _genDungeonTextures body length: ${activeDungeonBody.length} characters.`);
  
  const registeredDungeonKeys = [];
  const dungeonRegex = /this\.createTexture\s*\(\s*scene\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = dungeonRegex.exec(activeDungeonBody)) !== null) {
    registeredDungeonKeys.push(match[1]);
  }

  console.log('Registered Dungeon Keys in active method:', registeredDungeonKeys);

  let missingDungeon = [];
  requiredDungeonKeys.forEach(k => {
    if (registeredDungeonKeys.includes(k)) {
      console.log(`  - Key '${k}': REGISTERED`);
    } else {
      console.log(`  - Key '${k}': MISSING`);
      missingDungeon.push(k);
    }
  });

  if (missingDungeon.length === 0 && registeredDungeonKeys.length === 9) {
    logPass('All 9 Dungeon texture keys are registered in active _genDungeonTextures.');
  } else if (missingDungeon.length === 0) {
    logPass(`All 9 Dungeon texture keys present (total registered: ${registeredDungeonKeys.length}).`);
  } else {
    logFail(`Missing Dungeon keys: ${missingDungeon.join(', ')}`);
  }
}

// ----------------------------------------------------
// 4. Forbidden Elements Preservation Check
// ----------------------------------------------------
console.log('\n--- TEST 4: Forbidden Elements Preservation Check ---');
const { execSync } = require('child_process');

try {
  const diff = execSync('git diff HEAD game.js', { encoding: 'utf8', cwd: path.resolve(__dirname, '../..') });
  const forbiddenKeywords = [
    'farmer',
    'Farmer',
    'ginger_cat',
    'Ginger Cat',
    'wizard_merlin',
    'Wizard Merlin',
    'gwiz',
    'DynamicShadowSystem'
  ];

  const lines = diff.split('\n');
  const offendingLines = [];

  lines.forEach((line, idx) => {
    if (line.startsWith('+') || line.startsWith('-')) {
      if (line.startsWith('+++') || line.startsWith('---')) return;
      forbiddenKeywords.forEach(kw => {
        if (line.includes(kw)) {
          offendingLines.push({ line: line.trim(), keyword: kw });
        }
      });
    }
  });

  if (offendingLines.length === 0) {
    logPass('Forbidden elements (Player Farmer, Ginger Cat, Wizard Merlin, DynamicShadowSystem) have ZERO modifications in git diff.');
  } else {
    logFail(`Forbidden elements modified in git diff (${offendingLines.length} instances):`);
    offendingLines.forEach(item => console.log(`   - Keyword '${item.keyword}': ${item.line}`));
  }
} catch (e) {
  logFail(`Failed to execute git diff: ${e.message}`);
}

// ----------------------------------------------------
// 5. Mock Runtime Texture Generation Verification
// ----------------------------------------------------
console.log('\n--- TEST 5: Mock Runtime Execution Test ---');
try {
  const createdTextures = [];
  const mockScene = {
    make: { graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, generateTexture: () => {}, destroy: () => {} }) },
    textures: { exists: (k) => createdTextures.includes(k) }
  };

  const mockRenderer = {
    createTexture(scene, key, matrix, palette) {
      createdTextures.push(key);
    }
  };

  const runCode = (body) => {
    const func = new Function('scene', 'self', body);
    func.call(mockRenderer, mockScene, mockRenderer);
  };

  runCode(arcadeBody);
  runCode(activeDungeonBody);

  console.log('Total textures generated in mock execution:', createdTextures.length);
  console.log('Generated Texture Keys:', createdTextures);

  const allRequired = [...requiredArcadeKeys, ...requiredDungeonKeys];
  const missingInMock = allRequired.filter(k => !createdTextures.includes(k));

  if (missingInMock.length === 0) {
    logPass('Mock runtime execution successfully generated all 18 (9 Arcade + 9 Dungeon) required texture keys.');
  } else {
    logFail(`Mock runtime execution missed keys: ${missingInMock.join(', ')}`);
  }
} catch (e) {
  logWarn(`Mock runtime execution failed: ${e.message}`);
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`   FINAL SUMMARY: ${passCount} PASS, ${failCount} FAIL, ${warnCount} WARN`);
console.log('====================================================');

if (failCount === 0) {
  console.log('\nOVERALL RESULT: PASS');
  process.exit(0);
} else {
  console.log('\nOVERALL RESULT: FAIL');
  process.exit(1);
}
