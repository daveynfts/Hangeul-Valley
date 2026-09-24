# Adding workbook exercises

How the study-desk workbook is built, and how to add a unit to it.

Written after Unit 14, which took the textbook's 어휘, 문법과 표현 and 문형 연습
sections and the audio track that goes with them, and revised after Unit 10 —
which needed no new art at all, because the food icons were already in the game.

Not every exercise ports as printed. Unit 10's 어휘 연습 1 asks you to tick the
dishes you have tried, which nothing can mark; the twelve became two
picture-to-name matching pages instead. When you change the shape of an exercise,
say so in `noteEn` — the learner should know what the book asked for.

A row can also be unmarkable on its own. V-(으)ㄹ래요 연습 2 ends with two empty
picture frames, each holding a question mark — invent your own pair and have the
conversation — and the answer key has nothing for it. Four rows went in and the
fifth is named in `noteEn` rather than being invented on the book's behalf.

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
- Both blanks can fall in the same line. Unit 10's 문법과 표현 연습 2 builds the
  whole of A's question — 세계에서 제일 높은 산이 어디예요? — so both groups of
  buttons sit under A, and the speaker chip that labels a group names nothing.
  Where one line owns both gaps the tag prints the blank's position with it, A1
  and A2, rather than the same chip twice.
- The number of `{}` across all lines must equal the number of choice sets. The
  validator refuses a mismatch, because a line with nowhere to put the answer
  renders as already finished.
- Choice ids must not repeat across `choices` and `choices2`: the renderer looks
  a placed choice up by id across the whole row.
- Two blanks is the most a row can draw. Unit 10's 반말 연습 5 takes a whole phone
  call down into 반말, and the book's frame puts three blanks in one turn — 네,
  괜찮아요. 숙제하는 중이었어요. — so the turn is split at the sentence boundary into
  two rows, each with its own polite original printed above it. That keeps the call
  in order and reads as the book reads; merging the three into one long choice
  would collapse three decisions into one.
- A line with nobody speaking it gets no group tag at all. Numbering the groups on
  their own would read as the key badges on the buttons beside them, and the break
  between them already puts them in the order the blanks come.
- A `who` longer than one character gets a wider chip. 연습 5 keeps the names the
  book prints on its lines, 정우 and 스티븐, and the chip is a 19px box built for one
  letter at 8px; `data-name`, set on the speaker chip and on the group tag, is what
  gives a name room to be read.

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

That is the trap to watch on a register page, where so much of what is wrong for
the exercise is still good Korean. 반말 연습 2 asks for 많네 out of 많네요, and 많아 is
a perfectly good 반말 sentence — just not that transformation, so putting it up as
wrong would teach a falsehood about the sentence. 많으네 is wrong outright, and that
is what goes on the button. The same rules out the plain style 좋다 and the
colloquial 갈래, and it is why 너가 gets a line in `grammar` saying it is what people
actually say, rather than being marked wrong in silence.

Where the page is about register, the three choices can be the three registers:
살아 / 살아요 / 사십니까. One decision per row rather than three unrelated ones, and
the wrong answers say something — 반말 is being picked out of the styles it sits
between rather than out of noise.

An exercise the book leaves open — write your own answer — becomes the key's model
answer against two that answer the question and fail somewhere else: the register
slips (네 where 응 belongs), or the tense does not match what was asked. Say in
`noteEn` that the book left it open.

That only works where something in the row makes the wrong answers wrong. On the
-는데 page it does not: 연습 3 prints an opening and leaves the rest of the line to
you, and -는데 takes a neutral continuation as readily as a contrastive one, so an
ending invented to be wrong would usually be sayable. The four endings the key
gives became a text `match` instead — one chip per opening, self-correcting, and
the pairing is the comprehension the exercise was after. Reach for that shape when
the alternative is inventing Korean that is only wrong by intention. A `match` with
no pictures keeps its box above the rows; only a picture match is drawn as two
columns.

### Writing the explanation

Three fields print under a checked row: `en` translates the finished sentence,
`why` says what the sentence is doing and why the answer is the one that does it,
and `grammar` shows the form being built. The split is worth keeping — `why` is
about the sentence, `grammar` is about the ending — because a learner who wants
one of those does not want to read the other to find it.

**The explanation has to answer the buttons that were on screen.** This panel is
read at the moment a row went wrong, by someone who wants to know about *their*
mistake. Most single-row distractors need no naming, because the rule the row
teaches already disposes of them: 장미 ends in a vowel, so the particle is 가, and
that rules out 장미이 without ever printing it. What needs naming is a distractor
whose wrongness the row's own rule does not reach.

The failure mode is a distractor shape that recurs across a whole page and is
never mentioned on it. Unit 10's V-(으)ㄹ래요 page shipped that way: -(으)ㄹ게요 and
the 래/레 misspelling stood as wrong answers on all five rows, and neither
`noteEn` nor any row said a word about either — so picking 갈게요, which is real
and useful Korean and exactly the mistake to expect, returned a note about 으
insertion. That is a check now: `tests/test_unit10_workbook.js` section 9d and
`tests/test_unit14_workbook.js` section 19 fail when a shape wrong on half a page
or more appears nowhere in that page's text. They also require each row's note to
name at least one of that row's own answers, which is what caught 연습 3 of
V-(으)ㄹ래요 2 — its note was entirely about B's printed line and said nothing
about either blank.

Both checks are deliberately loose in one direction and tight in the other. A
literal-mention rule over every distractor fires on correct content — 91 of Unit
10's 242 distractors are answered by a class rule rather than by name — and a
check that flags good work gets switched off. Run any new rule against the
pre-fix file before trusting it: if it does not fail on the bug it was written
for, it is not checking anything.

**A rule that recurs on every row goes in `noteEn`, once.** The rows then point at
which button it is, and each says something different. Five rows carrying the same
clause read as one row copied — the same failure the list headline had when the
instruction was the headline.

**Check every mnemonic against a counterexample before writing it down.** The
되/돼 note used to say that anything ending the sentence is 돼요, which dies on
되세요. What replaced it is the test native writers actually use: put 하/해 in the
same slot, and if 해 fits, write 돼 — 안 해요 works, so it is 안 돼요. A rule stated
wider than it is will be believed at exactly its stated width.

**Do not say a form is not Korean when what is wrong is where it is.** 가러 is a
sayable shape; it loses on that row because -(으)러 has to be followed by a verb
of movement and the verb after the blank is 하다. Saying it is not Korean teaches
a learner to distrust a form they will meet.

**Read contrast pairs character by character.** 았/았 sat in a Unit 14 note — the
same syllable on both sides of the slash, where 아/었 was meant. A pair is where a
typo is least visible and most misleading, because the shape of the sentence
around it still reads as a contrast.

**Never point at a button by its position.** A sitting deals the buttons in an order of its
own (see *Button order* below), so "the third button" in a note is whichever button the deal
put third, and a learner reading it after a wrong answer is sent to the wrong one. Name the
button by its text: 잠을 못 자 보이네요 cannot be right, not "the third button cannot be right".
Two such notes, in Unit 14 and Unit 17, were rewritten when the deal arrived. The book's own
numbers are different: "모범 답안 gives ②" is about the page, and a row whose buttons carry the
book's ①②③ is laid out in that order.

The apostrophe is the curly one.

### Button order

The banks are written with the right answer first — every row of Units 11, 13, 14, 15, 17
and 18's 교과서, all 70 of Unit 12's 익힘책 — and until the deal arrived the renderer drew the
buttons in exactly that order and the number keys pressed them in it, so a learner could
press 1 on every row and score full marks without reading a word. Five shared boxes had the
fault the other way round: their chips were listed in the order of the rows they answer.

`wbDeal` in `js/ui.js` now deals every row's buttons and every box's chips when an exercise
opens, and again on 다시 풀기. The renderer and the number keys both read `wbRowChoices`, so
a badge and its key cannot disagree, and the order holds still for the sitting so a re-render
never moves a button under the cursor. Two orders are kept because they mean something: an
exam bank (`drawOne`), whose explanations cite option 1 to 4 as the paper prints them, and a
row whose every button opens on a circled number, which is laid out ① ② ③ however the
sitting deals. `tests/test_workbook_button_order.js` drives the shipped renderer with a
seeded random source and was checked against the old renderer, where it reads "1×60".

So the order a bank is written in no longer reaches the screen, and nothing needs rewriting
to benefit. A new bank can still vary it — Unit 12's 교과서 does, so the file does not teach
"the first one" to any reader that bypasses the renderer — but the deal is what protects the
learner.

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

There is a third answer, which is to say in words what the picture showed. Unit
10's 문법과 표현 연습 1 photographs four fruits and asks what they add up to. A
`build` row cannot take `img`, and four fruits drawn at 16px are a smudge, so the
row's `phraseKo` lists 사과 · 딸기 · 오렌지 · 포도 and the learner supplies 과일 —
which is the skill the page is after anyway. It is a change of shape like any
other, so it goes in `noteEn`.

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
assuming. Track 2 held to every one of them, which is what makes them worth
writing down:

| | value | why |
|---|---|---|
| cue tone | < 0.6s | everything else is speech |
| tone → teacher | ~1.03s, every time | a 2.03s gap meant an announcement segment |
| teacher → answer | ≥ 1.5s | 연습 2 reads the bracketed prompt ~1.0s in; this steps over it |
| answer → next tone | ≥ 2.0s | but one gap measured 3.06s, so do not assume 4s |

Each drill starts with an announcement: four short bursts about a second apart,
roughly 1.2s, 1.1s, 0.45s, 2.0s. Count those to find how many drills a track
holds.

Two things about track 2 that track 10 did not show. First, the teacher does not
always read a sentence: on two of its four drills the cue is three words dictated
a second apart — 꽃, 장미, 예쁘다 — so the teacher's side of the clip is three
segments with two 1.03s gaps inside it, and it is cut as one span from the first
word to the last rather than having its pauses closed up. Second, the [보기] is on
the tape as well, with a ~2.0s wait in front of its answer instead of the 4.0s an
item leaves the student. That is what tells the example from the items, and it is
also how the twenty exchanges are found in the first place: a model answer is a
segment with a wait of 1.5s or more in front of it and 2.9s or more behind it, and
nothing else in the track has both.

Work the spans out in a script rather than by hand. Walking back from an answer
while the gaps stay under 1.5s lands exactly on [tone, line…] for an item, because
the break in front of the tone is the 3.0s or 4.0s one; the tone is then dropped,
being the mark for the student to speak rather than part of what is said. The
[보기] sits inside the announcement, where that walk would swallow the instruction
too, so its teacher side is taken as the same number of segments the items of its
own drill have — and the segment in front of it is asserted to be under 0.6s, so a
wrong count fails loudly instead of shipping.

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

That check is a test now — `tests/test_unit14_workbook.js` section 18, and
`tests/test_unit10_workbook.js` section 9b. It splits each clip at `askEnd` and
measures both halves. On Unit 14 it reports **3.77 ±0.35 syl/s** across forty
lines; shifting the pairing by one widens the spread to ±0.78 and pushes four
lines outside a human speaking range, which fails it.

