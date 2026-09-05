class ArcadeScene extends Phaser.Scene {
  constructor(){ super({key:'ArcadeScene'}); }

  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create(){
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    if (typeof playSceneAudio === 'function') {
      playSceneAudio('arcade');
      // Launched over FarmScene rather than replacing it, so nothing else
      // restores the farm's track when this one closes.
      this.events.once('shutdown', () => playSceneAudio('farm'));
    }
    this.W = this.scale.width;

    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    // Multi-layer Parallax Space Background
    // Layer 1: Dark Space Base Tile Grid
    for(let x = 0; x < this.W + TILE; x += TILE){
      for(let y = 0; y < this.H + TILE; y += TILE){
        this.add.image(x + TILE/2, y + TILE/2, 'tile_space_dark').setDisplaySize(TILE, TILE).setDepth(0);
      }
    }
    // Layer 2: Floating Nebulae
    const n1 = this.add.image(this.W * 0.25, this.H * 0.3, 'nebula_purple').setScale(3.5).setAlpha(0.35).setDepth(1);
    const n2 = this.add.image(this.W * 0.75, this.H * 0.6, 'nebula_cyan').setScale(4.0).setAlpha(0.35).setDepth(1);
    this.tweens.add({ targets: [n1, n2], alpha: { from: 0.25, to: 0.5 }, scale: { from: 3, to: 4.2 }, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Layer 3: Planet Silhouettes
    this.add.image(90, 90, 'planet_ringed').setDisplaySize(64, 64).setDepth(2).setAlpha(0.8);
    this.add.image(this.W - 100, 110, 'planet_gas_giant').setDisplaySize(72, 72).setDepth(2).setAlpha(0.8);

    // Layer 4: Distant Stars & Parallax Near Stars Layer using TileSprites
    if (this.textures && this.textures.exists('tile_stars_far')) {
      this.bgFarStars = this.add.tileSprite(this.W/2, this.H/2, this.W, this.H, 'tile_stars_far').setDepth(3).setScrollFactor(0);
    }
    if (this.textures && this.textures.exists('tile_stars_near')) {
      this.bgNearStars = this.add.tileSprite(this.W/2, this.H/2, this.W, this.H, 'tile_stars_near').setDepth(4).setScrollFactor(0);
    }

    this.nearStarsGroup = this.add.group();
    for(let i = 0; i < 8; i++){
      const sx = Phaser.Math.Between(40, this.W - 40);
      const sy = Phaser.Math.Between(40, this.H - 40);
      const st = this.add.image(sx, sy, 'tile_stars_near').setDisplaySize(36, 36).setDepth(4);
      this.nearStarsGroup.add(st);
      this.tweens.add({ targets: st, alpha: { from: 0.4, to: 1.0 }, duration: 1200 + Math.random()*800, yoyo: true, repeat: -1 });
    }

    this.score = 0;
    this.playerHP = 100;
    this.hasTripleShot = false;
    this.hasShield = false;
    this.nukeCount = 1;

    // UI Header
    this.scoreText = this.add.text(20, 20, hvT('ui.arcade.score', { n: 0 }), {fontFamily: hvPixelFont(), fontSize: hvPixelSize(16), color:'#00FFFF'}).setDepth(10);
    this.hpText = this.add.text(20, 48, '❤️ ' + hvT('ui.arcade.hp', { hp: 100, max: 100 }), {fontFamily: hvPixelFont(), fontSize: hvPixelSize(14), color:'#EF4444'}).setDepth(10);
    this.powerText = this.add.text(20, 72, '💣 ' + hvT('ui.arcade.nukes', { n: 1 }), {fontFamily: hvPixelFont(), fontSize: hvPixelSize(12), color:'#FDE047'}).setDepth(10);

    const exitTxt = this.add.text(this.W - 20, 20, hvT('ui.game.exit'), {fontFamily: hvPixelFont(), fontSize: hvPixelSize(14), color:'#FF00FF', backgroundColor:'rgba(15,23,42,0.8)', padding:{x:8,y:4}})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitTxt.on('pointerdown', ()=>this.exitGame());
    this.input.keyboard.on('keydown-ESC', ()=>this.exitGame());

    // Nuke key [B]
    this.nukeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    // Player Hero Ship
    this.ship = this.add.sprite(this.W/2, this.H - 80, 'arcade_player_ship').setOrigin(0.5).setDepth(20);
    this.physics.add.existing(this.ship);
    this.ship.body.setCollideWorldBounds(true);
    this.ship.body.setSize(40, 40);

    // Shield aura graphic
    this.shieldAura = this.add.circle(this.ship.x, this.ship.y, 32, 0x38BDF8, 0.35).setStrokeStyle(3, 0x38BDF8).setVisible(false).setDepth(19);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    // Groups
    this.lasers = this.physics.add.group();
    this.bossBullets = this.physics.add.group();
    this.minions = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.wordOrbs = this.physics.add.group();

    this.physics.add.overlap(this.lasers, this.minions, this.hitMinion, null, this);
    this.physics.add.overlap(this.lasers, this.wordOrbs, this.hitWordOrb, null, this);
    this.physics.add.overlap(this.ship, this.bossBullets, this.hitPlayerWithBullet, null, this);
    this.physics.add.overlap(this.ship, this.powerups, this.collectPowerup, null, this);

    this.lastFired = 0;
    this.lastMinionSpawn = 0;
    this.lastBossBullet = 0;

    const all = getUnlockedWords();
    this.wordPool = all.length > 0 ? all : [{ko:'사과', en:'Apple'}, {ko:'우유', en:'Milk'}, {ko:'빵', en:'Bread'}];

    // Spawn BOSS
    this.spawnBoss();
  }

  spawnBoss(){
    this.bossHP = 600;
    this.maxBossHP = 600;
    this.bossPhase = 1; // 1: Bullet Hell, 2: Shield Spell Lock
    this.bossShielded = false;

    this.bossContainer = this.add.container(this.W/2, 120).setDepth(15);
    this.bossSprite = this.add.sprite(0, 0, 'alien_boss').setOrigin(0.5);
    this.bossName = this.add.text(0, -55, '🌌 ' + hvT('ui.arcade.boss'), {fontFamily: hvPixelFont(), fontSize: hvPixelSize(14), color:'#EC4899', stroke:'#000', strokeThickness:4}).setOrigin(0.5);

    // Boss Shield Visual Barrier
    this.bossBarrier = this.add.circle(0, 0, 75, 0x38BDF8, 0.4).setStrokeStyle(4, 0x38BDF8).setVisible(false);

    this.bossContainer.add([this.bossSprite, this.bossName, this.bossBarrier]);
    this.physics.add.existing(this.bossContainer);
    this.bossContainer.body.setSize(120, 100);

    // Boss Health Bar Top HUD
    this.bossBarBg = this.add.rectangle(this.W/2, 35, 400, 16, 0x1E293B).setStrokeStyle(2, 0xEC4899).setDepth(50);
    this.bossBarFill = this.add.rectangle(this.W/2 - 200, 35, 400, 14, 0xEC4899).setOrigin(0, 0.5).setDepth(51);

    // Move Boss Left & Right
    this.tweens.add({ targets: this.bossContainer, x: {from: 140, to: this.W - 140}, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Enable overlap between Lasers and Boss
    this.physics.add.overlap(this.lasers, this.bossContainer, this.hitBoss, null, this);

    // ── RESIZE HANDLER ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setBounds(0, 0, Math.max(gameSize.width, this.W), Math.max(gameSize.height, this.H));
    });
  }

  update(t, dt){
    // Player Movement
    let vx = 0, vy = 0;
    const speed = 420;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.ship.body.setVelocity(vx, vy);
    if(this.shieldAura.visible){
      this.shieldAura.setPosition(this.ship.x, this.ship.y);
    }

    // Parallax Starfield scrolling
    if (this.bgFarStars) this.bgFarStars.tilePositionY -= 0.3 * ((dt || 16) / 16.6);
    if (this.bgNearStars) this.bgNearStars.tilePositionY -= 1.0 * ((dt || 16) / 16.6);
    if (this.nearStarsGroup) {
      this.nearStarsGroup.getChildren().forEach(st => {
        st.y += 0.5;
        if (st.y > this.H + 20) st.y = -20;
      });
    }

    // Nuke detonation [B]
    if(Phaser.Input.Keyboard.JustDown(this.nukeKey) && this.nukeCount > 0){
      this.detonateNuke();
    }

    // Firing Lasers
    if(t > this.lastFired) {
      this.fireLaser();
      this.lastFired = t + (this.hasTripleShot ? 180 : 240);
    }

    // Boss Bullet Spawns (Phase 1 Bullet Hell)
    if(this.bossHP > 0 && !this.bossShielded && t > this.lastBossBullet){
      this.fireBossBulletPattern(t);
      this.lastBossBullet = t + 700;
    }

    // Spawn Minion invaders
    if(t > this.lastMinionSpawn){
      this.spawnMinion();
      this.lastMinionSpawn = t + Phaser.Math.Between(2500, 4500);
    }

    // Trigger Phase 2 Shield Spell Lock periodically
    if(!this.bossShielded && this.bossHP > 0 && Math.random() < 0.003){
      this.triggerShieldSpellLock();
    }

    // Clean up offscreen bullets
    this.lasers.children.entries.forEach(l => { if(l && l.y < -50) l.destroy(); });
    this.bossBullets.children.entries.forEach(b => { if(b && b.y > this.H + 50) b.destroy(); });
  }

  fireLaser(){
    const createL = (x, vy, vx = 0) => {
      const laser = this.add.sprite(x, this.ship.y - 25, 'laser_player').setOrigin(0.5);
      this.physics.add.existing(laser);
      this.lasers.add(laser);
      laser.body.setVelocity(vx, vy);
    };

    if(this.hasTripleShot){
      createL(this.ship.x - 15, -600, -100);
      createL(this.ship.x, -650, 0);
      createL(this.ship.x + 15, -600, 100);
    } else {
      createL(this.ship.x, -650, 0);
    }
  }

  fireBossBulletPattern(t){
    // Spiral & Radial Bullet Spreads
    const count = 7;
    for(let i=0; i<count; i++){
      const angle = (i / count) * Math.PI + Math.sin(t/300) * 0.5;
      const bullet = this.add.circle(this.bossContainer.x, this.bossContainer.y + 40, 8, 0xEC4899);
      this.physics.add.existing(bullet);
      this.bossBullets.add(bullet);
      const speed = 220;
      bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  spawnMinion(){
    const x = Phaser.Math.Between(60, this.W - 60);
    const alienKeys = ['alien_scout', 'alien_shooter', 'alien_elite'];
    const minion = this.add.sprite(x, -40, Phaser.Utils.Array.GetRandom(alienKeys)).setOrigin(0.5);
    this.physics.add.existing(minion);
    this.minions.add(minion);
    minion.body.setVelocityY(Phaser.Math.Between(120, 200));
  }

  hitMinion(laser, minion){
    laser.destroy();
    const mx = minion.x, my = minion.y;
    minion.destroy();
    this.score += 15;
    this.scoreText.setText(hvT('ui.arcade.score', { n: this.score }));

    // Drop Power-up chance (40%)
    if(Math.random() < 0.4){
      const pTypes = ['🔫', '🛡️', '💣'];
      const pType = Phaser.Utils.Array.GetRandom(pTypes);
      const pMap = { '🔫': 'powerup_weapon', '🛡️': 'powerup_shield', '💣': 'powerup_nuke' };
      const pItem = this.add.sprite(mx, my, pMap[pType] || 'powerup_weapon').setOrigin(0.5);
      pItem.pType = pType;
      this.physics.add.existing(pItem);
      this.powerups.add(pItem);
      pItem.body.setVelocityY(100);
    }
  }

  collectPowerup(ship, powerup){
    const type = powerup.pType;
    powerup.destroy();

    if(type === '🔫'){
      this.hasTripleShot = true;
      showToast('🔫 TRIPLE SHOT POWER-UP!', 2000);
      this.time.delayedCall(8000, () => this.hasTripleShot = false);
    } else if(type === '🛡️'){
      this.hasShield = true;
      this.shieldAura.setVisible(true);
      showToast('🛡️ ENERGY SHIELD ACTIVATED!', 2000);
    } else if(type === '💣'){
      this.nukeCount++;
      this.powerText.setText('💣 ' + hvT('ui.arcade.nukes', { n: this.nukeCount }));
      showToast('💣 ATOMIC BOMB ACQUIRED!', 2000);
    }
  }

  detonateNuke(){
    this.nukeCount--;
    this.powerText.setText('💣 ' + hvT('ui.arcade.nukes', { n: this.nukeCount }));
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(300, 0.03);

    // Clear all boss bullets & minions
    this.bossBullets.clear(true, true);
    this.minions.clear(true, true);
    showToast('💣 BOOM! SCREEN CLEARED!', 2500);
  }

  triggerShieldSpellLock(){
    this.bossShielded = true;
    this.bossBarrier.setVisible(true);

    const targetWord = Phaser.Utils.Array.GetRandom(this.wordPool);
    // The banner names the target in English and the orbs carry Korean, so two words sharing
    // a gloss would put two correct answers on the field. Deduping on `en` prevents it.
    //
    // This replaces a `wrongs[0]||{ko:'우유'}` padding chain that guaranteed four orbs: the
    // pool is a whole unlocked level, never fewer than four words, so the padding only ever
    // stood to put a word that is not in the pool on screen.
    const options = buildOptionSet(targetWord, this.wordPool, 4, labelEn);

    // Show Spell Prompt Banner
    this.spellBanner = this.add.container(this.W/2, 170).setDepth(40);
    const sBg = this.add.rectangle(0, 0, 480, 45, 0x0F172A, 0.95).setStrokeStyle(3, 0x38BDF8);
    const sTxt = this.add.text(0, 0, `🎯 ${hvT('ui.arcade.shootTarget')} "${tr(targetWord, 'en')}"`, {
      fontFamily: hvPixelFont(), fontSize: hvPixelSize(11), color:'#FDE047'
    }).setOrigin(0.5);
    this.spellBanner.add([sBg, sTxt]);

    // Spawn 4 Word Orbs orbiting around Boss
    options.forEach((opt, idx) => {
      const angle = (idx / 4) * Math.PI * 2;
      const ox = this.bossContainer.x + Math.cos(angle) * 160;
      const oy = this.bossContainer.y + Math.sin(angle) * 160;

      const orbBg = this.add.rectangle(ox, oy, 110, 36, 0x1E293B, 0.9).setStrokeStyle(2, 0x38BDF8);
      const orbTxt = this.add.text(ox, oy, opt.ko, {
        fontFamily:'"Noto Sans KR",sans-serif', fontSize:'18px', color:'#FFFFFF', fontWeight:'bold'
      }).setOrigin(0.5);

      const container = this.add.container(0,0, [orbBg, orbTxt]).setDepth(35);
      container.word = opt;
      container.isCorrect = (opt.ko === targetWord.ko);
      this.physics.add.existing(container);
      container.body.setSize(110, 36);
      this.wordOrbs.add(container);

      // Orbit animation
      this.tweens.add({
        targets: container,
        x: { from: ox, to: ox + 40 },
        y: { from: oy, to: oy + 20 },
        duration: 2000 + idx*300,
        yoyo: true, repeat: -1, ease: 'Sine.InOut'
      });
    });
  }

  hitWordOrb(laser, orb){
    laser.destroy();
    const isCorrect = orb.isCorrect;
    const w = orb.word;

    this.wordOrbs.clear(true, true);
    if(this.spellBanner) this.spellBanner.destroy();

    if(isCorrect){
      playChiptuneSFX('quiz_correct');
      // Shield Shatter & Boss Stun!
      this.bossShielded = false;
      this.bossBarrier.setVisible(false);
      this.bossHP = Math.max(0, this.bossHP - 120);
      this.updateBossHPBar();

      showToast(`🎯 CRITICAL HIT! "${w.ko}" (${tr(w, 'en')}) SHATTERED SHIELD! +120 DMG!`, 3500);
      this.cameras.main.flash(200, 56, 189, 248);
    } else {
      playChiptuneSFX('quiz_wrong');
      showToast(`❌ WRONG WORD! Shield Reflected Damage!`, 2000);
      this.bossShielded = false;
      this.bossBarrier.setVisible(false);
    }
  }

  hitBoss(laser, boss){
    laser.destroy();
    if(this.bossShielded){
      showToast('🛡️ BOSS IS SHIELDED! SHOOT THE CORRECT WORD ORB!');
      return;
    }

    this.bossHP = Math.max(0, this.bossHP - 15);
    this.score += 10;
    this.scoreText.setText(hvT('ui.arcade.score', { n: this.score }));
    this.updateBossHPBar();

    this.bossSprite.setTint(0xFF0000);
    this.time.delayedCall(100, () => this.bossSprite.clearTint());

    if(this.bossHP <= 0){
      this.bossDefeated();
    }
  }

  updateBossHPBar(){
    const pct = Math.max(0, this.bossHP / this.maxBossHP);
    this.bossBarFill.setSize(400 * pct, 14);
  }

  bossDefeated(){
    this.bossContainer.destroy();
    this.bossBarBg.destroy();
    this.bossBarFill.destroy();

    this.cameras.main.flash(500, 253, 224, 71);
    this.cameras.main.shake(400, 0.03);

    addGold(150);
    showToast('🎉 BOSS DEFEATED! VICTORY! +150 GOLD REWARD!', 5000);

    this.time.delayedCall(3000, () => this.exitGame());
  }

  hitPlayerWithBullet(ship, bullet){
    bullet.destroy();
    if(this.hasShield){
      this.hasShield = false;
      this.shieldAura.setVisible(false);
      showToast('🛡️ SHIELD ABSORBED HIT!');
      return;
    }

    this.playerHP = Math.max(0, this.playerHP - 20);
    this.hpText.setText('❤️ ' + hvT('ui.arcade.hp', { hp: this.playerHP, max: 100 }));
    this.cameras.main.shake(150, 0.02);

    this.ship.setTint(0xFF0000);
    this.time.delayedCall(150, () => this.ship.clearTint());

    if(this.playerHP <= 0){
      showToast('💀 SHIP DESTROYED IN SPACE!');
      this.exitGame();
    }
  }

  exitGame(){
    if (typeof checkQuestProgress === 'function') checkQuestProgress('arcade', { score: this.score });
    if (typeof leaderboardState !== 'undefined' && leaderboardState.personalBests) {
      if (this.score > (leaderboardState.personalBests.arcadeHighScore || 0)) {
        leaderboardState.personalBests.arcadeHighScore = this.score;
        if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
      }
    }
    const earned = Math.floor(this.score / 15);
    if(earned > 0){
      addGold(earned);
      showToast(`🕹️ Arcade Cleared: +${earned} Gold!`);
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }

  shutdown() {
    if (this.nearStarsGroup) this.nearStarsGroup.clear(true, true);
  }
}


