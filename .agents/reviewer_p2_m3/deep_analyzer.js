const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== DEEP ANALYZER FOR PHASE 2 GRAPHICS REVIEW ===\n');

// 1. Extract static methods of PixelArtRenderer
const lines = code.split('\n');

function extractMethod(methodName) {
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`static ${methodName}(`)) {
      startLine = i;
      break;
    }
  }
  if (startLine === -1) return null;

  let depth = 0;
  let endLine = -1;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endLine = i;
          break;
        }
      }
    }
    if (endLine !== -1) break;
  }
  return {
    name: methodName,
    startLine: startLine + 1,
    endLine: endLine + 1,
    content: lines.slice(startLine, endLine + 1).join('\n')
  };
}

const methodsToAnalyze = [
  'generateTilemapTextures',
  '_genFishingTextures',
  '_genArcadeTextures',
  '_genDungeonTextures'
];

let totalMatricesAnalyzed = 0;
let rowLengthViolations = [];
let multiCharPaletteTokens = [];
let allGeneratedTexturesByMethod = {};

// Helper to analyze a code block for drawMatrix calls
function analyzeBlock(blockName, blockContent, baseLine) {
  const generatedKeys = [];
  
  // Find drawMatrix calls: PixelArtRenderer.drawMatrix(graphics, matrixArray, palette, x, y, scale)
  // or drawMatrix(graphics, matrixArray, palette, x, y, scale)
  
  // Let's parse drawMatrix calls by finding "drawMatrix("
  let searchIdx = 0;
  while (true) {
    let dmIdx = blockContent.indexOf('drawMatrix(', searchIdx);
    if (dmIdx === -1) break;
    
    // Find preceding line number roughly
    const subStr = blockContent.slice(0, dmIdx);
    const lineOffset = subStr.split('\n').length - 1;
    const currentLineNum = baseLine + lineOffset;

    // Find args of drawMatrix
    // We expect [ array_of_strings ], palette_object
    const openBracket = blockContent.indexOf('[', dmIdx);
    const closeBracket = blockContent.indexOf(']', openBracket);
    
    if (openBracket !== -1 && closeBracket !== -1 && openBracket < closeBracket) {
      totalMatricesAnalyzed++;
      const matrixStr = blockContent.slice(openBracket + 1, closeBracket);
      // Extract string rows
      const rowRegex = /'([^']*)'|"([^"]*)"/g;
      let m;
      let rows = [];
      while ((m = rowRegex.exec(matrixStr)) !== null) {
        rows.push(m[1] !== undefined ? m[1] : m[2]);
      }

      if (rows.length > 0) {
        const firstLen = rows[0].length;
        for (let r = 0; r < rows.length; r++) {
          if (rows[r].length !== firstLen) {
            rowLengthViolations.push({
              block: blockName,
              line: currentLineNum,
              row: r,
              actualLen: rows[r].length,
              expectedLen: firstLen,
              content: rows[r]
            });
          }
        }
      }

      // Now look past closeBracket for palette
      const commaAfterBracket = blockContent.indexOf(',', closeBracket);
      if (commaAfterBracket !== -1) {
        // Next parameter is palette
        const nextComma = blockContent.indexOf(',', commaAfterBracket + 1);
        const paletteArg = blockContent.slice(commaAfterBracket + 1, nextComma !== -1 ? nextComma : closeBracket + 50).trim();
        
        // If palette is an inline object { ... }
        if (paletteArg.startsWith('{')) {
          const palClose = blockContent.indexOf('}', commaAfterBracket);
          const inlinePalStr = blockContent.slice(commaAfterBracket + 1, palClose + 1);
          // Check keys in inlinePalStr
          const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
          let km;
          while ((km = keyRegex.exec(inlinePalStr)) !== null) {
            const key = km[1] || km[2] || km[3];
            if (key.length !== 1) {
              multiCharPaletteTokens.push({
                block: blockName,
                line: currentLineNum,
                palette: 'inline',
                key: key
              });
            }
          }
        }
      }
    }

    searchIdx = dmIdx + 10;
  }

  // Find all .generateTexture('key', ...) in this block
  const genRegex = /\.generateTexture\s*\(\s*['"]([^'"]+)['"]/g;
  let gm;
  while ((gm = genRegex.exec(blockContent)) !== null) {
    generatedKeys.push(gm[1]);
  }
  
  allGeneratedTexturesByMethod[blockName] = generatedKeys;
}

methodsToAnalyze.forEach(mName => {
  const mData = extractMethod(mName);
  if (mData) {
    console.log(`Analyzed ${mName}: lines ${mData.startLine} to ${mData.endLine}`);
    analyzeBlock(mName, mData.content, mData.startLine);
  } else {
    console.error(`Method ${mName} NOT FOUND!`);
  }
});

console.log('\n--- PALETTE DICTIONARY ANALYSIS ---');
// Extract all palette objects defined in PixelArtRenderer or globally in game.js
// Look for const PALETTE = { ... } or const SOMETHING_PALETTE = { ... }
const paletteDefs = [];
const palRegex = /const\s+([A-Z0-9_]+_PALETTE|[A-Z0-9_]+PALETTE)\s*=\s*(\{[\s\S]*?\});/g;
let pdm;
while ((pdm = palRegex.exec(code)) !== null) {
  const palName = pdm[1];
  const palBody = pdm[2];
  
  // Find line number
  const lineNum = code.slice(0, pdm.index).split('\n').length;

  const keyRegex = /(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_$]+))\s*:/g;
  let km;
  let keys = [];
  let multiKeys = [];
  while ((km = keyRegex.exec(palBody)) !== null) {
    const k = km[1] || km[2] || km[3];
    keys.push(k);
    if (k.length !== 1) {
      multiKeys.push(k);
      multiCharPaletteTokens.push({
        block: 'Palette Definition',
        line: lineNum,
        palette: palName,
        key: k
      });
    }
  }
  paletteDefs.push({ name: palName, totalKeys: keys.length, multiKeys: multiKeys });
}

paletteDefs.forEach(p => {
  console.log(`Palette ${p.name}: ${p.totalKeys} keys, multi-char keys: ${p.multiKeys.length > 0 ? p.multiKeys.join(', ') : 'NONE'}`);
});

console.log('\n--- SUMMARY OF MATRIX ROW LENGTH CHECKS ---');
console.log(`Total matrices checked: ${totalMatricesAnalyzed}`);
if (rowLengthViolations.length === 0) {
  console.log('=> 100% CLEAN: Zero matrix row length violations!');
} else {
  console.error('=> VIOLATIONS FOUND in matrix row lengths:', rowLengthViolations);
}

console.log('\n--- SUMMARY OF SINGLE-CHARACTER TOKEN CHECKS ---');
if (multiCharPaletteTokens.length === 0) {
  console.log('=> 100% CLEAN: Zero multi-character token keys in matrix palette maps!');
} else {
  console.error('=> VIOLATIONS FOUND in palette tokens:', multiCharPaletteTokens);
}

console.log('\n--- GENERATED TEXTURE KEYS PER METHOD ---');
for (const [mName, keys] of Object.entries(allGeneratedTexturesByMethod)) {
  console.log(`Method ${mName} (${keys.length} keys):`, keys.sort());
}
