const fs = require('fs');
const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Regex to capture string arrays that look like matrices
// e.g. [ 'row1', 'row2', ... ]
const regex = /\[\s*(?:\r?\n\s*)*['"][^'"]+['"]\s*(?:,\s*(?:\r?\n\s*)*['"][^'"]+['"]\s*)*\]/g;

let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  const matchStr = match[0];
  // extract string literals
  const rowMatches = [...matchStr.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
  if (rowMatches.length >= 2) {
    const lengths = rowMatches.map(r => r.length);
    const firstLen = lengths[0];
    const isUniform = lengths.every(l => l === firstLen);

    // Filter to matrices where row lengths are typically 8, 12, 16, 24, 32, 48
    if (!isUniform && (firstLen >= 8 && firstLen <= 32)) {
      count++;
      // find line number
      const lineNo = content.substring(0, match.index).split('\n').length;
      console.log(`\nNon-uniform Matrix #${count} at line ${lineNo}:`);
      console.log(`Row lengths:`, lengths);
      rowMatches.forEach((row, i) => {
        if (row.length !== firstLen) {
          console.log(`  Row ${i + 1} (len ${row.length}): "${row}" (expected ${firstLen})`);
        }
      });
    }
  }
}
console.log(`\nTotal non-uniform matrices found: ${count}`);