The rate bands do not carry over between tracks, and track 2 is why. Its dictated
drills read at **1.8 syl/s** on the teacher's side, because a third of that half
of the clip is the silence between the three cue words — nothing is wrong with the
cut, the span simply is not all speech. So the band is chosen per shape, and the
shape is in the text: a dictated cue is printed with commas. Unit 10 measures
1.43-2.10 syl/s on its dictated halves, 2.73-3.67 on its spoken ones, and **4.22
±0.45** across the twenty model answers, where shifting the pairing by one inside
a drill takes it to ±0.96 or worse. Run the shift before trusting the numbers: a
band wide enough to pass everything is not a check.

One more look is worth having the first time a track is cut. Decode each clip in
the browser and measure its envelope: the 0.7s breath should be digital silence
ending at `askEnd`, and the answer half should be three-quarters speech. Unit 10
came out at -inf dB in the breath on all twenty clips and 74-86% speech in the
answers, which says the cut landed where the arithmetic said it would.

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

## Three traps that fail silently

**Translation.** A new bank has to be added to `HV_CATALOG_SOURCES` in `js/i18n.js`
by hand, and nothing used to notice if it was not. The game then never asks for
that catalogue, so the unit stays English — and, worse, the coverage report does
not count what it was never told about, so `node scripts/i18n_report.js` reads
100% while a whole workbook is untranslated. `unit15-workbook.json` shipped that
way and was invisible for a week; adding Unit 13's found it. The list is
hand-kept on purpose — the admin and the sync script both need it and neither can
run the game to find out what it fetched — so `checkInterfaceLanguage` now walks
`worlds/` and asserts that every `-workbook`, `-textbook`, `-cassette`,
`-desk-quiz` and `-questions` file on disk is listed, and that nothing is listed
which is not there. Adding a bank is four steps, not three: the JSON, the
`workbookUrl()` line, the `WORKBOOKS` entry, **and this list**.

A second, smaller one lives beside it. `validateWorkbook` in
`admin/lib/workbook.js` rebuilds the document field by field, so a doc-level key
missing from that return object is deleted by any save through the Workbooks tab.
`artNote` and `omittedNote` were both missing, which meant one save would silently
drop the only record that a bank's gaps were deliberate. They are on the list now
and `tests/test_unit13_workbook.js` runs a save round-trip to keep them there.

A third, smaller still. `hvIsTranslatable` in `js/i18n.js` treats an `en` value with
more Hangul than Latin letters as a Korean string rather than English prose — which is
right for a category name like `스마트폰, 인터넷, SNS` and wrong for a gloss. Unit 13's
발음 규칙 rows gloss the sound, and two of the five were written `예약하세요 is said
[예야카세요].` — eleven Hangul against six Latin letters, so they were never offered for
translation and would have shipped with `is said` in English on a Vietnamese screen, at
100% coverage, for ever. Nothing catches this; the fix is to notice that the row count
and the `en` count do not match. Writing the gloss so the English carries its weight —
`예약하세요, please make a reservation, is pronounced [예야카세요].` — puts it back in the
catalogue and is a better gloss anyway.

**Publishing.** `vercel.json` rewrites `/worlds/*` and `/audio/*` to the CDN, so
on the deployed site the checked-in copy is never read — only the uploaded one
is. A file missing from the upload batch does not fall back to the repo version,
it 404s, and the feature goes quietly missing for everyone. `unit14-workbook.json`
did exactly that: the study desk fell back to the quiz on production from the day
it shipped.

In `scripts/r2Content.js`:

- **audio derives itself** — `collectUploadFiles` walks every `worlds/*.json`
  generically for anything shaped like `{src: 'audio/….mp3'}`, on exercises, items,
  examples, cassette tracks and dictation rows alike. Add a clip to the content and
  it publishes.
- **world JSON derives itself too**, and no longer needs a line. `STATIC_FILES` is
  down to the four files that are not under `worlds/` — `levels.json`, `facts.json`
  and the two catalogs — and the collector globs the directory for the rest.
  `tests/test_r2_content.js` still scans `worlds/` and fails on anything missing
  from the batch, so a regression here is caught rather than shipped.

Do not hand-list either. The whole bug class this replaced was a file on disk that
no batch named, which does not fall back to the repo copy — it 404s.

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
  world file names
- `scripts/ttsClips.js` harvests every `worlds/*-workbook.json` **and every
  `worlds/*-textbook.json`** — see the section below on the second bank

**Neither needs touching for a new unit.** Do not go back to listing files.

Three places still name a unit, and all three should:

- `js/ui.js` — `workbookUrl()` maps world to path, one line per unit, the same
  shape `deskQuizUrl()` already had
- `js/i18n.js` — `HV_CATALOG_SOURCES` lists every bank that carries
  translatable text. Leave it out and the unit ships in English while the coverage
  report still says 100%; the validator now refuses that
- `admin/lib/workbook.js` — `WORKBOOKS` maps a unit key to its path;
  `getWorkbook(root, unit)` and `saveWorkbook(body, root, unit)` take that key
  and default to Unit 14

The admin panel takes the unit in the path — `GET/PUT /api/workbook/:unit`, with
`GET /api/workbooks` listing them — and the Workbooks tab has a picker. It used
to be `/api/unit14/workbook`, which meant the editor showed Unit 14's exercises
whichever unit you had in mind.

A new unit therefore needs: the JSON, a line in `workbookUrl()`, an entry in
`WORKBOOKS`, a line in `HV_CATALOG_SOURCES`, and its own test suite. Art and audio
only if the unit has them. The panel picks it up from `WORKBOOKS` on its own.

Other things that scale with the list:

- **Number keys.** The exercise list takes 1–9 then 0. A row past the tenth gets
  a blank badge rather than a key that does nothing, and is reached with the
  arrows. Unit 14 has thirteen.
- **The list headline.** 문법과 표현 numbers its exercises inside each grammar
  point, so several rows are called 연습 1, and three of them print the identical
  Korean instruction. The headline is the grammar `pattern`; the instruction is
  not in the list at all. Keep it that way — it read as one row repeated when the
  instruction was the headline. `pattern` belongs to the exercise whatever its
  type: the validator used to write it back only for `experience` and `build`, so
  Unit 10's 반말 연습 1 — a `dialogue` — came back from a save with no headline at
  all, and the list showed two rows called 연습 1 with nothing to tell them apart.
- **Section grouping.** Rows are grouped under their `section`, so thirteen
  exercises read as three, six and four.

Music and ambience stop while any study screen is open — see `STUDY_OVERLAYS` in
`js/ui.js` and `hold()`/`release()` in `js/systems/music.js`. A new study screen
needs adding to that list.

---

## Unit 15, and finding the drills without knowing where they start

Track 11 holds Unit 15's four 문형 연습 drills, twenty exchanges, and none of the thresholds
written above was enough on its own to find them.

**Group into blocks before looking for anything.** A model answer is often two segments —
아니요, then the rest — and a teacher's cue is often three, because two of these drills read a
bracketed prompt word by word: 요즘 과일값이 어때요? / 겨울 / 싸다. Grouping consecutive
segments whose gaps stay under 1.5s puts each side of an exchange in one block, and the blocks
then alternate teacher, answer, teacher, answer straight down the drill. Searching for answers
segment by segment found fourteen of the twenty and no pattern; searching for blocks found all
twenty and the pattern as well.

**An announcement is not told from a teacher block by size.** Both can be four segments. What
separates them is the opening: a teacher block opens on the cue tone at 0.28-0.45s and an
answer block on 아니요 at 0.5-0.6s, while an announcement opens on a full second and more of
speech. Four bursts or more, opening above 0.7s, finds exactly four drills.

**And not by the gap in front of it either.** The track's own opening title sits 2.05s ahead
of the first drill's announcement, not the 4s that separates the later ones — so a gap test
tuned on drills two, three and four puts drill one's boundary in the wrong place, and every
exchange in it comes out shifted by one.

**The [보기] is read faster than the items it models.** Drill 2's runs at 4.9 syl/s against
3.4-3.7 for its own four rows, which is the model being demonstrated rather than left for you.
Banding all five together widens the band to [3.3, 5.0] and it then accepts almost anything;
`tests/test_unit15_workbook.js` bands the four items tightly and checks the model only for
being copyable.

**The shift-by-one check discriminates by spread here, not by absurdity.** The four items of a
drill are one sentence with a word changed, so a wrong pairing produces 3-5 syl/s rather than
the 20 a cassette dialogue gives. Two of three rows falling outside the band is the real
signal, and the test says so rather than implying a stronger check than it has.

**Clip construction, measured off the shipped Unit 14 clips rather than invented.** Teacher
with 0.12s of lead, then 1.15s where the student's four seconds were, then the model answer
with its own pauses left as recorded, then 0.30s of tail. `askEnd` lands halfway across that
1.15s gap.

---

## Unit 13, and an item the tape gives no pause for

Track 9, four drills, twenty exchanges, cut with the block grouping written above. Three
things it added.

**One item has no student pause at all.** Drill 3's fourth item runs teacher then model
answer with 1.05s between them where every other item on the track leaves four seconds, so
the two sides group into a single block and the drill comes out one exchange short. Splitting
on the largest internal gap would be guesswork — the gaps inside that block are 1.04, 1.02,
1.05 and 0.45, and the real boundary is the 1.05 in the middle rather than the 1.04 at the
front. What is not guesswork is the drill's own shape: every item in a drill has the same
number of teacher segments, measured off the first item, so a block carrying more than that
is carrying the answer too and the split is arithmetic. Read the shape from the drill, never
from the block in front of you.

**Whether the teacher reads the bracketed prompt is answerable, not assumable.** The book
prints drill 2's prompt on the student's line, which suggests the student reads it — but the
teacher's side of every clip in that drill is two segments, and the pace settles which. With
the prompt counted the teacher reads 4.24-4.80 syl/s, against drill 1's prompt-free 4.61-5.40;
without it, 1.98-3.32, which is nobody's reading speed. So the teacher reads it, and the JSON
puts it on the teacher's line where the tape puts it rather than where the page does. The
same measurement settles the segment order inside the block: question first at 4.19, prompt
second at 4.55, against 1.80 and 10.6 the other way round.

**Sixteen items at 4.55 ±0.30 on the teacher's side and 5.17 ±0.16 on the answer's**, and the
shift-by-one widens both to ±1.1. Per-drill bands are [4.5, 5.3], [4.3, 5.2], [4.4, 5.1] and
[4.4, 5.1]; drill 3's shift breaks only one row of three and the test says so rather than
implying a stronger check than it has.

**A distractor that differs only by a space is not a decision.** Four rows first shipped with
one — 올지 against 올 지, 살지 against 살 지 — which is a real orthography point and a terrible
button: on a phone the two are indistinguishable, so the learner is guessing rather than
choosing. `tests/test_unit13_workbook.js` asserts that no wrong choice is the right one
respaced, and it caught all four. The point survives in the `grammar` note, where prose can
say "written closed up, never 올 지" without asking anyone to spot a space.

---

## The books are on disk, so stop asking for photographs

Every unit up to here was transcribed from photographs of the page. It did not have to be.
Both source books are on the machine already:

