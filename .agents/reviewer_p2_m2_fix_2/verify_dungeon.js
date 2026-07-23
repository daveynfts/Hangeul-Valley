const fs = require('fs');

function testFile(filePath) {
  console.log(`\n=== Testing ${filePath} ===`);
  const code = fs.readFileSync(filePath, 'utf8');
  const start = code.indexOf('static _genDungeonTextures(scene) {');
  if (start === -1) {
    console.error('Could not find static _genDungeonTextures(scene) {');
    return false;
  }

  // Extract function body by matching braces
  let braceCount = 0;
  let bodyStart = -1;
  let bodyEnd = -1;

  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') {
      if (braceCount === 0) bodyStart = i + 1;
      braceCount++;
    } else if (code[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        bodyEnd = i;
        break;
      }
    }
  }

  const fnInside = code.substring(bodyStart, bodyEnd);

  const textures = {};
  const mockScene = {};
  const PixelArtRenderer = {
    createTexture(scene, key, matrix, palette) {
      textures[key] = { matrix, palette };
    }
  };

  const testFn = new Function('scene', fnInside);
  testFn.call(PixelArtRenderer, mockScene);

  console.log('Registered texture keys:', Object.keys(textures));

  let failed = false;
  for (const [key, data] of Object.entries(textures)) {
    const { matrix, palette } = data;
    console.log(`Texture: ${key} (${matrix.length} rows)`);
    
    // Check row count
    if (matrix.length !== 16) {
      console.error(`  [FAIL] ${key} has ${matrix.length} rows, expected 16`);
      failed = true;
    }
    
    // Check row lengths
    matrix.forEach((row, i) => {
      if (row.length !== 16) {
        console.error(`  [FAIL] ${key} row ${i} length is ${row.length}, expected 16 (got ${row.length}): '${row}'`);
        failed = true;
      }
    });

    // Check palette keys (single-char tokens)
    const paletteKeys = Object.keys(palette);
    const nonSingleCharKeys = paletteKeys.filter(k => k.length !== 1);
    if (nonSingleCharKeys.length > 0) {
      console.error(`  [FAIL] ${key} has non-single-char palette keys:`, nonSingleCharKeys);
      failed = true;
    }

    // Check for unmapped tokens in matrix
    const unmapped = new Set();
    matrix.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const char = row[c];
        if (!(char in palette)) {
          unmapped.add(char);
          console.error(`  [FAIL] ${key} row ${r} col ${c} unmapped char: '${char}'`);
        }
      }
    });
    if (unmapped.size > 0) {
      failed = true;
    }
  }

  if (!failed) {
    console.log(`>>> ALL CHECKS PASSED FOR ${filePath} <<<`);
  }
  return !failed;
}

const r1 = testFile('C:\\VibeCode\\Hangeul Valley\\game.js');
const r2 = testFile('C:\\VibeCode\\Hangeul Valley\\assets\\game.js');

if (r1 && r2) {
  console.log('\n====================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY');
  console.log('====================================');
} else {
  console.error('\n====================================');
  console.error('VERIFICATION FAILED!');
  console.error('====================================');
  process.exit(1);
}
