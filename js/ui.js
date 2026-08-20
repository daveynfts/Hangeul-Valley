// ═══════════════ DOM REFS ════════════════════════════════════════════════════
const $=id=>document.getElementById(id);
const lsOverlay=$('level-select-overlay'), lsGrid=$('ls-grid');
const hud=$('hud'), pbWrap=$('progress-bar-wrap'), tipEl=$('controls-tip');

// ── Touch controls ───────────────────────────────────────────────────────────
//
// The farm scene read movement straight off eight keyboard booleans, so on a phone it was
// simply unplayable — which is a strange gap for a vocabulary trainer, since reviewing is
// exactly the thing people do standing up.
//
// touchAxis is an analog vector the scene's update() adds to the keyboard vector. Keeping it
// as shared state rather than wiring the DOM into the scene means the scene needs no knowledge
// of where input came from, and the keyboard path is untouched.
const touchAxis = { x: 0, y: 0 };

// `pointer: coarse` asks whether the *primary* pointer is imprecise, which is the question
// worth asking. maxTouchPoints alone would light these up on a touchscreen laptop being
// driven with its trackpad, and a width breakpoint would light them up on a narrow desktop
// window. Re-evaluated on change so plugging in a mouse, or a tablet switching modes, is
// handled without a reload.
const coarsePointer = (typeof window !== 'undefined' && window.matchMedia)
  ? window.matchMedia('(pointer: coarse)')
  : null;
function isTouchDevice(){ return !!(coarsePointer && coarsePointer.matches); }

function setTouchControlsVisible(show){
  const el = $('touch-controls');
  if (!el) return;
  const on = show && isTouchDevice();
  el.classList.toggle('hidden', !on);
  if (!on) { touchAxis.x = 0; touchAxis.y = 0; resetTouchKnob(); }
}

function resetTouchKnob(){
  const knob = $('tc-knob'), stick = $('tc-stick');
  if (knob) knob.style.transform = 'translate(0px, 0px)';
  if (stick) stick.classList.remove('dragging');
}

function initTouchControls(){
  const stick = $('tc-stick'), knob = $('tc-knob'), action = $('tc-action');
  if (!stick || !knob || !action) return;

  const RADIUS = 46;          // how far the knob travels, in px
  const DEAD_ZONE = 0.18;     // below this the stick reads as centred
  let activeId = null;

  const applyFromPoint = (clientX, clientY) => {
    const r = stick.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    // Clamp the knob to the ring, but keep the axis analog inside it so a small lean is a
    // slow walk rather than a full sprint.
    const clamped = Math.min(dist, RADIUS);
    const ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
    knob.style.transform = `translate(${ux * clamped}px, ${uy * clamped}px)`;
    const mag = clamped / RADIUS;
    if (mag < DEAD_ZONE) { touchAxis.x = 0; touchAxis.y = 0; }
    else { touchAxis.x = ux * mag; touchAxis.y = uy * mag; }
  };

  stick.addEventListener('pointerdown', (e) => {
    activeId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stick.classList.add('dragging');
    applyFromPoint(e.clientX, e.clientY);
    e.preventDefault();
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId) return;
    applyFromPoint(e.clientX, e.clientY);
    e.preventDefault();
  });
  const release = (e) => {
    if (activeId !== null && e.pointerId !== activeId) return;
    activeId = null;
    touchAxis.x = 0; touchAxis.y = 0;
    resetTouchKnob();
  };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);
  // A pointer that leaves the element without capture releasing still has to stop the player,
  // otherwise a thumb sliding off the pad walks them into a fence forever.
  stick.addEventListener('lostpointercapture', release);

  action.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    triggerInteract();
  });

  if (coarsePointer && coarsePointer.addEventListener) {
    coarsePointer.addEventListener('change', () => {
      setTouchControlsVisible(hud && hud.style.display !== 'none');
    });
  }
}

// The same guards the SPACE handler in FarmScene.update() applies, in one place so the two
// input routes cannot drift apart.
function triggerInteract(){
  const sc = sceneRef;
  if (!sc || typeof sc._interact !== 'function') return;
  if (playerLocked || sc.isPerformingAction) return;
  if (quizOpen || shopOpen || memoryOpen || trophyOpen || duelOpen || catDialogOpen) return;
  sc._interact();
}

// game.js is loaded at the end of <body>, so the controls are already in the document.
// Guarded for the Node harnesses, which evaluate this file with a mock document.
if (!IS_NODE && typeof document !== 'undefined') initTouchControls();
const hudLevelEl=$('hud-level'), hudProgressEl=$('hud-progress'), pbFill=$('progress-bar-fill');
const quizBackdrop=$('quiz-backdrop'), answerInput=$('answer-input');
const feedbackText=$('feedback-text'), submitBtn=$('submit-btn'), cancelBtn=$('cancel-btn');
const enWordDisplay=$('en-word-display'), hintEmoji=$('hint-emoji');
const hintCategory=$('hint-category'), quizLevelTag=$('quiz-level-tag');
const vocabOverlay=$('vocab-overlay'), vocabSubtitle=$('vocab-subtitle');
const vocabSearch=$('vocab-search'), catFiltersEl=$('cat-filters');
const vocabGrid=$('vocab-grid'), vocabCountEl=$('vocab-count');
const levelupOverlay=$('levelup-overlay'), levelupMsg=$('levelup-msg');
const levelupNextBtn=$('levelup-next-btn'), levelupMenuBtn=$('levelup-menu-btn');
const alldoneOverlay=$('alldone-overlay');
const replayBtn=$('replay-btn'), menuBtn=$('menu-btn');
const vocabBtn=$('vocab-btn'), hudMenuBtn=$('hud-menu-btn');

// ═══════════════ TOAST ═══════════════════════════════════════════════════════
let toastTimer=null;
function showToast(msg, dur=3500) {
  const t = $('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ═══════════════ HUD ═════════════════════════════════════════════════════════
function updateHUD() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  hudLevelEl.textContent = `${lvl.icon||'🌾'} ${isWorldLevel(lvl) ? (lvl.title || levelName(lvl)) : levelName(lvl)}`;
  if (typeof updateRankHUD === 'function') updateRankHUD();
  const nbBtn = $('unit-notebook-btn');
  if (nbBtn) nbBtn.style.display = isWorldLevel(lvl) ? '' : 'none';
  // The bar now tracks how much of the level has been learned, which persists across
  // sessions, rather than a session-local plant counter that reset every reload.
  const learnedPct = calcLevelProgress(currentLevelIndex);
  const due = srsDueWords().length;
  const maturePct = calcLevelMastery(currentLevelIndex);
  hudProgressEl.textContent = `${learnedPct}%`;
  hudProgressEl.title = `${learnedPct}% learned, ${maturePct}% mature` + (due ? `, ${due} due` : '');
  const dueEl = $('hud-due');
  if (dueEl) {
    dueEl.textContent = due > 0 ? String(due) : '';
    dueEl.classList.toggle('has-due', due > 0);
    dueEl.title = due > 0 ? `${due} review${due === 1 ? '' : 's'} due` : '';
  }
  if(pbFill) pbFill.style.width = learnedPct + '%';
  updateGoldHUD();
}

// ═══════════════ LEVEL SELECT ════════════════════════════════════════════════
function buildLevelSelectScreen() {
  if(!lsGrid) return;
  if(!levelsData || !levelsData.length){
    if(typeof sceneRef !== 'undefined' && sceneRef?.cache?.json){
      levelsData = sceneRef.cache.json.get('levels') || [];
    }
    if(!levelsData || !levelsData.length){
      lsGrid.innerHTML = '<div class="ls-sep">Loading levels…</div>';
      fetch('levels.json').then(r => r.ok ? r.json() : Promise.reject(new Error('levels '+r.status))).then(d => {
        levelsData = Array.isArray(d) ? d : [];
        loadTextbookWorlds(() => buildLevelSelectScreen());
      }).catch(err => {
        console.error('Failed to load levels.json:', err);
        lsGrid.innerHTML = '<div class="ls-sep">Could not load levels. Click to retry.</div>';
        lsGrid.onclick = () => { lsGrid.onclick = null; buildLevelSelectScreen(); };
      });
      return;
    }
    if (!textbookWorldsTried && !levelsData.some(l => isWorldLevel(l))) {
      loadTextbookWorlds(() => buildLevelSelectScreen());
      return;
    }
  }
  lsGrid.innerHTML = '';
  // ── RESUME BUTTON (shown when there's saved progress) ──────────────────────
  const hasSave = plotSave.length > 0 || gold > 0 || harvestCounts.size > 0;
  if(hasSave){
    const r = document.createElement('div');
    r.className = 'ls-resume-card';
    const planted = plotSave.length;
    const cur = levelsData[currentLevelIndex];
    const resumeLabel = isWorldLevel(cur) ? (cur.title || levelName(cur)) : `Level ${currentLevelIndex+1}`;
    r.innerHTML = `
      <div class="lsr-icon">▶</div>
      <div class="lsr-text">
        <div class="lsr-title">Continue Previous Session</div>
        <div class="lsr-sub">💰 ${gold} gold &nbsp;|&nbsp; 🌱 ${planted} crops growing &nbsp;|&nbsp; ${resumeLabel}</div>
      </div>`;
    r.addEventListener('click', resumeGame);
    lsGrid.appendChild(r);
  }
  const paintCard = (lvl, idx) => {
    const world = isWorldLevel(lvl);
    const owned = world || (Array.isArray(unlockedLevels) && unlockedLevels.includes(idx));
    const cost  = LEVEL_COST(idx);
    const canAfford = gold >= cost;
    const wordCount = (lvl && Array.isArray(lvl.words)) ? lvl.words.length : 0;
    const c = document.createElement('div');
    c.className = 'level-card' + (world ? ' world-card' : '') + (!owned ? ' locked' : '');
    c.innerHTML = `<div class="lc-badge">${world ? '📘' : (owned ? '✅' : (canAfford ? '💰' : '🔒'))}</div>
      <div class="lc-top"><span class="lc-icon">${lvl.icon||'📚'}</span>
      <div class="lc-meta"><div class="lc-num">${world ? (lvl.title || 'Textbook world') : `Level ${lvl.level}`}</div>
      <div class="lc-name">${levelName(lvl)}</div>
      <div class="lc-name-ko">${levelNameKo(lvl)}</div></div></div>
      <div class="lc-desc">${lvl.descriptionEn || lvl.description || ''}</div>
      <div class="lc-footer">
        <span class="lc-tag words">📝 ${wordCount} words</span>
        ${world ? `<span class="lc-tag" style="color:#4ade80">📘 SNU 2B</span>`
                : owned ? `<span class="lc-tag" style="color:#4ade80">✅ Owned</span>`
                : `<span class="lc-tag target" style="color:${canAfford?'#f9c74f':'#aaa'}">💰 ${cost} gold</span>`}
      </div>`;
    if(owned) {
      c.addEventListener('click', () => {
        if(idx === currentLevelIndex && hasSave){
          resumeGame();
        } else {
          startLevel(idx, true);
        }
      });
    } else if(canAfford) {
      c.addEventListener('click', () => { buyLevelFromSelect(idx); });
      c.title='Click to buy!';
    }
    lsGrid.appendChild(c);
  };
  const worlds = [];
  const valley = [];
  levelsData.forEach((lvl, idx) => (isWorldLevel(lvl) ? worlds : valley).push({lvl, idx}));
  if (worlds.length) {
    const sep = document.createElement('div');
    sep.className = 'ls-sep';
    sep.textContent = '── SNU Korean 2B ──';
    lsGrid.appendChild(sep);
    worlds.forEach(({lvl, idx}) => paintCard(lvl, idx));
  }
  if (valley.length) {
    const sep = document.createElement('div');
    sep.className = 'ls-sep';
    sep.textContent = hasSave || worlds.length ? '── or a Valley pack ──' : '── select a level ──';
    lsGrid.appendChild(sep);
    valley.forEach(({lvl, idx}) => paintCard(lvl, idx));
  }
}
// ═══════════════ CENTRALIZED UI GLASSMORPHISM MODAL MANAGER ═══════════════════
let activeModalStack = [];

function setModalState(overlayId, isOpen) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  if (isOpen) {
    overlay.classList.add('visible');
    overlay.classList.remove('hidden');
    playerLocked = true;
    if (!activeModalStack.includes(overlayId)) {
      activeModalStack.push(overlayId);
    }
  } else {
    overlay.classList.remove('visible');
    if (overlayId === 'level-select-overlay') {
      overlay.classList.add('hidden');
    }
    activeModalStack = activeModalStack.filter(id => id !== overlayId);
    if (activeModalStack.length === 0) {
      playerLocked = false;
    }
  }
}

