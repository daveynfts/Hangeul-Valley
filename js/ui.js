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

// Same guards as FarmScene pointer/keyboard interact, in one place so the on-screen
// touch button cannot drift from click-to-interact.
function triggerInteract(){
  const sc = sceneRef;
  if (!sc || typeof sc._interact !== 'function') return;
  const flags = {
    playerLocked,
    isPerformingAction: sc.isPerformingAction,
    quizOpen, shopOpen, memoryOpen, trophyOpen, duelOpen, catDialogOpen
  };
  if (typeof worldPointerBlocked === 'function' ? worldPointerBlocked(flags)
      : (playerLocked || sc.isPerformingAction || quizOpen || shopOpen || memoryOpen || trophyOpen || duelOpen || catDialogOpen)) {
    return;
  }
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
  if (typeof updateQuestHudBadge === 'function') updateQuestHudBadge();
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

// The study desk: the chooser, the workbook and the quiz. All three are places
// you are meant to be listening to Korean, so the background score comes off
// while any of them is open.
const STUDY_OVERLAYS = ['desk-menu-overlay', 'workbook-overlay', 'desk-quiz-overlay'];

// Decided from the modal stack rather than counted up and down by each screen.
// The desk chains — the chooser opens the workbook, the workbook goes back to
// the chooser — and a hold released by whichever screen closed first would let
// the music back in over the one still open.
function syncStudyQuiet() {
  const quiet = activeModalStack.some(id => STUDY_OVERLAYS.indexOf(id) >= 0);
  [typeof MusicDirector !== 'undefined' ? MusicDirector : null,
    typeof AmbienceDirector !== 'undefined' ? AmbienceDirector : null]
    .forEach((d) => {
      if (!d || typeof d.hold !== 'function') return;
      if (quiet === d.held()) return;
      if (quiet) d.hold(); else d.release();
    });
}

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
  syncStudyQuiet();
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
  else if (overlayId === 'trophy-overlay') window.closeTrophies();
  else if (overlayId === 'level-select-overlay') hideLevelSelect();
  // Needs its own branch: this overlay is hidden by the .hidden class, and the generic
  // fallback below only clears .visible, which would leave it on screen after Escape.
  else if (overlayId === 'quest-overlay') window.closeQuestOverlay();
  else if (overlayId === 'progress-overlay') window.closeProgressOverlay();
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
  // A selection and a search term left over from last time read as "my items are gone",
  // so the bag always opens showing everything.
  inventorySelectedId = null;
  inventorySearch = '';
  const search = document.getElementById('inv-search-input');
  if (search) search.value = '';
  renderInventoryGrid();
  setModalState('inventory-overlay', true);
}

function closeInventoryUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('inventory-overlay', false);
}

let inventoryTab = 'all';
let inventorySearch = '';
let inventorySelectedId = null;

