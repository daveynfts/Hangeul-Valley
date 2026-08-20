// ═══════════════ PHASER SCENE ════════════════════════════════════════════════
class FarmScene extends Phaser.Scene {
  constructor(){ super({key:'FarmScene'}); }
  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
    this.load.json('levels','levels.json');
    this.load.json('world-2b-10','worlds/2b-unit-10.json');
    this.load.json('unit10-layout','worlds/unit10-layout.json?v=southband');
    this.load.json('skin-catalog', 'skins/catalog.json?v=' + SKIN_CATALOG_BOOT_V);
    ART_LOAD.forEach((a) => { this.load.image(a.key, artUrl(a.file)); });
    CROP_HD_NAMES.forEach((n) => {
      [1, 2, 3].forEach((s) => {
        this.load.image('crop_' + n + '_' + s + '_hd', artUrl(CROP_ART_FOLDER[n] + '/' + CROP_STAGE_FILE[s]));
      });
    });
    FARMER_HD_DIRS.forEach((dir) => {
      for (let f = 0; f < FARMER_HD_FRAMES; f++) {
        this.load.image(
          farmerHdTextureKey(dir, f),
          artUrl(FARMER_ART_FOLDER + '/walk_' + dir + '_' + f + '.png')
        );
      }
    });
  }

  // ── APPLE TREE constants ──────────────────────────────────────────────────
  // Time for apple tree to ripen after last harvest (or game start)
  static get APPLE_RIPEN_MS() { return 2 * 60 * 1000; } // 2 minutes

  create(){
    sceneRef = this;
    ensureFarmerHdAnims(this);
    this.droppedItems = [];
    if (droppedItemsSave && droppedItemsSave.length > 0) {
      droppedItemsSave.forEach(drop => this.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
    }
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.events.off('resume');
    this.events.on('resume', () => {
      this.cameras.main.fadeIn(300, 0, 0, 0);
      // Reviews can fall due while the player is off in a minigame.
      this._refreshDueReviews();
    });
    levelsData = this.cache.json.get('levels') || [];
    if (this.cache.json.exists('world-2b-10')) attachTextbookWorld(this.cache.json.get('world-2b-10'));
    applyDebugSkinQuery();
    if(!levelsData.length){
      console.error('levels.json missing');
      if (typeof buildLevelSelectScreen === 'function') buildLevelSelectScreen();
      return;
    }

    this._bakeTextures();
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBounds(0, 0, W, H);

    this.dayNight = new DayNightSystem(this);
    this.lighting = new AmbientLightingSystem(this);
    this.shadows = new DynamicShadowSystem(this);
    this.weather = new WeatherEngine(this);

    this._drawWorld(W, H);

    if (this._wellLightPos) this.lighting.addLight(this._wellLightPos.x, this._wellLightPos.y, 'light_glow_soft', 0.7, 0.35);
    if (this._shopLightPos) this.lighting.addLight(this._shopLightPos.x, this._shopLightPos.y, 'light_glow_lantern', 0.55, 0.4);

    if (this.textures && this.textures.exists('p_sparkle') && typeof this.add.particles === 'function') {
      try {
        this.cropSparkleEmitter = this.add.particles(0, 0, 'p_sparkle', {
          speed: { min: 20, max: 60 },
          scale: { start: 1, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          emitting: false
        }).setDepth(500);
      } catch (e) {}
    }

    this.plots = []; this._createPlots(W, H);
    // After restoring saved plots, fill the free ones with whatever is due today.
    this._refreshDueReviews();
    this._createPlayer(W, H); this._addPlotLabels();
    ensureActiveSkinLoaded(this, () => {
      if (this.player && this.player.active) applySkinToSprite(this, this.player, FARM_SKIN_APPLY);
    });
    this._createShopNPC(W, H);
    this._createBoardNPC(W, H);
    this._createArcadeNPC(W, H);
    this._createWizardNPC(W, H);
    this._createCatNPC(W, H);
    this._createAppleTree(W, H);
    this._createBeehiveNPC(W, H);
    this._createPortalNPC(W, H);
    this._createFishingSpot(W, H);
    this.syncUnit10World();

    this.keys = {
      W:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.walkFrame = 0; this.walkTimer = 0;

    buildLevelSelectScreen(); playerLocked = true;
    updateGoldHUD();

    // ── RESIZE HANDLER ─ update camera & world bounds on window resize ──
    this.scale.on('resize', (gameSize) => {
      const nw = gameSize.width, nh = gameSize.height;
      const bw = Math.max(nw, W), bh = Math.max(nh, H);
      this.cameras.main.setBounds(0, 0, bw, bh);

      // Grow the ground to match. Without this the camera bounds widened over bare canvas —
      // the resize handler moved the walls but never laid any floor.
      this._tileGround(bw, bh);

      // The parallax strips are sized from the creation width, so they stop short too.
      if (this.bgMountains) { this.bgMountains.setSize(bw * 2, 128); this.bgMountains.x = bw / 2; }
      if (this.bgHills)     { this.bgHills.setSize(bw * 2, 128);     this.bgHills.x = bw / 2; }

      // Update weather/lighting overlays to cover new size
      if (this.lighting) {
        this.lighting.width = nw;
        this.lighting.height = nh;
      }
    });
  }

  // ── BAKE TEXTURES ──────────────────────────────────────────────────────────
  _bakeTextures(){
    const mk = () => this.make.graphics({add:false});
    // Apple Tree texture (22×32 pixels) — lush detailed canopy with individual apples
    const gat=mk();
    // Rich multi-tone crown with leaf detail, apples, and textured bark
    const appleTree_unripe=[
      '......vLLLLv.........',  // row 0  — crown tip
      '....vLLLLLLLv........',  // row 1
      '...LLLLLLLLLLL.......',  // row 2
      '..LLlLLLLLlLLLL......',  // row 3  — leaf variation
      '.LLLLLLLLLLLLLLLl....',  // row 4
      '.lLLLLLLLlLLLLLLLl...',  // row 5
      'LLLLLlLLLLLlLLLLLLL..',  // row 6
      'LLlLLLLLLLLLLLlLLLLL.',  // row 7
      'LLLLLLlLLLLLLLLLLLLLL',  // row 8  — widest
      'lLLLLLLLLlLLLLLLLLLLl',  // row 9
      'LLLLLlLLLLLlLLLLLLLLL',  // row 10
      'lLLLLLLLLLLLLLlLLLLLl',  // row 11
      '.LLLlLLLLLLLLLLLLLLL.',  // row 12
      '.lLLLLLlLLLLlLLLLLLl.',  // row 13
      '..LLLLLLLLLLLLLLLLl..',  // row 14
      '..lLLLLlLLLLlLLLLl...',  // row 15
      '...lLLLLLLLLLLLl.....',  // row 16
      '....llLLLLLLll.......',  // row 17  — crown bottom
      '.........KKK.........',  // row 18  — trunk top
      '........kKKKs........',  // row 19
      '........kKKKs........',  // row 20
      '........kKKKs........',  // row 21
      '........kKKKs........',  // row 22
      '........kKKKs........',  // row 23
      '........kKKKs........',  // row 24
      '.......kkKKKss.......',  // row 25  — trunk base wider
      '.......kKKKKKs.......',  // row 26
      '......kkKKKKKss......',  // row 27
      '.....mkkKKKKKssm.....',  // row 28  — roots
      '....mmm.KKK.mmm......',  // row 29
      '...mm.........mm.....',  // row 30
      '......................', // row 31
    ];
    drawS(gat, appleTree_unripe);
    // Paint small green unripe apples (subtle bumps in crown)
    const uG=0x66AA22, uGh=0x88CC44;
    [[4,5,uG],[5,5,uGh],[13,7,uG],[14,7,uGh],[3,10,uG],[4,10,uGh],
     [16,10,uG],[17,10,uGh],[8,13,uG],[9,13,uGh],[14,5,uG],[15,5,uGh]].forEach(([x,y,c])=>pR(gat,x,y,1,1,c));
    // Trunk bark knot details
    pR(gat,9,21,1,1,0x503018); pR(gat,10,24,1,1,0x503018);
    gat.generateTexture('apple_tree',22*PS,32*PS); gat.destroy();

    // Ripe apple tree — bright red apples with white highlight, golden leaf shimmer
    const gatr=mk();
    const appleTree_ripe=[
      '......vLLLLv.........',
      '....vLLLLLLLv........',
      '...LLLLLLLLLLL.......',
      '..LLlLLLLLlLLLL......',
      '.LLLLLLLLLLLLLLLl....',
      '.lLLLLLLLlLLLLLLLl...',
      'LLLLLlLLLLLlLLLLLLL..',
      'LLlLLLLLLLLLLLlLLLLL.',
      'LLLLLLlLLLLLLLLLLLLLL',
      'lLLLLLLLLlLLLLLLLLLLl',
      'LLLLLlLLLLLlLLLLLLLLL',
      'lLLLLLLLLLLLLLlLLLLLl',
      '.LLLlLLLLLLLLLLLLLLL.',
      '.lLLLLLlLLLLlLLLLLLl.',
      '..LLLLLLLLLLLLLLLLl..',
      '..lLLLLlLLLLlLLLLl...',
      '...lLLLLLLLLLLLl.....',
      '....llLLLLLLll.......',
      '.........KKK.........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '........kKKKs........',
      '.......kkKKKss.......',
      '.......kKKKKKs.......',
      '......kkKKKKKss......',
      '.....mkkKKKKKssm.....',
      '....mmm.KKK.mmm......',
      '...mm.........mm.....',
      '......................',
    ];
    drawS(gatr, appleTree_ripe);
    // Paint juicy red apples with white specular highlights
    const aR=0xEE1111, aRd=0xAA0808, aRh=0xFF6666, aW=0xFFFFFF;
    // Apple 1 (upper-left)
    [[4,4,aRd],[5,4,aR],[4,5,aR],[5,5,aR],[5,4,aRh]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,4,4,1,1,aW); // highlight
    // Apple 2 (upper-right)
    [[14,5,aRd],[15,5,aR],[14,6,aR],[15,6,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,14,5,1,1,aW);
    // Apple 3 (mid-left)
    [[2,9,aRd],[3,9,aR],[2,10,aR],[3,10,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,2,9,1,1,aW);
    // Apple 4 (mid-right)
    [[16,9,aRd],[17,9,aR],[16,10,aR],[17,10,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,16,9,1,1,aW);
    // Apple 5 (center)
    [[9,11,aRd],[10,11,aR],[9,12,aR],[10,12,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,9,11,1,1,aW);
    // Apple 6 (lower-left)
    [[5,13,aRd],[6,13,aR],[5,14,aR],[6,14,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,5,13,1,1,aW);
    // Apple 7 (lower-right)
    [[14,13,aRd],[15,13,aR],[14,14,aR],[15,14,aR]].forEach(([x,y,c])=>pR(gatr,x,y,1,1,c));
    pR(gatr,14,13,1,1,aW);
    // Trunk bark knot details
    pR(gatr,9,21,1,1,0x503018); pR(gatr,10,24,1,1,0x503018);
    gatr.generateTexture('apple_tree_ripe',22*PS,32*PS); gatr.destroy();

    GRASS.forEach((rows,i)=>{ const g=mk(); drawS(g,rows); g.generateTexture('grs'+i,16*PS,16*PS); g.destroy(); });
    const gd=mk(); drawS(gd,DIRT_DRY); gd.generateTexture('drt_dry',16*PS,16*PS); gd.destroy();
    const gw=mk(); drawS(gw,DIRT_WET); gw.generateTexture('drt_wet',16*PS,16*PS); gw.destroy();

    const PATH_PAL = {
      '.': null,
      'K': 0x3F3A36, 't': 0xC7C1BD, 'T': 0x9E9793, 'S': 0x7D7571,
      's': 0x4A4440, 'A': 0x7E5436, 'a': 0x573A23, 'B': 0xA6754B
    };
    const gcs = mk();
    PixelArtRenderer.drawMatrix(gcs, [
      'aAaABBBBBBBAaAaA',
      'AaAKttTTTTsKaAaA',
      'aAaKtTTTTTSsAaAa',
      'AaAKtTSSTTSsAaAa',
      'aAaKSSSSSSSSAaAa',
      'AaAKKKKKKKKKaAaA',
      'aAaABBBBBBBAaAaA',
      'AaAKttTTTTsKaAaA',
      'aAaKtTTTTTSsAaAa',
      'AaAKtTSSTTSsAaAa',
      'aAaKSSSSSSSSAaAa',
      'AaAKKKKKKKKKaAaA',
      'aAaABBBBBBBAaAaA',
      'AaABBBBBBBBBAaAa',
      'aAaABBBBBBBAaAaA',
      'aaaaaaaaaaaaaaaa'
    ], PATH_PAL, 0, 0, PS);
    gcs.generateTexture('path_stone', 16*PS, 16*PS); gcs.destroy();

    const FLW_PAL = {
      '.': null,
      'K': 0x121016,
      'R': STARDEW_PALETTE.flowerRed, 'r': 0x8A1836,
      'Y': STARDEW_PALETTE.flowerYellow, 'y': 0xB88A3D,
      'P': STARDEW_PALETTE.flowerPurple, 'p': 0x6D28D9,
      'W': 0xFFFFFF, 'G': STARDEW_PALETTE.grassBase, 'g': STARDEW_PALETTE.grassShadow,
      'L': STARDEW_PALETTE.grassHighlight
    };
    const gflr = mk();
    PixelArtRenderer.drawMatrix(gflr, [
      '..RWRR..',
      '.RrYRRr.',
      'RRYWYRRr',
      '.RrYRRr.',
      '..RWRR..',
      '...gG...',
      '...Gg...',
      '..gGLg..'
    ], FLW_PAL, 0, 0, PS);
    gflr.generateTexture('flw_red', 8*PS, 8*PS); gflr.destroy();
    const gfly = mk();
    PixelArtRenderer.drawMatrix(gfly, [
      '..YWYY..',
      '.YyWYYy.',
      'YYWYWYYy',
      '.YyWYYy.',
      '..YWYY..',
      '...gG...',
      '...Gg...',
      '..gGLg..'
    ], FLW_PAL, 0, 0, PS);
    gfly.generateTexture('flw_yellow', 8*PS, 8*PS); gfly.destroy();
    const gflp = mk();
    PixelArtRenderer.drawMatrix(gflp, [
      '..PWPP..',
      '.PpYPPp.',
      'PPYWYPPp',
      '.PpYPPp.',
      '..PWPP..',
      '...gG...',
      '...Gg...',
      '..gGLg..'
    ], FLW_PAL, 0, 0, PS);
    gflp.generateTexture('flw_purple', 8*PS, 8*PS); gflp.destroy();


    const DECOR_PALETTE = {
      '.': null,
      'K': 0x0F172A, // 1px Dark Slate Outline
      'k': 0x1E293B, // Dark slate shadow
      'H': 0x8FD19E, // Leaf highlight green
      'G': 0x4A7C59, // Leaf base green
      'g': 0x2D4E35, // Leaf shade green
      'M': 0x1A3622, // Canopy shadow green
      'O': 0xD99B66, // Sunlit wood highlight
      'o': 0xB3713D, // Oak wood highlight
      'W': 0x8F5428, // Cedar wood base
      'w': 0x573012, // Deep timber shadow
      'D': 0x8F5428, // Wood post base
      'd': 0x573012, // Wood post shadow
      't': 0xC7C1BD, // Stone highlight
      'T': 0x9E9793, // Stone base
      'S': 0x7D7571, // Dark slate base
      's': 0x4A4440, // Deep mortar shadow
      'E': 0xE0F2FE, // Water sparkle
      'v': 0x38BDF8, // Bright cyan
      'V': 0x0284C7, // Water blue
      'C': 0x0369A1, // Deep water blue
      'c': 0x6BB1D6, // Cyan water basin
      'Y': 0xFDE047, // Bright gold
      'y': 0xD97706, // Gold/amber shadow
      'R': 0xEF4444, // Red accent
      'r': 0x991B1B, // Dark red shadow
      'P': 0xA855F7, // Purple portal glow
      'p': 0x6D28D9, // Dark purple shadow
      'b': 0xFFF3C7, // Notice paper parchment
      'N': 0x475569, // Metal slate
      'n': 0x334155  // Metal dark slate
    };

    // Micro Butterfly Wing 0 (Open)
    const gbf0 = mk();
    PixelArtRenderer.drawMatrix(gbf0, [
      'Kvv.vv',
      'vvv.vv',
      '.vvvv.',
      '..KK..',
      '.vvvv.',
      'Kvv.vv'
    ], DECOR_PALETTE, 0, 0, PS);
    gbf0.generateTexture('bf_open', 6*PS, 6*PS); gbf0.destroy();

    // Micro Butterfly Wing 1 (Flap/Up)
    const gbf1 = mk();
    PixelArtRenderer.drawMatrix(gbf1, [
      '.KvvK.',
      '.vvvv.',
      '..vv..',
      '..KK..',
      '..vv..',
      '.KvvK.'
    ], DECOR_PALETTE, 0, 0, PS);
    gbf1.generateTexture('bf_flap', 6*PS, 6*PS); gbf1.destroy();

    // Stone Well / Water Shrine (16x16)
    const gsw = mk();
    PixelArtRenderer.drawMatrix(gsw, [
      '..KKKKKKKKKKKK..',
      '.KOOOOOOOOOOOoK.',
      '.KOWWWWWWWWWwwK.',
      '.KOWKKKKKKKKwwK.',
      '.KOWKTTTTTTKwwK.',
      '.KOWKTSCCSTKwwK.',
      '.KOWKSCcCcSKwwK.',
      '.KOWKSCcCcSKwwK.',
      '.KOWKTSCCSTKwwK.',
      '.KOWKTTTTTTKwwK.',
      '.KOWKKKKKKKKwwK.',
      '.KOWWWWWWWWWwwK.',
      '.KSSSSssssssssK.',
      '.KSSSSssssssssK.',
      '.KKKKKKKKKKKKKK.',
      '................'
    ], DECOR_PALETTE, 0, 0, PS);
    gsw.generateTexture('stone_well', 16*PS, 16*PS); gsw.destroy();

    // Pixel Barrel (10x12)
    const gbar = mk();
    PixelArtRenderer.drawMatrix(gbar, [
      '.KKKKKKKK.',
      'KOOOOOOOoK',
      'KOWWWWWWwK',
      'KKKKKKKKKK',
      'KtTTTTTTsK',
      'KOWWWWWWwK',
      'KOWWWWWWwK',
      'KOWWWWWWwK',
      'KtTTTTTTsK',
      'KKKKKKKKKK',
      'KOWWWWWWwK',
      '.KKKKKKKK.'
    ], DECOR_PALETTE, 0, 0, PS);
    gbar.generateTexture('pixel_barrel', 10*PS, 12*PS); gbar.destroy();

    // Pixel Crate (12x12)
    const gcrat = mk();
    PixelArtRenderer.drawMatrix(gcrat, [
      'KKKKKKKKKKKK',
      'KOOOOOOOOOoK',
      'KOWKKKKKKWwK',
      'KOWKOWWwKWwK',
      'KOWKKOWwKWwK',
      'KOWWKKWwKWwK',
      'KOWWKWKKKWwK',
      'KOWWKWwKKWwK',
      'KOWWKWwKOWwK',
      'KOWKKKKKKWwK',
      'KOwwwwwwwwwK',
      'KKKKKKKKKKKK'
    ], DECOR_PALETTE, 0, 0, PS);
    gcrat.generateTexture('pixel_crate', 12*PS, 12*PS); gcrat.destroy();

    const TASTE_STALL_PAL = {
      '.': null,
      'K': 0x2A1A0A, 'k': 0x4A2A0D,
      'R': 0xDC2626, 'r': 0x9F1239, 'P': 0xF87171,
      'W': 0xFFF8E8, 'w': 0xF4D6A0, 'Y': 0xE8C07A,
      'O': 0xC4893A, 'o': 0x8B5A2B,
      'B': 0x78350F, 'b': 0xB45309,
      'N': 0x166534, 'n': 0x86EFAC,
      'C': 0xFDE047, 'S': 0xE2E8F0
    };
    PixelArtRenderer.createTexture(this, 'taste_stall', [
      '......SS.SS.......',
      '.....S..S..S......',
      '..KKKKKKKKKKKKKK..',
      '.KRrRrRrRrRrRrRrK.',
      '.KPRPRPRPRPRPRPRK.',
      '.KRrRrRrRrRrRrRrK.',
      '.KKKKKKKKKKKKKKKK.',
      '.KoYYYYYYYYYYYYOk.',
      '.KoW..........WOk.',
      '.KoW.bB.CC.nN.WOk.',
      '.KoW.BB.CC.NN.WOk.',
      '.KoWWWWWWWWWWWWOk.',
      '.KOOOOOOOOOOOOOOK.',
      '.KoOoOoOoOoOoOoOk.',
      '.KKKKKKKKKKKKKKKK.',
      '..................'
    ], TASTE_STALL_PAL, 18, 16);

    const DESK_PAL = {
      '.': null,
      'K': 0x1A0E06, 'k': 0x3D2314,
      'O': 0xC4893A, 'o': 0x8B5A2B, 'Y': 0xE8C07A,
      'W': 0xFFF8E8, 'w': 0xF4D6A0,
      'B': 0x1E3A8A, 'b': 0x93C5FD,
      'P': 0x9F1239, 'p': 0xFECACA,
      'G': 0x166534, 'g': 0x86EFAC,
      'L': 0xFDE047, 'l': 0xF59E0B, 'A': 0xFEF3C7,
      'N': 0x1C1917
    };
    PixelArtRenderer.createTexture(this, 'study_desk', [
      '........KKKK........',
      '.......KlAAlK.......',
      '......KlAAAAlK......',
      '......KlALLAlK......',
      '.......KllllK.......',
      '........KkKk........',
      '..KKKKKKKKKKKKKKKK..',
      '.KoBBYYYYYYYYYYGGoK.',
      '.KoBbYYYYYYYYYYGgoK.',
      '.KKKKKKKKKKKKKKKKKK.',
      '.KoYYYYYYYYYYYYYYoK.',
      '.KoWbbWWWWWPPwwwwOk.',
      '.KoWbBWWWWWpRwwwWOk.',
      '.KoWWWWWWNNWWWWWWoK.',
      '.KoWWWWWWWWWWWWWWoK.',
      '.KOOOOOOOOOOOOOOOOK.',
      '.KoOoYoOoYoOoYoOoOk.',
      '.KK..KKKKKKKKKK..KK.',
      '.KO..KooooooooK..OK.',
      '.KO..KoWWWWWWoK..OK.',
      '.KO..KoWbbbbWoK..OK.',
      '.KK..KKKKKKKKKK..KK.'
    ], DESK_PAL, 20, 22);

    const KITCHEN_PAL = {
      '.': null,
      'K': 0x1C1917, 'k': 0x44403C,
      'I': 0xA8A29E, 'i': 0x78716C, 'S': 0xE7E5E4,
      'R': 0xDC2626, 'r': 0x9F1239, 'F': 0xF97316, 'Y': 0xFDE047,
      'O': 0xC4893A, 'o': 0x8B5A2B, 'W': 0xFFF8E8,
      'B': 0x292524, 'G': 0x16A34A, 'N': 0x166534,
      'M': 0x7F1D1D, 'm': 0xFECACA
    };
    PixelArtRenderer.createTexture(this, 'unit10_kitchen', [
      '....KKKKKKKKKKKK....',
      '...KiiiiiiiiiiiiK...',
      '...KiSSSSSSSSSSSiK..',
      '....KKKKKKKKKKKK....',
      '......YFFYYFFR......',
      '..KKKKKKKKKKKKKKKK..',
      '.KIIIIIIIIIIIIIIIIK.',
      '.KIWWWWWWWWWWWWWWIK.',
      '.KIW.MM.YYYY.GG.NWIK',
      '.KIW.Mm.YYYY.Gg.NWIK',
      '.KIW.KK.KKKK.KK.KWIK',
      '.KIIIIIIIIIIIIIIIIK.',
      '.KOOOOOOOOOOOOOOOOK.',
      '.KoOoYoOoYoOoYoOoOoK',
      '.KKBBBBBBBBBBBBBBKK.',
      '.KB..............BK.',
      '.KB.KKK......KKK.BK.',
      '.KB.KkK......kKk.BK.',
      '.KB.KKK......KKK.BK.',
      '.KBBBBBBBBBBBBBBBBK.',
      '.KKKKKKKKKKKKKKKKKK.',
      '....................'
    ], KITCHEN_PAL, 20, 22);

    // Directional Signpost (12x14)
    const gsgn = mk();
    PixelArtRenderer.drawMatrix(gsgn, [
      '....KKKK....',
      '.KKKObbbKKK.',
      '.KOWYYbYYWWK',
      '.KOWbbbbbbWK',
      '.KKKwwwwKKKK',
      '....KWWK....',
      '..KKKOyyyK..',
      '..KOWbbbbWK.',
      '..KOWYYbYWK.',
      '..KKKwwwwwK.',
      '....KWWK....',
      '....KOWk....',
      '....KWWK....',
      '....KKKK....'
    ], DECOR_PALETTE, 0, 0, PS);
    gsgn.generateTexture('signpost', 12*PS, 14*PS); gsgn.destroy();

    // Tree
    const gt = mk();
    PixelArtRenderer.drawMatrix(gt, [
      '.....KKKKKK.......',
      '...KKHHRHHHKK.....',
      '..KHHHGHHHGHHK....',
      '.KHHHHGGGGHRHHK...',
      '.KHHHGGGGGGGGHK...',
      'KHHHRGGGGGHGGGHK..',
      'KHHGGGGggggGGGRHK.',
      'KHHGGGggRgggGGGHK.',
      'KHRGGGggggggGGGHK.',
      'KHHGGGggHgggGGRHK.',
      'KHHGGGRgggggGGGHK.',
      'KHHGGGggggggGGGHK.',
      '.KHHGGGggRggGGHK..',
      '.KHHHGGGGGGGGHK...',
      '..KHHHGGRGGGHK....',
      '...KKHHHHHHKK.....',
      '.....KKWWKK.......',
      '......KOWk........',
      '......KWWK........',
      '......KwWK........',
      '......KWWK........',
      '......KOWk........',
      '......KWWK........',
      '......KwWK........',
      '......KWWK........',
      '.....KKOOWKK......',
      '....ddKWWKdd......',
      '.....KKKKKK.......'
    ], DECOR_PALETTE, 0, 0, PS);
    gt.generateTexture('tree', 18*PS, 28*PS); gt.destroy();

    // Fence
    const gfp = mk();
    PixelArtRenderer.drawMatrix(gfp, [
      'KKKK',
      'KOoK',
      'KOoK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KOWK',
      'KowK',
      'KKKK'
    ], DECOR_PALETTE, 0, 0, PS);
    gfp.generateTexture('fnc_post', 4*PS, 12*PS); gfp.destroy();

    const gfr = mk();
    PixelArtRenderer.drawMatrix(gfr, [
      'KKKKKKKKKKKKKK',
      'KOOOOOOOOOOOoK',
      'KOWWWWWWWWWWwK',
      'KKKKKKKKKKKKKK'
    ], DECOR_PALETTE, 0, 0, PS);
    gfr.generateTexture('fnc_rail', 14*PS, 4*PS); gfr.destroy();

    // Sparkle
    const gsp = mk();
    PixelArtRenderer.drawMatrix(gsp, [
      '......KKKK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      'KKKKKKKWWKKKKKKK',
      'KWWWWWWWWWWWWWWK',
      'KWWWWWWWWWWWWWWK',
      'KKKKKKKWWKKKKKKK',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KWWK......',
      '......KKKK......'
    ], DECOR_PALETTE, 0, 0, 1);
    gsp.generateTexture('sparkle', 16, 16); gsp.destroy();

    // Gold coin 8x8
    const gc = mk();
    PixelArtRenderer.drawMatrix(gc, [
      '..KKKK..',
      '.KYYYYK.',
      'KYYYYYYK',
      'KYYWWYYK',
      'KYYWWYYK',
      'KYYYYYYK',
      '.KYYYYK.',
      '..KKKK..'
    ], DECOR_PALETTE, 0, 0, PS);
    gc.generateTexture('coin', 8*PS, 8*PS); gc.destroy();

    // Shop sign texture 18x22 (Korean Merchant Character)
    const SHOP_PALETTE = Object.assign({}, DECOR_PALETTE, {
      'B': 0x1E293B, // Gat hat dark slate
      'A': 0x38BDF8, // Hat ribbon cyan blue
      'X': 0xFFDDAD, // Skin base warm peach
      'x': 0xF4A261, // Skin shadow
      'f': 0xFFF0D5, // Skin highlight
      'Q': 0xE76F51, // Warm cheek blush
      'U': 0xF8FAFC, // Hanbok white collar / apron highlight
      'u': 0xCBD5E1, // Cream apron shadow
      'J': 0x1E3A8A, // Navy hanbok vest
      'j': 0x172554, // Deep navy vest shadow
      'm': 0xF59E0B  // Gold embroidery on vest
    });
    const gs = mk();
    PixelArtRenderer.drawMatrix(gs, [
      '.....KKKKKKKK.....',
      '....KBBBBBBBBK....',
      '....KBBttttBBK....',
      '.KKKKKBBBBBBKKKKK.',
      '.KBBBBBBBBBBBBBBK.',
      '...KAAfXXXXXfAAK..',
      '...KXffffffffXK...',
      '...KXKNXKKXNKXK...',
      '...KXfQffffQfXK...',
      '...KXxKKmmKKxXK...',
      '..KKUJJJmJmJJUKK..',
      '.KUuuJJmYYYmJJuuK.',
      '.KuuJmJJJJJJmJuuK.',
      '.KuuJjJjJjJjJjuuK.',
      'KKKKKKKKKKKKKKKKKK',
      'KOOOOOOOOOOOOOOOoK',
      'KOWWKYyKYyKYyKWwwK',
      'KOWWYYYYYYYYYYWwwK',
      'KOWWKYyYmmYyYKWwwK',
      'KOWWWWWWWWWWwwwwwK',
      'KOwwwwwwwwwwwwwwwK',
      'KKKKKKKKKKKKKKKKKK'
    ], Object.assign({}, SHOP_PALETTE, { t: 0xF8D88E }), 0, 0, PS);
    gs.generateTexture('shop_sign', 18*PS, 22*PS); gs.destroy();

    // Notice Board texture 18x16
    const NOTICE_BOARD_PALETTE = Object.assign({}, DECOR_PALETTE, {
      'K': 0x0F172A,
      'O': 0xE5A96E,
      'o': 0xC8864B,
      'W': 0x965A2C,
      'w': 0x643714,
      'd': 0x3E2009,
      'b': 0xFFF3C7,
      'B': 0xFFFAF0,
      'u': 0xE2E8F0,
      'N': 0x334155,
      'n': 0x64748B,
      'R': 0xEF4444,
      'r': 0x991B1B,
      'M': 0x475569,
      'm': 0x1E293B,
      'Y': 0xFEF08A,
      'y': 0xF59E0B,
      'g': 0xFB7185
    });

    const gb = mk();
    PixelArtRenderer.drawMatrix(gb, [
      '.....KKKKKKKK.....',
      '....KKmMYYMYyKKK..',
      '..KKKKKMYgMYgKKKKK',
      '.KOOOOOOOOOOOOOOOo',
      '.KOWKKKKKKKKKKKKWw',
      '.KOWKRbBrKRbBrKKWw',
      '.KOWKbNnbKbNNbKKWw',
      '.KOWKbuubKbuubKKWw',
      '.KOWKdWWdKRbBbKKWw',
      '.KOWKbNNbKbNnbKKWw',
      '.KOWKbuubKbuubKKWw',
      '.KOWKKKKKKKKKKKKWw',
      '.KOwwwwwwwwwwwwwww',
      '.KKKKKKKKKKKKKKKKK',
      '..KdWWK......KdWWK',
      '..KKKK......KKKK..'
    ], NOTICE_BOARD_PALETTE, 0, 0, PS);
    gb.generateTexture('notice_board', 18*PS, 16*PS); gb.destroy();

    // Dungeon Portal texture 20x28
    const PORTAL_PALETTE = Object.assign({}, DECOR_PALETTE, {
      'K': 0x0F172A,
      't': 0xE2E8F0,
      'T': 0x94A3B8,
      'S': 0x475569,
      's': 0x1E293B,
      'C': 0x38BDF8,
      'Q': 0xF43F5E,
      'Y': 0xFACC15,
      'P': 0xD8B4FE,
      'p': 0x9333EA,
      'm': 0x581C87,
      'V': 0x2563EB,
      'v': 0x0284C7,
      'E': 0xA5F3FC,
      'W': 0xFFFFFF,
      'z': 0xF472B6,
      'X': 0xE0E7FF
    });

    const gport = mk();
    PixelArtRenderer.drawMatrix(gport, [
      '.......KKKKKK.......',
      '.....KKtTTTTtKK.....',
      '....KtTTSCSSTtK....',
      '...KtTTTTTTTTTTtK...',
      '..KtTTSQSSTSQSStK..',
      '.KtTTSKKKKKKKKSttSK.',
      '.KtSKPPPPPPzPPPPKSK.',
      'KTTKPPPPPzPPPPPPKTTK',
      'KTTKPpPvvVVvvPPpPKTTK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KCTKPpvVWEWEVvppPKCK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KQTKPpPvvVVvvPPpPKQK',
      'KTTKPmPvvVVvvPmPPKTTK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KYTKPpvVWEWEVvpPPKYK',
      'KTTKPpvVEEWEVvpPPKTTK',
      'KTTKPpPvvVVvvPPpPKTTK',
      'KCTKPppppXppppppPKCK',
      'KTTKPpppppppppppPKTTK',
      'KQTKPPPPPPPPPPPPKQK',
      'KTTKPPPPPzPPPPPPKTTK',
      'KTTKPPPPPPPPPPPPKTTK',
      '.KTTKPPPPPPPPPPKTTK.',
      '.KTTTTKKKKKKKKTTTTK.',
      'KTTTTTTSSSSSSSSTTTTK',
      'KssssssssssssssssssK',
      'KKKKKKKKKKKKKKKKKKKK'
    ], PORTAL_PALETTE, 0, 0, PS);
    gport.generateTexture('dungeon_portal', 20*PS, 28*PS); gport.destroy();

    // Wooden Fishing Rowboat texture 28x18 (top-down, detailed)
    const BOAT_PALETTE = {
      '.': null,
      'K': 0x0F172A, // Dark outline
      'H': 0xE8C992, // Hull highlight (sunlit plank)
      'h': 0xD99B66, // Hull warm mid
      'W': 0xB3713D, // Hull base wood
      'w': 0x8F5428, // Hull dark grain
      'D': 0x573012, // Deep shadow / keel
      'R': 0xC7C1BD, // Rope / oarlock metal light
      'r': 0x9E9793, // Rope shadow / metal dark
      'B': 0x7D7571, // Bucket body
      'b': 0x4A4440, // Bucket shadow
      'S': 0xFDE047, // Seat cushion highlight
      's': 0xD97706, // Seat cushion shade
      'N': 0x475569, // Oarlock / nail metal
    };
    const gdock = mk();
    PixelArtRenderer.drawMatrix(gdock, [
      '............KKKK............',  // row 0  — bow tip
      '..........KKhhhWKK..........',  // row 1  — bow curve
      '.........KHhRRhWwK..........',  // row 2  — bow + rope coil
      'K.......KHhhRRhhWwK.........',  // row 3  — bow interior + rope
      'KNK....KHhhhhhhhWwwK......K.',  // row 4  — left oar + hull
      'KHHK..KHhhhhhhhhhWwwK..KHHK.',  // row 5  — oar blade L + hull expand + oar blade R
      '.KK..KHhhwhhhhhhwhhWwK..KK..',  // row 6  — oar shafts + hull with grain
      '.....KHhhwhSSSShwhhWwK.....',  // row 7  — hull + front bench seat
      '....KHhhhwsSSSSswhhWwK.....',  // row 8  — hull + seat shadow
      '....KHhhhhhhhhhhhhhWwK.....',  // row 9  — hull mid open
      '....KHhhwhhhhhhhwhhWwK.....',  // row 10 — hull with grain
      '.....KHhhwSSSShwhhWwK......',  // row 11 — hull + rear bench seat
      '.....KHhhwsSSsswhhWwK......',  // row 12 — hull + seat shadow
      '......KHhhhBbhhhhWwK.......',  // row 13 — stern + bait bucket
      '.......KHhBKKbhhWwK........',  // row 14 — bucket detail
      '........KWhhhhWwK..........',  // row 15 — stern narrowing
      '.........KKWwWKK...........',  // row 16 — stern curve
      '..........KKKK..............',  // row 17 — stern tip
    ], BOAT_PALETTE, 0, 0, PS);
    gdock.generateTexture('fishing_dock', 28*PS, 18*PS); gdock.destroy();

    // Arcade Machine texture 16x22
    const ga = mk();
    PixelArtRenderer.drawMatrix(ga, [
      '....KKKKKKKK....',
      '....KPppppPK....',
      '....KpYYYYpK....',
      '..KKKKKKKKKKKK..',
      '..KOWWWWWWWWoK..',
      '..KOWKEEEEEKWK..',
      '..KOWKvCvCvKWK..',
      '..KOWKCvCvCKWK..',
      '..KOWKvCvCvKWK..',
      '..KOWKvvvvvKWK..',
      '..KOWWWWWWWWoK..',
      '..KKKKKKKKKKKK..',
      '..KRYrrrrrrYRK..',
      '..KRrrYYYYrrRK..',
      '..KKKKKKKKKKKK..',
      '..KOWWWWWWWWoK..',
      '..KOWKYYKKYWK..',
      '..KOWKYYKKYWK..',
      '..KOWWWWWWWWoK..',
      '..KOwwwwwwwwwK..',
      '..KOWWWWWWWWoK..',
      '..KKKKKKKKKKKK..'
    ], Object.assign({}, DECOR_PALETTE, { E: 0xA5F3FC, Y: 0xFDE047 }), 0, 0, PS);
    ga.generateTexture('arcade_machine', 16*PS, 22*PS); ga.destroy();

    // Wizard NPC texture 16x20
    const gwiz = mk();
    PixelArtRenderer.drawMatrix(gwiz, PixelArtRenderer.WIZ_0, PixelArtRenderer.W_PAL, 0, 0, PS);
    gwiz.generateTexture('wizard_npc', 16*PS, 20*PS); gwiz.destroy();


    // Crops (5 types × 3 stages) — unique silhouettes, 12×20, match CROP_ICONS.
    const CROP_FARM_PAL = {
      '.': null,
      'K': 0x121016,
      'P': K.P, 'p': K.p, 'v': K.v, 'L': K.L, 'l': K.l, 'M': K.M,
      's': K.s, 'k': K.k,
      'R': 0xD8587E, 'r': 0x8A1836, 'I': 0xE8A0B8,
      'C': 0x6BB832, 'c': 0x3B6818, 'H': 0x98E060,
      'T': 0xD83838, 't': 0x8A1010, 'o': 0xE87070,
      'Y': 0xE8A820, 'y': 0x9A6800, 'A': 0xF4CF60,
      'W': 0xE0B830, 'w': 0x9A7800, 'F': 0xF0D470,
      'J': 0xFFFFFF, 'B': 0x6A3E1E, 'b': 0x42240E
    };
    const pad12 = (rows) => rows.map((r) => (r + '............').slice(0, 12));
    const FARM_CROPS = [
      { // 🌸 blossom
        1: ['............','............','............','............','............','............','............','.....PP.....','....PvP.....','.....vP.....','.....ss.....','....skss....','....ssss....','.....ss.....','............','............','............','............','............','............'],
        2: ['............','............','............','............','.....PLP....','....PvLv....','.....PvP....','.....ss.....','....PssP....','...PvssvP...','....PssP....','.....ss.....','....skss....','....ssss....','.....ss.....','............','............','............','............','............'],
        3: ['............','....IFIFI...','...FIRIRIF..','....IRJRI...','...FIRIRIF..','....IFIFI...','.....LvL....','.....PPP....','....PvsvP...','...PPvssvPP.','....PsssP...','.....sss....','....skkss...','....sssss...','.....sss....','............','............','............','............','............']
      },
      { // 🥬 cabbage
        1: ['............','............','............','............','............','............','............','............','.....HH.....','....HcCH....','.....cc.....','.....ss.....','....skss....','....ssss....','............','............','............','............','............','............'],
        2: ['............','............','............','............','............','....HHHH....','...HCccCH...','...HcCCcH...','....HccH....','.....ss.....','....CssC....','...HCsscH...','....ssss....','....skss....','............','............','............','............','............','............'],
        3: ['............','............','...HHHHHH...','..HHCccCHH..','.HCccccccCH.','HCcHHHHHHcCH','HcCHHJJHHcCH','HCcHHHHHHcCH','.HCccccccCH.','..HHCccCHH..','...HCssCH...','....CssC....','....ssss....','....skss....','............','............','............','............','............','............']
      },
      { // 🍓 strawberry
        1: ['............','............','............','............','............','............','.....LL.....','....LvL.....','.....vL.....','.....ss.....','....skss....','....RssR....','.....ss.....','............','............','............','............','............','............','............'],
        2: ['............','............','............','............','.....LLL....','....LvLv....','.....LL.....','.....ss.....','....RssR....','...RrIIrR...','....RrrR....','.....ss.....','....skss....','....ssss....','............','............','............','............','............','............'],
        3: ['............','............','.....LvL....','....LLLLL...','...LLvLvLL..','....LrLrL...','...RrIrIrR..','..RrIrJrIrR.','..RrrIIrrR..','...RrrrrR...','....RrrrR...','.....RrR....','.....sss....','....skss....','....ssss....','............','............','............','............','............']
      },
      { // 🌽 corn
        1: ['............','............','............','............','............','.....LL.....','....LvL.....','.....LL.....','.....ss.....','.....ss.....','....skss....','....ssss....','.....ss.....','............','............','............','............','............','............','............'],
        2: ['............','............','............','.....LLL....','....LvLvL...','.....LLL....','.....ss.....','....LYYL....','....YAyA....','....YAYA....','.....ss.....','....skss....','....LssL....','.....ss.....','............','............','............','............','............','............'],
        3: ['............','....LLLLLL..','...LvLLLLL..','....LLLLL...','.....YAY....','....YAJAY...','....YAAAY...','....YAJAY...','....YAAAY...','....YAyAY...','.....yyy....','.....ss.....','....LssL....','...LvssvL...','....ssss....','....skss....','............','............','............','............']
      },
      { // 🌻 sunflower
        1: ['............','............','............','............','............','............','.....LL.....','.....vL.....','.....ss.....','.....ss.....','.....ss.....','....skss....','....ssss....','............','............','............','............','............','............','............'],
        2: ['............','............','............','....FWFWF...','.....WJW....','....FWFWF...','.....ss.....','.....ss.....','.....ss.....','.....ss.....','.....ss.....','....skss....','....LssL....','............','............','............','............','............','............','............'],
        3: ['............','...FWFWFWF..','..FWWWAWWWF.','.FWWABbAWWF.','..FWBbJbBWF.','.FWWABbAWWF.','..FWWWAWWWF.','...FWFWFWF..','.....ss.....','.....ss.....','.....Lss....','.....ssL....','....Lsss....','....skssL...','....ssss....','............','............','............','............','............']
      }
    ];
    const CC = FARM_CROPS;
    FARM_CROPS.forEach((stages, t) => {
      [1, 2, 3].forEach((s) => {
        const g = mk();
        PixelArtRenderer.drawMatrix(g, pad12(stages[s]), CROP_FARM_PAL, 0, 0, PS);
        g.generateTexture(`cr_${t}_${s}`, 12 * PS, 20 * PS);
        g.destroy();
      });
    });

    // ── GINGER TABBY CAT NPC (12×16 pixels) ─────────────────────────────────
    const GC=()=>this.make.graphics({add:false});
    const gc2=GC();
    const GO=0xEE7B28, GD=0x9E3B0E, GL=0xFBAE68;
    const WH2=0xFFFFFF, EY=0x55C655, PU=0x0F172A;
    const PK2=0xFFB3C1;
    const pr2=(x,y,w,h,c)=>pR(gc2,x,y,w,h,c);
    // Ginger body
    pr2(1,8,10,8,GO);
    // White belly/chest
    pr2(3,9,6,7,WH2); pr2(3,8,6,1,WH2);
    // Dark tabby flank stripes
    pr2(1,9,1,6,GD); pr2(10,9,1,6,GD);
    pr2(2,11,1,1,GD); pr2(9,11,1,1,GD);
    pr2(2,13,1,1,GD); pr2(9,13,1,1,GD);
    // White front-paw socks
    pr2(2,14,2,2,WH2); pr2(8,14,2,2,WH2);
    pr2(2,15,1,1,PK2); pr2(3,15,1,1,PK2); pr2(8,15,1,1,PK2); pr2(9,15,1,1,PK2);
    // Ginger head
    pr2(1,2,10,6,GO);
    // White muzzle / chin blaze
    pr2(3,5,6,3,WH2);
    // M-mark forehead stripes
    pr2(3,2,2,2,GD); pr2(7,2,2,2,GD); pr2(5,2,2,1,GO); pr2(5,3,2,2,GD);
    // Amber eyes (big round)
    pr2(2,4,3,2,EY); pr2(7,4,3,2,EY);
    pr2(3,4,1,2,PU); pr2(8,4,1,2,PU); // pupils
    pr2(2,3,3,1,PU); pr2(7,3,3,1,PU); // eyelash outline
    // Pink nose
    pr2(5,6,2,1,PK2);
    // Whisker accent
    pr2(1,6,1,1,GL); pr2(10,6,1,1,GL);
    // Airplane ears (spread sideways flat)
    pr2(0,0,2,2,GO); pr2(10,0,2,2,GO);
    pr2(0,2,2,1,GD); pr2(10,2,2,1,GD); // ear tip stripe
    pr2(0,1,1,1,PK2); pr2(11,1,1,1,PK2); // inner ear pink
    // Tail (curling to right)
    pr2(11,10,2,1,GO); pr2(12,9,1,2,GO); pr2(12,8,1,1,GL); pr2(11,8,1,1,GD);
    gc2.generateTexture('cat_npc',13*PS,16*PS); gc2.destroy();

    // Force nearest-neighbor filtering on all procedural textures
    ['apple_tree', 'apple_tree_ripe', 'drt_dry', 'drt_wet', 'path_stone', 'flw_red', 'flw_yellow', 'flw_purple',
     'bf_open', 'bf_flap', 'stone_well', 'pixel_barrel', 'pixel_crate', 'signpost', 'tree', 'fnc_post', 'fnc_rail',
     'sparkle', 'coin', 'shop_sign', 'notice_board', 'dungeon_portal', 'fishing_dock', 'arcade_machine', 'wizard_npc',
     'cat_npc'].forEach(k => {
       const t = this.textures.get(k);
       if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
         t.setFilter(Phaser.Textures.FilterMode.NEAREST);
       }
    });
    GRASS.forEach((_, i) => {
      const t = this.textures.get('grs' + i);
      if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
    for (let fr = 0; fr < 4; fr++) {
      const t = this.textures.get('farmer' + fr);
      if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    CC.forEach((_, tIdx) => {
      for (let s = 1; s <= 3; s++) {
        const t = this.textures.get(`cr_${tIdx}_${s}`);
        if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
          t.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    });
  }


  // Lay grass out to cover W x H, adding only the tiles that are not there yet.
  //
  // This used to be an inline double loop in _drawWorld, run once with the window size at
  // scene creation. Phaser is in RESIZE mode so the canvas grows with the window, but the
  // ground did not: enlarging the window — or simply having the scene start before the window
  // settled — left bare background beyond the original extent. At 1915x907 with a world tiled
  // for 576x768 that was 1339px of empty canvas down the right-hand side.
  //
  // The variant is picked from the tile's own coordinates rather than a running RNG, so a
  // tile always looks the same however many passes it took to get there. A sequential
  // generator would have made the pattern depend on resize history.
  _tileGround(W, H){
    const cols = Math.ceil((W + TILE) / TILE);
    const rows = Math.ceil((H + TILE) / TILE);
    if (cols <= this._groundCols && rows <= this._groundRows) return 0;

    let added = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < this._groundRows && c < this._groundCols) continue;   // already laid
        // Cheap positional hash: deterministic per tile, and mixed enough that the four
        // variants do not fall into visible diagonal stripes.
        const v = ((c * 73856093) ^ (r * 19349663)) >>> 0;
        this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'grs' + (v % 4))
          .setDisplaySize(TILE, TILE).setDepth(0);
        added++;
      }
    }
    this._groundCols = Math.max(this._groundCols, cols);
    this._groundRows = Math.max(this._groundRows, rows);
    return added;
  }

  // ── WORLD ──────────────────────────────────────────────────────────────────
  _drawWorld(W, H){
    if (this.textures && this.textures.exists('bg_distant_mountains')) {
      this.bgMountains = this.add.tileSprite(W/2, 80, W * 2, 128, 'bg_distant_mountains')
        .setDepth(-10).setScrollFactor(0.1, 0.05);
    }
    if (this.textures && this.textures.exists('bg_rolling_hills')) {
      this.bgHills = this.add.tileSprite(W/2, 140, W * 2, 128, 'bg_rolling_hills')
        .setDepth(-9).setScrollFactor(0.3, 0.15);
    }

    this._groundCols = 0;
    this._groundRows = 0;
    this._tileGround(W, H);

    const fW=PLOT_COLS*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP, fH=5*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP;
    this.farm = {x:W/2-fW/2, y:H/2-fH/2-30, w:fW, h:fH};

    const bx = this.farm.x + this.farm.w / 2;
    const by = this.farm.y - 95;
    const sx = this.farm.x + this.farm.w + 175;
    const sy = this.farm.y + this.farm.h / 2 + 25;

    // Scatter wildflower clumps on grass (HD when catalogued; matrix fallback).
    const flowerColors = ['red', 'yellow', 'purple'];
    const flowerList = [];
    const pondX = this.farm.x - 190;
    const pondY = this.farm.y + this.farm.h / 2 + 40;
    const inKeepout = (fx, fy) => {
      if (fx > this.farm.x - 24 && fx < this.farm.x + this.farm.w + 24 &&
          fy > this.farm.y - 24 && fy < this.farm.y + this.farm.h + 24) return true;
      if (Math.abs(fx - pondX) < 175 && Math.abs(fy - pondY) < 90) return true;
      // South band (desk + taste) and east kitchen — FarmScene.create draws flowers
      // before the player picks Unit 10, so this keep-out is always on.
      if (fy > this.farm.y + this.farm.h + 20 && fy < this.farm.y + this.farm.h + 190 &&
          fx > this.farm.x - 90 && fx < this.farm.x + this.farm.w + 90) return true;
      if (fx > this.farm.x + this.farm.w + 20 && fx < this.farm.x + this.farm.w + 260 &&
          fy > this.farm.y + 60 && fy < this.farm.y + this.farm.h + 50) return true;
      return false;
    };
    const want = 20;
    let tries = 0;
    while (flowerList.length < want && tries < 220) {
      tries++;
      const fx = Phaser.Math.Between(40, Math.max(80, W - 40));
      const fy = Phaser.Math.Between(40, Math.max(80, H - 40));
      if (inKeepout(fx, fy)) continue;
      const tex = wildflowerTex(this, Phaser.Utils.Array.GetRandom(flowerColors));
      const hd = tex.indexOf('_hd') >= 0;
      const fl = this.add.image(fx, fy, tex)
        .setOrigin(0.5, 1)
        .setScale(hd ? 1 : 1.2)
        .setDepth(fy);
      if (this.shadows) {
        this.shadows.createShadow(fl, Math.max(14, Math.round((fl.displayWidth || 20) * 0.7)), 6, 0);
      }
      flowerList.push(fl);
      this.tweens.add({
        targets: fl,
        angle: { from: -6, to: 6 },
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    // Micro World Details: Stone Well & Water Sparkles (Widened Placement)
    const wellX = this.farm.x - 190;
    const wellY = this.farm.y + this.farm.h + 85;
    const wellSprite = this.add.image(wellX, wellY, 'stone_well').setOrigin(0.5, 1).setScale(1.1).setDepth(wellY);
    if (this.shadows) this.shadows.createShadow(wellSprite, 44, 14, 1);
    // Water sparkles inside well
    for(let i=0; i<4; i++){
      const sp = this.add.circle(wellX + (Math.random()-0.5)*18, wellY - 12 + (Math.random()-0.5)*12, 1.5, 0x67E8F9, 0.9).setDepth(wellY+1);
      this.tweens.add({ targets: sp, alpha: 0.2, scale: 1.8, duration: 800 + i*300, yoyo: true, repeat: -1 });
    }

    // Micro World Details: Barrels & Crates next to Shop
    const bxl = sx + 28, byl = sy - 10;
    const barrelSprite = this.add.image(bxl, byl, 'pixel_barrel').setOrigin(0.5, 1).setScale(0.9).setDepth(byl);
    const crateSprite = this.add.image(bxl + 18, byl + 6, 'pixel_crate').setOrigin(0.5, 1).setScale(0.9).setDepth(byl+6);
    if (this.shadows) {
      this.shadows.createShadow(barrelSprite, 18, 6, 0);
      this.shadows.createShadow(crateSprite, 20, 6, 0);
    }

    // Micro World Details: Directional Signpost
    const spX = bx - 60, spY = by + 20;
    const signpostSprite = this.add.image(spX, spY, 'signpost').setOrigin(0.5, 1).setScale(1.1).setDepth(spY);
    if (this.shadows) this.shadows.createShadow(signpostSprite, 18, 6, 0);

    // R3: Perimeter Fences & Decorative Animated Fence Flowers
    const fenceY = this.farm.y - 12;
    const fenceFlowerColors = [0xEF4444, 0xFBBF24, 0xA855F7, 0xEC4899];
    const fenceBloomColors = ['red', 'yellow', 'purple'];
    let postIdx = 0;
    const placeFenceBloom = (x, y, depth) => {
      const color = fenceBloomColors[postIdx % fenceBloomColors.length];
      const tex = fenceBloomTex(this, color);
      const hd = tex.indexOf('_hd') >= 0;
      const flower = this.add.image(x, y, tex)
        .setOrigin(0.5, 1)
        .setScale(hd ? 1 : 0.9)
        .setDepth(depth);
      if (!hd) flower.setTint(fenceFlowerColors[postIdx % fenceFlowerColors.length]);
      this.tweens.add({
        targets: flower,
        angle: { from: -8, to: 8 },
        duration: 1400 + (postIdx * 170) % 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      postIdx++;
      return flower;
    };
    for (let fx = this.farm.x; fx <= this.farm.x + this.farm.w; fx += 28) {
      this.add.image(fx + 14, fenceY - 4, 'fnc_rail').setDisplaySize(28, 8).setDepth(fenceY - 1);
      const post = this.add.image(fx, fenceY, 'fnc_post').setOrigin(0.5, 1).setScale(1.1).setDepth(fenceY);
      if (this.shadows) this.shadows.createShadow(post, 14, 5, 0);
      placeFenceBloom(fx + (postIdx % 2 === 0 ? -2 : 2), fenceY - 10, fenceY + 2);
    }

    // Side perimeter fence posts with decorative animated flowers
    for (let fy = fenceY + 28; fy <= this.farm.y + this.farm.h + 10; fy += 28) {
      const postL = this.add.image(this.farm.x, fy, 'fnc_post').setOrigin(0.5, 1).setScale(1.1).setDepth(fy);
      if (this.shadows) this.shadows.createShadow(postL, 14, 5, 0);
      placeFenceBloom(this.farm.x - 2, fy - 10, fy + 2);

      const postR = this.add.image(this.farm.x + this.farm.w, fy, 'fnc_post').setOrigin(0.5, 1).setScale(1.1).setDepth(fy);
      if (this.shadows) this.shadows.createShadow(postR, 14, 5, 0);
      placeFenceBloom(this.farm.x + this.farm.w + 2, fy - 10, fy + 2);
    }

    // Micro Animated Fauna: Fluttering Butterflies
    this._createButterflies(flowerList);

    // Warm Sunbeam Lighting Overlay
    const vignette = this.add.graphics().setDepth(9980).setScrollFactor(0);
    vignette.fillStyle(0xFF9900, 0.04);
    vignette.fillRect(0, 0, W, H);

    // Micro Ambient Particle: Falling Leaves from Apple Tree
    this._createFallingLeaves(this.farm.x - 130, this.farm.y - 85);

    this._createPollenDrift(W, H);
    this._createFireflies(W, H);
    this._wellLightPos = { x: wellX, y: wellY - 18 };
    this._shopLightPos = { x: sx, y: sy - 20 };
  }

  _createPollenDrift(W, H) {
    if (!this.textures.exists('p_pollen') && !this.textures.exists('p_leaf_green')) return;
    if (typeof this.add.particles !== 'function') return;
    const key = this.textures.exists('p_pollen') ? 'p_pollen' : 'p_leaf_green';
    try {
      this.pollenDrift = this.add.particles(W / 2, H / 2, key, {
        x: { min: -W / 2, max: W / 2 },
        y: { min: -H / 2, max: H / 2 },
        speedX: { min: 6, max: 18 },
        speedY: { min: -10, max: 6 },
        lifespan: 7000,
        quantity: 1,
        frequency: 420,
        scale: { start: 0.7, end: 0.2 },
        alpha: { start: 0.55, end: 0 },
        rotate: { min: 0, max: 180 }
      }).setDepth(8);
    } catch (e) {}
  }

  _createFireflies(W, H) {
    this.fireflies = [];
    const key = this.textures.exists('p_firefly') ? 'p_firefly' : null;
    for (let i = 0; i < 14; i++) {
      const fx = Phaser.Math.Between(30, Math.max(60, W - 30));
      const fy = Phaser.Math.Between(60, Math.max(90, H - 40));
      const fl = key
        ? this.add.image(fx, fy, key).setDepth(9986)
        : this.add.circle(fx, fy, 2, 0xFDE047, 0.8).setDepth(9986);
      if (key && typeof Phaser !== 'undefined' && Phaser.BlendModes) {
        fl.setBlendMode(Phaser.BlendModes.ADD);
      }
      fl.setAlpha(0);
      this.tweens.add({
        targets: fl,
        x: fx + Phaser.Math.Between(-40, 40),
        y: fy + Phaser.Math.Between(-30, 30),
        duration: 2800 + Math.random() * 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: fl,
        alpha: { from: 0.15, to: 0.95 },
        duration: 700 + Math.random() * 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: Math.random() * 800
      });
      this.fireflies.push(fl);
    }
  }

  _createFallingLeaves(ax, ay){
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const lf = this.add.rectangle(ax + Phaser.Math.Between(-20, 20), ay - 35, 4, 3, 0x86EFAC).setDepth(ay + 10);
        this.tweens.add({
          targets: lf,
          x: { value: `+=${Phaser.Math.Between(-30, 30)}`, ease: 'Sine.InOut' },
          y: ay + Phaser.Math.Between(10, 30),
          angle: 360,
          alpha: 0,
          duration: 3500,
          ease: 'Power1',
          onComplete: () => lf.destroy()
        });
      }
    });
  }

  _createButterflies(flowerList){
    if(!flowerList || !flowerList.length) return;
    const openKey = butterflyTex(this, 'open');
    const flapKey = butterflyTex(this, 'flap');
    for(let i=0; i<5; i++){
      const targetFlw = Phaser.Utils.Array.GetRandom(flowerList);
      const bf = this.add.image(targetFlw.x, targetFlw.y - 18, openKey)
        .setOrigin(0.5, 0.5)
        .setScale(1)
        .setDepth(targetFlw.y + 50);

      this.time.addEvent({
        delay: 180 + Math.random()*60,
        loop: true,
        callback: () => {
          if(bf && bf.active){
            bf.setTexture(bf.texture.key === openKey ? flapKey : openKey);
          }
        }
      });

      this.tweens.add({
        targets: bf,
        x: { value: `+=${Phaser.Math.Between(-60, 60)}`, ease: 'Sine.InOut' },
        y: { value: `+=${Phaser.Math.Between(-40, 40)}`, ease: 'Sine.InOut' },
        duration: 3000 + Math.random()*2000,
        yoyo: true,
        repeat: -1
      });
    }
  }

  _createAmbientParticles(W, H){
    for(let i=0; i<30; i++){
      const px = Phaser.Math.Between(0, W);
      const py = Phaser.Math.Between(0, H);
      const col = Math.random() < 0.4 ? 0xFDE047 : (Math.random() < 0.7 ? 0xA855F7 : 0x67E8F9);
      const p = this.add.circle(px, py, Phaser.Math.Between(2, 4), col, Math.random()*0.6 + 0.2).setDepth(9985);
      
      this.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-40, 40),
        y: py + Phaser.Math.Between(-60, 20),
        alpha: { from: p.alpha, to: 0.1 },
        duration: 3000 + Math.random()*3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }
  }

  // ── SHOP NPC ───────────────────────────────────────────────────────────────
  _createShopNPC(W, H){
    const sx = this.farm.x + this.farm.w + 175;
    const sy = this.farm.y + this.farm.h / 2 + 25;
    this.shopNPC = this.add.image(sx, sy, 'shop_sign')
      .setOrigin(0.5, 1).setScale(1.3).setDepth(sy);
    if (this.shadows) this.shadows.createShadow(this.shopNPC, 48, 14, 1);

    this.tweens.add({ targets: this.shopNPC, y: sy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.shopHint = this.add.text(sx, sy + 10, '🏪 SHOP\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'14px',
      color:'#FFD700', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5, 0).setDepth(sy+1).setAlpha(0);

    this.shopX = sx; this.shopY = sy;
  }

  // ── NOTICE BOARD ───────────────────────────────────────────────────────────
  _createBoardNPC(W, H){
    const bx = this.farm.x + this.farm.w / 2;
    const by = this.farm.y - 95;
    this.boardSprite = this.add.image(bx, by, 'notice_board').setOrigin(0.5,1).setScale(1.3).setDepth(by);
    if (this.shadows) this.shadows.createShadow(this.boardSprite, 46, 13, 1);
    this.boardHint = this.add.text(bx, by-40, '📋 Minigame\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FF88FF', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(by+1).setAlpha(0);
    this.tweens.add({targets:this.boardHint, y:this.boardHint.y-3, duration:700, yoyo:true, repeat:-1});
    this.boardX = bx; this.boardY = by;
  }

  // ── ARCADE MACHINE ─────────────────────────────────────────────────────────
  _createArcadeNPC(W, H){
    const ax = this.farm.x - 200;
    const ay = this.farm.y + 20;
    this.arcadeSprite = this.add.image(ax, ay, 'arcade_machine').setOrigin(0.5,1).setScale(1.5).setDepth(ay);
    if (this.shadows) this.shadows.createShadow(this.arcadeSprite, 48, 14, 1);
    this.tweens.add({ targets: this.arcadeSprite, scaleY: { from: 1.5, to: 1.54 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.arcadeHint = this.add.text(ax, ay-60, '👾 ARCADE\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#00FFFF', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(ay+1).setAlpha(0);
    this.tweens.add({targets:this.arcadeHint, y:this.arcadeHint.y-3, duration:600, yoyo:true, repeat:-1});
    this.arcadeX = ax; this.arcadeY = ay;
  }

  // ── WIZARD NPC ─────────────────────────────────────────────────────────────
  _createWizardNPC(W, H){
    const wx = this.farm.x + this.farm.w + 160;
    const wy = this.farm.y - 85;
    this.wizardSprite = this.add.sprite(wx, wy, 'wizard_idle_0');
    if (this.wizardSprite.play) this.wizardSprite.play('wizard-idle').setOrigin(0.5,1).setScale(1.8).setDepth(wy);
    if (this.shadows) this.shadows.createShadow(this.wizardSprite, 38, 12, 1);
    this.tweens.add({ targets: this.wizardSprite, y: wy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.wizardHint = this.add.text(wx, wy-68, '⚡ SPELL DUEL\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#A855F7', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(wy+1).setAlpha(0);
    this.tweens.add({ targets: this.wizardHint, y: this.wizardHint.y - 3, duration: 600, yoyo: true, repeat: -1 });
    
    this.wizardX = wx; this.wizardY = wy;
  }

  // ── CAT NPC ────────────────────────────────────────────────────────────────
  _createCatNPC(W, H){
    const cx = this.farm.x - 120;
    const cy = this.farm.y + this.farm.h + 75;
    this.catSprite = this.add.sprite(cx, cy, 'cat_idle_0');
    if (this.catSprite.play) this.catSprite.play('cat-idle')
      .setOrigin(0.5,1).setScale(0.75).setDepth(cy);
    if (this.shadows) this.shadows.createShadow(this.catSprite, 20, 6, 1);
    this.tweens.add({ targets:this.catSprite, y:cy-3, duration:1200, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    this.catHint = this.add.text(cx, cy-38, '🐱 야옹\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FFCC44', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(cy+1).setAlpha(0);
    this.tweens.add({ targets:this.catHint, y:this.catHint.y-3, duration:700, yoyo:true, repeat:-1 });
    this.catX=cx; this.catY=cy;
  }

  // ── DUNGEON PORTAL NPC ─────────────────────────────────────────────────────
  _createPortalNPC(W, H){
    const px = this.farm.x + this.farm.w + 140;
    const py = this.farm.y + this.farm.h + 80;
    this.portalSprite = this.add.image(px, py, 'dungeon_portal').setOrigin(0.5,1).setScale(1.6).setDepth(py);
    if (this.shadows) this.shadows.createShadow(this.portalSprite, 72, 20, 1);
    this.tweens.add({ targets: this.portalSprite, scaleX: 1.65, scaleY: 1.55, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.portalHint = this.add.text(px, py-75, '🌀 DUNGEON\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#EC4899', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(py+1).setAlpha(0);
    this.tweens.add({ targets: this.portalHint, y: this.portalHint.y - 3, duration: 600, yoyo: true, repeat: -1 });
    
    this.portalX = px; this.portalY = py;
  }

  // ── FISHING SPOT NPC / DOCK ────────────────────────────────────────────────
  _createFishingSpot(W, H){
    const fx = this.farm.x - 190;
    const fy = this.farm.y + this.farm.h / 2 + 20;
    this.dockSprite = null; // No boat — pure pond

    // ── Large stones (outer ring) ─────────────────────────────────────────
    const stoneColors = [0x7D7571, 0x6B6360, 0x8A8480, 0x5C5652];
    const pondRadiusX = 140, pondRadiusY = 50;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.22) {
      const jitter = 0.88 + Math.random() * 0.24;
      const px = fx + Math.cos(angle) * (pondRadiusX + 14) * jitter;
      const py = fy + 20 + Math.sin(angle) * (pondRadiusY + 14) * jitter;
      const size = 5 + Math.random() * 5;
      const col = stoneColors[Math.floor(Math.random() * stoneColors.length)];
      const stone = this.add.ellipse(px, py, size * 1.4, size, col, 0.95).setDepth(fy - 8);
      stone.setAngle(Math.random() * 360);
    }

    // ── Mid cobblestone ring ──────────────────────────────────────────────
    const pebbleColors = [0x9E9793, 0xC7C1BD, 0xB0A8A3, 0x8A827E];
    for (let angle = 0; angle < Math.PI * 2; angle += 0.16) {
      const jitter = 0.85 + Math.random() * 0.3;
      const px = fx + Math.cos(angle) * (pondRadiusX + 6) * jitter;
      const py = fy + 20 + Math.sin(angle) * (pondRadiusY + 6) * jitter;
      const size = 3 + Math.random() * 4;
      const col = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
      this.add.circle(px, py, size, col, 0.9).setDepth(fy - 7);
    }

    // ── Inner small pebbles ───────────────────────────────────────────────
    const smallColors = [0xC7C1BD, 0xB0A8A3, 0xD5CFCB, 0x9E9793];
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const jitter = 0.9 + Math.random() * 0.2;
      const px = fx + Math.cos(angle) * (pondRadiusX - 4) * jitter;
      const py = fy + 20 + Math.sin(angle) * (pondRadiusY - 4) * jitter;
      const size = 1.5 + Math.random() * 2.5;
      const col = smallColors[Math.floor(Math.random() * smallColors.length)];
      this.add.circle(px, py, size, col, 0.75).setDepth(fy - 6);
    }

    // ── Scattered accent rocks (random clusters) ──────────────────────────
    for (let i = 0; i < 14; i++) {
      const rAngle = Math.random() * Math.PI * 2;
      const rDist = 0.95 + Math.random() * 0.35;
      const rx = fx + Math.cos(rAngle) * (pondRadiusX + 22) * rDist;
      const ry = fy + 20 + Math.sin(rAngle) * (pondRadiusY + 22) * rDist;
      const rSize = 3 + Math.random() * 6;
      const rCol = stoneColors[Math.floor(Math.random() * stoneColors.length)];
      const rock = this.add.ellipse(rx, ry, rSize * 1.6, rSize, rCol, 0.85).setDepth(fy - 8);
      rock.setAngle(Math.random() * 360);
    }

    // ── Crystal Pond (tiled water + depth rings) ──────────────────────────
    this.add.ellipse(fx, fy + 24, 268, 90, 0x134E4A, 0.95).setDepth(fy - 6);
    if (this.textures.exists('tile_ocean_deep_0')) {
      const maskG = this.make.graphics({ add: false });
      maskG.fillStyle(0xffffff, 1);
      maskG.fillEllipse(fx, fy + 20, 250, 76);
      const pondMask = maskG.createGeometryMask();
      this.pondWater = this.add.tileSprite(fx, fy + 20, 260, 86, 'tile_ocean_deep_0')
        .setDepth(fy - 4).setMask(pondMask);
      this.pondWaterFrame = 0;
      this.time.addEvent({
        delay: 280,
        loop: true,
        callback: () => {
          if (!this.pondWater || !this.sys || !this.sys.isActive()) return;
          this.pondWaterFrame = (this.pondWaterFrame + 1) % 4;
          const key = `tile_ocean_deep_${this.pondWaterFrame}`;
          if (this.textures.exists(key)) this.pondWater.setTexture(key);
        }
      });
    } else {
      const pond = this.add.ellipse(fx, fy + 20, 250, 76, 0x0E7490, 0.9).setDepth(fy - 4);
      this.tweens.add({ targets: pond, scaleX: 1.03, scaleY: 0.97, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.add.ellipse(fx - 36, fy + 10, 90, 30, 0x5EEAD4, 0.18).setDepth(fy - 3);
    this.add.ellipse(fx + 48, fy + 26, 56, 18, 0x67E8F9, 0.14).setDepth(fy - 3);

    // ── Water sparkle particles ───────────────────────────────────────────
    for (let i = 0; i < 10; i++) {
      const sx = fx + (Math.random() - 0.5) * 200;
      const sy = fy + 10 + (Math.random() - 0.5) * 50;
      const sparkle = this.add.circle(sx, sy, 1.5, 0xECFEFF, 0.85).setDepth(fy - 2);
      this.tweens.add({
        targets: sparkle, alpha: { from: 0.15, to: 0.95 }, scale: { from: 0.7, to: 1.7 },
        duration: 900 + i * 280, yoyo: true, repeat: -1, ease: 'Sine.InOut'
      });
    }

    // ── Floating Lily Pads ────────────────────────────────────────────────
    const lilyPositions = [[-70, 18], [78, 26], [-18, 30], [42, 12], [-92, 8]];
    lilyPositions.forEach(([lx, ly], i) => {
      const key = this.textures.exists('lily_pad') ? 'lily_pad' : null;
      const lily = key
        ? this.add.image(fx + lx, fy + ly, key).setScale(0.9 + Math.random() * 0.25).setDepth(fy - 1)
        : this.add.ellipse(fx + lx, fy + ly, 16, 10, 0x4ADE80, 0.7).setDepth(fy - 1);
      this.tweens.add({ targets: lily, y: `+=${1.5 + Math.random()}`, duration: 1800 + i * 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      if (i % 2 === 0 && this.textures.exists('lily_bloom')) {
        const bloom = this.add.image(fx + lx, fy + ly - 6, 'lily_bloom').setScale(0.7).setDepth(fy);
        this.tweens.add({ targets: bloom, y: `+=${1.5 + Math.random()}`, duration: 1800 + i * 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });

    if (this.textures.exists('pond_reed')) {
      [[-132, 8], [-118, 28], [124, 6], [136, 24], [-108, -8]].forEach(([rx, ry], i) => {
        const reed = this.add.image(fx + rx, fy + ry, 'pond_reed').setOrigin(0.5, 1).setScale(1.1).setDepth(fy + 2);
        this.tweens.add({ targets: reed, angle: { from: -4, to: 5 }, duration: 1600 + i * 220, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });
    }

    // ── Water ripple waves ────────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const ripple = this.add.ellipse(fx + (i - 1.5) * 40, fy + 20, 24, 7, 0x38BDF8, 0.3).setDepth(fy - 1);
      this.tweens.add({
        targets: ripple, scaleX: { from: 1, to: 2.8 }, scaleY: { from: 1, to: 1.4 }, alpha: { from: 0.3, to: 0 },
        duration: 3000, delay: i * 700, repeat: -1, ease: 'Quad.Out'
      });
    }

    // ── Hint & Label ──────────────────────────────────────────────────────
    this.fishHint = this.add.text(fx, fy - 40, '🎣 FISHING POND\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#38BDF8', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(fy+1).setAlpha(0);
    this.tweens.add({ targets: this.fishHint, y: this.fishHint.y - 3, duration: 700, yoyo: true, repeat: -1 });

    this.fishX = fx; this.fishY = fy;

    // Ambient Fish Jumping Effect
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this._triggerFishJump(fx, fy) });
  }

  _triggerFishJump(fx, fy) {
    if (!this.sys || !this.sys.isActive()) return;
    if (this._pondVisible === false) return;
    const isLeft = Math.random() < 0.5;
    const jumpDist = Phaser.Math.Between(40, 70) * (isLeft ? -1 : 1);
    const startX = fx + Phaser.Math.Between(-40, 40);
    const startY = fy + 20 + Phaser.Math.Between(-8, 8);
    const endX = startX + jumpDist;
    const jumpHeight = Phaser.Math.Between(35, 45);
    const duration = 750;

    // Takeoff splash
    this._createSplashRipples(startX, startY);
    this._createSplashDroplets(startX, startY);

    const fish = this.add.image(startX, startY, 'fish_carp').setScale(1.0).setDepth(fy + 5);
    if (isLeft) fish.setFlipX(true);

    const startAngle = isLeft ? 40 : -40;
    const endAngle = isLeft ? -50 : 50;
    fish.setAngle(startAngle);

    const angleTween = this.tweens.add({
      targets: fish,
      angle: endAngle,
      duration: duration,
      ease: 'Linear'
    });

    const yTween = this.tweens.add({
      targets: fish,
      y: startY - jumpHeight,
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.Out'
    });

    const xTween = this.tweens.add({
      targets: fish,
      x: endX,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this._createSplashRipples(endX, startY);
        this._createSplashDroplets(endX, startY);
        angleTween.destroy();
        yTween.destroy();
        xTween.destroy();
        fish.destroy();
      }
    });
  }

  _createSplashRipples(rx, ry) {
    for (let i = 0; i < 2; i++) {
      const ring = this.add.ellipse(rx, ry, 8, 4).setStrokeStyle(1.5, 0x38BDF8, 0.9).setDepth(ry - 2);
      this.tweens.add({
        targets: ring,
        scaleX: 3.5 + i * 1.2,
        scaleY: 3.5 + i * 1.2,
        alpha: 0,
        delay: i * 80,
        duration: 450 + i * 100,
        ease: 'Quad.Out',
        onComplete: () => {
          ring.destroy();
        }
      });
    }
  }

  _createSplashDroplets(sx, sy) {
    const count = Phaser.Math.Between(4, 7);
    for (let i = 0; i < count; i++) {
      const drop = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2.2), 0x7DD3FC, 0.95).setDepth(sy + 4);
      const vx = Phaser.Math.FloatBetween(-30, 30);
      const vy = Phaser.Math.FloatBetween(-35, -15);
      const dropDuration = Phaser.Math.Between(350, 500);

      const xTween = this.tweens.add({
        targets: drop,
        x: sx + vx,
        duration: dropDuration,
        ease: 'Linear'
      });

      const yTween = this.tweens.add({
        targets: drop,
        y: sy + vy,
        duration: dropDuration / 2,
        yoyo: true,
        ease: 'Quad.Out'
      });

      const alphaTween = this.tweens.add({
        targets: drop,
        alpha: 0,
        duration: dropDuration,
        ease: 'Power1',
        onComplete: () => {
          xTween.destroy();
          yTween.destroy();
          alphaTween.destroy();
          drop.destroy();
        }
      });
    }
  }

  // ── APPLE TREE ─────────────────────────────────────────────────────────────
  _createAppleTree(W, H){
    const ax = this.farm.x - 130;
    const ay = this.farm.y - 85;
    const hd = this.textures.exists('apple_tree_hd');
    this.appleTreeSprite = this.add.image(ax, ay, appleTreeTex(this, false))
      .setOrigin(0.5, 1).setScale(hd ? 1 : 3.6).setDepth(ay+1);
    if (hd && this.appleTreeSprite.texture) {
      this.appleTreeSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (this.shadows) this.shadows.createShadow(this.appleTreeSprite, hd ? 88 : 170, hd ? 24 : 44, 0);

    this._createFallingLeaves(ax, ay);

    const trunkZone = this.add.zone(ax, ay - 8, hd ? 56 : 110, hd ? 36 : 52);
    this.physics.add.existing(trunkZone, true);
    this.physics.add.collider(this.player, trunkZone);
    this.tweens.add({
      targets: this.appleTreeSprite,
      angle: { from: -1.2, to: 1.2 },
      duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
    const labelY = ay - (hd ? 188 : 260);
    this.appleTreeLabel = this.add.text(ax, labelY, '🍎 HARVEST!\n[SPACE]', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '14px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5, 1).setDepth(ay + 100).setAlpha(0);
    this.tweens.add({ targets: this.appleTreeLabel, y: this.appleTreeLabel.y - 8,
      duration: 600, yoyo: true, repeat: -1 });
    this.appleTreeGlow = this.add.graphics().setDepth(ay - 1);
    this.tweens.add({ targets: this.appleTreeGlow, alpha: { from: 1, to: 0.1 },
      duration: 750, yoyo: true, repeat: -1 });
    this.appleTreeTimer = this.add.text(ax, ay + 8, '', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#AAFFAA', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    // Name tag
    // State
    this.appleX = ax; this.appleY = ay;
    this.appleRipeAt  = appleTreeSave.ripeAt  || (Date.now() + FarmScene.APPLE_RIPEN_MS);
    this.appleRipe    = appleTreeSave.ripe     || false;
    this._updateAppleTree();
  }

  // ── BEEHIVE NPC ────────────────────────────────────────────────────────────
  _createBeehiveNPC(W, H){
    const bx = this.farm.x - 65;
    const by = this.farm.y - 70;
    this.beehiveX = bx;
    this.beehiveY = by;

    this.beehiveSprite = this.add.image(bx, by, 'beehive')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(by);
    if (this.shadows) this.shadows.createShadow(this.beehiveSprite, 38, 12, 1);

    this.tweens.add({
      targets: this.beehiveSprite,
      x: { from: bx - 1.5, to: bx + 1.5 },
      duration: 85,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.beehiveBees = [];
    const numBees = 4;
    for (let i = 0; i < numBees; i++) {
      const beeSprite = this.add.image(bx, by - 22, 'p_tiny_bee')
        .setScale(1.2).setDepth(by + 10);
      this.beehiveBees.push({
        sprite: beeSprite,
        baseX: bx,
        baseY: by - 22,
        angle: (Math.PI * 2 / numBees) * i,
        radiusX: 16 + (i % 2) * 6,
        radiusY: 10 + (i % 2) * 4,
        speed: 0.04 + i * 0.01
      });
    }

    this.beehiveHint = this.add.text(bx, by - 56, '🐝 Beehive\n[SPACE]', {
      fontFamily: '"Press Start 2P",monospace',
      fontSize: '12px',
      color: '#FFFFFF',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5, 1).setDepth(by + 100).setAlpha(0);

    this.tweens.add({
      targets: this.beehiveHint,
      y: this.beehiveHint.y - 6,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

  }

  _createFallingLeaves(ax, ay){
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const leafKey = (this.textures && this.textures.exists('p_leaf_green'))
          ? (Math.random() < 0.5 ? 'p_leaf_green' : 'p_leaf_orange')
          : null;
        let lf;
        if (leafKey) {
          lf = this.add.image(ax + Phaser.Math.Between(-20, 20), ay - 110, leafKey).setDepth(ay + 10);
        } else {
          lf = this.add.rectangle(ax + Phaser.Math.Between(-20, 20), ay - 110, 4, 3, 0x86EFAC).setDepth(ay + 10);
        }
        this.tweens.add({
          targets: lf,
          x: { value: `+=${Phaser.Math.Between(-30, 30)}`, ease: 'Sine.InOut' },
          y: ay + Phaser.Math.Between(10, 30),
          angle: 360,
          alpha: 0,
          duration: 3500,
          ease: 'Power1',
          onComplete: () => lf.destroy()
        });
      }
    });
  }

  _updateAppleTree(){
    if(!this.appleTreeSprite) return;
    if(this.appleRipe){
      this.appleTreeSprite.setTexture(appleTreeTex(this, true));
      this.appleTreeLabel.setAlpha(1);
      this.appleTreeGlow.clear();
      const hd = this.textures.exists('apple_tree_ripe_hd');
      this.appleTreeGlow.fillStyle(0xFFDD44, 0.25);
      this.appleTreeGlow.fillEllipse(this.appleX, this.appleY + 4, hd ? 96 : 150, hd ? 28 : 40);
      this.appleTreeTimer.setText('');
    } else {
      this.appleTreeSprite.setTexture(appleTreeTex(this, false));
      this.appleTreeLabel.setAlpha(0);
      this.appleTreeGlow.clear();
    }
  }

  _tickAppleTree(){
    if(this.appleRipe) return;
    const now = Date.now();
    const rem = Math.max(0, this.appleRipeAt - now);
    if(rem <= 0){
      this.appleRipe = true;
      _saveAppleTree(this);
      this._updateAppleTree();
      showToast('🍎 Apple Tree is ripe! Go harvest it!');
      return;
    }
    const secs = Math.ceil(rem / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    this.appleTreeTimer.setText(`🍎 ${m}m ${String(s).padStart(2,'0')}s`);
  }

  harvestAppleTree(){
    if(!this.appleRipe) return;
    // Pick a random word from unlocked levels for Phase 3 quiz
    const word = this._pickWord();
    appleTreeQuizPending = true;
    openQuiz(word, null, 3);
  }

  onAppleHarvested(){
    this.playPlayerAction('pick', this.appleX, this.appleY, () => {
      playChiptuneSFX('harvest');
      // Reward: big gold bonus
      const bonus = 15 + Math.floor(Math.random() * 6); // 15-20 gold
      addGold(bonus);
      this._flyCoins(this.appleX, this.appleY - 30, Math.min(bonus, 8));
      this._label(this.appleX, this.appleY - 30, `+${bonus} 🍎 BONUS!`);

      this.spawnDroppedItem('사과', this.appleX, this.appleY);

      // Start regrowth timer
      this.appleRipe    = false;
      this.appleRipeAt  = Date.now() + FarmScene.APPLE_RIPEN_MS;
      _saveAppleTree(this);
      this._updateAppleTree();
      showToast(`🍎 Harvested! +${bonus} gold! Tree will regrow in 2 min.`, 4000);
    });
  }

  // ── GROUND DROPPED ITEM PIPELINE ─────────────────────────────────────────
  spawnDroppedItem(itemId, x, y, playPopAnim = true) {
    if (!this.droppedItems) this.droppedItems = [];
    const info = getItemInfo(itemId);
    const nameKo = info.nameKo || itemId;

    const container = this.add.container(x, y - 10).setDepth(y + 5);

    // Ground Shadow
    const shadow = this.add.ellipse(0, 14, 22, 8, 0x000000, 0.4);
    
    // Glowing Aura
    const glow = this.add.graphics();
    glow.fillStyle(0x38bdf8, 0.25);
    glow.fillCircle(0, 0, 16);

    // Icon / Emoji
    const iconText = this.add.text(0, -4, info.icon || '🥬', { fontSize: '24px' }).setOrigin(0.5, 0.5);

    // Korean Label
    const labelText = this.add.text(0, 16, nameKo, {
      fontFamily: '"Press Start 2P", "Noto Sans KR", monospace',
      fontSize: '9px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    container.add([shadow, glow, iconText, labelText]);

    if (playPopAnim) {
      container.setScale(0.2);
      container.y = y - 30;
      this.tweens.add({
        targets: container,
        y: y - 10,
        scale: 1,
        duration: 400,
        ease: 'Bounce.Out'
      });
    }

    const dropEntity = {
      id: 'drop_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      itemId: itemId,
      nameKo: nameKo,
      curX: x,
      curY: y,
      bobOffset: Math.random() * Math.PI * 2,
      pickupCooldown: 0,
      container: container,
      glowGraphics: glow,
      shadowSprite: shadow
    };

    this.droppedItems.push(dropEntity);
    return dropEntity;
  }

  clearAllDroppedItems() {
    if (this.droppedItems && Array.isArray(this.droppedItems)) {
      this.droppedItems.forEach(item => {
        if (item.container && item.container.destroy) {
          item.container.destroy();
        }
      });
    }
    this.droppedItems = [];
  }

  updateDroppedItems(dt) {
    if (!this.droppedItems || this.droppedItems.length === 0) return;
    const gameTime = this.time ? this.time.now : Date.now();
    const now = Date.now();

    const isPlayerValid = !!this.player;
    const playerX = isPlayerValid ? this.player.x : 0;
    const playerBaseY = isPlayerValid ? (this.player.y + (this.player.displayHeight * (1 - this.player.originY))) : 0;

    const MAGNET_DIST = 65;
    const PICKUP_DIST = 32;

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      if (!item.container || !item.container.active) {
        this.droppedItems.splice(i, 1);
        continue;
      }

      // Continuous sine-wave bobbing
      const bob = Math.sin(gameTime * 0.005 + item.bobOffset) * 4;
      item.container.y = item.curY - 10 + bob;
      item.container.x = item.curX;
      item.container.setDepth(item.curY + 5);

      if (item.glowGraphics) {
        item.glowGraphics.setAlpha(0.25 + 0.15 * Math.sin(gameTime * 0.004 + item.bobOffset));
      }

      if (!isPlayerValid) continue;

      const dist = Phaser.Math.Distance.Between(playerX, playerBaseY, item.curX, item.curY);

      const isCooldownActive = now <= item.pickupCooldown;
      const isInvFull = getUsedInventorySlots() >= (inventoryState.maxSlots || 20);
      const isAlreadyOwned = inventoryState.ingredients && inventoryState.ingredients[getItemInfo(item.itemId).key] > 0;

      // Magnet zone (~60px)
      if (dist <= MAGNET_DIST && dist > PICKUP_DIST) {
        if (!isInvFull || isAlreadyOwned || !isCooldownActive) {
          item.curX += (playerX - item.curX) * 0.10;
          item.curY += (playerBaseY - item.curY) * 0.10;
        }
      }

      // Pickup zone (~30px)
      if (dist <= PICKUP_DIST) {
        if (now > item.pickupCooldown) {
          const added = addItemToInventory(item.itemId, 1);
          if (added) {
            if (typeof playChiptuneSFX === 'function') playChiptuneSFX('pickup');
            if (typeof this._sparkle === 'function') this._sparkle(item.curX, item.curY);
            if (typeof this._label === 'function') this._label(item.curX, item.curY - 15, `+1 ${item.nameKo}!`, '#4ade80');
            item.container.destroy();
            this.droppedItems.splice(i, 1);
          } else {
            if (typeof showToast === 'function') {
              showToast("🎒 Inventory Full! Cannot pick up " + item.nameKo, 2500);
            }
            item.pickupCooldown = now + 3000;
          }
        }
      }
    }
  }

  // ── PLAYER ACTION HELPER ───────────────────────────────────────────────────
  playPlayerAction(actionType, targetX, targetY, callback) {
    if (!this.player) { if (callback) callback(); return; }

    this.isPerformingAction = true;
    playerLocked = true;
    this.player.setVelocity(0, 0);

    if (typeof targetX === 'number' && typeof targetY === 'number') {
      const dx = targetX - this.player.x;
      const dy = targetY - this.player.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.player.setFlipX(dx < 0);
      } else {
        this.player.setFlipX(false);
      }
    }

    const animKey = `player-${actionType}`;
    const toolKey = actionType === 'water' ? 'tool_watering_can' :
                    actionType === 'harvest' ? 'tool_sickle' :
                    actionType === 'pick' ? 'tool_basket' : null;

    let toolSprite = null;
    if (toolKey && this.textures && this.textures.exists(toolKey)) {
      const offsetX = this.player.flipX ? -12 : 12;
      const toolY = playerFeetY(this.player) - (this.player.displayHeight * 0.55);
      toolSprite = this.add.image(this.player.x + offsetX, toolY, toolKey)
        .setDepth(this.player.depth + 1);
    }

    let cleanedUp = false;
    const restoreState = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (toolSprite) { toolSprite.destroy(); toolSprite = null; }
      this.isPerformingAction = false;
      playerLocked = false;
      if (this.player && this.player.active) {
        applySkinToSprite(this, this.player, FARM_SKIN_APPLY);
      }
      if (typeof callback === 'function') callback();
    };

    const duration = 650;
    if (this.anims && this.anims.exists(animKey)) {
      this.player.anims.play(animKey, true);
      this.player.once(`animationcomplete-${animKey}`, restoreState);
      this.time.delayedCall(duration + 100, restoreState);
    } else {
      this.tweens.add({
        targets: this.player,
        scaleY: 0.8, scaleX: 1.2,
        duration: 150, yoyo: true, repeat: 1,
        onComplete: restoreState
      });
    }
  }

  // ── GINGER CAT BEHAVIOR STATE MACHINE ───────────────────────────────────────

  _updateCatNPC(dt) {
    if (!this.catSprite || !this.player) return;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.catX, this.catY);
    let targetAnim = 'cat-idle';
    const isCatTalking = typeof catDialogOpen !== 'undefined' && catDialogOpen;

    if (this.catIsMoving) {
      targetAnim = 'cat-walk';
    } else if (isCatTalking || dist < 65) {
      targetAnim = 'cat-sit';
      this.catSprite.setFlipX(this.player.x < this.catX);
      this.catIdleTimer = 0;
    } else if (dist > 250) {
      this.catIdleTimer = (this.catIdleTimer || 0) + (dt || 16);
      if (this.catIdleTimer > 5000) {
        targetAnim = 'cat-sleep';
      } else {
        targetAnim = 'cat-idle';
      }
    } else {
      this.catIdleTimer = 0;
      this.catSprite.setFlipX(this.player.x < this.catX);
      targetAnim = 'cat-idle';
    }

    if (this.catCurrentAnim !== targetAnim) {
      this.catCurrentAnim = targetAnim;
      if (this.anims && this.anims.exists(targetAnim)) {
        this.catSprite.play(targetAnim, true);
      }
    }
  }

  // ── PLOTS ──────────────────────────────────────────────────────────────────
  _createPlots(W, H){
    const MAX=15, ROWS=5;
    for(let i=0;i<MAX;i++){
      const col=i%PLOT_COLS, row=Math.floor(i/PLOT_COLS);
      const px=this.farm.x+col*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const py=this.farm.y+row*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const active = isPlotUnlocked(i);
      const shad = this.add.ellipse(px, py+PLOT_SIZE/2-2, PLOT_SIZE*0.85, 10, 0, active ? 0.3 : 0.1).setDepth(1);
      const tile = this.add.image(px, py, 'drt_dry').setDisplaySize(PLOT_SIZE, PLOT_SIZE).setDepth(2);

      let lockIcon = null;
      let lockText = null;
      if(!active){
        tile.setAlpha(0.35).setTint(0x666666);
        lockIcon = this.add.image(px, py - 4, 'pixel_crate').setDisplaySize(24, 24).setAlpha(0.7).setDepth(3);
        lockText = this.add.text(px, py, '🔒', { fontSize: '18px' }).setOrigin(0.5).setDepth(4);
      } else {
        tile.setAlpha(1.0).clearTint();
      }

      const body = this.physics.add.staticImage(px, py).setVisible(false);
      body.setCircle(PLOT_SIZE*0.4).refreshBody();

      this.plots.push({
        tile, shad, body, x: px, y: py, sState: '', ko: null, word: null,
        index: i, plant: null, glow: null, hintLabel: null, active, plantedAt: 0,
        lockIcon, lockText
      });
    }
    this._restorePlots();
  }

  unlockPlot(p){
    if(!p || p.active) return;
    p.active = true;
    if(!unlockedPlots.includes(p.index)) unlockedPlots.push(p.index);
    unlockedPlotCount = Math.max(unlockedPlotCount, unlockedPlots.length);

    p.tile.clearTint().setAlpha(1.0);
    p.shad.setAlpha(0.3);
    if(p.lockIcon){ p.lockIcon.destroy(); p.lockIcon = null; }
    if(p.lockText){ p.lockText.destroy(); p.lockText = null; }
    this.children.list
      .filter(c => c.type === 'Text' && c.text === '🔒' &&
              Math.abs(c.x - p.x) < 5 && Math.abs(c.y - p.y) < 5)
      .forEach(c => c.destroy());

    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
    this._sparkle(p.x, p.y);
    this._label(p.x, p.y, 'Plot Unlocked! 🔓');
    persistSave();
    if(typeof buildShopGrid === 'function' && shopOpen) buildShopGrid();
  }

  refreshPlotAccess(){
    if(!this.plots) return;
    this.plots.forEach((p, i) => {
      if(isPlotUnlocked(i) && !p.active){
        this.unlockPlot(p);
      }
    });
  }

  _createPlayer(W, H){
    this.playerFacing = 'down';
    this._farmFeetY = farmFeetYFromSpawn(H);
    const key = skinTextureKey(this, 'walk', 'down', 0, 'farm');
    this.player = this.physics.add.sprite(W / 2, H - FARM_SPAWN_CENTER_Y_OFFSET, key)
      .setCollideWorldBounds(true).setDrag(900, 900).setDepth(500);
    applySkinToSprite(this, this.player, { sceneFit: 'farm', preserveFeet: false });
    const hd = skinUsesHd(this, resolvedSkinDef(this), 'farm');
    if (hd) this.player.y = this._farmFeetY;
    else this.player.setPosition(W / 2, H - FARM_SPAWN_CENTER_Y_OFFSET);
    if (this.lighting) {
      this.playerLantern = this.lighting.attachTo(this.player, 'light_glow_lantern', 0.8, 0.4);
      if (this.playerLantern) this.playerLantern._followChest = true;
    }
  }

  _addPlotLabels(){}

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(_t, dt){
    if(!this.player||!this.keys) return;
    const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
    this.player.setDepth(playerBaseY);

    if (this.dayNight) {
      const env = this.dayNight.update(dt || 16);
      if (this.shadows) {
        this.shadows.updateAllShadows(env.sunAngle, env.hour);
      }
      const night = env.hour < 5.8 || env.hour > 19.2;
      if (this.fireflies) {
        this.fireflies.forEach((f) => { if (f && f.setVisible) f.setVisible(night); });
      }
      if (this.playerLantern) {
        this.playerLantern.setVisible(night);
        this.playerLantern.setAlpha(night ? 0.55 : 0);
      }
    }
    if (this.lighting) this.lighting.update();

    // Dynamic Y-sort depth sorting for NPCs (using static base Y anchors)
    if (this.shopNPC) this.shopNPC.setDepth(this.shopY || this.shopNPC.y);
    if (this.boardSprite) this.boardSprite.setDepth(this.boardY || this.boardSprite.y);
    if (this.arcadeSprite) this.arcadeSprite.setDepth(this.arcadeY || this.arcadeSprite.y);
    if (this.wizardSprite) this.wizardSprite.setDepth(this.wizardY || this.wizardSprite.y);
    if (this.catSprite) this.catSprite.setDepth(this.catY || this.catSprite.y);
    if (this.portalSprite) this.portalSprite.setDepth(this.portalY || this.portalSprite.y);
    if (this.dockSprite) this.dockSprite.setDepth(this.fishY || this.dockSprite.y);
    if (this.appleTreeSprite) this.appleTreeSprite.setDepth(this.appleY || this.appleTreeSprite.y);

    // Plot crops Y-sort
    if (this.plots) {
      this.plots.forEach(p => {
        if (p.plant && p.plant.active) {
          p.plant.setDepth(p.y + 10);
        }
      });
    }

    this.updateDroppedItems(dt);


    if(!playerLocked && !this.isPerformingAction){
      let vx=(this.keys.A.isDown || this.keys.LEFT.isDown?-1:0)+(this.keys.D.isDown || this.keys.RIGHT.isDown?1:0);
      let vy=(this.keys.W.isDown || this.keys.UP.isDown?-1:0)+(this.keys.S.isDown || this.keys.DOWN.isDown?1:0);
      // The virtual thumbstick adds to the same vector, so nothing downstream — animation,
      // facing, dust puffs — needs to know which device the player used.
      if(typeof touchAxis !== 'undefined'){ vx += touchAxis.x; vy += touchAxis.y; }
      // Normalize only past unit length. Keyboard diagonals are √2 and still get scaled back
      // exactly as before; a half-pushed stick keeps its magnitude and walks at half speed,
      // which dividing by `len` unconditionally would have thrown away.
      const len=Math.hypot(vx,vy);
      if(len>1){ vx/=len; vy/=len; }
      this.player.setVelocity(vx*PLAYER_SPD,vy*PLAYER_SPD);
      if(vx!==0||vy!==0){
        const facing = Math.abs(vx) >= Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
        this.playerFacing = facing;
        this.player.setFlipX(false);
        this.player.anims.play(skinAnimKey(this, 'walk', facing, 'farm'), true);

        this.walkTimer+=(dt||16);
        if(this.walkTimer>160){
          this.walkFrame=(this.walkFrame+1)%4;
          this.walkTimer=0;
          
          // Walking puff effect on stepping frames (1 and 3)
          if(this.walkFrame===1 || this.walkFrame===3){
            const dx = facing === 'left' ? 7 : (facing === 'right' ? -7 : 0);
            const dustY = playerFeetY(this.player) - 4;
            if (this.textures && this.textures.exists('p_dust')) {
              const dust = this.add.image(this.player.x + dx, dustY, 'p_dust')
                .setScale(1).setAlpha(0.7).setDepth(this.player.y - 2);
              this.tweens.add({targets:dust, scale:2, y:dust.y-8, alpha:0, duration:400, ease:'Power1', onComplete:()=>dust.destroy()});
            } else {
              const puff = this.add.ellipse(this.player.x + dx, dustY, 6, 4, 0xDDCCAA, 0.6).setDepth(this.player.y - 2);
              this.tweens.add({targets:puff, scale:2, y:puff.y-8, alpha:0, duration:400, ease:'Power1', onComplete:()=>puff.destroy()});
            }
          }
        }
      } else {
        this.player.anims.stop();
        const idleDir = this.playerFacing || 'down';
        this.player.setTexture(skinTextureKey(this, 'walk', idleDir, 0, 'farm'));
        this.walkTimer=0;
      }
    } else {
      this.player.setVelocity(0,0);
      if (!this.isPerformingAction) {
        this.player.anims.stop();
        const idleDir = this.playerFacing || 'down';
        this.player.setTexture(skinTextureKey(this, 'walk', idleDir, 0, 'farm'));
      }
    }

    // Show shop hint label when nearby
    if(this.shopNPC && this.shopHint){
      const nearShop = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY) < 90;
      this.shopHint.setAlpha(nearShop ? 1 : 0);
    }
    // Show cat hint label when nearby & update Cat NPC state machine
    if(this.catHint){
      const nearCat = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY) < 65;
      this.catHint.setAlpha(nearCat ? 1 : 0);
    }
    this._updateCatNPC(dt);

    // Show board hint label when nearby
    if(this.boardHint){
      const nearBoard = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY) < 80;
      this.boardHint.setAlpha(nearBoard ? 1 : 0);
    }
    // Show arcade hint label when nearby
    if(this.arcadeHint){
      const nearArcade = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY) < 80;
      this.arcadeHint.setAlpha(nearArcade ? 1 : 0);
    }
    // Show wizard hint label when nearby
    if(this.wizardHint){
      const nearWizard = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY) < 85;
      this.wizardHint.setAlpha(nearWizard ? 1 : 0);
    }
    // Show dungeon portal hint label when nearby
    if(this.portalHint){
      const nearPortal = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY) < 90;
      this.portalHint.setAlpha(nearPortal ? 1 : 0);
    }
    // Show fishing hint label when nearby
    if(this.fishHint){
      const nearFish = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY) < 85;
      this.fishHint.setAlpha(nearFish ? 1 : 0);
    }
    // Show beehive hint label when nearby & update beehive bees
    if(this.beehiveHint){
      const nearBeehive = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.beehiveX,this.beehiveY) < 85;
      this.beehiveHint.setAlpha(nearBeehive ? 1 : 0);
    }
    if (this.studyDesk && this.studyDesk.label) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.studyDesk.x, this.studyDesk.y) < (this.studyDesk.interact || 80);
      this.studyDesk.label.setAlpha(near ? 1 : 0);
    }
    if (this.kitchenStation && this.kitchenStation.label) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.kitchenStation.x, this.kitchenStation.y) < (this.kitchenStation.interact || 82);
      this.kitchenStation.label.setAlpha(near ? 1 : 0);
    }
    if (this.tasteStation && this.tasteStation.label) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.tasteStation.x, this.tasteStation.y) < (this.tasteStation.interact || 80);
      this.tasteStation.label.setAlpha(near ? 1 : 0);
    }
    if (this.beehiveSprite) this.beehiveSprite.setDepth(this.beehiveY || this.beehiveSprite.y);
    if (this.beehiveBees && this.beehiveBees.length) {
      this.beehiveBees.forEach((bee) => {
        bee.angle += bee.speed;
        bee.sprite.x = bee.baseX + Math.cos(bee.angle) * bee.radiusX + Math.sin(bee.angle * 2.2) * 2;
        bee.sprite.y = bee.baseY + Math.sin(bee.angle) * bee.radiusY + Math.cos(bee.angle * 1.7) * 2;
      });
    }

    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)&&!playerLocked&&!this.isPerformingAction&&!quizOpen&&!shopOpen&&!memoryOpen&&!trophyOpen&&!duelOpen) this._interact();
    // SRS timer: check every 8s if any plant needs state advance
    this._timerAcc=(this._timerAcc||0)+(dt||16);
    if(this._timerAcc>8000){this._timerAcc=0;this._checkSRS();}
    // Apple tree timer: update every second
    this._appleAcc=(this._appleAcc||0)+(dt||16);
    if(this._appleAcc>1000){this._appleAcc=0;this._tickAppleTree();}
    // SPACE target indicator (shows which object will be targeted)
    if(!playerLocked&&!this.isPerformingAction&&!quizOpen&&!shopOpen&&!catDialogOpen) this._updateTargetHighlight();
    else if(this._tHL){ this._tHL.clear(); if(this._tLbl) this._tLbl.setAlpha(0); }
  }


  // ── SPACE TARGET HIGHLIGHT ─────────────────────────────────────────────────
  _updateTargetHighlight(){
    // Lazy-create graphics + label once
    if(!this._tHL){
      this._tHL  = this.add.graphics().setDepth(9997);
      this._tLbl = this.add.text(0,0,'',{
        fontFamily:'Arial,sans-serif', fontSize:'16px',
        color:'#fff', stroke:'#000', strokeThickness:4, align:'center',
        backgroundColor:'rgba(0,0,0,0.55)', padding:{x:6,y:3}
      }).setOrigin(0.5,1).setDepth(9998);
    }
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+26;
    const pulse=0.6+0.4*Math.sin(Date.now()/220);
    this._tHL.clear();
    let hx=null,hy=null,lbl='',col=0xFFD700,hw=PLOT_SIZE,hh=PLOT_SIZE;
    if (this._isUnit10() && this.kitchenStation &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.kitchenStation.x, this.kitchenStation.y) < (this.kitchenStation.interact || 82)) {
      hx = this.kitchenStation.x; hy = this.kitchenStation.y - 22; lbl = '[SPACE] 요리 주방'; col = 0xF97316; hw = 64; hh = 72;
    }
    if (hx === null && this._isUnit10() && this.studyDesk &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.studyDesk.x, this.studyDesk.y) < (this.studyDesk.interact || 80)) {
      hx = this.studyDesk.x; hy = this.studyDesk.y - 20; lbl = '[SPACE] 학습 책상'; col = 0x60A5FA; hw = 70; hh = 70;
    }
    if (hx === null && this._isUnit10() && this.tasteStation &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.tasteStation.x, this.tasteStation.y) < (this.tasteStation.interact || 80)) {
      hx = this.tasteStation.x; hy = this.tasteStation.y - 18; lbl = '[SPACE] 한 입'; col = 0xF59E0B; hw = 70; hh = 72;
    }
    if (hx === null) {
    // Priority mirrors _interact(): apple > ripe > wilt > cat > shop > empty
    if(this.appleRipe&&this.appleX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<95){
      hx=this.appleX;hy=this.appleY-50;lbl='[SPACE] Harvest 🍎 Bonus!';col=0xFF3333;hw=60;hh=70;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='4'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Harvest +Gold';col=0xFFD700;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='2'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Water';col=0x55CCFF;break;}
    }
    if(hx===null&&this.catSprite&&this.catSprite.visible&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<65){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Talk to Ginger Cat';col=0xFF88CC;hw=44;hh=44;
    }
    if(hx===null&&this.wizardSprite&&this.wizardSprite.visible&&this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      hx=this.wizardX;hy=this.wizardY-25;lbl='[SPACE] Spell Duel';col=0xA855F7;hw=44;hh=50;
    }
    if(hx===null&&this.portalSprite&&this.portalSprite.visible&&this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<90){
      hx=this.portalX;hy=this.portalY-30;lbl='[SPACE] Enter Dungeon';col=0xEC4899;hw=50;hh=60;
    }
    if(hx===null&&this.dockSprite&&this.dockSprite.visible&&this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      hx=this.fishX;hy=this.fishY-25;lbl='[SPACE] Start Fishing';col=0x38BDF8;hw=50;hh=50;
    }
    if(hx===null&&this.beehiveSprite&&this.beehiveSprite.visible&&this.beehiveX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.beehiveX,this.beehiveY)<85){
      hx=this.beehiveX;hy=this.beehiveY-25;lbl='[SPACE] Beehive Minigame';col=0xFACC15;hw=44;hh=50;
    }
    if(hx===null&&this.arcadeSprite&&this.arcadeSprite.visible&&this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      hx=this.arcadeX;hy=this.arcadeY-30;lbl='[SPACE] Play Retro Shooter';col=0x00FFFF;hw=44;hh=50;
    }
    if(hx===null&&this.boardSprite&&this.boardSprite.visible&&this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<80){
      hx=this.boardX;hy=this.boardY-20;lbl='[SPACE] Play Memory Match';col=0xFF88FF;hw=44;hh=44;
    }
    if(hx===null&&this.shopNPC&&this.shopNPC.visible&&this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<90){
      hx=this.shopX;hy=this.shopY-20;lbl='[SPACE] Open Shop';col=0xFFAA44;hw=50;hh=60;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Plant new';col=0x44FF88;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(!p.active&&near(p)){
        const cost = PLOT_UNLOCK_COSTS[p.index - 9] || 1000;
        hx=p.x; hy=p.y;
        lbl=`[SPACE] Unlock Plot #${p.index + 1} (${cost} Gold) 🔒`;
        col=0xFFD700;
        break;
      }
    }
    } // end non-Unit-10 highlight

    if(hx!==null){
      // Subtle Corner brackets
      const ca=12; const pad=8;
      this._tHL.fillStyle(col, 0.8 + pulse*0.2);
      [[hx-hw/2-pad,hy-hh/2-pad], [hx+hw/2+pad,hy-hh/2-pad], [hx-hw/2-pad,hy+hh/2+pad], [hx+hw/2+pad,hy+hh/2+pad]].forEach(([cx,cy], i)=>{
        if(i===0) { this._tHL.fillRect(cx,cy-1,ca,3); this._tHL.fillRect(cx-1,cy,3,ca); } // Top-left
        if(i===1) { this._tHL.fillRect(cx-ca,cy-1,ca,3); this._tHL.fillRect(cx-1,cy,3,ca); } // Top-right
        if(i===2) { this._tHL.fillRect(cx,cy-1,ca,3); this._tHL.fillRect(cx-1,cy-ca,3,ca); } // Bottom-left
        if(i===3) { this._tHL.fillRect(cx-ca,cy-1,ca,3); this._tHL.fillRect(cx-1,cy-ca,3,ca); } // Bottom-right
      });
      // Action label above object
      this._tLbl.setPosition(hx, hy-hh/2-14).setText(lbl).setAlpha(0.9+pulse*0.1);
    } else {
      this._tLbl.setAlpha(0);
    }
  }

  _checkSRS(){
    const now=Date.now(); let changed=false;
    this.plots.forEach(p=>{
      if(!p.ko) return;
      // getSrs resolves to the production track, which is the one the learning cycle
      // advances — phase 1 seeds it even when the question shown was recognition. So the crop
      // timer follows production regardless of which modality each phase tests.
      const s=getSrs(p.ko);
      if(p.sState==='1' && srsIsDue(s, now)){ this._setState(p,'2',p.ko); changed=true; }
      if(p.sState==='3' && srsIsDue(s, now)){ this._setState(p,'4',p.ko); changed=true; }
    });
    if(changed) savePlotsFn();
  }

  _isUnit10(){
    return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-10';
  }

  // ── UNIT 10: stations sit on grass south/east of the farm rect; pond hidden; portal hidden ──
  syncUnit10World(){
    const on = this._isUnit10();
    this._setMinigameSpritesVisible(!on);
    this._setPlotsVisible(true);
    this._setPondVisible(!on);
    if (this.portalSprite && this.portalSprite.setVisible) this.portalSprite.setVisible(!on);
    if (this.portalHint && this.portalHint.setVisible) this.portalHint.setVisible(!on);
    if (this.player && this.player.active) {
      applySkinToSprite(this, this.player, FARM_SKIN_APPLY);
    }
    if (on) {
      this._ensureTasteStation();
      this._ensureStudyDesk();
      this._ensureKitchen();
    } else {
      this._teardownTasteStation();
      this._teardownStudyDesk();
      this._teardownKitchen();
    }
  }

  _setPlotsVisible(show){
    if (!this.plots) return;
    this.plots.forEach(p => {
      [p.tile, p.shad, p.plant, p.glow, p.hintLabel, p.lockIcon, p.lockText].forEach(s => {
        if (s && s.setVisible) s.setVisible(show);
      });
    });
    if (this.children && this.children.list && typeof CROP_ICONS !== 'undefined') {
      this.children.list.forEach(ch => {
        if (ch && ch.text && CROP_ICONS.indexOf(ch.text) >= 0) ch.setVisible(show);
      });
    }
  }

  _setMinigameSpritesVisible(show){
    const list = [
      this.shopNPC, this.shopHint, this.boardSprite, this.boardHint,
      this.arcadeSprite, this.arcadeHint, this.wizardSprite, this.wizardHint,
      this.portalSprite, this.portalHint, this.dockSprite, this.fishHint,
      this.beehiveSprite, this.beehiveHint, this.catSprite, this.catHint
    ];
    list.forEach(spr => { if (spr && spr.setVisible) spr.setVisible(show); });
    if (this.children && this.children.list) {
      this.children.list.forEach(ch => {
        const t = ch && ch.text;
        if (typeof t === 'string' && /Merlin|Ginger Cat|Fishing Pond|Minigame|ARCADE|SPELL DUEL|Enter Dungeon|Dungeon Portal|Beehive|SHOP/i.test(t)) {
          ch.setVisible(show);
        }
      });
    }
  }

  _setPondVisible(show){
    this._pondVisible = !!show;
    if (this.pondWater && this.pondWater.setVisible) this.pondWater.setVisible(show);
    if (this.fishHint && this.fishHint.setVisible) this.fishHint.setVisible(show);
    if (this.dockSprite && this.dockSprite.setVisible) this.dockSprite.setVisible(show);
    if (!this.farm || !this.children || !this.children.list) return;
    const ox = this.farm.x - 190;
    const oy = this.farm.y + this.farm.h / 2 + 40;
    this.children.list.forEach(ch => {
      if (!ch || !ch.setVisible) return;
      if (Math.abs((ch.x || 0) - ox) > 175 || Math.abs((ch.y || 0) - oy) > 90) return;
      const key = ch.texture && ch.texture.key;
      const isWaterArt = typeof key === 'string' && /lily|reed|ocean|pond|fish/i.test(key);
      const isShape = ch.type === 'Ellipse' || ch.type === 'Arc' || ch.type === 'Circle';
      const isPondLabel = typeof ch.text === 'string' && /Fishing Pond|FISHING/i.test(ch.text);
      if (isWaterArt || isShape || isPondLabel) ch.setVisible(show);
    });
  }

  _spawnUnit10Station(id, { hdKey, matrixKey, lastKey, shadowW, matrixScale }) {
    if (!this.farm) return null;
    const spec = getUnit10Station(id);
    const pos = unit10StationXY(this.farm, spec);
    const hd = this.textures.exists(hdKey);
    const tex = hd ? hdKey
      : (this.textures.exists(matrixKey) ? matrixKey : lastKey);
    const spr = this.add.image(pos.x, pos.y, tex)
      .setOrigin(spec.originX || 0.5, 1)
      .setScale(hd ? hdStationScale(spec) : matrixScale)
      .setDepth(pos.y + 6);
    if (hd && spr.texture) spr.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const hdShadowW = typeof shadowW === 'function' ? shadowW(spr) : shadowW;
    if (this.shadows) this.shadows.createShadow(spr, hd ? hdShadowW : 52, 16, 1);
    const label = this.add.text(pos.x, pos.y + 8, (spec.nameKo || id) + '\n[SPACE]', {
      fontFamily: '"Noto Sans KR",sans-serif', fontSize: '14px',
      color: '#fff8e8', stroke: '#2a1a0a', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5, 0).setDepth(pos.y + 10).setAlpha(0);
    return { x: pos.x, y: pos.y, spr, label, interact: spec.interact || 80 };
  }

  _ensureTasteStation(){
    this._teardownTasteStation();
    const base = this._spawnUnit10Station('taste', {
      hdKey: 'unit10_taste_stall_hd',
      matrixKey: 'taste_stall',
      lastKey: 'shop_sign',
      shadowW: (spr) => Math.min(90, Math.round(spr.displayWidth * 0.55)),
      matrixScale: 2.4
    });
    if (!base) return;
    const steam = [];
    const y0 = base.y - base.spr.displayHeight * 0.82;
    for (let i = 0; i < 3; i++) {
      const puf = this.add.circle(base.x - 10 + i * 10, y0, 3 + i, 0xFFF8E8, 0.55).setDepth(base.y + 9);
      this.tweens.add({
        targets: puf, y: y0 - 20 - i * 6, alpha: 0, scale: 2.2,
        duration: 900 + i * 180, repeat: -1, delay: i * 200, ease: 'Sine.Out'
      });
      steam.push(puf);
    }
    this.tasteStation = Object.assign(base, { steam });
  }

  _ensureStudyDesk(){
    this._teardownStudyDesk();
    const base = this._spawnUnit10Station('desk', {
      hdKey: 'study_desk_hd',
      matrixKey: 'study_desk',
      lastKey: 'pixel_crate',
      shadowW: 78,
      matrixScale: 2.3
    });
    if (!base) return;
    const glow = this.add.circle(base.x - 26, base.y - base.spr.displayHeight * 0.63, 8, 0xFDE047, 0.22).setDepth(base.y + 8);
    this.tweens.add({ targets: glow, alpha: { from: 0.22, to: 0.75 }, scale: { from: 0.8, to: 1.4 }, duration: 700, yoyo: true, repeat: -1 });
    this.studyDesk = Object.assign(base, { glow });
  }

  _ensureKitchen(){
    this._teardownKitchen();
    const base = this._spawnUnit10Station('kitchen', {
      hdKey: 'unit10_kitchen_hd',
      matrixKey: 'unit10_kitchen',
      lastKey: 'shop_sign',
      shadowW: 58,
      matrixScale: 2.35
    });
    if (!base) return;
    const flame = [];
    const y0 = base.y - base.spr.displayHeight * 0.76;
    for (let i = 0; i < 3; i++) {
      const puf = this.add.circle(base.x - 4 + i * 7, y0, 2.5, 0xFFF7ED, 0.4).setDepth(base.y + 10);
      this.tweens.add({ targets: puf, y: y0 - 20 - i * 6, alpha: 0, scale: 2.0, duration: 900 + i * 160, repeat: -1, delay: i * 180, ease: 'Sine.Out' });
      flame.push(puf);
    }
    this.kitchenStation = Object.assign(base, { flame });
  }

  _teardownKitchen(){
    if (!this.kitchenStation) return;
    ['spr', 'label'].forEach(k => {
      const s = this.kitchenStation[k];
      if (s && s.destroy) s.destroy();
    });
    (this.kitchenStation.flame || []).forEach(s => { if (s && s.destroy) s.destroy(); });
    this.kitchenStation = null;
  }

  _teardownStudyDesk(){
    if (!this.studyDesk) return;
    ['spr', 'glow', 'label'].forEach(k => {
      const s = this.studyDesk[k];
      if (s && s.destroy) s.destroy();
    });
    this.studyDesk = null;
  }

  _teardownTasteStation(){
    if (!this.tasteStation) return;
    ['spr', 'label'].forEach(k => {
      const s = this.tasteStation[k];
      if (s && s.destroy) s.destroy();
    });
    (this.tasteStation.steam || []).forEach(s => { if (s && s.destroy) s.destroy(); });
    this.tasteStation = null;
  }

  // ── INTERACT (SRS-aware priority) ─────────────────────────────────────────
  _interact(){
    if (this._isUnit10() && this.kitchenStation &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.kitchenStation.x, this.kitchenStation.y) < (this.kitchenStation.interact || 82)) {
      if (typeof openCookingUI === 'function') openCookingUI();
      return;
    }
    if (this._isUnit10() && this.studyDesk &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.studyDesk.x, this.studyDesk.y) < (this.studyDesk.interact || 80)) {
      if (typeof openDeskQuiz === 'function') openDeskQuiz();
      return;
    }
    if (this._isUnit10() && this.tasteStation &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.tasteStation.x, this.tasteStation.y) < (this.tasteStation.interact || 80)) {
      if (typeof openTasteGame === 'function') openTasteGame();
      return;
    }
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+24;
    const skipStation = () => false;
    // Apple Tree harvest (highest priority when ripe)
    if(this.appleRipe&&this.appleX&&
       Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<95){
      this.tweens.add({targets:this.appleTreeSprite,angle:12,duration:80,yoyo:true,repeat:2});
      this.harvestAppleTree(); return;
    }
    // P1: ripe crop plots (Phase 3 harvest)
    for(const p of this.plots){ if(!skipStation(p)&&p.sState==='4'&&near(p)){openQuiz(p.word,p,3);return;} }
    // P2: wilting plants (Phase 2 review)
    for(const p of this.plots){ if(!skipStation(p)&&p.sState==='2'&&near(p)){openQuiz(p.word,p,2);return;} }
    const extrasOn = !(isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-10');
    // Cat NPC
    if(extrasOn&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<65){
      this.tweens.add({targets:this.catSprite,scale:{from:0.75,to:0.95},duration:100,yoyo:true,ease:'Back.Out(2)'});
      showCatDialog(); return;
    }
    // Wizard NPC
    if(extrasOn&&this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      this.tweens.add({targets:this.wizardSprite,scale:{from:1.8,to:2.1},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('duel');
      if(!chk.unlocked){ showHardLockToast('duel'); return; }
      openSpellDuel(); return;
    }
    // Dungeon Portal
    if(extrasOn&&this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<90){
      this.tweens.add({targets:this.portalSprite,scale:{from:1.6,to:1.9},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('dungeon');
      if(!chk.unlocked){ showHardLockToast('dungeon'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('DungeonScene');
      });
      return;
    }
    // Fishing Dock
    if(extrasOn&&this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      this.tweens.add({targets:this.dockSprite,scale:{from:1.6,to:1.8},duration:120,yoyo:true,ease:'Back.Out(2)'});
      const chk = isZoneUnlocked('fishing');
      if(!chk.unlocked){ showHardLockToast('fishing'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('FishingScene');
      });
      return;
    }
    // Beehive NPC
    if(extrasOn&&this.beehiveX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.beehiveX,this.beehiveY)<85){
      this.tweens.add({targets:this.beehiveSprite,scale:{from:1.6,to:1.85},duration:120,yoyo:true,ease:'Back.Out(2)'});
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('BeeScene');
      });
      return;
    }
    // Arcade
    if(extrasOn&&this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      this.tweens.add({targets:this.arcadeSprite,scale:{from:1.5,to:1.6},duration:100,yoyo:true});
      const chk = isZoneUnlocked('arcade');
      if(!chk.unlocked){ showHardLockToast('arcade'); return; }
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.pause();
        this.scene.launch('ArcadeScene');
      });
      return;
    }

    // Board
    if(extrasOn&&this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<80){
      this.tweens.add({targets:this.boardSprite,angle:5,duration:100,yoyo:true,repeat:1});
      openMemoryGame(); return;
    }
    // Shop
    if(extrasOn&&this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<90){openShop();return;}
    // P3: empty plots (Phase 1 plant, full hints)
    for(const p of this.plots){
      if(!skipStation(p)&&p.sState===''&&p.active&&near(p)){
        this.tweens.add({targets:p.tile,scaleX:0.85,scaleY:0.85,duration:90,yoyo:true});
        openQuiz(this._pickWord(),p,1); return;
      }
    }
    // P4: locked plots (unlock interaction flow)
    for(const p of this.plots){
      if(!skipStation(p)&&!p.active&&near(p)){
        const cost = PLOT_UNLOCK_COSTS[p.index - 9] || 1000;
        if(gold >= cost){
          spendCoins(cost);
          this.unlockPlot(p);
        } else {
          if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
          showToast(`Need ${cost} Gold 🪙 to unlock Farm Plot #${p.index + 1}!`);
        }
        return;
      }
    }
  }

  // ── SRS ADVANCE PLOT (called after correct quiz answer) ─────────────────────
  // `grade` is the SM-2 grade already applied by submitAnswer; the scheduler owns all
  // timing now, so this method only drives visuals and rewards.
  advancePlot(plot, word, phase, grade = GRADE.GOOD){
    const ko=word.ko, now=Date.now(), t=plot.index%5;
    if(phase===1){
      // P1 correct: plant seedling. The next-step timer already lives in srsData.due.
      plot.word=word; plot.ko=ko; plot.plantedAt=now;
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      const crop=this.add.image(plot.x,plot.y-4,cropTex(this,t,1)).setOrigin(0.5,0.85).setScale(0).setDepth(plot.y+5);
      plot.plant=crop;
      this.tweens.add({targets:crop,scale:1,duration:300,ease:'Back.Out(3)'});
      this._sparkle(plot.x,plot.y); this._label(plot.x,plot.y,'Planted!');
      this._setState(plot,'1',ko);
    } else if(phase===2){
      // P2 correct: grow to sprout, set P3 timer, play watering animation
      this.playPlayerAction('water', plot.x, plot.y, () => {
        if(plot.plant) plot.plant.setTexture(cropTex(this,t,2)).clearTint();
        this.tweens.add({targets:plot.plant,scale:{from:0.7,to:1.1},duration:320,ease:'Back.Out(2)',
          onComplete:()=>this.tweens.add({targets:plot.plant,scale:1,duration:150})});
        if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
        if(plot.glow){plot.glow.destroy();plot.glow=null;}
        this._leaves(plot.x,plot.y-8); this._label(plot.x,plot.y,'Watered!');
        this._setState(plot,'3',ko);
        savePlotsFn();
      });
    } else {
      // P3 correct: HARVEST! Coins, Gems, Honor! Play harvesting animation
      this.playPlayerAction('harvest', plot.x, plot.y, () => {
        playChiptuneSFX('harvest');
        const prev=harvestCounts.get(ko)||0;
        const newHarvests = prev + 1;
        harvestCounts.set(ko, newHarvests);

        // Anti-farm diminishing returns formula:
        // Decays smoothly down to 1 coin if harvested >= 15 times
        const reward = Math.max(1, Math.floor(10 * Math.pow(0.85, prev)));
        plantedWords.delete(ko);
        this._sparkle(plot.x,plot.y);
        this._label(plot.x,plot.y,prev===0?`+${reward} COINS! NEW!`:`+${reward} COINS!`);

        // Legendary tier mastery check (>= 10 harvests) -> +10 Honor
        if (newHarvests === 10) {
          addHonor(10);
          showToast(`👑 Word "${ko}" reached Legendary Tier! +10 Honor!`, 4500);
        }

        // Quiz streak tracking: +3 Gems every 10 consecutive correct answers
        quizStreak++;
        if (quizStreak % 10 === 0) {
          addGems(3);
          showToast(`🔥 10-Quiz Perfect Streak! +3 Gems!`, 4000);
        }

        this.time.delayedCall(350,()=>{
          addCoins(reward);
          updateVocabBook();
          checkQuestProgress('harvest', { count: 1 });
          checkQuestProgress('quiz');

          const cropIngredients = ['배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근'];
          let ingName;
          if (typeof isUnit10World === 'function' && isUnit10World() && typeof UNIT10_INGREDIENTS !== 'undefined') {
            if (UNIT10_INGREDIENTS.indexOf(ko) >= 0) ingName = ko;
            else if (UNIT10_WORD_DROP && UNIT10_WORD_DROP[ko]) ingName = UNIT10_WORD_DROP[ko];
            else ingName = UNIT10_INGREDIENTS[plot.index % UNIT10_INGREDIENTS.length];
          } else {
            ingName = (ko && typeof KOREAN_INGREDIENTS !== 'undefined' && KOREAN_INGREDIENTS.includes(ko)) ? ko : cropIngredients[plot.index % cropIngredients.length];
          }

          this.spawnDroppedItem(ingName, plot.x, plot.y);
        });
        this._clearPlot(plot);
        savePlotsFn();
      });
    }
    savePlotsFn();
  }

  // Wrong answer at P3 -> regression back to P2 wilting
  regressionPlot(plot,word){
    quizStreak = 0;
    const ko=word.ko, t=plot.index%5;

    // Scheduling was already applied by submitAnswer's AGAIN grade; this only regresses
    // the plot visuals back to "needs watering".
    if(plot.glow){plot.glow.destroy();plot.glow=null;}
    if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    if(plot.plant) plot.plant.setTexture(cropTex(this,t,1));
    this.tweens.add({targets:plot.plant,scale:0.5,duration:200,ease:'Power2.In',
      onComplete:()=>{
        if(plot.plant) plot.plant.setTint(0xFFCC44);
        this.tweens.add({targets:plot.plant,scale:1,duration:300,ease:'Back.Out(2)'});
      }});
    this._setState(plot,'2',ko);
    showToast('Plant regressed! Water it again.');
    savePlotsFn();
  }

  // Apply visual state to a plot
  _setState(plot, s, ko){
    plot.sState=s;
    const t=plot.index%5;
    if (plot.cropShadow) {
      if (this.shadows && this.shadows.removeShadow) this.shadows.removeShadow(plot.cropShadow);
      else if (plot.cropShadow.destroy) plot.cropShadow.destroy();
      plot.cropShadow = null;
    }
    if(s===''){  // empty
      plot.tile.setTexture('drt_dry').setAlpha(plot.active?1:0.25).clearTint();
      plot.shad.setAlpha(plot.active?0.3:0.1);
    } else if(s==='1'){  // seedling (healthy)
      plot.tile.setTexture('drt_wet').clearTint();
      if(plot.plant) plot.plant.clearTint();
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 16, 6, 0);
      }
    } else if(s==='2'){  // wilting - P2 review needed
      if(plot.plant) plot.plant.setTexture(cropTex(this,t,1)).setTint(0xFFCC44);
      this._addLabel(plot,'💧','#FFD700');
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 16, 6, 0);
      }
    } else if(s==='3'){  // sprout healthy
      if(plot.plant) plot.plant.clearTint();
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 20, 7, 0);
      }
    } else if(s==='4'){  // ripe - harvest!
      if(plot.plant) plot.plant.setTexture(cropTex(this,t,3)).clearTint();
      this._addGlow(plot,0xFFD700);
      this._addLabel(plot,'SPACE','#FFD700');
      if (plot.plant && this.shadows) {
        plot.cropShadow = this.shadows.createShadow(plot.plant, 22, 7, 0);
      }
    }
  }

  _addGlow(plot,col){
    if(plot.glow) plot.glow.destroy();
    const g=this.add.graphics().setDepth(plot.y+4);
    g.lineStyle(4,col,1); g.strokeRect(plot.x-PLOT_SIZE/2,plot.y-PLOT_SIZE/2,PLOT_SIZE,PLOT_SIZE);
    plot.glow=g; this.tweens.add({targets:g,alpha:{from:1,to:0.15},duration:700,yoyo:true,repeat:-1});
  }
  _addLabel(plot,txt,color){
    if(plot.hintLabel) plot.hintLabel.destroy();
    const l=this.add.text(plot.x,plot.y-PLOT_SIZE/2-6,txt,{
      fontFamily:'"Press Start 2P",monospace',fontSize:'12px',color,stroke:'#000',strokeThickness:3
    }).setOrigin(0.5,1).setDepth(plot.y+6);
    plot.hintLabel=l;
    this.tweens.add({targets:l,y:l.y-3,duration:550,yoyo:true,repeat:-1});
  }
  _clearPlot(plot){
    if(plot.glow){plot.glow.destroy();plot.glow=null;}
    if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    if(plot.cropShadow){if(plot.cropShadow.destroy) plot.cropShadow.destroy(); plot.cropShadow=null;}
    if(plot.plant){plot.plant.destroy();plot.plant=null;}
    plot.sState=''; plot.ko=null; plot.word=null; plot.reviewModality=null;
    plot.tile.setTexture('drt_dry').setAlpha(1).setDisplaySize(PLOT_SIZE,PLOT_SIZE).clearTint();
    plot.shad.setAlpha(0.3);
  }

  // Restore saved plots on startup
  _restorePlots(){
    if(!plotSave.length) return;
    const now=Date.now();
    plotSave.forEach(pd=>{
      const plot=this.plots[pd.i]; if(!plot) return;
      const word=this._findWord(pd.ko); if(!word) return;
      plot.word=word; plot.ko=pd.ko; plot.plantedAt=pd.plantedAt||0;
      const srs=getSrs(pd.ko);
      // Advance state if timers expired while offline
      let st=pd.sState||pd.state||'1';
      if(st==='1'&&srsIsDue(srs,now)) st='2';
      if(st==='3'&&srsIsDue(srs,now)) st='4';
      const t=plot.index%5;
      const tex={1:cropTex(this,t,1),2:cropTex(this,t,1),3:cropTex(this,t,2),4:cropTex(this,t,3)}[st]||cropTex(this,t,1);
      plot.plant=this.add.image(plot.x,plot.y-4,tex).setOrigin(0.5,0.85).setDepth(plot.y+5);
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      this._setState(plot,st,pd.ko);
      plantedWords.add(pd.ko);
    });
  }

  // ── DAILY REVIEW LOOP ──────────────────────────────────────────────────────
  // Words whose review date has passed appear as already-ripe crops on free plots, so
  // opening the farm answers "what do I owe today?" the way Stardew answers it: you walk
  // in and see what needs harvesting. Reviews are a single recall — the three-touch
  // plant/water/harvest cycle is for learning a word the first time, and repeating it for
  // a word you already know would be busywork.
  //
  // Some plots are always left free, otherwise a large review backlog would lock the
  // player out of learning anything new.
  _plantDueReviews(){
    if(!this.plots) return 0;
    const now = Date.now();
    const due = srsDueWords(now).filter(d => d.entry.st === 'review' && !plantedWords.has(d.word.ko));
    if(!due.length) return 0;

    const freePlots = this.plots.filter(p => p.active && !p.ko);
    const RESERVED_FOR_NEW = 2;
    const capacity = Math.max(0, freePlots.length - RESERVED_FOR_NEW);
    const planting = due.slice(0, capacity);

    planting.forEach((d, i) => {
      const plot = freePlots[i];
      const t = plot.index % 5;
      plot.word = d.word; plot.ko = d.word.ko; plot.plantedAt = now;
      plot.plant = this.add.image(plot.x, plot.y-4, cropTex(this, t, 3))
        .setOrigin(0.5,0.85).setDepth(plot.y+5).setScale(0);
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      this.tweens.add({ targets: plot.plant, scale: 1, duration: 260, delay: i*70, ease:'Back.Out(2)' });
      this._setState(plot, '4', d.word.ko);   // ripe: next interact opens the recall quiz
      // Remember which skill fell due, so the review tests that one rather than defaulting to
      // typing when it was recognition or listening that went stale.
      plot.reviewModality = d.modality;
      plantedWords.add(d.word.ko);
    });

    if(planting.length) savePlotsFn();
    return { planted: planting.length, remaining: due.length - planting.length };
  }

  // Called on farm entry and again when the player returns from a minigame, since reviews
  // can come due while they are away.
  _refreshDueReviews(announce = true){
    const res = this._plantDueReviews();
    if(!res || !res.planted) return;
    const msg = res.remaining > 0
      ? `⏰ ${res.planted} word${res.planted===1?'':'s'} due for review — ${res.remaining} more waiting for free plots`
      : `⏰ ${res.planted} word${res.planted===1?'':'s'} due for review!`;
    if(announce) showToast(msg, 4200);
    updateHUD();
  }

  _findWord(ko){
    for(const lvl of levelsData){ const w=lvl.words.find(w=>w.ko===ko); if(w) return w; }
    return null;
  }

  _sparkle(x,y){
    if (this.cropSparkleEmitter) {
      try { this.cropSparkleEmitter.explode(10, x, y); } catch(e) {}
    }
    const c=[0xFFDD44,0xFFFFFF,0x88FF88,0xFF88CC];
    const spKey = (this.textures && this.textures.exists('p_sparkle')) ? 'p_sparkle' : 'sparkle';
    for(let i=0;i<8;i++){
      const sp=this.add.image(x,y,spKey).setScale(0.4+Math.random()*0.5).setTint(c[i%4]).setDepth(y+30);
      const ang=(i/8)*Math.PI*2,dist=28+Math.random()*16;
      this.tweens.add({targets:sp,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist-8,
        scale:0,alpha:0,duration:450+Math.random()*200,ease:'Power2.Out',onComplete:()=>sp.destroy()});
    }
  }
  _flyCoins(fx,fy,cnt){
    for(let i=0;i<Math.min(cnt,6);i++){
      this.time.delayedCall(i*60,()=>{
        const c=this.add.image(fx,fy,'coin').setScale(0.8).setDepth(fy+40);
        this.tweens.add({targets:c,x:fx+(Math.random()-.5)*40,y:fy-50-Math.random()*30,
          scale:1.4,duration:250,ease:'Back.Out(2)',
          onComplete:()=>this.tweens.add({targets:c,y:-20,alpha:0,scale:.3,duration:300,ease:'Power2.In',onComplete:()=>c.destroy()})});
      });
    }
  }
  _pickWord(){
    const all=getUnlockedWords();
    let pool=all.filter(w=>!plantedWords.has(w.ko));
    // Manual planting is for learning new material; anything already in the review queue
    // resurfaces on its own schedule via _plantDueReviews, so it is excluded here rather
    // than letting the player grind a known word ahead of its due date.
    const unlearned=pool.filter(w=>!srsIsGraduated(peekSrs(w.ko)));
    if(unlearned.length) pool=unlearned;
    const arr=pool.length?pool:all;
    // Weighted random: untouched ×5, mid-learning ×3, everything else ×1
    const weighted=arr.map(w=>{
      const e=peekSrs(w.ko);
      return {word:w, weight: !e||e.st==='new' ? 5 : srsIsLearning(e) ? 3 : 1};
    });
    const total=weighted.reduce((s,w)=>s+w.weight,0);
    let r=Math.random()*total;
    for(const {word,weight} of weighted){
      r-=weight; if(r<=0) return word;
    }
    return arr[0];
  }
  _leaves(cx,cy){
    for(let i=0;i<6;i++){
      const ang=(i/6)*Math.PI*2, g=this.add.graphics().setDepth(cy+15);
      g.fillStyle(i%2?K.L:K.l,1); g.fillEllipse(0,0,8,4); g.setPosition(cx,cy);
      this.tweens.add({targets:g,x:cx+Math.cos(ang)*28,y:cy+Math.sin(ang)*18,
        angle:240*(i%2?1:-1),scale:0,alpha:0,duration:520,ease:'Power2.Out',onComplete:()=>g.destroy()});
    }
  }
  _label(x,y,msg){
    const txt=this.add.text(x,y,msg,{fontFamily:'"Press Start 2P",monospace',fontSize:'14px',
      color:'#FFD700',stroke:'#000',strokeThickness:4}).setOrigin(0.5,1).setDepth(y+40);
    this.tweens.add({targets:txt,y:y-65,alpha:0,scale:1.4,duration:1100,ease:'Power2.Out',onComplete:()=>txt.destroy()});
  }
  resetPlots(){
    if (!this.plots) return;
    this.plots.forEach(p=>{
      if(p.glow){p.glow.destroy();p.glow=null;}
      if(p.hintLabel){p.hintLabel.destroy();p.hintLabel=null;}
      if(p.plant){p.plant.destroy();p.plant=null;}
      if(p.ko) plantedWords.delete(p.ko);
      p.sState=''; p.ko=null; p.word=null;
      p.tile.setTexture('drt_dry').setAlpha(p.active?1:0.25).setDisplaySize(PLOT_SIZE,PLOT_SIZE).clearTint();
      p.shad.setAlpha(p.active?0.3:0.1);
    });
    localStorage.removeItem('hv_plots');
  }

  shutdown() {
    this.events.off('resume');
    // Flush before sceneRef is dropped: collectSave() reads plots and ground drops off
    // the live scene, so a debounced write firing after this would lose them.
    if (typeof flushSave === 'function') flushSave();
    if (this.cropSparkleEmitter) {
      try { this.cropSparkleEmitter.destroy(); } catch(e){}
    }
    if (sceneRef === this) sceneRef = null;
  }
}

