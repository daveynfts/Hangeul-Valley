const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

// Parse all addEventListener calls and their target expressions
const listenerRegex = /([a-zA-Z0-9_\$\(\'\"]+)\.addEventListener\s*\(/g;
let match;
const listeners = [];
while ((match = listenerRegex.exec(js)) !== null) {
    listeners.push({ target: match[1], line: js.substring(0, match.index).split('\n').length });
}

console.log('=== ALL ADD EVENT LISTENER TARGETS ===');
listeners.forEach(l => console.log(`L${l.line}: ${l.target}`));

// Verify if any targets evaluate to null at script startup
// Helper to trace variable declaration
console.log('\n=== CHECKING TARGET DEFINITIONS ===');
listeners.forEach(l => {
    let targetName = l.target;
    if (targetName.startsWith("$('")) {
        const id = targetName.match(/\$\(['"]([^'"]+)['"]\)/)[1];
        if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
            console.error(`DANGER: ${targetName} references non-existent ID "${id}"`);
        } else {
            console.log(`OK: ${targetName} -> ID "${id}" found in HTML`);
        }
    } else if (targetName === 'window' || targetName === 'document') {
        console.log(`OK: ${targetName}`);
    } else {
        // Find variable declaration for targetName
        const declRegex = new RegExp(`(?:const|let|var)\\s+${targetName}\\s*=\\s*([^;\\n]+)`);
        const declMatch = js.match(declRegex);
        if (declMatch) {
            console.log(`OK: ${targetName} declared as: ${declMatch[0].trim()}`);
        } else {
            console.log(`UNKNOWN DECLARATION: ${targetName}`);
        }
    }
});
