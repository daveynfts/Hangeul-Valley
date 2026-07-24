const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

const gameJsContent = fs.readFileSync(gameJsPath, 'utf8');
const assetsGameJsContent = fs.readFileSync(assetsGameJsPath, 'utf8');

console.log("==================================================");
console.log("   MILESTONE 1 REVIEWER 2 VERIFICATION REPORT     ");
console.log("==================================================\n");

// --- REQ 4: FILE IDENTITY ---
console.log("--- REQ 4: File Identity Check ---");
const filesIdentical = gameJsContent === assetsGameJsContent;
console.log(`game.js size: ${gameJsContent.length} bytes`);
console.log(`assets/game.js size: ${assetsGameJsContent.length} bytes`);
console.log(`File identity match: ${filesIdentical ? "PASS (Identical)" : "FAIL (MISMATCH)"}`);

function analyzeFile(filePath, content) {
  const fileName = path.basename(filePath) === 'game.js' && filePath.includes('assets') ? 'assets/game.js' : 'game.js';
  console.log(`\n==================================================`);
  console.log(` Analyzing: ${fileName}`);
  console.log(`==================================================`);

  // 1. Extract matrices in _genPlayerTextures
  const matrixNames = [
    'down_0', 'down_1', 'down_2',
    'up_0', 'up_1', 'up_2',
    'left_0', 'left_1', 'left_2',
    'right_0', 'right_1', 'right_2',
    'water_down_0', 'water_down_1', 'water_down_2',
    'harvest_down_0', 'harvest_down_1', 'harvest_down_2',
    'pick_down_0', 'pick_down_1', 'pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle'
  ];

  console.log(`\n--- Requirement 1: Matrix Dimensions (24 matrices, 16x16) ---`);
  let matrixCount = 0;
  let invalidDimCount = 0;

  matrixNames.forEach(mName => {
    // Regex to match matrix definition
    const regex = new RegExp(`const ${mName} = (\\[[\\s\\S]*?\\]);`);
    const match = content.match(regex);
    if (!match) {
      console.log(`  [MISSING] Matrix '${mName}' not found in ${fileName}!`);
      invalidDimCount++;
      return;
    }
    matrixCount++;
    try {
      const arr = eval(`(${match[1]})`);
      const rowCount = arr.length;
      let colsValid = true;
      const colCounts = arr.map(r => r.length);
      const invalidRows = arr.filter(r => r.length !== 16);
      if (rowCount !== 16 || invalidRows.length > 0) {
        console.log(`  [FAIL] ${mName}: rows=${rowCount}, col lengths=[${colCounts.join(',')}]`);
        invalidDimCount++;
      } else {
        console.log(`  [PASS] ${mName}: 16 lines x 16 chars`);
      }
    } catch(e) {
      console.log(`  [ERROR] Parsing matrix ${mName}: ${e.message}`);
      invalidDimCount++;
    }
  });
  console.log(`Total matrices found: ${matrixCount} / 24`);
  console.log(`Dimension check status: ${invalidDimCount === 0 && matrixCount === 24 ? "PASS" : "FAIL"}`);

  // 2. Texture Keys & Animations
  console.log(`\n--- Requirement 2: Texture Keys & Animation Registrations ---`);
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

  let missingTextures = [];
  expectedTextures.forEach(key => {
    if (!content.includes(`'${key}'`) && !content.includes(`"${key}"`)) {
      missingTextures.push(key);
    }
  });

  if (missingTextures.length === 0) {
    console.log(`  [PASS] All ${expectedTextures.length} expected texture keys present in code strings.`);
  } else {
    console.log(`  [FAIL] Missing texture keys in code: ${missingTextures.join(', ')}`);
  }

  const expectedAnims = [
    'player-walk-down', 'player-walk-up', 'player-walk-left', 'player-walk-right',
    'player-water', 'player-harvest', 'player-pick'
  ];

  let missingAnims = [];
  expectedAnims.forEach(animKey => {
    if (!content.includes(`'${animKey}'`) && !content.includes(`"${animKey}"`)) {
      missingAnims.push(animKey);
    }
  });

  if (missingAnims.length === 0) {
    console.log(`  [PASS] All ${expectedAnims.length} expected animation keys present in code strings.`);
  } else {
    console.log(`  [FAIL] Missing animation keys in code: ${missingAnims.join(', ')}`);
  }
}

analyzeFile(gameJsPath, gameJsContent);
analyzeFile(assetsGameJsPath, assetsGameJsContent);

console.log("\n==================================================");
console.log(" Execution finished.");
console.log("==================================================");
