// ═══════════════ DUNGEON CRAWLER ARPG SCENE ════════════════════════════════════
class DungeonScene extends Phaser.Scene {
  constructor(){ super({key:'DungeonScene'}); }
  
  preload(){
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
    if (!this.textures.exists('valley_dungeon_portal_hd')) {
      this.load.image('valley_dungeon_portal_hd', artUrl('decorations/valley_dungeon_portal.png'));
    }
  }

  create(){
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    if (typeof playSceneAudio === 'function') {
      playSceneAudio('dungeon');
      // Launched over FarmScene rather than replacing it, so nothing else
      // restores the farm's track when this one closes.
      this.events.once('shutdown', () => playSceneAudio('farm'));
    }
    this.W = this.scale.width;

    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);
    
    // Dark Stone Floor Grid, Mossy Perimeter Walls & Glowing Runes using Tilemaps
    for(let x = 0; x < this.W + TILE; x += TILE){
      for(let y = 0; y < this.H + TILE; y += TILE){
        const isBorder = (x < TILE || x >= this.W - TILE || y < TILE || y >= this.H - TILE);
        if (isBorder) {
          this.add.image(x + TILE/2, y + TILE/2, 'tile_dungeon_wall_moss').setDisplaySize(TILE, TILE).setDepth(1);
        } else {
          const rndVal = (Math.sin(x * 12.3 + y * 45.6) * 10000) % 1;
          const absRnd = Math.abs(rndVal);
          let floorKey = 'tile_dungeon_floor';
          if (absRnd < 0.15) floorKey = 'tile_dungeon_cracked';
          else if (absRnd > 0.90) floorKey = 'tile_dungeon_rune';
          this.add.image(x + TILE/2, y + TILE/2, floorKey).setDisplaySize(TILE, TILE).setDepth(0);
        }
      }
    }
    
    this.ambientOverlay = this.add.rectangle(this.W/2, this.H/2, this.W*2, this.H*2, 0x090D16, 0.70)
      .setDepth(9990).setScrollFactor(0);
    this.lighting = new AmbientLightingSystem(this);
    this.shadows = new DynamicShadowSystem(this);

