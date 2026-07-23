const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== VERIFYING PHASER SCENE CALLS TO PixelArtRenderer ===');

const calls = [
  'PixelArtRenderer.generateTilemapTextures',
  'PixelArtRenderer._genFishingTextures',
  'PixelArtRenderer._genArcadeTextures',
  'PixelArtRenderer._genDungeonTextures'
];

calls.forEach(callName => {
  const count = (code.match(new RegExp(callName.replace('.', '\\.'), 'g')) || []).length;
  console.log(`- ${callName}: ${count} occurrences in code`);
});

// Locate scenes in code
const scenes = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene', 'BootScene', 'MainScene'];
scenes.forEach(sceneName => {
  const sceneIdx = code.indexOf(`class ${sceneName}`);
  if (sceneIdx !== -1) {
    const sceneCode = code.substring(sceneIdx, sceneIdx + 1500); // snippet
    console.log(`\nScene class ${sceneName} found.`);
  } else {
    console.log(`\nScene class ${sceneName} not found by 'class ${sceneName}'. Checking alternative names...`);
  }
});
