# The cassette player, and cutting a book track for dictation

Written after Unit 11, which put the textbook's own recordings on the farm as a
station with two modes: play a track through with the script alongside, and take
one sentence at a time as dictation.

Everything the learner sees lives in `worlds/<unit>-cassette.json`. The station is
a world-pack entry like any other; the screens are in `js/ui.js`, the sprite is a
matrix in `js/scenes/farm.js`, and `tests/test_unit11_cassette.js` is the contract.

The workbook pipeline is in [workbook-exercises.md](workbook-exercises.md) and most
of it still applies — read the source before writing JSON, cut the audio second,
write the explanation against the mistake. What follows is only what is different.

---

## Which sentences become dictation

Not the whole track. A dictation set is a curation, and saying what the rule was is
part of shipping it — the rule rides in the content as `dictation.filter` and is
printed on the page.

Unit 11's rule: keep a line when it is a whole sentence someone would say, is 5–22
syllables, **and** carries something you can only write correctly if you know
something — the unit's grammar, or a gap between sound and spelling, or a unit
headword. Drop fixed courtesies (`안녕히 계세요`), bare acknowledgements (`그래요?`),
prices read aloud, anything under about five syllables, and grammar that belongs to
another unit. 25 of roughly 40 printed lines survived that.

**The sound-versus-spelling half is where the value is**, and it is not an accident
that it dominated: Unit 11's own 발음 section is 종성 규칙 후 연음, so 18 of the 25 rows
turn on a liaison or assimilation. `입맛도` is said [임맏또] — three changes, none of
them written. That is a dictation exercise. `안녕히 계세요` is not.

**Look at the back of the book before writing a track off.** The unit pages print only
the comprehension questions for their 듣기 sections, which is why Unit 11's tracks 18-19
and Unit 13's 38-39 shipped listen-only. The 듣기 지문 pages at the back print the full
transcripts, and they turned four dead tracks into 40 more dictation sentences and
doubled Unit 11's set. They also settle the book's own answer keys, which is a useful
cross-check: 남자는 아침마다 두 시간씩 운동을 합니다 is on the tape, verbatim.

**A track with no printed script cannot supply dictation at all.** Unit 11's tracks
18 and 19 are the 듣기 sections: the book prints the comprehension questions and not
the transcript, so there is nothing to check an answer against. They ship as
listen-only, and the empty script pane **says so** — `noteEn` on the track — because
a blank pane reads as a bug.

**A printed turn longer than the cap is split at its own clause boundary**, never
trimmed. Four of Unit 11's rows are halves of a turn; each names its parent in
`splitFrom`, and the test asserts the child really is a substring of it.

---

## Cutting the audio

`silencedetect` again, but the settings are **per track shape**, not per track pack:

| shape | noise | d | why |
|---|---|---|---|
| grammar box (2 lines) | −35dB | 0.35 | long pauses, quiet floor |
| dialogue (8–11 turns) | −40dB | 0.30 | pauses run 0.31–0.80s inside a turn |

At `d=0.35` the whole 46-second pharmacy dialogue came back as **one span**, with no
error — the pauses are shorter than the window. Sweep the threshold before believing
a segment map: `-50` through `-20` at `d=0.30` gave 19–20 silences where `d=0.35`
gave none.

**A turn is not a span.** The narrators pause at sentence and comma boundaries
inside a turn, so ten printed turns arrive as eighteen spans, and pairing them
one-for-one produces 25 and 76 syllables per second — which is how you know. What
separates the two kinds of pause is their length, cleanly:

- between turns: **1.00–1.39s**
- inside a turn: **0.31–0.80s**

Group on a 0.95s gap and ten turns fall out of eighteen spans exactly. The same
threshold gave eight turns from twenty-one spans on the other dialogue.

That grouping is also what makes sub-turn cutting possible, which the curation
needs: `그럼 이 약을 한번 드셔 보세요. 식후 세 번, 여덟 시간마다 드시면 돼요.` is one printed
turn and two dictation rows, and its internal spans land exactly on the sentence
boundary.

**The turn gap is per track too.** Unit 11 grouped on 0.95s; Unit 13’s track 37 has
within-turn pauses at 0.952s and 0.987s and needs 1.00s — at 0.95 it gives 12 turns for
10 printed lines. Read the gap list before trusting a threshold: the real turn breaks
clustered at 1.007s and above, the within-turn pauses otherwise topped out at 0.847s,
and the two strays sat in between. Do not tune until the count matches — regroup, then
let the reading pace confirm it.

