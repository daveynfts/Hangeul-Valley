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

The apostrophe is the curly one.

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

## Two traps that fail silently

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
   `WORKBOOKS`, and the unit's own test suite. Upload and TTS harvest both find the
   file by name, so there is nothing to list — but nothing catches a missing
   `workbookUrl()` line either, so do the three together.
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

The 듣기 pages are still missing for the same reason as Unit 14's: tracks 08 and 09 print
comprehension questions and not words, so nothing can key an answer until the 듣기 지문
page at the back is in.

Every clip a row names here is a whole track, never a dictation clip, so a label check
stands in for Unit 14's clip-text comparison: `말하기 1 · track 04` over an mp3 that is
`trk02` sends the learner to the wrong page of the book and nothing on screen shows it.
`validate_content.js` and the test both require the number in the label to match the number
in the filename, and both require the track to be one the cassette actually carries.

---

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
