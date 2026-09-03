# 🌾 Hangeul Valley

A Stardew-Valley-flavoured Korean vocabulary game. You plant a Korean word, answer a
three-phase quiz as the crop grows, harvest it for Gold, and spend the Gold on new
vocabulary packs, farm plots and cosmetics. 25 levels of 1,500 words in the TOPIK 1–3
range, plus six textbook and exam worlds that carry their own vocabulary — 2,371 unique
words across the game. (`checkReadmeCounts` in `scripts/validate_content.js` fails if any
figure in this paragraph drifts from the content.)

Built with Phaser 3 and vanilla JS — no build step, no framework, no bundler.
Farm props and the player walk cycle are HD PNGs in `sprites/` (catalogued in
`sprites/catalog.json`); letter-matrix sprites in `js/renderer.js` remain as fallback.

The [TOPIK artwork review](docs/topik-art-review.md) tracks individual images
for the full TOPIK Vocabulary Book, with per-word prompts and review progress.
The [initial vocabulary art review](docs/art-review.md) preserves the earlier
before/after repairs. Use `npm run audit:vocab-art` to check image sharing separately from
catalog integrity; `npm run test:pixel-art` checks the sprite processor (Python
and Pillow required).

---

## Quick start

### Browser

Any static file server from the repo root works; the game fetches `levels.json` and
`facts.json` over HTTP, so `file://` will not do.

```bash
npx serve -l 8742 .
```

Then open <http://localhost:8742/index.html>.

### Desktop (Windows)

A PyWebView wrapper hosts the same HTML in a native window and swaps `localStorage`
for a real save file (`save_data.json`).

```bash
python -m pip install pywebview
python main.py
```

Or double-click `run.bat`. Note `run.bat` hardcodes a Python path and falls back to
`python` on `PATH`.

### Admin panel

The dashboard (levels, word origins, Unit 10, art library) is a local Express app
because saves write into the git working copy.

```bash
cd admin && npm install && npm start
```

Then open <http://localhost:3000>.

A **read-only** copy is also on the Vercel site, for viewing the art library and
curriculum without running Node locally:

<https://hangeul-valley.vercel.app/admin/>

Edits (save layout, add words, Sync Files) stay on the local server. The Vercel
copy shows a Read-only badge and hides those buttons.

---

## Controls

| Control | Action |
|---|---|
| `WASD` / arrows | Move |
| Click a nearby object | Interact — plant, water, harvest, talk |
| `I` / `E` | Inventory |
| `C` | Cooking |
| `Esc` | Close the top modal |

On a touchscreen the farm scene shows a virtual thumbstick and an interact button instead.
They appear only where `(pointer: coarse)` matches — the question is whether the *primary*
pointer is imprecise, which `navigator.maxTouchPoints` does not answer (it lights up on a
touchscreen laptop being driven by its trackpad) and a width breakpoint does not answer either
(it lights up on a narrow desktop window). The media query is watched for changes, so plugging
in a mouse takes effect without a reload.

The stick is analog: a half push walks at half speed. It feeds `touchAxis`, which
`FarmScene.update()` adds to the keyboard vector, so animation, facing and dust puffs need no
knowledge of which device the player used. Normalization happens only past unit length —
keyboard diagonals are √2 and still get scaled back exactly as before, while a partly pushed
stick keeps its magnitude. The interact button routes through `triggerInteract()`, which
uses the same nearest-in-range catalog as keyboard Space so the two cannot drift apart.
Farm clicks go through `pointerWorldPlan()` in `js/systems/pointer.js`: hover highlight
and click-to-interact (only when the farmer is in range). Movement stays on WASD / the
stick — clicking empty ground does not walk.

Each unit is a world pack (`WORLD_PACKS`): Valley spawns shop/minigames/pond; Unit 10
spawns desk+kitchen+taste+cassette; Units 11, 13 and 14 spawn the desk and the cassette
player. `currentWorldPack()` reads the station list out of the world JSON and falls back
to `WORLD_PACKS`, so the two have to agree — a station listed in only one of them is a
station that does not appear.
Switching units tears the previous pack down instead of hiding sprites.

### On-screen furniture

`#hud` is `flex-wrap: wrap`, so its height changes with the window, with which buttons have
unlocked, and with whether the pixel fonts have finished loading. Nothing may anchor itself
beneath it with a fixed offset — that is what the seasonal banner did, at a hardcoded 66px
that landed on the button row whenever the bar wrapped to two lines. The banner is gone now,
but the constraint outlives it: measure the bar, do not assume its height.

The level progress bar is a child of `#hud` rather than a floating element. It was
`position: fixed; top: 10px; right: 14px`, which is exactly where the HUD sits and at the same
z-index, so it covered the right-hand end of the bar — 249×44px of the button row at 1915 wide.

