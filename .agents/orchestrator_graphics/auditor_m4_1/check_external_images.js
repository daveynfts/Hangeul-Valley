const fs = require('fs');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const externalImagePatterns = [
    /https?:\/\/[^\s'"\`]+\.(png|jpg|jpeg|gif|webp|svg|ico)/i,
    /<img[^>]+src=['"]https?:\/\//i,
    /load\.(image|spritesheet|svg|atlas|multiatlas)\s*\([^,]+,\s*['"]https?:\/\//i,
    /url\s*\(\s*['"]?https?:\/\/[^\s'")]+\.(png|jpg|jpeg|gif|webp|svg)/i,
    /data:image\//i
  ];

  let matches = [];
  lines.forEach((line, idx) => {
    externalImagePatterns.forEach(pattern => {
      if (pattern.test(line)) {
        matches.push({ lineNum: idx + 1, line: line.trim() });
      }
    });
  });
  return matches;
}

const files = ['game.js', 'index.html', 'main.py', 'levels.json', 'assets/game.js', 'assets/index.html'];
let totalMatches = 0;
files.forEach(f => {
  if (fs.existsSync(f)) {
    const res = checkFile(f);
    console.log(`${f}: ${res.length} external image patterns found.`);
    res.forEach(m => console.log(`  Line ${m.lineNum}: ${m.line}`));
    totalMatches += res.length;
  }
});
console.log(`\nTOTAL EXTERNAL IMAGE MATCHES: ${totalMatches}`);
