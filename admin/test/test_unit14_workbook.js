/**
 * Unit 14 workbook API — read, write, and the refusals that matter.
 *
 * The game's renderer assumes things the JSON has to guarantee: answers point at
 * real box entries, no entry answers two questions, a fill entry carries both
 * its dictionary and 해요 forms, a dialogue line marks its blank with {}. This
 * suite is the proof that saving cannot break any of them, because an editor
 * that can write unrenderable data is worse than no editor.
 */
const fs = require('fs');
const path = require('path');
const workbookLib = require('../lib/workbook');
const { makeWriteSandbox, rmSandbox } = require('./sandbox');

const repoRoot = path.resolve(__dirname, '../../');

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Deep-compare by value: recursively key-sorted JSON, so a difference in key
// order cannot masquerade as a difference in content.
function canonical(v) {
  const walk = (x) => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      return Object.keys(x).sort().reduce((o, k) => { o[k] = walk(x[k]); return o; }, {});
    }
    return x;
  };
  return JSON.stringify(walk(v));
}

function refuses(body, rootDir, needle, label) {
  let msg = null;
  try {
    workbookLib.saveWorkbook(body, rootDir);
  } catch (err) {
    msg = err.message;
  }
  assert(msg !== null, `${label}: should have been refused`);
  assert(msg.toLowerCase().indexOf(needle.toLowerCase()) >= 0,
    `${label}: message should mention "${needle}" (got "${msg}")`);
}

