const fs = require('fs');
const path = require('path');

function searchInDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== '.git' && file !== 'node_modules') {
        searchInDir(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      if (code.includes('PixelArtRenderer')) {
        console.log(`Found 'PixelArtRenderer' in ${fullPath}`);
        const lines = code.split('\n');
        lines.forEach((l, i) => {
          if (l.includes('PixelArtRenderer')) {
            console.log(`  L${i+1}: ${l.trim()}`);
          }
        });
      }
    }
  });
}

searchInDir('C:\\VibeCode\\Hangeul Valley');
