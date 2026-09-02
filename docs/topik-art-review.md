# TOPIK Vocabulary Book artwork — 2026-09-02

Status: complete.

The TOPIK II Vocabulary Book now has a one-to-one illustration set for all 394
headwords in `worlds/topik-2.json`. The final set retains 62 existing images that
were already specific and readable, and adds 332 dedicated illustrations. Every
generated file uses a semantic `topik_<concept>.png` name rather than a numeric or
temporary Imagegen filename.

The completed runtime audit reports:

- 394 words and 394 distinct PNG paths
- 0 reused image paths
- 0 extra shared mappings
- 0 missing files
- 0 byte-identical image groups

The redesign deliberately separates concepts that previously shared generic
art. Similar words use different actions or objects: a closed refrigerator versus
its contents, storing an item versus putting it inside, a single volunteer versus
a volunteer activity, and a chart versus a ratio. Grammar and abstract words use
small visual situations as memory cues alongside the existing Korean headword
and English explanation.

## Production assets and review evidence

Each replacement was generated through its own Imagegen call with a unique
subject brief. The source identifier, semantic slug, review state and original
mapping are recorded in [the manifest](topik-art-manifest.json). Sources are
processed through the existing pixel-prop pipeline into transparent PNGs exactly
96 px tall, with nearest-neighbor reduction, binary alpha and a compact palette.
The first release reduced them to 48 px; the full-screen Vocabulary Book exposed
that loss of detail by enlarging them to a fractional 86 px. The reviewed sources
were therefore rebuilt at the 96 px display size instead of enlarged in CSS.

Both the source image and its processed result were inspected before an
entry was marked reviewed. The continuation review sheets cover
[238–242](topik-art-review-238-242.png),
[243–251](topik-art-review-243-251.png),
[252–260](topik-art-review-252-260.png),
[261–274](topik-art-review-261-274.png),
[275–288](topik-art-review-275-288.png),
[289–301](topik-art-review-289-301.png),
[303–310](topik-art-review-303-310.png),
[311–318](topik-art-review-311-318.png),
[320–329](topik-art-review-320-329.png),
[330–338](topik-art-review-330-338.png),
[339–348](topik-art-review-339-348.png),
[349–357](topik-art-review-349-357.png),
[358–378](topik-art-review-358-378.png),
[379–386](topik-art-review-379-386.png), and
[387–393](topik-art-review-387-393.png). Earlier accepted work is represented by
the checked-in gallery and review sheets. A final gallery was regenerated from
the live runtime mapping in four sections and all 394 entries were inspected
again after the last mapping update.

## Mapping safeguards

`scripts/import_topik_art.js` accepts an array of `{slug, sourcePath}` on stdin.
It registers the batch and records the source after pixel processing. Raw-source
approval and final 96 px approval remain separate review steps.

`scripts/apply_topik_art.js` validates the complete manifest and every proposed
runtime change before writing the reviewed block in `js/vocabArtMore.js`. It
updates the first match used by the real Vocabulary Book lookup, preserves other
tables and synchronizes the catalog and runtime cache keys. The cache fingerprint
includes PNG contents. A different Korean word cannot borrow a newly drawn TOPIK
illustration, even from another world.

Regression coverage rejects shared paths, byte-identical files with different
names, re-encoded copies with identical decoded pixels, missing source or review
evidence, incorrect word indices, missing catalog entries and unsafe output
paths. The checked-in [current audit](topik-art-audit-current.json) is generated
from the actual runtime lookup rather than inferred from the manifest.

## Validation

The completed set passed:

- `node scripts/apply_topik_art.js --check --require-complete`
- `npm run audit:vocab-art -- --world topik-2 --strict`
- `npm run audit:art` — 804 catalog entries and 804 PNGs on disk
- pixel processing tests — 10 passed
- game test suite — passed after updating the stale `생산량` expectation to its
  dedicated `topik_fruit_output` illustration
- desktop server suite — 52 passed
- admin suite — 111 passed
- syntax, content and generated-facts checks; content validation reports
  3,902/3,902 invariants

The in-app Browser security policy blocked navigation to the localhost test URL,
so this continuation does not claim a browser-based local run. The final gallery
uses the same runtime lookup and processed files that the game loads, and the
map, draw, lookup, asset-presence and cache-key paths are covered by the passing
automated suites.

This work changes TOPIK illustration assets, their runtime mappings, catalog
metadata, cache key and the stale art expectation. It does not change Korean
audio, vocabulary text, gameplay physics or saved progress.