```
Downloads/Korean/2B Giao Trinh/서울대 2B student book.pdf   교과서, 266 pages
Downloads/Korean/2B WB/서울대 2B workbook.pdf               익힘책, 208 pages
Downloads/Korean/2B WB/Seoul_SBT_2B_Audio/Track01..22.mp3   the 문형 연습 audio
```

They are **scans with no text layer**, so `pdftotext` returns five bytes, and neither
`pdftoppm` nor `pdfimages` nor ImageMagick is installed here. None of that matters: each page
is a single DCTDecode JPEG at about 2360×3300, so scanning the file for `FF D8 FF` … `FF D9`
and only counting a marker with `stream` shortly before it pulls the pages out with no
dependency at all. Verified against a page already transcribed from a photograph — identical,
and legible enough to read the small print under the dashed line.

Two things to know before trusting an index. The image index is **close to but not** the
printed page number, and the offset drifts — image 46 was printed 46, image 80 was printed 82,
image 200 was printed 204. Probe one page, read the number in its margin, then adjust. And
the useful pages are not the exercise pages alone: **교재 구성표** near the front lists every
unit with its vocabulary and its four grammar points, and the **모범 답안** at the back prints
the page number beside each exercise's answers. One read of each settles what a unit contains
and where it is, which is faster than hunting.

The book is **10~18과, nine units**, plus 복습 4~6. Each 익힘책 unit is twelve pages.

---

## Unit 11, and a table that cannot be drawn as buttons

Track 3, four drills, twenty exchanges, cut with the block grouping above and no surprises in
it. What Unit 11 added was on the page rather than on the tape.

**A conjugation table is not a row of buttons.** 'ㅅ' 불규칙 연습 1 is four verbs across five
endings with one cell of each row pre-filled — sixteen cells to fill, in a grid. A `build`
row draws at most two blanks, so the table becomes sixteen rows, each one stem-plus-ending on
the left and three shapes on the right. The four pre-filled cells are not asked again, and
`noteEn` says all of this, because a learner who has the book open will otherwise wonder where
the grid went. The sixteen rows' `en` and `why` are generated from five column templates
rather than typed out, which is the only way sixteen near-identical notes stay identical.

**A `fill` chip needs both forms even when they are the same word.** The admin validator
refuses a `fill` bank entry without `dict` and `polite`, and 어휘 연습 2's chips — 내과, 안과,
치과 — go into the blank unchanged. Setting both to the same string is the answer; the
validator is right to insist, because the field means "what the sentence takes" and a bank
that omits it is a bank nobody checked.

**The prompt-on-the-teacher's-line question came back, and the pace settled it again.** Drills
3 and 4 print their bracketed prompt on the student's line, exactly as Unit 13's drill 2 did.
With the prompt counted the teacher reads 4.51 and 4.89 syllables a second, against drills 1
and 2 at 4.53 and 4.87; without it, 2.92 and 2.78. That is not a close call, and it is worth
running every time rather than assuming the book and the tape agree about who says what.

Sixteen items at **4.70 ±0.27** on the teacher's side and **5.33 ±0.38** on the answer's, with
the shift-by-one widening both to ±1.0 or worse. Per-drill bands are [4.4, 5.1], [4.7, 5.4],
[4.5, 5.0] and [4.4, 5.6].

**And one assertion had to be turned around rather than deleted.**
`tests/test_unit11_world.js` said "no workbook is claimed for Unit 11 yet" — true when the
desk shipped with only a quiz and a tape. It now asserts the opposite, that `workbookUrl()`
resolves the unit and the file it names exists, because the pairing is what matters: a bank on
disk that nothing claims means the desk quietly serves the fallback unit's exercises.

## Unit 12, a word list that had to give three headwords back

`worlds/2b-unit-12.json`: 140 words in eight groups, one per printed section. The chapter
is 저는 좀 조용한 편이에요 — a face on p.70, a personality on p.71, a hair salon on p.80 —
and describing people is what every *other* unit reaches for too, so this is the first word
list where the collisions were the work rather than a footnote.

SRS state is keyed by the Korean. A headword owned by two farms is **one review schedule
shared between them**, with nothing on screen to say so, and the rule has been that the
earlier unit keeps it. Unit 12 loses three that its own 어휘 pages print:

- **키가 크다** — Unit 10 farms it, off its 문법과 표현 page.
- **생기다** — Unit 15 farms it, meaning *to come into being*. Unit 12 means *to look*.
  Same spelling, different word, one schedule.
- **어리다** — Unit 14 farms it, and it is on Unit 12's 자기 평가 checklist.

Absence is indistinguishable from an oversight, so each one is written down twice in
`tests/test_unit12_world.js`: that Unit 12 still leaves it alone, **and that the unit it
was left to still has it**. A line that only checked the absence would pass on the day the
word was dropped from both. Nineteen words are deferred that way in all, listed per unit.

The other half of the rule is that giving a word up cannot cost the chapter the thing it
teaches. 키가 크다 is half of a printed pair, and the 보기 under it is 키가 커 보여요 — so the
tall half survives as **커 보이다**, and the test asserts that too. 생기다 never appears bare
in 12과: it is 어떻게 생겼어요 and 인형같이 생겼어요, and both collocations are headwords.

### The example gate is the repo's, and it is deliberately conservative

`scripts/vocab_examples.js` `sentenceUses()` is what `validate_content.js` runs over every
word list in CI, so it is the only opinion that matters — writing a second one in a builder
just moves the disagreement. It refuses more than it has to:

- `surfaceForms()` stops early on a one-syllable open stem, because 가, 시, 쓰 and 하 sit
  inside too much of the language. So 하다, 주다, 보다 and 크다 generate only the 아/어
  family — 해요, 줘요, 봐요, 커요 — and a sentence with 하는, 줄까요, 볼래요 or 큰 is
  unprovable however plainly it uses the word.
- The ㅂ irregular is applied where it does not belong: 뽑다 yields 뽀워요 and 입다 yields
  이워요, so 뽑아 보세요 and 예쁘게 입었어요 do not match either.
- Every whitespace-separated part of a phrase headword has to be present, particle and all.
  앞머리를 다듬다 is not proven by 앞머리는 조금만 다듬어 주세요.

The repo already answers this and the answer is on disk: **a row it cannot verify carries
no example at all**. Unit 14's 야단(을) 맞다 is bare; so is every one of Unit 15's grammar
labels. Unit 12 ships 68 examples of 140 words for that reason, and the six grammar labels
(A-아/어 보이다, N처럼, N같이, A-(으)ㄴ 편이다, V-는 편이다, A-게) are asserted to have none —
a form is not a word, and a sentence beside it illustrates whichever adjective was picked.

### Wiring a world, which is not the same list as wiring a bank

A bank needs the five places in "The order to do it in". A **world** — a farm with its own
word list — needs these, and a missing one fails by never mentioning the unit:

| file | what it is |
|---|---|
| `js/systems/economy.js` | `isUnit12World()`, a `WORLD_PACKS` entry, the desk-art branch, and `TEXTBOOK_WORLD_FILES` |
| `js/i18n.js` | `HV_CATALOG_SOURCES`, or the unit ships in English at 100% coverage |
| `scripts/ttsClips.js` | the harvest list, or no word gets a clip |
| `scripts/vocab_examples.js` | `WORD_FILES`, or the example picker cannot see the unit |
| `admin/lib/i18n.js` | a translator-facing label, or the tab shows a file stem |
| `admin/lib/content.js`, `admin/public/js/world.js` | the world picker and the word-list editor |
| `scripts/validate_content.js` | its own world + wiring block, and the unit id in the example sweep |
| `README.md` | the world count and the total word count, which `checkReadmeCounts` pins |

`js/scenes/farm.js` is **not** on that list and must stay off it: it walks
`TEXTBOOK_WORLD_FILES` for both the preload and the attach, so naming a world there a
second time is how the two lists drift apart.

One trap worth knowing before it costs an hour. The desk-art branch in `economy.js` is
matched by a regex in `validate_content.js` that allows no newline inside the condition:

```js
const branches = [...gameJs.matchAll(/if \((id === '2b-unit-[0-9]+'(?: \|\| id === '2b-unit-[0-9]+')*)\) \{\s*return \[([\s\S]*?)\];/g)];
```

Wrapping that condition onto two lines — the obvious thing to do once it holds five unit
ids — makes the branch invisible to the matcher, and what fails is **a check about Unit
11**: "Unit 11 loads the study desk art and nothing else, 1 art branches, 0 desk-only". The
line stays long.

---

## Unit 12, and a workbook that prints its own answers

`worlds/unit12-workbook.json`: fourteen exercises, seventy rows, ids prefixed `u12-`. Pages
44-55 print seventeen, and the three that are missing are missing for one reason, written into
`omittedNote`: the 정답 pages give them no answer. Write five sentences about someone you envy;
ask a classmate six questions; score yourself on a ten-question health quiz. All three are real
exercises and none of them has a right answer, so there is nothing a screen could mark.

### Read the 정답 before writing a single row

The 익힘책 prints its own answer key — **printed p.203, image 199** in the workbook PDF, under
부록 → 정답 — and it settles in one page what otherwise has to be argued from pictures. Two rows
of this unit turn entirely on a drawing: on p.46, room A against room B, and two dresses under
it. Both were read off the picture as 넓어 보여요 and 날씬해 보여요, and both were then *confirmed*
rather than assumed. Where the two disagree the key wins, and where the key is silent the row
does not ship. `test_unit12_workbook.js` section 2 holds all seventy answers verbatim.

The 듣기 지문 for the 복습 sections is in the same appendix, a few pages earlier.

### The 문형 연습 track number is not arithmetic

This cost a wrong turn. The note in the earlier units said *unit N → Track N−4*, which is true
of 13, 14 and 15 and of nothing else. The workbook CD is grouped, not offset:

| units | 문형 연습 | 복습 |
|---|---|---|
| 10, 11, 12 | Track02, Track03, Track04 | Track05 |
| 13, 14, 15 | Track09, Track10, Track11 | Track12 |
| 16, 17, 18 | Track16, Track17, Track18 | Track19 |

The durations say it without opening one: the 문형 연습 tracks run 300-350s and the 복습 tracks
570-690s, with the short 25-65s files in between being the 복습 listening exercises. **The page
prints its own track number** — Unit 12's says "track 4" — and that number is the file name.
Under the old rule it would have been Track08, which is 61s of 복습 listening and would have
segmented into nothing that matched.

### Two checks that were quietly vacuous

Both were written, both passed, and neither was testing anything. They are worth naming because
the shape is easy to reproduce:

- **A duplicate-answer check keyed on the answer alone.** 어휘 연습 1 keys 넓어요 ↔ 좁아요 for a
  forehead *and* for a pair of shoulders, and 커요 ↔ 작아요 three times over, because the book
  does. The check has to compare the sentence as well as the answer, or it fires on the book.
- **A "drill keeps one ending" check.** True of three drills and false of the fourth: 연습 4 takes
  its verb from the teacher every time — 먹었어요, 샀어요, 구했어요, 했어요. What a drill actually
  shares is the pattern it practises, so that is what gets asserted, one regex per drill.

