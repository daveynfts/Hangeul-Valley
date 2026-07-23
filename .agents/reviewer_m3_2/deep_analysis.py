import re

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

# Search for class definitions
classes = [line for line in lines if line.strip().startswith('class ')]
print("CLASSES FOUND:")
for c in classes[:30]:
    print("  ", c)

# Search for texture creation / sprite definitions
print("\nTEXTURE CREATION METHODS & SPRITES:")
for i, line in enumerate(lines):
    if 'generateTexture' in line or 'generate' in line and 'Sprite' in line or 'draw' in line and 'Sprite' in line or 'PixelArt' in line:
        if len(line.strip()) < 100:
            print(f"Line {i+1}: {line.strip()}")
