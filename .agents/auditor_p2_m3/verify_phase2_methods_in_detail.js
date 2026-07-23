const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== VERIFYING PHASE 2 METHODS IN PixelArtRenderer ===');

// Check Phase 2 methods:
// 1. generateTilemapTextures
// 2. _genFishingTextures
// 3. _genArcadeTextures
// 4. _genDungeonTextures

const methodsToCheck = [
  'generateTilemapTextures',
  '_genFishingTextures',
  '_genArcadeTextures',
  '_genDungeonTextures'
];

methodsToCheck.forEach(methodName => {
  console.log(`\n----------------------------------------`);
  console.log(`Method: ${methodName}`);
  console.log(`----------------------------------------`);

  const startIdx = code.indexOf(`static ${methodName}`) !== -1 
    ? code.indexOf(`static ${methodName}`) 
    : code.indexOf(`${methodName}`);

  if (startIdx === -1) {
    console.error(`ERROR: Method ${methodName} not found!`);
    return;
  }

  // Find end of method (next static method or end of class)
  const restOfCode = code.substring(startIdx);
  const nextMethodMatch = restOfCode.substring(10).search(/static\s+[a-zA-Z0-9_]+/);
  const methodCode = nextMethodMatch !== -1 ? restOfCode.substring(0, 10 + nextMethodMatch) : restOfCode;

  // Extract all palette objects in this method
  const paletteRegex = /(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\{([^}]+)\}/g;
  let palMatch;
  let paletteCount = 0;

  while ((palMatch = paletteRegex.exec(methodCode)) !== null) {
    paletteCount++;
    const palName = palMatch[2];
    const palBody = palMatch[3];

    // Analyze palette
    const keys = [];
    const keyRegex = /['"]([^'"]+)['"]\s*:\s*(0x[0-9a-fA-F]+|null)/g;
    let kMatch;
    let kValue = null;
    let multiCharKeys = [];
    let tonesSet = new Set();

    while ((kMatch = keyRegex.exec(palBody)) !== null) {
      const token = kMatch[1];
      const val = kMatch[2];
      keys.push(token);
      if (token.length !== 1) {
        multiCharKeys.push(token);
      }
      if (token === 'K') {
        kValue = val;
      }
      if (token !== '.' && val !== 'null') {
        tonesSet.add(val.toUpperCase());
      }
    }

    const kStatus = (kValue === null) ? 'No K (transparent background)' : (kValue.toUpperCase() === '0X0F172A' ? 'PASS (0x0F172A)' : `FAIL (${kValue})`);
    const multiCharStatus = multiCharKeys.length === 0 ? 'PASS (Single-char only)' : `FAIL (${multiCharKeys.join(', ')})`;
    const tonesStatus = tonesSet.size >= 3 ? `PASS (${tonesSet.size} tones)` : `FAIL (${tonesSet.size} tones)`;

    console.log(`  Palette '${palName}':`);
    console.log(`    - Outlines ('K'): ${kStatus}`);
    console.log(`    - Single-char tokens: ${multiCharStatus}`);
    console.log(`    - Palette shading: ${tonesStatus}`);
  }

  console.log(`Total palettes defined in ${methodName}: ${paletteCount}`);
});
