# Unit 18 art notes — 18과 한국에 온 지 벌써 6개월이 되었어요

Nothing in this chapter is drawn yet. Every bank ships answerable without art, which is a
decision rather than an oversight, and each one records it in its own `artNote`. This file
is the list of what would be drawn, and — more usefully — **which rows currently work around a
missing picture**, because those are the rows an illustration would actually improve rather
than decorate.

## Why this chapter needs art less than the last one

17과 was colours and patterns, and a greyscale scan settled none of it. 18과 is feelings and
weather, and the book prints the words beside its drawings: 어휘 1 on p.204 puts its five
feelings under five drawings, and 어휘 2 on p.205 lays the twelve weather words out as a grid
of four seasons. The one page that is nothing but drawings — the timeline of activities in
문법과 표현 1 연습 1 on p.206 — has no answer to mark and is in no bank.

## The word list (108 words, 0 illustrated)

Every word carries a hint emoji and none claims a PNG. The groups, in the order the chapter
prints its sections:

| group | words | what a picture would carry |
| --- | --- | --- |
| 감정 | 11 | the five feelings of p.204 — 그립다, 아쉽다, 정(이) 들다, 후회가 되다, 기억에 남다 — each as the moment that causes it |
| 계절과 날씨 | 28 | the p.205 grid, one season to a column — 꽃이 피다, 장마가 시작되다, 단풍이 들다, 얼음이 얼다 and the rest; this is the group art would help most |
| 문법과 표현 | 31 | little — these are forms, and the counted nouns their examples need (마리, 그릇, 잔) |
| 말하기 | 7 | the classroom of p.208, and the airport 나나 is already picturing in it |
| 듣고 말하기 | 15 | a radio studio at four in the afternoon, and a letter read on air |
| 읽고 쓰기 | 8 | a homestay family at the table, and the same family at the goodbye |
| 과제 | 3 | a club noticeboard — 가입하다 is the only word in the group a picture can hold |
| 문화와 발음 | 5 | a snowy night, the one thing on p.220 that can be drawn without the poem |

## The rows a picture is currently standing in for

These are the exact places where the book asks with a drawing and the bank asks with words.
If art is drawn, these are the rows to revisit — not to rewrite, since every one of them is
answerable as it stands, but because a picture would put back what the page meant.

**익힘책**

* `u18-grammar-1-1`, all five rows. The page prints B's answer and a drawing of the activity,
  and nothing on it says in words what the activity is. Each row names it on its own 그림
  line — 한국어를 공부하다, 두 사람이 사귀다, 태권도를 배우다, 안경을 끼다, 약을 먹다 — and the 정답
  on printed pp.209-210 settles the question. Art would restore the whole exercise.
* `u18-grammar-2-1`, the first four rows. The number is in the drawing only — three cups, a
  clock at bedtime and another at waking, four dogs, a calendar with its months torn off — and
  each row names the count on its 그림 line. The last two rows print their numbers and need
  nothing.
* `u18-vocab-3`, all five rows, but only as decoration: the page draws each dialogue's weather,
  and every blank is settled by the words on the page.

**교과서**

* `u18sgk-vocab-1` and `u18sgk-vocab-2` in full. The book's 어휘 spread asks for sentences of
  the learner's own about its drawings and its grid, so these two pages are rebuilt out of
  sentences the chapter goes on to say — three from the p.208 conversation and two from 주디's
  letter for the feelings, five off the 말하기 2 passage on track 87 for the weather. A drawing
  would decorate them; none of them depends on one.
* `u18sgk-culture-1`. 「눈 내리는 밤」 is by 강소천, who died in 1963, and is in copyright until
  2033, so the page is built from its frame and the poem stays in the book. A picture of a
  snowy night is the one thing that could stand beside that frame without quoting a line — and
  it must not quote one, in a caption or anywhere else.

**Desk quiz**

* No row carries art, and none needs it: every question is about a form the chapter prints, a
  feeling or a weather word it names, or its closing 발음 review.

## What would have to be true before a picture is added

The same three rules the other units' art is held to, as this chapter meets them:

1. A row's picture may not answer its question. For `u18-grammar-2-1` that means the drawing
   may carry the count — it is what the page gives — but never the particle: four dogs, not
   four dogs and an exclamation mark.
2. A feeling's picture has to be the situation, not the face. 아쉽다 and 그립다 look the same on
   a face; what separates them in the 익힘책 is what happened — a trip missed through nobody's
   fault, a friend who is simply far away — so that is what gets drawn.
3. `validateQuiz` in `admin/lib/world.js` rebuilds a quiz from a fixed field list and drops
   `art` silently. Adding pictures to the desk means adding `art` to that list first, or the
   next admin save removes every one of them — which is how three other units lost theirs.
