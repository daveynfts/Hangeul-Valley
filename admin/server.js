const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const levelsLib = require('./lib/levels');
const vocabFactsLib = require('./lib/vocabFacts');
const syncLib = require('./lib/sync');
const worldLib = require('./lib/world');
const workbookLib = require('./lib/workbook');
const artLib = require('./lib/art');
const skinsLib = require('./lib/skins');
const contentLib = require('./lib/content');

const app = express();

// This server has no auth and its PUT/POST/DELETE routes rewrite levels.json, the world
// packs and the skins catalog. `cors()` with no options answered every preflight with
// `Access-Control-Allow-Origin: *`, so any page the operator happened to have open could
// drive those writes while the admin panel was running. Only the loopback origins the
// panel and the game are actually served from are allowed; anything else gets no CORS
// headers, which leaves the browser to block the response.
const ALLOWED_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
app.use(cors({
  origin(origin, cb) {
    // No Origin header at all: curl, same-origin navigations, the panel's own fetches.
    if (!origin) return cb(null, true);
    return cb(null, ALLOWED_ORIGIN.test(origin));
  }
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Root dir override helper (useful during tests)
let rootDirOverride = null;
app.setRootDir = function(dir) {
  rootDirOverride = dir;
};
function getRootDir() {
  return rootDirOverride || path.resolve(__dirname, '../');
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// 1. GET /api/stats
app.get('/api/stats', (req, res, next) => {
  try {
    const stats = levelsLib.getStats(getRootDir());
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/levels
app.get('/api/levels', (req, res, next) => {
  try {
    const levels = levelsLib.getLevels(getRootDir());
    res.json({
      success: true,
      count: levels.length,
      data: levels
    });
  } catch (err) {
    next(err);
  }
});

// 2b. GET /api/levels/:levelNum (Single Level)
app.get('/api/levels/:levelNum', (req, res, next) => {
  try {
    const level = levelsLib.getLevelByNum(req.params.levelNum, getRootDir());
    if (!level) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        details: `Level ${req.params.levelNum} not found.`
      });
    }
    res.json({
      success: true,
      data: level
    });
  } catch (err) {
    next(err);
  }
});

// 3. PUT /api/levels
app.put('/api/levels', (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Request body must be an array of level objects.'
      });
    }
    const result = levelsLib.updateLevels(req.body, getRootDir());
    const stats = levelsLib.getStats(getRootDir());
    res.json({
      success: true,
      message: 'Levels dataset updated and synced successfully.',
      totalLevels: stats.totalLevels,
      totalWords: stats.totalWords
    });
  } catch (err) {
    next(err);
  }
});

// 4. PUT /api/levels/:levelNum
app.put('/api/levels/:levelNum', (req, res, next) => {
  try {
    const levelNum = Number(req.params.levelNum);
    if (isNaN(levelNum)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Invalid level number parameter.'
      });
    }
    const updatedLevel = levelsLib.updateLevelMetadata(levelNum, req.body, getRootDir());
    res.json({
      success: true,
      message: `Level ${levelNum} updated successfully.`,
      data: updatedLevel
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        details: err.message
      });
    }
    next(err);
  }
});

// 5. POST /api/levels/:levelNum/words
app.post('/api/levels/:levelNum/words', (req, res, next) => {
  try {
    const levelNum = Number(req.params.levelNum);
    if (isNaN(levelNum)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Invalid level number parameter.'
      });
    }
    const result = levelsLib.addWord(levelNum, req.body, getRootDir());
    res.status(201).json({
      success: true,
      message: `Word added to level ${levelNum} successfully.`,
      wordIndex: result.wordIndex,
      data: result.word
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        details: err.message
      });
    }
    if (err.message.includes('must contain')) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: err.message
      });
    }
    next(err);
  }
});

// 6. PUT /api/levels/:levelNum/words/:wordIndex
app.put('/api/levels/:levelNum/words/:wordIndex', (req, res, next) => {
  try {
    const levelNum = Number(req.params.levelNum);
    const wordIndex = Number(req.params.wordIndex);
    if (isNaN(levelNum) || isNaN(wordIndex)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Invalid level number or word index parameter.'
      });
    }
    const updatedWord = levelsLib.updateWord(levelNum, wordIndex, req.body, getRootDir());
    res.json({
      success: true,
      message: `Word at index ${wordIndex} in level ${levelNum} updated successfully.`,
      data: updatedWord
    });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('out of bounds')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        details: err.message
      });
    }
    next(err);
  }
});

