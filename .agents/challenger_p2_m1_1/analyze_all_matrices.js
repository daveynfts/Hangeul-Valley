const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Function extraction helper
function getFunctionBody(funcName) {
  const idx = gameJs.indexOf(funcName);
  if (idx === -1) return null;
  const startBrace = gameJs.indexOf('{', idx);
  if (startBrace === -1) return null;
  let depth = 1;
  let end = startBrace + 1;
  while (end < gameJs.length && depth > 0) {
    if (gameJs[end] === '{') depth++;
    else if (gameJs[end] === '}') depth--;
    end++;
  }
  return { name: funcName, body: gameJs.substring(idx, end), start: idx, end };
}

// Find all functions related to tilemap, decor, fishing
const fnNames = [
  'generateTilemapTextures',
  '_genFishingTextures',
  '_genDecorTextures',
  'generateDecorTextures',
  '_genCropAndTreeTextures',
  '_genArcadeTextures',
  '_genDungeonTextures',
  '_genPlayerTextures',
  '_genNpcTextures',
  'PixelArtRenderer'
];

// Search for any function with "Tilemap", "Decor", "Fishing", "Decor" in its name in gameJs
const allFnMatches = [...gameJs.matchAll(/(?:static\s+)?(?:function\s+)?([A-Za-z0-9_]*(?:Tilemap|Decor|Fishing)[A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/g)];
console.log('All matched function names:', [...new Set(allFnMatches.map(m => m[1]))]);

// Extract matrix arrays in a piece of code:
// A matrix array is an array literal containing only strings (lines of characters)
function extractMatricesFromCode(code, label) {
  const matrices = [];
  // Regex to match string array literals: [ '...', '...' ]
  // Match `[` followed by string literals separated by commas/newlines, followed by `]`
  const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
  let match;
  while ((match = arrayRegex.exec(code)) !== null) {
    const str = match[0];
    try {
      // Evaluate string array
      const arr = new Function('return ' + str)();
      if (Array.isArray(arr) && arr.every(item => typeof item === 'string')) {
        // Find line number in original file or code snippet
        const lineOffset = code.substring(0, match.index).split('\n').length;
        matrices.push({
          label,
          snippetLine: lineOffset,
          arrayLength: arr.length,
          rows: arr
        });
      }
    } catch (e) {
      // Not a valid array of strings
    }
  }
  return matrices;
}

const functionsToScan = [...new Set(allFnMatches.map(m => m[1]))];
if (!functionsToScan.includes('generateTilemapTextures')) functionsToScan.push('generateTilemapTextures');
if (!functionsToScan.includes('_genFishingTextures')) functionsToScan.push('_genFishingTextures');

console.log('\n--- SCANNING FUNCTIONS ---');
for (const name of functionsToScan) {
  const fnInfo = getFunctionBody(name);
  if (!fnInfo) {
    console.log(`Function ${name} not found!`);
    continue;
  }
  const matrices = extractMatricesFromCode(fnInfo.body, name);
  console.log(`\nFunction ${name}: found ${matrices.length} matrices.`);
  for (let i = 0; i < matrices.length; i++) {
    const m = matrices[i];
    const arrayLen = m.arrayLength;
    let hasError = false;
    m.rows.forEach((row, rIdx) => {
      if (row.length !== arrayLen) {
        hasError = true;
        console.log(`  [FAIL] Matrix #${i+1} in ${name} (around line ${m.snippetLine}): row ${rIdx+1} length is ${row.length}, expected ${arrayLen}. Row content: "${row}"`);
      }
    });
    if (!hasError) {
      console.log(`  [PASS] Matrix #${i+1} in ${name}: all ${arrayLen} rows have length ${arrayLen}.`);
    }
  }
}
