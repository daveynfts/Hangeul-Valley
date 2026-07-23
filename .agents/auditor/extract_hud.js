const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

console.log('=== CSS LAYOUT RULES (1040 to 1260) ===');
console.log(lines.slice(1039, 1260).join('\n'));

console.log('=== HTML TOP STRUCTURE (1260 to 1345) ===');
console.log(lines.slice(1259, 1345).join('\n'));
