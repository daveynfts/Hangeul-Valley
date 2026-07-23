const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

const scenes = ['FarmScene', 'ArcadeScene', 'DungeonScene', 'FishingScene'];

scenes.forEach(sceneName => {
  console.log(`\n================ ${sceneName} Lifecycle Methods ================`);
  let inScene = false;
  let indent = 0;
  lines.forEach((line, idx) => {
    if (line.includes(`class ${sceneName}`)) inScene = true;
    if (inScene && line.includes('class ') && !line.includes(`class ${sceneName}`)) inScene = false;
    
    if (inScene) {
      if (line.trim().startsWith('create(') || line.trim().startsWith('update(') || 
          line.trim().startsWith('shutdown(') || line.trim().startsWith('destroy(') ||
          line.trim().startsWith('init(')) {
        console.log(`L${idx+1}: ${line.trim()}`);
      }
    }
  });
});
