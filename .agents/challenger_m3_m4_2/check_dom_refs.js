const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('game.js', 'utf8');

// Match all document.getElementById calls in game.js
const getByIdMatches = [...js.matchAll(/document\.getElementById\s*\(\s*["']([^"']+)["']\s*\)|\$\s*\(\s*["']([^"']+)["']\s*\)/g)];
const idRefsInJs = new Set();
getByIdMatches.forEach(m => {
    idRefsInJs.add(m[1] || m[2]);
});

console.log('=== ALL JS DOM ID REFERENCES ===');
console.log(Array.from(idRefsInJs));

// Check presence in HTML
const htmlIds = new Set();
const htmlIdMatches = [...html.matchAll(/id=["']([^"']+)["']/g)];
htmlIdMatches.forEach(m => htmlIds.add(m[1]));

console.log('\n=== MISSING DOM IDs ===');
const missing = [];
idRefsInJs.forEach(id => {
    if (!htmlIds.has(id)) {
        missing.push(id);
    }
});
console.log(missing.length === 0 ? 'NONE! All JS DOM IDs exist in index.html.' : missing);
