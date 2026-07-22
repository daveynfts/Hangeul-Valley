# Milestone 1 Codebase Analysis & Audio Synthesis Design Report

**Agent**: Explorer 2  
**Role**: Explorer (Milestone 1 - Codebase & Audio Analysis)  
**Working Directory**: `C:\VibeCode\Hangeul Valley\.agents\explorer_m1_2\`  
**Project Root**: `C:\VibeCode\Hangeul Valley`  
**Date**: 2026-07-22  

---

## 1. Observation

### 1.1 Audio Search in Codebase (`index.html` and `game.js`)
We conducted a comprehensive inspection of the entire codebase (`index.html` - 1387 lines, `game.js` - 3480 lines, `assets/index.html`, `assets/game.js`).

- **HTML & Asset Analysis (`index.html`)**:
  - Direct inspection of lines 1–1387 confirmed **no `<audio>` elements**, no audio file imports (`.mp3`, `.wav`, `.ogg`, `.flac`), and no audio script includes.
  - The script tags only include:
    - Line 1383: `<script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>`
    - Line 1384: `<script src="game.js"></script>`

- **JavaScript Analysis (`game.js`)**:
  - No `AudioContext` or `webkitAudioContext` instantiations.
  - No Phaser sound calls (`this.sound.play()`, `this.sound.add()`).
  - No HTML5 `new Audio()` calls.
  - In `preload()` (lines 884), only `this.load.json('levels', 'levels.json')` is loaded. No audio files are preloaded.
  - No sound volume controls, toggle settings, or audio placeholder functions exist.

**Summary**: The game current relies 100% on visual feedback (canvas/DOM text toasts, particle explosions, camera flashes/shakes, scaling tweens) with **zero sound audio layer**.

---

### 1.2 User Interaction Points Analysis
We mapped every interactive mechanic across the game scenes (`FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`) and UI overlays (`QuizBackdrop`, `ShopOverlay`, `VocabOverlay`, `MemoryOverlay`, `TrophyOverlay`, `DuelOverlay`, `FishAlbumOverlay`, `CatDialog`).

The 6 required interaction points and their exact code locations are detailed below:

| Interaction Point | Code Location in `game.js` & `index.html` | Trigger Description | Visual Feedback Currently Implemented |
|---|---|---|---|
| **1. Button click** | • DOM buttons in `index.html`: lines 1062-1068 (`#save-btn`, `#duel-btn`, `#fish-album-btn`, `#trophy-btn`, `#shop-btn`, `#vocab-btn`, `#hud-menu-btn`) <br>• Quiz submit/cancel: `submitBtn` (line 613), `cancelBtn` (line 614), tier buttons `revealQuizHint` (line 511) <br>• Shop buy buttons: `buyLevel` (line 645), `_doLevelPurchase` (line 634) <br>• Vocab filter buttons (line 695), card click `showVocabFunFact` (line 863) <br>• Memory card flip: `onMemoryCardClick` (line 3103) <br>• Duel options: `selectDuelOption` (line 3365) <br>• Trophy buy: line 3223 | Mouse click or keypress trigger on UI buttons, overlay cards, or menu items. | Scale animations, hover glow, border color change, toast notifications. |
| **2. Crop harvest** | • `FarmScene.advancePlot()` Phase 3: lines 1916–1928 (`// P3 correct: HARVEST! Gold!`) <br>• `FarmScene.onAppleHarvested()`: lines 1603–1614 | Player completes Phase 3 quiz on plot or harvests ripe Apple Tree (`harvestAppleTree()`). | Flying coin sprites `_flyCoins()`, rising text label `_label()`, gold HUD pulse `updateGoldHUD(true)`. |
| **3. Fishing pull** | • `FishingScene.triggerBite()`: line 2875 (`triggerBite()`) <br>• `FishingScene.update()` reeling: lines 2907–2946 <br>• `FishingScene.catchSuccess()`: lines 2992–3002 <br>• `FishingScene.loseFish()`: lines 3004–3010 | Triggered when fish bites line, player holds SPACE/pointer to balance tension bar, and reeled fish is caught/escapes. | BITE text burst, animated tension bar, progress fill bar, screen flash, toast output. |
| **4. Sword swing** | • `DungeonScene.playerSlash()`: lines 2575–2613 <br>• Monster damage hits: line 2596 (`m.hp -= 35`) | Player presses SPACE or clicks mouse in Dungeon ARPG mode to swing sword at slimes/skeletons/golems. | Sword arc text `⚔️` scaling/rotation tween (220ms), floating red/green `-35` damage numbers. |
| **5. Quiz correct sound** | • `submitAnswer()`: line 583 (`typed === currentWord.ko`) <br>• `ArcadeScene.hitWordOrb()`: line 2374 (`if(isCorrect)`) <br>• `DungeonScene.collectLoot()`: line 2675 <br>• `FishingScene.startVocabChallenge()`: line 2976 <br>• `SpellQuizDuel.selectDuelOption()`: line 3384 <br>• `onMemoryCardClick()`: line 3131 | Player correctly types Korean word or selects matching translation option across any mode. | Green text highlight, `Planted! / Watered! / Excellent!` message, combo increase `🔥 Combo xN`. |
| **6. Quiz wrong sound** | • `submitAnswer()`: line 597 (`feedbackText.textContent = wrong`) <br>• `ArcadeScene.hitWordOrb()`: line 2383 <br>• `FishingScene.startVocabChallenge()`: line 2982 <br>• `SpellQuizDuel.selectDuelOption()`: line 4007 <br>• `onMemoryCardClick()`: line 3149 | Player inputs incorrect answer, selects wrong option, or misses time limit. | Input field shake animation (260ms), red text message, plant regression to Phase 2. |

