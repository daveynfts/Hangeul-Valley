import re

with open(r"C:\VibeCode\Hangeul Valley\game.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []

# Search for scene class definitions and line ranges
scenes = []
for i, l in enumerate(lines):
    if 'extends Phaser.Scene' in l or 'class ' in l and 'Scene' in l:
        scenes.append((i+1, l.strip()))

out.append("=== ALL SCENES ===")
for s in scenes:
    out.append(f"Line {s[0]}: {s[1]}")

# Function to search within line range
def search_range(start, end, desc):
    out.append(f"\n--- {desc} (Lines {start}-{end}) ---")
    for i in range(start-1, min(end, len(lines))):
        l = lines[i]
        # check for player, npc, sprite, text creation, movement, graphics
        if any(term in l.lower() for term in ['this.player', 'player', 'npc', 'cat', 'wizard', 'merlin', 'muop', 'sprite', 'add.text', 'generatetexture', 'graphics', 'container']):
            out.append(f"Line {i+1}: {l.strip()}")

# Search whole file for player creation
out.append("\n=== ALL INSTANCES OF PLAYER CREATION AND RENDERING ===")
for i, l in enumerate(lines):
    if 'this.player' in l or 'player =' in l or 'player:' in l:
        out.append(f"Line {i+1}: {l.strip()[:120]}")

with open(r"C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\detailed_sprite_search.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Detailed search written to detailed_sprite_search.txt")
