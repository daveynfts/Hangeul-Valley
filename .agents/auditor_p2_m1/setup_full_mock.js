const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const header = `
global.createdTextures = {};
global.malformedMatrixErrors = [];
global.missingPaletteChars = [];

const baseGraphics = {
  generateTexture: (key, w, h) => {
    global.createdTextures[key] = { w, h };
  },
  destroy: () => {}
};

global.mockGraphics = new Proxy(baseGraphics, {
  get: (target, prop) => {
    if (prop in target) return target[prop];
    return () => {};
  }
});

global.mockScene = {
  textures: {
    exists: (key) => false,
    remove: () => {},
    get: () => ({ setFilter: () => {} })
  },
  make: {
    graphics: () => global.mockGraphics
  }
};

const mockElement = {
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  setAttribute: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {} }
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {
    addEventListener: () => {},
    getElementById: () => mockElement,
    querySelector: () => mockElement,
    querySelectorAll: () => []
  }
};
global.document = global.window.document;
global.localStorage = global.window.localStorage;
global.Phaser = {
  Scene: class Scene {},
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  AUTO: 1,
  Game: class Game {},
  Textures: { FilterMode: { NEAREST: 1 } },
  Math: { Between: () => 0 }
};
`;

const footer = `
const originalDrawMatrix = PixelArtRenderer.drawMatrix;
PixelArtRenderer.drawMatrix = function(g, matrix, palette, ox, oy, ps) {
  if (matrix && matrix.length > 0) {
    const expectedLen = matrix[0].length;
    matrix.forEach((row, idx) => {
      if (typeof row === 'string') {
        if (row.length !== expectedLen) {
          global.malformedMatrixErrors.push({
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
            global.missingPaletteChars.push({ char, rowIdx: idx, row });
          }
        }
      }
    });
  }
  return originalDrawMatrix.call(this, g, matrix, palette, ox, oy, ps);
};

console.log("--- EXECUTING TEXTURE GENERATION ---");
PixelArtRenderer.generateAllTextures(global.mockScene);
PixelArtRenderer.generateTilemapTextures(global.mockScene);

console.log("Total textures successfully created:", Object.keys(global.createdTextures).length);
console.log("Malformed matrix errors detected during drawMatrix:", global.malformedMatrixErrors.length);
global.malformedMatrixErrors.forEach((e, i) => {
  console.log(\`Defect #\${i+1}: Matrix (\${e.matrixRows} rows x expected \${e.expectedLen} cols). Row \${e.rowIdx+1} length is \${e.actualLen}: "\${e.row}"\`);
});

console.log("Missing palette char lookups detected:", global.missingPaletteChars.length);
global.missingPaletteChars.forEach((m, i) => {
  console.log(\`Missing Char #\${i+1}: '\${m.char}' in Row \${m.rowIdx+1}: "\${m.row}"\`);
});
`;

fs.writeFileSync('C:\\VibeCode\\Hangeul Valley\\.agents\\auditor_p2_m1\\run_full_mock_test.js', header + code + footer);
console.log("Created run_full_mock_test.js");
