const fs = require('fs');

const content = fs.readFileSync('game.js', 'utf8');
const assetsContent = fs.readFileSync('assets/game.js', 'utf8');

console.log('1. File parity check (game.js vs assets/game.js):', content === assetsContent ? 'PASS' : 'FAIL');

// Test 1: DECOR_PALETTE 'c'
const decorMatch = content.includes("'c': 0x6BB1D6");
console.log('2. DECOR_PALETTE c key:', decorMatch ? 'PASS' : 'FAIL');

// Test 2: dock_plank row widths
const dockPlankMatch = content.match(/const dock_plank = \[\s*([\s\S]*?)\s*\];/);
if (dockPlankMatch) {
  const rows = eval('[' + dockPlankMatch[1] + ']');
  const all16 = rows.every(r => r.length === 16);
  console.log('3. dock_plank row widths (all 16):', all16 ? 'PASS' : 'FAIL', rows.map(r => r.length));
} else {
  console.log('3. dock_plank row widths: FAIL (not found)');
}

// Test 3: catfish space token
const catfishMatch = content.match(/const catfish = \[\s*([\s\S]*?)\s*\];/);
if (catfishMatch) {
  const rows = eval('[' + catfishMatch[1] + ']');
  const row5 = rows[5];
  console.log('4. catfish row 5 starts with .:', row5.startsWith('.') ? 'PASS' : 'FAIL', JSON.stringify(row5));
} else {
  console.log('4. catfish row 5: FAIL (not found)');
}

// Test 4: clam, dock_post, bobber, rod body tones & outline
const checkMatrix = (name, minTones, checkOutlineKey) => {
  const match = content.match(new RegExp('const ' + name + ' = \\[\\s\\S]*?\\xb7?\\\\];|const ' + name + ' = \\[[\\s\\S]*?\\];'));
  if (!match) return console.log(name + ': FAIL (not found)');
  const rows = eval(match[0].replace('const ' + name + ' = ', '').replace(';', ''));
  const tokens = new Set(rows.join('').replace(/\./g, '').split(''));
  if (checkOutlineKey) {
    const hasOutline = tokens.has(checkOutlineKey);
    console.log(name + ' outline ' + checkOutlineKey + ':', hasOutline ? 'PASS' : 'FAIL');
    tokens.delete(checkOutlineKey);
  }
  console.log(name + ' body tones (count ' + tokens.size + '):', tokens.size >= minTones ? 'PASS' : 'FAIL', Array.from(tokens));
};

checkMatrix('clam', 3);
checkMatrix('dock_post', 3);
checkMatrix('bobber', 3);
checkMatrix('rod', 3, 'K');
