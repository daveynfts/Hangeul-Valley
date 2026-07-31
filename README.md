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

Each word moves through three phases on its plot. Every phase is a quiz you must pass
in Korean:

| Phase | Prompt | Reward |
|---|---|---|
| 🌱 1 — Plant | Type the Korean for an English word | Seed goes in |
| 💧 2 — Water | Type it again after the seedling sprouts | Crop ripens |
| 🍎 3 — Harvest | Type it once more, with origin + pronunciation hints shown | Gold, XP, a droppable item |

Getting phase 3 wrong sends the crop back to phase 2. Answers are graded on exact
Hangul match after NFC normalization, so a Mac or iOS Korean IME (which emits
decomposed jamo) grades the same as a Windows one.

Progressive hints are available during a quiz, priced to keep them a real decision:
romanization is free, initial consonants (초성) cost 5 coins, hearing the word costs
10, and the word's origin costs 10.

Zones (Arcade, Fishing, Dungeon, Duel) are gated behind mastery of specific levels.

> **Heads up on "SRS".** The code calls the phase timers SRS, but `SR1`/`SR2` are 30
> and 90 *seconds* — crop growth pacing, not spaced repetition. `srsData` stores no
> interval, ease factor or due date, and "mastered" means harvested ≥3 times, which
> can all happen inside one session. Treat the current build as a vocabulary game
> with a farming loop, not a retention tool. Turning this into real day-scale
> scheduling is the single biggest open item.

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
`save_data.json` via the PyWebView bridge on desktop. Save format is v4 with a
migration path in `migrateSaveData()`.

Writes are debounced 800 ms because `collectSave()` serializes the entire state
(currencies, SRS for 1,500 words, plots, inventory, quests, recipes, buffs, seasonal,
leaderboards, ground drops) and `persistSave()` is called from ~35 places including
every quiz answer. `flushSave()` writes through immediately and runs on scene
shutdown, page hide and the explicit 💾 Save button.

---

## Tests

```bash
node test_m2_harness.js               # sprite matrix / palette integrity — passes
node test_r2_shop_vm.js               # shop + plot expansion, 60 assertions — passes
cd admin && npm test                  # admin API, sync, frontend, edge cases — 44 passes
```

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

Highest-value first, on the view that the game systems are far ahead of the learning
systems:

1. **Real spaced repetition.** Replace the 30/90-second timers with SM-2 or FSRS on a
   day scale — `interval`, `ease`, `dueAt`, `lapses`. Keep the crop animation timers
   for game feel but drive ripeness off review due dates, so logging in each day
   surfaces the words actually due. Redefine mastery as `interval >= 21 days` instead
   of three harvests.
2. **More question types.** Everything is currently EN→KO production typing, the
   hardest form. Add KO→EN multiple choice for recognition and listening questions now
   that audio exists, and accept near-misses (Levenshtein ≤ 1) rather than a flat ❌.
3. **Curate the remaining 1,049 origins**, ideally 300 TOPIK-1 words first.
4. **Mobile.** Virtual joystick and tap-to-interact for `FarmScene`, then PWA install.
5. **Cloud save** — losing SRS progress when changing machines is a dealbreaker for a
   study tool.
6. **Split `game.js` into modules** behind Vite. `FarmScene` alone is ~2.4k lines, and
   ~1.7k lines of cooking/seasonal/leaderboard code sit at top level after `BeeScene`.
7. **CI** — `node -c`, the passing harnesses, and a `levels.json` schema check.
