'use strict';

require('../sprites/catalog.json');
const artLib = require('../admin/lib/art');
const { repoRoot, handleGet } = require('./_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => ({ success: true, data: artLib.buildReport(repoRoot()) }));
};
