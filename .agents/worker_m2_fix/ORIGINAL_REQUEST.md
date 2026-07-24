## 2026-07-24T09:00:00Z
<USER_REQUEST>
You are Worker 2 for Iteration 2 Remediation of Victory Audit Findings.
Your working directory is `C:/VibeCode/Hangeul Valley/.agents/worker_m2_fix`. Create your directory if needed.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
Remediate the 3 findings reported by the Victory Auditor in `C:/VibeCode/Hangeul Valley/game.js` and `C:/VibeCode/Hangeul Valley/assets/game.js`:

Finding 1: STRICT CONSTRAINT VIOLATION (Code Boundaries)
- Problem: `RR_CHOSEONG`, `decomposeHangulWord`, `getHangulRomanization`, etc. were defined at global scope outside `VOCAB_FACTS` and `getFunFact`.
- Fix: Move ALL helper constants (`RR_CHOSEONG`, `RR_JUNGSEONG`, `RR_JONGSEONG`) and helper functions (`decomposeHangulWord`, `getHangulRomanization`) INSIDE the body of `function getFunFact(word) { ... }`.
- Ensure ZERO code modifications exist outside `const VOCAB_FACTS = { ... };` and `function getFunFact(word) { ... }`.

Finding 2: R1 (`vi` field) CONTENT FORMAT VIOLATION
- Problem: 331 entries used `한자어` without proper Hán-Hàn origin tag / Hanja breakdown.
- Fix: Update the generation script / dictionary so that all Sino-Korean words in `VOCAB_FACTS` explicitly use `từ Hán-Hàn (한자어)` or `Hán-Hàn` as origin tag, with Hanja breakdown if applicable (e.g. `Gốc từ Hán-Hàn (한자어 - 父母)` or `Gốc: từ Hán-Hàn (한자어)`). Ensure 0 entries use raw `한자어` without `Hán-Hàn`.

Finding 3: R2 (`ko` field) TEMPLATE PLACEHOLDER VIOLATION
- Problem: 2 entries ('social network service' and 'producer') contained malformed empty template placeholders `[] ()` in their `ko` hint string.
- Fix: Regenerate or update `VOCAB_FACTS` entries for 'social network service' and 'producer' so that their `ko` fields have complete, valid Hangul decomposition, romanization, mnemonic, and Korean sentence without any empty `[] ()`. Scan all entries in `VOCAB_FACTS` to guarantee 0 entries contain empty `[]` or `()` placeholders.

Verification & Delivery:
- Run generator script or update code cleanly.
- Verify `node -c game.js` and `node -c assets/game.js` return exit code 0.
- Synchronize `game.js` and `assets/game.js` so they are 100% byte-for-byte identical.
- Write full handoff report to `C:/VibeCode/Hangeul Valley/.agents/worker_m2_fix/handoff.md`.
- Send message to parent with completion status and report path.
</USER_REQUEST>