**A short span between items may be the item number.** Unit 13’s two 발음 tracks read
일/이/삼/사 before each line, which arrive as 0.27–0.40s spans. Counting those as turns
made track 41 look like ten turns for five lines — as if each line were read twice. It is
not; each is read once, and the numbers are the difference.

**Reference spans by index, never by timestamp.** `scripts/`-side, the cut list is
`{id: [track, firstSpan, lastSpan]}` and the times are re-derived from ffmpeg on
every run. A transcribed number is a number nothing can check.

**One clip is one sentence, and nothing but that sentence.** Two things break that if
you let them:

- **A row holding two sentences.** Seven did. A learner replays a dictation row several
  times, so every replay made them sit through a sentence they were not being asked to
  write. Splitting is the same pace-minimising partition used to align the 듣기 tracks,
  applied to the row's own sub-spans, so the cut lands where the narrator paused rather
  than where the punctuation falls. A row whose narrator ran the sentences together
  cannot be split; report it rather than cutting mid-breath.
- **Silence inside the clip.** A clip cut as one slice from its first span to its last
  carries the original pauses: one Unit 11 row ran 5.45s of clip around 3.75s of speech.
  Rebuild from the voiced spans alone, joined by a fixed 0.18s breath. Across both units
  that took the mean clip from 3.0s to 2.7s and the longest from 6.09s to 5.40s, and what
  is left over the speech is now 0.3s of pad rather than seconds of dead air.

**Filter the parts again after splitting.** Mechanical splitting produces fragments the
unit's own rule excludes — 왜요? at two syllables, 아니에요. at four, 어서 오세요. a fixed
courtesy. Three were dropped rather than shipped as exercises with nothing to decide.

**And write each part its own note.** A part cannot inherit its parent's: half of them
would explain a sound change that is in the other half. 목이 많이 부었네요 / 기침은 안 하세요
was one note about 붓다; it is now two, and the second one talks about 기침은 [기치믄].

**Pad 0.12s in front and 0.15s behind.** The tail has to stay under the smallest
within-turn gap — 0.31s here — or a neighbour leaks into the clip.

Mono at 64 kbps: eight whole tracks went 6.93 MB → 2.32 MB, and the 25 sentence
clips are 570 KB together, 23 KB each.

### When the gap heuristic gives up

The gap rule works on the unit-page tracks because their turns are short. It fails on
the 듣기 tracks: those turns run three sentences, they pause inside a turn as readily as
between two, and no threshold splits them correctly — every value tried either split
turns or merged them.

What was being optimised was never the gap, though. It was pace consistency, and that
can be optimised directly: partition the spans into as many consecutive groups as there
are printed lines, choosing the partition that minimises the spread of
syllables-per-second. A dynamic program does it exactly, and because the objective IS
the verification criterion, a bad fit shows up as a wide spread rather than as a
plausible-looking wrong answer. All four 듣기 tracks came out at ±0.30 to ±0.63.

Two things that search has to allow for:

- **Leading spans that are not speech.** Track 39 is a phone call and opens on a ring
  tone, which is well above a -35dB floor and registers as a span. Track 38 has two.
  Searching only over trailing extras put the first line at 2.81 syl/s against a track
  mean of 4.6 — the tell that something before the dialogue was being counted.
- **Very short lines make the spread meaningless, not wrong.** Track 18 came out at
  ±1.14 until you notice the two one-syllable turns — 켈리 saying 네 and 아 — whose rate
  is arithmetic on nothing. Excluding lines under five syllables gives ±0.62 across the
  other fifteen. Check what the outliers ARE before re-cutting.

### Verifying the cut

Speech rate, as before: one narrator at one pace holds a steady syllables-per-second
against the text printed beside them. Unit 11 measured **4.91 ±0.65** on the pharmacy
dialogue and **5.45 ±0.54** on the other — different narrators, which is why the bands
are per track and why one band wide enough for both would pass anything.

Shift the pairing by one and it must break. It does: 7.02 ±6.14 and 7.54 ±7.03, with
maxima above 22 syl/s.