`#controls-tip` is centred with `translateX(-50%)` and so needs both `width: max-content` and
`max-width: calc(100vw - 28px)`. Without the clamp it hangs off both edges below ~980px;
without `max-content` it collapses toward its longest word and goes five lines tall on a phone.

Layer order, lowest first: game canvas → HUD (100) → modals (200+). Every modal covers the
viewport, so anything below 200 is hidden while one is open.

---

## How the learning loop works

Scheduling is real SM-2 spaced repetition. The farming loop maps onto it directly:
the three-touch plant → water → harvest cycle *is* the set of learning steps, and
harvesting a word graduates it into day-scale review.

```
new ──plant──> learning ──30s──> ──90s──> review ──1d──> ──3d──> ──8d──> ──20d──> mature
                  ↑                          │
                  └──────── relearning <─────┘   (failed a review)
```

### Learning a new word — three touches

| Phase | Question | What it is |
|---|---|---|
| 🌱 1 — Plant | **Korean shown**, pick its meaning from four options | Recognition. Teaches the pairing; you cannot be asked to produce a word you have never seen. |
| 💧 2 — Water | Type the Korean (or pick it by ear, if a Korean voice is installed) | Recall with support |
| 🍎 3 — Harvest | Type the Korean, with a recall scaffold shown | Production recall → graduates the word |

### Reviewing — one touch, on schedule

Once graduated, a word resurfaces on its own schedule. Open the farm and words that
have come due are already standing there as ripe crops: harvesting one is its review.
Two plots are always kept free so a review backlog never blocks learning something new.

Answers are graded Again / Hard / Good / Easy, inferred from signals that cannot be
gamed — a wrong attempt, a paid hint or a near-miss all mean Hard; a clean fast typed
answer means Easy. Failing a review is a lapse: the word loses half its interval, its
ease drops, and it goes back through relearning.

Two properties worth knowing:

- **An interval can only be earned by waiting.** Answering a word ahead of its due
  date counts as a rep and reschedules it, but does not grow the interval — you cannot
  reach "mature" by drilling one word twenty times in a sitting. Reaching 21 days takes
  roughly four correctly spaced reviews over about 80 real days.
- **Easy never skips a learning step.** In Anki, Easy is a deliberate "I already knew
  this"; here it is inferred from answering quickly, which a learner shown the word
  thirty seconds ago manages from short-term memory. So every word goes through all
  three touches.

Answers are normalized before comparison — NFC (so a Mac or iOS Korean IME emitting
decomposed jamo grades the same as a Windows one), zero-width characters stripped,
inner whitespace collapsed, trailing punctuation removed. A one-jamo slip is accepted as
"close enough" with a Hard grade rather than thrown away.

**Word spacing never affects the grade.** 띄어쓰기 is an orthographic convention, not part of
the word, so `어깨가 무겁다` and `어깨가무겁다` are compared space-stripped and both score exact.
This was a real defect rather than a nicety: the answer key had every phrase written solid,
and the jamo tier read a single missing space as a one-edit slip — so a learner who typed the
idiom the way the dictionary writes it was capped at Hard on every repetition, permanently
depressing that word's interval. Phrases needing more than one space (`눈코 뜰 새 없이 바쁘다`)
fell past the one-edit threshold and graded wrong outright.

A word can declare alternates explicitly:

```json
{ "ko": "아버지", "en": "father", "acceptedAnswers": ["아버님"] }
```

`acceptedAnswers` (or `answersKo` / `variantsKo`) is preferred over inlining alternates as
`"가다 / 걷다"` in `ko` — a list states intent, splitting a text field guesses at it. The
delimiter split still works for existing entries.

Progressive hints are priced to keep them a real decision: romanization is free,
initial consonants (초성) cost 5 coins, hearing the word costs 10, and the word's
origin costs 10. Using any of them caps the grade at Hard.

**The scaffold above the input must not contain the answer.** Phase 3 is what sets the word's
interval, so `renderRecallScaffold()` reports only how many syllables the word has and whether
it ends on a 받침 — never the syllables themselves, and never which 받침. Everything that spells
the word out stays behind the buttons above, which are priced and which cap the grade.

Three separate paths were handing the answer over for free, none of them setting `paidHints`,
so a word could be typed straight off the screen and still graded Easy:

| Path | Showed | Now |
|---|---|---|
| `renderStructure()` in the phase-3 panel | `[o-ppa] · 2 syllables (오 · 빠) · final syllable 빠 …` | syllable count and 받침 presence only |
| `fact.origin` in the phase-3 panel | `父 (부) “father” + 母 (모) “mother”` — the reading of 부모, and the same string the 10-coin button sells | topical note only |
| `getRoman()` behind the free 🔤 button | a 36-word table falling back to `\|\| ko`, so 1,485 of 1,500 words printed the Korean itself | Revised Romanization derived from the Hangul |