function closeTopModal() {
  if (activeModalStack.length === 0) return false;
  const topId = activeModalStack[activeModalStack.length - 1];
  closeModalById(topId);
  return true;
}

function closeModalById(overlayId) {
  if (overlayId === 'inventory-overlay') window.closeInventoryUI();
  else if (overlayId === 'cooking-overlay') window.closeCookingUI();
  else if (overlayId === 'fish-album-overlay') window.closeFishAlbum();
  else if (overlayId === 'recipe-overlay') window.closeRecipeBook();
  else if (overlayId === 'leaderboard-overlay') window.closeLeaderboard();
  else if (overlayId === 'shop-overlay') window.closeShop();
  else if (overlayId === 'memory-overlay') window.closeMemoryGame();
  else if (overlayId === 'duel-overlay') window.closeSpellDuel();
  else if (overlayId === 'trophy-overlay') window.closeTrophies();
  else if (overlayId === 'level-select-overlay') hideLevelSelect();
  // Needs its own branch: this overlay is hidden by the .hidden class, and the generic
  // fallback below only clears .visible, which would leave it on screen after Escape.
  else if (overlayId === 'progress-overlay') window.closeProgressOverlay();
  else if (overlayId === 'unit-notebook-overlay') window.closeUnitNotebook();
  else if (overlayId === 'taste-overlay') window.closeTasteGame();
  else if (overlayId === 'desk-quiz-overlay') window.closeDeskQuiz();
  else if (overlayId === 'rank-card-overlay') window.closeRankCard();
  else if (overlayId === 'rankup-overlay') window.closeRankUp();
  else setModalState(overlayId, false);
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    );

    if (e.key === 'Escape' && activeModalStack.length > 0) {
      closeTopModal();
      return;
    }

    if (!isInputFocused) {
      if (e.key === 'i' || e.key === 'I' || e.key === 'e' || e.key === 'E') {
        if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'inventory-overlay') {
          window.closeInventoryUI();
        } else if (activeModalStack.length === 0) {
          window.openInventoryUI();
        }
      }
      if (e.key === 'c' || e.key === 'C') {
        if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === 'cooking-overlay') {
          window.closeCookingUI();
        } else if (activeModalStack.length === 0) {
          window.openCookingUI();
        }
      }
    }
  });
}

function openInventoryUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderInventoryGrid();
  setModalState('inventory-overlay', true);
}

function closeInventoryUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('inventory-overlay', false);
}

function renderInventoryGrid() {
  const grid = document.getElementById('inventory-grid');
  const badge = document.getElementById('inv-capacity-badge');
  const capText = document.getElementById('inv-capacity-text');

  inventoryState = inventoryState || {};
  const maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  inventoryState.maxSlots = maxSlots;
  const usedSlots = getUsedInventorySlots();

  if (badge) badge.textContent = `${usedSlots} / ${maxSlots} slots`;
  if (capText) capText.textContent = `${maxSlots} slots`;

  if (!grid) return;
  grid.innerHTML = '';

  const items = [];

  // 1. Ingredients
  if (inventoryState.ingredients) {
    for (const [nameKo, qty] of Object.entries(inventoryState.ingredients)) {
      if (qty > 0) {
        const info = getItemInfo(nameKo);
        items.push({
          itemId: info.id || nameKo,
          name: info.name || nameKo,
          nameKo: info.nameKo || nameKo,
          qty: qty,
          icon: (typeof vocabIconHtml === 'function')
            ? vocabIconHtml(info.nameKo || nameKo, info.icon || '🥬', 28)
            : (info.icon || '🥬'),
          description: info.description || 'Harvested crop / ingredient'
        });
      }
    }
  }

  // 2. Cooked Dishes
  if (inventoryState.cookedDishes) {
    for (const [recipeId, qty] of Object.entries(inventoryState.cookedDishes)) {
      if (qty > 0) {
        let nameKo = recipeId;
        let nameEn = recipeId;
        let icon = '🍱';
        let rec = null;
        if (typeof getActiveCookingRecipes === 'function') {
          rec = getActiveCookingRecipes().find(r => r && r.id === recipeId) || null;
        }
        if (!rec && typeof UNIT10_COOKING_RECIPES !== 'undefined') {
          rec = UNIT10_COOKING_RECIPES.find(r => r && r.id === recipeId) || null;
        }
        if (!rec && typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES)) {
          rec = COOKING_RECIPES.find(r => r && r.id === recipeId) || null;
        }
        if (rec) {
          nameKo = rec.nameKo || rec.name;
          nameEn = rec.nameEn || rec.enName || rec.name;
          icon = (typeof vocabIconHtml === 'function' && nameKo)
            ? vocabIconHtml(nameKo, rec.icon || '🍱', 28)
            : (rec.icon || '🍱');
        }
        items.push({
          itemId: recipeId,
          name: nameEn,
          nameKo: nameKo,
          qty: qty,
          icon: icon,
          description: 'Delicious cooked dish'
        });
      }
    }
  }

  // Render slots up to maxSlots
  for (let i = 0; i < maxSlots; i++) {
    const slotEl = document.createElement('div');
    if (i < items.length) {
      const item = items[i];
      slotEl.className = 'inv-slot';
      slotEl.title = `${item.nameKo} (${item.name}): ${item.description}`;
      slotEl.innerHTML = `
        <div class="inv-qty-badge">x${item.qty}</div>
        <div class="inv-slot-icon">${item.icon}</div>
        <div class="inv-slot-ko">${item.nameKo}</div>
        <div class="inv-slot-en">${item.name}</div>
      `;
    } else {
      slotEl.className = 'inv-slot empty';
      slotEl.innerHTML = `
        <div style="font-size:22px; opacity:0.3; margin-bottom:4px;">📦</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.3); font-family:'Press Start 2P',monospace;">Empty</div>
      `;
    }
    grid.appendChild(slotEl);
  }
}

if (typeof window !== 'undefined') {
  window.openInventoryUI = openInventoryUI;
  window.closeInventoryUI = closeInventoryUI;
  window.renderInventoryGrid = renderInventoryGrid;
  window.expandInventoryCapacity = expandInventoryCapacity;
  window.addItemToInventory = addItemToInventory;
  window.removeItemFromInventory = removeItemFromInventory;
  window.getUsedInventorySlots = getUsedInventorySlots;
}

function showLevelSelect() {
  setModalState('level-select-overlay', true);
  hud.style.display = pbWrap.style.display = 'none';
  if (tipEl) tipEl.style.display = 'none';
  setTouchControlsVisible(false);
  buildLevelSelectScreen();
}
function hideLevelSelect() {
  setModalState('level-select-overlay', false);
  hud.style.display = pbWrap.style.display = '';
  if (tipEl) tipEl.style.display = 'none';
  setTouchControlsVisible(true);
}

function buyLevelFromSelect(idx) {
  playChiptuneSFX('click');
  const cost = LEVEL_COST(idx);
  if (unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return; }
  if (playerCurrencies.coins < cost) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return; }
  startShopQuizGate(idx);
}

// ═══════════════ START LEVEL / RESUME ═════════════════════════════════════════
function startLevel(idx, resetCrops=true) {
  currentLevelIndex = idx;
  const lvl = levelsData[idx];
  hideLevelSelect();
  if (isWorldLevel(lvl) && Array.isArray(unlockedLevels) && !unlockedLevels.includes(idx)) unlockedLevels.push(idx);
  if(resetCrops){
    progress = 0; plantedWords.clear();
    if(sceneRef && typeof sceneRef.resetPlots === 'function') {
      try { sceneRef.resetPlots(); } catch (e) { console.warn('resetPlots', e); }
    }
    plotSave = [];
  }
  try { updateHUD(); updateVocabBook(); } catch (e) { console.warn('startLevel hud', e); }
  persistSave();
  if (sceneRef && typeof sceneRef.syncUnit10World === 'function') {
    try { sceneRef.syncUnit10World(); } catch (e) { console.warn('syncUnit10World', e); }
  }
}
// Resume last session WITHOUT resetting crops
function resumeGame(){
  currentLevelIndex = parseInt(localStorage.getItem('hv_lastLevel')||'0') || currentLevelIndex;
  hideLevelSelect();
  updateHUD(); updateVocabBook();
  if (sceneRef && typeof sceneRef.syncUnit10World === 'function') sceneRef.syncUnit10World();
  showToast('▶ Resumed previous session!');
}

