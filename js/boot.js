// ═══════════════ PHASER CONFIG ════════════════════════════════════════════════
// `config` used to be built at the top level, outside the try/catch below. Every value in
// it that reads `Phaser.*` throws when Phaser did not load, so the module died on line 3
// and the buildLevelSelectScreen() fallback never ran — a missing Phaser gave a blank
// window instead of the menu. Building it inside the guarded block fixes that.
//
// Phaser is vendored now (see vendor/README.md), so the realistic remaining cause is a
// genuinely broken install rather than a flaky CDN. The fallback still earns its keep:
// the scene classes in js/scenes/*.js also fail to define themselves without Phaser, so
// this file cannot assume they exist either.
let game = null;
try {
  if (typeof Phaser === 'undefined') throw new Error('Phaser did not load');
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#3A7015',
    render: { pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene],
    parent: document.body,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  };
  if (!IS_NODE) game = new Phaser.Game(config);
} catch (e) {
  console.error('Phaser failed to start', e);
  if (typeof buildLevelSelectScreen === 'function') buildLevelSelectScreen();
}
