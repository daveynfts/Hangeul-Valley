'use strict';

// One route for the three Unit 10 reads, which were three files differing only in which
// worldLib getter they called.
//
// They were merged because Vercel counts every file under api/ as a serverless function and
// the Hobby plan allows twelve. The project was sitting on exactly twelve, so adding
// api/leaderboard.js made thirteen and the deployment failed to build — the code was fine and
// CI was green, but nothing shipped. Collapsing these three frees two slots.
//
// The URLs do not change: a dynamic segment matches the literal, so /api/unit10/layout still
// answers, and admin/public/js/app.js needs no edit.
//
// The requires below look unused and are not. Vercel traces them to decide what to bundle into
// the function, so every JSON the getters read has to be named here or the function ships
// without its data.
require('../../worlds/unit10-layout.json');
require('../../worlds/unit10-desk-quiz.json');
require('../../worlds/2b-unit-10.json');
const worldLib = require('../../admin/lib/world');
const { repoRoot, handleGet } = require('../_repoRoot');

const READS = {
  layout: (root) => worldLib.getLayout(root),
  quiz: (root) => worldLib.getQuiz(root),
  world: (root) => worldLib.getWorld(root)
};

module.exports = (req, res) => {
  // Inside handleGet, so OPTIONS and the read-only refusal keep behaving as they did for the
  // three separate files, and an unknown kind becomes a 404 through the same error path.
  handleGet(req, res, () => {
    const kind = String((req.query && req.query.kind) || '');
    if (!Object.prototype.hasOwnProperty.call(READS, kind)) {
      const err = new Error('unknown Unit 10 resource: not found');
      err.status = 404;
      throw err;
    }
    return { success: true, data: READS[kind](repoRoot()) };
  });
};
