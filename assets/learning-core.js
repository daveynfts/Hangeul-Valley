/*
 * Hangeul Valley Learning Core
 * A dependency-free learner model shared by Farm, NPCs and every minigame.
 * The game owns persistence; this module owns scheduling and learning evidence.
 */
(function attachHangeulValleyLearningCore(root) {
  'use strict';

  const VERSION = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RELEARN_MS = 10 * 60 * 1000;
  const MIN_SPACED_GAP_MS = 4 * 60 * 60 * 1000;
  const MAX_RECENT_ATTEMPTS = 120;

  const RR_INITIAL = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  const RR_VOWEL = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  const RR_FINAL = ['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

  function freshState() {
    return {
      version: VERSION,
      items: {},
      sessions: {},
      totals: { attempts: 0, correct: 0, exposures: 0, hints: 0 },
      recentAttempts: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  let state = freshState();
  const listeners = new Set();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeKorean(value) {
    return String(value == null ? '' : value)
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?。！？]+$/g, '')
      .trim();
  }

  function answerVariants(word) {
    if (!word) return [];
    const variants = [word.ko];
    ['answersKo', 'variantsKo', 'acceptedAnswers'].forEach((key) => {
      if (Array.isArray(word[key])) variants.push(...word[key]);
    });
    return Array.from(new Set(variants.map(normalizeKorean).filter(Boolean)));
  }

  function isAnswerCorrect(input, word) {
    const normalized = normalizeKorean(input);
    return answerVariants(word).includes(normalized);
  }

  function romanizeHangul(value) {
    const text = normalizeKorean(value);
    const groups = [];
    let syllables = [];

    function flush() {
      if (syllables.length) {
        groups.push(syllables.join('-'));
        syllables = [];
      }
    }

    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        const offset = code - 0xAC00;
        const initial = Math.floor(offset / 588);
        const vowel = Math.floor((offset % 588) / 28);
        const final = offset % 28;
        syllables.push(RR_INITIAL[initial] + RR_VOWEL[vowel] + RR_FINAL[final]);
      } else {
        flush();
        groups.push(char);
      }
    }
    flush();
    return groups.join('').replace(/\s*-\s*/g, '-').trim();
  }

  function fnv1a(text) {
    let hash = 0x811C9DC5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function stableId(word) {
    if (word && word.id) return String(word.id);
    const ko = normalizeKorean(word && word.ko);
    const pos = String((word && (word.partOfSpeech || word.pos)) || '').toLowerCase().trim();
    return `hv_${fnv1a(`${ko}|${pos}`)}`;
  }

  function emptyModality() {
    return {
      attempts: 0,
      correct: 0,
      exposures: 0,
      lapses: 0,
      reviewStreak: 0,
      successfulReviews: 0,
      intervalDays: 0,
      ease: 2.3,
      dueAt: 0,
      lastSeenAt: 0,
      lastCorrectAt: 0,
      averageResponseMs: 0,
      hints: 0
    };
  }

  function getOrCreateItem(word) {
    const id = stableId(word);
    if (!state.items[id]) {
      state.items[id] = {
        id,
        ko: normalizeKorean(word && word.ko),
        en: String((word && word.en) || ''),
        category: String((word && word.category) || ''),
        modalities: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    } else if (word) {
      state.items[id].ko = normalizeKorean(word.ko) || state.items[id].ko;
      state.items[id].en = String(word.en || state.items[id].en || '');
      state.items[id].category = String(word.category || state.items[id].category || '');
    }
    return state.items[id];
  }

  function getModality(item, name) {
    const key = name || 'recognition';
    if (!item.modalities[key]) item.modalities[key] = emptyModality();
    return item.modalities[key];
  }

  function modalityMastery(record) {
    if (!record || (!record.attempts && !record.successfulReviews)) return 0;
    const accuracy = record.attempts ? record.correct / record.attempts : 0;
    const reviewEvidence = Math.min(35, record.successfulReviews * 10);
    const spacingEvidence = Math.min(35, Math.log2((record.intervalDays || 0) + 1) * 14);
    const accuracyEvidence = accuracy * 20;
    const exposureEvidence = Math.min(5, (record.exposures || 0) * 0.5);
    const lapsePenalty = Math.min(25, (record.lapses || 0) * 3);
    return Math.round(clamp(reviewEvidence + spacingEvidence + accuracyEvidence + exposureEvidence - lapsePenalty, 0, 100));
  }

  function getMastery(word, modality) {
    const item = state.items[stableId(word)];
    if (!item) return 0;
    if (modality) return modalityMastery(item.modalities[modality]);
    const records = Object.values(item.modalities || {}).filter(r => r.attempts || r.exposures || r.successfulReviews);
    if (!records.length) return 0;
    const scores = records.map(modalityMastery).sort((a, b) => b - a);
    const best = scores[0] || 0;
    const breadthBonus = Math.min(10, Math.max(0, scores.length - 1) * 3);
    return Math.round(clamp(best + breadthBonus, 0, 100));
  }

  function dayKey(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function touchSession(now, correct, hints, activity) {
    const key = dayKey(now);
    const session = state.sessions[key] || { attempts: 0, correct: 0, hints: 0, activities: {}, firstAt: now, lastAt: now };
    session.attempts++;
    if (correct) session.correct++;
    session.hints += hints || 0;
    session.activities[activity || 'unknown'] = (session.activities[activity || 'unknown'] || 0) + 1;
    session.lastAt = now;
    state.sessions[key] = session;

    const keys = Object.keys(state.sessions).sort();
    while (keys.length > 45) delete state.sessions[keys.shift()];
  }

  function emit(event) {
    listeners.forEach((listener) => {
      try { listener(event); } catch (_) {}
    });
  }

  function recordAttempt(input) {
    const event = input || {};
    const word = event.word;
    if (!word || !normalizeKorean(word.ko)) return null;

    const now = Number(event.at) || Date.now();
    const modalityName = event.modality || 'recognition';
    const activity = event.activity || 'unknown';
    const hints = Math.max(0, Number(event.hints) || 0);
    const responseMs = Math.max(0, Number(event.responseMs) || 0);
    const correct = Boolean(event.correct);
    const item = getOrCreateItem(word);
    const record = getModality(item, modalityName);

    const previousDueAt = record.dueAt || 0;
    const previousSeenAt = record.lastSeenAt || 0;
    const wasDue = !previousDueAt || now >= previousDueAt;
    const hasSpacing = !previousSeenAt || now - previousSeenAt >= MIN_SPACED_GAP_MS;
    const scheduledReview = wasDue || hasSpacing;

    record.attempts++;
    record.hints += hints;
    record.averageResponseMs = record.attempts === 1
      ? responseMs
      : Math.round(((record.averageResponseMs * (record.attempts - 1)) + responseMs) / record.attempts);
    record.lastSeenAt = now;

    if (correct) {
      record.correct++;
      record.lastCorrectAt = now;
      if (scheduledReview) {
        record.successfulReviews++;
        record.reviewStreak++;
        const quality = hints > 0 ? 3 : responseMs > 12000 ? 3.5 : responseMs > 6000 ? 4 : 5;
        record.ease = clamp(record.ease + (quality >= 4 ? 0.05 : -0.08), 1.7, 2.8);
        if (record.successfulReviews === 1) record.intervalDays = 1;
        else if (record.successfulReviews === 2) record.intervalDays = 3;
        else record.intervalDays = clamp(Math.round(Math.max(1, record.intervalDays) * record.ease), 1, 180);
        record.dueAt = now + record.intervalDays * DAY_MS;
      }
    } else {
      record.lapses++;
      record.reviewStreak = 0;
      record.intervalDays = 0;
      record.ease = clamp(record.ease - 0.15, 1.7, 2.8);
      record.dueAt = now + RELEARN_MS;
    }

    item.updatedAt = now;
    state.updatedAt = now;
    state.totals.attempts++;
    if (correct) state.totals.correct++;
    state.totals.hints += hints;
    touchSession(now, correct, hints, activity);

    const attempt = {
      itemId: item.id,
      ko: item.ko,
      activity,
      modality: modalityName,
      correct,
      responseMs,
      hints,
      at: now,
      scheduledReview,
      mastery: getMastery(word)
    };
    state.recentAttempts.push(attempt);
    if (state.recentAttempts.length > MAX_RECENT_ATTEMPTS) {
      state.recentAttempts.splice(0, state.recentAttempts.length - MAX_RECENT_ATTEMPTS);
    }
    emit({ type: 'attempt', attempt: clone(attempt) });
    return clone(attempt);
  }

  function recordExposure(word, activity) {
    if (!word || !normalizeKorean(word.ko)) return null;
    const now = Date.now();
    const item = getOrCreateItem(word);
    const record = getModality(item, 'exposure');
    record.exposures++;
    record.lastSeenAt = now;
    item.updatedAt = now;
    state.totals.exposures++;
    state.updatedAt = now;
    emit({ type: 'exposure', itemId: item.id, activity: activity || 'unknown', at: now });
    return clone(item);
  }

  function dueAtForWord(word) {
    const item = state.items[stableId(word)];
    if (!item) return 0;
    const dueDates = Object.values(item.modalities || {})
      .filter(r => r.attempts > 0 && r.dueAt)
      .map(r => r.dueAt);
    return dueDates.length ? Math.min(...dueDates) : 0;
  }

  function selectNextWord(words, options) {
    const opts = options || {};
    const exclude = new Set(opts.exclude || []);
    const now = Number(opts.now) || Date.now();
    const available = (words || []).filter(w => w && w.ko && !exclude.has(w.ko));
    const pool = available.length ? available : (words || []).filter(w => w && w.ko);
    if (!pool.length) return null;

    const ranked = pool.map((word) => {
      const item = state.items[stableId(word)];
      const mastery = getMastery(word);
      const dueAt = dueAtForWord(word);
      const isNew = !item || !Object.values(item.modalities || {}).some(r => r.attempts > 0);
      const overdueHours = dueAt && dueAt <= now ? Math.min(72, (now - dueAt) / 3600000) : 0;
      const score = (isNew ? 150 : 0) + (overdueHours ? 220 + overdueHours : 0) + (100 - mastery) + Math.random() * 15;
      return { word, score };
    });
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0].word;
  }

  function calcLevelMastery(words) {
    if (!Array.isArray(words) || !words.length) return 0;
    const total = words.reduce((sum, word) => sum + getMastery(word), 0);
    return Math.floor(total / words.length);
  }

  function getSummary(words) {
    const scoped = Array.isArray(words) ? words : Object.values(state.items).map(item => ({ id: item.id, ko: item.ko }));
    const now = Date.now();
    let due = 0;
    let learned = 0;
    let mastered = 0;
    scoped.forEach((word) => {
      const mastery = getMastery(word);
      const dueAt = dueAtForWord(word);
      if (dueAt && dueAt <= now) due++;
      if (mastery >= 35) learned++;
      if (mastery >= 70) mastered++;
    });
    const attempts = state.totals.attempts || 0;
    return {
      tracked: Object.keys(state.items).length,
      due,
      learned,
      mastered,
      attempts,
      accuracy: attempts ? Math.round((state.totals.correct / attempts) * 100) : 0,
      hints: state.totals.hints || 0
    };
  }

  function bootstrapFromHarvestCounts(harvests, words) {
    const byKo = {};
    (words || []).forEach(word => {
      if (!word || !word.ko) return;
      answerVariants(word).forEach(variant => { byKo[variant] = word; });
    });
    Object.entries(harvests || {}).forEach(([ko, rawCount]) => {
      const count = Math.max(0, Number(rawCount) || 0);
      if (!count) return;
      const word = byKo[normalizeKorean(ko)] || { ko, en: '' };
      const item = getOrCreateItem(word);
      const record = getModality(item, 'production');
      if (record.attempts || record.successfulReviews) return;
      record.attempts = count * 3;
      record.correct = count * 3;
      record.successfulReviews = Math.min(count, 6);
      record.reviewStreak = Math.min(count, 6);
      record.intervalDays = count >= 3 ? Math.min(30, Math.pow(2, count - 1)) : count;
      record.dueAt = Date.now();
      record.lastSeenAt = Date.now();
      record.lastCorrectAt = Date.now();
      item.legacyHarvests = count;
    });
    state.updatedAt = Date.now();
  }

  function importState(value) {
    if (!value || typeof value !== 'object') {
      state = freshState();
      return exportState();
    }
    const next = freshState();
    next.items = value.items && typeof value.items === 'object' ? clone(value.items) : {};
    next.sessions = value.sessions && typeof value.sessions === 'object' ? clone(value.sessions) : {};
    next.totals = Object.assign(next.totals, value.totals || {});
    next.recentAttempts = Array.isArray(value.recentAttempts)
      ? clone(value.recentAttempts.slice(-MAX_RECENT_ATTEMPTS))
      : [];
    next.createdAt = Number(value.createdAt) || next.createdAt;
    next.updatedAt = Number(value.updatedAt) || Date.now();
    state = next;
    return exportState();
  }

  function exportState() {
    state.version = VERSION;
    return clone(state);
  }

  function reset() {
    state = freshState();
    emit({ type: 'reset' });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function noop() {};
    listeners.add(listener);
    return function unsubscribe() { listeners.delete(listener); };
  }

  const api = {
    VERSION,
    normalizeKorean,
    answerVariants,
    isAnswerCorrect,
    romanizeHangul,
    stableId,
    recordAttempt,
    recordExposure,
    getMastery,
    dueAtForWord,
    selectNextWord,
    calcLevelMastery,
    getSummary,
    bootstrapFromHarvestCounts,
    importState,
    exportState,
    reset,
    subscribe
  };

  root.HVLearning = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
