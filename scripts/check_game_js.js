'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, GAME_SCRIPTS, checkGameScripts } = require('./gameSource');

const monolith = path.join(ROOT, 'game.js');
if (fs.existsSync(monolith)) {
  console.error('Refuse: game.js monolith is present. Runtime is js/* + js/manifest.json.');
  process.exit(1);
}

checkGameScripts();
console.log('syntax ok: ' + GAME_SCRIPTS.length + ' files');
