const fs = require('fs');

function investigateBaking(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`INVESTIGATING SCENE BAKING IN: ${filePath}`);
  console.log(`========================================\n`);

  // Check scene create / preload methods
  const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
  
  scenes.forEach(sceneName => {
    console.log(`--- ${sceneName} ---`);
    const sceneRegex = new RegExp(`class\\s+${sceneName}[^{]*\\{([\\s\\S]*?)(?=class\\s+\\w+|$)`, 'g');
    const match = sceneRegex.exec(code);
    if (match) {
      const sceneBody = match[1];
      
      // Look for preload and create
      ['preload', 'create', '_bakeTextures'].forEach(method => {
        const methodRegex = new RegExp(`${method}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)(?=\\n\\s*\\w+\\s*\\(|$)`, 'g');
        const m = methodRegex.exec(sceneBody);
        if (m) {
          console.log(`Found ${method}() method snippet:`);
          console.log(m[0].substring(0, 300) + '...\n');
        } else {
          console.log(`No explicit ${method}() method found.`);
        }
      });

      // Check if PixelArtRenderer is called in this scene
      if (sceneBody.includes('PixelArtRenderer')) {
        console.log(`[✓] PixelArtRenderer IS referenced in ${sceneName}`);
      } else {
        console.log(`[!] PixelArtRenderer IS NOT referenced in ${sceneName}`);
      }
    }
  });
}

investigateBaking('game.js');
investigateBaking('assets/game.js');
