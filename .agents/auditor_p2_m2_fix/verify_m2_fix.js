const fs = require('fs');
const vm = require('vm');
const { execSync } = require('child_process');

console.log("=================================================");
console.log("  MILESTONE M2 FORENSIC RE-AUDIT SUITE (FIX VERIFICATION)");
console.log("=================================================\n");

const rootPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';
const assetsPath = 'C:\\VibeCode\\Hangeul Valley\\assets\\game.js';

let auditFailed = false;
let totalViolations = 0;

// Step 1: Syntax Checks
console.log("--- Step 1: Syntax Validation ---");
try {
  execSync(`node -c "${rootPath}"`);
  console.log("PASS: root game.js syntax check passed.");
} catch (e) {
  console.error("FAIL: root game.js has syntax errors!", e.message);
  auditFailed = true;
  totalViolations++;
}

try {
  execSync(`node -c "${assetsPath}"`);
  console.log("PASS: assets/game.js syntax check passed.");
} catch (e) {
  console.error("FAIL: assets/game.js has syntax errors!", e.message);
  auditFailed = true;
  totalViolations++;
}

// Step 2: Sync Validation
console.log("\n--- Step 2: Root ↔ Assets Sync Validation ---");
const rootContent = fs.readFileSync(rootPath, 'utf8');
const assetsContent = fs.readFileSync(assetsPath, 'utf8');

if (rootContent === assetsContent) {
  console.log(`PASS: game.js and assets/game.js are 100% byte-for-byte identical (${rootContent.length} bytes).`);
} else {
  console.error(`FAIL: game.js (${rootContent.length} bytes) and assets/game.js (${assetsContent.length} bytes) differ!`);
  auditFailed = true;
  totalViolations++;
}

// Step 3: Duplicate Method Check
console.log("\n--- Step 3: Duplicate Method Check ---");
const countArcade = (rootContent.match(/static\s+_genArcadeTextures\s*\(/g) || []).length;
const countDungeon = (rootContent.match(/static\s+_genDungeonTextures\s*\(/g) || []).length;

console.log(`- static _genArcadeTextures count: ${countArcade} (Expected: 1)`);
if (countArcade !== 1) {
  console.error(`FAIL: _genArcadeTextures found ${countArcade} times!`);
  auditFailed = true;
  totalViolations++;
} else {
  console.log("PASS: _genArcadeTextures occurs exactly once.");
}

console.log(`- static _genDungeonTextures count: ${countDungeon} (Expected: 1)`);
if (countDungeon !== 1) {
  console.error(`FAIL: _genDungeonTextures found ${countDungeon} times!`);
  auditFailed = true;
  totalViolations++;
} else {
  console.log("PASS: _genDungeonTextures occurs exactly once.");
}

// Step 4: Specific Token Remediation Inspection in source code
console.log("\n--- Step 4: Palette Token Remediation Code Inspection ---");
// Check P_SHIP for 'D'
const shipPaletteMatch = rootContent.match(/const P_SHIP = \{([^}]+)\};/s);
if (shipPaletteMatch) {
  const pShipBody = shipPaletteMatch[1];
  console.log("P_SHIP body snippet:", pShipBody.replace(/\s+/g, ' '));
  if (/'D'\s*:\s*0x[0-9A-Fa-f]+/.test(pShipBody)) {
    console.log("PASS: Token 'D' is explicitly defined in P_SHIP.");
  } else {
    console.error("FAIL: Token 'D' is NOT defined in P_SHIP!");
    auditFailed = true;
    totalViolations++;
  }
} else {
  console.error("FAIL: Could not locate P_SHIP object in game.js");
  auditFailed = true;
  totalViolations++;
}

// Check P_DUNGEON_BOSS for 'B' and 'M'
const bossPaletteMatch = rootContent.match(/const P_DUNGEON_BOSS = \{([^}]+)\};/s);
if (bossPaletteMatch) {
  const pBossBody = bossPaletteMatch[1];
  console.log("P_DUNGEON_BOSS body snippet:", pBossBody.replace(/\s+/g, ' '));
  const hasB = /'B'\s*:\s*0x[0-9A-Fa-f]+/.test(pBossBody);
  const hasM = /'M'\s*:\s*0x[0-9A-Fa-f]+/.test(pBossBody);
  if (hasB && hasM) {
    console.log("PASS: Tokens 'B' and 'M' are explicitly defined in P_DUNGEON_BOSS.");
  } else {
    console.error(`FAIL: Tokens missing in P_DUNGEON_BOSS! 'B' present: ${hasB}, 'M' present: ${hasM}`);
    auditFailed = true;
    totalViolations++;
  }
} else {
  console.error("FAIL: Could not locate P_DUNGEON_BOSS object in game.js");
  auditFailed = true;
  totalViolations++;
}

// Step 5: Matrix Execution & Pixel Art Verification via VM
console.log("\n--- Step 5: Matrix Execution & Pixel Art Forensic Audit (18 Sprites) ---");

const context = {
  console: console,
  Phaser: { Textures: { FilterMode: { NEAREST: 1 } } }
};
vm.createContext(context);

const classStartIndex = rootContent.indexOf('class PixelArtRenderer {');
const classEndIndex = rootContent.indexOf('\nconst K = {', classStartIndex);
const pixelArtRendererCode = rootContent.substring(classStartIndex, classEndIndex);

const PixelArtRenderer = vm.runInContext(pixelArtRendererCode + '\nPixelArtRenderer;', context);

if (!PixelArtRenderer) {
  console.error("FAIL: Could not load PixelArtRenderer from VM context!");
  process.exit(1);
}

