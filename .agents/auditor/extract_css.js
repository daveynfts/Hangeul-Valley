const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

console.log('=== CSS RULES lines 960-1080 ===');
console.log(lines.slice(959, 1080).join('\n'));
