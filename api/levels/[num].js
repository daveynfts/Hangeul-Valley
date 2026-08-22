'use strict';

require('../../levels.json');
const levelsLib = require('../../admin/lib/levels');
const { repoRoot, handleGet } = require('../_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => {
    const num = req.query && req.query.num;
    const level = levelsLib.getLevelByNum(num, repoRoot());
    if (!level) {
      const err = new Error(`Level ${num} not found.`);
      err.status = 404;
      throw err;
    }
    return { success: true, data: level };
  });
};
