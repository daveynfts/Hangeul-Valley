const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

function inspectMethodEnd(methodName) {
  console.log(`\n=================== END OF ${methodName} ===================`);
  const target = `static ${methodName}(`;
  const idx = code.indexOf(target);
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
  const startIdx = Math.max(0, lines.length - 40);
  lines.slice(startIdx).forEach((l, i) => console.log(`${(startIdx + i + 1).toString().padStart(3, ' ')}: ${l}`));
}

inspectMethodEnd('_genFishingTextures');
inspectMethodEnd('_genArcadeTextures');
inspectMethodEnd('_genDungeonTextures');