// ────── HANGUL CHOSUNG & ROMANIZATION HELPERS ─────────────────────────
const CHOSUNG_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChosung(str){
  if(!str) return '';
  let res = '';
  for(let i = 0; i < str.length; i++){
    const code = str.charCodeAt(i) - 44032;
    if(code >= 0 && code <= 11172){
      res += CHOSUNG_LIST[Math.floor(code / 588)];
    } else {
      res += str[i];
    }
  }
  return res;
}

function revealQuizHint(tier){
  if(!currentWord) return;
  playChiptuneSFX('click');
  const box = $('quiz-hint-reveal-card');
  if(!box) return;

  if(tier === 'chosung'){
    if(!spendCoins(5)){ showToast('Need 5 Coins 🪙 for Chosung hint!'); return; }
    currentQuizMeta.paidHints++;
    const ch = getChosung(currentWord.ko);
    box.innerHTML = `🔠 <b>Initial consonants (초성):</b> <span style="color:#fde047; font-size:18px; font-weight:bold; letter-spacing:3px">${ch}</span>`;
  } else if(tier === 'audio'){
    // Hearing the word is effectively hearing the answer, so it is priced like the
    // origin hint.
    if(!KoreanTTS.isAvailable()){ showToast('🔇 No Korean voice available on this device.'); return; }
    if(!spendCoins(10)){ showToast('Need 10 Coins 🪙 to hear the word!'); return; }
    currentQuizMeta.paidHints++;
    const ko = currentWord.ko;
    speakKorean(ko);
    // The word is embedded rather than read from `currentWord` at click time: the quiz
    // may have moved on, and inline handlers should not depend on mutable globals.
    box.innerHTML = `🔊 <b>Listen:</b>
      <button type="button" class="speak-btn" data-ko="${ko}">▶ Again</button>
      <button type="button" class="speak-btn" data-ko="${ko}" data-spell="1">🐢 Syllable by syllable</button>`;
    box.querySelectorAll('.speak-btn').forEach(b => b.addEventListener('click', () =>
      b.dataset.spell ? spellKorean(b.dataset.ko) : speakKorean(b.dataset.ko)));
  } else if(tier === 'fact'){
    if(!spendCoins(10)){ showToast('Need 10 Coins 🪙 for the origin hint!'); return; }
    currentQuizMeta.paidHints++;
    const fact = getFunFact(currentWord);
    box.innerHTML = `💡 <b>Word origin:</b> ${fact.origin || fact.hint}`;
  }
  box.classList.remove('hidden');
}

// ====== QUIZ (SRS Phase-Aware) ================================================
let currentPhase = 1;

// SM-2 wants Again/Hard/Good/Easy, but the quiz only knows right or wrong. These three
// signals stand in for self-assessed difficulty, and unlike a self-report they cannot be
// gamed: a player who needed a paid hint or several tries genuinely found the word hard.
let currentQuizMeta = { openedAt: 0, attempts: 0, paidHints: 0 };
const EASY_ANSWER_MS = 6000;
// Declared here rather than beside applyQuizMode below because deriveGrade reads it, and a
// `let` further down the file would still be in its temporal dead zone at that point.
let currentQuizMode = 'type';   // 'type' | 'recognise' | 'listen'
let currentChoices = [];

function resetQuizMeta(){ currentQuizMeta = { openedAt: Date.now(), attempts: 0, paidHints: 0 }; }

// ── Answer matching ──────────────────────────────────────────────────────────
// Comparison happens on decomposed jamo, not syllable blocks. 갑 vs 강 differs by a single
// jamo but is a whole different character, so a syllable-level edit distance would call
// them two edits apart while jamo-level correctly calls it one. Composed-form comparison
// would also treat a wrong vowel as a completely different symbol.
const _JAMO_L = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const _JAMO_V = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const _JAMO_T = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function toJamo(str){
  const out = [];
  for (const ch of String(str).normalize('NFC')) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const s = c - 0xac00;
      out.push(_JAMO_L[Math.floor(s / 588)], _JAMO_V[Math.floor((s % 588) / 28)]);
      const t = _JAMO_T[s % 28];
      if (t) out.push(t);
    } else if (ch !== ' ') {
      out.push(ch);
    }
  }
  return out;
}

function levenshtein(a, b){
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Normalizing an answer is more than NFC. Korean IMEs and copy-paste routinely introduce
// zero-width joiners, and learners add trailing punctuation or stray inner spaces — none of
// which should be the difference between right and wrong.
//
// Adapted from the learning-core module on the parallel codex/korean-learning-upgrade
// branch, whose normalizer was strictly more thorough than the plain trim+NFC this had.
function normalizeKorean(value){
  return String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')     // zero-width space / joiners / BOM
    .trim()
    .replace(/\s+/g, ' ')                     // collapse runs of inner whitespace
    .replace(/[.!?,;:。！？、]+$/g, '')        // trailing punctuation, Latin and CJK
    .trim();
}

// Acceptable answers come from explicit data first: a word may declare alternates as
// `acceptedAnswers: ['아버님']`, which is unambiguous. The delimiter split on `ko` stays as a
// fallback for entries that inline alternates as "가다 / 걷다", but new data should use the
// field — splitting a text field guesses at intent, a list states it.
function acceptableAnswers(word){
  if (!word) return [];
  const out = [String(word.ko || '')];
  ['acceptedAnswers', 'answersKo', 'variantsKo'].forEach(key => {
    if (Array.isArray(word[key])) out.push(...word[key]);
  });
  const expanded = out.flatMap(s => String(s).split(/[\/,]/));
  return [...new Set(expanded.map(normalizeKorean).filter(Boolean))];
}

// Word spacing (띄어쓰기) is an orthographic convention, not part of the word. Standard
// Korean writes 어깨가 무겁다 with a space and 눈코 뜰 새 없이 바쁘다 with four; a learner who
// types either of those correctly must not be scored below one who runs them together.
// Comparing space-stripped makes the two indistinguishable in both directions.
const stripSpaces = s => String(s).replace(/\s+/g, '');

// Returns 'exact' | 'close' | 'wrong'. 'close' is a one-jamo slip: the learner clearly
// knew the word, so it is accepted but graded Hard rather than thrown away.
function checkAnswer(typed, word){
  const t = normalizeKorean(typed);
  if (!t) return 'wrong';
  const options = acceptableAnswers(word);
  if (options.includes(t)) return 'exact';
  // Spacing alone is never a mistake. Without this tier the jamo pass below catches a
  // single-space difference as a one-edit "slip" and caps the grade at Hard, so writing
  // an idiom the way the dictionary writes it would permanently depress its interval —
  // and multi-space phrases fell past the <=1 threshold and graded wrong outright.
  const ts = stripSpaces(t);
  if (options.some(opt => stripSpaces(opt) === ts)) return 'exact';
  const tj = toJamo(t);
  // Only forgive a slip on words long enough that one jamo cannot flip the meaning outright.
  for (const opt of options) {
    const oj = toJamo(opt);
    if (oj.length >= 4 && levenshtein(tj, oj) <= 1) return 'close';
  }
  return 'wrong';
}

function deriveGrade(wasClose = false){
  const m = currentQuizMeta;
  if (wasClose || m.attempts > 0 || m.paidHints > 0) return GRADE.HARD;
  // Easy is only inferable from a fast *typed* answer. On multiple choice a quick click is
  // one-in-four guessing, not fluency, so recognition and listening cap out at Good.
  if (currentQuizMode !== 'type') return GRADE.GOOD;
  const elapsed = Date.now() - (m.openedAt || Date.now());
  return elapsed <= EASY_ANSWER_MS ? GRADE.EASY : GRADE.GOOD;
}

function openQuiz(word, plot, phase=1){
  if(quizOpen) return;
  currentWord=word; currentPlot=plot; currentPhase=phase;
  quizOpen=playerLocked=true;
  resetQuizMeta();
  
  // Reset tier hint reveal card
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }

  const cfg=PHASE_CFG[phase-1];
  // Phase bar UI
  const pi=$('quiz-phase-icon'); if(pi) pi.textContent=cfg.icon;
  const pt=$('quiz-phase-title'); if(pt) pt.textContent=cfg.title;
  const pn=$('quiz-phase-name'); if(pn) pn.textContent=cfg.icon+' '+cfg.title;
  const pd=$('quiz-phase-dots'); if(pd) pd.textContent=cfg.dots;
  const gr=$('quiz-gold-reward'); if(gr) gr.textContent=cfg.reward;
  const sb=$('submit-btn'); if(sb) sb.textContent=cfg.btn;
  const qui=$('quiz-ui'); if(qui) qui.className='phase-'+phase;
  // Fill data (CSS controls visibility per phase)
  hintEmoji.textContent     = word.hint||'?';
  hintCategory.textContent  = wordCategory(word);
  enWordDisplay.textContent = word.en;
  quizLevelTag.textContent  = 'P'+phase+'/3';
  // Phase 3: a recall scaffold, not the answer. `structure` and `origin` both spell the word
  // out — see renderRecallScaffold — so the panel carries the redacted shape and the topical
  // note, and the two revealing fields stay behind their own hint buttons.
  const ffText=$('quiz-funfact-text'), ffCulture=$('quiz-funfact-culture');
  const ffBox=$('quiz-funfact-box');
  if(ffText && ffCulture){
    if(phase===3){
      ffText.textContent    = renderRecallScaffold(word.ko || '');
      ffCulture.textContent = getFunFact(word).hint || '';
      if (ffBox) ffBox.classList.remove('hidden');
    } else {
      ffText.textContent = ''; ffCulture.textContent = '';
      if (ffBox) ffBox.classList.add('hidden');
    }
  }
  answerInput.value=''; feedbackText.textContent=''; feedbackText.className='';
  applyQuizMode(word, phase, plot);
  quizBackdrop.classList.add('visible');
  if(currentQuizMode === 'type') setTimeout(()=>answerInput.focus(),80);
}

// ── Question modes ───────────────────────────────────────────────────────────
// Every phase used to be "type the Korean for this English word", which is production
// recall — the hardest form. For a word the player has never seen that is not a test at
// all: the Korean is nowhere on screen, so the only way through is to buy a hint. (The
// code claimed "CSS controls visibility per phase", but no phase-1/2/3 rules ever existed,
// so all three phases rendered identically.)
//
// First contact is now recognition: the Korean is shown as the prompt and the player picks
// its meaning, which teaches the pairing. Production typing is kept for the graded recall
// at phase 3, where it belongs. (currentQuizMode / currentChoices are declared up beside
// currentQuizMeta so deriveGrade can read the mode.)

