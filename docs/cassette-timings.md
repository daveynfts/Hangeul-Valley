# Per-line timings for the 듣기 transcript

How each line of a cassette transcript learns where it sits inside its track, so the 듣기
screen can offer a ▶ beside the sentence and play that sentence alone.

Written after wiring the buttons up across units 10, 11, 13, 14 and 15. Run the tool on a new
unit and most of it happens by itself; the rest is a person with headphones, and this says
which lines those are and how to do them.

```bash
node scripts/cassette_timings.js              # measure and write
node scripts/cassette_timings.js --report     # what it would do, and the coverage
node scripts/cassette_timings.js --unit 16    # one unit
node scripts/cassette_timings.js --check      # fail if the JSON is out of date
```

Needs `ffmpeg` and `ffprobe` on PATH. CI has neither, so `--check` is not a CI gate;
`tests/test_cassette_timings.js` checks the shape of what was written without touching audio.

## What ends up in the content

Two optional keys on a transcript line, seconds into the track:

```json
{ "who": "스티븐", "ko": "이 근처에 있는 식당 중에서 어디가 제일 좋아?", "at": 18.73, "end": 21.31 }
```

A line with `at` plays that stretch of the track. A line without one still gets a ▶ if the
unit's dictation set happens to hold the same sentence as its own clip — the runtime matches
on the Korean, so nothing links them in the file. A line with neither gets no button.

The tool also rewrites each track's `dur` from the file. Those were hand-written labels, and
unit 15's were out by up to 19%; see "Why the durations matter" below.

## How a span is established

Three outcomes, and only the first two produce a number. **Nothing is estimated.** A ▶ that
plays the wrong sentence is worse than no ▶, so a line the audio cannot place is left alone
and reported.

**1. Anchor — the sentence exists as its own clip, and that clip was cut from this track.**
About half the transcript lines also appear in the unit's dictation set, which ships one mp3
per sentence. Where the clip is a verbatim cut, correlating the two loudness envelopes finds
it exactly.

This is not a judgement call, because the scores come out in two heaps with nothing between
them: across 143 candidate pairs, 104 scored 0.95–1.00 and the rest scored 0.45–0.79. The
high heap is the same recording; the low heap is a sentence re-recorded separately for
dictation, which sounds the same to a reader and correlates like a different take. The cut is
at 0.95 because that is where the gap is, not because 0.95 sounded strict.

**2. Bracket — one unclaimed line, with an anchor on each side.**
Its span is the first sound after the earlier anchor to the last sound before the next one.
With both edges pinned this is a measurement rather than a guess.

**3. Left alone — two or more unclaimed lines in a row.**
These need a person. See below.

## Why the runs of two cannot be done by counting

The obvious idea is to cut the track at its silences and hand the pieces out to the lines in
order. It does not work, and it is worth knowing why before trying it again:

- Every one of the 47 scripted tracks has **more** speech segments than transcript lines,
  never fewer — usually about twice as many.
- Some of that is a spoken section header the transcript does not print. Some is sentences
  broken by internal pauses.
- The two are indistinguishable from segment lengths alone, so any rule that assigns pieces
  to lines by counting them gets a whole track wrong from the first mistake onwards.

Total speech time comes to roughly 1.0–1.5× what the transcript's syllable count predicts, so
the tracks are mostly *not* reading each line twice — but "mostly" is not a basis for placing
a play button.

## Finishing a run by hand

Use the admin panel's **Timings** tab — `npm --prefix admin start`, then `#timings`. It exists
for exactly this job.

1. Pick the unit, then a track. The rail shows `n/n` per track and turns green when a track is
   finished, so the work left is visible without opening anything.
2. Pick a line. Lines with no span carry an amber edge and read `not set`; the spans that do
   exist are drawn on the waveform, so the gap you are filling is the gap you can see.
3. Drag across the strip to set the span. A click without a drag only moves the playhead, so a
   mis-click cannot silently retime the selected line.
4. **▶ Line** plays exactly the span and stops at its end — that is the check. `start ±` and
   `end ±` trim by 0.05s, and `snap to previous` starts this line where the one above ended,
   which is most of a dialogue.
5. Save. The write goes through the same validator as everything else in the panel, so a span
   that runs backwards, is under a quarter-second, overruns the track or crosses the line above
   is refused with a message naming the line rather than written.

Take `at` a hair *before* the first sound — a tenth is about right — or the play clips the
onset. Take `end` at the last sound rather than at the start of the next line, or the button
plays the silence too.

The tab also corrects the track's `dur` from the decoded file when it saves, so a track that
has been opened here stops disagreeing with its own audio.

By hand instead, if you prefer: write the pair onto the line in the unit's `-cassette.json` and
run `node tests/test_cassette_timings.js`, which checks the same things.

Re-running the tool is safe: it clears every `at`/`end` on a track before measuring it, so
its own results never go stale after a transcript edit. **It will also clear yours.** Hand
timings in a run of two or more are the one thing it cannot re-derive, so either finish a
track's runs only after its anchors have settled, or re-add them after a re-run — the report
tells you which tracks are affected.

## A new unit

1. Add the tracks and transcript as usual, then the dictation set — the clips are what most
   of the anchors come from, so the more of the transcript the dictation set covers, the less
   is left to do by hand.
2. `node scripts/cassette_timings.js --unit NN`
3. Read the report. Anchors and brackets are done.
4. Work the runs by hand as above.
5. Add the unit to `UNITS` in `scripts/cassette_timings.js` and to the list in
   `tests/test_cassette_timings.js` if it is not there.

## Why the durations matter

`csWaveDur()` turns an x on the waveform into a time, and it used to have two sources: the
`dur` written in the JSON, and the real length the `<audio>` element reports once it loads.
Before anything played, only the first existed.

Unit 15's written durations were out by up to 19% — track 55 said 8.7s against a file of
10.76 — so selecting a stretch before pressing play mapped it through one scale, and starting
playback redrew and played it through another. The selection moved. That is what this tool's
`dur` sync fixes at the content end; at the code end, the peaks decode now caches the true
length and `csWaveDur()` prefers it, so the scale is right before a single frame has played.

`tests/test_cassette_timings.js` holds both halves: every `dur` within 0.05s of its file, and
the decoded length consulted ahead of the written one.
