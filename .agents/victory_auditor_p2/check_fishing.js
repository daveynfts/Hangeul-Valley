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

PixelArtRenderer._genFishingTextures(mockScene);

console.log('Generated Fishing Keys (Count: ' + generatedTextures.size + '):');
console.log(Array.from(generatedTextures).sort());

// Check references in game.js
const refs = new Set();
const keyRegex = /'([^'\r\n]+)'|"([^"\r\n]+)"/g;
let match;
while ((match = keyRegex.exec(code)) !== null) {
  const k = match[1] || match[2];
  if (k && (k.startsWith('fish_') || k.startsWith('fishing_') || k === 'dock_plank' || k === 'dock_post' || k === 'bobber' || k === 'rod')) {
    refs.add(k);
  }
}
console.log('\nReferenced Fishing Keys in game.js:');
console.log(Array.from(refs).sort());
