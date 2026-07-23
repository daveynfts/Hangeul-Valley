const fs = require('fs');

// Create mock environment
global.window = { addEventListener: () => {} };
global.document = { getElementById: () => ({ addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.Phaser = {
  Scene: class {},
  Game: class {},
  Scale: { RESIZE: 1 },
  Math: { Between: () => 1 }
};

const gameCode = fs.readFileSync('game.js', 'utf8');
eval(gameCode);

console.log('Testing collectSave() when sceneRef is ArcadeScene (no plots property)...');
global.sceneRef = { sys: { settings: { key: 'ArcadeScene' } } }; // sceneRef set to ArcadeScene

try {
  const data = collectSave();
  console.log('collectSave returned:', data);
} catch (e) {
  console.log('CRASH CONFIRMED in collectSave():', e.message);
}
