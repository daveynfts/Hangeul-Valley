// ═══════════════ PHASER CONFIG ════════════════════════════════════════════════
const config={
  type:Phaser.AUTO,
  width:window.innerWidth, height:window.innerHeight,
  backgroundColor:'#3A7015',
  render:{pixelArt:true, antialias:false, antialiasGL:false, roundPixels:true},
  physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
  scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene],
  parent:document.body,
  scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
};
let game = null;
try {
  if (!IS_NODE) game = new Phaser.Game(config);
} catch (e) {
  console.error('Phaser failed to start', e);
  if (typeof buildLevelSelectScreen === 'function') buildLevelSelectScreen();
}
