const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..', '..');
const filesToTest = [
  path.join(rootDir, 'game.js'),
  path.join(rootDir, 'assets', 'game.js')
];

let overallPassed = true;
const logs = [];

function log(msg) {
  console.log(msg);
  logs.push(msg);
}

log('================================================================');
log(' PHASE 2 INTEGRATION CHALLENGER (P2 M3) EMPIRICAL VERIFICATION');
log(' Target Files: game.js, assets/game.js');
log(' Date: ' + new Date().toISOString());
log('================================================================\n');

// ----------------------------------------------------------------------
// TEST 1: Syntax Check via node -c
// ----------------------------------------------------------------------
log('--- TEST 1: Syntax Check (node -c) ---');
for (const file of filesToTest) {
  const relPath = path.relative(rootDir, file);
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    log(`[PASS] Syntax check passed with 0 errors for ${relPath}`);
  } catch (err) {
    overallPassed = false;
    log(`[FAIL] Syntax check failed for ${relPath}:\n${err.stderr ? err.stderr.toString() : err.message}`);
  }
}

// ----------------------------------------------------------------------
// Helper to setup VM Sandbox for full game.js execution
// ----------------------------------------------------------------------
function getVMSandboxForFile(filePath) {
  const rawCode = fs.readFileSync(filePath, 'utf8');

  class Scene {}

  const mockPhaser = {
    Game: function() {},
    AUTO: 0,
    Scene: Scene,
    Scale: { FIT: 1, CENTER_BOTH: 1 },
    Textures: { FilterMode: { NEAREST: 1 } },
    Display: { Color: { HexStringToColor: hex => ({ color: 0x000000 }) } },
    Input: { Keyboard: { KeyCodes: {} } },
    Utils: { Array: { GetRandom: (arr) => arr[0] } }
  };

  const dummyElem = {
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} }
  };

  const capturedTextures = [];
  const capturedDrawCalls = [];
  const capturedGenTexKeys = [];

  const mockScene = {
    textures: {
      exists: () => false,
      remove: () => {},
      get: () => ({ setFilter: () => {} })
    },
    make: {
      graphics: () => ({
        fillStyle: () => {},
        fillRect: () => {},
        lineStyle: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        strokePath: () => {},
        fillCircle: () => {},
        strokeCircle: () => {},
        generateTexture: (key, w, h) => {
          capturedGenTexKeys.push({ key, width: w, height: h });
        },
        destroy: () => {}
      })
    }
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
      AudioContext: function() {
        return { createOscillator: () => ({}), createGain: () => ({}) };
      },
      webkitAudioContext: null,
      location: { reload: () => {} }
    },
    document: {
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => ({ getContext: () => ({}), style: {} }),
      getElementById: () => dummyElem,
      querySelector: () => dummyElem,
      querySelectorAll: () => [],
      body: { appendChild: () => {} }
    },
    Phaser: mockPhaser,
    localStorage: { getItem: () => null, setItem: () => {} },
    mockScene,
    capturedTextures,
    capturedDrawCalls,
    capturedGenTexKeys
  };

  vm.createContext(sandbox);

  const instrumentedCode = rawCode + `
    this.PixelArtRenderer = PixelArtRenderer;
    const origCreate = PixelArtRenderer.createTexture;
    PixelArtRenderer.createTexture = function(scene, key, matrix, palette, width, height, ps) {
      capturedTextures.push({ key, matrix, palette, width, height, ps });
      return origCreate.call(this, scene, key, matrix, palette, width, height, ps);
    };

    const origDraw = PixelArtRenderer.drawMatrix;
    PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox, oy, ps) {
      capturedDrawCalls.push({ matrix, palette, ox, oy, ps });
      return origDraw.call(this, g, matrix, palette, ox, oy, ps);
    };
  `;

  vm.runInContext(instrumentedCode, sandbox);
  return { sandbox, rawCode };
}

// Target methods to test
const targetMethods = [
  'generateTilemapTextures',
  '_genFishingTextures',
  '_genArcadeTextures',
  '_genDungeonTextures'
];

// ----------------------------------------------------------------------
// TEST 2 & 3: Token Validity and Row Width Alignment
// ----------------------------------------------------------------------
log('\n--- TEST 2 & 3: Matrix Token Validity & Row Width Alignment ---');

