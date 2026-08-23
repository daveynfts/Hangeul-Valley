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

Stations take an HD PNG first and fall back to the matrix, so a painted
`cassette_player_hd` can replace the drawn one later without touching anything else.

### The upload trap, again

`collectUploadFiles` used to reach only into a workbook's `exercises`/`items`/
`example` for `audio.src`. The cassette's clips are named by a file that is not a
workbook, so every one of them would have been uploaded nowhere while the disk looked
perfectly right — the same silent failure the Unit 14 workbook shipped with.

It now walks **every** `worlds/*.json` generically for anything shaped like
`{src: 'audio/….mp3'}`. Do not add a second hand-list.
