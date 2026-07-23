const fs = require('fs');

const content = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

function extractMethod(code, methodName) {
  const startIdx = code.indexOf(`static ${methodName}(`);
  if (startIdx === -1) return null;
  // find matching braces
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

const arcadeMethod = extractMethod(content, '_genArcadeTextures');
const dungeonMethod = extractMethod(content, '_genDungeonTextures');

console.log("=== ARCADE METHOD HEAD (2000 chars) ===");
console.log(arcadeMethod ? arcadeMethod.substring(0, 2000) : "NOT FOUND");

console.log("=== DUNGEON METHOD HEAD (2000 chars) ===");
console.log(dungeonMethod ? dungeonMethod.substring(0, 2000) : "NOT FOUND");
