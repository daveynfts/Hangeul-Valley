# Unit 16 — historical artwork brief

> **Completed 2026-09-16:** All 139 illustrations are reviewed and integrated (133 vocabulary + six exercise images). See [current design record](unit16-design.md). The text below records the original pre-design requirements; its missing-art counts are historical.

---

# Unit 16 · the art that is not here yet

Unit 16 (16과 설날에는 밥 대신 떡국을 먹어요) shipped complete except for its pictures: word
list, cassette, 익힘책, 교과서 and 퀴즈 are all on disk, translated and tested, and not one of
them draws anything. That was deliberate — the unit's design was deferred so the content could
land first — and this file is the single place the deferred decisions are written down, so
whoever draws them is not reading five `artNote` fields and a chapter of a book to find out
what is wanted.

Each bank still carries its own `artNote` saying what a missing picture cost *that* bank. This
file is the other half: what to draw, where it goes, and what it would replace.

---

## Where Unit 16 stands

| Bank | File | Pictures now | What is waiting |
|---|---|---|---|
| Word list | `worlds/2b-unit-16.json` | 0 of 133 headwords | the vocabulary illustrations |
| Cassette | `worlds/unit16-cassette.json` | n/a — it is audio | nothing |
| 익힘책 | `worlds/unit16-workbook.json` | 0 rows | one row that a drawing decides |
| 교과서 | `worlds/unit16-textbook.json` | 0 rows | three pages that lean on a picture |
| 퀴즈 | `worlds/unit16-desk-quiz.json` | 0 of 13 rows | four optional illustrations |

Word art is not stored on the word: nothing in `worlds/*.json` carries an `art` field, and no
unit's word list ever has. The lookup is `VOCAB_ART_ROWS` in `js/vocabArt.js` — a table of
`{ ko, slug, folder, nameEn, family, cooking }` resolving to `sprites/<folder>/<slug>.png` —
and it currently indexes 119 words, **none of them from Unit 16**. So adding a Unit 16 picture
is two steps, the PNG and a row in that table, and the row is the half that is easy to forget.

---

## The ten to draw first

If only ten pictures are ever made for this chapter, these are the ten that earn their place:
each is a Unit 16 headword, each is a *thing* rather than an idea, and six of them are wanted
by more than one bank.

| # | Word | What it is | Wanted by |
|---|---|---|---|
| 1 | 떡국 | rice-cake soup, the bowl | word list · 퀴즈 row 3 · 익힘책 어휘 연습 2 |
| 2 | 송편 | half-moon rice cakes, a plate of them | word list · 퀴즈 · 교과서 어휘 |
| 3 | 세배(를) 하다 | the New Year's bow, child to elder | word list · 퀴즈 row 11 · 교과서 어휘 |
| 4 | 차례를 지내다 | the rite table, food laid out | word list · 교과서 어휘 · 읽고 쓰기 |
| 5 | 성묘(를) 하다 | visiting the grave | word list · 교과서 어휘 |
| 6 | 윷놀이(를) 하다 | the board, four sticks, tokens | word list · 퀴즈 row 13 · 교과서 과제 |
| 7 | 보름달 | the full moon over a field | word list · 교과서 읽고 쓰기 |
| 8 | 강강술래 | the circle dance | word list · 교과서 문화 산책 |
| 9 | 사물놀이 공연 | the four percussion instruments | word list · 교과서 발음 |
| 10 | 씨름 | two wrestlers, the belt hold | word list · 교과서 읽고 쓰기 |

Numbers 1, 2, 3, 6 are the four the 퀴즈's `artNote` names; drawing them once serves both the
quiz and the 교과서's 어휘 page, which is the whole reason that note says so.

---

## The pages that lean on a picture

### 교과서 어휘 (printed p.160)

One page, two exercises, both of them pictures.

