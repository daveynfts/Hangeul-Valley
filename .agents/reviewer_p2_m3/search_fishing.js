const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const fishIdx = code.indexOf('class FishingScene');
const endFishIdx = code.indexOf('class ArcadeScene') > fishIdx ? code.indexOf('class ArcadeScene') : code.length;
const fishCode = code.slice(fishIdx, endFishIdx);

console.log('--- FishingScene texture references ---');
const matches = fishCode.match(/['"][a-zA-Z0-9_]+['"]/g);
const set = new Set(matches.map(m => m.replace(/['"]/g, '')));
console.log(Array.from(set).filter(s => !['FishingScene', 'preload', 'create', 'update', 'physics', 'add', 'sprites', 'group'].includes(s)).sort());