// Names and descriptions reach innerHTML from levels.json, facts.json and the recipe
// tables — the one part of this markup the renderer does not author itself. Escaping is
// what keeps a bad string a wrong label rather than executing script against the save.
function invEscHtml(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Crops before seeds before dishes, then the biggest stack, then Korean alphabetical.
// Object key order used to decide this, so a stack changing size reshuffled the grid
// under the player's cursor.
const INV_KIND_ORDER = { ingredient: 0, seed: 1, dish: 2 };
const INV_KIND_BADGE = { ingredient: '🌿', seed: '🌱', dish: '🍲' };
const INV_KIND_LABEL = { ingredient: 'Crop / ingredient', seed: 'Seed', dish: 'Cooked dish' };

// Read from the one place that charges it, so the label and the till cannot disagree.
function invExpandCost() {
  return (typeof INVENTORY_EXPAND_COST === 'number') ? INVENTORY_EXPAND_COST : 50;
}

function setInventoryTab(tab) {
  inventoryTab = tab === 'ingredients' || tab === 'dishes' ? tab : 'all';
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('#inv-tabs .inv-tab').forEach(function (btn) {
      const on = btn.getAttribute('data-inv-tab') === inventoryTab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  renderInventoryGrid();
}

function setInventorySearch(q) {
  inventorySearch = String(q === undefined || q === null ? '' : q).trim().toLowerCase();
  renderInventoryGrid();
}

function invResolveRecipe(recipeId) {
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
  return rec;
}

// Every stack the bag holds, independent of the active tab or search, because the tab
// counts and the capacity reading both have to describe the whole bag.
//
// Seeds are included: getUsedInventorySlots() has always counted them, so leaving them
// out of the grid meant the badge could claim more slots used than the player could see.
function collectInventoryItems() {
  const items = [];
  const art = function (ko, fallback, px) {
    return (typeof vocabIconHtml === 'function') ? vocabIconHtml(ko, fallback || '?', px || 40) : (fallback || '?');
  };

  const simple = [
    { map: inventoryState.ingredients, kind: 'ingredient', fallbackDesc: 'Harvested crop / ingredient' },
    { map: inventoryState.seeds,       kind: 'seed',       fallbackDesc: 'Plantable seed' }
  ];
  simple.forEach(function (src) {
    if (!src.map) return;
    for (const [nameKo, qty] of Object.entries(src.map)) {
      if (!(qty > 0)) continue;
      const info = getItemInfo(nameKo);
      items.push({
        itemId: info.id || nameKo,
        name: info.name || nameKo,
        nameKo: info.nameKo || nameKo,
        qty: qty,
        icon: art(info.nameKo || nameKo, info.icon, 40),
        iconLarge: art(info.nameKo || nameKo, info.icon, 56),
        description: info.description || src.fallbackDesc,
        kind: src.kind
      });
    }
  });

  if (inventoryState.cookedDishes) {
    for (const [recipeId, qty] of Object.entries(inventoryState.cookedDishes)) {
      if (!(qty > 0)) continue;
      const rec = invResolveRecipe(recipeId);
      const nameKo = rec ? (rec.nameKo || rec.name) : recipeId;
      const nameEn = rec ? (rec.nameEn || rec.enName || rec.name) : recipeId;
      items.push({
        itemId: recipeId,
        name: nameEn,
        nameKo: nameKo,
        qty: qty,
        icon: art(nameKo, rec && rec.icon, 40),
        iconLarge: art(nameKo, rec && rec.icon, 56),
        description: (rec && rec.culturalFact) || 'Cooked dish',
        kind: 'dish'
      });
    }
  }

  items.sort(function (a, b) {
    return (INV_KIND_ORDER[a.kind] - INV_KIND_ORDER[b.kind])
      || (b.qty - a.qty)
      || String(a.nameKo).localeCompare(String(b.nameKo), 'ko');
  });
  return items;
}

function invMatchesTab(item) {
  if (inventoryTab === 'all') return true;
  if (inventoryTab === 'dishes') return item.kind === 'dish';
  return item.kind === 'ingredient' || item.kind === 'seed';
}

function invMatchesSearch(item) {
  if (!inventorySearch) return true;
  return String(item.nameKo).toLowerCase().indexOf(inventorySearch) >= 0
    || String(item.name).toLowerCase().indexOf(inventorySearch) >= 0;
}

function renderInventoryCapacity(usedSlots, maxSlots) {
  const wrap = document.getElementById('inv-capacity');
  const badge = document.getElementById('inv-capacity-badge');
  const capText = document.getElementById('inv-capacity-text');
  const fill = document.getElementById('inv-capacity-fill');
  const track = document.getElementById('inv-capacity-track');
  const expand = document.getElementById('inv-expand-btn');

  if (badge) badge.textContent = `${usedSlots} / ${maxSlots} slots`;
  if (capText) capText.textContent = `${maxSlots} slots`;

  const ratio = maxSlots > 0 ? usedSlots / maxSlots : 0;
  if (fill && fill.style) fill.style.width = Math.min(100, Math.round(ratio * 100)) + '%';
  if (track && track.setAttribute) {
    track.setAttribute('aria-valuenow', String(usedSlots));
    track.setAttribute('aria-valuemax', String(maxSlots));
    track.setAttribute('aria-valuetext', `${usedSlots} of ${maxSlots} slots used`);
  }
  if (wrap && wrap.classList && typeof wrap.classList.toggle === 'function') {
    wrap.classList.toggle('full', usedSlots >= maxSlots);
    wrap.classList.toggle('warn', usedSlots < maxSlots && ratio >= 0.8);
  }

  // The cost was only discoverable by clicking and being refused. Show affordability up
  // front instead.
  if (expand) {
    const cost = invExpandCost();
    const coins = (typeof playerCurrencies !== 'undefined' && playerCurrencies)
      ? (playerCurrencies.coins || 0) : 0;
    const affordable = coins >= cost;
    expand.disabled = !affordable;
    expand.title = affordable
      ? `Add 5 slots for ${cost} Coins`
      : `Needs ${cost} Coins — you have ${coins}`;
  }
}

function renderInventoryDetail(items) {
  const box = document.getElementById('inv-detail');
  if (!box) return;
  const item = items.filter(function (it) { return it.itemId === inventorySelectedId; })[0] || null;

  if (!item) {
    inventorySelectedId = null;
    box.innerHTML = '';
    if (box.classList && typeof box.classList.add === 'function') box.classList.add('hidden');
    return;
  }

  const ko = String(item.nameKo || '');
  const chips = [
    `<span class="inv-chip">${invEscHtml(INV_KIND_LABEL[item.kind] || 'Item')}</span>`,
    `<span class="inv-chip gold">×${item.qty} in bag</span>`
  ];

  // The bag is full of Korean the player earned, so it doubles as a review surface:
  // syllable shape and etymology come from the same helpers the vocabulary book uses.
  let lore = '';
  if (typeof renderStructure === 'function') {
    const shape = renderStructure(ko);
    if (shape) lore += `<div class="inv-detail-note">🔠 ${invEscHtml(shape)}</div>`;
  }
  if (typeof renderOrigin === 'function' && typeof factsData !== 'undefined' && factsData) {
    const origin = renderOrigin(factsData[ko.normalize('NFC')]);
    if (origin) lore += `<div class="inv-detail-note">💡 ${invEscHtml(origin)}</div>`;
  }

  const canSpeak = typeof speakKorean === 'function';
  const actions = canSpeak
    ? `<div class="inv-detail-actions">
         <button type="button" class="inv-detail-btn" id="inv-detail-speak">🔊 Listen</button>
         <button type="button" class="inv-detail-btn" id="inv-detail-spell">🐢 Syllables</button>
       </div>`
    : '';

  // getItemInfo falls back to the Korean key for both fields when an item is not in
  // ITEM_DB. Printing it three times reads as a rendering fault, so drop the echoes.
  const enLine = (item.name && item.name !== ko)
    ? `<div class="inv-detail-en">${invEscHtml(item.name)}</div>` : '';
  const descLine = (item.description && item.description !== ko && item.description !== item.name)
    ? `<div class="inv-detail-note">${invEscHtml(item.description)}</div>` : '';

  box.innerHTML = `
    <div class="inv-detail-icon">${item.iconLarge || item.icon || ''}</div>
    <div class="inv-detail-body">
      <div class="inv-detail-ko">${invEscHtml(ko)}</div>
      ${enLine}
      <div class="inv-detail-meta">${chips.join('')}</div>
      ${descLine}
      ${lore}
      ${actions}
    </div>
    <button type="button" class="inv-detail-close" id="inv-detail-close" aria-label="Close item details">✕</button>
  `;
  if (box.classList && typeof box.classList.remove === 'function') box.classList.remove('hidden');

  const speakBtn = document.getElementById('inv-detail-speak');
  if (speakBtn && speakBtn.addEventListener) {
    speakBtn.addEventListener('click', function () { speakKorean(ko); });
  }
  const spellBtn = document.getElementById('inv-detail-spell');
  if (spellBtn && spellBtn.addEventListener) {
    spellBtn.addEventListener('click', function () {
      if (typeof spellKorean === 'function') spellKorean(ko); else speakKorean(ko);
    });
  }
  const closeBtn = document.getElementById('inv-detail-close');
  if (closeBtn && closeBtn.addEventListener) {
    closeBtn.addEventListener('click', function () { selectInventorySlot(null); });
  }
}

function selectInventorySlot(itemId) {
  // Clicking the open item closes it, so the strip is dismissable without hunting for
  // the ✕.
  inventorySelectedId = (itemId && inventorySelectedId === itemId) ? null : (itemId || null);
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderInventoryGrid();
}

function renderInventoryGrid() {
  const grid = document.getElementById('inventory-grid');
  const emptyMsg = document.getElementById('inv-empty-msg');

  inventoryState = inventoryState || {};
  const maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  inventoryState.maxSlots = maxSlots;
  const usedSlots = getUsedInventorySlots();

  renderInventoryCapacity(usedSlots, maxSlots);

  const all = collectInventoryItems();

  // Counts describe the whole bag, not the filtered view — a tab that reads 0 while
  // holding items would be a lie.
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    const counts = {
      all: all.length,
      ingredients: all.filter(function (i) { return i.kind !== 'dish'; }).length,
      dishes: all.filter(function (i) { return i.kind === 'dish'; }).length
    };
    document.querySelectorAll('#inv-tabs .inv-tab-count').forEach(function (el) {
      const key = el.getAttribute('data-inv-count');
      const n = counts[key] || 0;
      el.textContent = String(n);
      if (el.classList && typeof el.classList.toggle === 'function') el.classList.toggle('zero', n === 0);
    });
  }

  const items = all.filter(invMatchesTab).filter(invMatchesSearch);

  if (emptyMsg) {
    let msg = '';
    if (all.length === 0) msg = 'Harvest crops, catch fish, or cook a dish to fill the bag.';
    else if (items.length === 0 && inventorySearch) msg = `Nothing in the bag matches “${inventorySearch}”.`;
    else if (items.length === 0) msg = 'Nothing of this kind in the bag yet.';
    if (msg) emptyMsg.textContent = msg;
    if (emptyMsg.classList && typeof emptyMsg.classList.toggle === 'function') {
      emptyMsg.classList.toggle('hidden', msg === '');
    }
  }

  renderInventoryDetail(items);

  if (!grid) return;
  grid.innerHTML = '';

  const crate = (typeof crateIconHtml === 'function') ? crateIconHtml(28) : '';
  // Empty crates communicate remaining capacity, which is worth showing — but not as a
  // wall of them behind an empty bag, and not while a filter is narrowing the view.
  const padWithEmpties = inventoryTab === 'all' && !inventorySearch && all.length > 0;
  const showSlots = padWithEmpties ? Math.max(maxSlots, items.length) : items.length;

  for (let i = 0; i < showSlots; i++) {
    const slotEl = document.createElement('div');
    if (i < items.length) {
      const item = items[i];
      const selected = item.itemId === inventorySelectedId;
      slotEl.className = selected ? 'inv-slot selected' : 'inv-slot';
      slotEl.title = `${item.nameKo} (${item.name}): ${item.description}`;
      if (slotEl.setAttribute) {
        slotEl.setAttribute('role', 'listitem');
        slotEl.setAttribute('tabindex', '0');
        slotEl.setAttribute('data-inv-id', String(item.itemId));
        slotEl.setAttribute('aria-pressed', selected ? 'true' : 'false');
        slotEl.setAttribute('aria-label',
          `${item.nameKo}, ${item.name}, ${INV_KIND_LABEL[item.kind] || 'item'}, quantity ${item.qty}`);
      }
      slotEl.innerHTML = `
        <div class="inv-kind-badge" aria-hidden="true">${INV_KIND_BADGE[item.kind] || '📦'}</div>
        <div class="inv-qty-badge">x${item.qty}</div>
        <div class="inv-slot-icon">${item.icon}</div>
        <div class="inv-slot-ko">${invEscHtml(item.nameKo)}</div>
        <div class="inv-slot-en">${invEscHtml(item.name)}</div>
      `;
      // The slot has looked clickable since it was written — cursor:pointer and a hover
      // lift — but nothing was listening. Now it opens the detail strip, by pointer or
      // by keyboard.
      if (slotEl.addEventListener) {
        const id = item.itemId;
        slotEl.addEventListener('click', function () { selectInventorySlot(id); });
        slotEl.addEventListener('keydown', function (e) {
          if (!e) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            selectInventorySlot(id);
          }
        });
      }
    } else {
      slotEl.className = 'inv-slot empty';
      if (slotEl.setAttribute) slotEl.setAttribute('aria-hidden', 'true');
      slotEl.innerHTML = `
        <div class="inv-slot-icon empty-crate">${crate}</div>
        <div class="inv-slot-en">Empty</div>
      `;
    }
    grid.appendChild(slotEl);
  }
}

if (typeof window !== 'undefined') {
  window.openInventoryUI = openInventoryUI;
  window.closeInventoryUI = closeInventoryUI;
  window.renderInventoryGrid = renderInventoryGrid;
  window.setInventoryTab = setInventoryTab;
  window.setInventorySearch = setInventorySearch;
  window.selectInventorySlot = selectInventorySlot;
  window.expandInventoryCapacity = expandInventoryCapacity;
  window.addItemToInventory = addItemToInventory;
  window.removeItemFromInventory = removeItemFromInventory;
  window.getUsedInventorySlots = getUsedInventorySlots;
}

function showLevelSelect() {
  setModalState('level-select-overlay', true);
  if (typeof playSceneAudio === 'function') playSceneAudio('menu');
  hud.style.display = pbWrap.style.display = 'none';
  if (tipEl) tipEl.style.display = 'none';
  setTouchControlsVisible(false);
  buildLevelSelectScreen();
}
function hideLevelSelect() {
  setModalState('level-select-overlay', false);
  if (typeof playSceneAudio === 'function') playSceneAudio('farm');
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
    speakKorean(ko, { force: true });
    // The word is embedded rather than read from `currentWord` at click time: the quiz
    // may have moved on, and inline handlers should not depend on mutable globals.
    box.innerHTML = `🔊 <b>Listen:</b>
      <button type="button" class="speak-btn" data-ko="${ko}">▶ Again</button>
      <button type="button" class="speak-btn" data-ko="${ko}" data-spell="1">🐢 Syllable by syllable</button>`;
    box.querySelectorAll('.speak-btn').forEach(b => b.addEventListener('click', () =>
      b.dataset.spell ? spellKorean(b.dataset.ko, { force: true }) : speakKorean(b.dataset.ko, { force: true })));
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

function paintQuizSteps(phase){
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  const steps = document.querySelectorAll('#quiz-steps .quiz-step');
  steps.forEach(el => {
    const n = Number(el.getAttribute('data-step'));
    el.classList.toggle('active', n === phase);
    el.classList.toggle('done', n < phase);
  });
}

let quizFinishTimer = null;
let pendingQuizAdvance = null;
function clearQuizFinishTimer(){
  if (quizFinishTimer) { clearTimeout(quizFinishTimer); quizFinishTimer = null; }
}
function settleQuizAdvance(){
  clearQuizFinishTimer();
  const run = pendingQuizAdvance;
  pendingQuizAdvance = null;
  closeQuiz();
  if (typeof run === 'function') run();
}
function showQuizSuccess({ message, ko, en, continueLabel, delay, onDone }){
  if (typeof checkQuestProgress === 'function') {
    checkQuestProgress('quiz');
    if (typeof currentQuizMode !== 'undefined' && currentQuizMode === 'listen') checkQuestProgress('listen');
    if (typeof currentPhase === 'number') {
      if (currentPhase === 1) checkQuestProgress('plant');
      else if (currentPhase === 2) checkQuestProgress('water');
    }
  }
  pendingQuizAdvance = onDone;
  const box = $('quiz-result');
  const art = $('quiz-result-art');
  const msg = $('quiz-result-msg');
  const koEl = $('quiz-result-ko');
  const enEl = $('quiz-result-en');
  const go = $('quiz-result-continue');
  if (msg) msg.textContent = message || '';
  if (koEl) koEl.textContent = ko || '';
  if (enEl) enEl.textContent = en || '';
  if (art) {
    art.innerHTML = (ko && typeof vocabIconHtml === 'function')
      ? vocabIconHtml(ko, '', 64)
      : '';
  }
  if (go) {
    go.textContent = continueLabel || 'Continue';
    go.onclick = closeQuiz;
  }
  if (box) box.classList.remove('hidden');
  const qui = $('quiz-ui');
  if (qui) qui.classList.add('quiz-success');
  clearQuizFinishTimer();
  // delay === 0: harvest stays open so the player can reread the word, then dismiss.
  if (delay === 0) {
    if (go) setTimeout(() => { try { go.focus(); } catch (e) {} }, 40);
    return;
  }
  const wait = typeof delay === 'number' ? delay : 2800;
  quizFinishTimer = setTimeout(settleQuizAdvance, wait);
}

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
  const gr=$('quiz-gold-reward'); if(gr) gr.textContent=cfg.reward || '';
  const sb=$('submit-btn'); if(sb) sb.textContent=cfg.btn;
  const qui=$('quiz-ui'); if(qui) qui.className='phase-'+phase;
  paintQuizSteps(phase);
  const resultBox=$('quiz-result'); if(resultBox) resultBox.classList.add('hidden');
  // Fill data (CSS controls visibility per phase)
  if (hintEmoji) {
    if (typeof vocabIconHtml === 'function') {
      hintEmoji.innerHTML = vocabIconHtml(word.ko, word.hint || '?', 72);
    } else {
      hintEmoji.textContent = word.hint || '?';
    }
  }
  hintCategory.textContent  = wordCategory(word);
  enWordDisplay.textContent = word.en;
  quizLevelTag.textContent  = 'P'+phase+'/3';
  // Phase 3: shape tiles only — one square per syllable, grouped like the vocab is
  // written. Word-class (native / Sino / loan) never spells the word.
  const ffText=$('quiz-funfact-text'), ffCulture=$('quiz-funfact-culture');
  const ffBox=$('quiz-funfact-box');
  if(ffText && ffCulture){
    if(phase===3){
      const sc = renderRecallScaffoldHtml(word.ko || '');
      ffText.innerHTML = sc.html || '';
      ffCulture.textContent = sc.note || '';
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
  // Water is always listening. A due-review plot can still carry reviewModality='type'
  // after a failed harvest, and a word whose production track is still 'new' used to
  // skip this branch — both rendered the Water quiz as typing, which hid Hear again
  // and left only the paid hint.
  if (phase === 2) {
    return (typeof KoreanTTS !== 'undefined' && KoreanTTS.supported()) ? 'listen' : 'type';
  }
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

function bindListenReplay(word, show){
  let box = $('quiz-listen-controls');
  if (!box && typeof document !== 'undefined' && document.createElement) {
    box = document.createElement('div');
    box.id = 'quiz-listen-controls';
    const choices = $('quiz-choices');
    if (choices && choices.parentNode) choices.parentNode.insertBefore(box, choices.nextSibling);
  }
  if (!box) return;
  let replay = $('quiz-listen-replay');
  if (!replay) {
    replay = document.createElement('button');
    replay.type = 'button';
    replay.id = 'quiz-listen-replay';
    replay.className = 'speak-btn';
    replay.title = 'Play the word again';
    replay.textContent = '▶ Hear again';
    box.appendChild(replay);
  }
  replay.onclick = (ev) => {
    if (ev) ev.stopPropagation();
    const ok = speakKorean(word.ko, { force: true });
    if (!ok && typeof showToast === 'function') {
      showToast('🔇 Could not play Korean audio on this device.', 2600);
    }
  };
  box.classList.toggle('hidden', !show);
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
  bindListenReplay(word, currentQuizMode === 'listen');
  enWordDisplay.style.display = showTyping ? '' : 'none';

  if (showTyping) { qText.textContent = 'Type in Korean for:'; currentChoices = []; return; }

  if (currentQuizMode === 'recognise') {
    qText.textContent = 'What does this word mean?';
    $('quiz-ko-word').textContent = word.ko;
    const speak = $('quiz-ko-speak');
    if (speak) speak.onclick = () => speakKorean(word.ko, { force: true });
    speakKorean(word.ko);          // free here: the spelling is already visible
  } else {
    qText.textContent = 'Listen — which word was that?';
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
  if(!currentWord || !quizOpen || pendingQuizAdvance) return;
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
    showQuizSuccess({
      message: ph === 1 ? 'Planted!' : (ph === 2 ? 'Watered!' : 'Harvested!'),
      ko: cw.ko, en: cw.en,
      continueLabel: ph === 3 ? 'Collect harvest' : (ph === 2 ? 'Keep growing' : 'Plant it'),
      delay: ph === 3 ? 0 : 1800,
      onDone: () => { if (sceneRef) sceneRef.advancePlot(cp, cw, ph, grade); }
    });
  } else {
    playChiptuneSFX('quiz_wrong');
    if (typeof checkQuestProgress === 'function') checkQuestProgress('miss');
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
  clearQuizFinishTimer();
  const run = pendingQuizAdvance;
  pendingQuizAdvance = null;
  if (!run) playChiptuneSFX('click');
  quizOpen=playerLocked=false;
  appleTreeQuizPending=false; // always reset on close
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }
  const res = $('quiz-result'); if(res) res.classList.add('hidden');
  quizBackdrop.classList.remove('visible');
  const qui=$('quiz-ui'); if(qui) qui.className='';
  // Restore the typing layout so the next quiz opens in a known state.
  const ch=$('quiz-choices'); if(ch){ ch.classList.add('hidden'); ch.innerHTML=''; }
  const kp=$('quiz-ko-prompt'); if(kp) kp.classList.add('hidden');
  const lc=$('quiz-listen-controls'); if(lc) lc.classList.add('hidden');
  const kw=$('quiz-ko-word'); if(kw) kw.textContent='';   // don't leave the answer staged
  answerInput.style.display=''; answerInput.classList.remove('hidden');
  if($('submit-btn')) $('submit-btn').style.display='';
  if($('quiz-tier-hints')) $('quiz-tier-hints').style.display='';
  enWordDisplay.style.display='';
  currentQuizMode='type'; currentChoices=[];
  currentWord=currentPlot=null;
  if (typeof run === 'function') run();
}
function submitAnswer(){
  if(!currentWord || pendingQuizAdvance) return;
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
      const harvested = currentWord;
      showQuizSuccess({
        message: 'Harvested!',
        ko: harvested.ko, en: harvested.en,
        continueLabel: 'Collect apples',
        delay: 0,
        onDone: () => { if (sceneRef) sceneRef.onAppleHarvested(); }
      });
      return;
    }
    // ── Normal crop quiz ──────────────────────────────────────────────────
    const msgs=['Planted! Remember to water.','Watered! Almost ripe.','Excellent! +Gold earned.'];
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    // Grade before the state changes, while the attempt/hint counters still describe
    // this answer. gradeWord is the single entry point into the scheduler.
    const grade = deriveGrade(verdict==='close');
    const srsAfter = gradeWord(cw.ko, grade);
    let message = verdict==='close'
      ? `Close enough — ${cw.ko}`
      : msgs[ph-1];
    if(ph===3 && srsAfter.st==='review'){
      message = (srsAfter.reps===1 ? 'Learned!' : 'Reviewed!') + ' Next review in ' + srsIntervalLabel(srsAfter);
    }
    feedbackText.textContent = message;
    feedbackText.className='correct';
    if(ph===1){plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();}
    showQuizSuccess({
      message,
      ko: cw.ko, en: cw.en,
      continueLabel: ph === 3 ? 'Collect harvest' : (ph === 2 ? 'Keep growing' : 'Plant it'),
      delay: ph === 3 ? 0 : 1800,
      onDone: () => { if (sceneRef) sceneRef.advancePlot(cp, cw, ph, grade); }
    });
  } else {
    playChiptuneSFX('quiz_wrong');
    if (typeof checkQuestProgress === 'function') checkQuestProgress('miss');
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
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.regressionPlot(cp,cw); },1800);
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
  plotHeader.style.cssText = 'grid-column: 1 / -1; font-family: "Press Start 2P", monospace; font-size: 13px; color: #78350f; margin: 10px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(139, 90, 43, 0.45); display: flex; align-items: center; gap: 8px;';
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
  lvlHeader.style.cssText = 'grid-column: 1 / -1; font-family: "Press Start 2P", monospace; font-size: 13px; color: #1e3a8a; margin: 20px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(29, 78, 216, 0.35); display: flex; align-items: center; gap: 8px;';
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

// Same walk, but split on whitespace so tile groups match how the vocab is written.
function hangulSyllableGroups(str) {
  const groups = [];
  let current = [];
  const raw = String(str || '').normalize('NFC');
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      current.push({ hasBatchim: (s % 28) > 0 });
    } else if (/\s/.test(raw[i])) {
      if (current.length) { groups.push(current); current = []; }
    }
  }
  if (current.length) groups.push(current);
  return groups;
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
// Tiles mark each syllable block. A bottom bar means that block is closed (has 받침)
// without naming the consonant — that is what the 5-coin 초성 hint is for. Word-class
// comes from facts.json's origin tag only (native / Sino / loan), never hanja readings.
function recallOriginClass(ko) {
  const f = (typeof factsData !== 'undefined' && factsData) ? factsData[(ko || '').normalize('NFC')] : null;
  if (!f || !f.o) return '';
  switch (f.o) {
    case 'sino':
    case 'sino-partial':
    case 'sino-noun':
    case 'sino-adj':
    case 'sino-verb':
    case 'sino-passive':
      return 'Sino-Korean';
    case 'native':
      return 'Native Korean';
    case 'loan':
    case 'loan-partial':
      return 'Loanword';
    case 'mixed':
    case 'mixed-native':
    case 'mixed-loan':
    case 'loan-mixed':
      return 'Mixed origin';
    case 'idiom':
      return 'Idiom';
    case 'discourse':
      return 'Discourse marker';
    default:
      return '';
  }
}
function renderRecallScaffold(ko) {
  const groups = hangulSyllableGroups(ko);
  const n = groups.reduce((acc, g) => acc + g.length, 0);
  if (!n) return '';
  const cls = recallOriginClass(ko);
  return [n + (n === 1 ? ' block' : ' blocks'), cls].filter(Boolean).join(' · ');
}
function renderRecallScaffoldHtml(ko) {
  const groups = hangulSyllableGroups(ko);
  if (!groups.length) return { html: '', note: '' };
  const words = groups.map(g =>
    '<span class="recall-word">' +
    g.map(s => '<span class="recall-tile' + (s.hasBatchim ? ' batchim' : '') + '"></span>').join('') +
    '</span>'
  ).join('');
  return {
    html: '<div class="recall-tiles" aria-hidden="true">' + words + '</div>',
    note: recallOriginClass(ko)
  };
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
      if (tasteState.hi >= tasteState.hotter.length) {
        tasteState.mode = 'done';
        if (typeof checkQuestProgress === 'function') checkQuestProgress('taste', { count: 1 });
      }
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
const QUIZ_ART_FOLDER = 'quiz';

function deskQuizUrl() {
  if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-desk-quiz.json';
  return '/worlds/unit10-desk-quiz.json';
}

function loadDeskQuiz() {
  const url = deskQuizUrl();
  if (deskQuizBank && deskQuizBank._url === url) return Promise.resolve(deskQuizBank);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) d._url = url;
      deskQuizBank = d;
      return d;
    })
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

