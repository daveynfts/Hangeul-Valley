'use strict';

require('../levels.json');
const levelsLib = require('../admin/lib/levels');
const { repoRoot, handleGet } = require('./_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => {
    const levels = levelsLib.getLevels(repoRoot());
    return { success: true, count: levels.length, data: levels };
  });
};
