# TOPIK Vocabulary Book artwork — 2026-09-04

Status: complete.

The TOPIK II Vocabulary Book has 840 headwords and 840 distinct illustration
paths. This expansion replaces all 446 emoji stand-ins at indices 394–839 with
individually generated artwork. The earlier 394 words keep their existing art:
332 generated illustrations and 62 retained images. The complete manifest now
contains 778 generated illustrations, 62 retained images, and no stand-ins.

## Assets and provenance

Every production asset is a semantically named PNG in
`sprites/items/topik_<concept>.png`. Original Imagegen source filenames, source
thread, individual briefs, superseded candidates, review pages and accepted PNG
hashes are recorded in [the queue](topik-standin-art-queue.json) and
[the canonical manifest](topik-art-manifest.json). Original source images remain
in the local Imagegen archive; runtime URLs use only the checked-in PNGs.

Each image was generated in a separate built-in Imagegen call. The existing
pixel processor exports a transparent cutout exactly 96 px tall, using
nearest-neighbor reduction, binary alpha and at most 32 visible colors. Sources
with baked backgrounds were corrected with Imagegen and the reserved magenta
matte workflow. Candidates that leaked the open-book style reference were
replaced by standalone compositions without that reference.

Both the source and processed result were inspected before approval. Review
records bind approval to the exact source and exported PNG hash. The final
correction pages include [order and daily actions](topik-new-art-review-751-776-769df81f.png),
[abstract and body words](topik-new-art-review-698-798-ccd7ed14.png),
[expressions and explanations](topik-new-art-review-800-826-c7182066.png), and
[geometry and materials](topik-new-art-review-827-838-b590e5f1.png).
The other accepted review pages are referenced individually by the manifest.

## Promotion and cache

The finalizer validated every replacement, registered the new files, updated
the real Vocabulary Book lookup and removed only the 446 obsolete placeholder
files after checking that no other word used them. It keeps byte-for-byte
backups during promotion so a late failure cannot leave a partial update.

The shared artwork fingerprint is
`art-topik-778-extra-12-710a89040456`. All 28 UI stylesheet/script/release
references use `20260904-topik-art-v5`, so a new page load receives the matching
mapping and assets. This work does not alter vocabulary text, audio, gameplay
rules or saved learning progress.

## Validation

- [Source/export quality audit](topik-new-art-quality.json): 446 generated,
  446 reviewed, zero issues, including transparency, palette, baseline, stale
  exports, duplicate PNG bytes and duplicate visible pixels.
- [Runtime vocabulary audit](topik-art-audit-current.json): 840 words, 840 unique
  PNG paths, zero reused paths, missing files or identical-file groups.
- Art library audit: 1,250 catalog entries and 1,250 PNGs on disk.
- Complete game test suite, syntax checks and generated-facts verification: pass.
- Content validation: 5,688/5,688 invariants hold.
- Pixel processing: 10 tests passed; desktop server: 52 passed; admin: 111 passed.
- In-app browser QA at the default desktop viewport and 390 × 844: Vocabulary
  Book and word details fill the viewport, the wide `똑같이` illustration keeps
  its proportions without clipping, and the new `액체` card loads the current
  semantic PNG and artwork cache key. No horizontal page overflow or browser
  console errors were observed. The temporary viewport was reset afterward.

The initial 394-word batch's historical review sheets remain in the repository.
The new expansion preserves those assets and adds dedicated memory cues for
every newly added TOPIK word.
