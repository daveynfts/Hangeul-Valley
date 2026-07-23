const fs = require('fs');
const path = require('path');

const files = [
  'C:/VibeCode/Hangeul Valley/game.js',
  'C:/VibeCode/Hangeul Valley/index.html',
  'C:/VibeCode/Hangeul Valley/assets/game.js'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const imgMatches = content.match(/\.(png|jpg|jpeg|gif|webp|svg)/gi) || [];
  const httpMatches = content.match(/https?:\/\/[^\s'"`]+/gi) || [];
  const dataImgMatches = content.match(/data:image\/[^\s'"`]+/gi) || [];
  const loadImgMatches = content.match(/\.load\.(image|spritesheet|texture|multiatlas|svg)/gi) || [];

  console.log('=== File:', path.basename(f), '===');
  console.log('Image extension matches:', imgMatches);
  console.log('HTTP/HTTPS matches:', httpMatches);
  console.log('Data URL matches:', dataImgMatches);
  console.log('Phaser load image calls:', loadImgMatches);
});
