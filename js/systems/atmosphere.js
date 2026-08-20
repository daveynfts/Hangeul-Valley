// ═══════════════ GRAPHICS & ATMOSPHERE SYSTEM CLASSES ═════════════════════════
class DayNightSystem {
  constructor(scene, cycleDurationSec = 240) {
    this.scene = scene;
    this.cycleDuration = cycleDurationSec * 1000;
    this.timeMs = 6 * 3600 * 1000; // Start at 06:00 AM (Dawn)

    this.ambientOverlay = scene.add.graphics()
      .setDepth(9990)
      .setScrollFactor(0);

    this.keyframes = [
      { hour: 0,  color: { r: 15, g: 23, b: 42 },   alpha: 0.65 }, // Night
      { hour: 4,  color: { r: 30, g: 27, b: 75 },   alpha: 0.50 }, // Late Night
      { hour: 6,  color: { r: 253, g: 186, b: 116 }, alpha: 0.20 }, // Dawn / Sunrise
      { hour: 8,  color: { r: 255, g: 255, b: 255 }, alpha: 0.00 }, // Day
      { hour: 17, color: { r: 249, g: 115, b: 22 },  alpha: 0.20 }, // Sunset
      { hour: 19, color: { r: 124, g: 58, b: 237 },  alpha: 0.40 }, // Dusk
      { hour: 21, color: { r: 15, g: 23, b: 42 },   alpha: 0.65 }, // Night
      { hour: 24, color: { r: 15, g: 23, b: 42 },   alpha: 0.65 }  // Cycle end
    ];

    if (scene.scale && scene.scale.on) {
      scene.scale.on('resize', (gameSize) => {
        this.width = gameSize.width;
        this.height = gameSize.height;
      });
    }
    this.width = scene.scale ? scene.scale.width : 1024;
    this.height = scene.scale ? scene.scale.height : 768;
  }

  update(dt = 16) {
    this.timeMs = (this.timeMs + dt) % (24 * 3600 * 1000);
    const hour = (this.timeMs / (3600 * 1000)) % 24;
    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;

    const state = this._interpolateLighting(hour);

    this.ambientOverlay.clear();
    if (state.alpha > 0.005) {
      const hexColor = (state.color.r << 16) | (state.color.g << 8) | state.color.b;
      const w = this.width || (this.scene.scale ? this.scene.scale.width : 1024);
      const h = this.height || (this.scene.scale ? this.scene.scale.height : 768);
      this.ambientOverlay.fillStyle(hexColor, state.alpha);
      this.ambientOverlay.fillRect(0, 0, w, h);
    }

    return { hour, sunAngle, state };
  }

  _interpolateLighting(hour) {
    let k1 = this.keyframes[0], k2 = this.keyframes[1];
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (hour >= this.keyframes[i].hour && hour <= this.keyframes[i+1].hour) {
        k1 = this.keyframes[i];
        k2 = this.keyframes[i+1];
        break;
      }
    }
    const span = k2.hour - k1.hour || 1;
    const t = (hour - k1.hour) / span;

    const r = Math.round(k1.color.r + (k2.color.r - k1.color.r) * t);
    const g = Math.round(k1.color.g + (k2.color.g - k1.color.g) * t);
    const b = Math.round(k1.color.b + (k2.color.b - k1.color.b) * t);
    const alpha = k1.alpha + (k2.alpha - k1.alpha) * t;

    return { color: { r, g, b }, alpha, hex: (r << 16) | (g << 8) | b };
  }
}

class AmbientLightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
  }

  addLight(x, y, textureKey = 'light_glow_soft', scale = 1, alpha = 0.6) {
    if (!this.scene.textures || !this.scene.textures.exists(textureKey)) return null;
    const blendMode = (typeof Phaser !== 'undefined' && Phaser.BlendModes) ? Phaser.BlendModes.ADD : 'ADD';
    const light = this.scene.add.image(x, y, textureKey)
      .setScale(scale)
      .setAlpha(alpha)
      .setBlendMode(blendMode)
      .setDepth(9985);
    this.lights.push(light);
    return light;
  }

  attachTo(target, textureKey = 'light_glow_lantern', scale = 0.8, alpha = 0.5) {
    const light = this.addLight(target.x, target.y, textureKey, scale, alpha);
    if (light) light._followTarget = target;
    return light;
  }

  update() {
    this.lights.forEach(l => {
      if (l && l._followTarget && l._followTarget.active) {
        const t = l._followTarget;
        const y = l._followChest ? t.y + lanternChestOffset(t) : t.y;
        l.setPosition(t.x, y);
      }
    });
  }
}

class DynamicShadowSystem {
  constructor(scene) {
    this.scene = scene;
    this.shadows = [];
  }

  createShadow(target, baseW = 30, baseH = 10, offsetY = 18, options = {}) {
    if (!target) return null;
    const shadowContainer = this.scene.add.container(target.x, target.y);

    // AO Core Layer (ground contact)
    const aoCore = this.scene.add.ellipse(0, offsetY, baseW * 0.7, baseH * 0.7, 0x000000, 0.22);
    // Dynamic Directional Penumbra Layer
    const penumbra = this.scene.add.ellipse(0, offsetY, baseW, baseH, 0x000000, 0.35);

    shadowContainer.add([aoCore, penumbra]);
    shadowContainer._target = target;
    shadowContainer._baseW = baseW;
    shadowContainer._baseH = baseH;
    shadowContainer._offsetY = offsetY;
    shadowContainer._aoCore = aoCore;
    shadowContainer._penumbra = penumbra;
    shadowContainer._type = options.type || 'directional';

    this.shadows.push(shadowContainer);
    return shadowContainer;
  }