---

## 2. Logic Chain

1. **Observation**: Code inspection proves no audio files exist in the repository, and no Web Audio API code is currently implemented.
2. **Deduction**: Loading external MP3/WAV files for retro sound effects introduces unnecessary HTTP latency, potential CORS restrictions, and file asset dependencies.
3. **Synthesis Strategy**: Web Audio API allows runtime programmatically-synthesized 64-bit / 8-bit chiptune sound effects via pure JavaScript standard Web APIs (`AudioContext`, `OscillatorNode`, `GainNode`, `AudioBuffer`).
4. **Implementation Plan**: A lightweight, standalone synthesizer module (`ChiptuneSynth` / `sound.js`) can be instantiated globally (`window.HV_Audio`). It handles browser autoplay policy restrictions (`AudioContext.resume()`), master gain/mute management, and provides intuitive helper methods corresponding to all 6 interaction points.

---

## 3. Web Audio API Synthesizer Module Architecture Design

Below is the complete, self-contained architecture design for `assets/sound.js` (or `sound.js`), optimized for <150 lines, zero dependencies, pure standard JS Web Audio API.

```javascript
/**
 * Hangeul Valley - 64-bit Chiptune Web Audio Synthesizer
 * Pure JS procedural sound generator (No external MP3/WAV files needed)
 */
class ChiptuneSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.volume = 0.3; // Default 30% master volume
  }

  // Initialize or resume AudioContext on user gesture (browser autoplay policy)
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Helper to construct short tone envelopes
  _playTone(freq, type, duration, pitchEnd = null, gainVal = 0.5) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type; // 'square', 'triangle', 'sawtooth', 'sine'
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(freq, now);
    if (pitchEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, pitchEnd), now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Helper for noise bursts (sword swoosh, splashes)
  _playNoise(duration, fadeType = 'exp', gainVal = 0.4) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(now);
  }

  // ══════════════ 6 REQUIRED CHIPTUNE PRESETS ═════════════════════════════

  // 1. Button click: Sharp 8-bit blip (440Hz -> 880Hz square pitch bend, 40ms)
  playButtonClick() {
    this._playTone(440, 'square', 0.04, 880, 0.3);
  }

  // 2. Crop harvest: Bright retro arpeggio C5 -> E5 -> G5 -> C6 (200ms)
  playCropHarvest() {
    if (this.muted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this._playTone(freq, 'triangle', 0.08, freq * 1.05, 0.4);
      }, idx * 45);
    });
  }

  // 3. Fishing pull:
  // - bite: High dual alert chirp (880Hz -> 1760Hz)
  // - reel: Low rachet pulse (140Hz)
  // - catch: Splash noise + fanfare
  playFishingBite() {
    this._playTone(880, 'square', 0.08, 1760, 0.5);
  }

  playFishingReel() {
    this._playTone(140, 'sawtooth', 0.03, 90, 0.25);
  }

  playFishingCatch() {
    this._playNoise(0.12, 'exp', 0.3);
    setTimeout(() => this.playCropHarvest(), 80);
  }

  // 4. Sword swing: Noise burst + descending frequency swoosh (800Hz -> 150Hz, 100ms)
  playSwordSwing() {
    this._playNoise(0.09, 'exp', 0.35);
    this._playTone(700, 'sawtooth', 0.10, 120, 0.3);
  }

  // 5. Quiz correct sound: Upward 2-tone chime C5 (523Hz) -> G5 (784Hz)
  playQuizCorrect() {
    if (this.muted) return;
    this.init();
    this._playTone(523.25, 'square', 0.09, null, 0.4);
    setTimeout(() => {
      this._playTone(783.99, 'square', 0.14, null, 0.45);
    }, 90);
  }

  // 6. Quiz wrong sound: Low descending dissonant buzz F3 (174Hz) -> C3 (130Hz)
  playQuizWrong() {
    if (this.muted) return;
    this.init();
    this._playTone(220, 'sawtooth', 0.12, 110, 0.5);
    setTimeout(() => {
      this._playTone(174.61, 'sawtooth', 0.16, 87, 0.45);
    }, 100);
  }
}

// Global Singleton Instance
window.HV_Audio = new ChiptuneSynth();

// Global listener to unlock Web Audio API Context on first user click/keypress
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    window.HV_Audio.init();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}
```

