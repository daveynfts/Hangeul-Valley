'use strict';

require('../../worlds/2b-unit-10.json');
const worldLib = require('../../admin/lib/world');
const { repoRoot, handleGet } = require('../_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => ({ success: true, data: worldLib.getWorld(repoRoot()) }));
};