**어휘 1** is a box of six phrases over six drawings, one phrase to be written under each. The
six are 한복을 입다 (given as the 보기, a family in hanbok), 고향에 가다 (a motorway jammed with
cars, a 부산 sign overhead), 세배(를) 하다, 성묘(를) 하다, 차례를 지내다 and 윷놀이(를) 하다.
**This is the one page where the picture is the exercise**, and there is no putting it on screen
without the six. What is there instead: each phrase is given back in a sentence the chapter
itself prints later — 말하기 1 for the holiday verbs, the 읽기 passage for 성묘, 말하기 1 연습 2
for 명절 and 음력. Honest, and it works, but it is a reading exercise standing in for a
vocabulary one.

**어휘 2** is five food photographs under a 보기 dialogue (떡국 먹어 봤어요? — 네, 작년 설날에
먹어 봤어요): 떡국, 빈대떡, 송편, 한과, 식혜. All five are Unit 16 headwords, and numbers 1 and 2
of the ten above are two of them — 빈대떡, 한과 and 식혜 are the three this chapter adds that
nothing else will ever ask for, so they come last.

### 교과서 과제 (printed p.174)

The five yut throws, drawn as four sticks with their flat and round faces up:

```
도 (한 칸)   개 (두 칸)   걸 (세 칸)   윷 (네 칸)   모 (다섯 칸)
 ×××|        ××||        ×|||        ||||        ××××
```

`×` is a marked (flat) face and `|` an unmarked one — the book draws a pig, a dog, a sheep, a
cow and a horse under them in that order. Until the sticks exist the rows ask by distance
instead (*which throw moves you two spaces?*), which tests the part a player has to remember
but not the part the page teaches.

### 교과서 듣기 2 (printed p.170)

Question 2 is three drawings — phoning, a vet, handing the cat over — as the three options.
On screen it is written out in the words the recording uses. Three small scene icons would put
the page back as printed; none is a vocabulary item, so they are the lowest priority here.

### 익힘책 어휘 연습 3 item 4 (printed p.139)

The only row in either bank where **the drawing decides the answer rather than illustrating
it**: a man wiping a floor, with 며칠 동안 청소를 안 해서 in front of it. Either tense fits the
picture, so the row was read off the workbook's own 정답 (printed p.207), which gives
방을 닦았어요. If the drawing is made, the row still stands — but the note under it explaining
where the answer came from can go.

---

## A warning about saving through the admin panel

Three units' desk quizzes — 11, 14 and 15 — have `art` on no row and `sessionSize` 5 where they
were written with 10. Nothing deleted the PNGs; `validateQuiz` in `admin/lib/world.js` rebuilds
a quiz from a fixed field list:

```js
questions: qs.map((q, i) => ({ id: …, q: String(q.q), a: q.a, choices: { A, B, C, D } }))
```

`art` is not in that list, so a save through the admin panel drops it from every row, silently,
and `sessionSize` is clamped by `Number(body.sessionSize) || 5`. `validateWorkbook` has the same
shape and drops `example.why` the same way. **So: when Unit 16's art is added, write the files
directly and run the validator as an acceptance check — do not round-trip a bank through the
admin panel**, and if the panel is the tool you want, fix the field lists first.

`tests/test_unit16_desk_quiz.js` asserts the quiz's `artNote` is still present for exactly this
reason: a note that disappears the way those `art` fields did should fail a suite rather than
pass quietly.

---

## What is deliberately absent, and stays absent

Not everything missing from Unit 16 is waiting on a drawing. These are gone because there is no
answer a screen could mark, and they are listed in each bank's `omittedNote`:

- **쓰기** (교과서 p.173) — write about a holiday in your own country.
- **말하기 1 연습 2**, **말하기 2 연습 2** (p.169), the **말하기 that closes 듣고 말하기**
  (p.171 — asking a favour, and turning one down) and the **생각 나누기** at the foot of
  문화 산책 — free conversation, all four.
- **과제 itself** — a game of Yut played in the room. What is on screen is its rules.
- **익힘책 문법과 표현 3 연습 1 item 5** (p.144) — an empty picture box and an empty B line;
  the 정답 pages give it nothing because there is nothing to give.

Art will not bring any of these back.
