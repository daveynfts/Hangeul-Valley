# New TOPIK vocabulary illustrations

This batch replaces the 446 emoji stand-ins added at world indices 394–839.
The starting revision is `dbcfe9b06cdd1cf08e5b4d915851b1ef26e4a750`.
The earlier 394 illustrations are outside this batch.

Images are generated individually with the built-in Imagegen tool. The exact
Korean headword, English meaning, concept hint, semantic filename, and individual
brief are saved in `topik-standin-art-queue.json`. Selected source filenames and
their source-thread directories are recorded there immediately after generation.
Corrections retain the superseded source provenance.

## Generation prompt

The following shared prompt is combined with each entry's `ko`, `en`, `brief`,
and `hint`. The style reference is
`exec-258f8b03-84c3-4e83-9add-c98465bf7b47.png`, from source thread
`01a058ad-0267-7370-958f-344df576b58e`.

```text
Use case: stylized-concept
Asset type: Hangeul Valley TOPIK Vocabulary Book game icon, readable after processing to 96 pixels tall.
Input image: style reference only. Replace its subject completely; match its crisp pixel scale, chunky dark-brown outline, simple Stardew/SNES proportions, warm colors, and transparent cutout.
Primary request: Create one unique illustration for {ko}, meaning "{en}". {brief}
Concept cue: {hint}; understand it but do not draw a flat emoji glyph.
Scene/backdrop: isolated subject or compact action vignette on a genuinely transparent background.
Style/medium: polished Stardew Valley / SNES-era 16-bit pixel art, deliberate square pixels, simple expressive faces, cohesive farm-game palette, no anime gloss or oversized anime eyes.
Composition: straight-on orthographic front view, complete centered subjects, generous transparent margin, compact readable silhouette.
Constraints: visually convey the exact Korean meaning. No text, letters, numbers, logo, UI frame, grass, floor, broad scenery, drop shadow, glow, cropping, or watermark. Actual alpha transparency, never draw a checkerboard.
```

For a source with a baked checkerboard, use Imagegen background extraction on
that source: preserve its objects, colors, outline, and composition; remove the
checkerboard and background gaps; request actual alpha transparency without a
new backdrop, shadow, or glow. Recheck the correction instead of assuming the
tool returned a valid cutout.

If background extraction still returns a baked backdrop, use a targeted Imagegen
edit to replace only that backdrop and its enclosed gaps with reserved, flat
`#FF00FF`. Preserve the illustration's subjects, gestures, colors and outlines;
do not introduce the reserved color into the subject. Record `keyMagenta: true`
and use the existing sprite processor to export the cutout. Inspect the exported
result for missing details as well as leftover matte; a successful generation
call alone does not count as review.

Semantic corrections are recorded in each affected entry's provenance and brief.
These include Arctic wildlife without penguins, `짧다` as short object length,
`경우` as a case or situation rather than a suitcase, and `반영되다` as factors
incorporated into a plan rather than a literal mirror image.

## Production and review

The project processor preserves alpha, uses nearest-neighbor resizing to 96 px,
and limits the visible palette to 32 colors without dithering. Runtime cards
already render at this native height. Final images live at
`sprites/items/<semantic_slug>.png`; no runtime URL depends on a source-thread
directory.

`preview_topik_art.py --queue --indices ...` creates side-by-side source, enlarged
sprite, and native-size sprite pages. Its review JSON captures the exact source
name and PNG hash. Only after visual inspection are these records marked reviewed
with `record_topik_generation.js`. Changing a source clears its previous review.
`prepare_topik_standin_reviews.js <python> [count]` snapshots unseen source/export
pairs into stable, content-tagged pages. Creating a page does not approve it.
The finalizer rejects missing sources, stale review hashes, duplicate PNGs, unsafe
deletion paths, and placeholders used by another word.

Before promotion, run the read-only quality audit with `--require-complete`.
It checks actual visible pixels for duplicates as well as PNG bytes, binary
alpha, reserved matte, native height, palette size, source/export consistency,
and exact review provenance.
Then synchronize the canonical manifest, art catalog, and runtime mapping with
`finalize_topik_standin_art.js --apply`, and verify the shared art cache key.

## Final standalone-composition correction

The final correction pass generated 41 separate compositions without an image
reference, because the open-book reference had leaked into unrelated subjects.
Each accepted entry stores its concrete English brief in the queue and manifest.
The shared instruction required a standalone 96-pixel-readable Stardew/SNES
sprite, square pixels, a dark-brown outline, a compact palette, and a flat
#FF00FF background. It explicitly excluded books, pages, frames, text, numerals,
and magenta/pink/purple subject colors. These sources were processed and reviewed
again before promotion. The completed expansion contains 446 reviewed images.
