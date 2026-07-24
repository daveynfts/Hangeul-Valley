const fs = require('fs');

const P = {
  '.': null,
  'K': 0x0F172A, // Outer outline
  'k': 0x1E293B, // Inner dark outline
  'Y': 0xFEF08A, // Bright yellow highlight
  'y': 0xFACC15, // Vibrant yellow base
  'J': 0xEAB308, // Yellow mid-tone shadow
  'j': 0xCA8A04, // Yellow deep shadow
  'V': 0x854D0E, // Yellow dark contour edge
  'M': 0xE2E8F0, // Metallic light highlight
  'm': 0x94A3B8, // Slate gray light base
  'S': 0x64748B, // Slate gray mid base
  's': 0x475569, // Dark slate shadow
  'D': 0x334155, // Deep metallic slate
  'd': 0x1E293B, // Tread dark rubber
  'L': 0xE0F2FE, // Visor glint highlight
  'C': 0x38BDF8, // Visor cyan glow
  'c': 0x06B6D4, // Visor cyan mid
  'B': 0x0284C7, // Visor cyan shadow
  'b': 0x0369A1, // Visor dark border
  'O': 0xFFEDD5, // Antenna tip white/orange glow
  'o': 0xFB923C, // Antenna amber highlight
  'R': 0xF97316, // Amber/orange light base
  'r': 0xC2410C, // Dark amber shadow
  'G': 0x22C55E, // Status indicator green
  'g': 0x15803D, // Dark green indicator
  'W': 0xFFFFFF, // Pure white sparkle
  '0': 0x000000, // Black
  'n': 0x78350F, // Wood brown
  'e': 0x59381E, // Handle brown
  'E': 0x3B1F0E, // Dark wood
  'U': 0x38BDF8, // Water blue
  'u': 0x6BB1D6, // Water mid
  'A': 0xEF4444, // Crop red
  'a': 0xFCA5A5, // Crop highlight
  'Q': 0x7F1D1D, // Crop dark red
  'X': 0xFDE047, // Wicker highlight
  'x': 0xCA8A04, // Wicker shadow
  'F': 0xD5CFBF, // Light accent
  'z': 0x4B6B94, // Denim blue accent
  'H': 0x653E23, // Brown accent
  '1': 0xF8FAFC, // Light panel
  '2': 0x0284C7, // Dark cyan
  '3': 0x475569, // Dark slate
  '4': 0xF59E0B, // Warning yellow
  '5': 0x10B981  // Emerald LED
};

function checkMatrix(name, matrix) {
  if (matrix.length !== 16) throw new Error(`${name} has ${matrix.length} rows, expected 16`);
  const errors = [];
  for (let r = 0; r < 16; r++) {
    if (matrix[r].length !== 16) throw new Error(`${name} row ${r} has length ${matrix[r].length}, expected 16`);
    for (let c = 0; c < 16; c++) {
      const ch = matrix[r][c];
      if (!(ch in P)) errors.push(`${name} [${r},${c}] token '${ch}' not in palette P`);
      if (ch !== '.' && ch !== 'K') {
        const neighbors = [
          r > 0 ? matrix[r-1][c] : '.',
          r < 15 ? matrix[r+1][c] : '.',
          c > 0 ? matrix[r][c-1] : '.',
          c < 15 ? matrix[r][c+1] : '.'
        ];
        if (neighbors.includes('.')) {
          errors.push(`${name} [${r},${c}] token '${ch}' touches '.'`);
        }
      }
    }
  }
  if (errors.length > 0) {
    console.error(`=== Errors for ${name} (${errors.length}) ===`);
    errors.forEach(e => console.error('  ' + e));
    throw new Error(`${name} failed checkMatrix with ${errors.length} errors`);
  }
}

function autoEnclose(rawMatrix) {
  // Given a 16x16 grid of tokens where outer boundaries might touch '.',
  // return a new matrix where any non-'.' pixel adjacent to '.' is replaced with 'K'
  const res = rawMatrix.map(row => row.split(''));
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const ch = rawMatrix[r][c];
      if (ch !== '.') {
        const neighbors = [
          r > 0 ? rawMatrix[r-1][c] : '.',
          r < 15 ? rawMatrix[r+1][c] : '.',
          c > 0 ? rawMatrix[r][c-1] : '.',
          c < 15 ? rawMatrix[r][c+1] : '.'
        ];
        if (neighbors.includes('.')) {
          res[r][c] = 'K';
        }
      }
    }
  }
  return res.map(row => row.join(''));
}

function countDiffs(m1, m2, startRow = 0, endRow = 15) {
  let diffs = 0;
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < 16; c++) {
      if (m1[r][c] !== m2[r][c]) diffs++;
    }
  }
  return diffs;
}

module.exports = { P, checkMatrix, autoEnclose, countDiffs };