Retiring that table surfaced a fourth bug: its one entry that disagreed with the derived form,
병원 → `byeong-won`, was the correct one. `RR_JUNGSEONG` romanized ㅝ as `weo`; Revised
Romanization spells it `wo`. It was the only one of the 21 vowels that did not match the
standard, and it reached 47 words.

### Each skill schedules separately

Knowing 아버지 on sight is not the same skill as typing it from memory, so every word carries
an independent interval, ease and due date **per modality**:

| Modality | Question | Role |
|---|---|---|
| `type` | Type the Korean for an English word | **Primary.** Production is the hardest skill, it is what the learning cycle ends on, and it is what `graduated` and `mature` measure. |
| `recognise` | Korean shown, pick the meaning | Teaches first contact; schedules on its own |
| `listen` | Hear the word, pick the spelling | Only where a Korean voice exists, else falls back to typing |

Answering a four-option recognition question therefore cannot advance the production
schedule. Phase 1 seeds both tracks — recognition because that is what was tested, production
because the crop timer and phases 2–3 run on it — but only the modality actually answered has
its interval moved.

When a word comes due, the review tests **whichever modality expired**, not always typing.
Ties go to production.

### Two progress metrics, deliberately

| Metric | Means | Used for |
|---|---|---|
| **Learned** | graduated — through its learning steps at least once | Unlocking zones (Arcade, Fishing, Dungeon, Duel) and quest requirements |
| **Mature** | review interval ≥ 21 days | The Mastery stat, trophies, the dashboard |

Gating content on maturity would leave a new player staring at locked minigames for a
month, so unlocks track *learned* while *mature* is the long-haul goal. **📊 Progress**
in the HUD overflow menu shows what is due, the 7-day review forecast, retention rate
and per-level learned-vs-mature bars.

---

## Korean pronunciation

Words and example sentences use pre-rendered `ko-KR-SunHiNeural` MP3s at `-12%`
speed. The same clips work locally from `audio/ko/` and on the production CDN;
Web Speech with an installed Korean voice is the fallback for a missing clip.
The vocabulary book, word details and corrected exercises have 🔊 controls,
and 🐢 reads a word syllable by syllable. Playback can be muted from the HUD.

Generated clips are gitignored. After a fresh checkout, generate missing clips with
`npm run tts:generate`, or limit the work to the exam world with
`npm run tts:generate -- --world topik-2`. The harvest includes the TOPIK words,
their example sentences and the questions with correct answers filled in; it never
reads the question bank's wrong choices as model Korean.

---

## Data pipeline

Two generators produce the shipped data. Both are idempotent and safe to re-run.

```
levels.json ──┬─→ scripts/add_english_labels.js ──→ levels.json  (adds nameEn, descriptionEn, categoryEn)
              └─→ scripts/build_facts_json.js   ──→ facts.json   (word origins)
```

```bash
node scripts/add_english_labels.js
node scripts/build_facts_json.js
```

### `levels.json` — the curriculum

25 levels × 60 words. Each word carries Korean, English, an emoji hint and a category.
English labels sit alongside the Korean rather than replacing it, matching the
`name` / `nameKo` convention already used by `ITEM_DB`, because the Korean topic label
is itself material worth reading.

```json
{
  "level": 1,
  "name": "일상과 사람",
  "nameEn": "Daily Life & People",
  "description": "가족, 사람, 일상 동작 및 기본 상태 어휘",
  "descriptionEn": "Family, people, everyday actions and basic states",
  "words": [
    { "ko": "아버지", "en": "father", "hint": "👨",
      "category": "가족과 사람", "categoryEn": "Family & People" }
  ]
}
```

Two invariants on this file are worth knowing, both enforced by `validate_content.js`:

**Headwords carry the word-spaces standard Korean requires.** A particle attaches to the noun
before it, but the predicate that follows is a separate word — `어깨가 무겁다`, not `어깨가무겁다`.
The original data had all 1,500 written solid; 64 have been respelled, and the validator now
rejects any headword that runs an object particle 을/를 or a subject particle 이/가 into a
following predicate. Endings that legitimately fuse to a Sino root are excluded, since
감동적이다 is 感動的 + 이다 and 만족스럽다 is 滿足 + 스럽다 — one word each.

Compound nouns are deliberately left alone. 한글 맞춤법 제49항 permits 전문 용어 to be written
solid, so 중앙도서관 and 지구온난화 are defensible either way and a rule there would be taste
rather than correctness. Loanword compounds (`데이터 센터`, `스마트 시티`) are spaced, because
standard orthography does not write those solid.

