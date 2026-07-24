## 2026-07-24T08:53:20Z
You are Worker 1 for Milestone 2 & 3: VOCAB_FACTS Revamp and getFunFact Upgrade.
Your working directory is `C:/VibeCode/Hangeul Valley/.agents/worker_m2_m3`. Create your folder if needed.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Mission:
1. Revamp `VOCAB_FACTS` in `C:/VibeCode/Hangeul Valley/game.js` and `C:/VibeCode/Hangeul Valley/assets/game.js` for all ~1,500 words in `levels.json`.
   - Coverage: Must cover ALL 1,500 words (or at least ≥ 1,400 words).
   - Key in `VOCAB_FACTS`: `(word.en || '').toLowerCase()` matching `getFunFact` lookup key.
   - Field `vi`: Detailed vocabulary explanation containing:
     a) Word Origin: Native Korean (고유어), Hanja (한자어 with specific Chinese character breakdown if applicable, e.g. 父母 = 부모), or Loanword (외래어).
     b) Example Korean sentence + English translation.
     c) Common usage context.
   - Field `ko`: Recall Hints containing:
     a) Hangul syllable decomposition + romanization (e.g. 2 syllables: a-beo-ji [a · beo · ji]).
     b) Memorable mnemonic visual or emotional association.
     c) Short 3-5 word Korean example sentence + romanization (e.g. 아버지가 웃으십니다 [Abeojiga useusimnida]).

2. Upgrade `getFunFact` and add helper functions in `game.js` and `assets/game.js` (lines ~4904-4923):
   - Add Unicode Hangul decomposition helpers `decomposeHangulWord` and `getHangulRomanization` with `RR_CHOSEONG`, `RR_JUNGSEONG`, `RR_JONGSEONG`.
   - Upgrade `getFunFact(word)` to perform:
     a) Direct lookup in `VOCAB_FACTS[(word.en||'').toLowerCase()]`.
     b) Fallback: Calculate exact Hangul syllable count (U+AC00-U+D7A3), extract romanization, batchim status, category matching (both Korean category names and English categories), and generate dynamic `vi` and `ko` fallback fields.
   - Reference Explorer 2's analysis at `c:/Hangeul Valley/.agents/teamwork_preview_explorer_m1_2/analysis.md` for exact fallback implementation details.

3. Rules & Technical Constraints:
   - Edit ONLY `VOCAB_FACTS` object definition and `getFunFact` (plus helper functions placed adjacent to `getFunFact`).
   - Do NOT touch any code outside VOCAB_FACTS and getFunFact in `game.js` and `assets/game.js`.
   - Pass `node -c game.js` and `node -c assets/game.js`.
   - Synchronize `game.js` and `assets/game.js` (ensure they are 100% identical byte-for-byte).
   - Verify that `VOCAB_FACTS` has ≥ 1,400 entries.

4. Deliverables:
   - Create build/generation script if helpful (e.g. `scripts/build_vocab_facts.js`).
   - Run verification checks (`node -c game.js`, coverage verification, sync check) and document commands and output in your handoff report.
   - Write full report to `C:/VibeCode/Hangeul Valley/.agents/worker_m2_m3/handoff.md`.
   - Send message to parent with completion status and report path.
