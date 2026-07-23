with open(r"C:\VibeCode\Hangeul Valley\game.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []

def check_scene(name, start_line, end_line):
    out.append(f"=== SCENE: {name} (Lines {start_line}-{end_line}) ===")
    for i in range(start_line-1, end_line):
        l = lines[i]
        if any(term in l for term in ['player', 'cat', 'wizard', 'add.text', 'add.sprite', 'add.image', 'setTexture', 'farmer']):
            out.append(f"Line {i+1}: {l.strip()[:140]}")

# Find boundaries of scenes
scene_bounds = [
    ('FarmScene', 1558, 2829),
    ('ArcadeScene', 2830, 3220),
    ('DungeonScene', 3221, 3578),
    ('FishingScene', 3579, len(lines))
]

for name, s, e in scene_bounds:
    check_scene(name, s, e)

with open(r"C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\all_scenes_sprites.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("All scenes sprite check written to all_scenes_sprites.txt")
