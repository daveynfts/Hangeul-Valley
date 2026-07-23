const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const overlays = [
  'level-select-overlay',
  'shop-overlay',
  'fish-album-overlay',
  'memory-overlay',
  'trophy-overlay',
  'duel-overlay',
  'recipe-overlay',
  'pet-overlay',
  'seasonal-overlay',
  'leaderboard-overlay'
];

console.log("=== CHECKING INDEX.HTML OVERLAYS & CLOSE BUTTONS ===");

overlays.forEach(id => {
  const hasId = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  console.log(`\nOverlay: ${id} -> ${hasId ? 'EXISTS' : 'MISSING'}`);
  
  if (hasId) {
    // Extract overlay div section
    const startIdx = html.indexOf(`id="${id}"`) !== -1 ? html.indexOf(`id="${id}"`) : html.indexOf(`id='${id}'`);
    const snippet = html.substring(startIdx, startIdx + 800);
    
    // Look for close buttons or onclick handlers
    const onclickMatches = [...snippet.matchAll(/onclick=["']([^"']+)["']/g)];
    if (onclickMatches.length > 0) {
      console.log(`  Onclick handlers in overlay header:`);
      onclickMatches.forEach(m => console.log(`    - ${m[1]}`));
    } else {
      console.log(`  No inline onclick found in top 800 chars of overlay`);
    }
  }
});
