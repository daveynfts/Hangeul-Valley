const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

const rootDir = 'C:\\VibeCode\\Hangeul Valley';
const gameJsPath = path.join(rootDir, 'game.js');
const assetsGameJsPath = path.join(rootDir, 'assets', 'game.js');

console.log("==================================================================");
console.log(" EMPIRICAL VERIFICATION SUITE — MILESTONE M1 ITERATION 2");
console.log("==================================================================\n");

let overallPass = true;
const testResults = [];

function recordResult(testName, passed, details) {
  testResults.push({ testName, passed, details });
  if (!passed) overallPass = false;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}`);
  if (details) console.log(`  Details:\n${details}`);
}

// ------------------------------------------------------------------
// 1a. SYNTAX CHECK (node -c game.js & node -c assets/game.js)
// ------------------------------------------------------------------
try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  recordResult("1a. Syntax Check: game.js", true, "  node -c exited with code 0");
} catch (e) {
  recordResult("1a. Syntax Check: game.js", false, e.stderr ? e.stderr.toString() : e.message);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  recordResult("1a. Syntax Check: assets/game.js", true, "  node -c exited with code 0");
} catch (e) {
  recordResult("1a. Syntax Check: assets/game.js", false, e.stderr ? e.stderr.toString() : e.message);
}

// ------------------------------------------------------------------
// 1b. FILE SYNC / 100% STRING EQUALITY
// ------------------------------------------------------------------
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath, 'utf8');

if (gameJsContent === assetsGameJsContent) {
  recordResult("1b. File Sync: 100% String Equality", true, `  Both files identical (${gameJsContent.length} bytes / ${gameJsContent.split('\n').length} lines)`);
} else {
  recordResult("1b. File Sync: 100% String Equality", false, `  File contents differ! game.js size: ${gameJsContent.length}, assets/game.js size: ${assetsGameJsContent.length}`);
}

// ------------------------------------------------------------------
// DYNAMIC VM SETUP & INTERCEPTION
// ------------------------------------------------------------------
const dummyElement = {
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  setAttribute: () => {},
  removeAttribute: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {} }
};

const mockWindow = {
  AudioContext: class {},
  webkitAudioContext: class {},
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {
    createElement: () => dummyElement,
    getElementById: () => dummyElement,
    querySelector: () => dummyElement,
    querySelectorAll: () => [],
    body: dummyElement
  },
  localStorage: { getItem: () => null, setItem: () => {} }
};

const mockPhaser = {
  Textures: { FilterMode: { NEAREST: 1 } },
  Scale: { RESIZE: 0, CENTER_BOTH: 0 },
  Scene: class {}, Game: class {}, AUTO: 0
};

const sandbox = {
  window: mockWindow, document: mockWindow.document, localStorage: mockWindow.localStorage,
  AudioContext: mockWindow.AudioContext, webkitAudioContext: mockWindow.webkitAudioContext,
  Phaser: mockPhaser, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval
};

sandbox.global = sandbox; sandbox.window.window = mockWindow;
vm.createContext(sandbox);

const scriptToRun = gameJsContent + "\nwindow.PixelArtRenderer = PixelArtRenderer;\n";
vm.runInContext(scriptToRun, sandbox);

const PixelArtRenderer = sandbox.window.PixelArtRenderer;

const mockGraphics = new Proxy({}, {
  get(target, prop) {
    if (prop === 'generateTexture' || prop === 'destroy') return () => {};
    return () => mockGraphics;
  }
});

const mockScene = {
  textures: { exists: () => false, remove: () => {}, get: () => ({ setFilter: () => {} }) },
  make: { graphics: () => mockGraphics },
  _pixelArtTexturesBaked: false, _tilemapTexturesGenerated: false
};

const capturedDraws = [];
const originalDrawMatrix = PixelArtRenderer.drawMatrix;

PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox, oy, ps) {
  const err = new Error();
  capturedDraws.push({
    matrix,
    palette,
    ox, oy, ps,
    stack: err.stack
  });
  return originalDrawMatrix.call(this, g, matrix, palette, ox, oy, ps);
};

// Execute all texture generation functions
PixelArtRenderer.generateAllTextures(mockScene);

// ------------------------------------------------------------------
// 1c. SINGLE-CHARACTER TOKEN CHECK (DYNAMIC & PALETTE INSPECTION)
// ------------------------------------------------------------------
let singleCharTokenErrors = [];
let checkedPalettesCount = 0;
const checkedPalettesSet = new Set();

capturedDraws.forEach((draw, drawIndex) => {
  const { matrix, palette, stack } = draw;
  
  if (palette && !checkedPalettesSet.has(palette)) {
    checkedPalettesSet.add(palette);
    checkedPalettesCount++;
    Object.keys(palette).forEach(key => {
      if (typeof key !== 'string' || key.length !== 1) {
        singleCharTokenErrors.push(`Draw #${drawIndex + 1} palette contains invalid key: "${key}" (length ${key.length})`);
      }
    });
  }

  matrix.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const char = row[colIndex];
      // Every character token in matrix row must be 1 char
      if (char.length !== 1) {
        singleCharTokenErrors.push(`Draw #${drawIndex + 1} Row ${rowIndex} Col ${colIndex} has multi-character token: "${char}"`);
      }
      // Token must exist in palette or be standard '.' / ' '
      if (char !== '.' && char !== ' ' && palette) {
        if (palette[char] === undefined) {
          const loc = stack.split('\n')[2] ? stack.split('\n')[2].trim() : 'unknown';
          singleCharTokenErrors.push(`Draw #${drawIndex + 1} Row ${rowIndex} Col ${colIndex}: token '${char}' missing from palette. Location: ${loc}`);
        }
      }
    }
  });
});

