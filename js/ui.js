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
    quizOpen, shopOpen, memoryOpen, trophyOpen, catDialogOpen
  };
  if (typeof worldPointerBlocked === 'function' ? worldPointerBlocked(flags)
      : (playerLocked || sc.isPerformingAction || quizOpen || shopOpen || memoryOpen || trophyOpen || catDialogOpen)) {
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
  hudProgressEl.title = hvT('ui.hud.progress.title', { learned: learnedPct, mature: maturePct })
    + (due ? hvT('ui.hud.progress.due', { n: due }) : '');
  const dueEl = $('hud-due');
  if (dueEl) {
    dueEl.textContent = due > 0 ? String(due) : '';
    dueEl.classList.toggle('has-due', due > 0);
    dueEl.title = due > 0
      ? hvT(due === 1 ? 'ui.hud.due.one' : 'ui.hud.due', { n: due })
      : '';
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
      lsGrid.innerHTML = '<div class="ls-sep">' + hvT('ui.ls.loading') + '</div>';
      fetch('levels.json').then(r => r.ok ? r.json() : Promise.reject(new Error('levels '+r.status)))
        .then(d => hvLocalizeAsync('levels.json', d)).then(d => {
        levelsData = Array.isArray(d) ? d : [];
        loadTextbookWorlds(() => buildLevelSelectScreen());
      }).catch(err => {
        console.error('Failed to load levels.json:', err);
        lsGrid.innerHTML = '<div class="ls-sep">' + hvT('ui.ls.loadFailed') + '</div>';
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
    const resumeLabel = isWorldLevel(cur)
      ? (cur.title || levelName(cur))
      : hvT('ui.ls.card.level', { n: currentLevelIndex + 1 });
    // The default action, so it is the one thing on the screen with an accent border — and
    // the stats read as separate facts rather than one string joined by pipes.
    r.tabIndex = 0;
    r.setAttribute('role', 'button');
    r.setAttribute('aria-label',
      hvT('ui.ls.resume.aria', { level: resumeLabel, gold, crops: planted }));
    // The counts stay outside the key so a translation cannot lose the <b>, and so a language
    // that puts the number after the noun can still say so by moving {n} in its own string.
    r.innerHTML = `
      <div class="lsr-icon" aria-hidden="true">▶</div>
      <div class="lsr-text">
        <div class="lsr-title">${vbEsc(hvT('ui.ls.resume.title', { level: resumeLabel }))}</div>
        <div class="lsr-sub">
          <span>${hvT('ui.ls.resume.gold', { n: `<b>${gold}</b>` })}</span>
          <span>${hvT(planted === 1 ? 'ui.ls.resume.crops.one' : 'ui.ls.resume.crops',
            { n: `<b>${planted}</b>` })}</span>
        </div>
      </div>`;
    r.addEventListener('click', resumeGame);
    r.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resumeGame(); }
    });
    lsGrid.appendChild(r);
  }
  // A card answers three questions and stops: what is this, can I open it, how far am I.
  // The old one answered seven — two emoji, a level number, an English name, a Korean name, a
  // description, a word count and a state chip — with the name set smaller than the metadata
  // beside it. Nothing was subordinate, so nothing read first.
  //
  // Progress is new. A course chooser that cannot tell you where you are in a pack is missing
  // the one thing you open it to find out; calcLevelProgress has been available all along.
  const paintCard = (lvl, idx) => {
    const world = isWorldLevel(lvl);
    const owned = world || (Array.isArray(unlockedLevels) && unlockedLevels.includes(idx));
    const cost = LEVEL_COST(idx);
    const canAfford = gold >= cost;
    const wordCount = (lvl && Array.isArray(lvl.words)) ? lvl.words.length : 0;
    const pct = owned && typeof calcLevelProgress === 'function' ? calcLevelProgress(idx) : 0;
    const done = pct >= 100;

    const c = document.createElement('div');
    c.className = 'level-card'
      + (world ? ' world-card' : '')
      + (!owned ? ' locked' : '')
      + (done ? ' completed' : '');
    // Focusable and announced, which a div with a click handler was not. The whole card is one
    // control, so it gets one role and one label rather than a grid of unlabelled text.
    c.tabIndex = owned || canAfford ? 0 : -1;
    c.setAttribute('role', 'button');

    // The eyebrow carries the pack's identity so the name does not have to. A world's nameEn
    // is written "2B Unit 10 · What do you want to eat?", which under a heading that already
    // says SNU Korean 2B printed the same words three times on one screen. The unit number
    // moves to the eyebrow and the prefix comes off the name, leaving the part that differs.
    // A world says what it is called in `pages` — "Unit 10", "TOPIK II" — so the label is read
    // rather than reconstructed. It used to be built from the trailing digits of lvl.level,
    // which works for 2B-14 and gives nothing for TOPIK-II: the card came out labelled
    // "Textbook", the one word on it that was not about which world it was.
    const unitNo = world ? (String(lvl.level || '').match(/(\d+)\s*$/) || [])[1] : null;
    const eyebrow = world
      ? (String(lvl.pages || '').trim()
        || (unitNo ? hvT('ui.ls.card.unit', { n: unitNo }) : hvT('ui.ls.card.textbook')))
      : hvT('ui.ls.card.level', { n: lvl.level });
    // World packs carry their Korean in `name` and their English in `nameEn`; Valley packs put
    // the Korean in `name` too. levelNameKo returns '' when there is only one, so the Korean
    // line collapses rather than printing the English twice.
    const heroKo = levelNameKo(lvl) || '';
    const heroEn = String(levelName(lvl) || '').replace(/^\s*\d+[A-Za-z]?\s*Unit\s*\d+\s*[·:\-—]\s*/i, '');

    // "0%" beside an empty bar said nothing twice. The bar is only painted once there is
    // something in it, so at zero the label carries the whole message on its own.
    //
    // Locked packs show the price and nothing else. "Need 1550 more" ran long enough to push
    // "60 words" onto a second line, and the card already looks locked — the price is the part
    // you can act on, and the shortfall is arithmetic the player can do from the gold in the
    // HUD.
    const stateLabel = owned
      ? (done ? hvT('ui.ls.card.complete') : (pct > 0 ? `${pct}%` : hvT('ui.ls.card.notStarted')))
      : hvT('ui.ls.card.price', { n: cost });
    const stateClass = owned ? (pct > 0 ? '' : ' idle') : (canAfford ? ' price' : ' short');

    c.setAttribute('aria-label',
      hvT('ui.ls.card.aria', { eyebrow, name: heroKo || heroEn, words: wordCount }) + ' '
      + (owned
        ? (done ? hvT('ui.ls.card.aria.complete') : hvT('ui.ls.card.aria.learned', { pct }))
        : hvT('ui.ls.card.aria.locked', { n: cost })));
    // A locked card keeps its role so it is still announced as the control it looks like,
    // and says it cannot be used rather than simply refusing to take focus. Skipping it in
    // the tab order is the right call — there is nothing to do there — but a button that
    // cannot be reached and does not say why is the reader's problem, not the design's.
    if (!(owned || canAfford)) c.setAttribute('aria-disabled', 'true');
    // The description is clamped to two lines on the card, and the card carries an explicit
    // aria-label, which stops a reader from reaching the text inside it at all. So the blurb
    // — the only thing on the screen that says what a unit teaches — was invisible twice
    // over: cut off for the eye and unreachable for the ear. describedby gives it back.
    const descId = 'lc-desc-' + idx;

    c.innerHTML = `
      <div class="lc-top">
        <span class="lc-icon" aria-hidden="true">${vbEsc(lvl.icon || '📚')}</span>
        <div class="lc-meta">
          <span class="lc-num">${vbEsc(eyebrow)}</span>
          <span class="lc-name-ko">${vbEsc(heroKo)}</span>
          <span class="lc-name">${vbEsc(heroEn)}</span>
        </div>
      </div>
      <span class="lc-desc" id="${descId}">${vbEsc(tr(lvl, 'descriptionEn') || lvl.description || '')}</span>
      <div class="lc-progress">
        <div class="lc-progress-track${pct > 0 ? '' : ' empty'}" role="presentation">
          <div class="lc-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="lc-footer">
        <span class="lc-stat">${hvT('ui.ls.card.words', { n: `<b>${wordCount}</b>` })}</span>
        <span class="lc-state${stateClass}">${vbEsc(stateLabel)}</span>
      </div>`;
    c.setAttribute('aria-describedby', descId);

    const open = () => {
      if (owned) {
        if (idx === currentLevelIndex && hasSave) resumeGame();
        else startLevel(idx, true);
      } else if (canAfford) {
        buyLevel(idx);
      }
    };
    if (owned || canAfford) {
      c.addEventListener('click', open);
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    }
    if (!owned && canAfford) c.title = hvT('ui.ls.card.buy');
    lsGrid.appendChild(c);
  };
  // Headings rather than '── text ──'. The em dashes were doing the work of a rule, which a
  // rule does better, and the words had to be read to find out they were only a divider.
  const heading = (text) => {
    const h = document.createElement('h2');
    h.className = 'ls-sep';
    h.textContent = text;
    lsGrid.appendChild(h);
  };
  // Worlds group by the pack they belong to. One heading served while every world was a
  // chapter of the same book; the exam world is not, and filing it under "SNU Korean 2B"
  // would have been the heading telling a small lie to keep its shape.
  // Resolved here rather than held as keys and looked up below: scripts/i18n_extract.js and
  // the validator both find hvT() keys by reading the literal out of the call, so a key that
  // only ever reaches hvT through a variable is a key nothing checks has an English string.
  const PACK_HEADING = {
    'snu-2b': hvT('ui.ls.pack.snu2b'),
    topik: hvT('ui.ls.pack.topik')
  };
  const byPack = new Map();
  const valley = [];
  levelsData.forEach((lvl, idx) => {
    if (!isWorldLevel(lvl)) { valley.push({ lvl, idx }); return; }
    const pack = String((lvl && lvl.pack) || 'snu-2b');
    if (!byPack.has(pack)) byPack.set(pack, []);
    byPack.get(pack).push({ lvl, idx });
  });
  const worlds = [...byPack.values()].flat();
  byPack.forEach((list, pack) => {
    // An unknown pack falls back to its own id rather than to a key that would print raw.
    heading(PACK_HEADING[pack] || pack);
    list.forEach(({ lvl, idx }) => paintCard(lvl, idx));
  });
  if (valley.length) {
    heading(hvT(worlds.length ? 'ui.ls.pack.valley' : 'ui.ls.pack.choose'));
    valley.forEach(({ lvl, idx }) => paintCard(lvl, idx));
  }
}
// ═══════════════ CENTRALIZED UI GLASSMORPHISM MODAL MANAGER ═══════════════════
let activeModalStack = [];

// The study desk: the chooser, the workbook and the quiz. All three are places
// you are meant to be listening to Korean, so the background score comes off
// while any of them is open.
const STUDY_OVERLAYS = ['desk-menu-overlay', 'workbook-overlay', 'desk-quiz-overlay',
  'cassette-overlay', 'listen-overlay', 'dictation-overlay'];

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

