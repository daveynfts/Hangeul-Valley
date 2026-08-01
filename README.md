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
| 🍎 3 — Harvest | Type the Korean, with origin and pronunciation shown | Production recall → graduates the word |

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

Grading normalizes to NFC, so a Mac or iOS Korean IME (which emits decomposed jamo)
grades the same as a Windows one, and a one-jamo slip is accepted as "close enough"
with a Hard grade rather than thrown away.

Progressive hints are priced to keep them a real decision: romanization is free,
initial consonants (초성) cost 5 coins, hearing the word costs 10, and the word's
origin costs 10. Using any of them caps the grade at Hard.

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

**Coverage is 451 / 1500 (30%), with real hanja for 192 words.** The remaining 1,049
are classified `unknown`, and the UI simply shows pronunciation for them. That gap is
deliberate: the previous data asserted "Native Korean (고유어)" for ~1,090 words with
no evidence, mislabelling plenty of Sino-Korean vocabulary (건강검진, 환경오염,
기술혁신). Unknown now stays unknown. The admin dashboard's **Not Curated** list is the
backlog.

Origin classes: `native`, `sino`, `sino-partial` (compound built on a known root),
`sino-verb`, `sino-passive`, `sino-adj`, `sino-noun`, `mixed`, `mixed-loan`, `loan`,
`unknown`.

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
`save_data.json` via the PyWebView bridge on desktop. Save format is **v5**, with the
migration chain in `migrateSaveData()`.

The v4 → v5 step converts the old `{p2At, p3At, harvests}` SRS records into SM-2
entries. Nobody is reset: harvest count is a usable proxy for how well a word was
known, so it seeds `reps` and an interval, staggered across days so a veteran save does
not dump hundreds of reviews into one afternoon. Intervals are capped just below the
maturity threshold — maturity has to be earned under the real scheduler rather than
granted retroactively. The migration is idempotent.

Writes are debounced 800 ms because `collectSave()` serializes the entire state
(currencies, SRS for 1,500 words, plots, inventory, quests, recipes, buffs, seasonal,
leaderboards, ground drops) and `persistSave()` is called from ~35 places including
every quiz answer. `flushSave()` writes through immediately and runs on scene
shutdown, page hide and the explicit 💾 Save button.

---

## Tests

```bash
node test_srs_engine.js               # SM-2 scheduler + save migration, 93 assertions
node test_r2_shop_vm.js               # shop + plot expansion, 65 assertions
node test_m2_harness.js               # sprite matrix / palette integrity
cd admin && npm test                  # admin API, sync, frontend, edge cases — 44 assertions
```

`test_srs_engine.js` runs the scheduler extracted from `game.js` in a bare vm and
injects `now` into every call, which is why `srsSchedule` takes it as a parameter — it
lets months of review history be simulated without touching the clock.

Two known failures, both predating the current work:

- `test_m2_challenger_cooking.js` — 57/61. Asserts exactly 10 cooking recipes; two
  honey recipes were added later, so the count check and the Master Chef trophy
  assertions fail.
- `test_m1_challenger_harness.js` — 49/49 assertions pass but the process never exits,
  so it has to be killed. Something in `game.js` keeps the Node event loop alive.

---

## Deployment

Static hosting. `vercel.json` sets `cleanUrls`; the four shipped files live at the
repo root, which is what Vercel serves.

---

## Roadmap

1. **Curate the remaining 1,049 word origins**, ideally the 300 TOPIK-1 words first.
   The admin dashboard's **Not Curated** list is the working queue.
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
6. **CI** — `node -c`, the passing harnesses, and a `levels.json` schema check.
7. **Consider FSRS.** SM-2 is a solid baseline, but FSRS fits intervals to the learner's
   own review log and would use the lapse and ease history already being recorded.

Done in earlier passes: English unification, generated `facts.json`, Korean TTS, the
SM-2 scheduler with its learning-step reconciliation, recognition and listening question
modes, fuzzy answer matching, and the progress dashboard.