// 7. DELETE /api/levels/:levelNum/words/:wordIndex
app.delete('/api/levels/:levelNum/words/:wordIndex', (req, res, next) => {
  try {
    const levelNum = Number(req.params.levelNum);
    const wordIndex = Number(req.params.wordIndex);
    if (isNaN(levelNum) || isNaN(wordIndex)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Invalid level number or word index parameter.'
      });
    }
    const result = levelsLib.deleteWord(levelNum, wordIndex, getRootDir());
    res.json({
      success: true,
      message: `Word at index ${wordIndex} deleted from level ${levelNum}.`,
      remainingWordsCount: result.remainingWordsCount
    });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('out of bounds')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        details: err.message
      });
    }
    next(err);
  }
});

// 8. GET /api/vocab-facts  (word origins, read-only — see admin/lib/vocabFacts.js)
app.get('/api/vocab-facts', (req, res, next) => {
  try {
    const data = vocabFactsLib.getVocabFactsData(getRootDir());
    res.json({
      success: true,
      totalFacts: data.totalFacts,
      data: data.facts,
      descriptions: data.descriptions,
      byOrigin: data.byOrigin,
      coveragePercentage: data.coveragePercentage,
      exactMatchCount: data.exactMatchCount,
      casingMismatchCount: data.casingMismatchCount,
      casingDiscrepancies: data.casingDiscrepancies,
      missingFacts: data.missingFacts,
      readOnly: true,
      generatorHint: data.generatorHint
    });
  } catch (err) {
    next(err);
  }
});

// 9-11. Writes to word origins are refused: facts.json is a generated artifact, so
// anything saved here would be discarded by the next `node scripts/build_facts_json.js`.
// Curate the SINO / MIXED / LOANWORDS / NATIVE_NOTE maps in that script instead.
const refuseOriginWrite = (verb) => (req, res) => {
  res.status(409).json({
    success: false,
    error: 'Conflict',
    details: `Cannot ${verb} word origins from the admin panel. ${vocabFactsLib.GENERATOR_HINT}`,
    generatorHint: vocabFactsLib.GENERATOR_HINT
  });
};
app.post('/api/vocab-facts', refuseOriginWrite('add'));
app.put('/api/vocab-facts/:key', refuseOriginWrite('update'));
app.delete('/api/vocab-facts/:key', refuseOriginWrite('delete'));

app.get('/api/unit10/layout', (req, res, next) => {
  try { res.json({ success: true, data: worldLib.getLayout(getRootDir()) }); }
  catch (err) { next(err); }
});
app.put('/api/unit10/layout', (req, res, next) => {
  try { res.json({ success: true, data: worldLib.saveLayout(req.body, getRootDir()) }); }
  catch (err) { err.status = 400; next(err); }
});
app.get('/api/unit10/quiz', (req, res, next) => {
  try { res.json({ success: true, data: worldLib.getQuiz(getRootDir()) }); }
  catch (err) { next(err); }
});
app.put('/api/unit10/quiz', (req, res, next) => {
  try { res.json({ success: true, data: worldLib.saveQuiz(req.body, getRootDir()) }); }
  catch (err) { err.status = 400; next(err); }
});
app.get('/api/unit10/world', (req, res, next) => {
  try { res.json({ success: true, data: worldLib.getWorld(getRootDir()) }); }
  catch (err) { next(err); }
});
app.put('/api/unit10/world', (req, res, next) => {
  try { res.json({ success: true, data: worldLib.saveWorld(req.body, getRootDir()) }); }
  catch (err) { err.status = 400; next(err); }
});

// Workbook pages, per unit. saveWorkbook refuses anything the game could not
// render, so a bad edit fails here with a reason rather than shipping a page the
// learner cannot finish. The unit is in the path because there is more than one
// workbook now — the route was /api/unit14/workbook, and an editor that could
// only ever open Unit 14 showed Unit 14's exercises whichever unit you meant.
app.get('/api/workbooks', (req, res) => {
  res.json({ success: true, data: Object.keys(workbookLib.WORKBOOKS) });
});
app.get('/api/workbook/:unit', (req, res, next) => {
  try { res.json({ success: true, data: workbookLib.getWorkbook(getRootDir(), req.params.unit) }); }
  catch (err) { err.status = 404; next(err); }
});
app.put('/api/workbook/:unit', (req, res, next) => {
  try {
    res.json({ success: true, data: workbookLib.saveWorkbook(req.body, getRootDir(), req.params.unit) });
  } catch (err) { err.status = 400; next(err); }
});

