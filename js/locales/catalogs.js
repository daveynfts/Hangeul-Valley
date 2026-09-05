/**
 * Which translation catalogues exist, per language. Generated — see admin/lib/i18n.js.
 *
 * The game reads this before FarmScene.preload() so it asks only for catalogues that are
 * there. A file listed here but missing on disk is a 404 the loader shrugs off; a file on
 * disk but missing here is simply not loaded, and the unit stays English. Both are why this
 * is written by the code that creates catalogues rather than kept by hand.
 */
(function (root) {
  root.HV_CATALOG_INDEX =
/* @hv-catalog-index */
{
  "vi": [
    "levels.json",
    "worlds/2b-unit-10.json",
    "worlds/2b-unit-11.json",
    "worlds/2b-unit-13.json",
    "worlds/2b-unit-14.json",
    "worlds/2b-unit-15.json",
    "worlds/unit10-desk-quiz.json",
    "worlds/unit11-desk-quiz.json",
    "worlds/unit13-desk-quiz.json",
    "worlds/unit14-desk-quiz.json",
    "worlds/unit15-desk-quiz.json",
    "worlds/topik2-desk-quiz.json",
    "worlds/unit10-cassette.json",
    "worlds/unit11-cassette.json",
    "worlds/unit13-cassette.json",
    "worlds/unit14-cassette.json",
    "worlds/unit15-cassette.json"
  ]
}
/* @hv-catalog-index-end */
  ;
}(typeof window !== 'undefined' ? window : globalThis));