const capturedData = {};
const testScene = {
  make: { graphics: () => ({ fillStyle:()=>{}, fillRect:()=>{}, generateTexture:()=>{}, destroy:()=>{} }) },
  textures: { exists: ()=>false, remove: ()=>{}, get: ()=>({ setFilter: ()=>{} }) }
};

const origCreate = PixelArtRenderer.createTexture;
PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width, height, ps) {
  capturedData[key] = { matrix, palette, width, height, ps };
  return origCreate.call(this, scene, key, matrix, palette, width, height, ps);
};

try {
  PixelArtRenderer._genArcadeTextures(testScene);
  PixelArtRenderer._genDungeonTextures(testScene);
} catch (e) {
  console.error("FAIL: Error executing texture generators in VM:", e);
  auditFailed = true;
  totalViolations++;
}

const expectedKeys = [
  'arcade_player_ship', 'alien_scout', 'alien_shooter', 'alien_elite',
  'alien_boss', 'laser_player', 'powerup_weapon', 'powerup_shield', 'powerup_nuke',
  'dungeon_green_slime', 'dungeon_skeleton_archer', 'dungeon_goblin_warrior',
  'dungeon_boss', 'loot_chest', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_scroll'
];

console.log(`Captured ${Object.keys(capturedData).length} textures from VM execution.`);

expectedKeys.forEach(key => {
  const data = capturedData[key];
  if (!data) {
    console.error(`[VIOLATION] Key '${key}' was not generated!`);
    auditFailed = true;
    totalViolations++;
    return;
  }

  const { matrix, palette } = data;
  console.log(`\n=== SPRITE: '${key}' ===`);

  // 1. Matrix row count
  if (matrix.length !== 16) {
    console.error(`  [VIOLATION] Row count is ${matrix.length}, expected 16!`);
    auditFailed = true;
    totalViolations++;
  } else {
    console.log(`  - Row count: 16 (PASS)`);
  }

  // 2. Matrix row widths
  let invalidRows = 0;
  matrix.forEach((row, idx) => {
    if (row.length !== 16) {
      console.error(`  [VIOLATION] Row ${idx} length is ${row.length}, expected 16! Content: "${row}"`);
      invalidRows++;
    }
  });
  if (invalidRows === 0) {
    console.log(`  - Row widths: ALL 16 rows have EXACTLY 16 characters (PASS)`);
  } else {
    auditFailed = true;
    totalViolations += invalidRows;
  }

  // 3. Dark slate outline check ('K' = 0x0F172A)
  const hasDarkSlate = palette['K'] === 0x0F172A;
  if (!hasDarkSlate) {
    console.error(`  [VIOLATION] Palette 'K' is ${palette['K'] ? '0x' + palette['K'].toString(16) : 'undefined'}, expected 0x0F172A!`);
    auditFailed = true;
    totalViolations++;
  } else {
    console.log(`  - Dark slate outline ('K' = 0x0F172A): PASS`);
  }

  // 4. Token validation in matrix
  let unmappedTokens = 0;
  const tokenCounts = {};
  matrix.forEach(row => {
    for (let char of row) {
      tokenCounts[char] = (tokenCounts[char] || 0) + 1;
      if (char !== '.' && palette[char] === undefined) {
        console.error(`  [VIOLATION] Matrix contains unmapped token '${char}'!`);
        unmappedTokens++;
      }
    }
  });
  if (unmappedTokens === 0) {
    console.log(`  - Token palette mapping: ALL tokens mapped (PASS)`);
  } else {
    auditFailed = true;
    totalViolations += unmappedTokens;
  }

  // 5. Authentic pixel art density & multi-tone shading check
  const totalPixels = 16 * 16;
  const nonBlankPixels = totalPixels - (tokenCounts['.'] || 0);
  const uniqueTokensUsed = Object.keys(tokenCounts).filter(t => t !== '.');
  console.log(`  - Non-blank pixels: ${nonBlankPixels} / 256 (${((nonBlankPixels/256)*100).toFixed(1)}% density)`);
  console.log(`  - Color tones used: ${uniqueTokensUsed.length} (Tokens: ${uniqueTokensUsed.join(', ')})`);

  if (nonBlankPixels < 20) {
    console.error(`  [VIOLATION] Facade/empty matrix detected! Only ${nonBlankPixels} pixels.`);
    auditFailed = true;
    totalViolations++;
  }
  if (uniqueTokensUsed.length < 3) {
    console.error(`  [VIOLATION] Monochromatic/trivial sprite! Only ${uniqueTokensUsed.length} color tones.`);
    auditFailed = true;
    totalViolations++;
  }
});

// Step 6: Code Integrity & Cheat Code Analysis
console.log("\n--- Step 6: Code Integrity & Prohibited Pattern Audit ---");

const cheatKeywords = ['cheat', 'godmode', 'skipLevel', 'unlockAll', 'passTest', 'mockPass'];
let cheatFound = false;
cheatKeywords.forEach(kw => {
  if (rootContent.toLowerCase().includes(kw.toLowerCase())) {
    console.error(`[VIOLATION] Codebase contains prohibited keyword: '${kw}'`);
    cheatFound = true;
    totalViolations++;
  }
});
if (!cheatFound) {
  console.log("PASS: Zero cheat codes, bypasses, or hardcoded test overrides detected.");
}

// Summary
console.log("\n=================================================");
console.log(`TOTAL FORENSIC AUDIT VIOLATIONS DETECTED: ${totalViolations}`);
console.log(`AUDIT VERDICT: ${totalViolations === 0 ? 'CLEAN 🟢' : 'INTEGRITY VIOLATION 🔴'}`);
console.log("=================================================");

process.exit(totalViolations === 0 ? 0 : 1);