function pickQuizMode(word, phase, plot){
  // A due review tests the modality that actually expired. Listening needs a Korean voice, so
  // it falls back to typing where none is installed rather than playing silence.
  if (plot && plot.reviewModality) {
    const m = plot.reviewModality;
    return (m === 'listen' && !KoreanTTS.isAvailable()) ? 'type' : m;
  }
  if (phase === 3) return 'type';                       // graded recall stays production
  const e = peekSrs(word.ko);
  const firstContact = !e || e.st === 'new';
  if (phase === 1 && firstContact) return 'recognise';
  // Second touch: listening where a Korean voice exists, otherwise typing.
  if (phase === 2 && KoreanTTS.isAvailable() && !firstContact) return 'listen';
  return 'type';
}

// Distractors are drawn from the same category where possible, so a choice cannot be made
// by elimination on topic alone. `labelOf` is the text the buttons will carry, and it is
// what options are deduped on — see buildOptionSet.
function buildChoices(word, count = 4, labelOf = labelEn){
  const pool = getUnlockedWords().filter(w => w.ko !== word.ko);
  const sameCat = pool.filter(w => wordCategory(w) === wordCategory(word));
  // Same category first, but only if it can fill the question with distinct labels. The old
  // check was `sameCat.length >= count - 1`, which counts entries: a category holding two
  // words that render the same text would over-promise and leave the question a choice short.
  const preferred = buildOptionSet(word, sameCat, count, labelOf);
  return preferred.length === count ? preferred : buildOptionSet(word, pool, count, labelOf);
}

function applyQuizMode(word, phase, plot){
  currentQuizMode = pickQuizMode(word, phase, plot);
  const koPrompt = $('quiz-ko-prompt'), choices = $('quiz-choices'), qText = $('question-text');
  const hints = $('quiz-tier-hints');

  const showTyping = currentQuizMode === 'type';
  answerInput.classList.toggle('hidden', !showTyping);
  answerInput.style.display = showTyping ? '' : 'none';
  if ($('submit-btn')) $('submit-btn').style.display = showTyping ? '' : 'none';
  // Hints reveal the spelling, which is the answer in typing mode but pointless in the
  // others — the Korean is already on screen, or the question is about the meaning.
  if (hints) hints.style.display = showTyping ? '' : 'none';
  choices.classList.toggle('hidden', showTyping);
  koPrompt.classList.toggle('hidden', currentQuizMode !== 'recognise');
  enWordDisplay.style.display = showTyping ? '' : 'none';

  if (showTyping) { qText.textContent = 'Type in Korean for:'; currentChoices = []; return; }

  if (currentQuizMode === 'recognise') {
    qText.textContent = 'What does this word mean?';
    $('quiz-ko-word').textContent = word.ko;
    const speak = $('quiz-ko-speak');
    if (speak) speak.onclick = () => speakKorean(word.ko);
    speakKorean(word.ko);          // free here: the spelling is already visible
  } else {
    qText.textContent = '🔊 Listen — which word was that?';
    speakKorean(word.ko);
  }

  // Recognition shows the Korean, so options are meanings. Listening hides it, so options
  // are Korean spellings — the learner maps sound to spelling. One `labelOf` drives both
  // the dedupe and the button text, so the two cannot drift apart.
  const labelOf = currentQuizMode === 'recognise' ? labelEn : labelKo;
  currentChoices = buildChoices(word, 4, labelOf);
  choices.innerHTML = '';
  currentChoices.forEach(opt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quiz-choice-btn';
    b.textContent = labelOf(opt);
    b.onclick = () => answerChoice(opt, b);
    choices.appendChild(b);
  });
}

function answerChoice(opt, btn){
  if(!currentWord || !quizOpen) return;
  const correct = opt.ko === currentWord.ko;
  const all = [...$('quiz-choices').querySelectorAll('.quiz-choice-btn')];
  all.forEach(b => { b.disabled = true; });
  btn.classList.add(correct ? 'correct' : 'wrong');
  if(!correct){
    // Always reveal the right answer — a wrong guess is the moment the word is learned.
    const idx = currentChoices.findIndex(o => o.ko === currentWord.ko);
    if(all[idx]) all[idx].classList.add('correct');
  }

  if(correct){
    playChiptuneSFX('quiz_correct');
    speakKorean(currentWord.ko);
    feedbackText.textContent = `✅ ${currentWord.ko} — ${currentWord.en}`;
    feedbackText.className = 'correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    const grade = deriveGrade();
    gradeWord(cw.ko, grade);            // schedules whichever modality is on screen
    if(ph===1){
      // Phase 1 teaches by recognition, but the crop timer and the rest of the cycle are
      // production. Start the production track here too so phases 2 and 3 have a schedule to
      // advance and the 30s/90s pacing is unchanged — recognition keeps its own record.
      if(currentQuizMode !== PRIMARY_MODALITY) gradeWord(cw.ko, grade, PRIMARY_MODALITY);
      plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();
    }
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph,grade); }, 950);
  } else {
    playChiptuneSFX('quiz_wrong');
    currentQuizMeta.attempts++;
    feedbackText.textContent = `❌ It's ${currentWord.ko} — ${currentWord.en}`;
    feedbackText.className = '';
    // Re-ask rather than punishing: this is a teaching step, not the graded recall.
    setTimeout(()=>{
      if(!quizOpen || !currentWord) return;
      applyQuizMode(currentWord, currentPhase, currentPlot);
      feedbackText.textContent = 'Try again — which one is it?';
    }, 1500);
  }
}
function closeQuiz(){
  playChiptuneSFX('click');
  quizOpen=playerLocked=false;
  appleTreeQuizPending=false; // always reset on close
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }
  quizBackdrop.classList.remove('visible');
  const qui=$('quiz-ui'); if(qui) qui.className='';
  // Restore the typing layout so the next quiz opens in a known state.
  const ch=$('quiz-choices'); if(ch){ ch.classList.add('hidden'); ch.innerHTML=''; }
  const kp=$('quiz-ko-prompt'); if(kp) kp.classList.add('hidden');
  const kw=$('quiz-ko-word'); if(kw) kw.textContent='';   // don't leave the answer staged
  answerInput.style.display=''; answerInput.classList.remove('hidden');
  if($('submit-btn')) $('submit-btn').style.display='';
  if($('quiz-tier-hints')) $('quiz-tier-hints').style.display='';
  enWordDisplay.style.display='';
  currentQuizMode='type'; currentChoices=[];
  currentWord=currentPlot=null;
}
function submitAnswer(){
  if(!currentWord) return;
  // checkAnswer normalizes both sides through normalizeKorean, which handles the macOS/iOS
  // IME emitting decomposed jamo (NFD) against the composed syllables in levels.json, plus
  // zero-width characters and trailing punctuation.
  const verdict=checkAnswer(answerInput.value, currentWord);
  if(verdict!=='wrong'){
    playChiptuneSFX('quiz_correct');
    // Say the word back on a correct answer. Free, and only after the learner has
    // already produced it — so it reinforces the spelling→sound link without ever
    // acting as a hint. The chiptune SFX is short, so a small delay avoids overlap.
    const spokenWord = currentWord.ko;
    setTimeout(() => speakKorean(spokenWord), 180);
    // ── Apple Tree harvest (special Phase 3 quiz) ─────────────────────────
    if(appleTreeQuizPending){
      feedbackText.textContent='🍎 Harvested! Excellent Korean!'; feedbackText.className='correct';
      appleTreeQuizPending=false;
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.onAppleHarvested(); },700);
      return;
    }
    // ── Normal crop quiz ──────────────────────────────────────────────────
    const msgs=['🌱 Planted! Remember to water!','💧 Watered! Almost ripe!','🍎 Excellent! +Gold earned!'];
    feedbackText.textContent = verdict==='close'
      ? `✅ Close enough — it's ${currentWord.ko}`
      : msgs[currentPhase-1];
    feedbackText.className='correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    // Grade before the state changes, while the attempt/hint counters still describe
    // this answer. gradeWord is the single entry point into the scheduler.
    const grade = deriveGrade(verdict==='close');
    const srsAfter = gradeWord(cw.ko, grade);
    if(ph===3 && srsAfter.st==='review'){
      feedbackText.textContent = `🍎 ${srsAfter.reps===1 ? 'Learned' : 'Reviewed'}! Next review in ${srsIntervalLabel(srsAfter)}`;
    }
    if(ph===1){plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();}
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph,grade); },650);
  } else {
    playChiptuneSFX('quiz_wrong');
    // Counts toward the grade even if the next attempt succeeds — needing a retry is
    // exactly the signal SM-2's "Hard" is meant to capture.
    currentQuizMeta.attempts++;
    const isApple = appleTreeQuizPending;
    const wrong = isApple ? '❌ Wrong! Try again to harvest!' : (currentPhase===3?'❌ Wrong! Plant regressed to Phase 2!':'❌ Wrong! Try again.');
    feedbackText.textContent=wrong; feedbackText.className='';
    answerInput.value=''; answerInput.focus();
    answerInput.animate(
      [{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],
      {duration:260,easing:'ease-out'});
    // Apple tree quiz: no regression, just retry
    if(!isApple && currentPhase===3){
      const cp=currentPlot, cw=currentWord;
      appleTreeQuizPending=false;
      // Failing at phase 3 is a lapse: a mature word drops to relearning and loses half
      // its interval, a learning word restarts its steps.
      const after = gradeWord(cw.ko, GRADE.AGAIN);
      if(after.lapses > 0){
        feedbackText.textContent = `❌ Lapsed — interval reset to ${srsIntervalLabel(after)} after relearning.`;
      }
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.regressionPlot(cp,cw); },1400);
    }
  }
}
submitBtn.addEventListener('click', submitAnswer);
cancelBtn.addEventListener('click', closeQuiz);
answerInput.addEventListener('keydown', e => {
  if(e.key==='Enter'){e.preventDefault();submitAnswer();}
  if(e.key==='Escape') closeQuiz();
  e.stopPropagation();
});
quizBackdrop.addEventListener('keydown', e => e.stopPropagation());
quizBackdrop.addEventListener('keyup',   e => e.stopPropagation());

// ═══════════════ SHOP ════════════════════════════════════════════════════════
function openShop() {
  playChiptuneSFX('click');
  shopOpen = true;
  updateGoldHUD();
  buildShopGrid();
  setModalState('shop-overlay', true);
}
function closeShop() {
  playChiptuneSFX('click');
  shopOpen = false;
  setModalState('shop-overlay', false);
}

