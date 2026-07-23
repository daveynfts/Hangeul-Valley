const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

const lines = code.split('\n');

// Slice lines 2595 to 3000
const snippet = lines.slice(2594, 3000).join('\n');

const pMatch = snippet.match(/const P = (\{[\s\S]*?\});/);
let P = {};
if (pMatch) {
    eval('P = ' + pMatch[1]);
    console.log('PASS: Palette P found in _genFishingTextures with', Object.keys(P).length, 'keys');
} else {
    console.error('FAIL: Palette P not found in _genFishingTextures');
}

const matrices = [
    'carp', 'salmon', 'tuna', 'squid', 'eel', 'goldfish', 'seabass', 'shrimp', 'octopus',
    'catfish', 'mackerel', 'legendary', 'clam', 'dock_plank', 'dock_post', 'bobber', 'rod'
];

let totalMatrices = 0;
let totalErrors = 0;

console.log('\n=== VERIFYING FISHING SCENE MATRICES (LINES 2595-3000) ===\n');

matrices.forEach(name => {
    const reg = new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
    const m = snippet.match(reg);
    if (!m) {
        console.error(`FAIL: Matrix '${name}' not found`);
        totalErrors++;
        return;
    }
    totalMatrices++;
    try {
        const matrix = eval(m[1]);
        const rows = matrix.length;
        const width = matrix[0].length;
        console.log(`Matrix: '${name}' (${rows}x${width})`);

        // Width check
        let widthOk = true;
        matrix.forEach((r, i) => {
            if (r.length !== width) {
                console.error(`  [FAIL] Row ${i} length=${r.length}, expected ${width}`);
                widthOk = false;
                totalErrors++;
            }
        });
        if (widthOk) console.log(`  [PASS] All ${rows} rows have exact width ${width}`);

        // Tokens check
        const tokens = new Set();
        matrix.forEach(r => r.split('').forEach(ch => tokens.add(ch)));
        const unmapped = Array.from(tokens).filter(ch => !(ch in P));
        if (unmapped.length > 0) {
            console.error(`  [FAIL] Unmapped tokens in P:`, unmapped);
            totalErrors++;
        } else {
            console.log(`  [PASS] All tokens mapped in palette P (${Array.from(tokens).join('')})`);
        }

        // 1px Dark Slate Outline 'K' (0x0F172A)
        const hasK = tokens.has('K');
        if (hasK) {
            console.log(`  [PASS] Has 1px dark slate outline 'K'`);
        } else {
            console.warn(`  [WARN] Missing 'K' outline`);
        }

        // Body shading tones count (excluding '.' and 'K')
        const bodyTokens = Array.from(tokens).filter(ch => ch !== '.' && ch !== 'K');
        console.log(`  Shading tone tokens (${bodyTokens.length}): ${bodyTokens.join(', ')}`);
        if (bodyTokens.length >= 3) {
            console.log(`  [PASS] 3+ shading tones present`);
        } else {
            console.log(`  [INFO] ${bodyTokens.length} shading tone(s) present`);
        }

        console.log('');
    } catch(e) {
        console.error(`Error processing '${name}':`, e.message);
        totalErrors++;
    }
});

console.log(`Verified ${totalMatrices} fishing matrices with ${totalErrors} errors.`);
