/**
 * Hangeul Valley World Learning
 * Productive-language missions, Can-do evidence, NPC relationships and review scheduling.
 * The game owns presentation and persistence; this module owns content and evaluation.
 */
(function attachWorldLearning(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HVWorldLearning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createWorldLearning() {
  'use strict';

  const VERSION = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RELEARN_MS = 10 * 60 * 1000;

  const ZONES = {
    ginger: { icon:'🐱', ko:'진저의 집', vi:'Ginger · Basic conversation' },
    farm: { icon:'🌱', ko:'농장', vi:'Farm · Describing actions' },
    shop: { icon:'🏪', ko:'시장', vi:'Market · Shopping' },
    cooking: { icon:'🍳', ko:'부엌', vi:'Kitchen · Action sequences' },
    fishing: { icon:'🎣', ko:'낚시터', vi:'Fishing pond · Listening for directions' },
    beehive: { icon:'🐝', ko:'양봉장', vi:'Apiary · Quantities' },
    dungeon: { icon:'🌀', ko:'던전', vi:'Dungeon · Directions' },
    duel: { icon:'⚡', ko:'마법 학교', vi:'Magic school · Grammar transformations' },
    arcade: { icon:'👾', ko:'오락실', vi:'Arcade · Hangeul reflexes' },
    festival: { icon:'🎉', ko:'축제 마당', vi:'Festival · Culture and honorifics' }
  };

  const MISSIONS = [
    {
      id:'ginger-family-intro',
      zone:'ginger',
      canDoId:'a0-introduce-family',
      band:'A0',
      titleVi:'Introduce Your Family to Ginger',
      titleKo:'가족을 소개해요',
      npc:{ id:'ginger', name:'Ginger', relationship:'friend', expectedRegister:'polite' },
      introVi:'Ginger wants to learn about your family. Answer in complete sentences.',
      reward:{ coins:20, trust:4 },
      turns:[
        {
          id:'ginger-family-1',
          mode:'reorder',
          modality:'production',
          npcKo:'이 사람은 누구예요?',
          npcVi:'Who is this person?',
          promptVi:'Arrange the chunks to say “This is my mother.”',
          tokens:['이분은','제','어머니예요'],
          acceptedAnswers:['이분은 제 어머니예요', '이 사람은 제 어머니예요'],
          keyPhrases:['제','어머니예요'],
          feedbackVi:'이분은 제 어머니예요 means “This is my mother.”'
        },
        {
          id:'ginger-family-2',
          mode:'typing',
          modality:'typing',
          npcKo:'아버지는 무슨 일을 하세요?',
          npcVi:'What does your father do?',
          promptVi:'Answer “My father is a teacher.”',
          acceptedAnswers:['제 아버지는 선생님이에요', '아버지는 선생님이에요'],
          keyPhrases:['아버지는','선생님이에요'],
          hints:['제 아버지는…', '선생님이에요'],
          feedbackVi:'Use N은/는 N이에요/예요 to introduce an occupation.'
        },
        {
          id:'ginger-family-3',
          mode:'dictation',
          modality:'listening',
          npcKo:'잘 들으세요.',
          npcVi:'Listen and write it down.',
          audioKo:'우리 가족은 네 명이에요.',
          promptVi:'Listen, then type Ginger’s sentence.',
          acceptedAnswers:['우리 가족은 네 명이에요'],
          keyPhrases:['우리 가족은','네 명이에요'],
          feedbackVi:'우리 가족은 네 명이에요 means “There are four people in my family.”'
        }
      ]
    },
    {
      id:'farm-first-day',
      zone:'farm',
      canDoId:'a0-describe-farm-actions',
      band:'A0',
      titleVi:'First Day on the Farm',
      titleKo:'농장에서 일해요',
      npc:{ id:'farm_mentor', name:'농부 민수', relationship:'mentor', expectedRegister:'polite' },
      introVi:'Minsu teaches you how to plant and care for crops.',
      reward:{ coins:25, trust:3 },
      turns:[
        {
          id:'farm-action-1',
          mode:'reorder',
          modality:'production',
          npcKo:'무엇을 심어요?',
          npcVi:'What are you planting?',
          promptVi:'Arrange the chunks to say “I plant carrots.”',
          tokens:['당근을','심어요'],
          acceptedAnswers:['당근을 심어요'],
          keyPhrases:['당근을','심어요'],
          feedbackVi:'심어요 means “to plant”.'
        },
        {
          id:'farm-action-2',
          mode:'typing',
          modality:'typing',
          npcKo:'다음에 무엇을 해요?',
          npcVi:'What do you do next?',
          promptVi:'Type “I water the plants.”',
          acceptedAnswers:['물을 줘요', '물을 줍니다'],
          keyPhrases:['물을','줘요'],
          feedbackVi:'물을 줘요 is used for watering plants.'
        }
      ]
    },
    {
      id:'market-shopping-day',
      zone:'shop',
      canDoId:'a1-shop-polite-request',
      band:'A1',
      titleVi:'Shopping with Ginger',
      titleKo:'시장에서 장을 봐요',
      npc:{ id:'market_vendor', name:'김 사장님', relationship:'stranger', expectedRegister:'polite' },
      introVi:'Buy the right ingredients by using quantities and polite requests.',
      reward:{ coins:35, trust:5, items:{ carrot:2, apple:3 } },
      turns:[
        {
          id:'market-order-1',
          mode:'typing',
          modality:'typing',
          npcKo:'어서 오세요. 무엇을 드릴까요?',
          npcVi:'Hello. What can I get for you?',
          promptVi:'Politely ask for two carrots.',
          acceptedAnswers:['당근 두 개 주세요', '당근을 두 개 주세요'],
          keyPhrases:['당근','두 개','주세요'],
          registerWarnings:{'당근 두 개 줘':'register_too_casual'},
          feedbackVi:'주세요 is an appropriate polite request for a shopkeeper.'
        },
        {
          id:'market-price-2',
          mode:'typing',
          modality:'typing',
          npcKo:'사과도 필요하세요?',
          npcVi:'Do you need apples?',
          promptVi:'Ask “How much are three apples?”',
          acceptedAnswers:['사과 세 개는 얼마예요', '사과 세 개 얼마예요'],
          keyPhrases:['사과','세 개','얼마예요'],
          hints:['사과 세 개는…', '얼마예요?'],
          feedbackVi:'얼마예요? is used to ask the price.'
        },
        {
          id:'market-thanks-3',
          mode:'dictation',
          modality:'listening',
          npcKo:'계산이 끝났어요. 잘 들으세요.',
          npcVi:'Payment is complete. Listen.',
          audioKo:'감사합니다. 안녕히 계세요.',
          promptVi:'Listen and type the farewell used when leaving the shop.',
          acceptedAnswers:['감사합니다 안녕히 계세요'],
          keyPhrases:['감사합니다','안녕히 계세요'],
          feedbackVi:'안녕히 계세요 is used when you are the one leaving.'
        }
      ]
    },
    {
      id:'kitchen-bibimbap',
      zone:'cooking',
      canDoId:'a1-follow-cooking-sequence',
      band:'A1',
      titleVi:'Make Bibimbap',
      titleKo:'비빔밥을 만들어요',
      npc:{ id:'cook_sora', name:'소라 선생님', relationship:'mentor', expectedRegister:'polite' },
      introVi:'Listen and put the cooking steps in the correct sequence.',
      reward:{ coins:30, trust:4 },
      turns:[
        {
          id:'cook-sequence-1',
          mode:'dictation',
          modality:'listening',
          npcKo:'첫 번째 단계예요. 잘 들으세요.',
          npcVi:'This is the first step. Listen.',
          audioKo:'먼저 채소를 씻어요.',
          promptVi:'Listen, then type the first step.',
          acceptedAnswers:['먼저 채소를 씻어요'],
          keyPhrases:['먼저','채소를','씻어요'],
          feedbackVi:'먼저 means “first”.'
        },
        {
          id:'cook-sequence-2',
          mode:'reorder',
          modality:'production',
          npcKo:'그다음에는요?',
          npcVi:'What comes next?',
          promptVi:'Arrange the chunks to say “Next, cut the vegetables.”',
          tokens:['다음에','채소를','썰어요'],
          acceptedAnswers:['다음에 채소를 썰어요'],
          keyPhrases:['다음에','채소를','썰어요'],
          feedbackVi:'다음에 means “next”.'
        },
        {
          id:'cook-sequence-3',
          mode:'typing',
          modality:'typing',
          npcKo:'마지막 단계는 뭐예요?',
          npcVi:'What is the final step?',
          promptVi:'Type “Finally, mix the rice.”',
          acceptedAnswers:['마지막으로 밥을 비벼요'],
          keyPhrases:['마지막으로','밥을','비벼요'],
          hints:['마지막으로…', '밥을 비벼요'],
          feedbackVi:'비벼요 means “to mix”.'
        }
      ]
    },
    {
      id:'fishing-directions',
      zone:'fishing',
      canDoId:'a1-understand-simple-directions',
      band:'A1',
      titleVi:'Follow the Fish’s Direction',
      titleKo:'물고기 방향을 들어요',
      npc:{ id:'fisher_jun', name:'준 아저씨', relationship:'mentor', expectedRegister:'polite' },
      introVi:'Listen to the directions and identify the fish’s position.',
      reward:{ coins:25, trust:3 },
      turns:[
        {
          id:'fish-direction-1',
          mode:'choice',
          modality:'listening',
          npcKo:'잘 듣고 방향을 고르세요.',
          npcVi:'Listen and choose the direction.',
          audioKo:'물고기가 왼쪽에 있어요.',
          promptVi:'Which direction is the fish in?',
          choices:['왼쪽','오른쪽','앞','뒤'],
          acceptedAnswers:['왼쪽'],
          keyPhrases:['왼쪽'],
          feedbackVi:'왼쪽 means “left”.'
        },
        {
          id:'fish-direction-2',
          mode:'typing',
          modality:'typing',
          npcKo:'어디로 가야 해요?',
          npcVi:'Which way should you go?',
          promptVi:'Type “Please go to the right.”',
          acceptedAnswers:['오른쪽으로 가세요'],
          keyPhrases:['오른쪽으로','가세요'],
          feedbackVi:'N으로 가세요 means “Please go toward N.”'
        }
      ]
    },
    {
      id:'beehive-quantity',
      zone:'beehive',
      canDoId:'a1-use-korean-counters',
      band:'A1',
      titleVi:'Count the Honey Bottles',
      titleKo:'꿀을 세어요',
      npc:{ id:'beekeeper_bomi', name:'보미', relationship:'friend', expectedRegister:'polite' },
      introVi:'Use the correct number and the counter 병.',
      reward:{ coins:20, trust:3 },
      turns:[
        {
          id:'honey-counter-1',
          mode:'reorder',
          modality:'production',
          npcKo:'꿀이 얼마나 필요해요?',
          npcVi:'How much honey do you need?',
          promptVi:'Ask for one bottle of honey.',
          tokens:['꿀','한 병','주세요'],
          acceptedAnswers:['꿀 한 병 주세요', '꿀을 한 병 주세요'],
          keyPhrases:['꿀','한 병','주세요'],
          feedbackVi:'병 is the counter for bottles.'
        },
        {
          id:'honey-counter-2',
          mode:'dictation',
          modality:'listening',
          npcKo:'이번에는 잘 들어 보세요.',
          npcVi:'Listen carefully this time.',
          audioKo:'꿀 두 병이 있어요.',
          promptVi:'Listen and type what you hear.',
          acceptedAnswers:['꿀 두 병이 있어요'],
          keyPhrases:['꿀','두 병이','있어요'],
          feedbackVi:'한 병, 두 병, 세 병…'
        }
      ]
    },
    {
      id:'dungeon-navigation',
      zone:'dungeon',
      canDoId:'a1-navigate-with-directions',
      band:'A1',
      titleVi:'Find Your Way through the Dungeon',
      titleKo:'던전에서 길을 찾아요',
      npc:{ id:'dungeon_guard', name:'수호자', relationship:'stranger', expectedRegister:'polite' },
      introVi:'Read the signs and use location sentences to find the door.',
      reward:{ coins:30, trust:3 },
      turns:[
        {
          id:'dungeon-place-1',
          mode:'typing',
          modality:'typing',
          npcKo:'문이 어디에 있어요?',
          npcVi:'Where is the door?',
          promptVi:'Answer “The door is in front.”',
          acceptedAnswers:['문이 앞에 있어요'],
          keyPhrases:['문이','앞에','있어요'],
          hints:['문이…', '앞에 있어요'],
          feedbackVi:'N이/가 앞에 있어요 means “N is in front.”'
        },
        {
          id:'dungeon-command-2',
          mode:'dictation',
          modality:'listening',
          npcKo:'수호자의 지시를 들으세요.',
          npcVi:'Listen to the guard’s directions.',
          audioKo:'왼쪽으로 가세요.',
          promptVi:'Listen and type the instruction.',
          acceptedAnswers:['왼쪽으로 가세요'],
          keyPhrases:['왼쪽으로','가세요'],
          feedbackVi:'왼쪽으로 가세요 means “Please go left.”'
        }
      ]
    },
    {
      id:'wizard-past-tense',
      zone:'duel',
      canDoId:'a1-use-past-tense',
      band:'A1',
      titleVi:'Past-Tense Magic',
      titleKo:'과거 주문을 써요',
      npc:{ id:'wizard_haneul', name:'하늘 마법사', relationship:'mentor', expectedRegister:'polite' },
      introVi:'Transform present-tense sentences into the past to cast the spell.',
      reward:{ coins:30, trust:4 },
      turns:[
        {
          id:'duel-past-1',
          mode:'typing',
          modality:'typing',
          npcKo:'오늘 공부해요. 어제는요?',
          npcVi:'I study today. What about yesterday?',
          promptVi:'Change it to “I studied yesterday.”',
          acceptedAnswers:['어제 공부했어요'],
          keyPhrases:['어제','공부했어요'],
          feedbackVi:'공부해요 → 공부했어요.'
        },
        {
          id:'duel-past-2',
          mode:'reorder',
          modality:'production',
          npcKo:'오늘 요리해요. 어제는요?',
          npcVi:'I cook today. What about yesterday?',
          promptVi:'Arrange the sentence in the past tense.',
          tokens:['어제','요리했어요'],
          acceptedAnswers:['어제 요리했어요'],
          keyPhrases:['어제','요리했어요'],
          feedbackVi:'요리해요 → 요리했어요.'
        }
      ]
    },
    {
      id:'arcade-hangul-reflex',
      zone:'arcade',
      canDoId:'a0-read-action-prompts',
      band:'A0',
      titleVi:'Hangeul Reflexes',
      titleKo:'한글 신호를 읽어요',
      npc:{ id:'arcade_bot', name:'한글봇', relationship:'neutral', expectedRegister:'polite' },
      introVi:'Quickly read the commands that appear on the machine.',
      reward:{ coins:20, trust:2 },
      turns:[
        {
          id:'arcade-prompt-1',
          mode:'choice',
          modality:'reading',
          npcKo:'“시작”을 고르세요!',
          npcVi:'Choose “start”!',
          promptVi:'Which word means “start”?',
          choices:['시작','정지','왼쪽','감사'],
          acceptedAnswers:['시작'],
          keyPhrases:['시작'],
          feedbackVi:'시작 means “start”.'
        },
        {
          id:'arcade-prompt-2',
          mode:'dictation',
          modality:'listening',
          npcKo:'신호를 잘 들으세요.',
          npcVi:'Listen to the signal.',
          audioKo:'준비됐어요. 시작해요!',
          promptVi:'Listen and type the signal.',
          acceptedAnswers:['준비됐어요 시작해요'],
          keyPhrases:['준비됐어요','시작해요'],
          feedbackVi:'준비됐어요? means “Are you ready?”'
        }
      ]
    },
    {
      id:'festival-greetings',
      zone:'festival',
      canDoId:'a1-use-seasonal-greetings',
      band:'A1',
      titleVi:'Festival Greetings',
      titleKo:'명절 인사를 해요',
      npc:{ id:'festival_elder', name:'마을 어르신', relationship:'elder', expectedRegister:'polite' },
      introVi:'Use an appropriate greeting when meeting an older person at a festival.',
      reward:{ coins:25, trust:5 },
      turns:[
        {
          id:'festival-chuseok-1',
          mode:'reorder',
          modality:'production',
          npcKo:'추석에는 어떻게 인사해요?',
          npcVi:'How do you greet someone at Chuseok?',
          promptVi:'Arrange the greeting “Have a happy Chuseok holiday.”',
          tokens:['추석','잘','보내세요'],
          acceptedAnswers:['추석 잘 보내세요'],
          keyPhrases:['추석','잘 보내세요'],
          feedbackVi:'잘 보내세요 is a polite well-wish.'
        },
        {
          id:'festival-newyear-2',
          mode:'dictation',
          modality:'listening',
          npcKo:'설날 인사를 들어 보세요.',
          npcVi:'Listen to the Seollal greeting.',
          audioKo:'새해 복 많이 받으세요.',
          promptVi:'Listen and type the greeting.',
          acceptedAnswers:['새해 복 많이 받으세요'],
          keyPhrases:['새해 복','많이 받으세요'],
          feedbackVi:'This is a common, polite New Year greeting.'
        },
        {
          id:'festival-speaking-3',
          mode:'speaking',
          modality:'speaking',
          npcKo:'저에게 명절 인사를 해 보세요.',
          npcVi:'Say a festival greeting to me.',
          audioKo:'즐거운 명절 보내세요.',
          promptVi:'Press the microphone and say “Have a happy holiday.” If the browser does not support a microphone, you can type.',
          acceptedAnswers:['즐거운 명절 보내세요'],
          keyPhrases:['즐거운 명절','보내세요'],
          feedbackVi:'Pronounce each chunk clearly: 즐거운 · 명절 · 보내세요.'
        }
      ]
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[.,!?。！？…~'"“”‘’()[\]{}:;]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeCompact(value) {
    return normalize(value).replace(/\s+/g, '');
  }

  function freshState() {
    return {
      version: VERSION,
      completedMissions: [],
      missionAttempts: {},
      canDo: {},
      npcRelationships: {},
      reviewQueue: [],
      activeMissionId: null,
      totals: { attempts:0, correct:0, repairs:0, completed:0 },
      updatedAt: Date.now()
    };
  }

  function migrateState(input) {
    const next = freshState();
    if (!input || typeof input !== 'object') return next;
    next.completedMissions = Array.isArray(input.completedMissions)
      ? Array.from(new Set(input.completedMissions.filter(Boolean)))
      : [];
    next.missionAttempts = input.missionAttempts && typeof input.missionAttempts === 'object'
      ? clone(input.missionAttempts)
      : {};
    next.canDo = input.canDo && typeof input.canDo === 'object' ? clone(input.canDo) : {};
    next.npcRelationships = input.npcRelationships && typeof input.npcRelationships === 'object'
      ? clone(input.npcRelationships)
      : {};
    next.reviewQueue = Array.isArray(input.reviewQueue) ? clone(input.reviewQueue) : [];
    next.activeMissionId = typeof input.activeMissionId === 'string' ? input.activeMissionId : null;
    next.totals = Object.assign(next.totals, input.totals || {});
    next.updatedAt = Number(input.updatedAt) || Date.now();
    return next;
  }

  function getMission(id) {
    return MISSIONS.find(mission => mission.id === id) || null;
  }

  function getZoneMissions(zone) {
    return MISSIONS.filter(mission => mission.zone === zone);
  }

  function getMissionAttempt(state, missionId) {
    const safe = state || freshState();
    if (!safe.missionAttempts[missionId]) {
      safe.missionAttempts[missionId] = {
        runs:0,
        completed:0,
        correctTurns:0,
        incorrectTurns:0,
        bestScore:0,
        lastScore:0,
        lastPlayedAt:0
      };
    }
    return safe.missionAttempts[missionId];
  }

  function getCanDoRecord(state, canDoId) {
    const safe = state || freshState();
    if (!safe.canDo[canDoId]) {
      safe.canDo[canDoId] = {
        attempts:0,
        successes:0,
        unassistedSuccesses:0,
        delayedSuccesses:0,
        lapses:0,
        modalities:{},
        firstSuccessAt:0,
        lastSuccessAt:0,
        mastery:0,
        achieved:false,
        certified:false
      };
    }
    return safe.canDo[canDoId];
  }

  function recalculateCanDo(record) {
    const modalityCount = Object.keys(record.modalities || {}).filter(key => record.modalities[key] > 0).length;
    const successEvidence = Math.min(48, record.successes * 16);
    const unassistedEvidence = Math.min(16, record.unassistedSuccesses * 8);
    const breadthEvidence = Math.min(20, modalityCount * 7);
    const delayedEvidence = Math.min(24, record.delayedSuccesses * 24);
    const lapsePenalty = Math.min(25, record.lapses * 4);
    record.mastery = Math.max(0, Math.min(100,
      successEvidence + unassistedEvidence + breadthEvidence + delayedEvidence - lapsePenalty
    ));
    record.achieved = record.mastery >= 70 && record.successes >= 3 && record.unassistedSuccesses >= 1;
    record.certified = record.achieved && record.delayedSuccesses >= 1;
    return record;
  }

  function evaluateAnswer(input, turn) {
    const answer = normalize(input);
    const compact = normalizeCompact(input);
    const accepted = (turn?.acceptedAnswers || []).map(normalize);
    const exactIndex = accepted.findIndex(candidate =>
      candidate === answer || normalizeCompact(candidate) === compact
    );
    if (exactIndex >= 0) {
      return {
        correct:true,
        communicativeSuccess:true,
        status:'correct',
        score:100,
        normalized:answer,
        matchedAnswer:accepted[exactIndex],
        errors:[]
      };
    }

    const registerWarnings = turn?.registerWarnings || {};
    const registerMatch = Object.entries(registerWarnings)
      .find(([candidate]) => normalizeCompact(candidate) === compact);
    if (registerMatch) {
      return {
        correct:false,
        communicativeSuccess:true,
        status:'repair',
        score:78,
        normalized:answer,
        matchedAnswer:null,
        errors:[registerMatch[1]]
      };
    }

    const phrases = (turn?.keyPhrases || []).map(normalizeCompact).filter(Boolean);
    const matched = phrases.filter(phrase => compact.includes(phrase));
    const coverage = phrases.length ? matched.length / phrases.length : 0;
    const communicativeSuccess = coverage >= 0.67;
    const score = Math.round(Math.min(74, coverage * 74));
    return {
      correct:false,
      communicativeSuccess,
      status:communicativeSuccess ? 'repair' : 'incorrect',
      score,
      normalized:answer,
      matchedAnswer:null,
      errors:communicativeSuccess ? ['form_needs_repair'] : ['meaning_incomplete'],
      coverage
    };
  }

  function upsertReview(state, mission, turn, result, now) {
    const existingIndex = state.reviewQueue.findIndex(item =>
      item.missionId === mission.id && item.turnId === turn.id
    );
    const previous = existingIndex >= 0 ? state.reviewQueue[existingIndex] : null;
    const next = {
      missionId:mission.id,
      turnId:turn.id,
      canDoId:mission.canDoId,
      dueAt:now + (result.correct ? DAY_MS : RELEARN_MS),
      intervalDays:result.correct ? Math.max(1, Number(previous?.intervalDays) || 1) : 0,
      lapses:(Number(previous?.lapses) || 0) + (result.correct ? 0 : 1),
      lastResult:result.status,
      updatedAt:now
    };
    if (result.correct && previous?.lastResult === 'correct') {
      next.intervalDays = Math.min(30, Math.max(3, previous.intervalDays * 2));
      next.dueAt = now + next.intervalDays * DAY_MS;
    }
    if (existingIndex >= 0) state.reviewQueue[existingIndex] = next;
    else state.reviewQueue.push(next);
  }

  function recordTurnResult(stateInput, mission, turn, result, options) {
    const state = stateInput || freshState();
    const now = Number(options?.at) || Date.now();
    const hints = Math.max(0, Number(options?.hints) || 0);
    const modality = turn.modality || turn.mode || 'context';
    const attempt = getMissionAttempt(state, mission.id);
    const canDo = getCanDoRecord(state, mission.canDoId);

    state.totals.attempts++;
    canDo.attempts++;
    canDo.modalities[modality] = (canDo.modalities[modality] || 0) + (result.correct ? 1 : 0);
    if (result.correct) {
      state.totals.correct++;
      attempt.correctTurns++;
      canDo.successes++;
      if (hints === 0) canDo.unassistedSuccesses++;
      if (!canDo.firstSuccessAt) canDo.firstSuccessAt = now;
      if (canDo.firstSuccessAt && now - canDo.firstSuccessAt >= 20 * 60 * 60 * 1000) {
        canDo.delayedSuccesses++;
      }
      canDo.lastSuccessAt = now;
    } else {
      attempt.incorrectTurns++;
      canDo.lapses++;
      if (result.status === 'repair') state.totals.repairs++;
    }
    recalculateCanDo(canDo);
    upsertReview(state, mission, turn, result, now);
    state.updatedAt = now;
    return { state, canDo:clone(canDo), attempt:clone(attempt) };
  }

  function beginMission(stateInput, missionId, at) {
    const state = stateInput || freshState();
    const mission = getMission(missionId);
    if (!mission) return null;
    const attempt = getMissionAttempt(state, missionId);
    attempt.runs++;
    attempt.lastPlayedAt = Number(at) || Date.now();
    state.activeMissionId = missionId;
    state.updatedAt = attempt.lastPlayedAt;
    return clone(attempt);
  }

  function completeMission(stateInput, missionId, score, at) {
    const state = stateInput || freshState();
    const mission = getMission(missionId);
    if (!mission) return null;
    const now = Number(at) || Date.now();
    const attempt = getMissionAttempt(state, missionId);
    const firstCompletion = !state.completedMissions.includes(missionId);
    if (firstCompletion) {
      state.completedMissions.push(missionId);
      state.totals.completed++;
    }
    attempt.completed++;
    attempt.lastScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    attempt.bestScore = Math.max(attempt.bestScore || 0, attempt.lastScore);
    attempt.lastPlayedAt = now;
    state.activeMissionId = null;

    const npcId = mission.npc?.id;
    if (npcId) {
      const current = state.npcRelationships[npcId] || { trust:0, encounters:0, lastSeenAt:0 };
      current.encounters++;
      current.trust = Math.max(0, Math.min(100, current.trust + (mission.reward?.trust || 1)));
      current.lastSeenAt = now;
      state.npcRelationships[npcId] = current;
    }
    state.updatedAt = now;
    return { firstCompletion, attempt:clone(attempt) };
  }

  function getReviewItems(stateInput, options) {
    const state = stateInput || freshState();
    const now = Number(options?.now) || Date.now();
    const includeWeak = options?.includeWeak !== false;
    return state.reviewQueue
      .filter(item => item.dueAt <= now || (includeWeak && item.lastResult !== 'correct'))
      .map(item => {
        const mission = getMission(item.missionId);
        const turn = mission?.turns?.find(candidate => candidate.id === item.turnId);
        return mission && turn ? { ...clone(item), mission:clone(mission), turn:clone(turn) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.dueAt - b.dueAt);
  }

  function getSummary(stateInput) {
    const state = stateInput || freshState();
    const records = Object.values(state.canDo || {});
    return {
      missionsCompleted:state.completedMissions.length,
      missionTotal:MISSIONS.length,
      canDoAchieved:records.filter(record => record.achieved).length,
      canDoCertified:records.filter(record => record.certified).length,
      canDoTotal:new Set(MISSIONS.map(mission => mission.canDoId)).size,
      reviewsDue:getReviewItems(state, { includeWeak:true }).length,
      accuracy:state.totals.attempts
        ? Math.round((state.totals.correct / state.totals.attempts) * 100)
        : 0
    };
  }

  return {
    version:VERSION,
    zones:clone(ZONES),
    missions:clone(MISSIONS),
    freshState,
    migrateState,
    normalize,
    evaluateAnswer,
    getMission,
    getZoneMissions,
    getMissionAttempt,
    getCanDoRecord,
    beginMission,
    recordTurnResult,
    completeMission,
    getReviewItems,
    getSummary
  };
});