**No two headwords share an English gloss.** 미술 and 예술 both read "art", so a four-option
recognition question could render two identical buttons and score one of them wrong. Six such
pairs existed; each now has a distinguishing gloss. `buildOptionSet` in `js/ui.js` also dedupes
on the rendered label, so a future collision cannot reach the screen — but the data invariant
is what the learner actually needs.

### `facts.json` — word origins

**Generated. Do not hand-edit.** Keyed by the Korean headword (all 1,500 are unique,
unlike the English glosses). Structured rather than pre-rendered prose, so the UI
decides presentation:

```json
{ "부모":     { "o": "sino", "h": "父母", "p": [["父","부","father"], ["母","모","mother"]] },
  "건강하다":  { "o": "sino-verb", "h": "健康", "p": [...], "s": "하다" },
  "커피":     { "o": "loan", "l": "coffee" },
  "아버지":    { "o": "native", "note": "respectful term for one's father" } }
```

Romanization, syllable count and 받침 are derived from the Hangul at render time, so
they are deliberately not stored.

To add or correct an origin, edit the curated `SINO` / `MIXED` / `LOANWORDS` /
`NATIVE_SET` / `NATIVE_NOTE` maps in `scripts/build_facts_json.js` and re-run it. The admin
panel shows origins read-only and its write endpoints return `409` for this reason.

**Coverage is 1500 / 1500 (100%), with real hanja for 1004 words.** A bare `-하다` no longer
implies Sino-Korean: that heuristic labelled 시원하다 and 달콤하다 as "하다 attaches to a
Sino-Korean root" with no character to show. Those 고유어 are in `NATIVE_SET`; a derived
form that would inherit the *wrong* homophone (이사하다 ≠ 理事, 정의하다 ≠ 正義) has its
own hanja. Remaining `-하다` / `-적` words were curated root-by-root so every Sino label
carries a character. No entry renders a blank.

Reaching 100% did not mean relaxing the standard the file was rebuilt on. The inherited data
asserted "Native Korean (고유어)" for ~1,090 words with no evidence and mislabelled a great deal
of Sino-Korean along the way (건강검진, 환경오염, 기술혁신). Every entry here was read against its
English gloss. Where a word resisted a clean answer it got an honest one rather than a
convenient one: 구두 is filed as a loanword from Japanese くつ *with the uncertainty stated in
the gloss*, because "usually attributed, not settled" is more use to a learner than either a
confident lie or a blank.

`NATIVE_SET` is a plain list of headwords that are native with nothing more to say — the
panel renders "Native Korean (고유어)", which is the useful fact, because it tells the learner
there is no hanja to look for. It is a checked list and not a default, which is the whole
difference from the inherited data. The trap is the everyday word that *looks* native and is
not: 내일 (來日), 점심 (點心), 양말 (洋襪), 지갑 (紙匣), 시계 (時計), 안경 (眼鏡), 감기 (感氣),
항상 (恒常), 냉면 (冷麵), 반찬 (飯饌) all live in `SINO`.

That trap is not hypothetical. 침대 (寢臺), 책상 (冊床), 식탁 (食卓), 전세 (傳貰), 월세 (月貰)
and 지인 (知人) were all drafted into `NATIVE_SET` during the fourth pass and pulled back out on
review. A word being everyday furniture vocabulary says nothing about whether it has hanja.

**Where a word is genuinely contested it stays `unknown`.** 구두 most likely reached Korean
through Japanese くつ, and "probably a loanword" is not a thing to put on a flashcard. Native +
Sino compounds like 옷장, 게시글, 민속놀이 and 댓글 are left alone for the same reason: they fit
neither bucket cleanly, and forcing them would teach something false.

Origin classes: `native`, `sino`, `sino-partial` (compound built on a known root),
`sino-verb`, `sino-passive`, `sino-adj`, `sino-noun`, `mixed`, `mixed-native`, `mixed-loan`,
`loan-mixed`, `loan`, `loan-partial`, `idiom`, `discourse`, `unknown`.

`mixed-native` and `loan-mixed` exist because the panel prints a compound's halves in the order
the word has them. `mixed` puts the hanja first, which is right for 남동생 (男 + 동생) and wrong
for 옷장 (옷 + 欌); `mixed-loan` puts the hanja first, which is right for 온실가스 (溫室 + gas) and
wrong for 가스비. A breakdown in the wrong order is worse than no breakdown, because the learner
reads it as the word's actual shape. `unknown` is still a valid class and still renders
pronunciation only — nothing currently uses it.

### How curation is targeted

Roots are chosen by cascade potential rather than alphabetically. Because
`sino-partial` and `loan-partial` match curated multi-syllable roots inside compounds,
curating 실업 (失業) also resolves 실업률, 청년실업 and 실업수당. Measuring which roots
appear inside the most still-uncurated words is what moved coverage from 30% to 42% for
about 35 new root entries.

