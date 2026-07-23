import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
fish_lines = lines[2159:2536]

print(f"Total lines in _genFishingTextures: {len(fish_lines)}")

# Find all fish species keys created
created_fish_keys = []
for i, l in enumerate(fish_lines):
    m = re.findall(r'createTexture\(scene,\s*[\'\"](fish_[^\'\"]+|fishing_[^\'\"]+)[\'\"]', l)
    if m:
        created_fish_keys.extend(m)

print(f"Fish texture keys created ({len(created_fish_keys)}):")
for k in created_fish_keys:
    print("  ", k)

# Inspect palette P in _genFishingTextures
print("\n=== FISH PALETTE ===")
for l in fish_lines[:45]:
    print(l)