**Where the rate check is blind, say so.** Tracks 12 and 15 hold two clips each, and
their two lines are close enough in length that swapping them stays inside the band —
the check simply cannot discriminate a two-item swap. What pins those is structure:
the recording plays the announcement, then A, then B, in the order the book prints,
and there is no third possibility. That limit is written into the test rather than
left for someone to discover.

Measure the rate over **voiced time only**. A turn's internal pauses are real
silence, and counting them reads as a slow narrator rather than as a held breath.

### One trap that cost an hour

`silencedetect` reports on **stderr**. `execFileSync` returns stdout, so the segment
map came back empty and the script reported "1 span" for every track without erroring.
Use `spawnSync` and read both streams.

---

## Checking a dictation answer

**Align, do not compare positionally.** A positional compare reddens the whole tail
the moment one syllable goes missing — and dropping a syllable is the commonest
dictation slip there is, so the panel would be at its most misleading exactly when it
mattered most. `dictAlign` is a longest-common-subsequence over characters: a dropped
`가` costs one mark and nothing after it.

**Ignore whitespace in the score, keep it on screen.** `한번` versus `한 번` is a real
distinction the notes talk about; a missing space between two clauses is not what
dictation is testing. So the comparison runs on the spaceless forms and the answer
line is still printed with the book's spacing, with the marks landing on syllables.

The panel shows three things and they answer different questions: the **answer** with
the syllables you missed, **what you wrote** when you added something that is not
there, and the **why** — what the trap was. The third is the one worth writing
carefully; see the workbook doc's section on explanations, which applies unchanged.

---

## Wiring a new station

The pack does the work: `WORLD_PACKS['<unit>'].stations` plus the same list in the
world JSON's `level.map.stations`.

**Both.** `currentWorldPack()` prefers `lvl.map.stations` over `WORLD_PACKS`, so a
pack-only edit leaves the station not spawning at runtime while every grep says it is
wired. `tests/test_unit11_cassette.js` asserts the two agree, and it is the assertion
that caught exactly this.

The rest: a matrix in `_bakeTextures()`, `_ensureX`/`_teardownX`, a line in
`_applyWorldPack`, a hover label, a pointer target, an interact case, a slot in
`worlds/unit10-layout.json` (shared by every unit, whatever its name), and the
overlay in `index.html` + `css/game.css` + `js/ui.js`.

Two that are easy to miss:

- **`STUDY_OVERLAYS`.** A new screen you are meant to be listening on has to join it,
  or the score plays over the recording.
- **`closeModalById`.** Escape falls through to a generic hide otherwise, which leaves
  a clip playing.

Stations take an HD PNG first and fall back to the matrix. The shipped cassette uses
`sprites/furniture/valley_cassette_player.png` as `cassette_player_hd`; its source and
review record live in `docs/valley-map-art-manifest.json`.

### The upload trap, again

`collectUploadFiles` used to reach only into a workbook's `exercises`/`items`/
`example` for `audio.src`. The cassette's clips are named by a file that is not a
workbook, so every one of them would have been uploaded nowhere while the disk looked
perfectly right — the same silent failure the Unit 14 workbook shipped with.

It now walks **every** `worlds/*.json` generically for anything shaped like
`{src: 'audio/….mp3'}`. Do not add a second hand-list.

---

## Unit 14, and a unit that is not all-scripted

Tracks 42-51. Three things differ from Units 11 and 13, and all three are assertions in
`tests/test_unit14_cassette.js` rather than notes.

**Nine of the ten tracks have a script, and the tenth never will.** The 듣기 지문 pages at
the back supplied 48 and 49, the same way they did for Units 11 and 13 — worth saying
again, because it is the single highest-value page in the book for this pipeline. Track 47
is the exception: the unit page draws that conversation and the 번역 page gives it in
English only, so there is nothing for a dictation answer to be checked against. It ships
listen-only and the count is pinned at nine-and-one.

**The cap is 24 syllables, not 22.** Two 말하기 1 turns land at 22 and 24. The
alternative was splitting a whole sentence into phrase fragments — 의사 선생님을 /
'의사님'이라고 불러서 / 사람들이 웃었어 — that nobody would say on their own, and the rule
above is that a row has to be a sentence someone would say. The cap rides in
`dictation.filter` and the test checks the rows against it.

**Span 0 of every track is the announcement.** All ten open with a 2.42-2.67s span and
then a 1.2-1.5s gap; it is never part of a row. On the two 발음 tracks span 1 is the
printed instruction and the 0.26-0.44s spans are the narrator reading 일/이/삼/사 — the
same trap Unit 13's 발음 tracks set, and counting those as content is how a five-line
track comes out looking like ten.

