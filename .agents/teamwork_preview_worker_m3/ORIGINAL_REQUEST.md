## 2026-07-24T13:39:01Z
You are Worker for Milestone 3 (Final Dual-File Synchronization & Syntax Check) for Hangeul Valley.
Working directory: d:\Hangeul Valley\.agents\teamwork_preview_worker_m3.

Your tasks:
1. Check byte-for-byte SHA256 synchronization between:
   - d:\Hangeul Valley\game.js <-> d:\Hangeul Valley\assets\game.js
   - d:\Hangeul Valley\index.html <-> d:\Hangeul Valley\assets\index.html
2. If there are any differences, copy the canonical root files into assets/ so they are 100% byte-identical.
3. Perform syntax validation using run_command:
   node -c "d:\Hangeul Valley\game.js"
   node -c "d:\Hangeul Valley\assets\game.js"
4. Run SHA256 hash checks on all 4 files and confirm byte-level identity.
5. Write handoff report with exact SHA256 hashes and syntax results in d:\Hangeul Valley\.agents\teamwork_preview_worker_m3\handoff.md.
Send message back to parent when done.
