const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Regex for string arrays: [ '...', '...' ]
const arrayRegex = /\[\s*(?:'(?:[^'\\]|\\.)*'\s*,\s*)*'(?:[^'\\]|\\.)*'\s*\]/g;
let match;
let totalMatrices = 0;
let defectiveMatrices = [];

const lines = gameJs.split('\n');

while ((match = arrayRegex.exec(gameJs)) !== null) {
  try {
    const arr = new Function('return ' + match[0])();
    if (Array.isArray(arr) && arr.length >= 3 && arr.every(item => typeof item === 'string' && item.length >= 2)) {
      totalMatrices++;
      const lineNo = gameJs.substring(0, match.index).split('\n').length;
      
      // Determine expected row width: for most matrices, first row length
      const firstRowLen = arr[0].length;
      const height = arr.length;
      let isDefective = false;
      const badRows = [];

      arr.forEach((row, idx) => {
        if (row.length !== firstRowLen) {
          isDefective = true;
          badRows.push({ rowIdx: idx + 1, actualLen: row.length, expectedLen: firstRowLen, line: lineNo + idx + 1, content: row });
        }
      });

      if (isDefective) {
        defectiveMatrices.push({
          lineNo,
          height,
          expectedWidth: firstRowLen,
          badRows
        });
      }
    }
  } catch (e) {}
}

console.log(`Scanned ${totalMatrices} total matrix arrays across entire game.js`);
console.log(`Defective matrices with non-uniform row lengths: ${defectiveMatrices.length}`);

defectiveMatrices.forEach((d, i) => {
  console.log(`\nDefect #${i+1} at line ${d.lineNo} (Matrix height=${d.height}, expected width=${d.expectedWidth}):`);
  d.badRows.forEach(r => {
    console.log(`  Row ${r.rowIdx} at line ${r.line}: actual length=${r.actualLen}, expected=${r.expectedLen}. Content: "${r.content}"`);
  });
});
