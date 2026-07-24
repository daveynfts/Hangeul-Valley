const fs = require('fs');

global.window = { addEventListener: () => {} };
global.document = { getElementById: () => ({ addEventListener: () => {} }) };
global.Phaser = {
  Scene: class {},
  Textures: { FilterMode: { NEAREST: 1 } },
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  AUTO: 1,
  Game: class {}
};

const code = fs.readFileSync('../../game.js', 'utf8') + '; global.PixelArtRenderer = PixelArtRenderer;';
eval(code);

console.log('=== WIZARD NPC (R2) AUDIT ===');
const wpalKeys = Object.keys(PixelArtRenderer.W_PAL);
const wpalColorKeys = wpalKeys.filter(k => k !== '.' && PixelArtRenderer.W_PAL[k] !== null);
const wpalUniqueHex = new Set(wpalColorKeys.map(k => PixelArtRenderer.W_PAL[k]));
console.log('Total keys in W_PAL:', wpalKeys.length);
console.log('Color keys in W_PAL (excluding .):', wpalColorKeys.length);
console.log('Unique hex values in W_PAL:', wpalUniqueHex.size);

console.log('\nWIZ_0 Row Length Audit:');
PixelArtRenderer.WIZ_0.forEach((r, i) => {
  if (r.length !== 16) console.log(`  [WARNING] WIZ_0 row ${i} length is ${r.length} (expected 16): '${r}'`);
});

console.log('\nWIZ_1 Row Length Audit:');
PixelArtRenderer.WIZ_1.forEach((r, i) => {
  if (r.length !== 16) console.log(`  [WARNING] WIZ_1 row ${i} length is ${r.length} (expected 16): '${r}'`);
});

const wiz0CharsUsed = new Set();
PixelArtRenderer.WIZ_0.forEach(r => { for (let c of r) wiz0CharsUsed.add(c); });
const wiz1CharsUsed = new Set();
PixelArtRenderer.WIZ_1.forEach(r => { for (let c of r) wiz1CharsUsed.add(c); });

const allWizChars = new Set([...wiz0CharsUsed, ...wiz1CharsUsed]);
console.log('\nChars used in WIZ_0 & WIZ_1:', Array.from(allWizChars).sort().join(', '));
const unusedWpal = wpalColorKeys.filter(k => !allWizChars.has(k));
console.log('W_PAL color tokens defined but NOT used in matrices:', unusedWpal);

console.log('\nWIZ_0 vs WIZ_1 Micro-animation Differences:');
let diffCount = 0;
for (let y = 0; y < Math.max(PixelArtRenderer.WIZ_0.length, PixelArtRenderer.WIZ_1.length); y++) {
  const r0 = PixelArtRenderer.WIZ_0[y] || '';
  const r1 = PixelArtRenderer.WIZ_1[y] || '';
  if (r0 !== r1) {
    diffCount++;
    console.log(`  Row ${y}:`);
    console.log(`    WIZ_0: '${r0}' (len ${r0.length})`);
    console.log(`    WIZ_1: '${r1}' (len ${r1.length})`);
  }
}
console.log('Total differing rows:', diffCount);

console.log('\n=== SHOP NPC (R1) AUDIT ===');
const shopStart = code.indexOf('const SHOP_PALETTE =');
const shopEnd = code.indexOf("gs.generateTexture('shop_sign'", shopStart);
const shopCode = code.slice(shopStart, shopEnd);

const DECOR_PALETTE = {
  '.': null,
  'K': 0x0F172A,
  'k': 0x1E293B,
  'H': 0x8FD19E,
  'G': 0x4A7C59,
  'g': 0x2D4E35,
  'M': 0x1A3622,
  'O': 0xD99B66,
  'o': 0xB3713D,
  'W': 0x8F5428,
  'w': 0x573012,
  'D': 0x8F5428,
  'd': 0x573012,
  't': 0xC7C1BD,
  'T': 0x9E9793,
  'S': 0x7D7571,
  's': 0x4A4440,
  'E': 0xE0F2FE,
  'v': 0x38BDF8,
  'V': 0x0284C7,
  'C': 0x0369A1,
  'c': 0x6BB1D6,
  'Y': 0xFDE047,
  'y': 0xD97706
};

// Extract matrix from shopCode manually
const matrixMatch = shopCode.match(/PixelArtRenderer\.drawMatrix\(gs,\s*(\[[\s\S]*?\]),\s*SHOP_PALETTE/);
const shopMatrix = eval(matrixMatch[1]);
const paletteMatch = shopCode.match(/const SHOP_PALETTE = Object\.assign\(\{\}, DECOR_PALETTE, (\{[\s\S]*?\})\);/);
const shopAdditions = eval('(' + paletteMatch[1] + ')');
const SHOP_PALETTE = Object.assign({}, DECOR_PALETTE, shopAdditions);

console.log('Shop matrix rows:', shopMatrix.length);
shopMatrix.forEach((r, i) => {
  if (r.length !== 18) console.log(`  [WARNING] Shop matrix row ${i} length is ${r.length} (expected 18): '${r}'`);
});

const shopCharsUsed = new Set();
shopMatrix.forEach(r => { for (let c of r) shopCharsUsed.add(c); });
const shopCharsArr = Array.from(shopCharsUsed).sort();
console.log('Chars used in Shop matrix:', shopCharsArr.join(', '));

const shopColorCharsUsed = shopCharsArr.filter(c => c !== '.' && SHOP_PALETTE[c] !== null);
console.log('Unique non-null color tokens used in Shop matrix:', shopColorCharsUsed.length);
console.log('Color token list:', shopColorCharsUsed);

const shopHexUsed = new Set(shopColorCharsUsed.map(c => SHOP_PALETTE[c]));
console.log('Unique fill color hex values used in Shop matrix:', shopHexUsed.size);
console.log('Hex values:', Array.from(shopHexUsed).map(h => '0x' + h.toString(16).toUpperCase()));

const shopPaletteColorTokens = Object.keys(SHOP_PALETTE).filter(k => k !== '.' && SHOP_PALETTE[k] !== null);
console.log('Total color tokens defined in SHOP_PALETTE:', shopPaletteColorTokens.length);
