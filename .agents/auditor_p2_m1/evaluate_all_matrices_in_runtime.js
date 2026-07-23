const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== RUNTIME EVALUATION OF ALL PIXEL ART MATRICES ===');

// We will extract all matrix arrays passed to drawMatrix, createTexture, or defined as matrix variables in game.js.

// Find all occurrences of arrays of string rows
const matrixArrayRegex = /\[\s*(?:\r?\n\s*)*['"][^'"]+['"]\s*(?:,\s*(?:\r?\n\s*)*['"][^'"]+['"]\s*)*\]/g;

let match;
let totalChecked = 0;
let defects = [];

while ((match = matrixArrayRegex.exec(content)) !== null) {
  const code = match[0];
  try {
    // safely evaluate the matrix array literal
    const matrix = eval(code);
    if (Array.isArray(matrix) && matrix.length > 0 && typeof matrix[0] === 'string') {
      // Check if it's a matrix (all items are strings of roughly equal length)
      const isMatrix = matrix.every(item => typeof item === 'string' && item.length > 3 && item.length < 100);
      if (isMatrix) {
        totalChecked++;
        const targetLen = matrix[0].length;
        const rowLens = matrix.map(r => r.length);
        const badRows = [];
        rowLens.forEach((len, idx) => {
          if (len !== targetLen) {
            badRows.push({ rowIdx: idx + 1, len, expected: targetLen, rowStr: matrix[idx] });
          }
        });

        if (badRows.length > 0) {
          // Find line number in game.js
          const lineNo = content.substring(0, match.index).split('\n').length;
          defects.push({ lineNo, rowCount: matrix.length, targetLen, badRows });
        }
      }
    }
  } catch (e) {
    // Ignore non-evaluable arrays (e.g. referencing variables)
  }
}

console.log(`Evaluated ${totalChecked} string-array matrices in game.js`);
console.log(`Found ${defects.length} matrix defects:`);

defects.forEach((d, i) => {
  console.log(`\nDefect #${i + 1} at line ${d.lineNo}: Matrix ${d.rowCount}x${d.targetLen}`);
  d.badRows.forEach(br => {
    console.log(`  Row ${br.rowIdx} has length ${br.len} (expected ${br.expected}): "${br.rowStr}"`);
  });
});