function deskQuizTitle(bank) {
  const ko = (bank && bank.titleKo) || '학습 책상';
  const en = (bank && bank.titleEn) || 'Quiz';
  return ko + ' · ' + en;
}

function openDeskQuiz() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  loadDeskQuiz().then(bank => {
    const qs = pickDeskSession(bank);
    deskQuizState = { i: 0, score: 0, locked: false, settled: false, qs, bank, gain: null };
    const title = $('desk-title');
    if (title) title.textContent = deskQuizTitle(bank);
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
  if (typeof checkQuestProgress === 'function') checkQuestProgress('desk', { count: 1 });
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
  const art = $('desk-art');
  if (art) { art.removeAttribute('src'); art.hidden = true; }
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
  const art = $('desk-art');
  if (art) {
    if (item.art && typeof artUrl === 'function') {
      art.src = artUrl(item.art);
      art.hidden = false;
    } else {
      art.removeAttribute('src');
      art.hidden = true;
    }
  }
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

// ═══════════════ STUDY DESK · MODE CHOOSER ═══════════════════════════════════
// The desk used to open the quiz and nothing else. The textbook ships both a
// multiple-choice bank and written exercises, and they train different things —
// recognising the right answer among four, versus choosing an expression and
// putting it in the form the sentence needs. So the desk now asks which.
//
// Only Unit 14 has a workbook page so far. Rather than show a menu with one
// live row and one dead one, a desk with a single mode opens it directly.

let workbookBank = null;
let workbookState = null;
let deskMenuOptions = [];
let deskMenuIndex = 0;

function workbookUrl() {
  if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-workbook.json';
  if (typeof isUnit10World === 'function' && isUnit10World()) return '/worlds/unit10-workbook.json';
  return null;
}

function loadWorkbook() {
  const url = workbookUrl();
  if (!url) return Promise.resolve(null);
  if (workbookBank && workbookBank._url === url) return Promise.resolve(workbookBank);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) d._url = url;
      workbookBank = d;
      return d;
    })
    .catch(() => null);
}

