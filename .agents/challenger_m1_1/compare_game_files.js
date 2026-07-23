const fs = require('fs');

const gameJs = fs.readFileSync('game.js', 'utf8');
const assetsGameJs = fs.readFileSync('assets/game.js', 'utf8');

if (gameJs === assetsGameJs) {
  console.log('[✓] game.js and assets/game.js are EXACTLY IDENTICAL.');
} else {
  console.log(`[!] game.js (${gameJs.length} bytes) and assets/game.js (${assetsGameJs.length} bytes) DIFFER.`);
  const lines1 = gameJs.split('\n');
  const lines2 = assetsGameJs.split('\n');
  let diffCount = 0;
  for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
    if (lines1[i] !== lines2[i]) {
      diffCount++;
      if (diffCount <= 10) {
        console.log(`Diff at L${i+1}:`);
        console.log(`  game.js:        ${lines1[i] || '<EOF>'}`);
        console.log(`  assets/game.js: ${lines2[i] || '<EOF>'}`);
      }
    }
  }
  console.log(`Total line differences: ${diffCount}`);
}