async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const testDetails = [];

  const rootDir = makeWriteSandbox(repoRoot);

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      testDetails.push({ name, passed: true });
    } catch (err) {
      failed++;
      testDetails.push({ name, passed: false, error: err.message });
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // A known-good book, deep-cloned per test so one mutation cannot leak.
  const original = workbookLib.getWorkbook(rootDir);
  const clone = () => JSON.parse(JSON.stringify(original));

  try {
    await test('Reads the shipped workbook and every type it uses is supported', () => {
      const book = workbookLib.getWorkbook(rootDir);
      assert(Array.isArray(book.exercises) && book.exercises.length >= 4, 'at least four exercises');
      const types = [...new Set(book.exercises.map((e) => e.type))].sort();
      assert(types.join(',') === 'build,dialogue,experience,fill,match',
        `all five types are present (got ${types})`);
      types.forEach((t) => assert(workbookLib.TYPES.includes(t), `${t} is a supported type`));
      book.exercises.forEach((e) => {
        assert(e.items.length >= 4, `${e.no} has at least four questions`);
        assert(e.items.every((i) => i.why && i.grammar), `${e.section} ${e.no} explains every answer`);
      });
    });

    await test('Round-trips unchanged: save then read gives the same exercises', () => {
      const before = clone();
      const expectedItems = original.exercises.reduce((n, e) => n + e.items.length, 0);
      const res = workbookLib.saveWorkbook(before, rootDir);
      assert(res.exerciseCount === original.exercises.length,
        `reports ${original.exercises.length} exercises saved`);
      assert(res.itemCount === expectedItems, `reports ${expectedItems} questions saved (got ${res.itemCount})`);
      const after = workbookLib.getWorkbook(rootDir);
      // Key order carries no meaning in JSON, so the comparison is on values.
      assert(canonical(after.exercises) === canonical(original.exercises),
        'every exercise survives a round trip unchanged');
    });

    // ── The per-question type validates on its own axis ──────────────────────
    await test('The experience type keeps its per-question choices', () => {
      const book = workbookLib.getWorkbook(rootDir);
      const g = book.exercises.find((e) => e.type === 'experience');
      assert(!!g, 'the grammar exercise is present');
      assert(!g.bank, 'it has no shared box — choices belong to each question');
      assert(g.items.every((i) => (i.choices || []).length >= 2), 'every question offers a real choice');
      assert(g.items.every((i) => i.choices.some((c) => c.id === i.answer)),
        'every answer is one of its own question’s choices');
      assert(g.items.every((i) => i.art), 'every question names its picture');
      assert(g.ownLabels && g.ownLabels.yes && g.ownLabels.no,
        'the two personal answers are labelled');
    });

    await test('Refuses an experience answer that is not one of its own choices', () => {
      const book = clone();
      const g = book.exercises.find((e) => e.type === 'experience');
      g.items[0].answer = g.items[1].answer;
      refuses(book, rootDir, 'not one of its choices', 'answer borrowed from another question');
    });

    await test('Refuses an experience question with nothing to choose between', () => {
      const one = clone();
      const g1 = one.exercises.find((e) => e.type === 'experience');
      g1.items[0].choices = [g1.items[0].choices[0]];
      refuses(one, rootDir, 'at least two choices', 'a question with a single button');
      const dup = clone();
      const g2 = dup.exercises.find((e) => e.type === 'experience');
      g2.items[0].choices[1].id = g2.items[0].choices[0].id;
      refuses(dup, rootDir, 'duplicate choice id', 'two choices sharing an id');
    });

    // ── 'build': a script with the gap wherever the book puts it ─────────────
    await test('The build type keeps its lines, its gaps and its second blank', () => {
      const book = workbookLib.getWorkbook(rootDir);
      const built = book.exercises.filter((e) => e.type === 'build');
      assert(built.length >= 2, `the grammar pages are present (got ${built.length})`);
      built.forEach((e) => {
        assert(!e.bank, `${e.pattern} ${e.no} has no shared box`);
        assert(!!e.pattern, `${e.no} names the grammar point it drills`);
        e.items.forEach((i) => {
          const gaps = i.lines.reduce((n, l) => n + l.ko.split('{}').length - 1, 0);
          assert(gaps === (i.choices2 ? 2 : 1),
            `${e.pattern} ${e.no} item ${i.n}: one {} per choice set`);
          assert(i.choices.some((c) => c.id === i.answer), `item ${i.n} answers one of its choices`);
          if (i.choices2) {
            assert(i.choices2.some((c) => c.id === i.answer2),
              `item ${i.n}: the second blank answers one of its own choices`);
          }
        });
      });
      // The pair exercise is the only one with two blanks, and it has to have
      // them: marking half of 해도 돼요? / -면 안 돼요 is marking half the book.
      const pair = book.exercises.find((e) => e.id === 'u14-grammar-4-1');
      assert(!!pair && pair.items.every((i) => i.choices2), 'the 연습 1 pair page has two blanks per row');
      assert(pair.example.answerKo && pair.example.answer2Ko,
        'and its worked example writes out both halves');
    });

    await test('Refuses a build line with no gap, or more gaps than choice sets', () => {
      const none = clone();
      const b1 = none.exercises.find((e) => e.id === 'u14-grammar-2-2');
      b1.items[0].lines[0].ko = b1.items[0].lines[0].ko.replace('{}', '아팠을 때');
      refuses(none, rootDir, 'the lines carry 0', 'a sentence with nowhere to put the answer');
      const extra = clone();
      const b2 = extra.exercises.find((e) => e.id === 'u14-grammar-2-2');
      b2.items[0].lines.push({ ko: '{} 또?' });
      refuses(extra, rootDir, 'the lines carry 2', 'a second gap with no second choice set');
    });

    await test('Refuses a build second blank that is broken or borrowed', () => {
      const wrong = clone();
      const p1 = wrong.exercises.find((e) => e.id === 'u14-grammar-4-1');
      p1.items[0].answer2 = p1.items[0].answer;
      refuses(wrong, rootDir, "second blank's choices", 'the second answer taken from the first blank');
      const shared = clone();
      const p2 = shared.exercises.find((e) => e.id === 'u14-grammar-4-1');
      p2.items[0].choices2[0].id = p2.items[0].choices[0].id;
      refuses(shared, rootDir, 'used by both blanks', 'one id serving both blanks');
    });

    await test('Keeps a recording, and refuses one that points outside audio/', () => {
      const book = workbookLib.getWorkbook(rootDir);
      // Recordings hang off the rows now, not the exercise: the track is cut per
      // exchange, so there is no whole-drill clip to attach at the top.
      const drill = book.exercises.find((e) => (e.items || []).some((i) => i.audio));
      assert(!!drill, 'the pattern drill rows carry their recordings');
      assert(drill.items.every((i) => /^audio\/.+\.mp3$/.test(i.audio.src)),
        'each stored as a path under audio/');
      // The value goes into new Audio(src) in the browser, so anything that
      // escapes the audio folder or names another origin has to be refused.
      ['../../etc/passwd.mp3', 'https://evil.example/x.mp3', 'audio/../secret.mp3',
        'audio/clip.js', '/audio/clip.mp3'].forEach((bad) => {
        const b = clone();
        b.exercises.find((e) => e.id === drill.id).items[0].audio = { src: bad };
        refuses(b, rootDir, 'audio src must be a path under audio/', 'audio src "' + bad + '"');
      });
      // askEnd is what keeps a row from reading its own answer out, so a value
      // that cannot mean a number of seconds has to be refused rather than
      // quietly dropped — dropping it plays the whole clip.
      const item = book.exercises.find((e) => e.id === 'u14-pattern-1').items[0];
      assert(item.audio && item.audio.askEnd > 0, 'an item clip knows where its prompt ends');
      [0, -1, 'soon', NaN].forEach((bad) => {
        const b = clone();
        b.exercises.find((e) => e.id === 'u14-pattern-1').items[0].audio.askEnd = bad;
        refuses(b, rootDir, 'askEnd must be a positive number', 'askEnd "' + bad + '"');
      });
      // Absent is fine: it means play the whole clip.
      const noEnd = clone();
      delete noEnd.exercises.find((e) => e.id === 'u14-pattern-1').items[0].audio.askEnd;
      workbookLib.saveWorkbook(noEnd, rootDir);
      assert(!workbookLib.getWorkbook(rootDir).exercises
        .find((e) => e.id === 'u14-pattern-1').items[0].audio.askEnd,
        'an item clip without askEnd stores none');
      workbookLib.saveWorkbook(clone(), rootDir);

      // No audio at all is the normal case — most rows in the book have none —
      // and must stay silent rather than throw.
      const none = clone();
      delete none.exercises.find((e) => e.id === drill.id).items[0].audio;
      const res = workbookLib.saveWorkbook(none, rootDir);
      assert(res.exerciseCount === original.exercises.length, 'a row with no recording saves');
      assert(!workbookLib.getWorkbook(rootDir).exercises
        .find((e) => e.id === drill.id).items[0].audio,
        'and stores no empty audio key');
      // The clip belongs to the row, so the exercise has nowhere to put one.
      const top = clone();
      top.exercises.find((e) => e.id === drill.id).audio = { src: 'audio/book/whatever.mp3' };
      workbookLib.saveWorkbook(top, rootDir);
      assert(!workbookLib.getWorkbook(rootDir).exercises.find((e) => e.id === drill.id).audio,
        'an exercise-level recording is dropped rather than stored where nothing reads it');
      workbookLib.saveWorkbook(clone(), rootDir);
    });

    await test('Refuses a build example that does not show the answer', () => {
      const bare = clone();
      const b = bare.exercises.find((e) => e.id === 'u14-grammar-2-1');
      b.example.answerKo = '';
      refuses(bare, rootDir, 'written out', 'a worked example with the blank still blank');
    });

    await test('Refuses an experience example whose answer is not a real form', () => {
      const book = clone();
      const g = book.exercises.find((e) => e.type === 'experience');
      g.example.answer = 'invented';
      refuses(book, rootDir, "question 1's choices", 'example answer with no matching form');
    });

    await test('The shipped file is already in canonical form', () => {
      // Worth asserting on its own: if it were not, the first save from the
      // admin panel would produce a large reordering diff that hides the one
      // field the editor actually changed.
      const raw = fs.readFileSync(path.join(rootDir, workbookLib.WORKBOOK_REL), 'utf8');
      workbookLib.saveWorkbook(workbookLib.getWorkbook(rootDir), rootDir);
      const again = fs.readFileSync(path.join(rootDir, workbookLib.WORKBOOK_REL), 'utf8');
      assert(raw === again, 'saving without editing anything rewrites the file byte for byte');
    });

    await test('Writes valid JSON with a trailing newline', () => {
      workbookLib.saveWorkbook(clone(), rootDir);
      const raw = fs.readFileSync(path.join(rootDir, workbookLib.WORKBOOK_REL), 'utf8');
      assert(raw.endsWith('\n'), 'file ends with a newline');
      JSON.parse(raw);
    });

    await test('Trims whitespace rather than storing it', () => {
      const book = clone();
      book.exercises[0].instructionKo = '  spaced out  ';
      workbookLib.saveWorkbook(book, rootDir);
      const after = workbookLib.getWorkbook(rootDir);
      assert(after.exercises[0].instructionKo === 'spaced out', 'the stored value is trimmed');
      workbookLib.saveWorkbook(clone(), rootDir);
    });

    // ── The refusals ─────────────────────────────────────────────────────────
    await test('Refuses an answer that is not in the box', () => {
      const book = clone();
      book.exercises[0].items[0].answer = 'does_not_exist';
      refuses(book, rootDir, 'not in the box', 'dangling answer');
    });

    await test('Refuses one entry answering two questions', () => {
      const book = clone();
      book.exercises[0].items[1].answer = book.exercises[0].items[0].answer;
      refuses(book, rootDir, 'answers more than one question', 'duplicate answer');
    });

    await test('Refuses the worked example being offered as an answer too', () => {
      const book = clone();
      const spent = book.exercises[0].bank.find((c) => c.usedByExample);
      book.exercises[0].items[0].answer = spent.id;
      refuses(book, rootDir, 'worked example', 'example reused as an answer');
    });

    await test('Refuses more questions than pickable entries', () => {
      const book = clone();
      const ex = book.exercises[0];
      ex.items.push({ n: 5, answer: ex.items[0].answer, stemKo: 'x', why: 'x', grammar: 'x' });
      refuses(book, rootDir, 'answers more than one question', 'fifth question with no spare entry');
      // And with a distinct-but-absent answer, the count check is what bites.
      ex.items[4].answer = 'ghost';
      refuses(book, rootDir, 'not in the box', 'fifth question pointing nowhere');
    });

    await test('Refuses a two-form entry missing the form that goes in the blank', () => {
      const book = clone();
      const ex = book.exercises.find((e) => e.type === 'fill');
      delete ex.bank[1].polite;
      refuses(book, rootDir, 'the form the sentence puts in the blank',
        'fill entry with only its dictionary form');
      // Two forms are a property of the entry, not of the exercise type: Unit
      // 10's taste adjectives need both on a dialogue page.
      const dlg = clone();
      const d = dlg.exercises.find((e) => e.type === 'dialogue');
      d.bank[0] = { id: d.bank[0].id, dict: '짜다' };
      refuses(dlg, rootDir, 'the form the sentence puts in the blank',
        'dialogue entry with a dictionary form and nothing else');
    });

    await test('Refuses a dialogue line with no {} placeholder', () => {
      const book = clone();
      const ex = book.exercises.find((e) => e.type === 'dialogue');
      ex.items[0].lines = [{ who: 'A', ko: '여기는 금연입니다.' }];
      refuses(book, rootDir, '{}', 'dialogue line with nowhere to put the answer');
      const two = clone();
      const t = two.exercises.find((e) => e.type === 'dialogue');
      t.items[0].lines[1].ko = '아, {} 그래요?';
      refuses(two, rootDir, '{}', 'two gaps where the box fills one');
    });

    await test('Refuses a dialogue item with no lines at all', () => {
      const book = clone();
      const ex = book.exercises.find((e) => e.type === 'dialogue');
      delete ex.items[0].lines;
      refuses(book, rootDir, 'at least one line', 'dialogue item with nothing to say');
    });

    await test('Refuses an unknown exercise type', () => {
      const book = clone();
      book.exercises[0].type = 'crossword';
      refuses(book, rootDir, 'type must be one of', 'unsupported type');
    });

    await test('Refuses duplicate exercise ids and duplicate box ids', () => {
      const dupEx = clone();
      dupEx.exercises[1].id = dupEx.exercises[0].id;
      refuses(dupEx, rootDir, 'duplicate id', 'two exercises sharing an id');
      const dupChip = clone();
      dupChip.exercises[0].bank[1].id = dupChip.exercises[0].bank[0].id;
      refuses(dupChip, rootDir, 'duplicate box id', 'two entries sharing an id');
    });

    await test('Refuses a question with no explanation', () => {
      const noWhy = clone();
      noWhy.exercises[0].items[0].why = '';
      refuses(noWhy, rootDir, 'why', 'question with no reason given');
      const noGram = clone();
      noGram.exercises[0].items[2].grammar = '   ';
      refuses(noGram, rootDir, 'grammar', 'question with no grammar note');
    });

    await test('Refuses two worked examples in one exercise', () => {
      const book = clone();
      book.exercises[0].bank[1].usedByExample = true;
      refuses(book, rootDir, 'only one entry', 'two circled examples');
    });

    await test('Refuses an empty or absent exercises array', () => {
      refuses({ exercises: [] }, rootDir, 'at least one exercise', 'empty book');
      refuses({}, rootDir, 'exercises array', 'book with no exercises key');
      refuses(null, rootDir, 'must be an object', 'null body');
    });

    await test('Refuses an exercise with no questions or a one-entry box', () => {
      const noItems = clone();
      noItems.exercises[0].items = [];
      refuses(noItems, rootDir, 'at least one question', 'exercise with no questions');
      const thinBank = clone();
      thinBank.exercises[1].bank = [thinBank.exercises[1].bank[0]];
      refuses(thinBank, rootDir, 'at least two entries', 'exercise with a one-entry box');
    });

    await test('A refused save leaves the file untouched', () => {
      const good = workbookLib.getWorkbook(rootDir);
      const bad = clone();
      bad.exercises[0].items[0].answer = 'nope';
      try { workbookLib.saveWorkbook(bad, rootDir); } catch (_) { /* expected */ }
      const after = workbookLib.getWorkbook(rootDir);
      assert(JSON.stringify(after) === JSON.stringify(good), 'the workbook on disk did not change');
    });

    await test('Accepts a genuinely new exercise', () => {
      const book = clone();
      book.exercises.push({
        id: 'u14-vocab-4',
        type: 'match',
        section: '어휘',
        no: '연습 4',
        instructionKo: '알맞은 것끼리 연결해 보세요.',
        bank: [
          { id: 'x', ko: '가지 마세요.', mark: '①' },
          { id: 'y', ko: '오지 마세요.', mark: '②' }
        ],
        items: [
          { n: 1, stemKo: '위험할 때', answer: 'x', en: 'when it is dangerous', why: 'because it is dangerous', grammar: '가다 → 가지 마세요' },
          { n: 2, stemKo: '바쁠 때', answer: 'y', en: 'when busy', why: 'because they are busy', grammar: '오다 → 오지 마세요' }
        ]
      });
      const res = workbookLib.saveWorkbook(book, rootDir);
      assert(res.exerciseCount === original.exercises.length + 1, "one more exercise is stored");
      const after = workbookLib.getWorkbook(rootDir);
      const added = after.exercises.find((e) => e.id === 'u14-vocab-4');
      assert(!!added && added.items.length === 2, 'the new exercise round-trips');
      assert(added.sectionEn === 'Vocabulary', 'omitted optional fields get sane defaults');
      workbookLib.saveWorkbook(clone(), rootDir);
    });

    await test('The game and the editor agree on where the file lives', () => {
      assert(workbookLib.WORKBOOK_REL.replace(/\\/g, '/') === 'worlds/unit14-workbook.json',
        'lib writes worlds/unit14-workbook.json');
      const ui = fs.readFileSync(path.join(repoRoot, 'js', 'ui.js'), 'utf8');
      assert(ui.indexOf("'/worlds/unit14-workbook.json'") >= 0, 'the game reads the same path');
      const server = fs.readFileSync(path.join(repoRoot, 'admin', 'server.js'), 'utf8');
      assert(server.indexOf("'/api/unit14/workbook'") >= 0, 'the API exposes it');
      assert(workbookLib.TYPES.join(",") === "fill,match,dialogue,experience,build", 'the type list is the shared contract');
      // Every type the data uses must be a type the renderer knows.
      workbookLib.TYPES.forEach((t) => {
        assert(ui.indexOf("'" + t + "'") >= 0, `js/ui.js renders the ${t} type`);
      });
    });
  } finally {
    rmSandbox(rootDir);
  }

  const duration = Date.now() - startTime;
  return {
    suiteName: 'Unit 14 Workbook API (test_unit14_workbook.js)',
    total: passed + failed,
    passed,
    failed,
    duration,
    testDetails
  };
}

if (require.main === module) {
  runTests().then((result) => {
    console.log(`\n====================================================`);
    console.log(`  ${result.suiteName}`);
    console.log(`  Passed: ${result.passed}/${result.total} | Duration: ${result.duration}ms`);
    console.log(`====================================================\n`);
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error running test_unit14_workbook:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
