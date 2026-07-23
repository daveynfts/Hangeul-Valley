import re

with open(r"C:\VibeCode\Hangeul Valley\game.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

out_lines = []
out_lines.append(f"Total lines in game.js: {len(lines)}")

# Look for Scene definitions, player creation, NPC creation, emoji text objects, animations, etc.
keywords = ['class ', 'Scene', 'player', 'cat', 'wizard', 'muop', 'merlin', 'add.text', 'add.sprite', 'add.image', 'generateTexture', 'Graphics', 'createPlayer', 'createNPC', 'updatePlayer', 'walk', 'idle']

scene_lines = []
for idx, line in enumerate(lines):
    line_num = idx + 1
    if 'class ' in line and 'extends Phaser.Scene' in line:
        scene_lines.append((line_num, line.strip()))

out_lines.append("\n=== Scenes Found ===")
for num, text in scene_lines:
    out_lines.append(f"Line {num}: {text}")

# Detailed search for sprite creation lines
out_lines.append("\n=== Player / NPC / Sprite creation occurrences ===")
for idx, line in enumerate(lines):
    line_num = idx + 1
    # look for text objects with emojis or player/npc variables
    if any(term in line.lower() for term in ['player', 'cat', 'wizard', 'muop', 'merlin', 'npc', 'emoji', 'add.text', 'add.sprite']):
        if any(c in line for c in ['🌾', '🐱', '🧙', '🧑', '👨', '👩', '🤠', '🚜', '🐶', '🦊', '🐷', '🐮', '🐔', '🐰', '🐯', '🐼']):
            out_lines.append(f"Line {line_num}: {line.strip()}")

# Write summary to a text file
with open(r"C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\sprite_search_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))

print("Search completed. Output written to sprite_search_output.txt")