function _doLevelPurchase(idx) {
  const cost = LEVEL_COST(idx);
  if(unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return false; }
  if(!spendCoins(cost)) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return false; }
  unlockedLevels.push(idx);
  if(sceneRef) sceneRef.refreshPlotAccess();
  showToast(`🎉 Unlocked "${levelName(levelsData[idx])}"! Welcome to Level ${levelsData[idx].level}!`, 4500);
  return true;
}
function buyLevel(idx) {
  playChiptuneSFX('click');
  const cost = LEVEL_COST(idx);
  if (unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return; }
  if (playerCurrencies.coins < cost) { showToast(`Need ${cost} Coins! You have ${playerCurrencies.coins} 🪙`); return; }
  startShopQuizGate(idx);
}
// Expansions must be bought in order, cheapest first. Without this the shop happily
// sold plot 6 before plot 1, which made the ascending cost curve meaningless.
function isPlotExpansionAvailable(idx) {
  return idx === 0 || isPlotUnlocked(BASE_PLOT_COUNT + idx - 1);
}

function buyPlotExpansion(idx) {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  const plotIndex = BASE_PLOT_COUNT + idx;
  const cost = PLOT_UNLOCK_COSTS[idx] || 1000;

  if (isPlotUnlocked(plotIndex)) {
    showToast('You already unlocked this farm plot!');
    return;
  }

  if (!isPlotExpansionAvailable(idx)) {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    showToast(`🔒 Unlock Farm Plot #${plotIndex} first!`);
    return;
  }

  if (playerCurrencies.coins < cost) {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    showToast(`Need ${cost} Gold 🪙 to unlock Farm Plot #${plotIndex + 1}!`);
    return;
  }

  spendCoins(cost);
  if (!unlockedPlots.includes(plotIndex)) unlockedPlots.push(plotIndex);
  // Derived from the array, never the other way round.
  unlockedPlotCount = unlockedPlots.length;

  if (sceneRef) {
    const p = sceneRef.plots ? sceneRef.plots[plotIndex] : null;
    if (p && typeof sceneRef.unlockPlot === 'function') {
      sceneRef.unlockPlot(p);
    } else if (typeof sceneRef.refreshPlotAccess === 'function') {
      sceneRef.refreshPlotAccess();
    }
  }

  persistSave();
  showToast(`🎉 Unlocked Farm Plot #${plotIndex + 1}!`);
  buildShopGrid();
  updateGoldHUD();
}