**That well is now dry.** Measuring again before the third pass found only four multi-syllable
roots left inside three or more uncurated words, and they were native (가락, 놀이) or a verb
ending (하다). The 586 that remain are mostly standalone two-syllable words — 465 of the 864 at
the start of that pass — so there is no leverage left to find and curation is now one word at a
time. The third pass therefore worked by semantic category instead, which is what makes the
glosses usable as evidence: 눈 is native as "eye", 열 is 熱 as "fever" and not the native "ten",
시 is 詩 as "poem" and not 時 or 市. Without reading the gloss those are coin flips.

Single-syllable hanja is never inferred: one Hangul reading maps to many characters
(차 = 茶 / 車 / 差 / 次), so a word whose parts cannot be vouched for stays `unknown`.

Readings are shown with the **initial-sound rule** (두음법칙) made explicit — 여행 renders
as `旅 (려 → 여) + 行 (행)`, because printing only the dictionary reading looks like a typo
next to the word on screen, and printing only the surface form hides a rule learners need.

The generator refuses to emit an origin class that `renderOrigin()` in `js/ui.js` has no
case for. That switch ends in `default: return ''`, so without the check a new class would
produce entries that are curated but silently display nothing.

### Corrections to the original data

Five entries asserted hanja that contradicted their own reading or breakdown:

| Word | Was | Now |
|---|---|---|
| 무료 | 免費, decomposed as 無 + 料 | 無料 |
| 환불 | parts listed in reverse | 還拂 |
| 계좌이체 | 口座 (reads 구좌, the obsolete term) | 計座移替 |
| 병원 | 醫院 (reads 의원 — a clinic, or an assembly member) | 病院 |
| 과일 | 果實 (reads 과실) | native, naturalised — noted as related to 果實 |

Three headwords were the wrong word outright, which no amount of respacing fixes:

| Word | Was | Now | Why |
|---|---|---|---|
| tighten one's belt | 허리띠를둘러매다 | 허리띠를 졸라매다 | 둘러매다 is to sling something over a shoulder |
| step forward eagerly | 발을벗고나서다 | 발 벗고 나서다 | the idiom takes no 을 |
| application | 어플리케이션 | 애플리케이션 | 외래어 표기법 |

`애플리케이션` also had to be renamed in the generator's `LOANWORDS` map; without that it would
have fallen out of the `loan` class and coverage would have dropped by one with nothing saying
so. The two idioms are still classified `unknown` — correcting a headword is not the same as
curating its origin, and the `IDIOMS` map is the place for that.

Separately, 64 headwords were respelled with the word-spaces Korean orthography requires —
see the `levels.json` section above. The curated `IDIOMS` and `DISCOURSE` maps key on whole
headwords, so they moved with them. To stop that pairing drifting again, the generator now
refuses to run when a whole-word map holds a key matching nothing in `levels.json`:

```
ERROR: curated entries that match no word in levels.json:
  IDIOMS['어깨가무겁다']
```

The check covers `MIXED`, `MIXED_LOAN`, `NATIVE_NOTE`, `IDIOMS`, `DISCOURSE` and
`NATIVE_PREDICATES` only. `SINO` and `LOANWORDS` also hold bare roots for compound matching
(`데이터`, `센터`), so 53 and 68 of their keys respectively are not standalone words by design.
Without the check a respelled headword silently falls back to `unknown` and coverage drops
with nothing to point at.

---

## Project layout

```
js/              game scripts; js/manifest.json is the load order
css/game.css     HUD and overlay styles
index.html       DOM overlays + ordered <script> tags
levels.json      curriculum (25 levels × 60 words)
facts.json       generated word origins, lazy-loaded
sprites/         HD PNG library + catalog.json
worlds/          textbook worlds (Unit 10 layout, quiz, word list, Unit 14 workbook)
audio/book/      textbook drill recordings, cut one clip per exchange
docs/            procedures too long for this file
main.py          PyWebView desktop wrapper + file-based save API
tests/           game suites (SRS, shop, sprites, inventory, cooking)
scripts/         data generators, content validator, R2 upload
admin/           Express admin panel (writable locally; read-only on Vercel)
api/             Vercel serverless functions (save, admin GET, Unit 10)
```

The study desk offers up to three things, and Units 10 and 14 carry all
three: 퀴즈 (multiple choice), 교과서 — the 교과서's own 말하기 / 듣기 / 읽기 / 과제 /
문화 산책 / 발음 / 자기 평가 pages — and 연습 문제, the 익힘책's 어휘, 문법과 표현
and 문형 연습 with the book's own audio on the pattern drills. Both exercise banks
are the same file format read by the same renderer; what separates them is the row
of the desk menu that opened them, so nothing drills the same sentence twice.
[docs/workbook-exercises.md](docs/workbook-exercises.md) covers the data model,
the exercise types, cutting a drill track, and what to change when a second unit
lands.

