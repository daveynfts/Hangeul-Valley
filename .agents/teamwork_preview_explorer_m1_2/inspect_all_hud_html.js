const fs = require('fs');

const html = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\index.html', 'utf8');
const js = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

// Find all id="..." in index.html
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
// Find all onclick="..." in index.html
const onclickMatches = [...html.matchAll(/onclick=["']([^"']+)["']/g)].map(m => m[1]);

console.log('=== ALL UNIQUE IDs IN INDEX.HTML ===');
const uniqueIds = [...new Set(idMatches)];
console.log(uniqueIds.join(', '));

console.log('\n=== HUD SPECIFIC IDs IN INDEX.HTML & THEIR JS REFERENCES ===');
uniqueIds.forEach(id => {
  if (id.includes('hud') || id.includes('btn') || id.includes('banner') || id.includes('progress') || id.includes('gold') || id.includes('gems') || id.includes('honor') || id.includes('buff') || id.includes('event')) {
    const jsCount = (js.match(new RegExp(id, 'g')) || []).length;
    console.log(`ID: "${id}" | Mentioned in HTML: true | Mentioned in JS: ${jsCount > 0 ? `${jsCount} times` : 'NO (0 times)'}`);
  }
});

console.log('\n=== ALL ONCLICK HANDLERS IN INDEX.HTML & THEIR JS DEFINITIONS ===');
const uniqueOnclicks = [...new Set(onclickMatches)];
uniqueOnclicks.forEach(oc => {
  // Extract function name
  const fnName = oc.split('(')[0].trim();
  const isDefinedInJs = js.includes(`function ${fnName}`) || js.includes(`window.${fnName}`) || js.includes(`${fnName} =`) || js.includes(`${fnName}=`);
  console.log(`onclick="${oc}" -> Function: "${fnName}" | Defined in JS: ${isDefinedInJs}`);
});
