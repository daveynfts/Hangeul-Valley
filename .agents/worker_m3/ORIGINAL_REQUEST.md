## 2026-07-22T10:04:29Z
You are Worker M3 (teamwork_preview_worker).
Your working directory is `C:/VibeCode/Hangeul Valley/.agents/worker_m3/`.

Task: Implement Requirements R3 (Crafting/Cooking System with Korean Culture) & R4 (Pet Companion System) in `game.js`, `index.html`, and `save_data.json`.

Read the detailed exploration reports at:
- `C:/VibeCode/Hangeul Valley/.agents/explorer_m1_3/handoff.md`
- `C:/VibeCode/Hangeul Valley/.agents/orchestrator/context.md`

Specifications to implement:

1. **Crafting & Cooking System (R3)**:
   - **Ingredients**:
     - Farm crops (배추, 무, 파, 고추, 마늘, 쌀, 콩, 당근, 사과) and caught fish (연어, 고등어, 오징어, 잉어, 새우, 문어, 조개, 황금물고기) drop into `inventory.ingredients` with Korean names upon harvesting or catching.
   - **Recipe Book (요리책)**:
     - 8+ Korean recipes: 김치 (Kimchi), 비빔밥 (Bibimbap), 불고기 (Bulgogi), 떡볶이 (Tteokbokki), 삼겹살 (Samgyeopsal), 해물파전 (Seafood Pajeon), 잡채 (Japchae), 삼계탕 (Samgyetang), 김밥 (Gimbap).
     - Store unlocked recipes in `recipes.unlockedRecipes`.
   - **Cooking Mini-game**:
     - Timed-input sequence where players must type or select correct Korean ingredient names.
     - Cooking grade (S/A/B/F) determines buff duration and strength.
   - **Gameplay Buff System**:
     - Dishes grant temporary gameplay buffs: 2x Coin earn rate, +50% fishing luck, faster crop growth, +25% combat damage, extra quiz hints.
     - Active buffs managed in `activeBuffs` state with countdown timers and HUD indicators.
   - **Cultural Fact Overlays**:
     - Each recipe features authentic cultural facts (origin, tradition, regional details).
   - **UI Overlays**: `#recipe-overlay` and `#cooking-minigame-overlay` styled in 64-Bit Retro Glassmorphism (`.glass-modal`, `.glass-hud`, `.neon-border`, `.pixel-art-detail`).

2. **Pet Companion System (R4)**:
   - **5 Collectible Pets (반려동물)**:
     - 강아지 (Dog / Puppy): Coin Magnet & Auto-Water Crops.
     - 고양이 (Cat): Feline Nunchi (+25% Combat Damage).
     - 토끼 (Rabbit): Rapid Hop (+50% Crop Growth Speed).
     - 햄스터 (Hamster): Pouch Duplicator (+30% Double Harvest).
     - 앵무새 (Parrot): Echo Scholar (+1 Extra Quiz Hint & +20% Fishing Luck).
   - **Pet Acquisition**: Spent via Gems 💎, quest rewards, or seasonal prizes.
   - **Pet Leveling & Vocabulary Quizzes**: XP from activities. Leveling up requires answering a Korean vocabulary quiz about pet species & characteristics. Higher level = stronger passives.
   - **Pet Happiness & Feeding**: Happiness meter (0-100%) decays over time (-5% every 5 min). Restore happiness by feeding cooked Korean dishes (from R3) or completing Korean practice. Unhappy pets (<50%) give reduced passive bonuses.
   - **Pet Panel UI**: `#pet-overlay` styled in 64-Bit Retro Glassmorphism displaying pet roster, active pet equip, level up quiz button, dish feeding button, and happiness bar.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification Steps:
- Execute `node -c game.js` and `node -c assets/game.js` to ensure zero syntax errors.
- Ensure all save state extensions (`inventory`, `recipes`, `pets`, `activeBuffs`) serialize cleanly in `v4` schema.
- Write your handoff report to `C:/VibeCode/Hangeul Valley/.agents/worker_m3/handoff.md`.

Send your final summary to orchestrator via `send_message`.
