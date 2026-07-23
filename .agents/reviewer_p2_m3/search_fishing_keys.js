const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const fishIdx = code.indexOf('class FishingScene');
const endFishIdx = code.indexOf('class ArcadeScene') > fishIdx ? code.indexOf('class ArcadeScene') : code.length;
const fishCode = code.slice(fishIdx, endFishIdx);

const matches = fishCode.match(/['"][a-zA-Z0-9_]+['"]/g);
const set = new Set(matches.map(m => m.replace(/['"]/g, '')));
const filtered = Array.from(set).filter(s => s.startsWith('fish') || s.startsWith('dock') || s.startsWith('tile_')).sort();

console.log('Fishing Scene relevant keys:', filtered);
