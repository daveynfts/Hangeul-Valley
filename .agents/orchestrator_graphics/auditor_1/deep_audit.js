const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

// 1. Inspect makeTile helper function in game.js
const lines = content.split('\n');
console.log('=== MAKETILE HELPER DEFINITION ===');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('generateTilemapTextures')) {
        for (let j = i; j < i + 40; j++) {
            console.log(`${j+1}: ${lines[j]}`);
        }
        break;
    }
}

// 2. Check all 44 tilemap textures creation details
console.log('\n=== CHECKING ALL 44 TILEMAP TEXTURES DEFINITIONS ===');
const makeTileMatches = [...content.matchAll(/makeTile\(['"`]([^'"`]+)['"`],\s*\(([^)]+)\)\s*=>\s*\{([\s\S]*?)\}\);/g)];
console.log(`Found ${makeTileMatches.length} makeTile blocks via regex.`);

makeTileMatches.forEach((m, idx) => {
    const key = m[1];
    const body = m[3].trim();
    const hasFillStyle = body.includes('fillStyle');
    const hasFillRect = body.includes('fillRect');
    console.log(`${idx+1}. [${key}]: fillStyle=${hasFillStyle}, fillRect=${hasFillRect}, bodyLength=${body.length} chars`);
    if (!hasFillStyle || !hasFillRect) {
        console.log(`   WARNING: ${key} might be a facade! Body: ${body}`);
    }
});

// 3. Inspect Scene usage of tilemaps
console.log('\n=== INSPECTING SCENE TILEMAP PLACEMENT / MAP CREATION ===');
const sceneNames = ['FarmScene', 'FishingScene', 'ArcadeScene', 'DungeonScene'];
sceneNames.forEach(sceneName => {
    console.log(`--- ${sceneName} ---`);
    const sceneRegex = new RegExp(`class ${sceneName}[\\s\\S]*?(?=class |$)`, 'g');
    const sceneMatch = sceneRegex.exec(content);
    if (sceneMatch) {
        const sceneBody = sceneMatch[0];
        const tileRefs = [...sceneBody.matchAll(/['"`](tile_[^'"`]+|nebula_[^'"`]+|planet_[^'"`]+|dungeon_torch)['"`]/g)].map(m => m[1]);
        const uniqueRefs = [...new Set(tileRefs)];
        console.log(`Used ${uniqueRefs.length} tilemap textures in ${sceneName}:`, uniqueRefs);
    } else {
        console.log(`Could not isolate ${sceneName}`);
    }
});
