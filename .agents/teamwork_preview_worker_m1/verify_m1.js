const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== STARTING MILESTONE 1 VERIFICATION ===');
let overallPassed = true;

// 1. Syntax Check
console.log('\n--- TEST 1: Syntax Check (node -c) ---');
['game.js', 'assets/game.js'].forEach(file => {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    console.log(`[PASS] Syntax check passed for ${file}`);
  } catch (err) {
    overallPassed = false;
    console.log(`[FAIL] Syntax check failed for ${file}:\n${err.stderr ? err.stderr.toString() : err.message}`);
  }
});

// 2. Synchronization Check
console.log('\n--- TEST 2: SHA256 / Byte-for-byte Synchronization Check ---');
const g1 = fs.readFileSync('game.js');
const g2 = fs.readFileSync('assets/game.js');
const hash1 = crypto.createHash('sha256').update(g1).digest('hex');
const hash2 = crypto.createHash('sha256').update(g2).digest('hex');

console.log(`game.js SHA256:        ${hash1}`);
console.log(`assets/game.js SHA256: ${hash2}`);

if (hash1 === hash2 && g1.equals(g2)) {
  console.log(`[PASS] game.js (${g1.length} bytes) and assets/game.js (${g2.length} bytes) are 100% byte-for-byte identical.`);
} else {
  overallPassed = false;
  console.log(`[FAIL] game.js and assets/game.js differ!`);
}

// 3. Inspect _genPlayerTextures in game.js
console.log('\n--- TEST 3: Inspection of _genPlayerTextures ---');
const gameCode = g1.toString('utf8');
const startIdx = gameCode.indexOf('static _genPlayerTextures(scene) {');
const endIdx = gameCode.indexOf('static _genNpcTextures(scene) {');

if (startIdx === -1 || endIdx === -1) {
  overallPassed = false;
  console.log('[FAIL] Could not find _genPlayerTextures or _genNpcTextures bounds.');
} else {
  const funcBody = gameCode.substring(startIdx, endIdx);
  
  // Check required texture registration calls
  const requiredKeys = [
    'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
    'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
    'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
    'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
    'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
    'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
    'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle',
    'farmer0', 'farmer1', 'farmer2', 'farmer3'
  ];

  let missingKeys = [];
  requiredKeys.forEach(k => {
    if (!funcBody.includes(`'${k}'`)) {
      missingKeys.push(k);
    }
  });

  if (missingKeys.length === 0) {
    console.log(`[PASS] All ${requiredKeys.length} required texture keys and aliases found in _genPlayerTextures.`);
  } else {
    overallPassed = false;
    console.log(`[FAIL] Missing texture keys: ${missingKeys.join(', ')}`);
  }

  // Check palette tokens in code
  const requiredPaletteTokens = ['0xFACC15', '0xEAB308', '0xCA8A04', '0x94A3B8', '0x64748B', '0x475569', '0x334155', '0x38BDF8', '0x06B6D4', '0x0284C7', '0x0F172A'];
  let missingTokens = [];
  requiredPaletteTokens.forEach(t => {
    if (!funcBody.includes(t)) {
      missingTokens.push(t);
    }
  });

  if (missingTokens.length === 0) {
    console.log(`[PASS] All required palette hex color tokens found in _genPlayerTextures.`);
  } else {
    overallPassed = false;
    console.log(`[FAIL] Missing palette hex color tokens: ${missingTokens.join(', ')}`);
  }
}

console.log(`\n==================================================`);
console.log(`MILESTONE 1 VERIFICATION RESULT: ${overallPassed ? 'PASS' : 'FAIL'}`);
console.log(`==================================================`);