The silencedetect settings held from Unit 13 — −35dB/0.35 for the two-line grammar boxes,
−40dB/0.30 for the dialogues — and so did the turn gap: within-turn pauses top out at
0.85s and the turn breaks cluster at 1.00-1.12s, so 0.95s groups track 44's thirteen
content spans into exactly its eight printed turns.

**Verify by pace spread, not by eye.** The thirty-two clips read at 4.14-6.10 syl/s, and
that band being narrow is the evidence the span map is right. The test stores a band per
track and then shifts the text-to-clip pairing by one to check the band would actually
fail. It does on every multi-clip track except 50, whose two lines are 9 and 8 syllables
over 1.844s and 1.822s — recorded as blind rather than papered over.

### Aligning a 듣기 transcript

The gap heuristic that works on a unit-page track **fails on a 듣기 track**, and it is worth
knowing why before trying it: an announcement or a briefing pauses inside a sentence as
readily as between two, so no single threshold separates the two kinds of break. Track 49
has within-turn gaps of 0.33s and between-turn gaps of 1.06s, and also the reverse.

What is actually being optimised is pace consistency, so optimise that directly. Partition
the spans into as many consecutive groups as the transcript has lines and take the partition
minimising the spread of syllables-per-second. It is a small exact search — the spans are
few — and the useful part is that **the objective is the verification criterion**: a bad fit
comes out as a wide spread rather than as a plausible-looking wrong answer.

It also settles questions the ear cannot. Both 듣기 tracks open with three spans before the
content: the recorded track number, the section heading and the printed instruction, the
same shape the 발음 tracks have. Dropping three gives track 48 a spread of 1.60 syl/s;
dropping one gives 2.65. That is the answer, and nobody had to guess at it.

**A numeral read aloud makes a line uncuttable.** 1층에, 밤 10시, 50% 싸게 — the syllable
count cannot be derived from the printed text, so the pace check has nothing to measure
against and the row cannot be verified. Four of Unit 14's 듣기 lines went out on that rule,
and it is in `dictation.filter.drop` rather than being a silent omission.

**A long 듣기 sentence is usually not splittable.** Four of them run 25-39 syllables and
carry unit headwords, and every internal pause falls mid-clause — 음식물을 드시거나 …,
자리를 바꾸거나 …. Splitting there would cut mid-breath and leave a dangling -거나 that
nobody would say, so they stay on the tape and out of the set. Six other turns split
cleanly, because the narrator pauses exactly where the courtesy ends and the sentence
begins.

**The clip arithmetic, if it ever has to be reproduced.** A clip is its voiced spans
joined by a fixed 0.18s breath, with 0.12s of real audio in front of the first and 0.15s
behind the last. That reproduces the shipped Unit 13 clips exactly — `2b-u13-d01` is
3.213s of voice over two spans and the file is 3.66s = 3.213 + 0.12 + 0.15 + 0.18 — which
is what keeps a later unit's clips consistent with the earlier ones.

---

## Unit 15, and the difference between silent and not yet scripted

Tracks 52-61. Three of the ten ship listen-only, the largest share of any unit here, and the
reason is not Unit 14's reason.

Unit 14's track 47 is silent **permanently**: the conversation is drawn on the unit page and
the 번역 page gives it in English, so the Korean was never printed anywhere and no dictation
answer could ever be checked against it. The count is pinned at nine-and-one because it will
always be nine-and-one.

Unit 15's three are silent **pending a page**. Track 57 (말하기 2) needs the Korean 말하기 2
page; tracks 58 and 59 (듣기 1 and 듣기 2) need the 듣기 지문 pages at the back, the same
pages that supplied Units 11, 13 and 14. All three conversations are on the tape in full and
already play. Each page that arrives moves one or two tracks across, in whatever order the
pages turn up.

So the seven-and-three in the invariants is a **description, not a pin**. Changing it is
expected; the check beside it is the one that must not be relaxed — every scriptless track
carries a `noteEn` saying which page it is waiting for. That is what stops "no script yet"
from decaying into "no script", and it is why the learner sees a reason rather than a gap.

Two consequences worth knowing before editing this unit:

