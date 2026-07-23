const fs = require('fs');

const htmlContent = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');

// Extract sections
const bannerMatch = htmlContent.match(/<div id="event-banner"[\s\S]*?<\/div>\s*<\/div>/);
const hudMatch = htmlContent.match(/<div id="hud"[\s\S]*?<\/div>/);
const pbMatch = htmlContent.match(/<div id="progress-bar-wrap"[\s\S]*?<\/div>/);
const tipMatch = htmlContent.match(/<div id="controls-tip"[\s\S]*?<\/div>/);

console.log("=== EVENT BANNER HTML ===");
console.log(bannerMatch ? bannerMatch[0] : "Not found");

console.log("\n=== HUD HTML ===");
console.log(hudMatch ? hudMatch[0] : "Not found");

console.log("\n=== PROGRESS BAR WRAP HTML ===");
console.log(pbMatch ? pbMatch[0] : "Not found");

console.log("\n=== CONTROLS TIP HTML ===");
console.log(tipMatch ? tipMatch[0] : "Not found");
