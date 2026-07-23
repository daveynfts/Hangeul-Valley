const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

// Find static generateTilemapTextures method body
const startIdx = content.indexOf('static generateTilemapTextures');
const endIdx = content.indexOf('static ', startIdx + 50); // next static method or class end
const tileMapCode = content.substring(startIdx, endIdx > 0 ? endIdx : startIdx + 20000);

const makeTileBlocks = [...tileMapCode.matchAll(/makeTile\(['"`]([^'"`]+)['"`],\s*\(([^)]+)\)\s*=>\s*\{([\s\S]*?)\}\);/g)];

console.log(`Found ${makeTileBlocks.length} tilemap texture definitions in generateTilemapTextures.`);

let passCount = 0;
let failCount = 0;

makeTileBlocks.forEach((block, idx) => {
    const key = block[1];
    const body = block[3];
    
    const hasFillStyle = body.includes('g.fillStyle');
    const hasFillRect = body.includes('g.fillRect');
    const lineCount = body.split('\n').length;
    
    if (hasFillStyle && hasFillRect && lineCount > 1) {
        passCount++;
        console.log(`✓ [${idx+1}/44] ${key}: VALID (lines: ${lineCount}, has fillStyle & fillRect)`);
    } else {
        failCount++;
        console.log(`✗ [${idx+1}/44] ${key}: INVALID OR FACADE! Body: ${body}`);
    }
});

console.log(`\nSummary: ${passCount} PASSED, ${failCount} FAILED out of ${makeTileBlocks.length} tilemaps.`);
