## 2026-07-23T01:47:36Z
<USER_REQUEST>
You are Forensic Auditor (Integrity Auditor).
Your working directory is: `C:\VibeCode\Hangeul Valley\.agents\teamwork_preview_auditor_m3`
Project root: `C:\VibeCode\Hangeul Valley`
Scope document: `C:\VibeCode\Hangeul Valley\.agents\orchestrator\PROJECT.md`

Objective:
1. Create your working directory `C:\VibeCode\Hangeul Valley\.agents\teamwork_preview_auditor_m3` if needed and write `progress.md` with liveness timestamp.
2. Perform systematic forensic integrity checks on `index.html`, `assets/index.html`, and `game.js`:
   - Check if any test results, element states, or dynamic values were hardcoded or mocked.
   - Check if `index.html` and `assets/index.html` are genuinely synchronized (byte-for-byte identical).
   - Check if all 12 HUD button element IDs and handlers are genuinely wired to active code without dummy/facade implementations.
   - Check if CSS rules actually implement layout separation (Tier 1 vs Tier 2) rather than fake display rules.
   - Run `node -c game.js` and verify zero errors.
3. Document audit findings, evidence, and verdict (CLEAN / INTEGRITY VIOLATION) in `audit.md` and `handoff.md` in your working directory. Send a message to the parent (orchestrator) with your verdict. Do NOT modify source code files outside your working directory.
</USER_REQUEST>
