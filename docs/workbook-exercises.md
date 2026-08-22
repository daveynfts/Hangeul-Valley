# Adding workbook exercises

How the study-desk workbook is built, and how to add a unit to it.

Written after Unit 14, which took the textbook's 어휘, 문법과 표현 and 문형 연습
sections and the audio track that goes with them, and revised after Unit 10 —
which needed no new art at all, because the food icons were already in the game.

Not every exercise ports as printed. Unit 10's 어휘 연습 1 asks you to tick the
dishes you have tried, which nothing can mark; the twelve became two
picture-to-name matching pages instead. When you change the shape of an exercise,
say so in `noteEn` — the learner should know what the book asked for.

Everything the learner sees lives in `worlds/<unit>-workbook.json`. The renderer
is in `js/ui.js`, the art in `js/workbookArt.js`, and the save-side validator in
`admin/lib/workbook.js`. The validator is the contract: it refuses anything the
renderer could not draw, so an exercise that saves is an exercise that works.

---

## Exercise types

Five, and the type only decides how a row is drawn.

| type | shape | used for |
|---|---|---|
| `fill` | shared box, one sentence, gap at the end or marked with `{}` | 어휘 연습 1 |
| `match` | shared box, prompt joined to an answer | 어휘 연습 2 |
| `dialogue` | shared box, gap anywhere in a short script | 어휘 연습 3 |
| `experience` | choices per row, plus an ungraded 있어요/없어요 | V-(으)ㄴ 적이 있다 |
| `build` | choices per row, gap anywhere in a short script | 문법과 표현, 문형 연습 |

`dialogue` and `build` are the same shape — a `lines` array, each line with an
optional `who`, and `{}` where the answer goes — and differ only in where the
choices come from. Reach for `dialogue` when one box serves the whole exercise
and `build` when each row needs its own options.

A box entry carries either one piece of text (`ko`) or two (`dict` and
`polite`): the form the box shows and the form the sentence puts in the blank.
Which it is depends on the entry, not the type. Unit 10's 어휘 연습 2 is the
case that makes this earn its keep — five taste adjectives, and every sentence
wants a different shape of the same word:

```
짜다 → 짜요     해요 ending
맵다 → 매운     ㅂ-irregular, modifier before a noun
쓰다 → 써서     ㅡ-irregular, reason clause
달다 → 단       ㄹ drops before ㄴ
시다 → 시어요   uncontracted; 셔요 is what you will hear
```

Two of the five are irregular and the irregularity only shows up in some of
those shapes. That is the whole exercise, and it is why the forms are stored
rather than derived.

`fill`, `match` and `dialogue` share one box of chips across the exercise: one
chip per blank, and moving a chip that is already placed relocates it rather than
cloning it. That is what makes those puzzles self-correcting.

Those three can be answered three ways, all driving the same state: click a
blank then click a chip, drag a chip onto a blank, or use the number keys. A
placed chip can be dragged to another blank or dropped on nothing to send it
back. The drag runs on pointer events rather than HTML5 drag-and-drop, which
never fires on a touchscreen, and only begins after a few pixels of movement so
a tap still lands as a click.

A `match` whose prompts are pictures is drawn as two columns — pictures down one
side, names down the other — because a box of short names stacked above the rows
reads as two unrelated lists.

`experience` and `build` hang their choices off each row. Use them when the point
is the conjugation rather than which phrase is left over — the learner should be
choosing between 들은 and 듣은, not picking the only button on the row.

### `build`

The general one. A row is a short script of one or two lines, with the gap
wherever the book puts it:

```json
{
  "n": 1,
  "art": "no_phone",
  "phraseKo": "전화를 하다",
  "lines": [
    { "who": "T", "ko": "여기서 전화를 {}?" },
    { "who": "S", "ko": "아니요, 여기에서 전화를 {}." }
  ],
  "answer": "haedo",
  "choices": [ { "id": "haedo", "ko": "해도 돼요" }, … ],
  "answer2": "hamyeonan",
  "choices2": [ { "id": "hamyeonan", "ko": "하면 안 돼요" }, … ],
  "en": "…", "why": "…", "grammar": "…",
  "audio": { "src": "audio/book/2b-u14-p4-1.mp3", "askEnd": 2.62 }
}
```

- `who` is optional. 연습 3 of grammar 4 rewrites a sentence and has nobody
  saying it, so its lines carry no speaker chip.
- `choices2` makes it a two-blank row. The score counts blanks, not rows, and a
  row is right only when both halves are. Use it where the book asks for a pair —
  the 해도 돼요? / -면 안 돼요 exchange loses half its point otherwise.