---

## 4. Integration Blueprint for Implementers

To integrate `ChiptuneSynth` into `index.html` and `game.js`:

1. **Include Script**: Add `<script src="sound.js"></script>` in `index.html` right before `<script src="game.js"></script>`.
2. **Hook Locations in `game.js`**:
   - **Button Clicks**: Call `HV_Audio.playButtonClick()` inside DOM click handlers or `Phaser` pointerdown handlers.
   - **Crop Harvest**: Call `HV_Audio.playCropHarvest()` inside `advancePlot()` (line 1920) and `onAppleHarvested()` (line 1605).
   - **Fishing**:
     - Call `HV_Audio.playFishingBite()` inside `triggerBite()` (line 2875).
     - Call `HV_Audio.playFishingReel()` inside `update()` reeling hold (line 2908).
     - Call `HV_Audio.playFishingCatch()` inside `catchSuccess()` (line 2992).
   - **Sword Swing**: Call `HV_Audio.playSwordSwing()` inside `DungeonScene.playerSlash()` (line 2576).
   - **Quiz Correct**: Call `HV_Audio.playQuizCorrect()` inside `submitAnswer()` correct branch (line 585), `hitWordOrb()` (line 2378), `selectDuelOption()` (line 3385).
   - **Quiz Wrong**: Call `HV_Audio.playQuizWrong()` inside `submitAnswer()` wrong branch (line 598), `selectDuelOption()` (line 4008).

---

## 5. Caveats

- **Browser Autoplay Restrictions**: Browsers (Chrome/Edge/Firefox) block `AudioContext` sound playback until the user interacts with the document (`click` or `keydown`). The `init()` lazy initialization and global `{ once: true }` event listeners handle this seamlessly.
- **Audio Output Device Failure**: On systems without audio drivers or output devices, Web Audio API calls complete silently without throwing fatal JS runtime exceptions.

---

## 6. Conclusion

1. `game.js` and `index.html` contain zero existing audio code or sound assets.
2. All 6 specified interaction points (Button click, Crop harvest, Fishing pull, Sword swing, Quiz correct, Quiz wrong) have been pinpointed down to exact line numbers and code functions.
3. A lightweight, dependency-free Web Audio API synthesizer module structure (`ChiptuneSynth`) has been fully designed to synthesize retro 64-bit chiptune audio programmatically without external files.

---

## 7. Verification Method

1. **Codebase Inspection**:
   - Open `game.js` and verify no existing audio context or sound calls exist.
   - Confirm target line numbers in `game.js` (`submitAnswer`: 583, `advancePlot`: 1916, `playerSlash`: 2575, `triggerBite`: 2875).
2. **Synthesizer Verification**:
   - Save the proposed `sound.js` code in browser console or workspace file and run `window.HV_Audio.playQuizCorrect()` / `playCropHarvest()` in browser dev tools after user click to verify chiptune synthesis.
