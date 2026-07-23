import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

# _genPlayerTextures spans lines 863 to 1378
player_lines = lines[862:1378]

print(f"Total lines in _genPlayerTextures: {len(player_lines)}")

# Find all createTexture calls in _genPlayerTextures
created_keys = []
for i, l in enumerate(player_lines):
    m = re.findall(r'createTexture\(scene,\s*[\'\"]([^\'\"]+)[\'\"]', l)
    if m:
        created_keys.extend(m)
        print(f"Line {863+i}: {m}")

print(f"\nTotal player/farmer texture keys created: {len(created_keys)}")
print(created_keys)