app.get('/api/art', (req, res, next) => {
  try { res.json({ success: true, data: artLib.buildReport(getRootDir()) }); }
  catch (err) { next(err); }
});

app.get('/api/skins/catalog', (req, res, next) => {
  try { res.json({ success: true, data: skinsLib.getCatalog(getRootDir()) }); }
  catch (err) { next(err); }
});
app.put('/api/skins/catalog', (req, res, next) => {
  try { res.json({ success: true, data: skinsLib.saveCatalog(req.body, getRootDir()) }); }
  catch (err) { err.status = 400; next(err); }
});

// The content registry, exposed on the same URLs the Vercel function answers on. Routes
// here used to be added a unit at a time, which is how Units 11, 13 and 14, the TOPIK world
// and every cassette bank ended up with no way in at all — not broken, just never connected,
// and nowhere for that to show. Everything now resolves through one table, and
// scripts/validate_content.js fails the build if a published file is missing from it.
//
// The older per-resource routes above are left alone: the existing editor screens call them,
// and rewriting those is a separate job from making every file reachable.
// ?key= is the primary form, because that is what works on Vercel; the path form is kept
// so the two halves accept the same requests either way. One handler, not two: Express
// takes the first route that matches, so a second app.get on the same path is dead code
// that registers without complaint and never runs.
app.get('/api/admin/content', (req, res, next) => {
  if (!req.query.key) { res.json({ success: true, data: contentLib.list() }); return; }
  serveContent(req.query.key, res, next);
});
app.get('/api/admin/content/*', (req, res, next) => serveContent(req.params[0], res, next));
function serveContent(key, res, next) {
  try {
    const entry = contentLib.byKey(key);
    if (!entry) { const e = new Error(`No content registered under "${key}"`); e.status = 404; throw e; }
    const full = path.join(getRootDir(), entry.rel);
    const body = JSON.parse(fs.readFileSync(full, 'utf8'));
    res.json({ success: true, data: { key: entry.key, label: entry.label, group: entry.group, rel: entry.rel, body } });
  } catch (err) { next(err); }
}
app.put('/api/admin/content', (req, res, next) => saveContent(req.query.key, req, res, next));
app.put('/api/admin/content/*', (req, res, next) => saveContent(req.params[0], req, res, next));
function saveContent(key, req, res, next) {
  try {
    const entry = contentLib.byKey(key);
    if (!entry) { const e = new Error(`No content registered under "${key}"`); e.status = 404; throw e; }
    const root = getRootDir();
    let normalised;
    try { normalised = entry.validate(req.body, { rootDir: root, rel: entry.rel }); }
    catch (e) { e.status = 400; throw e; }
    // Locally the write is the write — there is no commit and no CDN, because the repo on this
    // machine is the thing being edited.
    const { atomicWriteJson } = require('./lib/atomicWrite');
    atomicWriteJson(path.join(root, entry.rel), JSON.stringify(normalised, null, 2) + '\n');
    res.json({ success: true, data: { key: entry.key, rel: entry.rel, body: normalised, live: false, note: 'Written to the working tree. Commit and publish to ship it.' } });
  } catch (err) { next(err); }
}

app.get('/api/admin-host', (req, res) => {
  res.json({
    success: true,
    data: {
      writable: true,
      gameUrl: 'http://localhost:8742/',
      hint: ''
    }
  });
});

app.use('/sprite-preview', (req, res, next) => {
  express.static(path.join(getRootDir(), 'sprites'), { fallthrough: true })(req, res, next);
});

// 12. POST /api/sync (Manual Trigger Resync)
app.post('/api/sync', (req, res, next) => {
  try {
    const root = getRootDir();
    const levels = levelsLib.getLevels(root);
    syncLib.syncLevels(levels, root);

    const scriptCheck = syncLib.validateGameScripts(root);

    res.json({
      success: true,
      message: 'levels.json written; game scripts syntax-checked.',
      syncedFiles: ['levels.json'].concat(scriptCheck.files)
    });
  } catch (err) {
    next(err);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Admin Server Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.name || 'Internal Server Error',
    details: err.message || 'An unexpected error occurred.'
  });
});

// Start Server if executed directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  // Bind loopback explicitly. Without a host argument Node listens on :: — every
  // interface — which put an unauthenticated curriculum editor on the local network
  // for as long as the panel was open. HOST is there for the rare case of running the
  // panel in a container, where the operator has to opt in deliberately.
  const HOST = process.env.HOST || '127.0.0.1';
  app.listen(PORT, HOST, () => {
    console.log(`[Hangeul Valley Admin Server] Listening on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
