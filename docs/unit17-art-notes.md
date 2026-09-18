# Unit 17 art notes — 17과 비행기를 놓칠 뻔했어요

Nothing in this chapter is drawn yet. Every bank ships answerable without art, which is a
decision rather than an oversight, and each one records it in its own `artNote`. This file
is the list of what would be drawn, and — more usefully — **which rows currently work around a
missing picture**, because those are the rows an illustration would actually improve rather
than decorate.

## Why this chapter needs art more than the last one

16과 was about a holiday, and a holiday can be described. 17과 is about **colours, patterns
and things going wrong**, and two of its three 어휘 pages are swatches. Printed p.183 is
twelve colour chips and four pattern swatches with their names under them; printed p.182 is
eight drawings of accidents. A greyscale scan of a colour page settles nothing at all, which
is why the 정답 pages had to decide four rows of the 익힘책 that the book expects a reader to
answer by looking.

## The word list (126 words, 0 illustrated)

Every word carries a hint emoji and none claims a PNG. The groups, in the order the chapter
prints its sections:

| group | words | what a picture would carry |
| --- | --- | --- |
| 사고 | 19 | the eight mishap verbs of p.182 — 넘어지다, 부딪히다, 떨어뜨리다, 불이 나다, 사고가 나다, 고장이 나다, 놓치다, 잃어버리다 — each as the moment it happens |
| 색과 무늬 | 30 | the twelve colours as chips and the four patterns as cloth; this is the group art would help most |
| 문법과 표현 | 19 | little — these are forms |
| 말하기 | 17 | the airport goodbye and the lost-property counter |
| 듣고 말하기 | 15 | an 외국인등록증, a 출입국관리사무소 counter, a 경찰서 |
| 읽고 쓰기 | 11 | the lost camera itself: black body, red strap, striped grey bag |
| 과제 | 3 | the picture-card story the page is built on |
| 문화와 발음 | 12 | a 색동저고리, which is the one thing on p.197 worth seeing |

## The rows a picture is currently standing in for

These are the exact places where the book asks with a drawing and the bank asks with words.
If art is drawn, these are the rows to revisit — not to rewrite, since every one of them is
answerable as it stands, but because a picture would put back what the page meant.

**익힘책**

* `u17-vocab-1`, all four rows. The page prints three greyscale drawings a row and asks for
  the colour they share. Each row here names the three things instead — 우유, 눈사람, 구름 —
  and the answers come from the 정답 on printed p.208. Art would restore the whole exercise.
* `u17-vocab-2`, three rows. The garment's pattern is in the drawing; the colour is already
  in the printed line, so the rows name the garment and ask for the pattern.
* `u17-grammar-4-1`, five of six rows. The place — 벽, 책상 위, 가방, 교실, 침대 — is in the
  drawing only, so the partner's question carries it instead: 교실 벽에 뭐가 있어요?
* `u17-grammar-3-3` item 4. Two blanks and a photograph of two garments. The 정답 on p.209
  gives 하얀 셔츠 and 까만 바지; nothing else on the page decides it.

**교과서**

* `u17sgk-listen-1` item 2, `u17sgk-listen-2` item 2 and `u17sgk-read-1` item 1. All three
  are printed as pictures to tick and are written out here as the words that separate them.
  모범 답안 on printed p.268 is the authority for all three.
* `u17sgk-vocab-1` and `u17sgk-vocab-2` in full. The book's 어휘 spread is pictures, so
  these two pages are rebuilt out of sentences the chapter says out loud elsewhere.

**Desk quiz**

* No row carries art. Two of the fourteen come off the picture pages — the colour forms and
  the dot pattern — and both are asked as forms rather than as things, so neither needs one.

## What would have to be true before a picture is added

The same three rules the other units' art is held to:

1. A row's picture may not answer its question. 벽에 걸려 있는 시계 beside a row that asks
   whether the clock is 걸려 있어요 or 걸고 있어요 is a hint, not an illustration.
2. A colour word's picture has to be *the colour*, not an object that happens to be that
   colour. 빨간색 is a chip; 사과 is an apple.
3. `validateQuiz` in `admin/lib/world.js` rebuilds a quiz from a fixed field list and drops
   `art` silently. Adding pictures to the desk means adding `art` to that list first, or the
   next admin save removes every one of them — which is how three other units lost theirs.