function openStudyDesk() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  loadWorkbook().then(wb => {
    const exercises = (wb && wb.exercises) || [];
    deskMenuOptions = [
      { key: 'quiz', icon: '📝', ko: '퀴즈', en: 'Multiple choice', run: openDeskQuiz }
    ];
    if (exercises.length) {
      deskMenuOptions.push({
        key: 'workbook', icon: '✍️', ko: '연습 문제',
        en: 'Workbook — build the sentences',
        run: () => openWorkbook(wb)
      });
    }
    if (deskMenuOptions.length === 1) { deskMenuOptions[0].run(); return; }
    deskMenuIndex = 0;
    renderDeskMenu();
    setModalState('desk-menu-overlay', true);
  });
}

function closeDeskMenu() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('desk-menu-overlay', false);
}

function renderDeskMenu() {
  const box = $('desk-menu-list');
  if (!box) return;
  box.innerHTML = '';
  deskMenuOptions.forEach((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'desk-mode' + (i === deskMenuIndex ? ' focus' : '');
    b.setAttribute('data-mode', opt.key);
    b.innerHTML =
      '<span class="desk-mode-key">' + (i + 1) + '</span>' +
      '<span class="desk-mode-icon">' + vbEsc(opt.icon) + '</span>' +
      '<span class="desk-mode-text">' +
        '<span class="desk-mode-ko">' + vbEsc(opt.ko) + '</span>' +
        '<span class="desk-mode-en">' + vbEsc(opt.en) + '</span>' +
      '</span>';
    b.onclick = () => runDeskMode(i);
    box.appendChild(b);
  });
}

function runDeskMode(i) {
  const opt = deskMenuOptions[i];
  if (!opt) return;
  setModalState('desk-menu-overlay', false);
  opt.run();
}

// ═══════════════ STUDY DESK · WORKBOOK ═══════════════════════════════════════
// 어휘 연습 1 from Unit 14: five expressions in a box, one spent on the worked
// example, four sentences to complete. Each expression is used exactly once,
// which is what the textbook's circled example establishes.
//
// The learner picks the dictionary form and the blank fills with the 해요 form,
// because the exercise is really two skills at once — choosing the right piece
// of etiquette, and conjugating it — and Korean conjugation here is irregular
// (마시다 → 마셔요, 하다 → 해요). Deriving it would be guesswork, so both forms
// are carried in the data and the conjugation is explained rather than hidden.

// All three exercises reduce to the same act: assign one of N bank entries to
// each of M slots. 연습 1 fills a sentence ending, 연습 3 fills a blank inside a
// line of dialogue, and 연습 2 joins a left-hand phrase to a right-hand one —
// which is the same thing with the bank drawn as a second column. So one state
// shape and one set of controls serve all of them, and `type` only decides how a
// row is drawn.
//
// The page opens on a list rather than on an exercise, because three exercises
// stacked in one scroll is the wall of text this is meant to avoid. One 연습 per
// sitting, and the list is where you come back to.
function openWorkbook(bank) {
  if (!bank || !(bank.exercises || []).length) return;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  workbookState = { bank: bank, mode: 'pick', ex: null, pick: 0 };
  renderWorkbook();
  setModalState('workbook-overlay', true);
}

function openWorkbookExercise(id) {
  const st = workbookState;
  if (!st) return;
  const ex = (st.bank.exercises || []).find(e => e.id === id);
  if (!ex) return;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  // One exercise's recording has nothing to say over another's.
  if (!st.ex || st.ex.id !== ex.id) wbStopTrack();
  st.mode = 'exercise';
  st.ex = ex;
  st.chips = (ex.bank || []).filter(c => !c.usedByExample);
  st.fill = new Array((ex.items || []).length).fill(null);
  // 'build' can put a second blank in the same script, because the book drills
  // 해도 돼요? and -면 안 돼요 as one exchange and marking only half of it would
  // be marking half the exercise.
  st.fill2 = new Array((ex.items || []).length).fill(null);
  // 'experience' offers its choices per question rather than from one shared box,
  // because the point is whether you know 듣다 → 들은 rather than which of six
  // phrases is left over. `own` holds the 있어요/없어요 answer: it is the
  // learner's own experience, so it is required but never marked wrong.
  st.own = new Array((ex.items || []).length).fill(null);
  st.focus = 0;
  st.checked = false;
  st.score = 0;
  st.gain = null;
  renderWorkbook();
}

function backToWorkbookList() {
  const st = workbookState;
  if (!st) return;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  wbStopTrack();
  st.mode = 'pick';
  st.ex = null;
  st.checked = false;
  renderWorkbook();
}

function closeWorkbook() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  wbStopTrack();
  workbookState = null;
  setModalState('workbook-overlay', false);
}

// What a bank entry is called in the bank, and what it reads as once placed.
// 연습 1 is the only one where those differ: you pick a dictionary form and the
// sentence needs the 해요 form.
function wbChipText(chip) {
  if (!chip) return '';
  if (chip.dict) return chip.dict;
  return (chip.mark ? chip.mark + ' ' : '') + (chip.ko || '');
}
function wbAnswerText(chip) {
  if (!chip) return '';
  return chip.polite || chip.ko || '';
}

// The page has two screens now, and only one of them has slots and a bank.
// Everything that touches them goes through this, so a stray key press on the
// exercise list cannot reach into state that does not exist yet.
function wbInExercise() {
  const st = workbookState;
  return !!(st && st.mode === 'exercise' && st.ex && st.fill);
}

// The two types whose choices hang off each question rather than one shared box.
// They share a row shape — the picture, the dictionary phrase, the sentence being
// built and the buttons that build it — and differ only in what the buttons are
// for, so everything that draws or drives that shape asks this rather than
// naming one type.
function wbPerItem(ex) {
  return !!ex && (ex.type === 'experience' || ex.type === 'build');
}

// How many blanks one question has. Nothing assumes one per row, because a
// 'build' row can carry two and the score would be out of the wrong total.
function wbSlots(item) {
  return (item && item.choices2) ? 2 : 1;
}
function wbSlotTotal(ex) {
  return (ex && ex.items || []).reduce((n, it) => n + wbSlots(it), 0);
}

function wbChip(id, item) {
  if (!wbInExercise()) return null;
  const st = workbookState;
  if (wbPerItem(st.ex)) {
    if (item) {
      return (item.choices || []).concat(item.choices2 || []).find(c => c.id === id) || null;
    }
    const all = (st.ex.items || []).flatMap(it => (it.choices || []).concat(it.choices2 || []));
    return all.find(c => c.id === id) || null;
  }
  return st.chips.find(c => c.id === id) || (st.ex.bank || []).find(c => c.id === id) || null;
}

