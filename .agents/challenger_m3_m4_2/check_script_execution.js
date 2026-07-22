const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('game.js', 'utf8');

// Check position of script tags in html
const jsPos = html.indexOf('game.js');
const bodyClosePos = html.indexOf('</body>');
console.log(`game.js position: ${jsPos}, </body> position: ${bodyClosePos}`);
if (jsPos < bodyClosePos) {
    console.log('game.js is loaded BEFORE </body> (DOM is fully parsed when script runs).');
} else {
    console.log('game.js is loaded AFTER </body>.');
}

// Find top-level DOM queries or addEventListener calls in game.js
const lines = js.split('\n');
console.log('\n=== TOP-LEVEL DOM INITIALIZATION IN GAME.JS ===');
lines.forEach((line, idx) => {
    if (line.includes('document.getElementById') || line.includes('$(') || line.includes('addEventListener')) {
        // Only print if not inside a class or function block, or print all to see
        if (!line.startsWith('  ') && !line.startsWith('    ')) {
            console.log(`L${idx+1}: ${line.substring(0, 100)}`);
        }
    }
});
