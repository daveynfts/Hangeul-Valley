const fs = require('fs');
const path = require('path');
const gameJs = fs.readFileSync(path.join(__dirname, '..', '..', 'game.js'), 'utf8');

let passed = 0;
let failed = 0;

function check(cond, msg) {
  if (cond) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('--- VERIFYING MILESTONE 1 IMPLEMENTATION IN GAME.JS ---');

check(gameJs.includes('_genBeehiveTextures'), 'PixelArtRenderer has _genBeehiveTextures');
check(gameJs.includes('_genBeeTextures'), 'PixelArtRenderer has _genBeeTextures');
check(gameJs.includes("'beehive'"), "beehive texture key registered");
check(gameJs.includes("'p_tiny_bee'"), "p_tiny_bee texture key registered");
check(gameJs.includes("'bee_fly_0'"), "bee_fly_0 texture key registered");
check(gameJs.includes("'bee_fly_1'"), "bee_fly_1 texture key registered");
check(gameJs.includes("'p_pollen'"), "p_pollen texture key registered");
check(gameJs.includes("'p_honey_drip'"), "p_honey_drip texture key registered");

check(gameJs.includes('_createBeehiveNPC'), 'FarmScene has _createBeehiveNPC method');
check(gameJs.includes('this._createBeehiveNPC(W, H)'), 'FarmScene calls _createBeehiveNPC in create()');
check(gameJs.includes('this.farm.x - 65'), 'Beehive positioned at farm.x - 65');
check(gameJs.includes('this.farm.y - 70'), 'Beehive positioned at farm.y - 70');
check(gameJs.includes('beehiveBees'), 'Beehive has orbiting tiny bee particles');
check(gameJs.includes('beehiveHint'), 'Beehive has proximity interaction hint');

check(gameJs.includes('function getUnlockedWords()'), 'getUnlockedWords helper function defined');
check(gameJs.includes('class BeeScene extends Phaser.Scene'), 'BeeScene class defined');
check(gameJs.includes('scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene]'), 'BeeScene registered in Phaser Game config');

check(gameJs.includes('linear') && gameJs.includes('sine') && gameJs.includes('zigzag'), 'BeeScene supports linear, sine, and zigzag flight trajectories');
check(gameJs.includes('TARGET:'), 'BeeScene has top HUD target English word banner');
check(gameJs.includes('BEEHIVE HARVEST COMPLETE!'), 'BeeScene has retro glassmorphism end-of-round modal summary');
check(gameJs.includes('RETURN TO FARM'), 'BeeScene has return button transitioning back to FarmScene');

console.log(`\nSUMMARY: ${passed} PASSED, ${failed} FAILED`);
if (failed > 0) process.exit(1);
