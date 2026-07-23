const fs = require('fs');

function detailedEmojiAudit(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`DETAILED EMOJI AUDIT FOR: ${filePath}`);
  console.log(`========================================\n`);

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

  const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];

  scenes.forEach(sceneName => {
    console.log(`\n--- Scene: ${sceneName} ---`);
    const sceneRegex = new RegExp(`class\\s+${sceneName}[^{]*\\{([\\s\\S]*?)(?=class\\s+\\w+|$)`, 'g');
    const match = sceneRegex.exec(code);
    if (match) {
      const sceneBody = match[1];
      const lines = sceneBody.split('\n');
      
      lines.forEach((line, idx) => {
        if (line.includes('add.text') && emojiRegex.test(line)) {
          console.log(`L${idx + 1}: ${line.trim()}`);
        }
      });
    }
  });
}

detailedEmojiAudit('game.js');
detailedEmojiAudit('assets/game.js');