// One question's choices are its own, so picking does not disturb any other row.
// `slot` is 2 for the second blank on a row that has one; anything else is the
// first, which is what every caller that predates two-blank rows passes.
function wbPickChoice(i, id, slot) {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  const item = (st.ex.items || [])[i];
  if (!item) return;
  const second = slot === 2;
  const list = (second ? item.choices2 : item.choices) || [];
  if (!list.some(c => c.id === id)) return;
  if (second) st.fill2[i] = id; else st.fill[i] = id;
  st.focus = i;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderWorkbook();
}

// Never scored. A learner who has not been to Russia is not wrong.
function wbSetOwn(i, val) {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  if (val !== 'yes' && val !== 'no') return;
  st.own[i] = val;
  st.focus = i;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderWorkbook();
}

function wbOwnLabel(ex, val) {
  const labels = (ex && ex.ownLabels) || { yes: '있어요', no: '없어요' };
  return val === 'yes' ? labels.yes : (val === 'no' ? labels.no : '');
}

// A page is finished when every blank on it has something in it. On the
// 'experience' page that includes the 있어요/없어요 ending, which is required
// even though the score never counts it.
function wbComplete() {
  const st = workbookState;
  if (!wbInExercise()) return false;
  if (st.fill.some(v => !v)) return false;
  if ((st.ex.items || []).some((it, i) => wbSlots(it) === 2 && !st.fill2[i])) return false;
  if (st.ex.type === 'experience' && st.own.some(v => !v)) return false;
  return true;
}

function wbFilledCount() {
  if (!wbInExercise()) return 0;
  const st = workbookState;
  return (st.ex.items || []).reduce((n, it, i) =>
    n + (st.fill[i] ? 1 : 0) + (wbSlots(it) === 2 && st.fill2[i] ? 1 : 0), 0);
}

function wbFocusBlank(i) {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  if (i < 0 || i >= st.fill.length) return;
  st.focus = i;
  renderWorkbook();
}

// One chip per blank. Picking a chip that is already placed moves it rather than
// duplicating it, which is what makes the puzzle self-correcting instead of
// letting the same expression answer two sentences.
function wbPickChip(id) {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  const at = st.fill.indexOf(id);
  if (at >= 0) st.fill[at] = null;
  st.fill[st.focus] = id;
  const next = st.fill.findIndex(v => !v);
  if (next >= 0) st.focus = next;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderWorkbook();
}

function wbClearBlank(i) {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  const at = (i === undefined) ? st.focus : i;
  if (!st.fill[at]) return;
  st.fill[at] = null;
  st.focus = at;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderWorkbook();
}

function wbMoveFocus(delta) {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  const n = st.fill.length;
  st.focus = ((st.focus + delta) % n + n) % n;
  renderWorkbook();
}

function checkWorkbook() {
  const st = workbookState;
  if (!wbInExercise() || st.checked) return;
  if (!wbComplete()) return;
  st.checked = true;
  const items = st.ex.items || [];
  const total = wbSlotTotal(st.ex);
  st.score = items.reduce((n, item, i) => {
    let got = st.fill[i] === item.answer ? 1 : 0;
    if (wbSlots(item) === 2 && st.fill2[i] === item.answer2) got += 1;
    return n + got;
  }, 0);
  if (typeof playChiptuneSFX === 'function') {
    playChiptuneSFX(st.score === total ? 'complete' : 'quiz_wrong');
  }
  // Scored the same way the desk quiz is, so one desk does not pay better than
  // the other for the same amount of work.
  if (typeof ensurePlayerRank === 'function') ensurePlayerRank();
  if (typeof studySessionXp === 'function' && typeof addPlayerXp === 'function') {
    const xp = studySessionXp(st.score, total);
    const after = addPlayerXp(xp);
    st.gain = { xp: xp, leveled: after.leveled, level: after.level };
    if (st.score === total && typeof addHonor === 'function') addHonor(2);
    if (typeof persistSave === 'function') persistSave();
    if (typeof updateRankHUD === 'function') updateRankHUD();
  }
  if (typeof checkQuestProgress === 'function') checkQuestProgress('desk', { count: 1 });
  renderWorkbook();
}

function resetWorkbook() {
  const st = workbookState;
  if (!wbInExercise()) return;
  st.fill = new Array((st.ex.items || []).length).fill(null);
  st.fill2 = new Array((st.ex.items || []).length).fill(null);
  st.own = new Array((st.ex.items || []).length).fill(null);
  st.focus = 0;
  st.checked = false;
  st.score = 0;
  st.gain = null;
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderWorkbook();
}

// The sentence a completed row reads as, which is also what the explanation
// card has to print. Each type assembles it differently, so it lives in one
// place rather than being spelled out twice per type.
function wbLineHtml(ex, item, chipText, opts) {
  const o = opts || {};
  const mkBlank = (text) => (o.plain
    ? '<b>' + vbEsc(text) + '</b>'
    : (text
        ? '<b class="wb-blank filled">' + vbEsc(text) + '</b>'
        : '<span class="wb-blank empty">&nbsp;</span>'));
  const blank = mkBlank(chipText);
  // Two types draw a script: 'build' picks from choices on the row, 'dialogue'
  // from the shared box. What they print is identical, so it is written once.
  if (ex.type === 'build' || ex.type === 'dialogue') {
    // The lines are a little script and the gaps are filled left to right across
    // all of it, so a second blank in B's line is simply the next one along.
    // Speaker chips are optional: 연습 3 rewrites a sentence and has nobody
    // saying it.
    const texts = [chipText || '', o.second || ''];
    let slot = 0;
    return (item.lines || []).map((line) => {
      const parts = String(line.ko || '').split('{}');
      let html = vbEsc(parts[0] || '');
      for (let k = 1; k < parts.length; k++) {
        html += mkBlank(texts[slot++]) + vbEsc(parts[k] || '');
      }
      // A speaker is usually one letter — A, B, T, S — and the chip is a 19px box
      // sized for exactly that, at 8px type. Unit 10's 연습 5 keeps the names the
      // book prints on its lines, 정우 and 스티븐, and three syllables at 8px are
      // unreadable, so a label longer than one character says so and is given a
      // box that fits it.
      return line.who
        ? '<div class="wb-dlg"><span class="wb-spk"' +
            (line.who.length > 1 ? ' data-name="1"' : '') + '>' + vbEsc(line.who) + '</span>' +
            '<span class="wb-line">' + html + '</span></div>'
        : '<div class="wb-line-solo">' + html + '</div>';
    }).join('');
  }
  if (ex.type === 'match') {
    // The left side is a phrase, or a picture where the picture is the prompt —
    // Unit 10 matches a bowl of food to its name, and printing the name there
    // too would answer the row.
    const left = item.img
      ? '<img class="wb-photo" src="/' + vbEsc(item.img) + '" alt="" loading="lazy">'
      : vbEsc(item.stemKo);
    return '<span class="wb-left">' + left + '</span>' +
      '<span class="wb-join">→</span>' + blank;
  }
  if (ex.type === 'experience') {
    const own = o.own === undefined ? null : o.own;
    const ownText = wbOwnLabel(ex, own);
    const ownBlank = o.plain
      ? '<b>' + vbEsc(ownText) + '</b>'
      : (ownText
          ? '<b class="wb-blank filled own">' + vbEsc(ownText) + '</b>'
          : '<span class="wb-blank empty own">&nbsp;</span>');
    return ('저는 ' + vbEsc(item.stemKo) + ' ' + blank
      + ' 적이 ' + ownBlank + '.');
  }
  // A fill sentence usually ends in its blank, so the plain prompt gets one
  // appended. Where the gap is somewhere else — Unit 10's 이 식당은 __이/가
  // 좋아서… — the prompt marks it with {} instead.
  const stem = String(item.stemKo || '');
  if (stem.indexOf('{}') >= 0) {
    const parts = stem.split('{}');
    return vbEsc(parts[0] || '') + blank + vbEsc(parts.slice(1).join('') || '');
  }
  return vbEsc(stem) + ' ' + blank + '.';
}

// The book records these drills and a drill is meant to be heard, so an exercise
// can name a clip. It plays through the same mixer the voice clips use, so the
// volume slider and the ducking reach it like everything else — an <audio> left
// to itself would ignore both and talk over the music.
let wbTrack = null;

function wbStopTrack() {
  const t = wbTrack;
  wbTrack = null;
  if (!t) return;
  try { t.el.pause(); t.el.currentTime = 0; } catch (e) { /* stub or already gone */ }
  if (typeof AudioMixer !== 'undefined' && AudioMixer.voiceEnd) AudioMixer.voiceEnd();
}

// ── Dragging a name onto its blank ──────────────────────────────────────────
// Clicking a row and then a name still works, and is what the keyboard does.
// But dragging the name onto the picture is the gesture people reach for on a
// matching page, so both are wired to the same one-name-per-blank state.
//
// Pointer events rather than HTML5 drag-and-drop: the native API does not fire
// on a touchscreen at all. A drag only begins once the pointer has moved a few
// pixels, so a tap still lands on the click handlers that were already there.
let wbDrag = null;
let wbClickBlocked = false;
const WB_DRAG_SLOP = 5;

function wbDragClear() {
  if (!wbDrag) return;
  if (wbDrag.ghost) { try { wbDrag.ghost.remove(); } catch (e) { /* stub */ } }
  if (wbDrag.over && wbDrag.over.classList) wbDrag.over.classList.remove('drop');
  if (wbDrag.source && wbDrag.source.classList) wbDrag.source.classList.remove('dragging');
  wbDrag = null;
}

// The row under the pointer. elementFromPoint is the only way to know it: the
// ghost follows the cursor, so as far as the event system is concerned the
// pointer is never over the drop target.
function wbRowAt(x, y) {
  if (typeof document.elementFromPoint !== 'function') return null;
  let el = document.elementFromPoint(x, y);
  for (let hop = 0; el && hop < 8; hop++) {
    if (el.classList && el.classList.contains('wb-row')) return el;
    el = el.parentElement;
  }
  return null;
}