The cassette player beside the desk plays the book's own tracks with the script alongside,
and takes dictation one sentence at a time. Both screens draw the recording as a waveform:
click to seek, drag out a stretch to loop it, `↻ 반복` to repeat the whole thing, and
0.5×/0.75× to slow it down. 듣기 also takes keys — space, `a` / `b` to mark the loop, `r` to
replay it, `c` to clear, arrows to nudge and change track; 받아쓰기 deliberately takes none,
because it has a text input. The peaks are decoded from the mp3 at runtime — nothing to
regenerate when a clip is re-cut, and a strip still decoding says `WAVEFORM…` rather than
drawing bars that would read as a flat recording.
[docs/cassette-dictation.md](docs/cassette-dictation.md) covers cutting a book track,
aligning a 듣기 transcript, and why the loop is two mechanisms rather than one.

The exam world beside the textbook units is not a chapter: it grows one TOPIK question at
a time from photographs, grouped by question type rather than by the day a question
arrived, and a sitting draws one question from the whole paper.
[docs/exam-questions.md](docs/exam-questions.md) covers adding a question, the rule that
every word must trace back to a paper or an explicit learner vocabulary list, and the gloss-key discipline that decides whether
a learner can hover the thing the question is actually testing.
[docs/topik-vocabulary.md](docs/topik-vocabulary.md) records the daily-life word list,
its practice examples, icon references and the scoped TTS command.

`js/scenes/` holds five scenes — `FarmScene` (the hub), `ArcadeScene`, `DungeonScene`,
`FishingScene`, `BeeScene` — with the pixel renderer, chiptune synth, day/night and
weather systems, and the economy, quest, inventory and cooking systems in `js/systems/`
and siblings. There is no bundler: `index.html` loads the files as classic script tags.

Repo root is the only copy of the shipped game. Desktop (`main.py`) and Vercel both
serve those files; there is no `assets/` mirror.

---

## Saves

State is written to `localStorage` under `hv_save_v2`, and additionally to
`save_data.json` via the PyWebView bridge on desktop. Save format is **v9**, with the
migration chain in `migrateSaveData()`.

Both copies are read on load and the newer `updatedAt` wins. Preferring the file
unconditionally used to lose the last session: `flushSave()` writes `localStorage`
synchronously and then awaits the PyWebView bridge, and `pagehide` cannot await anything,
so closing the window right after a save left the file one write behind. The comparison is
safe because both copies have a single writer — the desktop build runs on its own WebView2
profile, so nothing else can put a competing entry in that `localStorage`. A tie goes to
the file, which is the copy that survives a profile reset. On the Python side the file is
written to a temp file and renamed into place, so an interrupted write cannot leave a
truncated save behind.

The v4 → v5 step converts the old `{p2At, p3At, harvests}` SRS records into SM-2
entries. Nobody is reset: harvest count is a usable proxy for how well a word was
known, so it seeds `reps` and an interval, staggered across days so a veteran save does
not dump hundreds of reviews into one afternoon. Intervals are capped just below the
maturity threshold — maturity has to be earned under the real scheduler rather than
granted retroactively. The migration is idempotent.

The v5 → v6 step nests each schedule under its modality. An old single-track entry lands
on the production track, because the three-touch cycle it was earned through ends on
typing. Recognition and listening start unseeded rather than inheriting an interval
nobody demonstrated — inheriting would claim a skill that was never tested.

The v6 → v7 step carries records onto the 64 respelled headwords. `srsData`, `harvestCounts`,
`plots` and `attemptLog` all key on `ko`, so without it every respelled word would read as
brand new and years of review history would sit stranded under a spelling nothing looks up
any more. Every respelling only *inserts* spaces, so `KO_V7_RESPELLINGS` lists just the new
forms and the old key is recovered by removing them — there is no old→new table that can fall
out of sync with itself. Where both spellings somehow exist the new one wins as the later
write, except harvest counts, which take the larger rather than discarding a tally.

Deriving the pairing from `levelsData` would be self-maintaining but wrong: `initSave()` runs
on `DOMContentLoaded` and `levelsData` is not populated until `FarmScene` preloads
`levels.json`, so the migration would silently find nothing to move.

The v7 → v8 step does the same move for three headwords that were the wrong *word* rather than
the wrong spacing, and it is a separate step precisely because those cannot be derived. The
case that settles it: a pre-v7 save holds `발을벗고나서다`, and stripping the spaces from the
corrected `발 벗고 나서다` gives `발벗고나서다` — which would never have matched. So `KO_V8_RENAMES`
is an explicit table, keyed on the *post-v7* spellings, which is safe because v7 always runs
first. Both steps share `applyKoRenames()`; the tests assert that no v8 target is also a v8 key
(a single pass would otherwise chain renames in declaration order) and that no v8 target
collides with a v7 one.

