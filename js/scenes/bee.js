// ═══════════════ BEE SHOOTING MINIGAME SCENE ═════════════════════════════════
class BeeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BeeScene' });
  }

  preload() {
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    if (typeof playSceneAudio === 'function') {
      playSceneAudio('bee');
      // Launched over FarmScene rather than replacing it, so nothing else
      // restores the farm's track when this one closes.
      this.events.once('shutdown', () => playSceneAudio('farm'));
    }
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    const grassKeys = ['tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover'];
    for (let x = 0; x < this.W + 48; x += 48) {
      for (let y = 0; y < this.H + 48; y += 48) {
        const c = Math.floor(x / 48), r = Math.floor(y / 48);
        const v = ((c * 73856093) ^ (r * 19349663)) >>> 0;
        const key = grassKeys[v % 5 === 0 ? 1 : (v % 7 === 0 ? 2 : 0)];
        this.add.image(x + 24, y + 24, key).setDisplaySize(48, 48).setDepth(0);
      }
    }

    if (this.textures.exists('p_pollen') && typeof this.add.particles === 'function') {
      try {
        this.pollenEmitter = this.add.particles(0, 0, 'p_pollen', {
          speed: { min: 40, max: 140 },
          scale: { start: 1.2, end: 0.2 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          emitting: false
        }).setDepth(50);
      } catch (e) {}
    }

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctHits = 0;
    this.totalClicks = 0;
    this.currentWordIndex = 0;
    this.activeBees = [];
    this.isRoundOver = false;

    this.wordList = getUnlockedWords();
    if (!this.wordList || this.wordList.length === 0) {
      this.wordList = (typeof levelsData !== 'undefined' && levelsData[0]?.words)
        ? levelsData[0].words
        : [{ ko: '벌', en: 'bee', hint: '🐝' }];
    }

    let shuffled = Phaser.Utils.Array.Shuffle([...this.wordList]);
    while (shuffled.length < 10) {
      shuffled = shuffled.concat(Phaser.Utils.Array.Shuffle([...this.wordList]));
    }
    this.roundWords = shuffled.slice(0, 10);

    this.bannerBg = this.add.rectangle(this.W / 2, 45, 520, 56, 0x0F172A, 0.85)
      .setStrokeStyle(3, 0xF59E0B).setDepth(100);

    this.targetText = this.add.text(this.W / 2, 45, '', {
      fontFamily: hvPixelFont() + ',"Galmuri11"',
      fontSize: hvPixelSize(18),
      color: '#FDE047',
      stroke: '#0F172A',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setDepth(101);

    this.hudText = this.add.text(20, 20, '', {
      fontFamily: hvPixelFont(),
      fontSize: hvPixelSize(13),
      color: '#FFFFFF',
      stroke: '#0F172A',
      strokeThickness: 4,
      lineSpacing: 6
    }).setDepth(100);

    const exitBtn = this.add.text(this.W - 20, 20, hvT('ui.game.exit'), {
      fontFamily: hvPixelFont(),
      fontSize: hvPixelSize(13),
      color: '#FF66B2',
      stroke: '#0F172A',
      strokeThickness: 4,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(100);

    exitBtn.on('pointerdown', () => this.exitMinigame());
    this.input.keyboard.on('keydown-ESC', () => this.exitMinigame());

    this.startWordWave();
  }

  startWordWave() {
    if (this.isRoundOver) return;

    this.activeBees.forEach(b => b.container.destroy());
    this.activeBees = [];

    if (this.currentWordIndex >= 10) {
      this.showResultsSummary();
      return;
    }

    const currentTarget = this.roundWords[this.currentWordIndex];
    const hintEmoji = currentTarget.hint ? ` ${currentTarget.hint}` : '';
    this.targetText.setText(`${hvT('ui.bee.target')}: "${String(tr(currentTarget, 'en')).toUpperCase()}"${hintEmoji}`);
    this.updateHUD();

    // The target is announced in English and the bees carry Korean, so a decoy sharing the
    // target's gloss would be an equally correct answer that scores as a miss. Deduping on
    // `en` keeps every wrong bee genuinely wrong.
    const waveWords = buildOptionSet(currentTarget, this.wordList, 4, labelEn);

    const trajectories = ['linear', 'sine', 'zigzag'];
    const numBees = waveWords.length;
    const verticalSpacing = Math.floor((this.H - 240) / Math.max(1, numBees));

    waveWords.forEach((wordObj, i) => {
      const isRightToLeft = (i % 2 === 1);
      const startX = isRightToLeft ? (this.W + 80 + i * 40) : (-80 - i * 40);
      const baseY = 140 + i * verticalSpacing + Math.floor(Math.random() * 20);
      const trajectoryType = trajectories[i % trajectories.length];

      const container = this.add.container(startX, baseY).setDepth(10);
      const sprite = this.add.sprite(0, 0, 'bee_fly_0').setDisplaySize(48, 48);
      if (isRightToLeft) sprite.setFlipX(true);

      const text = this.add.text(0, 28, wordObj.ko, {
        fontFamily: hvPixelFont() + ',"Galmuri11",sans-serif',
        fontSize: hvPixelSize(15),
        color: '#FFFFFF',
        stroke: '#0F172A',
        strokeThickness: 5,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5, 0);

      container.add([sprite, text]);
      container.setSize(60, 60);
      container.setInteractive({ useHandCursor: true });

      const speed = 100 + Math.random() * 40;
      const beeData = {
        container,
        sprite,
        wordObj,
        isCorrect: (wordObj.ko === currentTarget.ko),
        trajectory: trajectoryType,
        startX,
        baseY,
        dir: isRightToLeft ? -1 : 1,
        speed,
        amp: 35 + Math.random() * 25,
        freq: 2.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        zigzagTimer: 0,
        zigzagVy: 70
      };

      container.on('pointerdown', () => this.onBeeClicked(beeData));
      this.activeBees.push(beeData);
    });
  }

  onBeeClicked(bee) {
    if (this.isRoundOver) return;
    this.totalClicks++;

    if (bee.isCorrect) {
      this.correctHits++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const comboBonus = (this.combo - 1) * 20;
      const pts = 100 + comboBonus;
      this.score += pts;

      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');

      if (this.pollenEmitter) {
        this.pollenEmitter.emitParticleAt(bee.container.x, bee.container.y, 20);
      }

      const comboLabel = this.combo > 1 ? ` +${pts} (${this.combo}x Combo!)` : ` +${pts}`;
      const floatTxt = this.add.text(bee.container.x, bee.container.y - 20, comboLabel, {
        fontFamily: hvPixelFont(),
        fontSize: hvPixelSize(16),
        color: '#FDE047',
        stroke: '#000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(30);

      this.tweens.add({
        targets: floatTxt,
        y: bee.container.y - 65,
        alpha: 0,
        duration: 950,
        ease: 'Power1',
        onComplete: () => floatTxt.destroy()
      });

      this.currentWordIndex++;
      this.startWordWave();
    } else {
      this.combo = 0;
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');

      this.cameras.main.shake(150, 0.012);

      bee.sprite.setTint(0xFF4444);
      this.time.delayedCall(300, () => {
        if (bee.sprite && bee.sprite.active) bee.sprite.clearTint();
      });

      this.tweens.add({
        targets: bee.container,
        x: bee.container.x + (bee.dir * -12),
        duration: 60,
        yoyo: true,
        repeat: 3
      });

      this.updateHUD();
    }
  }

  updateHUD() {
    const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;
    this.hudText.setText(`WORD: ${Math.min(10, this.currentWordIndex + 1)}/10\nSCORE: ${this.score}\nACCURACY: ${accuracy}%\nCOMBO: ${this.combo}x`);
  }

  update(time, delta) {
    if (this.isRoundOver) return;
    const dt = delta / 1000;

    this.activeBees.forEach(b => {
      if (!b.container || !b.container.active) return;

      const frameIdx = Math.floor(time / 130) % 2;
      b.sprite.setTexture(frameIdx === 0 ? 'bee_fly_0' : 'bee_fly_1');

      b.container.x += b.dir * b.speed * dt;

      if (b.trajectory === 'sine') {
        b.container.y = b.baseY + Math.sin((time / 1000) * b.freq + b.phase) * b.amp;
      } else if (b.trajectory === 'zigzag') {
        b.container.y += b.zigzagVy * dt;
        if (b.container.y > b.baseY + 45) b.zigzagVy = -Math.abs(b.zigzagVy);
        if (b.container.y < b.baseY - 45) b.zigzagVy = Math.abs(b.zigzagVy);
      }

      if (b.dir === 1 && b.container.x > this.W + 90) b.container.x = -80;
      if (b.dir === -1 && b.container.x < -90) b.container.x = this.W + 80;
    });
  }

  showResultsSummary() {
    this.isRoundOver = true;
    this.activeBees.forEach(b => b.container.destroy());
    this.activeBees = [];

    const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;

    const baseHoney = Math.max(1, Math.floor(this.score / 300));
    const bonusHoney = accuracy >= 90 ? 1 : 0;
    const totalHoney = baseHoney + bonusHoney;

    if (typeof addItemToInventory === 'function') {
      addItemToInventory('honey', totalHoney);
    }
    if (typeof checkQuestProgress === 'function') checkQuestProgress('bee', { count: 1 });
    if (typeof showToast === 'function') {
      showToast('🍯 + ' + totalHoney + ' Honey added to inventory!');
    }

    this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0.6).setDepth(200);

    const modalWidth = Math.min(480, this.W - 40);
    const modalHeight = 320;
    this.add.rectangle(this.W / 2, this.H / 2, modalWidth, modalHeight, 0x0F172A, 0.94)
      .setStrokeStyle(4, 0xF59E0B).setDepth(201);

    this.add.text(this.W / 2, this.H / 2 - 110, '🐝 ' + hvT('ui.bee.complete'), {
      fontFamily: hvPixelFont(),
      fontSize: hvPixelSize(16),
      color: '#FDE047',
      align: 'center'
    }).setOrigin(0.5).setDepth(202);

    const summaryText = 
      `SCORE: ${this.score}\n\n` +
      `ACCURACY: ${accuracy}%\n\n` +
      `MAX COMBO: ${this.maxCombo}x\n\n` +
      `HONEY REWARD: +${totalHoney} 🍯`;

    this.add.text(this.W / 2, this.H / 2 - 20, summaryText, {
      fontFamily: hvPixelFont(),
      fontSize: hvPixelSize(13),
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5).setDepth(202);

    const closeBtn = this.add.text(this.W / 2, this.H / 2 + 105, hvT('ui.bee.return'), {
      fontFamily: hvPixelFont(),
      fontSize: hvPixelSize(14),
      color: '#4ADE80',
      stroke: '#0F172A',
      strokeThickness: 3,
      backgroundColor: '#1E293B',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(202);

    closeBtn.on('pointerdown', () => this.exitMinigame());
  }

  exitMinigame() {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }
}


