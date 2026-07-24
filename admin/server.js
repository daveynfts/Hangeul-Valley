const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const levelsLib = require('./lib/levels');
const vocabFactsLib = require('./lib/vocabFacts');
const syncLib = require('./lib/sync');

const app = express();

app.use(cors());
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

// 8. GET /api/vocab-facts
app.get('/api/vocab-facts', (req, res, next) => {
  try {
    const data = vocabFactsLib.getVocabFactsData(getRootDir());
    res.json({
      success: true,
      totalFacts: data.totalFacts,
      data: data.facts,
      casingDiscrepancies: data.casingDiscrepancies,
      missingFacts: data.missingFacts
    });
  } catch (err) {
    next(err);
  }
});

// 9. POST /api/vocab-facts
app.post('/api/vocab-facts', (req, res, next) => {
  try {
    const { key, vi, ko } = req.body || {};
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Field "key" is required and must be a non-empty string.'
      });
    }
    const result = vocabFactsLib.addVocabFact(key, { vi, ko }, getRootDir());
    res.status(201).json({
      success: true,
      message: `VOCAB_FACTS entry '${result.key}' added and synced to game.js.`,
      key: result.key,
      data: result.fact
    });
  } catch (err) {
    if (err.message.includes('syntax error')) {
      return res.status(422).json({
        success: false,
        error: 'Unprocessable Entity',
        details: err.message
      });
    }
    next(err);
  }
});

// 10. PUT /api/vocab-facts/:key
app.put('/api/vocab-facts/:key', (req, res, next) => {
  try {
    const key = req.params.key;
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Key parameter is required.'
      });
    }
    const result = vocabFactsLib.updateVocabFact(key, req.body, getRootDir());
    res.json({
      success: true,
      message: `VOCAB_FACTS entry '${result.key}' updated and synced.`,
      key: result.key,
      data: result.fact
    });
  } catch (err) {
    if (err.message.includes('syntax error')) {
      return res.status(422).json({
        success: false,
        error: 'Unprocessable Entity',
        details: err.message
      });
    }
    next(err);
  }
});

// 11. DELETE /api/vocab-facts/:key
app.delete('/api/vocab-facts/:key', (req, res, next) => {
  try {
    const key = req.params.key;
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        details: 'Key parameter is required.'
      });
    }
    const result = vocabFactsLib.deleteVocabFact(key, getRootDir());
    res.json({
      success: true,
      message: `VOCAB_FACTS entry '${result.key}' deleted.`,
      key: result.key
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

// 12. POST /api/sync (Manual Trigger Resync)
app.post('/api/sync', (req, res, next) => {
  try {
    const root = getRootDir();
    const levels = levelsLib.getLevels(root);
    syncLib.syncLevels(levels, root);

    const paths = syncLib.getPaths(root);
    const gameJsContent = fs.readFileSync(paths.gameJsPath, 'utf8');
    syncLib.syncGameJs(gameJsContent, root);

    res.json({
      success: true,
      message: 'Root and assets files validated and synchronized.',
      syncedFiles: ['levels.json -> assets/levels.json', 'game.js -> assets/game.js']
    });
  } catch (err) {
    next(err);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Admin Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.name || 'Internal Server Error',
    details: err.message || 'An unexpected error occurred.'
  });
});

// Start Server if executed directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[Hangeul Valley Admin Server] Listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
