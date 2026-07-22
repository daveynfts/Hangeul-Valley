const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');

const fns = ['openShop', 'closeShop', 'showCatDialog', 'closeCatDialog', 'showLevelSelect', 'openQuiz', 'closeQuiz', 'openSpellDuel'];
fns.forEach(fn => {
    const reg = new RegExp(`function\\s+${fn}|window\\.${fn}\\s*=|const\\s+${fn}\\s*=|let\\s+${fn}\\s*=`, 'g');
    let match;
    console.log(`=== DEF OF ${fn} ===`);
    while ((match = reg.exec(js)) !== null) {
        const lineNum = js.substring(0, match.index).split('\n').length;
        console.log(`L${lineNum}: ${js.substring(match.index, match.index + 80).replace(/\n/g, ' ')}`);
    }
});
