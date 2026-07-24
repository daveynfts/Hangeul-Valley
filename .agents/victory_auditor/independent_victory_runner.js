const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log("=== INDEPENDENT VICTORY AUDIT TEST RUNNER ===");
console.log("Auditor: Independent Victory Auditor");
console.log("Target: Hangeul Valley - Industrial Yellow Farmer Pixel Robot Task");
console.log("Project Root: d:\\Hangeul Valley\n");

let failures = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passes++;
  } else {
    console.error(`[FAIL] ${message}`);
    failures++;
  }
}

// 1. File Synchronization & SHA256 Verification
const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

if (!fs.existsSync(gameJsPath) || !fs.existsSync(assetsGameJsPath)) {
  assert(false, "game.js or assets/game.js file does not exist");
  process.exit(1);
}

const gameJsBuf = fs.readFileSync(gameJsPath);
const assetsGameJsBuf = fs.readFileSync(assetsGameJsPath);

const sha1 = crypto.createHash('sha256').update(gameJsBuf).digest('hex');
const sha2 = crypto.createHash('sha256').update(assetsGameJsBuf).digest('hex');

assert(sha1 === sha2, `SHA256 checksum equality between game.js and assets/game.js (${sha1.substring(0, 16)}...)`);
assert(gameJsBuf.length === assetsGameJsBuf.length, `File size byte equality (${gameJsBuf.length} bytes)`);

const gameCode = gameJsBuf.toString('utf8');

// 2. Prohibited External Asset Check
const projectFiles = fs.readdirSync(path.join(__dirname, '../../'));
const imageFiles = projectFiles.filter(f => /\.(png|jpe?g|gif|svg|webp)$/i.test(f));
assert(imageFiles.length === 0, `Zero external image assets in project root (Found ${imageFiles.length})`);

// 3. Human Player Sprite Wiping Check
const genPlayerTexturesMatch = gameCode.match(/static _genPlayerTextures\(scene\) \{([\s\S]*?)\n  \}/);
assert(genPlayerTexturesMatch !== null, "Found static _genPlayerTextures method in game.js");

const genPlayerCode = genPlayerTexturesMatch ? genPlayerTexturesMatch[1] : "";

assert(!genPlayerCode.includes("0xFFD1B3") && !genPlayerCode.includes("0xF5C29E") && !genPlayerCode.includes("0xD49A76"),
  "Human skin tone palette tokens completely wiped from _genPlayerTextures");
assert(!genPlayerCode.includes("dungarees") && !genPlayerCode.includes("straw_hat"),
  "Human character specific identifiers removed from _genPlayerTextures");

// 4. Industrial Yellow Farmer Robot Palette Verification
assert(genPlayerCode.includes("Industrial Yellow Metallic Casing"), "Palette comments indicate Industrial Yellow Metallic Casing");
assert(genPlayerCode.includes("0xFACC15") && genPlayerCode.includes("0xEAB308") && genPlayerCode.includes("0xCA8A04"), "Yellow casing metallic color tokens present (0xFACC15, 0xEAB308, 0xCA8A04)");
assert(genPlayerCode.includes("0x94A3B8") && genPlayerCode.includes("0x64748B") && genPlayerCode.includes("0x475569") && genPlayerCode.includes("0x334155"), "Slate metallic chassis & tread tokens present (0x94A3B8, 0x64748B, 0x475569, 0x334155)");
assert(genPlayerCode.includes("0x38BDF8") && genPlayerCode.includes("0x06B6D4") && genPlayerCode.includes("0x0284C7"), "Vibrant glowing LED visor cyan tokens present (0x38BDF8, 0x06B6D4, 0x0284C7)");
assert(genPlayerCode.includes("0x0F172A"), "Crisp 1px dark slate outline token present (0x0F172A)");
assert(genPlayerCode.includes("0xF97316") || genPlayerCode.includes("0xEF4444"), "Antenna warning beacon tokens present");

// Extract Palette Object P
const paletteMatch = genPlayerCode.match(/const P = \{([\s\S]*?)\};\s*\/\//);
assert(paletteMatch !== null, "Extracted palette object P from _genPlayerTextures");

let paletteKeys = new Set();
if (paletteMatch) {
  const pLines = paletteMatch[1].split('\n');
  for (const line of pLines) {
    const m = line.match(/'([^']+)':/);
    if (m) {
      paletteKeys.add(m[1]);
    }
  }
}
assert(paletteKeys.size >= 37, `Palette P contains sufficient color tokens (Parsed ${paletteKeys.size} tokens)`);
assert(paletteKeys.has('.'), "Palette P contains transparent '.' token");
assert(paletteKeys.has('K'), "Palette P contains outline 'K' token");
assert(paletteKeys.has('Y') && paletteKeys.has('y') && paletteKeys.has('J'), "Palette P contains yellow 'Y', 'y', 'J' tokens");

// 5. Matrix Extraction & Dimensional Verification
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

let matricesExtracted = 0;
let invalidDimensions = 0;
let invalidTokens = 0;
const matricesObj = {};

