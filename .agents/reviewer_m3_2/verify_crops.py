import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
crop_lines = lines[1633:2159]

print(f"Total lines in _genCropAndTreeTextures: {len(crop_lines)}")

# Find all crop texture keys created
created_crop_keys = []
for i, l in enumerate(crop_lines):
    m = re.findall(r'createTexture\(scene,\s*([^\,]+)\,', l)
    if m:
        created_crop_keys.extend(m)

print("Texture creation calls in crop section:")
for k in created_crop_keys:
    print("  ", k)

