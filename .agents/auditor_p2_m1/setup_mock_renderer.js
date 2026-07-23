const fs = require('fs');

// We will mock minimal Phaser environment and run PixelArtRenderer texture generators from game.js
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Mock Phaser texture manager
const createdTextures = {};
const malformedMatrixErrors = [];

const mockGraphics = {
  fillStyle: () => {},
  fillRect: () => {},
  generateTexture: (key, w, h) => {
    createdTextures[key] = { w, h };
  },
  destroy: () => {}
};

const mockScene = {
  textures: {
    exists: (key) => false,
    remove: () => {},
    get: () => ({ setFilter: () => {} })
  },
  make: {
    graphics: () => mockGraphics
  }
};

// Override PixelArtRenderer.drawMatrix to inspect every matrix being drawn
const wrappedCode = code + `
\n
// Wrap drawMatrix to validate row lengths and palette keys
const originalDrawMatrix = PixelArtRenderer.drawMatrix;
PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox, oy, ps) {
  if (matrix && matrix.length > 0) {
    const expectedLen = matrix[0].length;
    matrix.forEach((row, idx) => {
      if (typeof row === 'string') {
        if (row.length !== expectedLen) {
          malformedMatrixErrors.push({
            expectedLen,
            actualLen: row.length,
            rowIdx: idx,
            row,
            matrixRows: matrix.length
          });
        }
        for (let rx = 0; rx < row.length; rx++) {
          const char = row[rx];
          if (char !== '.' && char !== ' ' && palette[char] === undefined) {
            console.log("Missing palette char lookup:", char);
          }
        }
      }
    });
  }
  return originalDrawMatrix.call(this, g, matrix, palette, ox, oy, ps);
};

console.log("Executing generateAllTextures...");
PixelArtRenderer.generateAllTextures(mockScene);
console.log("Total textures generated:", Object.keys(createdTextures).length);
console.log("Malformed matrix errors caught during drawMatrix:", malformedMatrixErrors.length);
malformedMatrixErrors.forEach((e, i) => {
  console.log(\`Error #\${i+1}: Matrix \${e.matrixRows} rows, Row \${e.rowIdx+1} length \${e.actualLen} vs expected \${e.expectedLen} (Row: "\${e.row}")\`);
});
`;

fs.writeFileSync('C:\\VibeCode\\Hangeul Valley\\.agents\\auditor_p2_m1\\run_mock_renderer.js', wrappedCode);