And one that was worse than vacuous: a pace-band block whose filter always returned empty, so it
asserted `0 === 0` four times and printed four passes. If a check cannot fail, it is decoration.
The replacement measures the model answer against what is left of its clip after `askEnd`.

---

## Unit 16, and a page number that is not the image number

`worlds/unit16-workbook.json`: fifteen exercises, seventy-four rows, ids prefixed `u16-`.
Printed pages 138-149 hold sixteen, and the one that is missing is missing for the usual
reason, written into `omittedNote`: 문법과 표현 3 연습 1 item 5 is an empty picture box and a
blank B line — 이번 방학에 뭐 할 거예요? and answer whatever you like — so the 정답 pages give
it nothing and there is nothing a screen could mark.

### The workbook PDF has an offset too, and it is not the student book’s

The note under Unit 12 said the 정답 for that unit was printed p.203 at image 199, and left
the relationship at that. It is worth stating: in the 익힘책 PDF the **image index is the
printed page minus four**, all through the body and the 부록 alike. Unit 16 is printed pages
136-149 and that is images 132-145; its 정답 is printed pp.207-208 at images 203-204.

This is not the student book’s offset, which is 0 through the chapters and +10 in the back
matter. Two books, two offsets, and the only safe procedure is the one the earlier note gave:
probe one page, read the number printed on it, and work out the rest from there.

### Reading the 정답 first changes what the distractors can be

Three rows of this unit turn on something a drawing would otherwise have had to settle, and
all three were read off the key instead:

- 어휘 연습 3 item 4 — the picture is a man wiping a floor, and the sentence in front of it is
  며칠 동안 청소를 안 해서. Either tense would fit the drawing; the key says 방을 닦았어요.
- 어휘 연습 3 item 1 — 밤늦게 rules out the vacuum, but whether the answer is a prohibition or
  a plain statement is not in the picture. The key says 청소기를 돌리면 안 돼요.
- 문법과 표현 2 연습 2 item 3 — the answer is a fragment, 주소 대신 전화번호를, and the rest of
  the line is already printed. Guessing the particle would have been guessing.

### One exercise where the distractors have to be the other answers

Every other exercise in this bank obeys the rule that a wrong button must not be another
row’s right answer — otherwise one of the two is marked wrong for being correct. 어휘 연습 2
cannot obey it and should not: the book prints five foods in one box and five definitions
under it, so the four wrong buttons on each row are the other four foods and could be nothing
else. The suite **names the exception and checks it from the other side** — inside that one
exercise, every button has to be one of the five foods the box prints:

```js
const SHARED_BOX = 'u16-vocab-2';
ex.filter((e) => e.id !== SHARED_BOX).forEach(/* … no cross-row answers … */);
// and inside it: every button is one of the five foods, and there are exactly five
```

Skipping it silently would have been the easy move, and would have left nothing checking the
one exercise where a stray button is hardest to notice.

### A length check on a note is not a check on the note

The first version required every `grammar` line to be forty characters. Half of Unit 16’s are
shorter than that and complete — `보다 takes -ㄹ까: 볼까.` says everything there is to say — so
the check was padding prose rather than improving it. What replaced it is the property that
actually matters: **the note has to quote something from its own row.** A note written for a
different item is the real failure, and a word count never sees it. Four notes failed the new
check and all four were genuinely about a row other than the one they sat under.

The `why` note keeps its floor of eighty characters, and keeps the Unit 11 rule that it has to
quote at least one of its own buttons — it is shown after checking, so it has to talk about
what was on screen.

### 까 해요 and 까 하는데 are one form, and a regex that forgets it finds six of fourteen

The coverage check counted rows drilling V-(으)ㄹ까 하다 with `/까 하/`. That matches 갈까 하는데
and misses 갈까 해요, because 하 and 해 are different syllables — so fourteen rows read as six
and the assertion failed on a bank that was correct. The fix is `/까 하|까 해/`, and the lesson
is that a Korean pattern with a 하다 in it needs both the stem and the contraction whenever it
is matched by text.

### The 문형 연습 track, and a number that is not a beep

Track16, 321s, four drills of a 보기 and four items. The block structure comes out clean —
group segments whose gaps stay under 1.5s and each drill is one head block plus nine,
alternating answer and prompt — but the segment in front of every teacher prompt needed
explaining before it could be dropped.

It is not a cue tone. Measured for periodicity it sits at 0.24-0.57 where a pure tone is
above 0.95, so it is speech. What identifies it is that **its length does not depend on the
sentence after it**: across all four drills the four item slots come out at 0.29, 0.31, 0.41
and 0.38 seconds, in that order, every time. A sound whose duration is the same in four
different sentences is not part of any of them — it is 일, 이, 삼, 사 being read. `cut_pattern16.js`
asserts that reproducibility, because it is the only evidence that dropping the span is right.

And the reason position rather than length decides what to drop: drill 2’s answers all open
on 네, which is 0.37-0.43s — exactly the length of the number. A rule of "skip a short span at
the front" would have eaten the 네 off five model answers.

With the numbers dropped, all forty groups read at 4.13-5.27 syl/s against their printed text,
which is the tightest band any unit has produced.

---

---

## Unit 17, and a table that is not an exercise

Sixteen exercises, 77 rows, printed pp.150-163 with the 정답 on pp.208-209. Nothing is
omitted — every exercise the book prints has an answer at the back — but three of them needed
a decision before a row could be written.

### Forty-eight cells is a spreadsheet, not an exercise

문법과 표현 3 연습 1 is an eight-by-six conjugation grid: 파랗다 노랗다 빨갛다 까맣다 하얗다
이렇다 그렇다 저렇다 down the side, -습니다 · -고 · -아요/어요 · -아서/어서 · -(으)ㄴ ·
-(으)니까 across the top, six cells pre-filled. Shipping it whole would be 42 blanks in one
exercise, which is data entry.

It is taken **one cell at a time instead**: eight rows, every stem once, every column at least
once, each stem at the cell it is most often got wrong at. That keeps what the grid is
teaching — the ㅎ survives before a consonant, vanishes and fuses before -아/어, vanishes
silently before -(으)ㄴ and -(으)니까 — without asking anyone to fill in 파랗고 as well as
이렇고. The 정답 for all eight cells is in the suite verbatim.

### Two exercises where the distractors have to be the other answers, not one

Unit 16 had one shared-box exercise and named it. Unit 17 has two, for the same reason twice:
어휘 연습 1 answers four rows out of one set of colours, and 어휘 연습 2 answers three rows
out of one set of four patterns. In both, every wrong button is necessarily some other row's
right answer, and the check runs from the other side instead — every button in the first ends
in 색, every button in the second ends in 무늬. Naming two is not worse than naming one; what
would be worse is a rule quietly relaxed for the whole bank.

### A 보기 printed already complete is rejected by the shared validator

문법과 표현 2 연습 1 prints its example filled in: A 아까 계단에서 넘어질 뻔했어요. The
renderer fills a 보기's gap from `answerKo`, so a 보기 with no `{}` in it fails
`validateWorkbook` with *"1 blank(s) to fill, but the lines carry 0 {}"*. The fix is to gap
the example the way the items are gapped and let `answerKo` put the words back. The build
script now checks it, so the failure arrives in the source file rather than three steps later.

### A two-blank row numbers its buttons in one run

문법과 표현 3 연습 3 item 4 has two blanks — 이 ___ 셔츠하고 ___ 바지 — and the keypad numbers
every button on the row left to right across both groups. So the two `choices` lists cannot
share an id: `validateWorkbook` rejects *"choice id 'a' is used by both blanks"*, and it is
right to, because otherwise the number picks one and the check reads the other. Unit 17 uses
a/b/c for the first and d/e/f for the second. This is also the one row on the page a picture
decides — which garment is white, which black — and the 정답 on p.209 settles it, exactly as
Unit 16's 방을 닦았어요 was settled.

### A drill cue that is a list of nouns, not a sentence

The 문형 연습 cutter for Unit 16 found the start of the 보기 cue by taking the last span under
half a second, which was the 보기 marker there. Unit 17's cues are lists of bare nouns —
부모님, 공항 — and the reader **pauses between them**, so a cue arrives as two or three spans
and the last short one is the last word of the cue rather than the marker in front of it.

The rule that replaced it counts: a cue has as many spans as the printed cue has
comma-separated parts, they are the last spans in the head block, and the span immediately in
front of them has to be the 보기 marker. That marker measures 0.43-0.44s in all four drills,
which is the evidence the count landed in the right place. The item numbers still reproduce
across drills the way Unit 16's did — 0.286, 0.288, 0.385, 0.378 seconds for items 1 to 4,
spread under 0.04 — which is what says they are 일 이 삼 사 and not part of a cue.

All four pace bands bite, where Unit 16's drill 2 could not be bitten.

## Unit 18, and seventeen blanks with no box

Fourteen exercises, 85 rows, printed pp.166-175 with the 정답 on pp.209-210 — images 162-171 and
205-206, the same printed − 4 offset as Unit 17. Nothing is omitted. The unit's 익힘책 is ten
pages of exercises, not fourteen: printed 176 starts 복습 6, the review of Units 16-18, which
belongs to none of them.

### Seventeen blanks, no box, taken one at a time

문법과 표현 3 연습 4 is four short passages with seventeen blanks and no word box. The learner has to
find the verb from the sense of the passage and then put it into the plain style, so it is the
hardest exercise in the unit and the page gives no help at all. Like Unit 17's conjugation
table it is taken one blank at a time — each blank is its own row, on the passage line it sits
in — so a learner who gets one wrong finds out which one. The 정답 lists only the changed forms,
passage by passage, and all seventeen are in the suite verbatim.

### A wrong button that is right, in a passage that leaves the tense open

The first draft offered twenty mistakes a Korean speaker would accept — 데려다 줬다, 갈 거다, 씻어야 된다, 설
연휴이다, and 힘들다 after 한라산은 높아서 올라가기가 among them — and they were replaced and pinned. A second
reading, done while the notes were being translated, found three more, all in 연습 4: 된다 after
한국에 온 지 벌써 두 학기가 다, 사귄다 after 좋은 친구도 많이, and 올라간다 after 제주도에 도착해서 먼저 한라산에. Each is good Korean
on its own line. They are wrong only against the tense the 정답 chose, and in a passage with no
box that is not wrong enough.

The distinction that came out of it is between two kinds of row. In a **conversion** row —
되었습니다 → ___ — a tense-changed form is a fair mistake, because it is not the sentence the row
gave you. In a **fill** row whose passage leaves the tense open, the same form is a second
right answer. The three replacements are forms nobody writes — 되는다, 사귀는다, 올라가는다, the
consonant-stem ending on a vowel stem — and the pinned list is addressed by exercise and row,
so 된다 stays available where it is a mistake and is refused where it is not. The list's first
version matched a form anywhere in the bank, which flagged 된다 on the conversion row where it is
a fair mistake; addressing by row is what made the check mean something.

### Pictures that carry a number

Two exercises lean on their drawings for something the words do not say. 문법과 표현 1 연습 1 prints
only B's answer and a picture of the activity, and 문법과 표현 2 연습 1 keeps four of its six numbers
in the drawing only. Both name what the picture shows on its own 그림 line — 한국어를 공부하다, 커피 세 잔 —
and the 정답 settles it. 어휘 연습 3 prints a drawing beside each dialogue as well, but every blank
there is settled by words on the page. The first note on that exercise said "by the other
speaker's reply", which is true of two of its rows and not of the three whose cue is on the
gapped line itself: 아름다워요, 미끄러우니까, 시원해요.