function buildShopGrid() {
  const grid = $('shop-level-grid'); if(!grid) return; grid.innerHTML = '';

  // Section 1: Farm Plot Expansions
  const plotHeader = document.createElement('div');
  plotHeader.className = 'shop-section-header';
  plotHeader.style.cssText = 'grid-column: 1 / -1; font-family: "Press Start 2P", monospace; font-size: 13px; color: var(--neon-gold, #FBBF24); margin: 10px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(251, 191, 36, 0.3); display: flex; align-items: center; gap: 8px;';
  plotHeader.innerHTML = `🌾 Farm Plot Expansions (${unlockedPlots.length}/15 Unlocked)`;
  grid.appendChild(plotHeader);

  PLOT_UNLOCK_COSTS.forEach((cost, idx) => {
    const plotIndex = BASE_PLOT_COUNT + idx;
    const isOwned = isPlotUnlocked(plotIndex);
    const available = isPlotExpansionAvailable(idx);
    const canAfford = playerCurrencies.coins >= cost;
    const buyable = available && canAfford;

    const card = document.createElement('div');
    card.className = 'shop-card' + (isOwned ? ' owned' : (!buyable ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${isOwned || available ? '🌾' : '🔒'}</div>
      <div class="shop-card-name">Plot #${idx + 1} Expansion</div>
      <div class="shop-card-desc">Unlock Farm Plot #${plotIndex + 1} for ${cost} Gold</div>
      <div class="shop-card-price">
        ${isOwned
          ? `<span class="shop-owned-badge">✅ Owned</span>
             <button class="shop-buy-btn" disabled>Unlocked</button>`
          : `<span class="shop-card-cost">💰 ${cost} gold</span>
             <button class="shop-buy-btn" ${buyable ? '' : 'disabled'} onclick="buyPlotExpansion(${idx})">
               ${!available
                  ? `Unlock Plot #${plotIndex} first`
                  : (canAfford ? '🛒 Buy Now' : `Need ${cost - playerCurrencies.coins} gold`)}
             </button>`}
      </div>`;
    grid.appendChild(card);
  });

  // Section 2: Vocabulary Level Packs
  const lvlHeader = document.createElement('div');
  lvlHeader.className = 'shop-section-header';
  lvlHeader.style.cssText = 'grid-column: 1 / -1; font-family: "Press Start 2P", monospace; font-size: 13px; color: var(--neon-cyan, #38BDF8); margin: 20px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; gap: 8px;';
  lvlHeader.innerHTML = `📚 Vocabulary Level Packs`;
  grid.appendChild(lvlHeader);

  levelsData.forEach((lvl, idx) => {
    const owned     = unlockedLevels.includes(idx);
    const cost      = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : (!canAfford ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${lvl.icon||'📚'}</div>
      <div class="shop-card-name">Level ${lvl.level}: ${levelName(lvl)}</div>
      <div class="shop-card-desc">${lvl.description||''} — ${lvl.words.length} words</div>
      <div class="shop-card-price">
        ${owned
          ? `<span class="shop-owned-badge">✅ Owned</span>
             <button class="shop-buy-btn" onclick="closeShop();startLevel(${idx})">🌾 Play</button>`
          : `<span class="shop-card-cost">💰 ${cost} gold</span>
             <button class="shop-buy-btn" ${canAfford?'':'disabled'} onclick="buyLevel(${idx})">
               ${canAfford ? '🛒 Buy Now' : `Need ${cost-gold} more gold`}
             </button>`}
      </div>`;
    grid.appendChild(card);
  });
}
$('shop-close-btn').addEventListener('click', closeShop);
$('shop-btn').addEventListener('click', openShop);
$('shop-overlay').addEventListener('keydown', e => e.stopPropagation());

// ═══════════════ VOCAB BOOK ══════════════════════════════════════════════════
let activeCat = 'all';
let activeMasteryFilter = 'all';

function buildVocabBook() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  const ko = levelNameKo(lvl);
  vocabSubtitle.textContent = `Level ${lvl.level} – ${levelName(lvl)}${ko ? ` (${ko})` : ''}`;
  const cats = ['all', '⏰ Due', '⚪ New', '🌱 Learning', '🍎 Review', '🌟 Mature', ...new Set(lvl.words.map(wordCategory).filter(Boolean))];
  catFiltersEl.innerHTML = '';
  cats.forEach(cc => {
    const b = document.createElement('button');
    b.className = 'cat-filter-btn' + (cc === activeCat ? ' active' : '');
    b.textContent = cc === 'all' ? '🌐 All' : cc;
    b.onclick = () => { activeCat = cc; buildVocabBook(); };
    catFiltersEl.appendChild(b);
  });
  renderVocabCards();
}
// ══════ WORD ORIGIN DATA ═════════════════════════════════════════════════════
// Loaded from facts.json, keyed by word.ko. This was an 803 KB inline literal
// (`VOCAB_FACTS`) until an audit found it was 99.7% templated filler: every entry
// repeated the same closing sentence and mnemonic scaffold, and the "example
// sentences" were string-concatenated and often ungrammatical. Regenerated by
// scripts/build_facts_json.js as ~58 KB of structured origin data.
//
// Syllable count and 받침 are derived from the Hangul at render time, so they
// are deliberately not stored.
let factsData = {};
let factsLoaded = false;

// Non-blocking: origins are only needed once a fun-fact panel is opened, and
// getFunFact() degrades to pronunciation-only until the fetch lands. Guarded so the
// script still evaluates where fetch is absent (Node test harnesses run game.js in
// a bare vm context).
function loadFacts(){
  // Browser-only: Node has a global fetch but no base URL, so a relative one throws
  // ERR_INVALID_URL. This checked `typeof document` and one harness mocks document, so the
  // guard passed and every run of it dumped that error. IS_NODE is the check that holds.
  if (IS_NODE || typeof fetch !== 'function') return Promise.resolve();
  return fetch('facts.json')
    .then(r => r.json())
    .then(d => { factsData = d || {}; factsLoaded = true; })
    .catch(e => { console.warn('facts.json failed to load:', e); factsData = {}; });
}
loadFacts();

function decomposeHangulWord(str) {
  if (!str) return [];
  const syllables = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      syllables.push({
        char: str[i],
        hasBatchim: (s % 28) > 0
      });
    }
  }
  return syllables;
}

// ── Origin / structure renderers ─────────────────────────────────────────────
const SINO = 'Sino-Korean (한자어)';

// [char, reading, meaning] → 父 (부) "father"
function _hanjaParts(parts) {
  if (!parts || !parts.length) return '';
  return parts.map(p => `${p[0]} (${p[1]}) “${p[2]}”`).join(' + ');
}

function renderOrigin(f) {
  if (!f) return '';
  const parts = _hanjaParts(f.p);
  switch (f.o) {
    case 'sino':
      return `${SINO} — ${f.h}${parts ? ' = ' + parts : ''}`;
    case 'sino-partial':
      return `${SINO} — built on ${f.h}${parts ? ' = ' + parts : ''}`;
    case 'sino-verb':
      return f.h
        ? `${SINO} verb — ${f.h} + ${f.s || '하다'}${parts ? ' = ' + parts : ''}`
        : `${SINO} verb — 하다 attaches to a Sino-Korean root`;
    case 'sino-passive':
      return f.h
        ? `${SINO} verb — ${f.h} + ${f.s || '되다'}${parts ? ' = ' + parts : ''}`
        : `${SINO} verb — 되다 / 시키다 forms the passive or causative`;
    case 'sino-adj':
      return f.h
        ? `${SINO} adjective — ${f.h} + ${f.s || '적'}${parts ? ' = ' + parts : ''}`
        : `${SINO} adjective — the suffix -적 turns a noun into a descriptive`;
    case 'sino-noun':
      return `${SINO} noun — formed with the suffix -성 / -력 / -감`;
    case 'mixed':
      return `${SINO} + native Korean — ${parts} + ${f.n} (native Korean)`;
    // Same thing with the halves the other way round. `mixed` prints the hanja first, which is
    // right for 남동생 (男 + 동생) and wrong for 옷장 (옷 + 欌) — and a breakdown in the wrong
    // order is worse than none, because the learner reads it as the word's actual shape.
    case 'mixed-native':
      return `native Korean + ${SINO} — ${f.n} (native Korean) + ${parts}`;
    case 'mixed-loan':
      return `${SINO} + loanword — ${f.h}${parts ? ' = ' + parts : ''}, plus English “${f.l}”`;
    // 가스비 and 마케팅부 put the borrowed half first, and the same reasoning as mixed-native
    // applies: printing the halves in the wrong order misreads the word's shape.
    case 'loan-mixed':
      return `loanword + ${SINO} — English “${f.l}”, plus ${f.h}${parts ? ' = ' + parts : ''}`;
    case 'loan':
      return `Loanword (외래어) — from ${f.l.includes('(') ? f.l : `English “${f.l}”`}`;
    case 'loan-partial':
      return `Loanword (외래어) — built on ${f.l}`;
    case 'native':
      return `Native Korean (고유어)${f.note ? ' — ' + f.note : ''}`;
    case 'idiom':
      return `Idiom (관용구) — ${f.note}`;
    case 'discourse':
      return `Discourse marker (담화 표지) — ${f.note}`;
    default:
      return '';
  }
}

// Syllable shape, always derived from the Hangul itself. No Latin romanization.
function renderStructure(ko) {
  const syl = decomposeHangulWord(ko);
  const n = syl.length;
  if (!n) return '';
  const last = syl[n - 1];
  return [
    `${n} syllable${n === 1 ? '' : 's'} (${syl.map(s => s.char).join(' · ')})`,
    last.hasBatchim
      ? `final syllable ${last.char} closes on a 받침`
      : `final syllable ${last.char} is open, no 받침`
  ].join(' · ');
}

// The same shape as renderStructure, minus anything that spells the word out. Phase 3 is
// graded production recall — what the player types sets the word's interval — so the panel
// above the input box must not contain the answer.
//
// This keeps only how long the word is, and whether it ends closed. The batchim is
// reported as present or absent without naming the consonant, which is what the
// 5-coin 초성 hint is for.
function renderRecallScaffold(ko) {
  const syl = decomposeHangulWord(ko);
  const n = syl.length;
  if (!n) return '';
  return [
    `${n} syllable${n === 1 ? '' : 's'}`,
    syl[n - 1].hasBatchim ? 'ends on a 받침' : 'ends open, no 받침',
  ].join(' · ');
}

// English topical note, used when a word has no curated origin.
function renderCategoryHint(cat) {
  const c = (cat || '').toLowerCase();
  const has = (...ks) => ks.some(k => c.includes(k));
  if (has('food', '음식', '식당', '맛'))
    return '🍽️ Food & dining vocabulary. Korean meals are built around balancing flavours and sharing dishes at the table.';
  if (has('animal', '동물'))
    return '🐾 Animal vocabulary. Animals turn up constantly in Korean proverbs, folk tales and pet cafés.';
  if (has('nature', '자연', '계절', '날씨', '환경'))
    return '🌿 Nature & environment vocabulary. Korea has four sharply distinct seasons, so the scenery shifts dramatically through the year.';
  if (has('body', '신체', '건강', '증상'))
    return '💪 Body & health vocabulary. Many Korean body-part words double as metaphors for emotion and attitude.';
  if (has('place', '장소', '건물', '교통', '숙소'))
    return '📍 Places & transport vocabulary. Useful for getting around, asking directions and travelling in Korea.';
  if (has('가족', '사람', '관계'))
    return '👨‍👩‍👧 People & relationships vocabulary. Korean puts real weight on using the right title for the right relationship.';
  if (has('동작', '행동', '업무'))
    return '⚡ Action vocabulary. These land at the end of the sentence in Korean word order (subject – object – verb).';
  return '✨ Everyday Korean vocabulary — common in conversation, dramas and daily life.';
}

// Returns { origin, structure, hint } for any word.
// `origin` may be empty when the word's etymology is not curated; the old data
// asserted "Native Korean" for ~1090 words with no evidence, which mislabelled
// plenty of Sino-Korean vocabulary (건강검진, 환경오염, 기술혁신 …).
function getFunFact(word) {
  if (!word) word = {};
  const ko = (word.ko || '').normalize('NFC');
  return {
    origin: renderOrigin(factsData[ko]),
    structure: renderStructure(ko),
    hint: renderCategoryHint(word.categoryEn || word.category)
  };
}

function showVocabFunFact(word) {
  const fact = getFunFact(word);
  const srs  = getSrs(word.ko);
  const harvests = harvestCounts.get(word.ko) || 0;
  // Report the scheduler's own view of the word instead of guessing a phase from timers.
  let stageLabel = 'Not started';
  if (srsIsMature(srs))          stageLabel = '🌟 Mature';
  else if (srs.st === 'review')  stageLabel = '🍎 In review';
  else if (srs.st === 'relearn') stageLabel = '🔁 Relearning';
  else if (srs.st === 'learn')   stageLabel = '🌱 Learning';
  const modal = $('vocab-ff-modal');
  $('vff-emoji').innerHTML      = (typeof vocabIconHtml === 'function')
    ? vocabIconHtml(word.ko, word.hint || '📝', 56)
    : (word.hint || '📝');
  $('vff-en').textContent       = word.en;
  $('vff-ko').textContent       = word.ko;
  $('vff-cat').textContent      = wordCategory(word) + (word.categoryEn && word.category ? ` · ${word.category}` : '');
  $('vff-phase').textContent    = stageLabel;
  // Each skill has its own schedule, so show them separately — an average would hide the
  // usual case, which is recognition running well ahead of production.
  const MOD_LABEL = { type: '⌨️ Type', recognise: '👁 Recognise', listen: '👂 Listen' };
  const perMod = MODALITIES
    .map(m => ({ m, e: peekSrs(word.ko, m) }))
    .filter(x => x.e && x.e.st !== 'new')
    .map(({ m, e }) => `${MOD_LABEL[m]} ${srsIntervalLabel(e)}${e.lapses ? ` (${e.lapses}✗)` : ''}`);
  $('vff-harvests').textContent = perMod.length
    ? perMod.join('  ·  ')
    : (harvests > 0 ? `✅ Harvested ×${harvests}` : '🌱 Not started');
  $('vff-fact-origin').textContent    = fact.origin || fact.hint;
  $('vff-fact-structure').textContent = fact.structure;
  const exBox = $('vff-fact-example');
  const exSec = $('vff-example-section');
  if (exBox) {
    const line = word.example ? (word.exampleEn ? `${word.example} — ${word.exampleEn}` : word.example) : '';
    exBox.textContent = line;
    if (exSec) exSec.style.display = line ? '' : 'none';
  }
  modal.classList.add('visible');
}
function closeVocabFunFact() { $('vocab-ff-modal').classList.remove('visible'); }

function getUnitNotebook() {
  const lvl = currentLesson();
  return (lvl && lvl.notebook) || null;
}

function openUnitNotebook(tab) {
  const nb = getUnitNotebook();
  const overlay = $('unit-notebook-overlay');
  if (!nb || !overlay) {
    showToast('This pack has no unit notebook yet.');
    return;
  }
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderUnitNotebook(tab || 'map');
  setModalState('unit-notebook-overlay', true);
}
function closeUnitNotebook() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('unit-notebook-overlay', false);
}

const TASTE_LABELS = [
  { ko: '달다', en: 'sweet' },
  { ko: '짜다', en: 'salty' },
  { ko: '쓰다', en: 'bitter' },
  { ko: '시다', en: 'sour' },
  { ko: '맵다', en: 'spicy' }
];
const TASTE_DISHES = [
  { ko: '김치찌개', icon: '🍲', answer: '맵다' },
  { ko: '된장찌개', icon: '🥘', answer: '짜다' },
  { ko: '순두부찌개', icon: '🥣', answer: '맵다' },
  { ko: '감자탕', icon: '🍖', answer: '맵다' },
  { ko: '매운탕', icon: '🐟', answer: '맵다' },
  { ko: '설렁탕', icon: '🥛', answer: '짜다' },
  { ko: '냉면', icon: '🍜', answer: '시다' },
  { ko: '칼국수', icon: '🍝', answer: '짜다' },
  { ko: '비빔국수', icon: '🥗', answer: '맵다' },
  { ko: '삼겹살', icon: '🥓', answer: '짜다' },
  { ko: '떡갈비', icon: '🥩', answer: '달다' },
  { ko: '갈비찜', icon: '🍖', answer: '달다' },
  { ko: '갈비', icon: '🦴', answer: '달다' },
  { ko: '삼계탕', icon: '🐔', answer: '짜다' },
  { ko: '약', icon: '💊', answer: '쓰다', prompt: '약이 써요. 무슨 맛?' }
];
let tasteState = null;

function openTasteGame() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  const pool = TASTE_DISHES.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  const hotter = [
    { a: TASTE_DISHES.find(d => d.ko === '매운탕'), b: TASTE_DISHES.find(d => d.ko === '설렁탕'), pick: '매운탕' },
    { a: TASTE_DISHES.find(d => d.ko === '김치찌개'), b: TASTE_DISHES.find(d => d.ko === '된장찌개'), pick: '김치찌개' }
  ];
  tasteState = { queue: pool.slice(0, 8), hotter, hi: 0, i: 0, score: 0, mode: 'dish', locked: false };
  setModalState('taste-overlay', true);
  renderTasteRound();
}
function closeTasteGame() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  tasteState = null;
  setModalState('taste-overlay', false);
}
function renderTasteRound() {
  if (!tasteState) return;
  const prog = $('taste-progress');
  const icon = $('taste-icon');
  const ko = $('taste-ko');
  const prompt = $('taste-prompt');
  const box = $('taste-choices');
  const fb = $('taste-fb');
  if (fb) { fb.textContent = ''; fb.className = 'fb'; }
  const total = 10;
  if (tasteState.mode === 'done') {
    if (prog) prog.textContent = tasteState.score + ' / ' + total;
    if (icon) icon.textContent = '😋';
    if (ko) ko.textContent = '잘 먹었습니다';
    if (prompt) prompt.textContent = tasteState.score + ' of ' + total + ' tastes right';
    if (box) box.innerHTML = '<button class="taste-btn" onclick="closeTasteGame()">닫기</button>';
    return;
  }
  if (tasteState.mode === 'hotter') {
    const h = tasteState.hotter[tasteState.hi];
    if (prog) prog.textContent = (9 + tasteState.hi) + ' / ' + total;
    if (icon) icon.textContent = h.a.icon + ' ' + h.b.icon;
    if (ko) ko.textContent = h.a.ko + '  /  ' + h.b.ko;
    if (prompt) prompt.textContent = '더 매운 거 뭐예요?';
    if (box) {
      box.innerHTML = '';
      [h.a, h.b].forEach(d => {
        const b = document.createElement('button');
        b.className = 'taste-btn';
        b.textContent = d.icon + ' ' + d.ko;
        b.onclick = () => answerTaste(d.ko === h.pick, b);
        box.appendChild(b);
      });
    }
    return;
  }
  const d = tasteState.queue[tasteState.i];
  if (prog) prog.textContent = (tasteState.i + 1) + ' / ' + total;
  if (icon) icon.textContent = d.icon;
  if (ko) ko.textContent = d.ko;
  if (prompt) prompt.textContent = d.prompt || '무슨 맛이에요?';
  if (box) {
    box.innerHTML = '';
    TASTE_LABELS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'taste-btn';
      b.textContent = t.ko;
      b.setAttribute('data-t', t.ko);
      b.title = t.en;
      b.onclick = () => answerTaste(t.ko === d.answer, b);
      box.appendChild(b);
    });
  }
}
function answerTaste(ok, btn) {
  if (!tasteState || tasteState.locked) return;
  tasteState.locked = true;
  if (btn) btn.classList.add(ok ? 'ok' : 'bad');
  const fb = $('taste-fb');
  if (ok) {
    tasteState.score += 1;
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
    if (fb) { fb.className = 'fb good'; fb.textContent = '맞아요!'; }
  } else {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    if (fb) { fb.className = 'fb bad'; fb.textContent = '다시 생각해 봐.'; }
  }
  setTimeout(() => {
    if (!tasteState) return;
    tasteState.locked = false;
    if (tasteState.mode === 'dish') {
      tasteState.i += 1;
      if (tasteState.i >= tasteState.queue.length) tasteState.mode = 'hotter';
    } else if (tasteState.mode === 'hotter') {
      tasteState.hi += 1;
      if (tasteState.hi >= tasteState.hotter.length) tasteState.mode = 'done';
    }
    renderTasteRound();
  }, 650);
}

if (typeof window !== 'undefined') {
  window.openTasteGame = openTasteGame;
  window.closeTasteGame = closeTasteGame;
}

let deskQuizBank = null;
let deskQuizState = null;

function loadDeskQuiz() {
  if (deskQuizBank) return Promise.resolve(deskQuizBank);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch('/worlds/unit10-desk-quiz.json')
    .then(r => r.ok ? r.json() : null)
    .then(d => { deskQuizBank = d; return d; })
    .catch(() => null);
}

function shuffleDeskItems(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function pickDeskSession(bank) {
  const all = ((bank && bank.questions) || []).slice();
  const size = Math.min((bank && bank.sessionSize) || 5, all.length);
  ensurePlayerRank();
  const recent = playerRank.recentIds || [];
  const fresh = all.filter(q => recent.indexOf(q.id) < 0);
  const pool = shuffleDeskItems(fresh.length >= size ? fresh : all);
  return pool.slice(0, size);
}

function openDeskQuiz() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  loadDeskQuiz().then(bank => {
    const qs = pickDeskSession(bank);
    deskQuizState = { i: 0, score: 0, locked: false, settled: false, qs, bank, gain: null };
    setModalState('desk-quiz-overlay', true);
    renderDeskQuiz();
  });
}
function closeDeskQuiz() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  deskQuizState = null;
  setModalState('desk-quiz-overlay', false);
}
function settleDeskSession() {
  const st = deskQuizState;
  if (!st || st.settled) return;
  st.settled = true;
  ensurePlayerRank();
  const total = (st.qs || []).length;
  playerRank.sessions += 1;
  playerRank.asked += total;
  playerRank.correct += st.score;
  if (total && st.score === total) playerRank.perfects += 1;
  playerRank.recentIds = (st.qs || []).map(q => q.id);
  const xp = studySessionXp(st.score, total);
  const after = addPlayerXp(xp);
  st.gain = { xp: xp, leveled: after.leveled, level: after.level, remain: after.xp, need: after.need };
  if (st.score === total && total) addHonor(2);
  persistSave();
  updateRankHUD();
}
function renderDeskResults() {
  const st = deskQuizState;
  if (!st) return;
  const qEl = $('desk-q');
  const nEl = $('desk-progress');
  const box = $('desk-choices');
  const fb = $('desk-fb');
  const total = (st.qs || []).length;
  const t = rankTitleFor(playerRank.level);
  const xp = (st.gain && st.gain.xp) || 0;
  const hops = (st.gain && st.gain.leveled && st.gain.leveled.length) || 0;
  if (nEl) nEl.textContent = st.score + ' / ' + total;
  if (qEl) {
    qEl.innerHTML = ((st.bank && st.bank.doneKo) || 'Done.') +
      '<div class="desk-xp">+' + xp + ' EXP · ' + t.icon + ' Lv.' + playerRank.level + ' ' + t.ko +
      (hops ? '  ▲' : '') + '</div>';
  }
  if (fb) {
    fb.className = 'fb good';
    fb.textContent = st.score === total ? 'Perfect set!' : (st.score + ' correct');
  }
  if (box) {
    const again = (st.bank && st.bank.againKo) || 'Again';
    const close = (st.bank && st.bank.closeKo) || 'Close';
    box.innerHTML =
      '<button class="desk-opt" onclick="openRankCard()">Valley rank card</button>' +
      '<button class="desk-opt" onclick="openDeskQuiz()">' + again + '</button>' +
      '<button class="desk-opt" onclick="closeDeskQuiz()">' + close + '</button>';
  }
  if (hops) setTimeout(() => { if (deskQuizState) showRankUp(st.gain.leveled[st.gain.leveled.length - 1], hops); }, 380);
}
function renderDeskQuiz() {
  const st = deskQuizState;
  if (!st) return;
  const qEl = $('desk-q');
  const nEl = $('desk-progress');
  const box = $('desk-choices');
  const fb = $('desk-fb');
  if (fb) { fb.textContent = ''; fb.className = 'fb'; }
  const qs = st.qs || [];
  if (st.i >= qs.length) {
    settleDeskSession();
    renderDeskResults();
    return;
  }
  const item = qs[st.i];
  if (nEl) nEl.textContent = (st.i + 1) + ' / ' + qs.length;
  if (qEl) qEl.textContent = (st.i + 1) + '. ' + item.q;
  if (box) {
    box.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(key => {
      const b = document.createElement('button');
      b.className = 'desk-opt';
      b.textContent = key + '. ' + item.choices[key];
      b.onclick = () => answerDeskQuiz(key, b);
      box.appendChild(b);
    });
  }
}
function answerDeskQuiz(key, btn) {
  const st = deskQuizState;
  const qs = st.qs || [];
  if (!st || st.locked || st.i >= qs.length) return;
  st.locked = true;
  const item = qs[st.i];
  const ok = key === item.a;
  if (btn) btn.classList.add(ok ? 'ok' : 'bad');
  const fb = $('desk-fb');
  if (ok) {
    st.score += 1;
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
    if (fb) { fb.className = 'fb good'; fb.textContent = (st.bank && st.bank.correctKo) || 'O'; }
  } else {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    if (fb) { fb.className = 'fb bad'; fb.textContent = ((st.bank && st.bank.wrongKo) || '') + ' ' + item.a + '. ' + item.choices[item.a]; }
  }
  setTimeout(() => {
    if (!deskQuizState) return;
    deskQuizState.locked = false;
    deskQuizState.i += 1;
    renderDeskQuiz();
  }, 900);
}

if (typeof window !== 'undefined') {
  window.openDeskQuiz = openDeskQuiz;
  window.closeDeskQuiz = closeDeskQuiz;
  window.openRankCard = openRankCard;
  window.closeRankCard = closeRankCard;
  window.closeRankUp = closeRankUp;
}

function renderUnitNotebook(tab) {
  const nb = getUnitNotebook();
  const lvl = currentLesson();
  if (!nb) return;
  const titleEl = $('unb-title');
  const kickerEl = $('unb-kicker');
  if (kickerEl) kickerEl.textContent = (lvl && (lvl.title || '2B Unit 10')) + (lvl && lvl.source ? ` · ${lvl.pages || 'pp. 24–27'}` : '');
  if (titleEl) titleEl.textContent = (lvl && (lvl.titleKo || levelNameKo(lvl))) || '뭐 먹을래요?';
  const tabs = [
    { id: 'map', label: '지도 Mind map' },
    { id: 'words', label: '단어 Words' }
  ];
  const tabBar = $('unb-tabs');
  if (tabBar) {
    tabBar.innerHTML = '';
    tabs.forEach(t => {
      const b = document.createElement('button');
      b.className = 'unb-tab' + (t.id === tab ? ' active' : '');
      b.textContent = t.label;
      b.onclick = () => renderUnitNotebook(t.id);
      tabBar.appendChild(b);
    });
  }
  const body = $('unb-body');
  if (!body) return;
  if (tab === 'map' || tab === 'warmup' || tab === 'goals') {
    const groups = {};
    (lvl.words || []).forEach(w => {
      const key = w.categoryEn || w.category || 'Other';
      if (!groups[key]) groups[key] = { ko: w.category || key, en: w.categoryEn || key, words: [] };
      groups[key].words.push(w);
    });
    const cards = Object.values(groups).map(g =>
      `<div class="unb-cluster"><div class="unb-h">${g.ko} <span>${g.en} · ${g.words.length}</span></div>` +
      g.words.map(w => `<span class="unb-chip">${w.hint || ''} ${w.ko}</span>`).join(' ') +
      `</div>`
    ).join('');
    body.innerHTML = `<div class="unb-lead">10과 뭐 먹을래? — ${ (lvl.words||[]).length } words in six groups. Plant them on the farm.</div>
      <img src="/worlds/unit10-mindmap.jpg" alt="Unit 10 mind map" style="width:100%;border-radius:12px;border:2px solid #8b5a2b;margin:8px 0 12px">
      <div class="unb-map">${cards}</div>
      <button class="unb-cta" onclick="closeUnitNotebook()">Go plant →</button>`;
  } else if (tab === 'words') {
    const rows = (lvl.words || []).map(w =>
      `<div class="unb-q"><div class="unb-ko">${w.hint || ''} ${w.ko}</div><div class="unb-en">${w.en} · ${w.categoryEn || w.category}</div></div>`
    ).join('');
    body.innerHTML = rows;
  } else if (false && tab === 'warmup') {
    const qs = (nb.warmup && nb.warmup.questions) || [];
    body.innerHTML = `<div class="unb-lead">Look at the unit picture, then answer in Korean if you can.</div>` +
      qs.map(q => `<div class="unb-q"><div class="unb-ko">${q.ko}</div><div class="unb-en">${q.en}</div></div>`).join('') +
      `<button class="unb-cta" onclick="renderUnitNotebook('goals')">Next: learning goals →</button>`;
  } else if (tab === 'goals') {
    const g = nb.goals || {};
    const row = (items, heading) => `<div class="unb-h">${heading}</div>` + (items || []).map(it =>
      `<div class="unb-goal ${it.ready === false ? 'soon' : ''}"><b>${it.ko}</b> <span>${it.en}</span>${it.ready === false ? ' <em>later pages</em>' : ''}</div>`
    ).join('');
    body.innerHTML = row(g.vocab, '어휘 Vocabulary') + row(g.grammar, '문법 Grammar') + row(g.tasks, '과제 Tasks') +
      `<div class="unb-note">This world only uses pp. 24–27. Later pages will add 아/어 보다, -잖아요, and ordering food.</div>
       <button class="unb-cta" onclick="closeUnitNotebook()">Plant these words on the farm →</button>`;
  } else if (tab === 'speak') {
    const s = nb.speaking || {};
    const model = (s.model || []).map(m =>
      `<div class="unb-line"><span class="unb-who">${m.who}</span><div><div class="unb-ko">${m.ko}</div><div class="unb-en">${m.en}</div></div></div>`
    ).join('');
    const crit = (s.criteria || []).map((c, i) =>
      `<button type="button" class="unb-chip" data-i="${i}" data-side="pos">${c.ko}: ${c.pos}</button>` +
      `<button type="button" class="unb-chip dim" data-i="${i}" data-side="neg">${c.ko}: ${c.neg}</button>`
    ).join('');
    body.innerHTML = `<div class="unb-h">${s.title || '말하기'} <span>${s.titleEn || ''}</span></div>
      <div class="unb-dialog">${model}</div>
      <div class="unb-h">Make a sentence</div>
      <label class="unb-label">Restaurant name
        <input id="unb-rest-name" value="서울식당" maxlength="20">
      </label>
      <div class="unb-lead">Tap two points (one “but” contrast, like the model: expensive <i>but</i> nice atmosphere).</div>
      <div id="unb-chips" class="unb-chips">${crit}</div>
      <div id="unb-built" class="unb-built">제가 자주 가는 식당은 서울식당인데 …</div>
      <button class="unb-cta tts-only" id="unb-speak-line">🔊 Hear my sentence</button>`;
    const chosen = [];
    const chips = body.querySelector('#unb-chips');
    const built = body.querySelector('#unb-built');
    const nameIn = body.querySelector('#unb-rest-name');
    const rebuild = () => {
      const name = (nameIn && nameIn.value.trim()) || '서울식당';
      if (chosen.length < 2) {
        built.textContent = `제가 자주 가는 식당은 ${name}인데 …`;
        return;
      }
      const a = s.criteria[chosen[0].i][chosen[0].side];
      const b = s.criteria[chosen[1].i][chosen[1].side];
      built.textContent = `제가 자주 가는 식당은 ${name}인데 ${a}지만 ${b}.`;
    };
    if (chips) chips.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.unb-chip');
      if (!btn) return;
      const i = Number(btn.getAttribute('data-i'));
      const side = btn.getAttribute('data-side');
      const same = chosen.findIndex(c => c.i === i);
      if (same >= 0) chosen.splice(same, 1);
      chosen.push({ i, side });
      if (chosen.length > 2) chosen.shift();
      chips.querySelectorAll('.unb-chip').forEach(el => el.classList.remove('picked'));
      chosen.forEach(c => {
        const el = chips.querySelector(`.unb-chip[data-i="${c.i}"][data-side="${c.side}"]`);
        if (el) el.classList.add('picked');
      });
      rebuild();
    });
    if (nameIn) nameIn.addEventListener('input', rebuild);
    const hear = body.querySelector('#unb-speak-line');
    if (hear) hear.onclick = () => { if (typeof speakKorean === 'function') speakKorean(built.textContent); };
  } else if (tab === 'grammar') {
    const g = nb.grammar || {};
    const dlg = (g.dialogue || []).map(m =>
      `<div class="unb-line"><span class="unb-who">${m.who}</span><div><div class="unb-ko">${m.ko}</div><div class="unb-en">${m.en}</div></div></div>`
    ).join('');
    const prac = (g.practice || []).map(p =>
      `<div class="unb-q"><div class="unb-ko">${p.ko}</div><div class="unb-en">${p.en}</div></div>`
    ).join('');
    const drill = g.drill || {};
    const opts = (drill.options || []).map(o => `<button type="button" class="unb-opt" data-v="${o}">${o}</button>`).join('');
    body.innerHTML = `<div class="unb-h">${g.form || 'N 중에(서)'}</div>
      <p class="unb-lead">${g.meaningKo || ''} ${g.meaning || ''}</p>
      <div class="unb-dialog">${dlg}</div>
      <div class="unb-h">연습</div>${prac}
      <div class="unb-h">Fill in</div>
      <div class="unb-ko">${(drill.prompt || '').replace('_____', '<span class="unb-blank">____</span>')}</div>
      <div id="unb-opts" class="unb-chips">${opts}</div>
      <div id="unb-drill-fb" class="unb-lead"></div>`;
    const box = body.querySelector('#unb-opts');
    const fb = body.querySelector('#unb-drill-fb');
    if (box) box.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.unb-opt');
      if (!btn) return;
      const ok = btn.getAttribute('data-v') === drill.answer;
      fb.textContent = ok ? '맞아요! 중에서 marks the set you choose from.' : 'Again — we need the particle that means “among”.'
      fb.style.color = ok ? '#166534' : '#9f1239';
      if (ok && typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
      else if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    });
  }
}

if (typeof window !== 'undefined') {
  window.openUnitNotebook = openUnitNotebook;
  window.closeUnitNotebook = closeUnitNotebook;
  window.renderUnitNotebook = renderUnitNotebook;
}

function renderVocabCards() {
  const lvl = levelsData[currentLevelIndex];
  const q = vocabSearch.value.trim().toLowerCase();
  let words = lvl.words;

  // Filter by learning stage / category. Stages come from the scheduler now, so they mean
  // something about retention rather than counting how often a plot was farmed.
  if(activeCat !== 'all'){
    if(activeCat.includes('New')) words = words.filter(w => { const e=peekSrs(w.ko); return !e || e.st === 'new'; });
    else if(activeCat.includes('Learning')) words = words.filter(w => srsIsLearning(peekSrs(w.ko)));
    else if(activeCat.includes('Review')) words = words.filter(w => { const e=peekSrs(w.ko); return e && e.st==='review' && !srsIsMature(e); });
    else if(activeCat.includes('Mature')) words = words.filter(w => srsIsMature(peekSrs(w.ko)));
    else if(activeCat.includes('Due')) words = words.filter(w => wordIsDue(w.ko));
    else words = words.filter(w => wordCategory(w) === activeCat);
  }
  
  if(q) words = words.filter(w => w.ko.toLowerCase().includes(q) || w.en.toLowerCase().includes(q));
  
  vocabCountEl.textContent = `${words.length} words`; vocabGrid.innerHTML = '';
  const now = Date.now();
  words.forEach(w => {
    const times   = harvestCounts.get(w.ko) || 0;
    const planted = plantedWords.has(w.ko);
    const chosung = getChosung(w.ko);
    const e       = peekSrs(w.ko);

    // Badge reflects scheduler state; the suffix shows the current interval, which is the
    // number that actually tells a learner how well they know the word.
    let mBadgeClass = 'novice', mBadgeLabel = '⚪ New', mBadgeSuffix = '';
    if(srsIsMature(e))        { mBadgeClass='legendary'; mBadgeLabel='🌟 Mature'; }
    else if(e && e.st==='review'){ mBadgeClass='mastered';  mBadgeLabel='🍎 Review'; }
    else if(srsIsLearning(e)) { mBadgeClass='practicing'; mBadgeLabel = e.st==='relearn' ? '🔁 Relearning' : '🌱 Learning'; }
    if(srsIsGraduated(e)) mBadgeSuffix = ` (${srsIntervalLabel(e)})`;
    if(srsIsDue(e, now))  mBadgeSuffix += ' ⏰';

    const div = document.createElement('div');
    div.className = `vocab-card ${mBadgeClass}` + (times > 0 || srsIsGraduated(e) ? ' planted' : '') + (planted ? ' growing' : '');
    div.title = 'Click for Fun Facts & Hints!';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <button type="button" class="speak-btn vc-speak tts-only" title="Hear this word">🔊</button>
      <span class="vc-emoji">${(typeof vocabIconHtml === 'function') ? vocabIconHtml(w.ko, w.hint || '📝', 40) : (w.hint || '📝')}</span>
      <span class="vc-ko">${w.ko}</span>
      <span class="vc-en">${w.en}</span>
      <span style="font-size:11px; color:#fde047; font-family:monospace">초성: ${chosung}</span>
      <span class="mastery-badge ${mBadgeClass}">${mBadgeLabel}${mBadgeSuffix}</span>`;
    // Free here: the vocab book already shows the answer, so audio adds nothing to give away.
    div.querySelector('.vc-speak').addEventListener('click', (e) => {
      e.stopPropagation();          // don't also open the fun-fact modal
      speakKorean(w.ko);
    });
    div.addEventListener('click', () => showVocabFunFact(w));
    vocabGrid.appendChild(div);
  });
}
function updateVocabBook() { if(vocabOverlay.classList.contains('visible')) renderVocabCards(); }
vocabBtn.addEventListener('click', () => vocabOverlay.classList.contains('visible')
  ? vocabOverlay.classList.remove('visible')
  : (buildVocabBook(), vocabOverlay.classList.add('visible')));
$('vocab-close-btn').addEventListener('click', () => vocabOverlay.classList.remove('visible'));
vocabSearch.addEventListener('input', renderVocabCards);
hudMenuBtn.addEventListener('click', () => { closeQuiz(); showLevelSelect(); });

// Legacy overlays (now rarely triggered, economy is main flow)
levelupNextBtn && levelupNextBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); openShop(); });
levelupMenuBtn && levelupMenuBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); showLevelSelect(); });
replayBtn && replayBtn.addEventListener('click', () => { alldoneOverlay.classList.remove('visible'); startLevel(0); });
menuBtn   && menuBtn.addEventListener('click', ()   => { alldoneOverlay.classList.remove('visible'); showLevelSelect(); });

