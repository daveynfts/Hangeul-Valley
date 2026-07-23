const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

function findOverlayHeader(id) {
  console.log(`\n=================== ${id} ===================`);
  const idx = html.indexOf(`id="${id}"`);
  if (idx !== -1) {
    const chunk = html.substring(idx, idx + 1200);
    // Find all buttons inside chunk
    const btnMatches = [...chunk.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)];
    btnMatches.forEach(b => {
      console.log(`Button: ${b[0]}`);
    });
  }
}

findOverlayHeader('shop-overlay');
findOverlayHeader('trophy-overlay');
findOverlayHeader('level-select-overlay');
