const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const rendererStart = code.indexOf('class PixelArtRenderer');
const rendererEnd = code.indexOf('class DynamicShadowSystem');
const rendererCode = code.substring(rendererStart, rendererEnd);

console.log('=== AUDITING PixelArtRenderer PALETTES ONLY ===');

// Extract all palette objects in PixelArtRenderer
const lines = rendererCode.split('\n');

let currentMethod = '';
let totalPalettes = 0;
let kCount = 0;
let nonDarkSlateK = [];
let lowTonePalettes = [];
let multiCharTokens = [];

lines.forEach((line, idx) => {
  if (line.includes('static ') || line.includes('_gen') || line.includes('generate')) {
    if (line.trim().startsWith('static') || line.trim().startsWith('_gen')) {
      currentMethod = line.trim();
    }
  }

  // Check palette keys in line or object block
  if (line.includes("'K':") || line.includes('"K":')) {
    kCount++;
    const match = line.match(/['"]K['"]\s*:\s*(0x[0-9a-fA-F]+)/);
    if (match) {
      const val = match[1].toUpperCase();
      if (val !== '0X0F172A') {
        nonDarkSlateK.push({ method: currentMethod, lineIdx: idx + 1, found: val, lineContent: line.trim() });
      }
    }
  }

  // Check multi-character token keys in object declarations
  const tokenMatches = line.match(/['"]([a-zA-Z0-9_-]{2,})['"]\s*:\s*0x[0-9a-fA-F]+/g);
  if (tokenMatches) {
    multiCharTokens.push({ method: currentMethod, lineIdx: idx + 1, tokens: tokenMatches });
  }
});

console.log(`Total 'K' entries in PixelArtRenderer: ${kCount}`);
console.log(`Non-0x0F172A 'K' entries in PixelArtRenderer: ${nonDarkSlateK.length}`);
if (nonDarkSlateK.length > 0) {
  console.log('NON-COMPLIANT K ENTRIES IN PixelArtRenderer:');
  console.log(nonDarkSlateK);
}

console.log(`Multi-character token keys in PixelArtRenderer: ${multiCharTokens.length}`);
if (multiCharTokens.length > 0) {
  console.log(multiCharTokens);
}
