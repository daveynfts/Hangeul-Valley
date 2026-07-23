const fs = require('fs');

const htmlContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');
const jsContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

console.log('=== INDEX.HTML CURRENCY / HUD MATCHES ===');
['gold-val', 'coins-val', 'gems-val', 'honor-val', 'hud-gold', 'hud-coins', 'hud-gems', 'hud-honor'].forEach(id => {
  console.log(`HTML '${id}': ${htmlContent.includes(id)}`);
  console.log(`JS '${id}': ${jsContent.includes(id)}`);
});
