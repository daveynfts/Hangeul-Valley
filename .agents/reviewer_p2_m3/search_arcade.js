const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const arcIdx = code.indexOf('class ArcadeScene');
const endArcIdx = code.indexOf('class DungeonScene');
const arcCode = code.slice(arcIdx, endArcIdx);

console.log('--- ArcadeScene texture references ---');
const matches = arcCode.match(/['"][a-zA-Z0-9_]+['"]/g);
const set = new Set(matches.map(m => m.replace(/['"]/g, '')));
console.log(Array.from(set).filter(s => !['ArcadeScene', 'preload', 'create', 'update', 'physics', 'add', 'sprites', 'group'].includes(s)).sort());
