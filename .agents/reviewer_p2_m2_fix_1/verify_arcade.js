const fs = require('fs');

function verifyArcade() {
  const content = fs.readFileSync('game.js', 'utf8');

  // Extract _genArcadeTextures method
  const startPos = content.indexOf('static _genArcadeTextures(scene) {');
  if (startPos === -1) {
    console.error('ERROR: _genArcadeTextures method not found');
    process.exit(1);
  }

  const endPos = content.indexOf('  static _genDungeonTextures', startPos);
  const block = content.substring(startPos + 'static _genArcadeTextures(scene) {'.length, endPos);
  const body = block.substring(0, block.lastIndexOf('}'));

  const textures = [];
  const mockPixelArtRenderer = {
    createTexture(s, key, matrix, palette) {
      textures.push({ key, matrix, palette });
    }
  };

  try {
    const fn = new Function('scene', 'PixelArtRenderer', body.replace(/this\.createTexture/g, 'PixelArtRenderer.createTexture'));
    fn({}, mockPixelArtRenderer);
  } catch (e) {
    console.error('Execution error executing _genArcadeTextures body:', e);
    process.exit(1);
  }

  console.log('=== ARCADE TEXTURES REPORT ===');
  console.log('Total textures created:', textures.length);

  const expectedKeys = [
    'arcade_player_ship',
    'alien_scout',
    'alien_shooter',
    'alien_elite',
    'alien_boss',
    'laser_player',
    'powerup_weapon',
    'powerup_shield',
    'powerup_nuke'
  ];

  let allPassed = true;

  // 1. Key Parity Check
  const createdKeys = textures.map(t => t.key);
  console.log('Created keys:', createdKeys);
  for (const key of expectedKeys) {
    if (!createdKeys.includes(key)) {
      console.error('MISSING EXPECTED KEY:', key);
      allPassed = false;
    }
  }
  if (createdKeys.length !== expectedKeys.length) {
    console.error('KEY COUNT MISMATCH:', createdKeys.length, 'vs expected', expectedKeys.length);
    allPassed = false;
  }

  // Inspect each texture
  textures.forEach((t, idx) => {
    console.log(`\n--- Texture ${idx+1}: ${t.key} ---`);
    
    // Matrix dimensions
    const numRows = t.matrix.length;
    console.log(`  Matrix rows count: ${numRows}`);
    if (numRows !== 16) {
      console.error(`  ERROR: Matrix row count is ${numRows}, expected 16`);
      allPassed = false;
    }
    
    let invalidWidths = [];
    t.matrix.forEach((row, rIdx) => {
      if (row.length !== 16) {
        invalidWidths.push({ rIdx, len: row.length, row });
      }
    });
    if (invalidWidths.length > 0) {
      console.error(`  ERROR: ${invalidWidths.length} rows have width != 16:`, invalidWidths);
      allPassed = false;
    } else {
      console.log('  Matrix row widths: ALL 16 characters wide [PASS]');
    }
    
    // Palette keys single character check
    const paletteKeys = Object.keys(t.palette);
    let multiCharKeys = paletteKeys.filter(k => k.length !== 1);
    if (multiCharKeys.length > 0) {
      console.error('  ERROR: Multi-character palette keys found:', multiCharKeys);
      allPassed = false;
    } else {
      console.log('  Palette keys single-char check: PASS');
    }
    
    // Unmapped token check
    const usedTokens = new Set(t.matrix.join(''));
    let unmappedTokens = [];
    usedTokens.forEach(ch => {
      if (!(ch in t.palette)) {
        unmappedTokens.push(ch);
      }
    });
    if (unmappedTokens.length > 0) {
      console.error('  ERROR: Unmapped matrix tokens:', unmappedTokens);
      allPassed = false;
    } else {
      console.log(`  Token mapping check: PASS (used tokens: ${[...usedTokens].sort().join('')})`);
    }
    
    // Specific checks for P_SHIP / arcade_player_ship
    if (t.key === 'arcade_player_ship') {
      console.log('  P_SHIP Palette:', JSON.stringify(t.palette));
      if (t.palette['D'] === 0x0369A1 || t.palette['d'] === 0x0369A1) {
        const val = t.palette['D'] || t.palette['d'];
        console.log('  P_SHIP token D/d check: PASS (D/d = 0x' + val.toString(16).toUpperCase() + ')');
      } else {
        console.error('  ERROR: P_SHIP missing token D/d with color 0x0369A1');
        allPassed = false;
      }
    }
  });

  console.log('\n====================================');
  console.log('OVERALL ARCADE REVIEW RESULT:', allPassed ? 'ALL VERIFICATIONS PASSED' : 'VERIFICATION FAILED');
  if (!allPassed) process.exit(1);
}

verifyArcade();
