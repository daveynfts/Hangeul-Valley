# Vocabulary art review — 2026-08-31

This report records the initial 26-sprite repair batch. The subsequent
[full TOPIK artwork review](topik-art-review.md) tracks the request to give
every TOPIK word its own illustration. Counts, cache keys and browser results
below describe the initial batch, not that follow-up.

The review covered all 446 PNGs in the starting sprite catalog and the actual
Korean-to-image lookup tables. The completed repair batch changes 26 sprites:
21 individually generated illustrations and five reprocessed source images.
The catalog now contains 460 PNGs. This is **not a claim that the entire legacy
vocabulary library has a distinct illustration for every word**.

## Completed work

- All 14 learner-supplied TOPIK words have their own illustration. None of these
  files is assigned to a different Korean word elsewhere in the lookup tables.
  Walking and running use different poses; operating a radio and pressing a
  light switch show the relevant actions; entrusting laundry shows a handover.
- Replaced five visibly damaged illustrations: `surprise_burst`,
  `speak_honorific`, `feel_embarrassed`, `to_begin` and `cafeteria`. Clothes,
  lower bodies, roofs and walls are complete again.
- Corrected misleading assignments for banana, sugar, salt, France, Paris,
  the Han River, a passenger train, a gosiwon room and stirring. Sugar and salt
  reuse the appropriate existing noun illustrations; the other subjects have
  newly generated artwork.
- Fixed the source processor: preserve real transparency and dark/cream
  foreground colors, key only an evidenced magenta background, resize with
  nearest-neighbor sampling and limit new sprites to 32 colors. The desk fan
  explicitly keys reserved magenta left inside its grille. No guessing that
  white clothes or a dark outline are background.
- Display vocabulary-book sprites at a crisp integer scale with their natural
  aspect ratios and without a blurred shadow. The later TOPIK set uses native
  96 px files; retained 48 px files use an exact 2× scale. Changing a category or
  search resets the results to the top. On phones, filters have a bounded scroll
  area so they cannot push every word card out of view; the selected filter's
  position is preserved.

The accepted farmer and existing oak/cream/sage props are the visual parents.
Each redesigned subject was generated separately with the built-in Imagegen
tool, then processed through the repository's existing `process_prop.py`.
The lively farmer was revised again after side-by-side review to distinguish
its cheerful jump-rope pose from the startled farmer.

[Current artwork](art-redesign-preview.png) ·
[Before / after](art-repairs-preview.png) ·
[Full prompts and source image identifiers](art-redesign.json) ·
[TOPIK content and TTS notes](topik-vocabulary.md)

## Remaining shared artwork

| Scope | Words with mapped art | Distinct images before | Distinct images now | Extra shared assignments now |
|---|---:|---:|---:|---:|
| All mapped vocabulary | 979 | 290 | 306 | 673 |
| TOPIK II | 374 | 98 | 106 | 268 |
| The 14 requested TOPIK words | 14 | — | 14 | 0 |

An extra shared assignment is a second or subsequent **different Korean word**
using one image. A single headword occurring in two worlds is counted once.
The 979 mapped words are not the game's entire 2,319-word content inventory.

There are still 121 image-reuse groups across the mapped library, including
large groups using `kinds_types`, `running_shoe`, `red_heart` and `wall_calendar`.
Within TOPIK, 53 images are shared by different words. Some reuse is thematically
related, but it still does not meet a one-image-per-word requirement. These
groups need individual semantic briefs and further artwork; they have not been
hidden by renaming or copying the same PNG.

[The initial machine-readable report](art-audit-before-topik-redesign.json) lists every remaining
group. It finds no missing mapped files and no byte-identical PNG copies under
different filenames. It cannot judge visual meaning or perceptually similar
poses: those require the contact-sheet and in-game review.

## Checks

```sh
npm run audit:art
npm run audit:vocab-art
npm run audit:vocab-art -- --world topik-2 --strict
npm run test:pixel-art
npm run test:all
```

`audit:art` checks catalog/file integrity. `audit:vocab-art` separately reports
image sharing; its TOPIK `--strict` command is expected to fail while the legacy
groups above remain. File existence alone must not be reported as full semantic
coverage. `--json docs/art-audit.json` refreshes the all-mapped-words report.

`test:pixel-art` needs Python and Pillow and covers erased foreground colors,
matte islands, nearest-neighbor resizing, limited palettes and alpha-preserving
padding, plus the actual size, palette and alpha of all 26 reviewed sprites.
The game suite guards the 14-word group against shared paths and copied
file contents and rejects the previously accepted apple-for-banana and
globe-for-every-place assignments.

Verified locally: the full game/desktop/admin suite, all eight pixel-processing
tests, catalog integrity and a clean whitespace diff. The browser review checked
all 14 images loaded at a crisp integer scale, distinct source URLs, no
horizontal overflow, category/search positioning and the example-audio button.
At 390 × 844, the filter area is 120 px tall and leaves about 435 px for the word
list; switching categories returns the list from a scrolled position to zero.
No browser warnings or errors were reported in that review. The viewport was
returned to its normal size afterwards.

Both runtime and catalog use cache key `art-20260831-semantic-v3`. No save data,
physics or Korean audio files were changed by this art review. All changes are
local; nothing was published or uploaded.
