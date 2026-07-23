const fs = require('fs');

const filesToCompare = ['game.js', 'index.html', 'levels.json', 'save_data.json'];
let allInSync = true;

filesToCompare.forEach(file => {
    const rootPath = file;
    const assetPath = `assets/${file}`;
    if (!fs.existsSync(assetPath)) {
        console.log(`✗ ${assetPath} missing!`);
        allInSync = false;
        return;
    }
    
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const assetContent = fs.readFileSync(assetPath, 'utf8');
    
    if (rootContent === assetContent) {
        console.log(`✓ ${file} is in PERFECT SYNC with assets/${file}`);
    } else {
        console.log(`✗ ${file} DIFFERS from assets/${file} (root length: ${rootContent.length}, asset length: ${assetContent.length})`);
        allInSync = false;
    }
});

if (allInSync) {
    console.log('\nALL ASSET FILES ARE 100% IN SYNC WITH ROOT!');
} else {
    console.log('\nWARNING: Asset files out of sync!');
}
