import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

# Search all occurrences of generateTexture and createTexture in game.js
print("=== ALL RENDERER / TEXTURE CREATIONS ===")
for i, line in enumerate(lines):
    if 'generateTexture' in line or 'createTexture' in line or 'textures.add' in line:
        print(f"Line {i+1:4d}: {line.strip()[:120]}")

