const fs = require('fs');

const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const lines = content.split('\n');

console.log('=== NON-UNIFORM MATRIX FINDER ===');

// We want to find matrix definitions in game.js and print their line numbers and exact row lengths.

let insideMatrix = false;
let currentMatrix = [];
let startLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Look for start of string array matrix, e.g. [ '...', or drawMatrix(..., [
  if (trimmed.startsWith('[') && (trimmed.includes("'") || trimmed.includes('"'))) {
    // Check if line looks like matrix row start
    const matchRow = trimmed.match(/^\[\s*['"][^'"]+['"]/);
    if (matchRow) {
      insideMatrix = true;
      currentMatrix = [];
      startLine = i + 1;
    }
  }

  if (insideMatrix) {
    // Extract row string if present
    const rowMatch = trimmed.match(/^['"]([^'"]+)['"]\s*,?$/);
    if (rowMatch) {
      currentMatrix.push({ line: i + 1, row: rowMatch[1] });
    } else if (trimmed.endsWith(']') || trimmed.endsWith('],') || trimmed.includes(']);') || trimmed.includes('])')) {
      // Check last row if present
      const lastRowMatch = trimmed.match(/^['"]([^'"]+)['"]\s*\]/);
      if (lastRowMatch) {
        currentMatrix.push({ line: i + 1, row: lastRowMatch[1] });
      }
      insideMatrix = false;

      // Analyze current matrix
      if (currentMatrix.length > 1) {
        const lengths = currentMatrix.map(r => r.row.length);
        const firstLen = lengths[0];
        const isUniform = lengths.every(l => l === firstLen);

        if (!isUniform) {
          console.log(`\nNon-uniform matrix at line ${startLine} to ${i + 1}:`);
          console.log(`Row lengths: [${lengths.join(', ')}]`);
          currentMatrix.forEach((r, idx) => {
            if (r.row.length !== firstLen) {
              console.log(`  Row ${idx + 1} (line ${r.line}, len ${r.row.length}): "${r.row}" (expected len ${firstLen})`);
            }
          });
        }
      }
    }
  }
}
