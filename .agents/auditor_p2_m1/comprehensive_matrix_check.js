const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== COMPREHENSIVE MATRIX & INTEGRITY AUDIT ===');

// Step 1: Find all static methods of PixelArtRenderer and verify they are all fully implemented
const methods = [
  'drawMatrix',
  'createTexture',
  'generateAllTextures',
  'generateTilemapTextures',
  '_genPlayerTextures',
  '_genNpcTextures',
  '_genCropAndTreeTextures',
  '_genFishingTextures',
  '_genArcadeTextures',
  '_genDungeonTextures',
  '_genParticleTextures',
  '_genLightingTextures',
  '_genParallaxTextures',
  '_genWaterTextures'
];

console.log('\n1. Checking PixelArtRenderer Texture Generation Methods:');
methods.forEach(m => {
  const hasDef = content.includes(`static ${m}(`);
  console.log(`- ${m}: ${hasDef ? 'IMPLEMENTED' : 'MISSING'}`);
});

// Step 2: Check all matrix array variables across all _gen methods in PixelArtRenderer
// We will extract all matrix arrays defined in game.js and validate row uniformness, palette coverage, and dimensions.

// Let's extract all palette maps defined in game.js to check palette character definitions
const paletteRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*\{([^}]+)\};/g;
let paletteMatch;
const palettes = {};

while ((paletteMatch = paletteRegex.exec(content)) !== null) {
  const pName = paletteMatch[1];
  const pBody = paletteMatch[2];
  if (pBody.includes(':') && (pName.includes('PALETTE') || pName === 'P' || pName === 'palette')) {
    const keys = [];
    const entries = pBody.split(',');
    entries.forEach(e => {
      const parts = e.split(':');
      if (parts.length >= 2) {
        const k = parts[0].trim().replace(/['"]/g, '');
        if (k) keys.push(k);
      }
    });
    palettes[pName] = keys;
  }
}

console.log('\n2. Palettes detected:', Object.keys(palettes));

// Check if any palette has multi-character keys intended for single-char lookup
let multiCharPaletteKeys = [];
Object.entries(palettes).forEach(([pName, keys]) => {
  keys.forEach(k => {
    if (k.length > 1 && pName === 'P') {
      multiCharPaletteKeys.push({ palette: pName, key: k });
    }
  });
});
console.log('Multi-char keys in matrix lookup palette P:', multiCharPaletteKeys);

// Step 3: Check all matrix definitions (arrays of strings)
// We will extract every array of string rows in game.js and verify:
// - Are all row lengths equal?
// - Do any characters in the row fail palette lookup or use multi-character tokens?

const stringArrayVarRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*\[\s*(?:\r?\n\s*)*['"]([^'"]+)['"]/g;
let varMatch;

let totalMatrixVars = 0;
let malformedMatrices = [];

const allLines = content.split('\n');

allLines.forEach((line, lineIdx) => {
  if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
    if (line.includes('= [') && (line.includes("'") || line.includes('"'))) {
      // Start of matrix definition
      totalMatrixVars++;
      // Collect lines of this matrix
      let rows = [];
      for (let j = lineIdx; j < allLines.length; j++) {
        const l = allLines[j].trim();
        const rMatch = l.match(/^['"]([^'"]+)['"]\s*,?$/) || l.match(/^\[\s*['"]([^'"]+)['"]\s*,?$/);
        if (rMatch) {
          rows.push({ line: j + 1, str: rMatch[1] });
        }
        if (l.endsWith('];') || l.endsWith(']') || l.includes(']);')) {
          break;
        }
      }

      if (rows.length >= 2) {
        const firstLen = rows[0].str.length;
        rows.forEach((r, idx) => {
          if (r.str.length !== firstLen) {
            malformedMatrices.push({
              line: r.line,
              matrixStartLine: lineIdx + 1,
              varName: line.split('=')[0].trim().split(' ').pop(),
              rowIndex: idx,
              expectedLen: firstLen,
              actualLen: r.str.length,
              str: r.str
            });
          }
        });
      }
    }
  }
});

console.log('\n3. Matrix Row Uniformity Audit Results:');
console.log(`Scanned matrix variables. Found ${malformedMatrices.length} row defects:`);
malformedMatrices.forEach(m => {
  console.log(`- Line ${m.line} (in var ${m.varName} starting at line ${m.matrixStartLine}): Row ${m.rowIndex + 1} has length ${m.actualLen}, expected ${m.expectedLen}. Content: "${m.str}"`);
});

// Step 4: Search for multi-character token usage masquerading as single-char tokens
console.log('\n4. Multi-character Token Audit:');
let multiCharTokensFound = [];
allLines.forEach((line, lineIdx) => {
  if (line.includes('drawMatrix(') || line.includes('createTexture(')) {
    // Check if arguments contain multi-char token arrays like ['Wood', 'Metal']
    if (line.includes("['") || line.includes('["')) {
      const match = line.match(/\[\s*['"]([^'"]+)['"]/);
      if (match && match[1].length > 1 && !match[1].startsWith('player_') && !match[1].startsWith('cat_')) {
        multiCharTokensFound.push({ line: lineIdx + 1, text: line.trim() });
      }
    }
  }
});
console.log(`Multi-character token arrays found in matrix calls: ${multiCharTokensFound.length}`);
multiCharTokensFound.forEach(m => console.log(`  Line ${m.line}: ${m.text}`));

// Step 5: Facade/Shortcut Check on Quiz & Gameplay logic
console.log('\n5. Gameplay & Quiz Facade / Hardcoded Shortcut Check:');
let shortcuts = [];
allLines.forEach((line, lineIdx) => {
  if (line.includes('// shortcut') || line.includes('// cheat') || line.includes('// dummy') || line.includes('// mock') || line.includes('// hardcoded') || line.includes('// TODO')) {
    shortcuts.push({ line: lineIdx + 1, text: line.trim() });
  }
});
console.log(`Comments containing shortcut/cheat/dummy/mock/hardcoded/TODO: ${shortcuts.length}`);
shortcuts.forEach(s => console.log(`  Line ${s.line}: ${s.text}`));

