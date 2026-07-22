const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('=== CSS RULES FOR OVERLAYS (.visible / .hidden / display) IN index.html ===');
const cssMatches = html.match(/<style[\s\S]*?<\/style>/gi) || [];
cssMatches.forEach(css => {
    const lines = css.split('\n');
    lines.forEach(l => {
        if (l.includes('.visible') || l.includes('.hidden') || l.includes('overlay') || l.includes('modal') || l.includes('display:')) {
            console.log(l.trim());
        }
    });
});