### The drill cue is read aloud after the question

The 문형 연습 cutter needed one change from Unit 17's. 연습 1 prints its cue in brackets on the
student's line — (세 시간) — but the teacher reads it aloud straight after the question, so that
half of each exchange is two spans; the other three drills read one sentence in one breath. The
cutter is told how many spans each teacher half takes, and the check that the count landed
right is Unit 17's: the span in front of the 보기's cue has to be the 보기 marker, and it is —
0.44-0.46s in all four drills, a spread of 0.018. The item numbers reproduce across drills as
before, 0.288, 0.287, 0.384 and 0.392 seconds for items 1 to 4, each spread under 0.042. All
four pace bands bite.

### A note has to survive being translated

The same second reading rewrote about twenty notes that claimed more than the row shows. Two
kinds are worth watching for in the next unit:

* **A count that nobody made.** "The single most common slip in this exercise" and "the
  commonest wrong answer" were guesses dressed as measurements. They now say what can be seen:
  좋는다 is an easy slip because the sentence in front of it is full of verbs.
* **A gender the Korean never gives.** 그 사람, 히엔 씨 and 샤오밍 had become he and she in the English.
  The Korean does not say, so neither does the English: the name, or that person. Vietnamese
  pronouns carry gender and age, so an English "she" forces the translator into a choice the
  book never made.

## The order to do it in

Everything above is what to write. This is when to write it, and the order is
chosen so that the steps which can invalidate earlier work come first.

1. **Read the unit's answer key before writing any JSON.** What you are looking
   for is which exercises have one right answer and which do not — a checklist,
   an interview, a write-your-own, a row that ends in two empty frames. Those are
   the ones needing a change of shape, and settling the shape now saves writing
   rows you delete. Every change goes in `noteEn`.
2. **Cut the audio next, not last.** It is the step that can fail after
   everything else is already right, and the tone-pairing was got wrong twice
   before the speech-rate check existed. It also feeds back into the text: track
   2's dictated drills are printed with commas because that is what the recording
   does, and a drill whose teacher reads three words rather than a sentence is a
   different exercise on the page. Get the segment map from ffmpeg, work the spans
   out in a script, then shift the pairing by one and confirm the band widens.
3. **Write the rows against the key**, one exercise at a time. Invariable words in
   the template, so each choice carries only the decision.
4. **Write the distractors from the mistakes, then the explanation against the
   distractors** — in that order. Reversed, the buttons get invented to suit a
   note already written, and the note stops being about the mistake.
5. **Ask what the game already ships before drawing.** `sprites/catalog.json`
   maps `wordKo` to a path, so the icon for a word is a lookup. Unit 10 needed no
   new art at all. Draw a 16×16 only when nothing fits.
6. **Wire it**: a line in `workbookUrl()` (or `textbookUrl()`), an entry in
   `WORKBOOKS`, an entry in `HV_CATALOG_SOURCES`, and the unit's own test suite —
   plus, for a 교과서 bank, a row in the `BANKS` list inside `checkTextbookBanks` in
   `scripts/validate_content.js`, which is where the exercise and row counts are spelled
   out per unit. Upload and TTS harvest find the file by name and need no line, but
   nothing catches a missing `workbookUrl()` line, so do them together. The `BANKS` row
   is what makes the shared checks run at all: a bank left off it is validated by its own
   suite and by nothing else.
7. **Run the suite, then play it wrong on purpose.** The tests check the key, the
   art, the clips, the pace, and now that every recurring wrong answer is spoken
   to. What they cannot check is whether an explanation reads as help. Pick the
   distractors deliberately, on every page, and read what comes back.

Adding vocabulary or exercises to a unit already built is the same list from step
3, minus the wiring — and step 4 is still the one that decides whether the
addition teaches anything.

---

## The second bank: 교과서 pages beside 익힘책 pages

Unit 14 is the first unit with two banks on one desk, and they come from two different
books. `worlds/unit14-workbook.json` is the **익힘책** — its rows drill 러시아에 가다,
연애편지를 쓰다, 수료식에서 상을 받다, none of which appear anywhere in the 교과서.
`worlds/unit14-textbook.json` is the **교과서's** own 말하기, 읽기, 과제, 문화 산책,
발음 and 자기 평가 pages. Same file format, same renderer, same validator; the desk
menu is what tells them apart, at 📖 교과서 and ✍️ 연습 문제.

What that costs, and what pays for it:

- **They will reach for the same sentence unless something stops them.** Two books on
  one chapter drill one grammar point, and a learner who meets 먹으면 안 돼요 under two
  names has done one exercise and been charged for two. `validate_content.js` and
  `tests/test_unit14_textbook.js` compare the two banks: no shared exercise id, and no
  gapped line appearing in both. The 교과서 ids carry a `u14sgk-` prefix so the two are
  told apart at a glance, and the desk quiz counts as a third thing on the same desk —
  no filled sentence may already be one of its choices.
- **Pick the exercises the other book does not have.** Most of the 교과서 page asks you
  to speak, and the 익힘책 already covers 어휘 and 문법과 표현 in writing. What was left
  and is worth having: the two 듣기 sections, the reading passage, the 과제 conversation,
  the culture note, the 발음 rule, and 자기 평가 2, which is the only page in the chapter
  that puts all four patterns side by side.
- **A 듣기 page cannot be built from the unit pages alone.** They print the comprehension
  questions and not the words, so there is no way to key an answer — and guessing at a
  key is the one thing not on offer. The 듣기 지문 pages at the back are what make those
  two exercises possible, and they also supply the lines the answers turn on: rows 2-4 of
  듣기 1 and rows 3-6 of 듣기 2 are quotations, so the page is answerable from the
  recording rather than from an opinion. Wait for that page rather than inventing one.
- **The loader caches per url.** `deskBanks` is keyed by path; a single variable would
  have the second bank evict the first every time the desk opened, so both rows would
  refetch on every visit.
- **The harvest has to read both.** `collectWorkbookPhrases` matches
  `-(?:work|text)book\.json$`. The renderer plays a book clip where the content names
  one and a pre-rendered TTS clip otherwise, so a bank outside the harvest is a row
  whose play button does nothing — silently, on production only.
- **Audio on a row can be checked against the cassette.** Ten 교과서 rows name a
  recording, and six of them name a dictation clip whose text is written down in
  `worlds/unit14-cassette.json`. That makes "this mp3 is that sentence" a claim with a
  source, and the test asserts the clip's text really is the sentence the row builds.
  Attach clips that already exist rather than cutting new ones.

An exercise reshaped because the book asks you to speak still says so in `noteEn` — and
here that is nearly every one of them, so the test requires it rather than trusting it.

### Unit 10, the second unit with two banks

`worlds/unit10-textbook.json`: seven exercises, thirty rows, ids prefixed `u10sgk-`.
Two things about it did not carry over from Unit 14.

- **The 익힘책 had already taken more of the chapter.** Unit 10's 연습 문제 is twenty
  exercises covering 어휘 and all four grammar patterns — `N 중에(서)`, 반말,
  `V-(으)ㄹ래요`, `A-(으)ㄴ데/V-는데` — plus 문형 연습. What was left was 말하기 1,
  말하기 2, 읽고 쓰기, 과제, 문화 산책, 발음 and 자기 평가, and that is exactly the bank.
  `tests/test_unit10_textbook.js` section 3 checks it both ways: no gapped line shared,
  and no *section* of the chapter claimed by both banks. The second is the stronger
  check — it fails while the two banks are still merely adjacent, before they collide on
  a sentence.
- **The 발음 page is 의문문의 억양, and intonation cannot be written down.** Every other
  unit's 발음 section is a sound rule with a spelling consequence, so it could become
  dictation. A rising or falling pitch changes no letter at all, so this one became a
  listening exercise: the six sentences the book prints on tracks 10 and 11, and for each
  one, does the end rise or fall. The answers are not typed in — they are *derived*. A
  question carrying an 의문사 falls, one without rises, so `test_unit10_textbook.js`
  section 5 recomputes all six from the rule and compares them to what is keyed. An
  exercise that can contradict its own rule is the failure mode worth spending a test on;
  this one cannot. The seventh row keeps the page's own hedge — that many speakers now
  raise 의문사 questions slightly anyway — because a learner told only the rule will hear
  real Korean and think they misheard.

Two smaller things worth copying:

- **자기 평가 prints its answer key at the foot of the page.** That makes five rows
  checkable against the book rather than against judgement, and the test pins all five.
- **Four filled rows quote the tape word for word.** Where a row gaps a printed turn from
  track 04 or 07, the filled line has to equal that turn exactly, and the test compares it
  to `worlds/unit10-cassette.json` rather than to how it looked when it was typed. The
  other rows are substitutions and models, which the book prints but the tape never reads;
  those are not asserted against the tape and should not be.

The 듣기 pages were missing at first for the same reason as Unit 14's: tracks 08 and 09
print comprehension questions and not words, so nothing could key an answer until the 듣기
지문 page at the back was in. They arrived with Unit 15's on 2026-09-24 as three pages under
듣고 말하기 (printed pp.36-37), and the bank went from seven exercises to ten:

- **듣기 1** is the book's one question with its own ①②③ — 모범 답안 on printed p.267
  keys ② — and one row for each option's line on the tape: 피자 시켜 먹을까? (not in a
  restaurant), 불고기피자는 별로 안 좋아해 (he likes 불고기), 내가 주문할게 (she orders).
- **듣기 2** asks for three write-ins, and 모범 답안 gives all of them — 치즈피자, 콜라 /
  18,000 / 30 — so they are choices, and the wrong ones are the numbers a listener mishears:
  8,000 and 80,000 for 만 팔천, 13 and 40 for 삼십. The caller's order itself is a two-blank
  row on the counting words 판 and 병, since the page glosses 판 as the unit for pizza.
- **말하기** is a role-play with three menus, which has no key, and a box of four phrases
  for ordering by phone, which does. Three of them are rows, and two of the three are the
  pair that teaches 되 and 돼 from both sides — 지금 배달되나요?, 1인분도 배달돼요? — each
  offering its own key with the vowel swapped as the mistake.

Every clip a row named here used to be a whole track, so a label check stood in for Unit
14's clip-text comparison: `말하기 1 · track 04` over an mp3 that is `trk02` sends the learner
to the wrong page of the book and nothing on screen shows it. `validate_content.js` and the
test both require the number in a whole-track label to match the number in the filename, and
the track to be one the cassette carries. The 듣기 rows are the first here to play a single
line, so the suite now does both: a row names a whole track or one of the cassette's
dictation clips, and a clip has to say one of its row's filled lines in the voice that line is
printed in.

### Unit 13, the whole chapter rather than what was left

