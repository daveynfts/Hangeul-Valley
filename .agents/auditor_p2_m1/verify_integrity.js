const fs = require('fs');
const path = require('path');

const gameJsPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';
const assetsGameJsPath = 'C:\\VibeCode\\Hangeul Valley\\assets\\game.js';

console.log('=== FORENSIC INTEGRITY AUDIT SCRIPT ===');

// 1. Check file mismatch
const gameJsBuf = fs.readFileSync(gameJsPath);
const assetsGameJsBuf = fs.readFileSync(assetsGameJsPath);
const isSynced = gameJsBuf.equals(assetsGameJsBuf);
console.log('Check 1 - File Hash Sync game.js vs assets/game.js:', isSynced ? 'MATCH (PASS)' : 'MISMATCH (FAIL)');

const content = gameJsBuf.toString('utf8');

// 2. Check for multi-character tokens or malformed matrix rows in PixelArtRenderer & texture generation
// We will parse all matrix arrays defined in game.js.
// Matrices are arrays of strings passed to drawMatrix, createTexture, or defined in objects/vars.

let matrixErrors = [];
let matrixCount = 0;

// Regular expression to find arrays of strings that look like matrix definitions
// e.g. [ '...', '...' ]
const lines = content.split('\n');

// Let's also check for palette key length and matrix row string lengths & elements.
// Let's find all palette objects defined in game.js
let palettes = [];
let paletteMatches = content.matchAll(/(?:PALETTE|palette|Palette)\s*=\s*\{([^}]+)\}/g);
for (const match of paletteMatches) {
  const body = match[1];
  const keys = body.match(/['"]?([^'":\s]+)['"]?\s*:/g);
  if (keys) {
    keys.forEach(k => {
      const cleanKey = k.replace(/['":\s]/g, '');
      if (cleanKey.length > 1 && cleanKey !== 'null' && cleanKey !== 'undefined') {
        // Check if multi-character key in palette!
        // Note: some property names in JS objects like 'wizCrystalHighlight' are palette color definitions in STARDEW_PALETTE object (e.g. STARDEW_PALETTE.strawHat = 0xD4AA63).
        // But in matrix lookup palettes (e.g. { '.': null, 'K': 0x0F172A }), matrix char lookups must be single characters!
      }
    });
  }
}

// Let's scan all arrays of string literals in game.js to check for matrix row consistency and character length
// A matrix row in string format should be a string of characters (or an array of single-char tokens).
// If an array contains string items where individual items represent tokens (e.g., ['Wood', 'Metal']), item.length would be > 1.
// If an array is a list of row strings (e.g., ['GGGG', 'GGGG']), each element is a row string where row[rx] is a single char.

let stringArrayRegex = /\[\s*(?:'[^']*'|"[^"]*")(?:\s*,\s*(?:'[^']*'|"[^"]*"))*\s*\]/g;
let stringArrays = content.match(stringArrayRegex) || [];

console.log(`Scanned ${stringArrays.length} string arrays in game.js`);

// Let's specifically inspect all calls to drawMatrix, createTexture, drawTileMatrix, etc.
// Let's extract all calls to PixelArtRenderer or texture generators

let drawMatrixCalls = 0;
let invalidRowLengths = [];
let multiCharTokens = [];

// Parse AST or tokenize matrix literals in game.js
// Let's inspect matrix arrays inside function bodies of PixelArtRenderer methods.

// 3. Check for fake / facade / dummy implementations or hardcoded shortcuts
let facadeCheckResults = [];

// Look for functions returning constants, empty functions, raise NotImplemented, or hardcoded pass answers in quiz/game logic
const fnMatches = content.matchAll(/function\s*([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{([^}]*)\}/g);
for (const m of fnMatches) {
  const name = m[1];
  const body = m[3].trim();
  if (body === '' || body === 'return true;' || body === 'return false;' || body.startsWith('return ') && body.length < 25) {
    facadeCheckResults.push({ type: 'short_function', name, body });
  }
}

// Check for quiz shortcuts (e.g., always returning correct answer, hardcoded correct = true, bypassing vocabulary checks)
const quizShortcuts = [];
lines.forEach((line, idx) => {
  if (line.includes('bypass') || line.includes('autoPass') || line.includes('forceSuccess') || line.includes('SKIP_QUIZ') || line.includes('CHEAT')) {
    quizShortcuts.push({ line: idx + 1, content: line.trim() });
  }
});

console.log('Quiz / Cheat shortcut keywords count:', quizShortcuts.length);
if (quizShortcuts.length > 0) {
  console.log('Found potential shortcuts:', quizShortcuts);
}

// 4. Check for texture generation routines - verify all texture generator methods actually draw genuine pixel art
const genMethodNames = [
  '_genPlayerTextures',
  '_genNpcTextures',
  '_genCropAndTreeTextures',
  '_genFishingTextures',
  '_genArcadeTextures',
  '_genDungeonTextures',
  'generateTilemapTextures',
  '_genParticleTextures',
  '_genLightingTextures',
  '_genParallaxTextures',
  '_genWaterTextures'
];

let dummyGenMethods = [];
genMethodNames.forEach(method => {
  const idx = content.indexOf(method);
  if (idx === -1) {
    dummyGenMethods.push({ method, status: 'MISSING' });
  } else {
    // extract method block
    const sub = content.substring(idx, idx + 1000);
    if (sub.includes('return;') || sub.includes('// TODO') || sub.length < 50) {
      dummyGenMethods.push({ method, status: 'STUBBED/EMPTY' });
    }
  }
});

console.log('Texture Generator Method Status:', dummyGenMethods.length === 0 ? 'ALL PRESENT & NON-EMPTY' : dummyGenMethods);

