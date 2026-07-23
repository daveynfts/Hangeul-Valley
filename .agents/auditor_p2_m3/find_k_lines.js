const fs = require('fs');
const code = fs.readFileSync('C:\\VibeCode\\Hangeul Valley\\game.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes("'K':") || line.includes('"K":')) {
    if (!line.includes('0x0F172A') && !line.includes('0x0f172a')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
