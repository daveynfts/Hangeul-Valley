const fs = require('fs');

function checkSceneSpriteUsage(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`CHECKING SCENE SPRITE USAGE IN: ${filePath}`);
  console.log(`========================================\n`);

  const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];

  scenes.forEach(sceneName => {
    console.log(`\n=================== ${sceneName} ===================`);
    const sceneRegex = new RegExp(`class\\s+${sceneName}[^{]*\\{([\\s\\S]*?)(?=class\\s+\\w+|$)`, 'g');
    const match = sceneRegex.exec(code);
    if (match) {
      const sceneBody = match[1];

      // Find all add.sprite, add.image, add.text calls
      const lines = sceneBody.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('add.sprite') || line.includes('add.image') || line.includes('add.text')) {
          console.log(`L${idx + 1}: ${line.trim().substring(0, 120)}`);
        }
      });
    }
  });
}

checkSceneSpriteUsage('game.js');