// `from` is the blank the name is being pulled out of, or -1 when it comes from
// the box. Dragging one off a picture and dropping it nowhere puts it back.
function wbDragBegin(e, id, from, source) {
  if (!wbInExercise() || workbookState.checked) return;
  if (!e || (e.button !== undefined && e.button > 0)) return;
  wbDragClear();
  wbDrag = { id, from, source, ghost: null, over: null,
    x0: e.clientX, y0: e.clientY, moved: false };
}

function wbDragMove(e) {
  if (!wbDrag) return;
  if (!wbDrag.moved) {
    if (Math.abs(e.clientX - wbDrag.x0) + Math.abs(e.clientY - wbDrag.y0) < WB_DRAG_SLOP) return;
    wbDrag.moved = true;
    const chip = wbChip(wbDrag.id);
    const g = document.createElement('div');
    g.className = 'wb-ghost';
    g.textContent = wbChipText(chip) || wbAnswerText(chip);
    document.body.appendChild(g);
    wbDrag.ghost = g;
    if (wbDrag.source && wbDrag.source.classList) wbDrag.source.classList.add('dragging');
  }
  if (wbDrag.ghost && wbDrag.ghost.style) {
    wbDrag.ghost.style.left = e.clientX + 'px';
    wbDrag.ghost.style.top = e.clientY + 'px';
  }
  const row = wbRowAt(e.clientX, e.clientY);
  if (row !== wbDrag.over) {
    if (wbDrag.over && wbDrag.over.classList) wbDrag.over.classList.remove('drop');
    if (row && row.classList) row.classList.add('drop');
    wbDrag.over = row;
  }
  if (e.preventDefault) e.preventDefault();
}

function wbDragEnd(e) {
  if (!wbDrag) return;
  const { moved, id, from } = wbDrag;
  const row = moved ? wbRowAt(e.clientX, e.clientY) : null;
  wbDragClear();
  if (!moved) return;                      // a tap — the click handler has it
  // The click that follows this pointerup would undo the drop, so it is dropped
  // instead. Cleared on the next tick, after that click has been and gone.
  wbClickBlocked = true;
  if (typeof setTimeout === 'function') setTimeout(() => { wbClickBlocked = false; }, 0);
  if (!wbInExercise() || workbookState.checked) return;
  if (row) {
    const at = Number(row.getAttribute('data-row'));
    if (at >= 0 && at < workbookState.fill.length) {
      workbookState.focus = at;
      wbPickChip(id);
      return;
    }
  }
  if (from >= 0) wbClearBlank(from);
}

// One name from the shared box. Built here rather than inline because the box
// sits above the rows on most types and beside them on a picture match, and both
// want the same button.
function wbChipButton(c, i) {
  const st = workbookState;
  const used = st.fill.indexOf(c.id) >= 0;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'wb-chip' + (used ? ' used' : '');
  b.setAttribute('data-chip', c.id);
  b.disabled = st.checked;
  b.innerHTML = '<span class="wb-chip-key">' + (i + 1) + '</span>' + vbEsc(wbChipText(c));
  b.onclick = () => { if (!wbClickBlocked) wbPickChip(c.id); };
  b.onpointerdown = (e) => wbDragBegin(e, c.id, -1, b);
  return b;
}

// A build script with its gaps filled in, as one line of speech.
function wbScriptText(lines, texts) {
  let slot = 0;
  return (lines || []).map((l) => {
    const parts = String(l.ko || '').split('{}');
    let s = parts[0] || '';
    for (let k = 1; k < parts.length; k++) s += (texts[slot++] || '') + (parts[k] || '');
    return s;
  }).join(' ');
}

// What a row sounds like when there is no recording for it and the browser's own
// voice has to stand in: the whole exchange with the right answers in it, which
// is what the recording plays where there is one. A row with nothing in the gaps
// yet would otherwise read a half-built sentence aloud, so the correct forms go
// in whether or not the page has been checked.
function wbRowSpeech(ex, item) {
  if (!item || ex.type !== 'build') return '';
  return wbScriptText(item.lines, [
    wbAnswerText(wbChip(item.answer, item)),
    wbSlots(item) === 2 ? wbAnswerText(wbChip(item.answer2, item)) : ''
  ]);
}

// The book's recording of one exchange, played whole: the teacher's question,
// then the model answer. It used to stop at the question until the row had been
// checked, on the reasoning that hearing the answer first gives the row away —
// but this is a listen-and-repeat drill, and the model is the thing you are
// meant to copy. The choices are on screen either way.
function wbPlayClip(clip) {
  wbStopTrack();
  let el = null;
  try { el = new Audio('/' + clip.src); } catch (e) { return false; }
  wbTrack = { el: el, src: clip.src };
  try {
    if (typeof AudioMixer !== 'undefined') {
      if (AudioMixer.voiceLevel) el.volume = AudioMixer.voiceLevel();
      if (AudioMixer.voiceStart) AudioMixer.voiceStart();
    }
    el.onended = () => { if (wbTrack && wbTrack.el === el) wbStopTrack(); };
    el.onerror = () => { if (wbTrack && wbTrack.el === el) wbStopTrack(); };
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => wbStopTrack());
    return true;
  } catch (e) { wbStopTrack(); return false; }
}

// One 🔊 for anything with Korean worth hearing. The book's own recording where
// the content names one, and speakKorean otherwise — which plays a pre-rendered
// clip where there is one and falls back to the browser's voice, so a row is
// never left silent.
function wbSayButton(text, clip) {
  const hasClip = !!(clip && clip.src && typeof Audio === 'function');
  if (!hasClip && (!text || typeof speakKorean !== 'function')) return null;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'wb-say' + (hasClip ? ' book' : '');
  b.title = hasClip ? '들어 보기 (책 녹음)' : '들어 보기';
  b.setAttribute('aria-label', 'Listen');
  b.textContent = '🔊';
  b.onclick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (hasClip && wbPlayClip(clip)) return;
    if (text && typeof speakKorean === 'function') speakKorean(text, { force: true });
  };
  return b;
}

