'use strict';

require('../levels.json');
require('../facts.json');
const levelsLib = require('../admin/lib/levels');
const { repoRoot, handleGet } = require('./_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => ({ success: true, data: levelsLib.getStats(repoRoot()) }));
};
