const fs = require('fs');

function checkURLs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const urlPattern = /https?:\/\/[^\s'"\`>]+/gi;

  let matches = [];
  lines.forEach((line, idx) => {
    let match;
    while ((match = urlPattern.exec(line)) !== null) {
      matches.push({ lineNum: idx + 1, url: match[0], snippet: line.trim() });
    }
  });
  return matches;
}

['game.js', 'index.html'].forEach(f => {
  const matches = checkURLs(f);
  console.log(`=== ${f} URLs (${matches.length}) ===`);
  matches.forEach(m => console.log(`Line ${m.lineNum}: ${m.url}`));
});
