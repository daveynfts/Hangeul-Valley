const fs = require('fs');
const path = require('path');

const gameJs = fs.readFileSync(path.join(__dirname, '../../game.js'), 'utf8');

// Let's find all occurrences of PALETTE or objects passed as palettes or defined inside functions
const paletteMatches = [...gameJs.matchAll(/const\s+([A-Za-z0-9_]*PALETTE[A-Za-z0-9_]*)\s*=\s*(\{[\s\S]*?\n\s*\});/g)];
console.log(`Found ${paletteMatches.length} palette objects with const ...PALETTE... = { ... }`);

for (const m of paletteMatches) {
  console.log('Palette name:', m[1]);
  // Parse key-value pairs
  const objStr = m[2];
  try {
    const fn = new Function('return ' + objStr);
    const obj = fn();
    console.log('Keys:', Object.keys(obj));
    const nonSingleKeys = Object.keys(obj).filter(k => k.length !== 1);
    if (nonSingleKeys.length > 0) {
      console.log('  -> INVALID KEYS (length != 1):', nonSingleKeys);
    } else {
      console.log('  -> All keys are length 1.');
    }
  } catch (e) {
    console.log('  -> Error evaluating palette:', e.message);
  }
}
