const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

console.log('Reading game.js...');
const content = fs.readFileSync(gameJsPath, 'utf8');
const contentAssets = fs.readFileSync(assetsGameJsPath, 'utf8');

// 1. Check SHA256 equality
const h1 = crypto.createHash('sha256').update(content).digest('hex');
const h2 = crypto.createHash('sha256').update(contentAssets).digest('hex');

console.log(`game.js SHA256:        ${h1}`);
console.log(`assets/game.js SHA256: ${h2}`);
console.log(`SHA256 Match:          ${h1 === h2}`);

// 2. Extract _genPlayerTextures body accurately
const startIdx = content.indexOf('static _genPlayerTextures(scene) {');
const endIdx = content.indexOf('static _genNpcTextures(scene) {');

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not bound static _genPlayerTextures accurately.");
  process.exit(1);
}

const fullMethodCode = content.substring(startIdx, endIdx).trim();

// Extract body inside static _genPlayerTextures(scene) { ... }
const firstBrace = fullMethodCode.indexOf('{');
const lastBrace = fullMethodCode.lastIndexOf('}');
const fnBody = fullMethodCode.substring(firstBrace + 1, lastBrace);

// Extract Palette object code
const paletteCodeMatch = fnBody.match(/const P = (\{[\s\S]*?\});/);
if (!paletteCodeMatch) {
  console.error("Could not find Palette P in _genPlayerTextures");
  process.exit(1);
}

const P = eval('(' + paletteCodeMatch[1] + ')');
const pKeys = Object.keys(P);
console.log(`\nPalette P token count: ${pKeys.length}`);
console.log(`P['K'] value: 0x${P['K'].toString(16).toUpperCase()} (Expected: 0x1A1A2E, Decimal: ${P['K']})`);

// 3. Extract and check the 24 matrices
const matricesNames = [
  'down_0', 'down_1', 'down_2',
  'up_0', 'up_1', 'up_2',
  'left_0', 'left_1', 'left_2',
  'right_0', 'right_1', 'right_2',
  'water_down_0', 'water_down_1', 'water_down_2',
  'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
  'pick_down_0', 'pick_down_1', 'pick_down_2',
  'tool_watering_can', 'tool_basket', 'tool_sickle'
];

console.log(`\nChecking ${matricesNames.length} matrices...`);

let matricesValid = true;
matricesNames.forEach(mName => {
  const mMatch = fnBody.match(new RegExp(`const ${mName} = (\\[[\\s\\S]*?\\]);`));
  if (!mMatch) {
    console.error(`Matrix ${mName} NOT found!`);
    matricesValid = false;
    return;
  }
  const mat = eval(mMatch[1]);
  if (!Array.isArray(mat)) {
    console.error(`Matrix ${mName} is not an array`);
    matricesValid = false;
    return;
  }
  if (mat.length !== 16) {
    console.error(`Matrix ${mName} height is ${mat.length}, expected 16`);
    matricesValid = false;
    return;
  }
  mat.forEach((row, rIdx) => {
    if (typeof row !== 'string' || row.length !== 16) {
      console.error(`Matrix ${mName} row ${rIdx} length is ${row ? row.length : undefined}, expected 16 string`);
      matricesValid = false;
      return;
    }
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      if (!(char in P)) {
        console.error(`Matrix ${mName} row ${rIdx} col ${c} has invalid token '${char}' not in Palette P`);
        matricesValid = false;
      }
    }
  });
});

if (matricesValid) {
  console.log(`All ${matricesNames.length} matrices are strictly 16x16 arrays of single-character tokens in Palette P!`);
}

// 4. Execute mock to test registrations
const mockTextures = {};
const mockAnims = {};

const mockScene = {
  anims: {
    exists: (key) => key in mockAnims,
    create: (config) => {
      mockAnims[config.key] = config;
    }
  }
};

try {
  const executeFn = new Function('scene', 'mockTextures', 'mockAnims', `
    const createTexture = (scene, key, matrix, palette) => {
      mockTextures[key] = { matrix, palette };
    };
    ${fnBody.replace(/this\.createTexture/g, 'createTexture')}
  `);
  executeFn(mockScene, mockTextures, mockAnims);

  console.log('\nRegistered Textures:');
  const expectedTextures = [
    'player_walk_down_0', 'player_walk_down_1', 'player_walk_down_2',
    'player_walk_up_0', 'player_walk_up_1', 'player_walk_up_2',
    'player_walk_left_0', 'player_walk_left_1', 'player_walk_left_2',
    'player_walk_right_0', 'player_walk_right_1', 'player_walk_right_2',
    'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
    'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
    'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle',
    'farmer0', 'farmer1', 'farmer2', 'farmer3'
  ];

  let texturesOk = true;
  expectedTextures.forEach(tKey => {
    if (tKey in mockTextures) {
      console.log(`  [OK] Texture '${tKey}' registered.`);
    } else {
      console.error(`  [FAIL] Texture '${tKey}' MISSING!`);
      texturesOk = false;
    }
  });

  console.log('\nRegistered Animations:');
  const expectedAnims = [
    'player-walk-down',
    'player-walk-up',
    'player-walk-left',
    'player-walk-right',
    'player-water',
    'player-harvest',
    'player-pick'
  ];

  let animsOk = true;
  expectedAnims.forEach(aKey => {
    if (aKey in mockAnims) {
      console.log(`  [OK] Animation '${aKey}' registered:`, JSON.stringify(mockAnims[aKey]));
    } else {
      console.error(`  [FAIL] Animation '${aKey}' MISSING!`);
      animsOk = false;
    }
  });

  if (texturesOk && animsOk && matricesValid && h1 === h2 && pKeys.length >= 30 && P['K'] === 0x1A1A2E) {
    console.log('\n=== ALL VERIFICATION CHECKS PASSED PERFECTLY ===');
  } else {
    console.error('\n=== SOME VERIFICATION CHECKS FAILED ===');
  }

} catch (err) {
  console.error("Error executing mock _genPlayerTextures:", err);
}
