import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
arcade_lines = lines[2536:2773]

print(f"Total lines in _genArcadeTextures: {len(arcade_lines)}")

# Find all arcade texture keys created
created_arcade_keys = []
for i, l in enumerate(arcade_lines):
    m = re.findall(r'createTexture\(scene,\s*[\'\"]([^\'\"]+)[\'\"]', l)
    if m:
        created_arcade_keys.extend(m)

print(f"Arcade texture keys created ({len(created_arcade_keys)}):")
for k in created_arcade_keys:
    print("  ", k)

# Inspect palette P in _genArcadeTextures
print("\n=== ARCADE PALETTES & CODE ===")
for l in arcade_lines[:60]:
    print(l)

