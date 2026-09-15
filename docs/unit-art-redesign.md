# Unit artwork redesign

Status: complete — 696/696 reviewed images are active.

Completed 2026-09-09 (Bangkok): all 606 vocabulary entries, 69 desk-quiz illustrations and 21 legacy workbook icons in Units 10, 11, 13, 14 and 15. Every source and export was visually reviewed; exports retain binary alpha and 192 px height. Built-in Imagegen was used. Originals, prompts, provenance, review sheets and runtime files are stored under descriptive Unit names.

Release integration is based on main fc8c4a8 in the isolated `.codex-unit-release` checkout. Existing main changes and configured five-question sessions are preserved. Admin quiz saves now retain safe local illustration paths; the four affected quiz banks regain their matching illustrations without changing questions or answers. Session tests validate the configurable bank bounds instead of requiring the retired ten-question setting.

Validation: full npm test, JavaScript syntax, generated facts, art catalog audit and all 8427 content invariants passed on the integrated checkout. The strict Unit artwork check verified 696/696 source/candidate/runtime hashes. Unit 14 browser check: 125/125 images loaded at 192 px, zero broken images, full viewport 1280x720. Release cache revision: 20260909-unit-art-complete.

The remaining paragraphs are historical checkpoints; their pending lists and transient generation errors no longer describe the completed queue.

Seventeen Unit 10 quiz entries deliberately share the redesigned source of the
identical vocabulary concept (see `unit-art-shared-concepts.json`). Three questions
about ingredients or combined tastes have separate contextual edits. This keeps
learning cues consistent without substituting unrelated illustrations.

Verified in the browser: Unit 10 Vocabulary Book loads 118/118 new images at
192 px source height, with no failed images or console errors in that session.
The book fills the viewport. Script/CSS release URLs and world JSON fetches now
use the same release revision, preventing stale world descriptions after updates.
Full `npm test`, JS syntax, content validation, TOPIK checks, art catalog audit
and generated facts verification passed at this checkpoint. Content validation:
6594/6594 invariants at the 230-entry checkpoint. Pending generated candidates are not covered by activation.

Entries 190–253 passed source/export visual review, including corrections for
baked backgrounds, two-day calendar semantics, the traveler's extra arm and
neutral glass in the milk and newspaper illustrations. All active exports retain
binary alpha and 192 px source height. The 208-entry browser check loaded all
155 Unit 11 cards, including 70 new images, without failed images or console errors.
Full npm test, syntax, content and catalog checks passed at 230 active entries.
At 254 active entries, the browser loaded all 155 Unit 11 cards with 116 new
192 px images, zero failed images and zero console errors. At 354 px width,
the running-action and running-sport cards remained distinct and legible in two
columns. Generated-facts verification and Unit artwork integrity checks passed.

The next 40 Unit 11 health illustrations were reviewed on source/export contact
sheets 150–189. The medicine cup's purple interior was corrected to neutral glass;
the eye-drop action was recomposed so both hands address the same visible eye.
All 40 exports have binary transparency at 192 px height. At the earlier 150-entry
checkpoint, a 437 px wide browser view loaded all 155 Unit 11 cards without failed
images and displayed the first 12 redesigned cards in two columns without clipping.

Scope: all 606 vocabulary entries, 69 desk-quiz illustrations and 21 legacy
workbook icons in Units 10, 11, 13, 14 and 15 (696 images). The queue in
`unit-art-redesign.json` is the source of truth
for pending, generated and visually reviewed artwork. The existing shared farm
stations already use the Valley redesign; their current appearance and placement
will be checked alongside the new Unit illustrations.

Historical batch at 288 entries: source/export sheets 254–289 were inspected. Entries 268 and 274
remain unreviewed because isolated magenta pixels remain in their exports; the
other 34 entries are active. Entry 265 has corrected neutral bottle glass.
Seven Unit 11 quiz entries share matching reviewed vocabulary concepts and were
reviewed again on sheet 294–304 before activation. Imagegen returned a temporary
usage-limit error while starting entry 290; entries 290–292 are not generated.
The remaining five contextual quiz prompts are saved for the next generation run.
At 288 active entries, full npm test, syntax, content (6826/6826), catalog audit
and generated-facts verification passed. Browser screenshots confirmed the new
handwashing and health cards in a full-viewport two-column book, with no console
errors. No claim is made that every image was measured in this browser session.

## Art direction

Premium cozy 16-bit pixel art with warm natural colors, strong dark umber
outlines, distinct silhouettes and readable actions. Each illustration teaches
the actual headword or exercise concept. Nouns need recognizable defining
features; verbs and abstract meanings need a specific situation. Do not substitute
generic books, badges or emoji-like filler. No baked floor, cast shadow, text,
labels or frames. Small meaningful punctuation/math symbols (such as >=3) and
an accurate proper shop name may be retained when they teach the exact concept.

Use built-in Imagegen, one individual concept per call; exact vocabulary/quiz
matches may share an already reviewed source. Full-resolution source PNGs
are preserved in `unit-art-sources/`, named after each semantic queue slug.
Individual semantic briefs are recorded in the queue. Export candidates into
`unit-art-candidates/` at 192 px tall, nearest-neighbor sampling, binary alpha and
64 visible colors. This retains more detail than the previous 48 px Unit sprites.
The UI should contain the full image; map pickups must retain their existing
display footprint regardless of source resolution.

## Review and activation

`node scripts/prepare_unit_art.js` initializes the complete inventory once.
`node scripts/record_unit_art.js <index> <generated-source.png>` preserves a new
Imagegen result and its hash. `scripts/process_unit_art.py --start N --end M`
exports candidates and builds source/export contact sheets. A review records
both source and candidate hashes; changing either invalidates that approval.

75 Unit headwords also occur in TOPIK. Unit-specific runtime mappings must not
replace TOPIK's independently reviewed mappings. All pending entries remain
explicitly pending until their individual artwork has been generated, inspected,
integrated and checked in the browser.

Latest completed checkpoint: entries 268 and 274 corrected and approved, along with remaining Unit 11 entries through 305. Full npm test passed at 306. Browser verified 155/155 Unit 11 images at 192 px with no failed images. Entries 306–317 passed source/export review and were integrated; browser verified 12 new Unit 13 images at 192 px among 104 cards, with zero failed images and no console errors. Unit 13 rooms batch 318–329 is reviewed and active after fixing balcony transparency, the vacant-room doorway, and the cheap-rent tag background. Browser verified 24 new Unit 13 images at 192 px among 104 cards with zero failed images. Earlier temporary generation limit has cleared.

Checkpoint continuation: entries 330–422 reviewed and integrated locally. Transport image 340 replaced with bus/train/tickets after rejected trapped-background versions; 334 and 343 corrected alpha; 352 simplified to handset/bill/coins with no cable. Contract image 360 was replaced with a clear still life to remove malformed arms; 372 and 376 corrected for background artifacts. Full npm test passed at 378. Browser at 410 verified all 104 Unit 13 vocabulary cards use the new 192 px artwork, with zero failed images and zero console errors. Five Unit 13 desk-quiz images share their identical vocabulary concepts; eight have new contextual scenes. All 13 source/export pairs were visually reviewed. Unit 14 entries are pending until individual review and activation.