- **The dictation set may not draw from a scriptless track.** The invariant exists because the
  tape holds the audio for all ten, so nothing about the clip files would object.
- **There is no `tests/test_unit15_cassette.js`.** Unit 14 has a dedicated suite; Unit 15's
  assertions live in `checkUnit15Cassette` in `scripts/validate_content.js` instead. Both
  conventions are in the repo — look in the validator before concluding a unit is untested.

---

## Unit 10, and a unit whose 발음 page leaves no trace

Tracks 02-11: eight scripted, two listen-only (08 and 09, the 듣기 pages, waiting on the
듣기 지문 like every other unit's), thirty-two printed lines, twenty-seven dictation rows.
The cut itself was uneventful — the Unit 13 silencedetect settings held again, and the
clips read at 4.23-6.04 syl/s with nothing flagged. One thing about the *set* is new.

**This chapter has no 발음 rule a dictation can test.** Unit 11 had 종성 규칙 후 연음,
Unit 13 had 유기음화, Unit 14 had 경음화 after ㄴ/ㅁ, and in each case the set could be
counted against the rule: so many rows turn on it, and they come from the 발음 tracks.
Unit 10's 발음 page is 의문문의 억양 — whether a question rises or falls at the end — and
no intonation changes a single letter you write down. There is nothing for dictation to
catch.

The honest response is to say so in the file rather than let a row count imply coverage
that is not there. `dictation.note` states it, and the set leans on what it *can* teach:
the chapter's four grammar patterns, and the liaison and assimilation that happen anyway.
`tests/test_unit10_cassette.js` section 4 checks that shape directly — the note exists and
mentions the problem, all four patterns are drilled, at least twelve rows turn on a sound
change, and both of the chapter's 경음화 environments are named rather than tagged with a
bare 경음화 that would let them blur together. The 발음 page itself became a *listening*
exercise on the 교과서 desk instead, which is where it belongs; see
`docs/workbook-exercises.md`.

**Two tracks contribute a single clip each, so their pairing is unfalsifiable by pace.**
The shift-by-one check needs two clips on a track to have anything to shift. Tracks 05 and
10 have one apiece; the test asserts that they have exactly one and records that their
pairing rests on the span map alone, the same way Unit 14 recorded track 50 as blind.
Every other track fails the shifted pairing on most of its clips, so the bands have teeth.

**Four syllables is where a headword can be lost.** 입에 맞아 and 맛이 어때 are both under
the five-syllable floor, and 입에 맞다 is a unit headword. They are in
`dictation.filter.drop` by name, because a drop list that only mentions courtesies reads
as though nothing of value was left out. The same list records 감자탕 2인분 주세요, dropped
under the numeral rule from Unit 14.

---

## The waveform, and looping a stretch of it

A listening station needs three things a play button cannot give you: repeat the track,
repeat one phrase of it, and see where in the recording you are. The third is what makes the
second usable — a loop whose edges you cannot see is a loop you set by guessing.

Both 듣기 and 받아쓰기 carry the strip. One table (`CS_WAVES`), one painter (`csPaintWave`),
one pointer binding, one ticker: a screen describes itself in the table rather than the
strip reaching into a global, which is what keeps the two from drifting apart on something a
learner uses on both. 받아쓰기 has it for a different reason than 듣기 — on a 24-syllable
sentence the part you cannot hear is three syllables long, and looping those three at 0.5×
is the whole exercise.

`tests/test_listen_loop.js` drives the rules; what follows is why they are what they are.

**The loading state must not be a waveform.** This one shipped broken, and the shape of the
mistake is worth keeping. The strip drew a row of uniform short bars while the decode was in
flight — and a flat, evenly-spaced comb is exactly what a real waveform of a silent
recording looks like. Every track therefore *looked* broken for the 50-250ms before its
peaks arrived, and the first report of it was a screenshot of a perfectly healthy track.

Measured before changing anything: **all 207 audio files in the repo decode, in 49ms on
average, slowest 255ms.** Nothing was broken. The loading state was lying.

So there are three states now and only one of them draws bars:

| state | drawn | said |
|---|---|---|
| `ready` | bars | `DRAG TO LOOP` |
| `wait` | dashes on the centre line | `WAVEFORM…` |
| `none` | a solid centre rule | `NO WAVEFORM` |

Nobody mistakes a straight line for audio. The region shading and the playhead draw in all
three, because seeking and looping work whatever the bars are doing.

**Bars are the mean and the peak, halved together.** Max alone saturates on speech this
compressed — the book's tracks run at a peak of ~1.1 with 60% of samples voiced — and
flattens the envelope to a block. Mean alone loses a one-bucket consonant burst. Halfway
between the two keeps both.

**The peaks are decoded at runtime, not cut into the JSON.** `csLoadPeaks` fetches the mp3,
hands it to Web Audio, reduces the first channel to 480 buckets and caches that for the
session. Putting them in the content instead would mean a peak file to regenerate beside
every re-cut clip, and a stale one would draw a waveform for audio that is no longer there —
so the strip has no content dependency at all. Where Web Audio is missing or the decode
fails it still draws, still seeks and still loops; it just has no bars. That is a
degradation, and the test drives it against a fake decoder that fails four different ways.

**Peaks are normalised against the loudest bucket.** The book's tracks vary a lot in level,
and an absolute scale draws the quiet ones as a flat line.

**Two mechanisms, because there is only one native one.** Repeating the whole track is the
`<audio>` element's own `loop`: gapless, and no timer involved. A stretch inside the track
has no native equivalent, so a 30ms interval watches the playhead and jumps it. 30ms is
chosen so the overshoot is not heard — measured on track 44 the jump lands 10-50ms after A.

**An armed A-B beats whole-track repeat**, and the ticker re-asserts that on every tick
rather than at play time: the duration is not known until metadata arrives, so whether a
pair of marks is a valid loop cannot be decided when playback starts.

**`ended` has to ask the same question as the ticker.** A loop whose end sits on the last
frame gets no tick before the element stops itself, so `csRangeSeek` takes an `ended` flag
and both callers consult it. That edge is a test case rather than a comment.

**A pair set backwards is the same loop the other way round** — sorted, not refused. A pair
closer together than 0.25s *is* refused, because a loop that short stutters rather than
repeats. Both decisions live in `csRange`, once, rather than at each of its five call sites.

**Marks belong to the track they were drawn on.** `listenPick` clears them. Carrying
4.2-6.8s across to a 13-second grammar box would loop a different sentence and look
deliberate.

**Pause resumes where it stopped.** `csStop` is a hard stop — one player for every cassette
screen is the invariant that keeps two recordings from ever playing at once — so the
position is remembered in `listenState.at` and handed back through `csPlay`'s `startAt`,
which waits for `loadedmetadata` because `currentTime` before that is ignored or throws.

## The daily-use interaction contract

The cassette is a repeat destination, so closing it no longer means starting over. A small,
versioned `hv_cassette_prefs_v2` record remembers, per unit, the stable track number, the
playhead, playback speed, transcript visibility, the stable dictation sentence id and its
speed. It deliberately does not hold scores or practice counts; those remain in
`practiceLog` and travel with the unified save. Stable ids matter here: remembering array
position 4 would silently resume a different recording when a track is inserted above it.

The primary row now keeps previous, five seconds back, play, five seconds forward and next in
one fixed group. Search lives with the track rail, the current recording has one persistent
heading, and the transcript can be hidden without leaving the track. A-B tools stay below
the waveform. Their capability is unchanged, but they no longer compete visually with Play.
On a narrow screen the track rail becomes a horizontal strip and the primary controls remain
centred rather than squeezing into two small columns.

Dictation remembers the last sentence, adds a previous action and displays position as a
progress strip. `tests/test_listen_loop.js` checks these persistence anchors, stable ids,
visible controls and exports in addition to the waveform rules.

**The thin progress bar is gone.** It and the waveform both claimed to show progress and
rounded differently, so they disagreed on screen. `csPaintProgress` is the clock only.

**No letter shortcuts on 받아쓰기.** 듣기 has `a` / `b` / `l` / `r` / `c` because there is
nothing to type on it. 받아쓰기 has a text input, and a dictation screen that swallowed the
letter you typed would be worse than having no shortcuts at all. Drag and the buttons only.

**A marked stretch belongs to the recording it was drawn on.** `listenPick` and `dictNext`
both clear it. 1.2-2.4s of the next sentence is a different three syllables.

A note for anyone writing tests against the shipped files: this repo has no
`.gitattributes`, so a working copy is CRLF on Windows and LF in CI. A regex with a literal
`\n` in it passes on one and fails on the other. Slice the region and match with `[\s\S]`.
