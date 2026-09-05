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

// ═══════════════ THE FACES ARRIVE AFTER THE FIRST DRAW ════════════════════════
// Phaser rasterises a Text to its own canvas when the object is constructed and never
// revisits it. A face still in flight at that moment is therefore not picked up when it
// lands — the label keeps whatever the browser fell back to, for the life of the scene.
//
// FarmScene.create() runs the moment this file does, and Google serves the faces in
// unicode-range slices that are fetched only once a glyph in that range is asked for. So on
// a cold load the Vietnamese slice of VT323 is still downloading while the scene is drawing
// Vietnamese labels with it. English hides the same race: the fallback for Press Start 2P
// is another monospace face at roughly the right size, and nobody notices.
//
// Waiting for the fonts before starting Phaser would also hold back the level select, which
// FarmScene.create() is what builds — a blank window while a font CDN has a bad day. So the
// game starts on time and the text is redrawn once the faces are actually in. Asking for
// the exact glyphs matters: document.fonts.ready settles for the slices already requested,
// which on a cold load is not yet the one this needs.
if (game && !IS_NODE && typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  // The probe asks for the glyphs this language actually draws, rather than a sample
  // spelled out here: a hard-coded one is a second place to remember when a language is
  // added, and it would be the language whose script nobody checked that gets forgotten.
  // The Korean is not decoration — the station labels are Korean over a Vietnamese hint,
  // and both faces have to be in before that line is rasterised.
  const SAMPLE = hvT('ui.world.click') + hvT('ui.farm.shop') + '가A';
  const redraw = (o) => {
    if (!o) return;
    if (o.type === 'Text' && typeof o.updateText === 'function') o.updateText();
    else if (o.list && o.list.forEach) o.list.forEach(redraw);
  };
  Promise.all([hvPixelFont(), '"Noto Sans KR",sans-serif']
    .map((face) => document.fonts.load('16px ' + face, SAMPLE).catch(() => null)))
    .then(() => {
      game.scene.scenes.forEach((s) => {
        if (s && s.children && s.children.list) s.children.list.forEach(redraw);
      });
    });
}
