import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
crop_lines = lines[1633:2159]

print("\n=== CROP PALETTE & DEFINITIONS ===")
for l in crop_lines:
    if 'const crops =' in l or 'name:' in l or 'cr:' in l or 'const P =' in l:
        print(l)

