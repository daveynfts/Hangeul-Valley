import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

# _genNpcTextures spans lines 1379 to 1633
npc_lines = lines[1378:1633]

print(f"Total lines in _genNpcTextures: {len(npc_lines)}")

# Find all createTexture calls in _genNpcTextures
cat_keys = []
wiz_keys = []
for i, l in enumerate(npc_lines):
    m = re.findall(r'createTexture\(scene,\s*[\'\"]([^\'\"]+)[\'\"]', l)
    if m:
        for k in m:
            if 'cat' in k:
                cat_keys.append(k)
            elif 'wiz' in k:
                wiz_keys.append(k)

print(f"\nCat texture keys created ({len(cat_keys)}): {cat_keys}")
print(f"Wizard texture keys created ({len(wiz_keys)}): {wiz_keys}")

# Print palette for Cat and Wizard
print("\n=== PALETTE MAPPING FOR CAT & WIZARD ===")
for l in npc_lines[:50]:
    print(l)