if (singleCharTokenErrors.length === 0) {
  recordResult("1c. Single-Character Token Check", true, `  Validated all tokens across ${checkedPalettesCount} unique palettes and ${capturedDraws.length} matrices. Zero invalid tokens.`);
} else {
  recordResult("1c. Single-Character Token Check", false, `  Found ${singleCharTokenErrors.length} token errors:\n    ` + singleCharTokenErrors.join('\n    '));
}

// ------------------------------------------------------------------
// 1d. MATRIX ROW WIDTH CHECK
// ------------------------------------------------------------------
let matrixWidthErrors = [];

capturedDraws.forEach((draw, drawIndex) => {
  const { matrix, stack } = draw;
  if (!Array.isArray(matrix) || matrix.length === 0) {
    matrixWidthErrors.push(`Draw #${drawIndex + 1}: matrix is not a valid non-empty array`);
    return;
  }
  const expectedWidth = matrix[0].length;
  matrix.forEach((row, rowIndex) => {
    if (typeof row !== 'string') {
      matrixWidthErrors.push(`Draw #${drawIndex + 1} Row ${rowIndex}: row is not a string`);
    } else if (row.length !== expectedWidth) {
      const loc = stack.split('\n')[2] ? stack.split('\n')[2].trim() : 'unknown';
      matrixWidthErrors.push(`Draw #${drawIndex + 1} Row ${rowIndex}: length ${row.length} != expected width ${expectedWidth} (row content: "${row}"). Location: ${loc}`);
    }
  });
});

if (matrixWidthErrors.length === 0) {
  recordResult("1d. Matrix Row Width Check", true, `  Validated ${capturedDraws.length} matrices dynamically. 100% of rows match their matrix grid width.`);
} else {
  recordResult("1d. Matrix Row Width Check", false, `  Found ${matrixWidthErrors.length} matrix width errors:\n    ` + matrixWidthErrors.join('\n    '));
}

// ------------------------------------------------------------------
// FINAL SUMMARY
// ------------------------------------------------------------------
console.log("\n==================================================================");
console.log(` VERDICT: ${overallPass ? 'PASS' : 'FAIL'}`);
console.log("==================================================================");

process.exit(overallPass ? 0 : 1);