function renderWorkbook() {
  const st = workbookState;
  if (!st) return;
  if (st.mode === 'pick') { renderWorkbookPicker(); return; }

  const ex = st.ex;
  const items = ex.items || [];

  const title = $('wb-title');
  if (title) title.textContent = (ex.section || '') + ' · ' + (ex.no || '');
  const sub = $('wb-sub');
  // 문법과 표현 numbers its exercises per grammar point, so three of them are
  // called 연습 1. The pattern is what actually tells them apart.
  if (sub) {
    sub.textContent = ex.pattern
      ? ex.pattern + ' · ' + (ex.sectionEn || '')
      : (ex.sectionEn || '') + ' — ' + (st.bank.titleEn || 'Workbook');
  }
  const count = $('wb-count');
  if (count) {
    const total = wbSlotTotal(ex);
    count.textContent = st.checked
      ? (st.score + ' / ' + total)
      : (wbFilledCount() + ' / ' + total);
    count.className = st.checked ? (st.score === total ? 'wb-count-all' : 'wb-count-some') : '';
  }

  const inst = $('wb-instruction');
  if (inst) {
    inst.innerHTML =
      '<div class="wb-inst-ko">' + vbEsc(ex.instructionKo || '') + '</div>' +
      '<div class="wb-inst-en">' + vbEsc(ex.instructionEn || '') + '</div>' +
      (ex.noteEn ? '<div class="wb-inst-note">' + vbEsc(ex.noteEn) + '</div>' : '');
  }

  const exBox = $('wb-example');
  if (exBox) {
    if (!ex.example) { exBox.innerHTML = ''; exBox.className = 'wb-hidden'; }
    else {
      exBox.className = '';
      // A 'build' example has no shared box to borrow from, so it carries the
      // finished text itself.
      const filled = ex.type === 'build'
        ? (ex.example.answerKo || '')
        : wbAnswerText(wbChip(ex.example.answer));
      exBox.innerHTML =
        '<span class="wb-example-tag">[보기]</span> ' +
        wbLineHtml(ex, ex.example, filled,
          { plain: true, second: ex.example.answer2Ko || '' }) +
        '<div class="wb-example-en">' + vbEsc(ex.example.en || '') + '</div>';
      // The worked example is the one place the finished Korean is already on
      // screen, so hearing it gives nothing away.
      if (ex.type === 'build') {
        // The worked example is played whole: its answer is already printed
        // above the button, so there is nothing left to give away.
        const say = wbSayButton(wbScriptText(ex.example.lines,
          [ex.example.answerKo || '', ex.example.answer2Ko || '']), ex.example.audio);
        if (say) exBox.appendChild(say);
      }
    }
  }

  // A match exercise whose prompts are pictures is drawn as the book draws it:
  // two columns, pictures down one side and names down the other. Stacking the
  // names above the pictures instead — which is what every other type does —
  // read as two unrelated lists.
  const paired = ex.type === 'match' && items.some(it => it.img);

  const bank = $('wb-bank');
  if (bank && (wbPerItem(ex) || paired)) {
    // Choices live on each row, or in the second column. Either way a shared
    // box above them would be an empty strip.
    bank.innerHTML = '';
    bank.className = 'wb-hidden';
  } else if (bank) {
    bank.innerHTML = '';
    bank.className = 'wb-bank-' + (ex.type || 'fill');
    st.chips.forEach((c, i) => bank.appendChild(wbChipButton(c, i)));
  }

  const list = $('wb-items');
  if (list) {
    list.innerHTML = '';
    list.className = 'wb-items-' + (ex.type || 'fill') + (paired ? ' wb-paired' : '');
    // The picture rows go in the left column and the names in the right one, so
    // rows are appended to a column rather than straight to the list.
    let target = list;
    let names = null;
    if (paired) {
      const cols = document.createElement('div');
      cols.className = 'wb-cols';
      target = document.createElement('div');
      target.className = 'wb-col';
      names = document.createElement('div');
      names.className = 'wb-col wb-names';
      cols.appendChild(target);
      cols.appendChild(names);
      list.appendChild(cols);
      st.chips.forEach((c, i) => names.appendChild(wbChipButton(c, i)));
    }
    items.forEach((item, i) => {
      const chosen = st.fill[i];
      const chip = chosen ? wbChip(chosen, item) : null;
      // A two-blank row is right only when both halves are: the book asks for the
      // pair, and half a pair is not the answer to it.
      const allRight = chosen === item.answer
        && (wbSlots(item) < 2 || st.fill2[i] === item.answer2);
      const right = st.checked && allRight;
      const wrong = st.checked && !allRight;
      const row = document.createElement('div');
      row.className = 'wb-row'
        + (item.img ? ' photo' : '')
        + (!st.checked && i === st.focus ? ' focus' : '')
        + (right ? ' ok' : '') + (wrong ? ' bad' : '');

      if (wbPerItem(ex)) {
        // Its own row shape: the picture and the dictionary phrase name the task,
        // the sentence shows what has been built so far, and the buttons below
        // are the decisions that build it — left to right, in the order the
        // blanks appear, with the ungraded 있어요/없어요 last where there is one.
        //
        // Built as elements rather than one innerHTML string and a querySelector
        // to fish the button container back out. The container is needed as an
        // object either way, so writing it as markup first only to look it up
        // again is a round trip through the parser for nothing.
        const art = (typeof workbookIconSvg === 'function' && item.art)
          ? workbookIconSvg(item.art, 4) : '';
        const num = document.createElement('span');
        num.className = 'wb-n';
        num.textContent = item.n + ')';
        const exp = document.createElement('div');
        exp.className = 'wb-exp';
        const head = document.createElement('div');
        head.className = 'wb-exp-head';
        head.innerHTML = art +
          '<span class="wb-exp-phrase">' + vbEsc(item.phraseKo || '') + '</span>' +
          '<span class="wb-exp-en">' + vbEsc(item.en || '') + '</span>';
        const say = wbSayButton(wbRowSpeech(ex, item), item.audio);
        if (say) head.appendChild(say);
        const line = document.createElement('div');
        line.className = 'wb-exp-line';
        const chip2 = st.fill2[i] ? wbChip(st.fill2[i], item) : null;
        line.innerHTML = wbLineHtml(ex, item, chip ? wbAnswerText(chip) : '',
          { own: st.own[i], second: chip2 ? wbAnswerText(chip2) : '' });
        const picks = document.createElement('div');
        picks.className = 'wb-exp-picks';
        exp.appendChild(head);
        exp.appendChild(line);
        exp.appendChild(picks);
        row.appendChild(num);
        row.appendChild(exp);
        if (st.checked) {
          const mark = document.createElement('span');
          mark.className = 'wb-mark';
          mark.textContent = right ? '✓' : '✕';
          row.appendChild(mark);
        }
        // The number key on a button is its position in the whole row, so the
        // keyboard and the mouse agree on what "3" means even when the row has
        // two groups of buttons on it.
        let key = 0;
        const rule = () => {
          const sep = document.createElement('span');
          sep.className = 'wb-exp-sep';
          picks.appendChild(sep);
        };
        const addForms = (list, slot) => {
          const picked = slot === 2 ? st.fill2[i] : chosen;
          const answer = slot === 2 ? item.answer2 : item.answer;
          (list || []).forEach((c) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wb-pick-form'
              + (picked === c.id ? ' on' : '')
              + (st.checked && c.id === answer ? ' key' : '');
            b.disabled = st.checked;
            b.innerHTML = '<span class="wb-chip-key">' + (++key) + '</span>' + vbEsc(c.ko);
            b.onclick = () => wbPickChoice(i, c.id, slot);
            picks.appendChild(b);
          });
        };
        if (wbSlots(item) === 2) {
          // Six buttons in one wrapping strip, with nothing but a hairline
          // between the two halves, left it to the learner to work out which
          // group filled which blank. Each group now sits on its own line under
          // the speaker chip of the line it fills — the same A and B chips as
          // the script directly above it.
          const gapWho = [];
          (item.lines || []).forEach((l) => {
            const n = String(l.ko || '').split('{}').length - 1;
            for (let g = 0; g < n; g++) gapWho.push(l.who || '');
          });
          // Both gaps can land in the same line — Unit 10 builds the whole of
          // A's question — and then the speaker is the same on both groups and
          // names nothing. Where that happens the tag carries which blank it
          // fills as well, so the two are told apart by the slot rather than by
          // who is speaking.
          const oneLine = gapWho[0] === gapWho[1];
          const tag = (who, k) => {
            // A line with nobody speaking it — the rewrite pages — has no chip to
            // borrow, and numbering the groups on their own would read as the key
            // badges on the buttons beside them. The break alone orders those.
            if (!who) return;
            const t = document.createElement('span');
            t.className = 'wb-picks-tag';
            if (who.length > 1) t.setAttribute('data-name', '1');
            t.textContent = oneLine ? who + (k + 1) : who;
            picks.appendChild(t);
          };
          tag(gapWho[0], 0);
          addForms(item.choices, 1);
          const brk = document.createElement('i');
          brk.className = 'wb-picks-break';
          picks.appendChild(brk);
          tag(gapWho[1], 1);
          addForms(item.choices2, 2);
        } else {
          addForms(item.choices, 1);
        }
        if (ex.type === 'experience') {
          rule();
          ['yes', 'no'].forEach((val) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wb-pick-own' + (st.own[i] === val ? ' on' : '');
            b.disabled = st.checked;
            b.innerHTML = '<span class="wb-chip-key">' + (++key) + '</span>'
              + vbEsc(wbOwnLabel(ex, val));
            b.onclick = () => wbSetOwn(i, val);
            picks.appendChild(b);
          });
        }
        if (!st.checked) {
          row.onclick = (e) => { if (e.target === row) wbFocusBlank(i); };
        }
        list.appendChild(row);
        return;
      }

      row.innerHTML =
        '<span class="wb-n">' + item.n + ')</span>' +
        '<span class="wb-sentence">' + wbLineHtml(ex, item, chip ? wbAnswerText(chip) : '') + '</span>' +
        (st.checked ? '<span class="wb-mark">' + (right ? '✓' : '✕') + '</span>' : '');
      row.setAttribute('data-row', i);
      if (!st.checked) {
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.onclick = () => {
          if (wbClickBlocked) return;
          if (chosen) wbClearBlank(i); else wbFocusBlank(i);
        };
        row.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wbFocusBlank(i); }
        };
        // A name already on a picture can be pulled off it and dropped on
        // another, or dropped on nothing to send it back to the box.
        if (chosen) row.onpointerdown = (e) => wbDragBegin(e, chosen, i, row);
      }
      target.appendChild(row);
    });
  }

  const explain = $('wb-explain');
  if (explain) {
    if (!st.checked) { explain.innerHTML = ''; explain.className = ''; }
    else {
      explain.className = 'shown';
      explain.innerHTML = items.map((item, i) => {
        const two = wbSlots(item) === 2;
        const correct = wbChip(item.answer, item);
        const correct2 = two ? wbChip(item.answer2, item) : null;
        const chosen = st.fill[i] ? wbChip(st.fill[i], item) : null;
        const chosen2 = two && st.fill2[i] ? wbChip(st.fill2[i], item) : null;
        const ok = st.fill[i] === item.answer && (!two || st.fill2[i] === item.answer2);
        // Both halves of a two-blank row are reported, right one included, so the
        // learner can see which half went wrong rather than just that one did.
        const yours = (two ? [chosen, chosen2] : [chosen])
          .map(c => (c ? wbAnswerText(c) : '—')).join(' / ');
        return '<div class="wb-why' + (ok ? ' ok' : ' bad') + '">' +
          '<div class="wb-why-head">' + item.n + ') ' + (ok ? '✓' : '✕') + ' ' +
            wbLineHtml(ex, item, wbAnswerText(correct),
              { plain: true, own: st.own && st.own[i],
                second: correct2 ? wbAnswerText(correct2) : '' }) + '</div>' +
          (ok ? '' : '<div class="wb-why-yours">You put: ' + vbEsc(yours) + '</div>') +
          '<div class="wb-why-en">' + vbEsc(item.en || '') + '</div>' +
          '<div class="wb-why-body">' + vbEsc(item.why || '') + '</div>' +
          '<div class="wb-why-gram">📐 ' + vbEsc(item.grammar || '') + '</div>' +
        '</div>';
      }).join('');
    }
  }

  const hint = $('wb-hint');
  if (hint) {
    hint.textContent = st.checked
      ? (st.gain ? '+' + st.gain.xp + ' XP' : '')
      : (st.bank.hintKo || '');
  }
  const back = $('wb-back');
  if (back) {
    back.textContent = '← ' + (st.bank.backKo || '연습 목록');
    back.onclick = backToWorkbookList;
    back.className = '';
  }
  const btn = $('wb-check');
  if (btn) {
    btn.className = '';
    if (st.checked) {
      btn.textContent = st.bank.againKo || '다시 풀기';
      btn.onclick = resetWorkbook;
      btn.disabled = false;
    } else {
      btn.textContent = (st.bank.checkKo || '확인') + ' ' + (st.bank.checkEn || 'Check');
      btn.onclick = checkWorkbook;
      btn.disabled = !wbComplete();
    }
  }
}

