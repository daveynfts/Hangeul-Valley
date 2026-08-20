'use strict';

require('../../skins/catalog.json');
const skinsLib = require('../../admin/lib/skins');
const { repoRoot, handleGet } = require('../_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => ({ success: true, data: skinsLib.getCatalog(repoRoot()) }));
};
