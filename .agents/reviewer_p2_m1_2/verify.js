const fs = require('fs');

const gameJsPath = 'C:/VibeCode/Hangeul Valley/game.js';
const assetsGameJsPath = 'C:/VibeCode/Hangeul Valley/assets/game.js';

console.log('=== STEP 1: Verifying File Synchronization between game.js and assets/game.js ===');
const gameContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsContent = fs.readFileSync(assetsGameJsPath, 'utf8');

if (gameContent === assetsContent) {
  console.log('SUCCESS: game.js and assets/game.js are 100% byte-for-byte identical.');
} else {
  console.log('FAILURE: game.js and assets/game.js differ!');
}

console.log('\n=== STEP 2: Parsing _genFishingTextures implementation ===');

const startMarker = 'static _genFishingTextures(scene) {';
const startIndex = gameContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('ERROR: Could not find _genFishingTextures in game.js');
  process.exit(1);
}

let braceCount = 0;
let endIndex = -1;
for (let i = startIndex; i < gameContent.length; i++) {
  if (gameContent[i] === '{') braceCount++;
  else if (gameContent[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }
}

let funcBody = gameContent.substring(startIndex, endIndex + 1);
funcBody = funcBody.replace('static _genFishingTextures(scene)', 'function _genFishingTextures(scene)');

const evalContext = `
const PixelArtRenderer = {
  results: {},
  createTexture: function(scene, key, matrix, palette) {
    this.results[key] = { matrix, palette };
  },
  drawMatrix: function() {}
};

${funcBody}

_genFishingTextures.call(PixelArtRenderer, {});
PixelArtRenderer.results;
`;

let results;
try {
  results = eval(evalContext);
  console.log(`Successfully executed _genFishingTextures mock. Total textures registered: ${Object.keys(results).length}`);
} catch (e) {
  console.error('ERROR executing _genFishingTextures mock:', e);
  process.exit(1);
}

console.log('\n=== STEP 3: Verifying Texture Keys Parity (29 Keys) ===');
const expectedKeys = [
  // 13 base fish species
  'carp', 'salmon', 'tuna', 'squid', 'eel', 'goldfish', 'seabass', 'shrimp', 'octopus', 'catfish', 'mackerel', 'legendary', 'clam',
  // 11 aliases
  'fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel', 'fishing_goldfish', 'fishing_seabass', 'fishing_shrimp', 'fishing_octopus', 'fishing_catfish', 'fishing_mackerel',
  // 5 accessories
  'dock_plank', 'dock_post', 'fishing_dock', 'fishing_bobber', 'fishing_rod'
];

const registeredKeys = Object.keys(results);
console.log('Registered keys:', registeredKeys);

const missingKeys = expectedKeys.filter(k => !registeredKeys.includes(k));
const extraKeys = registeredKeys.filter(k => !expectedKeys.includes(k));

console.log(`Total expected: ${expectedKeys.length}, Registered: ${registeredKeys.length}`);
if (missingKeys.length > 0) {
  console.error('MISSING KEYS:', missingKeys);
} else {
  console.log('SUCCESS: All 29 expected fishing texture keys are present!');
}
if (extraKeys.length > 0) {
  console.log('EXTRA KEYS:', extraKeys);
}

console.log('\n=== STEP 4: Detailed Audit of Palettes and Matrices ===');

let totalErrors = 0;

for (const [key, data] of Object.entries(results)) {
  console.log(`\n--- Auditing Texture Key: "${key}" ---`);
  const matrix = data.matrix;
  const palette = data.palette;

  if (!matrix || !Array.isArray(matrix)) {
    console.error(`ERROR: Texture "${key}" has invalid matrix:`, matrix);
    totalErrors++;
    continue;
  }
  if (!palette || typeof palette !== 'object') {
    console.error(`ERROR: Texture "${key}" has invalid palette:`, palette);
    totalErrors++;
    continue;
  }

  // 1. Single character palette tokens
  const paletteTokens = Object.keys(palette);
  const invalidTokens = paletteTokens.filter(t => t.length !== 1);
  if (invalidTokens.length > 0) {
    console.error(`  [FAIL] Multi-character tokens in palette for "${key}":`, invalidTokens);
    totalErrors++;
  } else {
    console.log(`  [PASS] Single-character palette tokens count: ${paletteTokens.length}`);
  }

  // 2. Check 1px Dark Slate Outline ('K' = 0x0F172A)
  if (palette['K'] !== 0x0F172A) {
    console.error(`  [FAIL] Outline 'K' is missing or wrong hex value in palette for "${key}": ${palette['K'] !== undefined ? '0x' + palette['K'].toString(16) : 'missing'}`);
    totalErrors++;
  } else {
    console.log(`  [PASS] Outline 'K' = 0x0F172A (0x${palette['K'].toString(16).toUpperCase()})`);
  }

  // 3. Matrix Row Width Check
  const numRows = matrix.length;
  const firstRowWidth = matrix[0].length;
  let widthMismatch = false;
  let unmappedTokens = new Set();

  for (let r = 0; r < numRows; r++) {
    const rowStr = matrix[r];
    if (typeof rowStr !== 'string') {
      console.error(`  [FAIL] Row ${r} in matrix "${key}" is not a string!`);
      widthMismatch = true;
      totalErrors++;
      break;
    }
    if (rowStr.length !== firstRowWidth) {
      console.error(`  [FAIL] Row ${r} length (${rowStr.length}) does not match first row width (${firstRowWidth}) in "${key}"!`);
      widthMismatch = true;
      totalErrors++;
    }
    for (let c = 0; c < rowStr.length; c++) {
      const char = rowStr[c];
      if (!(char in palette)) {
        unmappedTokens.add(char);
      }
    }
  }

  if (!widthMismatch) {
    console.log(`  [PASS] Matrix Dimensions: ${firstRowWidth}x${numRows} (all ${numRows} rows equal width ${firstRowWidth})`);
  }

  if (unmappedTokens.size > 0) {
    console.error(`  [FAIL] Unmapped palette tokens in matrix "${key}":`, Array.from(unmappedTokens));
    totalErrors++;
  } else {
    console.log(`  [PASS] All matrix characters exist in palette.`);
  }

  // 4. Tone / Color Count Analysis
  const usedTokens = new Set();
  for (const rowStr of matrix) {
    for (const char of rowStr) {
      if (char !== '.' && palette[char] !== null && palette[char] !== undefined) {
        usedTokens.add(char);
      }
    }
  }

  const outlineTokens = new Set(['K', 'k'].filter(t => usedTokens.has(t)));
  const bodyColorTokens = new Set(Array.from(usedTokens).filter(t => t !== 'K' && t !== 'k'));
  const bodyHexColors = new Set(Array.from(bodyColorTokens).map(t => palette[t]));

  console.log(`  Used palette tokens total: ${usedTokens.size} (Body tokens: ${bodyColorTokens.size}, Outline tokens: ${outlineTokens.size})`);
  console.log(`  Body color hexes (${bodyHexColors.size}):`, Array.from(bodyHexColors).map(h => '0x' + h.toString(16).toUpperCase()));

  if (bodyHexColors.size < 3) {
    console.error(`  [FAIL] Texture "${key}" has fewer than 3 body tones (${bodyHexColors.size} tones)!`);
    totalErrors++;
  } else {
    console.log(`  [PASS] Multi-tone shading check passed (${bodyHexColors.size} distinct body tones, >= 3).`);
  }
}

console.log(`\n==========================================`);
console.log(`VERIFICATION SUMMARY: ${totalErrors} ERRORS FOUND.`);
console.log(`==========================================`);

process.exit(totalErrors === 0 ? 0 : 1);
