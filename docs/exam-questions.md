# Adding a TOPIK question, and the gloss keys that decide whether it teaches anything

Written after the exam world reached 27 questions, because one part of the job kept
going wrong in the same way and the fix was never obvious from the code.

The exam world is `worlds/topik-2.json` (the farm word list) and
`worlds/topik2-questions.json` (the questions). Unlike a unit, it grows one question
at a time from photographs the user sends, and it is grouped by **question type**
rather than by the day a question arrived. The types so far:

| exercise id | 유형 | what it tests |
|---|---|---|
| `topik2-headline` | 신문 기사 제목 | a compressed headline and four readings of it |
| `topik2-blank` | 빈칸 채우기 | one gap, four endings on the same verb |
| `topik2-synonym` | 유사 표현 | an underlined phrase and four expressions to match it |
| `topik2-notice` | 안내문·도표 | a poster or a chart and four statements, three of which alter one detail |

The bank sets `drawOne: true`, so a sitting is one question drawn from the whole
paper rather than the paper worked through. The draw is a bag, not `Math.random()` —
see `wbDrawIndex` in `js/ui.js` and `tests/test_topik_draw.js`.

`holdGloss: true` keeps the English translation back until the learner checks, and
the hover glosses are held back with it. Both appear together.

---

## The vocabulary rule

Every paper-derived word in the exam world must trace back to something a paper actually printed.
The list started with a field of economics vocabulary written from imagination —
매출, 불황, 유통, twenty-nine words — which read as useful and was not. A personal
study room fills up from the papers that go through it.

The learner may also explicitly supply a word list. Record it separately in the
world's `vocabularySources` with `type: "user-list"`, a dated source note and the
exact headwords. The validator checks those references and permits those words
without inventing a paper. All other words still need a question source. Original
practice examples belong on the words as `example` / `exampleEn`, not in the exam
bank. See [topik-vocabulary.md](topik-vocabulary.md) for the first such list.

`checkTopikWorld` enforces it. The corpus a word may trace to is the question's
`phraseKo`, `lines`, `choices`, **and** its `why` and `grammar` notes. That last
part is a deliberate widening, recorded where it happens: a verb and its ending
sometimes appear only fused — 믿어서는 is the only shape 믿다 wears in any paper here
— and exactly one of the two can own that string. The other is found by its
dictionary form, which the grammar note prints.

What is **not** in that corpus is a line's `who` label. A 안내문 or a 도표 is built out of
labels — 자격, 모집 기간, 설문 대상 — and a word that appears only there traces to nothing
and wins no hover position, which is two failures for one omission. 설문 대상 in question 10
was exactly that. Name such a word in the `why` or the `grammar` note as well; on a chart
question there is usually something worth saying about it anyway.

`forms` are **the shapes the question uses**, not a conjugation table. 썰렁하다 never
appears as 썰렁하다; it turns up as 썰렁한.

---

## The gloss keys

This is the part that kept going wrong.

`wbGlossTable` in `js/ui.js` builds one regex from every entry's `ko` plus its
`forms`. Four properties of it decide everything:

1. keys shorter than two characters are dropped — a single syllable matches half a
   sentence;
2. the **first** entry to claim a key keeps it;
3. keys are sorted longest-first, so **the longest key wins a position**;
4. a match consumes its characters — nothing else can start inside it.

Property 4 is the one that bites. A key is not merely outranked by a longer one; it
is *eaten*, and so is everything that needed the characters it took.

### Rule 1 — one entry per contiguous string

Do not let four entries fight over 큰 인기를 얻고. Write one entry whose gloss carries
every part: *"to be enjoying great popularity — 인기 is popularity, 얻다 to obtain
it"*. The same for 10만 부나, 한 달 새, 안 물어요.

Questions written this way pass the validator first time. Questions written as a
word list do not.

### Rule 2 — the pattern being tested owns the string it is tested in

When a verb and an ending only ever appear fused, decide by what the question is
*for*. In a 빈칸 question the ending is the point, so the ending takes the fused
string and the verb falls back to its dictionary form, named in the note.

Six grammar points had lost their string to a content word before this was written
down: 치우다 held 치우기 so `-기 위해` was dark, 보관하다 held both 보관해야 and
보관하려면, 찬물을 끼얹다 held 찬물 끼얹는, 환자 held 환자에게. In question 16 the
four patterns had swallowed 힘들다 whole — they now own only their endings, so the
adjective the question is about keeps a hover of its own.

