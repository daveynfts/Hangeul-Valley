const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const generatedTextures = new Set();
const mockGraphics = {
  clear: () => {}, fillStyle: () => {}, fillRect: () => {}, fillCircle: () => {},
  lineStyle: () => {}, strokeRect: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, closePath: () => {}, fillPath: () => {}, strokePath: () => {},
  arc: () => {}, destroy: () => {},
  generateTexture: (key, w, h) => { generatedTextures.add(key); }
};

const mockScene = {
  make: { graphics: () => mockGraphics },
  add: { graphics: () => mockGraphics },
  textures: {
    exists: (key) => generatedTextures.has(key),
    remove: () => {},
    createCanvas: () => ({ getContext: () => ({ fillStyle: '', fillRect: () => {} }) }),
    get: () => ({ add: () => {}, setFilter: () => {} })
  }
};

const dummyElem = { addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } };

global.Phaser = { Display: { Color: { HexStringToColor: (hex) => ({ color: 0 }) } } };
global.window = { addEventListener: () => {} };
global.document = { addEventListener: () => {}, getElementById: () => dummyElem, querySelector: () => dummyElem, querySelectorAll: () => [] };

const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('class FarmScene'));
const subset = lines.slice(0, idx > 0 ? idx : 5288).join('\n') + '\nglobal.PixelArtRenderer = PixelArtRenderer;\n';

eval(subset);

const arcadeSet = new Set();
mockGraphics.generateTexture = (key) => arcadeSet.add(key);
PixelArtRenderer._genArcadeTextures(mockScene);

console.log('Arcade textures count:', arcadeSet.size);
console.log('Arcade keys:', Array.from(arcadeSet).sort());

const dungeonSet = new Set();
mockGraphics.generateTexture = (key) => dungeonSet.add(key);
PixelArtRenderer._genDungeonTextures(mockScene);

console.log('\nDungeon textures count:', dungeonSet.size);
console.log('Dungeon keys:', Array.from(dungeonSet).sort());
