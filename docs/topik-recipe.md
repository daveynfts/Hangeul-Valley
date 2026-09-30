# TOPIK II 합격 레시피: a prep book, one world per unit

Written when Unit 1 was built, so the second unit does not have to rediscover what the first
one learned about the book — above all, which of its answers the scan does not contain.

The book is *TOPIK II 합격 레시피* (이태환, 한글파크, 2019), a 289-page scan with no text layer.
It is a prep book, not a textbook: each chapter takes a block of TOPIK II question numbers,
teaches the pattern behind them with a **Ranking** table (the forms or topics that come up most,
most frequent first), works one real past-paper question (**기출문제**, with the book's 정답 and
해설 printed beside it), and then sets ten practice questions (**예상문제**) of its own.

## Unit 1 — 3급 Chapter 1, 읽기 1-8 (pp.14-42)

| files | what |
|---|---|
| `worlds/recipe-unit-1.json` | the farm: 223 headwords in the eight Ranking groups, a study desk and nothing else |
| `worlds/recipe1-questions.json` | the book's questions — 8 기출 and 70 예상 — on ten desk pages |
| `worlds/recipe1-desk-quiz.json` | 149 questions drawn from the Ranking tables themselves |

| section | 읽기 | 기출 (제60회) | Ranking | 예상문제 |
|---|---|---|---|---|
| 알맞은 문법 | 1-2 | p.14 | 연결어미 30 (pp.15-16), 종결어미 20 (pp.16-17) | p.18 연결어미, p.19 종결어미 |
| 유사 문법 | 3-4 | p.20 | 유사 문법 40 (pp.21-24) | p.25 |
| 광고 | 5-8 | pp.26, 31, 35, 39 | 제품 50, 업소 40, 공익 20, 상세 설명 20 (pp.27-40) | pp.29-30, 33-34, 37-38, 41-42 |

The question texts and all four options are the book's, verbatim and in the book's order.
Chapter 1 is reading only, so there is no audio; the 듣기 chapters will need the book's MP3s,
and the scan prints only the 기출 scripts inline.

## Whose key is it

**The 예상문제 answers are not in the scan.** The book prints them in a separate booklet, *책 속의
책 · 정답과 해설* (numbered from p.49), and the PDF ends without it. Nothing on the page says so;
it shows only when you go looking for the key to question 1 on p.18.

So every row says where its key came from, and nothing in the game is allowed to blur the two:

- `keySource: "book"` — the eight 기출문제. `bookKey` is the circled number the book prints, and
  the explanation's second paragraph quotes the book's 해설 with its page (`교재 해설 · p.14 —
  정답은 ②번. …`).
- `keySource: "ranking"` — the seventy 예상문제, keyed from the Ranking row named in
  `rankingRef`. The practice questions are built on the tables the chapter has just taught — the
  n-th grammar question on the n-th Ranking form, each ad question on one headword's 핵심어 — so
  the table settles the key: the one option built on that row's pattern, or the one option that
  row names. The row's grammar note opens on that Ranking line, so the learner can check it, and
  every 예상 page's note says in plain words that its keys were derived.

`tests/test_recipe_unit1.js` pins all 78 keys and re-derives the seventy: a grammar key must be
the only option wearing its Ranking pattern, and an ad key the only option its row names. One row
is not settled by the table alone — 광고의 상세 설명 4, where 제품 효과 and 상품 특징 both fall under
제품(상품) 소개 — and the ad decides it (a list of what the thing is like is 특징). The test allows
that row by name and requires its explanation to say why; no other row may do the same.

**If the booklet turns up,** check the seventy against it. A disagreement is fixed in the row
and in the test's pin together, and the row's `keySource` becomes `"book"` with its `bookKey`.

## How the pages are shown

- **1-2** — the sentence with its gap, once, and the four endings. `phraseKo` keeps the sentence
  with the paper's `(   )`, but the desk does not print a headline that only repeats the row's
  line (`wbHeadline` in `js/ui.js`).
- **3-4** — the TOPIK world's layout: the sentence as printed in the header, its underlined part
  underlined — the desk finds it as the words the gap line leaves out — then again with a gap
  where the underline was, so read aloud the row is a sentence with the right paraphrase in it
  rather than a sentence followed by a fragment.
- **5-8** — the ad's lines, and `{}에 대한 글`, which is what every one of these questions asks.

The bank sets `holdGloss` (an exam gloss is its answer), `keepOrder` (the 해설 says 정답은 ②번,
so ② has to be the second button) and `examView` (the explanation opens on its first paragraph,
the 핵심 단서, with the option-by-option reasoning folded away — the TOPIK world's view). Both new
flags are honoured in `js/ui.js` and kept through an admin save by `admin/lib/workbook.js`, which
also keeps each row's `source`, `bookPage`, `keySource`, `bookKey` and `rankingRef`.

## The desk quiz

Built from the Ranking tables, not the questions: a Ranking example with its form cut out, a
유사 문법 example with the part to match in 「 」, and, for every ad headword that no question in
the bank already answers, its 핵심어 list and four names. Wrong buttons come from the same table;
pairs that share no 핵심어 but are still too close to be each other's wrong answer (에어컨 and
선풍기, 서점 and 문구점) are kept apart by hand. 안전 규칙 is left out: its 선택지 어휘 are 안내원 and
안내 방송, which would key it against 행사 안내 on the word 안내 alone. Every question names its
Ranking row in `rankingRef`, and the key letters are dealt a quarter each.

## The word list

The eight Ranking groups, in the book's order — 연결어미, 종결어미, 유사 문법, 유사 표현, then the
four ad tables. Where a headword already exists in another world with a gloss, Unit 1 reuses that
gloss (and its Vietnamese), so a word the learner already knows does not arrive with a second
meaning — `scripts/sharedHeadwords.js` holds every world to that. Example sentences come from
`scripts/vocab_examples.js --apply --only recipe-unit-1`, which found one for 41 of the nouns;
it cannot match a grammar ending, and the grammar headwords are left without one rather than
given one it could not check.

## Adding the next unit

1. Read the chapter's pages off the scan, and note on the first page of each 예상 set that its
   key is in the missing booklet.
2. Transcribe the 기출 with its 정답 and 해설, the Ranking tables, and the 예상 questions as printed.
3. Key each 예상 question from its Ranking row, and write down every row where the table leaves
   two options standing.
4. Name the world `recipe-unit-N` (stem `recipeN`): `scripts/ttsClips.js`, the admin registries
   and `validate_content.js` already accept that shape.