### Rule 3 — a key that is a suffix of another word is a trap

에게 lives inside 환자에게. 에 lives inside 취업에. 잠을 lives inside 늦잠을. 책이
lives inside 정책이.

Three of those four caused a real fault. The fourth did not, because 정책 is an entry
of its own and always wins at 정 — which was worth *running* rather than reasoning
about, and the run is in the commit that closed it.

Prefer the bare `ko` over a particle-attached form. 취업 beats 취업에 for exactly this
reason.

### Rule 4 — a gloss must win where the learner is reading

`checkExamChoicesGloss` counts winners on the **sentence and its options only**,
never on the notes. The first version counted the notes too, and that masked the
very bug it was written for: `N에 대한` is named in question 17's grammar note, so
the entry looked reachable while the option line had nothing on it at all.

### What the invariants deliberately do not catch

The check is narrowed to **grammar entries**. The broad version — every entry whose
key appears must win — flagged six things and three were not faults: 영향을 미치고
loses to 악영향 and 책이 to 부동산 정책, and in both the learner hovers and gets a
gloss that is right for what is under the cursor.

A check that is wrong half the time teaches people to ignore it. Where a content
word loses to a longer key that covers it, fix the **gloss** rather than the key:
악영향 now reads *"a harmful effect — and it comes with 미치다: 악영향을 미치다"*,
which teaches more than a strange underline on 을 미치고 would have.

---

## Art rows

Every farm word must resolve to a pixel icon on disk — `tests/test_panel_art.js`,
which the content validator does not cover. Two things learned by failing:

**Check the slug exists before writing the row.** `job_interview`, `bookshelf`,
`lamp`, `sofa_set`, `house_key` and `walk_icon` were all invented and none of them
exist. Load `VOCAB_ART_ROWS` and test the path.

**Append at the end of the array, not after a named row.** Another session works in
this repo and rewrites slugs in `js/vocabArtMore.js`; a row named as an anchor may
no longer say what it said an hour ago. It has already replaced stand-ins with real
tiles — 산 went from a `desk_globe` placeholder to a `snow_peak`.

Sharing a tile is normal — around two fifths of the slugs serve more than one word, and
the exact figure moves whenever the other session rewrites `js/vocabArtMore.js`, so it is
not worth writing down. (It said 121 here while the count was 103.) `kinds_types` is the
one to reach for when nothing can be drawn: 59 words sit on it, and only nine are
grammar patterns. The rest are abstract nouns and verbs — 종류, 위치, 거리, 기대가
되다 — which is the honest reason it exists. There is nothing to draw for -더니 that
a learner would recognise as -더니, and the same is true of 근황.

---

## The order that works

1. Read the photograph. Decide which type it belongs to, and which relation the
   question actually turns on — it is rarely the vocabulary.
2. Check which words already exist and what forms they carry.
3. Check the art slugs exist.
4. Write the question, the words and the art rows **in one pass**. Splitting them is
   how `test_panel_art` went green on a commit where the words were absent.
5. Run `node scripts/validate_content.js`, then `npm run test:all`.
6. Open it in the browser and answer it.

Step 6 used to be where every hover gap turned up — 될뿐더러, 꽂아 가지고, 가서 and
에 대한 were all found by reading a rendered page, one per question, four times over.
Three checks have since taken most of that over:

- every option carries at least one hoverable word;
- every grammar point a question uses is hoverable somewhere in that question,
  counted on the sentence and its options and never on the notes;
- the desk quiz tests nothing the paper has not taught.

What the browser is still for is the rest of the surface — that the question draws,
that the answer marks ✓, that the explanation opens, that the art renders. Those have
no invariant and are cheap to check: answer the question once.

## Explanation reading order

The `why` fields are intentionally detailed: each blank-line paragraph handles a hinge,
reading or distractor. The TOPIK answer view keeps every paragraph but no longer presents
them as one dense block. It now reads in this order:

1. the correct completed sentence and its meaning;
2. the first `why` paragraph as **핵심 단서 / what to notice**;
3. the separate `grammar` field as **문법 포인트 / rule**;
4. the remaining paragraphs inside a collapsed **선택지 비교 / full reasoning** section.

This is scoped to `topik2-questions`; unit workbooks retain their existing answer cards. The
source text stays untouched and searchable in the DOM when the disclosure is closed.
`tests/test_topik_draw.js` verifies every question in the bank has enough paragraph structure,
that LF and CRLF split identically, that the detailed section is collapsed by default and
that readable line lengths are capped in CSS.
