const fs = require('fs');
const path = require('path');

const gameJsPath = path.join('C:', 'VibeCode', 'Hangeul Valley', 'game.js');
const assetsGameJsPath = path.join('C:', 'VibeCode', 'Hangeul Valley', 'assets', 'game.js');

console.log('--- REVIEWER VERIFICATION START ---');

// 1. File existence & sync check
const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath, 'utf8');

const isSynced = gameJsContent === assetsGameJsContent;
console.log(`[CHECK 6] game.js <-> assets/game.js 100% byte sync: ${isSynced ? 'PASS' : 'FAIL'}`);
if (!isSynced) {
  console.error(`ERROR: game.js length ${gameJsContent.length} vs assets/game.js length ${assetsGameJsContent.length}`);
}

// 2. Extract _genFishingTextures method content
const match = gameJsContent.match(/static _genFishingTextures\(scene\) \{([\s\S]*?)\n  \}/);
if (!match) {
  console.error('FAIL: Could not find _genFishingTextures(scene) in game.js');
  process.exit(1);
}

const methodBody = match[1];

// Capture createTexture calls
const createdTextures = {};
const mockScene = {};
const mockContext = {
  createTexture: function(scene, key, matrix, palette) {
    createdTextures[key] = { matrix, palette };
  }
};

try {
  const fn = new Function('scene', methodBody);
  fn.call(mockContext, mockScene);
} catch (e) {
  console.error('FAIL: Error executing extracted _genFishingTextures body:', e);
  process.exit(1);
}

const keys = Object.keys(createdTextures);
console.log(`[CHECK 5] Texture keys generated count: ${keys.length} (Expected 29)`);

const expectedKeys = [
  'fish_carp', 'fish_salmon', 'fish_tuna', 'fish_squid', 'fish_eel',
  'fish_goldfish', 'fish_seabass', 'fish_shrimp', 'fish_octopus', 'fish_catfish', 'fish_mackerel',
  'fishing_carp', 'fishing_salmon', 'fishing_tuna', 'fishing_squid', 'fishing_eel',
  'fishing_golden_fish', 'fishing_snapper', 'fishing_shrimp', 'fishing_octopus',
  'fishing_catfish', 'fishing_mackerel', 'fishing_legendary', 'fishing_clam',
  'dock_plank', 'dock_post', 'fishing_dock', 'fishing_bobber', 'fishing_rod'
];

const missingKeys = expectedKeys.filter(k => !createdTextures[k]);
const extraKeys = keys.filter(k => !expectedKeys.includes(k));

if (missingKeys.length === 0 && extraKeys.length === 0 && keys.length === 29) {
  console.log('[CHECK 5] 100% Texture Key Parity (29 keys): PASS');
} else {
  console.error(`[CHECK 5] FAIL. Missing: ${missingKeys.join(', ')}, Extra: ${extraKeys.join(', ')}`);
}

// 3. Verify dock_plank & fishing_dock row lengths strictly 16
for (const key of ['dock_plank', 'fishing_dock']) {
  const tex = createdTextures[key];
  if (!tex) {
    console.error(`[CHECK 1] FAIL: Key ${key} not found`);
    continue;
  }
  let valid = true;
  if (tex.matrix.length !== 16) {
    console.error(`[CHECK 1] FAIL: ${key} has ${tex.matrix.length} rows instead of 16`);
    valid = false;
  }
  tex.matrix.forEach((row, i) => {
    if (row.length !== 16) {
      console.error(`[CHECK 1] FAIL: ${key} row ${i} length is ${row.length} ('${row}')`);
      valid = false;
    }
  });
  if (valid) {
    console.log(`[CHECK 1] ${key} row lengths all 16: PASS`);
  }
}

// 4. Verify catfish / fishing_catfish row 5 leading token is '.' and no space token
for (const key of ['fish_catfish', 'fishing_catfish']) {
  const tex = createdTextures[key];
  if (!tex) {
    console.error(`[CHECK 2] FAIL: Key ${key} not found`);
    continue;
  }
  let valid = true;
  const row5 = tex.matrix[5]; // row 5 (index 5)
  if (!row5.startsWith('.')) {
    console.error(`[CHECK 2] FAIL: ${key} row 5 leading char is '${row5[0]}', expected '.'`);
    valid = false;
  }
  tex.matrix.forEach((row, idx) => {
    if (row.includes(' ')) {
      console.error(`[CHECK 2] FAIL: ${key} row ${idx} contains unmapped space token ' '`);
      valid = false;
    }
  });
  if (valid) {
    console.log(`[CHECK 2] ${key} row 5 leading '.' and no space token: PASS`);
  }
}

// 5. Verify clam, dock_post, fishing_bobber, fishing_rod have >= 3 body shading tones
const bodyShadingCheck = [
  { key: 'fishing_clam', minTones: 3 },
  { key: 'dock_post', minTones: 3 },
  { key: 'fishing_bobber', minTones: 3 },
  { key: 'fishing_rod', minTones: 3 }
];

for (const item of bodyShadingCheck) {
  const tex = createdTextures[item.key];
  if (!tex) {
    console.error(`[CHECK 3] FAIL: Key ${item.key} not found`);
    continue;
  }
  const palette = tex.palette;
  const usedTokens = new Set();
  tex.matrix.forEach(row => {
    for (const char of row) {
      usedTokens.add(char);
    }
  });
  // Filter out transparent '.' and outlines 'K', 'k'
  const bodyTokens = [...usedTokens].filter(t => t !== '.' && t !== 'K' && t !== 'k');
  const distinctColors = new Set(bodyTokens.map(t => palette[t]));
  console.log(`[CHECK 3] ${item.key}: tokens [${bodyTokens.join(', ')}], unique body colors: ${distinctColors.size} (${[...distinctColors].map(c => '0x' + c.toString(16).toUpperCase()).join(', ')})`);
  if (distinctColors.size >= item.minTones) {
    console.log(`[CHECK 3] ${item.key} body shading tones (>= ${item.minTones}): PASS`);
  } else {
    console.error(`[CHECK 3] ${item.key} body shading tones FAIL: found ${distinctColors.size}, required >= ${item.minTones}`);
  }
}

// 6. Verify fishing_rod includes 1px dark slate outline 'K' (0x0F172A)
const rodTex = createdTextures['fishing_rod'];
if (rodTex) {
  const hasK = rodTex.matrix.some(row => row.includes('K'));
  const kVal = rodTex.palette['K'];
  const isDarkSlate = kVal === 0x0F172A;
  if (hasK && isDarkSlate) {
    console.log(`[CHECK 4] fishing_rod includes outline 'K' (0x0F172A): PASS`);
  } else {
    console.error(`[CHECK 4] FAIL: fishing_rod outline K check: hasK=${hasK}, kVal=0x${kVal ? kVal.toString(16) : 'undefined'}`);
  }
}

// 7. Check palette key 'c' in DECOR_PALETTE and stone_well usage
const decorPaletteMatch = gameJsContent.match(/DECOR_PALETTE\s*=\s*\{([\s\S]*?)\};/);
if (decorPaletteMatch) {
  const decorPaletteStr = decorPaletteMatch[1];
  const hascKey = /'c'\s*:\s*0x6BB1D6/.test(decorPaletteStr);
  console.log(`[EXTRA CHECK] DECOR_PALETTE contains 'c': 0x6BB1D6: ${hascKey ? 'PASS' : 'FAIL'}`);
}

console.log('--- REVIEWER VERIFICATION END ---');
