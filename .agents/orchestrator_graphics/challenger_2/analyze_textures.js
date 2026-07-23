const fs = require('fs');

const code = fs.readFileSync('game.js', 'utf8');

// 1. Find all generateTexture calls
const regex = /generateTexture\s*\(\s*['"`](.*?)['"`]\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/g;
let match;
const generateTextureCalls = [];
while ((match = regex.exec(code)) !== null) {
  // Find line number
  const lineNumber = code.substring(0, match.index).split('\n').length;
  generateTextureCalls.push({
    line: lineNumber,
    key: match[1],
    widthExpr: match[2],
    heightExpr: match[3],
    raw: match[0]
  });
}

console.log(`Found ${generateTextureCalls.length} generateTexture calls.`);

// 2. Check generateTilemapTextures definition specifically
const tilemapFnMatch = code.match(/static generateTilemapTextures\(scene\)\s*\{([\s\S]*?)\n\s*\}\n/);
if (tilemapFnMatch) {
  const fnBody = tilemapFnMatch[1];
  const makeTileRegex = /makeTile\s*\(\s*['"`](.*?)['"`]\s*,\s*\((.*?)\)\s*=>\s*\{([\s\S]*?)\}\s*\);/g;
  let tMatch;
  const tilemaps = [];
  while ((tMatch = makeTileRegex.exec(fnBody)) !== null) {
    const key = tMatch[1];
    const tileBody = tMatch[3];
    
    // Check graphics calls inside tileBody
    const fillStyleCalls = (tileBody.match(/g\.fillStyle\s*\((.*?)\)/g) || []).map(c => c.trim());
    const fillRectCalls = (tileBody.match(/g\.fillRect\s*\((.*?)\)/g) || []).map(c => c.trim());
    
    // Parse fillRect coordinates and check bounds (0 to 48)
    const outOfBounds = [];
    const invalidColors = [];

    // Analyze colors
    fillStyleCalls.forEach(c => {
      const argsMatch = c.match(/g\.fillStyle\s*\(\s*(.*?)\s*(?:,\s*(.*?)\s*)?\)/);
      if (argsMatch) {
        const color = argsMatch[1];
        const alpha = argsMatch[2];
        if (color.startsWith('0x') || !isNaN(Number(color))) {
          const num = Number(color);
          if (isNaN(num) || num < 0 || num > 0xFFFFFF) {
            invalidColors.push(color);
          }
        }
        if (alpha !== undefined && (isNaN(Number(alpha)) || Number(alpha) < 0 || Number(alpha) > 1)) {
          invalidColors.push(`alpha:${alpha}`);
        }
      }
    });

    // Analyze rect coordinates
    const rectRegex = /g\.fillRect\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
    let rMatch;
    while ((rMatch = rectRegex.exec(tileBody)) !== null) {
      const x = parseFloat(rMatch[1]);
      const y = parseFloat(rMatch[2]);
      const w = parseFloat(rMatch[3]);
      const h = parseFloat(rMatch[4]);

      if (x < 0 || y < 0 || (x + w) > 48 || (y + h) > 48) {
        outOfBounds.push({ x, y, w, h, right: x + w, bottom: y + h });
      }
    }

    // Check for loop-based fillRects or dynamic expressions
    const nonConstRects = (tileBody.match(/g\.fillRect\s*\([^)]*?[a-zA-Z].*?\)/g) || []);

    tilemaps.push({
      key,
      fillStyleCount: fillStyleCalls.length,
      fillRectCount: fillRectCalls.length,
      outOfBounds,
      invalidColors,
      nonConstRects
    });
  }

  console.log(`\n--- Tilemap Textures Analysis (${tilemaps.length} tilemaps found) ---`);
  tilemaps.forEach((t, idx) => {
    console.log(`${idx + 1}. [${t.key}] fillStyle: ${t.fillStyleCount}, fillRect: ${t.fillRectCount}, OOB: ${t.outOfBounds.length}, NonConstRects: ${t.nonConstRects.length}`);
    if (t.outOfBounds.length > 0) {
      console.log(`   ⚠️ OOB Rects:`, t.outOfBounds);
    }
    if (t.invalidColors.length > 0) {
      console.log(`   ⚠️ Invalid Colors:`, t.invalidColors);
    }
    if (t.nonConstRects.length > 0) {
      console.log(`   ℹ️ Dynamic/Loop Rects:`, t.nonConstRects);
    }
  });
}
