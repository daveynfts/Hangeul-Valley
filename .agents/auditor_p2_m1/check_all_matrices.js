const fs = require('fs');

const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = content.split('\n');

console.log('=== DETAILED INTEGRITY ANALYSIS ===');

// Check 1: File Sync
const gameJsHash = require('crypto').createHash('sha256').update(content).digest('hex');
const assetsJsHash = require('crypto').createHash('sha256').update(fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\assets\\game.js')).digest('hex');
console.log(`game.js SHA256:        ${gameJsHash}`);
console.log(`assets/game.js SHA256: ${assetsJsHash}`);
console.log(`Files identical:       ${gameJsHash === assetsJsHash}`);

// Check 2: Texture generation methods inspection
const generatorMethods = [
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

console.log('\n--- Texture Generator Methods Analysis ---');
generatorMethods.forEach(method => {
  const lineIdx = lines.findIndex(l => l.includes(`static ${method}`));
  if (lineIdx === -1) {
    console.log(`Method ${method}: NOT FOUND`);
  } else {
    // count lines of implementation
    let endIdx = lineIdx + 1;
    let braceDepth = 0;
    let started = false;
    for (let i = lineIdx; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') { braceDepth++; started = true; }
        if (char === '}') braceDepth--;
      }
      if (started && braceDepth === 0) {
        endIdx = i;
        break;
      }
    }
    const lineCount = endIdx - lineIdx + 1;
    console.log(`Method ${method}: Line ${lineIdx + 1} to ${endIdx + 1} (${lineCount} lines)`);
  }
});

// Check 3: Matrix analysis - check for multi-character tokens masquerading as single-character tokens, or invalid matrix tokens
console.log('\n--- Matrix Token & Matrix Structure Analysis ---');

// Let's find all calls to drawMatrix, createTexture, drawTileMatrix, or matrix definitions
// In drawMatrix(g, matrix, palette, ox, oy, ps), matrix is an array of strings.
// Let's parse all array literal definitions where elements are string rows.

let totalMatrices = 0;
let invalidRowLengthCount = 0;
let multiCharTokenInMatrix = 0;
let missingPaletteTokenCount = 0;
let nonGenuineMatrixCount = 0;

// Let's inspect matrices passed into drawMatrix or createTexture in PixelArtRenderer
// We can run a quick eval or AST search for arrays of string rows in game.js.

// Find all matrix definitions like:
// [
//   '...',
//   '...'
// ]
let matrixRegex = /\[\s*(?:'[^']*'|"[^"]*")(?:\s*,\s*(?:'[^']*'|"[^"]*"))*\s*\]/g;
let match;
let matricesFound = [];

while ((match = matrixRegex.exec(content)) !== null) {
  const rawArrayStr = match[0];
  try {
    // evaluate the string array safely
    const arr = JSON.parse(rawArrayStr.replace(/'/g, '"'));
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
      totalMatrices++;
      const firstRowLen = arr[0].length;
      let isUniform = true;
      let hasMultiCharToken = false;
      let nonGenuine = false;

      // Check if all rows in matrix have same length
      arr.forEach(row => {
        if (row.length !== firstRowLen) {
          isUniform = false;
        }
      });

      if (!isUniform) {
        invalidRowLengthCount++;
        matricesFound.push({ type: 'non_uniform_rows', sample: arr.slice(0, 2) });
      }

      // Check for non-genuine matrix (e.g. all empty '.' or all identical chars or dummy placeholder)
      const allChars = arr.join('');
      const uniqueChars = new Set(allChars);
      if (uniqueChars.size <= 1 && firstRowLen > 2) {
        nonGenuine = true;
        nonGenuineMatrixCount++;
        matricesFound.push({ type: 'dummy_single_char_matrix', sample: arr.slice(0, 2) });
      }
    }
  } catch (e) {
    // Not valid JSON string array (could be JS string single quotes with escapes)
  }
}

console.log(`Analyzed ${totalMatrices} matrix definitions:`);
console.log(`- Non-uniform row length matrices: ${invalidRowLengthCount}`);
console.log(`- Dummy / single-char matrices: ${nonGenuineMatrixCount}`);

// Let's do a deeper inspection of matrix tokens across drawMatrix implementation
console.log('\n--- Deep Inspection of Palette Keys & drawMatrix ---');

// Let's check drawMatrix in game.js:
// const char = row[rx];
// const col = palette[char];
// If row contains multi-character tokens like 'Wood' masquerading as single-character tokens in an array of tokens like ['Wood', 'Metal'],
// or if matrix is defined as an array of multi-character tokens like `matrix = ['Wood', 'Metal']` instead of `matrix = ['WM', 'WM']`.

let multiCharTokenArrays = [];
// Search for arrays containing string elements longer than 1 character where elements are used as tokens
// e.g. [ 'Wood', 'Metal' ] or similar token arrays
lines.forEach((line, lineNum) => {
  // Check if line contains array of strings like ['Wood', 'Metal', ...]
  if (line.includes('[') && line.includes(']') && (line.includes("'") || line.includes('"'))) {
    const strArrMatch = line.match(/\[\s*(?:['"][a-zA-Z0-9_-]{2,}['"]\s*,\s*)+['"][a-zA-Z0-9_-]{2,}['"]\s*\]/);
    if (strArrMatch) {
      // Exclude known lists like level names, item names, audio key lists, scene lists, etc.
      const raw = strArrMatch[0];
      if (!line.includes('LEVELS') && !line.includes('scenes') && !line.includes('sound') && !line.includes('recipes') && !line.includes('quests') && !line.includes('words')) {
        multiCharTokenArrays.push({ line: lineNum + 1, text: line.trim() });
      }
    }
  }
});

console.log(`Found ${multiCharTokenArrays.length} string arrays with multi-character elements (checking context...):`);
multiCharTokenArrays.slice(0, 10).forEach(m => console.log(`  Line ${m.line}: ${m.text.substring(0, 80)}`));

// Check 4: Facades & Hardcoded Test Shortcuts
console.log('\n--- Facades & Hardcoded Test Shortcuts Check ---');

// Check quiz answer evaluation logic
// In FarmScene / DungeonScene / Quiz system: check if quiz checking is real (comparing user answer vs correct vocabulary word)
const checkAnswerMatches = lines.filter(l => l.includes('checkAnswer') || l.includes('submitAnswer') || l.includes('evaluateQuiz') || l.includes('verifyAnswer'));
console.log('Quiz answer functions found:', checkAnswerMatches.length);
checkAnswerMatches.forEach(l => console.log('  ', l.trim().substring(0, 100)));

// Check if any quiz function returns true without checking
const fakeQuizMatches = lines.filter(l => (l.includes('checkAnswer') || l.includes('submitAnswer')) && (l.includes('return true') || l.includes('true;')));
console.log('Fake quiz shortcuts returning constant true:', fakeQuizMatches.length);