    // Ambient Torch Lights at corners/walls
    this.torchLights = [ 
      {x: TILE * 1.5, y: TILE * 1.5}, 
      {x: this.W - TILE * 1.5, y: TILE * 1.5}, 
      {x: TILE * 1.5, y: this.H - TILE * 1.5}, 
      {x: this.W - TILE * 1.5, y: this.H - TILE * 1.5},
      {x: this.W / 2, y: TILE * 1.5}
    ];
    this.torchLights.forEach(t => {
      this.add.circle(t.x, t.y, 44, 0xF59E0B, 0.20).setDepth(2);
      this.lighting.addLight(t.x, t.y, 'light_glow_torch', 1.2, 0.7);
      const torch = this.add.image(t.x, t.y, 'dungeon_torch').setDisplaySize(36, 48).setDepth(3);
      this.tweens.add({ targets: torch, scaleY: { from: 0.95, to: 1.08 }, duration: 350 + Math.random()*200, yoyo: true, repeat: -1 });

      if (this.textures && this.textures.exists('p_spark') && typeof this.add.particles === 'function') {
        try {
          this.add.particles(t.x, t.y - 12, 'p_spark', {
            speedY: { min: -30, max: -70 },
            speedX: { min: -10, max: 10 },
            lifespan: 700,
            quantity: 1,
            frequency: 250,
            scale: { start: 1, end: 0.2 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD'
          }).setDepth(4);
        } catch (e) {}
      }
    });

    // Player Hero
    this.playerHP = 100;
    this.maxPlayerHP = 100;
    this.lootedGold = 0;
    this.lootedScrolls = 0;
    this.monstersKilled = 0;

    this.playerFacing = 'down';
    this.player = this.add.sprite(this.W/2, this.H/2, minigamePlayerTextureKey('down', 0)).setOrigin(0.5);
    applySkinToSprite(this, this.player, { sceneFit: 'minigame' });
    this.pShadow = this.shadows.createShadow(this.player, 30, 10, 1);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(30, 30);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.monsters = this.physics.add.group();
    this.lootGroup = this.physics.add.group();

    // Physics overlaps
    this.physics.add.overlap(this.player, this.lootGroup, this.collectLoot, null, this);
    this.physics.add.overlap(this.player, this.monsters, this.hitPlayer, null, this);

    // Spawn timer for monsters
    this.lastMonsterSpawn = 0;
    this.invulnerableTime = 0;

    // Vocab pool
    const all = getUnlockedWords();
    this.wordPool = all.length > 0 ? all : [{ko:'한글', en:'Hangeul', hint:'📝'}];

    // HUD Header
    this.hpText = this.add.text(20, 20, '❤️ HP: 100/100', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#EF4444'}).setDepth(100);
    this.goldText = this.add.text(20, 50, '💰 GOLD: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#F59E0B'}).setDepth(100);
    this.scrollText = this.add.text(20, 80, '📜 SCROLLS: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#A855F7'}).setDepth(100);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] LEAVE DUNGEON', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#EC4899'})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitBtn.on('pointerdown', () => this.exitDungeon());
    this.input.keyboard.on('keydown-ESC', () => this.exitDungeon());

    // Title Toast
    const title = this.add.text(this.W/2, this.H/2 - 60, '⚔️ ANCIENT DUNGEON\nWASD to Move | Click to Slash!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'18px', color:'#EC4899', align:'center', lineHeight:1.5, stroke:'#000', strokeThickness:4
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets:title, alpha:0, delay:2500, duration:1000, onComplete:()=>title.destroy() });

    // Click to Slash
    this.input.on('pointerdown', () => this.playerSlash());

    // ── RESIZE HANDLER ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setBounds(0, 0, Math.max(gameSize.width, this.W), Math.max(gameSize.height, this.H));
    });
  }

  update(t, dt){
    if(this.playerHP <= 0) return;

    // Dynamic Y-sort for player and shadow
    const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
    this.player.setDepth(playerBaseY);
    if (this.shadows) this.shadows.updateAllShadows();

    // Movement
    let vx = 0, vy = 0;
    const speed = 280;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.player.body.setVelocity(vx, vy);

    if(vx !== 0 || vy !== 0){
      const facing = Math.abs(vx) >= Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      this.playerFacing = facing;
      this.player.setFlipX(false);
      this.player.anims.play(skinAnimKey(this, 'walk', facing, 'minigame'), true);
    } else {
      this.player.anims.stop();
      this.player.setTexture(skinTextureKey(this, 'walk', this.playerFacing || 'down', 0, 'minigame'));
    }

    // Slash input
    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)){
      this.playerSlash();
    }

    // Spawn Monster loop
    if(t > this.lastMonsterSpawn){
      this.spawnMonster();
      this.lastMonsterSpawn = t + Phaser.Math.Between(1200, 2200);
    }

    // Monster AI & dynamic Y-sort
    this.monsters.children.entries.forEach(m => {
      if(m && m.active){
        this.physics.moveToObject(m, this.player, m.moveSpeed || 100);
        const mBaseY = m.y + (m.displayHeight * (1 - m.originY));
        m.setDepth(mBaseY);
      }
    });

    // Loot floating animation & dynamic Y-sort
    this.lootGroup.children.entries.forEach(l => {
      if(l && l.active){
        l.setDepth(l.y + 8);
        if(l.sparkle){
          l.sparkle.x = l.x; l.sparkle.y = l.y - 12;
          l.sparkle.setDepth(l.y + 9);
        }
      }
    });
  }


  playerSlash(){
    if(!this.player || !this.player.active) return;
    playChiptuneSFX('sword_swing');

    // Sword slash arc visual
    const slash = this.add.sprite(this.player.x, this.player.y - 10, 'laser_player').setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: slash,
      scale: { from: 0.8, to: 1.6 },
      alpha: { from: 1, to: 0 },
      angle: { from: -45, to: 45 },
      duration: 220,
      ease: 'Power1',
      onComplete: () => slash.destroy()
    });

    // Check hit monsters in range (90px)
    const deadMonsters = [];
    this.monsters.children.entries.forEach(m => {
      if(m && m.active){
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
        if(dist < 95){
          m.hp -= 35;
          m.setTint(0xFF0000);
          this.time.delayedCall(120, () => { if(m.active) m.clearTint(); });
          
          // Floating damage text
          const dmg = this.add.text(m.x, m.y - 20, '-35', {
            fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#22C55E', stroke:'#000', strokeThickness:3
          }).setOrigin(0.5).setDepth(60);
          this.tweens.add({ targets:dmg, y:m.y-50, alpha:0, duration:600, onComplete:()=>dmg.destroy() });

          if(m.hp <= 0) deadMonsters.push(m);
        }
      }
    });

    deadMonsters.forEach(m => this.killMonster(m));
  }

  spawnMonster(){
    const types = [
      { key: 'dungeon_green_slime', name: 'Slime', hp: 30, speed: 90 },
      { key: 'dungeon_goblin_warrior', name: 'Goblin Warrior', hp: 50, speed: 120 },
      { key: 'dungeon_skeleton_archer', name: 'Skeleton Archer', hp: 40, speed: 110 },
      { key: 'dungeon_boss', name: 'Mini Boss', hp: 80, speed: 70 }
    ];
    const type = Phaser.Utils.Array.GetRandom(types);
    const word = Phaser.Utils.Array.GetRandom(this.wordPool) || {ko:'한글', en:'Hangeul'};

    let x, y;
    if(Math.random() < 0.5){
      x = Math.random() < 0.5 ? 20 : this.W - 20;
      y = Phaser.Math.Between(40, this.H - 40);
    } else {
      x = Phaser.Math.Between(40, this.W - 40);
      y = Math.random() < 0.5 ? 20 : this.H - 20;
    }

    const monster = this.add.sprite(x, y, type.key).setOrigin(0.5).setDepth(10);
    this.physics.add.existing(monster);
    monster.body.setSize(36, 36);
    monster.hp = type.hp;
    monster.moveSpeed = type.speed;
    monster.word = word;

    this.monsters.add(monster);
  }

  killMonster(m){
    const mx = m.x, my = m.y;
    const word = m.word;
    const isBoss = m.isBoss;
    m.destroy();

    this.monstersKilled++;
    checkQuestProgress('kill', { count: 1 });

    if (isBoss) {
      addCoins(200);
      addGems(10);
      addHonor(50);
      if (this.playerHP >= 100) {
        addGems(15);
        showToast('🛡️ ZERO-DAMAGE DUNGEON BOSS KILL! +15 Bonus Gems!', 4500);
      }
      showToast('🎉 DUNGEON BOSS DEFEATED! +200 Coins, +10 Gems, +50 Honor!', 5000);
    }

    if (this.monstersKilled >= 5 && !this.bossPortal) {
      this.spawnBossPortal();
    }

    for(let i=0; i<8; i++){
      const p = this.add.rectangle(mx, my, 5, 5, 0xA855F7).setDepth(20);
      this.tweens.add({
        targets: p,
        x: mx + Phaser.Math.Between(-50, 50),
        y: my + Phaser.Math.Between(-50, 50),
        scale: 0,
        duration: 500,
        onComplete: () => p.destroy()
      });
    }

    // Drop Vocab Scroll 📜
    const lootKeys = ['loot_scroll', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_chest'];
    const lKey = Phaser.Utils.Array.GetRandom(lootKeys);
    const loot = this.add.sprite(mx, my, lKey).setOrigin(0.5).setDepth(15);
    this.physics.add.existing(loot);
    loot.body.setSize(30, 30);
    loot.word = word;

    loot.sparkle = this.add.sprite(mx, my - 12, 'sparkle').setOrigin(0.5).setDepth(16);
    this.tweens.add({ targets: loot.sparkle, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });
    this.tweens.add({ targets: loot, y: my - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.lootGroup.add(loot);
  }

  spawnBossPortal(){
    if(this.bossPortal) return;
    if (!this.textures.exists('valley_dungeon_portal_hd')) return;
    const portal = this.add.image(this.W/2, 100, 'valley_dungeon_portal_hd')
      .setOrigin(0.5).setScale(0.52).setDepth(20);
    if (portal.texture) portal.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.physics.add.existing(portal);
    portal.body.setSize(48, 48);
    this.bossPortal = portal;

    this.add.text(this.W/2, 140, 'BOSS CHAMBER PORTAL', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px', color:'#EC4899', stroke:'#000', strokeThickness:3
    }).setOrigin(0.5).setDepth(21);

    this.physics.add.overlap(this.player, portal, () => {
      if(this.bossTriggered) return;
      this.bossTriggered = true;
      startBossGateChallenge('dungeon', 3, (passed) => {
        if(passed){
          this.spawnDungeonBoss();
        } else {
          this.bossTriggered = false;
          this.spawnMonster();
          this.spawnMonster();
        }
      });
    }, null, this);
  }

  spawnDungeonBoss(){
    if(this.bossPortal) this.bossPortal.destroy();
    const bossList = [
      { key: 'boss_fire_golem', name: '🔥 MOLTEN FIRE GOLEM' },
      { key: 'boss_shadow_dragon', name: '🐉 VOID SHADOW DRAGON' },
      { key: 'boss_ice_lich', name: '❄️ FROZEN ICE LICH' },
      { key: 'boss_cyber_kraken', name: '🐙 CYBER KRAKEN' },
      { key: 'dungeon_boss', name: '👹 KING SEJONG\'S CORRUPTED SENTINEL' }
    ];
    const chosen = Phaser.Utils.Array.GetRandom(bossList);
    showToast(`👹 ${chosen.name} SPAWNED!`, 4000);
    const boss = this.add.sprite(this.W/2, 120, chosen.key).setOrigin(0.5).setDepth(30);
    this.physics.add.existing(boss);
    boss.setDisplaySize(64, 64);
    boss.body.setSize(60, 60);
    boss.hp = 350;
    boss.moveSpeed = 85;
    boss.isBoss = true;
    boss.word = { ko: '왕', en: 'King' };
    this.monsters.add(boss);
  }

  collectLoot(player, loot){
    const word = loot.word;
    if(loot.sparkle) loot.sparkle.destroy();
    loot.destroy();

    this.lootedScrolls++;
    this.lootedGold += 25;

    this.goldText.setText(`💰 COINS: ${this.lootedGold}`);
    this.scrollText.setText(`📜 SCROLLS: ${this.lootedScrolls}`);

    this.showLootFlashcard(word);
  }

  showLootFlashcard(w){
    if(this.currentCard) this.currentCard.destroy();

    const card = this.add.container(this.W/2, 70).setDepth(200);
    const bg = this.add.rectangle(0, 0, 280, 70, 0x1E1B4B, 0.95).setStrokeStyle(3, 0xA855F7).setOrigin(0.5);
    const tk = this.add.text(0, -12, w.ko, {fontFamily:'"Noto Sans KR", sans-serif', fontSize:'28px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
    const te = this.add.text(0, 16, tr(w, 'en'), {fontFamily:'"Be Vietnam Pro", sans-serif', fontSize:'15px', color:'#C084FC', fontWeight:'bold'}).setOrigin(0.5);
    card.add([bg, tk, te]);

    this.currentCard = card;

    this.tweens.add({
      targets: card,
      scale: { from: 0.8, to: 1 },
      duration: 200,
      ease: 'Back.Out'
    });

    this.time.delayedCall(2200, () => {
      if(this.currentCard === card){
        this.tweens.add({
          targets: card,
          alpha: 0,
          y: 40,
          duration: 400,
          onComplete: () => card.destroy()
        });
      }
    });
  }

  hitPlayer(player, monster){
    if(this.time.now < this.invulnerableTime) return;
    this.invulnerableTime = this.time.now + 800;

    this.playerHP = Math.max(0, this.playerHP - 15);
    this.hpText.setText(`❤️ HP: ${this.playerHP}/100`);

    this.cameras.main.shake(200, 0.02);
    this.player.setTint(0xFF0000);
    this.time.delayedCall(200, () => { if(this.player.active) this.player.clearTint(); });

    if(this.playerHP <= 0){
      this.exitDungeon(true);
    }
  }

  exitDungeon(failed = false){
    const floorReached = Math.floor((this.monstersKilled || 0) / 5) + 1;
    if (typeof leaderboardState !== 'undefined' && leaderboardState.personalBests) {
      if (floorReached > (leaderboardState.personalBests.dungeonMaxFloor || 0)) {
        leaderboardState.personalBests.dungeonMaxFloor = floorReached;
        if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
      }
    }

    if(this.lootedGold > 0){
      addCoins(this.lootedGold);
    }

    if(failed){
      showToast(`💀 Defeated in Dungeon! Earned +${this.lootedGold} Coins & ${this.lootedScrolls} Vocab Scrolls!`, 4000);
    } else {
      showToast(`⚔️ Dungeon Cleared! Defeated ${this.monstersKilled} Monsters & Looted +${this.lootedGold} Coins!`, 4000);
    }

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }

  shutdown() {
    // Clear dungeon scene references and lighting overlays
  }
}


