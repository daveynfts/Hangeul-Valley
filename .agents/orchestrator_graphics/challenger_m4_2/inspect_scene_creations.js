const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

const scenes = ['FarmScene', 'ArcadeScene', 'DungeonScene', 'FishingScene'];

scenes.forEach(sceneName => {
  console.log(`\n================ ${sceneName} Creation Details ================`);
  let inScene = false;
  let currentMethod = '';
  lines.forEach((line, idx) => {
    if (line.includes(`class ${sceneName}`)) inScene = true;
    if (inScene && line.includes('class ') && !line.includes(`class ${sceneName}`)) inScene = false;
    
    if (inScene) {
      if (line.trim().startsWith('create()') || line.trim().startsWith('update(')) {
        currentMethod = line.trim();
      }
      if (line.includes('time.addEvent') || line.includes('setInterval') || line.includes('setTimeout') ||
          line.includes('.on(') || line.includes('addEventListener') || line.includes('new DayNightSystem') ||
          line.includes('new WeatherEngine') || line.includes('new DynamicShadowSystem')) {
        console.log(`[${currentMethod}] L${idx+1}: ${line.trim()}`);
      }
    }
  });
});
