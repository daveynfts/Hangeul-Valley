const fs = require('fs');
const path = require('path');

const targetFiles = [
    'game.js',
    'index.html',
    'levels.json',
    'assets/game.js',
    'assets/index.html',
    'assets/levels.json'
];

console.log('--- Searching for "Ginger Cat" / "ginger" references ---');

targetFiles.forEach(relPath => {
    const fullPath = path.join('C:/VibeCode/Hangeul Valley', relPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${relPath}`);
        return;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    let gingerCatMatches = [];
    let gingerMatches = [];
    let catMatches = [];

    lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        if (lower.includes('ginger cat')) {
            gingerCatMatches.push({ line: idx + 1, content: line.trim() });
        } else if (lower.includes('ginger')) {
            gingerMatches.push({ line: idx + 1, content: line.trim() });
        }
    });

    console.log(`\n=== File: ${relPath} ===`);
    console.log(`"Ginger Cat" exact occurrences: ${gingerCatMatches.length}`);
    gingerCatMatches.forEach(m => console.log(`  L${m.line}: ${m.content}`));

    console.log(`"Ginger" (other) occurrences: ${gingerMatches.length}`);
    gingerMatches.forEach(m => console.log(`  L${m.line}: ${m.content}`));
});
