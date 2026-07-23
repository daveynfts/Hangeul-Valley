const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];

scenes.forEach(sceneName => {
  console.log(`\n=================== ${sceneName} ===================`);
  const sceneStart = code.indexOf(`class ${sceneName}`);
  if (sceneStart === -1) {
    console.log(`Class ${sceneName} not found!`);
    return;
  }
  let nextClass = code.indexOf('class ', sceneStart + 10);
  if (nextClass === -1) nextClass = code.length;

  const sceneCode = code.substring(sceneStart, nextClass);
  
  // Search for texture references
  const lines = sceneCode.split('\n');
  lines.forEach((line, i) => {
    if (/tile_|nebula|planet|dungeon_|make\.tilemap|addTilesetImage|createLayer|createBlankLayer/i.test(line)) {
      console.log(`Line ${i + 1}: ${line.trim().substring(0, 100)}`);
    }
  });
});
