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
const TYPES = ['fill', 'match', 'dialogue', 'experience', 'build'];
// 'experience' and 'build' are the odd ones out: their choices hang off each
// question rather than a shared box, so they validate on a different axis.
// Everything else is "assign one of N shared entries to each of M slots".
const PER_ITEM_CHOICE_TYPES = ['experience', 'build'];

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

// Which workbooks exist, by the unit they belong to. Unit 14 stays the default
// so every caller that predates a second unit keeps working; the admin panel is
// still one of them and edits only Unit 14 until it grows a picker.
// 'unit14-textbook' is the same file format from the other book. The 익힘책 pages are
// 'unit14'; this is the 교과서's own 말하기 / 읽기 / 과제 / 문화 산책 / 발음 / 자기 평가
// exercises, which the study desk offers as a separate section because they come from a
// separate book and drill separate things.
//
// The key names its own file either way: a bare unit key means <unit>-workbook.json, and a
// key that already carries the book name means exactly that file. Nothing here may point at
// a file belonging to another key — that is what the editor showing Unit 14's exercises for
// every unit looked like, and admin/test asserts against it.
const WORKBOOKS = {
  unit14: path.join('worlds', 'unit14-workbook.json'),
  'unit14-textbook': path.join('worlds', 'unit14-textbook.json'),
  unit10: path.join('worlds', 'unit10-workbook.json'),
  'unit10-textbook': path.join('worlds', 'unit10-textbook.json')
};

function workbookRel(unit) {
  const rel = WORKBOOKS[str(unit) || 'unit14'];
  if (!rel) throw new Error(`No workbook for "${unit}"`);
  return rel;
}

function getWorkbook(rootDir, unit) {
  return readJson(workbookRel(unit), rootDir);
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// A picture the game already ships, named by its path under sprites/. Reusing
// the Unit 10 food icons rather than drawing new ones is the point, so this
// takes a real sprite path and refuses anything that leaves the folder — the
// value ends up in an <img src>.
function cleanImg(v, where) {
  const src = str(v);
  if (!src) return '';
  if (src.indexOf('..') >= 0 || !/^sprites\/[A-Za-z0-9._/-]+\.png$/.test(src)) {
    throw new Error(`${where}: img must be a path under sprites/ ending in .png (got "${src}")`);
  }
  return src;
}

// A box entry is either one piece of text, or two: the dictionary form the box
// shows and the form the sentence actually needs. Which of the two it is depends
// on the entry rather than on the exercise type — Unit 14's 어휘 연습 1 needs
// both on a fill page, and Unit 10's taste adjectives need both on a dialogue.
// The two forms are stored rather than derived because the conjugation is
// irregular often enough that deriving it would be guesswork.
function cleanChip(chip, where, type) {
  const id = str(chip && chip.id);
  if (!id) throw new Error(`${where}: every box entry needs an id`);
  const out = { id };
  const dict = str(chip && chip.dict);
  if (dict || type === 'fill') {
    out.dict = dict;
    out.polite = str(chip.polite);
    if (!out.dict) throw new Error(`${where}: ${id} needs a dictionary form`);
    if (!out.polite) {
      throw new Error(`${where}: ${id} needs the form the sentence puts in the blank`);
    }
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
    // The same script shape 'build' uses: as many lines as the exchange needs,
    // each with an optional speaker, and the gap wherever the book puts it. It
    // used to be one A line plus a reply shared by the whole exercise, which
    // could not express Unit 10's 연습 2 — there the answer falls in A's line on
    // some items and B's on others, and B says something different every time.
    out.lines = cleanLines(item.lines, at, 1);
  } else {
    // A picture can be the prompt on its own — Unit 10 matches a bowl of food to
    // its name, and putting the name on the left as well would answer the row.
    // Every other row still has to say something.
    out.img = cleanImg(item.img, at);
    if (!out.img) delete out.img;
    out.stemKo = str(item.stemKo);
    if (!out.stemKo && !out.img) throw new Error(`${at}: needs a Korean prompt or a picture`);
    if (!out.stemKo) delete out.stemKo;
  }
  return out;
}

// One set of buttons for one blank. There has to be something to get wrong — a
// single choice is not a question. Distractors are the whole point here: the
// learner should be choosing between 들은 and 듣은, not picking the only button
// on the row.
function cleanChoiceList(raw, at, what) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length < 2) throw new Error(`${at}: ${what}needs at least two choices`);
  const ids = new Set();
  const choices = list.map((c) => {
    const id = str(c && c.id);
    const ko = str(c && c.ko);
    if (!id) throw new Error(`${at}: every choice needs an id`);
    if (!ko) throw new Error(`${at}: choice "${id}" needs Korean text`);
    if (ids.has(id)) throw new Error(`${at}: duplicate choice id "${id}"`);
    ids.add(id);
    return { id, ko };
  });
  return { choices, ids };
}

