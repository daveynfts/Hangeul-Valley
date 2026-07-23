import re

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()
print(f"Total lines in game.js: {len(lines)}")

# 1. External assets check
ext_assets = re.findall(r'[\'\"][^\'\"]+\.(?:png|jpg|jpeg|svg)[\'\"]', code, re.IGNORECASE)
print(f"\n--- EXTERNAL ASSET CHECK ---")
print(f"External image file references found: {ext_assets}")

# Check load.image or load.spritesheet or load.svg or image loading
load_calls = re.findall(r'\.load\.(?:image|spritesheet|svg|atlas|multiatlas)\s*\(.*?\)', code)
print(f"Phaser asset load calls: {load_calls}")

# 2. Outline check: 0x121016 or #121016 or similar
contour_count_hex = code.count("0x121016") + code.count("121016") + code.count("#121016")
print(f"\n--- OUTLINE CHECK ---")
print(f"Contour color (0x121016 / #121016) occurrence count: {contour_count_hex}")

# Search for PixelArtRenderer or texture generators
print(f"\n--- PIXEL ART RENDERER & SPRITE REGISTRATION ---")
# Look for functions or classes that generate textures
textures_created = re.findall(r'generateTexture|createCanvas|textures\.addCanvas|generateFrame', code)
print(f"Texture generation occurrences: {len(textures_created)}")

