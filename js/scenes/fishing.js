// ═══════════════ STARDEW-STYLE FISHING MINIGAME SCENE ════════════════════════
class FishingScene extends Phaser.Scene {
  constructor(){ super({key:'FishingScene'}); }

  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create(){
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    if (typeof playSceneAudio === 'function') {
      playSceneAudio('fishing');
      // Launched over FarmScene rather than replacing it, so nothing else
      // restores the farm's track when this one closes.
      this.events.once('shutdown', () => playSceneAudio('farm'));
    }
    this.W = this.scale.width;

    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    // Ocean Coastline & Beach Terrain using Tilemaps
    // 1. Deep Ocean Water grid & Foam Border using animated TileSprites
    const oceanKey = (this.textures && this.textures.exists('tile_ocean_deep_0')) ? 'tile_ocean_deep_0' : 'tile_ocean_deep';
    this.oceanTileSprite = this.add.tileSprite(this.W/2, (this.H - 144)/2, this.W, this.H - 144, oceanKey).setDepth(0);
    const foamKey = (this.textures && this.textures.exists('tile_water_foam_0')) ? 'tile_water_foam_0' : 'tile_water_foam_border';
    this.foamTileSprite = this.add.tileSprite(this.W/2, this.H - 144 + TILE/2, this.W, TILE, foamKey).setDepth(1);
    this.waterFrame = 0;
    this.waterTimer = 0;

    if (this.textures && this.textures.exists('p_splash') && typeof this.add.particles === 'function') {
      try {
        this.splashEmitter = this.add.particles(0, 0, 'p_splash', {
          speed: { min: 30, max: 100 },
          angle: { min: 220, max: 320 },
          scale: { start: 1.2, end: 0.2 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 500,
          emitting: false
        }).setDepth(10);
      } catch (e) {}
    }
    // 3. Sandy Beach grid in lower shoreline area (y: H - 96 .. H)
    for(let x = 0; x < this.W + TILE; x += TILE){
      for(let y = this.H - 96; y < this.H + TILE; y += TILE){
        const sandKey = (Math.floor(x / TILE) + Math.floor(y / TILE)) % 3 === 0 ? 'tile_sand_wet' : 'tile_sand';
        this.add.image(x + TILE/2, y + TILE/2, sandKey).setDisplaySize(TILE, TILE).setDepth(0);
      }
    }

    // 4. Rocky Shore & Beach details scattered along shoreline
    this.add.image(60, this.H - 120, 'tile_rock_shore').setDisplaySize(TILE, TILE).setDepth(1);
    this.add.image(this.W - 60, this.H - 120, 'tile_rock_shore').setDisplaySize(TILE, TILE).setDepth(1);
    this.add.image(140, this.H - 60, 'tile_seashell').setDisplaySize(32, 32).setDepth(1);
    this.add.image(this.W - 150, this.H - 50, 'tile_starfish').setDisplaySize(32, 32).setDepth(1);
    this.add.image(220, this.H - 45, 'tile_driftwood').setDisplaySize(40, 24).setDepth(1);
    this.add.image(this.W - 240, this.H - 55, 'tile_seashell').setDisplaySize(28, 28).setDepth(1);

    // Sunlight Caustics Light Rays
    for(let i=0; i<6; i++){
      const ray = this.add.polygon(i * (this.W/5), 0, [0,0, 80,0, 140,this.H, 0,this.H], 0x38BDF8, 0.08).setOrigin(0).setDepth(1);
      this.tweens.add({ targets:ray, alpha:0.18, duration:3000+i*500, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    }

    // Floating Water Bubbles
    for(let i=0; i<20; i++){
      const bx = Math.random()*this.W, by = Math.random()*(this.H - 144);
      const bubble = this.add.circle(bx, by, Phaser.Math.Between(2, 5), 0x67E8F9, 0.4).setDepth(1);
      this.tweens.add({
        targets: bubble,
        y: by - 100,
        alpha: 0.1,
        duration: 3000 + Math.random()*2000,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    // 5. Wooden Pier Dock with Lanterns
    const pierY = this.H - 75;
    for(let px = TILE/2; px < this.W; px += TILE){
      this.add.image(px, pierY, 'tile_pier_plank').setDisplaySize(TILE, TILE).setDepth(2);
    }
    // Lanterns on Dock Posts
    [100, this.W - 100].forEach(lx => {
      this.add.image(lx, pierY - 15, 'tile_pier_lantern').setDisplaySize(36, 48).setDepth(3);
    });

    this.player = this.add.sprite(this.W/2, this.H - 110, minigamePlayerTextureKey('down', 0)).setOrigin(0.5).setDepth(10);
    applySkinToSprite(this, this.player, { sceneFit: 'minigame' });
    this.shadows = new DynamicShadowSystem(this);
    this.shadows.createShadow(this.player, 30, 10, 1);

    // State: 'CASTING', 'WAITING', 'REELING', 'CATCH_QUIZ'
    this.state = 'CASTING';
    this.catchProgress = 0;
    this.targetFish = null;

    // UI Header Frame
    const infoBg = this.add.rectangle(this.W/2, 60, 520, 50, 0x0F172A, 0.9)
      .setStrokeStyle(3, 0x38BDF8).setOrigin(0.5);
    this.infoTxt = this.add.text(this.W/2, 60, '🎣 CLICK TO CAST LINE!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'13px', color:'#FDE047', align:'center'
    }).setOrigin(0.5);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] LEAVE POND', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'13px', color:'#7DD3FC', backgroundColor:'rgba(15,23,42,0.8)', padding:{x:8,y:4}
    }).setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitBtn.on('pointerdown', () => this.exitFishing());
    this.input.keyboard.on('keydown-ESC', () => this.exitFishing());

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => this.handleAction());

    this.buildTensionBar();
  }

  buildTensionBar(){
    this.barX = this.W/2 + 200;
    this.barY = this.H/2;
    this.barHeight = 260;
    this.barWidth = 44;

    this.meterBg = this.add.rectangle(this.barX, this.barY, this.barWidth, this.barHeight, 0x0F172A, 0.9)
      .setStrokeStyle(3, 0x38BDF8).setVisible(false);

    // Green Catching Zone (WIDER 110px FOR EASY & SMOOTH GAMEPLAY)
    this.catchZoneHeight = 110;
    this.catchZoneY = this.barY + this.barHeight/2 - this.catchZoneHeight/2;
    this.catchZone = this.add.rectangle(this.barX, this.catchZoneY, this.barWidth - 4, this.catchZoneHeight, 0x22C55E, 0.75)
      .setStrokeStyle(2, 0x4ADE80).setOrigin(0.5, 0).setVisible(false);

    // Fish Icon inside bar
    this.fishIconY = this.barY;
    this.fishIcon = this.add.sprite(this.barX, this.fishIconY, 'fishing_salmon')
      .setOrigin(0.5).setVisible(false);

    // Progress Bar (Left of tension bar)
    this.pbBg = this.add.rectangle(this.barX - 35, this.barY, 16, this.barHeight, 0x1E293B)
      .setStrokeStyle(2, 0x38BDF8).setVisible(false);
    this.pbFill = this.add.rectangle(this.barX - 35, this.barY + this.barHeight/2, 14, 0, 0x38BDF8)
      .setOrigin(0.5, 1).setVisible(false);

    // Dynamic "HOLD SPACE" helper label next to tension bar
    this.holdTip = this.add.text(this.barX - 110, this.barY, 'HOLD CLICK\nTO REEL!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px', color:'#4ADE80', align:'center', stroke:'#000', strokeThickness:3
    }).setOrigin(0.5).setVisible(false);

    // ── RESIZE HANDLER ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setBounds(0, 0, Math.max(gameSize.width, this.W), Math.max(gameSize.height, this.H));
    });
  }

  handleAction(){
    if(this.state === 'CASTING'){
      this.castLine();
    }
  }

  castLine(){
    playChiptuneSFX('fishing_pull');
    this.state = 'WAITING';
    this.infoTxt.setText('⏳ Waiting for a bite...');

    // Floating bobber with water ripples
    this.bobber = this.add.sprite(this.W/2 + Phaser.Math.Between(-60, 60), this.H/2 + 20, 'fishing_bobber').setOrigin(0.5);
    this.tweens.add({ targets: this.bobber, y: this.H/2 + 28, duration: 600, yoyo: true, repeat: -1 });

    if (this.splashEmitter && this.bobber) {
      try { this.splashEmitter.explode(8, this.bobber.x, this.bobber.y); } catch(e) {}
    }

    const waitTime = Phaser.Math.Between(1500, 3000);
    this.time.delayedCall(waitTime, () => {
      if(this.state !== 'WAITING') return;
      this.triggerBite();
    });
  }

  triggerBite(){
    playChiptuneSFX('fishing_pull');
    this.state = 'REELING';
    this.infoTxt.setText('❗ BITE! Hold click to keep fish in Green Zone!');

    if (this.splashEmitter && this.bobber) {
      try { this.splashEmitter.explode(12, this.bobber.x, this.bobber.y); } catch(e) {}
    }

    const ex = this.add.text(this.bobber.x, this.bobber.y - 35, '💦 BITE!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'24px', color:'#EF4444', stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);
    this.tweens.add({ targets:ex, scale:1.4, alpha:0, duration:800, onComplete:()=>ex.destroy() });

    // Show Tension Bar & Helpers
    this.meterBg.setVisible(true);
    this.catchZone.setVisible(true);
    this.fishIcon.setVisible(true);
    this.pbBg.setVisible(true);
    this.pbFill.setVisible(true);
    this.holdTip.setVisible(true);

    this.catchProgress = 0.45; // Start 45% full
    this.targetFish = Phaser.Utils.Array.GetRandom(FISH_DB);
    const fishTexMap = {
      '연어': 'fishing_salmon',
      '고등어': 'fishing_mackerel',
      '오징어': 'fishing_squid',
      '잉어': 'fishing_carp',
      '새우': 'fishing_shrimp',
      '문어': 'fishing_octopus',
      '조개': 'fishing_clam',
      '황금물고기': 'fishing_golden_fish'
    };
    const texKey = fishTexMap[this.targetFish.ko] || 'fishing_salmon';
    this.fishIcon.setTexture(texKey);

    this.catchZoneVelocity = 0;
  }

  update(t, dt){
    if (this.shadows) this.shadows.updateAllShadows();
    this.waterTimer = (this.waterTimer || 0) + (dt || 16);
    if (this.waterTimer > 180) {
      this.waterTimer = 0;
      this.waterFrame = ((this.waterFrame || 0) + 1) % 4;
      if (this.textures && this.textures.exists(`tile_ocean_deep_${this.waterFrame}`)) {
        this.oceanTileSprite.setTexture(`tile_ocean_deep_${this.waterFrame}`);
      }
      if (this.textures && this.textures.exists(`tile_water_foam_${this.waterFrame}`)) {
        this.foamTileSprite.setTexture(`tile_water_foam_${this.waterFrame}`);
      }
    }
    if (this.oceanTileSprite) this.oceanTileSprite.tilePositionX += 0.4;
    if (this.foamTileSprite) this.foamTileSprite.tilePositionX -= 0.6;
    if(this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.state === 'CASTING'){
      this.castLine();
    }

    if(this.state !== 'REELING') return;

    // Smooth Tension Zone control with SPACE or Mouse Hold
    const isHolding = this.spaceKey.isDown || this.input.activePointer.isDown;
    if(isHolding){
      this.catchZoneVelocity -= 0.5;
    } else {
      this.catchZoneVelocity += 0.4;
    }
    this.catchZoneVelocity *= 0.90;
    this.catchZoneY = Phaser.Math.Clamp(this.catchZoneY + this.catchZoneVelocity, this.barY - this.barHeight/2, this.barY + this.barHeight/2 - this.catchZoneHeight);
    this.catchZone.setY(this.catchZoneY);

    // Smooth Sinewave Fish Movement (Smooth & Predictable!)
    const fishTargetY = this.barY + Math.sin(t / 600) * 75;
    this.fishIconY += (fishTargetY - this.fishIconY) * 0.08;
    this.fishIcon.setY(this.fishIconY);

    // Check if Fish is inside Catch Zone
    const fishTop = this.fishIconY - 10, fishBot = this.fishIconY + 10;
    const zoneTop = this.catchZoneY, zoneBot = this.catchZoneY + this.catchZoneHeight;
    const inside = fishTop >= zoneTop && fishBot <= zoneBot;

    if(inside){
      this.catchProgress = Math.min(1.0, this.catchProgress + 0.012); // Fills fast in ~2 seconds!
      this.catchZone.setFillStyle(0x22C55E, 0.85);
      this.holdTip.setText('🟢 REELING IN!').setColor('#4ADE80');
    } else {
      this.catchProgress = Math.max(0.0, this.catchProgress - 0.0015); // Very forgiving penalty!
      this.catchZone.setFillStyle(0xEF4444, 0.85);
      this.holdTip.setText('⚠️ HOLD CLICK!').setColor('#EF4444');
    }

    // Update Progress Bar
    const currentH = this.barHeight * this.catchProgress;
    this.pbFill.setSize(14, currentH);

    if(this.catchProgress >= 1.0){
      this.startVocabChallenge();
    } else if(this.catchProgress <= 0.0){
      this.loseFish();
    }
  }

  startVocabChallenge(){
    this.state = 'CATCH_QUIZ';
    this.hideTensionBar();

    const fish = this.targetFish;
    this.infoTxt.setText(`🐟 Reeled in ${fish.hint} ${fish.ko}! Answer to Catch!`);

    // Pick 3 random wrong fish choices
    const wrongs = FISH_DB.filter(f => f.ko !== fish.ko);
    Phaser.Utils.Array.Shuffle(wrongs);
    const choices = Phaser.Utils.Array.Shuffle([fish, wrongs[0], wrongs[1], wrongs[2]]);

    // Render Quiz Card Overlay
    const container = this.add.container(this.W/2, this.H/2).setDepth(200);
    const bg = this.add.rectangle(0, 0, 360, 240, 0x0F172A, 0.95).setStrokeStyle(3, 0x38BDF8).setOrigin(0.5);
    const title = this.add.text(0, -90, `What is the English for "${fish.ko}"?`, {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px', color:'#38BDF8', align:'center'
    }).setOrigin(0.5);

    container.add([bg, title]);

    choices.forEach((c, idx) => {
      const cx = (idx % 2 === 0 ? -85 : 85);
      const cy = (idx < 2 ? -30 : 30);
      const btnBg = this.add.rectangle(cx, cy, 150, 44, 0x1E293B).setStrokeStyle(2, 0x0284C7).setInteractive({useHandCursor:true});
      const txt = this.add.text(cx, cy, c.en, {fontFamily:'"Be Vietnam Pro",sans-serif', fontSize:'15px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
      
      btnBg.on('pointerdown', () => {
        if(c.ko === fish.ko){
          playChiptuneSFX('quiz_correct');
          btnBg.setFillStyle(0x15803D);
          this.time.delayedCall(400, () => {
            container.destroy();
            this.catchSuccess(fish);
          });
        } else {
          playChiptuneSFX('quiz_wrong');
          btnBg.setFillStyle(0xB91C1C);
          this.cameras.main.shake(150, 0.01);
        }
      });

      container.add([btnBg, txt]);
    });
  }

  catchSuccess(fish){
    playChiptuneSFX('quiz_correct');
    playChiptuneSFX('harvest');
    fishAlbumSave[fish.ko] = (fishAlbumSave[fish.ko] || 0) + 1;
    addCoins(35);

    if (typeof addIngredient === 'function') addIngredient(fish.ko, 1);

    if (fish.rarity === 'Legendary' || fish.ko === '황금물고기') {
      addGems(5);
      showToast(`🌟 LEGENDARY CATCH! ${fish.hint} ${fish.ko} (${fish.en})! +35 Coins & +5 Gems!`, 4500);
    } else {
      showToast(`🎉 Caught ${fish.hint} ${fish.ko} (${fish.en})! +35 Coins!`, 4000);
    }

    checkQuestProgress('fish', { count: 1 });

    if(this.bobber) this.bobber.destroy();

    this.state = 'CASTING';
    this.infoTxt.setText('🎣 Caught! Click to Cast Again!');
  }


  loseFish(){
    this.state = 'CASTING';
    this.hideTensionBar();
    if(this.bobber) this.bobber.destroy();
    showToast('💨 The fish got away! Try again.');
    this.infoTxt.setText('🎣 Click to Cast Line Again!');
  }

  hideTensionBar(){
    this.meterBg.setVisible(false);
    this.catchZone.setVisible(false);
    this.fishIcon.setVisible(false);
    this.pbBg.setVisible(false);
    this.pbFill.setVisible(false);
    if(this.holdTip) this.holdTip.setVisible(false);
  }

  exitFishing(){
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }

  shutdown() {
    if (this.splashEmitter) {
      try { this.splashEmitter.destroy(); } catch(e){}
    }
  }
}


