# 🌾 Hangeul Valley

A Stardew-Valley-flavoured Korean vocabulary game. You plant a Korean word, answer a
three-phase quiz as the crop grows, harvest it for Gold, and spend the Gold on new
vocabulary packs, farm plots and cosmetics. 25 levels, 1,500 words, TOPIK 1–3 range.

Built with Phaser 3 and vanilla JS — no build step, no framework, no bundler. All
sprites are generated procedurally from character-matrix + palette definitions in
`game.js`, so the whole game ships as four static files.

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

An Express dashboard for editing the curriculum (`levels.json`) and reviewing word
origins.

```bash
cd admin && npm install && npm start
```

---

## Controls

| Key | Action |
|---|---|
| `WASD` / arrows | Move |
| `Space` / `E` | Interact — plant, water, harvest, talk to an NPC |
| `I` / `E` | Inventory |
| `C` | Cooking |
| `Esc` | Close the top modal |

Keyboard only — there are no touch controls yet, so the farm scene is not playable on
a phone.

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

Words are read aloud in `ko-KR` through the Web Speech API — 🔊 buttons in the vocab
book, fun-fact modal and cat dialog, plus automatic playback when you answer
correctly. A 🐢 button re-reads the word syllable by syllable.

This needs a Korean voice installed on the operating system. Where none is available
every speak control hides itself (`.tts-unavailable .tts-only`) rather than offering
buttons that do nothing, and the paid audio hint refuses without charging. Playback
can be muted from the 🔊 Audio button in the HUD; the choice persists.

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
pairs existed; each now has a distinguishing gloss. `buildOptionSet` in `game.js` also dedupes
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
`NATIVE_NOTE` maps in `scripts/build_facts_json.js` and re-run it. The admin panel
shows origins read-only and its write endpoints return `409` for this reason.

**Coverage is 636 / 1500 (42%), with real hanja for 279 words.** The remaining 864 are
classified `unknown`, and the UI shows pronunciation for them rather than inventing an
origin. That gap is deliberate: the original data asserted "Native Korean (고유어)" for
~1,090 words with no evidence, mislabelling plenty of Sino-Korean vocabulary (건강검진,
환경오염, 기술혁신). Unknown stays unknown. The admin dashboard's **Not Curated** list is
the backlog.

Origin classes: `native`, `sino`, `sino-partial` (compound built on a known root),
`sino-verb`, `sino-passive`, `sino-adj`, `sino-noun`, `mixed`, `mixed-loan`, `loan`,
`loan-partial`, `idiom`, `discourse`, `unknown`.

### How curation is targeted

Roots are chosen by cascade potential rather than alphabetically. Because
`sino-partial` and `loan-partial` match curated multi-syllable roots inside compounds,
curating 실업 (失業) also resolves 실업률, 청년실업 and 실업수당. Measuring which roots
appear inside the most still-uncurated words is what moved coverage from 30% to 42% for
about 35 new root entries.

Single-syllable hanja is never inferred: one Hangul reading maps to many characters
(차 = 茶 / 車 / 差 / 次), so a word whose parts cannot be vouched for stays `unknown`.

Readings are shown with the **initial-sound rule** (두음법칙) made explicit — 여행 renders
as `旅 (려 → 여) + 行 (행)`, because printing only the dictionary reading looks like a typo
next to the word on screen, and printing only the surface form hides a rule learners need.