- The number of `{}` across all lines must equal the number of choice sets. The
  validator refuses a mismatch, because a line with nowhere to put the answer
  renders as already finished.
- Choice ids must not repeat across `choices` and `choices2`: the renderer looks
  a placed choice up by id across the whole row.

### Writing the choices

Put the invariable words in the template and the conjugation in the choices. It
keeps the buttons short and puts the decision where the grammar is.

Distractors carry the lesson. The good ones are mistakes a learner actually
makes:

- the contraction skipped — `오았을 때` for `왔을 때`
- the wrong vowel — `받었을 때` for `받았을 때`
- 으 where a vowel stem does not take it — `피우으면` — and missing where a
  consonant stem needs it — `먹면`
- an irregular carried where it does not belong — `불러면` for `부르면`, because
  르 verbs are only irregular before a vowel
- the honorific dropped — `돌아갔을 때` for `돌아가셨을 때`
- register — `입으면 안 돼요` where the exchange is 반말

Avoid a distractor that is also correct. `보았을 때` and `어릴 때` are both good
Korean; marking them wrong teaches a falsehood. Where the book's own key differs
from what the page prints, say so in `why` rather than quietly picking one — see
`u14-grammar-4-2` item 3.

### Worked examples

`example` on a `build` exercise carries the finished text (`answerKo`,
`answer2Ko`) rather than pointing at a choice id. It is showing the answer, so it
has one.

---

## Art

Two ways to put a picture on a row, and the first choice is whether you need to
draw anything at all.

**`img`** names a PNG the game already ships, by its path under `sprites/`. Unit
10's matching pages use the twelve food icons from `sprites/foods/` that Unit 10
already had — `sprites/catalog.json` maps `wordKo` to `path`, so the icon for a
word is a lookup, not a decision. Prefer this. A `match` row whose prompt is a
picture may leave `stemKo` out: printing the name on the left would answer the
row.

**`art`** names a 16×16 matrix in `js/workbookArt.js`, drawn as SVG rects — the
same character matrix + palette the rest of the game uses. Draw one only when
nothing shipped fits, as Unit 14's grammar pages needed.

Both fields are optional and a row without either just shows no picture.

Silhouette first. At this size a recognisable outline beats detail: a 가야금
reads as a radiator grille, a screen-on-a-desk reads as a home computer.

For 금지 signs, draw the object clean and put the mark beside it. A circle and
slash at 16px lands the slash straight across the thing you are meant to
recognise. All five Unit 14 signs share one badge, stamped at row 10, column 10,
so it reads as notation rather than as part of the drawing.

`tests/test_unit14_workbook.js` checks every key the content names exists, is a
clean 16×16, and uses only palette characters.

---

## Audio

The textbook tracks are the real thing and worth using. Two rules learned the
hard way.

### Cutting a drill track

A 문형 연습 track holds several drills, and every drill repeats one loop:

```
[cue tone] → teacher's line → 4s for the student → model answer → [cue tone] → …
```

**The tone comes before the teacher's line, not between the teacher and the
answer.** This is the thing to get right; it was got wrong twice. Pairing across
the tone glues each answer to the next item's question, and every clip then
leads with the answer to its own row.

Measured thresholds from track 10 — check them against a new track rather than
assuming:

| | value | why |
|---|---|---|
| cue tone | < 0.6s | everything else is speech |
| tone → teacher | ~1.03s, every time | a 2.03s gap meant an announcement segment |
| teacher → answer | ≥ 1.5s | 연습 2 reads the bracketed prompt ~1.0s in; this steps over it |
| answer → next tone | ≥ 2.0s | but one gap measured 3.06s, so do not assume 4s |

Each drill starts with an announcement: four short bursts about a second apart,
roughly 1.2s, 1.1s, 0.45s, 2.0s. Count those to find how many drills a track
holds.

Get the segment map from ffmpeg and work from it, not by ear:

```bash
ffmpeg -i Track10.mp3 -af "silencedetect=noise=-35dB:d=1.0" -f null - 2>&1 | grep silence_
```

Cut each clip as teacher's line + a 0.7s breath + model answer, with the
four-second waits removed — about six seconds instead of fourteen. Encode mono
at 64 kbps: 988 KB for twenty clips against 7.3 MB for the untouched track.

### Verify by speech rate

File sizes cannot see a pairing error — the clip holds the right *amount* of
audio, just the wrong lines. What sees it is the reading pace. One narrator at
one pace holds a steady syllables-per-second against the text the book prints,
and a clip carrying the wrong line reads far too fast or too slow for the text
beside it, because the two are different lengths.

That check is a test now (`tests/test_unit14_workbook.js`, section 18). It splits
each clip at `askEnd` and measures both halves. On Unit 14 it reports **3.77
±0.35 syl/s** across forty lines; shifting the pairing by one widens the spread
to ±0.78 and pushes four lines outside a human speaking range, which fails it.

