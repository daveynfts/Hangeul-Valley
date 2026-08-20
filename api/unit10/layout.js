'use strict';

require('../../worlds/unit10-layout.json');
const worldLib = require('../../admin/lib/world');
const { repoRoot, handleGet } = require('../_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => ({ success: true, data: worldLib.getLayout(repoRoot()) }));
};
