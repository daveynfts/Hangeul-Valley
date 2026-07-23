const fs = require('fs');

const gameJs = fs.readFileSync('game.js', 'utf8');
const assetsGameJs = fs.readFileSync('assets/game.js', 'utf8');

// Regex for unicode emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

function findEmojiInScenes(code, filename) {
  console.log(`=== Checking ${filename} ===`);
  const lines = code.split('\n');
  const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
  
  let currentScene = 'Global';
  let emojiMatches = [];
  
  lines.forEach((line, idx) => {
    // Check if line defines or starts a scene
    scenes.forEach(scene => {
      if (line.includes(`class ${scene}`) || line.includes(`function ${scene}`) || line.includes(`const ${scene}`)) {
        currentScene = scene;
      }
    });
    
    if (emojiRegex.test(line)) {
      // Check if it's in add.text or UI or entity sprite
      emojiMatches.push({
        lineNum: idx + 1,
        scene: currentScene,
        text: line.trim()
      });
    }
  });
  
  console.log(`Found ${emojiMatches.length} lines containing emojis in ${filename}`);
  emojiMatches.forEach(m => {
    console.log(`L${m.lineNum} [${m.scene}]: ${m.text}`);
  });
}

findEmojiInScenes(gameJs, 'game.js');
findEmojiInScenes(assetsGameJs, 'assets/game.js');
