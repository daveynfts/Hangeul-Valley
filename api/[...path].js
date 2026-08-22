'use strict';

// One function for every read the admin panel makes. It was eight files — stats, levels,
// levels/[num], vocab-facts, unit10/[kind], art, skins/catalog, admin-host — each a handler
// three lines long around a different lib getter, and each costing one of the twelve
// serverless functions the Hobby plan allows per deployment.
//
// That ceiling is what makes this worth doing rather than tidy. Adding api/leaderboard.js to a
// project sitting on exactly twelve made thirteen, the Vercel build failed in 7 seconds, and
// the previous deployment kept serving — so CI was green, Publish was green, and nothing
// shipped. Four routes total now, which also means the question of exactly what Vercel counts
// stops mattering: helpers counted or not, four is nowhere near twelve.
//
// URLs are unchanged. A catch-all is the lowest-priority match in Vercel's routing, so the
// three real files beside it — save.js, config.js, leaderboard.js — still answer their own
// paths, and admin/public/js/app.js needs no edit.
//
// GAME_ROUTES is the belt to that braces. If the precedence above ever failed, the game's three
// endpoints would silently arrive here and get an admin 404 instead of a save. Refusing them by
// name means the failure is loud and says what is wrong, rather than looking like a broken
// cloud save.
//
// The requires are not unused: Vercel traces them to decide what to bundle, so every JSON a
// getter reads has to be named here or the function ships without its data.
require('../levels.json');
require('../facts.json');
require('../sprites/catalog.json');
require('../skins/catalog.json');
require('../worlds/unit10-layout.json');
require('../worlds/unit10-desk-quiz.json');
require('../worlds/2b-unit-10.json');

const levelsLib = require('../admin/lib/levels');
const vocabFactsLib = require('../admin/lib/vocabFacts');
const artLib = require('../admin/lib/art');
const skinsLib = require('../admin/lib/skins');
const worldLib = require('../admin/lib/world');
const { repoRoot, handleGet } = require('./_repoRoot');

const GAME_ROUTES = ['save', 'config', 'leaderboard'];

function notFound(what) {
  const err = new Error(what + ' not found');
  err.status = 404;
  return err;
}

// Keyed on the path as the admin panel spells it. Each returns the body its own file returned,
// unchanged — this is a move, not a redesign, and admin/test/test_vercel_contract.js asserts
// each one still matches what the Express server gives.
const READS = {
  'stats': () => ({ success: true, data: levelsLib.getStats(repoRoot()) }),

  'levels': () => {
    const levels = levelsLib.getLevels(repoRoot());
    return { success: true, count: levels.length, data: levels };
  },

  'vocab-facts': () => {
    const d = vocabFactsLib.getVocabFactsData(repoRoot());
    return {
      success: true,
      totalFacts: d.totalFacts,
      data: d.facts,
      descriptions: d.descriptions,
      byOrigin: d.byOrigin,
      coveragePercentage: d.coveragePercentage,
      exactMatchCount: d.exactMatchCount,
      casingMismatchCount: d.casingMismatchCount,
      casingDiscrepancies: d.casingDiscrepancies,
      missingFacts: d.missingFacts,
      readOnly: true,
      generatorHint: d.generatorHint
    };
  },

  'art': () => ({ success: true, data: artLib.buildReport(repoRoot()) }),

  'skins/catalog': () => ({ success: true, data: skinsLib.getCatalog(repoRoot()) }),

  'unit10/layout': () => ({ success: true, data: worldLib.getLayout(repoRoot()) }),
  'unit10/quiz': () => ({ success: true, data: worldLib.getQuiz(repoRoot()) }),
  'unit10/world': () => ({ success: true, data: worldLib.getWorld(repoRoot()) }),

  // Says the admin panel cannot be edited here, which is why every route in this file is a
  // read and why a write gets 409 rather than appearing to work.
  'admin-host': () => ({
    success: true,
    data: {
      writable: false,
      gameUrl: '/',
      hint: 'This copy is read-only. Run `cd admin && npm start` locally to edit levels, Unit 10, or sync files.'
    }
  })
};

// /api/levels/3 — the only route with a value in the path rather than a fixed name.
function levelByNum(num) {
  const level = levelsLib.getLevelByNum(num, repoRoot());
  if (!level) throw notFound('Level ' + num);
  return { success: true, data: level };
}

function segments(req) {
  const p = req.query && req.query.path;
  if (Array.isArray(p)) return p.map(String);
  if (typeof p === 'string' && p) return p.split('/');
  return [];
}

module.exports = (req, res) => {
  handleGet(req, res, () => {
    const seg = segments(req);
    const key = seg.join('/');

    if (GAME_ROUTES.includes(seg[0])) {
      const err = new Error(
        '/api/' + seg[0] + ' has its own function and must not be served by the catch-all. '
        + 'If you are reading this, Vercel routed a specific file to [...path].js.'
      );
      err.status = 500;
      throw err;
    }

    if (Object.prototype.hasOwnProperty.call(READS, key)) return READS[key]();
    if (seg.length === 2 && seg[0] === 'levels') return levelByNum(seg[1]);

    throw notFound('/api/' + key);
  });
};