`worlds/unit13-textbook.json`: sixteen exercises, seventy-eight rows, ids prefixed
`u13sgk-`. Units 14 and 10 both took what the 익힘책 had not, and the result skips 어휘
and 문법과 표현 entirely. This one covers all eleven headed sections of the chapter,
including both, and the reason is worth stating: the 익힘책 for this chapter has
seventeen exercises on the same four grammar points, so "what is left" would have been
nothing. Overlap had to be managed rather than avoided.

What managing it looks like:

- **The 어휘 pages the two books have are different pages.** The 익힘책 drills 생활비 —
  집세, 교통비, 식비 and the four 요금 words. The 교과서 drills the six kinds of place to
  live and the six rooms of a flat, and the 익힘책 has neither. Where the sets would have
  met, they do not.
- **The four grammar points each get a page here as well, and the sentences are the
  book's own.** Every row is a 대화, a 예문 or a printed 보기 with the ending taken out,
  so the 교과서 rows are the sentences the chapter itself uses and the 익힘책 rows are its
  own exercises. The gapped-line check is what keeps that honest, and it fired once:
  `이 옷이 {} 모르겠어요` is 문법 1 연습 1 row 3 of the 익힘책 and was the fourth 예문
  here. It was replaced by the book's other 예문, and the `grammar` note now says where
  the missing one is drilled instead — which a learner comparing the two books will want
  to know.
- **An open question is still an exercise if the words are the point.** 어휘 1 is six
  photographs under 여러분은 지금 어떤 집에 살고 있습니까?, which cannot be marked. The
  six words can be: each row describes one and the other five stand as the wrong answers.
  The distinction is never the size of the building, so the descriptions say what actually
  separates them — 주택 has a yard, 빌라 is four or five floors, 오피스텔 is a building you
  may work in.
- **A floor plan cannot be drawn as a row of buttons.** 어휘 2 is one cutaway plan with
  six arrows into six boxes. Each arrow became a row described by the furniture the
  drawing puts in it — the shower and basin, the hob and sink, the sofa, the railing, the
  bed, the step where the shoes come off — in the order the arrows leave the plan. Same
  move as Unit 11's conjugation table, for the same reason.
- **A 모두 고르세요 question has no single answer, so turn it round.** 듣기 1 asks which
  of six statements about the woman's flat are true, and three of them are. Asking which
  of three is *false* keeps the book's own options and the recording still settles it.
  Question 2 is a single choice already and is used as printed.

The 발음 page is the one to copy. This chapter's rule is 유기음화 — a 받침 [ㄱ ㄷ ㅂ]
and a following ㅎ fuse into [ㅋ ㅌ ㅍ] — and it has a spelling consequence in both
directions, so the section became two exercises that face opposite ways:

- **규칙** prints the spelling and asks for the sound: `축하[{}]` → 추카. On every row
  the spelling itself is one of the wrong buttons, because the whole point is that what
  is written is not what is said.
- **연습** plays the tape and asks for the spelling: [바파고] → 밥하고. That is the
  direction that costs marks in a dictation, and it is the direction the book's
  listen-and-repeat cannot mark.

Both are checked from the rule rather than from the key, the way Unit 10's intonation
page is. `test_unit13_textbook.js` section 5 decomposes each keyed answer into jamo and
asserts that 규칙 keys a form carrying ㅋ, ㅌ or ㅍ and no surviving 받침-plus-ㅎ, and that
연습 keys the only choice that still has both. An exercise that can contradict its own
rule is the failure worth a test; neither of these can.

Two counts worth knowing before copying the shape. Thirty rows name a recording and
twenty-two of them a single cut line from `worlds/unit13-cassette.json`, which is what
makes the clip-text comparison possible on most of the bank rather than a sixth of it —
the sixty dictation clips were already there. And 생활비 is the one word two rows lean on
that is *not* a Unit 13 headword: it belongs to Unit 11's farm, with this chapter's own
track 38 line as its example sentence, and `validate_content.js` asserts the two units
share no headword. The test pins that as deliberate, so "a row uses a word with nowhere
to learn it" stays a false alarm instead of becoming one.

---

### Unit 11, and the overlap the gapped-line check cannot see

`worlds/unit11-textbook.json`: fourteen exercises, sixty-three rows, ids prefixed
`u11sgk-`. Ten of the chapter's eleven headed sections; 과제 is the one left out, and it
is left out because it has no key of any kind — see below.

The thing worth carrying forward is a **third** comparison between the two banks. Unit 13
showed that a shared *gapped sentence* is a collision. Unit 11 shows that two banks can
reach the same **answer** by two different sentences, and the gapped-line check sees
nothing:

- 익힘책 `u11-grammar-3-1` row 4: `토요일에는 사람이 많으니까 다른 날 {}?` → 보는 게 어때요
- 교과서 `u11sgk-gram-3` row 1 as first written: `치과에 가 {}?` → 보는 게 어때요

Different sentences, different gaps, same button. A learner who presses 보는 게 어때요 twice
has done one exercise. The builder now compares answer texts as well as gapped lines, and
`test_unit11_textbook.js` section 3 keeps it — the fix was to move the gap so the answer is
가 보는 게 어때요, which the 익힘책 does not have.

One overlap survives, and the difference between a decision and a gap is that it is named:
the 자기 평가 answer key printed at the foot of p.66 gives 병원에 가는 게 어때요, and the
익힘책 uses that exact sentence for 문형 연습 3. The book chose it, so it stays — in an
allow-list of one, with a second assertion that the overlap is *still real*, so the
allowance cannot outlive the reason for it.

Three more things this unit settled:

- **Sometimes the right move is to leave a whole section out.** 과제 is a role-play from the
  activity sheets at the back: the 환자 sheet (printed p.226) is fifteen pictures with no
  words at all, and the 의사 sheet (p.227) is twelve prescription cards — a department, a
  dosage in words, a 주의사항 picture marked ○ or ✗. The two sets are drawn at random and
  the book prints no pairing between them, so there is nothing a screen could mark.
  Inventing a pairing would have been inventing a key. 어휘 2 and 어휘 3 are absent for the
  opposite reason — the 익힘책 has all six hospital departments and the whole medicine set
  with its four verbs — and `omittedNote` says which and why for all three.
- **A 발음 rule with two steps can still be checked from the rule.** Unit 11's is 종성 규칙
  후 연음: the 받침 is pronounced [ㄱ], [ㄷ] or [ㅂ] *first*, and only then crosses to the
  vowel after it — so 잎 위 is [이뷔] and not [이퓌]. That is computable. Decompose each
  keyed answer into jamo and look for a stop 받침 immediately before a syllable whose
  initial is ㅇ: the spelling has that boundary and the pronunciation cannot, because the
  boundary is exactly what the liaison consumed. Strip spaces first — the whole point is
  that the rule crosses a word boundary. 규칙 keys a form without the boundary and offers
  the spelling as a wrong button; 연습 goes the other way and keys the spelling, with
  exactly one wrong button being the sound written down. Both directions are asserted, and
  injecting a swapped key breaks both.
- **A missing tape can be the reason a page does not exist yet.** Unit 11's cassette stopped
  at track 19 and the 발음 page plays 20 and 21, so 발음 연습 was unbuildable until those
  two were cut. Nothing had flagged it: the cassette's own dictation filter already named
  종성 규칙 후 연음 as the unit's 발음 point, so the page had been read and the recordings
  simply never made. Before starting a 교과서, check the cassette covers every track the
  chapter's pages name — `worlds/<unit>-cassette.json` against the track numbers printed
  beside each 준비 and 연습.

### Unit 16, where the 익힘책’s own check was the wrong check

`worlds/unit16-textbook.json`: fourteen pages, fifty-nine rows, ids prefixed `u16sgk-`, all
eleven headed sections of the chapter, twenty-five rows carrying a recording. Four things
this unit settled that the earlier ones did not.

**A grammar note that quotes nothing can still be about its own row.** The 익힘책 suite for
this unit checks that every `grammar` line quotes something from the sentence or the buttons
above it, matched on two-syllable runs, and that check earned its place — it found four notes
genuinely written for a different item. Carried across to the 교과서 it fails on fifteen rows
and **every one of the fifteen is correct**: the textbook’s notes name a verb in the
dictionary form where the row prints it inflected (맡기다 against 맡길, 옮기다 against 옮깁니다,
보다 against 봐), or a single-syllable piece of the Yut board (도, 개, 걸, 모), or a bare jamo on
the 발음 rule row. Loosening the match to one syllable passes everything and means nothing. A
discriminative version — no note fits another row better than its own, counted in shared
bigrams — fails on twelve, because on a page where five rows drill 대신 a note that says 대신
fits all five equally well.

So the property is **not checkable in a bank whose pages each drill one form**, and the honest
move was to say that in the suite header rather than pad fifteen accurate notes until a regex
went quiet. What replaced it checks the content instead of the prose: every keyed answer on a
문법과 표현 page uses that page’s own form, and the four 자기 평가 rows use the four different
forms one each. Plus the cheap one the prose version was really reaching for — no two rows
carry the same note.

**A dictation clip is not always a line.** `tb_build.js` attaches audio by filling each row
with its own answer and matching the result against the sixty-five clips already cut for the
cassette, so a row can never point at a clip of a different sentence. Two rows came out
silent, and the reason is worth knowing: both print a sentence the cassette’s `splitAtClause`
had already cut in two —

```
부모님 일도 좀 도와 드리고 | 가까운 곳으로 여행도 갈까 합니다.        d41 + d42
제가 추석 연휴에 이틀 정도 여행을 가는데 | 고양이를 맡길 곳이 없어서요.  d46 + d56
```

The clips are right and the rows are right; there is simply no single clip holding what the row
prints. Both were given the whole track instead, and both `noteEn` lines now say so. **Half a
sentence labelled as the line is worse than the whole tape**, and cutting a fresh clip just for
the 교과서 would have broken the invariant the build script exists for: every clip a 교과서 row
names is one the cassette suite already checks.

**발음 is checkable arithmetically.** Unit 16’s page is 유음화 — a ㄴ next to a ㄹ is read [ㄹ].
The suite reads the 받침 and the following initial straight off the Unicode syllable index
(`(initial × 21 + medial) × 28 + final`, based at U+AC00) and asserts three things per row: the
printed spelling has a ㄹ beside a ㄴ, the keyed reading has the ㄹㄹ run the rule produces, and
**no wrong button has it**. The third is what makes the page a pronunciation question rather
than a spelling one — the same shape as the ㅎ check in Unit 13. Spaces are stripped before the
syllables are read, because 일 년 and 갈 날만 are two words in writing and one run in sound,
which is exactly what two of the four rows are for.

**Translate by fragment, not by retyping the key.** The catalogue for this bank is 250 strings
and fourteen of them are three-hundred-character notes with Korean inside them. Retyping one as
a key, one character out, is a silent miss: the entry answers nothing, the string stays English,
and only `i18n_report` ever notices. So the Vietnamese is written as
`[field, a fragment of the English, the Vietnamese]` and a generator resolves each fragment
against the scan — refusing anything that matches zero or more than one string, refusing a
string claimed twice, and refusing to write anything at all until every scanned string is
accounted for. It emits the part files with **exact** keys, so the both-directions check in the
build script stays a real check rather than a tautology.

