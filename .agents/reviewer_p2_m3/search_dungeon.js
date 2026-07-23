const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const dunIdx = code.indexOf('class DungeonScene');
const endDunIdx = code.indexOf('class FishingScene') > dunIdx ? code.indexOf('class FishingScene') : code.length;
const dunCode = code.slice(dunIdx, endDunIdx);

console.log('--- DungeonScene texture references ---');
const matches = dunCode.match(/['"][a-zA-Z0-9_]+['"]/g);
const set = new Set(matches.map(m => m.replace(/['"]/g, '')));
console.log(Array.from(set).filter(s => !['DungeonScene', 'preload', 'create', 'update', 'physics', 'add', 'sprites', 'group'].includes(s)).sort());
