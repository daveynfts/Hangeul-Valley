'use strict';

require('../levels.json');
require('../facts.json');
const vocabFactsLib = require('../admin/lib/vocabFacts');
const { repoRoot, handleGet } = require('./_repoRoot');

module.exports = (req, res) => {
  handleGet(req, res, () => {
    const data = vocabFactsLib.getVocabFactsData(repoRoot());
    return {
      success: true,
      totalFacts: data.totalFacts,
      data: data.facts,
      descriptions: data.descriptions,
      byOrigin: data.byOrigin,
      coveragePercentage: data.coveragePercentage,
      exactMatchCount: data.exactMatchCount,
      casingMismatchCount: data.casingMismatchCount,
      casingDiscrepancies: data.casingDiscrepancies,
      missingFacts: data.missingFacts,
      readOnly: true,
      generatorHint: data.generatorHint
    };
  });
};