And one thing no structural check would ever have caught: the 과제’s grammar note listed the
five Yut throws as 도 걸 개 윷 모 against distances 1 to 5, where the page prints 도 (한 칸),
개 (두 칸), 걸 (세 칸). The row’s own `why` had it right and the `grammar` line beside it had it
wrong. It surfaced because the page image was opened again before the note was translated —
which is the argument for translating from the book rather than from the English.

### Unit 17, a chapter whose questions are pictures

Fourteen pages, 60 rows, printed pp.180-199. More of this chapter lives in its illustrations
than in any unit so far: 어휘 1 is eight drawings of things going wrong, 어휘 2 and 3 are
colour and pattern swatches, and three of the exercises on pp.192-195 ask the learner to pick
a photograph. A greyscale scan settles none of it.

**The rule that came out of it:** a question carried by a picture is asked in the words that
separate the pictures, and the answer comes from 모범 답안 rather than from the scan. The
three photographs of a camera become 까만색 카메라에 빨간색 끈이 달려 있는 사진 against two
others that differ in exactly those two colours; the three drawings of a burglar become three
outfits that differ in which garment is which colour. What is being decided is unchanged —
the notice says 색깔은 까만색이고 … 빨간색 끈이 달려 있습니다, and that is still what decides
it — and only the looking is gone. Both `artNote` and the suite record which questions those
are.

For the 어휘 pages there is nothing to convert, because the drawings *are* the exercise. Those
two pages are rebuilt out of sentences the chapter later says out loud: 가방을 잃어버려서
왔는데요 off track 77, 비행기를 놓칠 뻔했어요 off track 74, the two examples under 문법과 표현
1·2, a substitution column from 말하기 1, the first sentence of the 읽기 notice.

### "The row's line" is not always the line with the gap

The audio rule from Unit 16 — fill the row's gap with its own keyed answer and require the
result to be the dictation row's sentence — fails on a 발음 page, which prints the sentence on
one line and asks for its pronunciation on the next:

```
  한라산에 가 봤어요?
  발음  한라산 ⟶ {}
```

The clip plays the sentence, which is line 1, and the gap is in line 2. So the check became
*one of the row's lines, with the gap filled if that line holds it* — and the speaker
comparison moved to whichever line matched. Two rows that were longer than their clip were
split into the two printed lines instead of being left half-matched, which is the same
decision Unit 16 made when a dictation cut had halved a sentence.

### 과제 with no answer to any part of it

Unit 16's 과제 page had content to gap. Unit 17's (p.196) is a group activity: receive a set
of picture cards from the worksheet pages, arrange them into a story, tell it to the class.
The book prints the instructions and nothing else — no key, no model, not even a 보기 bubble.
It is left out whole and `omittedNote` names it alongside the five other pages with no
answer, so the bank has thirteen sections and not fourteen.

### The fourth thing on the desk, and why three units’ quizzes lost their pictures

Unit 16 is the first unit whose 퀴즈 was written after both exercise banks rather than before
either, and that changes what it should contain. A quiz written first is a syllabus; written
last it is **revision**, which gives it one obligation the banks do not have — not to be a third
copy of a row already done twice. `worlds/unit16-desk-quiz.json` is thirteen rows, ten to a
sitting, and both `tests/test_unit16_desk_quiz.js` and `validate_content.js` compare every
button against every filled sentence in the 교과서 and the 익힘책.

The suite also checks the direction that matters more, and that nothing else was checking:
**no wrong button in the quiz is a keyed answer in either bank.** A distractor that is correct
somewhere else on the same desk means one of the two is lying, and the learner meets both in
the same session.

Two smaller properties worth copying to the next unit’s quiz. The key has to use all four
letters with no letter carrying more than five of thirteen — a key that reads BBBBCBBB teaches
the shape of the answer rather than the answer. And **the harvest must never speak a form the
quiz prints only to be rejected**: `walkKo` collects `node.ko`, a quiz’s choices are plain A-D
strings, so nothing of a quiz is spoken and nothing should be — 만드까 and 춥을 테니까 are on
those buttons precisely because they are wrong. The suite names the nine and asserts they are
still printed and still silent.

#### validateQuiz drops what it does not know, and that is where the art went

Units 11, 14 and 15 have `art` on no row of their desk quizzes and `sessionSize` 5 where they
were written with 10 — five of `validate_content.js`’s failures on main are exactly this. The
PNGs were never deleted. `validateQuiz` in `admin/lib/world.js` rebuilds a quiz from a fixed
field list:

```js
questions: qs.map((q, i) => ({ id: …, q: String(q.q), a: q.a, choices: { A, B, C, D } }))
```

`art` is not in that list, so one save through the admin panel drops it from every row in
silence, and `sessionSize` is clamped by `Number(body.sessionSize) || 5`. `validateWorkbook`
has the same shape and drops `example.why` the same way, which is why the 익힘책 banks are
written directly and the validator is run as an acceptance check rather than as a filter.

So: **write the JSON, run the validator over it; do not round-trip a bank through the panel.**
And because a note can vanish the same way an `art` field did, Unit 16’s quiz carries an
`artNote` saying why it has no pictures and which four would go where — and the suite asserts
that note is still there, so the next silent strip fails rather than passes.

[docs/unit16-art-notes.md](unit16-art-notes.md) collects every deferred drawing for this unit
in one place: what to draw, which bank wants it, and what it would replace.

### Unit 18, the book's last chapter, and a poem that stays in the book

Thirteen pages, 57 rows, printed pp.202-221, with 모범 답안 on printed p.268. The page map holds at
printed = image + 8, as it did for Unit 17, but images 192-193 are a two-page 번역 insert that
carries Unit 17's vocabulary, so the first page checked after Unit 17 looks like back matter
and suggests the book ends there. It does not. The chapter has no 자기 평가, its 과제 takes two
pages, and it closes on 발음.

**The poem.** 문화 산책 on p.220 prints 「눈 내리는 밤」 by 강소천, who died in 1963, so it is in copyright
in Korea until 2033. The page is built from its frame alone — the 준비 question, the 생각 나누기
instruction and the title, which is all a learner needs to know the season — and both
`validate_content.js` and the suite hold it to a closed list of those three sentences, so no
line of verse can be added by a later edit. Unit 16 made the same call about the 강강술래 lyric,
which was there to be read aloud rather than answered.

**Write-in answers become choices.** 듣기 1 asks for three words to be written in and 듣기 2's last
question for a sentence; 모범 답안 gives all of them, and they are offered as choices. For the
sentence, the wrong choices are two other lines off the same tape — the presenter's farewell
and 주디's own regret — so a learner who picks one has heard it, just not as the answer.

**One passage, two pages, two registers.** The 읽기 on p.216 is written in the plain style, and
the 발음 page on p.221 reprints it in 합니다체: 나는 작년에 한국에 온 적이 있다 on one, 나는 작년 여름에 한국에 온 적이 있습니다 on
the other. A note that quotes "the first line" has to quote the page its own row is on. One
draft quoted the 발음 page's line in a note on the 읽기 page, and it was the transcription in the
unit's notes that caught it, not a check.

**A wrong button that is right Korean.** The suite pins six: 기억에 남은 것, 지나가는 것 같아요, 학교이다, 대하셨다
and 늘어났다, turned down while the pages were written, and 친구들이 많이 아쉬울 것 같아요, which shipped in the
first build and came out on the second reading. 아쉽다 can take the people you will be short of,
so it is not wrong enough to be a wrong button; 후회될, which cannot take friends at all, is.

**The 발음 page teaches nothing new.** Every chapter before this one had a 발음 rule of its own,
even where Unit 10's — intonation — was one no dictation could catch. This one reprints the 읽기
passage with twenty-two words underlined, each a change an earlier unit taught, so the rows
take five of them, one per rule — 비음화, the tensing after -(으)ㄹ, ㅎ 탈락, 격음화 and the tensing after
a closed ㄱ — each with its own line off track 90.

The unit's 퀴즈 is sixteen rows, ten to a sitting, written after both banks the way Unit 16's
was, and no button on it is a sentence either bank already gaps.
[docs/unit18-art-notes.md](unit18-art-notes.md) lists every row that currently works around a
missing picture.


---

---

## Unit 12, the 교과서 and the 퀴즈 that closed the desk

Unit 12 was the one unit of nine whose desk offered a 익힘책 and nothing else. Two banks close
that gap: `worlds/unit12-textbook.json`, sixteen pages and 73 rows with ids prefixed
`u12sgk-`, covering all eleven headed sections of printed pp.68-87; and
`worlds/unit12-desk-quiz.json`, seventeen rows, ten to a sitting, written after both banks.
In the student book the image index is the printed page here (image 70 is printed 70), and
모범 답안 on printed p.267 (image 257) answers 12과 twice: ② for 듣기 1, ④ for 듣기 2.

### An answer key printed upside down

The 자기 평가 page prints its four answers upside down at the foot of p.87 and they are hard
to read at display size. PowerShell's `System.Drawing` is on every Windows machine and crops
and rotates a page JPEG in a few lines (`Graphics.DrawImage` onto a new bitmap, then
`RotateFlip(Rotate180FlipNone)`), so there is no need for an image tool or a photograph. The
key is 피곤해 보여요, 즐겁게, 잘 먹는 편이에요, 한국 사람처럼 — one per form in the page's box.

### A cue in brackets goes in the headline, not the line

Several pages give the word a row starts from in brackets — (진하다), (피곤하다) — and a line
that carries it gets the bracket read aloud by the TTS harvest, which speaks every filled
line. The cue goes in `phraseKo` instead: `저는 눈썹이 ___ 사람이 좋아요 (진하다)`. The learner
sees it above the row, and the line speaks as a sentence.

### Wrong buttons that are right Korean

The 익힘책 for this unit offered A-게 보이다 as a mistake on six rows — 길게 보여요, 넓게 보여요,
맛있게 보이네요, 피곤하게 보이네요, 힘들게 보이네요, 재미있게 보여요 — with notes saying it
describes "how the looking is done". It does not: the National Institute of Korean Language
answers that -게 보이다 and -아/어 보이다 are both correct (온라인가나다, qna_seq 316972), and
native speakers say 날씬하게 보이는 옷 every day. The chapter practises -아/어 보이다, which is a
reason to key it, not to mark the other wrong. The same pass found five more sayable
distractors — 방이 커 보여요, 말라 보여요, 옷이 두꺼워 보이네요, 단어가 많아 보이네요 (B's 네
answers either remark), and 못 먹는 편이에요 after 시간이 없어서, which is if anything the more
natural of the two. All eleven were replaced with forms that are wrong in their slot — the
wrong vowel (길아), the modifier before 보이다 (넓은 보여요), 보다 for 보이다 (피곤해 보네요),
the honorific on oneself (안 먹는 편이세요) — and both suites pin them out.

Some forms were considered for the 교과서 and turned down for the same reason, and
`tests/test_unit12_textbook.js` pins them too: 정확히 beside 정확하게, 편이어서 beside 편이라서,
멋지게 beside 멋있게, 대학생으로 보여요, and 어리어 beside 어려 — 한글 맞춤법 제36항 lets ㅣ + 어
be written either way, so the uncontracted form is not a mistake, where 비싸아 (ㅏ + 아) and 크어
(ㅡ dropped) are.

