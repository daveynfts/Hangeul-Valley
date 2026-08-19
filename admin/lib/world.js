const fs = require('fs');
const path = require('path');

const LAYOUT_REL = path.join('worlds', 'unit10-layout.json');
const QUIZ_REL = path.join('worlds', 'unit10-desk-quiz.json');
const WORLD_REL = path.join('worlds', '2b-unit-10.json');
const STATION_IDS = ['desk', 'kitchen', 'taste'];

function writeBoth(rel, data, rootDir) {
  const json = JSON.stringify(data, null, 2) + '\n';
  JSON.parse(json);
  const dests = [path.join(rootDir, rel), path.join(rootDir, 'assets', rel)];
  dests.forEach((dest) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.copyFileSync(tmp, dest);
    fs.unlinkSync(tmp);
  });
}

function readJson(rel, rootDir) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) throw new Error(`${rel} not found`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function getLayout(rootDir) {
  return readJson(LAYOUT_REL, rootDir);
}

function saveLayout(body, rootDir) {
  if (!body || typeof body !== 'object') throw new Error('Layout body must be an object');
  if (!Array.isArray(body.stations) || body.stations.length !== 3) {
    throw new Error('Layout must include exactly 3 stations (desk, kitchen, taste).');
  }
  const seen = new Set();
  body.stations.forEach((s) => {
    if (!s || !STATION_IDS.includes(s.id)) throw new Error(`Unknown station id: ${s && s.id}`);
    if (seen.has(s.id)) throw new Error(`Duplicate station id: ${s.id}`);
    seen.add(s.id);
    ['ox', 'oy'].forEach((k) => {
      if (typeof s[k] !== 'number' || Number.isNaN(s[k])) throw new Error(`${s.id}.${k} must be a number`);
    });
    if (s.scale != null && (typeof s.scale !== 'number' || s.scale <= 0)) throw new Error(`${s.id}.scale must be > 0`);
  });
  STATION_IDS.forEach((id) => {
    if (!seen.has(id)) throw new Error(`Missing station: ${id}`);
  });
  const next = {
    version: 1,
    farm: body.farm || { w: 180, h: 312 },
    stations: body.stations.map((s) => ({
      id: s.id,
      nameKo: String(s.nameKo || ''),
      nameEn: String(s.nameEn || ''),
      ox: Math.round(s.ox),
      oy: Math.round(s.oy),
      scale: typeof s.scale === 'number' ? s.scale : 1,
      originX: typeof s.originX === 'number' ? s.originX : 0.5,
      interact: typeof s.interact === 'number' ? s.interact : 72
    }))
  };
  writeBoth(LAYOUT_REL, next, rootDir);
  return next;
}

function getQuiz(rootDir) {
  return readJson(QUIZ_REL, rootDir);
}

function saveQuiz(body, rootDir) {
  if (!body || !Array.isArray(body.questions)) throw new Error('Quiz must include a questions array');
  const qs = body.questions;
  if (qs.length < 1) throw new Error('Quiz needs at least one question');
  const ids = new Set();
  qs.forEach((q, i) => {
    if (!q || !q.q || !q.a || !q.choices) throw new Error(`Question ${i + 1} is incomplete`);
    if (!['A', 'B', 'C', 'D'].includes(q.a)) throw new Error(`Question ${i + 1} answer must be A–D`);
    ['A', 'B', 'C', 'D'].forEach((k) => {
      if (!q.choices[k]) throw new Error(`Question ${i + 1} missing choice ${k}`);
    });
    const id = typeof q.id === 'number' ? q.id : i + 1;
    if (ids.has(id)) throw new Error(`Duplicate question id ${id}`);
    ids.add(id);
  });
  const next = {
    titleKo: body.titleKo || '학습 책상',
    titleEn: body.titleEn || 'Study desk',
    sessionSize: Math.max(1, Math.min(20, Number(body.sessionSize) || 5)),
    doneKo: body.doneKo || '오늘 공부 끝!',
    againKo: body.againKo || '한 번 더',
    closeKo: body.closeKo || '책상 닫기',
    correctKo: body.correctKo || '맞아요!',
    wrongKo: body.wrongKo || 'Answer:',
    questions: qs.map((q, i) => ({
      id: typeof q.id === 'number' ? q.id : i + 1,
      q: String(q.q),
      a: q.a,
      choices: { A: String(q.choices.A), B: String(q.choices.B), C: String(q.choices.C), D: String(q.choices.D) }
    }))
  };
  writeBoth(QUIZ_REL, next, rootDir);
  return next;
}

function getWorld(rootDir) {
  return readJson(WORLD_REL, rootDir);
}

function saveWorld(body, rootDir) {
  if (!body || !body.level || !Array.isArray(body.level.words)) {
    throw new Error('World must include level.words');
  }
  const words = body.level.words;
  const missing = words.filter((w) => !w || !w.ko || !w.en || !w.category || !w.categoryEn);
  if (missing.length) throw new Error(`${missing.length} word(s) missing ko / en / category / categoryEn`);
  writeBoth(WORLD_REL, body, rootDir);
  return { wordCount: words.length, id: body.id };
}

module.exports = {
  getLayout, saveLayout, getQuiz, saveQuiz, getWorld, saveWorld
};
