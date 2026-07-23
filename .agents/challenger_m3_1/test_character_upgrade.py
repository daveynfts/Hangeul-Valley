"""
Automated Test Specialist Suite for Hangeul Valley Character Design Upgrade
Script: test_character_upgrade.py
Author: Challenger 1 (Automated Test Specialist)

Tests:
1. Syntax Validation: Run `node -c game.js` and `node -c assets/game.js`, asserting exit code 0.
2. Texture Key Verification: Parse `game.js` to assert registration of required texture keys.
3. Animation Key & Frame Count Verification: Assert `player-water`, `player-harvest`, `player-pick`, `cat-idle`, `cat-walk`, `cat-sit`, `cat-sleep` exist with correct frame counts.
4. File Synchronization: Verify SHA-256 hash equality between root files and assets/ mirror copies.
5. Matrix Dimensional Stress Audit: Empirical stress test for pixel matrix dimensions.
"""

import os
import sys
import re
import hashlib
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
GAME_JS = os.path.join(PROJECT_ROOT, 'game.js')
ASSETS_GAME_JS = os.path.join(PROJECT_ROOT, 'assets', 'game.js')

total_tests = 0
passed_tests = 0
failed_tests = 0

def assert_test(condition, name, details=""):
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    if condition:
        passed_tests += 1
        print(f"[PASS] {name}")
    else:
        failed_tests += 1
        print(f"[FAIL] {name} - {details}")

print("================================================================")
print(" HANGEUL VALLEY CHARACTER DESIGN UPGRADE TEST SUITE (PYTHON)")
print(f" Project Root: {PROJECT_ROOT}")
print("================================================================\n")

# -----------------------------------------------------------------------------
# 1. Syntax Validation
# -----------------------------------------------------------------------------
print("--- TEST SUITE 1: JavaScript Syntax Validation ---")
res_root = subprocess.run(["node", "-c", GAME_JS], capture_output=True, text=True)
assert_test(res_root.returncode == 0, "1.1 Syntax check root game.js", res_root.stderr.strip())

res_assets = subprocess.run(["node", "-c", ASSETS_GAME_JS], capture_output=True, text=True)
assert_test(res_assets.returncode == 0, "1.2 Syntax check assets/game.js", res_assets.stderr.strip())

# Read game.js content
with open(GAME_JS, 'r', encoding='utf-8') as f:
    content = f.read()

# -----------------------------------------------------------------------------
# 2. Texture Key Verification
# -----------------------------------------------------------------------------
print("\n--- TEST SUITE 2: Texture Key Verification ---")
required_textures = [
    'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
    'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
    'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle',
    'cat_idle_0', 'cat_idle_1',
    'cat_walk_0', 'cat_walk_1', 'cat_walk_2',
    'cat_sit_0', 'cat_sit_1',
    'cat_sleep_0', 'cat_sleep_1'
]

for tex in required_textures:
    # Check registration via createTexture
    pattern = rf"createTexture\s*\(\s*scene\s*,\s*['\"]{tex}['\"]"
    found = re.search(pattern, content) is not None
    assert_test(found, f"2. Texture Key Registered: '{tex}'", f"Found createTexture call for {tex}")

# -----------------------------------------------------------------------------
# 3. Animation Key & Frame Count Verification
# -----------------------------------------------------------------------------
print("\n--- TEST SUITE 3: Animation Key & Frame Count Verification ---")
expected_anims = {
    'player-water': (4, ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']),
    'player-harvest': (3, ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']),
    'player-pick': (3, ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']),
    'cat-idle': (2, ['cat_idle_0', 'cat_idle_1']),
    'cat-walk': (4, ['cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_walk_1']),
    'cat-sit': (2, ['cat_sit_0', 'cat_sit_1']),
    'cat-sleep': (2, ['cat_sleep_0', 'cat_sleep_1'])
}

for anim_key, (exp_count, exp_frames) in expected_anims.items():
    # Extract animation creation string
    pattern = rf"reg(?:Once|CatAnim)?\s*\(\s*['\"]{anim_key}['\"]\s*,\s*\[([^\]]+)\]"
    match = re.search(pattern, content)
    if match:
        frames_raw = match.group(1)
        frames = [f.strip(" '\"\t\n") for f in frames_raw.split(',')]
        assert_test(len(frames) == exp_count, f"3.1 Anim Frame Count: '{anim_key}'", f"Expected {exp_count}, got {len(frames)}")
        assert_test(frames == exp_frames, f"3.2 Anim Frame Sequence: '{anim_key}'", f"Expected {exp_frames}, got {frames}")
    else:
        assert_test(False, f"3. Animation Existence: '{anim_key}'", "Not found in reg/regOnce/regCatAnim calls")

# -----------------------------------------------------------------------------
# 4. File Synchronization Verification
# -----------------------------------------------------------------------------
print("\n--- TEST SUITE 4: File Synchronization Verification ---")
mirrored_files = ['game.js', 'index.html', 'levels.json', 'save_data.json']

for fname in mirrored_files:
    r_path = os.path.join(PROJECT_ROOT, fname)
    a_path = os.path.join(PROJECT_ROOT, 'assets', fname)
    
    if not os.path.exists(r_path) or not os.path.exists(a_path):
        assert_test(False, f"4. File Sync: {fname}", "Missing file in root or assets")
        continue

    h_root = hashlib.sha256(open(r_path, 'rb').read()).hexdigest()
    h_assets = hashlib.sha256(open(a_path, 'rb').read()).hexdigest()

    match = h_root == h_assets
    assert_test(match, f"4. SHA-256 Hash Match: {fname}", f"Root: {h_root[:10]}... Assets: {h_assets[:10]}...")

# -----------------------------------------------------------------------------
# 5. Matrix Dimensional Stress Audit
# -----------------------------------------------------------------------------
print("\n--- TEST SUITE 5: Matrix Dimensional Stress Audit ---")

# Parse array definitions in game.js for pick_down_2
pick_2_match = re.search(r"const\s+pick_down_2\s*=\s*\[([^\]]+)\];", content, re.DOTALL)
if pick_2_match:
    rows = [r.strip(" '\"\t\r\n") for r in pick_2_match.group(1).strip().split('\n') if r.strip()]
    num_rows = len(rows)
    assert_test(num_rows == 16, "5.1 Matrix Dimension Check: 'player_pick_down_2'", f"Expected 16 rows, got {num_rows} rows.")
else:
    assert_test(False, "5.1 Matrix Dimension Check: 'player_pick_down_2'", "pick_down_2 definition not found")

print("\n================================================ strang ==============")
print(f" SUMMARY: {total_tests} Total Tests | {passed_tests} Passed | {failed_tests} Failed")
print("=======================================================================")

sys.exit(1 if failed_tests > 0 else 0)