### 받침 ㄻ, checked from the syllables

The 발음 page's two rules are 표준 발음법 제11항 (ㄻ before a consonant is [ㅁ]) and 제24항 (a
ㄱ ㄷ ㅅ ㅈ after a ㄴ- or ㅁ-final *stem* is tensed — which is why the noun 삶과 is [삼과] and
the verb 닮고 is [담꼬]). The page does not state the vowel case, but prints it in red:
before a vowel both letters are heard and the ㅁ moves across, 닮았어요 [달마써요] (제14항).
The suite recomputes every keyed sound from the spelling's syllable index, and every row
offers the spelling itself as a wrong sound. The 연습 page runs the other way, sound to
spelling, and has a trap of its own: [담꼬] and [담는] are also 담다, to put something in, so
the sentence has to decide — 담고 is a wrong button that is a real word.

### One page whose wrong buttons are its other rows' answers

어휘 2 puts six personality words under six drawings. The drawings are 그림 lines saying what
each shows, and a row's wrong word is the drawing opposite it — 남성적이다 against 여성적이다 —
so on this one page a wrong button can be another row's right answer. It is named in the suite,
as Unit 16 and 17 named theirs, and checked from the other side: every button is one of the
page's six words.

### A quiz key with no pattern and no longest answer

The quiz key first came out B D A C four times over. The desk shuffles questions, but a
patternless key is the safer thing to ship, so the builder moves each answer to a chosen
letter, and the suite refuses a key that repeats with a period of four or less. It also counts
how often the right answer is the single longest option — the oldest test-taking trick — and
refuses more than chance would give; five options were rebalanced to get there.

## A 듣기 page is answered off the tape, not off the screen

Every unit bank draws a row's English gloss beside it before the row is checked. On a grammar
page that is the help it was written as: the learner knows what the sentence means and has to
build the form. On a 듣기 page it is a transcript of what the tape is about to say — "I studied
hard, but I did badly in the exam" beside a blank whose buttons are 잘 봐서 / 안 봐서 / 못 봐서
— so every one of the fourteen 듣기 pages could be done with the sound off. And the note above
the rows is read before anything, so three of them handed over the key outright ("모범 답안
gives ②") and a fourth listed the three answers of its first three rows.

- **`holdGloss` on the page.** The exam bank already held its gloss back until the row was
  checked, bank-wide. A page can now ask for the same: `ex.holdGloss` is read by the renderer
  beside `bank.holdGloss`, and `validateWorkbook` keeps it on a page, since it rebuilds each
  page from a fixed field list and would otherwise drop it on the first save. Every 듣기 page
  carries it; no other page does, because elsewhere the gloss is the help.
- **The note says what the page is, not what the answers are.** "Row 1 is that question, with
  모범 답안 on printed p.267 as its key" tells the learner where the key comes from without
  quoting it. A note may name a row's buttons — "long or short, permed or straight" — so long
  as it names them all.
- **Watch the other rows as well.** A context line that quotes the tape can answer a different
  row. 모두 18,000원입니다 is the natural lead-in to Unit 10's time question, and it would have
  answered the price, two rows above; so that row has no lead-in. Every row is on screen at
  once.

`tests/test_listening_pages.js` drives the shipped renderer and checks all of it: no gloss on a
듣기 page until the page is checked, all of them afterwards, the gloss still up front on a
grammar page, no note stating a circled key or quoting an answer without its other buttons, and
the flag surviving a save. Against the old renderer it fails on the three hold checks, and
against the old notes on four pages. `validate_content.js` holds every 듣기 page to the flag
and to a recording on every row.

## Unit 15, 듣고 말하기, and two pages the scan does not have

`worlds/unit15-textbook.json` gains 듣기 1 and 듣기 2 (printed pp.148-149, tracks 58 and 59),
thirteen pages and fifty-five rows in all. Two things were particular to it.

- **The chapter's grammar was already drilled five times over.** Between the 익힘책, 문법과
  표현 1-2, 말하기 1 and 자기 평가, 오기 전에, 졸업한 후에, 먹게 됐어요 and 익숙해졌어요 are keyed
  again and again, and the tape uses all of them. So the 듣기 rows gap what the tape is
  *about* — which dream, whose, how many staff, how many years — and leave the grammar in the
  line around the gap, where it is heard in use instead of chosen a sixth time.
- **The wrong buttons include the 준비 pictures.** The page opens on drawings of a police
  officer, a scientist and a doctor, and a learner who has just talked about them half
  expects to hear them; 경찰이 and 과학자가 sit among the dreams the tape does mention.

The one printed section still missing is **말하기 2 on pp.146-147**, and it is missing from
the scan, not from the book: the two pages were stuck to p.148 when the student book was
scanned, and the edge of p.146 shows under the page number on image 140. Its dialogue is on
the tape and in `worlds/unit15-cassette.json` (track 57, from a photograph of the page that
arrived on 2026-09-06), but the 연습 columns under it are not, and a 말하기 page without its
연습 is a transcript. Build it from the page, not from the tape.

## A third kind of bank: the exam world

`worlds/topik2-questions.json` is the same file format again, but the world behind it is not
a chapter of anything. TOPIK II is a *format*, not a syllabus, so this bank breaks three
habits the unit banks keep — each on purpose.

- **It has no fixed size.** Questions arrive one at a time, so there is no "this chapter has
  N rows" number to pin. `validate_content.js` and `tests/test_topik_map.js` pin the shape of
  a row instead: four choices always (TOPIK prints four; three means a transcription dropped
  one), a keyed answer among them, and `en` / `why` / `grammar` on every row with the `why`
  over eighty characters. That floor is not decoration — **the explanation is the product**
  of this world, and a one-line note is a question filed rather than taught.
- **Exercises group by question type, not by arrival.** 빈칸 넣기, 내용 일치, 주제 고르기 and
  so on, with rows accumulating inside. The desk list therefore stays short however many
  questions land, and working a type in a block is how TOPIK is actually revised.
- **Overlapping vocabulary is allowed, and is the point.** `worlds/topik-2.json` may list a
  word `levels.json` or a unit already teaches. This is a personal study room: a word met in
  an exam question belongs in the exam room whether or not it was first met on a farm. It
  costs nothing, because `srsData` is keyed by the Korean word **globally** — a repeat shares
  one card rather than making a second — and `srsDueWords()` dedupes before planting.
  `tests/test_topik_map.js` section 3 drives both of those in a VM so the allowance is
  asserted rather than assumed, and so nobody later "fixes" it into a defect.

Two traps this world found, both now guarded:

- **`deskQuizUrl()` used to end in a bare `return '/worlds/unit10-desk-quiz.json'`.** Any
  world with a desk and no quiz of its own was silently served Unit 10's 퀴즈 — a screen full
  of 10과 food words on a map with nothing to do with 10과, working perfectly and asking the
  wrong questions. Every branch now names its own world and the function returns `null`
  otherwise, and `openStudyDesk` only builds a 퀴즈 row when there is a quiz to open.
- **A world with an empty `words` array killed manual planting.** `getUnlockedWords()`
  returns only `lesson.words` on a world level, and `_pickWord()` hands back `undefined` from
  an empty pool. An empty world list now falls through to the global pool, which on an exam
  map is the right pool anyway. Automatic review planting never needed this: it goes through
  `srsDueWords()`, which has always walked every unlocked level.

### Two study aids the exam world carries

Both are small, both are opt-in, and both are the kind of feature that can go silently inert
— so `validate_content.js` and `tests/test_topik_map.js` assert each one is actually wired.

**Hover a hard word in the explanation and it tells you what it means.** After a row is
checked, `wbApplyGloss()` walks the text nodes of `#wb-explain` and wraps every headword the
current world teaches in a `.wb-gl` span carrying the gloss. Three things about it:

- **The vocabulary list is the dictionary.** There is no second list to keep in step: the
  words a question brings in are the words that become hoverable, so the feature gets better
  on its own as the world fills up. It applies to the unit banks too — Unit 10's 읽고 쓰기
  explanation picks up two dozen glosses at about one per hundred characters, which is sparse
  enough to still read as prose.
- **It runs over text nodes, not over strings.** The corrected sentence arrives from
  `wbLineHtml` as markup, and matching Korean inside a string of HTML would eventually wrap
  something that lives inside an attribute. A text node cannot contain an attribute, so that
  class of bug is gone rather than guarded against.
- **A word can list the shapes it wears.** 썰렁하다 never appears as 썰렁하다 — it turns up as
  썰렁한 — and getting there by rule needs a conjugator. So a word entry may carry
  `forms: ["썰렁한"]`, and the index takes those as extra keys. Anything under two characters
  is dropped, because a one-syllable key matches half the sentence; the validator rejects a
  short form rather than letting it look like it works. Longest match wins, so 재래시장 is
  explained whole instead of as 시장.

**A bank can hold its translation back until the row is checked.** `"holdGloss": true` on the
bank. On a textbook page the English beside the sentence is a help; on an exam question it is
the answer — a gap-fill testing V-고 for sequence is over the moment the gloss says "put on
thick clothes **and** went out". Off by default, so the unit banks keep the behaviour they
were written for, and the flag survives `saveWorkbook` rather than being normalised away.

---

## Before committing

```bash
npm run check && npm run validate && npm test && npm --prefix admin test
```

The unit suites are the ones that matter here — `tests/test_unit14_workbook.js`
and `tests/test_unit10_workbook.js`: textbook answer keys, the interaction, the
art, the clips, the speech-rate check, and that every wrong answer a page leans
on is spoken to somewhere on it.
`npm run test:desktop` needs Python, which is not on every machine.

---

## Vercel's routing, measured twice

Two limits shape `api/` in ways nothing local can show, and both have now been hit on
production more than once. They are written down here because each cost a deploy cycle to
rediscover, and the second one had already been discovered and reverted before
(`232df0b`, "Vercel has no catch-all here") without leaving a note where the next person
would look.

- **Twelve serverless functions on the Hobby plan, and the project uses eleven.** Crossing it
  does not fail a test: the build fails on Vercel while CI stays green and nothing ships. That
  is why `api/unit10/[kind].js` serves three routes and why the whole admin API is one
  function. `validate_content.js` counts the files under `api/` that are not underscore-
  prefixed and fails at thirteen.
- **A `[...path].js` catch-all matches exactly one segment here.** `/api/admin/content`
  answers; `/api/admin/content/levels` is a platform 404 that never reaches the file. And
  `req.query.path` arrives empty, so the handler has to read `req.url` as well. The fix is not
  to fight it: the content key rides in `?key=world/topik-2`, where depth cannot go wrong.

Two smaller ones from the same afternoon:

- **`vercel.json` is validated against a closed schema.** JSON has no comments, and an
  `_comment` key on a rewrite does not get ignored — it fails the build, with a status link
  pointing at the configuration docs rather than at the line. Guarded now.
- **`cleanUrls: true` 308s anything ending in `.html`,** so a rewrite whose *destination* ends
  in `.html` dead-ends. `/admin/` had been returning "The page could not be found" for this
  reason while every asset beneath it served fine. Also guarded.

The rule these share: a failure that happens after the tests pass needs an invariant of its
own, because nothing else in this repo will ever see it.
