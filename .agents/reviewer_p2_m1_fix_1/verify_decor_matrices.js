const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');

// Extract DECOR_PALETTE
const decorPaletteMatch = code.match(/const DECOR_PALETTE = (\{[\s\S]*?\});/);
let DECOR_PALETTE = {};
if (decorPaletteMatch) {
    eval('DECOR_PALETTE = ' + decorPaletteMatch[1]);
}

// Find all PixelArtRenderer.drawMatrix(..., [ ... ], DECOR_PALETTE, ...)
const drawMatrixRegex = /PixelArtRenderer\.drawMatrix\s*\(\s*(\w+)\s*,\s*(\[\s*["'`][\s\S]*?["'`]\s*\])\s*,\s*DECOR_PALETTE/g;

let match;
let totalDecorMatrices = 0;
let errors = 0;

console.log('=== VERIFYING DECOR_PALETTE MATRICES ===\n');

while ((match = drawMatrixRegex.exec(code)) !== null) {
    totalDecorMatrices++;
    const varName = match[1];
    const matrixStr = match[2];
    try {
        const matrix = eval(matrixStr);
        const rows = matrix.length;
        const width = matrix[0].length;
        
        // Find texture key if generated on next lines
        const postIdx = match.index + match[0].length;
        const postSnippet = code.substring(postIdx, postIdx + 200);
        const texKeyMatch = postSnippet.match(/generateTexture\(['"]([^'"]+)['"]/);
        const texKey = texKeyMatch ? texKeyMatch[1] : varName;

        console.log(`Matrix #${totalDecorMatrices}: Key='${texKey}' (Var: ${varName}, ${rows}x${width})`);

        // 1. Check Row Widths
        let widthOk = true;
        matrix.forEach((r, i) => {
            if (r.length !== width) {
                console.error(`  [FAIL] Row ${i} length=${r.length}, expected ${width}`);
                widthOk = false;
                errors++;
            }
        });
        if (widthOk) console.log(`  [PASS] All ${rows} rows have exact width ${width}`);

        // 2. Check Tokens in DECOR_PALETTE
        const tokens = new Set();
        matrix.forEach(r => r.split('').forEach(ch => tokens.add(ch)));
        const unmapped = Array.from(tokens).filter(ch => !(ch in DECOR_PALETTE));
        if (unmapped.length > 0) {
            console.error(`  [FAIL] Unmapped tokens:`, unmapped);
            errors++;
        } else {
            console.log(`  [PASS] All tokens mapped in DECOR_PALETTE (${Array.from(tokens).join('')})`);
        }

        // 3. Check 1px Dark Slate Outline 'K' (0x0F172A)
        const hasK = tokens.has('K');
        if (hasK) {
            console.log(`  [PASS] Has 1px dark slate outline 'K'`);
        } else {
            console.warn(`  [WARN] Does not use 'K' outline`);
        }

        // 4. Check Shading Tones (excluding '.' and 'K')
        const bodyTokens = Array.from(tokens).filter(ch => ch !== '.' && ch !== 'K');
        console.log(`  Shading tone tokens (${bodyTokens.length}): ${bodyTokens.join(', ')}`);
        if (bodyTokens.length >= 3) {
            console.log(`  [PASS] 3+ shading tones present`);
        } else {
            console.log(`  [INFO] ${bodyTokens.length} shading tone(s) present`);
        }

        console.log('');
    } catch (e) {
        console.error(`Error parsing matrix for ${varName}:`, e.message);
        errors++;
    }
}

console.log(`Verified ${totalDecorMatrices} DECOR_PALETTE matrices with ${errors} errors.`);
