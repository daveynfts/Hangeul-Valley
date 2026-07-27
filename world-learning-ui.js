(function attachWorldLearningUi(root) {
  'use strict';

  let ui = {
    missionId:null,
    turnIndex:0,
    scores:[],
    hints:0,
    selectedTokens:[],
    locked:false,
    callback:null,
    reviewOnly:false,
    reviewTurnId:null,
    recognition:null
  };

  function api() {
    return root.HVWorldLearning || null;
  }

  function esc(value) {
    if (typeof escapeLearningHtml === 'function') return escapeLearningHtml(value);
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function missionState() {
    return typeof worldLearningState !== 'undefined' ? worldLearningState : api().freshState();
  }

  function getMissionForZone(zoneKey) {
    return api()?.getZoneMissions(zoneKey)?.[0] || null;
  }

  function isComplete(missionId) {
    return Array.isArray(missionState().completedMissions)
      && missionState().completedMissions.includes(missionId);
  }

  function save() {
    if (typeof persistSave === 'function') persistSave();
  }

  function updateSummary() {
    const learning = api();
    const summaryEl = document.getElementById('world-learning-summary');
    const progressFill = document.getElementById('world-progress-fill');
    if (!learning) return;
    const summary = learning.getSummary(missionState());
    if (summaryEl) {
      summaryEl.textContent =
        `${summary.missionsCompleted}/${summary.missionTotal} missions · ` +
        `${summary.canDoAchieved}/${summary.canDoTotal} Can-do · ` +
        `${summary.reviewsDue} reviews due · accuracy ${summary.accuracy}%`;
    }
    if (progressFill) {
      const pct = summary.missionTotal
        ? Math.round((summary.missionsCompleted / summary.missionTotal) * 100)
        : 0;
      progressFill.style.width = `${pct}%`;
    }
    const reviewButton = document.getElementById('review-garden-btn');
    if (reviewButton) {
      reviewButton.textContent = summary.reviewsDue > 0
        ? `🌱 Review (${summary.reviewsDue})`
        : '🌱 Review';
    }
  }

  root.openWorldMissionMap = function openWorldMissionMap(zoneKey) {
    const learning = api();
    if (!learning) {
      if (typeof showToast === 'function') showToast('World Korean mission data is unavailable.', 2500);
      return;
    }
    ui.callback = null;
    ui.reviewOnly = false;
    ui.reviewTurnId = null;
    setModalState('world-learning-overlay', true);
    renderMap(zoneKey || learning.missions[0]?.zone);
  };

  function renderMap(selectedZone) {
    const learning = api();
    const zoneList = document.getElementById('world-zone-list');
    const stage = document.getElementById('world-mission-stage');
    if (!learning || !zoneList || !stage) return;
    updateSummary();
    const zonesWithMissions = Object.entries(learning.zones)
      .filter(([zoneKey]) => learning.getZoneMissions(zoneKey).length > 0);
    const activeZone = learning.zones[selectedZone] ? selectedZone : zonesWithMissions[0]?.[0];
    zoneList.innerHTML = '';
    zonesWithMissions.forEach(([zoneKey, zone]) => {
      const missions = learning.getZoneMissions(zoneKey);
      const complete = missions.every(mission => isComplete(mission.id));
      const button = document.createElement('button');
      button.className = `world-zone-card${zoneKey === activeZone ? ' active' : ''}${complete ? ' completed' : ''}`;
      button.innerHTML = `
        <div style="font-weight:900;">${zone.icon} ${esc(zone.ko)} ${complete ? '✅' : ''}</div>
        <div style="color:#94a3b8;font-size:11px;margin-top:3px;">${esc(zone.vi)}</div>`;
      button.onclick = () => renderMap(zoneKey);
      zoneList.appendChild(button);
    });
    renderZoneDetail(activeZone);
  }

  function renderZoneDetail(zoneKey) {
    const learning = api();
    const stage = document.getElementById('world-mission-stage');
    const zone = learning?.zones?.[zoneKey];
    const missions = learning?.getZoneMissions(zoneKey) || [];
    if (!learning || !stage || !zone) return;
    stage.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px;">
        <div>
          <div style="font-family:'Press Start 2P',monospace;color:#f8dc83;font-size:12px;">${zone.icon} ${esc(zone.ko)}</div>
          <div style="color:#94a3b8;margin-top:5px;">${esc(zone.vi)}</div>
        </div>
      </div>`;
    missions.forEach(mission => {
      const complete = isComplete(mission.id);
      const attempt = learning.getMissionAttempt(missionState(), mission.id);
      const canDo = learning.getCanDoRecord(missionState(), mission.canDoId);
      const relationship = missionState().npcRelationships?.[mission.npc?.id];
      const card = document.createElement('div');
      card.className = 'world-mission-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-size:20px;font-weight:900;color:#fff;">${esc(mission.titleVi)} ${complete ? '✅' : ''}</div>
            <div lang="ko" style="font-family:'Noto Sans KR',sans-serif;color:#67e8f9;font-size:18px;margin-top:2px;">${esc(mission.titleKo)}</div>
          </div>
          <span class="world-mastery-pill">${mission.band} · ${canDo.mastery || 0}%</span>
        </div>
        <div style="color:#cbd5e1;margin-top:9px;line-height:1.5;">${esc(mission.introVi)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;color:#94a3b8;font-size:11px;">
          <span>🎯 ${esc(mission.canDoId)}</span>
          <span>👤 ${esc(mission.npc?.name || '')}</span>
          <span>🤝 Trust ${relationship?.trust || 0}</span>
          <span>🏅 Best ${attempt.bestScore || 0}</span>
        </div>
        <button class="hud-btn" style="margin-top:12px;" data-world-mission="${esc(mission.id)}">
          ${complete ? '🔁 Practice again' : '▶ Start mission'}
        </button>`;
      card.querySelector('[data-world-mission]').onclick = () => startMission(mission.id);
      stage.appendChild(card);
    });
  }

  function shuffled(values) {
    const items = [...(values || [])];
    if (typeof Phaser !== 'undefined' && Phaser.Utils?.Array?.Shuffle) {
      Phaser.Utils.Array.Shuffle(items);
      return items;
    }
    return items.sort(() => Math.random() - 0.5);
  }

  function startMission(missionId, callback, options = {}) {
    const learning = api();
    const mission = learning?.getMission(missionId);
    if (!learning || !mission) return false;
    if (ui.recognition) {
      try { ui.recognition.abort(); } catch (_) {}
    }
    const reviewTurnIndex = options.turnId
      ? Math.max(0, mission.turns.findIndex(turn => turn.id === options.turnId))
      : 0;
    ui = {
      missionId,
      turnIndex:reviewTurnIndex,
      scores:[],
      hints:0,
      selectedTokens:[],
      locked:false,
      callback:typeof callback === 'function' ? callback : null,
      reviewOnly:Boolean(options.turnId),
      reviewTurnId:options.turnId || null,
      recognition:null
    };
    learning.beginMission(missionState(), missionId);
    save();
    setModalState('world-learning-overlay', true);
    renderTurn();
    return true;
  }

  function renderTurn() {
    const learning = api();
    const mission = learning?.getMission(ui.missionId);
    const stage = document.getElementById('world-mission-stage');
    const zoneList = document.getElementById('world-zone-list');
    if (!learning || !mission || !stage) return;
    if (zoneList) zoneList.innerHTML = '';
    const turn = mission.turns[ui.turnIndex];
    if (!turn) {
      finishMission();
      return;
    }
    ui.hints = 0;
    ui.selectedTokens = [];
    ui.locked = false;
    const modeLabels = {
      choice:'Recognition',
      reorder:'Sentence order',
      typing:'Typing',
      dictation:'Dictation',
      speaking:'Speaking'
    };
    stage.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <div>
          <div style="color:#f8dc83;font-family:'Press Start 2P',monospace;font-size:11px;">${esc(mission.titleVi)}</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:5px;">
            ${ui.reviewOnly ? 'Focused review' : `Turn ${ui.turnIndex + 1}/${mission.turns.length}`}
            · ${modeLabels[turn.mode] || turn.mode}
          </div>
        </div>
        <span class="world-mastery-pill">🎯 ${esc(mission.canDoId)}</span>
      </div>
      <div class="world-npc-bubble">
        <div style="color:#f9a8d4;font-weight:900;margin-bottom:5px;">${esc(mission.npc?.name || 'NPC')}</div>
        <div class="world-npc-ko" lang="ko">${esc(turn.npcKo || '')}</div>
        <div class="world-npc-vi">${esc(turn.npcVi || '')}</div>
        <button class="hud-btn" id="world-listen-btn" style="margin-top:9px;padding:5px 9px;">🔊 Listen</button>
      </div>
      <div class="world-mission-card">
        <div style="font-weight:900;color:#fff;">${esc(turn.promptVi || '')}</div>
        <div id="world-answer-area"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
          <button class="hud-btn" id="world-hint-btn">💡 Hint</button>
          <button class="hud-btn" id="world-reset-answer-btn" style="display:none;">↺ Reset</button>
        </div>
        <div id="world-feedback"></div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:9px;margin-top:10px;">
        <button class="hud-btn" onclick="closeWorldLearning()">← Leave mission</button>
        <div id="world-next-wrap"></div>
      </div>`;

    const listenButton = document.getElementById('world-listen-btn');
    if (listenButton) {
      listenButton.onclick = () => {
        const spokenText = turn.audioKo || turn.npcKo;
        if (spokenText && typeof speakKorean === 'function') speakKorean(spokenText);
      };
    }
    const hintButton = document.getElementById('world-hint-btn');
    if (hintButton) hintButton.onclick = showHint;
    renderAnswerControl(turn);
    if ((turn.mode === 'dictation' || turn.mode === 'speaking') && turn.audioKo) {
      setTimeout(() => {
        if (typeof speakKorean === 'function') speakKorean(turn.audioKo);
      }, 220);
    }
  }

  function renderAnswerControl(turn) {
    const area = document.getElementById('world-answer-area');
    const resetButton = document.getElementById('world-reset-answer-btn');
    if (!area) return;
    if (turn.mode === 'choice') {
      area.innerHTML = `<div class="world-choice-grid">
        ${shuffled(turn.choices).map(choice =>
          `<button class="world-choice" data-answer="${esc(choice)}">${esc(choice)}</button>`
        ).join('')}
      </div>`;
      area.querySelectorAll('.world-choice').forEach(button => {
        button.onclick = () => submitAnswer(button.dataset.answer);
      });
      return;
    }
    if (turn.mode === 'reorder') {
      const tokens = shuffled(turn.tokens).map((token, index) => ({ token, index }));
      area.innerHTML = `
        <div class="world-built-answer" id="world-built-answer">
          <span style="color:#64748b;">Choose the chunks in the correct order…</span>
        </div>
        <div class="world-token-bank">
          ${tokens.map(item =>
            `<button class="world-token" data-token="${esc(item.token)}" data-index="${item.index}">${esc(item.token)}</button>`
          ).join('')}
        </div>
        <button class="hud-btn" id="world-submit-reorder">✓ Check sentence</button>`;
      area.querySelectorAll('.world-token').forEach(button => {
        button.onclick = () => {
          if (button.classList.contains('selected')) return;
          button.classList.add('selected');
          ui.selectedTokens.push({ token:button.dataset.token, element:button });
          renderBuiltAnswer();
        };
      });
      document.getElementById('world-submit-reorder').onclick = () => {
        submitAnswer(ui.selectedTokens.map(item => item.token).join(' '));
      };
      if (resetButton) {
        resetButton.style.display = '';
        resetButton.onclick = resetReorder;
      }
      return;
    }
    const isSpeaking = turn.mode === 'speaking';
    area.innerHTML = `
      <input id="world-answer-input" type="text" lang="ko" autocomplete="off"
        placeholder="${isSpeaking ? 'Speech result or type with the keyboard…' : 'Type the Korean sentence…'}">
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${isSpeaking ? '<button class="hud-btn" id="world-mic-btn">🎙️ Start speaking</button>' : ''}
        <button class="hud-btn" id="world-submit-answer">✓ Submit</button>
      </div>`;
    const input = document.getElementById('world-answer-input');
    const submit = () => submitAnswer(input?.value || '');
    document.getElementById('world-submit-answer').onclick = submit;
    input.addEventListener('keydown', event => {
      if (event.isComposing || event.keyCode === 229) {
        event.stopPropagation();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
      event.stopPropagation();
    });
    if (isSpeaking) {
      const micButton = document.getElementById('world-mic-btn');
      if (micButton) micButton.onclick = startSpeechRecognition;
    }
    setTimeout(() => input?.focus(), 60);
  }

  function renderBuiltAnswer() {
    const built = document.getElementById('world-built-answer');
    if (!built) return;
    if (!ui.selectedTokens.length) {
      built.innerHTML = '<span style="color:#64748b;">Choose the chunks in the correct order…</span>';
      return;
    }
    built.innerHTML = ui.selectedTokens.map((item, index) =>
      `<button class="world-token" data-built-index="${index}">${esc(item.token)}</button>`
    ).join('');
    built.querySelectorAll('[data-built-index]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.builtIndex);
        const [removed] = ui.selectedTokens.splice(index, 1);
        if (removed?.element) removed.element.classList.remove('selected');
        renderBuiltAnswer();
      };
    });
  }

  function resetReorder() {
    ui.selectedTokens.forEach(item => item.element?.classList.remove('selected'));
    ui.selectedTokens = [];
    renderBuiltAnswer();
  }

  function showHint() {
    const learning = api();
    const mission = learning?.getMission(ui.missionId);
    const turn = mission?.turns?.[ui.turnIndex];
    const feedback = document.getElementById('world-feedback');
    if (!turn || !feedback) return;
    ui.hints++;
    const hints = turn.hints?.length ? turn.hints : turn.keyPhrases || [];
    const hint = hints[Math.min(ui.hints - 1, hints.length - 1)]
      || 'Listen to the NPC again and focus on the key phrase.';
    feedback.className = 'repair';
    feedback.innerHTML = `💡 ${esc(hint)}`;
    if (ui.hints >= 3 && turn.acceptedAnswers?.[0]) {
      feedback.innerHTML += `<div lang="ko" style="font-family:'Noto Sans KR',sans-serif;margin-top:5px;color:#fff;">Model: ${esc(turn.acceptedAnswers[0])}</div>`;
    }
  }

  function errorFeedback(result) {
    if (result.errors?.includes('register_too_casual')) {
      return 'The NPC understands you, but this is too casual. Use 주세요 with a shopkeeper or an older person.';
    }
    if (result.status === 'repair') {
      return 'The NPC understands the main idea, but the form or politeness level needs repair. Try again.';
    }
    return 'The NPC could not understand enough. Check the vocabulary, quantity, and word order, then try again.';
  }

  function submitAnswer(answer) {
    if (ui.locked) return;
    const learning = api();
    const mission = learning?.getMission(ui.missionId);
    const turn = mission?.turns?.[ui.turnIndex];
    const feedback = document.getElementById('world-feedback');
    if (!learning || !mission || !turn || !feedback) return;
    const result = learning.evaluateAnswer(answer, turn);
    learning.recordTurnResult(missionState(), mission, turn, result, { hints:ui.hints });
    if (typeof recordLearningAttempt === 'function' && typeof resolveCurriculumWord === 'function') {
      recordLearningAttempt(resolveCurriculumWord(turn.acceptedAnswers?.[0] || answer), {
        activity:`world_${mission.zone}_${mission.id}`,
        modality:turn.modality || turn.mode || 'context',
        correct:result.correct,
        responseMs:0,
        hints:ui.hints
      });
    }
    ui.scores.push(result.score);
    feedback.className = result.status;
    if (!result.correct) {
      feedback.innerHTML = `❌ ${esc(errorFeedback(result))}
        <div style="color:#cbd5e1;margin-top:5px;">${esc(turn.feedbackVi || '')}</div>`;
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
      save();
      updateSummary();
      return;
    }

    ui.locked = true;
    feedback.innerHTML = `✅ ${esc(turn.feedbackVi || 'Correct!')}
      <div lang="ko" style="font-family:'Noto Sans KR',sans-serif;color:#fff;font-size:18px;margin-top:5px;">${esc(turn.acceptedAnswers?.[0] || answer)}</div>`;
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');
    if (typeof sceneRef !== 'undefined' && sceneRef?.feedback) sceneRef.feedback.correctAtPlayer();
    const nextWrap = document.getElementById('world-next-wrap');
    if (nextWrap) {
      const isLast = ui.reviewOnly || ui.turnIndex >= mission.turns.length - 1;
      nextWrap.innerHTML = `<button class="hud-btn" id="world-next-btn">${isLast ? 'Complete ✓' : 'Next →'}</button>`;
      document.getElementById('world-next-btn').onclick = () => {
        if (isLast) finishMission();
        else {
          ui.turnIndex++;
          renderTurn();
        }
      };
    }
    save();
    updateSummary();
  }

  function startSpeechRecognition() {
    const SpeechRecognition = root.SpeechRecognition || root.webkitSpeechRecognition;
    const input = document.getElementById('world-answer-input');
    const feedback = document.getElementById('world-feedback');
    const micButton = document.getElementById('world-mic-btn');
    if (!SpeechRecognition) {
      if (feedback) {
        feedback.className = 'repair';
        feedback.textContent = 'This browser does not support speech recognition. You can still type the sentence.';
      }
      input?.focus();
      return;
    }
    try {
      if (ui.recognition) ui.recognition.abort();
      const recognition = new SpeechRecognition();
      ui.recognition = recognition;
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      recognition.onstart = () => {
        if (micButton) micButton.textContent = '🔴 Listening…';
        if (feedback) {
          feedback.className = 'repair';
          feedback.textContent = 'Say the Korean sentence clearly after the beep.';
        }
      };
      recognition.onresult = event => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (input) input.value = transcript;
        if (feedback) {
          feedback.className = '';
          feedback.textContent = transcript ? `Heard: ${transcript}` : 'No speech was detected.';
        }
      };
      recognition.onerror = () => {
        if (feedback) {
          feedback.className = 'repair';
          feedback.textContent = 'Speech recognition failed. Try again or type with the keyboard.';
        }
      };
      recognition.onend = () => {
        if (micButton) micButton.textContent = '🎙️ Start speaking';
        ui.recognition = null;
      };
      recognition.start();
    } catch (_) {
      if (feedback) {
        feedback.className = 'repair';
        feedback.textContent = 'The microphone is busy. Try again or type with the keyboard.';
      }
    }
  }

  function applyReward(mission, firstCompletion) {
    if (!mission || !firstCompletion) return;
    const reward = mission.reward || {};
    if (reward.coins && typeof addCoins === 'function') addCoins(reward.coins);
    if (reward.items && typeof reward.items === 'object' && typeof inventoryState !== 'undefined') {
      inventoryState.ingredients = inventoryState.ingredients || {};
      Object.entries(reward.items).forEach(([itemId, count]) => {
        const info = typeof getItemInfo === 'function' ? getItemInfo(itemId) : { key:itemId };
        const key = info.key || itemId;
        inventoryState.ingredients[key] = (inventoryState.ingredients[key] || 0) + Math.max(0, Number(count) || 0);
      });
    }
    if (typeof updateSeasonalProgress === 'function') updateSeasonalProgress('worldMissions', 1);
  }

  function finishMission() {
    const learning = api();
    const mission = learning?.getMission(ui.missionId);
    const stage = document.getElementById('world-mission-stage');
    if (!learning || !mission || !stage) return;
    const scores = ui.scores;
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 100;
    const completion = learning.completeMission(missionState(), mission.id, averageScore);
    applyReward(mission, completion?.firstCompletion);
    const canDo = learning.getCanDoRecord(missionState(), mission.canDoId);
    save();
    updateSummary();
    const hasCallback = typeof ui.callback === 'function';
    stage.innerHTML = `
      <div class="world-mission-card" style="text-align:center;padding:25px;">
        <div style="font-size:46px;">${ui.reviewOnly ? '🌱' : '🏮'}</div>
        <div style="font-family:'Press Start 2P',monospace;color:#f8dc83;font-size:13px;margin-top:10px;">
          ${ui.reviewOnly ? 'REVIEW COMPLETE' : 'MISSION COMPLETE'}
        </div>
        <div lang="ko" style="font-family:'Noto Sans KR',sans-serif;font-size:25px;color:#fff;margin-top:12px;">${esc(mission.titleKo)}</div>
        <div style="color:#cbd5e1;margin-top:8px;">Score ${averageScore} · Can-do mastery ${canDo.mastery}%</div>
        <div style="color:#94a3b8;margin-top:6px;">
          ${canDo.certified ? '🏅 Confirmed by a spaced-review attempt.' : 'Review again tomorrow to confirm long-term retention.'}
        </div>
        ${completion?.firstCompletion ? `<div style="color:#86efac;margin-top:8px;">First-time reward: +${mission.reward?.coins || 0} 🪙</div>` : ''}
        <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:9px;margin-top:16px;">
          <button class="hud-btn" id="world-back-to-map">🗺️ Mission map</button>
          ${hasCallback ? '<button class="hud-btn" id="world-continue-zone">Continue into the area →</button>' : ''}
        </div>
      </div>`;
    document.getElementById('world-back-to-map').onclick = () => {
      ui.callback = null;
      root.openWorldMissionMap(mission.zone);
    };
    const continueButton = document.getElementById('world-continue-zone');
    if (continueButton) continueButton.onclick = root.continueAfterWorldMission;
  }

  root.continueAfterWorldMission = function continueAfterWorldMission() {
    const callback = ui.callback;
    ui.callback = null;
    setModalState('world-learning-overlay', false);
    if (typeof callback === 'function') setTimeout(() => callback(), 60);
  };

  root.closeWorldLearning = function closeWorldLearning() {
    if (ui.recognition) {
      try { ui.recognition.abort(); } catch (_) {}
    }
    ui.recognition = null;
    ui.callback = null;
    setModalState('world-learning-overlay', false);
  };

  root.openReviewGarden = function openReviewGarden() {
    const learning = api();
    if (!learning) return;
    const items = learning.getReviewItems(missionState(), { includeWeak:true });
    setModalState('world-learning-overlay', true);
    updateSummary();
    const zoneList = document.getElementById('world-zone-list');
    const stage = document.getElementById('world-mission-stage');
    if (zoneList) zoneList.innerHTML = '';
    if (!stage) return;
    if (!items.length) {
      stage.innerHTML = `
        <div class="world-mission-card" style="text-align:center;padding:28px;">
          <div style="font-size:48px;">🌿</div>
          <h2 style="color:#86efac;">The Review Garden is quiet</h2>
          <div style="color:#94a3b8;">No missions are due. Learned sentences will return on a spaced-review schedule.</div>
          <button class="hud-btn" id="world-review-explore" style="margin-top:14px;">Explore new missions</button>
        </div>`;
      document.getElementById('world-review-explore').onclick = () => root.openWorldMissionMap();
      return;
    }
    stage.innerHTML = `
      <div style="font-family:'Press Start 2P',monospace;color:#86efac;font-size:13px;margin-bottom:11px;">🌱 REVIEW GARDEN</div>
      <div style="color:#94a3b8;margin-bottom:12px;">Review ${items.length} weak or due situations.</div>`;
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'world-mission-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <div>
            <div style="font-weight:900;color:#fff;">${esc(item.mission.titleVi)}</div>
            <div lang="ko" style="font-family:'Noto Sans KR',sans-serif;color:#67e8f9;margin-top:3px;">${esc(item.turn.acceptedAnswers?.[0] || '')}</div>
          </div>
          <span class="world-mastery-pill">${esc(item.turn.mode)}</span>
        </div>
        <button class="hud-btn" style="margin-top:10px;">Review situation →</button>`;
      card.querySelector('button').onclick = () => startMission(item.mission.id, null, { turnId:item.turn.id });
      stage.appendChild(card);
    });
  };

  root.launchZoneLearning = function launchZoneLearning(zoneKey, onSuccess) {
    const mission = getMissionForZone(zoneKey);
    if (!mission || isComplete(mission.id)) {
      if (typeof onSuccess === 'function') onSuccess();
      return false;
    }
    return startMission(mission.id, onSuccess);
  };

  root.refreshWorldLearningHud = updateSummary;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateSummary, { once:true });
  } else {
    setTimeout(updateSummary, 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);
