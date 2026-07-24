const fs = require('fs');

const walkJson = JSON.parse(fs.readFileSync('d:/Hangeul Valley/.agents/teamwork_preview_explorer_m1_2/clean_walk_matrices.json', 'utf8'));
const e1Text = fs.readFileSync('d:/Hangeul Valley/.agents/teamwork_preview_explorer_m1_1/analysis.md', 'utf8');

function extractMatrices(text) {
  const result = {};
  const lines = text.split('\n');
  let currentKey = null;
  let currentRows = [];

  for (let line of lines) {
    const constMatch = line.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*\[/);
    if (constMatch) {
      currentKey = constMatch[1];
      currentRows = [];
      continue;
    }
    if (currentKey) {
      const rowMatch = line.match(/'([^']+)'/);
      if (rowMatch) {
        currentRows.push(rowMatch[1]);
      }
      if (line.includes('];')) {
        if (currentRows.length === 16) {
          result[currentKey] = currentRows;
        }
        currentKey = null;
        currentRows = [];
      }
    }
  }
  return result;
}

const e1Matrices = extractMatrices(e1Text);

const P = {
  '.': null,

  // 1px Dark Outline & Contours
  'K': 0x0F172A,
  'k': 0x1E293B,

  // Industrial Yellow Metallic Casing
  'Y': 0xFEF08A,
  'y': 0xFACC15,
  'J': 0xEAB308,
  'j': 0xCA8A04,

  // Metallic Gray / Slate Body & Joints & Treads
  'C': 0xE2E8F0,
  'c': 0xCBD5E1,
  'm': 0x94A3B8,
  'M': 0x64748B,
  'd': 0x475569,
  'D': 0x334155,
  'S': 0x64748B,
  's': 0x475569,

  // Glowing LED Visor & Screen Expressions
  'W': 0xFFFFFF,
  'L': 0xE0F2FE,
  'V': 0x38BDF8,
  'v': 0x06B6D4,
  'z': 0x0284C7,
  'Z': 0x0369A1,
  'B': 0x0284C7,
  'b': 0x0369A1,

  // Antenna Tip & Gear Accent Details
  'O': 0xFFEDD5,
  'o': 0xF97316,
  'R': 0xEF4444,
  'r': 0xC2410C,
  'A': 0xF59E0B,
  'a': 0xD97706,

  // Status Indicator, Action FX, Tool & Crop Compatibility Tokens
  'G': 0x22C55E,
  'g': 0x15803D,
  'n': 0x78350F,
  'u': 0x38BDF8,
  'U': 0x0284C7,
  'w': 0xE0F2FE,
  'X': 0xFFE0C2,
  'q': 0x213252,
  'Q': 0x141E36,
  '2': 0x1E3A8A,
  'F': 0xD5CFBF
};

const combined = {
  down_0: walkJson.down_0,
  down_1: walkJson.down_1,
  down_2: walkJson.down_2,
  up_0: walkJson.up_0,
  up_1: walkJson.up_1,
  up_2: walkJson.up_2,
  left_0: walkJson.left_0,
  left_1: walkJson.left_1,
  left_2: walkJson.left_2,
  right_0: walkJson.right_0,
  right_1: walkJson.right_1,
  right_2: walkJson.right_2,

  water_down_0: e1Matrices.water_down_0,
  water_down_1: e1Matrices.water_down_1,
  water_down_2: e1Matrices.water_down_2,
  harvest_down_0: e1Matrices.harvest_down_0,
  harvest_down_1: e1Matrices.harvest_down_1,
  harvest_down_2: e1Matrices.harvest_down_2,
  pick_down_0: e1Matrices.pick_down_0,
  pick_down_1: e1Matrices.pick_down_1,
  pick_down_2: e1Matrices.pick_down_2,

  tool_watering_can: e1Matrices.tool_watering_can,
  tool_basket: e1Matrices.tool_basket,
  tool_sickle: e1Matrices.tool_sickle,
};

let missingTokens = 0;
for (const key in combined) {
  const rows = combined[key];
  rows.forEach((row, rIdx) => {
    for (const ch of row) {
      if (!(ch in P)) {
        console.error(`Missing token in P: '${ch}' in ${key} line ${rIdx}`);
        missingTokens++;
      }
    }
  });
}

console.log(`Palette validation complete. Missing tokens: ${missingTokens}`);