// ── Focus, while a modal owns the screen ────────────────────────────────────
//
// The stack already decides what Escape closes and what the music does; focus is the third
// thing it should decide and did not. A modal opened with the keyboard used to leave the
// caret out on the farm behind it, so Tab walked the HUD under the panel — the learner could
// hear a screen reader read buttons that were not on screen, and the trip back to where they
// had been was a long one.
//
// Where focus came from, per overlay rather than one slot: the desk chains — the chooser
// opens the workbook, the workbook goes back to the chooser — and a single slot would hand
// the learner back to the farm instead of the screen they came from.
const modalReturnFocus = new Map();

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),'
  + ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(root) {
  if (!root || !root.querySelectorAll) return [];
  return [...root.querySelectorAll(FOCUSABLE)]
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

// The panel itself takes focus rather than its first button. A screen reader then reads the
// dialog and its name before anything else, and Tab walks the panel from the top — where
// jumping straight to a control announces that control and never says what opened.
function focusModal(overlay) {
  if (!overlay || typeof overlay.focus !== 'function') return;
  if (typeof overlay.hasAttribute === 'function' && !overlay.hasAttribute('tabindex')
      && typeof overlay.setAttribute === 'function') {
    overlay.setAttribute('tabindex', '-1');
  }
  try { overlay.focus({ preventScroll: true }); } catch (e) { try { overlay.focus(); } catch (e2) {} }
}

function setModalState(overlayId, isOpen) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  if (isOpen) {
    const wasOpen = activeModalStack.includes(overlayId);
    overlay.classList.add('visible');
    overlay.classList.remove('hidden');
    playerLocked = true;
    if (!wasOpen) {
      activeModalStack.push(overlayId);
      const from = document.activeElement;
      if (from && from !== document.body) modalReturnFocus.set(overlayId, from);
      // A tick late on purpose: several screens are populated after this call, and focusing
      // a panel that is still empty gives the reader nothing to announce.
      setTimeout(() => { if (activeModalStack.includes(overlayId)) focusModal(overlay); }, 0);
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
    const back = modalReturnFocus.get(overlayId);
    modalReturnFocus.delete(overlayId);
    // Only if it is still on the page and still reachable — a card that closed with the
    // screen it lived on would throw the caret back to the top of the document instead.
    //
    // Feature-checked rather than assumed: the test harnesses evaluate this file against a
    // hand-built document that has getElementById and not much else, and a modal stack that
    // throws on close is a worse bug than a caret that does not move.
    const stillThere = back && typeof document.contains === 'function'
      && document.contains(back) && back.offsetParent !== null;
    if (stillThere && typeof back.focus === 'function') {
      try { back.focus({ preventScroll: true }); } catch (e) {}
    } else if (activeModalStack.length) {
      focusModal(document.getElementById(activeModalStack[activeModalStack.length - 1]));
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
  else if (overlayId === 'cassette-overlay') window.closeCassette();
  else if (overlayId === 'listen-overlay') window.closeListen();
  else if (overlayId === 'dictation-overlay') window.closeDictation();
  else if (overlayId === 'rank-card-overlay') window.closeRankCard();
  else if (overlayId === 'rankup-overlay') window.closeRankUp();
  else if (overlayId === 'vocab-ff-modal') closeVocabFunFact();
  else if (overlayId === 'vocab-overlay') closeVocabBook();
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

    // Tab stays inside the panel that is open. Without this the caret leaves the dialog at
    // its last button and carries on through the HUD and the farm behind it — which are
    // covered, unreachable by mouse, and still in the tab order. aria-modal tells a screen
    // reader the rest of the page is not there; this makes that true for the keyboard.
    if (e.key === 'Tab' && activeModalStack.length > 0) {
      const top = document.getElementById(activeModalStack[activeModalStack.length - 1]);
      if (!top) return;
      const stops = focusablesIn(top);
      if (!stops.length) { e.preventDefault(); focusModal(top); return; }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const here = document.activeElement;
      if (!top.contains(here)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
      if (e.shiftKey && here === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && here === last) { e.preventDefault(); first.focus(); }
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
const INV_KIND_LABEL = { ingredient: 'ui.inv.kind.ingredient', seed: 'ui.inv.kind.seed', dish: 'ui.inv.kind.dish' };
// The map holds keys rather than words, so a kind that is not in it falls back to a generic
// label instead of printing a key at the player.
const invKindLabel = (kind) => (INV_KIND_LABEL[kind] ? hvT(INV_KIND_LABEL[kind]) : hvT('ui.inv.kind.item'));

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
        name: tr(info, 'name') || nameKo,
        nameKo: info.nameKo || nameKo,
        qty: qty,
        icon: art(info.nameKo || nameKo, info.icon, 40),
        iconLarge: art(info.nameKo || nameKo, info.icon, 56),
        description: tr(info, 'description') || src.fallbackDesc,
        kind: src.kind
      });
    }
  });

  if (inventoryState.cookedDishes) {
    for (const [recipeId, qty] of Object.entries(inventoryState.cookedDishes)) {
      if (!(qty > 0)) continue;
      const rec = invResolveRecipe(recipeId);
      const nameKo = rec ? (rec.nameKo || rec.name) : recipeId;
      const nameEn = rec ? (tr(rec, 'nameEn') || rec.enName || rec.name) : recipeId;
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

  if (badge) badge.textContent = hvT('ui.inv.capacity.badge.fmt', { used: usedSlots, max: maxSlots });
  if (capText) capText.textContent = hvT('ui.inv.capacity.text.fmt', { n: maxSlots });

  const ratio = maxSlots > 0 ? usedSlots / maxSlots : 0;
  if (fill && fill.style) fill.style.width = Math.min(100, Math.round(ratio * 100)) + '%';
  if (track && track.setAttribute) {
    track.setAttribute('aria-valuenow', String(usedSlots));
    track.setAttribute('aria-valuemax', String(maxSlots));
    track.setAttribute('aria-valuetext', hvT('ui.inv.slots.aria', { used: usedSlots, max: maxSlots }));
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
      ? hvT('ui.inv.expand.title', { n: 5, cost })
      : hvT('ui.inv.expand.short', { cost, coins });
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
    `<span class="inv-chip">${invEscHtml(invKindLabel(item.kind))}</span>`,
    `<span class="inv-chip gold">${invEscHtml(hvT('ui.inv.inBag', { n: item.qty }))}</span>`
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
    <button type="button" class="inv-detail-close" id="inv-detail-close" aria-label="${vbEsc(hvT('ui.inv.detail.close.aria'))}">✕</button>
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
      slotEl.title = `${item.nameKo} (${item.name}): ${item.description}`;   // all three already translated
      if (slotEl.setAttribute) {
        slotEl.setAttribute('role', 'listitem');
        slotEl.setAttribute('tabindex', '0');
        slotEl.setAttribute('data-inv-id', String(item.itemId));
        slotEl.setAttribute('aria-pressed', selected ? 'true' : 'false');
        slotEl.setAttribute('aria-label',
          hvT('ui.inv.slot.aria',
            { ko: item.nameKo, name: item.name, kind: invKindLabel(item.kind), qty: item.qty }));
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
        <div class="inv-slot-en">${invEscHtml(hvT('ui.inv.slot.empty'))}</div>
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
    box.innerHTML = `💡 <b>${vbEsc(hvT('ui.quiz.wordOrigin'))}</b> ${fact.origin || fact.hint}`;
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
  if (qui) { qui.classList.add('quiz-done'); qui.classList.add('quiz-success'); }
  clearQuizFinishTimer();
  // delay === 0: harvest stays open so the player can reread the word, then dismiss.
  if (delay === 0) {
    if (go) setTimeout(() => { try { go.focus(); } catch (e) {} }, 40);
    return;
  }
  const wait = typeof delay === 'number' ? delay : 2800;
  quizFinishTimer = setTimeout(settleQuizAdvance, wait);
}

// The mirror of showQuizSuccess, for the one place an attempt ends in failure rather than
// looping back: a phase-3 lapse. That path used to print "Wrong! Plant regressed to Phase 2!"
// and close itself 1.8s later without ever showing what the word was — the learner left the
// one moment they most needed to see it, and 1.8s is not enough to read a word you have just
// got wrong in any case. The multiple-choice path had this right all along: it lights up the
// correct button on a miss, "a wrong guess is the moment the word is learned". Typing did not.
//
// So the answer is shown, said aloud, and set against what was actually typed, and the panel
// waits to be dismissed instead of timing out. Deliberately no checkQuestProgress('quiz'):
// this is a miss, and the miss was already counted by the caller.
function showQuizReveal({ message, ko, en, typed, note, continueLabel, onDone }){
  pendingQuizAdvance = onDone;
  const box = $('quiz-result');
  const art = $('quiz-result-art');
  const msg = $('quiz-result-msg');
  const koEl = $('quiz-result-ko');
  const enEl = $('quiz-result-en');
  const tyEl = $('quiz-result-typed');
  const noteEl = $('quiz-result-note');
  const go = $('quiz-result-continue');
  if (msg) msg.textContent = message || '';
  if (koEl) koEl.textContent = ko || '';
  if (enEl) enEl.textContent = en || '';
  // Shown only when there is something to compare against. A blank submission has nothing to
  // teach, and an empty struck-through row reads as a rendering fault rather than as silence.
  if (tyEl) {
    const t = String(typed || '').trim();
    tyEl.textContent = t ? hvT('ui.quiz.youWrote', { text: t }) : '';
    tyEl.classList.toggle('hidden', !t);
  }
  if (noteEl) {
    noteEl.textContent = note || '';
    noteEl.classList.toggle('hidden', !note);
  }
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
  if (qui) { qui.classList.add('quiz-done'); qui.classList.add('quiz-lapsed'); }
  // No timer: the panel is the study, so it stays until it is dismissed.
  clearQuizFinishTimer();
  // Hearing it once here is the repetition worth having, and it is not a hint — the answer
  // is already on screen and the grade is already recorded.
  if (ko) setTimeout(() => speakKorean(ko), 220);
  if (go) setTimeout(() => { try { go.focus(); } catch (e) {} }, 40);
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
      hintEmoji.innerHTML = vocabIconHtml(word.ko, word.hint || '?', 192);
    } else {
      hintEmoji.textContent = word.hint || '?';
    }
  }
  hintCategory.textContent  = wordCategory(word);
  enWordDisplay.textContent = tr(word, 'en');
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
    replay.title = hvT('ui.quiz.replay.title');
    replay.textContent = '▶ ' + hvT('ui.quiz.replay');
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

  if (showTyping) { qText.textContent = hvT('ui.quiz.prompt.type'); currentChoices = []; return; }

  if (currentQuizMode === 'recognise') {
    qText.textContent = hvT('ui.quiz.prompt.recognise');
    $('quiz-ko-word').textContent = word.ko;
    const speak = $('quiz-ko-speak');
    if (speak) speak.onclick = () => speakKorean(word.ko, { force: true });
    speakKorean(word.ko);          // free here: the spelling is already visible
  } else {
    qText.textContent = hvT('ui.quiz.prompt.listen');
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
    feedbackText.textContent = `✅ ${currentWord.ko} — ${tr(currentWord, 'en')}`;
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
    feedbackText.textContent = `❌ ${hvT('ui.quiz.itIs')} ${currentWord.ko} — ${tr(currentWord, 'en')}`;
    feedbackText.className = '';
    // Re-ask rather than punishing: this is a teaching step, not the graded recall.
    setTimeout(()=>{
      if(!quizOpen || !currentWord) return;
      applyQuizMode(currentWord, currentPhase, currentPlot);
      feedbackText.textContent = hvT('ui.quiz.feedback.retry');
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
  // The reveal fills two rows the success panel never touches, so they are cleared here
  // rather than there: otherwise a lapse followed by a win leaves "You wrote: …" from the
  // previous word sitting under a green Harvested.
  ['quiz-result-typed', 'quiz-result-note'].forEach((id) => {
    const el = $(id); if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
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
    // Captured before the box is cleared: the reveal shows it back, and seeing the near-miss
    // beside the word is most of what there is to learn from a lapse.
    const typedRaw = answerInput.value;
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
      // The apple-tree quiz is the exception and keeps its retry: it is answered again for
      // the same reward, so showing the word there would be handing over the payout.
      showQuizReveal({
        message: after.lapses > 0 ? 'Lapsed' : 'The answer was',
        ko: cw.ko, en: cw.en,
        typed: typedRaw,
        note: after.lapses > 0
          ? `Back to Phase 2 · next review in ${srsIntervalLabel(after)} after relearning.`
          : 'Back to Phase 2 — water it again to bring it back.',
        continueLabel: 'Got it — back to Phase 2',
        onDone: () => { if(sceneRef) sceneRef.regressionPlot(cp,cw); }
      });
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
    showToast('🔒 ' + hvT('ui.shop.plot.needPrev', { n: plotIndex }));
    return;
  }

  if (playerCurrencies.coins < cost) {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
    showToast(hvT('ui.shop.plot.needGold', { cost, n: plotIndex + 1 }));
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
  showToast('🎉 ' + hvT('ui.shop.plot.bought', { n: plotIndex + 1 }));
  buildShopGrid();
  updateGoldHUD();
}

function buildShopGrid() {
  const grid = $('shop-level-grid'); if(!grid) return; grid.innerHTML = '';

  // Section 1: Farm Plot Expansions
  const plotHeader = document.createElement('div');
  plotHeader.className = 'shop-section-header';
  plotHeader.style.cssText = 'grid-column: 1 / -1; font-family: var(--font-pixel); font-size-adjust: var(--font-pixel-adjust); font-size: 13px; color: #78350f; margin: 10px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(139, 90, 43, 0.45); display: flex; align-items: center; gap: 8px;';
  plotHeader.innerHTML = '🌾 ' + vbEsc(hvT('ui.shop.plots.header',
    { n: unlockedPlots.length, total: 15 }));
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
      <div class="shop-card-name">${vbEsc(hvT('ui.shop.plot.name', { n: idx + 1 }))}</div>
      <div class="shop-card-desc">${vbEsc(hvT('ui.shop.plot.desc', { n: plotIndex + 1, cost }))}</div>
      <div class="shop-card-price">
        ${isOwned
          ? `<span class="shop-owned-badge">✅ ${vbEsc(hvT('ui.shop.card.owned'))}</span>
             <button class="shop-buy-btn" disabled>${vbEsc(hvT('ui.shop.plot.unlocked'))}</button>`
          : `<span class="shop-card-cost">💰 ${vbEsc(hvT('ui.ls.card.price', { n: cost }))}</span>
             <button class="shop-buy-btn" ${buyable ? '' : 'disabled'} onclick="buyPlotExpansion(${idx})">
               ${!available
                  ? vbEsc(hvT('ui.shop.plot.needPrev', { n: plotIndex }))
                  : (canAfford ? '🛒 ' + vbEsc(hvT('ui.shop.card.buy'))
                     : vbEsc(hvT('ui.shop.plot.short', { n: cost - playerCurrencies.coins })))}
             </button>`}
      </div>`;
    grid.appendChild(card);
  });

  // Section 2: Vocabulary Level Packs
  const lvlHeader = document.createElement('div');
  lvlHeader.className = 'shop-section-header';
  lvlHeader.style.cssText = 'grid-column: 1 / -1; font-family: var(--font-pixel); font-size-adjust: var(--font-pixel-adjust); font-size: 13px; color: #1e3a8a; margin: 20px 0 6px 0; padding-bottom: 6px; border-bottom: 1px solid rgba(29, 78, 216, 0.35); display: flex; align-items: center; gap: 8px;';
  lvlHeader.innerHTML = '📚 ' + vbEsc(hvT('ui.shop.packs.header'));
  grid.appendChild(lvlHeader);

  levelsData.forEach((lvl, idx) => {
    const owned     = unlockedLevels.includes(idx);
    const cost      = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : (!canAfford ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${lvl.icon||'📚'}</div>
      <div class="shop-card-name">${hvT('ui.ls.card.level', { n: lvl.level })}: ${levelName(lvl)}</div>
      <div class="shop-card-desc">${tr(lvl, 'descriptionEn') || lvl.description || ''} — ${hvT('ui.shop.card.words', { n: lvl.words.length })}</div>
      <div class="shop-card-price">
        ${owned
          ? `<span class="shop-owned-badge">✅ ${hvT('ui.shop.card.owned')}</span>
             <button class="shop-buy-btn" onclick="closeShop();startLevel(${idx})">🌾 ${hvT('ui.shop.card.play')}</button>`
          : `<span class="shop-card-cost">💰 ${hvT('ui.ls.card.price', { n: cost })}</span>
             <button class="shop-buy-btn" ${canAfford?'':'disabled'} onclick="buyLevel(${idx})">
               ${canAfford ? '🛒 ' + hvT('ui.shop.card.buy') : hvT('ui.shop.card.short', { n: cost - gold })}
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

// The learning-stage chips in the vocabulary book. The id is what the filter matches on and
// never changes; the icon is not language; the key is what gets translated.
const VOCAB_STAGE_FILTERS = [
  { id: 'srs:due', icon: '⏰', key: 'ui.vocab.filter.due' },
  { id: 'srs:new', icon: '⚪', key: 'ui.vocab.filter.new' },
  { id: 'srs:learning', icon: '🌱', key: 'ui.vocab.filter.learning' },
  { id: 'srs:review', icon: '🍎', key: 'ui.vocab.filter.review' },
  { id: 'srs:mature', icon: '🌟', key: 'ui.vocab.filter.mature' }
];
let activeMasteryFilter = 'all';
let visibleVocabWords = [];
let activeVocabDetailWord = null;
let vocabDetailReturnFocus = null;

function buildVocabBook() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  const ko = levelNameKo(lvl);
  vocabSubtitle.textContent = `${hvT('ui.vocab.levelPrefix')} ${lvl.level} – ${levelName(lvl)}${ko ? ` (${ko})` : ''}`;
  // Stage chips carry an id, and the label is looked up from it.
  //
  // They used to be their own label — activeCat held "⚪ New" and the filter below matched
  // on .includes('New'). That is fine in one language and silently wrong in two: once the
  // chip is translated the substring is no longer in it, every stage filter matches nothing,
  // and the vocabulary book comes back empty with no error anywhere. A category chip still
  // uses its own text as the id, because a category IS what it filters on, and tr() gives
  // both halves the same value for a given word.
  const cats = [{ id: 'all', label: hvT('ui.vocab.filter.all') }]
    .concat(VOCAB_STAGE_FILTERS.map((f) => ({ id: f.id, label: f.icon + ' ' + hvT(f.key) })))
    .concat([...new Set(lvl.words.map(wordCategory).filter(Boolean))].map((c) => ({ id: c, label: c })));
  if (!cats.some((c) => c.id === activeCat)) activeCat = 'all';
  const started = lvl.words.filter(w => {
    const e = peekSrs(w.ko);
    return e && e.st !== 'new';
  }).length;
  const mature = lvl.words.filter(w => srsIsMature(peekSrs(w.ko))).length;
  const due = lvl.words.filter(w => wordIsDue(w.ko)).length;
  const summary = $('vocab-progress-summary');
  if (summary) summary.textContent = hvT('ui.vocab.progressSummary', { started: started, mature: mature })
    + (due ? ' · ' + hvT('ui.vocab.progressDue', { due: due }) : '');
  const filterScrollTop = catFiltersEl.scrollTop;
  catFiltersEl.innerHTML = '';
  cats.forEach(cc => {
    const b = document.createElement('button');
    b.className = 'cat-filter-btn' + (cc.id === activeCat ? ' active' : '');
    b.setAttribute('aria-pressed', String(cc.id === activeCat));
    b.textContent = cc.label;
    b.onclick = () => {
      activeCat = cc.id;
      buildVocabBook();
      $('vocab-grid-wrap').scrollTop = 0;
    };
    catFiltersEl.appendChild(b);
  });
  catFiltersEl.scrollTop = filterScrollTop;
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
let factsLoadPromise = null;
let factsLoadSettled = false;

// Non-blocking: origins are only needed once a fun-fact panel is opened, and
// getFunFact() degrades to pronunciation-only until the fetch lands. Guarded so the
// script still evaluates where fetch is absent (Node test harnesses run game.js in
// a bare vm context).
function loadFacts(){
  // Browser-only: Node has a global fetch but no base URL, so a relative one throws
  // ERR_INVALID_URL. This checked `typeof document` and one harness mocks document, so the
  // guard passed and every run of it dumped that error. IS_NODE is the check that holds.
  if (IS_NODE || typeof fetch !== 'function') {
    factsLoadSettled = true;
    return Promise.resolve(factsData);
  }
  if (factsLoaded) return Promise.resolve(factsData);
  if (factsLoadPromise) return factsLoadPromise;
  factsLoadPromise = fetch('facts.json')
    .then(r => r.json())
    .then(d => { factsData = d || {}; factsLoaded = true; factsLoadSettled = true; return factsData; })
    .catch(e => { console.warn('facts.json failed to load:', e); factsData = {}; factsLoadSettled = true; return factsData; })
    .then(d => { factsLoadPromise = null; return d; });
  return factsLoadPromise;
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
  return [hvT(n === 1 ? 'ui.vb.blocks.one' : 'ui.vb.blocks', { n }), cls]
    .filter(Boolean).join(' · ');
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

// Which topical note a word gets, as an id. The note itself is in the catalogue: it is a
// sentence of teaching advice, and the word-detail page shows it under the headword when the
// word has no curated origin of its own.
const CATEGORY_TOPICS = [
  ['food', ['food', '음식', '식당', '맛']],
  ['animal', ['animal', '동물']],
  ['nature', ['nature', '자연', '계절', '날씨', '환경']],
  ['body', ['body', '신체', '건강', '증상']],
  ['place', ['place', '장소', '건물', '교통', '숙소']],
  ['people', ['가족', '사람', '관계']],
  ['action', ['동작', '행동', '업무']],
  ['economy', ['economy', 'business', '경제', '사업', '시장', '금융']],
  ['volunteer', ['volunteer', 'application', '봉사', '신청', '모집', '자격']],
  ['chart', ['chart', 'data', 'graph', '그래프', '통계', '비율', '자료']],
  ['grammar', ['grammar', 'expression', '문법', '표현']],
  ['society', ['society', 'daily life', '생활', '사회', '일상']],
  ['media', ['media', 'headline', '뉴스', '언론', '기사']],
  ['culture', ['culture', 'entertainment', '문화', '예술', '공연']],
  ['beauty', ['beauty', 'appearance', '미용', '외모']],
  ['travel', ['travel', 'leisure', '여행', '여가', '관광']],
  ['politics', ['politics', 'government', '정치', '정부', '행정']]
];

function categoryTopicId(cat) {
  const c = (cat || '').toLowerCase();
  const hit = CATEGORY_TOPICS.find(([, keys]) => keys.some((k) => c.indexOf(k) >= 0));
  return hit ? hit[0] : 'everyday';
}

function renderCategoryHint(cat) {
  return hvT('ui.vb.topic.' + categoryTopicId(cat));
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
    hint: renderCategoryHint(`${word.categoryEn || ''} ${word.category || ''}`)
  };
}

function vocabRenderChips(target, values) {
  if (!target) return;
  target.innerHTML = '';
  (values || []).forEach(value => {
    const chip = document.createElement('span');
    chip.className = 'vff-study-chip';
    chip.textContent = value;
    target.appendChild(chip);
  });
}

function vocabSkillDescription(entry) {
  if (!entry || entry.st === 'new') return hvT('ui.vb.skill.none');
  const parts = [];
  if (srsIsMature(entry)) parts.push(hvT('ui.vocab.filter.mature'));
  else if (entry.st === 'review') parts.push(hvT('ui.vb.stage.review'));
  else if (entry.st === 'relearn') parts.push(hvT('ui.vocab.stage.relearning'));
  else if (entry.st === 'learn') parts.push(hvT('ui.vocab.filter.learning'));
  else parts.push(entry.st);
  if (srsIsGraduated(entry)) parts.push(hvT('ui.vb.interval', { n: srsIntervalLabel(entry) }));
  if (srsIsDue(entry)) parts.push(hvT('ui.vb.dueNow'));
  if (entry.lapses) {
    parts.push(hvT(entry.lapses === 1 ? 'ui.vb.lapses.one' : 'ui.vb.lapses', { n: entry.lapses }));
  }
  return parts.join(' · ');
}

function vocabRenderSkillGrid(word) {
  const grid = $('vff-skill-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const labels = {
    type: { icon: '⌨️', name: hvT('ui.vb.skill.type') },
    recognise: { icon: '👁️', name: hvT('ui.vb.skill.recognise') },
    listen: { icon: '👂', name: hvT('ui.vb.skill.listen') }
  };
  MODALITIES.forEach(modality => {
    const row = document.createElement('div');
    row.className = 'vff-skill-card';
    const icon = document.createElement('span');
    icon.className = 'vff-skill-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = labels[modality].icon;
    const copy = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'vff-skill-name';
    name.textContent = labels[modality].name;
    const state = document.createElement('div');
    state.className = 'vff-skill-state';
    state.textContent = vocabSkillDescription(peekSrs(word.ko, modality));
    copy.appendChild(name);
    copy.appendChild(state);
    row.appendChild(icon);
    row.appendChild(copy);
    grid.appendChild(row);
  });
}

function vocabRelatedWords(word, limit) {
  const lvl = levelsData[currentLevelIndex];
  const all = (lvl && Array.isArray(lvl.words)) ? lvl.words : [];
  const index = all.findIndex(w => w && w.ko === word.ko);
  const category = wordCategory(word);
  return all
    .map((candidate, i) => ({
      candidate,
      i,
      sameCategory: wordCategory(candidate) === category
    }))
    .filter(row => row.candidate && row.candidate.ko !== word.ko)
    .sort((a, b) => {
      if (a.sameCategory !== b.sameCategory) return a.sameCategory ? -1 : 1;
      return Math.abs(a.i - index) - Math.abs(b.i - index);
    })
    .slice(0, limit || 6)
    .map(row => row.candidate);
}

function vocabRenderRelatedWords(word) {
  const grid = $('vff-related-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const related = vocabRelatedWords(word, 6);
  if (!related.length) {
    const empty = document.createElement('div');
    empty.className = 'vff-related-empty';
    empty.textContent = hvT('ui.vff.related.empty');
    grid.appendChild(empty);
    return;
  }
  related.forEach(candidate => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vff-related-word';
    button.setAttribute('aria-label', `${hvT('ui.vff.open')} ${candidate.ko}, ${tr(candidate, 'en')}`);

    const art = document.createElement('span');
    art.className = 'vff-related-art';
    art.innerHTML = (typeof vocabIconHtml === 'function')
      ? vocabIconHtml(candidate.ko, candidate.hint || '📝', 42)
      : (candidate.hint || '📝');
    const copy = document.createElement('span');
    copy.className = 'vff-related-copy';
    const ko = document.createElement('span');
    ko.className = 'vff-related-ko';
    ko.lang = 'ko';
    ko.textContent = candidate.ko;
    const en = document.createElement('span');
    en.className = 'vff-related-en';
    en.textContent = tr(candidate, 'en');
    copy.appendChild(ko);
    copy.appendChild(en);
    const arrow = document.createElement('span');
    arrow.className = 'vff-related-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    button.appendChild(art);
    button.appendChild(copy);
    button.appendChild(arrow);
    button.addEventListener('click', () => showVocabFunFact(candidate));
    grid.appendChild(button);
  });
}

function vocabDetailNavigation(word) {
  const lvl = levelsData[currentLevelIndex];
  let list = visibleVocabWords.filter(Boolean);
  let index = list.findIndex(w => w.ko === word.ko);
  if (index < 0) {
    list = (lvl && Array.isArray(lvl.words)) ? lvl.words : [];
    index = list.findIndex(w => w.ko === word.ko);
  }
  return { list, index };
}

function browseVocabDetail(delta) {
  if (!activeVocabDetailWord) return;
  const nav = vocabDetailNavigation(activeVocabDetailWord);
  if (nav.list.length < 2 || nav.index < 0) return;
  const next = (nav.index + delta + nav.list.length) % nav.list.length;
  showVocabFunFact(nav.list[next]);
}

function showVocabFunFact(word) {
  if (!word || !word.ko) return;
  const modal = $('vocab-ff-modal');
  const wasOpen = modal.classList.contains('visible');
  if (!wasOpen && typeof document !== 'undefined') vocabDetailReturnFocus = document.activeElement;
  activeVocabDetailWord = word;

  const normalizedKo = word.ko.normalize('NFC');
  const originData = factsData[normalizedKo] || null;
  const fact = getFunFact(word);
  const model = vbDetailModel(word, originData);
  const srs = getSrs(word.ko);
  const harvests = harvestCounts.get(word.ko) || 0;

  let stageLabel = hvT('ui.ls.card.notStarted');
  if (srsIsMature(srs))          stageLabel = '🌟 ' + hvT('ui.vocab.filter.mature');
  else if (srs.st === 'review')  stageLabel = '🍎 ' + hvT('ui.vb.stage.review');
  else if (srs.st === 'relearn') stageLabel = '🔁 ' + hvT('ui.vocab.stage.relearning');
  else if (srs.st === 'learn')   stageLabel = '🌱 ' + hvT('ui.vocab.filter.learning');

  $('vff-emoji').innerHTML = (typeof vocabIconHtml === 'function')
    ? vocabIconHtml(word.ko, word.hint || '📝', 126)
    : (word.hint || '📝');
  $('vff-en').textContent = tr(word, 'en');
  $('vff-ko').textContent = word.ko;
  $('vff-romanization').textContent = model.romanization
    ? hvT('ui.vb.romanization', { text: model.romanization })
    : hvT('ui.vb.romanization.none');
  $('vff-cat').textContent = wordCategory(word) + (word.categoryEn && word.category ? ` · ${word.category}` : '');
  $('vff-phase').textContent = stageLabel;

  const studiedSkills = MODALITIES
    .map(modality => peekSrs(word.ko, modality))
    .filter(entry => entry && entry.st !== 'new').length;
  $('vff-harvests').textContent = studiedSkills
    ? hvT('ui.vb.skills.started', { n: studiedSkills, total: MODALITIES.length })
      + (harvests ? ' · ' + hvT('ui.vb.harvested', { n: harvests }) : '')
    : (harvests > 0 ? hvT('ui.vb.harvested', { n: harvests }) : hvT('ui.vb.notStudied'));

  $('vff-word-type').textContent = model.type;
  $('vff-syllable-count').textContent = model.syllableCount
    ? hvT(model.syllableCount === 1 ? 'ui.vb.blocks.one' : 'ui.vb.blocks', { n: model.syllableCount })
    : hvT('ui.vb.blocks.latin');
  $('vff-final-sound').textContent = model.ending.label;
  $('vff-chosung').textContent = getChosung(word.ko) || '—';
  $('vff-fact-origin').textContent = fact.origin || hvT('ui.vff.fact.none');
  $('vff-fact-structure').textContent = fact.structure
    || 'This entry is written with Latin letters rather than Hangul blocks.';
  $('vff-study-note').textContent = model.studyNote;
  $('vff-category-hint').textContent = fact.hint;

  const example = String(word.example || '').trim();
  const exSec = $('vff-example-section');
  $('vff-fact-example').textContent = example;
  $('vff-example-en').textContent = example ? (tr(word, 'exampleEn') || '') : '';
  const say = $('vff-example-speak');
  say.disabled = !example;
  say.onclick = example ? () => speakKorean(example, { force: true }) : null;
  exSec.hidden = !example;

  const formsSec = $('vff-forms-section');
  vocabRenderChips($('vff-forms'), model.forms);
  formsSec.hidden = model.forms.length === 0;

  const syllables = $('vff-syllable-grid');
  syllables.innerHTML = '';
  model.blocks.forEach(block => {
    const card = document.createElement('div');
    card.className = 'vff-syllable-card';
    const char = document.createElement('span');
    char.className = 'vff-syllable-char';
    char.lang = 'ko';
    char.textContent = block.char;
    const jamo = document.createElement('span');
    jamo.className = 'vff-syllable-jamo';
    jamo.textContent = [block.initial, block.vowel, block.final].filter(Boolean).join(' + ');
    const roman = document.createElement('span');
    roman.className = 'vff-syllable-roman';
    roman.textContent = block.romanized;
    card.appendChild(char);
    card.appendChild(jamo);
    card.appendChild(roman);
    syllables.appendChild(card);
  });

  vocabRenderChips($('vff-particle-row'), model.ending.available ? [
    `Topic · ${model.ending.topic}`,
    `Subject · ${model.ending.subject}`,
    `Object · ${model.ending.object}`,
    `Direction · ${model.ending.direction}`
  ] : ['Listen for the final sound before choosing a particle']);
  vocabRenderSkillGrid(word);
  vocabRenderRelatedWords(word);

  const nav = vocabDetailNavigation(word);
  const navPosition = $('vff-nav-position');
  navPosition.textContent = nav.index >= 0 ? `${nav.index + 1} / ${nav.list.length}` : '';
  $('vff-prev-btn').disabled = nav.list.length < 2;
  $('vff-next-btn').disabled = nav.list.length < 2;
  const navNone = hvT('ui.vff.nav.none');
  $('vff-prev-btn').title = nav.list.length > 1 ? hvT('ui.vff.nav.prev') : navNone;
  $('vff-next-btn').title = nav.list.length > 1 ? hvT('ui.vff.nav.next') : navNone;

  setModalState('vocab-ff-modal', true);
  const scroll = $('vff-scroll');
  if (scroll) scroll.scrollTop = 0;
  if (!wasOpen && typeof setTimeout === 'function') {
    setTimeout(() => {
      const back = $('vff-back-btn');
      if (back && typeof back.focus === 'function') back.focus();
    }, 0);
  }

  // If the user opens the page before the small origin file has arrived, refresh only
  // this still-open word once the verified data is ready.
  if (!factsLoadSettled) {
    loadFacts().then(() => {
      if (activeVocabDetailWord && activeVocabDetailWord.ko === word.ko
          && modal.classList.contains('visible')) showVocabFunFact(activeVocabDetailWord);
    });
  }
}

function closeVocabFunFact() {
  const modal = $('vocab-ff-modal');
  setModalState('vocab-ff-modal', false);
  activeVocabDetailWord = null;
  const returnFocus = vocabDetailReturnFocus;
  vocabDetailReturnFocus = null;
  if (returnFocus && typeof returnFocus.focus === 'function'
      && typeof document !== 'undefined' && document.documentElement.contains(returnFocus)) {
    returnFocus.focus();
  }
}

const TASTE_LABELS = [
  { ko: '달다', en: 'sweet',  vi: 'ngọt' },
  { ko: '짜다', en: 'salty',  vi: 'mặn' },
  { ko: '쓰다', en: 'bitter', vi: 'đắng' },
  { ko: '시다', en: 'sour',   vi: 'chua' },
  { ko: '맵다', en: 'spicy',  vi: 'cay' }
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
    if (prompt) prompt.textContent = hvT('ui.taste.score', { n: tasteState.score, total });
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
      b.title = tr(t, 'en');
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

// One branch per world that owns a quiz, and null for every world that does not. This used
// to end in a bare `return '/worlds/unit10-desk-quiz.json'`, which meant any new world with a
// desk was silently served Unit 10's 퀴즈 — a screen full of 10과 food words on a map that has
// nothing to do with 10과, working perfectly and answering the wrong question. The exam world
// is the first caller to land here, and null is what stops the 퀴즈 row being offered at all.
function deskQuizUrl() {
  if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-desk-quiz.json';
  if (typeof isUnit15World === 'function' && isUnit15World()) return '/worlds/unit15-desk-quiz.json';
  if (typeof isUnit11World === 'function' && isUnit11World()) return '/worlds/unit11-desk-quiz.json';
  if (typeof isUnit13World === 'function' && isUnit13World()) return '/worlds/unit13-desk-quiz.json';
  if (typeof isUnit10World === 'function' && isUnit10World()) return '/worlds/unit10-desk-quiz.json';
  // The exam desk had the paper and nothing beside it, while every other desk offers a quiz
  // as well. This one is revision of the paper rather than a second syllabus: every row
  // drills a distinction one of the questions already turned on.
  if (typeof isTopikWorld === 'function' && isTopikWorld()) return '/worlds/topik2-desk-quiz.json';
  return null;
}

function loadDeskQuiz() {
  const url = deskQuizUrl();
  if (!url) return Promise.resolve(null);
  if (deskQuizBank && deskQuizBank._url === url) return Promise.resolve(deskQuizBank);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url)
    .then(r => r.ok ? r.json() : null)
    .then(d => hvLocalizeAsync(url, d))
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
  const en = (bank && tr(bank, 'titleEn')) || hvT('ui.desk.quiz');
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
      '<div class="desk-xp">' + hvT('ui.desk.xpGain', { n: xp }) + ' · ' + t.icon + ' '
        + hvT('ui.rank.short', { n: playerRank.level }) + ' ' + t.ko +
      (hops ? '  ▲' : '') + '</div>';
  }
  if (fb) {
    fb.className = 'fb good';
    fb.textContent = st.score === total ? hvT('ui.wb.perfect') : hvT('ui.wb.correct', { n: st.score });
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
  if (qEl) qEl.textContent = (st.i + 1) + '. ' + tr(item, 'q');
  if (box) {
    box.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(key => {
      const b = document.createElement('button');
      b.className = 'desk-opt';
      b.textContent = key + '. ' + tr(item.choices, key);
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
// A desk with a single mode opens it directly rather than showing a menu with one
// live row and one dead one, which is what Unit 10's desk still does.
//
// Unit 14 has two sets of pages and they come from two different books: the 교과서's
// own 말하기 / 읽기 / 과제 / 문화 산책 / 발음 / 자기 평가 exercises, and the 익힘책's
// 어휘 / 문법과 표현 / 문형 연습. Same file format, same renderer — what separates
// them is the row of the menu that opened them, because a learner who has worked
// through the textbook page should not meet it again under another name.

let workbookState = null;
let deskMenuOptions = [];
let deskMenuIndex = 0;
// Keyed by url rather than a single slot: with two banks live on the same desk, one
// variable would have the second load evict the first on every visit.
const deskBanks = {};

function workbookUrl() {
  if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-workbook.json';
  if (typeof isUnit10World === 'function' && isUnit10World()) return '/worlds/unit10-workbook.json';
  return null;
}

function textbookUrl() {
  if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-textbook.json';
  if (typeof isUnit15World === 'function' && isUnit15World()) return '/worlds/unit15-textbook.json';
  if (typeof isUnit10World === 'function' && isUnit10World()) return '/worlds/unit10-textbook.json';
  return null;
}

// The exam world's own bank. Same file format and same renderer as the two textbook banks —
// what differs is that it has no chapter behind it: questions are added one at a time, so the
// file grows for as long as the exam is being studied for.
function topikBankUrl() {
  if (typeof isTopikWorld === 'function' && isTopikWorld()) return '/worlds/topik2-questions.json';
  return null;
}

function loadDeskBank(url) {
  if (!url) return Promise.resolve(null);
  if (deskBanks[url]) return Promise.resolve(deskBanks[url]);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url)
    .then(r => r.ok ? r.json() : null)
    .then(d => hvLocalizeAsync(url, d))
    .then(d => {
      if (d) {
        d._url = url;
        deskBanks[url] = d;
      }
      return d;
    })
    .catch(() => null);
}

function loadWorkbook() { return loadDeskBank(workbookUrl()); }
function loadTextbook() { return loadDeskBank(textbookUrl()); }
function loadTopikBank() { return loadDeskBank(topikBankUrl()); }

function openStudyDesk() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  Promise.all([loadTextbook(), loadWorkbook(), loadTopikBank()]).then(([tb, wb, tk]) => {
    // Every row is earned by content that actually loaded. 퀴즈 used to be added
    // unconditionally, which was fine while every desk belonged to a unit that had one — see
    // deskQuizUrl for what that cost the moment one did not.
    deskMenuOptions = [];
    if (deskQuizUrl()) {
      deskMenuOptions.push({ key: 'quiz', icon: '📝', ko: '퀴즈',
        en: 'Multiple choice', vi: 'Trắc nghiệm', run: openDeskQuiz });
    }
    // 교과서 before 연습 문제: it is the chapter you sat through, and the 익힘책 is the
    // homework on top of it. A unit with only one of the two still gets one row.
    if (((tb && tb.exercises) || []).length) {
      deskMenuOptions.push({
        key: 'textbook', icon: '📖', ko: '교과서',
        en: "Textbook — the chapter's own pages",
        vi: 'Giáo trình — chính các trang của chương',
        run: () => openWorkbook(tb)
      });
    }
    if (((wb && wb.exercises) || []).length) {
      deskMenuOptions.push({
        key: 'workbook', icon: '✍️', ko: '연습 문제',
        en: 'Workbook — build the sentences',
        vi: 'Sách bài tập — ghép thành câu',
        run: () => openWorkbook(wb)
      });
    }
    if (((tk && tk.exercises) || []).length) {
      deskMenuOptions.push({
        key: 'topik', icon: '🎓', ko: '기출 문제',
        en: 'TOPIK II — the questions collected so far',
        vi: 'TOPIK II — những câu hỏi đã gom được',
        run: () => openWorkbook(tk)
      });
    }
    // A desk with nothing on it says so. The exam world sits here until its first question
    // is added, and an empty menu overlay would read as a broken screen rather than an empty
    // one.
    if (!deskMenuOptions.length) {
      if (typeof showToast === 'function') showToast('📭 아직 문제가 없어요 — no questions here yet', 3200);
      return;
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
        '<span class="desk-mode-en">' + vbEsc(tr(opt, 'en')) + '</span>' +
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

// ═══════════════ CASSETTE PLAYER · THE BOOK'S OWN RECORDINGS ═════════════════
// Two things live behind the deck, and they want different shapes. Listening is a
// track and a script you follow; dictation is one sentence at a time with nothing
// on screen until you have written it. So the sprite opens a chooser, the same way
// the study desk does — and for the same reason: one screen doing both would show
// you the answer while you were trying to hear it.

let cassetteBank = null;
let cassetteTrack = null;      // the <audio> currently playing, whatever screen owns it
let listenState = null;
let dictState = null;
let cassetteMenuIndex = 0;

// The cassette is opened repeatedly, often to continue the same recording. Keep only
// navigation preferences here — progress and scores already belong to practiceLog and the
// unified save. A track number and sentence id survive content being reordered; an array
// index would quietly resume the wrong recording after an edit.
const CASSETTE_PREFS_KEY = 'hv_cassette_prefs_v2';
let cassettePrefs = (() => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const value = JSON.parse(localStorage.getItem(CASSETTE_PREFS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (e) { return {}; }
})();

function csUnitPrefs(unit) {
  const key = String(unit || '');
  if (!key) return {};
  const row = cassettePrefs[key];
  return row && typeof row === 'object' && !Array.isArray(row) ? row : {};
}

function csWritePrefs(unit, patch) {
  const key = String(unit || '');
  if (!key) return;
  cassettePrefs[key] = Object.assign({}, csUnitPrefs(key), patch || {});
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(CASSETTE_PREFS_KEY, JSON.stringify(cassettePrefs)); } catch (e) {}
}

function csSafeRate(rate, fallback) {
  return [1, 0.75, 0.5].indexOf(Number(rate)) >= 0 ? Number(rate) : (fallback || 1);
}

function csRememberListen() {
  const st = listenState, bank = cassetteBank;
  if (!st || !bank) return;
  const cur = (bank.tracks || [])[st.i];
  if (!cur) return;
  const at = cassetteTrack ? (cassetteTrack.el.currentTime || 0) : (st.at || 0);
  st.at = at;
  csWritePrefs(bank.unit, {
    track: cur.n,
    listenRate: csSafeRate(st.rate, 1),
    listenAt: Math.max(0, at),
    showScript: st.showScript !== false
  });
}

function csRememberDictation() {
  const st = dictState, bank = cassetteBank;
  if (!st || !bank) return;
  const it = dictItems()[st.i];
  if (!it) return;
  csWritePrefs(bank.unit, { dictationId: it.id, dictationRate: csSafeRate(st.rate, 1) });
}

function cassetteModeProgress(bank, mode) {
  const rows = mode === 'listen'
    ? (bank.tracks || []).map((t) => ({ kind: 'trk', id: t.n }))
    : (((bank.dictation && bank.dictation.items) || []).map((it) => ({ kind: 'dic', id: it.id })));
  let done = 0, attempts = 0, ok = 0, of = 0;
  rows.forEach((row) => {
    if (typeof practiceEntry !== 'function' || typeof practiceKey !== 'function') return;
    const e = practiceEntry(practiceKey(row.kind, bank.unit, row.id));
    if (!e || !e.n) return;
    done += 1;
    attempts += e.n || 0;
    ok += e.ok || 0;
    of += e.of || 0;
  });
  return {
    done: done,
    total: rows.length,
    attempts: attempts,
    pct: rows.length ? Math.round((done / rows.length) * 100) : 0,
    accuracy: of > 0 ? Math.round((ok / of) * 100) : null
  };
}

function cassetteUrl() {
  if (typeof isUnit10World === 'function' && isUnit10World()) return '/worlds/unit10-cassette.json';
  if (typeof isUnit11World === 'function' && isUnit11World()) return '/worlds/unit11-cassette.json';
  if (typeof isUnit13World === 'function' && isUnit13World()) return '/worlds/unit13-cassette.json';
  if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-cassette.json';
  if (typeof isUnit15World === 'function' && isUnit15World()) return '/worlds/unit15-cassette.json';
  return null;
}

function loadCassette() {
  const url = cassetteUrl();
  if (!url) return Promise.resolve(null);
  if (cassetteBank && cassetteBank._url === url) return Promise.resolve(cassetteBank);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url)
    .then(r => r.ok ? r.json() : null)
    .then(d => hvLocalizeAsync(url, d))
    .then(d => { if (d) d._url = url; cassetteBank = d; return d; })
    .catch(() => null);
}

// One player for every cassette screen. Switching tracks or sentences has to stop
// what is playing rather than layer on top of it — two recordings at once is the
// one thing a listening station must never do.
function csStop() {
  csTickStop();
  if (!cassetteTrack) return;
  const el = cassetteTrack.el;
  cassetteTrack = null;
  try { el.pause(); el.src = ''; } catch (e) {}
  if (typeof AudioMixer !== 'undefined' && AudioMixer.voiceEnd) AudioMixer.voiceEnd();
  csPaintPlaying();
  const live = csLiveWave();
  if (live) csPaintWave(live);
}

// opts.loop repeats the whole track, opts.startAt resumes from a position. Both are the
// 듣기 screen's; dictation passes neither and behaves exactly as it did.
function csPlay(src, rate, onEnd, opts) {
  csStop();
  if (typeof Audio !== 'function') return false;
  let el = null;
  try { el = new Audio('/' + src); } catch (e) { return false; }
  cassetteTrack = { el: el, src: src };
  try {
    if (typeof AudioMixer !== 'undefined') {
      if (AudioMixer.voiceLevel) el.volume = AudioMixer.voiceLevel();
      if (AudioMixer.voiceStart) AudioMixer.voiceStart();
    }
    el.playbackRate = rate || 1;
    el.loop = !!(opts && opts.loop);
    const startAt = (opts && opts.startAt) || 0;
    if (startAt > 0) {
      // currentTime before metadata is either ignored or throws, so wait for it when it
      // has not arrived — which on a cold CDN fetch it will not have.
      const seek = () => { try { el.currentTime = startAt; } catch (e) {} };
      if (el.readyState >= 1) seek();
      else if (typeof el.addEventListener === 'function') el.addEventListener('loadedmetadata', seek, { once: true });
    }
    el.onended = () => {
      if (!cassetteTrack || cassetteTrack.el !== el) return;
      // A loop whose end sits on the last frame gets no tick before the element stops, so
      // `ended` is where that case is caught.
      const live = csLiveWave();
      const st = live ? CS_WAVES[live].st() : null;
      const jump = csRangeSeek(el.currentTime || 0, st ? csRange(st.a, st.b, el.duration || 0) : null, true);
      if (jump !== null) {
        try { el.currentTime = jump; el.play(); return; } catch (e) {}
      }
      csStop();
      if (onEnd) onEnd();
    };
    el.onerror = () => { if (cassetteTrack && cassetteTrack.el === el) csStop(); };
    el.ontimeupdate = () => { if (cassetteTrack && cassetteTrack.el === el) csPaintProgress(el); };
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => csStop());
    csPaintPlaying();
    csTickStart();
    return true;
  } catch (e) { csStop(); return false; }
}

function csIsPlaying(src) {
  return !!(cassetteTrack && (!src || cassetteTrack.src === src));
}

function csPaintPlaying() {
  document.querySelectorAll('.cs-play').forEach((b) => {
    const on = csIsPlaying(b.getAttribute('data-src') || null);
    b.classList.toggle('on', on);
    b.textContent = on ? '❙❙' : '▶';
  });
}

// The clock only. The playhead moved to #listen-wave, which the ticker repaints — a bar and
// a waveform both claiming to show progress rounded differently and disagreed on screen.
// Reads from state when there is no element, so the readout survives a pause.
function csPaintProgress(el) {
  const clock = $('listen-clock');
  if (!clock) return;
  const st = listenState;
  const cur = (st && cassetteBank) ? (cassetteBank.tracks || [])[st.i] : null;
  const d = (el && el.duration) || (cur && cur.dur) || 0;
  const t = el ? (el.currentTime || 0) : ((st && st.at) || 0);
  clock.textContent = csClock(t) + ' / ' + csClock(d);
}

function csClock(s) {
  const n = Math.max(0, Math.round(s || 0));
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
}

// Tenths, for the A-B readout only. csClock rounds to the second, which is the right
// resolution for a track and the wrong one for a two-second stretch of it — 0:02-0:04
// says nothing about a loop you are about to hear forty times.
function csClockMs(s) {
  const v = Math.max(0, s || 0);
  const m = Math.floor(v / 60);
  const rest = v - m * 60;
  return m + ':' + (rest < 10 ? '0' : '') + rest.toFixed(1);
}

// ── the waveform, and looping a stretch of it ────────────────────────────────
// Three things a listening station needs that a play button cannot give you: repeat the
// track, repeat one phrase of it, and see where in the recording you are. The first is the
// <audio> element's own `loop`. The other two need the waveform, because a loop you cannot
// see the edges of is a loop you set by guessing.
//
// The peaks come from decoding the mp3 with Web Audio, not from data cut into the JSON.
// That keeps the pipeline out of it — no peak file to regenerate when a clip is re-cut, and
// nothing to go stale — and costs one decode per track per session, cached below. Where
// Web Audio is missing or the decode fails the strip still draws, still seeks and still
// loops; it simply has no bars, which is a degradation rather than a break.
const CS_PEAK_BUCKETS = 480;
const CS_AB_MIN = 0.25;          // a shorter loop than this is a stutter, not a phrase
const CS_TICK_MS = 30;           // fine enough that an A-B jump is not heard as an overshoot
const CS_DRAG_PX = 4;            // below this a pointer gesture is a seek, not a selection
const csPeakCache = {};          // src → number[] , or null for "tried and could not"
const csPeakPending = {};
let csTicker = null;
let csWaveDrag = null;

// Reduce decoded samples to one 0..1 peak per bucket. Normalised against the loudest
// bucket so a quietly-recorded track is not drawn as a flat line.
function csPeaksFrom(samples, buckets) {
  const n = Math.max(1, buckets | 0);
  const out = new Array(n).fill(0);
  const len = samples ? samples.length : 0;
  if (!len) return out;
  for (let i = 0; i < n; i++) {
    const from = Math.floor(i * len / n);
    const to = Math.min(len, Math.max(from + 1, Math.floor((i + 1) * len / n)));
    let peak = 0;
    for (let k = from; k < to; k++) {
      const v = samples[k] < 0 ? -samples[k] : samples[k];
      if (v > peak) peak = v;
    }
    out[i] = peak;
  }
  let max = 0;
  for (let i = 0; i < n; i++) if (out[i] > max) max = out[i];
  if (max > 0) for (let i = 0; i < n; i++) out[i] = out[i] / max;
  return out;
}

// The armed loop, or null. Marks set backwards are the same loop the other way round, so
// they are sorted rather than refused; a pair too close together is refused, because a
// sub-quarter-second loop spins rather than repeats.
function csRange(a, b, dur) {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  if (!isFinite(a) || !isFinite(b)) return null;
  const cap = dur > 0 ? dur : Math.max(a, b);
  const lo = Math.max(0, Math.min(a, b));
  const hi = Math.min(cap, Math.max(a, b));
  if (!(hi - lo >= CS_AB_MIN)) return null;
  return { a: lo, b: hi };
}

// Where the playhead has to go, or null to leave it alone. Both the ticker and the
// element's own `ended` ask this: a loop whose end sits on the last frame of the track
// never gets a tick before the element stops itself, and `ended` is the only warning.
function csRangeSeek(t, range, ended) {
  if (!range) return null;
  if (ended) return range.a;
  return t >= range.b ? range.a : null;
}

// x within a strip of the given width → a time in the track.
function csTimeAtX(x, width, dur) {
  if (!(width > 0) || !(dur > 0)) return 0;
  const f = Math.max(0, Math.min(1, x / width));
  return f * dur;
}

// ── Practice badges ─────────────────────────────────────────────────────
// A count beside the thing it counts, in the list where you choose what to do next — which
// is the only place the number changes a decision. "×3 · 78%" reads as three sittings at 78%
// of blanks right; a track has no score, so it shows the count alone.
function practiceBadge(key) {
  if (typeof practiceEntry !== 'function') return '';
  const e = practiceEntry(key);
  if (!e || !e.n) return '';
  const pct = e.of > 0 ? Math.round((e.ok / e.of) * 100) : null;
  return '<span class="prac-badge' + (pct !== null && pct >= 90 ? ' good' : '') + '">×' + e.n
    + (pct !== null ? ' · ' + pct + '%' : '') + '</span>';
}

function wbPracticeBadge(bankId, exId) {
  return practiceBadge(typeof practiceKey === 'function' ? practiceKey('wb', bankId, exId) : '');
}

function csPracticeBadge(kind, unit, id) {
  return practiceBadge(typeof practiceKey === 'function' ? practiceKey(kind, unit, id) : '');
}

function csWaveDur() {
  const st = listenState;
  if (cassetteTrack && cassetteTrack.el.duration > 0) return cassetteTrack.el.duration;
  const cur = st && cassetteBank ? (cassetteBank.tracks || [])[st.i] : null;
  return (cur && cur.dur) || 0;
}

function csHeadTime() {
  if (cassetteTrack) return cassetteTrack.el.currentTime || 0;
  return (listenState && listenState.at) || 0;
}

function csLoadPeaks(src) {
  if (Object.prototype.hasOwnProperty.call(csPeakCache, src)) return Promise.resolve(csPeakCache[src]);
  if (csPeakPending[src]) return csPeakPending[src];
  const AC = typeof AudioContext === 'function' ? AudioContext
    : (typeof webkitAudioContext === 'function' ? webkitAudioContext : null);
  if (!AC || typeof fetch !== 'function') {
    csPeakCache[src] = null;
    return Promise.resolve(null);
  }
  const p = fetch('/' + src)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((buf) => {
      if (!buf) return null;
      let ctx = null;
      try { ctx = new AC(); } catch (e) { return null; }
      return new Promise((res) => {
        // The callback form: decodeAudioData does not return a promise everywhere, and the
        // context has to be closed either way or a tab full of them exhausts the hardware.
        const done = (audio) => { try { ctx.close(); } catch (e) {} res(audio || null); };
        try { ctx.decodeAudioData(buf, done, () => done(null)); } catch (e) { done(null); }
      });
    })
    .then((audio) => {
      let peaks = null;
      try { peaks = audio ? csPeaksFrom(audio.getChannelData(0), CS_PEAK_BUCKETS) : null; }
      catch (e) { peaks = null; }
      csPeakCache[src] = peaks;
      delete csPeakPending[src];
      return peaks;
    })
    .catch(() => { csPeakCache[src] = null; delete csPeakPending[src]; return null; });
  csPeakPending[src] = p;
  return p;
}

// Which screens carry a strip. A screen describes itself here rather than the strip reaching
// into a global, so 듣기 and 받아쓰기 can each own one without either knowing about the other.
const CS_WAVES = {
  'listen-wave': {
    overlay: 'listen-overlay',
    st: () => listenState,
    src: () => {
      const s = listenState;
      const c = (s && cassetteBank) ? (cassetteBank.tracks || [])[s.i] : null;
      return (c && c.src) || '';
    },
    dur: () => csWaveDur(),
    at: () => csHeadTime(),
    seek: (t) => listenSeek(t),
    commit: () => listenReplayAB(),
    render: () => renderListen()
  },
  'dict-wave': {
    overlay: 'dictation-overlay',
    st: () => dictState,
    src: () => {
      const s = dictState;
      const it = s ? dictItems()[s.i] : null;
      return (it && it.audio && it.audio.src) || '';
    },
    dur: () => dictWaveDur(),
    at: () => dictHeadTime(),
    seek: (t) => dictSeek(t),
    commit: () => dictReplayAB(),
    render: () => renderDictation()
  }
};

// Which strip is on screen. Both states can be live at once if a screen was left open
// behind another, so the visible overlay decides rather than whichever state is non-null.
function csLiveWave() {
  const keys = Object.keys(CS_WAVES);
  for (let i = 0; i < keys.length; i++) {
    const w = CS_WAVES[keys[i]];
    const el = $(w.overlay);
    if (el && el.classList && el.classList.contains('visible') && w.st()) return keys[i];
  }
  return null;
}

// 'ready' once the peaks are in, 'none' once a decode has been tried and failed, 'wait'
// until then. Three states rather than two, because the honest thing to draw while waiting
// is not a waveform — see the drawing below.
function csWaveState(src) {
  if (!src) return 'none';
  const p = csPeakCache[src];
  if (p && p.length) return 'ready';
  if (Object.prototype.hasOwnProperty.call(csPeakCache, src)) return 'none';
  return 'wait';
}

// The strip. Bars when the peaks are in; a RULE — not bars — when they are not.
//
// This used to draw a row of uniform short bars while the decode was in flight, which was a
// mistake worth naming: a flat evenly-spaced comb is indistinguishable from a real waveform
// of a silent recording, so a strip that was merely still loading looked broken. It is a
// line now, and the caller says WAVEFORM… or NO WAVEFORM beside it. Nobody mistakes a
// straight line for audio.
function csPaintWave(id) {
  const w = CS_WAVES[id];
  const cv = $(id);
  if (!w || !cv || typeof cv.getContext !== 'function') return;
  const st = w.st();
  if (!st) return;
  let ctx = null;
  try { ctx = cv.getContext('2d'); } catch (e) { return; }
  if (!ctx) return;

  const W = cv.width, H = cv.height, mid = Math.round(H / 2);
  const src = w.src();
  const dur = w.dur();
  const at = w.at();
  const state = csWaveState(src);
  const peaks = state === 'ready' ? csPeakCache[src] : null;
  const range = csRange(st.a, st.b, dur);
  const played = dur > 0 ? Math.max(0, Math.min(1, at / dur)) : 0;

  ctx.clearRect(0, 0, W, H);

  if (peaks) {
    // Integer rects on a 2x canvas, so the bars land on device pixels and read as pixel art
    // rather than as a blurred line. Mean of the peaks under a bar rather than max: max
    // saturates on speech this compressed and flattens the envelope.
    const step = 6, barW = 4;
    const bars = Math.max(1, Math.floor(W / step));
    const per = peaks.length / bars;
    for (let i = 0; i < bars; i++) {
      const from = Math.floor(i * per);
      const to = Math.min(peaks.length, Math.max(from + 1, Math.floor((i + 1) * per)));
      let sum = 0, n = 0, top = 0;
      for (let k = from; k < to; k++) { sum += peaks[k]; n++; if (peaks[k] > top) top = peaks[k]; }
      // Halfway between the mean and the loudest sample under the bar: the mean alone loses
      // a one-bucket consonant burst, the max alone loses the envelope.
      const v = n ? (sum / n + top) / 2 : 0;
      const h = Math.max(2, Math.round(v * (H - 10)));
      ctx.fillStyle = ((i + 0.5) / bars) <= played ? '#4a2a0d' : '#c4893a';
      ctx.fillRect(i * step + 1, mid - Math.round(h / 2), barW, h);
    }
  } else if (state === 'wait') {
    // Dashes, so it reads as "not yet" rather than as a recording.
    ctx.fillStyle = '#d8b483';
    for (let x = 2; x < W - 8; x += 16) ctx.fillRect(x, mid - 1, 8, 2);
  } else {
    ctx.fillStyle = '#d8b483';
    ctx.fillRect(2, mid - 1, W - 4, 2);
  }

  // Seeking and looping work whatever the bars are doing, so these draw in every state.
  if (range && dur > 0) {
    const x1 = Math.round((range.a / dur) * W);
    const x2 = Math.round((range.b / dur) * W);
    ctx.fillStyle = 'rgba(30, 58, 138, 0.14)';
    ctx.fillRect(x1, 0, Math.max(2, x2 - x1), H);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(x1, 0, 2, H);
    ctx.fillRect(Math.max(x1 + 2, x2 - 2), 0, 2, H);
  } else if (dur > 0) {
    // Half a loop shows as a stub rather than as nothing, so a mark that landed looks like
    // it landed: A hangs from the top, B rises from the bottom.
    [st.a, st.b].forEach((m, k) => {
      if (typeof m !== 'number') return;
      const x = Math.max(0, Math.min(W - 2, Math.round((m / dur) * W)));
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x, k ? H - 16 : 0, 2, 16);
    });
  }

  if (dur > 0) {
    ctx.fillStyle = '#a32b1c';
    ctx.fillRect(Math.max(0, Math.min(W - 2, Math.round(played * W))), 0, 2, H);
  }
}

// What the caller prints beside the strip, so a loading strip says so in words as well.
function csWaveLabel(id) {
  const w = CS_WAVES[id];
  if (!w) return '';
  const st = w.st();
  if (!st) return '';
  const range = csRange(st.a, st.b, w.dur());
  if (range) {
    return csClockMs(range.a) + '-' + csClockMs(range.b) + ' · ' + (range.b - range.a).toFixed(1) + 'S';
  }
  if (typeof st.a === 'number') return hvT('ui.listen.ab.aSet');
  if (typeof st.b === 'number') return hvT('ui.listen.ab.bSet');
  const state = csWaveState(w.src());
  if (state === 'wait') return hvT('ui.listen.wave.wait');
  if (state === 'none') return hvT('ui.listen.wave.none');
  return hvT('ui.listen.wave.drag');
}

// Ask for the peaks and repaint when they land. Safe to call on every render: the cache and
// the in-flight map between them mean one decode per recording per session.
function csWaveLoad(id) {
  const w = CS_WAVES[id];
  if (!w) return;
  const src = w.src();
  if (!src || csWaveState(src) !== 'wait') return;
  csLoadPeaks(src).then(() => {
    // The screen may have moved on to another recording while this was decoding.
    if (w.src() === src) { csPaintWave(id); if (w.render) w.render(); }
  });
}

function csTickStop() {
  if (csTicker !== null && typeof clearInterval === 'function') clearInterval(csTicker);
  csTicker = null;
}

// One ticker for whichever strip is on screen. 듣기 and 받아쓰기 loop by the same rules, so
// they run the same tick rather than each growing its own timer.
function csTick() {
  const id = csLiveWave();
  if (!id || !cassetteTrack) { csTickStop(); return; }
  const w = CS_WAVES[id];
  const st = w.st();
  const el = cassetteTrack.el;
  st.at = el.currentTime || 0;
  const range = csRange(st.a, st.b, el.duration || 0);
  // Whole-track repeat is the element's own loop, but an armed stretch governs instead —
  // otherwise the native wrap fires at the end of the track and the stretch never gets to.
  el.loop = !!st.loop && !range;
  const jump = csRangeSeek(st.at, range, false);
  if (jump !== null) {
    try { el.currentTime = jump; st.at = jump; } catch (e) {}
  }
  // A listen counts once the halfway mark is passed. Counting on open would reward clicking
  // down the track list; counting only on `ended` would miss every session that loops, which
  // is most of them now. The flag clears when the playhead wraps back to the start, so a
  // second pass counts again — the question is "how many times", not "have I ever".
  if (id === 'listen-wave' && typeof recordPractice === 'function') {
    const dur = el.duration || 0;
    if (st.at < 1) st.counted = false;
    else if (!st.counted && dur > 0 && st.at >= dur * 0.5) {
      st.counted = true;
      const cur = (cassetteBank && (cassetteBank.tracks || [])[st.i]) || null;
      if (cur) recordPractice(practiceKey('trk', cassetteBank.unit, cur.n));
    }
  }
  csPaintWave(id);
  if (id === 'listen-wave') csPaintProgress(el);
  else csPaintDictClock(el);
}

function csTickStart() {
  csTickStop();
  if (typeof setInterval !== 'function') return;
  csTicker = setInterval(csTick, CS_TICK_MS);
}

function csWaveBind(id) {
  const w = CS_WAVES[id];
  const cv = $(id);
  if (!w || !cv || cv._csBound || typeof cv.addEventListener !== 'function') return;
  cv._csBound = true;
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX || 0) - r.left;
    return { x: x, t: csTimeAtX(x, r.width, w.dur()) };
  };
  // Pointer events rather than mouse events, and a few pixels of slop before a press counts
  // as a drag — the same rule the workbook chips follow, and for the same reason: a tap on a
  // touchscreen wanders by a pixel or two and would otherwise arm a nonsense loop.
  cv.addEventListener('pointerdown', (e) => {
    if (!w.st()) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const p = pos(e);
    csWaveDrag = { id: id, x0: p.x, t0: p.t, t1: p.t, moved: false };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!csWaveDrag || csWaveDrag.id !== id) return;
    const p = pos(e);
    csWaveDrag.t1 = p.t;
    if (Math.abs(p.x - csWaveDrag.x0) >= CS_DRAG_PX) csWaveDrag.moved = true;
    const st = w.st();
    if (csWaveDrag.moved && st) {
      st.a = Math.min(csWaveDrag.t0, csWaveDrag.t1);
      st.b = Math.max(csWaveDrag.t0, csWaveDrag.t1);
      csPaintWave(id);
    }
  });
  const finish = () => {
    const d = csWaveDrag;
    csWaveDrag = null;
    if (!d || d.id !== id || !w.st()) return;
    if (d.moved) w.commit();
    else w.seek(d.t0);
  };
  cv.addEventListener('pointerup', finish);
  cv.addEventListener('pointercancel', () => { csWaveDrag = null; if (w.render) w.render(); });
}

// ── the chooser ─────────────────────────────────────────────────────────────
function openCassette() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  loadCassette().then((bank) => {
    if (!bank) return;
    cassetteMenuIndex = 0;
    const head = $('cassette-title');
    if (head) head.textContent = '📻 ' + (bank.titleKo || '카세트 플레이어');
    const sub = $('cassette-sub');
    if (sub) sub.textContent = tr(bank, 'titleEn') || '';
    const foot = $('cassette-foot');
    if (foot) {
      const n = (bank.tracks || []).length;
      const d = ((bank.dictation && bank.dictation.items) || []).length;
      foot.innerHTML = '<span class="cs-foot-ko">' + vbEsc(bank.unitKo || '') + '</span>'
        + '<span class="cs-foot-n">' + vbEsc(hvT('ui.cassette.foot', { tracks: n, lines: d })) + '</span>';
    }
    renderCassetteMenu();
    setModalState('cassette-overlay', true);
  });
}

function closeCassette() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  csStop();
  setModalState('cassette-overlay', false);
}

const CASSETTE_MODES = [
  { key: 'listen', ko: '듣기', label: 'LISTEN', labelVi: 'NGHE', icon: '🎧',
    en: 'Listen, slow down, hide the script, or loop one difficult phrase.',
    vi: 'Nghe, chậm lại, giấu lời thoại, hoặc lặp một câu khó.', run: () => openListen() },
  { key: 'dictation', ko: '받아쓰기', label: 'DICTATION', labelVi: 'CHÉP CHÍNH TẢ', icon: '✏️',
    en: 'Write one sentence at a time and compare only the syllables you missed.',
    vi: 'Viết từng câu một rồi chỉ đối chiếu những âm tiết bạn viết sai.', run: () => openDictation() }
];

function renderCassetteMenu() {
  const box = $('cassette-list');
  if (!box) return;
  box.innerHTML = '';
  CASSETTE_MODES.forEach((m, i) => {
    const p = cassetteModeProgress(cassetteBank || {}, m.key);
    const second = p.accuracy !== null
      ? hvT('ui.cassette.accuracy', { n: p.accuracy })
      : (p.attempts ? hvT('ui.cassette.sittings', { n: p.attempts }) : hvT('ui.cassette.ready'));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cs-mode-card' + (i === cassetteMenuIndex ? ' focus' : '');
    b.setAttribute('data-mode', m.key);
    b.setAttribute('aria-label', m.ko + ' · ' + tr(m, 'label') + '. '
      + hvT('ui.cassette.practised', { n: p.done, total: p.total }));
    b.innerHTML =
      '<span class="cs-mode-top"><span class="cs-mode-icon">' + vbEsc(m.icon) + '</span>' +
        '<span class="cs-mode-key">' + (i + 1) + '</span></span>' +
      '<span class="cs-mode-title">' + vbEsc(m.ko) + '<small>' + vbEsc(tr(m, 'label')) + '</small></span>' +
      '<span class="cs-mode-desc">' + vbEsc(tr(m, 'en')) + '</span>' +
      '<span class="cs-mode-meta"><span>' + vbEsc(hvT('ui.cassette.practisedShort', { n: p.done, total: p.total })) + '</span>' +
        '<span>' + vbEsc(second) + '</span></span>' +
      '<span class="cs-mode-progress" aria-hidden="true"><span style="width:' + p.pct + '%"></span></span>';
    b.onclick = () => runCassetteMode(i);
    box.appendChild(b);
  });
}

function runCassetteMode(i) {
  const m = CASSETTE_MODES[i];
  if (!m) return;
  setModalState('cassette-overlay', false);
  m.run();
}

// ── 듣기 ─────────────────────────────────────────────────────────────────────
function openListen() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  loadCassette().then((bank) => {
    if (!bank) return;
    // Opens on the unit's first real conversation rather than on a two-line grammar
    // box, which is a thin thing to land on. Named per unit because the track numbers
    // are the book's, not ours.
    const tracks = bank.tracks || [];
    const OPEN_ON = { '2b-unit-10': 4, '2b-unit-11': 14, '2b-unit-13': 34, '2b-unit-14': 44 };
    const pref = csUnitPrefs(bank.unit);
    const want = pref.track !== undefined ? pref.track : OPEN_ON[bank.unit];
    const start = tracks.findIndex((t) => t.n === want);
    const i = start >= 0 ? start : 0;
    const cur = tracks[i];
    const savedAt = Number(pref.listenAt) || 0;
    const at = cur && savedAt > 0 && savedAt < Math.max(0, (cur.dur || 0) - 0.2) ? savedAt : 0;
    listenState = {
      i: i, rate: csSafeRate(pref.listenRate, 1), loop: false,
      a: null, b: null, at: at, counted: false, query: '', showScript: pref.showScript !== false
    };
    renderListen();
    setModalState('listen-overlay', true);
  });
}

function closeListen() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  csRememberListen();
  csStop();
  listenState = null;
  setModalState('listen-overlay', false);
  openCassette();
}

function listenPick(i) {
  if (!listenState) return;
  if (cassetteTrack) listenState.at = csHeadTime();
  csRememberListen();
  csStop();
  listenState.i = i;
  // A loop belongs to the track it was drawn on. Carrying 4.2-6.8s across to a 13-second
  // grammar box would loop a different sentence and look like it had been kept on purpose.
  listenState.a = null;
  listenState.b = null;
  listenState.at = 0;
  listenState.counted = false;
  csRememberListen();
  renderListen();
}

function listenToggle() {
  const bank = cassetteBank, st = listenState;
  if (!bank || !st) return;
  const t = (bank.tracks || [])[st.i];
  if (!t) return;
  if (csIsPlaying(t.src)) { st.at = csHeadTime(); csRememberListen(); csStop(); return; }
  // Resumes where it stopped rather than from the top. csStop is a hard stop — one player
  // for every cassette screen is the invariant — so the position is remembered here and
  // handed back in, which is the same thing from the listener's side.
  const range = csRange(st.a, st.b, csWaveDur());
  const at = (st.at > 0 && (!range || st.at < range.b)) ? st.at : (range ? range.a : 0);
  csPlay(t.src, st.rate, () => {
    if (!listenState) return;
    listenState.at = 0;
    listenState.counted = false;
    csRememberListen();
    renderListen();
  }, { loop: st.loop && !range, startAt: at });
}

function listenRate(r) {
  if (!listenState) return;
  listenState.rate = r;
  if (cassetteTrack) cassetteTrack.el.playbackRate = r;
  csRememberListen();
  renderListen();
}

function listenFilter(value) {
  if (!listenState) return;
  listenState.query = String(value || '').trim().toLowerCase();
  renderListen();
}

function listenToggleScript() {
  if (!listenState) return;
  listenState.showScript = !listenState.showScript;
  csRememberListen();
  renderListen();
}

function listenToggleLoop() {
  const st = listenState;
  if (!st) return;
  st.loop = !st.loop;
  if (cassetteTrack) cassetteTrack.el.loop = st.loop && !csRange(st.a, st.b, csWaveDur());
  renderListen();
}

function listenSeek(t) {
  const st = listenState;
  if (!st) return;
  st.at = Math.max(0, Math.min(csWaveDur() || t || 0, t || 0));
  if (cassetteTrack) { try { cassetteTrack.el.currentTime = st.at; } catch (e) {} }
  csPaintWave('listen-wave');
  csPaintProgress(cassetteTrack ? cassetteTrack.el : null);
}

function listenNudge(by) {
  listenSeek(csHeadTime() + by);
}

function listenStep(by) {
  const st = listenState;
  if (!st || !cassetteBank) return;
  const n = (cassetteBank.tracks || []).length;
  if (!n) return;
  listenPick((st.i + by + n) % n);
}

function listenSetA() {
  const st = listenState;
  if (!st) return;
  st.a = csHeadTime();
  // B before A is not a loop. Dropping it is kinder than silently swapping the two, because
  // the next thing the listener does is set B where they actually want it.
  if (typeof st.b === 'number' && st.b <= st.a + CS_AB_MIN) st.b = null;
  renderListen();
}

function listenSetB() {
  const st = listenState;
  if (!st) return;
  st.b = csHeadTime();
  if (typeof st.a === 'number' && st.b <= st.a + CS_AB_MIN) st.a = null;
  renderListen();
}

function listenClearAB() {
  const st = listenState;
  if (!st) return;
  st.a = null;
  st.b = null;
  if (cassetteTrack) cassetteTrack.el.loop = !!st.loop;
  renderListen();
}

// Play the marked stretch from its start — the button a listener reaches for after dragging
// one out. With nothing marked it is a plain replay from the top, which is what ↺ says.
function listenReplayAB() {
  const bank = cassetteBank, st = listenState;
  if (!bank || !st) return;
  const t = (bank.tracks || [])[st.i];
  if (!t) return;
  const range = csRange(st.a, st.b, csWaveDur());
  st.at = range ? range.a : 0;
  csPlay(t.src, st.rate, null, { loop: st.loop && !range, startAt: st.at });
  renderListen();
}

function renderListen() {
  const bank = cassetteBank, st = listenState;
  if (!bank || !st) return;
  const tracks = bank.tracks || [];
  const cur = tracks[st.i] || tracks[0];
  if (!cur) return;

  const heading = $('listen-title');
  if (heading) heading.textContent = (bank.titleKo || '카세트') + ' · 듣기';
  const context = $('listen-context');
  if (context) context.textContent = (bank.unitKo || '') + ' · 이어서 듣는 위치와 속도를 자동으로 기억합니다';

  const query = String(st.query || '').toLowerCase();
  const visible = tracks.map((t, i) => ({ t: t, i: i })).filter((row) => {
    if (!query) return true;
    const hay = [row.t.n, row.t.sec, row.t.secEn, tr(row.t, 'secEn')].map((v) => String(v || '').toLowerCase()).join(' ');
    return hay.indexOf(query) >= 0;
  });

  const list = $('listen-tracks');
  if (list) {
    list.innerHTML = '';
    visible.forEach((row) => {
      const t = row.t, i = row.i;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cs-track' + (i === st.i ? ' on' : '');
      b.setAttribute('data-track-index', i);
      b.setAttribute('aria-pressed', i === st.i ? 'true' : 'false');
      b.innerHTML =
        '<span class="cs-tn">' + t.n + '</span>' +
        '<span class="cs-tt"><span class="cs-tko">' + vbEsc(t.sec) + '</span>' +
        '<span class="cs-ten">' + vbEsc(tr(t, 'secEn')) + '</span></span>' +
        '<span class="cs-td">' + csClock(t.dur)
          + csPracticeBadge('trk', bank.unit, t.n) + '</span>';
      b.onclick = () => listenPick(i);
      list.appendChild(b);
    });
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'prac-empty';
      empty.textContent = '검색 결과가 없습니다 · No matching track';
      list.appendChild(empty);
    }
  }

  const filter = $('listen-search');
  if (filter && filter.value !== (st.query || '')) filter.value = st.query || '';
  const trackCount = $('listen-track-count');
  if (trackCount) trackCount.textContent = visible.length + ' / ' + tracks.length;

  const nm = $('listen-now');
  if (nm) nm.textContent = cur.sec;
  const nowEn = $('listen-now-en');
  if (nowEn) nowEn.textContent = tr(cur, 'secEn') || '';
  const nowKicker = $('listen-now-kicker');
  if (nowKicker) nowKicker.textContent = hvT('ui.cassette.track', { n: cur.n })
    + ' · ' + (st.i + 1) + ' / ' + tracks.length;
  const play = $('listen-play');
  if (play) play.setAttribute('data-src', cur.src);
  document.querySelectorAll('#listen-rates .cs-rate').forEach((b) => {
    b.classList.toggle('on', Number(b.getAttribute('data-rate')) === st.rate);
  });
  csPaintProgress(cassetteTrack ? cassetteTrack.el : null);

  // ── the waveform and the loop controls ──
  const dur = csWaveDur();
  const range = csRange(st.a, st.b, dur);
  const halfMark = typeof st.a === 'number' || typeof st.b === 'number';
  const lp = $('listen-loop');
  if (lp) lp.classList.toggle('on', !!st.loop);
  const sa = $('listen-seta');
  if (sa) sa.classList.toggle('on', typeof st.a === 'number');
  const sb = $('listen-setb');
  if (sb) sb.classList.toggle('on', typeof st.b === 'number');
  const abc = $('listen-abclear');
  if (abc) abc.disabled = !halfMark;
  const info = $('listen-abinfo');
  if (info) {
    info.classList.toggle('on', !!range);
    // csWaveLabel also reports WAVEFORM… / NO WAVEFORM, which is half the point: a strip
    // still decoding says so in words rather than looking like a waveform that came out flat.
    info.textContent = csWaveLabel('listen-wave')
      + (range || halfMark ? '' : ' · ' + hvT('ui.listen.wave.dragPhrase'));
  }
  csWaveBind('listen-wave');
  csPaintWave('listen-wave');
  // Decoding is per track per session and the strip works without it, so this is fired and
  // forgotten rather than awaited — the screen is usable while the bars arrive.
  csWaveLoad('listen-wave');

  const pane = $('listen-script');
  if (pane) {
    if (Array.isArray(cur.lines)) {
      pane.className = 'cs-script' + (st.showScript ? '' : ' is-hidden');
      pane.innerHTML = cur.lines.map((l) =>
        '<div class="cs-line"><span class="cs-who">' + vbEsc(l.who) + '</span>' +
        '<span class="cs-ko">' + vbEsc(l.ko) + '</span></div>').join('');
    } else {
      // Said rather than left blank. The book prints this track's comprehension
      // questions and not its script, so an empty pane would read as a bug.
      pane.className = 'cs-script empty' + (st.showScript ? '' : ' is-hidden');
      pane.innerHTML = '<div class="cs-none"><span class="cs-none-ko">대본이 없는 트랙</span>'
        + '<span class="cs-none-en">' + vbEsc(tr(cur, 'noteEn') || '') + '</span></div>';
    }
    if (!st.showScript) {
      pane.innerHTML += '<div class="cs-script-cover"><b>대본을 가렸습니다.</b><br>'
        + '먼저 소리에 집중하고, 막히면 위의 “대본 보기”를 누르세요.<br>'
        + '<span>Transcript hidden for a listening-first pass.</span></div>';
    }
  }
  const scriptToggle = $('listen-script-toggle');
  if (scriptToggle) {
    scriptToggle.textContent = st.showScript ? '대본 숨기기' : '대본 보기';
    scriptToggle.setAttribute('aria-pressed', st.showScript ? 'false' : 'true');
  }
  csPaintPlaying();
}

// ── 받아쓰기 ─────────────────────────────────────────────────────────────────
// Longest common subsequence over characters. A positional compare reddens the
// whole tail the moment one syllable goes missing — and dropping a syllable is the
// commonest dictation slip there is, so the panel would be at its most misleading
// exactly when it was most needed.
function dictAlign(answer, typed) {
  const a = [...String(answer)], b = [...String(typed)];
  const m = a.length, n = b.length;
  const L = [];
  for (let i = 0; i <= m; i++) L.push(new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const ans = [], got = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ans.push({ ch: a[i], ok: true }); got.push({ ch: b[j], ok: true }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { ans.push({ ch: a[i], ok: false }); i++; }
    else { got.push({ ch: b[j], ok: false }); j++; }
  }
  while (i < m) ans.push({ ch: a[i++], ok: false });
  while (j < n) got.push({ ch: b[j++], ok: false });
  return { ans: ans, got: got };
}

// Spacing is worth marking but not worth failing on: 한번 versus 한 번 is a real
// distinction the notes talk about, while a missing space between two clauses is
// not what dictation is testing. So the score ignores whitespace and the answer
// line still shows the spacing the book prints.
function dictNorm(s) {
  return String(s == null ? '' : s).normalize('NFC').replace(/\s+/g, '');
}

function openDictation() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  loadCassette().then((bank) => {
    if (!bank) return;
    const items = (bank.dictation && bank.dictation.items) || [];
    if (!items.length) return;
    const pref = csUnitPrefs(bank.unit);
    const saved = items.findIndex((it) => it.id === pref.dictationId);
    dictState = { i: saved >= 0 ? saved : 0, typed: '', checked: false,
      rate: csSafeRate(pref.dictationRate, 1), right: 0, done: 0,
      loop: false, a: null, b: null, at: 0 };
    renderDictation();
    setModalState('dictation-overlay', true);
    const el = $('dict-input');
    if (el) setTimeout(() => el.focus(), 60);
  });
}

function closeDictation() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  csRememberDictation();
  csStop();
  dictState = null;
  setModalState('dictation-overlay', false);
  openCassette();
}

function dictItems() {
  return (cassetteBank && cassetteBank.dictation && cassetteBank.dictation.items) || [];
}

function dictPlay(rate) {
  const st = dictState;
  if (!st) return;
  const it = dictItems()[st.i];
  if (!it || !it.audio) return;
  if (typeof rate === 'number') st.rate = rate;
  csRememberDictation();
  // ↻ 다시 has always meant "from the top", so a bare dictPlay() restarts. A marked stretch
  // starts at its own beginning instead, because that is the thing being replayed.
  const range = csRange(st.a, st.b, dictWaveDur());
  st.at = range ? range.a : 0;
  csPlay(it.audio.src, st.rate, null, { loop: st.loop && !range, startAt: st.at });
  renderDictationRates();
  renderDictationWave();
}

// ── the strip on 받아쓰기 ─────────────────────────────────────────────────────
// The same component 듣기 uses, and worth having here for a different reason: on a
// 24-syllable sentence the part you cannot hear is three syllables long, and looping those
// three at 0.5× is the whole exercise. No letter shortcuts on this screen — it has a text
// input, and a dictation screen that swallowed the letter you typed would be worse than
// having no shortcuts at all.
function dictWaveDur() {
  const st = dictState;
  if (cassetteTrack && cassetteTrack.el.duration > 0) return cassetteTrack.el.duration;
  const it = st ? dictItems()[st.i] : null;
  // A dictation row declares no duration, but `voiced` plus the pads the cut added is the
  // length of the file to within a few hundredths — enough to click on before it has played.
  if (it && it.audio && it.audio.voiced > 0) return it.audio.voiced + 0.27;
  return 0;
}

function dictHeadTime() {
  if (cassetteTrack) return cassetteTrack.el.currentTime || 0;
  return (dictState && dictState.at) || 0;
}

// Tenths here rather than whole seconds: every clip on this screen is under ten of them.
function csPaintDictClock(el) {
  const clock = $('dict-clock');
  if (!clock) return;
  const d = (el && el.duration) || dictWaveDur() || 0;
  const t = el ? (el.currentTime || 0) : ((dictState && dictState.at) || 0);
  clock.textContent = csClockMs(t) + ' / ' + csClockMs(d);
}

function dictSeek(t) {
  const st = dictState;
  if (!st) return;
  st.at = Math.max(0, Math.min(dictWaveDur() || t || 0, t || 0));
  if (cassetteTrack) { try { cassetteTrack.el.currentTime = st.at; } catch (e) {} }
  csPaintWave('dict-wave');
  csPaintDictClock(cassetteTrack ? cassetteTrack.el : null);
}

function dictToggleLoop() {
  const st = dictState;
  if (!st) return;
  st.loop = !st.loop;
  if (cassetteTrack) cassetteTrack.el.loop = st.loop && !csRange(st.a, st.b, dictWaveDur());
  renderDictationWave();
}

function dictSetA() {
  const st = dictState;
  if (!st) return;
  st.a = dictHeadTime();
  if (typeof st.b === 'number' && st.b <= st.a + CS_AB_MIN) st.b = null;
  renderDictationWave();
}

function dictSetB() {
  const st = dictState;
  if (!st) return;
  st.b = dictHeadTime();
  if (typeof st.a === 'number' && st.b <= st.a + CS_AB_MIN) st.a = null;
  renderDictationWave();
}

function dictClearAB() {
  const st = dictState;
  if (!st) return;
  st.a = null;
  st.b = null;
  if (cassetteTrack) cassetteTrack.el.loop = !!st.loop;
  renderDictationWave();
}

function dictReplayAB() {
  dictPlay();
}

function renderDictationWave() {
  const st = dictState;
  if (!st) return;
  const range = csRange(st.a, st.b, dictWaveDur());
  const marked = typeof st.a === 'number' || typeof st.b === 'number';
  const lp = $('dict-loop');
  if (lp) lp.classList.toggle('on', !!st.loop);
  const sa = $('dict-seta');
  if (sa) sa.classList.toggle('on', typeof st.a === 'number');
  const sb = $('dict-setb');
  if (sb) sb.classList.toggle('on', typeof st.b === 'number');
  const abc = $('dict-abclear');
  if (abc) abc.disabled = !marked;
  const info = $('dict-abinfo');
  if (info) {
    info.classList.toggle('on', !!range);
    info.textContent = csWaveLabel('dict-wave');
  }
  csPaintDictClock(cassetteTrack ? cassetteTrack.el : null);
  csWaveBind('dict-wave');
  csPaintWave('dict-wave');
  csWaveLoad('dict-wave');
}

function dictCheck() {
  const st = dictState;
  if (!st || st.checked) return;
  const el = $('dict-input');
  st.typed = el ? el.value : '';
  const it = dictItems()[st.i];
  if (!it) return;
  st.checked = true;
  st.done += 1;
  if (dictNorm(st.typed) === dictNorm(it.ko)) {
    st.right += 1;
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
  } else if (typeof playChiptuneSFX === 'function') {
    playChiptuneSFX('quiz_wrong');
  }
  if (typeof recordPractice === 'function') {
    const right = dictNorm(st.typed) === dictNorm(it.ko) ? 1 : 0;
    recordPractice(practiceKey('dic', cassetteBank && cassetteBank.unit, it.id), right, 1);
  }
  renderDictation();
}

function dictMove(by) {
  const st = dictState;
  if (!st) return;
  csStop();
  const rows = dictItems();
  if (!rows.length) return;
  st.i = (st.i + by + rows.length) % rows.length;
  st.typed = '';
  st.checked = false;
  // A marked stretch belongs to the clip it was drawn on, the same as on 듣기: 1.2-2.4s of
  // the next sentence is a different three syllables.
  st.a = null;
  st.b = null;
  st.at = 0;
  csRememberDictation();
  renderDictation();
  const el = $('dict-input');
  if (el) el.focus();
}

function dictNext() { dictMove(1); }
function dictPrev() { dictMove(-1); }

function renderDictationRates() {
  const st = dictState;
  if (!st) return;
  document.querySelectorAll('#dict-rates .cs-rate').forEach((b) => {
    b.classList.toggle('on', Number(b.getAttribute('data-rate')) === st.rate);
  });
  csPaintPlaying();
}

function renderDictation() {
  const st = dictState;
  if (!st) return;
  const items = dictItems();
  const it = items[st.i];
  if (!it) return;

  const pos = $('dict-pos');
  const dlog = $('dict-log');
  if (dlog) {
    // Lifetime for THIS sentence, not the session: st.done resets every time the screen
    // opens, and "have I written this one before" is the question the log can answer.
    const e = typeof practiceEntry === 'function'
      ? practiceEntry(practiceKey('dic', cassetteBank && cassetteBank.unit, it.id)) : null;
    dlog.textContent = (e && e.n) ? '×' + e.n + (e.of ? ' · ' + Math.round((e.ok / e.of) * 100) + '%' : '') : '';
  }
  if (pos) pos.textContent = (st.i + 1) + ' / ' + items.length + (st.done ? '  ·  ' + st.right + '/' + st.done : '');
  const progress = $('dict-progress-fill');
  if (progress) progress.style.width = Math.round(((st.i + 1) / items.length) * 100) + '%';
  const title = $('dict-title');
  if (title) title.textContent = (cassetteBank.titleKo || '카세트') + ' · 받아쓰기';

  const tags = $('dict-tags');
  if (tags) {
    tags.innerHTML = '<span class="cs-tag trk">' + vbEsc(hvT('ui.cassette.track', { n: it.track })) + '</span>'
      + '<span class="cs-tag who">' + vbEsc(it.who) + '</span>'
      + (it.tags || []).map((t) => '<span class="cs-tag lesson">' + vbEsc(t) + '</span>').join('');
  }

  const hint = $('dict-hint');
  if (hint) hint.textContent = hvT('ui.dict.syllables', { n: it.syl });
  const play = $('dict-play');
  if (play) play.setAttribute('data-src', it.audio ? it.audio.src : '');

  const input = $('dict-input');
  if (input) {
    input.value = st.typed;
    input.disabled = !!st.checked;
  }
  renderDictationWave();
  const check = $('dict-check');
  if (check) {
    check.textContent = st.checked ? '다음 ›' : '확인';
    check.onclick = st.checked ? dictNext : dictCheck;
  }

  const out = $('dict-result');
  if (out) {
    if (!st.checked) { out.innerHTML = ''; out.className = 'cs-result'; }
    else {
      const { ans, got } = dictAlign(dictNorm(it.ko), dictNorm(st.typed));
      const right = ans.filter((c) => c.ok).length;
      const clean = dictNorm(st.typed) === dictNorm(it.ko);
      // The answer is printed with the book's spacing, and marked from the aligned
      // comparison, which ran on the spaceless forms — so the marks land on
      // syllables while the line still reads as the book prints it.
      let k = 0;
      const marked = [...it.ko.normalize('NFC')].map((ch) => {
        if (/\s/.test(ch)) return '<span class="sp"> </span>';
        const cell = ans[k++];
        return '<span class="' + (cell && cell.ok ? 'ok' : 'miss') + '">' + vbEsc(ch) + '</span>';
      }).join('');
      const extra = got.filter((c) => !c.ok);
      out.className = 'cs-result on';
      out.innerHTML =
        '<div class="cs-ansbox">'
        + '<div class="cs-ansrow"><span class="cs-lbl">정답 · ANSWER</span>'
        + '<span class="cs-score ' + (clean ? 'good' : 'bad') + '">'
        + (clean ? 'PERFECT' : right + ' / ' + ans.length) + '</span></div>'
        + '<div class="cs-ans">' + marked + '</div></div>'
        + (extra.length
          ? '<div class="cs-yours"><span class="cs-lbl bad">내가 쓴 것 · YOU WROTE</span><div class="cs-ans">'
            + got.map((c) => '<span class="' + (c.ok ? 'ok' : 'extra') + '">' + vbEsc(c.ch) + '</span>').join('')
            + '</div></div>'
          : '')
        + '<div class="cs-why"><span class="cs-en">' + vbEsc(tr(it, 'en')) + '</span>'
        + '<span class="cs-note">' + vbEsc(it.why) + '</span></div>';
    }
  }
  renderDictationRates();
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

// One question per sitting, drawn without replacement. A bank of past-paper questions is
// not a page to be worked through once — it is a pile to be met again in a different order,
// and the point of a sitting is the single question and its explanation.
//
// Not Math.random() on its own: over a bank of N it repeats the question just answered one
// sitting in N, which reads as broken rather than as random, and it leaves part of the bank
// unseen for a week however large the bank gets — the smaller the bank, the worse it feels, and
// this was written when there were six. The bag holds every question once and refills when
// empty, so a full round
// is guaranteed before anything comes back; a refill never opens with the question that closed
// the previous one.
const wbDrawBags = new Map();
function wbDrawIndex(key, count) {
  if (count <= 1) return 0;
  let bag = wbDrawBags.get(key);
  if (!bag || bag.count !== count || !bag.left.length) {
    const left = [];
    for (let i = 0; i < count; i++) left.push(i);
    for (let i = left.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = left[i]; left[i] = left[j]; left[j] = t;
    }
    // Drawn from the end, so the next one out is the last element.
    const last = bag ? bag.last : -1;
    if (left.length > 1 && left[left.length - 1] === last) {
      const t = left[left.length - 1]; left[left.length - 1] = left[0]; left[0] = t;
    }
    bag = { left: left, last: last, count: count };
    wbDrawBags.set(key, bag);
  }
  const idx = bag.left.pop();
  bag.last = idx;
  return idx;
}

// A shallow clone carrying one item. Everything downstream reads ex.items — the renderer, the
// scorer, the explanation, the gloss — so none of them need to know a draw happened.
function wbDrawOne(bank, ex) {
  const items = (ex && ex.items) || [];
  if (!bank || !bank.drawOne || items.length < 2) return ex;
  const i = wbDrawIndex(String(bank.id || '') + '/' + String(ex.id || ''), items.length);
  return Object.assign({}, ex, { items: [items[i]], drawnFrom: items.length, drawnAt: i });
}

function openWorkbookExercise(id) {
  const st = workbookState;
  if (!st) return;
  const whole = (st.bank.exercises || []).find(e => e.id === id);
  if (!whole) return;
  const ex = wbDrawOne(st.bank, whole);
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
  // Recorded here rather than on open: an exercise you looked at is not one you did.
  if (typeof recordPractice === 'function') {
    recordPractice(practiceKey('wb', st.bank && st.bank.id, st.ex && st.ex.id), st.score, total);
  }
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

// ── Hover glosses on the answer view ─────────────────────────────────────────
// Reading the explanation is where a hard word actually stops you: the right answer is on
// screen and you still cannot see why, because one word in the sentence means nothing yet.
// So every headword the current world teaches becomes hoverable inside the explanation. The
// vocabulary list doubles as the dictionary, which means the feature improves by itself
// every time a question adds words — there is no second list to keep in step with the first.
//
// Two decisions worth keeping:
//
//   * It runs over rendered text nodes, not over the strings before they are escaped. The
//     corrected sentence arrives from wbLineHtml as markup, and matching Korean inside a
//     string of HTML would eventually wrap something living inside an attribute. A text node
//     cannot contain an attribute, so that whole class of bug is gone rather than guarded.
//   * Longest match wins. 재래시장 is one word, and explaining it as 시장 would be worse than
//     saying nothing, because a wrong gloss still looks like an answer.
let wbGlossIndex = null;
let wbGlossFor = null;

function wbReEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function wbGlossTable() {
  const lvl = (typeof currentLesson === 'function') ? currentLesson() : null;
  const words = (lvl && lvl.words) || [];
  if (wbGlossFor === words) return wbGlossIndex;
  const map = new Map();
  words.forEach((w) => {
    const gloss = String((w && tr(w, 'en')) || '').trim();
    if (!gloss) return;
    // A word may list the shapes it actually wears in a sentence. 썰렁하다 never appears as
    // 썰렁하다 — it turns up as 썰렁한 — and deriving that by rule would need a conjugator,
    // so the entry says so instead.
    const keys = [String((w && w.ko) || '').trim()]
      .concat(Array.isArray(w.forms) ? w.forms : []);
    keys.forEach((k) => {
      const key = String(k || '').trim();
      // Two characters minimum: a single syllable matches half the sentence and the
      // explanation turns into a wall of dotted underlines.
      if (key.length < 2 || map.has(key)) return;
      map.set(key, gloss);
    });
  });
  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  wbGlossFor = words;
  wbGlossIndex = keys.length
    ? { map, re: new RegExp(keys.map(wbReEsc).join('|'), 'g') }
    : null;
  return wbGlossIndex;
}

function wbApplyGloss(root) {
  const idx = wbGlossTable();
  if (!root || !idx || typeof document === 'undefined' || !document.createTreeWalker) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.closest('.wb-gl')) continue;
    idx.re.lastIndex = 0;
    if (idx.re.test(node.nodeValue)) targets.push(node);
  }
  let wrapped = 0;
  targets.forEach((n) => {
    const text = n.nodeValue;
    const frag = document.createDocumentFragment();
    let at = 0, m;
    idx.re.lastIndex = 0;
    while ((m = idx.re.exec(text))) {
      if (m.index > at) frag.appendChild(document.createTextNode(text.slice(at, m.index)));
      const span = document.createElement('span');
      span.className = 'wb-gl';
      span.setAttribute('data-gl', idx.map.get(m[0]));
      // A hover tooltip is unreachable by keyboard and invisible on a phone, so the same
      // text goes in title as well. Two mechanisms, one string.
      span.setAttribute('title', m[0] + ' — ' + idx.map.get(m[0]));
      span.setAttribute('tabindex', '0');
      span.textContent = m[0];
      frag.appendChild(span);
      at = m.index + m[0].length;
      wrapped += 1;
    }
    if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
    n.parentNode.replaceChild(frag, n);
  });
  return wrapped;
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

// TOPIK explanations are deliberately thorough, but a thorough answer should not arrive as
// one uninterrupted paragraph. The bank already separates its reasoning with blank lines:
// the first paragraph names the hinge to notice, and the remaining paragraphs walk through
// the readings or distractors. Preserve every word while revealing it in that order.
function wbWhyParagraphs(value) {
  return String(value || '').split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
}

function wbTopikWhyHtml(ex, item, view) {
  const parts = wbWhyParagraphs(item.why);
  const lead = parts.shift() || '';
  const detail = parts;
  const state = view.ok ? '정답 · CORRECT' : '다시 보기 · REVIEW';
  const detailHtml = detail.length
    ? '<details class="wb-analysis">' +
        '<summary><span>선택지 비교 · FULL REASONING</span><b>' + detail.length + '단계</b></summary>' +
        '<div class="wb-analysis-list">' + detail.map((p, k) =>
          '<div class="wb-analysis-step"><span>' + String(k + 1).padStart(2, '0') + '</span>' +
          '<p>' + vbEsc(p) + '</p></div>').join('') + '</div>' +
      '</details>'
    : '';
  return '<article class="wb-why wb-why-topik ' + (view.ok ? 'ok' : 'bad') + '">' +
    '<div class="wb-topik-status"><span>' + state + '</span><b>정답 · ANSWER</b></div>' +
    '<div class="wb-why-head">' + item.n + ') ' +
      wbLineHtml(ex, item, wbAnswerText(view.correct), {
        plain: true, own: view.own, second: view.correct2 ? wbAnswerText(view.correct2) : ''
      }) + '</div>' +
    (view.ok ? '' : '<div class="wb-why-yours">내 답 · YOU PUT: ' + vbEsc(view.yours) + '</div>') +
    '<div class="wb-topik-meaning"><span>뜻 · MEANING</span><p>' + vbEsc(tr(item, 'en') || '') + '</p></div>' +
    '<div class="wb-learn-grid">' +
      (lead ? '<section class="wb-learn-card wb-learn-clue"><span>01 · 핵심 단서 · WHAT TO NOTICE</span>' +
        '<p>' + vbEsc(lead) + '</p></section>' : '') +
      (item.grammar ? '<section class="wb-learn-card wb-learn-rule"><span>02 · 문법 포인트 · RULE</span>' +
        '<p>' + vbEsc(item.grammar) + '</p></section>' : '') +
    '</div>' + detailHtml +
  '</article>';
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
      ? ex.pattern + ' · ' + (tr(ex, 'sectionEn') || '')
      : (tr(ex, 'sectionEn') || '') + ' — ' + (tr(st.bank, 'titleEn') || hvT('ui.wb.workbook'));
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
      '<div class="wb-inst-en">' + vbEsc(tr(ex, 'instructionEn') || '') + '</div>' +
      (ex.noteEn ? '<div class="wb-inst-note">' + vbEsc(tr(ex, 'noteEn')) + '</div>' : '');
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
        '<div class="wb-example-en">' + vbEsc(tr(ex.example, 'en') || '') + '</div>';
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
        const art = (typeof workbookIconSvg === 'function')
          ? workbookIconSvg(item.art || item.phraseKo || item.ko || '', 4) : '';
        const num = document.createElement('span');
        num.className = 'wb-n';
        num.textContent = item.n + ')';
        const exp = document.createElement('div');
        exp.className = 'wb-exp';
        const head = document.createElement('div');
        head.className = 'wb-exp-head';
        // A bank may hold its translation back until the row is checked. On a textbook page
        // the gloss beside the sentence is an aid; on an exam question it is the answer —
        // "put on thick clothes AND went out" hands over the sequence the blank is testing.
        // Opt-in per bank so the units keep the behaviour they were written for.
        const holdGloss = !!(st.bank && st.bank.holdGloss) && !st.checked;
        head.innerHTML = art +
          '<span class="wb-exp-phrase">' + vbEsc(item.phraseKo || '') + '</span>' +
          (holdGloss ? '' : '<span class="wb-exp-en">' + vbEsc(tr(item, 'en') || '') + '</span>');
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
    // Hoverable meanings over the question and the options too, but only once the answer is
    // out. Before that the gloss would underline exactly the words the question turns on —
    // 만, 안심하고 — and marking them as the hard ones is most of the way to answering it.
    if (st.checked) wbApplyGloss(list);
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
        if (st.bank && st.bank.id === 'topik2-questions') {
          return wbTopikWhyHtml(ex, item, {
            ok: ok,
            correct: correct,
            correct2: correct2,
            yours: yours,
            own: st.own && st.own[i]
          });
        }
        return '<div class="wb-why' + (ok ? ' ok' : ' bad') + '">' +
          '<div class="wb-why-head">' + item.n + ') ' + (ok ? '✓' : '✕') + ' ' +
            wbLineHtml(ex, item, wbAnswerText(correct),
              { plain: true, own: st.own && st.own[i],
                second: correct2 ? wbAnswerText(correct2) : '' }) + '</div>' +
          (ok ? '' : '<div class="wb-why-yours">You put: ' + vbEsc(yours) + '</div>') +
          '<div class="wb-why-en">' + vbEsc(tr(item, 'en') || '') + '</div>' +
          '<div class="wb-why-body">' + vbEsc(item.why || '') + '</div>' +
          '<div class="wb-why-gram">📐 ' + vbEsc(item.grammar || '') + '</div>' +
        '</div>';
      }).join('');
      // Every headword this world teaches becomes hoverable inside the explanation.
      wbApplyGloss(explain);
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
      // Re-asking a question whose answer is on screen teaches nothing, so a draw-one bank
      // offers the next question instead of the same one again.
      const drawn = !!(st.bank.drawOne && st.ex && st.ex.drawnFrom > 1);
      btn.textContent = drawn
        ? (st.bank.nextKo || '다음 문제') + ' →'
        : (st.bank.againKo || '다시 풀기');
      btn.onclick = drawn ? () => openWorkbookExercise(st.ex.id) : resetWorkbook;
      btn.disabled = false;
    } else {
      btn.textContent = (st.bank.checkKo || '확인') + ' ' + (tr(st.bank, 'checkEn') || hvT('ui.wb.checkWord'));
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
  if (sub) sub.textContent = tr(st.bank, 'source') || tr(st.bank, 'titleEn') || '';
  const count = $('wb-count');
  if (count) { count.textContent = exercises.length + ' 연습'; count.className = ''; }

  const inst = $('wb-instruction');
  if (inst) {
    inst.innerHTML =
      '<div class="wb-inst-ko">' + vbEsc(st.bank.pickKo || '어떤 연습을 할까요?') + '</div>' +
      '<div class="wb-inst-en">' + vbEsc(tr(st.bank, 'pickEn') || '') + '</div>';
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
          '<span class="wb-group-en">' + vbEsc(tr(ex, 'sectionEn') || '') + '</span>';
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
          '<span class="wb-pick-en">' + vbEsc(tr(ex, 'blurbEn') || tr(ex, 'instructionEn') || '') + '</span>' +
        '</span>' +
        '<span class="wb-pick-count">' +
          (st.bank.drawOne && (ex.items || []).length > 1
            ? '1/' + ((ex.items || []).length) + '문항 무작위'
            : ((ex.items || []).length) + '문항')
          + wbPracticeBadge(st.bank && st.bank.id, ex.id) + '</span>';
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

    if (top === 'cassette-overlay') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault(); cassetteMenuIndex = (cassetteMenuIndex + 1) % CASSETTE_MODES.length; renderCassetteMenu();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        cassetteMenuIndex = (cassetteMenuIndex - 1 + CASSETTE_MODES.length) % CASSETTE_MODES.length;
        renderCassetteMenu();
      } else if (e.key === 'Enter') {
        e.preventDefault(); runCassetteMode(cassetteMenuIndex);
      } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault(); runCassetteMode(Number(e.key) - 1);
      }
      return;
    }
    if (top === 'dictation-overlay') {
      // Enter checks, then Enter again moves on: the hands are already on the
      // keyboard, and reaching for the mouse between every sentence is the whole
      // friction this screen could have had.
      if (e.key === 'Enter') { e.preventDefault(); if (dictState && dictState.checked) dictNext(); else dictCheck(); }
      else if (e.key === 'Tab') { e.preventDefault(); dictPlay(); }
      return;
    }
    if (top === 'listen-overlay') {
      // No text input on this screen, so single letters are free: a/b mark the loop, l
      // repeats the track, r replays the marked stretch, c clears it.
      const k = e.key;
      if (k === ' ') { e.preventDefault(); listenToggle(); }
      else if (k === 'a' || k === 'A') { e.preventDefault(); listenSetA(); }
      else if (k === 'b' || k === 'B') { e.preventDefault(); listenSetB(); }
      else if (k === 'l' || k === 'L') { e.preventDefault(); listenToggleLoop(); }
      else if (k === 'r' || k === 'R') { e.preventDefault(); listenReplayAB(); }
      else if (k === 'c' || k === 'C' || k === 'Backspace') { e.preventDefault(); listenClearAB(); }
      else if (k === 'ArrowLeft') { e.preventDefault(); listenNudge(-2); }
      else if (k === 'ArrowRight') { e.preventDefault(); listenNudge(2); }
      else if (k === 'ArrowUp') { e.preventDefault(); listenStep(-1); }
      else if (k === 'ArrowDown') { e.preventDefault(); listenStep(1); }
      return;
    }
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
  window.openCassette = openCassette;
  window.closeCassette = closeCassette;
  window.openListen = openListen;
  window.closeListen = closeListen;
  window.listenToggle = listenToggle;
  window.listenRate = listenRate;
  window.listenToggleLoop = listenToggleLoop;
  window.listenSetA = listenSetA;
  window.listenSetB = listenSetB;
  window.listenClearAB = listenClearAB;
  window.listenReplayAB = listenReplayAB;
  window.listenSeek = listenSeek;
  window.listenNudge = listenNudge;
  window.listenStep = listenStep;
  window.listenFilter = listenFilter;
  window.listenToggleScript = listenToggleScript;
  window.openDictation = openDictation;
  window.closeDictation = closeDictation;
  window.dictPlay = dictPlay;
  window.dictToggleLoop = dictToggleLoop;
  window.dictSetA = dictSetA;
  window.dictSetB = dictSetB;
  window.dictClearAB = dictClearAB;
  window.dictReplayAB = dictReplayAB;
  window.dictSeek = dictSeek;
  window.dictCheck = dictCheck;
  window.dictNext = dictNext;
  window.dictPrev = dictPrev;
  window.dictAlign = dictAlign;
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
  // Matched on the chip's id, not on its label — see buildVocabBook for why.
  if(activeCat !== 'all'){
    if(activeCat === 'srs:new') words = words.filter(w => { const e=peekSrs(w.ko); return !e || e.st === 'new'; });
    else if(activeCat === 'srs:learning') words = words.filter(w => srsIsLearning(peekSrs(w.ko)));
    else if(activeCat === 'srs:review') words = words.filter(w => { const e=peekSrs(w.ko); return e && e.st==='review' && !srsIsMature(e); });
    else if(activeCat === 'srs:mature') words = words.filter(w => srsIsMature(peekSrs(w.ko)));
    else if(activeCat === 'srs:due') words = words.filter(w => wordIsDue(w.ko));
    else words = words.filter(w => wordCategory(w) === activeCat);
  }

  if(q) words = words.filter(w => {
    const romanized = (typeof vbRomanize === 'function') ? vbRomanize(w.ko) : '';
    return [w.ko, w.en, tr(w, 'en'), w.category, w.categoryEn, tr(w, 'categoryEn'), romanized]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q));
  });

  visibleVocabWords = words.slice();

  vocabCountEl.textContent = words.length === lvl.words.length
    ? hvT('ui.vocab.count', { n: words.length })
    : hvT('ui.vocab.count.filtered', { n: words.length, total: lvl.words.length });
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
    let mBadgeClass = 'novice', mBadgeLabel = '⚪ ' + hvT('ui.vocab.filter.new'), mBadgeSuffix = '';
    if(srsIsMature(e))        { mBadgeClass='legendary'; mBadgeLabel='🌟 ' + hvT('ui.vocab.filter.mature'); }
    else if(e && e.st==='review'){ mBadgeClass='mastered';  mBadgeLabel='🍎 ' + hvT('ui.vocab.filter.review'); }
    else if(srsIsLearning(e)) { mBadgeClass='practicing'; mBadgeLabel = e.st==='relearn'
      ? '🔁 ' + hvT('ui.vocab.stage.relearning')
      : '🌱 ' + hvT('ui.vocab.filter.learning'); }
    if(srsIsGraduated(e)) mBadgeSuffix = ` (${srsIntervalLabel(e)})`;
    if(srsIsDue(e, now))  mBadgeSuffix += ' ⏰';

    const div = document.createElement('div');
    div.className = `vocab-card ${mBadgeClass}` + (times > 0 || srsIsGraduated(e) ? ' planted' : '') + (planted ? ' growing' : '');
    // The gloss is clamped to three lines on the card, so the full text has to stay
    // reachable somewhere — the tooltip carries it, and so does the fun-fact panel.
    div.title = `${w.ko} — ${tr(w, 'en')}\n${hvT('ui.vocab.openStudyPage')}`;
    // A div rather than a button: the speak control is itself a button, and a button
    // inside a button is invalid markup. role + tabindex + a key handler gets the same
    // keyboard behaviour without nesting one inside the other.
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `${w.ko}, ${tr(w, 'en')}. ${mBadgeLabel}${mBadgeSuffix}. ${hvT('ui.vocab.openWordDetails')}`);
    div.innerHTML = `
      <button type="button" class="speak-btn vc-speak tts-only" title="${vbEsc(hvT('ui.vocab.speak.title'))}" aria-label="${vbEsc(hvT('ui.vocab.speak.aria', { word: w.ko }))}">🔊</button>
      <span class="vc-category" title="${vbEsc(wordCategory(w))}">${vbEsc(wordCategory(w))}</span>
      <span class="vc-emoji">${(typeof vocabIconHtml === 'function') ? vocabIconHtml(w.ko, w.hint || '📝', 86) : (w.hint || '📝')}</span>
      <span class="vc-ko${vbKoSizeClass(w.ko)}" lang="ko">${vbEsc(w.ko)}</span>
      <span class="vc-en">${vbEsc(tr(w, 'en'))}</span>
      <span class="vc-meta">
        <span class="vc-chosung" title="Initial consonants (초성)">${vbEsc(chosung)}</span>
        <span class="mastery-badge ${mBadgeClass}">${mBadgeLabel}${mBadgeSuffix}</span>
      </span>
      <span class="vc-open-hint">${hvT('ui.vocab.studyThisWord')}</span>`;
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
function openVocabBook() {
  buildVocabBook();
  setModalState('vocab-overlay', true);
  vocabBtn.setAttribute('aria-expanded', 'true');
}
function closeVocabBook() {
  if ($('vocab-ff-modal').classList.contains('visible')) closeVocabFunFact();
  setModalState('vocab-overlay', false);
  vocabBtn.setAttribute('aria-expanded', 'false');
  if (typeof vocabBtn.focus === 'function') vocabBtn.focus();
}
vocabBtn.setAttribute('aria-haspopup', 'dialog');
vocabBtn.setAttribute('aria-expanded', 'false');
vocabBtn.addEventListener('click', () => vocabOverlay.classList.contains('visible')
  ? closeVocabBook()
  : openVocabBook());
$('vocab-close-btn').addEventListener('click', closeVocabBook);
vocabSearch.addEventListener('input', () => {
  renderVocabCards();
  $('vocab-grid-wrap').scrollTop = 0;
});
$('vff-prev-btn').addEventListener('click', () => browseVocabDetail(-1));
$('vff-next-btn').addEventListener('click', () => browseVocabDetail(1));
$('vocab-ff-modal').addEventListener('keydown', ev => {
  if (!ev || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight')) return;
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
  if (typeof ev.preventDefault === 'function') ev.preventDefault();
  if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
  browseVocabDetail(ev.key === 'ArrowLeft' ? -1 : 1);
});
hudMenuBtn.addEventListener('click', () => { closeQuiz(); showLevelSelect(); });

// Legacy overlays (now rarely triggered, economy is main flow)
levelupNextBtn && levelupNextBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); openShop(); });
levelupMenuBtn && levelupMenuBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); showLevelSelect(); });
replayBtn && replayBtn.addEventListener('click', () => { alldoneOverlay.classList.remove('visible'); startLevel(0); });
menuBtn   && menuBtn.addEventListener('click', ()   => { alldoneOverlay.classList.remove('visible'); showLevelSelect(); });

