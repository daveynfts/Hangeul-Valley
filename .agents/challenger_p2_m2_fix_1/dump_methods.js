const fs = require('fs');

const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

function extractMethodBody(code, methodName) {
  const startIdx = code.indexOf(`static ${methodName}(`);
  if (startIdx === -1) return null;
  let braceCount = 0;
  let started = false;
  let endIdx = startIdx;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      started = true;
    } else if (code[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
  return code.substring(startIdx, endIdx + 1);
}

const arcadeBody = extractMethodBody(content, '_genArcadeTextures');
const dungeonBody = extractMethodBody(content, '_genDungeonTextures');

console.log("=== ARCADE METHOD FULL ===");
console.log(arcadeBody);

console.log("=== DUNGEON METHOD FULL ===");
console.log(dungeonBody);
