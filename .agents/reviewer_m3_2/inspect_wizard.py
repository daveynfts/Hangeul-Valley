import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
npc_lines = lines[1378:1633]

# Print wizard section in _genNpcTextures
wiz_lines = []
in_wiz = False
for l in npc_lines:
    if 'W_PAL' in l or 'wiz_' in l or 'wizard' in l:
        in_wiz = True
    if in_wiz:
        wiz_lines.append(l)

print("=== WIZARD CODE ===")
for l in wiz_lines:
    print(l)