The v8 → v9 step adds the character-skin fields, defaulting `equippedSkinId` to `farmer` and
making sure `farmer` is in `ownedSkinIds`. It is field-fill only and deliberately does not
read the live skins catalog, because `test_srs_engine.js` extracts `migrateSaveData()` into a
VM that has only the rename tables.

Writes are debounced 800 ms because `collectSave()` serializes the entire state
(currencies, SRS for 1,500 words, plots, inventory, quests, recipes, buffs,
leaderboards, ground drops) and `persistSave()` is called from ~35 places including
every quiz answer. `flushSave()` writes through immediately and runs on scene
shutdown, page hide and the explicit 💾 Save button.

---

## Tests

Everything below runs on push and on PRs to `main` via `.github/workflows/ci.yml`. From the
repo root, after `npm ci` in `admin/`:

```bash
npm run validate     # data invariants — the content gate
npm run verify:facts # facts.json still reproduces from its generator
npm test             # SRS, shop, sprite matrices, inventory, cooking, farm hero
npm run test:admin   # admin API, sync, frontend, edge cases
# or: npm run test:all
```

CI runs `npm run verify:facts`, which regenerates `facts.json` and fails if the result differs
from what was committed. `facts.json` is a generated artifact, and the only way to notice
someone hand-editing it — which the file’s own header forbids — is to check that the generator
still reproduces it exactly. The check reads the file before regenerating rather than diffing
afterwards, so an uncommitted hand-edit is reported instead of being silently repaired — which
is how one reached `main` once.

Every suite exits non-zero on failure, which is what makes any of this a gate rather than
decoration. That was not free: `test_m2_harness.js` printed `FINAL VERIFICATION RESULT: FAIL`
and then exited 0, so a broken sprite matrix would have gone green. Both it and
`validate_content.js` were checked by deliberately breaking the thing they guard and
confirming a non-zero exit.

A check can also fail to be a gate while exiting correctly, in two ways worth auditing for.
One is unreachable: a check for a manifest entry with no file could never fire, because every
listed script is read hundreds of lines earlier and throws first. The other is vacuous:
`[].every(...)` is `true` and `[].some(...)` is `false`, so a check over a collection that
turned out empty passes without examining anything — which is indistinguishable from passing
for the right reason, and is what a probe looking for the wrong key produces.

Both were swept for by instrumenting the runtime rather than reading the source: patch
`Array.prototype.every/some/filter` to record the call site whenever the receiver is empty,
then run the validator and each test file and attribute the hits. Swept once across the whole
suite as it stood — 2,439 invariants and 2,168 assertions — which turned up one dead check,
since deleted, and no vacuous ones. Attribution
lands on the nearest frame in the file being audited, so a hit is a candidate to read rather
than a defect — of the five in `tests/`, all five were sound.

`validate_content.js` is the one to run before committing data changes. It asserts the
shape of `levels.json` and `facts.json` (25 levels, 1500 words, no duplicate Korean
headwords, every word carrying `categoryEn`, every `facts.json` entry matching a real
word), that Korean headwords carry their required word-spaces and no two share an English
gloss, that no origin class can render blank, and that **no Vietnamese has crept back into the shipped source** — an invariant
that was established by hand and previously unguarded.

Its three excluded characters are deliberate and documented in the script: `ã`/`õ` for the
Portuguese loanword etymologies (pão, sabão) and `é` for "pet cafés".

`test_srs_engine.js` runs the scheduler extracted from `js/systems/srs.js` in a bare vm and
injects `now` into every call, which is why `srsSchedule` takes it as a parameter — it
lets months of review history be simulated without touching the clock.

### Two suites that used to be unrunnable

Both are green now, and both were blocking CI rather than merely being untidy.

`test_m1_challenger_harness.js` passed 49/49 and then never exited, so it had to be killed by
hand. The cause was a module-scope side effect in `js/state.js`: the buff-HUD ticker is a 1-second
`setInterval` that nothing ever clears, guarded only by `typeof window !== 'undefined'`. This
harness mocks `window`, so the guard passed and the timer kept the Node process alive forever.
The same mock — of `document` this time — also defeated `loadFacts()`'s browser check, so every
run fetched a relative URL and dumped an `ERR_INVALID_URL` trace into its own output.

Both now test `IS_NODE` (`process.versions.node`), which a DOM mock cannot fake. That is the
general lesson: in this codebase `typeof window !== 'undefined'` does not mean "in a browser",
it means "someone defined window".

`test_m2_challenger_cooking.js` failed 4 of 61 because it asserted **exactly 10** recipes and
stocked a hand-written ingredient list that predated the honey recipes, so honey was missing
and those two could not be cooked. It now reads both the recipe count and the shopping list off
`COOKING_RECIPES`, stocking the *sum* of each ingredient's demand rather than the largest
single requirement — the recipes are cooked back to back, so a shared ingredient runs out
partway through.

