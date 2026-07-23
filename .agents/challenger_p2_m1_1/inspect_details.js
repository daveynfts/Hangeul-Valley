const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Snippet around 9000-25000
console.log('--- SNIPPET AROUND 9000-15000 ---');
console.log(content.substring(9000, 18000));
