/**
 * Unit 14 workbook pages — read and write worlds/unit14-workbook.json.
 *
 * The game leans on invariants this file is the only place that can enforce.
 * Every exercise is "assign one of N bank entries to each of M slots", and the
 * renderer assumes: answers point at real chips, no chip answers two slots, a
 * fill chip carries both its dictionary and 해요 forms, and a dialogue line
 * marks where the blank goes. Saving data that breaks any of those would ship a
 * page that cannot be completed, so save refuses instead of writing it.
 */
const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomicWrite');

const WORKBOOK_REL = path.join('worlds', 'unit14-workbook.json');
const TYPES = ['fill', 'match', 'dialogue', 'experience'];
// 'experience' is the odd one out: its choices hang off each question rather
// than a shared box, so it validates on a different axis. Everything else is
// "assign one of N shared entries to each of M slots".
const PER_ITEM_CHOICE_TYPES = ['experience'];

function readJson(rel, rootDir) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) throw new Error(`${rel} not found`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function writeJson(rel, data, rootDir) {
  const json = JSON.stringify(data, null, 2) + '\n';
  JSON.parse(json);
  atomicWriteJson(path.join(rootDir, rel), json);
}

function getWorkbook(rootDir) {
  return readJson(WORKBOOK_REL, rootDir);
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function cleanChip(chip, where, type) {
  const id = str(chip && chip.id);
  if (!id) throw new Error(`${where}: every box entry needs an id`);
  const out = { id };
  if (type === 'fill') {
    // The learner picks the dictionary form and the sentence needs the 해요
    // form. Both are stored because Korean conjugation here is irregular and
    // deriving one from the other would be guesswork.
    out.dict = str(chip.dict);
    out.polite = str(chip.polite);
    if (!out.dict) throw new Error(`${where}: ${id} needs a dictionary form`);
    if (!out.polite) throw new Error(`${where}: ${id} needs the conjugated (해요) form`);
  } else {
    out.ko = str(chip.ko);
    if (!out.ko) throw new Error(`${where}: ${id} needs Korean text`);
    if (str(chip.mark)) out.mark = str(chip.mark);
  }
  if (chip.usedByExample) out.usedByExample = true;
  return out;
}

function cleanItem(item, i, where, type, chipIds) {
  const at = `${where} item ${i + 1}`;
  const answer = str(item && item.answer);
  if (!answer) throw new Error(`${at}: needs an answer`);
  if (!chipIds.has(answer)) throw new Error(`${at}: answer "${answer}" is not in the box`);
  const out = {
    n: typeof item.n === 'number' && item.n > 0 ? item.n : i + 1,
    answer,
    en: str(item.en),
    why: str(item.why),
    grammar: str(item.grammar)
  };
  if (!out.why) throw new Error(`${at}: needs a "why" — the page shows it after checking`);
  if (!out.grammar) throw new Error(`${at}: needs a grammar note`);
  if (type === 'dialogue') {
    out.aKo = str(item.aKo);
    if (!out.aKo) throw new Error(`${at}: needs A's line`);
    if (out.aKo.indexOf('{}') < 0) {
      throw new Error(`${at}: A's line must contain {} where the answer goes`);
    }
  } else {
    out.stemKo = str(item.stemKo);
    if (!out.stemKo) throw new Error(`${at}: needs the Korean prompt`);
  }
  return out;
}

// A question that carries its own choices. The graded answer must be one of
// them, and there has to be something to get wrong — a single choice is not a
// question. Distractors are the whole point here: the learner should be choosing
// between 들은 and 듣은, not picking the only button on the row.
function cleanChoiceItem(item, i, where) {
  const at = `${where} item ${i + 1}`;
  const raw = Array.isArray(item && item.choices) ? item.choices : [];
  if (raw.length < 2) throw new Error(`${at}: needs at least two choices`);
  const seen = new Set();
  const choices = raw.map((c) => {
    const id = str(c && c.id);
    const ko = str(c && c.ko);
    if (!id) throw new Error(`${at}: every choice needs an id`);
    if (!ko) throw new Error(`${at}: choice "${id}" needs Korean text`);
    if (seen.has(id)) throw new Error(`${at}: duplicate choice id "${id}"`);
    seen.add(id);
    return { id, ko };
  });
  const answer = str(item.answer);
  if (!answer) throw new Error(`${at}: needs an answer`);
  if (!seen.has(answer)) throw new Error(`${at}: answer "${answer}" is not one of its choices`);
  const out = {
    n: typeof item.n === 'number' && item.n > 0 ? item.n : i + 1,
    art: str(item.art),
    phraseKo: str(item.phraseKo),
    stemKo: str(item.stemKo),
    answer,
    choices,
    en: str(item.en),
    why: str(item.why),
    grammar: str(item.grammar)
  };
  if (!out.stemKo) throw new Error(`${at}: needs the Korean prompt`);
  if (!out.why) throw new Error(`${at}: needs a "why" — the page shows it after checking`);
  if (!out.grammar) throw new Error(`${at}: needs a grammar note`);
  return out;
}

function cleanExercise(ex, i, seenIds) {
  const where = `Exercise ${i + 1}`;
  const id = str(ex && ex.id);
  if (!id) throw new Error(`${where}: needs an id`);
  if (seenIds.has(id)) throw new Error(`${where}: duplicate id "${id}"`);
  seenIds.add(id);

  const type = str(ex.type) || 'fill';
  if (!TYPES.includes(type)) {
    throw new Error(`${where}: type must be one of ${TYPES.join(', ')} (got "${type}")`);
  }
  const no = str(ex.no);
  if (!no) throw new Error(`${where}: needs a 연습 number`);
  if (!str(ex.instructionKo)) throw new Error(`${where}: needs the Korean instruction`);

  const perItem = PER_ITEM_CHOICE_TYPES.includes(type);
  const bank = Array.isArray(ex.bank) ? ex.bank : [];
  if (!perItem && bank.length < 2) throw new Error(`${where}: the box needs at least two entries`);
  const chips = perItem ? [] : bank.map((c) => cleanChip(c, where, type));
  const chipIds = new Set();
  chips.forEach((c) => {
    if (chipIds.has(c.id)) throw new Error(`${where}: duplicate box id "${c.id}"`);
    chipIds.add(c.id);
  });
  const spent = chips.filter((c) => c.usedByExample);
  if (spent.length > 1) throw new Error(`${where}: only one entry can be the worked example`);

  const items = Array.isArray(ex.items) ? ex.items : [];
  if (!items.length) throw new Error(`${where}: needs at least one question`);
  const cleaned = perItem
    ? items.map((it, k) => cleanChoiceItem(it, k, where))
    : items.map((it, k) => cleanItem(it, k, where, type, chipIds));

  if (perItem) {
    const out = {
      id, type,
      section: str(ex.section) || '어휘',
      sectionEn: str(ex.sectionEn) || 'Vocabulary',
      no,
      icon: str(ex.icon) || '📝',
      blurbEn: str(ex.blurbEn),
      instructionKo: str(ex.instructionKo),
      instructionEn: str(ex.instructionEn),
      noteEn: str(ex.noteEn),
      pattern: str(ex.pattern),
      ownLabels: {
        yes: str(ex.ownLabels && ex.ownLabels.yes) || '있어요',
        no: str(ex.ownLabels && ex.ownLabels.no) || '없어요'
      },
      items: cleaned
    };
    if (ex.example) {
      const exAnswer = str(ex.example.answer);
      out.example = {
        art: str(ex.example.art),
        phraseKo: str(ex.example.phraseKo),
        stemKo: str(ex.example.stemKo),
        answer: exAnswer,
        own: ex.example.own === 'yes' ? 'yes' : 'no',
        en: str(ex.example.en)
      };
      if (!out.example.stemKo) throw new Error(`${where}: the example needs its Korean prompt`);
      // The worked example shows a finished sentence, so its answer has to be a
      // real form — the first question's choices are where it comes from.
      const firstChoices = (cleaned[0] && cleaned[0].choices) || [];
      if (exAnswer && !firstChoices.some((c) => c.id === exAnswer)) {
        throw new Error(`${where}: the example answer "${exAnswer}" is not one of question 1's choices`);
      }
    }
    return out;
  }

  // One chip per slot. The game moves a chip rather than cloning it, so data
  // where two slots share an answer can never be completed.
  const answers = cleaned.map((it) => it.answer);
  const dupe = answers.find((a, k) => answers.indexOf(a) !== k);
  if (dupe) throw new Error(`${where}: "${dupe}" answers more than one question`);
  const spentIds = new Set(spent.map((c) => c.id));
  const usedAsAnswer = answers.find((a) => spentIds.has(a));
  if (usedAsAnswer) {
    throw new Error(`${where}: "${usedAsAnswer}" is the worked example, so it cannot also be an answer`);
  }
  const pickable = chips.length - spent.length;
  if (pickable < cleaned.length) {
    throw new Error(`${where}: ${cleaned.length} questions but only ${pickable} pickable entries`);
  }

  const out = {
    id,
    type,
    section: str(ex.section) || '어휘',
    sectionEn: str(ex.sectionEn) || 'Vocabulary',
    no,
    icon: str(ex.icon) || '📝',
    blurbEn: str(ex.blurbEn),
    instructionKo: str(ex.instructionKo),
    instructionEn: str(ex.instructionEn),
    noteEn: str(ex.noteEn),
    bank: chips,
    items: cleaned
  };
  if (type === 'dialogue') {
    out.reply = str(ex.reply);
    if (!out.reply) throw new Error(`${where}: a dialogue needs B's reply`);
  }
  if (ex.example && (str(ex.example.answer) || str(ex.example.stemKo) || str(ex.example.aKo))) {
    const answer = str(ex.example.answer);
    if (!chipIds.has(answer)) throw new Error(`${where}: the example answer is not in the box`);
    if (!spentIds.has(answer)) {
      throw new Error(`${where}: mark "${answer}" as the worked example, or the learner will be offered it as a choice`);
    }
    out.example = { answer, en: str(ex.example.en) };
    if (type === 'dialogue') {
      out.example.aKo = str(ex.example.aKo);
      if (out.example.aKo.indexOf('{}') < 0) {
        throw new Error(`${where}: the example's A line must contain {}`);
      }
    } else {
      out.example.stemKo = str(ex.example.stemKo);
      if (!out.example.stemKo) throw new Error(`${where}: the example needs its Korean prompt`);
    }
  } else if (spent.length) {
    throw new Error(`${where}: "${spent[0].id}" is marked as the worked example but no example is written`);
  }
  return out;
}

function saveWorkbook(body, rootDir) {
  if (!body || typeof body !== 'object') throw new Error('Workbook body must be an object');
  const list = Array.isArray(body.exercises) ? body.exercises : null;
  if (!list) throw new Error('Workbook must include an exercises array');
  if (!list.length) throw new Error('Workbook needs at least one exercise');

  const seen = new Set();
  const exercises = list.map((ex, i) => cleanExercise(ex, i, seen));

  const next = {
    id: str(body.id) || 'unit14-workbook',
    source: str(body.source),
    titleKo: str(body.titleKo) || '연습 문제',
    titleEn: str(body.titleEn) || 'Workbook',
    pickKo: str(body.pickKo) || '어떤 연습을 할까요?',
    pickEn: str(body.pickEn),
    hintKo: str(body.hintKo),
    checkKo: str(body.checkKo) || '확인',
    checkEn: str(body.checkEn) || 'Check',
    againKo: str(body.againKo) || '다시 풀기',
    backKo: str(body.backKo) || '연습 목록',
    doneKo: str(body.doneKo) || '닫기',
    exercises
  };
  writeJson(WORKBOOK_REL, next, rootDir);
  return { exerciseCount: exercises.length, itemCount: exercises.reduce((n, e) => n + e.items.length, 0) };
}

module.exports = { getWorkbook, saveWorkbook, WORKBOOK_REL, TYPES };