Run it before trusting a new cut. If the numbers disagree with your ear, believe
your ear and fix the thresholds — the pairing was wrong twice before the ear
settled it.

### Playback

`audio` on a row or on `example`; `askEnd` records where the question ends.

The clip plays **whole** — question and model answer — whether or not the row has
been checked. 문형 연습 is listen-and-repeat and the model is the thing being
copied. An earlier version stopped at `askEnd` until the page was checked, which
meant the button played the question and nothing else for as long as you were
actually doing the exercise.

`askEnd` stays in the data anyway: it is the mark the speech-rate check measures
the two halves against.

Rows without a recording fall back to `speakKorean()`, which plays a pre-rendered
clip where one exists and the browser's voice otherwise.

---

## Two traps that fail silently

**Publishing.** `vercel.json` rewrites `/worlds/*` and `/audio/*` to the CDN, so
on the deployed site the checked-in copy is never read — only the uploaded one
is. A file missing from the upload batch does not fall back to the repo version,
it 404s, and the feature goes quietly missing for everyone. `unit14-workbook.json`
did exactly that: the study desk fell back to the quiz on production from the day
it shipped.

In `scripts/r2Content.js`:

- **audio derives itself** — `collectUploadFiles` reads the workbook and takes
  every `audio.src` it names, on exercises, items and examples alike. Add a clip
  to the content and it publishes.
- **world JSON is still hand-listed** in `STATIC_FILES`. `tests/test_r2_content.js`
  scans `worlds/` and fails if any file on disk is missing from the batch, so the
  omission is caught — but you do have to add the line.

Do not hand-list audio. If a future unit needs its clips uploaded, extend the
collector to read that unit's workbook rather than pasting paths.

**TTS clips.** `collectTtsPhrases` in `scripts/ttsClips.js` cannot walk the
workbook for `{ko: …}` the way it walks the other content: **every wrong answer
is a `{ko: …}` too**, and rendering `하아도 돼요` or `어려웠을 때` as clean spoken
Korean would teach them. `collectWorkbookPhrases` collects the printed lines and
each script with the correct answers filled in, and nothing else.

---

## Adding the next unit

Unit 10 was the second, and most of the hard-coding went with it. A workbook is
`worlds/<unit>-workbook.json`, and the pipeline finds them by that name:

- `scripts/r2Content.js` uploads every `worlds/*.json` and every `audio.src` any
  workbook names
- `scripts/ttsClips.js` harvests every `worlds/*-workbook.json`

**Neither needs touching for a new unit.** Do not go back to listing files.

Two places still name a unit, and both should:

- `js/ui.js` — `workbookUrl()` maps world to path, one line per unit, the same
  shape `deskQuizUrl()` already had
- `admin/lib/workbook.js` — `WORKBOOKS` maps a unit key to its path;
  `getWorkbook(root, unit)` and `saveWorkbook(body, root, unit)` take that key
  and default to Unit 14

The admin panel takes the unit in the path — `GET/PUT /api/workbook/:unit`, with
`GET /api/workbooks` listing them — and the Workbooks tab has a picker. It used
to be `/api/unit14/workbook`, which meant the editor showed Unit 14's exercises
whichever unit you had in mind.

A new unit therefore needs: the JSON, a line in `workbookUrl()`, an entry in
`WORKBOOKS`, and its own test suite. Art and audio only if the unit has them.
The panel picks it up from `WORKBOOKS` on its own.

Other things that scale with the list:

- **Number keys.** The exercise list takes 1–9 then 0. A row past the tenth gets
  a blank badge rather than a key that does nothing, and is reached with the
  arrows. Unit 14 has thirteen.
- **The list headline.** 문법과 표현 numbers its exercises inside each grammar
  point, so several rows are called 연습 1, and three of them print the identical
  Korean instruction. The headline is the grammar `pattern`; the instruction is
  not in the list at all. Keep it that way — it read as one row repeated when the
  instruction was the headline.
- **Section grouping.** Rows are grouped under their `section`, so thirteen
  exercises read as three, six and four.

Music and ambience stop while any study screen is open — see `STUDY_OVERLAYS` in
`js/ui.js` and `hold()`/`release()` in `js/systems/music.js`. A new study screen
needs adding to that list.

---

## Before committing

```bash
npm run check && npm run validate && npm test && npm --prefix admin test
```

`tests/test_unit14_workbook.js` is the one that matters here: textbook answer
keys, the interaction, the art, the clips and the speech-rate check.
`npm run test:desktop` needs Python, which is not on every machine.
