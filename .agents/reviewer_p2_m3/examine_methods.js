const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

function inspectMethodBody(methodName, maxLines = 100) {
  console.log(`\n=================== ${methodName} ===================`);
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
  console.log(`Total lines in ${methodName}: ${lines.length}`);
  lines.slice(0, maxLines).forEach((l, i) => console.log(`${(i+1).toString().padStart(3, ' ')}: ${l}`));
}

inspectMethodBody('_genFishingTextures', 80);
inspectMethodBody('_genArcadeTextures', 80);
inspectMethodBody('_genDungeonTextures', 80);
