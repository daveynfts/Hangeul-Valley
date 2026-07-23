const fs = require('fs');

const code = fs.readFileSync('game.js', 'utf8');

console.log('=== VERIFYING GAME.JS ===');

// Check syntax first
try {
    require('child_process').execSync('node -c game.js');
    console.log('PASS: node -c game.js syntax check succeeded');
} catch (e) {
    console.error('FAIL: syntax error in game.js:', e.message);
}

// Check assets/game.js parity
try {
    const assetsCode = fs.readFileSync('assets/game.js', 'utf8');
    if (code === assetsCode) {
        console.log('PASS: game.js and assets/game.js are byte-for-byte identical');
    } else {
        console.error('FAIL: game.js and assets/game.js differ!');
    }
} catch (e) {
    console.error('ERROR reading assets/game.js:', e.message);
}

// Extract DECOR_PALETTE
const decorPaletteMatch = code.match(/const DECOR_PALETTE = (\{[\s\S]*?\});/);
let DECOR_PALETTE = {};
if (decorPaletteMatch) {
    eval('DECOR_PALETTE = ' + decorPaletteMatch[1]);
    console.log('PASS: DECOR_PALETTE found with', Object.keys(DECOR_PALETTE).length, 'keys');
    if ('c' in DECOR_PALETTE && DECOR_PALETTE['c'] === 0x6BB1D6) {
        console.log('PASS: DECOR_PALETTE contains c: 0x6BB1D6 (cyan water basin)');
    } else {
        console.error('FAIL: DECOR_PALETTE c key is missing or incorrect:', DECOR_PALETTE['c']);
    }
} else {
    console.error('FAIL: DECOR_PALETTE not found');
}

// Find all matrix definitions or texture generator objects
// Let's inspect generateTilemapTextures and decoration matrices
console.log('\n--- Searching for tilemaps and decoration matrices ---');

// Let's find all array of strings definitions in game.js
const matrixRegex = /(?:const|let|var|[\w_]+:)\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/g;
// Or let's scan generateTilemapTextures function body
const genTilemapMatch = code.match(/function generateTilemapTextures\([\s\S]*?\n\}/);
if (genTilemapMatch) {
    console.log('Found generateTilemapTextures function');
}

// Let's inspect specific items updated by worker:
// stone_well, dock_plank, catfish, clam, dock_post, fishing_bobber, fishing_rod

const checkMatrix = (name, searchRegex) => {
    const m = code.match(searchRegex);
    if (!m) {
        console.error(`FAIL: Could not find ${name}`);
        return null;
    }
    try {
        const arrStr = m[1] || m[0];
        const arr = eval(arrStr);
        console.log(`\n--- Matrix: ${name} (${arr.length}x${arr[0].length}) ---`);
        const width = arr[0].length;
        let widthOk = true;
        arr.forEach((row, i) => {
            if (row.length !== width) {
                console.error(`  FAIL Row ${i} width=${row.length}, expected ${width}`);
                widthOk = false;
            }
        });
        if (widthOk) console.log(`  PASS: All ${arr.length} rows have equal width (${width})`);
        
        // Tokens check
        const tokens = new Set();
        arr.forEach(r => r.split('').forEach(ch => tokens.add(ch)));
        console.log(`  Tokens used: ${Array.from(tokens).join('')}`);
        
        const unmapped = Array.from(tokens).filter(ch => !(ch in DECOR_PALETTE));
        if (unmapped.length > 0) {
            console.error(`  FAIL: Unmapped tokens:`, unmapped);
        } else {
            console.log(`  PASS: All tokens mapped in DECOR_PALETTE`);
        }

        // Shading tones (excluding '.' transparent and 'K' outline)
        const bodyTokens = Array.from(tokens).filter(ch => ch !== '.' && ch !== 'K');
        console.log(`  Body shade tones count: ${bodyTokens.length} (Tokens: ${bodyTokens.join(', ')})`);
        
        // Outline 'K' check
        const hasOutlineK = tokens.has('K');
        console.log(`  Has 1px dark slate outline 'K': ${hasOutlineK}`);

        return { arr, tokens, bodyTokens, hasOutlineK };
    } catch (e) {
        console.error(`Error parsing ${name}:`, e.message);
        return null;
    }
};

// Check stone_well
checkMatrix('stone_well', /stone_well\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);
// Check dock_plank / fishing_dock
checkMatrix('dock_plank', /dock_plank\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);
// Check catfish / fishing_catfish
checkMatrix('catfish', /catfish\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);
// Check clam / fishing_clam
checkMatrix('clam', /clam\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);
// Check dock_post
checkMatrix('dock_post', /dock_post\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);
// Check fishing_bobber
checkMatrix('fishing_bobber', /fishing_bobber\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);
// Check fishing_rod
checkMatrix('fishing_rod', /fishing_rod\s*=\s*(\[\s*["'`][\s\S]*?["'`]\s*\])/);