for (const mName of matrixNames) {
  const mRegex = new RegExp(`const ${mName} = \\[([\\s\\S]*?)\\];`);
  const mMatch = genPlayerCode.match(mRegex);
  if (mMatch) {
    matricesExtracted++;
    const rows = mMatch[1].split('\n').map(r => r.trim()).filter(r => r.startsWith("'")).map(r => r.replace(/'/g, '').replace(/,/g, ''));
    matricesObj[mName] = rows;
    if (rows.length !== 16) {
      invalidDimensions++;
      console.error(`Matrix ${mName} has ${rows.length} rows instead of 16`);
    } else {
      for (let r = 0; r < 16; r++) {
        if (rows[r].length !== 16) {
          invalidDimensions++;
          console.error(`Matrix ${mName} row ${r} has length ${rows[r].length} instead of 16`);
        }
        for (let c = 0; c < rows[r].length; c++) {
          const char = rows[r][c];
          if (!paletteKeys.has(char)) {
            invalidTokens++;
            console.error(`Matrix ${mName} contains unknown token '${char}' at row ${r}, col ${c}`);
          }
        }
      }
    }
  } else {
    console.error(`Could not locate matrix declaration for ${mName}`);
  }
}

assert(matricesExtracted === 24, `Extracted all 24 matrices (12 walk, 9 action, 3 tools)`);
assert(invalidDimensions === 0, `All 24 matrices are exactly 16x16 characters`);
assert(invalidTokens === 0, `All tokens in all 24 matrices map to valid keys in palette P`);

// 6. Tread Step Variation & Mechanical Bobbing Checks
if (matricesObj['down_0'] && matricesObj['down_1'] && matricesObj['down_2']) {
  let diff01 = 0;
  let diff02 = 0;
  // Compare tread rows 10-15
  for (let r = 10; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      if (matricesObj['down_0'][r][c] !== matricesObj['down_1'][r][c]) diff01++;
      if (matricesObj['down_0'][r][c] !== matricesObj['down_2'][r][c]) diff02++;
    }
  }
  assert(diff01 > 5, `Walk down step frame 1 tread variation detected (${diff01} pixel diffs in tread rows 10-15)`);
  assert(diff02 > 5, `Walk down step frame 2 tread variation detected (${diff02} pixel diffs in tread rows 10-15)`);
  
  // Mechanical antenna/head bobbing check between row 0-2 of down_0 vs down_1
  let headDiff01 = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 16; c++) {
      if (matricesObj['down_0'][r][c] !== matricesObj['down_1'][r][c]) headDiff01++;
    }
  }
  assert(headDiff01 > 0, `Mechanical head/antenna bobbing detected between rest and step frame (${headDiff01} pixel diffs in top rows 0-2)`);
}

// 7. Legacy Aliases & Texture Creation Registration Checks
assert(genPlayerCode.includes("this.createTexture(scene, 'farmer0', down_0, P);"), "Legacy alias farmer0 registered");
assert(genPlayerCode.includes("this.createTexture(scene, 'farmer1', down_1, P);"), "Legacy alias farmer1 registered");
assert(genPlayerCode.includes("this.createTexture(scene, 'farmer2', down_0, P);"), "Legacy alias farmer2 registered");
assert(genPlayerCode.includes("this.createTexture(scene, 'farmer3', down_2, P);"), "Legacy alias farmer3 registered");

const textureCallMatches = genPlayerCode.match(/this\.createTexture\(/g);
assert(textureCallMatches && textureCallMatches.length === 28, `All 28 textures registered via createTexture (Parsed ${textureCallMatches ? textureCallMatches.length : 0})`);

// 8. Animation Registration Verification
assert(genPlayerCode.includes("'player-walk-down'"), "Animation 'player-walk-down' registered");
assert(genPlayerCode.includes("'player-walk-up'"), "Animation 'player-walk-up' registered");
assert(genPlayerCode.includes("'player-walk-left'"), "Animation 'player-walk-left' registered");
assert(genPlayerCode.includes("'player-walk-right'"), "Animation 'player-walk-right' registered");
assert(genPlayerCode.includes("'player-water'"), "Action animation 'player-water' registered");
assert(genPlayerCode.includes("'player-harvest'"), "Action animation 'player-harvest' registered");
assert(genPlayerCode.includes("'player-pick'"), "Action animation 'player-pick' registered");

// 9. Environment & Scale Integration Verification (game.js search)
assert(gameCode.includes("setScale(1.8)"), "Player base scale set to 1.8x (setScale(1.8))");
assert(gameCode.includes("DynamicShadowSystem") && gameCode.includes("createShadow"), "DynamicShadowSystem shadow creation active");
assert(gameCode.includes("depth = ") || gameCode.includes("setDepth("), "Depth sorting (y-sort) implemented");
assert(gameCode.includes("setSize(24, 16)") || gameCode.includes("setSize("), "Physics hitbox configured for farm environment");

console.log("\n=== TEST SUMMARY ===");
console.log(`Passed: ${passes}`);
console.log(`Failed: ${failures}`);

if (failures === 0) {
  console.log("\nVERDICT: VICTORY CONFIRMED");
  process.exit(0);
} else {
  console.log("\nVERDICT: VICTORY REJECTED");
  process.exit(1);
}