The generator refuses to emit an origin class that `renderOrigin()` in `game.js` has no
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
game.js          450 KB, ~12.1k lines — engine, 5 Phaser scenes, all game systems
index.html       113 KB — DOM overlays and all CSS inline
levels.json      280 KB — curriculum
facts.json        58 KB — generated word origins, lazy-loaded
main.py          PyWebView desktop wrapper + file-based save API
assets/          mirror of the four shipped files (see caveat below)
scripts/         data generators
admin/           Express admin panel + its own test suite
```

`game.js` holds five scenes — `FarmScene` (the hub), `ArcadeScene`, `DungeonScene`,
`FishingScene`, `BeeScene` — plus the pixel renderer, chiptune synth, day/night and
weather systems, and the economy, quest, inventory and cooking systems.

> **`assets/` is a duplicate.** `main.py` serves from the repo root and copies the four
> files into `assets/` on startup; `admin/lib/sync.js` writes both copies. Two sources
> of truth for the same content — worth collapsing.

---

## Saves

State is written to `localStorage` under `hv_save_v2`, and additionally to
`save_data.json` via the PyWebView bridge on desktop. Save format is **v8**, with the
migration chain in `migrateSaveData()`.

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

Writes are debounced 800 ms because `collectSave()` serializes the entire state
(currencies, SRS for 1,500 words, plots, inventory, quests, recipes, buffs, seasonal,
leaderboards, ground drops) and `persistSave()` is called from ~35 places including
every quiz answer. `flushSave()` writes through immediately and runs on scene
shutdown, page hide and the explicit 💾 Save button.

---

## Tests

Everything below runs on push and on PRs to `main` via `.github/workflows/ci.yml`. All of it
also runs locally with no setup beyond `npm ci` in `admin/`.

```bash
node scripts/validate_content.js      # data invariants — the content gate, 21 checks
node test_srs_engine.js               # SM-2 scheduler + save migration, 147 assertions
node test_r2_shop_vm.js               # shop + plot expansion, 65 assertions
node test_m2_harness.js               # sprite matrix / palette integrity
node test_m1_challenger_harness.js    # inventory, modals, ground drops — 49 assertions
node test_m2_challenger_cooking.js    # cooking engine + recipes — 62 assertions
cd admin && npm test                  # admin API, sync, frontend, edge cases — 44 assertions
```

CI also re-runs `scripts/build_facts_json.js` and fails if that produces a diff. `facts.json`
is a generated artifact, and the only way to notice someone hand-editing it — which the file's
own header forbids — is to check that the generator still reproduces it exactly.

Every suite exits non-zero on failure, which is what makes any of this a gate rather than
decoration. That was not free: `test_m2_harness.js` printed `FINAL VERIFICATION RESULT: FAIL`
and then exited 0, so a broken sprite matrix would have gone green. Both it and
`validate_content.js` were checked by deliberately breaking the thing they guard and
confirming a non-zero exit.

`validate_content.js` is the one to run before committing data changes. It asserts the
shape of `levels.json` and `facts.json` (25 levels, 1500 words, no duplicate Korean
headwords, every word carrying `categoryEn`, every `facts.json` entry matching a real
word), that Korean headwords carry their required word-spaces and no two share an English
gloss, that no origin class can render blank, that `assets/` has not drifted from the root
copies, and that **no Vietnamese has crept back into the shipped source** — an invariant
that was established by hand and previously unguarded.

Its three excluded characters are deliberate and documented in the script: `ã`/`õ` for the
Portuguese loanword etymologies (pão, sabão) and `é` for "pet cafés".

`test_srs_engine.js` runs the scheduler extracted from `game.js` in a bare vm and
injects `now` into every call, which is why `srsSchedule` takes it as a parameter — it
lets months of review history be simulated without touching the clock.

### Two suites that used to be unrunnable

Both are green now, and both were blocking CI rather than merely being untidy.

`test_m1_challenger_harness.js` passed 49/49 and then never exited, so it had to be killed by
hand. The cause was a module-scope side effect in `game.js`: the buff-HUD ticker is a 1-second
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

Left out of CI: `scripts/verify_m2_m3.js`. It is undocumented, already failed on `main` before
this work, and everything it checks — syntax, `assets/` parity, `levels.json` coverage — is
covered by the suites above. It dies evaluating `game.js` in a bare vm on unguarded browser
globals; one of those (`window.addEventListener` at what is now the `pywebviewready` block) is
fixed here because it was inconsistent with the `typeof`-guarded block directly above it, but
the rest of that chain was not worth chasing to revive a redundant script.

---

## Deployment

Static hosting. `vercel.json` sets `cleanUrls`; the four shipped files live at the
repo root, which is what Vercel serves.

---

## Roadmap

1. **Curate the remaining 864 word origins.** Coverage is 42%; the next lift comes from
   the same cascade method — measure which roots appear inside the most uncurated
   compounds and curate those, rather than working through the list in order. The admin
   dashboard's **Not Curated** list is the working queue.
2. **Mobile.** Virtual joystick and tap-to-interact for `FarmScene`, then PWA install.
   The review loop suits phones better than desktop — vocabulary study is what people do
   on a bus.
3. **Cloud save.** Losing SRS history when changing machines is a dealbreaker now that
   the history is the product.
4. **Daily review cap and a "day rollover" notion.** Reviews currently come due at the
   exact timestamp they were scheduled; a real study tool batches by day boundary and
   caps how many land at once so a backlog cannot become unmanageable.
5. **Split `game.js` into modules** behind Vite. `FarmScene` alone is ~2.4k lines, and
   ~1.7k lines of cooking/seasonal/leaderboard code sit at top level after `BeeScene`.
6. **Consider FSRS.** SM-2 is a solid baseline, but FSRS fits intervals to the learner's own
   review log — and the log it needs is now being recorded (see below), so the input is there.
7. **Stable item IDs.** `facts.json` and `srsData` key on `ko` alone, so two entries sharing
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
second origin-curation pass that took coverage from 30% to 42%, the 띄어쓰기 pass —
space-insensitive grading, 64 headwords respelled, three corrected outright, six shared glosses
split apart — closing the three paths that printed the answer during graded recall, and CI,
which meant first making the two unrunnable suites runnable.