// One exercise per sitting. The list is the page you land on and the page you
// return to, so nothing ever shows three exercises at once.
function renderWorkbookPicker() {
  const st = workbookState;
  if (!st) return;
  const exercises = st.bank.exercises || [];

  const title = $('wb-title');
  if (title) title.textContent = st.bank.titleKo || '연습 문제';
  const sub = $('wb-sub');
  if (sub) sub.textContent = st.bank.source || st.bank.titleEn || '';
  const count = $('wb-count');
  if (count) { count.textContent = exercises.length + ' 연습'; count.className = ''; }

  const inst = $('wb-instruction');
  if (inst) {
    inst.innerHTML =
      '<div class="wb-inst-ko">' + vbEsc(st.bank.pickKo || '어떤 연습을 할까요?') + '</div>' +
      '<div class="wb-inst-en">' + vbEsc(st.bank.pickEn || '') + '</div>';
  }
  const exBox = $('wb-example');
  if (exBox) { exBox.innerHTML = ''; exBox.className = 'wb-hidden'; }
  const bank = $('wb-bank');
  if (bank) { bank.innerHTML = ''; bank.className = 'wb-hidden'; }
  const explain = $('wb-explain');
  if (explain) { explain.innerHTML = ''; explain.className = ''; }

  const list = $('wb-items');
  if (list) {
    list.innerHTML = '';
    list.className = 'wb-items-pick';
    // Nine rows in one flat column is a wall. They already fall into 어휘 and
    // 문법과 표현, so the list says so and the reader sees three plus six rather
    // than nine of the same thing.
    let group = null;
    exercises.forEach((ex, i) => {
      if ((ex.section || '') !== group) {
        group = ex.section || '';
        const h = document.createElement('div');
        h.className = 'wb-group';
        h.innerHTML = '<span class="wb-group-ko">' + vbEsc(group) + '</span>' +
          '<span class="wb-group-en">' + vbEsc(ex.sectionEn || '') + '</span>';
        list.appendChild(h);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wb-pick' + (i === st.pick ? ' focus' : '');
      b.setAttribute('data-exercise', ex.id);
      // What goes big is what tells the rows apart. The Korean instruction is
      // not it: three exercises print the identical 그림을 보고 [보기]와 같이
      // 대화를 만들어 보세요, so as a headline it made the list read as the same
      // row repeated. The grammar point does tell them apart, so that is the
      // headline, and the instruction waits until the exercise is open — which
      // is the only place it is any use anyway.
      b.innerHTML =
        '<span class="wb-pick-key">' + (i < 9 ? i + 1 : (i === 9 ? 0 : '')) + '</span>' +
        '<span class="wb-pick-icon">' + vbEsc(ex.icon || '📝') + '</span>' +
        '<span class="wb-pick-text">' +
          '<span class="wb-pick-title">' +
            (ex.pattern
              ? '<b class="wb-pick-pat">' + vbEsc(ex.pattern) + '</b>' +
                '<span class="wb-pick-no">' + vbEsc(ex.no || '') + '</span>'
              : '<b class="wb-pick-name">' + vbEsc(ex.no || '') + '</b>') +
          '</span>' +
          '<span class="wb-pick-en">' + vbEsc(ex.blurbEn || ex.instructionEn || '') + '</span>' +
        '</span>' +
        '<span class="wb-pick-count">' + ((ex.items || []).length) + '문항</span>';
      b.onclick = () => openWorkbookExercise(ex.id);
      list.appendChild(b);
    });
  }

  const hint = $('wb-hint');
  if (hint) hint.textContent = st.bank.hintKo || '';
  const back = $('wb-back');
  if (back) back.className = 'wb-hidden';
  const btn = $('wb-check');
  if (btn) { btn.className = 'wb-hidden'; btn.onclick = null; }
}

// Keyboard for both desk screens. Escape is deliberately left alone — the modal
// stack handler in this file already owns it, and handling it twice would close
// two overlays on one press.
// A drag is followed across the window rather than the chip, because the pointer
// leaves the chip the moment it starts moving.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pointermove', wbDragMove, { passive: false });
  window.addEventListener('pointerup', wbDragEnd);
  window.addEventListener('pointercancel', wbDragClear);
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return;
    const top = activeModalStack[activeModalStack.length - 1];

    if (top === 'desk-menu-overlay') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault(); deskMenuIndex = (deskMenuIndex + 1) % deskMenuOptions.length; renderDeskMenu();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        deskMenuIndex = (deskMenuIndex - 1 + deskMenuOptions.length) % deskMenuOptions.length;
        renderDeskMenu();
      } else if (e.key === 'Enter') {
        e.preventDefault(); runDeskMode(deskMenuIndex);
      } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault(); runDeskMode(Number(e.key) - 1);
      }
      return;
    }

    if (top !== 'workbook-overlay' || !workbookState) return;
    const st = workbookState;

    // The exercise list takes the same controls as the desk chooser, so the
    // whole page is one keyboard idiom: numbers pick, arrows move, Enter opens.
    if (st.mode === 'pick') {
      const n = (st.bank.exercises || []).length;
      if (!n) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault(); st.pick = (st.pick + 1) % n; renderWorkbook();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault(); st.pick = (st.pick - 1 + n) % n; renderWorkbook();
      } else if (e.key === 'Enter') {
        e.preventDefault(); openWorkbookExercise(st.bank.exercises[st.pick].id);
      } else if (/^[0-9]$/.test(e.key)) {
        // 1-9 are the first nine rows and 0 is the tenth, the way a keypad runs
        // out. Beyond ten the arrows are the way in, and the badge on a row
        // without a key is left blank rather than promising one.
        const num = Number(e.key);
        const ex = st.bank.exercises[num === 0 ? 9 : num - 1];
        if (ex) { e.preventDefault(); openWorkbookExercise(ex.id); }
      }
      return;
    }

    // Backspace on the first blank with nothing to clear is the natural
    // "go back" gesture, but it would be a surprise mid-exercise, so the list
    // is reached with the button or Esc-then-reopen instead.
    if (e.key === 'Enter') {
      e.preventDefault();
      if (st.checked) resetWorkbook(); else checkWorkbook();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); wbMoveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); wbMoveFocus(-1);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault(); wbClearBlank();
    } else if (/^[1-9]$/.test(e.key)) {
      const num = Number(e.key);
      if (wbPerItem(st.ex)) {
        // Same idiom as everywhere else: numbers pick things in the focused row,
        // counting left to right across every button on it — the first blank's
        // forms, then the second blank's, then 있어요 and 없어요.
        const item = (st.ex.items || [])[st.focus];
        if (!item) return;
        const first = item.choices || [];
        if (num <= first.length) {
          e.preventDefault(); wbPickChoice(st.focus, first[num - 1].id, 1); return;
        }
        const second = item.choices2 || [];
        if (num <= first.length + second.length) {
          e.preventDefault();
          wbPickChoice(st.focus, second[num - first.length - 1].id, 2);
          return;
        }
        if (st.ex.type === 'experience') {
          const base = first.length + second.length;
          if (num === base + 1) { e.preventDefault(); wbSetOwn(st.focus, 'yes'); }
          else if (num === base + 2) { e.preventDefault(); wbSetOwn(st.focus, 'no'); }
        }
        return;
      }
      const chip = st.chips[num - 1];
      if (chip) { e.preventDefault(); wbPickChip(chip.id); }
    }
  });
}

if (typeof window !== 'undefined') {
  window.openDeskQuiz = openDeskQuiz;
  window.closeDeskQuiz = closeDeskQuiz;
  window.openStudyDesk = openStudyDesk;
  window.closeDeskMenu = closeDeskMenu;
  window.openWorkbook = openWorkbook;
  window.openWorkbookExercise = openWorkbookExercise;
  window.backToWorkbookList = backToWorkbookList;
  window.closeWorkbook = closeWorkbook;
  window.checkWorkbook = checkWorkbook;
  window.wbPickChoice = wbPickChoice;
  window.wbSetOwn = wbSetOwn;
  window.wbComplete = wbComplete;
  window.resetWorkbook = resetWorkbook;
  window.openRankCard = openRankCard;
  window.closeRankCard = closeRankCard;
  window.closeRankUp = closeRankUp;
}

// Word text reaches innerHTML from levels.json. Escaping keeps a bad string a wrong
// label rather than markup.
function vbEsc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Headwords run from one syllable to a 13-character idiom, and a single font size cannot
// serve both: sized for the idiom the common 3-syllable word is tiny, sized for the word
// the idiom overflows. Three steps, picked off the headword's own length.
function vbKoSizeClass(ko) {
  const n = String(ko || '').replace(/\s+/g, '').length;
  if (n >= 8) return ' vc-ko-xs';
  if (n >= 6) return ' vc-ko-sm';
  return '';
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

  vocabCountEl.textContent = words.length === lvl.words.length
    ? `${words.length} words`
    : `${words.length} of ${lvl.words.length} words`;
  vocabGrid.innerHTML = '';

  if (!words.length) {
    const empty = document.createElement('div');
    empty.className = 'vocab-empty';
    empty.textContent = q
      ? `No word in this level matches “${q}”.`
      : 'No word in this group yet.';
    vocabGrid.appendChild(empty);
    return;
  }

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
    // The gloss is clamped to two lines on the card, so the full text has to stay
    // reachable somewhere — the tooltip carries it, and so does the fun-fact panel.
    div.title = `${w.ko} — ${w.en}\nClick for word origin and hints`;
    // A div rather than a button: the speak control is itself a button, and a button
    // inside a button is invalid markup. role + tabindex + a key handler gets the same
    // keyboard behaviour without nesting one inside the other.
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `${w.ko}, ${w.en}. ${mBadgeLabel}${mBadgeSuffix}. Open word details`);
    div.innerHTML = `
      <button type="button" class="speak-btn vc-speak tts-only" title="Hear this word" aria-label="Hear ${vbEsc(w.ko)}">🔊</button>
      <span class="vc-emoji">${(typeof vocabIconHtml === 'function') ? vocabIconHtml(w.ko, w.hint || '📝', 40) : (w.hint || '📝')}</span>
      <span class="vc-ko${vbKoSizeClass(w.ko)}" lang="ko">${vbEsc(w.ko)}</span>
      <span class="vc-en">${vbEsc(w.en)}</span>
      <span class="vc-meta">
        <span class="vc-chosung" title="Initial consonants (초성)">${vbEsc(chosung)}</span>
        <span class="mastery-badge ${mBadgeClass}">${mBadgeLabel}${mBadgeSuffix}</span>
      </span>`;
    // Free here: the vocab book already shows the answer, so audio adds nothing to give away.
    div.querySelector('.vc-speak').addEventListener('click', (ev) => {
      ev.stopPropagation();          // don't also open the fun-fact modal
      speakKorean(w.ko, { force: true });
    });
    div.addEventListener('click', () => showVocabFunFact(w));
    div.addEventListener('keydown', (ev) => {
      if (!ev) return;
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        showVocabFunFact(w);
      }
    });
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

