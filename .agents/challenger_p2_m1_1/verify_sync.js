const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

console.log('--- 1a. SYNTAX CHECK ---');
let syntaxGameOk = false;
let syntaxAssetsOk = false;

try {
  execSync(`node -c "${gameJsPath}"`, { stdio: 'pipe' });
  console.log('✅ node -c game.js exit code: 0');
  syntaxGameOk = true;
} catch (e) {
  console.log('❌ node -c game.js failed:', e.stderr ? e.stderr.toString() : e.message);
}

try {
  execSync(`node -c "${assetsGameJsPath}"`, { stdio: 'pipe' });
  console.log('✅ node -c assets/game.js exit code: 0');
  syntaxAssetsOk = true;
} catch (e) {
  console.log('❌ node -c assets/game.js failed:', e.stderr ? e.stderr.toString() : e.message);
}

console.log('\n--- 1b. FILE SYNC CHECK ---');
const contentGame = fs.readFileSync(gameJsPath, 'utf8');
const contentAssets = fs.readFileSync(assetsGameJsPath, 'utf8');

const isIdentical = (contentGame === contentAssets);
if (isIdentical) {
  console.log('✅ game.js and assets/game.js are 100% identical (in sync).');
} else {
  console.log(`❌ game.js and assets/game.js differ! game.js len=${contentGame.length}, assets/game.js len=${contentAssets.length}`);
  let diffOffset = -1;
  const minLen = Math.min(contentGame.length, contentAssets.length);
  for (let i = 0; i < minLen; i++) {
    if (contentGame[i] !== contentAssets[i]) {
      diffOffset = i;
      break;
    }
  }
  console.log(`First mismatch at character index ${diffOffset}`);
}
