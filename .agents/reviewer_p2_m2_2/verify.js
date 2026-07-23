const fs = require('fs');

const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('====================================================');
console.log('       COMPREHENSIVE PIXEL ART REVIEW REPORT       ');
console.log('====================================================\n');

// 1. Declaration Duplication Check
const dungenonMatches = [...code.matchAll(/static _genDungeonTextures\s*\(/g)];
console.log('[FINDING 1] Method Duplication:');
console.log(`  static _genDungeonTextures count: ${dungenonMatches.length}`);
dungenonMatches.forEach((m, idx) => {
  const lineNo = code.substring(0, m.index).split('\n').length;
  console.log(`  - Declaration ${idx + 1} at line ${lineNo}`);
});

// 2. Matrix Row Width Check across all 9 sprites
console.log('\n[FINDING 2] Matrix Row Width & Grid Size Alignment:');
const startIdx = code.lastIndexOf('static _genDungeonTextures');
const secondDeclCode = code.substring(startIdx);

const matrixNames = ['slime', 'skeleton', 'goblin', 'boss', 'chest', 'coin', 'gem', 'potion', 'scroll'];

matrixNames.forEach(mName => {
  const mRegex = new RegExp(`const\\s+${mName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = secondDeclCode.match(mRegex);
  if (m) {
    const rows = m[1].split('\n').map(r => r.trim().replace(/['",]/g, '')).filter(Boolean);
    const rowLengths = rows.map(r => r.length);
    const expectedLen = rowLengths[0];
    const isUniform = rowLengths.every(l => l === expectedLen);
    const isExact16 = rowLengths.every(l => l === 16);
    console.log(`  ${mName}: ${rows.length} rows x ${expectedLen} cols -> Uniform: ${isUniform ? 'OK' : 'FAIL'}, Exact 16: ${isExact16 ? 'OK' : 'FAIL'}`);
    if (!isUniform || !isExact16) {
      rows.forEach((r, idx) => {
        if (r.length !== 16) {
          console.log(`    -> Row ${idx + 1} has length ${r.length} (expected 16): "${r}"`);
        }
      });
    }
  }
});

// 3. Unmapped Palette Token Check
console.log('\n[FINDING 3] Palette Token Mapping & Case Parity:');
const sprites = [
  { name: 'slime', palName: 'P_SLIME' },
  { name: 'skeleton', palName: 'P_SKELETON' },
  { name: 'goblin', palName: 'P_GOBLIN' },
  { name: 'boss', palName: 'P_DUNGEON_BOSS' },
  { name: 'chest', palName: 'P_CHEST' },
  { name: 'coin', palName: 'P_COIN' },
  { name: 'gem', palName: 'P_GEM' },
  { name: 'potion', palName: 'P_POTION' },
  { name: 'scroll', palName: 'P_SCROLL' }
];

sprites.forEach(s => {
  const pRegex = new RegExp(`const\\s+${s.palName}\\s*=\\s*\\{([\\s\\S]*?)\\};`);
  const mRegex = new RegExp(`const\\s+${s.name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  
  const pMatch = secondDeclCode.match(pRegex);
  const mMatch = secondDeclCode.match(mRegex);

  if (pMatch && mMatch) {
    const pContent = pMatch[1];
    const keys = pContent.split(',').map(pair => {
      const parts = pair.split(':');
      return parts.length >= 2 ? parts[0].trim().replace(/['"]/g, '') : '';
    }).filter(Boolean);

    const rows = mMatch[1].split('\n').map(r => r.trim().replace(/['",]/g, '')).filter(Boolean);
    
    const unmapped = new Set();
    rows.forEach(r => {
      for (let ch of r) {
        if (!keys.includes(ch)) {
          unmapped.add(ch);
        }
      }
    });

    if (unmapped.size > 0) {
      console.log(`  ${s.name} (${s.palName}): FAIL - Unmapped tokens found: [${Array.from(unmapped).map(c => `'${c}'`).join(', ')}]`);
    } else {
      console.log(`  ${s.name} (${s.palName}): PASS - All tokens mapped.`);
    }
  }
});

// 4. File Sync Verification
console.log('\n[FINDING 4] Root game.js vs assets/game.js Sync:');
const rootCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');
const assetsCode = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\assets\\game.js', 'utf8');
console.log(`  game.js length: ${rootCode.length}, assets/game.js length: ${assetsCode.length}`);
console.log(`  100% Identical: ${rootCode === assetsCode ? 'PASS' : 'FAIL'}`);
