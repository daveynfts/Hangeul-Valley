const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

console.log('=== COMPREHENSIVE MATRIX AUDIT ===');

function parseNamedArray(content, varName) {
  const regex = new RegExp(`${varName}\\s*=\\s*\\[\\r?\\n([\\s\\S]*?)\\r?\\n\\s*\\];`);
  const m = content.match(regex);
  if (!m) return null;
  return m[1].split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith("'")).map(l => l.replace(/^'|',?$/g, ''));
}

const matrices = [
  { name: 'WIZ_0', data: parseNamedArray(content, 'static WIZ_0'), expectedW: 16, expectedH: 20 },
  { name: 'WIZ_1', data: parseNamedArray(content, 'static WIZ_1'), expectedW: 16, expectedH: 20 },
  { name: 'cat_idle_0', data: parseNamedArray(content, 'const cat_idle_0'), expectedW: 16, expectedH: 16 },
  { name: 'cat_idle_1', data: parseNamedArray(content, 'const cat_idle_1'), expectedW: 16, expectedH: 16 },
];

// For shop_sign (inline in _bakeTextures)
const shopMatch = content.match(/\/\/ Shop sign texture 18x22[\s\S]*?PixelArtRenderer\.drawMatrix\(gs, \[\r?\n([\s\S]*?)\r?\n    \], SHOP_PALETTE/);
if (shopMatch) {
  const lines = shopMatch[1].split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith("'")).map(l => l.replace(/^'|',?$/g, ''));
  matrices.push({ name: 'shop_sign', data: lines, expectedW: 18, expectedH: 22 });
}

matrices.forEach(m => {
  if (!m.data) {
    console.log(`- ${m.name}: NOT FOUND`);
    return;
  }
  const h = m.data.length;
  const badRows = [];
  m.data.forEach((r, idx) => {
    if (r.length !== m.expectedW) {
      badRows.push({ row: idx, len: r.length, content: r });
    }
  });
  console.log(`- ${m.name}: ${h}x${m.expectedW} (Expected ${m.expectedW}x${m.expectedH}) | Bad Rows: ${badRows.length}`);
  if (badRows.length > 0) {
    badRows.forEach(b => console.log(`   * Row ${b.row}: len ${b.len} vs expected ${m.expectedW} -> "${b.content}"`));
  }
});
