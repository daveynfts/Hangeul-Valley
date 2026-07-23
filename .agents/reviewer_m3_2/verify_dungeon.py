import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
dungeon_lines = lines[2773:3010]

print(f"Total lines in _genDungeonTextures: {len(dungeon_lines)}")

# Find all dungeon monster and boss keys created
created_dungeon_keys = []
for i, l in enumerate(dungeon_lines):
    m = re.findall(r'createTexture\(scene,\s*[\'\"]([^\'\"]+)[\'\"]', l)
    if m:
        created_dungeon_keys.extend(m)

print(f"Dungeon texture keys created ({len(created_dungeon_keys)}):")
for k in created_dungeon_keys:
    print("  ", k)

# Inspect palette P in _genDungeonTextures
print("\n=== DUNGEON PALETTES & CODE ===")
for l in dungeon_lines[:70]:
    print(l)

