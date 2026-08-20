const fs = require('fs');
const { execSync } = require('child_process');
const vm = require('vm');
const path = require('path');

const { gameScriptPaths } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');
const filesToTest = gameScriptPaths();
const rendererPath = path.join(ROOT, 'js', 'renderer.js');
let overallPassed = true;
const logs = [];

function print(msg) {
  console.log(msg);
  logs.push(msg);
}

print('=== STARTING MILESTONE M2 EMPIRICAL VERIFICATION ===');

// 1. Syntax Check
print('\n--- TEST 1: Syntax Error Check (node -c) ---');
for (const file of filesToTest) {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    print(`[PASS] Syntax check passed with 0 errors for ${file}`);
  } catch (err) {
    overallPassed = false;
    print(`[FAIL] Syntax check failed for ${file}:\n${err.stderr ? err.stderr.toString() : err.message}`);
  }
}

// Extraction logic
function extractMethods(filePath, methodName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`static\\s+${methodName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  const matches = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    const startIdx = match.index;
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < code.length; i++) {
      if (code[i] === '{') braceCount++;
      else if (code[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      matches.push({
        fullCode: code.substring(startIdx, endIdx + 1),
        startLine: code.substring(0, startIdx).split('\n').length
      });
    }
  }
  return matches;
}

function runMethodAndCollectVars(methodCode) {
  let bodyStr = methodCode.replace(/static\s+\w+\s*\([^)]*\)\s*\{/, '').slice(0, -1);
  // Replace const with var/this assignment to capture all defined objects and arrays
  const textures = [];
  const sandbox = {
    captured: {},
    mockThis: {
      createTexture: function(scene, key, matrix, palette) {
        textures.push({ key, matrix, palette });
      }
    },
    scene: {}
  };
  const context = vm.createContext(sandbox);

  // We can convert `const P_FOO = {...}; const foo = [...];` into recording inside sandbox.captured
  const instrumentedBody = bodyStr
    .replace(/const\s+(P_[A-Z0-9_]+)\s*=/g, 'captured.$1 =')
    .replace(/const\s+([a-z0-9_]+)\s*=/g, 'captured.$1 =')
    .replace(/this\.createTexture/g, 'mockThis.createTexture');

  const runner = `(function() { ${instrumentedBody} })()`;
  try {
    vm.runInContext(runner, context);
  } catch (e) {
    print(`   [VM Execution Error]: ${e.message}`);
  }
  return { textures, captured: sandbox.captured };
}

{
  const file = rendererPath;
  print(`\n==================================================`);
  print(`Testing File: ${file}`);
  print(`==================================================`);

  for (const methodName of ['_genArcadeTextures', '_genDungeonTextures']) {
    print(`\nMethod: ${methodName}`);
    const occurrences = extractMethods(file, methodName);
    print(`Found ${occurrences.length} occurrence(s) of ${methodName}`);
    if (occurrences.length > 1) {
      print(`[FAIL] Multiple declarations of ${methodName} found at lines: ${occurrences.map(o => o.startLine).join(', ')}`);
      overallPassed = false;
    }

    occurrences.forEach((occ, idx) => {
      print(`\n--- Inspecting occurrence ${idx + 1} (Line ${occ.startLine}) ---`);
      const { textures, captured } = runMethodAndCollectVars(occ.fullCode);
      print(`Extracted ${textures.length} createTexture calls, ${Object.keys(captured).length} captured variable definitions.`);

      // Pair up matrices and palettes from captured variables if textures array is empty or partial
      const itemsToTest = [];
      if (textures.length > 0) {
        textures.forEach(t => itemsToTest.push({ name: t.key, matrix: t.matrix, palette: t.palette }));
      } else {
        // Fallback pair matching for occurrence 1
        const keys = Object.keys(captured);
        const matrixKeys = keys.filter(k => Array.isArray(captured[k]));
        matrixKeys.forEach(mKey => {
          // Find matching palette P_...
          const palKey = keys.find(k => k.startsWith('P_') && (k.toLowerCase().includes(mKey.toLowerCase()) || mKey.toLowerCase().includes(k.toLowerCase().replace('p_', ''))));
          itemsToTest.push({
            name: `${mKey} (with ${palKey || 'UNKNOWN_PALETTE'})`,
            matrix: captured[mKey],
            palette: captured[palKey] || {}
          });
        });
      }

      itemsToTest.forEach(t => {
        print(`\n  Target Item: '${t.name}'`);
        
        // TEST 2: Height and Row Width Check
        if (!Array.isArray(t.matrix)) {
          print(`  [FAIL] Matrix for '${t.name}' is not an array!`);
          overallPassed = false;
          return;
        }

        const height = t.matrix.length;
        print(`    Matrix Height: ${height}`);
        let widthOk = true;
        t.matrix.forEach((row, rIdx) => {
          if (typeof row !== 'string') {
            print(`    [FAIL] Row ${rIdx} is not a string: ${typeof row}`);
            widthOk = false;
            overallPassed = false;
          } else if (row.length !== height) {
            print(`    [FAIL] Row ${rIdx} width is ${row.length}, expected exact height ${height} (chars): "${row}"`);
            widthOk = false;
            overallPassed = false;
          }
        });
        if (widthOk) {
          print(`    [PASS] All ${height} rows have exact character width matching height (${height} chars).`);
        }

        // TEST 3: Palette Token Key Length
        if (typeof t.palette !== 'object' || t.palette === null) {
          print(`  [FAIL] Palette for '${t.name}' is invalid!`);
          overallPassed = false;
          return;
        }

        const keys = Object.keys(t.palette);
        let paletteKeysOk = true;
        keys.forEach(k => {
          if (k.length !== 1) {
            print(`    [FAIL] Palette token key '${k}' in '${t.name}' has length ${k.length}, expected 1 char!`);
            paletteKeysOk = false;
            overallPassed = false;
          }
        });
        if (paletteKeysOk) {
          print(`    [PASS] All ${keys.length} palette token keys are exactly 1 char in length.`);
        }

        // TEST 4: Row tokens defined in palette or space
        const validTokens = new Set(keys);
        validTokens.add(' '); // Space is allowed
        let tokensOk = true;
        const invalidTokensFound = new Set();
        t.matrix.forEach((row, rIdx) => {
          for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (!validTokens.has(char)) {
              invalidTokensFound.add(char);
              tokensOk = false;
              overallPassed = false;
            }
          }
        });
        if (!tokensOk) {
          print(`    [FAIL] Matrix contains undefined token(s): ${Array.from(invalidTokensFound).map(x => `'${x}'`).join(', ')}`);
        } else {
          print(`    [PASS] Every token in matrix rows is defined in palette or space.`);
        }
      });
    });
  }
}

print(`\n==================================================`);
print(`FINAL VERIFICATION RESULT: ${overallPassed ? 'PASS' : 'FAIL'}`);
print(`==================================================`);

fs.writeFileSync(path.join(ROOT, 'm2_verification_log.txt'), logs.join('\n'));

// This printed FAIL and then exited 0, so as a CI gate it was decoration: a broken sprite
// matrix would have shown red in the log and passed the job anyway.
process.exit(overallPassed ? 0 : 1);
