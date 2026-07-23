const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== FILTERED PIXEL ART MATRIX CHECK ===');

// We want to extract every 2D array of string rows used for PIXEL ART (where each string row consists of single-char palette tokens like 'K', '.', 'W', 'O', etc.)

const lines = content.split('\n');

let insideMatrix = false;
let currentMatrix = [];
let matrixStartLine = 0;
let varName = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Check for start of matrix variable or inline matrix array in createTexture/drawMatrix
  if ((trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ') || trimmed.includes('drawMatrix') || trimmed.includes('createTexture')) && trimmed.includes('[') && (trimmed.includes("'") || trimmed.includes('"'))) {
    // Check if first string row looks like pixel art tokens (length >= 4, mostly 1-char palette tokens)
    const firstRowMatch = trimmed.match(/['"]([.KkHGgMBAaOoWwtTSsEcCZzYyRrPpFfNnVvXxQqeLljDdBbIUuM]*)['"]/);
    if (firstRowMatch && firstRowMatch[1].length >= 4) {
      insideMatrix = true;
      currentMatrix = [];
      matrixStartLine = i + 1;
      varName = line.split('=')[0].trim();
    }
  }

  if (insideMatrix) {
    const rowMatch = trimmed.match(/^['"]([^'"]+)['"]\s*,?$/) || trimmed.match(/\[\s*['"]([^'"]+)['"]\s*,?/);
    if (rowMatch) {
      currentMatrix.push({ line: i + 1, str: rowMatch[1] });
    }
    if (trimmed.endsWith('];') || trimmed.endsWith(']') || trimmed.includes(']);') || trimmed.includes('])')) {
      insideMatrix = false;
      if (currentMatrix.length >= 2) {
        // Validate uniform length
        const targetLen = currentMatrix[0].str.length;
        const badRows = currentMatrix.filter(r => r.str.length !== targetLen);
        if (badRows.length > 0) {
          console.log(`\nMalformed Matrix at lines ${matrixStartLine}-${i + 1} (${varName}):`);
          console.log(`Expected row width: ${targetLen}, rows: ${currentMatrix.length}`);
          badRows.forEach(br => {
            console.log(`  Line ${br.line}: length ${br.str.length} (expected ${targetLen}) => "${br.str}"`);
          });
        }
      }
    }
  }
}

