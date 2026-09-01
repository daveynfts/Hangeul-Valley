# TOPIK Vocabulary Book artwork — 2026-09-01

Status: in progress. The per-word manifest is the source of truth for completed
reviews; an entry with only a brief is not a finished image.

The follow-up covers all 374 words in `worlds/topik-2.json`. The starting book
used 106 images, with 268 extra shared assignments across 53 reuse groups.
The plan retains 62 suitable existing illustrations and separately generates
312 replacements. Similar words receive different actions or objects: a closed
fridge versus its contents, storage versus putting something away, and rising
versus climbing stairs. Grammar and abstract words use visual situations as
memory aids alongside the existing Korean headword and English explanation.

The accepted farmer is the style reference. Every replacement uses its own
built-in Imagegen call and subject brief, recorded with its source identifier in
[the manifest](topik-art-manifest.json). Sources are processed through the existing
farm pixel-prop script to transparent PNGs, exactly 48 px tall, using nearest
neighbor resizing, binary alpha and at most 32 visible colors. The background
prompt reserves magenta exclusively for removal, including enclosed gaps.

[Artwork preview, words 0–34](topik-art-gallery-01.png) shows each current sprite
enlarged with nearest-neighbor sampling and again at its actual size. Source
and output contact sheets are inspected before the entry is marked reviewed.
The 62 retained illustrations were also inspected individually on contact sheets.
The latest accepted batch is recorded in
[the 215–226 review sheet](topik-art-review-215-226.png) and
[the 227–237 review sheet](topik-art-review-227-237.png).

## Mapping and safeguards

`scripts/import_topik_art.js` accepts an array of `{slug, sourcePath}` on stdin.
It registers the batch and saves progress after each processed PNG. Pass
`--raw-reviewed` only after inspecting the originals; `--key-magenta` is only
appropriate when the prompt explicitly reserves that color for the backdrop.
Final 48 px approval remains a separate manual step.

`scripts/apply_topik_art.js` validates the manifest, files and complete proposed
update before writing the reviewed mapping block in `js/vocabArtMore.js`.
It updates the first match used by the real vocabulary lookup, preserves other
tables and synchronizes the catalog and runtime cache keys. The fingerprint
includes PNG contents, not just the number of images. A different Korean word
cannot borrow a newly generated TOPIK illustration, even in another world.

Regression coverage rejects shared paths, byte-identical files with different
names, re-encoded copies with identical decoded pixels, missing source/review
evidence, wrong word indices, missing catalog
entries and invalid output paths. The pixel suite examines every reviewed new
PNG as well as the earlier 26 repaired assets.

```sh
npm run art:topik:apply
npm run art:topik:check -- --require-complete
npm run audit:vocab-art -- --world topik-2 --strict
npm run audit:art
npm run test:pixel-art
npm run test:all
```

The complete checks remain expected to fail until all replacements are reviewed.
Uniqueness is measured from the actual runtime lookup and PNG bytes; it is not
inferred from the number of planned files. Artwork elsewhere in the game is
outside this follow-up's scope and can still be shared.

## Validation and limits

The game, desktop and admin suites passed with 213 replacements applied and 62
retained illustrations, for 275 unique live TOPIK images. All nine
pixel-processing tests passed against those images. Ninety-nine replacements
remain; the final complete audit will be recorded after they are integrated.

Browser navigation was blocked by the in-app Browser security policy during
this continuation. No alternate browser or policy workaround was used, and
the new full TOPIK set has not been verified in a running browser. The browser
results in the earlier art-review report apply only to its initial 14-word group.

This work does not change Korean audio, vocabulary content, physics or saved
progress. Everything remains local; no publication or upload has been performed.
