# BRIEFING — 2026-07-24T08:55:05Z

## Mission
Revamp `VOCAB_FACTS` dictionary in `game.js` & `assets/game.js` to cover all ~1,500 words in `levels.json` (≥1,400 words) with detailed origin, example sentence, usage context, syllable decomposition, mnemonic, short sentence. Also upgrade `getFunFact(word)` with Hangul decomposition helpers and rich dynamic fallback generation.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: implementer, qa, specialist
- Working directory: C:/VibeCode/Hangeul Valley/.agents/worker_m2_m3
- Original parent: 8c7ac785-6cfc-4fb2-b6ae-0f3781741efe
- Milestone: Milestone 2 & 3

## 🔒 Key Constraints
- Must cover ALL 1,500 words (or at least ≥ 1,400 words) in `VOCAB_FACTS`.
- Keys in `VOCAB_FACTS` must be `(word.en || '').toLowerCase()`.
- `vi` field: Word origin (고유어, 한자어 with Chinese characters, or 외래어), Example Korean sentence + English translation, Common usage context.
- `ko` field: Syllable decomposition + romanization, memorable mnemonic, short 3-5 word Korean example sentence + romanization.
- Add Unicode Hangul decomposition helpers (`decomposeHangulWord`, `getHangulRomanization`, `RR_CHOSEONG`, `RR_JUNGSEONG`, `RR_JONGSEONG`).
- `getFunFact(word)` must do direct lookup, or fallback calculating exact Hangul syllable count, romanization, batchim status, category matching, and generating dynamic `vi` and `ko` fallbacks.
- Edit ONLY `VOCAB_FACTS` and `getFunFact` (and adjacent helpers) in `game.js` and `assets/game.js`.
- Do NOT touch code outside `VOCAB_FACTS` and `getFunFact`.
- Pass `node -c game.js` and `node -c assets/game.js`.
- `game.js` and `assets/game.js` must be 100% byte-for-byte identical.

## Current Parent
- Conversation ID: 8c7ac785-6cfc-4fb2-b6ae-0f3781741efe
- Updated: 2026-07-24T08:55:05Z

## Task Summary
- **What to build**: Comprehensive `VOCAB_FACTS` lookup dictionary and upgraded `getFunFact` function.
- **Success criteria**: 1,494 entries in `VOCAB_FACTS` (100% of levels.json word coverage), valid `vi` and `ko` fields, exact sync between `game.js` and `assets/game.js`, valid JS syntax.
- **Interface contracts**: `getFunFact(word)` returns `{ vi: string, ko: string }`.

## Key Decisions Made
- Built automated, linguistically accurate generator script `scripts/build_vocab_facts.js` that maps all 1,500 words in `levels.json` into 1,494 unique lower-case `en` keys with Hanja breakdown, loanword detection, native Korean classification, example sentences, usage context, RR Unicode decomposition, mnemonics, and short sentences with particles.
- Added Unicode Hangul decomposition helpers `decomposeHangulWord` and `getHangulRomanization` with `RR_CHOSEONG`, `RR_JUNGSEONG`, `RR_JONGSEONG` as specified by Explorer 2's analysis.
- Upgraded `getFunFact(word)` with direct `VOCAB_FACTS` lookup and dynamic fallback for missing words.
- Created `scripts/verify_m2_m3.js` to empirically test syntax, 100% byte-for-byte synchronization, database coverage (1,494 entries), and function behavior.

## Change Tracker
- **Files modified**:
  - `game.js`: Replaced `VOCAB_FACTS` (lines 4822-4901) and `getFunFact` (lines 4904-4923) with 1,494 entry `VOCAB_FACTS` dictionary and upgraded `getFunFact` + Unicode decomposition helpers.
  - `assets/game.js`: Synchronized 100% byte-for-byte with `game.js`.
  - `scripts/build_vocab_facts.js`: Created generator script.
  - `scripts/verify_m2_m3.js`: Created empirical verification harness.
- **Build status**: PASS (node -c game.js and node -c assets/game.js passed with 0 errors).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS (5/5 empirical tests passed in verify_m2_m3.js).
- **Lint status**: 0 syntax errors.
- **Tests added/modified**: `scripts/verify_m2_m3.js`.

## Artifact Index
- ORIGINAL_REQUEST.md — Initial user instructions
- BRIEFING.md — Working state index
- progress.md — Liveness heartbeat and step updates
- handoff.md — Final task handoff report