  updateAllShadows(sunAngle, hour) {
    for (let i = this.shadows.length - 1; i >= 0; i--) {
      const s = this.shadows[i];
      if (!s || !s.active || !s._target || !s._target.active) {
        if (s && s.destroy) s.destroy();
        this.shadows.splice(i, 1);
        continue;
      }
      if (s._type === 'directional') {
        this.updateShadow(s, sunAngle, hour);
      }
    }
  }

  updateShadow(shadowSprite, sunAngle, hour = 12) {
    if (!shadowSprite || !shadowSprite._target || !shadowSprite._target.active) return;
    const target = shadowSprite._target;

    const sunSin = Math.sin(sunAngle);
    const sunCos = Math.cos(sunAngle);

    const isDay = hour >= 5.5 && hour <= 18.5;
    const sunAlt = Math.max(0, sunSin);
    const stretch = Math.max(0.35, Math.abs(sunCos) * 1.85 + (1 - sunAlt) * 0.65);

    const dx = -sunCos * (shadowSprite._baseW * 0.75) * stretch;
    const dy = shadowSprite._offsetY + sunSin * 3.5;

    const scaleX = 1 + Math.abs(dx) / (shadowSprite._baseW * 0.55);
    const scaleY = Math.max(0.4, 1 - Math.abs(sunCos) * 0.35);

    const alpha = isDay ? (0.22 + sunAlt * 0.26) : 0.12;

    const targetY = typeof target.y === 'number' ? target.y : 0;
    const groundDepth = Math.max(0, targetY - 1);

    shadowSprite.setPosition(target.x, target.y);
    shadowSprite.setDepth(groundDepth);

    if (shadowSprite._penumbra) {
      shadowSprite._penumbra.setPosition(dx, dy);
      shadowSprite._penumbra.setScale(scaleX, scaleY);
      shadowSprite._penumbra.setAlpha(alpha);
    } else {
      shadowSprite.setPosition(target.x + dx, target.y + dy);
      shadowSprite.setScale(scaleX, scaleY);
      shadowSprite.setAlpha(alpha);
    }
  }

  updatePointShadow(shadowSprite, lightX, lightY) {
    if (!shadowSprite || !shadowSprite._target || !shadowSprite._target.active) return;
    const target = shadowSprite._target;
    const dx = target.x - lightX;
    const dy = target.y - lightY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const shadowLength = Math.min(28, dist * 0.15);
    const offX = (dx / dist) * shadowLength;
    const offY = (dy / dist) * shadowLength + shadowSprite._offsetY;

    const targetY = typeof target.y === 'number' ? target.y : 0;
    const groundDepth = Math.max(0, targetY - 1);

    shadowSprite.setPosition(target.x, target.y);
    shadowSprite.setDepth(groundDepth);

    if (shadowSprite._penumbra) {
      shadowSprite._penumbra.setPosition(offX, offY);
      shadowSprite._penumbra.setAlpha(0.35);
    } else {
      shadowSprite.setPosition(target.x + offX, target.y + offY);
    }
  }
}

class WeatherEngine {
  constructor(scene) {
    this.scene = scene;
    this.currentWeather = 'clear';
    this.emitters = {};

    this.initEmitters();
  }

  initEmitters() {
    if (!this.scene.add || typeof this.scene.add.particles !== 'function') return;

    const W = (this.scene.scale ? this.scene.scale.width : 1024);
    const H = (this.scene.scale ? this.scene.scale.height : 768);

    if (this.scene.textures && this.scene.textures.exists('p_drop')) {
      try {
        this.emitters.rain = this.scene.add.particles(W / 2, -20, 'p_drop', {
          x: { min: -W / 2, max: W / 2 },
          speedY: { min: 450, max: 650 },
          speedX: { min: -60, max: -20 },
          lifespan: 1800,
          quantity: 4,
          scale: { start: 1, end: 1 },
          alpha: { start: 0.8, end: 0.2 },
          emitting: false
        }).setScrollFactor(0).setDepth(9950);
      } catch (e) {}
    }

    if (this.scene.textures && this.scene.textures.exists('p_snowflake')) {
      try {
        this.emitters.snow = this.scene.add.particles(W / 2, -20, 'p_snowflake', {
          x: { min: -W / 2, max: W / 2 },
          speedY: { min: 40, max: 90 },
          speedX: { min: -30, max: 30 },
          rotate: { min: 0, max: 360 },
          lifespan: 6000,
          quantity: 2,
          scale: { start: 0.8, end: 1.2 },
          alpha: { start: 0.9, end: 0.3 },
          emitting: false
        }).setScrollFactor(0).setDepth(9950);
      } catch (e) {}
    }

    if (this.scene.textures && this.scene.textures.exists('p_fog')) {
      try {
        this.emitters.fog = this.scene.add.particles(0, H / 2, 'p_fog', {
          y: { min: -H / 2, max: H / 2 },
          speedX: { min: 15, max: 40 },
          speedY: { min: -5, max: 5 },
          lifespan: 8000,
          quantity: 1,
          frequency: 600,
          scale: { start: 2, end: 3.5 },
          alpha: { start: 0, ease: 'Sine.easeInOut', to: 0.22, yoyo: true },
          emitting: false
        }).setScrollFactor(0).setDepth(9940);
      } catch (e) {}
    }
  }

  setWeather(type) {
    this.currentWeather = type;
    Object.keys(this.emitters).forEach(key => {
      if (this.emitters[key]) {
        try {
          if (key === type) {
            this.emitters[key].start();
          } else {
            this.emitters[key].stop();
          }
        } catch (e) {}
      }
    });
  }
}

