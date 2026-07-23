const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

function findInClass(className, target) {
  let inClass = false;
  let currentClass = '';
  lines.forEach((l, idx) => {
    if (l.trim().startsWith('class ')) {
      currentClass = l.trim().split(' ')[1];
    }
    if (currentClass === className && l.includes(target)) {
      console.log(`[${className}] L${idx + 1}: ${l.trim()}`);
    }
  });
}

const scenes = ['FarmScene', 'ArcadeScene', 'DungeonScene', 'FishingScene'];
console.log('--- Camera setBounds in Scenes ---');
scenes.forEach(s => findInClass(s, 'setBounds'));
console.log('\n--- Camera creation / config in Scenes ---');
scenes.forEach(s => findInClass(s, 'cameras'));
console.log('\n--- Camera zoom / follow in Scenes ---');
scenes.forEach(s => findInClass(s, 'startFollow'));
scenes.forEach(s => findInClass(s, 'setZoom'));
