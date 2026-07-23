import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
player_lines = lines[862:1378]

# Print palette definition used in _genPlayerTextures
print("\n=== PALETTE MAPPING IN _genPlayerTextures ===")
for l in player_lines[:50]:
    print(l)

