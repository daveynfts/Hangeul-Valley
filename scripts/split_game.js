/**
 * One-shot splitter: game.js → js/* and index.html <style> → css/game.css.
 * Run from repo root: node scripts/split_game.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const srcPath = path.join(ROOT, 'game.js');
if (!fs.existsSync(srcPath)) {
  console.error('game.js is already gone; refusing to overwrite js/* from nothing.');
  process.exit(1);
}

const src = fs.readFileSync(srcPath, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r?\n/);

function slice(from, to) {
  return lines.slice(from - 1, to).join(nl) + nl;
}

const files = {
  'js/state.js': slice(1, 26),
  'js/audio.js': slice(27, 286),
  'js/renderer.js': slice(287, 4274),
  'js/systems/srs.js': slice(4275, 4481),
  'js/systems/save.js': slice(4482, 5571),
  'js/systems/economy.js': slice(5572, 6300),
  'js/data.js': slice(6301, 6409),
  'js/ui.js': slice(6410, 8311),
  'js/systems/atmosphere.js': slice(8312, 8601),
  'js/skins.js': slice(8602, 8939),
  'js/scenes/farm.js': slice(8940, 11959),
  'js/scenes/arcade.js': slice(11960, 12404),
  'js/scenes/dungeon.js': slice(12405, 12866),
  'js/scenes/fishing.js': slice(12867, 13245),
  'js/scenes/bee.js': slice(13246, 13578),
  'js/overlays.js': slice(13579, 13609) + nl + slice(13629, lines.length),
  'js/boot.js': slice(13610, 13627)
};

Object.keys(files).forEach((rel) => {
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, files[rel], 'utf8');
  console.log('wrote', rel, files[rel].split(/\r?\n/).length, 'lines');
});

const htmlPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const styleRe = /<style>\r?\n([\s\S]*?)\r?\n  <\/style>/;
const styleMatch = html.match(styleRe);
if (!styleMatch) {
  console.error('Could not find <style> block in index.html');
  process.exit(1);
}
const cssDir = path.join(ROOT, 'css');
fs.mkdirSync(cssDir, { recursive: true });
fs.writeFileSync(path.join(cssDir, 'game.css'), styleMatch[1].replace(/\r\n/g, '\n') + '\n', 'utf8');
console.log('wrote css/game.css');

const { GAME_SCRIPTS } = require('./gameSource');
const tags = GAME_SCRIPTS.map((rel) => `  <script src="${rel}"></script>`).join('\n');
html = html.replace(styleRe, '  <link rel="stylesheet" href="css/game.css" />');
if (!html.includes('<script src="game.js"></script>')) {
  console.error('index.html missing game.js script tag');
  process.exit(1);
}
html = html.replace('  <script src="game.js"></script>', tags);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('updated index.html');

console.log('split complete. delete game.js after wiring tests.');
