const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Regex to match string array literals:
// [ followed by multiple '...' or "..." lines, followed by ]
const arrayRegex = /\[\s*(?:(?:'[^']+'|"[^"]+")\s*,\s*)*(?:'[^']+'|"[^"]+")\s*\]/g;

const matches = code.match(arrayRegex);
console.log(`Found ${matches ? matches.length : 0} array literals matching string row arrays.`);

let stringMatrixCount = 0;
if (matches) {
  matches.forEach((m, idx) => {
    try {
      const arr = eval(m);
      if (Array.isArray(arr) && arr.length > 0 && arr.every(item => typeof item === 'string')) {
        stringMatrixCount++;
        const width0 = arr[0].length;
        const uniform = arr.every(r => r.length === width0);
        if (!uniform) {
          console.error(`NON-UNIFORM MATRIX at index ${idx}:`, arr);
        }
      }
    } catch(e) {
      // not a simple static literal (might contain vars)
    }
  });
}

console.log(`Total static string matrices found: ${stringMatrixCount}`);