// A 'build' question is a short script: one or two speakers, and a gap in one of
// the lines. The number of gaps has to match the number of choice sets, because
// a line with nowhere to put the answer renders as already finished, and a spare
// choice set renders buttons that change nothing on screen.
function cleanLines(raw, at, gaps) {
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) throw new Error(`${at}: needs at least one line`);
  let found = 0;
  const lines = list.map((l) => {
    const ko = str(l && l.ko);
    if (!ko) throw new Error(`${at}: every line needs Korean text`);
    found += ko.split('{}').length - 1;
    const out = {};
    const who = str(l && l.who);
    if (who) out.who = who;
    out.ko = ko;
    return out;
  });
  if (found !== gaps) {
    throw new Error(`${at}: ${gaps} blank(s) to fill, but the lines carry ${found} {}`);
  }
  return lines;
}

// A question that carries its own choices, for either of the two types that
// work that way. 'experience' prints one prompt and one blank; 'build' prints a
// script and can put a second blank in it — the 해도 돼요? / -면 안 돼요 pair the
// book drills as one exchange.
function cleanChoiceItem(item, i, where, type) {
  const at = `${where} item ${i + 1}`;
  const slot = cleanChoiceList(item && item.choices, at, '');
  const answer = str(item && item.answer);
  if (!answer) throw new Error(`${at}: needs an answer`);
  if (!slot.ids.has(answer)) throw new Error(`${at}: answer "${answer}" is not one of its choices`);

  const out = {
    n: typeof item.n === 'number' && item.n > 0 ? item.n : i + 1,
    art: str(item.art),
    phraseKo: str(item.phraseKo)
  };
  if (type === 'build') {
    const hasSecond = !!(item.choices2 || item.answer2);
    out.lines = cleanLines(item.lines, at, hasSecond ? 2 : 1);
    out.answer = answer;
    out.choices = slot.choices;
    if (hasSecond) {
      const slot2 = cleanChoiceList(item.choices2, at, 'the second blank ');
      // The renderer looks a placed choice up by id across the whole row, so an
      // id shared by both blanks would put the first blank's text in the second.
      const clash = slot2.choices.find((c) => slot.ids.has(c.id));
      if (clash) throw new Error(`${at}: choice id "${clash.id}" is used by both blanks`);
      const answer2 = str(item.answer2);
      if (!answer2) throw new Error(`${at}: needs an answer for the second blank`);
      if (!slot2.ids.has(answer2)) {
        throw new Error(`${at}: answer "${answer2}" is not one of the second blank's choices`);
      }
      out.answer2 = answer2;
      out.choices2 = slot2.choices;
    }
  } else {
    out.stemKo = str(item.stemKo);
    if (!out.stemKo) throw new Error(`${at}: needs the Korean prompt`);
    out.answer = answer;
    out.choices = slot.choices;
  }
  out.en = str(item.en);
  out.why = str(item.why);
  out.grammar = str(item.grammar);
  if (!out.why) throw new Error(`${at}: needs a "why" — the page shows it after checking`);
  if (!out.grammar) throw new Error(`${at}: needs a grammar note`);
  const audio = cleanAudio(item.audio, at);
  if (audio) out.audio = audio;
  return out;
}