That last failure was hiding a real bug rather than being purely a test problem. The
`master_chef` trophy carried `reqRecipes: 10`, and the trophy card preferred it over
`COOKING_RECIPES.length` while the actual unlock compared against the real length. Once the
honey recipes brought the total to 12, the card read `10/10` and showed the requirement as met
on a trophy that could never unlock. The hardcoded count is gone; both paths read one source.

Left out of CI historically: `scripts/verify_m2_m3.js`. It now runs standalone
(`node scripts/verify_m2_m3.js`): syntax-check via `checkGameScripts()` plus
`facts.json` / `levels.json` coverage keyed by Korean headword. The checks
overlap the suites above, so it is still not a CI gate.

---

## Deployment

Static hosting on Vercel. `js/` and `index.html` are served from git. Curriculum JSON,
worlds, sprites, and `skins/catalog.json` are rewritten in `vercel.json` to the public
R2 CDN (`cdn.daveynfts.com/hangeul-valley/`). Player saves stay on **private** R2 via
`/api/save`.

That split is intentional (content can change without a git push), but the two channels
must land in order: **R2 first, then Vercel**. A new `js/scenes/farm.js` that preloads a
PNG which is not yet on the CDN 404s in prod.

Merging to `main` publishes automatically. `.github/workflows/publish.yml` waits for the
**CI** workflow to succeed on a `push` to `main`, then runs `npm run publish:prod`
(validate → R2 upload → CDN verify → Vercel Deploy Hook). Manual rerun is still
Actions → Publish → Run workflow.

Locally, the same command is:

```bash
npm run publish:prod
```

It runs `validate` → `PutObject` for every catalogued file → `HeadObject` + public GET of
the four required JSON files → POST `VERCEL_DEPLOY_HOOK_URL`. Credentials live in
`.env.local` (see `.env.example`). `--dry-run` prints the file list and does not touch
the network. `--skip-deploy` is content-only.

Repo secrets required for R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`. Optional Vercel
secrets (used in this order): `VERCEL_DEPLOY_HOOK_URL`, or `VERCEL_TOKEN` +
`VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`. If neither Vercel secret is set, the job
still uploads R2 and leaves the Git-connected Vercel deploy to ship JS.

`npm run upload:r2` still uploads without deploying Vercel, if you only need the CDN.

---

## Roadmap

1. **PWA install and offline.** The touch controls have landed, so the farm is playable on a
   phone; installability is what is left. It needs Phaser vendored into the repo first — the
   game loads it from a CDN, so a service worker cannot make the app work offline while its
   engine still comes over the wire.
2. **Cloud save.** Losing SRS history when changing machines is a dealbreaker now that
   the history is the product.
3. **Daily review cap and a "day rollover" notion.** Reviews currently come due at the
   exact timestamp they were scheduled; a real study tool batches by day boundary and
   caps how many land at once so a backlog cannot become unmanageable.
4. **Vite / PWA modules.** Script-tag split of the engine is done (`js/*` + `js/manifest.json`).
   Vite remains a later PR if we need minify, code-split, or a service worker.
5. **Consider FSRS.** SM-2 is a solid baseline, but FSRS fits intervals to the learner's own
   review log — and the log it needs is now being recorded (see below), so the input is there.
6. **Stable item IDs.** `facts.json` and `srsData` key on `ko` alone, so two entries sharing
   a spelling would collide. All 1,500 headwords are currently unique, making this latent
   rather than live — a hash of `ko` + part of speech fixes it. The v6 → v7 respelling made
   the cost of the current scheme concrete: correcting a headword's spelling means a save
   migration, a facts regeneration and a curated-map update, all because the spelling *is*
   the identity. A stable ID would have made it a one-line data edit.

### Review history

Every graded answer is appended to a bounded log (`attemptLog`, 500 entries, saved with the
rest of the state): the word, the grade, which question mode produced it, the timestamp, and
the resulting interval and state. SM-2 keeps only the current interval and ease and throws
the history away, but retention analysis and FSRS both need it, and it cannot be
reconstructed after the fact. Nothing depends on it yet beyond the dashboard's rolling
accuracy and 14-day activity strip.

Done in earlier passes: English unification, generated `facts.json`, Korean TTS, the
SM-2 scheduler with its learning-step reconciliation, recognition and listening question
modes, per-modality scheduling, fuzzy answer matching, the progress dashboard, the
origin-curation passes that took coverage from 30% to 100%, the 띄어쓰기 pass —
space-insensitive grading, 64 headwords respelled, three corrected outright, six shared glosses
split apart — closing the three paths that printed the answer during graded recall, and CI,
which meant first making the two unrunnable suites runnable.
