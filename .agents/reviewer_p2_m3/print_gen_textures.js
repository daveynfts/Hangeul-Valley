const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

function printGenCalls(methodName) {
  console.log(`=== ${methodName} ===`);
  const idx = code.indexOf(`static ${methodName}(`);
  if (idx === -1) {
    console.log('NOT FOUND');
    return;
  }
  let depth = 0;
  let startBrace = code.indexOf('{', idx);
  let pos = startBrace;
  for (; pos < code.length; pos++) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = code.slice(idx, pos + 1);
  const lines = body.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('generateTexture') || l.includes('makeTile') || l.includes('makeItem') || l.includes('mkTex') || l.includes('drawMatrix')) {
      console.log(`  Line ${i + 1}: ${l.trim()}`);
    }
  });
}

printGenCalls('generateTilemapTextures');
printGenCalls('_genFishingTextures');
printGenCalls('_genArcadeTextures');
printGenCalls('_genDungeonTextures');
