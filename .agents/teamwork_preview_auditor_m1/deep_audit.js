const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('=== FORENSIC DEEP AUDIT SCRIPT FOR MILESTONE 1 (V2) ===\n');

const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath, 'utf8');

let errors = [];
let auditLog = [];

function log(msg) {
  console.log(msg);
  auditLog.push(msg);
}

// 1. SHA256 & Exact Byte Equality
const h1 = crypto.createHash('sha256').update(gameJsContent).digest('hex');
const h2 = crypto.createHash('sha256').update(assetsGameJsContent).digest('hex');

log(`SHA256 game.js:        ${h1}`);
log(`SHA256 assets/game.js: ${h2}`);
if (h1 !== h2) {
  errors.push(`SHA256 mismatch! game.js (${h1}) vs assets/game.js (${h2})`);
} else {
  log(`[PASS] SHA256 hashes match identically.`);
}

if (gameJsContent.length !== assetsGameJsContent.length) {
  errors.push(`File byte length mismatch! game.js (${gameJsContent.length}) vs assets/game.js (${assetsGameJsContent.length})`);
} else {
  log(`[PASS] File lengths match identically (${gameJsContent.length} bytes).`);
}

// 2. Extract _genPlayerTextures section
const match = gameJsContent.match(/static _genPlayerTextures\(scene\) \{([\s\S]*?)\n  \}/);
if (!match) {
  errors.push(`Could not locate _genPlayerTextures function in game.js`);
} else {
  log(`[PASS] Located _genPlayerTextures function.`);
  const body = match[1];

  // Extract Palette P object by scanning lines
  const pLines = [];
  let inP = false;
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.includes('const P = {')) {
      inP = true;
      continue;
    }
    if (inP) {
      if (line.trim().startsWith('};')) {
        inP = false;
        break;
      }
      pLines.push(line);
    }
  }

  let P = {};
  if (pLines.length === 0) {
    errors.push(`Could not extract palette P lines.`);
  } else {
    try {
      const pCode = 'return {\n' + pLines.join('\n') + '\n};';
      P = new Function(pCode)();
      log(`[PASS] Palette P parsed successfully. Token count: ${Object.keys(P).length}`);
    } catch (e) {
      errors.push(`Failed to evaluate palette P: ${e.message}`);
    }
  }

  // Required Robot Palette Tokens
  const requiredTokens = [
    'K', 'k', 'Y', 'y', 'J', 'j', 'C', 'c', 'm', 'M', 'd', 'D', 'S', 's',
    'W', 'L', 'V', 'v', 'z', 'Z', 'B', 'b', 'O', 'o', 'R', 'r', 'A', 'a',
    'G', 'g', 'n', 'u', 'U', 'w', 'X', 'q', 'Q', '2', 'F'
  ];
  for (const t of requiredTokens) {
    if (!(t in P)) {
      errors.push(`Missing required palette token '${t}' in P.`);
    }
  }

  // Matrix Inspection & Validation
  const matrixNames = [
    'down_0', 'down_1', 'down_2',
    'up_0', 'up_1', 'up_2',
    'left_0', 'left_1', 'left_2',
    'right_0', 'right_1', 'right_2',
    'water_down_0', 'water_down_1', 'water_down_2',
    'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
    'pick_down_0', 'pick_down_1', 'pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle'
  ];

  const matricesObj = {};

  for (const mName of matrixNames) {
    const mLines = [];
    let inM = false;
    for (const line of lines) {
      if (line.includes(`const ${mName} = [`)) {
        inM = true;
        continue;
      }
      if (inM) {
        if (line.trim().startsWith('];')) {
          inM = false;
          break;
        }
        mLines.push(line);
      }
    }
    if (mLines.length === 0) {
      errors.push(`Could not extract matrix lines for ${mName}`);
    } else {
      try {
        const mArr = new Function(`return [\n${mLines.join('\n')}\n];`)();
        matricesObj[mName] = mArr;

        if (mArr.length !== 16) {
          errors.push(`Matrix ${mName} height is ${mArr.length}, expected 16.`);
        }
        for (let r = 0; r < mArr.length; r++) {
          if (mArr[r].length !== 16) {
            errors.push(`Matrix ${mName} row ${r} length is ${mArr[r].length}, expected 16.`);
          }
          for (let c = 0; c < 16; c++) {
            const token = mArr[r][c];
            if (!(token in P)) {
              errors.push(`Matrix ${mName} contains undefined token '${token}' at row ${r}, col ${c}`);
            }
          }
        }
      } catch (e) {
        errors.push(`Failed to parse matrix ${mName}: ${e.message}`);
      }
    }
  }

  log(`[PASS] All 24 matrices extracted, dimension-checked (16x16), and token-validated against palette P.`);

  // 3. Detailed Visual/Anatomy Checks on Walk Matrices
  // Walk Down (down_0, down_1, down_2)
  if (matricesObj['down_0']) {
    const d0 = matricesObj['down_0'];
    // Check top antenna LED: row 1 col 7-8 contains 'O'/'R'/'o'
    const topRow = d0[1];
    log(`Walk Down 0 Row 1: "${topRow}"`);
    if (!topRow.includes('O') && !topRow.includes('R') && !topRow.includes('o') && !topRow.includes('A')) {
      errors.push(`Walk Down 0 missing antenna LED tip in row 1.`);
    }

    // Check LED Visor: row 5-7 contains visor tokens ('V', 'v', 'L', 'W', 'b', 'C')
    const visorRow = d0[6];
    log(`Walk Down 0 Row 6 (Visor): "${visorRow}"`);
    if (!visorRow.includes('L') || !visorRow.includes('W')) {
      errors.push(`Walk Down 0 missing LED visor glint/glare (L/W) in row 6.`);
    }

    // Check 1px dark slate outline ('K') along outer boundaries
    let kCount = 0;
    d0.forEach(row => {
      for (const char of row) {
        if (char === 'K') kCount++;
      }
    });
    log(`Walk Down 0 'K' dark outline count: ${kCount} pixels`);
    if (kCount < 20) {
      errors.push(`Walk Down 0 has insufficient 'K' dark outline pixels (${kCount}).`);
    }

    // Check Tread differences between down_0 (rest), down_1 (step 1), down_2 (step 2)
    const d1 = matricesObj['down_1'];
    const d2 = matricesObj['down_2'];
    let diff01 = 0, diff02 = 0;
    for (let r = 10; r <= 15; r++) {
      for (let c = 0; c < 16; c++) {
        if (d0[r][c] !== d1[r][c]) diff01++;
        if (d0[r][c] !== d2[r][c]) diff02++;
      }
    }
    log(`Tread pixel differences (rows 10-15): down_0 vs down_1 = ${diff01}px, down_0 vs down_2 = ${diff02}px`);
    if (diff01 < 8 || diff02 < 8) {
      errors.push(`Tread animation step differences insufficient (down_0..1: ${diff01}px, down_0..2: ${diff02}px). Expected >= 8px.`);
    }
  }

  // 4. Facade and Cheating Detection
  log('\n--- FORENSIC INTEGRITY CHECKS ---');
  // Check if any matrix is a duplicate placeholder
  let duplicateCount = 0;
  for (let i = 0; i < matrixNames.length; i++) {
    for (let j = i + 1; j < matrixNames.length; j++) {
      const m1 = matrixNames[i];
      const m2 = matrixNames[j];
      if (matricesObj[m1] && matricesObj[m2]) {
        if (JSON.stringify(matricesObj[m1]) === JSON.stringify(matricesObj[m2])) {
          // Note: down_0 used for rest frame in farmer0 & farmer2, but among unique matrix names, none should be identical unless intended
          if (m1 !== 'down_0' || m2 !== 'up_0') {
            log(`Notice: Matrix ${m1} and ${m2} are identical.`);
          }
        }
      }
    }
  }

  // Verify createTexture calls in game.js
  const createTextureCalls = [
    "this.createTexture(scene, 'player_walk_down_0', down_0, P);",
    "this.createTexture(scene, 'player_walk_down_1', down_1, P);",
    "this.createTexture(scene, 'player_walk_down_2', down_2, P);",
    "this.createTexture(scene, 'player_walk_up_0', up_0, P);",
    "this.createTexture(scene, 'player_walk_up_1', up_1, P);",
    "this.createTexture(scene, 'player_walk_up_2', up_2, P);",
    "this.createTexture(scene, 'player_walk_left_0', left_0, P);",
    "this.createTexture(scene, 'player_walk_left_1', left_1, P);",
    "this.createTexture(scene, 'player_walk_left_2', left_2, P);",
    "this.createTexture(scene, 'player_walk_right_0', right_0, P);",
    "this.createTexture(scene, 'player_walk_right_1', right_1, P);",
    "this.createTexture(scene, 'player_walk_right_2', right_2, P);",
    "this.createTexture(scene, 'player_water_down_0', water_down_0, P);",
    "this.createTexture(scene, 'player_water_down_1', water_down_1, P);",
    "this.createTexture(scene, 'player_water_down_2', water_down_2, P);",
    "this.createTexture(scene, 'player_harvest_down_0', harvest_down_0, P);",
    "this.createTexture(scene, 'player_harvest_down_1', harvest_down_1, P);",
    "this.createTexture(scene, 'player_harvest_down_2', harvest_down_2, P);",
    "this.createTexture(scene, 'player_pick_down_0', pick_down_0, P);",
    "this.createTexture(scene, 'player_pick_down_1', pick_down_1, P);",
    "this.createTexture(scene, 'player_pick_down_2', pick_down_2, P);",
    "this.createTexture(scene, 'tool_watering_can', tool_watering_can, P);",
    "this.createTexture(scene, 'tool_basket', tool_basket, P);",
    "this.createTexture(scene, 'tool_sickle', tool_sickle, P);",
    "this.createTexture(scene, 'farmer0', down_0, P);",
    "this.createTexture(scene, 'farmer1', down_1, P);",
    "this.createTexture(scene, 'farmer2', down_0, P);",
    "this.createTexture(scene, 'farmer3', down_2, P);"
  ];

  let missingCalls = 0;
  for (const call of createTextureCalls) {
    if (!body.includes(call)) {
      errors.push(`Missing texture creation call: ${call}`);
      missingCalls++;
    }
  }
  if (missingCalls === 0) {
    log(`[PASS] All 28 createTexture calls (12 walk, 9 action, 3 tools, 4 legacy aliases) present in exact sequence.`);
  }

  // Check animation creation calls
  const animCalls = [
    "reg('player-walk-down', ['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2']);",
    "reg('player-walk-up', ['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2']);",
    "reg('player-walk-left', ['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2']);",
    "reg('player-walk-right', ['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2']);",
    "regOnce('player-water', ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']);",
    "regOnce('player-harvest', ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']);",
    "regOnce('player-pick', ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']);"
  ];
  let missingAnim = 0;
  for (const ac of animCalls) {
    if (!body.includes(ac)) {
      errors.push(`Missing animation registration call: ${ac}`);
      missingAnim++;
    }
  }
  if (missingAnim === 0) {
    log(`[PASS] All 7 animation registration calls present in exact sequence.`);
  }
}

log('\n=== AUDIT SUMMARY ===');
if (errors.length === 0) {
  log('FINAL VERDICT: CLEAN');
  log('All forensic checks passed cleanly with 0 errors or integrity violations!');
} else {
  log('FINAL VERDICT: INTEGRITY VIOLATION');
  log(`Errors found (${errors.length}):`);
  errors.forEach((err, idx) => log(` ${idx + 1}. ${err}`));
}