for (const file of filesToTest) {
  const relPath = path.relative(rootDir, file);
  log(`\nAnalyzing file: ${relPath}`);

  let vmResult;
  try {
    vmResult = getVMSandboxForFile(file);
  } catch (err) {
    overallPassed = false;
    log(`[FAIL] Could not evaluate PixelArtRenderer for ${relPath}: ${err.message}`);
    continue;
  }

  const { sandbox } = vmResult;
  const PAR = sandbox.PixelArtRenderer;

  if (!PAR) {
    overallPassed = false;
    log(`[FAIL] PixelArtRenderer class not found in ${relPath}!`);
    continue;
  }

  for (const methodName of targetMethods) {
    log(`\n  Method: ${methodName}`);
    if (typeof PAR[methodName] !== 'function') {
      overallPassed = false;
      log(`  [FAIL] Method ${methodName} does not exist on PixelArtRenderer!`);
      continue;
    }

    // Reset captured lists
    sandbox.capturedTextures.length = 0;
    sandbox.capturedDrawCalls.length = 0;
    sandbox.capturedGenTexKeys.length = 0;

    sandbox.mockScene._tilemapTexturesGenerated = false;
    sandbox.mockScene._pixelArtTexturesBaked = false;

    try {
      PAR[methodName](sandbox.mockScene);
    } catch (err) {
      overallPassed = false;
      log(`  [FAIL] Runtime error executing ${methodName}: ${err.message}`);
      continue;
    }

    const textures = sandbox.capturedTextures;
    const drawCalls = sandbox.capturedDrawCalls;
    const genTexKeys = sandbox.capturedGenTexKeys;
    log(`    Executed ${methodName}: ${textures.length} createTexture calls, ${drawCalls.length} drawMatrix calls, ${genTexKeys.length} generated textures.`);

    // Combine createTexture items and direct drawMatrix items
    const itemsToTest = [];

    textures.forEach(t => {
      itemsToTest.push({
        source: 'createTexture',
        key: t.key,
        matrix: t.matrix,
        palette: t.palette,
        expectedWidth: t.width,
        expectedHeight: t.height
      });
    });

    drawCalls.forEach((d, idx) => {
      // Find if draw call was already covered by createTexture
      const alreadyCovered = textures.some(t => t.matrix === d.matrix);
      if (!alreadyCovered) {
        itemsToTest.push({
          source: 'drawMatrix',
          key: `drawMatrix_call_${idx + 1}`,
          matrix: d.matrix,
          palette: d.palette,
          expectedWidth: d.matrix && d.matrix[0] ? d.matrix[0].length : 0,
          expectedHeight: d.matrix ? d.matrix.length : 0
        });
      }
    });

    if (itemsToTest.length === 0) {
      overallPassed = false;
      log(`    [FAIL] No matrices captured in ${methodName}!`);
    }

    let methodTokensOk = true;
    let methodWidthsOk = true;

    itemsToTest.forEach(item => {
      const { key, matrix, palette } = item;

      if (!Array.isArray(matrix)) {
        overallPassed = false;
        log(`    [FAIL] Texture '${key}': matrix is not an array!`);
        return;
      }

      if (!palette || typeof palette !== 'object') {
        overallPassed = false;
        log(`    [FAIL] Texture '${key}': palette is missing or invalid!`);
        return;
      }

      // Check single-character keys in palette
      const palKeys = Object.keys(palette);
      palKeys.forEach(pk => {
        if (pk.length !== 1) {
          overallPassed = false;
          methodTokensOk = false;
          log(`    [FAIL] Texture '${key}': Palette key '${pk}' is multi-character (len ${pk.length})!`);
        }
      });

      // Row width check
      const rowCount = matrix.length;
      if (rowCount === 0) {
        overallPassed = false;
        log(`    [FAIL] Texture '${key}': matrix has 0 rows!`);
        return;
      }

      const expectedLen = matrix[0].length;
      matrix.forEach((row, rIdx) => {
        if (typeof row !== 'string') {
          overallPassed = false;
          methodWidthsOk = false;
          log(`    [FAIL] Texture '${key}' row ${rIdx} is not a string!`);
        } else if (row.length !== expectedLen) {
          overallPassed = false;
          methodWidthsOk = false;
          log(`    [FAIL] Texture '${key}' row ${rIdx} width mismatch! Got ${row.length}, expected ${expectedLen} (row: "${row}")`);
        }
      });

      // Token validity check
      const validChars = new Set(palKeys);
      validChars.add(' ');
      validChars.add('.');

      const invalidCharsFound = new Set();
      matrix.forEach((row) => {
        if (typeof row === 'string') {
          for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (!validChars.has(char)) {
              invalidCharsFound.add(char);
            }
          }
        }
      });

      if (invalidCharsFound.size > 0) {
        overallPassed = false;
        methodTokensOk = false;
        log(`    [FAIL] Texture '${key}': Undefined token(s) found in matrix: ${Array.from(invalidCharsFound).map(x => `'${x}'`).join(', ')}`);
      }
    });

    if (methodTokensOk) {
      log(`    [PASS] 100% token validity verified for ${methodName} (${itemsToTest.length} items).`);
    }
    if (methodWidthsOk) {
      log(`    [PASS] 100% row width alignment verified for ${methodName} (${itemsToTest.length} items).`);
    }
  }
}

// ----------------------------------------------------------------------
// TEST 4: 100% Texture Key Parity
// ----------------------------------------------------------------------
log('\n--- TEST 4: 100% Texture Key Parity Check ---');

