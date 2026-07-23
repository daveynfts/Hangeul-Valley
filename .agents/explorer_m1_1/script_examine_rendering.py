import re

with open(r"C:\VibeCode\Hangeul Valley\game.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []

# Search for texture generation in preload/create or global scope
out.append("=== TEXTURE GENERATION / GRAPHICS IN GAME.JS ===")
for i, l in enumerate(lines):
    if any(k in l for k in ['generateTexture', 'createCanvas', 'make.graphics', 'textures.', 'farmer', 'cat', 'wizard', 'merlin', 'muop']):
        out.append(f"Line {i+1}: {l.strip()}")

# Let's inspect FarmScene create method and NPC creation in FarmScene
out.append("\n=== FARMSCENE SPRITES & NPCS ===")
in_farm = False
for i, l in enumerate(lines):
    if 'class FarmScene' in l:
        in_farm = True
    elif 'class ArcadeScene' in l:
        in_farm = False
    if in_farm:
        if any(k in l.lower() for k in ['cat', 'wizard', 'merlin', 'muop', 'player', 'farmer', 'add.text', 'add.sprite', 'create', 'update']):
            out.append(f"Line {i+1}: {l.strip()[:140]}")

with open(r"C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\examine_rendering.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Render examination complete.")
