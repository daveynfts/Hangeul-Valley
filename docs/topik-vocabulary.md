# TOPIK vocabulary additions

The learner supplied these 14 headwords on 2026-08-31:

걷다, 발, 편하다, 가볍다, 선풍기, 틀다, 켜다, 더럽다, 이불, 맡기다,
세탁소, 달리다, 바로, 활기차다.

`켜다` already existed. Its entry is reused; the other 13 are appended, taking
the TOPIK world from 361 to 374 words. They share the category `일상생활` /
`Daily routines & home`, available in the existing notebook and vocabulary book.
Words repeated in another world retain the game's shared Korean-keyed SRS card.

## Volunteer recruitment and chart language — 2026-09-01

The learner supplied a second list of 21 headwords:

그림책, 자원봉사자, 모집, 꿈, 희망, 자격, 고등학생, 또는, 신청 방법,
홈페이지, 활동 기간, 봉사 활동, 참여하다, 그래프, 고려 사항, 기준, 규모,
비율, 전체, 이상, 이하.

`이상` already existed and is reused, so 20 entries are appended and the TOPIK
world now contains 394 words. The new cards are grouped into `봉사·모집` /
`Volunteering & applications` and `자료 해석` / `Charts & data` to keep the
recruitment-notice language separate from graph-reading language. The reused
`이상` card keeps its existing `사회` category and now also has an example.

All 21 entries have original Korean practice sentences and English explanations.
The source record `user-2026-09-01-volunteer-data` preserves the learner's exact
list and explicitly records that the examples are practice material rather than
quotations attributed to a TOPIK paper. Twenty new dedicated art briefs are
registered as pending; semantic fallback illustrations keep every card usable
while those assets await individual visual review.

`worlds/topik-2.json` records this request in `vocabularySources`. These are
explicit learner additions, not words attributed to an invented exam paper.
The 14 `example` / `exampleEn` pairs are original practice material. In particular,
the examples show 걷다 → 걸어요, 가볍다 → 가벼워서, 더럽다 → 더러워서,
and 맡기다 → 맡겼어요 in everyday contexts. The word detail panel labels these
as example sentences and plays only the Korean when its speaker button is pressed.

## Audio

Use the existing `ko-KR-SunHiNeural` voice, rate `-12%`, neutral pitch and volume.

```sh
npm run tts:generate -- --world topik-2
```

This collects the world's headwords, vocabulary examples, correct completed exam
scripts and Hangul syllables for the slow pronunciation button. It skips valid
local clips, deduplicates text and writes the same content-addressed filenames
that `js/audio.js` requests. Distractors and unfilled prompts are excluded.
The normal unscoped generator also covers TOPIK and Unit 15 now.

MP3s live in `audio/ko/`, which is intentionally gitignored. A new checkout must
run the generator; production publication uses the existing R2 pipeline. Adding
local vocabulary does not itself publish or upload anything.

## Art and prompts

Generated with the built-in Imagegen tool and the repository's
`farm-pixel-props` workflow. Each new asset is a separate image, registered in
`sprites/catalog.json`, processed at the TOPIK manifest's 96 px output height,
and consumed by `js/vocabArtMore.js`. Following the visual review, all 14 words
have a dedicated illustration: no other vocabulary entry borrows those files.
Actions show people or hands doing the action, rather than a shared shoe, sun,
sofa or fan. Full redesign prompts and source-image identifiers are recorded in
`docs/art-redesign.json`. The follow-up [full TOPIK art review](topik-art-review.md)
and [per-word manifest](topik-art-manifest.json) cover the later request to
replace shared images throughout the 394-word TOPIK Vocabulary Book.

| File under `sprites/items/` | Style parent | Subject prompt |
|---|---|---|
| `desk_fan.png` | `green_sofa.png`, `white_pillow.png` | Electric desk fan facing forward; pale sage grille, three teal blades, short neck, cream base and orange power button. |
| `walking_farmer.png` | accepted farmer | An easy walking step with upright torso and relaxed arms, distinct from the airborne running pose. |
| `bare_foot.png` | accepted farmer palette | One bare foot from above, showing all five toes, its heel and short ankle. |
| `comfortable_farmer.png` | accepted farmer | Relaxing into a cushioned sage armchair, feet supported and shoulders at ease. |
| `turn_radio_dial.png` | accepted farmer palette | A hand turns the radio knob as music starts. |
| `switch_on.png` | accepted farmer palette | A finger presses an illuminated wall switch. |
| `entrust_laundry.png` | accepted farmer | A customer transfers a laundry bundle into a shopkeeper's care. |
| `running_farmer.png` | accepted farmer | An airborne running stride with bent arms and two motion marks. |
| `act_immediately.png` | accepted farmer | Opening the door as its bell rings, an immediate response. |
| `lively_farmer.png` | accepted farmer | Cheerful jump-rope exercise, both feet airborne and hands at the hips; distinct from the startled pose. |
| `light_feather.png` | generated `desk_fan` | One diagonally curving cream feather, pale sage edge and beige quill; retain the parent palette and outline weight. |
| `dirty_laundry.png` | generated `desk_fan` | One crumpled cream T-shirt, sleeves spread, with three clearly visible brown mud stains; retain the parent palette and outline weight. |
| `folded_quilt.png` | generated `desk_fan` | One folded sage quilt with cream lining, stitched squares and a turned-back corner showing its thickness. |
| `laundry_shop.png` | `pharmacy_shop.png` | The same oak shop and terracotta roof transformed into a dry cleaner's, with a hanger symbol and a cream shirt in the window; no medical symbols. |

Shared prompt constraints: Hangeul Valley 16-bit SNES/Stardew farm still-icon;
derive a sibling from the supplied reference; chunky dark-brown outlines and
crisp pixel clusters readable at 48px; one centered subject in a square image;
orthographic 2D rather than isometric; flat magenta `#FF00FF` for chroma key;
no floor, grass, cast shadow, text, logos, watermark, glossy 3D or vector curves.
The processor preserves native alpha, uses nearest-neighbor resizing and a
32-color palette. Dedicated TOPIK outputs are 96 px tall; the original general
vocabulary icons remain 48 px. The desk fan uses
the explicit `--key-magenta` option because its generated cutout retained matte
inside the grille. Clothes and outlines are never guessed as background.

The initial repair used cache key `art-20260831-semantic-v3`; the follow-up
generates a content-based key shared by the runtime and sprite catalog, so
replacing an image also invalidates cached art. The vocabulary book displays
dedicated TOPIK icons at their native 96 px height and retained 48 px icons at
an exact 2× scale, with natural aspect ratios and no blurred shadow. Category/search
changes reset the result list to the top. Scene placement,
farm physics, word content, saved progress and the Korean TTS clips are unchanged
by the art redesign.