// A recording of the exercise as the book's track has it. The value goes
// straight into new Audio(src) in the browser, so it is pinned to the folder the
// game ships audio from: no absolute URL, no scheme, and nothing that walks out
// of it.
function cleanAudio(a, where) {
  const src = str(a && a.src);
  if (!src) return null;
  if (src.indexOf('..') >= 0 || !/^audio\/[A-Za-z0-9._/-]+\.mp3$/.test(src)) {
    throw new Error(`${where}: audio src must be a path under audio/ ending in .mp3 (got "${src}")`);
  }
  const out = { src };
  const label = str(a.labelEn);
  if (label) out.labelEn = label;
  // How far into the clip the prompt stops and the model answer starts. A row
  // that has not been answered plays only that much, or the recording reads the
  // answer out before the learner has had a go at it.
  if (a.askEnd !== undefined && a.askEnd !== null && a.askEnd !== '') {
    const askEnd = Number(a.askEnd);
    if (!isFinite(askEnd) || askEnd <= 0) {
      throw new Error(`${where}: askEnd must be a positive number of seconds (got "${a.askEnd}")`);
    }
    out.askEnd = Math.round(askEnd * 100) / 100;
  }
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
    ? items.map((it, k) => cleanChoiceItem(it, k, where, type))
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
      pattern: str(ex.pattern)
    };
    if (type === 'experience') {
      out.ownLabels = {
        yes: str(ex.ownLabels && ex.ownLabels.yes) || '있어요',
        no: str(ex.ownLabels && ex.ownLabels.no) || '없어요'
      };
    }
    out.items = cleaned;
    if (ex.example && type === 'build') {
      // A 'build' example has no shared box to borrow its answer from, so the
      // finished text is stored outright. An example with a gap left in it would
      // be showing the learner the same puzzle instead of the answer to it.
      const answerKo = str(ex.example.answerKo);
      const answer2Ko = str(ex.example.answer2Ko);
      if (!answerKo) throw new Error(`${where}: the worked example needs its answer written out`);
      const eg = {
        art: str(ex.example.art),
        phraseKo: str(ex.example.phraseKo),
        lines: cleanLines(ex.example.lines, `${where} example`, answer2Ko ? 2 : 1),
        answerKo
      };
      if (answer2Ko) eg.answer2Ko = answer2Ko;
      eg.en = str(ex.example.en);
      const egAudio = cleanAudio(ex.example.audio, `${where} example`);
      if (egAudio) eg.audio = egAudio;
      out.example = eg;
    } else if (ex.example) {
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
    noteEn: str(ex.noteEn)
  };
  // The grammar point the exercise belongs to. The list uses it as the headline,
  // because 문법과 표현 numbers its 연습 inside each point — Unit 10 has two pages
  // called 연습 1 and only the pattern tells them apart. This used to be written
  // for the two per-question types only and dropped for everything else, so a
  // 문법과 표현 page built out of one shared box came back without it.
  const pattern = str(ex.pattern);
  if (pattern) out.pattern = pattern;
  out.bank = chips;
  out.items = cleaned;
  if (ex.example && (str(ex.example.answer) || str(ex.example.stemKo)
    || (ex.example.lines && ex.example.lines.length))) {
    const answer = str(ex.example.answer);
    if (!chipIds.has(answer)) throw new Error(`${where}: the example answer is not in the box`);
    if (!spentIds.has(answer)) {
      throw new Error(`${where}: mark "${answer}" as the worked example, or the learner will be offered it as a choice`);
    }
    out.example = { answer, en: str(ex.example.en) };
    if (type === 'dialogue') {
      out.example.lines = cleanLines(ex.example.lines, `${where} example`, 1);
    } else {
      out.example.stemKo = str(ex.example.stemKo);
      if (!out.example.stemKo) throw new Error(`${where}: the example needs its Korean prompt`);
    }
  } else if (spent.length) {
    throw new Error(`${where}: "${spent[0].id}" is marked as the worked example but no example is written`);
  }
  return out;
}

function saveWorkbook(body, rootDir, unit) {
  const rel = workbookRel(unit);
  if (!body || typeof body !== 'object') throw new Error('Workbook body must be an object');
  const list = Array.isArray(body.exercises) ? body.exercises : null;
  if (!list) throw new Error('Workbook must include an exercises array');
  if (!list.length) throw new Error('Workbook needs at least one exercise');

  const seen = new Set();
  const exercises = list.map((ex, i) => cleanExercise(ex, i, seen));

  const next = {
    id: str(body.id) || path.basename(rel, '.json'),
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
  writeJson(rel, next, rootDir);
  return { exerciseCount: exercises.length, itemCount: exercises.reduce((n, e) => n + e.items.length, 0) };
}

module.exports = { getWorkbook, saveWorkbook, workbookRel, WORKBOOKS, WORKBOOK_REL, TYPES };