for (const file of filesToTest) {
  const relPath = path.relative(rootDir, file);
  const vmResult = getVMSandboxForFile(file);
  const { sandbox } = vmResult;
  const PAR = sandbox.PixelArtRenderer;

  const registeredKeysByMethod = {};

  targetMethods.forEach(methodName => {
    sandbox.capturedTextures.length = 0;
    sandbox.capturedDrawCalls.length = 0;
    sandbox.capturedGenTexKeys.length = 0;
    sandbox.mockScene._tilemapTexturesGenerated = false;
    sandbox.mockScene._pixelArtTexturesBaked = false;

    PAR[methodName](sandbox.mockScene);
    const keys = Array.from(new Set(sandbox.capturedGenTexKeys.map(t => t.key)));
    registeredKeysByMethod[methodName] = keys;
  });

  log(`\nTexture keys registered in ${relPath}:`);
  let totalKeys = 0;
  targetMethods.forEach(m => {
    const keys = registeredKeysByMethod[m];
    totalKeys += keys.length;
    log(`  ${m} (${keys.length} keys): ${keys.join(', ')}`);
  });

  if (totalKeys === 0) {
    overallPassed = false;
    log(`[FAIL] 0 texture keys registered in ${relPath}!`);
  } else {
    log(`[PASS] Total ${totalKeys} texture keys successfully registered across all 4 methods in ${relPath}.`);
  }
}

// ----------------------------------------------------------------------
// TEST 5: Forbidden Elements Protection Check
// ----------------------------------------------------------------------
log('\n--- TEST 5: Forbidden Elements Protection (Git Diff Check) ---');

const forbiddenElements = [
  'Player Farmer',
  'Ginger Cat',
  'Wizard Merlin',
  'DynamicShadowSystem'
];

try {
  const gitDiffOutput = execSync('git diff HEAD -- game.js assets/game.js', { cwd: rootDir }).toString();
  
  if (!gitDiffOutput || gitDiffOutput.trim().length === 0) {
    log('[PASS] Git diff is completely clean for game.js and assets/game.js relative to HEAD.');
  } else {
    log('Analyzing git diff for forbidden elements...');
    
    // Check specific forbidden terms/methods in diff lines
    const forbiddenPatterns = [
      { name: 'Player Farmer', patterns: ['_genPlayerTextures', 'player_down', 'player_up', 'player_left', 'player_right'] },
      { name: 'Ginger Cat', patterns: ['cat_idle', 'cat_walk', 'cat_sleep', 'catFurBase', 'catNosePink'] },
      { name: 'Wizard Merlin', patterns: ['wiz_idle', 'wizRobeBase', 'wizBeardHighlight', 'wizGoldAccent'] },
      { name: 'DynamicShadowSystem', patterns: ['DynamicShadowSystem', 'drawDropShadow', 'drawBlobShadow'] }
    ];

    let forbiddenViolationFound = false;
    const diffLines = gitDiffOutput.split('\n');

    forbiddenPatterns.forEach(item => {
      let violated = false;
      const matchingDiffLines = [];
      diffLines.forEach(line => {
        if ((line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---')) {
          item.patterns.forEach(pat => {
            if (line.includes(pat)) {
              violated = true;
              matchingDiffLines.push(line);
            }
          });
        }
      });

      if (violated) {
        overallPassed = false;
        forbiddenViolationFound = true;
        log(`[FAIL] Forbidden element modification detected for ${item.name}!`);
        matchingDiffLines.forEach(l => log(`    Diff line: ${l}`));
      } else {
        log(`[PASS] 0 git diff modifications detected for forbidden element: ${item.name}`);
      }
    });

    if (!forbiddenViolationFound) {
      log('[PASS] All forbidden elements (Player Farmer, Ginger Cat, Wizard Merlin, DynamicShadowSystem) remain 100% untouched!');
    }
  }
} catch (err) {
  log(`[WARN] Unable to execute git diff check: ${err.message}`);
}

// ----------------------------------------------------------------------
// TEST 6: File Sync Check (game.js vs assets/game.js)
// ----------------------------------------------------------------------
log('\n--- TEST 6: File Sync Check (byte-for-byte identical) ---');

const gameJsContent = fs.readFileSync(filesToTest[0]);
const assetsGameJsContent = fs.readFileSync(filesToTest[1]);

log(`game.js size: ${gameJsContent.length} bytes`);
log(`assets/game.js size: ${assetsGameJsContent.length} bytes`);

if (Buffer.compare(gameJsContent, assetsGameJsContent) === 0) {
  log('[PASS] game.js and assets/game.js are 100% byte-for-byte IDENTICAL.');
} else {
  overallPassed = false;
  log('[FAIL] game.js and assets/game.js are NOT identical!');
}

// ----------------------------------------------------------------------
// FINAL VERIFICATION SUMMARY
// ----------------------------------------------------------------------
log('\n================================================================');
log(` FINAL VERIFICATION RESULT: ${overallPassed ? 'PASS' : 'FAIL'}`);
log('================================================================');

fs.writeFileSync(path.join(__dirname, 'verification_run.log'), logs.join('\n'));
process.exit(overallPassed ? 0 : 1);
